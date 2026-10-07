---
name: bmm-graph-motion-graphics
description: "BMM Graph Motion Graphics — maak motion-graphics video's (Instagram Reels 9:16, of 16:9) in de 'motion designer showreel'-stijl van BMM / Brown Media Management: Anton-koppen met letter-stagger, handgeschreven Caveat-annotaties met getekende pijlen, de blauwe stip als rode draad, squash & stretch, graph-editor curves, dot-grid velden, radiale loaders, timecode + tijdlijn-scrubber en wissels tussen licht en donker. Rendert een echte MP4 met motion blur en gesynthetiseerde soundtrack. Gebruik bij: 'BMM motion graphics', 'BMM Graph', 'motion graphics video', 'showreel stijl', 'animatie voor Instagram/Reels', 'kinetic typography', 'uitlegvideo met animaties', of wanneer Ruben een geanimeerde video wil zoals de showreel-referentie."
---

# BMM Graph Motion Graphics

Je maakt motion-graphics video's voor **Brown Media Management (BMM)** in één vaste, herkenbare stijl: de stijl van een motion designer die zijn eigen showreel maakt. Elke video moet voelen als *"kijk wat ik kan"*: elke beweging is bewust, en de annotaties laten zien dat er over is nagedacht.

De stijl komt uit een referentievideo (een 15-seconden 'motion designer showreel', 1920x1080, 30 fps). Volledige analyse frame voor frame: `references/style-guide.md`. Lees die eerst als je de stijl niet in je hoofd hebt.

## Wat er in deze skill zit

| Pad | Wat |
|---|---|
| `engine/bmm-motion.js` | Herbruikbare canvas-engine: palet, easing, letter-stagger, handgeschreven notities, pijlen, onderstrepingen, doorhalingen, ✓/✕, stip met squash/stretch, timecode, tijdlijn-scrubber, film grain, en **echte motion blur** (sub-frame accumulatie). |
| `templates/player.html` | Speler: preview in de browser (play/scrub) en render-hooks voor de headless renderer. |
| `templates/bmm-reel-nl-30s.js` | Volledig uitgewerkt voorbeeld: 30s Reel in het Nederlands, "zelf doen vs. uitbesteden". Gebruik dit als startpunt voor nieuwe video's. |
| `scripts/render.mjs` | Headless render: Chromium (Playwright) → JPEG-frames → ffmpeg H.264, plus offline WebAudio-soundtrack → AAC. Parallel met meerdere workers. Ook `--stills` voor QA. |
| `assets/fonts/` | Anton (koppen) en Caveat (handschrift), beide SIL Open Font License. |
| `references/pain-points-nl.md` | Onderzoek: pijnpunten van ondernemers die social media zelf doen, met bronnen. |
| `references/storyboard-bmm-30s.md` | Het storyboard van het voorbeeld, scène voor scène, met copy. |

## Werkwijze

