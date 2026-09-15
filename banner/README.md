# Elancier hero banner

Procedural isometric motion graphic for the [elancier.com](https://elancier.com/) hero.

- **Output:** `banner/output/elancier-hero-banner.mp4` (also copied to `public/assets/frontend/videos/`)
- **Format:** 1920×880, 24fps, 20s seamless loop, H.264
- **Left third:** empty studio field for headline overlay
- **Right:** 3D “E” product atelier — glass delivery ring, service slabs, devices, stack chips

Brand palette used: indigo `#6366F1`, deep teal `#257072` (logo), coral `#FB7185`, gold `#E89800` / amber `#F5A623`, ink `#1E2233`, mist `#F5F4FB`.

## Preview locally

Serve `banner/` and open `/src/index.html`.

```bash
cd banner
npm install
python3 -m http.server 5173
# http://127.0.0.1:5173/src/
```

## Re-render

Requires Google Chrome. Writes PNG/JPEG frames then encodes with ffmpeg.

```bash
cd banner
npm install
npm run render
```

Still frame only:

```bash
STILL=1 STILL_TIME=6.2 npm run render
```
