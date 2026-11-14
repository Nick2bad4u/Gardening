# Logger

## Runtime/history

- `.gs`: shared globals, no Node/browser APIs. `Index.html`: self-contained unless `doGet()` templates it. Align ES2023 `tsconfig.apps-script.json`, `types/apps-script*.d.ts`, globals/fixtures.
- Apps Script rejects numeric separators. Validate syntax/APIs on a disposable bound script. Cycles: `sort`/`reverse` new arrays, not `toSorted`/`toReversed`.
- Append-only History: distinguish observation/request/save/batch IDs; P groups idempotent saves. Corrections preview one event, append replacement, mark ancestor Removed with provenance; no row deletion/setup creation.
- History: A:L observations; M:O formulas; P retry ID; Q:Z care; AA:AJ provenance/state; AK:AM entry units/inches; AN rotation degrees; AO watering application; AP measured mL; AQ 0–100% RH; AR `PPFD (µmol/m²/s)`/AS `Illuminance (lux)` finite/nonnegative; AT:BH care; BI:BO leaf; BP:BQ rotation from/to. Blank ≠ zero. Preserve columns/headers/data/formulas; verify live migration before use. Separate canonical Celsius/targets/original units. `installGardenLogger()` may add/verify headers; clearing values/formulas needs owner approval.
- Setup is the weighed configuration, not diameter. Repot advances setup and Baselines; exclude old setups from dry/wet averages.

## Entry safety

- Never ask weight classification. Retain `Weight state`; new weights: `Routine`. Derive without rewriting History: Wet = same-save Water weight, otherwise first positive weight ≤5 days after Water; Dry = last eligible non-Wet weight before next Water. Open-cycle weights stay Routine. Water never implies weight.
- Retain entries until callback. Lock writes, escape formula-like text, validate URLs; per-plant retries are idempotent. Reload queue under a Web Lock through send/reconcile; fail closed without locks, retain Save now. Pending-save recovery precedes draft Resume/Discard.
- Never release pending retry IDs on missing receipts/RPC failure. Warn before unresolved Clear; verify storage removal before clearing pending state.
- Retain partial draft date/time and linked errors. Correction bounds allow server-valid zero/signed/fractional/unchanged legacy values.
- Preflight batches before mutation: 50,000 History slots (rows 2:50001). Align logger/`history-capacity-config.mjs`; migrate full-history projections before raising write limits. Retries need no slots.
- Refresh choices/filters retaining drafts/selections/focus/save locks; test older cached-roster upgrades.
- Water/Weigh/Measure: separate rows. Bulk water amount: per pot.
- Keep selected retains single-plant nutrient opt-in/product/dose after save/queue; unchecked, Clear, and bulk reset. Usual doses never opt in or enter History. Import missing legacy doses; lock updates/reject conflicts. Cache offline, confirm remote saves. Retain amount/unit text and exact draft/pending payloads, including older inactive flags, for retries.
- Humidity: Measured/Hygrometer; independent of weight/soil moisture/watering/ setup. Keep App entries A:AI.
- Inspect: required above-ground condition, Observed/Observed provenance. New Check: required soil moisture, no condition. Keep condition-only legacy Checks/corrections/retries. Ignore stale unselected AppSheet fields. Bulk Inspect: selected plants/shared condition; summaries retain both names.
- Light (UI: Light reading): PPFD/lux/both required. PPFD (also combined) uses Estimated/Light app; lux-only uses Measured/Lux meter. No quantum-sensor claim/conversion/DLI/inferred care threshold. Preset/context stays in Notes; light fields stay App entries AJ/AK, History AR/AS. No bulk Light/Humidity/Temperature.
- Schema: History A:BQ/69; App entries A:BI/61; App bulk A:CA/79. Rotation: History BP:BQ/App entries BH:BI from/to; App bulk BZ target/CA bridge-owned snapshot. P39/P40/P41 weights: BW/BX/BY. Preserve earlier columns and 74-/76-column staging compatibility until explicit upgrade. Source width proves no live upgrade. Leaf/air staging: unitless headers with entry units; History: °C. Preserve offline rows/retries/corrections. Leaf VPD replaces new Support choices, never history/retries.
- Rotation reference: same pot label/front; N window, E wall, S room, W Mylar. AN stays CW-equivalent; display 270 as 90° CCW. Unknown→known: blank degrees; same facing: zero confirmation. Never default/backfill absolute facing. Legacy degrees stay >0..360/default 90 with original retry payloads.
- Facing suggestions require current setup, active correction-aware nonfuture history, source time ≤ entry time. Later degree-only turns invalidate absolute anchors. Withhold automatic origins on stale/offline/unconfirmed reads or pending Rotation/Repot; retain explicit inputs. Phone bulk freezes endpoints. AppSheet bridge locks, persists, flushes/readbacks per-pot snapshots before History; retries retain them and reject changed round ID/time/selection/target. Never use an App formula. Defer overlapping bulk rotations until predecessors are Saved.
- Action hints are dated read-only evidence, never observations/defaults. Measure height/width and Repot retain separate time/quality/method in setup; other hints label older setups. Separate environment metrics; never pair prior sensors into new VPD. Latest hints cannot reconstruct backdated state. Keep refreshing/saved/offline/unconfirmed labels.
- Mist: listed targets, details for Other, optional positive measured mL. Move: required destination, optional previous location. Temperature: Air/Soil and C/F, stored Celsius, zero/negative readings down to absolute zero. Environment: aspect/new setting; Propagate/legacy Support: choice/details. None implies Water/weight/setup reset. Location uses active history.
- Leaf VPD Device: nonnegative displayed kPa, optional context. Calculated: leaf temperature plus both/neither air/RH. Leaf-only: blank VPD / Not calculated. Same-observation data only; retain signed results/C/F provenance. The −50..100°C domain is not care guidance. No bulk Leaf VPD.
- Progress: workbook timezone/4 a.m. care days; drying: actual intervals. Keep correction order and future/Removed/estimated/invalid/other-setup exclusions. Reference-reached and plateau evidence stay separate; neither forecasts nor plateaus prove dry soil. Watering needs current plant/soil checks.

