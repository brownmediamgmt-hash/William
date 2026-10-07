# Style guide — analysis of the reference reel

Source: "make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out" — 15.06s, 1920x1080, 30 fps, H.264 + AAC. Analysed frame by frame (4 fps contact sheets + full-res keyframes).

## Timeline of the reference (what happens when)

| Time | Background | What moves | Annotation (Caveat) | Timeline chapter |
|---|---|---|---|---|
| 0.0–0.4 | light paper | black floor line draws on left→right | — | `spacing` |
| 0.4–1.9 | light | blue ball drops in from top-left, bounces 3–4× to the right with decaying height. Onion-skin outline ghosts trail it; dotted path of the whole trajectory stays visible. Squash on contact, stretch in fast fall. | "slow" → "slow in, slow out" (blue, arrow to apex); "squash!" (red, arrow up to contact point); "stretch" (blue) | `spacing` |
| 1.9–3.2 | light | "I MAKE THINGS" letters fall in with random rotation + motion blur (stagger); "MOVE" letters rise out of the floor line (clipped by it). The ball becomes the period after MOVE. Blue hand-drawn underline draws under the block. | "stagger: 45ms" (arrow to end of line 1); "overlap" (arrow up to the dot) | `type` |
| 3.2–5.4 | dark (#14151B) | One word per ~0.5s, hard cuts: BOUNCE (white, letters drop in with stepped motion-blur echoes) · STRETCH (blue, horizontal elastic stretch, blur) · SPIN (white, rotateY per letter) · SNAP (red, appears instantly with red construction lines + bounding-box handles) | "gravity-ish", "elastic", "rotateY 450°", "no ease. on purpose" (small, light blue, bottom-right of word) | `type` |
| 5.4–8.3 | light | Graph editor: axes "position / time", blue LINEAR line, block sliding at constant speed leaving red outlined ghosts at equal spacing. Line morphs into an S-curve with bezier handles (red handle dots, black diamond keyframes). Block now eases; ghosts bunch at the ends. Light-blue playhead band sweeps the graph. | "linear = robotic" (red, arrow) → struck through with red double scribble; "ease in-out ✓" (blue); "spacing!" (arrow down to block) | `easing` |
| 8.3–8.5 | — | whip pan to the right, heavy motion blur | — | — |
| 8.5–11.0 | dark | Dot grid (≈60px). A blue "snake" (chain of circles, decreasing size = follow-through trail) whips around in loops; nearby dots are pushed outward and tinted red/blue. Camera rotates/tilts at the end (3D-ish grid plane). | "follow-through" (blue, arrow) | `follow-through` |
| 11.0–12.9 | dark | Radial loader: blue centre dot, tick ring, 16 square markers turning blue, white progress arc, percentage counting 7% → 100%. At 100%: centre dot squashes flat (anticipation), everything implodes. | "anticipation" (arrow to squashed dot) | `anticipation` |
| 12.9–13.2 | dark | blue streak shoots up (launch) | — | — |
| 13.2–15.0 | light | "MOTION DESIGNER" falls in rotated; "CLAUDE" rises from below; blue dot lands as period. Hold. | "open to new projects" (blue, arrow up to dot) | `hello` |

## Visual system

- **Formats:** reference is 16:9; for Reels we use 1080x1920 with identical chrome.
- **Backgrounds:** light = radial gradient #F6F7F9 (centre, slightly above middle) → #EEEFF2 → #D5D7DC (corners) + faint 54–60px dot grid (~10% ink). Dark = #20222A centre → #14151B → #0E0F13 + faint dot grid. Fine film grain on both.
- **Colour roles:** ink #1A1B21 for type on light; off-white #F2F3F5 on dark; blue #2E7CF6 = hero / correct / the dot; red #F03A4C = wrong / impact / construction; light blue #86A9F2 = annotations on dark; mid grey for axis labels and chrome.
- **Type:** Anton (condensed heavy grotesk) caps for everything big; Caveat bold for every handwritten note, axis label and timeline label; timecode in Anton grey.
- **Hero motif:** one blue dot runs through the whole film — ball, period, loader core, launch — and ends as the period after the name.
- **Hand-drawn layer:** notes write on left→right (~0.03s/char), arrows draw on along a curved, slightly wobbly path with an open arrowhead, underlines are wobbly blue strokes (~10px), strike-throughs are two red scribbles.
- **Chrome:** SMPTE timecode top-right; bottom timeline scrubber with tick marks, diamond keyframes per chapter (filled when passed), a darker "played" segment, a playhead with a small triangle, and the chapter label in Caveat above the playhead.
- **Motion blur:** heavy, real (sub-frame); fast letters show stepped echoes — that look is intended.
- **Transitions:** hard cuts on the beat (kinetic words), whip pans with blur, light↔dark alternation per section, implode → launch → land for the finale.

## Audio
Synth-pop bed around 130 BPM with SFX locked to the picture: soft pops on each bounce (quiet intro), beat kicks in with the type section, calmer half-time bed for the easing graph, drive returns for follow-through/loader, big hit on the final title, tail fades by 15s.
