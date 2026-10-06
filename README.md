# William — Plant Health Scanner 🌿

Point your camera at a plant to identify it and get accurate care guidance — sunlight, watering, soil, humidity — plus disease and pest diagnosis. Works fully even without any API keys, using a built-in plant care database and a manual symptom checklist; camera-based auto-identification is unlocked by adding a free Plant.id API key.

## What it does

- **Scan tab** — use your phone/laptop camera (or upload a photo) to identify a plant and check its health via the [Plant.id](https://plant.id) API (species ID + disease/pest detection).
- **Diagnose tab** — no API key? Pick your plant from a searchable list and check off what you're seeing (yellow leaves, brown tips, webbing, etc.) for a rule-based diagnosis pulled from the built-in plant database.
- **Plant Guide tab** — browse/search 46 common houseplants with detailed light, water, soil, humidity, temperature, fertilizing, toxicity, common pests, and common issues.
- **History tab** — every scan/diagnosis is saved locally (SQLite) so you can track a plant over time.

## Run locally

Requires **Node.js 22.5+** (uses built-in SQLite — no native dependencies).

```bash
npm install
node server.js
```

Open http://localhost:3000

## Enabling real camera-based identification (recommended)

Without an API key, the Scan tab still lets you capture/upload a photo, but tells you to use the Diagnose tab instead — there's no way to accurately identify a species or detect disease from raw pixels without a trained image model.

To turn on real photo identification + health assessment:

1. Sign up for a free API key at **[plant.id](https://plant.id)** (Kindwise). The free tier covers casual/personal use; paid tiers exist for heavier use.
2. Set the environment variable before starting the server:
   ```bash
   PLANT_ID_API_KEY=your_key_here node server.js
   ```
3. Restart — the Scan tab will now identify the species, report a confidence score, flag any detected diseases/pests with descriptions and treatment, and automatically match it to our local care database for full care instructions.

See `.env.example` for all supported environment variables.

## Data sources

- Photo identification & disease/pest detection: [Plant.id v3 API](https://api.plant.id) (when configured).
- Care guidance (light/water/soil/humidity/temperature/fertilizer/toxicity/common pests & diseases) for 46 common houseplants: compiled from established horticultural consensus (university extension guides, Wikipedia, and standard houseplant care references).

This app gives estimates, not guarantees — photo-based AI identification can be wrong, especially on unclear photos, rare cultivars, or early-stage problems. For valuable or severely ill plants, confirm with a local nursery or agricultural extension office.

## Project structure

```
server.js           Express backend: /api/scan, /api/plants, /api/diagnose, /api/history
data/plants.json     Curated plant care database (46 houseplants)
public/              Frontend (vanilla HTML/CSS/JS, mobile-first, installable as a PWA)
```

## Deploying to Render (recommended, free)

This repo includes a `render.yaml` blueprint, so Render sets almost everything up automatically:

1. Go to the [Render dashboard](https://dashboard.render.com) and sign in (or make a free account).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub account if asked, then pick the **William** repo.
4. Render reads `render.yaml` and shows you one service to create (`william-plant-scanner`). It will ask you to paste in a value for `PLANT_ID_API_KEY` — paste your key from plant.id here (or leave it blank for now and add it later in Settings → Environment).
5. Click **Apply** / **Deploy Blueprint**.
6. Wait a couple of minutes — Render gives you a live URL like `https://william-plant-scanner.onrender.com` when it's done.

**Notes on the free plan:**
- The free instance spins down after 15 minutes of no traffic and takes ~30-60 seconds to wake back up on the next visit — normal for free hosting, not a bug.
- Scan history (SQLite) resets on redeploys on the free plan since it doesn't include persistent storage. The plant care database itself is unaffected since it ships with the code. Upgrade to a paid plan and add a persistent disk mounted at `data/` if you want history to survive redeploys.

## Deploying elsewhere

Works on any host that runs Node 22+: Railway, Fly.io, a VPS, etc.

1. Push this repo to your host.
2. Set `PLANT_ID_API_KEY` (optional but recommended) and `PORT` (host usually sets this) as environment variables.
3. Start command: `node server.js`
4. Mount a persistent disk at `data/` if you want scan history to survive redeploys (the plant database `data/plants.json` ships with the repo either way).

## Motion video skill (Claude Code)

`.claude/skills/motion-video/` is a Claude Code skill that turns a website or app (this one, or any URL) into a UI motion-design video made entirely in code: one shape morphing through the product's real components on the beat of a song, driven by a cursor, rendered to MP4 in square, portrait or landscape. In Claude Code just ask for "a motion video of the app" (or `/motion-video`). See `.claude/skills/motion-video/SKILL.md`; `examples/william-square.html` is a ready-made 14 s loop of this app:

```bash
node .claude/skills/motion-video/scripts/render.mjs .claude/skills/motion-video/examples/william-square.html motion/william.mp4
```

Needs Node + Playwright/Chromium, Python 3 with numpy/scipy, and ffmpeg.