1. **Brief.** Haal uit het gesprek: doel, doelgroep, kernboodschap, taal (standaard Nederlands), formaat (standaard 1080x1920, 30 fps), duur (15/30/45s), CTA. Vraag alleen wat je echt niet weet.
2. **Onderzoek** (als de video iets moet uitleggen of overtuigen): zoek echte pijnpunten/cijfers met WebSearch. Gebruik in beeld alleen claims die je kunt onderbouwen; zet geen verzonnen percentages in een video. Retorische, herkenbare uitspraken ("laatste post: 6 weken terug") mogen wel.
3. **Storyboard op de beat.** Kies 120 BPM (0,5s per tel, 2s per maat) en laat elke scènewissel op een tel vallen. Schrijf per scène: tijd, licht/donker, wat beweegt, welk animatieprincipe, welke annotatie, welke geluiden. Zie de scène-bibliotheek hieronder.
4. **Bouw.** Kopieer `templates/bmm-reel-nl-30s.js` naar `templates/<naam>.js` en pas scènes aan. Elke scène is een functie `S(ctx, t)` die zijn eigen achtergrond tekent; `draw(ctx, t)` kiest de scène en doet de overgangen. Alles is een pure functie van tijd `t` (deterministisch, dus elk frame is los te renderen).
5. **QA met stills.** `node scripts/render.mjs --project <naam>.js --stills 1.2,3.4,... --out <map>` en maak er een contact sheet van (`ffmpeg -pattern_type glob -i 'still_*.png' -vf "scale=360:-1,tile=5x2" sheet.png`). Bekijk de sheet, en controleer: tekst niet over elkaar, niets buiten beeld, annotaties leesbaar, Instagram-veilige zones vrij.
6. **Render.** `node scripts/render.mjs --project <naam>.js --out <pad>.mp4 --workers 3` (≈ 2-4 min voor 30s op 4 cores). `--preview` rendert snel met minder blur om timing te checken.
7. **Controleer de MP4.** Haal frames uit het eindresultaat (`ffmpeg -i out.mp4 -vf fps=2,scale=270:-1,tile=10x6 sheet.png`) en kijk ze na; check audio-niveau (`ffmpeg -i out.mp4 -af volumedetect -f null -`, max ≤ -0,5 dB).
8. **Lever op** met: de MP4, een korte uitleg van de scènes, en wat de klant/Ruben zelf nog kan aanpassen.

Vereisten: Node 18+, Playwright met Chromium, ffmpeg. Fonts zitten in de skill (geen internet nodig).

## De stijl in het kort (niet van afwijken)

**Kleuren** (`BMM.PAL`): papier `#EEEFF2` met radiaal verloop naar `#D5D7DC` en een bijna onzichtbaar stippenraster; inkt `#1A1B21`; donker `#14151B` met lichter midden `#20222A`; **blauw `#2E7CF6`** (held, positief, "met BMM"); **rood `#F03A4C`** (fout, probleem, "zelf doen", squash!); zacht blauw `#86A9F2` voor annotaties op donker. Niets anders: geen verlopen in tekst, geen schaduwen, geen extra kleuren.

**Typografie:** koppen in **Anton**, altijd HOOFDLETTERS, strak en groot (vul de breedte). Twee regels zoals "I MAKE THINGS / MOVE." → kleine regel even breed als de grote regel eronder. **De blauwe stip is de punt** achter het hoofdwoord ("ZAAK.", "BMM."). Annotaties in **Caveat Bold**, kleine letters, iets scheef (-2°), blauw of rood, en ze worden "geschreven" (links naar rechts onthuld) met een getekende pijl.

**Vast frame-chroom:** SMPTE-timecode rechtsboven (`00:00:SS:FF`, Anton, grijs), en onderaan een tijdlijn-scrubber met ruitvormige keyframes per hoofdstuk (gevuld als gepasseerd), een afspeelkop en het hoofdstuklabel in handschrift. In 9:16 staat de tijdlijn op y≈1700 (boven de Instagram-captionzone).

**Ritme:** wissel licht ↔ donker per scène. Harde cuts op de tel voor kinetische woorden; whip-pans en schuine wipes (met zware motion blur) tussen grotere scènes. Kleine camera-zoom (1.00→1.03) per scène voor leven, punch-zoom (1.07→1) en shake bij impact.

**Animatieprincipes die je laat zien (en benoemt in annotaties):** squash & stretch, slow in / slow out, stagger (45 ms per letter), overlap, follow-through, anticipation, elastic, spin (rotateY), snap ("geen ease. expres."), easing-curve vs. lineair, spacing. Een annotatie benoemt het principe óf de boodschap, liefst afwisselend: zo is het tegelijk showreel en uitleg.

