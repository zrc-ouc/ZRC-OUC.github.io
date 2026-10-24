#!/usr/bin/env python3
"""
plot_core.py — CKEO 浮标绘图共享模块
=================================================
把 MATLAB 海洋浮标绘图流程改写为可在 GitHub Actions 定时运行的 Python 版本。
CKEO 生成 MATLAB 对应的 Weather 面板和 Fig.0–6；CKEO-A 生成其 Weather 面板和 Fig.1–6。

数据库凭据通过环境变量注入（GitHub Actions 中用 secrets）：
  DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME

用法：
  pip install -r requirements.txt
  python fetch_and_plot_ckeo.py                 # 生成 CKEO-07 与 CKEO-08 图片
  python fetch_and_plot_ckeo_a.py               # 生成 CKEO-A 图片
  两个入口均支持 --inspect、--sample、--list-tables 等诊断参数

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

import numpy as np
import pymysql
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # 无头环境必须
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.colors import ListedColormap
from PIL import Image

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
    # ---- CKEO-08：MATLAB AutoPlotCKEO.m 的 Fig.Weather 与 Fig.1–6 ----
    # MATLAB 的 SQL UPDATE 选 air 列 6:35、underwater 列 5:60；
    # matlab_priority 的数字是数据库 SELECT * 返回结果中的 1-based 列号。
    "ckeo_08": {
        "title": "Current Weather at CKEO",
        "tables": [
            "ckeo_08_sensor_tcp",
            "ckeo_08_imm_data_tcp",
            "ckeo_08_under_water_tcp",
        ],
        "output": "figures/CKEO_Fig_Weather.png",
        "variables": [
            ("Wind Speed", "m/s", "{:.1f}", ("matlab_priority", [("ckeo_08_sensor_tcp", 11, 1, 1e-6, 40, 24, False), ("ckeo_08_sensor_tcp", 21, 1, 1e-6, 40, 24, False)])),
            ("Wind Direction (to)", "°", "{:.0f}", ("matlab_priority", [("ckeo_08_sensor_tcp", 10, -1, 1e-6, 360, 24, False), ("ckeo_08_sensor_tcp", 20, -1, 1e-6, 360, 24, False)])),
            ("Air Temperature", "°C", "{:.1f}", ("matlab_priority", [("ckeo_08_sensor_tcp", 14, 1, -20, 40, 24, False), ("ckeo_08_sensor_tcp", 24, 1, 1, 40, 6, False), ("ckeo_08_sensor_tcp", 30, 1, -20, 40, 24, False)])),
            ("Relative Humidity", "%", "{:.0f}", ("matlab_priority", [("ckeo_08_sensor_tcp", 13, 1, 20, 100, 24, False), ("ckeo_08_sensor_tcp", 23, 1, 20, 100, 24, False), ("ckeo_08_sensor_tcp", 31, 1, 20, 100, 24, False)])),
            ("Barometric Pressure", "hPa", "{:.1f}", ("matlab_priority", [("ckeo_08_sensor_tcp", 12, 1, 800, 1100, 24, False), ("ckeo_08_sensor_tcp", 22, 1, 800, 1100, 24, False), ("ckeo_08_sensor_tcp", 32, 1, 800, 1100, 7, False)])),
            ("Solar Radiation", "W/m²", "{:.0f}", ("matlab_priority", [("ckeo_08_sensor_tcp", 34, -1, 0, 2000, 24, True)])),
            ("Infrared Radiation", "W/m²", "{:.0f}", ("matlab_priority", [("ckeo_08_sensor_tcp", 35, 1, 100, 600, 24, False)])),
            ("Sea Surface Temperature", "°C", "{:.1f}", ("matlab_priority", [("ckeo_08_under_water_tcp", 13, 1, 1e-6, 40, 7, False)])),
        ],
        "matlab_layout": True,
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


def fetch_rows_since(table, start_time, step_minutes, end_time=None):
    """Fetch a table and reproduce remove_dup.m slot alignment and gap rows."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            query = f"SELECT * FROM `{table}` WHERE `time` >= %s"
            params = [start_time]
            if end_time is not None:
                query += " AND `time` <= %s"
                params.append(end_time)
            query += " ORDER BY `time` ASC"
            cur.execute(query, tuple(params))
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
    step_minutes = 10 if table in {"ckeo_08_sensor_tcp", "ckeo_08_a_sensor_tcp"} else 60
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


