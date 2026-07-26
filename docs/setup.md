# Setup and equipment

Last updated: 2026-07-25

## Current routine

The collection is in Fenton, Michigan. The cacti and succulents spend dry
summer weather outside and come inside when rain or cold is expected. The
planned permanent 2026 move indoors is August 30, followed by the dated
[AW200SE and AeroWave operating schedule](./equipment/aw200se-operating-schedule.md).

This is a hobby setup, not a laboratory. Manufacturer output figures are useful
starting points, but plant response matters more than chasing an exact number.

## Controlled indoor setup

See the [AW200SE/E25 deep guide](./equipment/vivosun-aw200se.md) for the raw
manufacturer PPFD grids, the unresolved difference between its published PPFD
figures, DLI/lux conversions, plant-by-plant targets, placement, and the simple
starting schedule. The concrete timer and acclimation steps are in the
[AW200SE and AeroWave operating schedule](./equipment/aw200se-operating-schedule.md).

| Item | Current equipment |
| --- | --- |
| Light | [VIVOSUN AeroLight Wing AW200SE](https://vivosun.com/en-US/vivosun-smart-grow-system-aerolight-a200se-compatible-with-growhub-e25-controller-p142504424325359396-v142527788947495192) |
| Controllers | Two VIVOSUN GrowHub E25 Controllers: one for the AW200SE and one planned for the AeroWave |
| Location | Fenton, Michigan |
| Mount | Adjustable ceiling mount; light installed, with the plant table still pending |
| Rated power | 200 W |
| Advertised coverage | 2 × 4 ft |
| Manufacturer efficacy | 2.75 µmol/J |
| Manufacturer PPFD figure | 691 µmol/m²/s at 12 in |
| Dimming | VIVOSUN publishes 25%, 50%, 75%, 100%, and off as Manual Mode/Grow Hub presets and advertises a 25–100% app range; the installed AW200SE/E25/VIVOSUN app combination was tested on 2026-07-24 and accepts 1% increments throughout that range |
| Cross-canopy fan | [VIVOSUN AeroWave E6 Gen2](https://vivosun.com/en-US/vivosun-aerowave-e6-6-inch-clip-on-fan-compatible-with-growhub-e42-e25-p140926625940348007-v140926625940348006), 12 W, up to 320 CFM, 90° horizontal oscillation, and a separate E25 connection through its Type-C control port |
| Air movement | AW200SE integrated fan at its lowest gentle Natural Wind setting plus the AeroWave at provisional Level 2–3 of 10 in Natural Wind, oscillating across the canopy |
| Label printer | [SUPVAN E11](https://www.amazon.com/dp/B0DKS89T75?th=1), 203 dpi monochrome thermal printer with 15 mm maximum media width; see the [pot-label print reference](./plants/labels.md) |

The two E25s are independent control paths. The AW200SE's RJ45 connector is
only for compatible AeroLight daisy chains; it is not an Ethernet connection
for the AeroWave. AeroWave fans do not directly daisy-chain fan-to-fan; with
E25 control, each fan needs its own E25. Both powered devices retain their own
AC connections. VIVOSUN's Type-C splitter is an E42A accessory for branching
multiple compatible fans, not a way to combine this light and fan under one
E25.

The canonical schedule places the AeroWave behind the center of the table,
24–36 in from the nearest plant, with an 11-hour-30-minute maximum daily
program inside the light window. See the
[AeroWave program and placement rules](./equipment/aw200se-operating-schedule.md#aerowave-e25-program).

The PPFD figure is a manufacturer measurement, not the amount every plant will
receive. Distance, dimming, position under the wing, plant height, and reflected
light all change the actual canopy level. Light distance should be measured from
the tallest plant tip, not from the shelf or pot rim.

The manufacturer also publishes a 5 × 5 reflective-tent map whose 12-inch
center reads 1,214 µmol/m²/s and whose calculated mean is about 870. That does
not agree with the 691 figure in the product table. Both are retained and
explained in the deep guide rather than forcing them into a false single answer.

## Measurement tools

| Tool | Intended use |
| --- | --- |
| [VIVOSUN three-meter kit](https://www.amazon.com/dp/B0DFBFGGN1) | Digital liquid pH, liquid TDS/EC/temperature, and approximate soil moisture/pH/light checks |

The liquid meters can help compare tap water and mixed fertilizer solutions.
Treat the analog soil probe as a rough observation only: gritty cactus medium,
small pots, and incomplete probe contact can produce misleading readings. Pot
weight, root-zone dryness, and plant condition remain the watering decisions.

## Individual pots and medium

| Part | Current product | Relevant details |
| --- | --- | --- |
| Pots | [SQKH 4-inch pots, six-pack](https://www.amazon.com/dp/B0DNSJG1FL) | Polypropylene pots with bottom drainage holes and individual trays. |
| Soil | [Back to the Roots Succulent & Cacti Mix, 12 qt](https://www.amazon.com/dp/B0CLZ2YL9R) | Peat-free packaged mix containing aged bark, perlite, horticultural sand, limestone, and a small amount of organic plant food. See the [manufacturer product page](https://backtotheroots.com/products/organic-succulents-cacti-mix-specialty-blend-6-qt) and [soil FAQ](https://backtotheroots.com/pages/soilFAQ-specialty-blend-succulents-and-cacti-mix). |
| Top dressing | [YISZM gritty mix, 2 lb](https://www.amazon.com/dp/B0DFBTR9J9) | Approximately 5–8 mm mineral grit including lava rock and zeolite. It is being used as a thin decorative top layer. |

The starter group is individually potted, which makes watering and rearranging
for light much easier. The gritty top dressing is thin enough to be reasonable;
leave enough visibility around plant bases to notice trapped moisture, softness,
or discoloration.

Always empty water left in the small trays after a full watering. The trays
protect the shelf; they are not reservoirs.

## Shared planters

The succulent arrangement and older cactus arrangement are mixed planters.
Their plants do not have perfectly identical needs, so they should be managed by
observation rather than a calendar.

- The succulent planter contains an echeveria, elephant bush, silver teaspoons,
  and copper spoons.
- The older cactus planter now contains a blue torch, monkey tail, and golden
  torch. It previously also contained Rehab-04, a probable silken pincushion
  cactus removed on 2026-07-24 after only a small patch of green flesh remained.
- Decorative moss around the older cacti makes the soil and plant bases harder
  to inspect. Removing it is useful during rehabilitation.
- Drainage in both shared planters still needs to be confirmed.

## Details still worth recording

These measurements will make the next lighting plan more precise:

- lamp-to-tallest-tip distance;
- dimensions of the plant footprint under the light;
- which plants will share a shelf and whether short pots can use risers;
- the final AeroWave mounting point and distance to the nearest plant;
- typical indoor temperature and humidity; and
- a phone-lux or PAR grid after the final layout is in place.
