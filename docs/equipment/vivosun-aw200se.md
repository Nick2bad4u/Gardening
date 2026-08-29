# VIVOSUN AeroLight Wing AW200SE and GrowHub E25

Last updated: 2026-08-29

This guide converts the manufacturer's cannabis-oriented data into a practical
starting point for this cactus and succulent collection. The numerical targets
are deliberately ranges. Exact species trials are unavailable for most of these
plants, and a reflective tent map is not a measurement of an open shelf.

For the settings to enter into the confirmed controller paths, use the separate
[AW200SE and paired-fan operating schedule](./aw200se-operating-schedule.md).

## Hardware summary

| Specification             | AW200SE / E25 information                                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nominal light power       | 200 W                                                                                                                                                                                                                                                   |
| Fixture size and weight   | About 26 × 13 × 2.3 in; 6.9 lb                                                                                                                                                                                                                          |
| Advertised coverage       | 2 × 4 ft                                                                                                                                                                                                                                                |
| Photon efficacy           | 2.75 µmol/J                                                                                                                                                                                                                                             |
| Approximate photon output | About 550 µmol/s if 200 W and 2.75 µmol/J describe the same operating point; this is a calculation, not a separately published test result                                                                                                              |
| Spectrum                  | Advertised 380–780 nm output, including white LEDs, 660 nm deep red, and 730 nm far red                                                                                                                                                                 |
| Manual dim levels         | Off, 25%, 50%, 75%, and 100%                                                                                                                                                                                                                            |
| App/controller range      | VIVOSUN advertises 25–100% but does not publish the increment size; the installed AW200SE/E25/VIVOSUN app combination was tested on 2026-07-24 and accepts every whole-percent setting in that range                                                    |
| Integrated fan            | Up to 84 CFM; advertised 33 dB                                                                                                                                                                                                                          |
| External circulation      | Two AeroWave E6 Gen2 pole fans aimed from opposing ends of the black divider, each rated 12 W and up to 320 CFM, with 90° horizontal oscillation, 10 E25/app speed levels, and 5 oscillation levels. Fan 2 is clipped high and aimed slightly downward. |
| Durability claims         | 50,000-hour life and IP65 fixture rating                                                                                                                                                                                                                |
| Controller network        | 2.4 GHz Wi-Fi; three independent E25 paths control the AW200SE and the two E6 Gen2 units. Fan 2 has its own E25. RJ45 chaining is for compatible AeroLights, not either fan, and the fans are not daisy-chained.                                        |
| Climate sensing           | The E25 itself is not the room's temperature/RH probe; VIVOSUN points to the separate AeroLab THB1S sensor for climate data                                                                                                                             |

The adjustable wings have three useful geometries. VIVOSUN says the **wide**
position increases coverage about 10%, while the **narrow** position increases
central PPFD about 10%. Standard or wide makes more sense for a mixed-height,
mixed-light collection; narrow concentrates an already strong hotspot.

IP65 on the fixture does not make the wall outlet, E25, connectors, or power
strip safe to soak. Keep every electrical connection above any watering spill
path and use secure hangers at both ends of the light.

## The manufacturer's PPFD data does not fully agree

The product specification table gives a single figure of **691 µmol/m²/s at
12 in**. A separate official 5 × 5 map, described as measured at 100% in a
VIVOSUN 4 × 2 reflective tent, gives much higher 12-inch values:

| Height | Map minimum | 25-point mean | Center | Map maximum | Minimum ÷ mean |
| -----: | ----------: | ------------: | -----: | ----------: | -------------: |
|  12 in |         615 |           870 |  1,214 |       1,214 |            71% |
|  14 in |         616 |           812 |  1,066 |       1,066 |            76% |
|  18 in |         573 |           707 |    856 |         856 |            81% |

The means above are calculations from the printed grid, rounded to the nearest
whole number. The 12-inch map average of about 870 does not reconcile with the
separate 691 specification. Possible causes include a different wing setting,
grid area, meter, fixture revision, or reporting convention, but VIVOSUN does
not explain the difference on those pages.