# These colors are the exact MATLAB MyColormap.mat palettes used by Fig.5 and Fig.6.
MATLAB_JET_28 = [
    [0.368627, 0.309804, 0.635294],
    [0.30472044444444435, 0.39259300000000014, 0.6745097777777778],
    [0.2408137777777778, 0.47538099999999994, 0.7137256666666667],
    [0.21873666666666675, 0.5586053333333335, 0.7307186666666665],
    [0.29426288888888885, 0.6428467777777777, 0.6958602222222222],
    [0.3697891111111112, 0.7270880000000002, 0.6610017777777778],
    [0.4601309999999999, 0.784314, 0.6461873333333333],
    [0.560349, 0.8235293333333333, 0.644734888888889],
    [0.6605665555555553, 0.8627452222222223, 0.6432824444444445],
    [0.747712, 0.898039, 0.627451],
    [0.8334058888888891, 0.9328974444444444, 0.610022],
    [0.9092227777777777, 0.9636891111111111, 0.6074075555555556],
    [0.9455336666666667, 0.9782136666666668, 0.6640523333333334],
    [0.9818445555555556, 0.9927382222222222, 0.720697111111111],
    [0.9992737777777778, 0.9774874444444444, 0.7112561111111111],
    [0.9978213333333334, 0.9324619999999999, 0.6357296666666665],
    [0.9963688888888889, 0.8874363333333333, 0.5602034444444445],
    [0.9949164444444445, 0.8203343333333333, 0.49629666666666666],
    [0.993464, 0.747712, 0.435294],
    [0.9908498888888889, 0.6729123333333333, 0.37603477777777783],
    [0.9777777777777779, 0.5785036666666667, 0.33246166666666666],
    [0.9647056666666666, 0.48409599999999997, 0.288889],
    [0.9388525555555556, 0.4001452222222222, 0.2697167777777778],
    [0.8938274444444444, 0.33188077777777775, 0.28714599999999996],
    [0.848802, 0.26361633333333334, 0.304575],
    [0.7793752222222222, 0.18111866666666665, 0.2965868888888889],
    [0.6994915555555555, 0.09252033333333334, 0.27770544444444445],
    [0.619608, 0.003922, 0.258824],
]
MATLAB_JET_12 = [
    [0.0, 0.0, 0.8209798703236633],
    [0.0, 0.24499900651510384, 0.9162408137255003],
    [0.09239844279821571, 0.4713060244280479, 0.567507532896141],
    [0.2520848371514006, 0.6134666597727767, 0.21827715542808618],
    [0.5182574320778442, 0.7115118710709776, 0.07460416868695935],
    [0.8207275698641849, 0.7827514560863011, 0.12461231435394388],
    [0.9986256672387794, 0.7146071697819305, 0.10681435864044123],
    [1.0, 0.5162780344831066, 0.013860106252814471],
    [0.9998699132813483, 0.2629577030903463, 0.0],
    [0.8535093279027985, 0.11192251552588384, 0.0],
    [0.6721112571459957, 0.035745274045036204, 0.0],
    [0.5000276972311224, 0.0, 0.0],
]
MATLAB_DIVERGING_20 = [
    [0.164062, 0.0, 0.496094], [0.148438, 0.0, 0.648438],
    [0.097656, 0.0, 0.812500], [0.015625, 0.0, 0.964844],
    [0.132812, 0.210938, 0.996094], [0.285156, 0.421875, 0.996094],
    [0.449219, 0.613281, 0.996094], [0.601562, 0.761719, 0.996094],
    [0.753906, 0.875000, 0.996094], [0.917969, 0.964844, 0.996094],
    [0.996094, 0.964844, 0.917969], [0.996094, 0.875000, 0.753906],
    [0.996094, 0.761719, 0.601562], [0.996094, 0.613281, 0.449219],
    [0.996094, 0.421875, 0.285156], [0.996094, 0.210938, 0.132812],
    [0.964844, 0.0, 0.015625], [0.812500, 0.0, 0.097656],
    [0.648438, 0.0, 0.148438], [0.496094, 0.0, 0.164062],
]


def _numeric_sql_column(frame, one_based_sql_column):
    """Return a numeric series by 1-based position in the original SQL SELECT * result."""
    if frame.empty or one_based_sql_column < 1 or one_based_sql_column > frame.shape[1]:
        return pd.Series(np.nan, index=frame.index, dtype=float)
    values = frame.iloc[:, one_based_sql_column - 1]
    return pd.to_numeric(values.astype(str).str.strip("'\""), errors="coerce")


def _air_matrix_column(frame, matlab_column):
    # CKEO_A_update selects SQL columns 6:31, then prepends time as MATLAB AIR column 1.
    return _numeric_sql_column(frame, matlab_column + 4)


def _water_matrix_column(frame, matlab_column):
    # CKEO_A_update selects SQL columns 5:51, then prepends time as MATLAB WATER column 1.
    return _numeric_sql_column(frame, matlab_column + 3)


def _qc(series, mode, minimum=None, maximum=None, maxwidth=24, clip_negative=False):
    return matlab_quality_assurance(
        series, mode, minimum, maximum, maxwidth=maxwidth,
        window=12, clip_negative=clip_negative,
    ).to_numpy(dtype=float)


def _utc_plot_times(frame):
    """MATLAB source times are Beijing local; its plots subtract 8 hours for UTC."""
    time_col = next((c for c in frame.columns if c.lower() == "time"), None)
    if time_col is None:
        return pd.DatetimeIndex([])
    return pd.to_datetime(frame[time_col], errors="coerce") - pd.Timedelta(hours=8)


def _deployment_utc():
    return pd.Timestamp(CKEO_A_DEPLOYMENT_TIME) - pd.Timedelta(hours=8)


def _chart_xlim():
    # MATLAB's x-limit ends at the update time of its freshly generated data file.
    now_utc = pd.Timestamp.now(tz="UTC").tz_localize(None)
    start = _deployment_utc()
    if now_utc <= start:
        now_utc = start + pd.Timedelta(hours=1)
    return start, now_utc


