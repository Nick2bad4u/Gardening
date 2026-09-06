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

Logger deployment as of 2026-09-06: logger 5.18.5 and immutable Apps Script
version 71 are live at the existing stable deployment URL. AppSheet version
**1.100104** is saved, deployed, and verified in authenticated desktop and
390 px mobile browser layouts. The workbook
has P29 and P30 in `Plant tracker`, `Baselines`, `Quick log`, the individual
plant tabs, and `App bulk`. `History` and `History view` now contain 42 physical
columns, A:AP; `App entries` contains 34, A:AH; and `App bulk` contains 54,
A:BB. The production AppSheet schemas were regenerated to 35 and 55 columns,
respectively, including `_RowNumber`; the regenerated 36-field `Baselines`
table exposes 37 columns including `_RowNumber`. Water forms expose
`Flood / soak-through`,
`Thorough`, `Partial`, and `Spot`, with optional measured milliliters. P29 and
P30 Decimal weight fields use the same positive-number validation and Weigh /
Water + weigh visibility rule as P01-P28, while `Selected plants` remains an
EnumList of `Plant tracker` refs. The live image mapping uses cached Gyazo
thumbnails for P19, P20, and P23-P30, and natural label order now runs through
\#6. The current-cycle refresh restored P06's completed Dry and Wet anchors and
curve forecast without changing its observations. The September 5 rollout preserved all
691 canonical `History` data rows, retained the duplicate P20 watering as an
auditable `Removed` record, and left zero duplicate active request/plant/event
keys, blank request IDs, or formula errors.

The September 6 logger update adds live activity summaries and a derived
`Weight measurements` column at `Dashboard!X6:X36`. Dashboard is not an AppSheet
source table, so this addition required no AppSheet schema regeneration. The
rollout preserved all 700 then-current History records, existing entered values,
formulas, and checked validations; the single five-minute queue trigger and
versioned logger executions were verified after deployment.

