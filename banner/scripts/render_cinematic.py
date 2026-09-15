#!/usr/bin/env python3
"""Full professional hero animation — layered photoreal composite, looping."""

from __future__ import annotations

import math
import os
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
EMPTY = ROOT / "src" / "plates" / "hero_empty.png"
PROPS = ROOT / "src" / "plates" / "hero_props_key.png"
FRAMES = ROOT / "output" / "frames"
OUT = ROOT / "output" / "elancier-hero-banner.mp4"
PUBLIC = ROOT.parent / "public" / "assets" / "frontend" / "videos" / "elancier-hero-banner.mp4"
POSTER = ROOT / "output" / "elancier-hero-banner-poster.png"
PUBLIC_POSTER = PUBLIC.parent / "elancier-hero-banner-poster.png"

W, H = 1920, 880
FPS = 24
DURATION = 18.0
NFRAMES = int(FPS * DURATION)
SCALE = 3  # plate oversample


def ease_in_out(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return t * t * (3.0 - 2.0 * t)


def pingpong(t: float) -> float:
    x = t % 1.0
    if x < 0.5:
        return ease_in_out(x * 2.0)
    return ease_in_out(2.0 - x * 2.0)


def unsharp(im: Image.Image, radius=1.4, percent=110, threshold=2) -> Image.Image:
    return im.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold))


def magenta_key(im: Image.Image) -> Image.Image:
    rgb = np.asarray(im.convert("RGB")).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    chroma = (r + b) * 0.5 - g
    hard = (g < 78) & (r > 135) & (b > 85)
    alpha = np.clip((88.0 - chroma) / 50.0, 0.0, 1.0)
    alpha = np.where(hard, 0.0, alpha)
    # kill leftover magenta-ish fringe
    key_dist = np.sqrt((r - 237) ** 2 + (g - 12) ** 2 + (b - 183) ** 2)
    alpha = np.where(key_dist < 70, 0.0, alpha)

    a8 = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    a8 = a8.filter(ImageFilter.MinFilter(3))
    a8 = a8.filter(ImageFilter.GaussianBlur(0.9))
    alpha = np.asarray(a8).astype(np.float32) / 255.0

    # despill
    spill = np.clip(chroma / 160.0, 0.0, 1.0) * (1.0 - alpha)
    g2 = np.clip(g + spill * 40, 0, 255)
    r2 = r * (1 - 0.35 * spill) + g2 * (0.35 * spill)
    b2 = b * (1 - 0.25 * spill) + g2 * (0.25 * spill)
    out = np.dstack([r2, g2, b2, alpha * 255]).astype(np.uint8)
    out[alpha < 0.04] = 0
    return Image.fromarray(out, "RGBA")


def crop_alpha(im: Image.Image, box, pad=6) -> Image.Image:
    x0, y0, x1, y1 = box
    tile = im.crop((x0, y0, x1, y1))
    a = np.asarray(tile.split()[-1])
    ys, xs = np.where(a > 24)
    if len(xs) == 0:
        return tile
    bx0, bx1 = xs.min(), xs.max()
    by0, by1 = ys.min(), ys.max()
    return tile.crop((max(0, bx0 - pad), max(0, by0 - pad), min(tile.width, bx1 + pad + 1), min(tile.height, by1 + pad + 1)))


def prepare_plate(path: Path) -> Image.Image:
    src = Image.open(path).convert("RGB")
    hi = src.resize((src.width * SCALE, src.height * SCALE), Image.Resampling.LANCZOS)
    hi = unsharp(hi, radius=1.5, percent=105, threshold=3)
    hi = ImageEnhance.Contrast(hi).enhance(1.05)
    hi = ImageEnhance.Color(hi).enhance(1.03)
    return hi.convert("RGBA")


def load_sprites() -> dict[str, Image.Image]:
    keyed = magenta_key(Image.open(PROPS))
    regions = {
        "phone": (150, 170, 400, 640),
        "chart": (400, 40, 800, 395),
        "mol": (800, 40, 1155, 325),
        "wire": (800, 375, 1160, 650),
    }
    # widths in the 3840-wide working plate
    widths = {"phone": 268, "chart": 390, "mol": 340, "wire": 330}
    out = {}
    for name, box in regions.items():
        spr = crop_alpha(keyed, box)
        nw = widths[name]
        nh = max(1, int(spr.height * (nw / spr.width)))
        spr = spr.resize((nw, nh), Image.Resampling.LANCZOS)
        spr = unsharp(spr, radius=0.7, percent=60, threshold=2)
        out[name] = spr
        if os.environ.get("DEBUG") == "1":
            spr.save(ROOT / "output" / f"debug_{name}.png")
    return out


