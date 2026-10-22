#!/usr/bin/env python3
"""Render 15 daily 00 UTC ECMWF significant-wave-height forecast maps."""

from __future__ import annotations

import argparse
from contextlib import nullcontext
import math
import os
from pathlib import Path
from tempfile import TemporaryDirectory, gettempdir

import cfgrib
from ecmwf.opendata import Client
os.environ.setdefault("MPLCONFIGDIR", str(Path(gettempdir()) / "ecmwf-wave-matplotlib"))
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import BoundaryNorm, ListedColormap
import numpy as np
from PIL import Image, ImageColor


CENTER_LAT = 41.0
CENTER_LON = 151.0
SOUTH, NORTH = 31.0, 51.0
WEST, EAST = 141.0, 161.0
STEPS = list(range(24, 361, 24))
# Fixed Windy-inspired categories: 0.5 m bins below 2 m, then 1 m bins.
WAVE_EDGES = np.array([0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], dtype=float)
WAVE_COLORS = [
    "#a8e6e4", "#61c8da", "#3b9cca", "#4c6ab6",
    "#6f51ac", "#8650a2", "#9d4a98", "#b43f8b",
    "#c94476", "#ce4b63", "#d25450", "#da723f",
    "#e0873e", "#e69a3e",
]
WAVE_TICKS = [0, 0.5, 1, 1.5, 2, 4, 6, 8, 10, 12]


def wave_color_scale():
    cmap = ListedColormap(WAVE_COLORS, name="fixed_windy_inspired_waves")
    cmap.set_bad("#d8e0e2")  # Missing values, including land.
    norm = BoundaryNorm(WAVE_EDGES, cmap.N, clip=True)
    return cmap, norm


def gif_palette() -> Image.Image:
    # Every GIF frame uses this same palette. The exact wave-bin colours come first.
    key_colors = WAVE_COLORS + [
        "#f8fbfd", "#d8e0e2", "#173b4c", "#173746", "#29495a",
        "#31586b", "#607d89", "#829faa", "#ffffff", "#000000",
    ]
    colors = [ImageColor.getrgb(color) for color in key_colors]
    colors += [(r, g, b) for r in (0, 51, 102, 153, 204, 255)
               for g in (0, 51, 102, 153, 204, 255)
               for b in (0, 51, 102, 153, 204, 255)]
    colors += [(shade, shade, shade) for shade in range(24, 256, 16)]
    colors = colors[:256]
    palette = Image.new("P", (1, 1))
    palette.putpalette([component for rgb in colors for component in rgb] + [0] * (768 - len(colors) * 3))
    return palette


def download_latest(grib_path: Path) -> None:
    errors = []
    for source in ("ecmwf", "aws"):
        try:
            client = Client(source=source, maximum_retries=2, retry_after=3, use_server_retry_after=False)
            # Asking for step 360 ensures the chosen 00 UTC run has the full 15 days.
            run = client.latest(time=0, stream="wave", type="fc", step=360, param="swh")
            if run is None:
                raise RuntimeError("No complete 00 UTC wave run is available")
            print(f"Downloading run {run:%Y-%m-%d %H:%M} UTC from {source}", flush=True)
            client.retrieve(
                date=run.strftime("%Y-%m-%d"),
                time=0,
                stream="wave",
                type="fc",
                step=STEPS,
                param="swh",
                target=str(grib_path),
            )
            if not grib_path.is_file() or grib_path.stat().st_size == 0:
                raise RuntimeError("Retrieval produced no GRIB data")
            return
        except Exception as exc:
            grib_path.unlink(missing_ok=True)
            errors.append(f"{source}: {exc}")
            print(f"Source {source} failed; trying next mirror", flush=True)
    raise RuntimeError("Could not retrieve ECMWF open data: " + " | ".join(errors))


def load_subset(grib_path: Path):
    ds = cfgrib.open_dataset(str(grib_path), backend_kwargs={"indexpath": ""})
    if "swh" not in ds:
        raise ValueError("GRIB file has no significant wave height (swh) field")
    if "step" not in ds.swh.dims:
        raise ValueError("GRIB file does not contain a forecast time dimension")

    subset = ds.swh.sel(latitude=slice(NORTH, SOUTH), longitude=slice(WEST, EAST))
    hours = np.asarray(subset.step.values / np.timedelta64(1, "h"), dtype=int)
    if hours.tolist() != STEPS:
        raise ValueError(f"Expected forecast hours {STEPS}; found {hours.tolist()}")
    if subset.sizes["latitude"] < 2 or subset.sizes["longitude"] < 2:
        raise ValueError("The GRIB file does not cover the requested region")

    values = np.asarray(subset.values, dtype=np.float32)
    if not np.isfinite(values).any():
        raise ValueError("No valid wave-height values in the requested region")
    result = {
        "run": np.datetime_as_string(ds.time.values, unit="m"),
        "valid_times": [np.datetime_as_string(t, unit="m") for t in ds.valid_time.values],
        "lat": np.asarray(subset.latitude.values),
        "lon": np.asarray(subset.longitude.values),
        "values": values,
    }
    ds.close()
    return result


