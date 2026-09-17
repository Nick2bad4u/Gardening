# Workbook analytics and history upgrade

The 5.25.0 source and migration add derived views while retaining the
42-column History contract and the daily report's care policy. **Production
deployment is pending.** The target workbook has 54 tabs and 147 charts,
including 25 Insights charts. See the [rollout record](#rollout-record) before
treating these locations as verified production state.

## Finding the information

| Location                            | Information                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Every P01–P30 page, rows 14:38      | Completed watering-gap statistics and sample count; latest photo and recorded condition; feeding history; sparse-evidence guidance. |
| Plant page A11                      | Jump to complete history.                                                                                                           |
| Plant page A12:C12                  | Jump to charts at A54.                                                                                                              |
| Plant page D12:F12 and G12:J12      | Calculated as of label and timestamp.                                                                                               |
| Plant page A139                     | Back to charts at A54.                                                                                                              |
| Plant page A140:L140 and A141:L5139 | History headers and uninterrupted history output, including photo links.                                                            |
| Insights A2                         | Linked section index.                                                                                                               |
| Insights A790                       | Latest versus previous completed watering gap by plant.                                                                             |
| Insights B228 and A837:R839         | Shared plant selector, selected plant, and watering-date key for cycle comparison.                                                  |
| Insights A840                       | Current and last two completed dry-down cycles in the selected plant's current setup.                                               |
| Watering calendar                   | Last 56 calendar dates, including the calculation date.                                                                             |
| RO refills O1:T12                   | Latest refill date and gallons, plus each container's latest recorded fill and empty status.                                        |

Dashboard groups secondary columns **L:O** and advanced metrics **Y:AE** into
collapsible sections. Model-estimate labels and a daily-report link distinguish
forecast evidence from the reviewed care plan. The Waterings header note
describes recorded events. Short conditions wrap, while full history notes
remain accessible. Display formats retain the underlying stored precision.

## Interpreting the evidence

Watering gaps describe completed intervals between distinct calendar dates.
Same-day Water events contribute one date; Removed records do not contribute.
The history spans pot setups and watering applications. The first date has no
gap, and the unfinished current gap is not plotted. Show the interval count
beside the latest, median, minimum, and maximum: one interval does not establish
a pattern or prescribe a schedule.

The cycle comparison uses actual elapsed days and measured whole-pot grams.
It reuses the logger's correction resolver, exclusions, and cycle boundaries,
then restricts comparisons to the current pot setup. Missing cycles stay
unavailable. Watering-date labels use the workbook timezone; elapsed-time
arithmetic retains daylight-saving differences. The selected plant's permanent
color identifies it, while line and point styles distinguish cycles.

The calendar separates **Fed**, **Plain**, **Unknown**, and **Mixed**. These
labels reflect explicitly recorded nutrient use. Mixed means the same date has
different recorded nutrient categories; unknown never becomes plain water.
Blank calendar cells mean no qualifying recorded Water event for that date.

Latest-photo links retain their observation date. The recorded-condition summary
includes event, quality, method, and notes. A Photo record or a Check record with
explicit photo-only notes stays distinguishable from a physical inspection.
The summary does not infer a hands-on check from a generic Check event.

Feeding summaries retain the last recorded feed date, product, and dose in its
original units. Numeric zero is retained; a missing product or dose is unknown.
The subsequent plain-water count includes active Water events explicitly marked
No with an observation timestamp strictly later than that feed. Same-time
records are excluded because their event order is unknown. It counts events,
not distinct days, and does not define a feeding interval.

An RO container with no empty date is **Not marked empty**, not assumed full.
The last refill date's total is gallons added, not consumption or remaining
stock. The existing log remains the only manual RO entry surface. See the
[RO guide](RO-REFILLS.md) for entry columns and protections.

One ruler-measured size snapshot is a baseline. Estimated dimensions do not
establish measured growth. The upgrade adds no water-use, consumption, seasonal,
pest, or flowering trend claims without sufficient recorded evidence.

## Calculation time and helper ownership

The hidden, warning-protected **Workbook calculations** sheet holds one
correction-aware latest weight/time pair per plant in A:C. **E2** contains
`=NOW()` and **F2** contains `=INT(E2)`. Derived age/date formulas share these
references, and bounded inventory lookups replace whole-column inventory scans.
Dashboard's average watering gap reuses the existing Watering intervals helper.

Calculated as of appears on Dashboard at **B5**, on each plant page in
**G12:J12** and its summary, on Insights at **T2**, and on the calendar at **B2**.
This is a calculation timestamp, not a promise of live recalculation. Sheets
can return cached formulas during API reads, including when the workbook is
closed. Compare it with the actual read time and retain absolute observation
timestamps before using an elapsed-age result.

The hidden, warning-protected **Workbook analytics** sheet contains selected
cycle data in A:D, completed-gap comparisons in F:H, and derived plant-color
series for the cycle chart. Neither helper nor the Watering calendar is an
AppSheet staging table. Existing protections, owner tab order, hidden Quick log
compatibility, and RO manual-entry exceptions remain in place. Daily care stays
retired; the daily report remains the care-planning surface.

[`cycle-comparison.mjs`](cycle-comparison.mjs) generates the maintained
`GARDEN_CYCLE_COMPARISON` server snippet. Its formula takes native History A:AP,
the selected plant, and the current setup as explicit dependencies. Do not pass
NOW/TODAY, including indirect references, as custom-function inputs. The wrapper
filters future observations at evaluation; its output is not an independent
clock or a guarantee that a cached result has just refreshed.

Node tests and ES2023 declarations do not prove native Apps Script compatibility.
The rehearsal rejected numeric separators. The emitted cycle source avoids
them and replaces copying array methods with sort/reverse on fresh arrays.
Verify the actual generated source in a disposable bound script before release.

## Migration procedure

[`workbook-upgrade.mjs`](workbook-upgrade.mjs) exports
`buildWorkbookUpgradeRequests(snapshot, factories)`. Supply native sheet/chart
metadata, entered cells in its working ranges, and the latest-pair and plant
history formula factories from the maintained logger. It returns preparation,
formula, and chart requests, plus captured cell preconditions, required empty
ranges, and verification metadata. It rejects schema drift, occupied
destinations, changed plant mappings, and an already-installed destination.

1. Capture fresh native metadata and relevant entered/effective values,
   formulas, validations, and notes. Record the deployment assignment and queue
   trigger. Create a native Drive backup and a separate rehearsal copy with its
   own bound script. Keep private snapshots in ignored local storage.
2. Validate the source and deploy it only to the rehearsal script. Recheck the
   captured cell preconditions and empty destination ranges immediately before
   applying requests. Stop on drift; do not clear unexpected cells.
3. Apply `prepareRequests`, then `formulaRequests`. Read calculated outputs back
   and resolve errors before applying `chartRequests`. Creating charts before
   their sources calculate can discard native series styling.
4. Verify the expanded Integrity scan covers all plant pages, Watering
   intervals, Dry-down insights, new helpers/calendar, and the newer Insights
   section. Retain the exclusion of Dashboard's own Integrity indicators to
   prevent a circular dependency. Inject formula failures only in the copy.
5. Rehearse 96, 97, and more history records, empty history, corrections,
   Removed records, same-day events, setup changes, missing chart evidence, and
   sparse summaries. Verify open-workbook and closed-workbook/API freshness
   behavior. Compare all latest weight/time pairs and other affected outputs.
6. Compare canonical History, App entries, App bulk, and RO entry/formula ranges
   exactly. Compare original chart IDs, specifications, positions, protections,
   and relative tab order. Preserve the existing conditional-format rules
   except explicitly reviewed range adjustments. Inspect native visuals.
7. After rehearsal passes, repeat the fresh production preflight and apply the
   reviewed migration. Publish a new immutable Apps Script version through the
   existing deployment URL. Retain the queue trigger and staging schema;
   installers are not required for this derived-view upgrade.
8. Verify the live logger version, successful executions, exactly one
   five-minute queue trigger, Integrity results, calculation timestamps,
   canonical-data preservation, and chart presentation. Record the evidence
   below; source publication alone does not prove deployment.

Existing charts keep their IDs and positions. The only planned existing-chart
specification changes are the guarded P24–P26 watering-interval style repairs
after real intervals appeared. Use
`buildWateringIntervalStyleRepairRequests(snapshot, plantIds, options)` from
[`watering-intervals.mjs`](watering-intervals.mjs), with fresh calculated counts
in `options.completedIntervalsByPlant`. Preserve unrelated specifications.
Do not rewrite the RO chart: the native API drops its custom axis-title colors.

Run the focused checks from the repository root:

```powershell
npm run test:unit -- test/google-sheets/workbook-analytics.test.mjs test/google-sheets/cycle-comparison.test.mjs test/google-sheets/workbook-upgrade.test.mjs test/google-sheets/watering-intervals.test.mjs
npm run test:logger
npm run test:logger:coverage
npm run check:logger
npm run lint:apps-script
npm run typecheck:apps-script
npm run typecheck:build
npm run typecheck:tests
```

Also inspect generated client changes and the applicable client checks before
publishing the three-file clasp upload. Follow [the main runbook](README.md).

## Rollout record

**September 17, 2026: rehearsal verified; production migration and 5.25.0
deployment remain pending.** The native backup is named **Garden Plant Tracker —
before analytics and history layout upgrade — 2026-09-17**; the separate copy is
**Garden Plant Tracker — analytics upgrade rehearsal — 2026-09-17**.

The native rehearsal passed these checks:

- Plant histories with **96, 97, and 150 records** spill without colliding with
  summaries or charts. Empty history and missing feeding history stay blank.
- A corrected **91 g** reading wins over its Removed **90 g** predecessor;
  Estimated **900 g** and other-setup **800 g** readings are excluded. All
  **30 original Baselines latest-weight/time pairs** match exactly.
- Same-day waterings collapse to one watering date, while the calendar shows
  **Mixed** for different nutrient categories. The later plain-water count is
  **1**, excluding the same-time event. Future photo evidence is excluded,
  numeric zero dose remains zero, and a zero RO fill does not replace the
  container's latest positive fill.
- Four temporary errors at **P01 A40**, **Watering intervals A4000**,
  **Dry-down insights AE4000**, and **Insights A800** produce an Integrity count
  of **5**, including one propagated error. Clearing them returns the count to
  **0**. Synthetic records and errors were confined to the rehearsal copy.
- Canonical History, staging, and RO records have **zero entered-value, note,
  or validation differences** in the compared ranges. All **145 existing chart
  IDs and positions** match; **142 chart specifications** match exactly, and
  the remaining three contain only the intended P24–P26 interval-style repairs.
  Existing protections match after normalizing metadata array order, and all
  original tabs retain their relative order.
- Native visual review covered Dashboard, plant photo/feeding summaries, both
  new Insights charts, the calendar, and RO. It found and fixed hidden Dashboard
  guidance rows 4–5 and an inherited 21-point font, the calendar's clipped
  timestamp, and RO summary header contrast. Showing Dashboard rows 4–5 is an
  intentional visibility change; existing sheet protections and tab order
  remain preserved.
- With the workbook closed, two API reads **68.161 seconds apart** returned
  identical shared-clock and P01 G12/D35 values showing **5:08 p.m.**, with
  Integrity still **0**. This confirms that API reads can return cached ages;
  the displayed calculation time must not be presented as the current read time.

Local validation passed **886 logger/migration tests**. Server coverage is
**99.41% statements, 98.01% branches, 99.70% functions, and 99.64% lines**.
The implementation's applicable type, lint, and secret checks also passed.

The actual bound rehearsal script's read-only `getWebAppBootstrap` calls were
timed before and after the upgrade:

| Measurement    | Samples | Durations           |
| -------------- | ------- | ------------------- |
| Before upgrade | 2       | 19,777 ms; 8,425 ms |
| After upgrade  | 2       | 6,868 ms; 8,642 ms  |

These small, variable samples do not establish a stable speedup. A shared-clock
write followed by an API read took **18.484 seconds**, including connector and
network overhead. This is not an isolated recalculation measurement, and no
comparable before-upgrade recalculation timing was captured; its performance
effect remains inconclusive.

The combined 5.25.0 release includes the validated client changes from main
commit `80d88ee`: accessible inline Use current time controls for single and bulk
entry, a correction pencil at the top of History, badges below plant names at
mobile widths, and metadata pills showing local times while preserving exact
ISO time attributes and titles. Time capture, save, and retry behavior remain
unchanged.

**Still pending:** production migration, production comparisons, the final
source commit, and the immutable 5.25.0 deployment version. The latest verified
production baseline remains **5.24.0 / immutable version 91**. The separate
5.24.1 client release was canceled before upload; its validated client is
included in 5.25.0 instead. Re-read the production deployment immediately before
release.

Complete this record after verification with the source commit, immutable
version, live worksheet/chart counts, preserved observation/request groups,
production comparison results, and live trigger/execution checks. Retain the
existing deployment URL. Do not mark the rollout complete while those checks
remain pending.
