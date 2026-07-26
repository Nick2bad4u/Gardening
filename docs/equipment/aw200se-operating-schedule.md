# Fenton AW200SE and AeroWave operating schedule

Last updated: 2026-07-25

This is the canonical dated schedule for the VIVOSUN AW200SE, AeroWave E6
Gen2, their two GrowHub E25 controllers, and the current collection in Fenton,
Michigan. It covers the 2026 move indoors, six-week light acclimation plus the
first steady-state week, airflow, pot layout, rotations, local daylight, and
the 2027 return outdoors.

The dates assume the permanent indoor setup is ready on Sunday, August 30,
2026. If the table is not ready, bring the plants indoors when the temperature
rules require it and shift every ramp date together. Do not begin partway
through the table.

All height measurements are from the LEDs to the **tallest living plant tip**,
not to the table, pot rim, or soil.

## Calendar at a glance

| Date | Event |
| --- | --- |
| July 24–August 29, 2026 | Continue the outdoor bright-shade routine while using the temperature and rain overrides below. |
| Sunday, August 30, 6:00–8:00 p.m. | Inspect, label, photograph, and permanently arrange the collection; mount the AeroWave and pair its E25. |
| Monday, August 31, 7:45 a.m. | Verify both E25 programs; the light starts at 8:00 a.m. and the AeroWave at 8:15 a.m. |
| September 7 | Lower the fixture from 20 to 18 in; keep 40% power. |
| September 14 | Increase from 40% to 45%. |
| September 21 | Increase from 45% to 50%. |
| September 28 | Hold 50% for a second week. |
| October 5 | Increase to 55% only if every lit surface remains healthy; otherwise hold 50%. |
| October 12 | Begin the steady 50–55% setting; make no other change that week. |
| October 19 | Replace the fixed 8:00 a.m.–8:00 p.m. timer with the Fenton seasonal timer. |

## Fenton outdoor cutoff

The planned permanent move is **Sunday, August 30, 2026**. Move the collection
inside earlier for any of these conditions:

- a forecast low of 50°F or colder;
- two consecutive forecast nights below 55°F; or
- a forecast near 53–55°F combined with rain, saturated pots, or strong cold
  wind.

One isolated dry night around 51–54°F is unlikely to destroy the collection,
but bringing the plants in overnight is easy insurance. It does not start Day 1
unless they remain indoors in their final positions.

The date is deliberately earlier than Fenton's first frost. Nearby Flint's
1991–2020 normal low reaches 55°F on September 1–4, 54°F on September 5–7, and
53°F by September 8. Houseplant guidance commonly recommends moving tender
plants inside when nights repeatedly approach 50–55°F.

### August 30 move-in checklist

1. Inspect bodies, leaf undersides, areoles, pot rims, drainage holes, and
   top dressing for mealybugs, scale, spider mites, ants, or other hitchhikers.
2. Wipe the pots and trays clean. If a plant must be rinsed, let it dry before
   placing it under the lamp.
3. Label every individual pot with its collection ID.
4. Arrange the pots using the layout below.
5. Mark the adjustable hanger positions for 18, 20, 22, and 24 in.
6. Set the LEDs 20 in above the tallest living tip.
7. Mount the AeroWave behind the center of the table using the placement rules
   below. Secure its clamp, power cord, and E25 cable.
8. Pair and name both E25 controllers, test the AeroWave sweep at Levels 1 and
   2, and leave it at Level 2.
9. Take one top-down and one front-view baseline photo.
10. Do not water merely because the plants moved. Water only when the root zone
   is actually dry and the plant is ready.

## Programs to enter in the two E25 controllers

Keep the two control paths separate:

| App name | Connection | Purpose |
| --- | --- | --- |
| `E25 — AW200SE light` | E25 in the AW200SE Type-C controller port | Light dimming, light timer, sunrise/sunset fade, and the fixture's integrated fan |
| `E25 — AeroWave canopy fan` | Second E25 connected to the AeroWave Type-C port with the supplied cable | Cross-canopy fan mode, strength, oscillation, and timer |

