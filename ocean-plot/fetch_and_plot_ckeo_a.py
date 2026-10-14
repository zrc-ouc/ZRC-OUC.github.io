#!/usr/bin/env python3
"""生成 CKEO-A 天气面板（Fig.0）和 MATLAB Fig.1–6 历史图。"""

import plot_core

# 只让共享绘图核心看到 CKEO-A 设备。
plot_core.DEVICES = {
    key: device for key, device in plot_core.DEVICES.items()
    if key == "ckeo_08_a"
}

if __name__ == "__main__":
    plot_core.main()
