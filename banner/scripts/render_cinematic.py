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
EMPTY = ROOT / "src" / "plates" / "hero_brand_empty.png"
PROPS = ROOT / "src" / "plates" / "hero_brand_cards.png"
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
    key = np.array([216.0, 0.0, 93.0])
    dist = np.sqrt((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2)
    hard = (g < 45) & (r > 155) & (b < 150) & (r > b + 40)
    alpha = np.clip((dist - 26.0) / 38.0, 0.0, 1.0)
    alpha = np.where(hard, 0.0, alpha)

    a8 = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    a8 = a8.filter(ImageFilter.MinFilter(3))
    a8 = a8.filter(ImageFilter.GaussianBlur(0.7))
    alpha = np.asarray(a8).astype(np.float32) / 255.0

    spill = np.clip((r - g) / 220.0, 0.0, 1.0) * (1.0 - alpha)
    spill = np.where((r > 175) & (g < 70), spill, 0.0)
    r2 = r * (1 - 0.45 * spill) + g * (0.45 * spill)
    b2 = b * (1 - 0.25 * spill) + g * (0.25 * spill)
    out = np.dstack([r2, g, b2, alpha * 255]).astype(np.uint8)
    out[alpha < 0.05] = 0
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
        "stack": (70, 70, 530, 640),
        "script": (500, 30, 800, 260),
        "years": (800, 85, 1240, 295),
        "transform": (530, 305, 820, 520),
        "checks": (840, 305, 1240, 670),
    }
    widths = {
        "stack": 430,
        "script": 300,
        "years": 400,
        "transform": 250,
        "checks": 340,
    }
    out = {}
    for name, box in regions.items():
        spr = crop_alpha(keyed, box)
        nw = widths[name]
        nh = max(1, int(spr.height * (nw / spr.width)))
        spr = spr.resize((nw, nh), Image.Resampling.LANCZOS)
        spr = unsharp(spr, radius=0.7, percent=55, threshold=2)
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
        "stack": (590 * SCALE, 345 * SCALE),
        "script": (800 * SCALE, 175 * SCALE),
        "years": (1025 * SCALE, 142 * SCALE),
        "transform": (995 * SCALE, 458 * SCALE),
        "checks": (1155 * SCALE, 348 * SCALE),
    }

    still = os.environ.get("STILL") == "1"
    still_t = float(os.environ.get("STILL_TIME", "5.5"))
    frames = 1 if still else NFRAMES

    for i in range(frames):
        t = still_t / DURATION if still else i / NFRAMES
        k = pingpong(t)
        world = plate0.copy()

        def place(name, amp_y, amp_x, rot_amp, cycles, phase, scale_amp=0.02, shadow=True):
            ang = (t * cycles + phase) * math.pi * 2
            cx = anchors[name][0] + amp_x * math.sin(ang + 0.7)
            cy = anchors[name][1] + amp_y * math.sin(ang)
            rot = rot_amp * math.sin(ang + 0.4)
            sc = 1.0 + scale_amp * math.sin(ang * 0.5 + 0.2)
            spr = rotate_scale(sprites[name], rot, sc)
            if shadow:
                sh = shadow_under((spr.width, spr.height), 0.16 + 0.05 * math.sin(ang))
                paste_center(world, sh, cx + 10, cy + spr.height * 0.40)
            paste_center(world, spr, cx, cy)

        # back to front, matching the Elancier hero still
        place("script", 16, 8, 1.6, 0.5, 0.05, 0.012, shadow=False)
        place("years", 28, 11, -1.6, 1.0, 0.12)
        place("checks", 26, 12, 1.5, 1.0, 0.58)
        place("transform", 24, 9, 2.2, 1.0, 0.33)
        place("stack", 20, 7, -0.9, 1.0, 0.08)

        # camera
        zoom = 1.0 + 0.038 * k
        cx = 0.558 + 0.018 * k
        cy = 0.540 + 0.008 * k
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
