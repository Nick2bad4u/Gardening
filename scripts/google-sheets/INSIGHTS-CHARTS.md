# Insights dry-down charts

The native **Insights** sheet has 20 charts. Its dry-down explorer starts at
**A226**; choose **P01–P30 in B228** in the current native layout. The selected
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
rate. All 20 Insights charts share Roboto text, 18-point green titles, and
11-point subtitles and axis titles. Each plant has a permanent, distinct color
defined in [`plant-colors.json`](plant-colors.json). The visible **Plant colors**
sheet lists all 30 IDs, full plant names, color names, hex values, swatches, and
links to their individual charts. These are arbitrary identity colors, unrelated
to the appearance of the plants. Keep the names and IDs alongside color because
similar hues can still be difficult to distinguish.

All 90 charts on the individual plant sheets use that plant's color. The 15
plant comparison charts use the same colors for each plant's bars or points, in
consistent P01–P30 order. This fixed order prevents point colors from moving to
another plant when a sorted source recalculates. Source values still update
automatically. Comparisons with several metrics use separate grouped bars, with
the metric order in the subtitle and names in the tooltips; the old metric-color
legends are removed because color now identifies the plant. The two
cycle-explorer charts change to the selected plant's
color automatically. Measured weights use solid lines and circles, dry references
use dotted lines and diamonds, and wet references use dashed lines and squares.
Height and width on individual plant pages use solid/circle and dashed/diamond
styles respectively. The three aggregate charts (care activity, calibration
status, and forecast basis) retain their category colors.

Chart scales and heights remain as configured.
The first chart shares the 1,155-pixel width and 10-pixel left inset used by the
other Insights charts. Individual plant charts retain their existing layout.

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
**Dry-down insights W1:X31**, looking up **Dashboard I7:I36** by permanent plant
ID. Keep that helper in P01–P30 order so its point colors retain their meaning.
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
