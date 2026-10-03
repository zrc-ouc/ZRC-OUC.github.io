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
  python fetch_and_plot.py --inspect  # 仅打印各表列结构，便于确认列名
"""

import os
import argparse
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
# 4) 【精确模式·可选】只展示你指定的变量（"所选变量"）
#    每项: (标签, 表名, 列名, 单位, 格式)
#    ⚠️ 列名需按真实表结构填写；运行 --inspect 可查看列名。
#    例如（请按实际列名修改，下面仅为示意）：
# VARIABLES = [
#     ("Wind Speed",          "ckeo_07_a_sensor", "wind_speed", "m/s", "{:.1f}"),
#     ("Wind Direction (to)", "ckeo_07_a_sensor", "wind_dir",   "°",   "{:.0f}"),
#     ("Air Temperature",     "ckeo_07_a_sensor", "air_temp",   "°C",  "{:.1f}"),
#     ("Relative Humidity",   "ckeo_07_a_sensor", "rel_hum",    "%",   "{:.0f}"),
#     ("Barometric Pressure", "ckeo_07_a_sensor", "pressure",   "hPa", "{:.1f}"),
#     ("Solar Radiation",     "ckeo_07_a_sensor", "solar_rad",  "W/m²", "{:.0f}"),
#     ("Infrared Radiation",  "ckeo_07_a_sensor", "ir_rad",     "W/m²", "{:.0f}"),
#     ("Sea Surface Temp",    "ckeo_07_a_ctd",    "temp",       "°C",  "{:.1f}"),
# ]
VARIABLES = None  # 设为上面的列表即切换到精确模式

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
        for label, table, column, unit, fmt in VARIABLES:
            df = fetch_latest_row(table)
            tcol = [c for c in df.columns if c.lower() == "time"]
            if tcol and pd.notna(df[tcol[0]].iloc[0]):
                update_time = max(update_time, _to_utc(df[tcol[0]].iloc[0]))
            val = df[column].iloc[0] if column in df.columns else None
            latest_values.append((label, fmt_value(val, fmt, unit)))
    else:  # 简单模式：每张表最新一行的全部数值列
        for table in SHOW_TABLES:
            df = fetch_latest_row(table)
            tcol = [c for c in df.columns if c.lower() == "time"]
            if tcol and pd.notna(df[tcol[0]].iloc[0]):
                update_time = max(update_time, _to_utc(df[tcol[0]].iloc[0]))
            num_cols = df.select_dtypes(include="number").columns.tolist()
            for col in num_cols:
                latest_values.append((col, fmt_value(df[col].iloc[0])))

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
    parser.add_argument("--inspect", action="store_true", help="仅打印各表列结构后退出")
    args = parser.parse_args()

    if args.inspect:
        inspect_schema()
        return

    latest_values, update_time = collect_values()
    build_panel(latest_values, update_time)


if __name__ == "__main__":
    main()
