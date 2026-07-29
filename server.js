const express = require('express');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const PLANT_ID_API_KEY = process.env.PLANT_ID_API_KEY || '';
const PLANT_ID_ENDPOINT = 'https://api.plant.id/v3/identification';

const PLANTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'plants.json'), 'utf8'));

const DB_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DB_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DB_DIR, 'scans.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    mode TEXT NOT NULL,
    common_name TEXT,
    scientific_name TEXT,
    probability REAL,
    is_healthy INTEGER,
    diseases TEXT,
    care_slug TEXT
  )
`);

// --- Generic, species-agnostic symptom checklist used by the manual diagnosis wizard ---
const SYMPTOM_OPTIONS = [
  { key: 'yellow_leaves_wet_soil', label: 'Yellow leaves + soil feels wet/soggy', keywords: ['yellow', 'wet', 'soggy', 'soft soil'], cause: 'Overwatering / root rot', fix: 'Let soil dry out more between waterings, check roots for brown mushy sections and trim them, and make sure the pot drains well.' },
  { key: 'yellow_leaves_dry_soil', label: 'Yellow leaves + soil is dry', keywords: ['yellow', 'dry'], cause: 'Underwatering or nutrient deficiency', fix: 'Water more consistently and resume regular feeding during the growing season.' },
  { key: 'brown_crispy_edges', label: 'Brown, crispy leaf edges or tips', keywords: ['brown', 'crisp', 'tip', 'edge'], cause: 'Low humidity, underwatering, or mineral buildup from tap water', fix: 'Increase humidity, water more consistently, and consider switching to filtered or distilled water.' },
  { key: 'brown_soft_spots', label: 'Brown or black soft/mushy spots on leaves', keywords: ['soft spot', 'mushy', 'black spot', 'bacterial', 'fungal', 'spot'], cause: 'Bacterial or fungal leaf spot, often worsened by overwatering or wet foliage', fix: 'Remove affected leaves, avoid wetting foliage when watering, and improve air circulation.' },
  { key: 'wilting_moist_soil', label: 'Wilting/drooping even though soil is moist', keywords: ['wilt', 'droop', 'moist'], cause: 'Root rot or root damage preventing water uptake', fix: 'Check roots for rot, improve drainage, and avoid overwatering going forward.' },
  { key: 'drooping_dry', label: 'Drooping/wilting with dry soil', keywords: ['droop', 'wilt', 'dry', 'thirst', 'shrivel'], cause: 'Underwatering', fix: 'Water thoroughly and keep to a more consistent watering schedule.' },
  { key: 'leggy_growth', label: 'Leggy, stretched growth with sparse leaves', keywords: ['leggy', 'stretch', 'sparse', 'long stem', 'bare'], cause: 'Insufficient light', fix: 'Move to a brighter spot with more indirect (or some direct) light.' },
  { key: 'white_powdery', label: 'White powdery coating on leaves', keywords: ['powder', 'mildew'], cause: 'Powdery mildew (fungal)', fix: 'Improve air circulation, avoid wetting leaves, remove affected leaves, and treat with a fungicide if it spreads.' },
  { key: 'sticky_residue', label: 'Sticky residue on leaves', keywords: ['sticky', 'honeydew'], cause: 'Sap-sucking pest infestation (aphids, mealybugs, or scale) leaving honeydew behind', fix: 'Inspect closely for pests, wipe leaves clean, and treat with insecticidal soap or neem oil.' },
  { key: 'fine_webbing', label: 'Fine webbing between leaves or stems', keywords: ['web', 'spider mite'], cause: 'Spider mites', fix: 'Raise humidity, rinse foliage, and treat with insecticidal soap or neem oil every 5-7 days.' },
  { key: 'cottony_clusters', label: 'Small white cottony clusters', keywords: ['cottony', 'mealybug', 'white fuzz', 'cotton'], cause: 'Mealybugs', fix: 'Dab visible clusters with rubbing alcohol on a cotton swab, then treat with insecticidal soap weekly until clear.' },
  { key: 'brown_bumps', label: 'Small brown/tan bumps on stems or leaves', keywords: ['bump', 'scale'], cause: 'Scale insects', fix: 'Scrape bumps off gently with a fingernail or soft brush, then treat with horticultural oil.' },
  { key: 'tiny_flying_insects', label: 'Tiny flying insects around the soil', keywords: ['fungus gnat', 'flying insect', 'gnat'], cause: 'Fungus gnats, usually from consistently overly wet soil', fix: 'Let the top of the soil dry out more between waterings and use sticky traps or a BTI soil drench.' },
  { key: 'black_sooty', label: 'Black sooty coating on leaves', keywords: ['sooty', 'black mold'], cause: 'Sooty mold growing on pest honeydew', fix: 'Treat the underlying pest infestation first, then gently wipe the sooty residue off leaves.' },
  { key: 'no_new_growth', label: 'No new growth for a long time', keywords: ['no growth', 'stalled', 'dormant', 'slow growth'], cause: 'Seasonal dormancy, insufficient light, or lack of nutrients', fix: 'Slower growth in winter is normal; otherwise move to brighter light and resume feeding in the growing season.' },
  { key: 'leaf_drop_sudden', label: 'Sudden leaf drop', keywords: ['leaf drop', 'dropping', 'shed', 'falling'], cause: 'Environmental shock — a cold draft, relocation, or a sudden change in watering', fix: 'Keep the plant in a stable spot away from drafts and heating/cooling vents, with a consistent watering routine.' },
];

function findPlantBySlug(slug) {
  return PLANTS.find((p) => p.slug === slug) || null;
}

function findPlantByName(name) {
  if (!name) return null;
  const norm = name.trim().toLowerCase();
  const genus = norm.split(' ')[0];

  let match = PLANTS.find((p) => p.scientificName.toLowerCase() === norm);
  if (match) return match;

  match = PLANTS.find(
    (p) =>
      p.commonName.toLowerCase() === norm ||
      (p.aliases || []).some((a) => a.toLowerCase() === norm)
  );
  if (match) return match;

  match = PLANTS.find((p) => p.scientificName.toLowerCase().startsWith(genus + ' '));
  if (match) return match;

  match = PLANTS.find(
    (p) =>
      p.commonName.toLowerCase().includes(norm) ||
      norm.includes(p.commonName.toLowerCase()) ||
      (p.aliases || []).some((a) => norm.includes(a.toLowerCase()) || a.toLowerCase().includes(norm))
  );
  return match || null;
}

function recordScan({ mode, commonName, scientificName, probability, isHealthy, diseases, careSlug }) {
  db.prepare(
    `INSERT INTO scans (created_at, mode, common_name, scientific_name, probability, is_healthy, diseases, care_slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    new Date().toISOString(),
    mode,
    commonName || null,
    scientificName || null,
    probability ?? null,
    isHealthy === undefined || isHealthy === null ? null : isHealthy ? 1 : 0,
    diseases ? JSON.stringify(diseases) : null,
    careSlug || null
  );
}