def _make_time_axes(fig, height_px, row_count, row_height_px=150, blank_px=40):
    axes = []
    for row in range(1, row_count + 1):
        bottom = 1.0 - ((row_height_px + blank_px) * row) / height_px
        ax = fig.add_axes([0.1, bottom, 0.85, row_height_px / height_px])
        ax.grid(True)
        # Matplotlib's Axes has no box() method; keep the full frame visible
        # to match MATLAB's `box on`.
        ax.set_frame_on(True)
        ax.tick_params(direction="out", labelsize=10)
        ax.set_xlim(*_chart_xlim())
        ax.xaxis.set_major_locator(mdates.AutoDateLocator(minticks=3, maxticks=7))
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%d-%b"))
        if row != row_count:
            ax.tick_params(labelbottom=False)
        axes.append(ax)
    return axes


def _annotate_axis(fig, ax, label, fontsize=12):
    # Match MATLAB's left-side annotation labels without changing plot axes geometry.
    pos = ax.get_position()
    fig.text(0.089, pos.y1 + 0.012, label, ha="left", va="bottom", fontsize=fontsize)


def _plot_series(ax, times, values, color, label=None, linestyle="-"):
    ax.plot(times, values, color=color, linewidth=1.5, linestyle=linestyle, label=label)


def _save_fig(fig, filename):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    fig.savefig(path, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"已保存图片: {path}")
    return path


def _prepare_ckeo_a_series(air, water):
    """Apply MATLAB's Fig.1–4 QA rules to the historical air/water matrices."""
    A = lambda col: _air_matrix_column(air, col)
    W = lambda col: _water_matrix_column(water, col)
    # AIR QC (AutoPlotCKEO_A.m lines 42–57, 62–67, 71–77).
    air_vars = {
        "ws1": _qc(A(7), 1, 1e-6, 40),
        "wd1": _qc(A(6), -1, 1e-6, 360),
        "at1": _qc(A(10), 1, -20, 40),
        "rh1": _qc(A(9), 1, 20, 100),
        "ap1": _qc(A(8), 1, 800, 1100),
        "precip": _qc(A(13) / 100.0, -1, 0, 1000),
        "sw": _qc(A(26), -1, 0, 2000, clip_negative=True),
        "lw": _qc(A(27), 1, 100, 600),
        "at_hmp": _qc(A(22), 1, -20, 40),
        "rh_hmp": _qc(A(23), 1, 20, 100),
        "ap_ptb": _qc(A(24), 1, 800, 1100, maxwidth=7),
        "ws2": _qc(A(17), 1, 1e-6, 40),
        "wd2": _qc(A(16), -1, 1e-6, 360),
        "at2": _qc(A(20), 1, 1, 40, maxwidth=6),
        "rh2": _qc(A(19), 1, 20, 100),
        "ap2": _qc(A(18), 1, 800, 1100),
    }
    # WATER QC used by the active wave and CTD panels.
    water_vars = {
        "wave_height": _qc(W(5), 0, 0, 99, maxwidth=1),
        "wave_period": _qc(W(6), 1, 0, 999, maxwidth=20),
        "wave_direction": _qc(W(8), 0, 0, 360, maxwidth=1),
        "sst": _qc(W(10), 1, 1e-6, 40, maxwidth=7),
        "depth": _qc(W(11), 1, 0),
        "conductivity": _qc(W(12), 1, 2, 100),
    }
    salinity_raw = np.array([
        practical_salinity(c * 10.0, t, 1.0) if pd.notna(c) and pd.notna(t) else np.nan
        for c, t in zip(water_vars["conductivity"], water_vars["sst"])
    ], dtype=float)
    water_vars["salinity"] = _qc(salinity_raw, 1, 30, 40)
    return air_vars, water_vars


def _prepare_ckeo_series(air, water):
    """Apply AutoPlotCKEO.m's QC rules to active CKEO Fig.1–4 series."""
    A = lambda col: _air_matrix_column(air, col)
    W = lambda col: _water_matrix_column(water, col)
    air_vars = {
        "ws1": _qc(A(7), 1, 1e-6, 40),
        "wd1": _qc(A(6), -1, 1e-6, 360),
        "at1": _qc(A(10), 1, -20, 40),
        "rh1": _qc(A(9), 1, 20, 100),
        "ap1": _qc(A(8), 1, 800, 1100),
        "precip": _qc(A(13) / 100.0, -1, 0, 1000),
        "sw": _qc(A(30), -1, 0, 2000, clip_negative=True),
        "lw": _qc(A(31), 1, 100, 600),
        "at_hmp": _qc(A(26), 1, -20, 40),
        "rh_hmp": _qc(A(27), 1, 20, 100),
        "ap_ptb": _qc(A(28), 1, 800, 1100, maxwidth=7),
        "ws2": _qc(A(17), 1, 1e-6, 40),
        "wd2": _qc(A(16), -1, 1e-6, 360),
        "at2": _qc(A(20), 1, 1, 40, maxwidth=6),
        "rh2": _qc(A(19), 1, 20, 100),
        "ap2": _qc(A(18), 1, 800, 1100),
    }
    water_vars = {
        "wave_height": _qc(W(5), 0, 0, 99, maxwidth=1),
        "wave_period": _qc(W(6), 1, 0, 999, maxwidth=20),
        "wave_direction": _qc(W(8), 0, 0, 360, maxwidth=1),
        "sst": _qc(W(10), 1, 1e-6, 40, maxwidth=7),
        "depth": _qc(W(11), 1, 0),
        "conductivity": _qc(W(12), 1, 2, 100),
    }
    salinity_raw = np.array([
        practical_salinity(c * 10.0, t, 1.0) if pd.notna(c) and pd.notna(t) else np.nan
        for c, t in zip(water_vars["conductivity"], water_vars["sst"])
    ], dtype=float)
    water_vars["salinity"] = _qc(salinity_raw, 1, 30, 40)
    return air_vars, water_vars


