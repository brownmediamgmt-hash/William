(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------- Tabs ----------
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach((b) => b.classList.remove('active'));
      $$('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // ---------- Config ----------
  let scanningEnabled = false;
  fetch('/api/config')
    .then((r) => r.json())
    .then((cfg) => {
      scanningEnabled = Boolean(cfg.scanningEnabled);
      if (!scanningEnabled) {
        const banner = $('#config-banner');
        banner.classList.remove('hidden');
        banner.innerHTML =
          'Camera-based identification isn\'t configured yet (no Plant.id API key set on the server). You can still capture a photo below for your own reference, but for an accurate diagnosis right now, use the <strong>Diagnose</strong> tab and pick your plant + symptoms.';
      }
    })
    .catch(() => {});

  // ---------- Camera ----------
  const video = $('#camera-video');
  const canvas = $('#capture-canvas');
  const preview = $('#captured-preview');
  const placeholder = $('#camera-placeholder');
  let stream = null;
  let capturedDataUrl = null;

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      video.srcObject = stream;
      video.classList.remove('hidden');
      placeholder.classList.add('hidden');
      preview.classList.add('hidden');
      $('#btn-start-camera').classList.add('hidden');
      $('#btn-capture').classList.remove('hidden');
    } catch (err) {
      showScanError(
        'Could not access the camera (' + err.message + '). You can upload a photo instead using the button below.'
      );
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  function capturePhoto() {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    capturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    showCapturedPreview();
    stopCamera();
  }

  function showCapturedPreview() {
    preview.src = capturedDataUrl;
    preview.classList.remove('hidden');
    video.classList.add('hidden');
    placeholder.classList.add('hidden');
    $('#btn-capture').classList.add('hidden');
    $('#btn-start-camera').classList.add('hidden');
    $('#btn-retake').classList.remove('hidden');
    $('#btn-scan').classList.remove('hidden');
  }

  function resetCamera() {
    capturedDataUrl = null;
    preview.classList.add('hidden');
    video.classList.add('hidden');
    placeholder.classList.remove('hidden');
    $('#btn-retake').classList.add('hidden');
    $('#btn-scan').classList.add('hidden');
    $('#btn-start-camera').classList.remove('hidden');
    $('#btn-capture').classList.add('hidden');
    $('#scan-results').classList.add('hidden');
    $('#scan-error').classList.add('hidden');
  }

  $('#btn-start-camera').addEventListener('click', startCamera);
  $('#btn-capture').addEventListener('click', capturePhoto);
  $('#btn-retake').addEventListener('click', resetCamera);

  $('#file-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      capturedDataUrl = reader.result;
      stopCamera();
      showCapturedPreview();
    };
    reader.readAsDataURL(file);
  });

  function showScanError(msg) {
    const el = $('#scan-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  $('#btn-scan').addEventListener('click', async () => {
    if (!capturedDataUrl) return;
    $('#scan-error').classList.add('hidden');
    $('#scan-results').classList.add('hidden');
    $('#scan-loading').classList.remove('hidden');
    $('#btn-scan').setAttribute('disabled', 'true');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedDataUrl }),
      });
      const data = await res.json();
      $('#scan-loading').classList.add('hidden');
      $('#btn-scan').removeAttribute('disabled');

      if (!res.ok) {
        showScanError((data && (data.detail || data.error)) || 'Scan failed.');
        return;
      }
      renderScanResult(data);
    } catch (err) {
      $('#scan-loading').classList.add('hidden');
      $('#btn-scan').removeAttribute('disabled');
      showScanError('Network error while scanning: ' + err.message);
    }
  });

  function renderCareProfile(p) {
    if (!p) return '';
    const pests = (p.pests || [])
      .map(
        (x) => `<div class="sub-item">
          <div class="sub-item-title">${esc(x.name)}</div>
          <div class="sub-item-body"><strong>Signs:</strong> ${esc(x.symptoms)}<br><strong>Treatment:</strong> ${esc(x.treatment)}</div>
        </div>`
      )
      .join('');
    const issues = (p.issues || [])
      .map(
        (x) => `<div class="sub-item">
          <div class="sub-item-title">${esc(x.symptom)}</div>
          <div class="sub-item-body"><strong>Likely cause:</strong> ${esc(x.cause)}<br><strong>Fix:</strong> ${esc(x.fix)}</div>
        </div>`
      )
      .join('');

    return `
      <div class="card">
        <div class="result-header">
          <div>
            <div class="result-title">${esc(p.commonName)}</div>
            <div class="result-sub">${esc(p.scientificName)}</div>
          </div>
          ${p.toxicToPets ? '<span class="badge badge-issue">Toxic to pets</span>' : '<span class="badge badge-healthy">Pet safe</span>'}
        </div>
        <div class="care-grid">
          <div class="care-item"><div class="care-label">Light</div><div class="care-value">${esc(p.light)}</div></div>
          <div class="care-item"><div class="care-label">Water</div><div class="care-value">${esc(p.water)}</div></div>
          <div class="care-item"><div class="care-label">Soil</div><div class="care-value">${esc(p.soil)}</div></div>
          <div class="care-item"><div class="care-label">Humidity</div><div class="care-value">${esc(p.humidity)}</div></div>
          <div class="care-item"><div class="care-label">Temperature</div><div class="care-value">${esc(p.temperature)}</div></div>
          <div class="care-item"><div class="care-label">Fertilizer</div><div class="care-value">${esc(p.fertilizer)}</div></div>
        </div>
        ${pests ? `<div class="sub-list"><h4>Common pests</h4>${pests}</div>` : ''}
        ${issues ? `<div class="sub-list"><h4>Common issues</h4>${issues}</div>` : ''}
      </div>`;
  }

  function renderScanResult(data) {
    const container = $('#scan-results');
    container.classList.remove('hidden');

    if (data.mode === 'manual') {
      container.innerHTML = `<div class="card">
        <p>${esc(data.message)}</p>
        <button class="btn btn-primary" id="jump-to-diagnose" type="button">Go to Diagnose tab</button>
      </div>`;
      $('#jump-to-diagnose').addEventListener('click', () => $('.tab-btn[data-tab="diagnose"]').click());
      return;
    }

    if (data.isPlant === false) {
      container.innerHTML = `<div class="card"><p>${esc(data.message)}</p></div>`;
      return;
    }

    const id = data.identification;
    const healthBadge =
      data.isHealthy === true
        ? '<span class="badge badge-healthy">Healthy</span>'
        : data.isHealthy === false
        ? '<span class="badge badge-issue">Issue detected</span>'
        : '';

    const diseases = (data.diseases || [])
      .filter((d) => d.probability === undefined || d.probability > 0.15)
      .map((d) => {
        const treatment = d.treatment
          ? typeof d.treatment === 'string'
            ? d.treatment
            : Object.entries(d.treatment)
                .map(([k, v]) => `${esc(k)}: ${esc(Array.isArray(v) ? v.join(', ') : v)}`)
                .join(' · ')
          : 'No specific treatment info returned — consult a local nursery for confirmation.';
        return `<div class="sub-item">
          <div class="sub-item-title">${esc(d.name)} ${d.probability ? `<span class="confidence">(${Math.round(d.probability * 100)}% confidence)</span>` : ''}</div>
          <div class="sub-item-body">${esc(d.description || '')}${d.description ? '<br>' : ''}<strong>Treatment:</strong> ${treatment}</div>
        </div>`;
      })
      .join('');

    const idCard = id
      ? `<div class="card">
          <div class="result-header">
            <div>
              <div class="result-title">${esc(id.commonNames?.[0] || id.name)}</div>
              <div class="result-sub">${esc(id.name)}</div>
            </div>
            ${healthBadge}
          </div>
          <p class="confidence">Identification confidence: ${Math.round((id.probability || 0) * 100)}%</p>
          ${diseases ? `<div class="sub-list"><h4>Health findings</h4>${diseases}</div>` : ''}
          <p class="disclaimer">${esc(data.disclaimer || '')}</p>
        </div>`
      : `<div class="card"><p>Couldn't confidently identify this plant. Try a clearer, well-lit close-up of the leaves, or use the Diagnose tab to look it up manually.</p></div>`;

    container.innerHTML = idCard + (data.careProfile ? renderCareProfile(data.careProfile) : '');
  }

  // ---------- Diagnose tab ----------
  let plantsCache = [];

  function loadPlantsIntoSelect() {
    fetch('/api/plants')
      .then((r) => r.json())
      .then((plants) => {
        plantsCache = plants;
        const select = $('#diagnose-plant-select');
        plants
          .slice()
          .sort((a, b) => a.commonName.localeCompare(b.commonName))
          .forEach((p) => {
            const opt = document.createElement('option');
            opt.value = p.slug;
            opt.textContent = `${p.commonName} (${p.scientificName})`;
            select.appendChild(opt);
          });
        renderPlantGrid(plants);
      });
  }

  function loadSymptoms() {
    fetch('/api/symptoms')
      .then((r) => r.json())
      .then((symptoms) => {
        const container = $('#symptom-list');
        container.innerHTML = '';
        symptoms.forEach((s) => {
          const label = document.createElement('label');
          label.className = 'symptom-item';
          label.innerHTML = `<input type="checkbox" value="${esc(s.key)}"> <span>${esc(s.label)}</span>`;
          const input = label.querySelector('input');
          input.addEventListener('change', () => label.classList.toggle('checked', input.checked));
          container.appendChild(label);
        });
      });
  }

  $('#btn-diagnose').addEventListener('click', async () => {
    const plantSlug = $('#diagnose-plant-select').value;
    const symptoms = $$('#symptom-list input:checked').map((i) => i.value);
    const container = $('#diagnose-results');

    if (symptoms.length === 0) {
      container.classList.remove('hidden');
      container.innerHTML = '<div class="card"><p>Select at least one symptom.</p></div>';
      return;
    }

    const res = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plantSlug: plantSlug || undefined, symptoms }),
    });
    const data = await res.json();

    container.classList.remove('hidden');
    const items = (data.results || [])
      .map(
        (r) => `<div class="sub-item">
          <div class="sub-item-title">${esc(r.symptom)} <span class="badge ${r.source === 'species-specific' ? 'badge-species' : 'badge-general'}">${r.source === 'species-specific' ? 'species-specific' : 'general'}</span></div>
          <div class="sub-item-body"><strong>Likely cause:</strong> ${esc(r.cause)}<br><strong>Fix:</strong> ${esc(r.fix)}</div>
        </div>`
      )
      .join('');

    container.innerHTML =
      `<div class="card"><div class="sub-list"><h4>Diagnosis</h4>${items}</div></div>` +
      (data.plant ? renderCareProfile(data.plant) : '');
  });

  // ---------- Browse tab ----------
  function renderPlantGrid(plants) {
    const grid = $('#plant-grid');
    grid.innerHTML = plants
      .map(
        (p) => `<div class="plant-tile" data-slug="${esc(p.slug)}">
          <div class="name">${esc(p.commonName)}</div>
          <div class="sci">${esc(p.scientificName)}</div>
          <div class="diff">${esc(p.difficulty || '')}</div>
        </div>`
      )
      .join('');
    $$('.plant-tile').forEach((tile) => {
      tile.addEventListener('click', () => openPlantDetail(tile.dataset.slug));
    });
  }

  $('#plant-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = plantsCache.filter(
      (p) =>
        p.commonName.toLowerCase().includes(q) ||
        p.scientificName.toLowerCase().includes(q) ||
        (p.aliases || []).some((a) => a.toLowerCase().includes(q))
    );
    renderPlantGrid(filtered);
  });

  function openPlantDetail(slug) {
    fetch(`/api/plants/${slug}`)
      .then((r) => r.json())
      .then((plant) => {
        $('#plant-detail-card').innerHTML =
          `<button class="overlay-close" id="close-overlay" type="button">✕</button>` + renderCareProfile(plant);
        $('#plant-detail-overlay').classList.remove('hidden');
        $('#close-overlay').addEventListener('click', () => $('#plant-detail-overlay').classList.add('hidden'));
      });
  }

  $('#plant-detail-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'plant-detail-overlay') e.target.classList.add('hidden');
  });

  // ---------- History tab ----------
  function loadHistory() {
    fetch('/api/history')
      .then((r) => r.json())
      .then((rows) => {
        const list = $('#history-list');
        if (rows.length === 0) {
          list.innerHTML = '<div class="empty-state">No scans yet. Try the Scan or Diagnose tab.</div>';
          return;
        }
        list.innerHTML = rows
          .map(
            (r) => `<div class="history-item" data-id="${r.id}">
              <div>
                <div>${esc(r.commonName || 'Unknown plant')} ${
              r.isHealthy === false ? '<span class="badge badge-issue">Issue</span>' : r.isHealthy === true ? '<span class="badge badge-healthy">Healthy</span>' : ''
            }</div>
                <div class="meta">${esc(r.scientificName || '')} · ${new Date(r.createdAt).toLocaleString()} · ${esc(r.mode)}</div>
              </div>
              <button class="delete-btn" title="Delete" type="button">🗑</button>
            </div>`
          )
          .join('');
        $$('.history-item .delete-btn').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const item = e.target.closest('.history-item');
            fetch(`/api/history/${item.dataset.id}`, { method: 'DELETE' }).then(loadHistory);
          });
        });
      });
  }

  $('.tab-btn[data-tab="history"]').addEventListener('click', loadHistory);

  // ---------- Init ----------
  loadPlantsIntoSelect();
  loadSymptoms();
})();
