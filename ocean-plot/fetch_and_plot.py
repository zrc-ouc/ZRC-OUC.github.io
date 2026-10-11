#!/usr/bin/env python3
"""
fetch_and_plot.py — 海洋观测浮标(CKEO)数据定时绘图
=================================================
把原 MATLAB 脚本（从 MySQL 取海洋观测数据、画"所选变量最新值"面板图）
改写为可在 GitHub Actions 定时运行的 Python 版本。
CKEO-08-a 面板复现 AutoPlotCKEO_A.m 的 Fig0 变量、质控、回退和排版；
其它设备仍使用各自配置的简化最新值面板。

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
CKEO_A_DEPLOYMENT_TIME = "2026-09-28 22:00:00"

# --------------------------------------------------------------------------
# 2) 多设备配置
#    每设备: title / tables(涉及表) / output(图片) / variables(精确模式变量)
#    variables 项: (标签, 单位, 格式, source)
#      source 形式:
#        ("col", 表名, 列名)            -> 直接取该列 (文本列会自动 float)
#        ("wind_speed", 表名)          -> 由 该表.wind_1x/1y 计算 √(x²+y²)
#        ("wind_dir", 表名)            -> 由 该表.wind_1x/1y 计算风向(去向, °)
#        ("matlab_priority", 候选列表) -> CKEO-A 按列序号执行 MATLAB QC 和传感器回退
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
            # 海浪要素（波浪参数，同在 under_water 表）：有效波高 hm0 / 谱峰周期 tp / 波向 dir
            ("Wave Height",         "m",    "{:.1f}", ("col", "ckeo_08_under_water_tcp", "hm0")),
            ("Wave Period",         "s",    "{:.1f}", ("col", "ckeo_08_under_water_tcp", "tp")),
            ("Wave Direction",      "°",    "{:.0f}", ("col", "ckeo_08_under_water_tcp", "dir")),
        ],
    },
    # ---- CKEO-08-a：Weather panel follows AutoPlotCKEO_A.m 的首张天气面板 ----
    # 每个候选项为 (表名, SQL列号, QA模式, 最小值, 最大值, maxwidth, 是否将负值截为0)。
    # MATLAB update 脚本先选 SQL 表列 6:31，再将时间放在 output 第1列；此处按同一
    # SQL 原始列号（1-based）取值，避免猜测或依赖数据库字段别名。
    "ckeo_08_a": {
        "title": "Current Weather at CKEO-A",
        "tables": [
            "ckeo_08_a_sensor_tcp",
            "ckeo_08_a_imm_data_tcp",
            "ckeo_08_a_under_water_tcp",
            "ckeo_08_a_nuclear_radiometer_tcp",
        ],
        "output": "figures/ckeo_08_a_weather.png",
        "variables": [
            ("Wind Speed",          "m/s",  "{:.1f}", ("matlab_priority", [("ckeo_08_a_sensor_tcp", 11, 1, 1e-6, 40, 12, False), ("ckeo_08_a_sensor_tcp", 21, 1, 1e-6, 40, 12, False)])),
            ("Wind Direction (to)", "°",    "{:.0f}", ("matlab_priority", [("ckeo_08_a_sensor_tcp", 10, -1, 1e-6, 360, 24, False), ("ckeo_08_a_sensor_tcp", 20, -1, 1e-6, 360, 24, False)])),
            ("Air Temperature",     "°C",   "{:.1f}", ("matlab_priority", [("ckeo_08_a_sensor_tcp", 14, 1, -20, 40, 24, False), ("ckeo_08_a_sensor_tcp", 24, 1, 1, 40, 6, False), ("ckeo_08_a_sensor_tcp", 26, 1, -20, 40, 24, False)])),
            ("Relative Humidity",   "%",    "{:.0f}", ("matlab_priority", [("ckeo_08_a_sensor_tcp", 13, 1, 20, 100, 24, False), ("ckeo_08_a_sensor_tcp", 23, 1, 20, 100, 24, False), ("ckeo_08_a_sensor_tcp", 27, 1, 20, 100, 24, False)])),
            ("Barometric Pressure", "hPa",  "{:.1f}", ("matlab_priority", [("ckeo_08_a_sensor_tcp", 12, 1, 800, 1100, 24, False), ("ckeo_08_a_sensor_tcp", 22, 1, 800, 1100, 24, False), ("ckeo_08_a_sensor_tcp", 28, 1, 800, 1100, 7, False)])),
            ("Solar Radiation",     "W/m²", "{:.0f}", ("matlab_priority", [("ckeo_08_a_sensor_tcp", 30, -1, 0, 2000, 24, True)])),
            ("Infrared Radiation",  "W/m²", "{:.0f}", ("matlab_priority", [("ckeo_08_a_sensor_tcp", 31, 1, 100, 600, 24, False)])),
            ("Sea Surface Temperature", "°C", "{:.1f}", ("matlab_priority", [("ckeo_08_a_under_water_tcp", 13, 1, 1e-6, 40, 7, False)])),
        ],
        "matlab_layout": True,
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


def fetch_rows_since(table, start_time, step_minutes):
    """Fetch a table and reproduce remove_dup.m slot alignment and gap rows."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT * FROM `{table}` WHERE `time` >= %s ORDER BY `time` ASC",
                (start_time,),
            )
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
        df = pd.DataFrame(rows, columns=cols)
        time_col = next((c for c in df.columns if c.lower() == "time"), None)
        if not time_col or df.empty:
            return df

        times = pd.to_datetime(df[time_col])
        # MATLAB datenum's zero point and Unix epoch differ by a whole number
        # of 10-minute and 60-minute slots, so epoch minutes produce identical slots.
        minutes = (times - pd.Timestamp("1970-01-01")).dt.total_seconds() / 60.0
        df["_matlab_slot"] = [math.floor(m / step_minutes + 0.5) for m in minutes]
        df = df.drop_duplicates(subset=["_matlab_slot"], keep="first")
        df = df.sort_values("_matlab_slot").set_index("_matlab_slot")
        full_slots = range(int(df.index.min()), int(df.index.max()) + 1)
        df = df.reindex(full_slots)
        df[time_col] = (
            pd.Timestamp("1970-01-01")
            + pd.to_timedelta(list(full_slots), unit="m") * step_minutes
        )
        return df.reset_index(drop=True)
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


