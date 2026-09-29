#!/usr/bin/env node
// Render a composition frame-by-frame and encode it with ffmpeg.
//
//   node render.mjs <composition.html> <out.mp4> [--audio song.mp3] [--audio-offset 0]
//                   [--beats beats.json] [--duration s] [--fps 30] [--from 0] [--to <duration>]
//
// --beats injects beats.py output (bpm + beat times) so state changes land on the
// song's real beats; --duration overrides SCENE.duration (e.g. a whole number of bars).
//
// Also writes QA files next to the video in <out>-check/:
//   contact.png  one frame every half-second, tiled, to eyeball the whole piece
//   first.png / last.png  and loop-seam PSNR printed to stdout (loops only)

import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { launch } from './pw.mjs';

const args = process.argv.slice(2);
const [input, output] = args;
if (!input || !output) {
  console.error('usage: node render.mjs <composition.html> <out.mp4> [--audio song.mp3] [--fps 30]');
  process.exit(1);
}
const opt = {};
for (let i = 2; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
const overrides = {};
if (opt.beats) Object.assign(overrides, (({ bpm, beats }) => ({ bpm, beats }))(JSON.parse(fs.readFileSync(opt.beats, 'utf8'))));
if (opt.duration) overrides.duration = Number(opt.duration);
await page.addInitScript((o) => { window.__SCENE_OVERRIDES = o; }, overrides);
await page.goto(pathToFileURL(path.resolve(input)).href, { waitUntil: 'networkidle' });
await page.evaluate(() => window.__ready);
const scene = await page.evaluate(() => ({
  width: window.SCENE.width, height: window.SCENE.height, fps: window.SCENE.fps,
  duration: window.SCENE.duration, loop: !!window.SCENE.loop,
}));
await page.setViewportSize({ width: scene.width, height: scene.height });

const fps = Number(opt.fps || scene.fps || 30);
const from = Number(opt.from || 0);
const to = Number(opt.to || scene.duration);
const total = Math.round((to - from) * fps);

fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
const ff = ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
if (opt.audio) ff.push('-ss', String(Number(opt['audio-offset'] || 0) + from), '-i', opt.audio);
ff.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart');
if (opt.audio) ff.push('-c:a', 'aac', '-b:a', '192k', '-map', '0:v', '-map', '1:a', '-t', String(to - from),
  '-af', `afade=t=out:st=${Math.max(0, to - from - 0.4)}:d=0.4`);
ff.push(output);
const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
const encDone = new Promise((res, rej) => enc.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));

const started = Date.now();
for (let i = 0; i < total; i++) {
  const t = from + i / fps;
  await page.evaluate((tt) => window.__seek(tt), t);
  const buf = await page.screenshot({ type: 'png' });
  if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
  if (i % fps === 0) process.stdout.write(`\rframe ${i}/${total}`);
}
enc.stdin.end();
await encDone;
process.stdout.write(`\rrendered ${total} frames in ${((Date.now() - started) / 1000).toFixed(1)}s -> ${output}\n`);

// ---------- QA ----------
const checkDir = output.replace(/\.[^.]+$/, '') + '-check';
fs.mkdirSync(checkDir, { recursive: true });
const step = Math.max(1, Math.round(fps / 2));
const cols = 6;
const rows = Math.ceil(total / step / cols);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', output, '-vf',
  `select='not(mod(n\\,${step}))',scale=320:-1,drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,tile=${cols}x${rows}`,
  '-frames:v', '1', '-update', '1', path.join(checkDir, 'contact.png')]);
console.log(`contact sheet -> ${path.join(checkDir, 'contact.png')}`);

if (scene.loop) {
  await page.evaluate((tt) => window.__seek(tt), 0);
  await page.screenshot({ path: path.join(checkDir, 'first.png') });
  await page.evaluate((tt) => window.__seek(tt), scene.duration);
  await page.screenshot({ path: path.join(checkDir, 'last.png') });
  const log = execFileSync('sh', ['-c',
    `ffmpeg -i "${path.join(checkDir, 'first.png')}" -i "${path.join(checkDir, 'last.png')}" -lavfi psnr -f null - 2>&1 || true`],
    { encoding: 'utf8' });
  const m = log.match(/average:(\S+)/);
  console.log(`loop seam PSNR t=0 vs t=${scene.duration}: ${m ? m[1] : '?'} dB ("inf" or > 45 means seamless)`);
}
await browser.close();
