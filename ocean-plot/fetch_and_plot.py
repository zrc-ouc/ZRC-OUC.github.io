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
  python fetch_and_plot.py            # 生成 figures/ckeo_weather.png
  python fetch_and_plot.py --inspect  # 仅打印各表列名与类型
  python fetch_and_plot.py --sample   # 打印各表最新一行的全部原始值（排查列名/数据用）
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

# --------------------------------------------------------------------------
# 2) 要查询的表（与 MATLAB 原脚本一致）
# --------------------------------------------------------------------------
TABLES = [
    "ckeo_07_a_sensor",
    "ckeo_07_a_status",
    "ckeo_07_a_ctd",
    "ckeo_07_a_adcp",
    "ckeo_07_a_imm",
]

# --------------------------------------------------------------------------
# 3) 【简单模式】展示这些表"最新一行"的全部数值列
#    想看哪些表就列哪些；默认展示气象(sensor)与温盐(ctd)。
# --------------------------------------------------------------------------
SHOW_TABLES = ["ckeo_07_a_sensor", "ckeo_07_a_ctd"]

# --------------------------------------------------------------------------
# 4) 【精确模式】只展示你指定的"所选变量"（对应 MATLAB 原脚本的面板）
#    每项: (标签, 单位, 格式, source)
#      source 形式:
#        ("col", 表名, 列名)            -> 直接取该列 (文本列会自动 float)
#        ("wind_speed",)               -> 由 sensor.wind_1x/1y 计算 √(x²+y²)
#        ("wind_dir",)                 -> 由 sensor.wind_1x/1y 计算风向(去向, °)
#    ⚠️ 列名依据 --sample 输出的真实表结构；如需增删改这里即可。
VARIABLES = [
    ("Wind Speed",          "m/s",  "{:.1f}", ("wind_speed",)),
    ("Wind Direction (to)", "°",    "{:.0f}", ("wind_dir",)),
    ("Air Temperature",     "°C",   "{:.1f}", ("col", "ckeo_07_a_sensor", "airtemp_1")),
    ("Relative Humidity",   "%",    "{:.0f}", ("col", "ckeo_07_a_sensor", "rh_1")),
    ("Air Pressure",        "hPa",  "{:.1f}", ("col", "ckeo_07_a_sensor", "bp_ptb210")),
    ("Shortwave Radiation", "W/m²", "{:.0f}", ("col", "ckeo_07_a_sensor", "spp")),
    ("Longwave Radiation",  "W/m²", "{:.0f}", ("col", "ckeo_07_a_sensor", "pir")),
    ("Sea Surface Temp",    "°C",   "{:.2f}", ("col", "ckeo_07_a_ctd", "sbe37_t")),
    # 注: sbe37_c 为原始电导率(S/m), 并非盐度; 若要真实盐度需按 T/C/D 做 UNESCO 计算
    ("Sea Surface Salinity", "psu", "{:.2f}", ("col", "ckeo_07_a_ctd", "sbe37_c")),
    ("Depth",               "m",    "{:.2f}", ("col", "ckeo_07_a_ctd", "sbe37_d")),
]

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "figures")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "ckeo_weather.png")


def get_connection():
    return pymysql.connect(**DB_CONFIG)


def fetch_latest_row(table):
    """取某表按 time 降序的最新一行，返回 DataFrame。"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM `{table}` ORDER BY `time` DESC LIMIT 1")
            cols = [d[0] for d in cur.description]
            row = cur.fetchone()
        return pd.DataFrame([row], columns=cols)
    finally:
        conn.close()


def inspect_schema():
    """打印每个表的列名与类型，辅助确认 VARIABLES 中的列名。"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for t in TABLES:
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
    """打印每张表最新一行的全部原始值（列名 = 值 [MySQL类型]），用于确定 VARIABLES。"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for t in TABLES:
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


def _get_col(table, column):
    """取某表最新一行某列的值，文本列自动转 float；取不到返回 None。"""
    df = fetch_latest_row(table)
    if column not in df.columns:
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


def resolve_value(source):
    """根据 source 描述解析出一个数值（直接列 或 计算型变量）。"""
    kind = source[0]
    if kind == "col":
        return _get_col(source[1], source[2])
    if kind == "wind_speed":
        x = _get_col("ckeo_07_a_sensor", "wind_1x")
        y = _get_col("ckeo_07_a_sensor", "wind_1y")
        if x is None or y is None:
            return None
        return math.hypot(x, y)
    if kind == "wind_dir":
        # 风向"去向": 数学角 atan2(x=东向分量, y=北向分量), 由北顺时针
        x = _get_col("ckeo_07_a_sensor", "wind_1x")
        y = _get_col("ckeo_07_a_sensor", "wind_1y")
        if x is None or y is None:
            return None
        return (math.degrees(math.atan2(x, y))) % 360.0
    return None


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


def collect_values():
    """返回 (latest_values, update_time)。latest_values: list of (label, value_str)"""
    latest_values = []
    update_time = datetime.now(timezone.utc)

    if VARIABLES:  # 精确模式
        for label, unit, fmt, source in VARIABLES:
            if source[0] == "col":
                # 该表的 time 列用于确定更新时间
                df = fetch_latest_row(source[1])
                tcol = [c for c in df.columns if c.lower() == "time"]
                if tcol and pd.notna(df[tcol[0]].iloc[0]):
                    update_time = max(update_time, _to_utc(df[tcol[0]].iloc[0]))
            val = resolve_value(source)
            latest_values.append((label, fmt_value(val, fmt, unit)))
    else:  # 简单模式：每张表最新一行的非主键列（含文本列，跳过 id 类列与 time）
        skip_prefixes = ("id",)
        for table in SHOW_TABLES:
            df = fetch_latest_row(table)
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


def build_panel(latest_values, update_time):
    n = max(len(latest_values), 1)
    fig = plt.figure(figsize=(8, 1.0 + 0.55 * n), facecolor="white")
    fig.text(0.5, 0.97, "Current Weather at CKEO",
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
    fig.savefig(OUTPUT_PATH, dpi=100, bbox_inches="tight")
    plt.close(fig)
    print(f"已保存图片: {OUTPUT_PATH}  ({len(latest_values)} 个变量)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect", action="store_true", help="仅打印各表列名与类型后退出")
    parser.add_argument("--sample", action="store_true", help="仅打印各表最新一行的全部原始值后退出")
    args = parser.parse_args()

    if args.inspect:
        inspect_schema()
        return
    if args.sample:
        sample_latest_rows()
        return

    latest_values, update_time = collect_values()
    build_panel(latest_values, update_time)


if __name__ == "__main__":
    main()
