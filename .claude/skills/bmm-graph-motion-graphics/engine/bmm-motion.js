/* BMM Graph Motion Graphics — canvas engine
 * Deterministic: every pixel is a pure function of time t (seconds).
 * A storyboard script defines window.BMM_PROJECT = { width, height, fps, duration,
 *   chapters, draw(ctx, t, T), mode(t), cues: [] , audio(ctx) } and the engine
 * handles motion blur, grain, timecode, timeline scrubber, preview + render hooks.
 */
(function () {
  'use strict';

  // ---------- palette (sampled from the reference reel) ----------
  const PAL = {
    paper: '#EEEFF2', paperEdge: '#D5D7DC', paperDot: 'rgba(40,44,56,0.10)',
    ink: '#1A1B21', inkSoft: '#3A3C45',
    blue: '#2E7CF6', blueSoft: '#86A9F2', blueGhost: 'rgba(46,124,246,0.55)',
    red: '#F03A4C', redSoft: '#F7838F',
    dark: '#14151B', darkCenter: '#20222A', darkDot: 'rgba(160,166,182,0.16)',
    white: '#F2F3F5', grey: '#8C8F98', greyDark: '#5B5E67',
  };

  // ---------- math ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const mix = (c1, c2, p) => {
    const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const a = h(c1), b = h(c2);
    return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], p))).join(',')})`;
  };
  const E = {
    linear: (p) => p,
    inQuad: (p) => p * p,
    outQuad: (p) => 1 - (1 - p) * (1 - p),
    inCubic: (p) => p * p * p,
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inExpo: (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inOutExpo: (p) => p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2,
    outBack: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
    inBack: (p, s = 1.70158) => (s + 1) * p * p * p - s * p * p,
    outElastic: (p) => p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
    outBounce: (p) => {
      const n = 7.5625, d = 2.75;
      if (p < 1 / d) return n * p * p;
      if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
      if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
      return n * (p -= 2.625 / d) * p + 0.984375;
    },
  };
  // eased progress of t inside [a,b]
  const ep = (t, a, b, e = E.outCubic) => e(prog(t, a, b));
  // seeded random
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s += 0x6d2b79f5; let r = Math.imul(s ^ (s >>> 15), 1 | s);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const noise1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };

  // ---------- canvas setup ----------
  let W = 1080, H = 1920;
  const caches = {};

  function background(ctx, mode) {
    const key = 'bg_' + mode + W + 'x' + H;
    if (!caches[key]) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const light = mode === 'light';
      const rg = g.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.45, Math.hypot(W, H) * 0.62);
      rg.addColorStop(0, light ? '#F6F7F9' : PAL.darkCenter);
      rg.addColorStop(0.55, light ? PAL.paper : '#191A21');
      rg.addColorStop(1, light ? PAL.paperEdge : '#0E0F13');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      // faint dot grid (reference: barely-visible 60px dot lattice)
      g.fillStyle = light ? PAL.paperDot : PAL.darkDot;
      const sp = 54;
      for (let y = sp / 2; y < H; y += sp) for (let x = sp / 2; x < W; x += sp) g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
      caches[key] = c;
    }
    ctx.drawImage(caches[key], 0, 0);
  }

  function grain(ctx, frame, amount = 0.055) {
    if (!caches.grain) {
      caches.grain = [];
      for (let k = 0; k < 6; k++) {
        const c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2;
        const g = c.getContext('2d'); const img = g.createImageData(c.width, c.height);
        const r = rng(99 + k);
        for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0); caches.grain.push(c);
      }
    }
    ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(caches.grain[frame % 6], 0, 0, W, H); ctx.restore();
  }

  // ---------- type ----------
  const F = { display: 'Anton', hand: 'Caveat' };
  const font = (px, fam = F.display, weight = '') => `${weight} ${px}px "${fam}"`.trim();
  const mctx = document.createElement('canvas').getContext('2d');
  function measure(text, size, fam = F.display, weight = '') { mctx.font = font(size, fam, weight); return mctx.measureText(text).width; }
  function fit(text, maxW, maxSize, fam = F.display) { const w = measure(text, 100, fam); return Math.min(maxSize, (maxW / w) * 100); }
  // Anton cap height / em — measured from the real font once it is loaded
  let _cap = 0;
  const capH = () => { if (!_cap) { mctx.font = font(1000); const m = mctx.measureText('H'); _cap = m.actualBoundingBoxAscent / 1000 || 0.82; } return _cap; };

  /**
   * Per-letter text. fn(i, n, ch) -> {dx, dy, rot, sx, sy, a, color}
   * returns layout {x0, w, xs:[letter centre x]}
   */
  function letters(ctx, text, x, y, size, opt = {}) {
    const fam = opt.fam || F.display, align = opt.align || 'left', tracking = opt.tracking || 0;
    ctx.font = font(size, fam, opt.weight || '');
    const chars = [...text];
    const ws = chars.map((c) => ctx.measureText(c).width);
    // kerning-aware advance: measure prefixes
    const adv = []; let prev = 0;
    for (let i = 0; i < chars.length; i++) { const w = ctx.measureText(chars.slice(0, i + 1).join('')).width; adv.push(prev); prev = w + tracking * (i + 1); }
    const total = prev;
    const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    const xs = [];
    chars.forEach((ch, i) => {
      const s = opt.fn ? opt.fn(i, chars.length, ch) || {} : {};
      const a = s.a === undefined ? 1 : s.a;
      const cx = x0 + adv[i] + ws[i] / 2; xs.push(cx);
      if (a <= 0.001 || ch === ' ') return;
      ctx.save();
      ctx.globalAlpha *= clamp(a);
      const CAP = capH();
      ctx.translate(cx + (s.dx || 0), y + (s.dy || 0) - size * CAP * 0.5);
      if (s.rot) ctx.rotate(s.rot);
      ctx.scale(s.sx === undefined ? 1 : s.sx, s.sy === undefined ? 1 : s.sy);
      ctx.fillStyle = s.color || opt.color || PAL.ink;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
      ctx.fillText(ch, 0, size * CAP * 0.5);
      ctx.restore();
    });
    return { x0, w: total, xs, size };
  }

  // stagger helper: local progress of letter i
  const stag = (t, t0, i, step, dur, e = E.outCubic) => e(prog(t, t0 + i * step, t0 + i * step + dur));

  // ---------- hand-drawn layer ----------
  function wobblePts(pts, seed, amp = 2.2) {
    return pts.map((p, i) => [p[0] + noise1(seed + i * 0.37) * amp, p[1] + noise1(seed + 50 + i * 0.41) * amp]);
  }
  function bezierPts(p0, c, p1, n = 40) {
    const out = [];
    for (let i = 0; i <= n; i++) { const u = i / n; out.push([(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1]]); }
    return out;
  }
  function cubicPts(p0, c1, c2, p1, n = 80) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      out.push([v * v * v * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p1[0], v * v * v * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p1[1]]);
    }
    return out;
  }
  // draw polyline up to fraction p (by arc length)
  function strokePartial(ctx, pts, p, opt = {}) {
    if (p <= 0) return null;
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const target = L[L.length - 1] * clamp(p);
    ctx.save();
    ctx.strokeStyle = opt.color || PAL.blue; ctx.lineWidth = opt.width || 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
    if (opt.dash) ctx.setLineDash(opt.dash);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    let end = pts[0], dir = [1, 0];
    for (let i = 1; i < pts.length; i++) {
      if (L[i] <= target) { ctx.lineTo(pts[i][0], pts[i][1]); end = pts[i]; dir = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]; }
      else { const f = (target - L[i - 1]) / (L[i] - L[i - 1] || 1); end = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; dir = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]; ctx.lineTo(end[0], end[1]); break; }
    }
    ctx.stroke(); ctx.restore();
    return { end, dir };
  }

  /** arrow from a to b with bend; drawn on between t0..t0+dur */
  function arrow(ctx, t, t0, a, b, opt = {}) {
    const dur = opt.dur || 0.35, p = ep(t, t0, t0 + dur, E.outCubic);
    if (p <= 0) return;
    const bend = opt.bend === undefined ? 0.25 : opt.bend;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    const c = [mx - dy * bend, my + dx * bend];
    const pts = wobblePts(bezierPts(a, c, b, 30), (opt.seed || 1) * 7, 1.4);
    const col = opt.color || PAL.blue, w = opt.width || 4;
    const r = strokePartial(ctx, pts, p, { color: col, width: w, alpha: opt.alpha });
    if (p > 0.92 && r) {
      const hp = prog(p, 0.92, 1), ang = Math.atan2(r.dir[1], r.dir[0]), hl = (opt.head || 22) * hp;
      ctx.save(); ctx.globalAlpha *= opt.alpha === undefined ? 1 : opt.alpha;
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b[0] - Math.cos(ang - 0.5) * hl, b[1] - Math.sin(ang - 0.5) * hl); ctx.lineTo(b[0], b[1]);
      ctx.lineTo(b[0] - Math.cos(ang + 0.5) * hl, b[1] - Math.sin(ang + 0.5) * hl);
      ctx.stroke(); ctx.restore();
    }
  }

  /** handwritten note, written on left->right */
  function note(ctx, t, t0, text, x, y, opt = {}) {
    const dur = opt.dur || Math.min(0.6, 0.08 + text.length * 0.028);
    const p = prog(t, t0, t0 + dur);
    if (p <= 0) return;
    const size = opt.size || 52, align = opt.align || 'left';
    ctx.save();
    ctx.font = font(size, F.hand, '700');
    const w = ctx.measureText(text).width;
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.translate(x0, y); ctx.rotate(opt.rot === undefined ? -0.035 : opt.rot);
    ctx.beginPath(); ctx.rect(-10, -size * 1.2, (w + 20) * p, size * 1.8); ctx.clip();
    ctx.globalAlpha *= opt.alpha === undefined ? 1 : opt.alpha;
    ctx.fillStyle = opt.color || PAL.blue; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, 0, 0);
    ctx.restore();
    return { x0, w };
  }

  /** hand-drawn underline / strike */
  function scribble(ctx, t, t0, x1, x2, y, opt = {}) {
    const dur = opt.dur || 0.35, p = ep(t, t0, t0 + dur, E.inOutCubic);
    if (p <= 0) return;
    const n = 24, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(x1, x2, u), y + Math.sin(u * Math.PI) * (opt.sag || -4) + noise1((opt.seed || 3) + u * 4) * (opt.amp || 3)]); }
    strokePartial(ctx, pts, p, { color: opt.color || PAL.blue, width: opt.width || 9, alpha: opt.alpha });
  }
  /** double strike-through like the "linear = robotic" crossing in the reference */
  function strike(ctx, t, t0, x1, x2, y, opt = {}) {
    scribble(ctx, t, t0, x1 - 8, x2 + 10, y - 6, { ...opt, dur: 0.18, seed: 11, sag: 2, width: opt.width || 6, color: opt.color || PAL.red });
    scribble(ctx, t, t0 + 0.12, x1 - 4, x2 + 6, y + 8, { ...opt, dur: 0.18, seed: 17, sag: -3, width: opt.width || 6, color: opt.color || PAL.red });
  }
  /** hand check / cross marks */
  function check(ctx, t, t0, x, y, s, color = PAL.blue, w = 7) {
    const pts = wobblePts([[x - s * 0.5, y], [x - s * 0.15, y + s * 0.38], [x + s * 0.55, y - s * 0.5]], x, 1.2);
    strokePartial(ctx, pts, ep(t, t0, t0 + 0.25), { color, width: w });
  }
  function cross(ctx, t, t0, x, y, s, color = PAL.red, w = 7) {
    strokePartial(ctx, wobblePts([[x - s / 2, y - s / 2], [x + s / 2, y + s / 2]], x, 1.5), ep(t, t0, t0 + 0.14), { color, width: w });
    strokePartial(ctx, wobblePts([[x + s / 2, y - s / 2], [x - s / 2, y + s / 2]], y, 1.5), ep(t, t0 + 0.1, t0 + 0.24), { color, width: w });
  }

  // ---------- ball (the hero dot) ----------
  function ball(ctx, x, y, r, opt = {}) {
    ctx.save(); ctx.translate(x, y); if (opt.rot) ctx.rotate(opt.rot);
    ctx.scale(opt.sx || 1, opt.sy || 1);
    ctx.globalAlpha *= opt.alpha === undefined ? 1 : opt.alpha;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    if (opt.stroke) { ctx.strokeStyle = opt.stroke; ctx.lineWidth = opt.lw || 2.5; ctx.stroke(); }
    else { ctx.fillStyle = opt.color || PAL.blue; ctx.fill(); }
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------- chrome: timecode + timeline scrubber ----------
  function timecode(ctx, t, fps, mode) {
    const f = Math.floor(t * fps + 1e-6), s = Math.floor(f / fps), ff = f % fps;
    const pad = (n) => String(n).padStart(2, '0');
    ctx.save(); ctx.font = font(38); ctx.textAlign = 'right';
    ctx.fillStyle = mode === 'light' ? 'rgba(70,73,82,0.85)' : 'rgba(150,154,165,0.8)';
    ctx.fillText(`00:00:${pad(s)}:${pad(ff)}`, W - 64, 168); ctx.restore();
  }
  function timeline(ctx, t, proj, mode) {
    const y = proj.timelineY || H - 220, x0 = 64, x1 = W - 64, D = proj.duration;
    const X = (tt) => lerp(x0, x1, tt / D);
    const light = mode === 'light';
    const base = light ? 'rgba(90,93,102,0.45)' : 'rgba(150,154,165,0.35)';
    const done = light ? 'rgba(60,62,70,0.85)' : 'rgba(190,193,202,0.85)';
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = base; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    for (let s = 0; s <= D; s += 0.5) { const tall = s % 5 === 0 ? 12 : s % 1 === 0 ? 7 : 0; if (!tall) continue; ctx.beginPath(); ctx.moveTo(X(s), y + 6); ctx.lineTo(X(s), y + 6 + tall); ctx.stroke(); }
    ctx.lineWidth = 3; ctx.strokeStyle = done; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(X(t), y); ctx.stroke();
    let cur = proj.chapters[0];
    proj.chapters.forEach((c) => {
      if (t >= c.t) cur = c;
      const px = X(c.t), s = 9; ctx.save(); ctx.translate(px, y); ctx.rotate(Math.PI / 4);
      ctx.lineWidth = 2;
      if (t >= c.t) { ctx.fillStyle = done; ctx.fillRect(-s / 2 - 1, -s / 2 - 1, s + 2, s + 2); }
      else { ctx.fillStyle = light ? PAL.paper : PAL.dark; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.strokeStyle = base; ctx.strokeRect(-s / 2, -s / 2, s, s); }
      ctx.restore();
    });
    // playhead
    const ph = X(t); ctx.fillStyle = done; ctx.strokeStyle = done; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ph, y - 14); ctx.lineTo(ph, y + 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ph - 7, y - 20); ctx.lineTo(ph + 7, y - 20); ctx.lineTo(ph, y - 12); ctx.closePath(); ctx.fill();
    // chapter label written on near playhead
    const lx = clamp(ph - 20, x0 + 10, x1 - measure(cur.label, 40, F.hand, '700') - 10);
    note(ctx, t, cur.t + 0.05, cur.label, lx, y - 34, { size: 40, color: light ? 'rgba(80,83,92,0.9)' : 'rgba(170,174,184,0.9)', rot: -0.02, dur: 0.3 });
    ctx.restore();
  }

  // camera helpers
  function shake(t, t0, amt = 14, dur = 0.25) {
    const p = prog(t, t0, t0 + dur); if (p <= 0 || p >= 1) return [0, 0];
    const k = (1 - p) * (1 - p) * amt; return [noise1(t * 60) * k, noise1(t * 60 + 40) * k];
  }

  // ---------- frame renderer with true sub-frame motion blur ----------
  let sub = null, subCtx = null;
  function renderFrame(ctx, proj, frame, opt = {}) {
    const fps = proj.fps, shutter = opt.shutter || proj.shutter || 0.5;
    const T = frame / fps;
    // more sub-frames during whips/wipes so the blur is a smear, not visible steps
    const samples = opt.samples || (proj.samplesAt && proj.samplesAt(T)) || proj.samples || 6;
    if (!sub) { sub = document.createElement('canvas'); sub.width = W; sub.height = H; subCtx = sub.getContext('2d'); }
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < samples; k++) {
      const t = T + (samples === 1 ? 0 : ((k / (samples - 1)) - 0.5) * shutter / fps);
      subCtx.setTransform(1, 0, 0, 1, 0, 0); subCtx.globalAlpha = 1; subCtx.globalCompositeOperation = 'source-over';
      proj.draw(subCtx, Math.max(0, t), T);
      ctx.globalAlpha = 1 / (k + 1); ctx.drawImage(sub, 0, 0);
    }
    ctx.restore();
    const mode = proj.mode(T);
    if (proj.chrome !== false) { timecode(ctx, T, fps, mode); timeline(ctx, T, proj, mode); }
    grain(ctx, frame, mode === 'light' ? 0.05 : 0.07);
  }

  window.BMM = {
    PAL, E, F, get CAP() { return capH(); }, clamp, lerp, prog, ep, mix, rng, noise1, hash,
    background, grain, font, measure, fit, letters, stag,
    bezierPts, cubicPts, wobblePts, strokePartial, arrow, note, scribble, strike, check, cross,
    ball, roundRect, timecode, timeline, shake, renderFrame,
    setSize(w, h) { W = w; H = h; },
    get W() { return W; }, get H() { return H; },
  };
})();