Both devices retain their own AC power connections. The AW200SE's RJ45 ports
are for compatible AeroLight daisy chains, not for the AeroWave. Do not connect
the fan to the light with an Ethernet cable or an improvised adapter.
Compatible AeroLights can share one E25 through their RJ45 light chain, but
AeroWave fans do not directly daisy-chain fan-to-fan. With E25 controllers,
each separately controlled AeroWave needs its own E25. Multiple fans instead
require separate controller connections, such as the ports or supported
splitter arrangement on an E42/E42A-class controller.

### AW200SE E25 program

| Setting | Value |
| --- | --- |
| Light mode | Cycle schedule; do not use a cannabis grow recipe |
| On | 8:00 a.m. |
| Off | 8:00 p.m. |
| Photoperiod | 12 hours on, 12 hours dark |
| Wing position | Standard initially; use wide if the plant footprint needs more edge coverage |
| Starting height | 20 in above the tallest living tip |
| Starting intensity | 40% |
| Sunrise/sunset fade | Enable the app's fade; use its default duration |
| Integrated fan | Natural Wind during the light period, at the lowest setting that produces gentle air movement without a constant hard blast |

### AeroWave E25 program

| Setting | Value |
| --- | --- |
| Fan mode | Natural Wind |
| Starting strength | Level 2 of 10 |
| Provisional steady strength | Level 3 of 10 only after the September 6 coverage check |
| Oscillation | Level 4 of 5; use Level 5 only if the outer columns never enter the sweep |
| On | 8:15 a.m. |
| Off | 7:45 p.m. |
| Daily runtime during ramp | 11 h 30 min |
| Placement | Centered behind columns B–C, 24–36 in from the nearest back-row pot |
| Aim | Across the upper canopy toward the front-center, not continuously at one plant or pot surface |

VIVOSUN's current manual lists 10 E25/app fan-speed levels, 10 E25/app Natural
Wind levels, and 5 oscillation levels for the E6 Gen2. These numeric settings
remain provisional until the second E25 and current app expose the controls. If
the app offers fewer levels, start at the lowest nonzero Natural Wind setting
and use the same tissue test rather than guessing an equivalent number.

Keep the fixed light and AeroWave programs through October 18 so the weekly
results can be compared. The seasonal Fenton times begin October 19. The
AeroWave begins 15 minutes after the light and stops 15 minutes before it
during a 12-hour light day.

The current AeroWave manual lists 10 fan-speed and 10 Natural Wind settings
under E25/app control, while the product specification table separately lists
five Natural Breeze speeds. Until the second E25 is installed, treat the
10-level labels in this plan as provisional. If the current app exposes a
different scale, begin at its lowest nonzero Natural Wind setting and repeat
the tissue test before increasing it.

The AeroWave is additional cross-canopy circulation. Keep the AW200SE's
integrated fan at its lowest gentle Natural Wind setting rather than running
both fans hard.

### AeroWave placement and airflow test

Use the following order of preference:

1. Mount the AeroWave behind the center of the table, aligned between columns B
   and C and 24–36 in from the nearest back-row pot. Use a stable rack member
   or stand that fits the clamp; VIVOSUN lists a 16–22 mm compatible pole size.
2. Place the fan hub roughly 4–8 in above the tallest living tip. Tilt it
   slightly downward so the sweep passes across the upper halves of the plants
   and through the gaps between pots.
3. Center the 90° sweep on the gap between B3 and C3. The fan should pass over
   both outer columns without dwelling on Starter-07, the monkey tail, or the
   succulent planter.
4. If there is no safe center mounting point, mount it beyond either short end
   of the table, at least 30 in from the closest plant, and aim diagonally
   across the grid.
5. Keep the fan, E25, adapter, and connections outside watering spill paths.
   Provide a drip loop and do not attach the fan to the light hanger or power
   cable.

Test airflow with a narrow strip of tissue held at A4, the B2–C3 center, and D4.
The strip should flutter when the sweep reaches it, but plant bodies should not
rock, hairs should not remain flattened, loose top dressing should not move,
and one pot should not dry dramatically faster than its neighbors.

### AeroWave strength and oscillation decisions

