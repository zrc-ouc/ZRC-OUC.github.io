#!/usr/bin/env python3
"""
fetch_and_plot.py — 海洋观测浮标(CKEO)数据定时绘图
=================================================
把原 MATLAB 脚本（从 MySQL 取海洋观测数据、画"所选变量最新值"面板图）
改写为可在 GitHub Actions 定时运行的 Python 版本。
已忽略原脚本中的数据质控(QC)与剖面/流场插值等复杂处理。

数据库凭据通过环境变量注入（GitHub Actions 中用 secrets）：
  DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME

用法：
  pip install -r requirements.txt
  python fetch_and_plot.py                      # 为每个已配置设备生成 figures/<device>_weather.png
  python fetch_and_plot.py --inspect            # 仅打印各表列名与类型
  python fetch_and_plot.py --sample             # 打印各表最新一行的全部原始值（排查列名/数据用）
  python fetch_and_plot.py --list-tables [--pattern ckeo_08%]  # 列出库内匹配模式的表名

多设备：在 DEVICES 字典里增删设备即可。每设备含：
  title  面板标题
  tables 该设备涉及的表（inspect/sample 用；可只列关心的）
  output 输出图片路径
  variables 精确模式变量列表；为空则跳过该设备（待 --sample 确认列名后填）
"""

import os
import argparse
import math
from datetime import datetime, timezone

import pymysql
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # 无头环境必须
import matplotlib.pyplot as plt

# --------------------------------------------------------------------------
# 1) 数据库配置（全部来自环境变量 / secrets，切勿硬编码密码）
# --------------------------------------------------------------------------
DB_CONFIG = dict(
    host=os.environ.get("DB_HOST", "121.42.242.94"),
    port=int(os.environ.get("DB_PORT", "3306")),
    user=os.environ.get("DB_USER", "ckeoread"),
    password=os.environ.get("DB_PASSWORD", ""),
    database=os.environ.get("DB_NAME", "management_system"),
    charset="utf8mb4",
    connect_timeout=15,
)

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "figures")

