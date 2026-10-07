#!/usr/bin/env node
// BMM Graph Motion Graphics — headless renderer
// Renders a storyboard (templates/<project>.js) frame-by-frame in Chromium, pipes JPEGs to ffmpeg,
// renders the WebAudio soundtrack offline, and muxes an Instagram-ready H.264/AAC MP4.
//
// usage: node scripts/render.mjs --project bmm-reel-nl-30s.js --out /path/out.mp4
//        [--workers 3] [--samples 6] [--stills 1.2,4.5,...] [--from 0 --to 300] [--preview]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', 'playwright-core']) {
  try { ({ chromium } = require(p)); break; } catch {}
}
if (!chromium) { console.error('Playwright not found: npm i -g playwright (Chromium must be installed)'); process.exit(1); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a), []));
const project = args.project || 'bmm-reel-nl-30s.js';
const out = path.resolve(args.out || `bmm-${project.replace(/\.js$/, '')}.mp4`);
const workers = +(args.workers || Math.max(1, Math.min(4, os.cpus().length - 1)));
const samples = args.preview ? 2 : +(args.samples || 0) || undefined;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bmm-render-'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/templates/player.html?render=1&project=${encodeURIComponent(project)}`;

const launchOpts = { args: ['--disable-web-security', '--autoplay-policy=no-user-gesture-required'] };
if (fs.existsSync('/opt/pw-browsers/chromium')) {
  const exe = ['/opt/pw-browsers/chromium/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (exe) launchOpts.executablePath = exe;
}
const browser = await chromium.launch(launchOpts);
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto(url); await page.evaluate(() => window.__ready);
  return page;
}
const run = (cmd, a, opts = {}) => new Promise((res, rej) => { const p = spawn(cmd, a, { stdio: ['pipe', 'ignore', 'inherit'], ...opts }); p.on('exit', (c) => (c === 0 ? res() : rej(new Error(cmd + ' exit ' + c)))); if (opts.input) { p.stdin.end(opts.input); } });

const page0 = await openPage();
const info = await page0.evaluate(() => window.__info());
console.log(`project ${project}: ${info.width}x${info.height} @${info.fps}fps, ${info.frames} frames, ${workers} workers`);

// ---- stills only (QA)
if (args.stills) {
  const ts = String(args.stills).split(',').map(Number);
  fs.mkdirSync(out, { recursive: true });
  for (const t of ts) {
    const b64 = await page0.evaluate(([f, s]) => window.__png(f, s), [Math.round(t * info.fps), samples]);
    fs.writeFileSync(path.join(out, `still_${t.toFixed(2)}.png`), Buffer.from(b64, 'base64'));
  }
  console.log('stills ->', out); await browser.close(); server.close(); process.exit(0);
}

const from = +(args.from || 0), to = Math.min(info.frames, +(args.to || info.frames));
const total = to - from, per = Math.ceil(total / workers);
const t0 = Date.now(); let done = 0;
const segs = await Promise.all([...Array(workers)].map(async (_, w) => {
  const a = from + w * per, b = Math.min(to, a + per); if (a >= b) return null;
  const page = w === 0 ? page0 : await openPage();
  const seg = path.join(tmp, `seg_${w}.mp4`);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(info.fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', args.preview ? 'veryfast' : 'slow', '-crf', args.preview ? '23' : '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(info.fps), seg], { stdio: ['pipe', 'ignore', 'inherit'] });
  const closed = new Promise((r) => ff.on('exit', r));
  for (let f = a; f < b; f++) {
    const b64 = await page.evaluate(([f, s]) => window.__frame(f, s, 0.95), [f, samples]);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 30 === 0) process.stdout.write(`\r${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await closed; return seg;
}));
console.log(`\nvideo frames done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

const list = path.join(tmp, 'list.txt');
fs.writeFileSync(list, segs.filter(Boolean).map((s) => `file '${s}'`).join('\n'));
const silent = path.join(tmp, 'video.mp4');
await run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);

const wavB64 = await page0.evaluate(() => window.__audio());
await browser.close(); server.close();
if (wavB64) {
  const wav = path.join(tmp, 'audio.wav'); fs.writeFileSync(wav, Buffer.from(wavB64, 'base64'));
  const ss = from / info.fps, dur = total / info.fps;
  await run('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-ss', String(ss), '-t', String(dur), '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'alimiter=limit=0.89:level=false', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out]);
  fs.copyFileSync(wav, out.replace(/\.mp4$/, '.wav'));
} else fs.copyFileSync(silent, out);
console.log('done ->', out);
