# Insights dry-down charts

The native **Insights** sheet has **26 charts** in the September 21 readback.
The prepared enrollment retains those chart IDs and positions while extending
the source roster to **P01–P32, P35, and P36**; production remains at 32 pots
until the [September 21 cutover](README.md#september-21-prepared-lithops-and-split-rock-enrollment)
is verified. Its dry-down explorer starts at
**A226**, with the maintained plant selector in **B228**. The selected
plant's care guidance, predicted dry-check date, and earliest/latest window
appear above the graphs. The selected plant's **Current weight difference (g)**
appears in **N228:R228**, and its collection comparison starts at **A586**.

| View                              | What it helps answer                                                              |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Current cycle: measured weights   | How has this pot's weight changed since its latest Water or Repot?                |
| Current cycle: interval loss      | Is measured loss slowing down, or did the pot gain weight?                        |
| Current weight difference         | How many grams above or below its completed dry reference is each pot now?        |
| Relative water remaining          | Where is the latest weight between the wet and completed-dry references?          |
| Mass lost since wet               | How many grams below its current wet reference is this pot?                       |
| Predicted dry-check timing        | Which supported forecasts have earlier inspection windows?                        |
| Forecast uncertainty              | Which windows are wider and deserve more measurements?                            |
| Drying speed relative to capacity | How quickly is each pot losing its calibrated capacity?                           |
| Model evidence                    | How many current-cycle readings and learned cycles support the model?             |
| Wet-to-dry capacity               | How large is each pot's measured reference difference?                            |
| Weighing freshness                | Which plants have the oldest weight observations?                                 |
| Forecast basis                    | How much of the collection has current-cycle, historical, or incomplete evidence? |

The existing drying-rate chart reads **Baselines AE** and is labeled as a modeled
rate. Charts use **JetBrains Mono**, including title, axis, subtitle, and
data-label overrides. Insights sizing remains intact; the plant-page layout
has its own [guarded styling procedure](#plant-page-chart-layout).
Each plant has a permanent, distinct color
defined in [`plant-colors.json`](plant-colors.json). The visible **Plant colors**
sheet covers the active IDs, full plant names, color names, hex values, swatches, and
links to their individual charts. These are arbitrary identity colors, unrelated
to the appearance of the plants. Keep the names and IDs alongside color because
similar hues can still be difficult to distinguish.

The prepared 34-pot collection has 102 weight/dimension charts and 34
watering-interval chart destinations on individual plant sheets. Populated
charts use that plant's color. The 15
plant comparison charts use the same colors for each plant's bars or points, in
consistent P01–P32, P35, P36 order after enrollment. This fixed order prevents point colors from moving to
another plant when a sorted source recalculates. Source values still update
automatically. Comparisons with several metrics use separate grouped bars, with
the metric order in the subtitle and names in the tooltips; the old metric-color
legends are removed because color now identifies the plant. The two
cycle-explorer charts retain plant identity through the selected primary curve's
color. Measured weights use solid lines and circles, dry references
use neutral dotted lines and diamonds, and wet references use neutral dashed lines and squares.
Height and width on individual plant pages use solid/circle and dashed/diamond
styles respectively. The three aggregate charts (care activity, calibration
status, and forecast basis) retain their category colors.

Insights chart scales and heights remain as configured.
The first chart shares the 1,155-pixel width and 10-pixel left inset used by the
other Insights charts. The plant-page layout below defines its chart spacing
while preserving each plant's data bindings and weight-axis maximum.

## September 21 selector-series capacity

The 34-pot expansion would require 102 series in each three-role selector
chart. A disposable native probe containing 102 populated numeric series
persisted only 99, silently dropping the final plant's three series. The
[Sheets chart API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/charts#BasicChartSpec)
documents no limit override; 99 is the observed behavior of this tested path,
not a published platform guarantee.

The prepared chart builders use **34 plant-colored primary series plus two
shared neutral role series**. Current measured weight/current cycle stays in
the plant's permanent color. Dry/wet references and previous/older cycles keep
their separate dotted/diamond and dashed/square styles, with the role meaning
in each chart's subtitle. The existing chart IDs, layout, axes, and measured
data remain in place; no extra chart or trigger is needed.

The shared role helpers read the same selected-plant source values. Their last
row repeats an existing numeric metric, or zero when none exists, against a
blank domain coordinate. That unplotted sentinel keeps Sheets from deleting a
temporarily empty series when the selector changes. It creates no observation,
baseline, or visible zero measurement. Keep helpers hidden and warning-protected,
and verify the full 36-series specification after native writes and selector
changes, including a new plant with no history.

## September 20 purchased houseplants

Peperomia Bicolor (P33 / #9) and Tricolor oyster plant (P34 / #10) extend the active roster to 32 pots. Their four charts each add empty observation destinations; purchase alone creates no scale readings, waterings, or baselines. P31 and P32 stay archived and reserved. Model rows extend to 2:33 and Dashboard rows to 7:38 while the existing helper layout and chart identities are retained. Both houseplants use manual readiness guidance rather than a cactus dry-out trigger. See the [enrollment record](README.md#september-20-purchased-houseplant-enrollment) for migration verification.

## September 20 withdrawal (historical)

The owner withdrew P31 and P32 from active care while cancellation of their Amazon order is pending. The active chart target returns to 30 pots: **90 weight/dimension charts and 30 watering-interval charts**, with model rows 2:31 and Dashboard rows 7:36. Their five botanical profiles remain archived; no observations are fabricated or deleted. The prior expansion planner retains its original P31/P32 colors independently of the active palette for historical reproducibility, not as authority to reenroll them. Native withdrawal and deployment verification are recorded separately in the logger runbook.

## September 19 roster expansion (historical)

The September 19 enrollment contained 32 tracked containers. The 32-page target has **128 plant charts**: 96 weight/dimension charts and 32 watering-interval charts. `P31` / `#7` represents all four new succulents; `P32` / `#8` is Nanouk. Missing observations remain blank, including the new containers' histories. Earlier dated verification counts below remain evidence for the 30-container workbook at those dates.

The guarded [`inventory-expansion.mjs`](inventory-expansion.mjs) migration extends the maintained inventory and model rows to **2:33**, Dashboard data to **7:38**, comparison helpers, selector validation, and the newly duplicated page/chart bindings. It appends helper columns where necessary so existing chart sources do not move. Derive endpoints from the current roster; do not rerun an old fixed-size chart installer over populated helpers. Native application, calculated readback, and empty-data chart checks passed: the September 19 workbook had 156 charts and retains all 148 prior chart IDs and positions. Logger 5.26.0 / immutable version 93 and the corresponding AppSheet schema, forms, and portrait update are live; see the [logger deployment record](README.md#september-19-inventory-expansion-5260--immutable-version-93).

## Plant-page chart layout

**Applied and verified September 18, 2026.**
The presentation-only planner in
[`plant-chart-layout.mjs`](plant-chart-layout.mjs) applies the owner's reviewed
P01 styling to the four corresponding charts on every current Pxx page. It matches
roles by chart type, title, and exact source bindings, rather than assuming the
native chart-array order represents those roles. Keep each target's domain and
series ranges, identity text, permanent plant color, and axis maxima. Use a
**250 g base minimum for both weight charts**, with higher floors for heavy pots
to make their measured variation readable. Supply the actual minimum across
their plotted R/T weight-helper values before planning. For minima above 250 g,
the floor is `max(250, floor(minimum × 0.8 / 500) × 500)`. A minimum at or below
250 g instead receives 25 g headroom, rounded down to a 50 g step and clamped
at zero. With no numeric weight, use the 250 g base. These adjustments happen when
the planner runs, not automatically when observations arrive. Preserve existing
or automatic maxima. Watering-gap charts retain a zero minimum for the days axis.

The selected floors are **250 g for 25 plants**, **2,500 g for P19**, **1,000 g
for P20/P21**, and **500 g for P22/P29**, applied to both weight charts. Verify
the visible ticks as well as metadata: in native P19 tests, explicit 200 g and
250 g minima still rendered a zero lower tick with an automatic maximum. A
2,500 g minimum visibly rendered a 2,500–5,000 g scale. This is observed coarse
axis rounding; the underlying Google rendering cause was not established.
A fixed 5,500 g maximum also changed the rendered minimum in the copy, but
fixing that upper limit would risk clipping future readings, so retain the
automatic maximum.

Titles use centered, bold italic **18-point JetBrains Mono**; subtitles use
centered, bold italic **12-point JetBrains Mono**. Axis titles use the same
12-point family and emphasis, and the chart borders follow the reviewed P01
weight-history border. Preserve the distinct line/point styles for dimensions
and other series so color is not the only way to distinguish them.
Both weight charts omit crowded per-point value labels while retaining markers
and hover values. Dimension and watering-interval labels remain unchanged.

The spacing contract is explicit:

| Chart role                                     | Anchor cell | Width             | Height |
| ---------------------------------------------- | ----------- | ----------------- | ------ |
| Weight history, calendar time                  | A55         | Visible A:J width | 551 px |
| Weight trend after latest Water / Repot anchor | A75         | Visible A:J width | 454 px |
| Plant dimensions, measurement history          | A92         | Visible A:J width | 469 px |
| Time between waterings                         | A111        | Visible A:J width | 440 px |

The September 18 verified visible A:J span was **1,285 px** on all 30 then-current pages. Each chart reaches
that page edge; the planner sums actual visible column widths instead of using
the earlier fixed 952 px width. Hidden columns do not contribute to that sum.
Anchors, chart heights, and vertical gaps are unchanged by this follow-up.

All anchors have **0 px horizontal offset** and **7 px vertical offset**. Rows
**54:138** use **30 px** heights, except the status row **109**, which uses
**36 px**. A chart's height is measured in pixels independently of its anchor
row. The planner checks that charts do not overlap each other, the A109 status,
or the A139 backlink; history headers at A140 and the A141 spill remain clear.
Do not run sheet-wide row autofit: it changes the geometry underneath these
floating charts. Hidden rows in the chart/history boundary require review.

To apply or rerun the planner:

1. Create a fresh native backup and rehearse on a separate copy. Capture full
   native chart specifications, borders, positions, and worksheet metadata.
   Capture `rowDimensions` for each plant sheet as `{ sheetId, rows }`, with
   zero-based dimension arrays beginning at worksheet row 1 and covering at
   least row 140; include pixel heights and user/filter-hidden flags. Also supply
   `columnDimensions` as `{ sheetId, columns }` arrays beginning at column A and
   covering A:J, with pixel widths and both hidden flags. Supply `weightMinimums`
   as `{ sheetId, minimum }`, using the fresh numeric minimum across both charts'
   plotted R/T helper values, or `null` only when no numeric weight exists. See
   [`types/plant-chart-layout.d.ts`](../../types/plant-chart-layout.d.ts).
2. Build a fresh plan with
   `buildPlantChartLayoutRequests({ metadata, rowDimensions, columnDimensions, weightMinimums })`. Review its
   `requests`, `expectedCharts`, and `preconditions`. The planner rejects
   missing/duplicate roles, unexpected bindings, and invalid or hidden rows.
3. Immediately before writing, capture the native state again and call
   `assertPlantChartLayoutPreconditions(freshSnapshot, plan.preconditions)`.
   Rebuild and review the plan if it rejects drift; do not replay stale requests.
   The preflight comparison remains exact. Plan generation accounts for native
   float-color precision and omitted zero defaults so equivalent readback does
   not create repeat styling writes.
4. Apply the reviewed requests, then compare native charts against
   `expectedCharts` and check the row heights and spacing visually. Confirm
   unchanged source ranges, chart IDs, canonical data, protections, tab order,
   and every nonplant chart. This migration needs no workbook refresh, helper
   formula replacement, Apps Script deployment, or queue-trigger change.

Native empty watering charts can omit their series entirely. The current
pages without intervals must remain empty; do not copy P01's series or fabricate
observations to make them look populated. After a real completed interval
appears, use the existing [interval-style repair](#time-between-waterings) when
needed, retaining the chart's ID and position.

### Plant-page summaries and evidence

[`plant-page-presentation.mjs`](plant-page-presentation.mjs) provides
`buildPlantPagePresentationRequests(snapshot)` and
`assertPlantPagePresentationPreconditions(freshSnapshot, plan.preconditions)`
for the existing **A1:J38** section. Supply fresh native grid cells, merges,
formats, validation, and row/column dimensions using
[`types/plant-page-presentation.d.ts`](../../types/plant-page-presentation.d.ts).
Recheck the captured preconditions immediately before applying its requests.

The formatter adds icon headings and blue watering-history, purple evidence,
and green feeding-history sections. Photo links remain links; condition,
provenance, dates, dose units, unknowns, and full notes remain available. Wrapped
content determines reviewed row heights. Existing formulas, merges, number
formats, links, and validations remain unchanged; no care policy is inferred
from the presentation colors.

Apps Script's `refreshPlantPage_` rebuilds rows **1:13**. It preserves summary
cell styles below them but resets visible column widths and selected summary
row heights. Reapply both scoped planners after a deliberate broad refresh,
using fresh snapshots and verifying the resulting page-edge widths and wrapped
notes. Do not run a workbook refresh to apply these presentation changes, and
do not replay the one-time analytics upgrade.

### September 18 width and summary follow-up

**Applied and verified.** The fresh
[backup](https://docs.google.com/spreadsheets/d/1n6TveZFpKQEKOFxBjASiMcFk1W5erkhLXBkQSwwVPBA/edit)
and separate
[rehearsal copy](https://docs.google.com/spreadsheets/d/138D0Ux_-AlpsYgSpIvgwg6KCHtoua5lXxV1e-x6hpLU/edit)
retain the original and rehearsed presentation. Production applied **1,327
requests**: 120 chart widths, 60 weight-axis specifications, 570 scoped format
updates, 150 static icon labels, and 427 row heights within rows 1:38. The initial
250 g floor retained all readings, whose minimum was 301 g. Native visual
follow-up selected **50 weight charts at 250 g** and **10 heavy-pot weight
charts at higher floors**: P19 at 2,500 g, P20/P21 at 1,000 g, and P22/P29 at
500 g. The **10 heavy-chart updates are applied in production**. Native readback
confirms **50 minima at 250 g, two at 2,500 g, four at 1,000 g, and four at
500 g**. Comparing all 20 charts on the five affected pages found only the
10 intended `LEFT_AXIS.viewWindowMin` changes; the other 10 charts match exactly,
and all remaining fields, including the absent fixed maxima, are preserved.
Rehearsal visual checks confirmed P19 at 2,500 g and P20 at 1,000 g; this does
not claim a separate visual check of all 10 adjusted charts. All **120 charts**
span the **1,285 px** visible page width.

Independent readback passed **955 checks**. The 1,029 observations and their
unique IDs, staging and RO cells, 1,530 plant formulas, chart bindings, all 147
chart IDs, 27 nonplant charts, merges, protections, tab order, and hidden states
were preserved. Chart heights, anchors, axis maxima, and the 49 / 56 / 107 px
gaps are unchanged. Both planners return **zero requests** against the finished
native workbook, and Integrity B5:B12 remains zero.

Native inspection verified the wider weight chart and long/sparse summaries on
the rehearsal copy. The live evidence sections were checked page by page;
original dates, dose units, photo-only distinctions, and full notes remain
readable. The **30 focused tests** (23 chart-layout and seven top-section tests), build/test type checks, scoped ESLint,
Prettier, Remark, and secret checks passed. Apps Script remains **5.25.0 /
immutable version 92**; this presentation migration requires no runtime deploy.
The rollout below records the earlier 952 px layout.

### September 18 layout rollout

The native [backup](https://docs.google.com/spreadsheets/d/1AJ_ZEYGCjFI6QQP57ysd6YZRSIFtvXBVJPpBpeoP91k/edit)
and separate [rehearsal copy](https://docs.google.com/spreadsheets/d/1Iz5_Aah57JW2iHzAqW305Fw7wVPfh-oa8gs4JAZNc9g/edit)
retain the before-change state and the tested presentation. Replanning against
the completed rehearsal returned **zero requests**.

Production applied **362 requests** across the **120 existing chart IDs** on
all **30 plant pages**: **61 row-dimension updates, 120 chart specifications,
62 changed positions, and 119 borders**. No charts were recreated.

Readback found **zero changes** to entered values/formulas, notes, validations,
or cell formats in **History A1:AP1100**, **App entries A1:AH1000**,
**App bulk A1:BB1000**, **RO refills A1:M1000**, and **A1:V145 on all 30 plant
pages**. The intended row heights and floating-chart presentation are separate
from these preserved cell properties.

The **17 focused tests**, applicable type checks, and lint checks passed.
Apps Script remains **5.25.0 / immutable deployment version 92**, without a
runtime deployment for this change. A fresh trigger check found exactly one
five-minute queue trigger with **0% errors**.

Final native readback preserved all **147 workbook chart IDs**, every plant's
source bindings and axis windows, all **27 nonplant charts**, tab order,
protections, and row dimensions outside **54:138**. All 30 pages have **49 / 56 /
107 px** gaps between charts, with the watering status and history navigation
clear. Production replanning returned **zero requests**, and **Integrity B5:B12**
remained zero, including the formula-error count.

Native visual checks covered the weight-history chart on every plant page,
both P01 weight charts, representative dimension charts and their units,
P24–P26's populated watering bars, P28–P30's waiting states, and P01's history
boundary. The full repository link scan encountered HTTP 403 responses on
existing SANBI and Wiley references outside this change; authenticated native
reads verified the new backup and rehearsal links.

## Recent weight comparisons

The recent-weight additions use current-cycle measured readings and actual
elapsed time. **Dashboard Z:AE** shows the five metrics and the curve's
inspection prompt. Daily care is retired; use the daily report for care planning.

| Location      | Comparison                                                      |
| ------------- | --------------------------------------------------------------- |
| Dashboard A41 | Last-interval and last-three-reading loss, in g/day             |
| Insights A635 | Last signed weight change and mean change across three readings |
| Insights A685 | Last-interval and last-three-reading loss, in g/day             |
| Insights A735 | Mean of the latest three scale weights, in grams                |

Negative **change** means weight lost; positive **loss per day** means drying.
The mean of three weights is distinct from the mean of the two changes between
them. The three-reading daily rate divides total loss by total elapsed time,
including unequal intervals. Missing evidence stays blank and numeric zero stays
visible. A heavy pot's larger rate does not establish greater watering urgency.

The helper at **Plant color data DX:EC** looks up permanent IDs in fixed P01–P32
order. Sorting Dashboard therefore preserves the plants' colors. The second
series uses a lighter shade and the legend identifies each metric. Maintain the
four chart specifications with [`recent-weights.mjs`](recent-weights.mjs);
do not replay an older chart migration. See the
[forecast rules](README.md#recent-weights-and-curve-inspection-5220) for the
plateau heuristic and species exceptions.

## Watering history and cycle comparison

The linked index in **Insights A2** jumps to
Watering history, Current cycle, Collection comparisons, and Model evidence.
The two additional charts occupy new space below the existing graphs:

| Location      | Comparison                                             | Interpretation                                                                              |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Insights A790 | Latest versus previous completed watering gap          | Whole calendar-day gaps, permanent P01–P32 order and colors; unavailable values stay blank. |
| Insights A840 | Selected plant's current and last two completed cycles | Actual days after watering against measured whole-pot grams, within the current setup.      |

Both cycle views use the selector at **B228**. The new comparison's selected
plant name and watering-date key are in **A837:R839**. Solid circles identify
the current cycle, dotted diamonds the previous cycle, and dashed squares the
older cycle. Only available cycles appear. Follow the dated key when comparing
curves; their shapes describe recorded weight changes rather than watering
instructions. The comparison reuses the logger's correction and eligibility
rules and preserves actual elapsed time across daylight-saving changes.

Plant pages also show latest, median, shortest, and longest completed watering
gaps with the interval count. One interval is a recorded example, not an
established pattern. A single ruler measurement remains a size baseline;
estimated dimensions do not establish a measured growth rate.

The **Calculated as of** value at **Insights T2** discloses the shared clock's
last calculation. It may be cached during an API read. Keep absolute observation
times and the daily report's evidence review alongside elapsed-age values.
See the [analytics operator guide](WORKBOOK-ANALYTICS.md) for the calendar,
per-plant evidence, formula ownership, and migration checks.

## Reading the graphs

- Dates are inspection/reweighing estimates. The Money tree's upper-soil check
  and the Royal Flush's seasonal guidance still govern their care.
- Relative water remaining is `(latest − dry) / (wet − dry)`. It is a whole-pot
  weight comparison, not a soil-moisture sensor reading. Values below 0% or above
  100% remain visible so questionable references can be reviewed.
- Current weight difference is `latest − dry`, in grams, using the current pot
  setup's completed dry reference. Positive means above that reference; negative
  means below it. The chart retains numeric zero and leaves missing readings or
  references blank. Numeric labels make the small pots' differences readable
  alongside the larger shared planters. This does not rank watering urgency.
- Mass loss is a weight difference, not a measured watering dose. Interval rates
  use the elapsed time between consecutive scale readings; a negative rate means
  the pot gained weight. They are descriptive, not a constant drying forecast.
- Missing calibration and forecasts stay blank. Missing estimates are omitted
  from comparison charts; evidence counts and forecast basis keep those plants
  visible elsewhere. Forecast windows come from the existing dry-down model.
- The cycle explorer includes positive numeric Weigh records from the current
  pot setup after the latest Water/Repot anchor. Removed entries, estimates,
  numeric-looking text, and other event types are excluded. Equal timestamps can
  display separate readings but never produce a divide-by-zero interval rate.

## Source and maintenance

### Time between waterings

Every current plant page (**P01–P32** in the maintained roster) has a fourth chart, **Time between waterings**, at
**A111**, with its calculation status at **A109**. Each column is a completed
gap between two recorded watering dates. Its height and label show whole
calendar days; the date underneath is the later watering. For example,
P01's July 31 → August 26 and August 26 → September 14 gaps are **26 days** and
**19 days**.

The chart recalculates from **History** automatically. It excludes Removed
records, non-Water events, and missing/non-numeric dates; combines multiple
Water entries on the same calendar date; and sorts dates before subtracting.
Calendar dates follow the workbook's **America/New_York** time zone. All pot
setups and watering applications are included, so a partial watering counts as
a watering date. These bars describe recorded care, not a watering schedule.

The first recorded date has no preceding interval. With fewer than two dates,
the chart has no bars and the status says it is waiting for a second watering
date. Once intervals exist, A109 also shows the latest completed gap in days.
The unfinished gap since the latest watering stays in the existing
**E6 Days since water** header. It is not a completed chart interval.

[`watering-intervals.mjs`](watering-intervals.mjs) builds a separate additive
migration. Its **Watering intervals** helper (`sheetId` **907202605**) contains
three columns per permanent plant ID in P01–P32 order: previous date, later
date, and days between. It is hidden, warning-protected, and not an AppSheet
table. Formulas cover **History rows 2–5000**. The migration checks the source
headers, history capacity, plant roster, existing three-chart layout, and empty
**A108:K132** destination. It refuses to reinstall an existing helper.

Call `buildWateringIntervalRequests(snapshot)` with the snapshot shape below,
including full native chart metadata, History headers, and all destination
cells. Apply `helperRequests`, verify the calculated intervals and status
labels, then apply `chartRequests`. Preserve existing charts and their colors;
the additions use `plant-colors.json`. No logger version change, Apps Script
deployment, or AppSheet regeneration is needed. Do not run the broad page
refresh to install these charts. The current page builder preserves the
summary/status area, but a full refresh still rebuilds other presentation.

Google Sheets omits series styling when a chart has no numeric observations.
Its range binding survives: a copy-only second-watering test confirmed that
the bar appears automatically. An initially empty chart may use the workbook's
default bar color and omit the bar-top label until its planned specification
is reapplied with `updateChartSpec` after its first interval exists. A109 still
shows the exact latest gap automatically. Do not seed fake observations or
add a trigger just to force an empty chart's cosmetic settings.

`buildWateringIntervalStyleRepairRequests(snapshot, plantIds, options)` provides a guarded
repair for existing populated charts. It verifies their IDs, anchors, bindings,
and real interval evidence supplied in `options.completedIntervalsByPlant`
before restoring the plant color, data labels, and
numeric axis settings. Preserve the chart IDs and positions. P24–P26 are the
repaired production charts in the September 17 analytics upgrade. Their IDs
and positions are unchanged; see the
[production record](WORKBOOK-ANALYTICS.md#production-verification).

### Shared migration workflow

[`insights-charts.mjs`](insights-charts.mjs) builds native Sheets batch requests
without credentials or network access. `buildInsightsRequests(snapshot)` accepts
the workbook snapshot shape documented by `test/workbook-fixtures.d.ts`: native
sheet metadata plus zero-based `{ sheet, row, column, value }` entered cells.
Supply fresh metadata, source headers, and the Baselines plant roster. The
planner rejects changed headers, a changed collection, a changed append position,
and replay against an existing **Dry-down insights** sheet.

Apply the requests in two stages: prepare the helper and layout first, then
read back the calculated helper before applying the `addChart` requests. Sheets
can discard series formatting when a chart is created before its formula sources
finish calculating. Verify the resulting series colors, line styles, and labels;
if needed, reapply the planned specification to the returned chart ID with
`updateChartSpec` after calculation. Do not replay the migration to repair styles.

This is a reviewed migration, not a logger installer. It appends chart space,
adds the hidden **Dry-down insights** helper, and repairs the existing rate chart
in place. Its formulas reference **History**, **Baselines**, and **Dry-down
models**; those sources remain untouched. The new helper is protected with an
editing warning and is not an AppSheet table. No schema regeneration or Apps
Script deployment is required. The bounded history limit remains 5,000 rows.

Before any later change, follow [the live workbook runbook](README.md): create a
native Drive backup, re-read the current source and destination, and rehearse on
a native copy. Preserve complete existing chart specifications when updating a
chart. Google's [native chart API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/charts)
documents the source ranges, scatter-line styles, and hidden-data behavior used
here. Charts intentionally use `SHOW_ALL` so the hidden helper remains usable.

Run the migration regression tests with:

```sh
npx vitest run --project=unit test/google-sheets/insights-charts.test.mjs test/google-sheets/plant-chart-colors.test.mjs test/google-sheets/weight-difference.test.mjs
npm run typecheck
npm run lint
```

The current-weight comparison is maintained separately in
[`weight-difference.mjs`](weight-difference.mjs). Its helper uses
**Dry-down insights W1:X33**, looking up **Dashboard I7:I38** by permanent plant
ID after the roster expansion. Keep that helper in P01–P32 order so its point colors retain their meaning.
The same migration adds the Dashboard column and formats the plant headers;
follow its [workbook runbook](README.md#current-weight-difference-and-plant-headers)
instead of replaying the original Insights or color migrations.

The September 7 rehearsal checked every helper formula for native calculation
errors, compared P01's nine plotted readings with History, and exercised P09,
P21, and P29 through the selector. Temporary observations in the rehearsal copy
tested removed/estimated/old-setup rows, numeric text, other events, weight gains,
and duplicate timestamps. The temporary rows were cleared after verification.
Production observations were never used for synthetic tests. The native backup
is named **Garden Plant Tracker — before Insights charts — 2026-09-07**.

The production readback preserved all 726 observations and their 726 unique
Observation IDs. The 659 distinct Request IDs and their event-row grouping were
unchanged. All new helper formulas calculated without errors, and the other 97
existing chart specifications and positions matched the pre-migration snapshot.

## Maintaining plant colors

[`plant-chart-colors.mjs`](plant-chart-colors.mjs) provides the separate color
migration: `buildPlantColorKeyRequests(snapshot)` creates the visible key and
recolors the 90 plant-page charts; `buildPlantInsightColorRequests(snapshot)`
creates the hidden **Plant color data** helper and updates 16 Insights charts.
Supply native chart specifications, the Plant tracker ID/name roster, and the
Insights selector label. Both planners reject replay into an existing color
sheet. They leave canonical observations and source metric formulas untouched.

Prepare both new sheets and their formulas before applying the 106
`updateChartSpec` requests. Read calculated values back before updating charts.
The comparison helper looks up metrics by permanent ID and keeps missing values
blank while preserving numeric zero. Selected-cycle helpers expose data only in
the chosen plant's series. A final numeric sentinel with a blank x-coordinate
keeps Sheets from deleting inactive series. It repeats an existing metric value
so it does not extend the measured range, and has no plotted coordinate. This
retains 90 weight/reference series and 30 interval-loss series across selector
changes without adding an edit trigger or deploying Apps Script.

The helper is protected with an editing warning and is not an AppSheet table.
Do not sort its comparison blocks: native point overrides are indexed by row.
To change a color later, update the JSON palette and the matching native key,
point overrides, plant-page series, selector series, and selector-cell rule
together; editing only a swatch does not recolor charts. Rehearse on a native
copy and preserve complete chart specifications and positions on every update.

The September 7 color rehearsal compared all 690 comparison values with their
source metrics by plant ID, including 58 missing values, and exercised the P01,
P17, and P02 cycle selections. The native backup is named **Garden Plant Tracker
— before plant chart colors — 2026-09-07**.

Production readback verified all 900 series and point-color assignments, all
109 original chart IDs and positions, and the retained 90/30 selector series.
The new formulas calculated without errors. History, Plant tracker, Baselines,
Dashboard formulas, dry-down models, and AppSheet staging values and validations
matched the immediately preceding snapshot exactly. The logger deployment was
unchanged.
