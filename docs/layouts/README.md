# Grow-spot diagrams

Last updated: 2026-08-15

Open [plant-tracker.html](./plant-tracker.html) for the live collection
dashboard backed by Google Sheets. The finished workbook includes Dashboard,
Insights, Baselines, a combined History, and one native sheet page for each
container. Its permanent-row `Quick log` accepts watering, weight, height,
width, and condition independently. The
[companion Apps Script logger](../../scripts/google-sheets/README.md) appends
event-specific rows to `History`, so entering a new weight never destroys the
prior weight. The
[mobile entry app](https://script.google.com/macros/s/AKfycbytpdMto4ZAqOf49igDNoGYr-J6fmSRDNJOKP4-dKDFRmM2YkTCKJp3kmhrD4gOJShF/exec)
provides the phone-first input surface. Google Sheets remains the single
editable source of truth.

Each of the 22 physical pots or shared planters has a permanent internal ID from
`P01` through `P22` and links to a stable
[history URL](./plant-history.html?id=P01) with independent last-checked dates,
searchable and exportable history, dry/wet statistics, weight and growth
changes, watering-interval calculations, responsive SVG trend charts, and
range controls. The public tables also show the workbook's estimated dry time,
Water-cycle start, and days-after-water fields as observation aids rather than
care deadlines. Current pot labels such as `A1` and `#2` remain visible, and an
old label-style history URL is accepted as an alias while that label is current.
The `Baselines` tab and history page use only the active pot setup for dry and
wet pot-weight averages; they do not invent starting weights.

The tracker does not record water volume. A `Water` event means the container
was soaked until runoff. `#1` and `#2` are still weighed and watered as whole
containers. “Days since water” and the estimated remaining-water percentage
are observations, not watering deadlines.

Open [indoor-acclimation-calendar.html](./indoor-acclimation-calendar.html) for
the browser/print calendar covering the July move-in, August light ramp,
second-table expansion, weekly adjustments and rotations, manual
temperature/RH readings, natural daylight context, and September seasonal
timer.

Open [grow-spot-layout.html](./grow-spot-layout.html) in a browser for the
current room, table, plant-position, height, paired-fan, camera, and riser diagrams.
Its views are tabbed and its theme choice is shared with the calendar. Hover,
tap, or keyboard-focus any plant marker to reveal its common and botanical
names, inventory record, label status, origin, placement, identification
status, and field-guide link.

The page reflects the current working arrangement:

- the occupied bay is 36 in wide by about 60 in long;
- the round glass table and two identical wooden tables are all 18 in high;
- the two shared planters stay on the 24 in round glass table at the window end;
- A1–D3 stay on the original 16 × 13 in wooden table with the measured riser
  assignments;
- the six August cacti, Kiwi aeonium, and money tree use the second wooden
  table provisionally, with no new risers until their tabletop-to-tip heights
  are measured;
- all three surfaces run end to end beneath the AW200SE's window-to-room long
  axis, not side by side across the bay;
- the nominal 24 + 16 + 16 in longitudinal footprint is about 56 in, leaving
  only about 4 in before real gaps and leg interference;
- two AeroWave E6 Gen2 fans, each with its own E25, provide opposing, offset
  sweeps across all three surfaces; the second is clipped high at the opposite
  divider end and aimed slightly downward;
- the current AW200SE phase is 45% at 18 in, effective 2026-08-14;
- the GrowCam stays on the right wall and frames all three surfaces; and
- the purifier and dehumidifier start beyond the nominal bay on the open-room
  side, outside the fixture footprint and watering area.

The new cactus mapping is `E1` dwarf old man, `E2` Chamaelobivia, `E3` woolly
nipple cactus, `F1` hook-spined pincushion, `F2` boobie cactus, and `F3` yellow
tower. The numbered mapping is `#1` shared rehab cactus planter, `#2`
shared succulent planter, `#3` money tree, and `#4` Kiwi aeonium. The former
`A4-B4` and `C4-D4` planter IDs remain historical cross-references only.

Every diagram labels its viewpoint. In the top-down view, the window is at the
top, the room is at the bottom, the divider and paired fans are on the left, and the
white wall and camera are on the right. The round table comes first at the
window; the original and second wooden tables follow lengthwise toward the
room.

The 2026-07-31 tape photos are indexed in
[`assets/measurements`](../../assets/measurements/README.md). Their starter and
shared-planter height bands inform the original-table riser calculator. The
tracker contains plant-body height readings recorded on 2026-08-10 for E1-F3
and #4, but those readings do not include the pots. The newer plants still need
direct tabletop-to-tip measurements and exact current table positions before
their riser or marker assignments are final.

The deployed URLs are:

- [Plant tracker](https://nick2bad4u.github.io/Gardening/layouts/plant-tracker.html)
- [Example individual history page](https://nick2bad4u.github.io/Gardening/layouts/plant-history.html?id=P01)
- [Grow-spot layout](https://nick2bad4u.github.io/Gardening/layouts/grow-spot-layout.html)
- [Indoor acclimation calendar](https://nick2bad4u.github.io/Gardening/layouts/indoor-acclimation-calendar.html)
- [Plant photo album entry](https://nick2bad4u.github.io/Gardening/layouts/photo-album.html)
