# Practical care notes

Last updated: 2026-08-14

The goal is a simple routine that catches problems early. These plants do not
need a separate spreadsheet of rules for every species.

## Baseline routine

1. Give the plants strong light, but increase intensity gradually after a
   low-light period or a major move.
2. Water thoroughly enough to wet the root ball, let the pot drain, and empty
   the tray.
3. For cacti and succulents, wait until the mix is dry through and the pot
   feels light before watering again. The money tree uses the separate tropical
   rule below.
4. Keep gentle air movement across the group without aiming a harsh, constant
   blast at one plant.
5. Inspect new growth and plant bases. Old scars and stretched growth will not
   reverse; the condition of new growth is the useful signal.

This is deliberately not a fixed watering calendar. Four-inch pots under a
strong lamp and fan may dry quickly, but season, roots, plant size, and room
conditions can change that speed.

## Starting the AW200SE

The complete [AW200SE/E25 guide](./equipment/vivosun-aw200se.md) has the
manufacturer's PPFD maps, DLI and lux math, and working ranges for every current
plant. The [operating schedule](./equipment/aw200se-operating-schedule.md)
is the canonical dated plan for the Fenton move indoors, confirmed and pending
controller paths, light and paired-fan settings, placement and strength, pot
layout, rotation, local daylight, and outdoor-day overrides.

The older mixed planter spent years in weak light, but it has now had about a
month outside in bright shade with a little direct sun. That counts as partial
acclimation, and the monkey tail's improved growth suggests the current outdoor
exposure is working.

| Date          | Starting setting                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| July 31, 2026 | Water the dry, ready pots with RO water, drain for several hours, move the collection indoors, and begin the 40%-at-20-inch shakedown.                 |
| Aug. 3        | 40% power, 20 in above the tallest tip, 8:00 a.m.–8:00 p.m.                                                                                            |
| Aug. 10       | Planned: lower to 18 in and hold 40%; completion was not separately recorded.                                                                          |
| Aug. 14       | Actual update: hold 18 in and increase to 45%; add the second opposing pole fan and repot the affected cacti into the new 60:40 Molly's/perlite blend. |
| Aug. 17       | Hold 45% at 18 in; do not make another change three days after the actual increase.                                                                    |
| Aug. 24       | Hold 45% for another week while evaluating repot recovery and the first measured dry-down.                                                             |
| Aug. 31       | Increase to 50% only if new tissue remains healthy and the new mix is behaving predictably; otherwise hold 45%.                                        |
| Sept. 7       | Hold 50% for a second week, or remain at the lowest successful setting.                                                                                |
| Sept. 14      | Try 55% only if every lit surface remains healthy; 50% is already a successful steady setting.                                                         |
| Sept. 21      | Begin the Fenton sunrise/sunset timer in the full schedule.                                                                                            |

Do not jump directly from the current exposure to 100% power at 12 inches. The
AW200SE is powerful enough that acclimation still matters. Keep a normal dark
period. Use 12 hours on and 12 hours off through September 20, then use the
seasonal Fenton timer in the full schedule.

The installed AW200SE/E25/VIVOSUN app combination was tested on 2026-07-24 and
supports every whole-percent setting from 25% through 100%. If E25/app control
is unavailable, the full operating schedule includes a fallback that uses the
coarser manual presets plus height changes.

Plants already acclimated to strong outdoor light can begin closer to the middle
of that range, but watch them after the move because a close lamp exposes the
same surface for hours without the sun changing angle.

If using outdoor sun for acclimation instead, begin with bright shade or one to
two hours of morning sun and add exposure gradually. Avoid introducing full
summer sun and high grow-light intensity at the same time.

### Paired AeroWave airflow

Use the AW200SE's integrated fan at its lowest gentle Natural Wind setting. Two
pole-mounted circulation fans now approach the canopy from opposing directions.
The original is the documented AeroWave E6 Gen2; the second was reported as an
“AeroSun,” but its exact model and control path have not been recorded. Keep
both inside the 8:15 a.m.–7:45 p.m. indoor fan window when their controls permit
it:

- Natural Wind Level 1–2 of 10 on the confirmed E6 Gen2;
- the new fan at the lowest setting that passes the tissue test, without
  assuming it uses the E6's numeric scale;
- oscillation activated on each fan when supported, with the E6's app scale set
  to Level 4 of 5 if that control appears;
- offset arcs and vertical angles so the two jets cross gently rather than
  meeting head-on or dwelling on one row; and
- the installed divider-pole positions, aimed across the round table and both
  wooden tables without rocking plants, flattening hairs, or moving grit.

The first fan's E25 was installed and paired in the VIVOSUN app on 2026-07-28.
VIVOSUN documents 10 E25/app Natural Wind levels and five oscillation levels for
the E6 Gen2. The second fan's exact model and controller or splitter path still
need to be recorded. Do not assume the light's RJ45 port controls it.

