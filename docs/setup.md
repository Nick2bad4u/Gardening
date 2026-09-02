# Setup and equipment

Last updated: 2026-09-02

## Current routine

The collection is in Fenton, Michigan. The cacti and succulents spend dry
summer weather outside and come inside when rain or cold is expected. The
permanent 2026 move indoors began July 31 after the first RO-water watering
and several hours of drainage, followed by the dated
[AW200SE and paired-fan operating schedule](./equipment/aw200se-operating-schedule.md).

This is a hobby setup, not a laboratory. Manufacturer output figures are useful
starting points, but plant response matters more than chasing an exact number.

## Controlled indoor setup

See the [AW200SE/E25 deep guide](./equipment/vivosun-aw200se.md) for the raw
manufacturer PPFD grids, the unresolved difference between its published PPFD
figures, DLI/lux conversions, plant-by-plant targets, placement, and the simple
starting schedule. The concrete timer and acclimation steps are in the
[AW200SE and paired-fan operating schedule](./equipment/aw200se-operating-schedule.md).

| Item                     | Current equipment                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Light                    | [VIVOSUN AeroLight Wing AW200SE](https://vivosun.com/en-US/vivosun-smart-grow-system-aerolight-a200se-compatible-with-growhub-e25-controller-p142504424325359396-v142527788947495192)                                                                                                                                                                                                    |
| Controllers              | Three confirmed VIVOSUN GrowHub E25 Controllers: one for the AW200SE and one for each AeroWave E6 Gen2; the original fan was paired in the VIVOSUN app on 2026-07-28 and the opposing fan has its own independent E25 path                                                                                                                                                               |
| Location                 | Fenton, Michigan                                                                                                                                                                                                                                                                                                                                                                         |
| Mount                    | Adjustable ceiling mount; the approximately 26 in AW200SE wing span is centered in the 36 in divider-to-wall bay over all three plant surfaces                                                                                                                                                                                                                                           |
| Tables                   | A 24 in round glass table at the window end followed by two identical 16 × 13 in wooden tables toward the room; all are 18 in high and aligned end to end beneath the window-to-room long axis of the fixture                                                                                                                                                                            |
| Rated power              | 200 W                                                                                                                                                                                                                                                                                                                                                                                    |
| Advertised coverage      | 2 × 4 ft                                                                                                                                                                                                                                                                                                                                                                                 |
| Manufacturer efficacy    | 2.75 µmol/J                                                                                                                                                                                                                                                                                                                                                                              |
| Manufacturer PPFD figure | 691 µmol/m²/s at 12 in                                                                                                                                                                                                                                                                                                                                                                   |
| Dimming                  | VIVOSUN publishes 25%, 50%, 75%, 100%, and off as Manual Mode/Grow Hub presets and advertises a 25–100% app range; the installed AW200SE/E25/VIVOSUN app combination was tested on 2026-07-24 and accepts 1% increments throughout that range                                                                                                                                            |
| Cross-canopy fans        | Two [VIVOSUN AeroWave E6 Gen2](https://vivosun.com/en-US/vivosun-aerowave-e6-6-inch-clip-on-fan-compatible-with-growhub-e42-e25-p140926625940348007-v140926625940348006) units, each with its own E25, aimed from opposite ends of the black divider. The second is clipped high and aimed slightly downward. Each fan is rated 12 W and up to 320 CFM, with 90° horizontal oscillation. |
| Air movement             | AW200SE integrated fan at its lowest gentle Natural Wind setting plus both E6 Gen2 pole fans on gentle Level 1–2, offset oscillating sweeps; confirm slight intermittent tissue movement without rocking plants, flattening hairs, or moving top dressing                                                                                                                                |
| Current light setting    | 18 in from the LEDs to the tallest cactus or succulent tip in the direct footprint, 45% power, 8:00 a.m.–8:00 p.m.; reported active on 2026-08-14                                                                                                                                                                                                                                        |
| Camera                   | [VIVOSUN GrowCam C4](https://vivosun.com/en-GB/vivosun-growcam-smart-camera-p161215462517181360-v161215462517181359), 2K, 117° field of view, 2.4 GHz Wi-Fi, wall-mounted above the plants with a tested 256 GB microSD card for time-lapse                                                                                                                                              |
| Reflector                | [VIVOSUN 6 mil diamond Mylar, 4 × 25 ft](https://www.amazon.com/dp/B01MZ72PAH?th=1), installed top-to-bottom on the black divider with a separate loose sheet protecting the carpet; the white wall remains uncovered                                                                                                                                                                    |
| Room sensor              | Unspecified manual temperature/RH display with current, rolling 24-hour minimum/maximum, and all-time minimum/maximum readings                                                                                                                                                                                                                                                           |
| Dehumidifier             | [TABYIK DH-CS01](https://www.amazon.com/dp/B0CMTP3GH8?th=1), a 1,000 mL single-speed Peltier unit used only when the manual sensor shows sustained excess humidity                                                                                                                                                                                                                       |
| Air purifier             | [Levoit Core Mini-P](https://levoit.com/products/core-mini-p-air-purifier), model LAP-C161-WUS, 7 W and 34 CFM CADR, run on low for background dust/pollen removal                                                                                                                                                                                                                       |
| Water container          | 5-gallon HDPE #2 drinking-water jug for RO water, stored covered in the unused shower                                                                                                                                                                                                                                                                                                    |
| Fertilizer               | [Tezula/Greencare MSU 13-3-15 Tap/Rain/RO formula](https://tezulaplants.com/products/msu-fertilizer-13-3-15-for-tap-water-ro-rain-water), measured by mass with the [collection-specific schedule](./equipment/msu-fertilizer-schedule.md); it already contains calcium, magnesium, and micronutrients                                                                                   |
| Label printer            | [SUPVAN E11](https://www.amazon.com/dp/B0DKS89T75?th=1), 203 dpi monochrome thermal printer with 15 mm maximum media width; see the [pot-label print reference](./plants/labels.md)                                                                                                                                                                                                      |

The three confirmed E25s are independent control paths. The AW200SE's RJ45
connector is only for compatible AeroLight daisy chains; it is not an Ethernet
connection for either canopy fan. AeroWave fans do not directly daisy-chain
fan-to-fan. With E25 controllers, each independently controlled fan needs its
own controller path; VIVOSUN's supported multi-fan splitter arrangement belongs
to E42/E42A-class hardware, not the light's RJ45 socket. The installed setup
uses one E25 for the light and one E25 for each fan; no light-to-fan or
fan-to-fan cable chain is used.

Both canopy fans are now mounted on the black divider pole and approach the
plant run from opposing directions. Offset their vertical angles and
oscillation arcs so their moving air crosses the canopy without forming one
constant wind tunnel or making the fans fight directly into each other. Start
both E6 units at Level 1–2, use the tissue test across all three surfaces, and
keep both daily programs inside the light window. The second fan is clipped
high on the room-end divider pole and points slightly downward; exact hub
heights and plant clearances remain measurements to record. See the
[paired-fan program and placement rules](./equipment/aw200se-operating-schedule.md#paired-canopy-fan-program).

The July 31 measurement set established a 36 in wide by approximately 60 in
long bay, and the August expansion adds a second identical wooden table. All
three surfaces are 18 in high. The 24 in round glass table occupies the window
end; the two 16 × 13 in wooden tables follow it toward the room. Their
centerlines run end to end beneath the fixture's long axis, not side by side
across the 36 in width. The nominal 24 + 16 + 16 in footprint uses about 56 in
of the approximately 60 in length, leaving only about 4 in before real gaps
and leg interference. Treat that as access clearance, not an appliance bay.

The original wooden table keeps A1–D3 in its measured three-column by four-row
grid. The second wooden table provisionally holds the six August cacti, `#4`
Kiwi aeonium, and `#3` money tree until their exact heights are recorded. The
[GrowCam and reflector plan](./equipment/growcam-c4-and-reflector.md) uses that
geometry: line the black divider first, leave the white wall uncovered, and
mount the camera rigidly on the right wall so it looks diagonally toward the
divider instead of directly into the window.

The [browser grow-spot diagrams](./layouts/grow-spot-layout.html) show the room,
all three tabletops, A1–D3, E1–F3, and `#1`–`#4` plant or planter IDs,
assigned original-table risers, light clearance, fan sweep, camera view,
provisional open-room air-treatment
positions, and a riser calculator. The source tape photos and derived height
bands are indexed in
[`assets/measurements`](../assets/measurements/README.md).

The PPFD figure is a manufacturer measurement, not the amount every plant will
receive. Distance, dimming, position under the wing, plant height, and reflected
light all change the actual canopy level. Light distance should be measured from
the tallest plant tip, not from the shelf or pot rim.

The manufacturer also publishes a 5 × 5 reflective-tent map whose 12-inch
center reads 1,214 µmol/m²/s and whose calculated mean is about 870. That does
not agree with the 691 figure in the product table. Both are retained and
explained in the deep guide rather than forcing them into a false single answer.

## Measurement tools

| Tool                                                            | Intended use                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [VIVOSUN three-meter kit](https://www.amazon.com/dp/B0DFBFGGN1) | Digital liquid pH, liquid TDS/EC/temperature, and approximate soil moisture/pH/light checks |

The liquid meters can help compare tap water and mixed fertilizer solutions.
Treat the analog soil probe as a rough observation only: gritty cactus medium,
small pots, and incomplete probe contact can produce misleading readings. Pot
weight, root-zone dryness, and plant condition remain the watering decisions.
Use the 0.01 g pocket scale—not the pot scale or an estimated scoop fraction—to
measure the default 0.75 g/US gal cactus fertilizer dose.

Put the manual temperature/RH sensor at canopy height in shade, between plant
surfaces if practical, and outside the direct fan stream. For the first two
indoor weeks, read the current and 24-hour ranges once daily at 7:30 p.m.
Afterward, read it during the Sunday inspection. The
[canonical operating schedule](./equipment/aw200se-operating-schedule.md#temperature-and-humidity-readings)
has the placement, logging, and response bands.

The new dehumidifier does not have a humidistat, so leave it off during normal
30–55% RH conditions. Use the room sensor rather than a watering date: a brief
maximum above 60% is fine, while current RH above 60% at both a morning and
evening check or a 24-hour minimum above 60% justifies a 12–24-hour trial. The
Core Mini-P can run on low continuously, but it does not lower humidity or
replace the paired canopy fans. See the dedicated
[air-treatment guide](./equipment/air-treatment.md) for placement and the full
decision table.

## August 14 substrate, airflow, and light reset

On 2026-08-14 the owner reported that the previous cactus medium was still
losing about **10–20 g of pot weight per day on day 14 after watering**. That is
direct evidence that those pots had not reached a stable dry-weight floor. The
loss includes both evaporation and plant water use, so it is not a literal
measurement of how many grams of water remained around the roots.

All 18 individually potted cactus-display plants—`P01`–`P18`, labels
`A1`–`F3`—were emergency-repotted into **60% Molly's Succulent Mix and 40%
horticultural perlite by volume**. The batch recipe was three cups Molly's to
two cups perlite. Only the old medium that stayed attached to the roots was
retained. This advances those containers to **pot setup 2**, so setup-1 wet and
dry weights remain historical rather than being averaged with the new blend.
The shared planters, money tree, and Kiwi aeonium (`P19`–`P22`) were not part of
this change.

Molly's is sold as a complete soilless medium, and the manufacturer also says
growers may mix it with other amendments. The extra perlite is therefore an
intentional collection-specific choice to reduce water retention in this
indoor Michigan setup—not a universal requirement and not an error. Stop
changing the recipe while two or three comparable watering cycles establish
what it actually does.

The same update added the second pole fan, lowered the AW200SE to **18 in**, and
raised it to **45%**. The power change came three days ahead of the former
August 17 step; August 14 is also the first explicitly confirmed 18-inch
measurement. Hold those light and airflow settings steady while the first
new-medium dry-down is measured; the next power increase is now conditional
rather than automatic.

Canonical `History` records the first setup-2 plain Beauchamp's RO cycle for
`P01`–`P18` at 4:22 p.m. on 2026-08-26 with no nutrients. Wet setup-2 weights were recorded
between 12:14 and 12:20 a.m. on 2026-08-27, about eight hours later. Preserve
that actual interval instead of treating those readings as the originally
planned 30–60-minute drainage baseline.

## Individual pots and medium

| Part                                 | Current product                                                                                                                  | Relevant details                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original cactus pots                 | [SQKH 4-inch pots, six-pack](https://www.amazon.com/dp/B0DNSJG1FL)                                                               | Polypropylene pots with bottom drainage holes and individual trays; still used by the A1–D3 starter group.                                                                                                                                                                                                                                                                                                                                                        |
| August cactus pots                   | Existing nursery and repotted containers                                                                                         | Most new cacti are in 4 in pots. The boobie cactus is in a small 3 in pot and the Chamaelobivia is in a small 4 in pot.                                                                                                                                                                                                                                                                                                                                           |
| Kiwi aeonium pot                     | Carlson's Greenhouse 5 in pot                                                                                                    | Current pot for Succulent-05.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Money-tree pot                       | [Amazon Basics 6 in pot with drainage holes and ridges](https://www.amazon.com/dp/B0F4QBMJMN?th=1)                               | Current 6 in matte-white pot for Houseplant-01 after transplanting from its Lowe's 4 in nursery pot.                                                                                                                                                                                                                                                                                                                                                              |
| Future money-tree pot                | [Amazon Basics 8 in pot with saucer](https://www.amazon.com/dp/B0F4QB8C8M?th=1)                                                  | Stored for later; do not move up until the 6 in root ball is genuinely crowded. The polypropylene pot has drainage holes and a ridged saucer.                                                                                                                                                                                                                                                                                                                     |
| Mountain Crest received/current pots | Received: six 2 in nursery pots; current: five 4 in square pots and one 4 in round terracotta pot                                | Received-pot shapes are not reliably documented. The owner reports removing about 95% of the nursery soil during the 2026-08-28 repot. Owner-entered live tracker pot size is 4 in for all six; current photos establish the square shapes for `P23`–`P27` and round terracotta for `P28`. Replacement-medium composition remains unrecorded.                                                                                                                     |
| Current medium for `P01`–`P18`       | [Molly's Succulent Mix](https://veryplants.com/products/mollys-succulent-mix-premium-gritty-soil-mix) plus horticultural perlite | Pot setup 2: 60% Molly's and 40% perlite by volume, measured as three cups to two cups. Molly's is a soilless gritty blend of akadama, pine bark, lava rock, Hyuga, pumice, and mycorrhizae, with no commercial fertilizer. Only old medium clinging to roots was retained during the August 14 repot.                                                                                                                                                            |
| Historical medium                    | [Back to the Roots Succulent & Cacti Mix, 12 qt](https://www.amazon.com/dp/B0CLZ2YL9R)                                           | Previous peat-free packaged mix containing aged bark, perlite, horticultural sand, limestone, and a small amount of organic plant food. Retained as history because it was associated with the day-14 10–20 g/day loss observation. See the [manufacturer product page](https://backtotheroots.com/products/organic-succulents-cacti-mix-specialty-blend-6-qt) and [soil FAQ](https://backtotheroots.com/pages/soilFAQ-specialty-blend-succulents-and-cacti-mix). |
| Top dressing                         | [YISZM gritty mix, 2 lb](https://www.amazon.com/dp/B0DFBTR9J9)                                                                   | Approximately 5–8 mm mineral grit including lava rock and zeolite. It is being used as a thin decorative top layer.                                                                                                                                                                                                                                                                                                                                               |

The starter group and six August cacti are individually potted, which makes
watering and rearranging for light much easier. All 18 are now pot setup 2 in
the tracker; do not rewrite or average their setup-1 history. The gritty top
dressing is thin enough to be reasonable;
leave enough visibility around plant bases to notice trapped moisture, softness,
or discoloration.

Always empty water left in the small trays after a full watering. The trays
protect the shelf; they are not reservoirs.

The money tree is a tropical tree, not a succulent. Water it when the upper
part of its mix dries, but do not wait for the entire 6 in root ball to reach
the cactus baseline. Keep it at the window/periphery rather than using its
height to set the cactus canopy. Two or three scorch-free days are encouraging,
not a completed sun-acclimation test; use the shade cloth only if leaves bleach
or develop crisp tan patches. Let much of the Kiwi aeonium pot dry between
waterings, but keep it outside the strongest cactus center.

The six August cacti and Kiwi aeonium came from
[Carlsons' Greenhouse](https://carlsonsgreenhouse.com/) on Torrey Road. The
money tree came from Lowe's. Its genus-level LiveTrends tag is now archived;
the exact purchase date and Lowe's store remain unrecorded.

### Mountain Crest Gardens arrivals — repotted 2026-08-28

Three cacti and three succulents ordered from Mountain Crest Gardens on
2026-08-25 were received rooted on 2026-08-28 in 2-inch nursery pots; the
received containers' shapes are not reliably documented. The owner reports
removing about 95% of the nursery soil during repotting. The owner-entered live
tracker pot size is 4 inches for all six. Current photographs show `P23`–`P27` in
square pots and `P28` in a round terracotta pot.

The corrected permanent mapping is `P23`/`G2` paper spine, `P24`/`H1` Coconut
Crystal, `P25`/`H2` Raindrops, `P26`/`H3` Eve's needle, `P27`/`G1` Black Widow,
and `P28`/`G3` Royal Flush. The live 2026-08-29 `History` records are:

| Tracker ID | Scale weight | Ruler height | Ruler width |
| ---------- | ------------ | ------------ | ----------- |
| `P23`      | 375.5 g      | 1.25 in      | 1.15 in     |
| `P24`      | 361.5 g      | 1.0 in       | 2.55 in     |
| `P25`      | 344 g        | 1.35 in      | 2.75 in     |
| `P26`      | 357.5 g      | 1.8 in       | 1.6 in      |
| `P27`      | 388 g        | 0.5 in       | 1.2 in      |
| `P28`      | 353.5 g      | 1.3 in       | 1.7 in      |

The 2026-08-28 Check/Clean bulk round records slightly moist substrate for all
six. It does not document watering or fertilizer use. Exact maintained
placement, plant-to-light clearance, and replacement-medium composition remain
unrecorded.

The owner chose not to quarantine after hand inspection and soil removal. The
box carried a California agriculture inspection/certification sticker reported
to say pest free, and the plants were described as outdoor-grown in California
sun. Continue targeted pest checks and gradual indoor-light acclimation anyway;
neither the sticker nor outdoor sun prevents a later issue or guarantees an
instant transition to the AW200SE footprint. The 4-inch pots contain much more
mix than the nursery containers, so verify drainage and use dry-down evidence
instead of a fixed schedule. 'Coconut Crystal' remains indoors in the brightest
and coolest practical succulent position, while Royal Flush keeps separate
leaf-cycle watering logic.

### Home Depot succulents — repotted 2026-09-02

`P29`/`#5` probable _Faucaria tuberculosa_ and `P30`/`#6` tiny mixed
succulent planter were purchased from Home Depot, photographed, and repotted
on 2026-09-02. The exact store, received containers, current pot sizes,
replacement-medium composition, weights, dimensions, and maintained placement
are not logged. Their source-quality publication photographs live in separate
Gyazo Collections; shared receipt and post-repot context captures are reused
across both records rather than uploaded twice.

Do not infer either pot's physical configuration from its photograph. Before
folding them into ordinary rounds, confirm drainage, record a whole-pot dry
baseline, and enter measured dimensions if those analytics are wanted. `P30`
is one tracked pot even though it contains several plants; any later separation
should create an explicit history event before new permanent IDs are assigned.

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

The 2026-07-31 tape set established the 36 × approximately 60 in bay, 18 in
tabletop height, 24 in glass diameter, 16 × 13 in wood top, approximately 26
in fixture width, 12.5–13 in tallest shared-cactus tip, and roughly 4–7 in
starter-tip band. The second wooden table repeats the 16 × 13 × 18 in
dimensions. The remaining measurements that will make the next lighting plan
more precise are:

- the plant ID used as the 18-inch tallest-tip light reference;
- each individual pot's tabletop-to-tip height after final riser placement;
- tabletop-to-tip heights for the six August cacti, Kiwi aeonium, and money tree;
- exact maintained placement and plant-to-light clearance for the six Mountain
  Crest plants; their Ruler dimensions and Scale weights are recorded;
- replacement-medium composition for the six Mountain Crest plants;
- exact pot sizes, placement, replacement-medium composition, first dry
  weights, and measured dimensions for `P29` and `P30`;
- final original-AeroWave hub height and distance to the nearest plant;
- exact hub height, plant clearance, vertical angle, and app program for each
  E6 Gen2 fan;
- the final GrowCam mount position, angle, framing, and 24-hour test result;
- a lux or PAR grid after the left-side Mylar is installed;
- the first two weeks of indoor temperature and humidity ranges;
- the final purifier/dehumidifier positions beyond the nominal three-table bay
  and the first 24-hour RH response check; and
- a phone-lux or PAR grid after the final layout is in place.
