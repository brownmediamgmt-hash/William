---
name: motion-video
description: Turn a website, web app, document or set of screenshots into a UI motion-design video made entirely in code — one shape that morphs through the product's real components on the beat of a song, driven by a cursor — rendered to MP4 in square, portrait or landscape. Use whenever the user asks for a motion video, launch video, product demo reel, animated UI promo, "brag" video, Instagram/TikTok/X clip of their site or app, or "make a video of my website/app", even if they don't say "motion design".
---

# Motion video

Build a UI motion video in code: **one shape, never cut**. Every state is the same
element changing size, corner radius and colour while its content swaps with a short
blur. A cursor triggers each change with real clicks, hovers and drags, on the beat.
The camera zooms so each state fills the frame. Everything uses the product's own
components, copy, colours and font. Check your own frames before calling it done.

Paths below are relative to this skill's directory (`.claude/skills/motion-video/`).

## 1. Gather inputs

Ask only for what's missing, in one message:

| Input | Default |
|---|---|
| **Source** — live URL, local app, a document, or screenshots | the project in this repo (start it locally) |
| **Song** — path to an MP3, ideally ~120 BPM (ElevenLabs Music, Mixkit…) | none → silent, 120 BPM grid |
| **Format** — `square` 1440×1440 · `portrait` 1080×1920 · `landscape` 1920×1080 | square |
| **Length** — 14 s seamless loop, or a ~42 s tour of the page in order | 14 s loop |
| **Plan first?** — show the storyboard before building | yes |

## 2. Setup

Check, install only what is missing:
- Node with Playwright + Chromium (`npm i -D playwright && npx playwright install chromium`; if Chromium is pre-installed at a custom path, set `CHROMIUM_PATH`).
- Python 3 with `numpy` and `scipy` (`pip install numpy scipy`).
- `ffmpeg` with libx264.

Work in a scratch folder such as `motion/` (gitignored) — never commit renders.

## 3. Capture the real product

```bash
node scripts/capture.mjs <url> motion/capture [--width 1440] [--click "<selector>"]...
```

Opens the site at 1440 px wide, scrolls to the bottom in steps (so sections that only
render when visible do render), then writes:
- `page.png` full page, `state-N.png` after each `--click` (use clicks for tabs, modals, menus),
- `components/*.png` crops of each component,
- `capture.json`: title, CSS variables, colour palette by painted area, fonts, headings,
  and every component's box, text, computed styles and `outerHTML`.

For a local app, start it first (read its README / package.json). For a document or
screenshots, skip capture and read them directly; the rules below still apply.

**Read the screenshots** (Read tool) and `capture.json` before designing. Collect the
exact colours (`cssVariables` first), font stack, radii, paddings and copy.

## 4. Beats

```bash
python3 scripts/beats.py song.mp3 motion/beats.json        # real song
python3 scripts/beats.py --grid --bpm 120 --duration 14 motion/beats.json   # no song
```

Gives `bpm`, `beats[]` (seconds) and `bars[]`. Pass `--bpm-hint` if the song is far
from 120. For a loop, set the duration to a whole number of bars: `bars × 4 × 60 / bpm`
(7 bars at 120 BPM = 14 s).

## 5. Storyboard (show it if the user said "plan first")

Pick 5–8 states for a 14 s loop (a 42 s tour: 15–25 states, in page order). Each is one
real component: a CTA pill, a card, an input being typed into, a toggle, a list row being
checked, a pricing tier, a stat. Order them so each state's cursor action plausibly
causes the next. Changes land on beats; typical spacing is 2–4 beats, with the longest
hold on the hero moment. Write it as a table: beat · component · size · action.

## 6. Build the composition

Copy `templates/composition.html` to `motion/composition.html` and edit only:
- the `<style>` block: paste the site's font link / `@font-face` and the component CSS you need (from `capture.json` `html`/`style` or the site's stylesheet),
- the `SCENE` block: `width/height` for the format, `duration`, `loop`, `bpm`, `background` (the site's page background), and `states`.

Each state:

```js
{ beat: 8, w: 420, h: 40, radius: 10, bg: '#16211a', color: '#eaf3ea',
  borderColor: '#2a3a2f', borderWidth: 1, pad: '0 11px',
  html: `...the site's real markup and copy...`,
  cursor: { x: 0.06, y: 0.55 },   // where the cursor goes (fraction of the shape)
  action: 'click' }               // 'click' | 'hover' | 'drag' (+ dragFrom) — triggers the NEXT state
```

- `w`/`h` = the component's real size from `capture.json` (the camera zooms, so don't pre-scale).
- Inside `html`, CSS vars `--p` (0→1 across the state), `--drag` (0→1 during a drag), `--t` (seconds into the state) and `--time` (global seconds, wraps at the loop — use it for blinking dots or tickers so the seam stays exact) drive in-state motion: typing, progress bars, sliders, counters. See the `typed()` helper in `examples/william-square.html` for per-letter typing in the site's font.
- With `loop: true` the engine appends a return to state 0 and settles it by the last frame, so **the last frame is the first frame**.
- Everything is a pure function of time. No CSS transitions/animations, timers, `Date.now()` or video elements.

`examples/william-square.html` is a complete, rendered example (this repo's plant app).

### Direction (hard rules)

- One shape, never cut. Content swaps with a short blur; the shape morphs with springs (≤ ~1 % overshoot, built in).
- Use the site's own components, copy, colours and font. **No invented copy.**
- Banned: bouncy easing, particle bursts, glows, gradients on UI chrome, cuts, invented copy, stock icons that aren't on the site.

## 7. Render

```bash
node scripts/render.mjs motion/composition.html motion/out/video.mp4 \
  [--beats motion/beats.json] [--audio song.mp3] [--duration 13.548] [--fps 30]
```

Renders frame-by-frame with Playwright, pipes into ffmpeg (H.264, yuv420p, faststart,
AAC with a short fade out), and writes QA files to `motion/out/video-check/`.
Use `--from/--to` to render a slice while iterating. ~25 s for a 14 s 1440² loop.

## 8. Check your own frames (required)

Before calling it done:
1. **Read `video-check/contact.png`** (a frame every 0.5 s). Look for: text overflowing or clipped by the shape, states that don't fill the frame, cursor off target when it clicks, empty/blank frames, colour or font drift from the site.
2. Extract and **read** 2–3 full-size frames mid-transition (`ffmpeg -ss <t> -i video.mp4 -frames:v 1 f.png`) to check the blur swap and text crispness.
3. For loops, the render prints the **loop seam PSNR**; it must be `inf` or > 45 dB.
4. Fix, re-render, re-check. Only then report, with the video path, duration, format, BPM and the state list.

If you can send files to the user, send the MP4 and the contact sheet.
