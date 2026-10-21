# Logger

## Runtime/history

- `.gs`: shared global scope, no Node/browser APIs. `Index.html` stays self-contained
  unless `doGet()` gains templating. Keep `tsconfig.apps-script.json` ES2023,
  `types/apps-script*.d.ts` aligned, and global/fixture checks.
- Apps Script rejects numeric separators. Beyond typechecking, validate syntax/APIs
  in a disposable bound script. Cycle generation uses `sort`/`reverse` instead of
  `toSorted`/`toReversed` only on new arrays.
- History is append-only; distinguish observation/request/save/batch IDs.
  P Request ID groups save events for idempotent retries.
  Corrections preview one event, append replacement, mark its ancestor
  Removed with provenance. Never delete rows or create correction setups.
- Preserve History: A:L observations; M:O formulas; P retry ID; Q:Z structured care;
  AA:AJ provenance/state; AK:AM entry units/inches; AN rotation degrees;
  AO watering application; AP measured mL; AQ 0–100% RH. Blank differs from zero.
  5.33.0 appends finite nonnegative AR `PPFD (µmol/m²/s)`/AS `Illuminance (lux)`.
  AT:BH care; 5.36.0 appends BI:BO leaf fields, preserving A:BH.
  Separate canonical Celsius/targets/original units. Verify rollout;
  preserve headers/data/formulas. `installGardenLogger()` may add/verify headers;
  Clearing values/formulas needs explicit owner approval.
- Setup means whole weighed configuration, not diameter. Record changes explicitly
  as Repot, advancing setup/updating Baselines; exclude old setups from dry/wet averages.

## Entry safety

- Never ask weight classification. Retain `Weight state`; new weights: `Routine`.
  Derive without rewriting History: Wet = same-save Water weight, otherwise first
  positive weight within five days after Water; Dry = last eligible non-Wet weight
  before next Water. Open-cycle weights stay Routine. Water never implies weight.
- Preserve entries until callback; lock writes, escape formula-like text, validate
  URLs, keep per-plant retries idempotent. Queue writes reload under a Web Lock
  through send/reconcile; fail closed without locks, preserving Save now.
  Drafts need Resume/Discard; pending-save recovery takes priority.
- Preflight batches before mutation: 50,000 History slots (rows 2:50001).
  Align logger/`history-capacity-config.mjs`; migrate full-history projections before
  raising write limits. Retries need no slots.
- Refresh cached choices/filters without losing drafts/selections/focus/
  save locks. Test older cached-roster upgrades.
- Water/Weigh/Measure use separate rows per save. Bulk water amount is per pot.
- Humidity: Measured / Hygrometer, independent of weight/soil moisture/watering/
  setup. Preserve App entries AI and preceding columns.
- Inspect: required above-ground condition, Observed / Observed provenance.
  New Check: required soil moisture, no condition. Preserve condition-only legacy
  Checks/corrections/retries. Ignore stale unselected AppSheet fields.
  Bulk Inspect: selected plants/shared condition; summaries retain both names.
- Light (UI: Light reading): PPFD/lux/both required. PPFD (also combined) uses
  Estimated / Light app; lux-only uses Measured / Lux meter.
  No quantum-sensor claim/conversion/DLI/inferred care threshold.
  Preset/context stays in Notes; light fields stay App entries AJ/AK, History AR/AS.
  No bulk Light/Humidity/Temperature.
- History A:BO/67; App entries A:BG/59; App bulk A:BV/74. Leaf/air temperatures:
  staging uses unitless headers plus entry units; History uses °C headers.
  Preserve positions/offline rows and aligned retries/corrections.
  Leaf VPD replaces new Support choices, never its history/retries.
- Mist: listed targets, details for Other, optional positive measured mL.
  Move: required destination, optional previous location. Temperature: Air/Soil
  and C/F, stored Celsius, zero/negative readings down to absolute zero.
  Environment: aspect/new setting; Propagate/legacy Support: choice/details.
  None implies Water/weight/setup reset. Current location uses active history.
- Leaf VPD Device: nonnegative displayed kPa, optional context. Calculated requires
  leaf temperature and both/neither air/RH. Leaf-only: blank VPD / Not calculated.
  Use same-observation data, never prior sensors; retain signed results/C/F provenance.
  The −50..100°C calculation domain is not care guidance. No bulk Leaf VPD.