## Presentation

- Reports/Daily care retired: no `installDailyCareDashboard()` in production/menus/refreshes/triggers. Link watering history to the map.
- Preserve tab order/visibility/formatting/protections and hidden Quick log. Sheet warnings must allow logger/AppSheet. RO refills: A20:I/K20:M editable, calculated J protected.
- JetBrains Mono: cells/all chart text overrides, not just theme. `workbook-presentation.mjs` keeps full specs; native RO axis-title colors drop: edit that font in the UI and verify non-font metadata. Keep theme/data.
- Integrity A4:H21 combines C5:C21/G5:G14; missing statuses: Checks unavailable. Independently check anchors/ID coverage/capacity; empty formulas prove nothing. Error scans exclude indicators/retired sheets; extend helper anchors/spills with workbook changes.
- Keep A140:L140 headers, uninterrupted history spill from A141, A11/A139 navigation. Plant pages need max(5,139, 140 + observation count) rows, up to 50,140; retain extras. Refresh rebuilds 1:13/history, keeps summary styles but resets widths/some heights; reapply scoped presentation planners.

## Analytics/freshness

- `workbook-analytics.mjs`: read-only watering/photo/condition/feeding/RO summaries and eight-week Watering calendar, outside AppSheet intake. Distinguish same-day nutrient Yes/No/unknown/mixed; blank RO empty date means "not marked empty," never full.
- Latest condition keeps event/quality/method/notes/time; photos prove no inspection. Keep feeding units/unknowns; intervals/feeding/model estimates are not schedules.
- `Workbook calculations`: correction-aware latest weight/time A:C, shared clock E2, calendar date F2. Reuse for ages; expose Calculated as of. Calculation time differs from observation/API-read time; show absolute observations/check freshness.
- `Watering map`: hidden, warning-protected, outside AppSheet intake. Keep v2's 12-column Ready/End/count envelope, ledger order, full capacity, and source errors. Filter Removed/future rows; retain correction order. Upgrade v1 only through guarded migration. Fertilizer: explicit Yes on latest Water. The formula is neither an observation nor a refresh clock.
- Picker ages/streaks follow the pot across setups. Ages use workbook-timezone midnight, not the 4 a.m. weighing day. Withhold cached/pending/failed ages/streaks. Count eligible Water until opposite/unknown nutrients.
- Refresh Dry-down models/cycle comparison/environment/recorded locations together from full History via ordinary Apps Script; keep model/correction rules. Use existing queue trigger/explicit analytics refresh, never onEdit/save critical section. Publish all four snapshots and successful metadata atomically.
- Keep ten-minute intake; attempt analytics every scheduled run, even after manual refresh: skipping can exceed 15-minute freshness. Keep refresh leases/retries.
- `Workbook calculations` H:K: calculated time/state/cycle plant ID/setup. Failed refreshes retain successful time/results. Cycle data/roles require Ready, matching plant/setup, valid time ≤15 minutes from shared clock. Computing retains prior status/time; mobile shows progress. Show waiting/failure; never relabel another plant's cache. Flush failure status before releasing the lease, protecting later Ready publications.
- All direct dry-down consumers require Ready/15-minute freshness and cached setup matching current Baselines T. Repot/failed/stale refreshes withhold old dry anchors/ model guidance.
- `Workbook analytics`: cycles A:D/gaps F:H. `cycle-comparison.mjs` owns algorithm/ legacy wrapper; reuse correction/cycle helpers. Compare actual elapsed time, label in workbook timezone. Legacy custom-function callers must not pass NOW/TODAY.
- Full projections/summaries read 50,000 History slots; chart helpers retain latest 4,999 relevant points chronologically. Cycle comparisons select by absolute observation time before elapsed-day alignment. Keep chart-color sentinels, plant chart sources through row 5011; never expand wide helpers/all pages tenfold.
- `workbook-environment.mjs`: read-only Light & humidity/Environment. Separate PPFD/lux/RH and air/soil/leaf temperatures by unit/target/time. Retain corrections, blanks/zero, location/preset notes. No inferred historical canopy height or helpers in AppSheet intake.
- Bound lookups to inventory; rebuild on additions; compare optimized outputs/timings.
- Sensor imports stay outside History. Follow `SENSOR-IMPORT.md`: verify archived bytes, reconstruct all recorded hours, reconcile fresh native snapshots before one-batch requests. Re-read uncertain writes; no blind retry.

