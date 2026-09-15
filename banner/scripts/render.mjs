import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const FRAMES = path.join(ROOT, 'output', 'frames');
const OUT = path.join(ROOT, 'output', 'elancier-hero-banner.mp4');
const PUBLIC_OUT = path.resolve(ROOT, '..', 'public', 'assets', 'frontend', 'videos', 'elancier-hero-banner.mp4');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, url);
    if (url === '/' || url === '/src/' || url === '/src') {
      file = path.join(SRC, 'index.html');
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg ' + code))));
  });
}

const FPS = Number(process.env.FPS || 24);
const STILL = process.env.STILL === '1';

async function main() {
  fs.mkdirSync(FRAMES, { recursive: true });
  fs.mkdirSync(path.dirname(PUBLIC_OUT), { recursive: true });

  const server = await serve();
  const port = server.address().port;
  const chrome = process.env.CHROME || '/usr/bin/google-chrome-stable';

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      `--window-size=1920,880`,
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 880, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    window.__CAPTURE = true;
  });
  await page.goto(`http://127.0.0.1:${port}/src/index.html`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__ready === true, { timeout: 30000 });

  const duration = await page.evaluate(() => window.__duration);
  const total = STILL ? 1 : Math.round(duration * FPS);

  for (let i = 0; i < total; i++) {
    const t = STILL ? Number(process.env.STILL_TIME || 6.2) : i / FPS;
    await page.evaluate((time) => window.__setTime(time), t);
    const file = path.join(FRAMES, `frame_${String(i).padStart(4, '0')}.png`);
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 880 } });
    fs.writeFileSync(file, buf);
    if (i % 24 === 0) console.log(`frame ${i + 1}/${total}`);
  }

  await browser.close();
  server.close();

  if (STILL) {
    console.log('still written', path.join(FRAMES, 'frame_0000.png'));
    return;
  }

  await ffmpeg([
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(FRAMES, 'frame_%04d.png'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '17',
    '-preset', 'medium',
    '-movflags', '+faststart',
    '-vf', 'format=yuv420p',
    OUT,
  ]);

  fs.copyFileSync(OUT, PUBLIC_OUT);
  console.log('wrote', OUT);
  console.log('copied', PUBLIC_OUT);
  for (const name of fs.readdirSync(FRAMES)) {
    fs.unlinkSync(path.join(FRAMES, name));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