| Date | Strength | Oscillation | Action |
| --- | ---: | ---: | --- |
| Aug. 30 setup | Test Level 1, then Level 2 | 4 of 5 | Confirm a clear sweep with no cord pull, clamp movement, hard blast, or collision. |
| Aug. 31–Sept. 6 | Level 2 of 10 | 4 of 5 | Starting setting; leave it unchanged while checking all three tissue-test positions. |
| Sept. 6 after the light fades | Keep Level 2, or approve Level 3 | Keep 4 of 5 | Approve Level 3 only if the closest plants remain calm and A4 or D4 receives almost no airflow. |
| Sept. 7 onward | Approved Level 2 or 3 | 4 of 5 | Hold the lowest level that reaches the whole occupied footprint. |

Do not increase fan strength merely because light power increases. Reposition
the fan or widen the sweep before using more power. Level 4 of 10 is the
provisional ceiling for this open-table collection; use it only if a genuine
still-air pocket remains after placement corrections. Level 5 of 5 oscillation
is acceptable if Level 4 does not reach both outer columns, but reduce the arc
if much of the sweep misses the table.

### Dimming controls verified on this setup

VIVOSUN lists **25%, 50%, 75%, 100%, and off** for “Manual Mode/Grow Hub.” It
separately lists **25–100%** for the VIVOSUN app, but does not state the app's
increment size.

On 2026-07-24, the installed AW200SE/E25/VIVOSUN app combination was tested and
confirmed to accept every whole-percent setting from 25% through 100%. The 5%
changes in this schedule are therefore available on this setup. This is a direct
observation of the current hardware, firmware, and app combination, not a
promise about every E25 or app version.

## Dated six-week acclimation and first steady week

The verified 1% control makes it possible to use a smooth ramp in which most
weeks change only one variable. If any step causes fresh bleaching, hard tan
patches, or unusual surface heat, use the recovery rule instead of advancing.

The Fenton sun times are rounded to the nearest 15 minutes and are context, not
the E25 timer during the ramp.

| Dates | Days | Height above tallest tip | App intensity | E25 time | Fenton sunrise–sunset at start | Action |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Aug. 31–Sept. 6 | 1–7 | 20 in | 40% | 8 a.m.–8 p.m. | 7:00 a.m.–8:15 p.m. | Initial stationary-light acclimation; there is no official 20-inch PPFD grid. |
| Sept. 7–13 | 8–14 | 18 in | 40% | 8 a.m.–8 p.m. | 7:00 a.m.–8:00 p.m. | At 7:45 a.m. Sept. 7, lower the fixture 2 in and make no power change. |
| Sept. 14–20 | 15–21 | 18 in | 45% | 8 a.m.–8 p.m. | 7:15 a.m.–7:45 p.m. | At 7:45 a.m. Sept. 14, increase by 5 percentage points. |
| Sept. 21–27 | 22–28 | 18 in | 50% | 8 a.m.–8 p.m. | 7:15 a.m.–7:30 p.m. | At 7:45 a.m. Sept. 21, increase by another 5 percentage points. |
| Sept. 28–Oct. 4 | 29–35 | 18 in | 50% | 8 a.m.–8 p.m. | 7:30 a.m.–7:15 p.m. | Hold for a second week and judge new growth. |
| Oct. 5–11 | 36–42 | 18 in | 55% only if healthy | 8 a.m.–8 p.m. | 7:30 a.m.–7:15 p.m. | Use 55% only if every lit surface remains healthy; otherwise hold 50%. |
| Oct. 12–18 | 43–49 | 18 in | 50–55% | 8 a.m.–8 p.m. | 7:45 a.m.–7:00 p.m. | Hold the lowest successful power and change nothing else this week. |

Do not advance merely because the next date arrived. Remaining at a taller
distance or at 50% is a successful outcome if new growth is compact and
normally colored.

The outdoor-acclimated plants should not need the gentlest possible start.
However, if a plant has spent more than about two weeks in weak indoor light
before Day 1, place it at an edge or on a lower stable surface so its tip is
effectively 22–24 in from the light for the first week. A local placement
change is easier than changing the whole collection for one plant.

### Manual-control fallback

If E25/app control is unavailable and only the published 25% and 50% presets can
be selected, use distance to soften the jump:

