#!/usr/bin/env python3
"""Cinematic hero loop from a photoreal still — every frame stays print-sharp."""

from __future__ import annotations

import math
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PLATE = ROOT / "src" / "plates" / "hero_clean.png"
FRAMES = ROOT / "output" / "frames"
OUT = ROOT / "output" / "elancier-hero-banner.mp4"
PUBLIC = ROOT.parent / "public" / "assets" / "frontend" / "videos" / "elancier-hero-banner.mp4"
POSTER = ROOT / "output" / "elancier-hero-banner-poster.png"
PUBLIC_POSTER = PUBLIC.parent / "elancier-hero-banner-poster.png"

W, H = 1920, 880
FPS = 24
DURATION = 16.0
NFRAMES = int(FPS * DURATION)


def ease_in_out(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return t * t * (3.0 - 2.0 * t)


def pingpong(t: float) -> float:
    """0..1..0 over a full loop, eased — seamless."""
    x = t % 1.0
    if x < 0.5:
        return ease_in_out(x * 2.0)
    return ease_in_out(2.0 - x * 2.0)


def unsharp(im: Image.Image, radius=1.4, percent=125, threshold=2) -> Image.Image:
    return im.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold))


def prepare_plate(path: Path) -> Image.Image:
    src = Image.open(path).convert("RGB")
    # 3x oversample so 1920x880 output is a downscale (crisper than 1:1 upscale).
    hi = src.resize((src.width * 3, src.height * 3), Image.Resampling.LANCZOS)
    hi = unsharp(hi, radius=1.6, percent=110, threshold=3)
    # Slight contrast / color for a commercial grade
    hi = ImageEnhance.Contrast(hi).enhance(1.06)
    hi = ImageEnhance.Color(hi).enhance(1.04)
    hi = ImageEnhance.Sharpness(hi).enhance(1.12)
    return hi


def radial_glow(w: int, h: int, cx: float, cy: float, rx: float, ry: float) -> np.ndarray:
    ys, xs = np.ogrid[0:h, 0:w]
    nx = (xs - cx) / rx
    ny = (ys - cy) / ry
    d = nx * nx + ny * ny
    g = np.exp(-d * 0.85).astype(np.float32)
    return g


def screen_rgb(base: np.ndarray, glow: np.ndarray, color: tuple[float, float, float], amount: float) -> np.ndarray:
    overlay = np.zeros_like(base, dtype=np.float32)
    overlay[..., 0] = glow * color[0]
    overlay[..., 1] = glow * color[1]
    overlay[..., 2] = glow * color[2]
    overlay *= amount
    out = 1.0 - (1.0 - base) * (1.0 - overlay)
    return np.clip(out, 0, 1)


def crop_window(im: Image.Image, zoom: float, cx: float, cy: float) -> Image.Image:
    """cx, cy are 0-1 centers in the source. Returns 1920x880 RGB."""
    sw, sh = im.size
    # Largest 24:11 window at zoom 1
    base_h = sw * H / W
    if base_h > sh:
        base_w = sh * W / H
        base_h = sh
    else:
        base_w = sw
    vw = base_w / zoom
    vh = base_h / zoom
    x0 = cx * sw - vw / 2
    y0 = cy * sh - vh / 2
    x0 = max(0, min(sw - vw, x0))
    y0 = max(0, min(sh - vh, y0))
    crop = im.crop((x0, y0, x0 + vw, y0 + vh))
    return crop.resize((W, H), Image.Resampling.LANCZOS)


def render():
    FRAMES.mkdir(parents=True, exist_ok=True)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    plate = prepare_plate(PLATE)
    print("plate", plate.size)

    # Window / sun bloom sits in the upper-middle of the architecture.
    for i in range(NFRAMES):
        t = i / NFRAMES
        k = pingpong(t)
        zoom = 1.0 + 0.048 * k
        # Drift toward the laptop cluster, then back.
        cx = 0.535 + 0.028 * k
        cy = 0.545 + 0.012 * k
        frame = crop_window(plate, zoom, cx, cy)
        arr = np.asarray(frame).astype(np.float32) / 255.0

        # Breathing window light (warm) + teal fill on the left field
        pulse = 0.55 + 0.45 * math.sin(t * math.pi * 2)
        warm = radial_glow(W, H, W * 0.52, H * 0.18, W * 0.28, H * 0.32)
        teal = radial_glow(W, H, W * 0.16, H * 0.62, W * 0.38, H * 0.55)
        arr = screen_rgb(arr, warm, (1.0, 0.93, 0.78), 0.10 * pulse)
        arr = screen_rgb(arr, teal, (0.55, 0.85, 0.82), 0.07)

        # Soft specular sweep across the desk / laptop (thin moving highlight)
        sweep_x = W * (0.42 + 0.38 * pingpong((t + 0.15) % 1.0))
        xs = np.linspace(0, W, W, dtype=np.float32)
        streak = np.exp(-((xs - sweep_x) ** 2) / (2 * (38 ** 2)))
        streak = np.tile(streak, (H, 1))
        # Fade streak toward the top so the left copy area stays clean
        vy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
        streak *= (vy ** 1.35) * 0.09
        arr = np.clip(arr + streak[..., None], 0, 1)

        out = Image.fromarray((arr * 255).astype(np.uint8), "RGB")
        if i == int(NFRAMES * 0.28):
            unsharp(out, radius=0.8, percent=40, threshold=2).save(POSTER, optimize=True)

        out.save(FRAMES / f"frame_{i:04d}.png")
        if i % 24 == 0:
            print(f"frame {i + 1}/{NFRAMES}")

    import subprocess

    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-framerate",
            str(FPS),
            "-i",
            str(FRAMES / "frame_%04d.png"),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "14",
            "-preset",
            "slow",
            "-tune",
            "stillimage",
            "-movflags",
            "+faststart",
            str(OUT),
        ]
    )
    import shutil

    shutil.copy2(OUT, PUBLIC)
    shutil.copy2(POSTER, PUBLIC_POSTER)
    print("wrote", OUT)
    for p in FRAMES.glob("frame_*.png"):
        p.unlink()


if __name__ == "__main__":
    render()