# --------------------------------------------------------------------------
# 2) 多设备配置
#    每设备: title / tables(涉及表) / output(图片) / variables(精确模式变量)
#    variables 项: (标签, 单位, 格式, source)
#      source 形式:
#        ("col", 表名, 列名)            -> 直接取该列 (文本列会自动 float)
#        ("wind_speed", 表名)          -> 由 该表.wind_1x/1y 计算 √(x²+y²)
#        ("wind_dir", 表名)            -> 由 该表.wind_1x/1y 计算风向(去向, °)
#    ⚠️ 列名依据 --sample 输出的真实表结构；如需增删改这里即可。
# --------------------------------------------------------------------------
DEVICES = {
    "ckeo_07": {
        "title": "Current Weather at CKEO-07",
        "tables": [
            "ckeo_07_a_sensor",
            "ckeo_07_a_status",
            "ckeo_07_a_ctd",
            "ckeo_07_a_adcp",
            "ckeo_07_a_imm",
        ],
        "output": "figures/ckeo_weather.png",
        "variables": [
            ("Wind Speed",          "m/s",  "{:.1f}", ("wind_speed", "ckeo_07_a_sensor")),
            ("Wind Direction (to)", "°",    "{:.0f}", ("wind_dir",   "ckeo_07_a_sensor")),
            ("Air Temperature",     "°C",   "{:.1f}", ("col", "ckeo_07_a_sensor", "airtemp_1")),
            ("Relative Humidity",   "%",    "{:.1f}", ("col", "ckeo_07_a_sensor", "rh_1")),
            ("Air Pressure",        "hPa",  "{:.1f}", ("col", "ckeo_07_a_sensor", "bp_ptb210")),
            ("Shortwave Radiation", "W/m²", "{:.1f}", ("col", "ckeo_07_a_sensor", "spp")),
            ("Longwave Radiation",  "W/m²", "{:.1f}", ("col", "ckeo_07_a_sensor", "pir")),
            ("Sea Surface Temp",    "°C",   "{:.1f}", ("col", "ckeo_07_a_ctd", "sbe37_t")),
            # 真实盐度由 practical_salinity 按 UNESCO 1983 (PSS-78) 计算（需 sbe37_t/c/d 三列）
            ("Sea Surface Salinity", "psu", "{:.1f}", ("salinity", "ckeo_07_a_ctd", "sbe37_t", "sbe37_c", "sbe37_d")),
            ("Depth",               "m",    "{:.1f}", ("col", "ckeo_07_a_ctd", "sbe37_d")),
        ],
    },
    # ---- CKEO-08：采用 _tcp 那套卫星通讯表；注意本设备无 nuclear_radiometer 表 ----
    # 风以 wind_1s(速度)/wind_1d(方向°) 直接给出（非 07 的 wind_1x/wind_1y 向量）
    "ckeo_08": {
        "title": "Current Weather at CKEO-08",
        "tables": [
            "ckeo_08_sensor_tcp",
            "ckeo_08_imm_data_tcp",
            "ckeo_08_under_water_tcp",
        ],
        "output": "figures/ckeo_08_weather.png",
        "variables": [
            ("Wind Speed",          "m/s",  "{:.1f}", ("col", "ckeo_08_sensor_tcp", "wind_1s")),
            ("Wind Direction",      "°",    "{:.0f}", ("col", "ckeo_08_sensor_tcp", "wind_1d")),
            ("Air Temperature",     "°C",   "{:.1f}", ("col", "ckeo_08_sensor_tcp", "airtemp_1")),
            ("Relative Humidity",   "%",    "{:.1f}", ("col", "ckeo_08_sensor_tcp", "rh_1")),
            ("Air Pressure",        "hPa",  "{:.1f}", ("col", "ckeo_08_sensor_tcp", "bp_ptb210")),
            ("Shortwave Radiation", "W/m²", "{:.1f}", ("col", "ckeo_08_sensor_tcp", "spp")),
            ("Longwave Radiation",  "W/m²", "{:.1f}", ("col", "ckeo_08_sensor_tcp", "pir")),
            # under_water 表合并了 CKEO-07 的 ctd+adcp，温盐深在 sbe37_* 列
            ("Sea Surface Temp",    "°C",   "{:.1f}", ("col", "ckeo_08_under_water_tcp", "sbe37_t")),
            # 真实盐度由 practical_salinity 按 UNESCO 1983 (PSS-78) 计算（需 sbe37_t/c/d 三列）
            ("Sea Surface Salinity", "psu", "{:.1f}", ("salinity", "ckeo_08_under_water_tcp", "sbe37_t", "sbe37_c", "sbe37_d")),
            ("Depth",               "m",    "{:.1f}", ("col", "ckeo_08_under_water_tcp", "sbe37_d")),
        ],
    },
    # ---- CKEO-08-a：同上，表名带 _a；额外有 nuclear_radiometer 核辐射计 ----
    #   核辐射计表 ckeo_08_a_nuclear_radiometer_tcp 含 7 个通道 radiometer_0..6（varchar，自动转 float）。
    "ckeo_08_a": {
        "title": "Current Weather at CKEO-08-a",
        "tables": [
            "ckeo_08_a_sensor_tcp",
            "ckeo_08_a_imm_data_tcp",
            "ckeo_08_a_under_water_tcp",
            "ckeo_08_a_nuclear_radiometer_tcp",
        ],
        "output": "figures/ckeo_08_a_weather.png",
        "variables": [
            ("Wind Speed",          "m/s",  "{:.1f}", ("col", "ckeo_08_a_sensor_tcp", "wind_1s")),
            ("Wind Direction",      "°",    "{:.0f}", ("col", "ckeo_08_a_sensor_tcp", "wind_1d")),
            ("Air Temperature",     "°C",   "{:.1f}", ("col", "ckeo_08_a_sensor_tcp", "airtemp_1")),
            ("Relative Humidity",   "%",    "{:.1f}", ("col", "ckeo_08_a_sensor_tcp", "rh_1")),
            ("Air Pressure",        "hPa",  "{:.1f}", ("col", "ckeo_08_a_sensor_tcp", "bp_ptb210")),
            ("Shortwave Radiation", "W/m²", "{:.1f}", ("col", "ckeo_08_a_sensor_tcp", "spp")),
            ("Longwave Radiation",  "W/m²", "{:.1f}", ("col", "ckeo_08_a_sensor_tcp", "pir")),
            ("Sea Surface Temp",    "°C",   "{:.1f}", ("col", "ckeo_08_a_under_water_tcp", "sbe37_t")),
            ("Sea Surface Salinity", "psu", "{:.1f}", ("salinity", "ckeo_08_a_under_water_tcp", "sbe37_t", "sbe37_c", "sbe37_d")),
            ("Depth",               "m",    "{:.1f}", ("col", "ckeo_08_a_under_water_tcp", "sbe37_d")),
            # 核辐射计（Nuclear Radiation）：7 个通道 radiometer_0..6（varchar 自动转 float）
            # 单位待确认（取决于传感器，常见为 cps 计数率 或 µSv/h 剂量率）；先不显示单位，需时再补。
            ("Nuclear Rad Ch0", "", "{:.1f}", ("col", "ckeo_08_a_nuclear_radiometer_tcp", "radiometer_0")),
            ("Nuclear Rad Ch1", "", "{:.1f}", ("col", "ckeo_08_a_nuclear_radiometer_tcp", "radiometer_1")),
            ("Nuclear Rad Ch2", "", "{:.1f}", ("col", "ckeo_08_a_nuclear_radiometer_tcp", "radiometer_2")),
            ("Nuclear Rad Ch3", "", "{:.1f}", ("col", "ckeo_08_a_nuclear_radiometer_tcp", "radiometer_3")),
            ("Nuclear Rad Ch4", "", "{:.1f}", ("col", "ckeo_08_a_nuclear_radiometer_tcp", "radiometer_4")),
            ("Nuclear Rad Ch5", "", "{:.1f}", ("col", "ckeo_08_a_nuclear_radiometer_tcp", "radiometer_5")),
            ("Nuclear Rad Ch6", "", "{:.1f}", ("col", "ckeo_08_a_nuclear_radiometer_tcp", "radiometer_6")),
        ],
    },
}