| Period | Height | Manual intensity |
| --- | ---: | ---: |
| Days 1–7 | 20 in | 25% |
| Days 8–14 | 18 in | 25% |
| Days 15–21 | 24 in | 50% |
| Days 22–28 | 22 in | 50% |
| Days 29–35 | 20 in | 50% |
| Days 36 onward | 18 in | 50% |

## Final pot layout

Center the entire occupied grid beneath the fixture's long axis. “Back” means
the side away from the aisle; “front” is the side used for inspection and for
the monkey tail to trail over safely. The grid shows relative light zones, not
exact scale; expand or compress the spacing to fit the final table while
preserving the same order.

| Row | A: left edge | B: center-left | C: center-right | D: right edge |
| --- | --- | --- | --- | --- |
| 1: back | Starter-07, variegated moon cactus | Starter-02, *Stenocactus* | Starter-08, giant chin cactus | Starter-11, Dragon's Egg |
| 2 | Starter-05, feather cactus | Starter-01, Old Man of the Andes | Starter-03, rainbow hedgehog | Starter-06, domino cactus |
| 3 | Starter-04, serpent cactus | Starter-09, Indigo Wave | Starter-12, monk's hood | Starter-10, Ming Thing |
| 4: front | Older planter, outer half | Older planter, brighter half | Succulent planter, brighter half | Succulent planter, outer half |

The zones are:

- **High center:** B2, C2, B3, and C3.
- **Bright middle:** B1, C1, A2, D2, A3, and D3.
- **Gentler edge:** A1 and D1.
- **Shared planters:** A4–B4 and C4–D4 use orientation to put each plant in its
  appropriate brighter or gentler section.

Orient the shared planters as follows:

- Put the older mixed planter at the front so the monkey tail can trail without
  being crushed. Keep the pale side of the variegated blue torch facing toward
  A/outward rather than toward the central hotspot. Give the greener blue-torch
  tissue and golden torch as much of the B/brighter half as the fixed planting
  allows.
- Put the succulent planter across C4–D4 with the echeveria side facing inward
  toward C. Keep the golden elephant bush and taller kalanchoes from shading
  the echeveria; prune them later if orientation no longer solves the problem.

If a short high-light pot is more than about 6 in below the tallest tip, use a
wide, stable riser under that pot. Do not lower the whole light toward a short
plant while the tallest cactus is already at the scheduled clearance.

### Rotation and inspection times

Use one simple weekly routine:

| Time | Task |
| --- | --- |
| Every Sunday, 30 minutes before the programmed off time | Photograph the same front and top views; inspect new growth, lit surfaces, bases, and pests while the light is on. This is 7:30 p.m. during the ramp. |
| Every Sunday after that day's fade finishes | Rotate Starter-01 through Starter-06 and Starter-08 through Starter-12 by 90° clockwise in their existing slots. This is shortly after 8:00 p.m. during the ramp. |
| Same Sunday check | Keep Starter-07's palest tissue facing away from the center; do not rotate it blindly. |
| Same Sunday check | Do not routinely rotate either shared planter; preserve the blue-torch and echeveria orientations above. |
| Same Sunday check | Measure the tallest tip and restore the scheduled clearance if growth changed it; check trays and pot stability. |
| Same Sunday check | Repeat the tissue test at A4, center, and D4; check the AeroWave clamp, sweep, cables, and nearest plants for uneven drying. |
| First Sunday of each month, after shutoff | Unplug the AeroWave, inspect the grille for dust, and wipe it according to the manual after the blades stop. |
| Scheduled Mondays at 7:45 a.m. | Make that week's light change and any previously approved AeroWave change before either device starts. |

The first scheduled rotation is Sunday, September 6. Repeat it September 13,
20, and 27; October 4, 11, and 18; then continue weekly using the current
seasonal off time.

Rotation means turning a pot in place, not moving it into another light zone.
Do not automatically trade edge and center pots. If one side of the fixture
later proves consistently weaker, swap only plants with the same light-zone
rating and document the change.

## What the schedule means in PPFD and DLI

The official 18-inch, 100% reflective-tent map has a minimum of 573, a
25-point mean of about 707, and a center of 856 µmol/m²/s. The values below
scale that map linearly with dim percentage and convert it to a 12-hour DLI.
They are planning estimates, not measurements of the future open table.