def shadow_under(size: tuple[int, int], amount=0.22) -> Image.Image:
    w, h = size
    sw, sh = int(w * 0.72), int(h * 0.16)
    img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, sw - 1, sh - 1), fill=(20, 28, 36, int(255 * amount)))
    return img.filter(ImageFilter.GaussianBlur(max(3, sh // 4)))


def rotate_scale(im: Image.Image, angle: float, scale: float) -> Image.Image:
    if abs(scale - 1.0) > 0.001:
        nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
        im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    return im.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)


def paste_center(dst: Image.Image, src: Image.Image, cx: float, cy: float):
    x = int(cx - src.width / 2)
    y = int(cy - src.height / 2)
    dst.alpha_composite(src, (x, y))


def radial_glow(w, h, cx, cy, rx, ry):
    ys, xs = np.ogrid[0:h, 0:w]
    nx = (xs - cx) / rx
    ny = (ys - cy) / ry
    return np.exp(-(nx * nx + ny * ny) * 0.85).astype(np.float32)


def crop_window(im: Image.Image, zoom: float, cx: float, cy: float) -> Image.Image:
    sw, sh = im.size
    base_h = sw * H / W
    if base_h > sh:
        base_w = sh * W / H
        base_h = sh
    else:
        base_w = float(sw)
    vw, vh = base_w / zoom, base_h / zoom
    x0 = cx * sw - vw / 2
    y0 = cy * sh - vh / 2
    x0 = max(0, min(sw - vw, x0))
    y0 = max(0, min(sh - vh, y0))
    crop = im.crop((x0, y0, x0 + vw, y0 + vh))
    return crop.resize((W, H), Image.Resampling.LANCZOS)


def draw_motes(layer: Image.Image, t: float):
    d = ImageDraw.Draw(layer, "RGBA")
    rng = np.random.default_rng(7)
    for i in range(36):
        px = float(rng.uniform(0.38, 0.72))
        py = float(rng.uniform(0.08, 0.42))
        speed = 0.35 + (i % 5) * 0.08
        x = (px + 0.04 * math.sin(t * math.pi * 2 * speed + i)) * layer.width
        y = (py - 0.05 * ((t * speed + i * 0.02) % 1.0)) * layer.height
        r = 1.2 + (i % 4) * 0.6
        a = int(28 + 22 * (0.5 + 0.5 * math.sin(t * math.pi * 2 + i)))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 250, 235, a))


def render():
    FRAMES.mkdir(parents=True, exist_ok=True)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    plate0 = prepare_plate(EMPTY)
    sprites = load_sprites()
    print("plate", plate0.size, "sprites", {k: v.size for k, v in sprites.items()})

    # 1280-space anchors * SCALE
    anchors = {
        "phone": (635 * SCALE, 370 * SCALE),
        "chart": (820 * SCALE, 188 * SCALE),
        "mol": (1028 * SCALE, 148 * SCALE),
        "wire": (1172 * SCALE, 400 * SCALE),
    }

    still = os.environ.get("STILL") == "1"
    still_t = float(os.environ.get("STILL_TIME", "5.5"))
    frames = 1 if still else NFRAMES

    for i in range(frames):
        t = still_t / DURATION if still else i / NFRAMES
        k = pingpong(t)
        world = plate0.copy()

        def place(name, amp_y, amp_x, rot_amp, cycles, phase, scale_amp=0.025):
            ang = (t * cycles + phase) * math.pi * 2
            cx = anchors[name][0] + amp_x * math.sin(ang + 0.7)
            cy = anchors[name][1] + amp_y * math.sin(ang)
            rot = rot_amp * math.sin(ang + 0.4)
            sc = 1.0 + scale_amp * math.sin(ang * 0.5 + 0.2)
            spr = rotate_scale(sprites[name], rot, sc)
            sh = shadow_under((spr.width, spr.height), 0.18 + 0.05 * math.sin(ang))
            paste_center(world, sh, cx + 8, cy + spr.height * 0.42)
            paste_center(world, spr, cx, cy)

        place("chart", 38, 16, -2.2, 1.0, 0.10)
        place("mol", 32, 12, 10.5, 0.5, 0.55)
        place("wire", 36, 18, 2.8, 1.0, 0.82)
        place("phone", 44, 14, 3.2, 1.0, 0.28)

        # camera
        zoom = 1.0 + 0.042 * k
        cx = 0.545 + 0.022 * k
        cy = 0.548 + 0.010 * k
        frame = crop_window(world.convert("RGB"), zoom, cx, cy)

        arr = np.asarray(frame).astype(np.float32) / 255.0
        pulse = 0.55 + 0.45 * math.sin(t * math.pi * 2)
        warm = radial_glow(W, H, W * 0.52, H * 0.18, W * 0.28, H * 0.32)
        teal = radial_glow(W, H, W * 0.16, H * 0.62, W * 0.38, H * 0.55)
        glow = np.stack([warm * 1.0, warm * 0.93, warm * 0.78], axis=-1) * (0.10 * pulse)
        tglow = np.stack([teal * 0.55, teal * 0.85, teal * 0.82], axis=-1) * 0.07
        arr = np.clip(1.0 - (1.0 - arr) * (1.0 - glow), 0, 1)
        arr = np.clip(1.0 - (1.0 - arr) * (1.0 - tglow), 0, 1)

        out = Image.fromarray((arr * 255).astype(np.uint8), "RGB")
        motes = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw_motes(motes, t)
        out = Image.alpha_composite(out.convert("RGBA"), motes).convert("RGB")

        if still or i == int(NFRAMES * 0.32):
            unsharp(out, radius=0.7, percent=35, threshold=2).save(POSTER, optimize=True)
        if still:
            out.save(FRAMES / "frame_0000.png")
            print("still", FRAMES / "frame_0000.png")
            return

        out.save(FRAMES / f"frame_{i:04d}.png")
        if i % 24 == 0:
            print(f"frame {i + 1}/{NFRAMES}")

    subprocess.check_call(
        [
            "ffmpeg", "-y",
            "-framerate", str(FPS),
            "-i", str(FRAMES / "frame_%04d.png"),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-crf", "15",
            "-preset", "medium",
            "-movflags", "+faststart",
            str(OUT),
        ]
    )
    shutil.copy2(OUT, PUBLIC)
    if POSTER.exists():
        shutil.copy2(POSTER, PUBLIC_POSTER)
    print("wrote", OUT)
    for p in FRAMES.glob("frame_*.png"):
        p.unlink()


if __name__ == "__main__":
    render()