def _draw_timeseries_figure(filename, height_px, rows, xlim, hide_x_for_rows=()):
    """Draw rows as MATLAB-sized 800 px wide time-series panels."""
    fig = plt.figure(figsize=(8, height_px / 100.0), dpi=100, facecolor="white")
    axes = _make_time_axes(fig, height_px, len(rows))
    for index, (ax, row) in enumerate(zip(axes, rows), start=1):
        for series in row["series"]:
            _plot_series(ax, row["times"], series["values"], series["color"], series.get("label"))
        ax.set_xlim(*xlim)
        if row.get("ylim") is not None:
            ax.set_ylim(*row["ylim"])
        if row.get("yticks") is not None:
            ax.set_yticks(row["yticks"])
        if row.get("legend"):
            ax.legend(loc=row.get("legend_loc", "best"), fontsize=10)
        _annotate_axis(fig, ax, row["ylabel"])
        if index in hide_x_for_rows:
            ax.tick_params(labelbottom=False)
    return _save_fig(fig, filename)


def _compose_fig1(top_path, bottom_path, output_path):
    with Image.open(top_path) as top, Image.open(bottom_path) as bottom:
        top = top.convert("RGB")
        bottom = bottom.convert("RGB")
        if top.width != bottom.width:
            raise ValueError("Fig.1 component images must have the same width")
        combined = Image.new("RGB", (top.width, top.height + bottom.height), "white")
        combined.paste(top, (0, 0))
        combined.paste(bottom, (0, top.height))
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        combined.save(output_path, format="PNG")
    print(f"已保存图片: {output_path}")


def _draw_update_title(filename, title, update_time):
    """Reproduce MATLAB's compact Fig.0 buoy-name/update-time image."""
    fig = plt.figure(figsize=(8, 1.0), dpi=100, facecolor="white")
    update_utc = pd.Timestamp(update_time).strftime("%Y-%m-%d %H:%M:%S")
    fig.text(0.45, 0.8, title, fontsize=18, color="black", va="bottom")
    fig.text(0.28, 0.4, f"(Updated to UTC {update_utc})", fontsize=14, color="black", va="bottom")
    return _save_fig(fig, filename)


def _imm_values(imm_frame):
    """Expand ckeo_08_a_imm_data_tcp.data CSV payload to MATLAB IMM columns."""
    data_col = next((c for c in imm_frame.columns if c.lower() == "data"), None)
    if data_col is None:
        raise ValueError("IMM 表缺少 data 列，无法重建 MATLAB 温度剖面")
    rows = []
    for payload in imm_frame[data_col]:
        if payload is None or pd.isna(payload):
            rows.append(np.full(37, np.nan, dtype=float))
            continue
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8", errors="replace")
        text = str(payload).strip().strip("'\"")
        values = pd.to_numeric(pd.Series(text.split(",")), errors="coerce").to_numpy(dtype=float)
        # MATLAB update truncates payloads to 37 columns and pads short rows with NaN.
        row = np.full(37, np.nan, dtype=float)
        row[:min(len(values), 37)] = values[:37]
        rows.append(row)
    if not rows:
        return np.empty((0, 37), dtype=float)
    return np.vstack(rows)


def gsw_z_from_p(pressure_dbar, latitude_deg):
    """Vectorized port of supplied gsw_z_from_p.m and gsw_enthalpy_SSO_0.m."""
    p = np.asarray(pressure_dbar, dtype=float)
    lat = np.broadcast_to(np.asarray(latitude_deg, dtype=float), p.shape)
    z = p * 1e-4
    h006, h007 = -2.1078768810e-9, 2.8019291329e-10
    enthalpy = z * (9.726613854843870e-4 + z * (-2.252956605630465e-5 + z * (
        2.376909655387404e-6 + z * (-1.664294869986011e-7 + z * (
            -5.988108894465758e-9 + z * (h006 + h007 * z)))))) * 1e8
    sinlat = np.sin(np.deg2rad(lat))
    sin2 = sinlat * sinlat
    grav = 9.780327 * (1.0 + (5.2792e-3 + 2.32e-5 * sin2) * sin2)
    gamma = 2.26e-7
    aa = -0.5 * gamma * grav
    cc = enthalpy
    with np.errstate(invalid="ignore", divide="ignore"):
        height = -2.0 * cc / (grav + np.sqrt(grav * grav - 4.0 * aa * cc))
    return height


