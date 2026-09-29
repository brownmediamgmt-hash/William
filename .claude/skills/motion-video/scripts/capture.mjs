#!/usr/bin/env node
// Capture a live site: full-page screenshot, per-component screenshots, and the
// real copy, colours, fonts and component styles the composition must reuse.
//
//   node capture.mjs <url> <outDir> [--width 1440] [--click "selector"]...
//
// --click lets you reveal hidden states (tabs, modals) before capturing; each
// click produces an extra full-page shot named state-<n>.png.

import fs from 'node:fs';
import path from 'node:path';
import { launch } from './pw.mjs';

const args = process.argv.slice(2);
const url = args[0];
const outDir = args[1];
if (!url || !outDir) {
  console.error('usage: node capture.mjs <url> <outDir> [--width 1440] [--click selector]...');
  process.exit(1);
}
let width = 1440;
const clicks = [];
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--width') width = Number(args[++i]);
  else if (args[i] === '--click') clicks.push(args[++i]);
}

fs.mkdirSync(path.join(outDir, 'components'), { recursive: true });

const browser = await launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle' });

// Scroll to the bottom in steps so lazy / on-visible sections render once.
await page.evaluate(async () => {
  const step = window.innerHeight * 0.6;
  for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 150));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 300));
});

await page.screenshot({ path: path.join(outDir, 'page.png'), fullPage: true });

const extract = () => page.evaluate(() => {
  const SELECTORS = [
    'header', 'nav', 'h1', 'h2', 'h3', 'button', 'a[class*="btn"]', 'label[class*="btn"]',
    'input:not([type="hidden"])', 'select', 'textarea', 'form',
    '[class*="card"]', '[class*="hero"]', '[class*="badge"]', '[class*="chip"]', '[class*="tab"]',
    'section', 'img', 'svg', 'li',
  ];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 8 && r.height > 8 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  };
  const seen = new Set();
  const components = [];
  for (const sel of SELECTORS) {
    for (const el of document.querySelectorAll(sel)) {
      if (seen.has(el) || !visible(el)) continue;
      seen.add(el);
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      components.push({
        id: components.length,
        selector: sel,
        tag: el.tagName.toLowerCase(),
        classes: el.className && typeof el.className === 'string' ? el.className : '',
        text: (el.innerText || el.getAttribute('placeholder') || el.getAttribute('alt') || '').trim().slice(0, 300),
        box: { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
        style: {
          background: cs.backgroundColor,
          color: cs.color,
          borderRadius: cs.borderRadius,
          border: cs.border,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          padding: cs.padding,
          boxShadow: cs.boxShadow,
        },
        html: el.outerHTML.length < 4000 ? el.outerHTML : el.outerHTML.slice(0, 4000) + '<!-- truncated -->',
      });
      if (components.length >= 120) break;
    }
  }

  // Colour palette weighted by painted area.
  const palette = {};
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    for (const [kind, v] of [['bg', cs.backgroundColor], ['fg', cs.color], ['border', cs.borderTopColor]]) {
      if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') continue;
      const key = kind + ' ' + v;
      palette[key] = (palette[key] || 0) + (kind === 'bg' ? area : Math.sqrt(area));
    }
  }
  const colors = Object.entries(palette)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([k, weight]) => ({ role: k.split(' ')[0], color: k.slice(k.indexOf(' ') + 1), weight: Math.round(weight) }));

  const rootVars = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      if (rule.selectorText === ':root') {
        for (const prop of rule.style) if (prop.startsWith('--')) rootVars[prop] = rule.style.getPropertyValue(prop).trim();
      }
    }
  }

  const bodyCs = getComputedStyle(document.body);
  return {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    body: { background: bodyCs.backgroundColor, color: bodyCs.color, fontFamily: bodyCs.fontFamily },
    cssVariables: rootVars,
    fontLinks: [...document.querySelectorAll('link[href*="fonts"]')].map((l) => l.href),
    colors,
    headings: [...document.querySelectorAll('h1,h2,h3')].filter(visible).map((h) => h.innerText.trim()).slice(0, 40),
    pageHeight: document.documentElement.scrollHeight,
    components,
  };
});

const data = await extract();

// Per-component crops for the larger / more interesting components.
async function crop(components, prefix) {
  let n = 0;
  for (const c of components) {
    if (c.box.w * c.box.h < 1500 || n >= 60) continue;
    const file = `components/${prefix}${String(c.id).padStart(3, '0')}-${c.tag}.png`;
    try {
      await page.screenshot({
        path: path.join(outDir, file),
        clip: { x: c.box.x, y: c.box.y, width: Math.min(c.box.w, width), height: Math.min(c.box.h, 2000) },
        fullPage: true,
      });
      c.screenshot = file;
      n++;
    } catch {}
  }
  return n;
}
let shots = await crop(data.components, '');

// Optional interactive states (tabs, modals...), each with its own components.
data.states = [];
for (const [i, sel] of clicks.entries()) {
  try {
    await page.click(sel);
    await page.waitForTimeout(500);
    const file = `state-${i + 1}.png`;
    await page.screenshot({ path: path.join(outDir, file), fullPage: true });
    const s = await extract();
    shots += await crop(s.components, `state-${i + 1}-`);
    data.states.push({ click: sel, screenshot: file, headings: s.headings, components: s.components });
  } catch (e) {
    data.states.push({ click: sel, error: String(e.message || e) });
  }
}

fs.writeFileSync(path.join(outDir, 'capture.json'), JSON.stringify(data, null, 2));
await browser.close();
const stateComps = data.states.reduce((a, s) => a + (s.components?.length || 0), 0);
console.log(`captured ${data.components.length} components (+${stateComps} in ${data.states.length} states), ${shots} crops -> ${outDir}`);