## Validation/deployment

- Chart-only migrations: use `INSIGHTS-CHARTS.md`/builder, no workbook/page refresh or Apps Script deployment.
- `plant-chart-layout.mjs` copies P01 styling by verified role/binding. Keep bindings/colors and maxima; use visible A:J width and fresh plotted minima with a 250 g base/measured headroom for floors. Verify rendered ticks despite native rounding; weight labels off, markers/hover intact. Recheck preconditions.
- `plant-page-presentation.mjs`: A1:J38; guard labels/merges/formulas/formats/dimensions. Keep formulas/evidence/full notes; no workbook refresh for styles.
- Chart pixels/row heights are independent. Check four gaps, A109 status, A139 backlink, A140 history. Use scoped guide heights; no hidden boundaries/sheet autofit.
- `workbook-upgrade.mjs`: one-time; recheck captured cells/empty destinations before writes. Prepare, apply formulas, verify calculations, create charts. Stop on drift/installed destinations; never clear/replay.
- Keep unreviewed chart IDs/specs/positions. Basic metadata can omit charts; no-op `findReplace` with `include_spreadsheet_in_response: true` and no grid data returns full metadata. Apply helpers before charts; verify calculations/colors.
- `watering-intervals.mjs`: Pxx status A109/chart A111, hidden warning-protected helper outside AppSheet. Use whole-day gaps between distinct active Water dates, combine same-day setups/applications. Under two dates stays blank; no invented first interval, unfinished gap, or care schedule. Read full History, plot the latest 4,999 completed gaps, summarize all gaps. Keep palette and explicit old bounds in historical one-time installation planners.
- Empty native charts may lose colors/labels/vertical-axis options but keep bindings. Test empty-to-populated on a copy; reapply specs after real intervals as needed. No style triggers.

- Behavior/schema: npm `test:logger`, `test:logger:coverage`, `check:logger`. Align server/client/tests/checker/AppSheet/public CSV/runbook.
- `.gs`: npm `lint:apps-script`, `typecheck:apps-script`. Validate inline HTML/styles/tests; inspect artwork/published dependencies before deploy.
- Before writes, add last rows/request IDs/staging schemas to inherited preflight checks.
- Git-ignore native snapshots. Rehearse structure on native workbook/script copies; exactly compare History/staging/RO entries/formulas/chart IDs/specs/positions/protections/relative tab order.
- Reject snapshots >40,000,000 UTF-8 bytes. Before release verify full-scale native refresh duration/payload/daily trigger-runtime quota headroom; local timing is insufficient.
- Drive copies include bound scripts; avoid competing functions. Never replay `sortSpecs` when extending History's BasicFilter: it re-sorts History.
- New columns inherit validation; replace only new-range rules.
- Run `installGardenLogger()`/`installAppSheetIntake()` only after source/tests agree.
- npm `apps-script:status`: only `plant-tracker.gs`, `Index.html`, `appsscript.json`; `clasp push` leaves the versioned app unchanged.
- Reinstall installers/triggers only for contract changes. Verify `Connected · Logger <version>`, successful web-app/trigger runs, one ten-minute `processQueuedAppSheetEntries`.
