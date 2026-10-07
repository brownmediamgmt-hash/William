/* BMM — "Zelf doen vs. uitbesteden" · 30s · 1080x1920 · Dutch
 * Storyboard (120 BPM, every scene change lands on a beat):
 *  S1 0.0–3.5  light  bouncing ball (onion skin, squash/stretch) -> "JIJ RUNT JE / ZAAK."
 *  S2 3.5–6.5  dark   kinetic words MAAR / WIE / POST / ER?  (bounce, stretch, spin, snap)
 *  S3 6.5–11.5 light  graph editor: red jagged "zelf doen" reach vs blue ease curve "met BMM"
 *  S4 11.5–17  dark   dot field + follow-through snake, 5 pain points stack into a list
 *  S5 17–22    split  ZELF DOEN (dark, ✕) vs MET BMM (light, ✓) with VS dot
 *  S6 22–25    dark   radial loader "jouw tijd terug" 0–100% -> anticipation squash -> launch
 *  S7 25–30    light  end card "WIJ DOEN JE SOCIALS / BMM." + CTA
 */
(function () {
  const B = window.BMM;
  const { PAL, E, clamp, lerp, prog, ep, letters, stag, note, arrow, scribble, strike, ball, fit, measure, CAP, mix } = B;
  const W = 1080, H = 1920;
  const cues = [];
  const cue = (t, type, o = {}) => cues.push({ t: +t.toFixed(3), type, ...o });
  const A = (ctx, a, fn) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(a); fn(); ctx.restore(); };
  const cam = (ctx, s, ox, oy, fn, cx = W / 2, cy = H / 2) => { ctx.save(); ctx.translate(cx + ox, cy + oy); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore(); };

  // ======================================================== S1 — intro
  const L1 = (() => {
    const s2 = fit('ZAAK', 640, 420), w2 = measure('ZAAK', s2), cap2 = s2 * CAP;
    const r = cap2 * 0.115, gap = r * 0.5, total = w2 + gap + 2 * r, x0 = (W - total) / 2;
    const s1 = fit('JIJ RUNT JE', total, 300), cap1 = s1 * CAP;
    const base2 = 1110, base1 = base2 - cap2 - 34;
    return { s1, s2, w2, cap1, cap2, r, x0, total, base1, base2, px: x0 + w2 + gap + r };
  })();
  const G = 5400, REST = L1.base2 - L1.r;
  const HOPS = [[0.8, 1.4, L1.px - 560, L1.px - 330], [1.4, 1.85, L1.px - 330, L1.px - 150], [1.85, 2.15, L1.px - 150, L1.px - 50], [2.15, 2.35, L1.px - 50, L1.px]];
  const CONTACTS = [[0.8, 1], [1.4, 0.8], [1.85, 0.6], [2.15, 0.4], [2.35, 0.25]];
  CONTACTS.forEach(([t, s]) => cue(t, 'pop', { g: 0.5 + 0.5 * s, f: 520 + (1 - s) * 500 }));
  function ballXY(t) {
    if (t < 0.8) { const d = 0.8 - t; return [lerp(L1.px - 760, L1.px - 560, prog(t, 0.25, 0.8)) - (t < 0.25 ? (0.25 - t) * 360 : 0), REST - 0.5 * G * d * d]; }
    for (const [a, b, xa, xb] of HOPS) if (t < b) { const u = (t - a) / (b - a), h = G * (b - a) * (b - a) / 8; return [lerp(xa, xb, u), REST - 4 * h * u * (1 - u)]; }
    return [L1.px, REST];
  }
  function ballState(t) {
    const [x, y] = ballXY(t);
    const v = (ballXY(t + 0.004)[1] - ballXY(t - 0.004)[1]) / 0.008;
    let sq = 0;
    for (const [c, s] of CONTACTS) { const k = t < c ? 1 - (c - t) / 0.025 : 1 - (t - c) / 0.09; if (k > 0) sq = Math.max(sq, k * s); }
    const st = clamp(Math.abs(v) / 4200, 0, 0.42) * (1 - sq);
    const sy = 1 + st - sq * 0.42, sx = 1 - st * 0.45 + sq * 0.6;
    return { x, y: Math.min(y, L1.base2 - L1.r * sy), sx, sy };
  }
  // letter landings for tick sounds
  [...'JIJ RUNT JE'].forEach((c, i) => c !== ' ' && cue(2.35 + i * 0.045 + 0.3, 'tick', { g: 0.25 }));
  [...'ZAAK'].forEach((c, i) => cue(2.2 + i * 0.07 + 0.28, 'tick', { g: 0.4 }));
  cue(2.8, 'scribble', { d: 0.35 }); cue(3.22, 'whoosh', { d: 0.3, up: true });

  function S1(ctx, t) {
    B.background(ctx, 'light');
    const exit = ep(t, 3.28, 3.5, E.inExpo);
    cam(ctx, 1 + 0.03 * prog(t, 0, 3.5), 0, -380 * exit, () => {
      A(ctx, 1 - exit * 0.6, () => {
        const fade = 1 - ep(t, 2.3, 2.7);
        // floor
        A(ctx, 1 - ep(t, 2.55, 2.9), () => {
          const p = ep(t, 0.05, 0.42, E.outCubic);
          ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(90, L1.base2); ctx.lineTo(lerp(90, 990, p), L1.base2); ctx.stroke();
          // spacing ticks under the floor where the ball touched
          ctx.strokeStyle = PAL.blueGhost; ctx.lineWidth = 3;
          CONTACTS.forEach(([c]) => { if (t > c) { const x = ballXY(c)[0]; ctx.beginPath(); ctx.moveTo(x, L1.base2 + 14); ctx.lineTo(x, L1.base2 + 30); ctx.stroke(); } });
        });
        A(ctx, fade, () => {
          // dotted trajectory
          ctx.fillStyle = 'rgba(40,44,56,0.28)';
          for (let tt = 0.25; tt < Math.min(t, 2.35); tt += 0.012) { const [x, y] = ballXY(tt); ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
          // onion skins
          for (let k = 8; k >= 1; k--) { const tt = t - k * 0.04; if (tt < 0.3) continue; const s = ballState(tt); ball(ctx, s.x, s.y, L1.r, { sx: s.sx, sy: s.sy, stroke: PAL.blue, lw: 2.5, alpha: 0.55 * (1 - k / 9) }); }
          // annotations
          const c0 = ballXY(0.8)[0];
          note(ctx, t, 0.86, 'squash!', c0 + 30, L1.base2 + 105, { color: PAL.red, size: 58 });
          arrow(ctx, t, 0.86, [c0 + 42, L1.base2 + 58], [c0 + 8, L1.base2 + 14], { color: PAL.red, bend: -0.3, head: 16 });
          const ax = (HOPS[0][2] + HOPS[0][3]) / 2, ay = REST - G * 0.36 / 8;
          note(ctx, t, 1.0, 'traag in, traag uit', ax - 250, ay - 150, { size: 54 });
          arrow(ctx, t, 1.12, [ax - 40, ay - 125], [ax - 6, ay - L1.r - 14], { bend: 0.35, head: 16 });
          note(ctx, t, 1.55, 'stretch', L1.px - 150, REST - 280, { size: 54 });
          arrow(ctx, t, 1.62, [L1.px - 140, REST - 255], [L1.px - 190, REST - 150], { bend: 0.3, head: 16 });
        });
        // headline: line 1 drops in rotating, line 2 rises out of the floor
        const r1 = B.rng(4);
        const rots = [...'JIJ RUNT JE'].map(() => (r1() - 0.5) * 0.9);
        letters(ctx, 'JIJ RUNT JE', L1.x0, L1.base1, L1.s1, { color: PAL.ink, fn: (i) => { const p = stag(t, 2.35, i, 0.045, 0.42, E.outBack); return { a: prog(t, 2.35 + i * 0.045, 2.4 + i * 0.045), dy: -(1 - p) * 220, rot: (1 - p) * rots[i] }; } });
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, L1.base2 + 2); ctx.clip();
        letters(ctx, 'ZAAK', L1.x0, L1.base2, L1.s2, { color: PAL.ink, fn: (i) => { const p = stag(t, 2.2, i, 0.07, 0.4, E.outBack); return { a: t > 2.2 + i * 0.07 ? 1 : 0, dy: (1 - p) * L1.cap2 * 1.1 }; } });
        ctx.restore();
        // hero ball
        if (t >= 0.2) { const s = ballState(t); ball(ctx, s.x, s.y, L1.r, { sx: s.sx, sy: s.sy }); }
        // underline + notes
        scribble(ctx, t, 2.8, L1.x0 - 6, L1.x0 + L1.w2 + 4, L1.base2 + 52, { width: 10, seed: 5 });
        note(ctx, t, 2.9, 'stagger: 45ms', L1.x0 + L1.total, L1.base1 - L1.cap1 - 62, { align: 'right', size: 48 });
        arrow(ctx, t, 2.98, [L1.x0 + L1.total - 230, L1.base1 - L1.cap1 - 70], [L1.x0 + L1.total - 330, L1.base1 - L1.cap1 - 12], { bend: 0.35, head: 15, width: 3.5 });
        note(ctx, t, 3.02, '...maar je socials?', L1.x0, L1.base2 + 165, { color: PAL.red, size: 66 });
      });
    });
  }

  // ======================================================== S2 — kinetic words
  const WORDS = [
    { w: 'MAAR', t: 3.5, col: PAL.white, fx: 'bounce', n: 'zwaartekracht-ish' },
    { w: 'WIE', t: 4.25, col: PAL.blue, fx: 'stretch', n: 'elastisch' },
    { w: 'POST', t: 5.0, col: PAL.white, fx: 'spin', n: 'rotateY 450°' },
    { w: 'ER?', t: 5.75, col: PAL.red, fx: 'snap', n: 'laatste post: 6 weken terug' },
  ];
  WORDS.forEach((o) => { o.s = fit(o.w, 900, 400); o.wd = measure(o.w, o.s); cue(o.t, o.fx === 'snap' ? 'snap' : 'hit', { g: 1 }); cue(o.t - 0.12, 'whoosh', { d: 0.14, g: 0.35 }); });
  cue(6.28, 'whoosh', { d: 0.3, up: true });
  function S2(ctx, t) {
    B.background(ctx, 'dark');
    let i = 0; for (let k = 0; k < WORDS.length; k++) if (t >= WORDS[k].t) i = k;
    const o = WORDS[i], lt = t - o.t, cap = o.s * CAP, base = 980 + cap / 2, x0 = (W - o.wd) / 2;
    const punch = 1 + 0.07 * (1 - ep(lt, 0, 0.3));
    const [shx, shy] = o.fx === 'snap' ? B.shake(t, o.t, 16, 0.22) : [0, 0];
    cam(ctx, punch, shx, shy, () => {
      if (o.fx === 'bounce') {
        letters(ctx, o.w, x0, base, o.s, { color: o.col, fn: (j) => { const p = prog(lt, j * 0.05, j * 0.05 + 0.55); return { a: lt >= j * 0.05 ? 1 : 0, dy: -(1 - E.outBounce(p)) * 1000 }; } });
      } else if (o.fx === 'stretch') {
        const p = prog(lt, 0, 0.75), sx = lerp(2.7, 1, E.outElastic(p)), sy = lerp(0.7, 1, E.outElastic(p)), dx = (1 - E.outExpo(clamp(p * 1.7))) * 700;
        ctx.save(); ctx.translate(W / 2 + dx, base - cap / 2); ctx.scale(sx, sy); ctx.translate(-W / 2, -(base - cap / 2));
        letters(ctx, o.w, x0, base, o.s, { color: o.col }); ctx.restore();
      } else if (o.fx === 'spin') {
        letters(ctx, o.w, x0, base, o.s, { color: o.col, fn: (j) => { const p = prog(lt, j * 0.06, j * 0.06 + 0.62); const ang = (1 - E.outCubic(p)) * Math.PI * 2.5; return { a: lt >= j * 0.06 ? 1 : 0, sx: Math.abs(Math.cos(ang)) < 0.03 ? 0.03 : Math.cos(ang) }; } });
      } else {
        // SNAP: no ease, on purpose — with red construction guides
        const g = ep(lt, 0, 0.14, E.outCubic), top = base - cap;
        ctx.strokeStyle = 'rgba(240,58,76,0.75)'; ctx.lineWidth = 2;
        [[top], [base]].forEach(([y]) => { ctx.beginPath(); ctx.moveTo(W / 2 - W * g, y); ctx.lineTo(W / 2 + W * g, y); ctx.stroke(); });
        [x0 - 6, x0 + o.wd + 6].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, (top + base) / 2 - H * g); ctx.lineTo(x, (top + base) / 2 + H * g); ctx.stroke(); });
        letters(ctx, o.w, x0, base, o.s, { color: o.col });
        ctx.fillStyle = PAL.dark; ctx.strokeStyle = PAL.red; ctx.lineWidth = 2;
        for (const x of [x0 - 6, x0 + o.wd / 2, x0 + o.wd + 6]) for (const y of [top, (top + base) / 2, base]) { if (x === x0 + o.wd / 2 && y === (top + base) / 2) continue; ctx.fillRect(x - 7, y - 7, 14, 14); ctx.strokeRect(x - 7, y - 7, 14, 14); }
      }
      note(ctx, t, o.t + 0.2, o.n, x0 + o.wd, base + 95, { align: 'right', color: o.fx === 'snap' ? PAL.redSoft : PAL.blueSoft, size: o.fx === 'snap' ? 58 : 50 });
    });
  }

  // ======================================================== S3 — graph editor
  const GX0 = 150, GX1 = 930, GY0 = 1010, GY1 = 440;
  const gx = (w) => lerp(GX0, GX1, w / 12), gy = (v) => lerp(GY0, GY1, v);
  const DIY = [0.06, 0.42, 0.2, 0.1, 0.06, 0.05, 0.36, 0.14, 0.07, 0.05, 0.27, 0.1, 0.05];
  const POSTS_DIY = [1, 1.35, 6, 10];
  const HDR = { s: Math.min(fit('ZELF DOEN', 380, 112), fit('MET BMM', 380, 112)) };
  const RED_T0 = 6.85, RED_T1 = 8.35;
  POSTS_DIY.forEach((w) => cue(RED_T0 + (w / 12) * (RED_T1 - RED_T0), 'pop', { g: 0.45, f: 380 }));
  const CURVE = { p0: [GX0, GY0 - 25], c1: [GX0 + 0.58 * (GX1 - GX0), GY0 - 25], c2: [GX1 - 0.58 * (GX1 - GX0), GY1 + 20], p1: [GX1, GY1 + 20] };
  const CURVE_PTS = B.cubicPts(CURVE.p0, CURVE.c1, CURVE.c2, CURVE.p1, 120);
  for (let k = 0; k < 12; k++) if (k >= 4) cue(9.2 + k * 0.05, 'tick', { g: 0.3 });
  cue(8.55, 'scribble', { d: 0.3 }); cue(9.0, 'sweep', { d: 0.9 }); cue(11.28, 'whoosh', { d: 0.35, g: 0.8 });
  function S3(ctx, t) {
    B.background(ctx, 'light');
    cam(ctx, 1 + 0.025 * prog(t, 6.5, 11.5), 0, 0, () => {
      const dimRed = 1 - 0.68 * ep(t, 8.55, 8.95);
      // headers
      const r = B.rng(9), rots = [...'ZELF DOEN'].map(() => (r() - 0.5) * 0.7);
      A(ctx, dimRed, () => letters(ctx, 'ZELF DOEN', GX0 - 30, 320, HDR.s, { color: PAL.red, fn: (i) => { const p = stag(t, 6.55, i, 0.04, 0.4, E.outBack); return { a: t > 6.55 + i * 0.04 ? 1 : 0, dy: -(1 - p) * 180, rot: (1 - p) * rots[i] }; } }));
      const zw = measure('ZELF DOEN', HDR.s);
      strike(ctx, t, 8.55, GX0 - 30, GX0 - 30 + zw, 320 - HDR.s * CAP / 2, { width: 7 });
      letters(ctx, 'MET BMM', GX1 + 30, 320, HDR.s, { align: 'right', color: PAL.blue, fn: (i) => { const p = stag(t, 8.8, i, 0.045, 0.4, E.outBack); return { a: t > 8.8 + i * 0.045 ? 1 : 0, dy: -(1 - p) * 180 }; } });
      // axes + grid
      const ax = ep(t, 6.5, 6.85, E.outCubic);
      ctx.strokeStyle = 'rgba(40,44,56,0.08)'; ctx.lineWidth = 2;
      A(ctx, ax, () => { for (let k = 1; k <= 4; k++) { const x = lerp(GX0, GX1, k / 4), y = lerp(GY0, GY1, k / 4); ctx.beginPath(); ctx.moveTo(x, GY0); ctx.lineTo(x, GY1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(GX0, y); ctx.lineTo(GX1, y); ctx.stroke(); } });
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(GX0, lerp(GY0, GY1 - 30, ax)); ctx.lineTo(GX0, GY0); ctx.lineTo(lerp(GX0, GX1 + 20, ax), GY0); ctx.stroke();
      note(ctx, t, 6.7, 'bereik', GX0 + 16, GY1 - 8, { color: PAL.greyDark, size: 48 });
      note(ctx, t, 6.75, 'tijd', GX1 + 20, GY0 + 62, { color: PAL.greyDark, size: 48, align: 'right' });
      // red DIY line
      const redP = prog(t, RED_T0, RED_T1);
      A(ctx, dimRed, () => {
        const pts = DIY.map((v, k) => [gx(k), gy(v)]);
        B.strokePartial(ctx, pts, redP, { color: PAL.red, width: 6 });
        note(ctx, t, 7.55, 'posten "als er tijd is"', GX0 - 20, 1335, { color: PAL.red, size: 54 });
        arrow(ctx, t, 7.65, [GX0 + 120, 1290], [gx(1.15), 1236], { color: PAL.red, bend: 0.25, head: 15 });
        // "weken stil" bracket over the gap
        const bx0 = gx(1.35) + 40, bx1 = gx(6) - 40, by = 1128;
        B.strokePartial(ctx, B.wobblePts([[bx0, by + 16], [bx0, by], [bx1, by], [bx1, by + 16]], 3, 1.2), ep(t, 7.95, 8.2), { color: PAL.red, width: 4 });
        note(ctx, t, 8.05, 'weken stil...', (bx0 + bx1) / 2, by - 16, { color: PAL.red, size: 50, align: 'center' });
      });
      // bezier handles + blue ease curve
      const hp = ep(t, 8.85, 9.15);
      A(ctx, hp, () => {
        ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2;
        [[CURVE.p0, CURVE.c1], [CURVE.p1, CURVE.c2]].forEach(([a, c]) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], c[0], hp), c[1]); ctx.stroke(); ball(ctx, lerp(a[0], c[0], hp), c[1], 11, { color: PAL.red }); });
        [CURVE.p0, CURVE.p1].forEach((p) => { ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(Math.PI / 4); ctx.fillStyle = PAL.ink; ctx.fillRect(-11, -11, 22, 22); ctx.restore(); });
      });
      const cp = ep(t, 9.0, 9.9, E.inOutCubic);
      if (cp > 0) {
        B.strokePartial(ctx, CURVE_PTS, cp, { color: PAL.blue, width: 8 });
        const idx = Math.round(cp * (CURVE_PTS.length - 1)), hpnt = CURVE_PTS[idx];
        A(ctx, 1 - ep(t, 9.9, 10.3), () => { ctx.fillStyle = 'rgba(46,124,246,0.16)'; ctx.fillRect(hpnt[0] - 9, GY1 - 20, 18, GY0 - GY1 + 20); ball(ctx, hpnt[0], hpnt[1], 10, { color: PAL.blue }); });
      }
      const target = CURVE_PTS[70];
      note(ctx, t, 9.85, 'consistent = groei ✓', GX0 + 10, 560, { size: 58 });
      arrow(ctx, t, 9.95, [GX0 + 300, 590], [target[0] - 18, target[1] - 10], { bend: -0.3, head: 17 });
      // post blocks: irregular red -> even blue rhythm
      const sz = 50, rowY = 1195;
      for (let k = 0; k < 12; k++) {
        const slotX = 175 + k * ((905 - 175) / 11);
        let x, a, col, pop;
        if (k < 4) {
          const tp = RED_T0 + (POSTS_DIY[k] / 12) * (RED_T1 - RED_T0);
          pop = E.outBack(prog(t, tp, tp + 0.25)); if (pop <= 0) continue;
          const m = ep(t, 9.05 + k * 0.05, 9.55 + k * 0.05, E.inOutCubic);
          x = lerp(gx(POSTS_DIY[k]), slotX, m); col = m > 0.5 ? PAL.blue : PAL.red; a = m > 0 ? 1 : dimRed;
        } else {
          pop = E.outBack(prog(t, 9.2 + k * 0.05, 9.45 + k * 0.05)); if (pop <= 0) continue;
          x = slotX; col = PAL.blue; a = 1;
        }
        A(ctx, a, () => { ctx.save(); ctx.translate(x, rowY); ctx.scale(pop, pop); B.roundRect(ctx, -sz / 2, -sz / 2, sz, sz, 10); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); });
      }
      note(ctx, t, 10.25, 'vast ritme!', 905, 1335, { size: 58, align: 'right' });
      arrow(ctx, t, 10.35, [800, 1290], [740, 1236], { bend: -0.3, head: 15 });
    });
  }

  // ======================================================== S4 — pain points on a dot field
  const PAINS = [
    ['AVONDEN KWIJT', 'na een volle werkdag nog content maken'],
    ['WEKEN STILTE', 'en het algoritme vergeet je'],
    ['GEEN STRATEGIE', 'posten zonder plan of doel'],
    ["DM'S BLIJVEN LIGGEN", 'antwoord pas na dagen...'],
    ['GEMISTE KLANTEN', 'die kiezen de concurrent'],
  ].map(([w, n], i) => ({ w, n, tin: 11.85 + i * 0.95, s: fit(w, 940, 215), slotY: 520 + i * 118 }));
  const SLOT_S = Math.min(...PAINS.map((p) => fit(p.w, 760, 86)));
  const HDR4 = 'ZELF DOEN KOST JE:', HDR4_S = fit(HDR4, 900, 118);
  PAINS.forEach((p) => { cue(p.tin - 0.1, 'whoosh', { d: 0.14, g: 0.4 }); cue(p.tin + 0.2, 'hit', { g: 0.8 }); cue(p.tin + 0.7, 'whoosh', { d: 0.2, g: 0.2 }); });
  cue(16.55, 'pop', { g: 0.5, f: 700 }); cue(16.95, 'whoosh', { d: 0.3, up: true, g: 0.9 });
  const head = (tt) => { const u = tt - 11.5; return [540 + 390 * Math.sin(1.15 * u + 0.6), 1020 + 600 * Math.sin(0.83 * u + 0.2) * Math.cos(0.31 * u)]; };
  function field(ctx, t, alpha = 1, clipH = H) {
    const [hx, hy] = head(t), sp = 54, R2 = 2 * 150 * 150;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.fillStyle = 'rgba(120,126,140,0.35)';
    const hot = [];
    for (let y = sp / 2; y < clipH; y += sp) for (let x = sp / 2; x < W; x += sp) {
      const dx = x - hx, dy = y - hy, d2 = dx * dx + dy * dy, f = Math.exp(-d2 / R2);
      if (f < 0.04) { ctx.fillRect(x - 2.2, y - 2.2, 4.4, 4.4); continue; }
      const d = Math.sqrt(d2) || 1, push = 95 * f; hot.push([x + (dx / d) * push, y + (dy / d) * push, f, B.hash(x * 7 + y)]);
    }
    hot.forEach(([x, y, f, h]) => { ctx.beginPath(); ctx.arc(x, y, 2.4 + 4.5 * f, 0, Math.PI * 2); ctx.fillStyle = f > 0.35 && h > 0.45 ? `rgba(240,58,76,${0.5 + 0.5 * f})` : `rgba(78,140,247,${0.45 + 0.5 * f})`; ctx.fill(); });
    // follow-through snake
    for (let k = 30; k >= 0; k--) { const [x, y] = head(t - k * 0.02); ball(ctx, x, y, 26 * (1 - k / 34), { color: PAL.blue, alpha: (1 - k / 31) * 0.95 }); }
    ctx.restore();
  }
  function S4(ctx, t) {
    B.background(ctx, 'dark');
    field(ctx, t, 0.75);
    letters(ctx, HDR4, W / 2, 335, HDR4_S, { align: 'center', fn: (i) => { const p = stag(t, 11.6, i, 0.03, 0.4, E.outBack); return { a: t > 11.6 + i * 0.03 ? 1 : 0, dy: -(1 - p) * 160, color: i < 9 ? PAL.red : PAL.white }; } });
    PAINS.forEach((p, i) => {
      const lt = t - p.tin; if (lt < 0) return;
      const enter = E.outExpo(prog(lt, 0, 0.3)), move = E.inOutCubic(prog(lt, 0.68, 0.95));
      const bigW = measure(p.w, p.s), size = lerp(p.s, SLOT_S, move), x = lerp((W - bigW) / 2 + (1 - enter) * 1000, 185, move), y = lerp(1400, p.slotY, move);
      const [sx, sy] = B.shake(t, p.tin + 0.2, 10, 0.2);
      ctx.save(); ctx.translate(sx * (1 - move), sy * (1 - move));
      // impact sparks
      const sp = prog(lt, 0.2, 0.5);
      if (sp > 0 && sp < 1) { ctx.strokeStyle = PAL.red; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + 0.2, r0 = 260 + 180 * E.outCubic(sp), r1 = r0 + 60 * (1 - sp); const cx = W / 2, cy = 1400 - p.s * CAP / 2; ctx.globalAlpha = 1 - sp; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0 * 1.6, cy + Math.sin(a) * r0 * 0.55); ctx.lineTo(cx + Math.cos(a) * r1 * 1.6, cy + Math.sin(a) * r1 * 0.55); ctx.stroke(); } ctx.globalAlpha = 1; }
      letters(ctx, p.w, x, y, size, { color: PAL.white });
      ctx.restore();
      A(ctx, ep(lt, 0.9, 1.05), () => { ctx.font = B.font(SLOT_S * 0.62); ctx.fillStyle = PAL.red; ctx.fillText('0' + (i + 1), 95, p.slotY); });
      A(ctx, 1 - ep(lt, 0.6, 0.72), () => note(ctx, t, p.tin + 0.15, p.n, W / 2, 1520, { align: 'center', color: PAL.blueSoft, size: 62 }));
    });
    note(ctx, t, 16.55, 'herkenbaar?', W / 2, 1430, { align: 'center', size: 110, rot: -0.05 });
    scribble(ctx, t, 16.75, W / 2 - 230, W / 2 + 230, 1465, { width: 8, seed: 21 });
  }

  // ======================================================== S5 — split comparison
  const ROWS = [
    ['POSTEN ALS ER TIJD IS', 'VASTE CONTENTPLANNING'],
    ['GEEN PLAN, GEEN DOEL', 'STRATEGIE + ANALYSE'],
    ['REACTIES BLIJVEN LIGGEN', 'COMMUNITY BEHEERD'],
    ['JOUW AVONDEN KWIJT', 'JIJ FOCUST OP JE ZAAK'],
  ];
  const ROW_S = Math.min(56, ...ROWS.flat().map((r) => fit(r, 780, 56)));
  const H5 = 132;
  ROWS.forEach((_, k) => { const tk = 17.6 + k * 0.55; cue(tk, 'whoosh', { d: 0.12, g: 0.25 }); cue(tk + 0.15, 'tick', { g: 0.5 }); cue(tk + 0.25, 'pop', { g: 0.4, f: 820 }); });
  cue(17.35, 'pop', { g: 0.8, f: 300 }); cue(20.05, 'scribble', { d: 0.3 }); cue(20.35, 'scribble', { d: 0.3 }); cue(21.7, 'whoosh', { d: 0.3, g: 0.5 });
  function S5(ctx, t) {
    const panel = lerp(H, 960, ep(t, 17.0, 17.4, E.outExpo));
    B.background(ctx, 'dark');
    field(ctx, t, 0.3, panel);
    const dim = ep(t, 20.1, 20.4);
    // top: ZELF DOEN
    const r = B.rng(5);
    const rots = [...'ZELF DOEN'].map(() => (r() - 0.5) * 0.7);
    A(ctx, 1 - dim * 0.5, () => {
      letters(ctx, 'ZELF DOEN', W / 2, 300, H5, { align: 'center', color: PAL.red, fn: (i) => { const p = stag(t, 17.1, i, 0.04, 0.4, E.outBack); return { a: t > 17.1 + i * 0.04 ? 1 : 0, dy: -(1 - p) * 180, rot: (1 - p) * rots[i] }; } });
      ROWS.forEach(([a], k) => { const tk = 17.6 + k * 0.55, p = E.outExpo(prog(t, tk, tk + 0.35)); if (p <= 0) return; const y = 425 + k * 98; letters(ctx, a, 175 - (1 - p) * 800, y, ROW_S, { color: 'rgba(242,243,245,0.88)' }); B.cross(ctx, t, tk + 0.15, 118, y - ROW_S * CAP / 2, 30); });
    });
    const zw = measure('ZELF DOEN', H5);
    strike(ctx, t, 20.05, W / 2 - zw / 2, W / 2 + zw / 2, 300 - H5 * CAP / 2, { width: 9 });
    // bottom: MET BMM (light panel)
    ctx.save(); ctx.beginPath(); ctx.rect(0, panel, W, H - panel); ctx.clip();
    B.background(ctx, 'light');
    ctx.translate(0, panel - 960);
    letters(ctx, 'MET BMM', W / 2, 1195, H5, { align: 'center', color: PAL.blue, fn: (i) => { const p = stag(t, 17.3, i, 0.05, 0.4, E.outBack); return { a: t > 17.3 + i * 0.05 ? 1 : 0, dy: (1 - p) * 160 }; } });
    ROWS.forEach(([, b], k) => { const tk = 17.7 + k * 0.55, p = E.outExpo(prog(t, tk, tk + 0.35)); if (p <= 0) return; const y = 1310 + k * 92; letters(ctx, b, 175 + (1 - p) * 800, y, ROW_S, { color: PAL.ink }); B.check(ctx, t, tk + 0.15, 118, y - ROW_S * CAP / 2, 34); });
    const mw = measure('MET BMM', H5);
    scribble(ctx, t, 20.35, W / 2 - mw / 2, W / 2 + mw / 2, 1230, { width: 10, seed: 8 });
    note(ctx, t, 20.6, 'de keuze is simpel ✓', 1000, 1050, { align: 'right', size: 50, rot: -0.06 });
    ctx.restore();
    // VS dot on the seam -> becomes the loader core
    const toDark = ep(t, 21.65, 21.98, E.inOutCubic);
    if (toDark > 0) { ctx.fillStyle = `rgba(20,21,27,${toDark})`; ctx.fillRect(0, 0, W, H); }
    const vp = E.outBack(prog(t, 17.3, 17.6), 2.2);
    if (vp > 0) {
      const rr = lerp(66, 48, toDark) * vp;
      ball(ctx, W / 2, 960, rr, { color: PAL.blue });
      A(ctx, 1 - toDark, () => { ctx.font = B.font(54); ctx.fillStyle = PAL.white; ctx.textAlign = 'center'; ctx.save(); ctx.translate(W / 2, 960); ctx.scale(vp, vp); ctx.fillText('VS', 0, 20); ctx.restore(); });
    }
  }

  // ======================================================== S6 — loader: jouw tijd terug
  const CX = W / 2, CY = 960;
  const P6 = (t) => E.inOutCubic(prog(t, 22.25, 24.15));
  const TASKS = ['planning ✓', 'content maken ✓', 'posten ✓', "reacties & DM's ✓"];
  // marker fill times -> tick cues
  for (let k = 1; k <= 16; k++) { let lo = 22.25, hi = 24.15; for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (P6(m) * 16 >= k) hi = m; else lo = m; } cue(hi, 'tick', { g: 0.35, f: 1800 + k * 60 }); }
  cue(22.1, 'riser', { d: 2.5 }); cue(24.2, 'squash', { d: 0.4 }); cue(24.62, 'whoosh', { d: 0.35, up: true, g: 1 });
  function S6(ctx, t) {
    B.background(ctx, 'dark');
    const P = P6(t), ant = ep(t, 24.2, 24.6, E.outCubic), launch = prog(t, 24.62, 24.95), out = 1 - ep(t, 24.62, 24.8);
    A(ctx, out, () => {
      letters(ctx, 'JOUW TIJD', W / 2, 430, 132, { align: 'center', color: PAL.white, fn: (i) => { const p = stag(t, 22.0, i, 0.04, 0.4, E.outBack); return { a: t > 22 + i * 0.04 ? 1 : 0, dy: -(1 - p) * 160 }; } });
      letters(ctx, 'TERUG.', W / 2, 570, 132, { align: 'center', color: PAL.blue, fn: (i) => { const p = stag(t, 22.15, i, 0.04, 0.4, E.outBack); return { a: t > 22.15 + i * 0.04 ? 1 : 0, dy: (1 - p) * 160 }; } });
      cam(ctx, 1 - 0.06 * ant, 0, 0, () => {
        const ring = ep(t, 22.0, 22.4, E.outCubic);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#2C2F39'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(CX, CY, 262, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring); ctx.stroke();
        ctx.strokeStyle = PAL.white; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(CX, CY, 262, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * P); ctx.stroke();
        for (let k = 0; k < 90; k++) { if (k / 90 > ring) break; const a = (k / 90) * Math.PI * 2 - Math.PI / 2 + (1 - ring) * 0.8, l = k % 5 === 0 ? 22 : 12; ctx.strokeStyle = k / 90 < P ? 'rgba(134,169,242,0.85)' : 'rgba(140,143,152,0.45)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * 150, CY + Math.sin(a) * 150); ctx.lineTo(CX + Math.cos(a) * (150 + l), CY + Math.sin(a) * (150 + l)); ctx.stroke(); }
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2 - Math.PI / 2, on = P * 16 > k + 0.999, pp = on ? E.outBack(clamp((P * 16 - k - 1) * 3)) : 0;
          ctx.save(); ctx.translate(CX + Math.cos(a) * 212, CY + Math.sin(a) * 212); ctx.rotate(a + Math.PI / 4);
          const s = 13 * (on ? 1 + 0.35 * (1 - pp) : 1) * ring;
          if (on) { ctx.fillStyle = PAL.blue; ctx.fillRect(-s / 2, -s / 2, s, s); } else { ctx.strokeStyle = 'rgba(140,143,152,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(-s / 2, -s / 2, s, s); }
          ctx.restore();
        }
      });
      ctx.font = B.font(84); ctx.fillStyle = PAL.white; ctx.textAlign = 'center'; ctx.fillText(Math.round(P * 100) + '%', CX, 1340); ctx.textAlign = 'left';
      const ti = Math.min(3, Math.floor(P * 4 + 0.0001));
      if (t > 22.3) note(ctx, t, 22.3 + ti * 0.47, TASKS[ti], CX, 1430, { align: 'center', size: 58, color: PAL.blueSoft });
      note(ctx, t, 24.2, 'anticipatie', 690, 770, { size: 56, color: PAL.blueSoft });
      arrow(ctx, t, 24.28, [700, 790], [CX + 40, CY - 50], { color: PAL.blueSoft, bend: 0.35, head: 15 });
    });
    // the core ball: squash (anticipation) then launch with stretch
    const r = 48;
    let sx = 1 + 0.8 * ant, sy = 1 - 0.55 * ant, y = CY + r * 0.55 * ant;
    if (launch > 0) { sx = lerp(1.8, 0.62, clamp(launch * 4)); sy = lerp(0.45, 2.3, clamp(launch * 4)); y = CY + r * 0.55 - 1400 * E.inQuad(launch) - 260 * launch; }
    ball(ctx, CX, y, r, { sx, sy });
  }

  // ======================================================== S7 — end card
  const L7 = (() => {
    const s2 = fit('BMM', 700, 520), w2 = measure('BMM', s2), cap2 = s2 * CAP;
    const r = cap2 * 0.115, gap = r * 0.5, total = w2 + gap + 2 * r, x0 = (W - total) / 2;
    const s1 = fit('WIJ DOEN JE SOCIALS', total, 200), cap1 = s1 * CAP;
    const base2 = 1100, base1 = base2 - cap2 - 36;
    return { s1, s2, w2, cap1, cap2, r, x0, total, base1, base2, px: x0 + w2 + gap + r };
  })();
  const REST7 = L7.base2 - L7.r;
  cue(25.0, 'impact', { g: 1 }); cue(25.5, 'pop', { g: 0.9, f: 420 }); cue(25.78, 'pop', { g: 0.5, f: 640 }); cue(25.95, 'scribble', { d: 0.35 }); cue(26.2, 'chime'); cue(27.2, 'scribble', { d: 0.45 });
  [...'WIJ DOEN JE SOCIALS'].forEach((c, i) => c !== ' ' && cue(25.05 + i * 0.035 + 0.3, 'tick', { g: 0.18 }));
  function ball7(t) {
    if (t < 25.5) { const p = prog(t, 25.0, 25.5); return { y: lerp(-120, REST7, E.inQuad(p)), sx: 0.75, sy: 1.35 }; }
    let y = REST7; if (t < 25.78) { const u = prog(t, 25.5, 25.78); y = REST7 - 4 * 70 * u * (1 - u); }
    let sq = 0; for (const [c, s] of [[25.5, 1], [25.78, 0.5]]) { const k = 1 - Math.abs(t - c) / 0.08; if (k > 0) sq = Math.max(sq, k * s); }
    return { y: Math.min(y, L7.base2 - L7.r * (1 - 0.45 * sq)), sx: 1 + 0.6 * sq, sy: 1 - 0.45 * sq };
  }
  function S7(ctx, t) {
    B.background(ctx, 'light');
    const flash = 1 - ep(t, 25.0, 25.25);
    cam(ctx, 1 + 0.035 * prog(t, 25, 30), 0, 0, () => {
      const r1 = B.rng(12), rots = [...'WIJ DOEN JE SOCIALS'].map(() => (r1() - 0.5) * 0.9);
      letters(ctx, 'WIJ DOEN JE SOCIALS', L7.x0, L7.base1, L7.s1, { color: PAL.ink, fn: (i) => { const p = stag(t, 25.05, i, 0.035, 0.42, E.outBack); return { a: prog(t, 25.05 + i * 0.035, 25.1 + i * 0.035), dy: -(1 - p) * 200, rot: (1 - p) * rots[i] }; } });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, L7.base2 + 2); ctx.clip();
      letters(ctx, 'BMM', L7.x0, L7.base2, L7.s2, { color: PAL.ink, fn: (i) => { const p = stag(t, 25.12, i, 0.08, 0.45, E.outBack); return { a: t > 25.12 + i * 0.08 ? 1 : 0, dy: (1 - p) * L7.cap2 * 1.1 }; } });
      ctx.restore();
      const b = ball7(t); ball(ctx, L7.px, b.y, L7.r, { sx: b.sx, sy: b.sy });
      scribble(ctx, t, 25.95, L7.x0 - 6, L7.x0 + L7.w2 + 6, L7.base2 + 56, { width: 11, seed: 14 });
      note(ctx, t, 26.2, 'jij runt je zaak ✓', L7.px + 30, L7.base2 + 190, { align: 'right', size: 62 });
      arrow(ctx, t, 26.3, [L7.px + 6, L7.base2 + 135], [L7.px + 4, L7.base2 + 10], { bend: -0.35, head: 16 });
      A(ctx, ep(t, 26.55, 26.9), () => letters(ctx, 'BROWN MEDIA MANAGEMENT', W / 2, L7.base2 + 300 + (1 - ep(t, 26.55, 26.9)) * 30, 44, { align: 'center', tracking: 7, color: PAL.greyDark }));
      // CTA in a hand-drawn box
      const bw = 560, bh = 120, by = 1500;
      const box = B.wobblePts([[W / 2 - bw / 2, by - bh / 2], [W / 2 + bw / 2, by - bh / 2 - 4], [W / 2 + bw / 2 + 4, by + bh / 2], [W / 2 - bw / 2 - 2, by + bh / 2 + 3], [W / 2 - bw / 2 + 6, by - bh / 2 - 6]], 31, 3);
      B.strokePartial(ctx, box, ep(t, 27.2, 27.65, E.inOutCubic), { color: PAL.blue, width: 6 });
      note(ctx, t, 27.4, 'stuur ons een DM →', W / 2, by + 20, { align: 'center', size: 66, color: PAL.ink, rot: -0.02 });
    });
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.85})`; ctx.fillRect(0, 0, W, H); }
  }

  // ======================================================== master
  function draw(ctx, t) {
    if (t < 3.5) S1(ctx, t);
    else if (t < 6.3) S2(ctx, t);
    else if (t < 6.62) { // slanted wipe up into the light graph
      const e = E.inOutExpo(prog(t, 6.3, 6.62)), y = lerp(H + 240, -240, e);
      S2(ctx, t);
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, y + 120); ctx.lineTo(W, y - 120); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip(); S3(ctx, t); ctx.restore();
    } else if (t < 11.3) S3(ctx, t);
    else if (t < 11.62) { // whip pan left
      const e = E.inOutExpo(prog(t, 11.3, 11.62));
      ctx.save(); ctx.translate(-W * e, 0); S3(ctx, t); ctx.restore();
      ctx.save(); ctx.translate(W - W * e, 0); S4(ctx, t); ctx.restore();
    } else if (t < 17) S4(ctx, t);
    else if (t < 22) S5(ctx, t);
    else if (t < 25) S6(ctx, t);
    else S7(ctx, t);
  }
  function mode(t) { return t < 3.5 ? 'light' : t < 6.45 ? 'dark' : t < 11.46 ? 'light' : t < 17.2 ? 'dark' : t < 21.9 ? 'light' : t < 25 ? 'dark' : 'light'; }

  // ======================================================== soundtrack (WebAudio, offline)
  function audio(ac) {
    const out = ac.createDynamicsCompressor(); out.threshold.value = -14; out.ratio.value = 4; out.attack.value = 0.003; out.release.value = 0.15;
    const master = ac.createGain(); master.gain.value = 0.72; const lim = ac.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
    out.connect(master); master.connect(lim); lim.connect(ac.destination);
    master.gain.setValueAtTime(0.72, 29.2); master.gain.linearRampToValueAtTime(0.0001, 30);
    // reverb send
    const rv = ac.createConvolver(), ir = ac.createBuffer(2, ac.sampleRate * 2.2, ac.sampleRate);
    const rr = B.rng(31); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (rr() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
    rv.buffer = ir; const rvg = ac.createGain(); rvg.gain.value = 0.28; rv.connect(rvg); rvg.connect(out);
    const nbuf = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate); { const d = nbuf.getChannelData(0); const r = B.rng(77); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
    const noise = (t, d) => { const s = ac.createBufferSource(); s.buffer = nbuf; s.start(t, (t * 0.37) % 1.5, d + 0.05); return s; };
    const env = (g, t, a, peak, d, end = 0.0001) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); };
    const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
    const send = (node, amt) => { const g = ac.createGain(); g.gain.value = amt; node.connect(g); g.connect(rv); };

    const kick = (t, g = 1) => { const o = ac.createOscillator(), a = ac.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13); env(a, t, 0.003, 0.95 * g, 0.42); chain(o, a, out); o.start(t); o.stop(t + 0.5); };
    const clap = (t, g = 1) => { const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.9; const a = ac.createGain(); a.gain.setValueAtTime(0.0001, t); [0, 0.011, 0.022].forEach((o) => { a.gain.setValueAtTime(0.5 * g, t + o); a.gain.exponentialRampToValueAtTime(0.06 * g, t + o + 0.009); }); a.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); chain(noise(t, 0.25), f, a, out); send(a, 0.5); };
    const hat = (t, g = 1, d = 0.04) => { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500; const a = ac.createGain(); env(a, t, 0.001, 0.22 * g, d); chain(noise(t, d + 0.02), f, a, out); };
    const pop = (t, g = 1, f0 = 600) => { const o = ac.createOscillator(), a = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0 * 2.2, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.05); env(a, t, 0.002, 0.55 * g, 0.16); chain(o, a, out); send(a, 0.2); o.start(t); o.stop(t + 0.25); };
    const tick = (t, g = 1, f0 = 2400) => { const o = ac.createOscillator(), a = ac.createGain(); o.type = 'square'; o.frequency.value = f0; env(a, t, 0.001, 0.08 * g, 0.025); chain(o, a, out); o.start(t); o.stop(t + 0.05); };
    const whoosh = (t, d = 0.3, g = 0.6, up = false) => { const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(up ? 400 : 3500, t); f.frequency.exponentialRampToValueAtTime(up ? 5000 : 500, t + d); const a = ac.createGain(); a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(0.5 * g, t + d * 0.75); a.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08); chain(noise(t, d + 0.1), f, a, out); send(a, 0.3); };
    const scrib = (t, d) => { const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 2; const a = ac.createGain(); a.gain.setValueAtTime(0.0001, t); for (let k = 0; k < d / 0.05; k++) { a.gain.exponentialRampToValueAtTime(0.16, t + k * 0.05 + 0.015); a.gain.exponentialRampToValueAtTime(0.02, t + k * 0.05 + 0.045); } a.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05); chain(noise(t, d + 0.1), f, a, out); };
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const bass = (t, m, d, g = 1) => { const o = ac.createOscillator(), s = ac.createOscillator(), f = ac.createBiquadFilter(), a = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = hz(m); s.frequency.value = hz(m); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + d); env(a, t, 0.006, 0.32 * g, d); o.connect(f); s.connect(f); chain(f, a, out); o.start(t); s.start(t); o.stop(t + d + 0.05); s.stop(t + d + 0.05); };
    const pad = (t, notes, d, g = 1) => { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; const a = ac.createGain(); a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(0.06 * g, t + 0.35); a.gain.setValueAtTime(0.06 * g, t + d - 0.3); a.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.4); f.connect(a); a.connect(out); send(a, 0.8); notes.forEach((m) => [-7, 7].forEach((det) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + d + 0.5); })); };
    const pluck = (t, m, g = 1) => { const o = ac.createOscillator(), f = ac.createBiquadFilter(), a = ac.createGain(); o.type = 'triangle'; o.frequency.value = hz(m); f.type = 'lowpass'; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.25); env(a, t, 0.002, 0.2 * g, 0.32); chain(o, f, a, out); send(a, 0.6); o.start(t); o.stop(t + 0.4); };
    const chime = (t) => [76, 79, 83, 88].forEach((m, i) => { const o = ac.createOscillator(), a = ac.createGain(); o.frequency.value = hz(m); env(a, t + i * 0.06, 0.003, 0.12, 1.4); chain(o, a, out); send(a, 1); o.start(t + i * 0.06); o.stop(t + 2); });
    const impact = (t) => { kick(t, 1.2); const o = ac.createOscillator(), a = ac.createGain(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 1.2); env(a, t, 0.005, 0.7, 1.4); chain(o, a, out); o.start(t); o.stop(t + 1.6); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(8000, t); f.frequency.exponentialRampToValueAtTime(300, t + 1.2); const b = ac.createGain(); env(b, t, 0.002, 0.5, 1.3); chain(noise(t, 1.5), f, b, out); send(b, 0.7); };
    const riser = (t, d) => { const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + d); const a = ac.createGain(); a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(0.32, t + d); a.gain.setValueAtTime(0.0001, t + d + 0.01); chain(noise(t, d), f, a, out); send(a, 0.4); const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + d); const lp = ac.createBiquadFilter(); lp.frequency.value = 2000; og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.05, t + d); og.gain.setValueAtTime(0.0001, t + d + 0.01); chain(o, lp, og, out); o.start(t); o.stop(t + d + 0.02); };
    const squash = (t) => { const o = ac.createOscillator(), a = ac.createGain(); o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.38); env(a, t, 0.01, 0.25, 0.36); chain(o, a, out); o.start(t); o.stop(t + 0.45); };

    // --- music: A minor, 120 BPM (beat 0.5s, bar 2s): Am F C G
    const PROG = [[57, 60, 64], [53, 57, 60], [48, 55, 60, 64], [55, 59, 62]], ROOT = [45, 41, 48, 43];
    for (let bar = 0; bar < 15; bar++) {
      const t0 = bar * 2, c = bar % 4;
      if (t0 >= 24 && t0 < 25) continue;
      if (t0 < 24) pad(t0, PROG[c], 2, t0 < 3.5 ? 0.7 : 1);
      for (let b = 0; b < 8; b++) {
        const t = t0 + b * 0.25;
        const inDrums = (t >= 3.5 && t < 6.5) || (t >= 11.5 && t < 22) || (t >= 25.5 && t < 29.5);
        const half = t >= 6.5 && t < 11.5;
        if (inDrums) {
          if (b % 2 === 0) kick(t, 0.9);
          if (b === 2 || b === 6) clap(t, 0.8);
          hat(t + 0.125, 0.7);
          if (t >= 11.5 && t < 22) hat(t, 0.35);
          bass(t, ROOT[c] + (b % 4 === 3 ? 12 : 0), 0.22, 0.9);
        } else if (half) {
          if (b === 0) kick(t, 0.8);
          if (b === 4) clap(t, 0.5);
          hat(t + 0.125, 0.4);
          if (b % 4 === 0) bass(t, ROOT[c], 0.9, 0.8);
        }
        if ((t >= 2 && t < 3.5) || half || (t >= 25.5 && t < 29.5)) { const ar = PROG[c]; pluck(t, ar[b % ar.length] + 12, half ? 0.8 : 0.6); }
      }
    }
    // build into the launch: accelerating snare roll + pumping kick
    for (let t = 22.0; t < 24.6; ) { const p = (t - 22) / 2.6; clap(t, 0.25 + 0.6 * p); t += p < 0.5 ? 0.25 : p < 0.8 ? 0.125 : 0.0625; }
    for (let t = 22.0; t < 24.2; t += 0.5) kick(t, 0.5 + 0.3 * (t - 22) / 2.2);
    pad(25.0, [48, 55, 60, 64, 67, 71], 4.6, 1.3); bass(25.0, 36, 2.5, 1);
    // sfx cues
    cues.forEach((c) => {
      if (c.type === 'pop') pop(c.t, c.g, c.f); else if (c.type === 'tick') tick(c.t, c.g, c.f);
      else if (c.type === 'whoosh') whoosh(c.t, c.d, c.g || 0.6, c.up); else if (c.type === 'hit') { kick(c.t, 0.9 * c.g); clap(c.t, 0.5 * c.g); }
      else if (c.type === 'snap') { kick(c.t, 1); tick(c.t, 3, 1200); clap(c.t, 1); } else if (c.type === 'scribble') scrib(c.t, c.d);
      else if (c.type === 'sweep') whoosh(c.t, c.d, 0.25, true); else if (c.type === 'riser') riser(c.t, c.d);
      else if (c.type === 'squash') squash(c.t); else if (c.type === 'impact') impact(c.t); else if (c.type === 'chime') chime(c.t);
    });
  }

  window.BMM_PROJECT = {
    width: W, height: H, fps: 30, duration: 30, samples: 6, shutter: 0.5, timelineY: 1700,
    chapters: [
      { t: 0, label: 'intro' }, { t: 3.5, label: 'het probleem' }, { t: 6.5, label: 'het verschil' },
      { t: 11.5, label: 'pijnpunten' }, { t: 17, label: 'zelf vs. BMM' }, { t: 22, label: 'tijd terug' }, { t: 25, label: 'BMM' },
    ],
    draw, mode, cues, audio,
    samplesAt: (t) => [[3.28, 3.5], [6.28, 6.64], [11.28, 11.64], [16.98, 17.4], [24.6, 25.0]].some(([a, b]) => t >= a && t <= b) ? 16 : 6,
  };
})();
