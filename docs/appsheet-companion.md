# AppSheet garden companion

The [Garden Plant Tracker AppSheet app](https://www.appsheet.com/start/de6fc182-d01e-427b-b46e-a031d7bc4588)
is the signed-in, phone-friendly companion to the canonical Google Sheets
workbook. It supports daily browsing, individual observations, collection-wide
care/weight rounds, save receipts, dashboards, and per-plant charts without
creating a second gardening database.

The owner-only
[AppSheet editor](https://www.appsheet.com/template/AppDef?appName=GardenPlantTracker-903231205-26-08-25&appId=de6fc182-d01e-427b-b46e-a031d7bc4588&quickStart=False)
contains the live view, expression, action, formatting, and security
configuration. AppSheet saves editor changes to the production app; treat an
editor save as a live application change.

## Data ownership and save path

`History` remains the canonical observation ledger. AppSheet never adds,
updates, or deletes `History` rows directly.

- `App entries` is the writable staging table for a detailed observation.
- `App bulk` is the writable staging table for a collection-wide Water, Weigh,
  Water + weigh, Rotation, Check, Clean, Prune, Pest, or Other round.
- The bound Apps Script queue trigger validates staged rows and sends them
  through the same idempotent batch writer used by the mobile logger.
- `Plant tracker`, `Baselines`, `History`, the chart helpers, and their slices
  are read-only in AppSheet.
- `Saved`, `Needs correction`, and `Retry` receipts are written back to the
  staging row. A retry keeps its original request ID.

The bridge contract and trigger details live in
[`scripts/google-sheets/README.md`](../scripts/google-sheets/README.md#appsheet-companion-intake).

Logger deployment as of 2026-09-04: logger 5.17.1 and immutable Apps Script
version 63 are live at the existing stable deployment URL. The AppSheet schema
and UX baseline below was verified during the earlier 5.17.0 rollout. The workbook
has P29 and P30 in `Plant tracker`, `Baselines`, `Quick log`, the individual
plant tabs, and `App bulk`. `History` and `History view` now contain 42 physical
columns, A:AP; `App entries` contains 34, A:AH; and `App bulk` contains 54,
A:BB. The production AppSheet schemas were regenerated to 35 and 55 columns,
respectively, including `_RowNumber`; the regenerated 34-field `Baselines`
table exposes 35 columns including `_RowNumber`. Water forms expose
`Flood / soak-through`,
`Thorough`, `Partial`, and `Spot`, with optional measured milliliters. P29 and
P30 Decimal weight fields use the same positive-number validation and Weigh /
Water + weigh visibility rule as P01-P28, while `Selected plants` remains an
EnumList of `Plant tracker` refs. The live image mapping uses cached Gyazo
thumbnails for P19, P20, and P23-P30, and natural label order now runs through
#6. The current-cycle refresh restored P06's completed Dry and Wet anchors and
curve forecast without changing its observations. The rollout preserved all
661 canonical `History` data rows, retained the duplicate P20 watering as an
auditable `Removed` record, and left zero duplicate active request/plant/event
keys, blank request IDs, or formula errors.

The 5.17.1 release publishes the reviewed field-guide portraits and adds
persistent portrait caching to the separate quick logger. Its 36 public SVGs
were checked against the committed artwork. The AppSheet image mapping,
navigation, and offline/sync settings have not yet been changed by that release:
the editor is awaiting an authenticated browser session. Do not treat the quick
logger's cache verification as proof of AppSheet image caching.

The 5.17.0 forecast update learns completed cycles within each plant's current
pot setup and blends new readings into that history. At rollout, P20, P21, and
P22 qualified for historical estimates before collecting four new weights.
The existing `Baselines` fields now expose the forecast basis and reweigh
window. Sync AppSheet to refresh those values; no editor save or table
regeneration is required. The new hidden `Dry-down models` helper remains
disconnected from AppSheet.

## View map

| View              | Position | Purpose                                                                                                     |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| Plants            | Primary  | Image-first list with watering age, pot label, current weight, height, width, field guide, and care action. |
| History           | Primary  | Four-panel care overview with recent activity, watering age, activity counts, and data-quality flags.       |
| Log               | Primary  | Full event-aware form with plant-name, pot-label, and Plant-ID lookup for every supported care event.       |
| Bulk Log          | Primary  | Fast collection-wide Water, Weigh, combined, Rotation, Check, Clean, Prune, Pest, or Other entry.           |
| Insights          | Primary  | Ten collection-wide chart and forecast panels described below.                                              |
| Watering forecast | Menu     | Current dry/wet calibration, current weight, next-check, and deterministic dry-date forecasts.              |
| Bulk rounds       | Menu     | Submitted bulk-round rows and their save receipts.                                                          |
| Care history      | Menu     | Read-only active history with plant thumbnails, event badges, and observation times.                        |
| Needs attention   | Menu     | Staged entries that need correction or an explicit retry, including the exact status message.               |
| Plant charts      | Menu     | Interactive plant picker with measurement history, full weight history, and the current dry-down cycle.     |

All ten user-facing views use distinct navigation icons. On a desktop they
appear in the left rail; on a phone the five primary views stay immediately
available while the five supporting views remain in the navigation menu.

### Production UX layout

The production view configuration was refreshed on 2026-09-04 after creating
the native Drive backup `Garden Plant Tracker — pre-5.16 automatic weight
forecast backup — 2026-09-04`. The view choices are deliberate:

- **Plants** sorts by `Natural label order`, uses `Plant metrics` as its
  secondary line, and keeps `Watering age` visible at the right edge. This puts
  A1-A3 before B1-B3 and leaves numbered labels #1-#6 at the end.
- **History** is a balanced two-by-two desktop dashboard containing Care
  history, Watering recency, Care activity timeline, and Data-quality
  follow-ups. Mobile tabs remain enabled. Interactive mode is disabled so a
  care-history row still opens its detail instead of being intercepted as a
  dashboard filter.
- **Insights** contains exactly ten useful panels: eight established collection
  charts, the actionable Watering forecast table, and the three-series Weight
  range chart. Mobile tabs remain enabled so a narrow screen shows one readable
  panel at a time.
- **Plant charts** contains Plants first, then measurement history, weight
  history, and current-cycle dry-down. Interactive mode is enabled: selecting
  one plant filters all three chart panels without leaving the dashboard.
- **Watering forecast** uses a 19-column manual layout limited to identity,
  pounds before grams, current weight, capacity, calibration, trend,
  next-check, dry/wet anchors, prediction, confidence, and data-quality fields.
  It sorts by the hidden `Forecast sort date` helper so real and overdue
  predictions appear before plants that still need more evidence; the helper
  itself is not displayed.
- **Bulk rounds** sorts newest first and uses a manual round-level layout. The
  thirty P01-P30 weight-entry columns remain available in Bulk Log but are
  intentionally absent from the submitted-round table.
- **Care history** uses the emoji-backed `Event badge` summary. **Needs
  attention** puts the actionable `Status message` directly on each row.
- **Log** and **Bulk Log** use simple, manually ordered forms with Save and
  Cancel at the top. Bulk Log omits receipt-only Status message, Request count,
  Saved count, and Saved at fields from data entry; those fields remain visible
  in Bulk rounds.

## Plant lookup and compact metrics

The Log form's plant reference uses the `Plant tracker` virtual
`Plant lookup` label. It combines the plant name, current physical pot label,
and stable Plant ID, for example `Variegated moon cactus · A1 · P01`. AppSheet
reference pickers search the referenced row label, so this composite label is
what makes all three identifiers usable in the same picker. Keep the Plant ID
as the key; changing the label is presentation-only and must not change bridge
payloads.

The Plants deck uses the virtual `Plant metrics` secondary line. It shows the
physical pot label plus the latest available weight in grams and measured
height and width in inches, with compact semantic symbols:

```text
A1  •  ⚖ 350 g  •  ↕ 1.3 in  •  ↔ 2 in
```

Blank values display as an em dash rather than a fabricated zero. The existing
`Watering age` badge remains the top-right summary, so urgency and the latest
physical measurements can be scanned together without opening the detail
view.

## Inferred weight states, nutrients, and rotation

AppSheet no longer asks the user to choose Dry, Wet, or Routine. Choose Water
explicitly only when the observation should also create a Water row; event
ordering keeps the same-save Weigh row before its Water row in History. New
weights remain `Routine` in the append-only ledger. Current-cycle analytics use
the latest Water, treat its same-save weight—or otherwise the first positive
weight within five days—as Wet, and use the completed Dry reading immediately
before that Water as the dry anchor. Per-plant history displays the canonical
stored state, so refreshing formulas never relabels old observations.

Rotation is available in Log and Bulk Log. It accepts 1–360 degrees
and defaults to 90. The degree value is archived in `History!AN:AN`, displayed
in read-only care history, and remains available to the public plant history.
Clean and Prune are lightweight dated actions whose specifics belong in Notes.
Bulk Log uses one `Selected plants` field for every supported shared action;
per-plant weights remain in the dedicated P01-P30 fields. `Selected plants` is
an EnumList of refs with `Valid_If` set to `SORT(Plant tracker[Plant ID])`; if
that expression is removed, the deployed picker can appear empty even while
the source table contains plants.

## Images and visual identity

The app icon and launch artwork are the repository-owned
[`garden-plant-tracker-icon-v2.png`](../assets/appsheet/garden-plant-tracker-icon-v2.png)
and
[`garden-plant-tracker-launch-v2.png`](../assets/appsheet/garden-plant-tracker-launch-v2.png).
The live app loads their public raw GitHub URLs so AppSheet can render them
without a Drive permission prompt.

The `Plant tracker` virtual `Reference image` column maps P01-P30 to public
repository images. Most are licensed species-reference images from
[`assets/plants/`](../assets/plants/); they illustrate the working
identification but are not evidence that a collection plant is that exact
taxon or cultivar. P19, P20, and P23-P30 use corresponding source-quality Gyazo
collection photos through cached 960 px thumbnails. Preserve the direct capture,
Collection, caption, and ownership metadata when changing one of those images.
Nursery-label previews cover P23-P30 from the retained, metadata-stripped
repository evidence; the labels document seller claims rather than proving an
identification.

The Plants view sorts by the hidden virtual Number column
`Natural label order`, not by `Plant ID`. Its explicit mapping keeps labels in
the physical sequence A1-A3 through H1-H3, followed by the numbered plant and
shared-planter labels #1-#6. The `#` group always sorts after every lettered
label.
Canonical IDs and writable picker values remain P01-P30; do not replace them
with the display-order helper.

Care history derives its round left-side `Plant image` through the `Plant ID`
reference (`[Plant ID].[Reference image]`). Round thumbnails intentionally
crop every source to a uniform 70 px viewport; AppSheet's square deck mode can
clip tall portrait sources behind neighboring rows. Use the direct reference
instead of a broad lookup: the latter can accidentally repeat one plant's
image across unrelated history rows. The virtual `Event badge` column adds a
compact event symbol and name such as `💧 Water`, `⚖ Weigh`, `📏 Measure`, or
`📝 Other` without changing the canonical `Event` value.

If an image is missing in AppSheet, verify that its repository path exists,
that the raw GitHub URL returns the image itself, and that the `Reference
image` expression maps the correct Plant ID. Do not replace a missing image
with an unrelated taxon merely to fill the thumbnail.

## Theme and icon conventions

The app uses AppSheet's native dark theme, the garden-green `#43a047` primary
color, colored header/footer treatment, Source Sans Pro at 16 px, the
repository-owned logo and launch artwork, and distinct Font Awesome icons for
every primary and menu view. Plant charts uses an area-chart icon so it does
not duplicate the Insights icon. The twelve reference charts also use distinct
icons: traffic light, calendar, water drop, clipboard check, combined ruler,
ruler, shapes, hanging weight, speedometer, tasks, stopwatch, and a compact
range-series mark.

AppSheet does not expose a supported arbitrary CSS or custom Nerd Font
stylesheet injection surface. Keep future polish inside the native theme,
view, format-rule, and icon controls. Font Awesome icons are appropriate for
navigation and actions; Unicode symbols are used in computed row text and key
Log labels where AppSheet cannot render a custom icon component. The
current semantic set includes `💧` for water, `⚖` for weight, `📏` for
measurement, `↕` for height, `↔` for width, `📷` for photos, `🐛` for pests,
`🪴` for repotting or pot details, `↻` for rotation, `🧽` for cleaning, and
`✂` for pruning.

## Watering-age badges

The Plants deck uses a compact virtual `Watering age` badge so the state stays
visible on both desktop and narrow phone layouts:

- green: 0-7 days since water;
- amber: 8-14 days since water;
- red: 15 or more days since water;
- neutral: no usable watering record.

For example, a plant at 25 days displays a red badge. These colors are a
scanning aid, not a watering schedule: pot weight, dry-down trend, plant
condition, pot setup, and the species-specific notes still determine whether
watering is appropriate.

## Collection Insights

The Insights dashboard carries ten collection-wide panels in this production
order:

1. **Watering recency** — days since water by plant.
2. **Recent drying rate** — the recent moisture-loss rate from Baselines.
3. **Tracking coverage** — Water, Measure, and active-history coverage by
   plant.
4. **Latest dimensions** — latest measured height and width in inches.
5. **Plant shape map** — latest width versus height in inches.
6. **Care activity timeline** — Measure, Water, and Weigh activity by date.
7. **Calibration status** — the collection's calibration-status distribution.
8. **Data-quality follow-ups** — calibration, remeasurement, and anomaly flags
   by plant.
9. **Watering forecast** — latest pounds and grams, current-setup dry/wet
   anchors, drying rate, predicted dry date, confidence, and next action.
10. **Weight range** — latest, inferred-dry, and inferred-wet gram weights for
    each plant on one comparable chart.

Desktop layout shows the panels in a compact grid. Mobile layout uses tabs so
one chart or table remains readable at a time.

Chart ordering and colors encode meaning rather than relying on AppSheet's
defaults. Watering recency and recent loss are sorted from highest to lowest;
collection-by-plant charts follow `Natural label order`; the activity and
per-plant time series run oldest to newest; and follow-ups sort calibration,
remeasurement, and anomaly flags ahead of Plant ID. Water is blue,
measurements are green/cyan or purple where a third series is required,
weights and drying are orange, and anomalies are red. Calibration keeps the
native multi-slice palette so its categories remain distinguishable.

Dry-date prediction is deterministic rather than an AppSheet predictive model.
Logger 5.17.0 learns from up to five reliable completed cycles of the same plant
and pot setup. A fresh Wet anchor can produce a **Historical estimate**, which
new readings gradually update. Four eligible current readings across three
days and a log-linear R² of at least 0.60 support the current curve; six allow
it to take over. Repots reset learning, and partial/spot watering does not receive
a full-cycle forecast. **Next dry check** shows a planning window, while
**Forecast confidence** names its basis and learned-cycle count. These remain
reweigh prompts, not watering deadlines or statistical confidence intervals.
See the [dry-down learning rules](../scripts/google-sheets/README.md#dry-down-learning)
for exclusions, recency weighting, uncertainty, and alert thresholds.

The hidden `Dry-down models` sheet is a read-only calculation helper, not an
AppSheet table. It feeds the existing 34-column Baselines contract, so no table
regeneration or predictive model is needed for this upgrade. The two obsolete
AppSheet predictive models remain removed; there is one reproducible forecast
source.

The following hidden workbook sheets are presentation helpers, not canonical
datasets:

| Helper                    | AppSheet use                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `Insights data`           | Existing formula-driven source behind the workbook Insights charts.                    |
| `App insight activity`    | Date-labeled Measure/Water/Weigh timeline rows.                                        |
| `App insight calibration` | Calibration labels and plant counts.                                                   |
| `App insight followups`   | Plant-labeled data-quality flags.                                                      |
| `App plant charts`        | Active History dates, plant references, weights, dimensions, and current-cycle values. |

The four `App ...` sheets contain only formulas pointing to `Insights data` or
`History`. Keep them hidden in Sheets and read-only in AppSheet. The separate
helpers are intentional: AppSheet charts use a table's row label for their
category axis, while the activity, calibration, follow-up, and per-plant
charts require different labels.

## Per-plant charts

Each Plant detail has three chart buttons: **Weight**, **Size**, and
**Dry-down**. Each button opens the corresponding chart already filtered to
that plant through the permanent `Plant ID` reference:

- **Plant measurement history** plots nonzero height and width measurements in
  inches.
- **Plant weight history** plots every positive recorded weight in grams.
- **Current-cycle dry-down** plots positive weights that have a valid latest
  Water or Repot anchor.

Use **Plant charts** as the collection-wide exploratory dashboard. Select a
plant in its left/top Plants pane to filter all three charts together.

The corresponding read-only slices filter blank values before charting so
missing measurements or weights do not appear as zero. The charts are the
AppSheet equivalent of the three charts on each P01-P30 workbook page; they
reuse canonical History fields rather than connecting 30 editable plant-page
tables.

## Sync and recovery

- Use AppSheet's sync button after a workbook-side correction or when a new
  image, receipt, baseline, or chart point has not appeared yet.
- Detailed and bulk entries may remain queued until the five-minute bridge
  trigger processes them. The receipt, not disappearance from the staging
  table, confirms the result.
- A `Needs correction` row stays editable. Correct it, then use **Retry save**;
  do not recreate the observation with a new ID.
- The app can start offline and retain a staged field note, but derived
  dashboards and remote images require a successful sync to refresh.
- If all charts are blank, first confirm the signed-in account can open the
  workbook, then inspect the helper formulas and the AppSheet table/slice
  read-only configuration.

## Maintenance checklist

Before a material AppSheet or workbook presentation change:

1. Create a native Drive backup of the workbook.
2. Capture the canonical `History`, `Plant tracker`, and `Baselines` values and
   formulas that the change must preserve.
3. Keep staging tables writable and every canonical or chart-helper table
   read-only.
4. Test a repeated structure on one representative plant or one helper before
   applying it broadly.
5. Sync and inspect desktop and phone layouts in light and dark modes.
6. Verify images, chart labels, empty-value behavior, navigation icons, and the
   `Needs correction` recovery path.
7. Recheck canonical row counts, formulas, and request-ID uniqueness after the
   visual change.

When adding a plant to the tracker, update the app's `Reference image` mapping,
the field-guide link, the applicable chart helpers, and the image provenance
record together. Do not expose credentials, precise home-location data, or a
public unrestricted app audience.