| Power at 18 in | Estimated PPFD: min / mean / center | Estimated 12 h DLI: min / mean / center |
| ---: | ---: | ---: |
| 25% | 143 / 177 / 214 | 6.2 / 7.6 / 9.2 |
| 40% | 229 / 283 / 342 | 9.9 / 12.2 / 14.8 |
| 45% | 258 / 318 / 385 | 11.1 / 13.7 / 16.6 |
| 50% | 287 / 353 / 428 | 12.4 / 15.3 / 18.5 |
| 55% | 315 / 389 / 471 | 13.6 / 16.8 / 20.3 |
| 60% | 344 / 424 / 514 | 14.9 / 18.3 / 22.2 |
| 75% | 430 / 530 / 642 | 18.6 / 22.9 / 27.7 |

These numbers are deliberately based on the full map rather than VIVOSUN's
separate single specification of 691 µmol/m²/s at 12 inches. The two official
datasets do not reconcile, and reflective tent walls raise edge readings.
Expect an open table to have lower and less uniform edges.

At the planned 50–55% steady range, the tent-map estimate covers much of the
collection's working 10–22 mol/m²/day range. The 55% setting is an optional
increase for healthy plants, not a requirement. Horizontal placement supplies
the rest:

- Put the rainbow hedgehog, *Astrophytum*, Old Man of the Andes, Indigo Wave,
  golden torch, and the greener side of the blue torch nearer the stronger
  center zone.
- Put the variegated moon cactus, Dragon's Egg, and the pale side of the blue
  torch toward an edge.
- Keep the remaining plants between those zones.
- Raise short high-light pots on stable risers. Do not lower the entire fixture
  toward them while a tall cactus is already 18 in away.