The useful conclusion is not “pick the larger number.” It is:

- distance lowers the central hotspot and improves map uniformity;
- reflective tent walls keep the printed edge values unusually high;
- an open shelf can lose much more edge light than this map suggests; and
- the only number that describes this collection is a measurement at the actual
  plant tops.

[Open VIVOSUN's original PPFD map image](https://image.next.vivosun.com/asset/width-1464/picture/dbc0caca13a398b96ecc791ebd43ac23.jpg).

### Raw map transcription

These are the manufacturer's printed grid values, retained so future shelf
measurements can be compared with the original claim.

### 12 in at 100%

|     |       |       |       |     |
| --: | ----: | ----: | ----: | --: |
| 620 |   760 |   793 |   752 | 615 |
| 795 | 1,000 | 1,052 |   995 | 788 |
| 899 | 1,150 | 1,214 | 1,149 | 894 |
| 801 | 1,006 | 1,062 | 1,009 | 797 |
| 625 |   765 |   806 |   768 | 622 |

### 14 in at 100%

|     |       |       |       |     |
| --: | ----: | ----: | ----: | --: |
| 621 |   747 |   779 |   739 | 616 |
| 742 |   912 |   958 |   906 | 736 |
| 814 | 1,011 | 1,066 | 1,010 | 810 |
| 746 |   917 |   966 |   919 | 744 |
| 624 |   751 |   790 |   752 | 622 |

### 18 in at 100%

|     |     |     |     |     |
| --: | --: | --: | --: | --: |
| 579 | 669 | 700 | 663 | 573 |
| 666 | 776 | 807 | 772 | 660 |
| 697 | 821 | 856 | 819 | 693 |
| 668 | 778 | 812 | 779 | 665 |
| 581 | 673 | 706 | 674 | 579 |

## Estimating dimmed output

LED photon output is often roughly proportional to dim setting. Until measured,
multiply a 100% map value by the selected fraction:

`estimated PPFD = map PPFD × dim percentage`

This is a planning estimate, not calibration. Driver behavior, wall reflections,
wing angle, and meter uncertainty prevent exact scaling.

| Height | Location  | 25% estimate | 50% estimate | 75% estimate | 100% map |
| -----: | --------- | -----------: | -----------: | -----------: | -------: |
|  12 in | Grid mean |          217 |          435 |          652 |      870 |
|  12 in | Center    |          304 |          607 |          911 |    1,214 |
|  14 in | Grid mean |          203 |          406 |          609 |      812 |
|  14 in | Center    |          267 |          533 |          800 |    1,066 |
|  18 in | Grid mean |          177 |          353 |          530 |      707 |
|  18 in | Center    |          214 |          428 |          642 |      856 |

At 18 inches and 50%, the tent-map estimate is already about 353 average and
428 at center. Over 12 hours that is roughly 15.3 and 18.5 mol/m²/day DLI—solid
succulent light, not a weak “half power” setting.

VIVOSUN's own stage chart recommends 24 in/50%/18 h for cannabis seedlings,
18 in/75%/18 h for vegetative plants, and 12 in/75–100%/12 h in flower. Those
are manufacturer recipes for a fast annual crop in a tent. They are not cactus
care instructions and should not be copied wholesale.

## PPFD, DLI, and lux without the jargon

- **PPFD** is the instantaneous number of photosynthetically active photons
  landing on a square metre each second, traditionally measured from 400–700
  nm. It is the best direct “how strong is the plant light right here?” value.
- **DLI** adds those photons across the whole light period. A moderate lamp for
  a long day can deliver the same DLI as a stronger lamp for a shorter day.
- **Lux** weights light for human vision. It is convenient and cheap to measure
  but underweights deep red and almost ignores the AW200SE's 730 nm far red.

For a fixed light:

`DLI (mol/m²/day) = PPFD × hours × 0.0036`

### Twelve-hour conversion table

| Average PPFD | DLI over 12 h | Very rough AW200SE lux range |
| -----------: | ------------: | ---------------------------: |
|          100 |           4.3 |               5,500–7,000 lx |
|          150 |           6.5 |              8,250–10,500 lx |
|          200 |           8.6 |             11,000–14,000 lx |
|          250 |          10.8 |             13,750–17,500 lx |
|          300 |          13.0 |             16,500–21,000 lx |
|          350 |          15.1 |             19,250–24,500 lx |
|          400 |          17.3 |             22,000–28,000 lx |
|          500 |          21.6 |             27,500–35,000 lx |
|          600 |          25.9 |             33,000–42,000 lx |
|          800 |          34.6 |             44,000–56,000 lx |
|        1,000 |          43.2 |             55,000–70,000 lx |

Apogee shows why no universal lux conversion exists: its factors range from
about 54 lux per µmol/m²/s for sunlight to 74 for white fluorescent light.
Published broad-white horticultural sources cluster around 59–65. VIVOSUN does
not publish an AW200SE-specific conversion. Using **55–70 lux per PPFD** is a
deliberately wide estimate for this mixed white/red/far-red fixture:

`rough PPFD range = lux ÷ 70 to lux ÷ 55`

For example, 20,000 lux suggests roughly 286–364 µmol/m²/s, not one exact
number. A phone sensor is still useful for finding relative hotspots if the
same phone, orientation, and app are used every time.

## Working light targets for this collection

These are starting hypotheses, not published species thresholds. They combine
native exposure, growth form, variegation, broad succulent research, and the
need to avoid stretching under indoor light. Most exact taxa have never been
tested in controlled DLI trials.

| Inventory ID  | Label ID | Plant                                              | Working DLI | 12 h average PPFD | Placement cue                                                                |
| ------------- | -------- | -------------------------------------------------- | ----------: | ----------------: | ---------------------------------------------------------------------------- |
| Starter-01    | `B2`     | _Oreocereus trollii_                               |       12–20 |           280–460 | High light                                                                   |
| Starter-02    | `B1`     | _Stenocactus phyllacanthus_                        |       10–18 |           230–420 | Bright middle/high                                                           |
| Starter-03    | `C2`     | _Echinocereus rigidissimus_ subsp. _rubispinus_    |       14–24 |           325–555 | High light after acclimation                                                 |
| Starter-04    | `A3`     | _Nyctocereus serpentinus_                          |       10–18 |           230–420 | Bright middle; allow support                                                 |
| Starter-05    | `A2`     | _Mammillaria plumosa_                              |       10–17 |           230–395 | Bright; avoid a wet crown                                                    |
| Starter-06    | `D2`     | _Echinopsis subdenudata_                           |       10–18 |           230–420 | Bright middle                                                                |
| Starter-07    | `A1`     | Variegated _Gymnocalycium mihanovichii_            |        6–12 |           140–280 | Edge/gentler zone                                                            |
| Starter-08    | `C1`     | _Gymnocalycium saglionis_                          |       10–18 |           230–420 | Bright middle                                                                |
| Starter-09    | `B3`     | 'Indigo Wave'                                      |       12–22 |           280–510 | Middle/high; watch raised ridges                                             |
| Starter-10    | `D3`     | 'Ming Thing'                                       |       10–18 |           230–420 | Middle; uneven surface                                                       |
| Starter-11    | `D1`     | _Euphorbia obesa_-type hybrid                      |        8–15 |           185–350 | Middle/edge                                                                  |
| Starter-12    | `C3`     | _Astrophytum ornatum_                              |       12–22 |           280–510 | High light                                                                   |
| Cactus-01     | `E1`     | Probable _Espostoa melanostele_ subsp. _nana_      |       12–20 |           280–460 | Bright middle/high after edge acclimation                                    |
| Cactus-02     | `E2`     | _Echinopsis_ hybrid, Chamaelobivia Group           |       10–18 |           230–420 | Bright middle; inspect dense clump                                           |
| Cactus-03     | `E3`     | Probable _Mammillaria mammillaris_                 |       10–18 |           230–420 | Bright middle; move outward if the body develops persistent red stress color |
| Cactus-04     | `F3`     | _Parodia leninghausii_                             |       12–22 |           280–510 | High light after acclimation; watch growing column                           |
| Cactus-05     | `F2`     | _Myrtillocactus geometrizans_ 'Fukurokuryuzinboku' |       10–18 |           230–420 | Bright middle; keep waxy folds off hotspot                                   |
| Cactus-06     | `F1`     | Probable _Mammillaria_ cf. _rekoi_                 |       10–18 |           230–420 | Bright middle; use compact new growth as the response signal                 |
| Succulent-01  | `#2`     | Probable _Echeveria pulidonis_                     |       10–18 |           230–420 | Brightest side of planter                                                    |
| Succulent-02  | `#2`     | _Portulacaria afra_                                |        8–17 |           185–395 | Middle; lower if golden                                                      |
| Succulent-03  | `#2`     | Probable _Kalanchoe bracteata_                     |        8–16 |           185–370 | Middle                                                                       |
| Succulent-04  | `#2`     | _Kalanchoe orgyalis_                               |        8–17 |           185–395 | Middle                                                                       |
| Succulent-05  | `#4`     | _Aeonium haworthii_ 'Dream Color'                  |        8–15 |           185–350 | Outer/room-side zone; protect variegated rosettes                            |
| Rehab-01      | `#1`     | Variegated _Pilosocereus pachycladus_              |       12–22 |           280–510 | High light, pale side off hotspot                                            |
| Rehab-02      | `#1`     | _Cleistocactus colademononis_                      |       10–18 |           230–420 | Bright middle                                                                |
| Rehab-03      | `#1`     | Probable _Echinopsis spachiana_                    |       12–22 |           280–510 | High light                                                                   |
| Rehab-04      | —        | Probable _Mammillaria bombycina_                   |           — |                 — | Removed 2026-07-24; historical record only, with no viable salvage retained  |
| Houseplant-01 | `#3`     | _Pachira glabra_                                   |        5–12 |           115–280 | Bright window/periphery; not in cactus hotspot                               |
| Cactus-07     | `H3`     | _Austrocylindropuntia subulata_                    |       12–22 |           280–510 | Bright middle/high after edge acclimation; plan for height                   |
| Cactus-08     | `G2`     | _Tephrocactus articulatus_ var. _papyracanthus_    |       10–18 |           230–420 | Bright middle after arrival inspection; stabilize detachable segments        |
| Cactus-09     | `G1`     | _Gymnocalycium mihanovichii_ 'Black Widow'         |        6–12 |           140–280 | Gentler variegated edge; verify the darkest face before rotation             |
| Succulent-06  | `G3`     | _Pleiospilos nelii_ 'Royal Flush'                  |       10–18 |           230–420 | Bright succulent zone; separate leaf-cycle watering logic                    |
| Succulent-07  | `H2`     | _Echeveria_ 'Raindrops'                            |       10–18 |           230–420 | Bright succulent zone; compact center without bleaching                      |
| Succulent-08  | `H1`     | _Sempervivum_ 'Coconut Crystal'                    |       10–20 |           230–460 | Indoor-only; use the brightest, coolest practical succulent position         |

Research support is strongest for the general direction, not every row. A
recent _Echeveria_ cultivar experiment found 12.8 DLI produced more compact
growth and better performance than 4.8. A study of six other _Kalanchoe_
species found improvements as DLI rose from 4.3 to 8.6 or 17.2, depending on
species. A classic _Opuntia_ CAM study reported light saturation near 700
µmol/m²/s under its conditions; that result should not be pasted onto every
cactus genus.

## Simple starting program

This is the low-fuss summary. The
[operating schedule](./aw200se-operating-schedule.md) provides the complete
six-week table and outdoor-day rules.

1. Set the wings to **standard or wide**.
2. Measure from the **tallest cactus or succulent tip inside the direct light
   footprint**, not the shelf or peripheral money-tree canopy. Begin at **20
   inches** at 40% for seven days, then use **18 inches** at 40% for a second
   week.
3. Run a fixed **12 hours on / 12 hours off**. A schedule such as 8 a.m.–8 p.m.
   is easy to inspect and leaves a real dark period.
4. The installed AW200SE/E25/VIVOSUN app combination has verified 1% adjustment
   from 25% to 100%, so the schedule can use small changes. The older planter's
   month outdoors provides some acclimation, but brief sun in bright shade is
   not the same as a stationary close lamp.
5. Put the variegated moon cactus, Dragon's Egg, and the pale side of the
   variegated blue torch toward an edge. Put rainbow hedgehog, _Astrophytum_,
   golden torch, and Old Man of the Andes nearer the stronger zone.
6. Raise short high-light pots on stable risers instead of lowering the lamp
   until a tall plant is too close.
   Leave all August additions directly on the second wooden table until their
   tabletop-to-tip heights are measured.
7. The actual setup reached **18 inches and 45% on August 14**, three days before
   the former Day 15 step. Hold 45% through August 30 while the emergency repot
   and paired airflow are evaluated. Try 50% on August 31 only if the plants and
   new-medium dry-down are stable.
8. Use **50–55% at 18 inches** as the likely later indoor range, arranged by
   zones. Use 55% only while the plants remain healthy; 60% is an optional
   evidence-based ceiling, and 75–100% is not the default goal.

The money tree is not a cactus: keep it at the window/periphery, move or shade
it if leaves bleach, and use its separate watering rule. The Kiwi aeonium also
starts below the strongest cactus center. The August additions do not reset the
established light ramp; they acclimate at the edge before moving inward.

The six Mountain Crest plants ordered on 2026-08-25 were received, inspected,
and repotted into 4-inch pots on 2026-08-28. Live 2026-08-29 Ruler records give
height × width as `P23` 1.25 × 1.15 in, `P24` 1.0 × 2.55 in, `P25` 1.35 × 2.75
in, `P26` 1.8 × 1.6 in, `P27` 0.5 × 1.2 in, and `P28` 1.3 × 1.7 in. Those plant
dimensions are not measured light clearances or maintained positions, so their
rows remain starting ranges. Do not move the fixture or raise the whole
collection's power for them; use the outer zone and watch for the response to
indoor acclimation. The Split Rock and indoor-grown _Sempervivum_ keep separate
seasonal and watering logic even when they share the room with the cacti. Exact
maintained placement remains unrecorded.

If plants spend meaningful hours outside, outdoor and indoor DLI add together.
Do not automatically give a full 12-hour lamp day after a sunny outdoor day.
Preserve at least an ordinary nighttime dark period.

### What to watch

| New observation                                              | Interpretation                                   | Adjustment                                        |
| ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------- |
| Compact new growth, normal color, stronger spines            | Setting is working                               | Hold it steady                                    |
| Narrow pale tip, wider areole spacing, open echeveria center | Too little light                                 | Move inward/raise pot or increase power gradually |
| Fresh bleached, hard tan, or papery patch facing lamp        | Increase was too fast                            | Move outward or raise/dim lamp                    |
| Purple/red/copper color without tissue damage                | Often protective pigment                         | Watch, but do not react to color alone            |
| Soft translucent base or black spread                        | Water/root problem, not a request for more light | Isolate watering and inspect                      |
| Plant surface stays unusually hot                            | Excess radiant load or poor airflow              | Increase distance/air movement                    |

## Measuring the real shelf

A measurement grid is more useful than one center reading.

1. Remove or work between plants without changing the normal wing position.
2. Hold a PAR sensor—or the same phone lux sensor—horizontal at actual plant-tip
   height.
3. Record at least a 3 × 5 grid across the occupied footprint, plus the tallest
   tip and the variegated plants.
4. Note dim percentage, distance, wing setting, reflective walls, and whether
   room daylight was blocked.
5. Compare minimum, mean, and maximum. Arrange plants around that map before
   buying more equipment.
6. Repeat only after a meaningful height or dimming change.

A real quantum/PAR meter is the direct tool. A phone lux app is adequate for a
relative map and rough conversion if this remains a fun project rather than a
lab. Photographing the same growing points monthly is the other half of the
measurement.

## E25 and airflow use

The confirmed E25 controllers are useful mainly for repeatability:

- put the light on a fixed daily schedule;
- put each controllable pole fan inside that light window on its own shorter
  schedule;
- change dimming deliberately rather than by accidental button presses;
- use the app's automatic programs only after checking what hours and
  intensities they actually send;
- remember that the controller does not know leaf temperature or room humidity
  without additional sensors; and
- keep 2.4 GHz Wi-Fi available during pairing.

VIVOSUN says each separately controlled device needs its own controller path.
Keep the light's E25 in the AW200SE Type-C controller port and one E25 on each
E6 Gen2. The light's RJ45 ports do not join a fan to the existing controller.
Compatible AeroLights can share an E25 through an RJ45 light chain, but
AeroWave fans do not directly daisy-chain fan-to-fan; the installed setup uses
three independent E25 paths rather than a splitter.

Use the integrated fan at its lowest gentle Natural Wind setting. The two pole
fans supply opposing, offset cross-canopy sweeps. Begin both E6 Gen2 units at
Natural Wind Level 1–2 of 10 with Level 4 of 5 oscillation where supported. Fan
2 is clipped high on the opposite divider end and points slightly downward.
Test each alone and then both together. Reposition before raising either fan.
The canonical schedule caps each E6 at 11 hours 30 minutes per day and gives the
placement and seasonal timer values.

Slight intermittent leaf, hair, or tissue-strip movement is useful. Rocking
plants, flattened hairs, moving top dressing, desiccated tips, or one side
drying much faster than the rest mean the airflow is too concentrated.

At full rated light power for 12 hours, the fixture uses approximately
**2.4 kWh/day or 72 kWh per 30-day month**. At an idealized 50% it is about
1.2 kWh/day or 36 kWh/month; actual driver and fan consumption may not scale
perfectly. Multiply monthly kWh by the local electricity rate for cost.

## Sources

- [VIVOSUN AW200SE product specifications](https://vivosun.com/en-US/vivosun-smart-grow-system-aerolight-a200se-compatible-with-growhub-e25-controller-p142504424325359396-v142527788947495192)
- [VIVOSUN AeroLight SE manual and stage chart](https://vivosun.com/en-AU/support/guide/aerolightse)
- [VIVOSUN GrowHub E25 guide](https://vivosun.com/support/guide/growhub-e25)
- [VIVOSUN AeroWave E6 Gen2 specifications](https://vivosun.com/en-US/vivosun-aerowave-e6-6-inch-clip-on-fan-compatible-with-growhub-e42-e25-p140926625940348007-v140926625940348006)
- [VIVOSUN AeroWave E Series manual](https://vivosun.com/en-GB/support/guide/aerowave)
- [VIVOSUN E42A Type-C splitter for multiple fans](https://vivosun.com/en-GB/vivosun-2-in-1-type-c-splitter-compatible-with-growhub-aerowave-p144564522569585355-v144564522569585354)
- [Apogee Instruments: PPFD-to-lux conversions by light source](https://www.apogeeinstruments.com/conversion-ppfd-to-lux/)
- [Apogee Instruments: instantaneous PPFD to DLI](https://www.apogeeinstruments.com/conversion-instantaneous-ppfd-to-integrated-ppfd/)
- [Horticulturae: DLI responses in _Echeveria_ cultivars](https://doi.org/10.3390/horticulturae12050551)
- [University of Minnesota: DLI responses in six _Kalanchoe_ species](https://experts.umn.edu/en/publications/photosynthetic-daily-light-integral-impacts-growth-and-flowering-/)
- [Plant Physiology: light response in CAM _Opuntia ficus-indica_](https://pmc.ncbi.nlm.nih.gov/articles/PMC1065988/)