async function callPlantId(base64Image) {
  const params = new URLSearchParams({
    details: 'common_names,url,description,taxonomy,watering,best_light_condition,best_soil_type',
    health: 'all',
    language: 'en',
  });

  const res = await fetch(`${PLANT_ID_ENDPOINT}?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': PLANT_ID_API_KEY,
    },
    body: JSON.stringify({
      images: [base64Image],
      similar_images: false,
    }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Plant.id returned a non-JSON response (HTTP ${res.status})`);
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || `Plant.id API error (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return json;
}

// Defensive parsing: the Plant.id v3 response shape can vary slightly by
// plan/feature flags, so we probe a few plausible paths instead of assuming one.
function parseIdentification(apiResult) {
  const result = apiResult?.result || {};
  const isPlant = result?.is_plant?.binary ?? result?.is_plant?.probability > 0.5 ?? null;

  const suggestions =
    result?.classification?.suggestions ||
    result?.suggestions ||
    [];

  const top = suggestions[0] || null;
  const identification = top
    ? {
        name: top.name,
        probability: top.probability,
        commonNames: top.details?.common_names || [],
        url: top.details?.url || null,
      }
    : null;

  const isHealthyRaw = result?.is_healthy;
  const isHealthy =
    typeof isHealthyRaw?.binary === 'boolean'
      ? isHealthyRaw.binary
      : typeof isHealthyRaw === 'boolean'
      ? isHealthyRaw
      : null;

  const diseaseSuggestions = result?.disease?.suggestions || [];
  const diseases = diseaseSuggestions.map((d) => ({
    name: d.name,
    probability: d.probability,
    description: d.details?.description || d.disease_details?.description || null,
    treatment:
      d.details?.treatment || d.disease_details?.treatment || null,
  }));

  return { isPlant, identification, isHealthy, diseases };
}

const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  res.json({ scanningEnabled: Boolean(PLANT_ID_API_KEY) });
});

app.get('/api/plants', (req, res) => {
  res.json(
    PLANTS.map((p) => ({
      slug: p.slug,
      commonName: p.commonName,
      scientificName: p.scientificName,
      aliases: p.aliases,
      difficulty: p.difficulty,
    }))
  );
});

app.get('/api/plants/:slug', (req, res) => {
  const plant = findPlantBySlug(req.params.slug);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  res.json(plant);
});

app.get('/api/symptoms', (req, res) => {
  res.json(SYMPTOM_OPTIONS.map((s) => ({ key: s.key, label: s.label })));
});

app.post('/api/scan', async (req, res) => {
  const { image } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Missing "image" (base64 data URL) in request body.' });
  }

  if (!PLANT_ID_API_KEY) {
    return res.json({
      mode: 'manual',
      reason: 'no_api_key',
      message:
        'Photo identification is not configured yet. Set the PLANT_ID_API_KEY environment variable to enable automatic scanning, or use the manual plant picker + symptom checklist below.',
    });
  }

  try {
    const base64 = image.includes(',') ? image.split(',')[1] : image;
    const apiResult = await callPlantId(base64);
    const { isPlant, identification, isHealthy, diseases } = parseIdentification(apiResult);

    if (isPlant === false) {
      return res.json({
        mode: 'api',
        isPlant: false,
        message: "That doesn't look like a plant to me — try a clearer close-up of the leaves or stem.",
      });
    }

    const careProfile = identification
      ? findPlantByName(identification.name) || findPlantByName(identification.commonNames?.[0])
      : null;

    recordScan({
      mode: 'api',
      commonName: careProfile?.commonName || identification?.commonNames?.[0] || null,
      scientificName: identification?.name || null,
      probability: identification?.probability ?? null,
      isHealthy,
      diseases: diseases.map((d) => d.name),
      careSlug: careProfile?.slug || null,
    });

    res.json({
      mode: 'api',
      isPlant: true,
      identification,
      isHealthy,
      diseases,
      careProfile,
      disclaimer:
        'Identification and health assessment are AI-generated estimates (via Plant.id) and can be wrong, especially for unclear photos, rare cultivars, or early-stage problems. For valuable or sick plants, confirm with a local nursery or extension office.',
    });
  } catch (err) {
    console.error('Plant.id scan failed:', err.message);
    res.status(502).json({
      error: 'Photo identification failed.',
      detail: err.message,
      fallback: 'You can still use the manual plant picker + symptom checklist below.',
    });
  }
});

app.post('/api/diagnose', (req, res) => {
  const { plantSlug, symptoms } = req.body || {};
  if (!Array.isArray(symptoms) || symptoms.length === 0) {
    return res.status(400).json({ error: 'Provide at least one symptom key in "symptoms".' });
  }

  const plant = plantSlug ? findPlantBySlug(plantSlug) : null;
  const results = [];

  for (const key of symptoms) {
    const opt = SYMPTOM_OPTIONS.find((s) => s.key === key);
    if (!opt) continue;

    let matched = null;
    if (plant) {
      const hay = (plant.issues || []).concat(
        (plant.pests || []).map((p) => ({ symptom: p.symptoms, cause: p.name, fix: p.treatment }))
      );
      matched = hay.find((entry) =>
        opt.keywords.some((kw) => (entry.symptom || '').toLowerCase().includes(kw))
      );
    }

    results.push({
      symptom: opt.label,
      cause: matched ? matched.cause : opt.cause,
      fix: matched ? matched.fix : opt.fix,
      source: matched ? 'species-specific' : 'general',
    });
  }

  if (plant) {
    recordScan({
      mode: 'manual',
      commonName: plant.commonName,
      scientificName: plant.scientificName,
      probability: null,
      isHealthy: results.length === 0,
      diseases: results.map((r) => r.cause),
      careSlug: plant.slug,
    });
  }

  res.json({ plant: plant || null, results });
});

app.get('/api/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM scans ORDER BY id DESC LIMIT 50').all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      mode: r.mode,
      commonName: r.common_name,
      scientificName: r.scientific_name,
      probability: r.probability,
      isHealthy: r.is_healthy === null ? null : Boolean(r.is_healthy),
      diseases: r.diseases ? JSON.parse(r.diseases) : [],
      careSlug: r.care_slug,
    }))
  );
});

app.delete('/api/history/:id', (req, res) => {
  db.prepare('DELETE FROM scans WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Plant health scanner running at http://localhost:${PORT}`);
  console.log(
    PLANT_ID_API_KEY
      ? 'Photo identification: ENABLED (Plant.id API key found)'
      : 'Photo identification: DISABLED — set PLANT_ID_API_KEY to enable camera-based scanning.'
  );
});