def _get_matlab_series(table, one_based_index, cache=None):
    """Read a 1-based SQL column history, using CKEO_A_update.m's time window."""
    step_minutes = 10 if table == "ckeo_08_a_sensor_tcp" else 60
    if cache is None:
        df = fetch_rows_since(table, CKEO_A_DEPLOYMENT_TIME, step_minutes)
    else:
        df = cache.get(table)
        if df is None:
            df = fetch_rows_since(table, CKEO_A_DEPLOYMENT_TIME, step_minutes)
            cache[table] = df
    idx = one_based_index - 1
    if df.empty or idx < 0 or idx >= len(df.columns):
        return pd.Series(dtype=float)
    return pd.to_numeric(df.iloc[:, idx].astype(str).str.strip("'\""), errors="coerce")


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


def matlab_quality_assurance(values, mode, minimum=None, maximum=None,
                             maxwidth=24, window=12, clip_negative=False):
    """Port Quality_Assurance.m's range, movmedian, fill, and maxwidth steps.

    MATLAB's default movmedian outlier threshold is three scaled MADs. The
    centred rolling window and linear interpolation mirror its default
    isoutlier/fillmissing behavior for the buoy series used by Fig0.
    """
    s = pd.to_numeric(pd.Series(values), errors="coerce").astype(float)
    if clip_negative:
        s.loc[s < 0] = 0.0
    if minimum is not None:
        s.loc[s < minimum] = float("nan")
    if maximum is not None:
        s.loc[s > maximum] = float("nan")
    if mode == 0:
        s.loc[s == 0] = float("nan")
    elif mode == 1:
        rolling = s.rolling(window=window, center=True, min_periods=1)
        med = rolling.median()
        scaled_mad = rolling.apply(
            lambda x: 1.4826 * float((x - x.median()).abs().median()), raw=False
        )
        outlier = (s - med).abs() > (3.0 * scaled_mad)
        s.loc[outlier.fillna(False)] = float("nan")

    missing = s.isna()
    out = s.interpolate(method="linear", limit_area="inside")
    filled = missing & out.notna()
    # Quality_Assurance.m reverts every interpolated run of maxwidth or more.
    run_start = None
    for i, is_filled in enumerate(filled.to_numpy().tolist() + [False]):
        if is_filled and run_start is None:
            run_start = i
        elif not is_filled and run_start is not None:
            if i - run_start >= maxwidth:
                out.iloc[run_start:i] = float("nan")
            run_start = None
    return out


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
    if kind == "matlab_priority":
        # Match Fig0's sequence: quality-check each sensor, then use the first
        # acceptable value (GMX1 -> GMX2 -> HMP/PTB210 as applicable).
        for table, column_index, mode, minimum, maximum, maxwidth, clip_negative in source[1]:
            raw = _get_matlab_series(table, column_index, cache)
            if raw.empty:
                continue
            checked = matlab_quality_assurance(
                raw, mode, minimum, maximum, maxwidth=maxwidth,
                window=12, clip_negative=clip_negative,
            )
            val = checked.iloc[-1]
            if pd.notna(val):
                return float(val)
        return None
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
        return "---" + (f" {unit}" if unit else "")
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


def build_matlab_weather_panel(latest_values, update_time, title, output_path):
    """Render the 8-row CKEO-A Fig0 weather card in MATLAB's 800x1000 layout."""
    fig = plt.figure(figsize=(8, 10), dpi=100, facecolor="white")
    title_ax = fig.add_axes([0, 0.85, 1, 0.15], facecolor="none")
    title_ax.axis("off")
    content_ax = fig.add_axes([0.1, 0.1, 0.8, 0.7], facecolor=(74 / 255, 160 / 255, 221 / 255))
    content_ax.set_xlim(0, 1)
    content_ax.set_ylim(0, 1)
    content_ax.set_xticks([])
    content_ax.set_yticks([])
    for spine in content_ax.spines.values():
        spine.set_visible(False)

    title_color = (0.5, 0.25, 0.22)
    timestamp_color = (0.85, 0.35, 0.13)
    text_color = (0.1, 0.1, 0.1)
    title_ax.text(0.5, 0.4, title, fontsize=35, fontweight="bold", color=title_color,
                  ha="center", va="center")
    ts = update_time.strftime("At %H:%M UTC on %d %b %Y")
    title_ax.text(0.5, 0.05, ts, fontsize=20, fontweight="bold", color=timestamp_color,
                  ha="center", va="center")

    n = len(latest_values)
    line_height = 0.9 / n
    for i, (label, value) in enumerate(latest_values):
        y = 0.95 - (i + 0.5) * line_height
        content_ax.text(0.05, y, label, fontsize=25, color=text_color,
                        fontname="Liberation Serif", va="center")
        content_ax.text(0.72, y, value, fontsize=25, color=text_color,
                        fontname="Liberation Serif", va="center")

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    fig.savefig(output_path, dpi=100)
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
        if dev.get("matlab_layout"):
            build_matlab_weather_panel(latest_values, update_time, dev["title"], dev["output"])
        else:
            build_panel(latest_values, update_time, dev["title"], dev["output"])


if __name__ == "__main__":
    main()