def render_frame(data, index: int) -> Image.Image:
    cmap, norm = wave_color_scale()
    fig, ax = plt.subplots(figsize=(9.2, 8.8), dpi=120)
    fig.patch.set_facecolor("#f8fbfd")
    ax.set_facecolor("#d8e0e2")
    lon = data["lon"]
    lat = data["lat"]
    wave = np.ma.masked_invalid(data["values"][index])
    mesh = ax.pcolormesh(lon, lat, wave, cmap=cmap, norm=norm, shading="nearest")
    levels = np.arange(1, int(WAVE_EDGES[-1]) + 1, 1)
    if levels.size:
        field_min = float(np.nanmin(wave))
        field_max = float(np.nanmax(wave))
        draw_levels = [x for x in levels if field_min < x < field_max]
        if draw_levels:
            contour = ax.contour(lon, lat, wave, levels=draw_levels, colors="#173b4c", linewidths=0.65, alpha=0.72)
            ax.clabel(contour, inline=True, fontsize=7, fmt="%d m")

    ax.plot(CENTER_LON, CENTER_LAT, marker="+", markersize=17, markeredgewidth=2.2, color="white", zorder=10)
    ax.plot(CENTER_LON, CENTER_LAT, marker="+", markersize=17, markeredgewidth=1.0, color="#173746", zorder=11)
    lat_index = int(np.argmin(np.abs(lat - CENTER_LAT)))
    lon_index = int(np.argmin(np.abs(lon - CENTER_LON)))
    center_wave = float(data["values"][index, lat_index, lon_index])
    center_label = f"{center_wave:.2f} m" if np.isfinite(center_wave) else "No data"
    ax.annotate(center_label, (CENTER_LON, CENTER_LAT), xytext=(15, 13),
                textcoords="offset points", fontsize=11, fontweight="bold", color="#173746",
                bbox={"boxstyle": "round,pad=0.3", "facecolor": "white", "edgecolor": "#829faa", "alpha": 0.94},
                zorder=12)
    ax.set_xlim(WEST, EAST)
    ax.set_ylim(SOUTH, NORTH)
    ax.set_aspect(1 / math.cos(math.radians(CENTER_LAT)))
    xticks = np.arange(140, 162, 5)
    yticks = np.arange(30, 52, 5)
    ax.set_xticks(xticks[(xticks >= WEST) & (xticks <= EAST)])
    ax.set_yticks(yticks[(yticks >= SOUTH) & (yticks <= NORTH)])
    ax.set_xticklabels([f"{int(x)}°E" for x in ax.get_xticks()])
    ax.set_yticklabels([f"{int(y)}°N" for y in ax.get_yticks()])
    ax.tick_params(labelsize=10, colors="#29495a")
    ax.grid(color="white", alpha=0.42, linewidth=0.65)
    for spine in ax.spines.values():
        spine.set_color("#829faa")

    valid = data["valid_times"][index].replace("T", " ")
    run = data["run"].replace("T", " ")
    ax.set_title("Northwest Pacific · Significant Wave Height", fontsize=17, fontweight="bold", color="#17384a", pad=36)
    ax.text(0, 1.015, f"{valid} UTC  ·  Forecast day {index + 1:02d}",
            transform=ax.transAxes, fontsize=12, color="#31586b")
    cbar = fig.colorbar(mesh, ax=ax, orientation="horizontal", pad=0.12, fraction=0.045,
                        aspect=38, boundaries=WAVE_EDGES, spacing="uniform", ticks=WAVE_TICKS)
    cbar.set_label("Significant wave height (m)", fontsize=10, color="#29495a")
    cbar.set_ticklabels([str(tick) if tick % 1 else str(int(tick)) for tick in WAVE_TICKS])
    cbar.ax.tick_params(labelsize=9, colors="#29495a")
    fig.subplots_adjust(left=0.095, right=0.96, top=0.84, bottom=0.16)
    fig.text(0.095, 0.065, f"ECMWF IFS wave forecast · Run {run} UTC · Center {CENTER_LAT:.0f}°N, {CENTER_LON:.0f}°E",
             fontsize=9, color="#607d89")
    fig.text(0.095, 0.043, f"Region {SOUTH:.0f}–{NORTH:.0f}°N, {WEST:.0f}–{EAST:.0f}°E · 0.25° grid · Source: ECMWF / CC BY 4.0",
             fontsize=9, color="#607d89")
    fig.canvas.draw()
    frame = Image.fromarray(np.asarray(fig.canvas.buffer_rgba())[:, :, :3].copy(), "RGB")
    plt.close(fig)
    return frame


def create_product(data, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    gif_path = output_dir / "ecmwf_swh_latest_15days_41N151E.gif"
    frames = []
    for i, valid in enumerate(data["valid_times"]):
        frames.append(render_frame(data, i))
        print(f"Rendered {i + 1:02d}/15: {valid} UTC", flush=True)
    palette = gif_palette()
    indexed_frames = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    indexed_frames[0].save(gif_path, save_all=True, append_images=indexed_frames[1:],
                           duration=[850] * 14 + [1600], loop=0, optimize=False, disposal=2)

    with Image.open(gif_path) as gif:
        if gif.n_frames != 15:
            raise RuntimeError(f"GIF has {gif.n_frames} frames instead of 15")
    for old_gif in output_dir.glob("*.gif"):
        if old_gif != gif_path:
            old_gif.unlink()
    print(f"GIF: {gif_path}")
    return gif_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path("output"))
    parser.add_argument("--input-grib", type=Path, help="Rerender an existing 15-field swh GRIB file without downloading")
    args = parser.parse_args()

    context = nullcontext(args.input_grib) if args.input_grib else TemporaryDirectory()
    with context as source:
        if args.input_grib:
            grib_path = source
            if not grib_path.is_file():
                raise FileNotFoundError(grib_path)
        else:
            grib_path = Path(source) / "swh.grib2"
            download_latest(grib_path)
        data = load_subset(grib_path)
        create_product(data, args.output_dir)


if __name__ == "__main__":
    main()
