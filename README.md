# Gardening

[![Apps Script coverage](https://codecov.io/gh/Nick2bad4u/Gardening/graph/badge.svg?flag=apps-script-server)](https://app.codecov.io/gh/Nick2bad4u/Gardening)

This is my low-pressure garden notebook. The current focus is my cactus,
succulent, and small houseplant collection, especially learning how to use the
indoor grow-light setup without turning the hobby into a science project.
The [current four-table guide](docs/layouts/table-placement-research.md) uses photographs supplied October 22, 2026 (capture date unrecorded). It records 24 small pots in a six-column/four-row front grid, the rear group including P35 Lithops and P36 split rock, P21 Money Tree on a room-side stool, and P38 Terrarium on the desk to the right. The owner confirmed October 23 that the pale rosette in the grey/blue pot at the back center-left is P37 / #11 Arctic Ice, between P35 Lithops and P19 shared cactus. The 26 × 32-inch wooden footprint is inferred. September diagrams, the former Money Tree windowsill position, and the round-glass layout remain historical. The [Days since watering map](https://nick2bad4u.github.io/Gardening/setup/placement/#watering-map) refreshes from the published log and exports PNG or SVG; elapsed days describe the observations, not when to water.

The collection has **50 profile records: 49 active and one historical, across 39 tracked containers**. The current pages represent **46 botanical profile groups and three whole-planter overviews**; the [container guide](docs/containers.md) explains the five shared plantings and their single observation histories. The Lithops and separate split rock were purchased at Home Depot in Howell, Michigan, on September 21 and repotted September 23. Probable _Lithops lesliei_ and probable _Lithops salicola_ have their own profiles within P35 / #9. The unreceived five-plant Amazon order is an [old plan under Guides](docs/old-plans/amazon-plant-order-2026-09.md); Amazon confirmed cancellation September 21 with no charge. Two houseplants bought directly at Carlson's Greenhouses on September 20 in owner-reported six-inch nursery pots have separate [profiles and IDs](docs/collection.md#september-20-carlsons-greenhouses-houseplants): #7 / P31 Peperomia Bicolor and #8 / P32 Tricolor oyster plant. The owner confirms two Amazon Basics eight-inch destination pots with many drainage holes; placement on separate floor pot stools is planned, off the tables; no completed repot or move is reported, and actual positions remain unmeasured. One destination pot is the previously decorated pot; its specific plant assignment is unconfirmed.

The installed AW200 and AeroLight 240 W remain at their last reported 45% and 38%, with an 18-inch tip reference and a shared 13 h 15 m total cycle including 15-minute sunrise and sunset transitions. Current fixture centers and clearances over the new tables are unmeasured. See the [equipment record](docs/equipment/aw200-and-aerolight-240w.md).

P38 / #12 is the [Terrarium container](https://nick2bad4u.github.io/Gardening/containers/P38/). Its [October 10 arrival record](docs/terrarium.md) includes five owner photographs, probable plant identifications, and the historical shelf report, humidity, and light observations. Photographs supplied October 22 place the jar on the desk to the right of the table display without establishing new light or humidity readings. Its [Houseplants aggregate profile](docs/plants/houseplants/terrarium.md), Houseplant-05, records probable Fittonia and Hypoestes, tentative Pilea cf. depressa, and unidentified fern-like foliage and moss without adding separate botanical member records. Seller-listed jar dimensions are 6.3 × 3.9 in (16 × 10 cm), orientation unverified.

**P41 / #15 [Alpine Spires Chinese evergreen](docs/plants/houseplants/aglaonema-commutatum-alpine-spires.md)** was purchased October 28, 2026, at Home Depot for $19.99. The nursery tag names _Aglaonema commutatum_, Igneous™ Alpine Spires™; repotting, specimen photographs, physical setup, and placement remain pending.

**P39 / #13 Nightly nerve plant** and **P40 / #14 Spice is Nice peperomia** were both purchased **October 21, 2026, at Home Depot in Howell, Michigan**, confirmed by the owner October 22. Their [collection record](docs/collection.md#october-21-houseplant-additions) retains the nursery identities and photographs. Both are quarantined in another room for a planned “week or so” until repotting. The owner reports watering both with RO water October 21 because they were “super bone dry”; exact times, volumes, and fertilizer use are unreported, and this note does not confirm live History entries. New draining glass pots and incoming medium remain planned setup work; pot sizes, precise positions, and leaf-level exposure are unmeasured.

## Current notes

- [Containers and shared planters](docs/containers.md) — botanical members, permanent P-IDs, labels, setups, and one history per pot; [container directory](https://nick2bad4u.github.io/Gardening/containers/)
- [Equipment and supplies inventory](docs/equipment/inventory.md) — the complete documented setup, including all four table links, lights, meters, scales, tools, pots, and stored supplies; also [on the website](https://nick2bad4u.github.io/Gardening/setup/equipment/)
- [Ornamental cactus seed starting](docs/cactus-seed-starting.md) — draining pots, clear zip-bag covers, seed medium, moisture, and measuring light; [Astrophytum asterias companion](docs/astrophytum-asterias-seed-starting.md) for species evidence and its limits
- [Watering quick guide](docs/watering-quick-guide.md) — when to water each plant group, when to wait, and why
- [Light and moisture reference](docs/light-moisture.md) — plant care cards, working DLI/PPFD ranges, approximate lux, and drying-stage checks
- [Detailed watering strategy](docs/watering-strategy.md) — how references, curves, readiness, and plant-specific exceptions guide watering decisions
- [Weighing strategy](docs/weighing-strategy.md) — how learned cycles reduce routine weigh-ins, with no daily quota or cap
- [Spreadsheet and logger actions](docs/logger-actions.md) — all action types, structured fields, bulk entry, queues, and corrections
- [Daily weighing and watering prompt](docs/daily-weighing-watering-prompt.md) —
  copyable instructions for the 9:45 a.m. Eastern review and daily report publication
- [Daily garden report](https://nick2bad4u.github.io/Gardening/report/) —
  a phone-friendly quick list, watering recipes, and expandable weight/plateau evidence,
  generated from each day's reviewed data; [generator and publishing guide](docs/daily-reports/README.md)
- [Live plant tracker](https://nick2bad4u.github.io/Gardening/tracker/) — a mobile-friendly view
  of the Google Sheets log with current status, search and filters, stable
  per-plant history URLs, dry/wet baselines, calculations, charts, and direct
  links back to the editable workbook
- [Garden Entry Logger](https://script.google.com/macros/s/AKfycbytpdMto4ZAqOf49igDNoGYr-J6fmSRDNJOKP4-dKDFRmM2YkTCKJp3kmhrD4gOJShF/exec) —
  the signed-in mobile logger with a durable queue, measured care events,
  remembered nutrient details, and shared bulk-care rounds; the
  [logger runbook](scripts/google-sheets/README.md) records deployed versions
- [Sensor CSV imports](scripts/google-sheets/SENSOR-IMPORT.md) — the separate
  sensor-history workbook, private original exports, hourly summaries, and
  reviewed import planning without adding sensor samples to plant History
- [AppSheet garden companion](docs/appsheet-companion.md) — signed-in phone and
  desktop entry, save receipts, image-first plant cards, watering-age badges,
  all eight collection Insights charts, and interactive per-plant measurement
  and weight charts
- [The Garden website](https://nick2bad4u.github.io/Gardening/) — a collection homepage, searchable plant directory, individual profiles, reviewed reports, photos, setup, equipment, and care guides. Shared navigation, light/dark themes, and individual print styles work across the site; old booklet bookmarks redirect to their new pages.
- [Plant photo Collections index](https://nick2bad4u.github.io/Gardening/photos/) — a searchable,
  mobile-friendly index of one public Gyazo Collection per current plant plus
  the collection-wide overview timeline
- [Plant profiles](docs/plants/) — names, origins, history, flowers, care, propagation, risks, sources, and photo-archive status for all 41 profile records (40 active and one historical), linked to 32 tracked containers
- [AW200 + AeroLight 240 W setup](docs/equipment/aw200-and-aerolight-240w.md) —
  verified fixture dimensions and weights, installed settings, independent E25
  controls, and four ceiling hooks for independent suspension
- [Table placement guide](docs/layouts/table-placement-research.md) — the current front/rear arrangement, separate stool/desk/quarantine locations, watering image, and historical diagrams; also [on the website](https://nick2bad4u.github.io/Gardening/setup/placement/)
- [Two-light placement review](docs/two-light-placement-review.md) — a complete pot-by-pot review, the revised coordinates, shared-planter guidance, and the limits of the estimated light map
- [Earlier AW200SE and E25 deep guide](docs/equipment/vivosun-aw200se.md) — PPFD maps,
  DLI/lux conversions, distances, dimming, placement, and a simple starting
  program
- [Fenton AW200SE and paired-fan operating schedule](docs/equipment/aw200se-operating-schedule.md) —
  historical move-in plan, three independent E25 controller paths, revised
  18-inch/45% light phase, paired E6 Gen2 airflow, August 14 setup-2 medium
  reset and measured dry-down trial,
  pot layout, rotations, local daylight, and outdoor-day overrides
- [Historical indoor acclimation calendar](https://nick2bad4u.github.io/Gardening/setup/archive/calendar/) —
  browser and print view of the July 31 move-in, revised light ramp, daily clock,
  Sunday rotations, camera milestones, natural daylight, and sensor readings;
  links directly to the layout and shares its light/dark theme
- [GrowCam C4 time-lapse and reflector plan](docs/equipment/growcam-c4-and-reflector.md) —
  camera framing, Mylar placement, a short recording test, and the main
  acclimation time-lapse
- [Grow-room air treatment](docs/equipment/air-treatment.md) — sensor-driven
  placement and use of the TABYIK DH-CS01 dehumidifier and Levoit Core Mini-P
  air purifier
- [MSU 13-3-15 fertilizer schedule](docs/equipment/msu-fertilizer-schedule.md) —
  gram-based RO-water mixing, the post-repot plain-water baseline, alternating
  cactus feeds, and separate starting rules for the other plants
- [Historical grow-spot diagrams](https://nick2bad4u.github.io/Gardening/setup/archive/layout/) — tabbed room,
  two wooden-table, round-table, height, paired-fan, camera, and riser views with
  one consistent room-facing orientation
- [Plant collection](docs/collection.md) — compact inventory, working IDs,
  confidence, label-mapping status, and current status
- [Pot labels](docs/plants/labels.md) — SUPVAN E11-ready names, short plant IDs,
  verified origins and description years, visual descriptions, curious facts,
  acquisition records, warnings, and the three special orientation labels
- [Setup and equipment](docs/setup.md) — light, controllers, paired fans,
  GrowCam, reflector, room-air devices, meters, pots, current and historical
  media, three plant surfaces, and current arrangement
- [Care notes](docs/care-notes.md) — the practical light, water, airflow, and recovery plan, including separate Kiwi aeonium and money-tree rules
- [Licensed lifecycle photo archive](assets/plants/) — 282 reference photos
  covering available young plants, mature forms, flowers, fruit or seed,
  details, and habitat, with creator, source, license, and SHA-256 metadata

Plant names based only on photos are treated as working IDs and can be updated
when a flower, label, or better close-up gives stronger evidence.

The collection is meant to stay fun. The numerical light targets are starting
ranges, not rules; compact healthy new growth matters more than chasing one
perfect meter reading.

The public website is built with Astro from the maintained Markdown and reviewed JSON records. The [homepage](https://nick2bad4u.github.io/Gardening/) connects the [plant directory](https://nick2bad4u.github.io/Gardening/plants/), [container directory](https://nick2bad4u.github.io/Gardening/containers/), [tracker](https://nick2bad4u.github.io/Gardening/tracker/), [current placement](https://nick2bad4u.github.io/Gardening/setup/placement/), [care guides](https://nick2bad4u.github.io/Gardening/guides/), and [photos](https://nick2bad4u.github.io/Gardening/photos/). Each plant profile has its own URL; container pages connect botanical members with the one observation history for their shared pot.

The Pages build also includes the website's Storybook workbench at
`/Gardening/storybook/`, with an [introduction](test/stories/introduction.mdx),
documented previews, and synthetic data scenarios.

Run `npm run dev` to edit the website with live CSS updates and automatic page
reloads at `http://127.0.0.1:5173/Gardening/`. For local builds, strict checks, the Storybook
workbench, and browser tests, see
[Maintaining the browser tools](docs/development.md). The Apps Script production
procedure remains in the [logger runbook](scripts/google-sheets/README.md).