def get_connection():
    return pymysql.connect(**DB_CONFIG)


def fetch_latest_row(table):
    """取某表按 time 降序的最新一行，返回 DataFrame。表为空时返回带列名、0 行的 DataFrame。"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM `{table}` ORDER BY `time` DESC LIMIT 1")
            cols = [d[0] for d in cur.description]
            row = cur.fetchone()
        if row is None:
            return pd.DataFrame(columns=cols)
        return pd.DataFrame([row], columns=cols)
    finally:
        conn.close()


def all_device_tables():
    """所有设备涉及的表（去重、保序），供 inspect/sample 遍历。"""
    seen = []
    for dev in DEVICES.values():
        for t in dev["tables"]:
            if t not in seen:
                seen.append(t)
    return seen


def inspect_schema():
    """打印每个表的列名与类型，辅助确认 variables 中的列名。"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for t in all_device_tables():
                cur.execute(
                    "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
                    "WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s ORDER BY ORDINAL_POSITION",
                    (DB_CONFIG["database"], t),
                )
                rows = cur.fetchall()
                print(f"\n=== {t} ({len(rows)} 列) ===")
                for name, dtype in rows:
                    print(f"  {name:30s} {dtype}")
    finally:
        conn.close()


def sample_latest_rows():
    """打印每张表最新一行的全部原始值（列名 = 值 [MySQL类型]），用于确定 variables。"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for t in all_device_tables():
                cur.execute(f"SELECT * FROM `{t}` ORDER BY `time` DESC LIMIT 1")
                cols = [d[0] for d in cur.description]
                row = cur.fetchone()
                if row is None:
                    print(f"\n=== {t}: 表为空 ===")
                    continue
                print(f"\n=== {t} 最新一行 ({len(cols)} 列) ===")
                for desc, val in zip(cur.description, row):
                    name, dtype = desc[0], desc[1]
                    shown = "NULL" if val is None else repr(val)
                    if len(shown) > 80:
                        shown = shown[:77] + "..."
                    print(f"  {name:28s} = {shown:82s} [{dtype}]")
    finally:
        conn.close()


def _get_col(table, column, cache=None):
    """取某表最新一行某列的值，文本列自动转 float；取不到返回 None。
    cache: 可选 dict，按表名缓存 fetch_latest_row 结果，避免同一设备重复查库。"""
    if cache is None:
        df = fetch_latest_row(table)
    else:
        df = cache.get(table)
        if df is None:
            df = fetch_latest_row(table)
            cache[table] = df
    if df.empty or column not in df.columns:
        return None
    val = df[column].iloc[0]
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, str):
        try:
            return float(val)
        except ValueError:
            return None
    return float(val)


def gsw_hill_ratio_at_sp2(t):
    """gsw_Hill_ratio_at_SP2 (TEOS-10, v3.05)：在 Practical Salinity=2 处求 Hill 比值。
    忠实移植 MATLAB 官方源码：用 9 阶嵌套多项式给 Rtx 初值，再做一次修正 Newton-Raphson
    (McDougall & Wotherspoon 2013)，最后按 Hill et al. (1986) 公式取 ratio = 2 / SP_Hill_raw。
    t 单位 °C (ITS-90)。"""
    a0 = 0.0080;   a1 = -0.1692;   a2 = 25.3851;  a3 = 14.0941;  a4 = -7.0261;  a5 = 2.7081
    b0 = 0.0005;   b1 = -0.0056;   b2 = -0.0066;  b3 = -0.0375;  b4 = 0.0636;   b5 = -0.0144
    g0 = 2.641463563366498e-1
    g1 = 2.007883247811176e-4
    g2 = -4.107694432853053e-6
    g3 = 8.401670882091225e-8
    g4 = -1.711392021989210e-9
    g5 = 3.374193893377380e-11
    g6 = -5.923731174730784e-13
    g7 = 8.057771569962299e-15
    g8 = -7.054313817447962e-17
    g9 = 2.859992717347235e-19
    k = 0.0162
    SP2 = 2.0
    t68 = t * 1.00024
    ft68 = (t68 - 15.0) / (1.0 + k * (t68 - 15.0))
    # 初始估计 Rtx0（9 阶嵌套多项式）
    Rtx0 = g0 + t68 * (g1 + t68 * (g2 + t68 * (g3 + t68 * (g4 + t68 * (g5 +
           t68 * (g6 + t68 * (g7 + t68 * (g8 + t68 * g9))))))))
    dSP_dRtx = a1 + (2 * a2 + (3 * a3 + (4 * a4 + 5 * a5 * Rtx0) * Rtx0) * Rtx0) * Rtx0 + \
               ft68 * (b1 + (2 * b2 + (3 * b3 + (4 * b4 + 5 * b5 * Rtx0) * Rtx0) * Rtx0) * Rtx0)
    SP_est = a0 + (a1 + (a2 + (a3 + (a4 + a5 * Rtx0) * Rtx0) * Rtx0) * Rtx0) * Rtx0 + \
             ft68 * (b0 + (b1 + (b2 + (b3 + (b4 + b5 * Rtx0) * Rtx0) * Rtx0) * Rtx0) * Rtx0)
    Rtx = Rtx0 - (SP_est - SP2) / dSP_dRtx
    Rtxm = 0.5 * (Rtx + Rtx0)
    dSP_dRtx = a1 + (2 * a2 + (3 * a3 + (4 * a4 + 5 * a5 * Rtxm) * Rtxm) * Rtxm) * Rtxm + \
               ft68 * (b1 + (2 * b2 + (3 * b3 + (4 * b4 + 5 * b5 * Rtxm) * Rtxm) * Rtxm) * Rtxm)
    Rtx = Rtx0 - (SP_est - SP2) / dSP_dRtx
    x = 400.0 * Rtx * Rtx
    sqrty = 10.0 * Rtx
    part1 = 1.0 + x * (1.5 + x)
    part2 = 1.0 + sqrty * (1.0 + sqrty * (1.0 + sqrty))
    SP_Hill_raw_at_SP2 = SP2 - a0 / part1 - b0 * ft68 / part2
    return 2.0 / SP_Hill_raw_at_SP2


def practical_salinity(cond_ms_cm, temp_c, depth_m):
    """忠实移植 MATLAB gsw_SP_from_C (TEOS-10 / PSS-78)。
    输入均从数据库原值直送，前后不做任何数值缩放：
      cond_ms_cm : sbe37_c，单位 mS/cm（gsw 要求的输入单位）
      temp_c     : sbe37_t，单位 °C (ITS-90)
      depth_m    : sbe37_d，单位 m（近似作压力 dbar，浅水浮标足够）
    返回 PSS-78 实用盐度（无量纲）。"""
    if cond_ms_cm is None or temp_c is None or depth_m is None:
        return None
    a0 = 0.0080;   a1 = -0.1692;   a2 = 25.3851;  a3 = 14.0941;  a4 = -7.0261;  a5 = 2.7081
    b0 = 0.0005;   b1 = -0.0056;   b2 = -0.0066;  b3 = -0.0375;  b4 = 0.0636;   b5 = -0.0144
    c0 = 0.6766097; c1 = 2.00564e-2; c2 = 1.104259e-4; c3 = -6.9698e-7; c4 = 1.0031e-9
    d1 = 3.426e-2;  d2 = 4.464e-4;   d3 = 4.215e-1;    d4 = -3.107e-3
    e1 = 2.070e-5;  e2 = -6.370e-10; e3 = 3.989e-15
    k = 0.0162

    t68 = temp_c * 1.00024
    ft68 = (t68 - 15.0) / (1.0 + k * (t68 - 15.0))
    # 无量纲电导率比 R = C / C(35,15,0)；参考电导率 42.9140 mS/cm (Culkin & Smith 1980)
    R = 0.023302418791070513 * cond_ms_cm          # 1 / 42.9140
    rt_lc = c0 + (c1 + (c2 + (c3 + c4 * t68) * t68) * t68) * t68
    Rp = 1.0 + (depth_m * (e1 + e2 * depth_m + e3 * depth_m * depth_m)) / \
         (1.0 + d1 * t68 + d2 * t68 * t68 + (d3 + d4 * t68) * R)
    Rt = R / (Rp * rt_lc)
    if Rt != Rt or Rt < 0:            # NaN 或负值 -> 无效
        return None
    Rtx = math.sqrt(Rt)
    SP = a0 + (a1 + (a2 + (a3 + (a4 + a5 * Rtx) * Rtx) * Rtx) * Rtx) * Rtx + \
         ft68 * (b0 + (b1 + (b2 + (b3 + (b4 + b5 * Rtx) * Rtx) * Rtx) * Rtx) * Rtx)
    # SP < 2 时改用 Hill et al. (1986) 修正（与 PSS-78 在 SP=2 处严格衔接）；真海水不会触发
    if SP < 2.0:
        Hill_ratio = gsw_hill_ratio_at_sp2(temp_c)
        x = 400.0 * Rt
        sqrty = 10.0 * Rtx
        part1 = 1.0 + x * (1.5 + x)
        part2 = 1.0 + sqrty * (1.0 + sqrty * (1.0 + sqrty))
        SP_Hill_raw = SP - a0 / part1 - b0 * ft68 / part2
        SP = Hill_ratio * SP_Hill_raw
    if SP < 0:
        SP = 0.0
    return float(SP)


def resolve_value(source, cache=None):
    """根据 source 描述解析出一个数值（直接列 或 计算型变量）。cache 透传给 _get_col。"""
    kind = source[0]
    if kind == "col":
        return _get_col(source[1], source[2], cache)
    if kind == "wind_speed":
        tbl = source[1]
        x = _get_col(tbl, "wind_1x", cache)
        y = _get_col(tbl, "wind_1y", cache)
        if x is None or y is None:
            return None
        return math.hypot(x, y)
    if kind == "wind_dir":
        # 风向"去向": 数学角 atan2(x=东向分量, y=北向分量), 由北顺时针
        tbl = source[1]
        x = _get_col(tbl, "wind_1x", cache)
        y = _get_col(tbl, "wind_1y", cache)
        if x is None or y is None:
            return None
        return (math.degrees(math.atan2(x, y))) % 360.0
    if kind == "salinity":
        # source = ("salinity", table, t_col, c_col, d_col)
        tbl, tcol, ccol, dcol = source[1], source[2], source[3], source[4]
        return practical_salinity(_get_col(tbl, ccol, cache),
                                  _get_col(tbl, tcol, cache),
                                  _get_col(tbl, dcol, cache))
    return None


def list_tables(pattern="ckeo_08%"):
    """列出数据库中匹配给定 LIKE 模式的表名，用于发现新设备(如 CKEO-08)的表。"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "
                "WHERE TABLE_SCHEMA=%s AND TABLE_NAME LIKE %s ORDER BY TABLE_NAME",
                (DB_CONFIG["database"], pattern),
            )
            rows = cur.fetchall()
        print(f"\n=== 数据库中匹配 '{pattern}' 的表 ({len(rows)} 个) ===")
        for (name,) in rows:
            print(f"  {name}")
        return [r[0] for r in rows]
    finally:
        conn.close()