The current artwork contains 38 exported SVGs, including separate portraits
for the shared P19 and P20 planters. AppSheet now uses thirty P01-P30 portraits
in Plants, reference pickers, and Care history, while preserving the existing
reference and collection photos in plant details. The September 5
[portrait and usability review](../scripts/google-sheets/APPSHEET-REVIEW-2026-09-05.md)
also repairs the Quick Log target, bulk validation for P23-P30, nutrient fields,
receipt editing, compact watering-age badges, current-cycle filtering, and
stale app information.
The quick logger and native AppSheet client have different caching behavior;
see [portrait storage and caching](#portrait-storage-and-caching).

The 5.17.0 forecast update learns completed cycles within each plant's current
pot setup and blends new readings into that history. At rollout, P20, P21, and
P22 qualified for historical estimates before collecting four new weights.
The existing `Baselines` fields now expose the forecast basis and reweigh
window. That forecast-only change did not require schema regeneration; the
later watering-plan fields did, as described below. The hidden `Dry-down models` helper remains
disconnected from AppSheet.

## View map

| View              | Position | Purpose                                                                                                     |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| Plants            | Primary  | Image-first list with watering age, pot label, current weight, height, width, field guide, and care action. |
| History           | Primary  | Four-panel care overview with recent activity, watering age, activity counts, and data-quality flags.       |
| Log               | Primary  | Full event-aware form with plant-name, pot-label, and Plant-ID lookup for every supported care event.       |
| Bulk Log          | Primary  | Fast collection-wide Water, Weigh, combined, Rotation, Check, Clean, Prune, Pest, or Other entry.           |
| Insights          | Primary  | Ten collection-wide chart and forecast panels described below.                                              |
| Watering forecast | Menu     | Dry/wet calibration, recheck windows, conditional water dates, and plant-specific readiness guidance.       |
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
- **Watering forecast** uses a 21-column manual layout limited to identity,
  pounds before grams, current weight, capacity, calibration, trend,
  next-check, conditional water date and guidance, dry/wet anchors, prediction,
  confidence, and data-quality fields.
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

The Image label `Plant portrait` adds the corresponding illustration beside
that text in reference pickers. The per-plant **Quick Log** action targets
`LINKTOFORM("Log", "Plant ID", [Plant ID])`, so it opens the existing Log form
with the selected plant already filled in.

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

The Round action validation checks all thirty weight fields. Weigh requires
at least one positive weight; Water + weigh also requires selected plants.
Other shared care actions require selected plants. The maintained expression
is [`appsheet-bulk-validation.txt`](../scripts/google-sheets/appsheet-bulk-validation.txt).
Bulk nutrient amounts use Text so an amount such as `1 mL/L` retains its units.
The form distinguishes nutrient choice, product, and amount explicitly.

Both staging tables allow adds and updates but prohibit deletes. Their Edit
actions appear only for `Needs correction` rows. Saved or processing receipts
stay available for inspection; an explicit Retry save action preserves the
original request ID after a correction.

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

Plants uses the Image virtual column `Plant portrait` as its square main
image. Care history derives its round left-side `Plant image` through the
`Plant ID` reference (`[Plant ID].[Plant portrait]`). The square 150 px SVG
canvas keeps the whole silhouette inside the thumbnail, including trailing
stems. Use the direct reference
instead of a broad lookup: the latter can accidentally repeat one plant's
image across unrelated history rows. The virtual `Event badge` column adds a
compact event symbol and name such as `💧 Water`, `⚖ Weigh`, `📏 Measure`, or
`📝 Other` without changing the canonical `Event` value.

If a portrait is missing, verify its P01-P30 mapping, the revisioned Drive
folder and filename, and signed-in app access. For a missing reference photo,
verify its external URL and the `Reference image` expression. Do not replace
a missing image with an unrelated taxon merely to fill the thumbnail.

### Portrait storage and caching

The thirty app portraits are private SVG files named `P01.svg` through
`P30.svg` in `GardenPlantPortraits-2e71bf2a701aa61f`, beside the source
workbook in Drive. The
[portrait manifest](../scripts/google-sheets/appsheet-plant-portraits.json)
records their canonical source slugs, and the
[image expression](../scripts/google-sheets/appsheet-plant-portrait.txt)
uses relative paths. Keep image URL signing enabled.

Offline startup and Store content for offline use are enabled. On native
mobile AppSheet, complete an online sync and image download before expecting
offline portraits. AppSheet web browsers do not provide the same offline image
cache, and external reference-photo URLs are not covered by native offline
storage. The desktop network check still observed image requests with
provider-controlled `private, max-age=0` responses; it does not demonstrate
zero-download reloads or phone airplane-mode behavior.
[AppSheet offline behavior](https://support.google.com/appsheet/answer/10107724?hl=en)
and [image paths and caching](https://support.google.com/appsheet/answer/10107317?hl=en)
document these constraints.

For a future artwork release, publish the SVGs and logger revision first,
update the checked-in manifest, upload the mapped P01-P30 SVGs to a new
revisioned folder beside the workbook, and update the AppSheet expression.
Verify all thirty images after saving and syncing. Keep older folders until
existing clients have synced; do not overwrite old paths with new bytes.
This AppSheet step is separate from the logger's persistent Cache Storage.

## Theme and icon conventions

The app uses AppSheet's native dark theme, the garden-green `#43a047` primary
color, colored header/footer treatment, Roboto at 18 px, the
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

For example, a plant at 25 days displays `🔴 25d`; a missing record displays
`⚪ No log`. Full dates and elapsed days remain in plant details. The
[maintained expression](../scripts/google-sheets/appsheet-watering-age.txt)
avoids clipped text and the former `1 days since water` wording. These colors are a
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
AppSheet table. Its original forecast fields did not expand the then-34-column
Baselines contract. The two obsolete
AppSheet predictive models remain removed; there is one reproducible forecast
source.

The **live 5.18.0 extension** appends `Recommended water date` and
`Watering guidance` to Baselines (AI:AJ), increasing its derived schema to 36
fields. Baselines was regenerated and remains read-only. The new fields use
Date and LongText, are optional and non-editable, and appear immediately after
Next dry check in Watering forecast. The separate chart audit expanded the
read-only Insights data helper from 25 to 30 physical columns; its schema was
also regenerated to resolve the resulting app-load mismatch. No canonical
History or staging table was regenerated, and the hidden model helper remains
disconnected from AppSheet. The saved preview loads real records and shows the
new dates as dates, not serial numbers.

The new date is conditional on inspection and follows the learned dry-down
curve; it does not add a fixed four- or six-day drought delay. Money tree and
split rock intentionally use condition-based guidance instead of weight-only
water dates. See the
[watering-planning rules and deployment procedure](../scripts/google-sheets/README.md#conditional-watering-planning-dates-5180)
and the [September 5 workbook audit](../scripts/google-sheets/WORKBOOK-AUDIT-2026-09-05.md)
for the backup, exact History comparison, formula checks, and chart repairs.

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
- **Current-cycle dry-down** plots positive weights at or after the latest
  active Water or Repot timestamp in the current pot setup. It excludes older
  watering cycles and retains observation times for same-day boundaries.

The hidden DateTime `Plant tracker[Current cycle start]` uses
[`appsheet-current-cycle-start.txt`](../scripts/google-sheets/appsheet-current-cycle-start.txt).
The read-only slice uses
[`appsheet-current-cycle-filter.txt`](../scripts/google-sheets/appsheet-current-cycle-filter.txt).
Keep `App plant charts[Date]` typed DateTime. The spreadsheet helper's
`Days after anchor` refers to each historical row's own anchor; a nonblank
value alone does not establish membership in the current cycle.

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
