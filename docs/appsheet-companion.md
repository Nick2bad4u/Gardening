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

## View map

| View            | Purpose                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Garden          | Home dashboard combining the plant list with recent care history.                                           |
| Bulk care       | Fast collection-wide Water, Weigh, combined, Rotation, Check, Clean, Prune, Pest, or Other entry.           |
| Detailed log    | Full event-aware form with plant-name, pot-label, and Plant-ID lookup for every supported care event.       |
| Plants          | Image-first list with watering age, pot label, current weight, height, width, field guide, and care action. |
| Insights        | Eight collection-wide charts described below.                                                               |
| Baselines       | Current dry/wet calibration and drying-rate reference values.                                               |
| Bulk rounds     | Submitted bulk-round rows and their save receipts.                                                          |
| Care history    | Read-only active history with plant thumbnails, event badges, and observation times.                        |
| Needs attention | Staged entries that need correction or an explicit retry.                                                   |
| Plant charts    | Interactive plant picker with measurement history, full weight history, and the current dry-down cycle.     |

Baselines, Bulk rounds, Care history, Needs attention, and Plant charts use
distinct navigation icons. On a desktop they appear in the left rail; on a
phone they are available from the menu while the five primary views stay in
the bottom bar.

## Plant lookup and compact metrics

The Detailed log form's plant reference uses the `Plant tracker` virtual
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

## Wet weights, nutrients, and rotation

`Wet` is a weight-state label, not a Water event. Detailed log accepts a Wet
weight without Water and without nutrient fields. Choose Water explicitly only
when the same observation should also create a Water row; event ordering keeps
the post-watering Weigh row before its Water row in History.

Rotation is available in Detailed log and Bulk care. It accepts 1–360 degrees
and defaults to 90. The degree value is archived in `History!AN:AN`, displayed
in read-only care history, and remains available to the public plant history.
Clean and Prune are lightweight dated actions whose specifics belong in Notes.
Bulk care uses one `Selected plants` field for every supported shared action;
per-plant weights remain in the dedicated P01-P22 fields.

## Images and visual identity

The app icon and launch artwork are the repository-owned
[`garden-plant-tracker-icon-v2.png`](../assets/appsheet/garden-plant-tracker-icon-v2.png)
and
[`garden-plant-tracker-launch-v2.png`](../assets/appsheet/garden-plant-tracker-launch-v2.png).
The live app loads their public raw GitHub URLs so AppSheet can render them
without a Drive permission prompt.

The `Plant tracker` virtual `Reference image` column maps P01-P22 to public
repository images. Most are licensed species-reference images from
[`assets/plants/`](../assets/plants/); they illustrate the working
identification but are not evidence that a collection plant is that exact
taxon or cultivar. P19 and P20 use the corresponding collection photos from
[`assets/collection-photos/`](../assets/collection-photos/). Preserve source,
creator, license, and attribution metadata when changing a reference image.

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
not duplicate the Insights icon.

AppSheet does not expose a supported arbitrary CSS or custom Nerd Font
stylesheet injection surface. Keep future polish inside the native theme,
view, format-rule, and icon controls. Font Awesome icons are appropriate for
navigation and actions; Unicode symbols are used in computed row text and key
Detailed log labels where AppSheet cannot render a custom icon component. The
current semantic set includes `💧` for water, `⚖` for weight, `📏` for
measurement, `↕` for height, `↔` for width, `📷` for photos, `🐛` for pests,
and `🪴` for repotting or pot details.

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

The Insights dashboard carries all eight charts from the workbook's Insights
surface:

1. **Watering recency** — days since water by plant.
2. **Latest dimensions** — latest measured height and width in inches.
3. **Recent drying rate** — the recent moisture-loss rate from Baselines.
4. **Plant shape map** — latest width versus height in inches.
5. **Care activity timeline** — Measure, Water, and Weigh activity by date.
6. **Calibration status** — the collection's calibration-status distribution.
7. **Tracking coverage** — Water, Measure, and active-history coverage by
   plant.
8. **Data-quality follow-ups** — calibration, remeasurement, and anomaly flags
   by plant.

Desktop layout shows the charts in a compact grid. Mobile layout uses tabs so
one chart remains readable at a time.

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
AppSheet equivalent of the three charts on each P01-P22 workbook page; they
reuse canonical History fields rather than connecting 22 editable plant-page
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
