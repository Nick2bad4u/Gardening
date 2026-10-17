# Sensor CSV imports and hourly history

The maintained parser recognizes AeroLab's seven-column, one-minute CSV export.
It keeps one reading per sensor timestamp with the built-in and probe temperature,
relative humidity, and VPD values. Original temperature values and units remain
available alongside normalized Celsius values. Missing values stay missing;
zero is a recorded value.

The working destination is a separate **Garden Sensor History** spreadsheet.
It stores hourly summaries; original minute-resolution exports stay in a private
Drive archive. The Garden Plant Tracker, Quick Logger, AppSheet staging tables,
and plant `History` ledger are separate from this import path.

The maintained Node commands are **local, read-only preparation tools**. They do
not write Google Sheets, archive files, or provide a Quick Logger upload screen.
An operator performs and verifies the explicit archive and workbook updates.

## Live destination and first import

Verified on **2026-10-17 UTC**:

- [Garden Sensor History](https://docs.google.com/spreadsheets/d/18byqIn8bmSFBEumT80O58HehLsX0_03lpiUJuXOrwjs/edit)
  is a native Google Sheet in My Drive / ChatGPT, private to the owner.
- [Garden Sensor Exports](https://drive.google.com/drive/folders/1fQnT05gHOeAe_bN7gClumYH0nxDs17OV)
  is the private original-file archive. The `aerolab-01` subfolder holds the
  initial export unchanged.
- The owner identified the device as the VIVOSUN **TH1GS main-body sensor** and
  confirmed Eastern time. `TH1GS` remains the owner-provided model label;
  `aerolab-01` is its permanent import ID. Its timezone is `America/New_York`.
- The exported `Built-in` channel represents that main-body sensor. The `Probe`
  channel is retained independently with **placement unassigned**. Do not label
  it as soil, canopy, or an A22 probe without further evidence. Future A22
  exports need their own physical-device identity and format inspection.

| First import evidence                             | Result                                   |
| ------------------------------------------------- | ---------------------------------------- |
| Source file                                       | `AeroLab Sensor_export_202610162257.csv` |
| Populated minute timestamps                       | 60,390                                   |
| All-measurement-empty rows skipped                | 8,731                                    |
| Hourly rows                                       | 1,017                                    |
| Hours with 60 timestamps / partial hours          | 410 / 607                                |
| First / last populated observation, Eastern       | 2026-08-22 14:07 / 2026-10-16 22:56      |
| Duplicate or conflicting keys in the initial file | 0                                        |

The source SHA-256 is
`2ef9a248a5b504f6b6e3baadf9a3db4ed36464b19302fc6639cc5fa494f267d6`.
Downloading the archived file reproduced that digest. A full-file replay retained
the same 1,017 hourly rows and identified 60,390 duplicate readings.

The workbook contains `Overview`, `Hourly history`, and `Sensors & imports`, plus
a hidden `Chart data` helper. The overview includes the latest recorded hour and
separate temperature, humidity, and VPD charts for the latest seven-day window.
Hourly history includes mean, minimum, maximum, and nonmissing count for each
metric in each channel. The import log records the source URL, digest, device,
timezone, row counts, and date. No minute rows were added to the care workbook.

All 1,017 native hourly rows and 27,459 metric/timestamp values were compared with
the prepared output after conversion. The initial XLSX conversion omitted
Date-object cells; the three UTC timestamp columns and import date were restored
from verified numeric date serials before the comparison passed. Native chart
headers and fonts were also restored after conversion. Future conversions need
their own value, formula, table, and rendered-chart verification.

## Preview an export

Run from the repository root, using the physical sensor's permanent ID and the
timezone actually used by its export:

```powershell
node scripts/preview-sensor-import.mjs --csv "new-export.csv" --sensor-id "sensor-01" --time-zone "America/New_York"
```

Compare an overlapping range with one or more earlier exports from that same
sensor and timezone:

```powershell
node scripts/preview-sensor-import.mjs --csv "new-export.csv" --sensor-id "sensor-01" --time-zone "America/New_York" --existing "previous-export.csv" --existing "older-export.csv"
```

The JSON preview reports new readings, duplicate rows, conflicting keys, invalid
rows, skipped empty rows, the resolved UTC date range, and the source file's
SHA-256 digest. `canImport` means that the supplied comparison has no conflicts
or invalid rows; it does not mean an import happened. A preview requiring review
returns a failing command status. The source files are never changed.

## Reading identity and overlaps

The reading key combines a permanent **physical sensor ID** with the **resolved
observation instant**. Location, display name, filename, upload date, and measured
values are not identity fields.

| Incoming record                                    | Preview decision                                  |
| -------------------------------------------------- | ------------------------------------------------- |
| New sensor/timestamp key                           | New reading.                                      |
| Same key and equivalent measurements               | Duplicate; no addition.                           |
| Same key but a changed measurement                 | Conflict; preserve both versions for review.      |
| Same key with a missing/present measurement change | Conflict; no automatic replacement or enrichment. |
| Identical values at different timestamps           | Distinct readings.                                |
| Different physical sensors at the same timestamp   | Distinct readings.                                |
| Every measurement missing                          | Skip the empty row.                               |

The planner checks both within-file duplicates and overlaps with supplied earlier
readings. If incoming records disagree for one key, none of them becomes an
addition. Equivalent Celsius/Fahrenheit values compare using floating-point
precision tolerance, without rounding away meaningful differences.

## Hourly preparation from the original archive

Create a private manifest listing **all applicable archived exports**, plus the
new export. Each source needs `csvPath`, the permanent `sensorId`, `timeZone`, and
the original file's lowercase `sha256`. `sourceUrl` is optional provenance for
local preparation and required for a new workbook receipt. When supplied, it must
be an HTTPS Drive file URL in the form `https://drive.google.com/file/d/FILE_ID/view`.
The optional `usp=sharing`, `usp=drive_link`, or `usp=drivesdk` query is removed.
Credentials, local paths, fragments, and all other query parameters are rejected.
This shape check does not verify that the file exists or has private access;
verify both separately. CSV paths may be absolute or relative to the manifest.
Keep the manifest and prepared JSON under an ignored private directory, outside
the public site inputs.

```json
{
 "schemaVersion": 1,
 "sources": [
  {
   "csvPath": "new-export.csv",
   "sensorId": "aerolab-01",
   "timeZone": "America/New_York",
   "sha256": "replace-with-the-original-file-sha256"
  }
 ]
}
```

Replace the hash placeholder with the actual 64-character digest. Obtain it
without editing the CSV:

```powershell
(Get-FileHash -LiteralPath "new-export.csv" -Algorithm SHA256).Hash.ToLowerInvariant()
node scripts/prepare-sensor-history.mjs --manifest ".cache/sensor-import/manifest.json"
```

The command verifies source bytes, parses each file, rejects invalid rows and
conflicting readings, deduplicates original observations, and emits hourly JSON
to stdout. Unknown manifest fields, empty source lists, invalid hashes, and
inconsistent timezones for one sensor fail preparation. No partial result is
emitted on failure. Receipts and counts describe only the supplied archive;
neither command silently discovers missing prior exports.

Each hour is a fixed UTC interval, identified by sensor ID and hour start. Eastern
labels remain presentation fields. The statistics use every unique nonmissing
reading in that hour, with separate counts for temperature, humidity, and VPD in
both channels. Missing hours stay absent; partial hours remain partial. Means
are calculated from raw readings, never from an average of earlier hourly means.

## Repeatable native workbook plan

[`plan-sensor-workbook-import.mjs`](../plan-sensor-workbook-import.mjs) prepares a
native request plan locally. It does not archive files, call Google write APIs,
or silently discover missing exports. Keep snapshots, manifests, and plans in
ignored private storage.

Supply two complete manifests: the sources already recorded in the workbook,
and those same sources plus the new archived export. Both are re-read and
SHA-256-verified. Each new source must have its verified archive `sourceUrl`;
all live import receipts must be represented. Downloaded filenames may differ
from the archive display name: source identity follows sensor, hash, timezone,
and provenance rather than the local filename.

Capture a native `spreadsheets.get` response with `includeGridData: true`, the
`spreadsheetId`, all four managed sheets' full `data.userEnteredValue`, sheet/grid
properties, native tables, and chart metadata. Derive each sheet's complete
allocated grid bounds from fresh metadata, including cells outside the visible
summary and chart-helper ranges. Add a `capturedRanges` array to the snapshot
listing the exact bounded A1 ranges actually requested, starting at A1 and
covering every allocated row and column on each sheet. For example, an allocated
1,000-row, 26-column Overview sheet requires `'Overview'!A1:Z1000`; use the current
bounds rather than copying that example. A missing or partial capture fails.
The planner compares the recorded
archive's reconstructed hourly values against this live snapshot before planning
any changes. Missing sources, unexplained values, duplicate keys, and incompatible
headers/tables fail the plan. The current native layout uses Eastern labels;
a different timezone or an unregistered device requires a reviewed registry/layout
migration first.

```powershell
node scripts/plan-sensor-workbook-import.mjs --snapshot ".cache/sensor-import/native-grid.json" --recorded-manifest ".cache/sensor-import/recorded.json" --manifest ".cache/sensor-import/complete-plus-new.json" --imported-at "2026-10-17T08:00:00Z"
```

Use the actual intended import timestamp, not the example. Save the JSON emitted
to stdout as a private plan. It includes `preconditionDigest`, `expectedDigest`,
`requests`, `expectedSnapshot`, and the counts `changedHours`, `addedHours`, and
`addedSources`. An exact replay has no mutation requests; do not append duplicate
hourly rows or receipts. A newly archived file may add a receipt even when its
readings overlap existing hours completely.

Before applying anything, capture a fresh complete native snapshot and reconcile
it against that saved plan:

```powershell
node scripts/plan-sensor-workbook-import.mjs --snapshot ".cache/sensor-import/fresh-native-grid.json" --reconcile ".cache/sensor-import/saved-plan.json"
```

- **ready:** the captured workbook still matches the precondition; the reviewed
  requests may be applied together in **one native batch**.
- **applied:** the captured workbook exactly matches the projected result; do not
  submit the requests again. An empty no-op plan also needs no write.
- **Failure:** drift or a partial/unrecognized result needs review; do not replay
  the plan or overwrite the workbook to force a match.

After an uncertain cloud-write response, obtain another fresh snapshot and run
reconciliation before retrying. The comparison is a precondition check, not a
server-side concurrency lock. Receipt growth inserts rows above the existing
import instructions, preserving those notes. The plan updates affected hourly
rows by `Hour key`, table bounds, receipts, overview formulas, and chart-helper
references together; it leaves the plant-care workbook untouched.

Receipt insertion rejects additional sheets, formulas or charts on
`Sensors & imports`, chart references to that sheet, and unsupported formulas
that reference it from other sheets. The existing Overview B10/B11 receipt
summary formulas are supported because the same batch replaces them. Review
layout changes before importing; the planner does not rewrite arbitrary
spreadsheet references after row insertion.

## Future import procedure

1. Read the live sensor registry and import log. Confirm the physical sensor,
   export timezone, and source format. Reuse its ID when it moves; use a new ID
   for a different device. Download the relevant originals from the archive and
   verify their recorded hashes before adding the new file to the manifest.
2. Run the preview/preparation against the complete applicable archive. Stop for
   invalid or conflicting readings. A repeated file or overlapping range may
   produce no changed hourly rows; treat that as a no-op rather than appending
   another history copy or duplicate source receipt.
3. Archive each new original CSV unchanged under its device folder and verify
   the downloaded bytes. Record its URL and hash. A filename or file hash alone
   does not detect partially overlapping exports; reading keys do.
4. Capture the complete live snapshot and build the native plan using the two
   verified manifests above. Reconcile a second fresh read immediately before
   writing; stop on drift or conflicts. Back up before structural changes.
5. Apply the reviewed requests as one native batch. Affected `Hour key` rows in
   `Hourly history!AE` receive their full recomputed summaries; new keys append.
   Do not average existing summaries, append a second copy, or change plant History.
6. Read the result back and verify row/key uniqueness, original sample counts,
   metric values, UTC timestamps, source receipts, formulas, and rendered charts.
   After an uncertain write result, read before retrying. The read-only Node
   tools do not establish a transactional or concurrent cloud import endpoint.

The current operator workflow is to supply the next export for a reviewed import.
There is no automatic background import or Quick Logger upload control yet.

## Identity and timezone evidence

The CSV itself does not identify its timezone, physical sensor, placement, or
what the probe measures. Confirm device identity and timezone before storing
readings; preserve unknown placement or channel meaning as unknown. Do not infer
a plant ID, air/soil target, or canopy position from the export filename.

Timestamps use the explicit IANA timezone supplied to the parser, never the
computer or browser's implicit timezone. Invalid calendar dates and nonexistent
or ambiguous daylight-saving wall times require review. The parser does not
invent an offset for a repeated hour. Missing periods stay gaps.

High-frequency sensor data needs a separate sensor history. The existing plant
`History` ledger and its formulas are bounded at 5,000 rows; the ordinary
observation batch endpoint and phone queue accept at most 50 entries. Do not
route minute-by-minute imports through those plant-care paths.

## Maintained implementation

- [`sensor-import.mjs`](sensor-import.mjs) parses and plans without I/O.
- [`preview-sensor-import.mjs`](../preview-sensor-import.mjs) reads local files
  and prints the comparison.
- [`sensor-hourly.mjs`](sensor-hourly.mjs) aggregates unique observations into
  fixed UTC hours and rejects conflicts.
- [`prepare-sensor-history.mjs`](../prepare-sensor-history.mjs) verifies a private
  source manifest and prepares the complete hourly history without writing it.
- [`sensor-workbook-import.mjs`](sensor-workbook-import.mjs) validates native
  snapshots, plans changed hours/receipts/views, and reconciles before/after state.
- [`plan-sensor-workbook-import.mjs`](../plan-sensor-workbook-import.mjs) verifies
  both archives and emits the guarded native plan or reconciliation result.
- [Parser regressions](../../test/google-sheets/sensor-import.test.mjs) exercise
  schema, measurement, timestamp, duplicate, and conflict behavior.
- [Preview regressions](../../test/google-sheets/sensor-import-preview.test.mjs)
  exercise real file reads and command status without production writes.
- [Hourly regressions](../../test/google-sheets/sensor-hourly.test.mjs) cover
  overlap invariance, independent metric counts, gaps, UTC boundaries, and means.
- [Manifest regressions](../../test/google-sheets/sensor-history.test.mjs) cover
  source hashes, overlapping files, invalid inputs, and the read-only CLI.

Keep actual sensor exports and private previews out of Git and public site
artifacts. Tests use synthetic records.