def _to_utc(dt):
    if isinstance(dt, str):
        dt = pd.to_datetime(dt)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def fmt_value(val, fmt="{:.2f}", unit=""):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return "---"
    try:
        return fmt.format(val) + (f" {unit}" if unit else "")
    except (ValueError, TypeError):
        return str(val)


def collect_values(variables, tables):
    """返回 (latest_values, update_time)。latest_values: list of (label, value_str)"""
    latest_values = []
    update_time = datetime.now(timezone.utc)

    if variables:  # 精确模式
        cache = {}  # 同一设备的多变量常取自相同表，按表名缓存最新行，避免重复查库
        for label, unit, fmt, source in variables:
            if source[0] == "col":
                # 该表的 time 列用于确定更新时间
                df = cache.get(source[1])
                if df is None:
                    df = fetch_latest_row(source[1])
                    cache[source[1]] = df
                tcol = [c for c in df.columns if c.lower() == "time"]
                if tcol and not df.empty and pd.notna(df[tcol[0]].iloc[0]):
                    update_time = max(update_time, _to_utc(df[tcol[0]].iloc[0]))
            val = resolve_value(source, cache)
            latest_values.append((label, fmt_value(val, fmt, unit)))
    else:  # 简单模式：每张表最新一行的非主键列（含文本列，跳过 id 类列与 time）
        skip_prefixes = ("id",)
        for table in tables:
            df = fetch_latest_row(table)
            if df.empty:
                continue
            tcol = [c for c in df.columns if c.lower() == "time"]
            if tcol and pd.notna(df[tcol[0]].iloc[0]):
                update_time = max(update_time, _to_utc(df[tcol[0]].iloc[0]))
            for col in df.columns:
                cl = col.lower()
                if cl == "time" or cl.startswith(skip_prefixes) or cl.endswith("_id"):
                    continue
                val = df[col].iloc[0]
                if isinstance(val, (int, float)) and pd.notna(val):
                    latest_values.append((f"{table}.{col}", fmt_value(val)))
                elif val is not None and not (isinstance(val, float) and pd.isna(val)):
                    text = str(val)
                    if len(text) > 40:
                        text = text[:37] + "..."
                    latest_values.append((f"{table}.{col}", text))

    return latest_values, update_time