def _temperature_profile(air, imm_frame, buoy="ckeo_a"):
    payload = _imm_values(imm_frame)
    n = len(payload)
    if n == 0:
        return np.array([]), np.arange(5.0, 501.0, 5.0), np.empty((100, 0))
    # MATLAB IMM includes time as column 1; payload item 1 therefore becomes IMM column 2.
    imm = np.column_stack([np.full(n, np.nan), payload])
    lat = _qc(_air_matrix_column(air, 2), 0)
    latitude = float(lat[0]) if len(lat) else np.nan
    lat1 = np.full(n, latitude)
    if buoy == "ckeo":
        # AutoPlotCKEO.m: 16 temperature sensors at 10–450 m.
        pres = np.column_stack([
            -gsw_z_from_p(imm[:, 3], lat1), np.full(n, 20.0), np.full(n, 30.0),
            -gsw_z_from_p(imm[:, 7], lat1), np.full(n, 50.0), np.full(n, 60.0),
            -gsw_z_from_p(imm[:, 12], lat1), np.full(n, 80.0),
            -gsw_z_from_p(imm[:, 15], lat1), np.full(n, 100.0),
            np.full(n, 150.0), np.full(n, 200.0), np.full(n, 300.0),
            -gsw_z_from_p(imm[:, 26], lat1), np.full(n, 400.0),
            -gsw_z_from_p(imm[:, 33], lat1),
        ]).T
        temp = np.column_stack([
            imm[:, 1], imm[:, 4:7], imm[:, 8:11], imm[:, 13:15],
            imm[:, 16:19], imm[:, 23:25], imm[:, 34:36],
        ]).T
    else:
        # AutoPlotCKEO_A.m: 14 temperature sensors at 10–500 m.
        measured_depth_30 = -gsw_z_from_p(imm[:, 17], lat1)  # IMM(:,18)
        measured_depth_100 = -gsw_z_from_p(imm[:, 20], lat1) # IMM(:,21)
        measured_depth_400 = -gsw_z_from_p(imm[:, 12], lat1) # IMM(:,13)
        measured_depth_500 = -gsw_z_from_p(imm[:, 14], lat1) # IMM(:,15)
        pres = np.column_stack([
            np.full(n, 10.0), np.full(n, 20.0), np.full(n, 30.0), np.full(n, 40.0),
            np.full(n, 50.0), measured_depth_30, np.full(n, 70.0), np.full(n, 80.0),
            np.full(n, 90.0), measured_depth_100, np.full(n, 200.0), np.full(n, 300.0),
            measured_depth_400, measured_depth_500,
        ]).T
        temp = np.column_stack([
            imm[:, 1:6], imm[:, 16], imm[:, 6:9], imm[:, 19], imm[:, 9:12], imm[:, 13]
        ]).T
    pres[(pres < 1) | (pres > 500)] = 0.0
    temp[(temp < 1) | (temp > 40)] = 0.0
    sum_pres = np.sum(pres, axis=0)
    remove = (sum_pres < 500) | np.isnan(sum_pres)
    pres = pres[:, ~remove]
    temp = temp[:, ~remove]
    # MATLAB discards any profile with 12 or more missing temperature sensors.
    enough_temp = np.sum(np.isnan(temp), axis=0) < 12
    pres = pres[:, enough_temp]
    temp = temp[:, enough_temp]
    # MATLAB converts invalid-range zeros to NaN before interp1, after counting missing sensors.
    temp[temp == 0] = np.nan
    times = _utc_plot_times(imm_frame).to_numpy()[~remove][enough_temp]
    grid = np.arange(5.0, 501.0, 5.0)
    temp_grid = np.full((len(grid), temp.shape[1]), np.nan)
    for column in range(temp.shape[1]):
        valid = np.isfinite(temp[:, column]) & np.isfinite(pres[:, column]) & (pres[:, column] > 0)
        # MATLAB's interp1 needs at least four usable temperature points in this script.
        if np.sum(np.isfinite(temp[:, column])) <= 3 or np.sum(valid) < 2:
            continue
        x = pres[valid, column]
        y = temp[valid, column]
        order = np.argsort(x)
        x, y = x[order], y[order]
        x, unique_idx = np.unique(x, return_index=True)
        y = y[unique_idx]
        if len(x) < 2:
            continue
        temp_grid[:, column] = np.interp(grid, x, y, left=np.nan, right=np.nan)
    if temp.shape[1]:
        # Both MATLAB scripts replace the shallowest 5 m row with sensor 1.
        temp_grid[0, :] = temp[0, :]
    return times, grid, temp_grid