With two fans, Level 3 is not the new default. Use the tissue test at both ends
and the center of all three surfaces; reposition or narrow an arc before raising
either fan. Do not automatically increase fan strength with light intensity.
Plant rocking, flattened hairs, moving top dressing, or one side drying much
faster mean a fan is too close, too strong, or aimed too narrowly.

### Room temperature and humidity

Keep the manual temperature/RH sensor shaded at canopy height, outside the
direct AeroWave stream and away from wet trays. Read it at 7:30 p.m. each day
from August 3 through 16, then as part of the Sunday inspection. Record current
temperature/RH plus the rolling 24-hour minimum and maximum; copy the all-time
extremes on Sundays.

Treat the readings as trends. Roughly 65–85°F and 30–55% RH are comfortable
working observations for this mixed group. Investigate a 24-hour low below
55°F, a high above 95°F, or a 24-hour RH minimum above 60%. A brief humidity
peak above 60% is not an emergency.

### Reading the plants

| Observation                                                             | Likely meaning               | Response                                                                                   |
| ----------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| Fresh pale, bleached, yellow-tan, or hard brown patches on the lit side | Too much light too quickly   | Reduce intensity or increase distance, then hold steady while the plant adjusts.           |
| New growth is narrow, pale, weak-spined, or leaning                     | Too little light             | Increase light gradually or move the plant toward the center.                              |
| New growth is compact and normally colored                              | Current level is working     | Keep the setting stable instead of changing it just because more power is available.       |
| Base is soft, translucent, blackening, or smells bad                    | Possible rot                 | Isolate the plant from watering, inspect the roots/base, and remove dead tissue if needed. |
| Body is slightly wrinkled but firm after the mix has dried              | Plant may be ready for water | Water fully, then drain; do not give repeated small sips.                                  |

The variegated _Gymnocalycium_ and probable variegated blue torch have less
chlorophyll in their pale tissue. Keep them nearer an edge or otherwise slightly
below the most intense part of the light until their response is known.

### August additions

Do not reset the established collection's schedule. Treat the second wooden
table as an acclimation overlay:

| Plant group   | Initial position                                                                              | Watering and light rule                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Six new cacti | Outer half of the second wooden table; no riser until each tabletop-to-tip height is measured | Join the cactus schedule only after seven stable days without fresh bleaching or hard tan patches.                      |
| Kiwi aeonium  | Outer or room-side edge of the second wooden table                                            | Give bright light below the cactus center; let much of the pot dry, but do not force a prolonged desert-cactus drought. |
| Money tree    | Window/periphery, outside the fixture hotspot; shade cloth available but not automatic        | Water when the upper mix dries instead of waiting for the entire 6 in pot to become cactus-dry.                         |

Two or three days without money-tree scorch is encouraging but not a complete
acclimation test. Use the shade cloth if leaves bleach or develop crisp tan
patches, and move the plant farther from the fixture before raising the whole
light. Its tall canopy must not become the reference used to set cactus light
clearance.

The new cactus mapping is `E1` dwarf old man, `E2` Chamaelobivia, `E3` woolly
nipple cactus, `F1` hook-spined pincushion, `F2` boobie cactus, and `F3` yellow
tower. The numbered mapping is `#1` shared rehab cactus planter, `#2`
shared succulent planter, `#3` money tree, and `#4` Kiwi aeonium. These are
plant or planter IDs, not provisional table-position coordinates.

## Water and rain

### August 14 dry-down reset

The prior medium was still producing a measured **10–20 g/day pot-weight loss
on day 14 after watering**. That means the affected pots had not reached a
stable dry-weight floor, although part of the change was plant water use rather
than evaporation from the medium.

The affected cacti were emergency-repotted into a reported **60:40 Molly's
Succulent Mix/perlite blend**, retaining only old medium attached to the roots.
Molly's is already a gritty soilless mix that the manufacturer sells for use
without amendment, so another 40% perlite is an aggressive drainage choice. A
complete dry-down within seven days is plausible in these small pots under the
current light and paired airflow, and it may happen sooner. Treat that as a
measurement target, not a seven-day watering schedule.

For the first two or three comparable watering cycles:

1. Start a new pot-setup number in the tracker for every container that was
   actually repotted. Keep all pre-repot weights in history.
2. After the next normal full soak and complete tray drainage, weigh each pot at
   the same elapsed time and with the same saucer convention used for every
   later reading.
3. Weigh at roughly the same time each day until the curve approaches a stable
   floor. Use the weight trend together with dryness below the top dressing and
   plant firmness; no single gram threshold proves the whole root ball is dry.
4. A repeatable four-to-seven-day dry-down is a useful starting result. If a pot
   still has a clear downward trend after day 7 on two cycles, check drainage
   holes, trapped tray water, top-dressing depth, pot size, and airflow before
   repotting again.
5. If the mix reaches its floor in only two or three days, that is not
   automatically harmful, but watch for premature wrinkling and be prepared to
   check readiness sooner. Do not give small daily sips to slow the curve.