def build_panel(latest_values, update_time, title, output_path):
    n = max(len(latest_values), 1)
    fig = plt.figure(figsize=(8, 1.0 + 0.55 * n), facecolor="white")
    fig.text(0.5, 0.97, title,
             ha="center", va="center", fontsize=30, fontweight="bold",
             color=(0.5, 0.25, 0.22))
    ts = update_time.strftime("%H:%M UTC on %d %b %Y")
    fig.text(0.5, 0.935, f"At {ts}", ha="center", va="center",
             fontsize=15, fontweight="bold", color=(0.85, 0.35, 0.13))

    ax = fig.add_axes([0.08, 0.04, 0.84, 0.86])
    ax.axis("off")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)

    for i, (label, value) in enumerate(latest_values):
        y = 0.97 - (i + 0.5) * (0.94 / n)
        ax.text(0.02, y, str(label), fontsize=18, va="center", color=(0.1, 0.1, 0.1))
        ax.text(0.70, y, str(value), fontsize=18, va="center", color=(0.1, 0.1, 0.1))

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    fig.savefig(output_path, dpi=100, bbox_inches="tight")
    plt.close(fig)
    print(f"已保存图片: {output_path}  ({len(latest_values)} 个变量)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect", action="store_true", help="仅打印各表列名与类型后退出")
    parser.add_argument("--sample", action="store_true", help="仅打印各表最新一行的全部原始值后退出")
    parser.add_argument("--list-tables", action="store_true", help="列出库内匹配 --pattern 的表名后退出")
    parser.add_argument("--pattern", default="ckeo_08%", help="配合 --list-tables 使用的 LIKE 模式")
    args = parser.parse_args()

    if args.list_tables:
        list_tables(args.pattern)
        return
    if args.inspect:
        inspect_schema()
        return
    if args.sample:
        sample_latest_rows()
        return

    for key, dev in DEVICES.items():
        variables = dev["variables"]
        tables = dev["tables"]
        if not variables:
            print(f"[跳过] {key}: 尚未配置 variables（待 --sample 确认列名后填）")
            continue
        latest_values, update_time = collect_values(variables, tables)
        build_panel(latest_values, update_time, dev["title"], dev["output"])


if __name__ == "__main__":
    main()
