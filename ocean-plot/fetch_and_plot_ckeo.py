#!/usr/bin/env python3
"""生成 CKEO-07 天气图，以及 CKEO 的 MATLAB 风格天气面板和 Fig.0–6。"""

import plot_core

# 只让共享绘图核心看到 CKEO（非 A 型）设备。
plot_core.DEVICES = {
    key: device for key, device in plot_core.DEVICES.items()
    if key in {"ckeo_07", "ckeo_08"}
}

if __name__ == "__main__":
    plot_core.main()