def _draw_temperature_profile(air, imm_frame, buoy="ckeo_a"):
    times, depth, values = _temperature_profile(air, imm_frame, buoy=buoy)
    height_px = 620
    fig = plt.figure(figsize=(8, 6.2), dpi=100, facecolor="white")
    ax = fig.add_axes([0.1, 0.13, 0.85, 500 / height_px])
    ax.set_ylim(500, 0)
    ax.set_xlim(*_chart_xlim())
    ax.set_xticks(mdates.date2num(pd.date_range(_chart_xlim()[0], _chart_xlim()[1], periods=6)))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d-%b"))
    ax.tick_params(direction="out", labelsize=10)
    ax.set_ylabel("Depth [m]")
    ax.grid(False)
    _annotate_axis(fig, ax, "Temperature Profile")
    if values.shape[1] >= 2 and np.isfinite(values).any():
        x_dates = pd.to_datetime(times).to_pydatetime()
        if buoy == "ckeo":
            contour_levels = np.arange(0.0, 26.0, 2.0)
            colormap, vmin, vmax = MATLAB_JET_12, 0.0, 24.0
            colorbar_ticks = np.arange(0, 25, 2)
            filename = "CKEO_Fig_5.png"
        else:
            # m_jet_28 has 28 RGB rows: use 28 filled intervals over 10–28 °C.
            contour_levels = np.linspace(10.0, 28.0, len(MATLAB_JET_28) + 1)
            colormap, vmin, vmax = MATLAB_JET_28, 10.0, 28.0
            colorbar_ticks = np.arange(10, 29, 2)
            filename = "CKEO_A_Fig_5.png"
        cf = ax.contourf(x_dates, depth, values, levels=contour_levels,
                         cmap=ListedColormap(colormap), vmin=vmin, vmax=vmax)
        cax = fig.add_axes([0.1, 0.05, 0.85, 0.02])
        cb = fig.colorbar(cf, cax=cax, orientation="horizontal", ticks=colorbar_ticks)
        cb.set_label("[°C]", fontsize=7, labelpad=-1)
        cb.ax.tick_params(labelsize=7, length=2)
    else:
        ax.text(0.5, 0.5, "Insufficient valid IMM profiles", transform=ax.transAxes,
                ha="center", va="center", color="0.35")
    _save_fig(fig, "CKEO_Fig_5.png" if buoy == "ckeo" else "CKEO_A_Fig_5.png")


def _draw_adcp(underwater, buoy="ckeo_a"):
    height_px = 620
    fig = plt.figure(figsize=(8, 6.2), dpi=100, facecolor="white")
    row_height_px, blank_px = 230, 30
    axes = []
    for row in (1, 2):
        bottom = 1.0 - ((row_height_px + blank_px) * row) / height_px
        ax = fig.add_axes([0.1, bottom, 0.85, row_height_px / height_px])
        ax.set_ylim(120, 15)
        ax.set_xlim(*_chart_xlim())
        ax.xaxis.set_major_locator(mdates.AutoDateLocator(minticks=3, maxticks=7))
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%d-%b"))
        ax.tick_params(direction="out", labelsize=10)
        ax.set_ylabel("Depth [m]")
        ax.grid(False)
        axes.append(ax)
    axes[0].tick_params(labelbottom=False)
    times = _utc_plot_times(underwater)
    # _utc_plot_times returns a Series; contourf expects datetime values, while
    # to_pydatetime() is a DatetimeIndex method (not available on Series).
    plot_times = pd.DatetimeIndex(pd.to_datetime(times)).to_pydatetime()
    # MATLAB ADCP values occupy WATER 13:36 for CKEO-A, 22:45 for CKEO.
    first_u_column = 22 if buoy == "ckeo" else 13
    u_sql = list(range(first_u_column + 3, first_u_column + 3 + 24, 2))
    v_sql = list(range(first_u_column + 4, first_u_column + 4 + 24, 2))
    u = np.column_stack([_numeric_sql_column(underwater, col) for col in u_sql]) / 1000.0
    v = np.column_stack([_numeric_sql_column(underwater, col) for col in v_sql]) / 1000.0
    u[np.isclose(u, -32.768)] = np.nan  # Raw -32768 mm/s marker after MATLAB's /1000 scale.
    v[np.isclose(v, -32.768)] = np.nan
    gap_mask = _numeric_sql_column(underwater, 5).isna().to_numpy()  # MATLAB WATER(:,2)
    if len(gap_mask):
        u[gap_mask, :] = np.nan
        v[gap_mask, :] = np.nan
    depth = np.array([18, 24, 30, 36, 42, 54, 60, 66, 78, 90, 102, 120], dtype=float)[::-1]
    u_plot, v_plot = np.flipud(u.T), np.flipud(v.T)
    levels = np.arange(-1.0, 1.0001, 0.1)
    cmap = ListedColormap(MATLAB_DIVERGING_20)
    mappable = None
    if len(times) >= 2 and np.isfinite(u_plot).any():
        mappable = axes[0].contourf(plot_times, depth, u_plot, levels=levels,
                                    cmap=cmap, vmin=-1, vmax=1)
    else:
        axes[0].text(0.5, 0.5, "Insufficient valid ADCP U data", transform=axes[0].transAxes,
                     ha="center", va="center", color="0.35")
    _annotate_axis(fig, axes[0], "U")
    if len(times) >= 2 and np.isfinite(v_plot).any():
        axes[1].contourf(plot_times, depth, v_plot, levels=levels,
                         cmap=cmap, vmin=-1, vmax=1)
    else:
        axes[1].text(0.5, 0.5, "Insufficient valid ADCP V data", transform=axes[1].transAxes,
                     ha="center", va="center", color="0.35")
    _annotate_axis(fig, axes[1], "V")
    if mappable is not None:
        cax = fig.add_axes([0.1, 0.07, 0.85, 0.02])
        cb = fig.colorbar(mappable, cax=cax, orientation="horizontal", ticks=np.arange(-1, 1.01, 0.5))
        cb.set_label("[m s⁻¹]", fontsize=9, labelpad=-1)
        cb.ax.tick_params(labelsize=8, length=2)
    _save_fig(fig, "CKEO_Fig_6.png" if buoy == "ckeo" else "CKEO_A_Fig_6.png")