- Progress: workbook timezone/4 a.m. care days; drying rates: actual intervals.
  Preserve correction order and future/Removed/estimated/invalid/other-setup exclusions.
  Keep reference-reached/plateau evidence separate; neither forecast nor plateau
  proves dry soil. Report policy: `docs/daily-weighing-watering-prompt.md`.

## Presentation

- Daily report is the care plan. Exclude retired `installDailyCareDashboard()`
  from production/menus/refreshes/triggers/sources.
- Preserve tab order/visibility/formatting/protections, hidden Quick log.
  Whole-sheet warnings must not block logger/AppSheet. RO refills: A20:I/K20:M
  editable, calculated J protected.
- JetBrains Mono: cells/all chart text overrides, not just theme.
  `workbook-presentation.mjs` preserves full specs; native RO axis-title colors drop:
  edit that font in the UI and verify non-font metadata. Preserve theme/data.
- Integrity A4:H21 combines C5:C21/G5:G14; missing statuses mean Checks unavailable.
  Independently check formula anchors/ID coverage/capacity; empty formulas prove
  nothing. Error scans exclude indicators/retired sheets; extend scanned helper
  anchors/spills with workbook changes.
- Preserve A140:L140 headers, uninterrupted history spill from A141, A11/A139
  navigation. Plant pages need max(5,139, 140 + observation count) rows, up to
  50,140; retain extra rows. Refresh rebuilds
  rows 1:13/history, retaining summary styles but resetting widths/some heights;
  reapply scoped presentation planners.

## Analytics/freshness

- `workbook-analytics.mjs`: read-only watering/photo/condition/feeding/RO summaries
  and eight-week Watering calendar, outside AppSheet intake.
  Distinguish same-day nutrient Yes/No/unknown/mixed; blank RO empty date means
  "not marked empty," never full.
- Latest condition retains recorded event/quality/method/notes/time;
  photos do not prove inspection. Preserve feeding units/unknowns; intervals,
  feeding summaries, and model estimates are not schedules.
- `Workbook calculations`: correction-aware latest plant weight/time A:C,
  shared clock E2, calendar date F2. Reuse for age formulas; expose
  Calculated as of. Calculation time is not observation/API-read time;
  display absolute observations and verify freshness.
- Refresh Dry-down models/cycle comparison/environment readings/recorded
  locations together via ordinary Apps Script from full History; preserve exact
  model/correction rules. Use the existing queue trigger and explicit analytics
  refresh, never onEdit or the save critical section. Publish all four snapshots
  and successful metadata atomically.
- Keep five-minute queue intake. Scheduled analytics may reuse Ready snapshots
  under eight minutes old (normally ten-minute refreshes); invalid/future/stale/
  non-Ready metadata forces refresh. Explicit analytics/manual recalculation bypass
  this guard. Consumer freshness stays 15 minutes.
- `Workbook calculations` H:K: calculated time/state/cycle plant ID/setup.
  Failed refreshes preserve prior successful time/results.
  Cycle data/role labels require Ready, selected plant/setup match, valid timestamp
  within 15 minutes of shared clock. While computing retain prior status/time;
  mobile shows request progress. Show applicable waiting/failure; never relabel
  another plant's cache. Flush failure status before releasing the refresh lease to
  protect later Ready publications.
- All direct dry-down consumers require Ready/15-minute freshness and cached setup
  matching current Baselines T. Repot/failed/stale refreshes withhold old dry anchors/
  model guidance.
- `Workbook analytics`: cycles A:D/gaps F:H. `cycle-comparison.mjs` owns
  cycle algorithm/legacy custom-function wrapper; reuse correction/cycle helpers.
  Compare actual elapsed time, label in workbook timezone. Legacy custom-function
  callers must not pass NOW/TODAY.
- Full projections/summaries read 50,000 History slots; chart helpers retain latest
  4,999 relevant points chronologically. Cycle comparisons select by absolute
  observation time before elapsed-day alignment. Preserve chart-color sentinels,
  plant chart sources through row 5011; never expand wide helpers/all pages tenfold.
