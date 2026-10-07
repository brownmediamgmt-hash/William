# Storyboard — "Zelf doen vs. uitbesteden" (30s, 9:16, NL)

Bestand: `templates/bmm-reel-nl-30s.js`. 120 BPM, A-mineur (Am–F–C–G). Alle wissels op de tel.

| Tijd | Scène | Beeld | Annotaties | Geluid |
|---|---|---|---|---|
| 0.0–3.5 | **S1 intro** (licht) | Vloerlijn tekent zich. Blauwe stip valt in, stuitert 4× (onion skins, gestippelde baan, squash/stretch, spacing-tikjes). "JIJ RUNT JE" valt per letter, "ZAAK" rijst uit de vloer; stip landt als punt. Blauwe onderstreping. | "squash!" (rood), "traag in, traag uit", "stretch", "stagger: 45ms", "...maar je socials?" (rood) | pops per stuit, ticks per letter, kras, pad + plucks |
| 3.5–6.5 | **S2 het probleem** (donker) | Harde cuts: MAAR (bounce) · WIE (blauw, elastic stretch) · POST (spin rotateY) · ER? (rood, snap + constructielijnen, shake) | "zwaartekracht-ish", "elastisch", "rotateY 450°", "laatste post: 6 weken terug" | beat start, hit per woord, snap |
| 6.3–6.6 | wipe | schuine wipe omhoog naar licht | | whoosh |
| 6.5–11.5 | **S3 het verschil** (licht) | Graph editor "bereik / tijd". "ZELF DOEN" (rood): grillige lijn met pieken, losse post-blokjes met gaten. Doorhalen. "MET BMM" (blauw): S-curve met bezier-handles + afspeelbalk; blokjes verspringen naar een strak ritme van 12. | 'posten "als er tijd is"', "weken stil...", "consistent = groei ✓", "vast ritme!" | half-time beat, kras, sweep |
| 11.3–11.6 | whip pan | | | whoosh |
| 11.5–17 | **S4 pijnpunten** (donker) | Dot field + follow-through slang. Kop "ZELF DOEN KOST JE:". 5 woorden slaan in (vonken, shake) en schuiven als genummerde lijst omhoog: AVONDEN KWIJT · WEKEN STILTE · GEEN STRATEGIE · DM'S BLIJVEN LIGGEN · GEMISTE KLANTEN | per woord een uitleg-notitie; "herkenbaar?" | volle beat, hit per pijnpunt |
| 17–22 | **S5 zelf vs. BMM** (split) | Lichte helft schuift omhoog. Boven ZELF DOEN met ✕, onder MET BMM met ✓, VS-stip op de naad. ZELF DOEN wordt doorgehaald en gedimd, MET BMM onderstreept. | "de keuze is simpel ✓" | pops/ticks per rij |
| 22–25 | **S6 tijd terug** (donker) | VS-stip wordt loader-kern. "JOUW TIJD / TERUG." Ring + markers + 0→100%, labels planning / content maken / posten / reacties & DM's. Anticipation-squash, stip lanceert omhoog. | "anticipatie" | riser + versnellende roffel, **stilte 24.6–25.0** |
| 25–30 | **S7 BMM** (licht) | Flits. "WIJ DOEN JE SOCIALS" valt in, "BMM" rijst op, stip valt terug als punt (2 stuiten). Onderstreping, "BROWN MEDIA MANAGEMENT", CTA-kader. | "jij runt je zaak ✓", "stuur ons een DM →" | impact, grote akkoord, chime, lichte groove, fade |

## Aanpassen
- Copy staat bovenaan elke scène in arrays (`WORDS`, `PAINS`, `ROWS`, `TASKS`) of als string in `letters(...)`/`note(...)`.
- Timing: verschuif scènegrenzen in `draw()` én de tijden in de scènefuncties; houd ze op veelvouden van 0,5s.
- Geluid volgt automatisch de `cue(...)`-aanroepen; muziek staat in `audio()`.