**Geluid:** synthetische soundtrack in A-mineur op 120 BPM (Am–F–C–G) plus SFX op elke beweging: pop per stuit, tick per letter, whoosh per wissel, hit per woord, kras bij doorhalen, riser naar het hoogtepunt, **stilte vlak voor de climax** (anticipatie), impact op de eindkaart.

## Scène-bibliotheek (allemaal in het voorbeeld uitgewerkt)

| Scène | Hoe | Gebruik voor |
|---|---|---|
| **Stuiterende stip** | Parabolen met afnemende hoogte, onion-skin ghosts, gestippelde baan, squash bij contact, stretch op snelheid, spacing-tikjes op de vloer. Landt als punt achter de kop. | Intro / hook |
| **Kop-onthulling** | Regel 1 valt per letter met rotatie (outBack, 45 ms stagger); regel 2 rijst uit de vloerlijn (geclipt). Handgetekende blauwe onderstreping. | Hook, eindkaart |
| **Kinetische woorden** | 1 woord per 0,75s op donker, elk met ander principe: bounce, stretch (elastic), spin (rotateY), snap (rood met constructielijnen). | Probleem stellen |
| **Graph editor** | Assen + raster, rode lineaire/grillige lijn → doorhalen → blauwe bezier S-curve met handles en rode handle-punten; meelopende afspeelbalk; blokjes die van onregelmatig naar regelmatig verspringen. | Voor/na, groei, consistentie |
| **Dot-field** | Stippenraster dat wegduwt rond een blauwe "slang" (follow-through trail), rood/blauwe stippen dichtbij. Grote woorden slaan in met vonken en schuiven daarna een genummerde lijst in. | Opsomming van pijnpunten |
| **Split-screen** | Boven donker "ZELF DOEN" met rode ✕, onder licht "MET BMM" met blauwe ✓, "VS"-stip op de naad. | Vergelijking |
| **Radiale loader** | Ring, 90 tikjes, 16 markers die blauw worden, percentage telt op, takenlabels; daarna anticipation-squash en lancering van de stip. | Bouw naar climax, "tijd terug" |
| **Eindkaart** | Stip valt terug in beeld als punt achter "BMM.", onderstreping, notitie met pijl naar de stip, merknaam, CTA in handgetekend kader. | Afsluiter + CTA |

## Regels voor Instagram (9:16)

- 1080x1920, 30 fps, H.264 High, yuv420p, AAC 48 kHz; bestand < 50 MB.
- Belangrijke tekst tussen y≈220 en y≈1650 en x 60–1020; rechtsonder (iconen) en onderaan (caption) vrijhouden.
- Hook binnen 1,5s; eerste tekst uiterlijk op 2,5s; CTA staat minimaal 2,5s stil in beeld.
- Leesbaarheid: koppen ≥ 110px, lijstregels ≥ 54px, annotaties ≥ 46px. Elke tekst minstens ~0,6s per 3 woorden in beeld.
- De video moet ook zonder geluid te volgen zijn (alle boodschap staat in beeld).

## Copy (Nederlands)

Kort, spreektaal, je-vorm, geen jargon. Koppen 1–3 woorden. Annotaties zijn persoonlijk en een tikje droog ("weken stil...", "herkenbaar?"). BMM spreekt als "wij", de ondernemer als "jij". Gebruik "BMM" groot en "Brown Media Management" klein als merkregel.

## Veelgemaakte fouten

- Layouts meten vóór de fonts geladen zijn → tekst staat verkeerd. De speler laadt fonts eerst; meet altijd met `BMM.measure`/`BMM.fit`.
- Te weinig motion-blur samples bij whips → zichtbare strepen. Zet in `samplesAt(t)` 16 samples rond snelle overgangen (gestapelde echo's bij vallende letters zijn juist wél de stijl).
- Te veel tegelijk: één hoofdbeweging per moment, annotaties volgen ná de beweging (+0,1–0,2s).
- Lineaire beweging zonder reden. Alles is eased, behalve de snap (en die wordt benoemd).