The full plant-by-plant ranges remain in the
[AW200SE research guide](./vivosun-aw200se.md#working-light-targets-for-this-collection).

## Height-adjustment rules

Height is adjusted during acclimation and becomes a maintained clearance after
October 11.

1. Mark the adjustable hanger positions for 18, 20, 22, and 24 in once the
   table is installed.
2. Check the tallest tip weekly during active growth and at least monthly
   otherwise. Raise the lamp enough to restore 18 in as that plant grows.
3. If canopy heights differ by more than about 6 in, use stable risers under
   shorter plants rather than moving the lamp closer to the tallest one.
4. Do not lower below 18 in during the six-week ramp.
5. After the ramp, do not lower below 16 in without a real PPFD or repeatable
   lux map at every plant height.

### Recovery rule for too much light

If fresh bleaching, yellow-tan hard patches, papery tissue, or unusual surface
heat appears:

1. Raise the light to 22–24 in.
2. Reduce intensity by 10 percentage points, such as 55% to 45% or 50% to 40%.
   If E25/app control is unavailable, use 50% at the greater distance; use the
   25% manual preset if new damage still appears.
3. Hold that setting for 10–14 days.
4. Judge only new damage or new growth; old scars will not reverse.
5. Resume with one change at a time after the plant is stable.

### Rule for too little light

If new growth remains narrow, pale, weak-spined, widely spaced, or strongly
leaning after at least two weeks at 50–55% and 18 in:

1. Move that plant inward or raise its pot.
2. Confirm that another plant is not shading it.
3. If at least three center plants still show the same response, increase by 5
   percentage points, up to at most 60%, at 18 in.
4. Hold each supported increase for two weeks before considering another
   change. If E25/app control is unavailable, measure first rather than jumping
   directly from the 50% manual preset to 75%.

Sixty percent is the provisional ceiling for the mixed collection—not a hard
limit on the hardware. At 18 in its tent-map center estimate is already about
514 µmol/m²/s and 22.2 mol/m²/day over 12 hours. Do not use 75–100% as the
default simply because the fixture offers it.

## Fenton seasonal daylight after acclimation

VIVOSUN's Sunrise/Sunset option fades the AeroLight up at the beginning of a
programmed light cycle and down at the end. The published E25 material does not
say that it automatically looks up astronomical sunrise or sunset, and it does
not document the fade duration. Treat it as a transition effect inside the
schedule, not as a location-aware daylight service.

On October 19, keep the successful 50% or 55% light power and the approved
AeroWave strength. Change only the two timers.
Thereafter, update both E25 controllers on the listed dates. Times use Fenton
coordinates 42.7978° N, 83.7049° W, follow local daylight-saving time, and are
rounded to the nearest 15 minutes. Summer light days longer than 14 hours are
capped at 14 hours to avoid adding unnecessary indoor DLI.

The AeroWave always runs inside the light window. For light days of 12 hours
or less, start it 15 minutes after the light and stop it 15 minutes before the
light. On longer days, center an 11-hour-30-minute fan period inside the light
window. This stays below the manual's 12-hour daily-use condition for its stated
service-life and warranty expectations.

| Effective date | Light E25 | AeroWave E25 | Programmed light day | Note |
| --- | --- | --- | ---: | --- |
| Oct. 19, 2026 | 8:00 a.m.–6:45 p.m. | 8:15 a.m.–6:30 p.m. | 10 h 45 min | First seasonal-timer change; keep power and fan strength unchanged. |
| Nov. 1, 2026 | 7:15 a.m.–5:30 p.m. | 7:30 a.m.–5:15 p.m. | 10 h 15 min | Daylight saving time ends; verify both app clocks. |
| Dec. 1, 2026 | 7:45 a.m.–5:00 p.m. | 8:00 a.m.–4:45 p.m. | 9 h 15 min | Winter setting. |
| Jan. 1, 2027 | 8:00 a.m.–5:15 p.m. | 8:15 a.m.–5:00 p.m. | 9 h 15 min | Winter setting. |
| Feb. 1, 2027 | 7:45 a.m.–5:45 p.m. | 8:00 a.m.–5:30 p.m. | 10 h | Resume increasing natural day length. |
| Mar. 1, 2027 | 7:15 a.m.–6:30 p.m. | 7:30 a.m.–6:15 p.m. | 11 h 15 min | Check that new growth remains compact. |
| Mar. 14, 2027 | 7:45 a.m.–7:45 p.m. | 8:00 a.m.–7:30 p.m. | 12 h | Daylight saving time begins; verify both app clocks. |
| Apr. 1, 2027 | 7:15 a.m.–8:00 p.m. | 7:45 a.m.–7:15 p.m. | 12 h 45 min | Center the capped fan period inside the light window. |
| May 1, 2027 | 6:30 a.m.–8:30 p.m. | 7:45 a.m.–7:15 p.m. | 14 h | Seasonal maximum; outdoor days override both devices. |
| June 1, 2027 | 6:30 a.m.–8:30 p.m. | 7:45 a.m.–7:15 p.m. | 14 h | Indoor fallback; outdoor days override both devices. |
| July 1, 2027 | 6:30 a.m.–8:30 p.m. | 7:45 a.m.–7:15 p.m. | 14 h | Indoor fallback; outdoor days override both devices. |
| Aug. 1, 2027 | 6:45 a.m.–8:45 p.m. | 8:00 a.m.–7:30 p.m. | 14 h | Indoor fallback; outdoor days override both devices. |
| Sept. 1, 2027 | 7:00 a.m.–8:15 p.m. | 7:45 a.m.–7:15 p.m. | 13 h 15 min | Begin shortening the indoor day. |

The astronomical calculations are planning values. Atmospheric conditions can
shift observed sunrise or sunset by roughly five minutes, which is irrelevant
after rounding to 15-minute controller settings.

At 18 in and the documented 50% setpoint, changing the day length changes the
tent-map DLI approximately as follows:

| Natural day length | Mean-map DLI | Center-map DLI |
| ---: | ---: | ---: |
| 9 h | 11.4 | 13.9 |
| 10 h | 12.7 | 15.4 |
| 11 h | 14.0 | 16.9 |
| 12 h | 15.3 | 18.5 |
| 13 h | 16.5 | 20.0 |
| 14 h | 17.8 | 21.6 |

Those seasonal changes remain inside a useful broad range for much of the
collection. Keep gentler and variegated plants at the edge, especially during
long summer programs.

## 2027 return outdoors and outdoor-day override

After a winter under the lamp, the collection must acclimate to outdoor light
again.

Keep the collection indoors throughout the August 31–October 18, 2026, ramp.
Routine outdoor trips during those seven weeks would add an unknown amount of
sunlight and make the weekly comparisons unreliable.

| Date or trigger | Action |
| --- | --- |
| May 15, 2027 onward | On warm, dry days, use bright shade outdoors for 2–4 hours and bring the plants back inside well before a cool evening. |
| After seven successful outings | Add about 30–60 minutes of gentle morning or late-day direct sun every few outings. Avoid intense midday sun. |
| June 15, 2027 target | Leave the collection outside overnight only if the 10-day forecast shows every night at 55°F or warmer and no prolonged rain. Otherwise keep using daytime outings. |
| Any outdoor date | Move inside for a forecast low of 50°F, repeated nights below 55°F, prolonged rain, or saturated cold pots. |

Sun and lamp exposure add together. Keep both E25 programs during the initial
ramp, or their current seasonal programs afterward, but manually skip
unnecessary indoor light and fan time:

| Outdoor exposure that day | Indoor-device action |
| --- | --- |
| No outdoor time or a fully rainy day | Run the normal scheduled light and AeroWave programs. |
| A few hours in bright shade | When brought inside, use only the time remaining in each device's current program. |
| At least roughly 2 hours of direct sun or most of the day outdoors | Leave both the grow light and AeroWave off for the rest of that day. |
| Outdoors all day | Leave both indoor devices off. |

Never add “make-up” hours after the programmed off time. If the outdoor
exposure is hard to judge, choose the lower-light option; one modest day is
safer than stacking a full outdoor day with a full indoor DLI.

## Final table calibration

Before August 31, record:

- the occupied table width and depth;
- light-to-tip distance for the tallest and shortest plants;
- wing position;
- whether walls or reflective surfaces are nearby; and
- a phone-lux or PAR reading at a 3 × 5 grid across the plant footprint;
- AeroWave-to-nearest-plant distance, height, vertical angle, and oscillation
  level; and
- whether the Level 2 tissue test reaches A4, center, and D4 without moving top
  dressing or rocking plants.

Those measurements can replace the reflective-tent estimates without changing
the ramp's basic order or the seasonal timer dates.

## Sources

- [VIVOSUN AW200SE product specifications](https://vivosun.com/en-US/vivosun-smart-grow-system-aerolight-a200se-compatible-with-growhub-e25-controller-p142504424325359396-v142527788947495192)
- [VIVOSUN AeroLight SE manual](https://vivosun.com/en-AU/support/guide/aerolightse)
- [VIVOSUN GrowHub E25 guide](https://vivosun.com/support/guide/growhub-e25)
- [VIVOSUN AeroWave E6 Gen2 specifications](https://vivosun.com/en-US/vivosun-aerowave-e6-6-inch-clip-on-fan-compatible-with-growhub-e42-e25-p140926625940348007-v140926625940348006)
- [VIVOSUN AeroWave E Series manual](https://vivosun.com/en-GB/support/guide/aerowave)
- [VIVOSUN E42A Type-C splitter for multiple fans](https://vivosun.com/en-GB/vivosun-2-in-1-type-c-splitter-compatible-with-growhub-aerowave-p144564522569585355-v144564522569585354)
- [VIVOSUN Smart Grow System FAQ: Sunrise/Sunset mode](https://vivosun.com/growing_guide/vivosun-smart-grow-system-faqs)
- [National Weather Service: Flint September normals](https://www.weather.gov/dtx/FNT_Sep_rec)
- [Illinois Extension: moving houseplants indoors below 55°F](https://extension.illinois.edu/blogs/good-growing/2022-09-09-tips-moving-houseplants-indoors-and-overwinter-care)
- [Iowa State Extension: moving houseplants indoors near 50°F](https://yardandgarden.extension.iastate.edu/faq/how-and-when-do-i-bring-my-houseplants-back-indoors-winter)
- [NOAA Solar Calculator and calculation details](https://gml.noaa.gov/grad/solcalc/calcdetails.html)
- [Fenton sunrise and sunset cross-check](https://www.timeanddate.com/sun/%404992612)
- [University of Minnesota Extension: outdoor cactus and succulent acclimation](https://extension.umn.edu/gardening-minnesota/cacti-and-succulents)
- [Detailed calculations and research notes](./vivosun-aw200se.md)
