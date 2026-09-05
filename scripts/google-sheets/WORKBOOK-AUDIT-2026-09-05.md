# September 5 workbook audit

## Scope and safeguards

The review covered metadata for all 46 tabs, canonical History, the tracker,
Baselines, Dashboard, Integrity, staging validations, chart helpers, and the
formula/header areas of all 30 individual plant pages. All 98 embedded chart
specifications were inspected. An error-free formula is not necessarily correct:
the principal failures were stale ranges and chart bindings, not `#REF!` cells.

A native Drive backup was created before production writes:
`Garden Plant Tracker — before 5.18.0 watering plans and workbook audit — 2026-09-05 03-49 EDT`.
The repair was rehearsed on a separate disposable native copy. Synthetic
measurement cases were confined to that copy; none were sent to production.

## Findings and repairs

| Surface                         | Verified defect                                                                                              | Repair                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard                       | “Trend ready” counted obsolete `Ready`, displaying 0 / 30                                                    | Count `Current cycle supported`; label the metric explicitly                                                                        |
| Baselines                       | Missing estimate history caused measured-only plants to report “No measurement”                              | Independently handle absent estimate and measured series; include corrected ruler observations and exclude estimated methods        |
| Integrity                       | Several counts and the action list stopped at P28                                                            | Include P29 and P30; keep missing data actionable without forcing watering                                                          |
| Alert summaries                 | “No current-cycle alert” counted as a warning                                                                | Exclude all benign statuses consistently                                                                                            |
| Insights                        | Dimension and shape charts pointed at weight columns                                                         | Bind both to dedicated latest measured-dimension helpers, in centimeters                                                            |
| Plant pages                     | All 30 dimension charts and 30 calendar-weight charts had lost their series; domains pointed at quality text | Restore date domains and real series, with visible points and straight segments; keep chart IDs, positions, and custom presentation |
| Growth helpers                  | AppSheet's dimension helper included visual estimates                                                        | Mask unmeasured dimensions while preserving every active weight value; leave canonical history intact                               |
| Timeline                        | Source stopped at History row 1000; display helpers stopped at 250 days                                      | Match the existing 5000-row History contract across the query, helper, and chart                                                    |
| Calibration / follow-ups        | Helper coverage stopped at 28 plants                                                                         | Extend to all 30; preserve owner-entered pot and acquisition evidence                                                               |
| Conditional formatting          | Dashboard rules targeted pre-insertion column positions; old status strings no longer matched                | Repair the known rules in place and retain unrelated formatting                                                                     |
| Readability                     | Decimal watering counts, unlabelled fractional loss, trailing decimal points, clipped guidance               | Integer counts, one-decimal historical days, percentage loss, explicit dimension precision, wrapping, and fitted rows               |
| Filters and warning protections | Several ended before newer columns                                                                           | Extend the existing ranges, preserving sort/filter settings and warning-only behavior                                               |

The new recommended water date remains conditional on the learned dry-down model
and actual plant readiness. This audit does not introduce a fixed 4- or 6-day
post-dry delay or reinterpret historical watering dates as optimal care.

## Maintained repair interface

[`workbook-audit.mjs`](./workbook-audit.mjs) builds a reviewable native Sheets
`batchUpdate` request list from a fresh metadata/cell snapshot. It has no network
or credential access and does not apply the requests. It is a **one-time scoped
migration**, not a general workbook rebuilder: it refuses changed inventory,
unexpected headers, existing new helper columns, or occupied append destinations.
Keep snapshots and request artifacts in ignored local storage, not Git.

```powershell
node scripts/google-sheets/workbook-audit.mjs <fresh-snapshot.json>
```

The input contains `metadata` (the native spreadsheet resource including chart
specifications, conditional formats, filters, banding, and warning protections)
and `cells` (`sheet`, zero-based `row` and `column`, and `value` as native
`userEnteredValue`). Read all existing target ranges before constructing it.
Recheck those values and metadata immediately before applying the reviewed batch.
Do not replay it against an already migrated workbook.

Formula factories live in `plant-tracker.gs` so the remeasurement policy agrees
with subsequent source-generated Baselines. The per-plant chart helpers occupy
hidden S:V; the existing complete ledger remains visible in A:K. Measured latest
snapshots occupy Insights data AA:AD. No new editable observation table exists.

Native Sheets rehearsal verified ten estimate/measured/corrected/removed/empty
cases. The production-data copy reports 18 supported current curves, two plants
awaiting completed-cycle calibration, and zero false trend-review flags. Both
weights and original estimates remain available in their appropriate surfaces.

Google's [chart specification API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/charts)
defines the explicit domains, series, point styling, and null interpolation used
here. The [chart update request](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#updatechartspecrequest)
changes the specification without moving or resizing the embedded chart.