def build_ckeo_a_history_figures():
    """Build active MATLAB Fig.1–6 from full CKEO-A histories since deployment."""
    # Database timestamps are stored in Beijing local time, matching MATLAB's datenum(now).
    end_time = (datetime.now(timezone.utc) + pd.Timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")
    air = fetch_rows_since("ckeo_08_a_sensor_tcp", CKEO_A_DEPLOYMENT_TIME, 10, end_time=end_time)
    water = fetch_rows_since("ckeo_08_a_under_water_tcp", CKEO_A_DEPLOYMENT_TIME, 60, end_time=end_time)
    imm = fetch_rows_since("ckeo_08_a_imm_data_tcp", CKEO_A_DEPLOYMENT_TIME, 60, end_time=end_time)
    if air.empty or water.empty:
        raise RuntimeError("CKEO-A 空气或水下历史数据为空，无法生成 MATLAB Fig.1–6")

    at, wt = _utc_plot_times(air), _utc_plot_times(water)
    av, wv = _prepare_ckeo_a_series(air, water)
    xlim = _chart_xlim()
    navy, red, gray = (0.0, 0.0, 0.597656), (0.796875, 0.199219, 0.0), (0.7, 0.7, 0.7)

    f11 = _draw_timeseries_figure("CKEO_A_Fig_1_1.png", 390, [
        {"times": at, "ylabel": "Wind Speed [m s⁻¹]", "legend": True, "legend_loc": "upper left",
         "series": [{"values": av["ws1"], "color": navy, "label": "GMX1"}, {"values": av["ws2"], "color": gray, "label": "GMX2"}]},
        {"times": at, "ylabel": "Wind Direction [°]", "ylim": (0, 360), "yticks": [0, 90, 180, 270, 360],
         "legend": True, "legend_loc": "upper left",
         "series": [{"values": av["wd1"], "color": navy, "label": "GMX1"}, {"values": av["wd2"], "color": gray, "label": "GMX2"}]},
    ], xlim, hide_x_for_rows=(1, 2))
    f12 = _draw_timeseries_figure("CKEO_A_Fig_1_2.png", 620, [
        {"times": at, "ylabel": "Air Temperature [°C]", "legend": True, "legend_loc": "lower left",
         "series": [{"values": av["at1"], "color": navy, "label": "GMX1"}, {"values": av["at_hmp"], "color": red, "label": "HMP"}, {"values": av["at2"], "color": gray, "label": "GMX2"}]},
        {"times": at, "ylabel": "Relative Humidity [%]", "ylim": (60, 100), "legend": True, "legend_loc": "lower left",
         "series": [{"values": av["rh1"], "color": navy, "label": "GMX1"}, {"values": av["rh_hmp"], "color": red, "label": "HMP"}, {"values": av["rh2"], "color": gray, "label": "GMX2"}]},
        {"times": at, "ylabel": "Air Pressure [hPa]", "legend": True, "legend_loc": "upper left",
         "series": [{"values": av["ap1"], "color": navy, "label": "GMX1"}, {"values": av["ap_ptb"], "color": red, "label": "PTB"}, {"values": av["ap2"], "color": gray, "label": "GMX2"}]},
    ], xlim)
    _compose_fig1(f11, f12, os.path.join(OUTPUT_DIR, "CKEO_A_Fig_1.png"))

    _draw_timeseries_figure("CKEO_A_Fig_2.png", 620, [
        {"times": at, "ylabel": "Precipitation [mm hr⁻¹]", "series": [{"values": av["precip"], "color": navy}]},
        {"times": at, "ylabel": "Longwave Radiation [W m⁻²]", "series": [{"values": av["lw"], "color": navy}]},
        {"times": at, "ylabel": "Shortwave Radiation [W m⁻²]", "series": [{"values": av["sw"], "color": navy}]},
    ], xlim)
    _draw_timeseries_figure("CKEO_A_Fig_3.png", 620, [
        {"times": wt, "ylabel": "Sea Surface Temperature [°C]", "series": [{"values": wv["sst"], "color": navy}]},
        {"times": wt, "ylabel": "Sea Surface Salinity [PSU]", "series": [{"values": wv["salinity"], "color": navy}]},
        {"times": wt, "ylabel": "Sea Surface Conductivity [mS/cm]", "series": [{"values": wv["conductivity"] * 10.0, "color": navy}]},
    ], xlim)
    _draw_timeseries_figure("CKEO_A_Fig_4.png", 420, [
        {"times": wt, "ylabel": "Significant Wave Height [m]", "series": [{"values": wv["wave_height"], "color": navy}]},
        {"times": wt, "ylabel": "Peak Wave Period [s]", "series": [{"values": wv["wave_period"], "color": navy}]},
    ], xlim)
    _draw_temperature_profile(air, imm)
    _draw_adcp(water)


def build_ckeo_history_figures(update_time):
    """Build MATLAB's active CKEO Fig.0–6 from its three buoy history tables."""
    end_time = (datetime.now(timezone.utc) + pd.Timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")
    air = fetch_rows_since("ckeo_08_sensor_tcp", CKEO_A_DEPLOYMENT_TIME, 10, end_time=end_time)
    water = fetch_rows_since("ckeo_08_under_water_tcp", CKEO_A_DEPLOYMENT_TIME, 60, end_time=end_time)
    imm = fetch_rows_since("ckeo_08_imm_data_tcp", CKEO_A_DEPLOYMENT_TIME, 60, end_time=end_time)
    if air.empty or water.empty:
        raise RuntimeError("CKEO 空气或水下历史数据为空，无法生成 MATLAB Fig.0–6")

    _draw_update_title("CKEO_Fig_0.png", "CKEO", update_time)
    at, wt = _utc_plot_times(air), _utc_plot_times(water)
    av, wv = _prepare_ckeo_series(air, water)
    xlim = _chart_xlim()
    navy = (0.0, 0.0, 0.59765625)
    red = (0.796875, 0.19921875, 0.0)
    gray = (0.7, 0.7, 0.7)

    f11 = _draw_timeseries_figure("CKEO_Fig_1_1.png", 390, [
        {"times": at, "ylabel": "Wind Speed [m s⁻¹]", "legend": True, "legend_loc": "upper left",
         "series": [{"values": av["ws1"], "color": navy, "label": "GMX1"}, {"values": av["ws2"], "color": gray, "label": "GMX2"}]},
        {"times": at, "ylabel": "Wind Direction [°]", "ylim": (0, 360), "yticks": [0, 90, 180, 270, 360],
         "legend": True, "legend_loc": "upper left",
         "series": [{"values": av["wd1"], "color": navy, "label": "GMX1"}, {"values": av["wd2"], "color": gray, "label": "GMX2"}]},
    ], xlim, hide_x_for_rows=(1, 2))
    f12 = _draw_timeseries_figure("CKEO_Fig_1_2.png", 620, [
        {"times": at, "ylabel": "Air Temperature [°C]", "legend": True, "legend_loc": "lower left",
         "series": [{"values": av["at_hmp"], "color": red, "label": "HMP"}, {"values": av["at2"], "color": gray, "label": "GMX2"}]},
        {"times": at, "ylabel": "Relative Humidity [%]", "ylim": (60, 100), "legend": True, "legend_loc": "lower left",
         "series": [{"values": av["rh_hmp"], "color": red, "label": "HMP"}, {"values": av["rh2"], "color": gray, "label": "GMX2"}]},
        {"times": at, "ylabel": "Air Pressure [hPa]", "legend": True, "legend_loc": "upper left",
         "series": [{"values": av["ap1"], "color": navy, "label": "GMX1"}, {"values": av["ap_ptb"], "color": red, "label": "PTB"}, {"values": av["ap2"], "color": gray, "label": "GMX2"}]},
    ], xlim)
    _compose_fig1(f11, f12, os.path.join(OUTPUT_DIR, "CKEO_Fig_1.png"))

    _draw_timeseries_figure("CKEO_Fig_2.png", 620, [
        {"times": at, "ylabel": "Precipitation [mm hr⁻¹]", "series": [{"values": av["precip"], "color": navy}]},
        {"times": at, "ylabel": "Longwave Radiation [W m⁻²]", "series": [{"values": av["lw"], "color": navy}]},
        {"times": at, "ylabel": "Shortwave Radiation [W m⁻²]", "series": [{"values": av["sw"], "color": navy}]},
    ], xlim)
    _draw_timeseries_figure("CKEO_Fig_3.png", 620, [
        {"times": wt, "ylabel": "Sea Surface Temperature [°C]", "series": [{"values": wv["sst"], "color": navy}]},
        {"times": wt, "ylabel": "Sea Surface Salinity [PSU]", "series": [{"values": wv["salinity"], "color": navy}]},
        {"times": wt, "ylabel": "Sea Surface Conductivity [mS/cm]", "series": [{"values": wv["conductivity"] * 10.0, "color": navy}]},
    ], xlim)
    _draw_timeseries_figure("CKEO_Fig_4.png", 420, [
        {"times": wt, "ylabel": "Significant Wave Height [m]", "series": [{"values": wv["wave_height"], "color": navy}]},
        {"times": wt, "ylabel": "Peak Wave Period [s]", "series": [{"values": wv["wave_period"], "color": navy}]},
    ], xlim)
    _draw_temperature_profile(air, imm, buoy="ckeo")
    _draw_adcp(water, buoy="ckeo")


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
            if key == "ckeo_08":
                build_ckeo_history_figures(update_time)
            elif key == "ckeo_08_a":
                build_ckeo_a_history_figures()
        else:
            build_panel(latest_values, update_time, dev["title"], dev["output"])


if __name__ == "__main__":
    main()