- `workbook-environment.mjs`: read-only Light & humidity/Environment. Separate
  PPFD/lux/RH and air/soil/leaf temperatures by unit/target/time. Retain corrections,
  blanks/zero, location/preset notes. No inferred historical canopy height or helpers
  in AppSheet intake.
- Bound lookups to inventory; regenerate on additions. Compare optimization outputs/
  measured timings.
- Sensor imports stay outside History. Follow `SENSOR-IMPORT.md`: verify archived
  bytes, reconstruct all recorded hours, reconcile fresh native snapshots before
  one-batch requests. Re-read uncertain writes; no blind retry.

## Validation/deployment

- Chart-only migrations use `INSIGHTS-CHARTS.md` and its builder; no workbook/page
  refresh or Apps Script deployment just for charts.
- `plant-chart-layout.mjs` copies P01 styling by verified role/binding. Preserve
  bindings/colors and maxima; use visible A:J width and fresh plotted minima
  with a 250 g base/measured headroom for floors. Verify rendered ticks despite
  native rounding; weight labels off, markers/hover intact. Recheck preconditions.
- `plant-page-presentation.mjs`: A1:J38, guarded labels/merges/formulas/formats/
  dimensions. Preserve formulas/evidence/full notes; no workbook refresh just for styles.
- Chart pixels/row heights are independent. Check all four chart gaps, A109 status,
  A139 backlink, A140 history. Use the guide's scoped row heights; reject hidden
  boundary rows/sheet-wide autofit.
- `workbook-upgrade.mjs` is one-time: recheck captured cells/empty destinations
  before writing. Prepare, apply formulas, verify calculations, create charts.
  Stop on drift/installed destinations; never clear/replay.
- Preserve unreviewed chart IDs/specs/positions.
  Basic metadata can omit charts; no-op `findReplace` with
  `include_spreadsheet_in_response: true` and no grid data returns full metadata.
  Apply helpers before charts; verify calculations/colors.
- `watering-intervals.mjs`: Pxx status A109/chart A111, hidden warning-protected
  helper outside AppSheet. Use whole-day gaps between distinct active Water dates,
  combine same-day setups/applications. Under two dates stays blank; no invented
  first interval, unfinished gap, or care schedule. Read full History, plot the
  latest 4,999 completed gaps, summarize all gaps. Preserve palette and explicit
  old bounds in historical one-time installation planners.
- Empty native charts may lose colors/labels/vertical-axis options yet retain
  bindings. Test empty-to-populated on a copy; reapply specs after real intervals
  if needed. No styling-only triggers.

- Behavior/schema changes: run `npm run test:logger`, `npm run test:logger:coverage`,
  `npm run check:logger`. Align server constants/row builders, client, tests/checker,
  AppSheet staging/mappings, public parsers/CSV, and runbook.
- For `.gs`: `npm run lint:apps-script`, `npm run typecheck:apps-script`.
  Client changes: check inline HTML/styles/client tests.
  Before deployment inspect synced artwork/published dependencies.
- Before live writes, back up in native Drive; freshly read headers/formulas/
  validations/last rows/request IDs/staging schemas/deployment/triggers.
- Keep native before/after metadata/cells privately ignored. Rehearse structure in
  native workbook/script copies; exactly compare History/staging/RO entries/formulas/
  chart IDs/specs/positions/protections/relative tab order.
- Reject snapshots over 40,000,000 UTF-8 bytes. Before release verify representative
  full-scale native refresh duration/payload size/daily trigger-runtime quota headroom;
  local timing cannot prove these.
- Drive copies include bound scripts; avoid competing functions. Never replay
  `sortSpecs` when extending History's BasicFilter: it re-sorts History.
- Appended native columns inherit validation. Replace rules only in new ranges;
  preserve existing-column validations.
- Run `installGardenLogger()`/`installAppSheetIntake()` only after source/tests agree.
- `npm run apps-script:status`: only `plant-tracker.gs`, `Index.html`,
  and `appsscript.json`. Source edits/`clasp push` do not update the versioned web app.
- Installers/queue-trigger reinstall: contract changes only. Verify
  `Connected · Logger <version>`, successful web-app/trigger executions,
  one five-minute `processQueuedAppSheetEntries` trigger.