The exact repotted IDs and whether the 60:40 ratio was measured by volume still
need to be copied from the physical log. Until then, the repository records a
collection-level event without pretending every container changed.

- Judge dryness below the rocky top layer, not from the appearance of the rocks.
- A normal watering should soak the mix rather than only wetting the surface.
- Let excess water leave the drainage holes and empty every tray.
- Do not water a damaged or brown cactus repeatedly in an attempt to force it
  back to life.
- Bringing the collection inside before extended rain is a workable policy.
  Occasional rain is not automatically harmful in a drained, fast-drying pot,
  but a saturated pot should never sit in a saucer.
- Avoid cold, wet conditions and frost. A location-specific winter plan can be
  added once the local climate and indoor temperatures are recorded.

## Group-specific notes

### Starter group

Most of the starter cacti can share the high-light, soak-and-dry baseline after
acclimation. Individual pots make it easy to move a more sensitive plant toward
the edge or delay its next watering.

The Dragon's Egg is a euphorbia rather than a cactus. Its watering style can
still be similar, but a damaged euphorbia can release irritating milky latex.
Wear gloves, keep sap away from skin and eyes, and wash exposed skin promptly.
The [RHS euphorbia guide](https://www.rhs.org.uk/plants/euphorbia/growing-guide)
has the relevant handling warning.

### Mixed succulent planter

The echeveria will usually show low light first by opening its rosette and
stretching. The elephant bush and kalanchoes may grow taller and shade it. The
arrangement can remain intact for fun, but prune or separate plants later if one
starts dominating the planter.

Water only after the shared root zone has dried. If one plant repeatedly
shrivels while the others remain plump, the combination has become inconvenient
and separation will be easier than trying to split the difference forever.

### Older mixed cactus planter

The monkey tail may use water a little faster during active growth than the
upright desert cacti, but the shared planter still needs to dry between
waterings. Its stretched growth has been trimmed multiple times, and the new
growth is improving after about a month outside in bright shade with brief
direct sun. Continue judging the current growing tips rather than the shape of
old low-light growth.

The blue torch, monkey tail, and golden torch all have living green growing
points in the recent photos. Their old lean, scars, and uneven growth can remain
while healthy new growth improves.

### Kiwi aeonium and money tree

The Kiwi aeonium is a succulent, but it is not a full-center desert cactus.
Keep its variegated rosettes at the lower-light edge and rotate the pot 90°
weekly unless a future one-sided growth reason is documented.

The money tree is _Pachira glabra_, a tropical tree reported under a retail
name that is often confused with _Pachira aquatica_. Keep its original tag or a
clear photograph if available. The current 6 in pot is enough; reserve the 8 in
pot until roots have genuinely filled the smaller container. Rotate it 90°
weekly for even window growth.

## Removed cactus: historical record

Rehab-04 was removed on 2026-07-24. The final inspection found only a small
patch of green flesh near the top, which was not enough viable tissue to
salvage. It is no longer part of the watering, lighting, or recovery plan.

The decision checklist is retained for the collection history:

1. Remove enough decorative moss to see and reach the cactus base.
2. Test it gently. A living, dehydrated cactus can be wrinkled but should retain
   some firmness; a dead dry plant may feel hollow or brittle, while rot is
   usually soft or mushy.
3. Look closely for a firm green crown or offset with enough healthy tissue to
   survive separation. A small isolated green patch is not necessarily viable.
4. If still uncertain, make one shallow scratch in an inconspicuous area
   with a clean blade. Green or moist pale tissue means stop and reassess; dry
   brown tissue throughout supports removing it.
5. If it is dry-dead or rotten, remove the plant and loose dead root material.
   Leave the surrounding planter dry while checking the neighboring bases.

A full emergency repot was not automatically required by removing one dead
plant. It becomes useful if the shared mix stays wet for a long time, smells
sour, lacks a drainage route, or another cactus develops a soft or dark base.
Iowa State Extension has a useful
[overview of succulent rot and light problems](https://yardandgarden.extension.iastate.edu/how-to/common-problems-and-issues-succulents).

## Useful reference points

- [VIVOSUN AW200SE specifications](https://vivosun.com/en-US/vivosun-smart-grow-system-aerolight-a200se-compatible-with-growhub-e25-controller-p142504424325359396-v142527788947495192)
- [University of Nebraska–Lincoln: acclimating cacti to stronger light](https://lancaster.unl.edu/cacti-care/)
- [University of Maryland Extension: excess light on indoor plants](https://extension.umd.edu/resource/excess-light-indoor-plants)
- [Iowa State Extension: common succulent problems](https://yardandgarden.extension.iastate.edu/how-to/common-problems-and-issues-succulents)
- [Molly's Succulent Mix: official product details and ingredients](https://veryplants.com/products/mollys-succulent-mix-premium-gritty-soil-mix)
- [University of Minnesota Extension: cactus and succulent potting mix and watering](https://extension.umn.edu/gardening-minnesota/cacti-and-succulents)
