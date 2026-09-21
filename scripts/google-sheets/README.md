# Google Sheets observation logger

The prepared **Garden Plant Tracker** source roster has **34 active container allocations**, using IDs `P01`–`P32`, `P35`, and `P36`. The last recorded production roster remains 32 containers until the September 21 enrollment below is applied and verified. It keeps the physical pot label (`A1`, `F3`, `#2`, and so on) as a
separate value. That prevents a repot or label change from breaking a plant's
history.

The mobile logger and AppSheet are the observation input surfaces. The unused
`Quick log` compatibility tab is hidden. Every saved event becomes a new
append-only row on `History`.
The Dashboard, Insights, Baselines, individual plant tabs, and public website
all read from that shared history.

For everyday use, see the [watering strategy](../../docs/watering-strategy.md), [weighing strategy](../../docs/weighing-strategy.md), and [complete action guide](../../docs/logger-actions.md). The daily chat report and generated report page provide the adaptive care plan. The retired Daily care sheet is no longer a source or a second schedule.

The [Insights chart guide](INSIGHTS-CHARTS.md) covers the dry-down explorer at
**Insights A226**, its plant selector in **B228**, and the collection comparisons
for retained water, measured loss, forecast windows, and model evidence. The
**Current weight difference** comparison starts at **Insights A586**.
The [RO refill log](RO-REFILLS.md) records water-supply refill dates, amounts
for the four storage containers, and a chart of gallons refilled per visit.
The recorded September 20 production **Plant colors** sheet maps its 32 active containers to
consistent chart colors, with full names, swatches, and links to their charts.
Comparison charts keep P01–P32 order so colors stay attached to the same plant;
the cycle explorer changes color automatically with its selected plant.
Each active **P01–P32** page also has a **Time between waterings** column chart at
**A111**, below the three weight/dimension charts, with an automatic status at
**A109**. The bars show whole days between watering dates, with the later date
under each bar. See the [watering-interval chart guide](INSIGHTS-CHARTS.md#time-between-waterings).

## September 21 prepared Lithops and split-rock enrollment

**Prepared source only; production cutover pending.** Logger **5.29.0** supports **34 active allocations: P01–P32, P35, P36**. The last recorded production baseline remains logger **5.28.0 / immutable version 97**, AppSheet **1.100110**, and 32 enrolled pots. A source edit, build, or test does not establish a live deployment.

| New allocation | Collection record                    | Known state                                                                                                                                                                          |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P35 / #9       | Succulent-15, shared Lithops planter | Two owner-described pairs possessed by September 21; species, rooted-body count, nursery arrangement, leaf stages, medium, and last watering unrecorded. Shared planting is planned. |
| P36 / #10      | Succulent-16, split rock             | Probable Pleiospilos nelii, cultivar unconfirmed; the owner explicitly excludes Royal Flush. Separate repot planned; current leaf stage, medium, and last watering unrecorded.       |

P31 / #7 Peperomia Bicolor and P32 / #8 Tricolor oyster plant retain their assignments. P33/P34 remain retired. The collection now has **42 active profiles plus one historical profile**. These administrative allocations create no Water, Weigh, Repot, initial wet/dry reference, or completed pot setup. The September 22 incoming pots have no confirmed plant-to-pot assignment; see the [setup record](../../docs/setup.md) for the separate houseplant stool plan and current purchase evidence.

The prepared bulk schema appends **P35 weight (g)** and **P36 weight (g)** at **BG:BH**, making **60 physical columns, A:BH / 61 including AppSheet's \_RowNumber**. Preserve all existing A:BF values and ordering. BE:BF remain hidden, noneditable, blank-only retired fields. History stays A:AP and App entries stays A:AH. Queue reads support reviewed 54-, 56-, and 58-column schemas until deliberate enrollment; unrecognized columns or selected IDs fail visibly rather than dropping input.

The prepared model withholds forecast dates/windows and automatic watering dates for **P28, P35, and P36**. Their readiness is manual leaf-cycle inspection; a dry reference, plateau, or wrinkled old leaves alone does not authorize watering. Inspect each Lithops group before combining it. New empty histories display “No watering recorded.” No generic alternating-feed rule is introduced. See the [collection exceptions](../../docs/watering-strategy.md#collection-exceptions).

Prepared artwork revision **b86b51605d0afb26** and the maintained AppSheet expression target **GardenPlantPortraits-b86b51605d0afb26**. That private Drive folder still awaits publication; the matching source manifest is not proof that its 34 files are available to the live app. Keep the previous production folder available.

Cutover work still required:

1. Re-read native metadata, ledger/staging cells, formulas, validations, deployment, and the single five-minute queue trigger. Create a native Drive backup and recheck the guarded [inventory expansion](./inventory-expansion.mjs) against that fresh source state. The disposable-copy rehearsal below is retained evidence, not permission to skip current preconditions.
2. Apply only the reviewed preparation, value, post-value, and chart requests in that order; preserve canonical observations, existing chart IDs/positions, staging values, and RO data. The two post-value requests restore captured Quick log header formatting after native table expansion. Verify both new pages and empty histories. Use the scoped new-page helper only when its refresh is intended; do not substitute a broad workbook refresh for the migration.
3. Regenerate AppSheet to 61 columns, configure optional positive Decimal P35/P36 weights with the existing weighing visibility rule, and order them after P32. Install the maintained [34-weight validation](./appsheet-bulk-validation.txt), retaining both retired blank guards. Keep canonical/helper tables read-only and staging writable. Retain the creation-only id528 key marker and P31/P32 stale-draft guards.
4. Export/synchronize the reviewed artwork, publish the matching private portrait revision, and update its AppSheet expression consistently. Push only the three bound-script files; create an immutable version and update the existing deployment in place. Confirm the phone logger version, successful executions, exactly one queue trigger, saved AppSheet configuration, and preserved ledger counts/IDs/values. Do not submit test observations to production.
5. Publish the matching website sources and update the existing daily task with the reviewed P35/P36 identity and leaf-cycle exceptions, retaining its 9:45 a.m. America/New_York schedule. Editing the checked-in prompt alone does not update that task.

Final local preparation validation passed **993 logger tests** with 99.48% statement, 98.19% branch, 100% function, and 99.71% line coverage, preserving the 90% floors. Full typechecking and the website build/check passed with 43 profiles and 34 pot allocations. Production verification remains a separate requirement.

**Native-copy rehearsal, September 21:** the [disposable workbook](https://docs.google.com/spreadsheets/d/1veKWNBOeSW40GlJTwDWeD3tq-vbbB2qlt9iYfT9ZBG4/edit) has 58 tabs and 164 charts, with P35/P36 pages at sheet IDs **202609350 / 202609360**. The final strict comparison passed **1,001,413 cells / 4,005,652 fields**, including **324,000 canonical, staging, and RO cells**, with no unexplained differences or formula errors. All **156 original chart identities and positions** remain intact, with only the reviewed inventory/specification changes, plus eight new charts. Private evidence is retained under `.cache/mesemb-enrollment-20260921/`; the final receipt is `rehearsal-final-verification.json`.

The two three-role selector charts required the [36-series design](INSIGHTS-CHARTS.md#september-21-selector-series-capacity) after a populated native probe silently truncated 102 requested series to 99. All **19,996 shared-role values** matched their original raw data, with four numeric sentinels at blank domain coordinates. Selecting both empty P35 and P36 preserved every chart specification and position; the original P27 selection was restored. The migration also corrects twelve captured Dry-down insights formulas whose local lookups still ended at the first 30 pots. New shared helper columns extend Plant color data through EU and Workbook analytics through DJ, with inherited formatting verified across all appended cells.

The copy's bound source and calculated model cells exercised the new roster and manual leaf-cycle output. A separate no-write verification helper was uploaded but **not executed** because the copied project requested a new authorization grant; no new grant was accepted. Production remains unchanged.

Empty native charts retain bindings but discard some series styling and vertical-axis settings. Temporary values in six derived helper anchors on the copy proved all eight new charts' bindings; reapplying their planned specifications while populated verified their colors, line/marker styles, axes, and labels. All six formulas were restored and every temporary numeric spill value was confirmed absent. Recheck and reapply the scoped specifications after the first real measurements or watering intervals; do not manufacture production observations to retain formatting. Two newly duplicated watering charts required recreation with the same new IDs and positions because `updateChartSpec` retained the template's P30 alternative text. Existing production chart identities are never recreated by that workaround.

## September 20 owner-requested houseplant reassignment

The owner explicitly reassigned **Peperomia Bicolor from P33 / #9 to P31 / #7** and **Tricolor oyster plant from P34 / #10 to P32 / #8**. Their botanical inventory records remain Houseplant-03 and Houseplant-04. The canceled, unreceived Amazon plants retain their archived research but have no active tracker ID or physical label. This specific authorization supersedes the earlier reservation of P31/P32; it is not a general policy of recycling IDs that have observation history.

Logger **5.28.0** and the maintained mappings use **P01–P32**. The native houseplant sheets retain IDs **202609330** and **202609340**, their existing charts, and their history links while their titles and formulas change to P31/P32. Old website links for P33/P34 redirect to the corresponding current pot; Amazon botanical-slug links still lead to the archived plan. Acquisition-photo filenames retain their original `p33`/`p34` fragments so existing evidence URLs remain valid.

`App bulk` remains **58 physical columns, A:BF / 59 including AppSheet's `_RowNumber`**. **BC:BD**, named P31/P32 weight, now belong to the purchased houseplants. **BE:BF**, named P33/P34 weight, remain hidden, noneditable compatibility columns and must be blank. The server rejects retired IDs and nonblank retired weights. `History` stays A:AP and `App entries` stays A:AH; no schema width, observation, pot setup, watering rule, or forecast model changes.

Freshly created mobile payloads include the inventory revision `id528`. The token is captured when the draft is created and is never added to a restored old draft merely to make it pass validation. AppSheet's Entry ID and Round ID use the maintained [creation-only initial value](./appsheet-entry-id-initial-value.txt), `CONCATENATE("id528-", UNIQUEID())`; retry actions preserve the original keys. Do not enable reset-on-edit or rewrite existing keys. This creation marker prevents a stale Amazon form from silently attaching an entry to a different plant after the ID reuse. An affected old draft must be reviewed and recreated using the current inventory; its original values remain recoverable. P01–P30 intake and successful-request idempotence remain unchanged. Bootstrap cache V3 prevents an older roster from initializing the new client.

The guarded [houseplant reassignment planner](./houseplant-renumber.mjs) uses fresh metadata and cell preconditions. A [native backup](https://docs.google.com/spreadsheets/d/1dAIqSnQ4QXpdfl-5DQkNzTy4Gs1DeNHAKFHGWU8v9EM/edit) and [disposable rehearsal](https://docs.google.com/spreadsheets/d/1gFiyiu-5CVbB6L_h4CVcK48dS54XfklqkKrOyAXN0ug/edit) were created before migration. The initial live snapshot contains **1,075 History records**, **38 saved App entries**, empty App bulk staging, and no P31–P34 observations. Full private proof is retained under `.cache/renumber-houseplants-20260920/`.

**Production cutover, September 20, 2026:** fresh guarded cells still matched the backup before the atomic **128-request** native update. It implements 1,126 logical changes, combining 999 identical dropdown-cell validations into one equivalent range request. The native-copy rehearsal compared **514,087 captured cells** without unexplained value, formula, note, validation, or format changes and preserved all **156 chart definitions** against production. The workbook still has 56 tabs; both houseplant tabs were renamed in place.

The complete production readback then passed the same **514,087-cell** comparison with zero unexplained changes and zero formula errors. All **156 chart specifications and positions**, **1,075 History records**, saved staging rows, and RO data were preserved. Both new IDs display the correct partial-drying/manual-readiness guidance with no invented forecast or observation. The native proof is `production-verification.json` and `production-summary.json` in the private audit folder above.

Logger **5.28.0 / immutable version 97** is deployed at the existing phone URL. Production HEAD and version 97 each contain exactly three files matching the maintained source after newline normalization; the disposable rehearsal helper was not deployed. The Google V8 rehearsal verified stale/fresh mobile and AppSheet identity handling without writing observations. **AppSheet version 1.100110** is saved and confirmed after an editor reload. The current portrait folder retains its existing artwork revision, with correct P31/P32 copies added alongside the older P33/P34 files; the active mapping contains only P01–P32. The existing daily task changed only the two houseplant identity strings and retains its **9:45 a.m. America/New_York** schedule and care rules.

## September 20 purchased-houseplant enrollment

This earlier same-day enrollment is a historical deployment record. The owner-requested reassignment above supersedes its P33/P34 labels, reserved-ID policy, and active bulk-field assignments.

Checked-in logger **5.27.0** enrolls **P33 / #9 Peperomia Bicolor** and **P34 / #10 Tricolor oyster plant** alongside P01–P30. The owner confirmed buying both in nursery pots directly at Carlson's Greenhouses on September 20; the tags also identify Carlson's as the grower. The field guide now contains **41 profiles: 40 active and one historical, across 32 tracked containers**. P31 / #7 and P32 / #8 remain archived, reserved allocations for the unreceived Amazon order; this enrollment does not reuse them.

The current `App bulk` contract is **58 physical columns, A:BF / 59 including AppSheet's `_RowNumber`**. Append **P33 weight (g)** and **P34 weight (g)** at **BE:BF**, preserving existing **A:BD**, all stored rows, and the deprecated P31/P32 compatibility fields at **BC:BD**. Those archived fields stay hidden, noneditable, and blank-only; the server rejects nonblank archived weights or archived selected IDs. Round validation covers the **32 active weights** plus both archived-field guards. `History` remains **A:AP**, and `App entries` remains **A:AH**. The reviewed new plant-tab IDs are **P33: 202609330** and **P34: 202609340**; active identity order is P01–P30, P33, P34, not a continuous P01–P32 sequence.

Both new plants require **manual moisture/readiness checks**. P33 should partially dry without prolonged whole-pot drought; P34 uses an upper **1–2-inch** check scaled to its actual root-ball depth once known. Weight trends can support those checks, but a cactus plateau, old dry reference, or model date does not establish readiness. No weight, Water, Repot, arrival-time observation, or physical pot setup is fabricated by administrative enrollment. Both current nursery pots are 6 inches and described by the owner as quite full; depth, drainage, and existing medium remain unrecorded. The owner confirms two Amazon Basics eight-inch pots with drainage holes and plans to place them on floor stools, off the tables, using greenhouse-supplied airy/perlite-containing mix blended with Molly's; proportions, completed repots, and actual positions are not yet recorded. See the [watering exceptions](../../docs/watering-strategy.md#collection-exceptions).

The [native pre-enrollment backup](https://docs.google.com/spreadsheets/d/10BwubhPU93E8Fe27bh28RHLRCpqh1rXmxYO9rlRq1-8/edit) and [disposable rehearsal workbook](https://docs.google.com/spreadsheets/d/1yrYo-S3hhyK3ylXhmdV4325xZ6hk0Xo5PJF1p-mbSRw/edit) are recorded for this change. The guarded [purchased-houseplant planner](./purchased-houseplants.mjs) preserves reserved IDs, existing bulk columns, and captured source-state preconditions. Artwork revision **8dcdcf679f29f69a** has **32 verified active-roster SVG files** in [GardenPlantPortraits-8dcdcf679f29f69a](https://drive.google.com/drive/folders/1OnqXO0SUxgRBy1cYWjeU5Ua4Lo63g9XO); retain older revision folders for existing clients.

**Native enrollment verified September 20, 2026:** the fresh production readback checked **505,287 captured cells** with zero unexplained value/note changes or formula errors. All **1,075 History records**, **38 App entries**, empty App bulk staging, and RO records were preserved. The workbook has **56 tabs and 156 charts**; all **148 existing chart IDs, specifications, styles, and positions** remain intact apart from the intended roster extensions and native color serialization. The audit also preserved **10,099 existing populated-cell formats**. Each new page has four charts and a warning protection. Insights retains its P27 selection with the updated 32-pot validation and note. Both new plants show “No watering recorded” and “Manual houseplant readiness; weigh when useful”.

Logger **5.27.0 / immutable version 96** is deployed at the existing phone URL. A fresh pull of all three production source files matched the maintained files after line-ending normalization. Website commit **f980314** passed Pages, logger coverage, SonarCloud, Socket, and both secret scans; the two profiles, local acquisition photos, and portraits were verified publicly after deployment. The existing daily review task retains its **9:45 a.m.** schedule and now includes both houseplant exceptions. Their separate Gyazo albums remain pending service availability; local evidence photos are already published.

**AppSheet version 1.100109 is saved.** A fresh editor reload confirmed the version and disabled Save state. Its 59-column schema retains all 57 pre-existing column settings, adds optional positive Decimal weights for P33/P34 with the existing weighing visibility rule, and orders the bulk inputs P30, P33, P34, Notes. The Round action uses the maintained 32-weight expression and both archived blank guards. Verification uses empty forms and read-only views; no synthetic observation is submitted.

**Purchase and pot-plan follow-up, September 20:** after a [native backup](https://docs.google.com/spreadsheets/d/16xAM_pBeoaHFG6TbTWgIWqBafT0OGI9AsAPZGrq7Is8/edit), only `Plant tracker!AB32:AC33` and `AE32:AE33` changed. These six values record the owner-confirmed six-inch nursery pots, direct Carlson's purchase, and explicitly planned Amazon Basics eight-inch drainage-pot repots/floor stools. Native before/after comparison preserved all captured formats, formulas, validations, canonical History, and staging rows, including 1,075 unique observation IDs. No Repot, Water, Weigh, or new pot setup was created. Logger 5.27.0 / immutable 96 and the single five-minute queue trigger were verified without redeployment. Private before/after proof is under `.cache/purchased-houseplants-20260920/floor-plan-*`.

## September 20 canceled-order withdrawal

This earlier same-day contract is historical; the purchased-houseplant enrollment above supersedes its active counts and bulk-column width.

Logger **5.26.1** returned the active roster to **30 containers, P01–P30**. The owner requested cancellation of the five-plant Amazon order; retailer cancellation was still pending. The four components formerly assigned to shared `#7` / `P31` and separate Nanouk `#8` / `P32` remained archived in the guide. Those IDs were reserved at this stage, before the owner's explicit reassignment later the same day. No arrival, repot, death, or measurement was inferred from the withdrawal.

Active inventory/model/calculation rows end at **31**, Dashboard data at **36**, and active plant pages at **P30**. The generalized bounded formulas and empty-history safeguards remain. The September 19 expansion record below is historical; the completed withdrawal is recorded in the September 20 deployment entry.

`App bulk` deliberately retains **56 physical columns / 57 including AppSheet's \_RowNumber**. Existing **A:BB** and all stored rows stay intact. **BC:BD**, still named **P31 weight (g)** and **P32 weight (g)**, are deprecated compatibility fields: hide them, make them noneditable, and require both blank in AppSheet. The server rejects any nonblank archived field before processing the entire round, even for a non-weighing action. Archived selected IDs and detailed/mobile drafts also fail clearly instead of silently losing their values. Blank compatibility columns remain acceptable, and the previous 54-column staging reader is retained.

AppSheet's active picker and portrait mapping cover P01–P30. The maintained Round action validation checks those 30 weight fields and separately requires both archived fields blank. Keep all old revisioned portrait assets for cached clients and archived pages. Do not run an installer or recreate archived pages merely to remove them from the active UI. Native changes require a fresh backup, rehearsal, and precondition/readback checks; verified deployment details are recorded separately.

For phone entry, open the
[mobile entry app](https://script.google.com/macros/s/AKfycbytpdMto4ZAqOf49igDNoGYr-J6fmSRDNJOKP4-dKDFRmM2YkTCKJp3kmhrD4gOJShF/exec).
It writes to the same workbook and may ask you to sign in to the Google account
that has access.

Google Sheets formulas cannot preserve a value after an input cell is
overwritten. The bound Apps Script in
[`plant-tracker.gs`](./plant-tracker.gs) supplies that write-time archive step.
[`Index.html`](./Index.html) is the mobile entry UI, and
[`appsscript.json`](./appsscript.json) records the project runtime settings.

## Photo links in logger 5.24.0

The checked-in logger accepts Google Photos share links and exact Gyazo capture
links (`https://gyazo.com/` followed by a 32-character lowercase hexadecimal
capture ID). The same validation applies to new Photo events and corrections.
The form names both providers, and the public history uses a neutral Open photo
label. Direct image URLs, unexpected ports, credentials, spoofed hosts, and
malformed capture IDs are rejected. Existing Google Photos share links remain
supported.

Selecting Check and Photo in one save preserves two event-specific History rows
with the same save group. The photo URL belongs to the Photo row; condition and
notes retain the inspection evidence. This needs no schema migration, installer,
or queue-trigger change.

On **September 16, 2026**, logger **5.24.0** was deployed as immutable Apps Script
**version 91** at the existing mobile-entry URL. All three deployed project files
matched the checked-in source and current script head. Verification confirmed
exactly one five-minute `processQueuedAppSheetEntries` trigger and a zero-percent
trigger error rate. No photo observations had been written at this verification
point; photo publication and the real inspection records are separate steps.

## Deployment records

### September 20 canceled-order withdrawal (5.26.1 / immutable version 95)

The live workbook returned to **30 tracked containers, 54 tabs, and 148 charts** after the owner withdrew the unreceived Amazon purchase plan. Retailer cancellation remains pending. A [native backup](https://docs.google.com/spreadsheets/d/1ozRJtoaphoN21Pde1kZOJrjyAydgCGV6htJnJZAU5vM/edit) and [disposable rehearsal](https://docs.google.com/spreadsheets/d/1WdsW3xGtzUmDypdjO9SMEbYjbJpHgR2LgtyiI41AIkg/edit) preceded production changes. The guarded [withdrawal planner](./inventory-withdrawal.mjs) refuses unexpected inventory, observations for the withdrawn pots, nonblank archived bulk weights, stale captured data, and repeat application.

Rehearsal passed **310 checks**. Fresh production reads then guarded **2,358 value/formula requests, 47 metadata updates, 24 chart updates, and the two sheet deletions**. Production verification passed **460 checks**, with every remaining chart ID, position, and intended specification retained. All **1,075 History observations**, App entries, App bulk, and RO refill values, formulas, and notes matched the immediate prewrite snapshots. A deeper comparison verified **195,304 captured cell values** against the planned result and found no formula errors or active references to the withdrawn pots. Native banding normalization removed two explicit header-format overrides in hidden `Quick log!N4:O4`; those exact original formats were restored and verified. Existing pot setups and care observations were not changed.

**AppSheet version 1.100107** is saved and verified after a fresh editor reload. Its two deprecated bulk fields are hidden, noneditable, and blank-only; the Round action expression checks the 30 active weights and both blank guards. Bulk Log contains exactly 30 blank weight inputs, natural label order ends at #6, and portraits use the existing `GardenPlantPortraits-247fa8a658d6a14b` revision. All 56 physical App bulk columns remain. The live form was inspected and canceled without saving an observation.

Logger **5.26.1** is deployed as immutable Apps Script **version 95** at the existing mobile-entry URL. All three immutable files match the maintained source; the live logger reports 5.26.1 and exposes exactly 30 selections, ending at #6 / P30. Version 95 `doGet` and `getWebAppBootstrap` executions completed at **2:14 a.m. EDT**, and the existing five-minute `processQueuedAppSheetEntries` trigger completed at **2:13 a.m. EDT**. There remains exactly one queue trigger. Neither a workbook installer nor a trigger replacement was used. The existing daily review task still runs at **9:45 a.m. America/New_York** and now excludes abandoned purchase plans from active care decisions.

### September 19 inventory expansion (5.26.0 / immutable version 93)

At the September 19 expansion, the native workbook had **32 tracked containers, 56 tabs, and 156 charts**. `#7` / `P31` is one eight-inch shared planter with four individual botanical profiles; `#8` / `P32` is Nanouk in its separate four-inch drainage pot without a saucer. Both begin with no invented observations, wet/dry references, or watering dates. The website inventory has 41 profiles: 40 active and one historical.

The [native backup](https://docs.google.com/spreadsheets/d/18rGeQDdACX-3ihVSHGxcE_LVzLx_hzOis45NPIHzYSQ/edit) and [disposable rehearsal](https://docs.google.com/spreadsheets/d/1EypaSaC2ers5LB9Ldzdo_biFWqNdYhk80j4H9QhB83U/edit) were created before production changes. Rehearsal verified empty histories, 96/97/98-record history spills, responsive setup/medium formulas, date/date/numeric-day watering helpers, filters, conditional formatting, and retained chart bindings. Synthetic observations were confined to that copy and removed afterward. Google Sheets omits empty chart series from its API readback; the rehearsal confirmed they reappear when real numeric source cells become available. New-chart finalization preserves template series instead of treating that empty representation as the complete chart definition.

Production first applied 84 preparation requests, 2,640 value/formula requests, and 32 chart updates. It preserves all 148 pre-existing chart IDs and positions and adds eight charts for the new pages. A separate metadata pass retained filters, banding, and conditional formatting. Four initially deferred requests then appended/formatted `BC:BD` and wrote the two new bulk-weight headers alongside the authenticated AppSheet schema update. Final readback preserved all **1,048 History observations**, with no blank or duplicate Observation IDs and no P31/P32 observations. App entries, the original App bulk **A:BB**, and RO refill values also matched their immediate pre-migration reads. The new records and relevant formula outputs were error-free on native readback.

**Production AppSheet version 1.100106 is saved.** App bulk was regenerated to **57 columns including `_RowNumber`**. P31/P32 use optional Decimal fields with positive-number validation and the existing Weigh / Water + weigh visibility rule. The Round action expression checks all 32 weight fields, and Bulk Log displays the two new fields immediately after P30. Natural label order includes **#7 / 907** and **#8 / 908**. All 32 portraits were uploaded to `GardenPlantPortraits-247fa8a658d6a14b`, and the saved portrait expression uses that revision. A fresh editor reload verified these settings. The live Plants view rendered both new portraits after #6, and Bulk Log displayed all 32 blank weight inputs; the form was canceled without saving an observation. The original staging fields and canonical observation ownership remain unchanged; neither broad AppSheet installer was run.

Logger **5.26.0** is deployed as immutable Apps Script **version 93** at the existing phone URL from source commit `371e3ebad5d6ed39605f0576b5ef8e24d1ae0da4`. Remote script head and all three immutable files matched the maintained sources. Authenticated UI checks confirmed both new selections, their eight-inch/four-inch pot sizes, empty histories, and the connected version. The project retains exactly one **five-minute** `processQueuedAppSheetEntries` trigger with **0% errors**. Version 93 `doGet` and `getWebAppBootstrap` executions completed at **8:30 p.m. EDT**, followed by successful queue executions at **8:33 and 8:38 p.m. EDT** on September 19.

The source checks passed: 1,189 Node unit tests, logger coverage above the existing floors, 33 Storybook tests and its coverage gates, 210 Chromium/mobile browser tests, type checks, source lint, formatting, publication checks, and secret scans. Full external-link checking encountered existing SANBI/Wiley HTTP 403 responses; the new profile sources passed. The exact release commit passed Pages, logger, SonarCloud, Codecov, Gitleaks, and TruffleHog checks. Public checks returned HTTP 200 for the five new individual profiles, both pot histories, and their artwork. The existing daily report task retains its 9:45 a.m. Eastern schedule and now includes the new container-specific care rules.

### Workbook analytics upgrade (5.25.0, September 17, 2026)

The maintained source and guarded migration add plant history below the charts,
watering/feeding/photo summaries, shared calculation timestamps, two Insights
charts, an eight-week watering calendar, and an RO refill summary. See the
[analytics operator guide](WORKBOOK-ANALYTICS.md) for locations, evidence limits,
migration phases, and the verification record.

The combined release also includes the validated client changes from commit
`80d88ee`: accessible inline **Use current time** controls for single and bulk
entry, a correction pencil at the top of History, badges below plant names at
mobile widths, and readable metadata pills with local times. Exact ISO values
remain in time attributes and titles. These changes preserve time capture,
save, and retry behavior.

**The September 17 production verification used immutable Apps Script version 92** at the existing
phone URL, from release commit `7cc15d6f23752be44ed0e13fc479656c652f1286`.
The verified workbook has **54 tabs and 147 charts**, including **25 Insights
charts**. All 2,973 planned written values/formulas match native readback, and
Integrity reports **0 formula errors**. Canonical History, staging, and RO entry
ranges retain their values, notes, and validations exactly. The single
five-minute queue trigger remains in place. See the
[full production record](WORKBOOK-ANALYTICS.md#production-verification) for
chart/protection comparisons, source verification, and checks.

### September 17 dry top-dressing normalization

The owner added top dressing on September 16, 2026, recorded paired scale readings, and confirmed on September 17 that the stones were bone dry. At the owner's explicit request, 30 earlier P21 weights received **+108 g** (1,638 → 1,746 g) and 29 earlier P22 weights received **+150.5 g** (841.5 → 992 g). All affected records use setup 1. This one-time reviewed correction preserves that setup and learned history; it does not implement automatic mass compensation for later changes.

The native backup **Garden Plant Tracker — before top-dressing weight normalization — 2026-09-17** is in **Archive → Garden Plant Tracker Backups**. The write changed only 59 `History!E` weights with original-value cell notes, the explanatory notes at `History!I1018:I1019`, and `Integrity!A13:B13` / `D13`. The earlier owner-corrected P22 reading of 934.5 g is now 1,085 g on the normalized basis; its original correction provenance is retained, and the integrity formula accounts for the additional 150.5 g.

Readback verified all **1,019 observations**, **1,019 unique Observation IDs**, and **922 distinct Request IDs**, with no changes to timestamps, watering events, setup numbers, status, remaining history cells, staging entries, or baseline formulas. All **660 model output cells** matched the checked-in detector run against the adjusted data. The other 28 pots' models were unchanged; earlier weight differences, wet-to-dry capacities, and eligible learned cycles were preserved. Integrity reports zero formula errors and zero active trend-review flags at this verification.

The post-dressing readings remain **1,746 g for P21** and **992 g for P22**. Derived dry/wet references became **1,637 / 1,746 g** and **991.5 / 1,166.5 g**, respectively. Future readings use actual scale values without another offset. At this correction's verification, the logger was **5.24.0 / immutable version 91**, with its single five-minute queue trigger; this data correction required no Apps Script deployment or schema change. See the [weighing strategy](../../docs/weighing-strategy.md#recorded-dry-top-dressing-adjustment).

### Workbook presentation and Daily care retirement (September 16, 2026)

All **51 remaining sheets** and **145 charts** use **JetBrains Mono** explicitly.
This sets cell fonts and chart text; the workbook theme's limited font selector
is not the source of this preference. Existing chart IDs, data ranges, positions,
colors, sheet order, and owner protections are preserved.

Every sheet has a whole-sheet protection. New protections warn before manual
edits, including on P01–P30, so automated logger/AppSheet writes continue.
**RO refills A20:I and K20:M** remain editable for dates, amounts, and notes;
column J's totals and the headers stay protected. Google still lets an owner
edit a restricted sheet, so warning protection is the useful accidental-edit
prompt here. Quick log is hidden for compatibility, with no pending inputs.

**Daily care is removed.** Use the existing 9:45 a.m. Eastern daily chat report
and [generated report page](../../docs/daily-reports/README.md). Dashboard U3/W3
now link directly to Integrity A4:D21. Integrity B12 no longer scans the deleted
tab; it continues to exclude the Dashboard indicators to avoid a dependency
cycle. History, report policy, and the daily schedule are unchanged.

The guarded [presentation migration](workbook-presentation.mjs) uses a fresh
native backup and rehearsal copy. It changes only the three dependent formulas,
cell/chart fonts, protections, Quick log visibility, and the retired sheet.
Pass the RO chart ID in the native-editor exclusion list: a full Sheets API
chart rewrite drops its custom axis-title colors. Set its data-label font in
the chart editor instead, then compare all non-font metadata.

Logger **5.23.2** removes Daily care from the menu and automatic refresh, retains
the owner's tab order/visibility, and uses JetBrains Mono when rebuilding a
Dashboard or plant page. Its legacy Daily care installer remains only for old
workbook copies; **do not run it on production**. No schema or intake change is
required for this release. Do not run a full view refresh for this migration:
it would replace owner layouts and chart-adjacent content.

The migration verified **911 observations**, **911 unique Observation IDs**,
and **844 distinct Request IDs**. History, App entries, App bulk, and RO refill
values/formulas/validations matched their captured ranges exactly. Integrity
reports **0 formula errors**; all 145 chart specifications and positions match
their previous values after excluding the intended font changes. The source
release is immutable Apps Script **version 90**; update the existing phone
deployment in place and retain the single five-minute queue trigger.

Validation: **943 Node tests**, including **788 logger/migration tests**, with
logger coverage at **99.7% lines, 98.16% branches, and 100% functions**; Apps
Script/build/test typechecks, source-contract checks, changed-source ESLint,
Markdown, formatting, generated-page checks, and both secret scans passed.

### Per-plant watering intervals (September 16, 2026)

Added **Time between waterings** charts to all **30 plant pages**, with the
latest completed gap or waiting message at **A109** and the chart at **A111**.
The formula-based helper updates automatically from active Water dates. The
current records yield **45 completed intervals**; P24, P25, P26, P28, P29 and
P30 each await a second watering date. The existing Days since water header
continues to show the unfinished current gap.

The native backup **Garden Plant Tracker — before watering interval charts —
2026-09-16** and separate rehearsal copy are in **Archive → Garden Plant
Tracker Backups**. Post-write readback preserved all **911 observations**,
**911 unique Observation IDs**, **844 distinct Request IDs**, and the checked
AppSheet staging schemas, values and validations. All **115 existing chart
IDs, specifications and positions** remain unchanged; the additions bring the
workbook to **145 charts**. The Integrity check reports **0 formula errors**.
Every calculated interval matched an independent calculation from History.

The rehearsal covered out-of-order and same-day entries, Removed records,
non-Water events, missing/invalid dates, zero/one watering, and automatic
updates after a second watering. Test observations exist only on the rehearsal
copy. Google's empty-series styling limitation and repair procedure are in
the [chart guide](INSIGHTS-CHARTS.md#time-between-waterings).

The logger remains **5.23.1 / immutable version 89**; the production deployment
assignment and exactly one five-minute Head queue trigger were verified. This
chart migration needed no Apps Script deployment or AppSheet regeneration.
Validation passed **779 logger tests** with **99.7% line / 98.17% branch
coverage**, the source-contract check, build-script type checking, scoped
JavaScript lint, Markdown lint, formatting, link-input smoke and diff checks.

### Current observation times (5.23.1)

Published September 15, 2026 as immutable Apps Script **version 89** at the
existing phone URL. All three immutable source files match the release, and the
authenticated app reports **Connected · logger 5.23.1**. Logger and AppSheet
intake verification succeeded without a schema migration; queue installation
replaced one predecessor with exactly one five-minute Head trigger.

The native backup **Garden Plant Tracker — before current-time logger fix
5.23.1 — 2026-09-15** is in **Archive → Garden Plant Tracker Backups**.
Production verification preserved all **886 observations**, **886 unique
Observation IDs**, **819 distinct Request IDs**, all **115 chart IDs and
titles**, and the checked History, model, and AppSheet cells. Integrity still
reports **0 formula errors**. That deployment left historical Water times
unchanged; the separate owner-confirmed correction below followed afterward.

Validation passed **923 unit tests**, including **779 logger tests** and 14 new
timing regressions. Logger server coverage remains **99.7% of lines** and
**98.17% of branches**. Types, lint, formatting, HTML, and secret checks passed.

Single-entry and bulk-care **Observed at** fields now follow the current device
time until the entry is saved or queued. Leaving the page open no longer assigns
later care to the page-opening time. Editing the date fixes that chosen time;
**Use current time** returns the field to automatic timing. The hint identifies
which behavior applies, and automatic fields refresh each minute and when the
page resumes.

Queuing captures the observation time immediately. Uploading that queue later,
retrying a save, or recovering a pending entry after a reload preserves the
original instant and request ID, including seconds hidden by the minute-level
date control. A local-storage failure does not leave a falsely pending entry
that prevents a later save. The **Recorded** column still identifies when Google
saved the observation.

This interface fix does not rewrite historical event times or change the
drying detector. Correct an affected Water event using its actual care time;
retain valid pre-water measurements in their original sequence.

### September 14 watering-time correction

On September 15, the owner confirmed that the September 14 watering followed
the weigh-ins and occurred at approximately **8:30 p.m. Eastern**. The native
backup **Garden Plant Tracker — before September 14 watering-time correction
to 8:30 PM — 2026-09-15** is in **Archive → Garden Plant Tracker Backups**.

Only `History!A866:A883` and `A886:A887` changed: the 20 active Water events for
P01–P18, P23 and P27 moved from 7:41 p.m. to 8:30 p.m. The earlier scale readings,
Recorded times, nutrients, provenance, removed originals, formulas, date formats
and validations matched the backup. All 886 observations, 886 unique Observation
IDs, 819 distinct Request IDs and 115 charts remain present, with zero formula
errors. The model now correctly awaits a drained weight for each of these pots;
none of their pre-water readings acts as the new wet reference. The September 14
report records the correction and preserves its original report date.

### Improved drying detector (5.23.0)

Published September 14, 2026 as immutable Apps Script **version 88** at the
existing phone URL. All three immutable source files match this release, and
the authenticated app reports **Connected · logger 5.23.0**. Logger and AppSheet
intake installation succeeded; intake needed no schema migration. The queue
installer replaced one predecessor with exactly one Head trigger scheduled
**every five minutes**, followed by a successful scheduled execution.

The native backup **Garden Plant Tracker — before improved drying detector
5.23.0 — 2026-09-14** is in **Archive → Garden Plant Tracker Backups**. A separate
native copy rehearsed the detector formula and matched all **660 model output
cells** for all 30 pots. Production matched the same calculations and preserved
all **886 observations**, **886 unique Observation IDs**, **819 distinct Request
IDs**, the checked History/AppSheet values and validations, and all **115 chart
IDs and titles**. Integrity reports **0 formula errors**. The only direct
workbook write reapplied the existing `Dry-down models!A2` formula; History was
not corrected or populated with test records.

Validation passed **909 unit tests**, including **765 logger tests**, and **30
Storybook browser tests**. Logger coverage is **99.7% of lines** and **98.17% of
branches**. Source-contract checks, types, lint, formatting, HTML, the Pages
build, and secret scans passed. The build reused the existing validated image
cache after a Gyazo thumbnail request returned HTTP 503.

The detector evaluates a reached previous pre-water reference and a sustained
plateau independently. Either can advance a moisture inspection; when both
agree, the workbook and logger say so. These remain observation prompts, with
the usual moisture and plant checks assumed before watering.

- A reference crossing can qualify after two distinct current-cycle readings.
  The starting wet weight must be meaningfully above the reference; a supposed
  wet weight already below it instead gets a timing/reference warning.
- Plateau evidence needs four readings at least 12 hours apart, spanning
  2–10 days. Frequent same-day reweighs no longer displace this useful tail.
  There is no seven-day minimum or requirement to reach zero daily loss.
- The earlier decline must span at least a day, start at least 24 hours after
  Water, and exceed 4 g; total measured loss must be at least 10 g. Least-squares
  rates use all selected timestamps. Tail loss must be at most 20% of the earlier
  rate, and its spread at most 5% of total loss, with a minimum 2 g allowance.
  A net tail gain of up to 2 g is treated as scale noise. Renewed loss exceeding
  2 g and 40% of the earlier rate invalidates the plateau.
- Missing old dry or timely wet references still prevent a calibrated future
  forecast, but do not hide a supported observed plateau. Late measured weights
  remain available for recent-weight metrics without inventing a wet anchor.
- A nearly unchanged pot with no demonstrated earlier decline is explicitly
  uncertain. Unexpected gains, partial watering, invalid boundaries, estimates,
  removed records, and setup changes retain their guards. P21 and P28 retain
  manual decisions, and shared planters retain component/drainage checks.

These thresholds are adjustable heuristics, not validated moisture cutoffs.
History, inferred weight-state rules, and the 22-column model schema are
unchanged. The daily task runs the same source through
[`analyze-drying.mjs`](../analyze-drying.mjs); see its
[snapshot contract](../../docs/daily-reports/README.md#shared-detector-analysis).

### Forecast input and guidance audit (5.22.1)

Published September 13, 2026 as immutable Apps Script **version 87**, preserving
the existing phone URL. All three immutable files match commit `895e728`; the
authenticated app reports **Connected · logger 5.22.1**. The audit adds these
focused fixes:

- Only actual numeric cells can enter weight calculations. Numeric-looking
  text and booleans no longer become apparent scale readings or a crossed
  old reference.
- An undated Water or Repot in the current setup withholds the forecast and
  recent-cycle metrics, because its position relative to the curve is unknown.
  Removed records and older setups do not block a valid current cycle.
- Readiness identifies a missing wet reference, completed cycle, or invalid
  anchors instead of asking for four readings when they already exist.
- Plateau and crossed-reference tooltips explain the inspection evidence.
  A missing-reference tooltip explicitly avoids watering to create data.
- The logger calls the modeled range **Dry-check window**, replacing
  **Reweigh**: that range predicts proximity to an old weight reference and
  is not the next weighing appointment. Daily care retains its separate
  daily/every-other-day measurement cadence.
- All three shared containers, P19/P20/P30, require component and drainage
  checks. Money tree and Royal Flush retain manual watering decisions.

The live-data rehearsal and production readback use all **839 current
observations**, with **no numeric forecast changes** for the current records.
The audit does
not introduce a fixed gram-per-day watering cutoff, rewrite dry/wet anchors,
reset setups for a lighting change, or shorten dates merely because two lights
are now installed. The model cannot infer current root-zone moisture or a
changed light field from the scale alone. See the
[care audit](../../docs/care-notes.md#september-13-forecast-review) and
[installed-light decision](../../docs/equipment/aw200-and-aerolight-240w.md#recommended-starting-decision).

The native backup **Garden Plant Tracker — before lighting and forecast audit —
2026-09-13** is in **Archive → Garden Plant Tracker Backups**. The logger and
AppSheet intake installers completed successfully; intake required no schema
migration. The queue installer replaced one predecessor with one Head trigger
scheduled **every five minutes**.

Production retains **839 unique Observation IDs**, **772 distinct Request IDs**,
and the checked History, Baselines, Plant tracker, and AppSheet staging values
and validations. All **114 chart IDs and titles** are unchanged; no chart write
was needed. Integrity reports **0 formula errors**. The only workbook write
outside the installers reapplied the existing `Dry-down models!A2` formula to
recalculate with the new source. No synthetic observations were submitted.

Validation passed **755 logger tests**, coverage (99.42% of lines and 97.9% of
branches), type and source-contract checks, lint, formatting, HTML, the Pages
build, and secret scans. Authenticated desktop and 390 px checks passed in both
themes, including tooltip dismissal and horizontal fit. GitHub logger,
website/Pages, security checks, and the **Sonar quality gate passed** for the
source commit. The full link check retains the existing Wiley DOI **403**;
the added links pass. The preceding release's service-side Sonar failure below
is historical and did not recur for this audit.

### Recent weights and curve inspection (5.22.0)

Published September 13, 2026 as immutable Apps Script **version 86**, with the
existing phone URL preserved. All three immutable files match the logger source
in commit `0f3928d`; the authenticated app reports **Connected · logger 5.22.0**.
The logger and intake installers completed, and the queue installer replaced
its one predecessor with one Head trigger scheduled **every five minutes**.

The native backup **Garden Plant Tracker — before recent weights and plateau
forecasts — 2026-09-13** is in **Archive → Garden Plant Tracker Backups**.
The rehearsal and production readback matched all 30 plants' derived results,
preserved **839 observations**, **839 unique Observation IDs**, **772 distinct
Request IDs**, and the checked History and AppSheet values and validations.
All **110 existing chart specifications and positions** are unchanged; the four
additions bring the workbook to **114 charts**. Integrity reports **0 formula
errors**. No synthetic observation was submitted to production.

Validation passed **744 logger tests**, coverage (99.46% of lines and 97.89% of
branches), type and source-contract checks, lint, formatting, HTML, the Pages
build, and secret scans. GitHub logger, website/Pages, and security checks passed.
Sonar's two analysis attempts stopped before scanning with a service-side **503**
from `api/settings/values.protobuf`; its quality gate could not be evaluated.
The full link check retains the existing Wiley DOI **403**; the added links pass.

The current-cycle measurements now feed five recent-weight metrics and a
**Curve inspection** result in **Dashboard Z:AE** and **Daily care I:N** (the
details table at row 40). The hidden model extends from 16 to 22 derived fields;
History, Baselines, and AppSheet staging keep their existing schemas.

- **Last weight change:** latest minus previous weight, in grams; loss is negative.
- **Last interval loss:** previous minus latest, divided by actual elapsed days;
  loss is positive and a gain is negative.
- **Average of last 3 weights:** the arithmetic mean of three scale readings.
  This is a weight, so dividing it by days would not describe drying.
- **Average change across last 3 weights:** the mean of the two signed changes
  between those three readings, in grams per interval.
- **Last 3 readings loss:** oldest minus latest, divided by their total elapsed
  days. This handles uneven weighing intervals without giving a short interval
  the same influence as a long one.

These use distinct measured timestamps in the current watering cycle and pot
setup; the final correction-ordered record wins a timestamp tie. Estimates and
removed rows are excluded. Missing two- or three-reading evidence stays blank.
They describe scale observations, not water content or an automatic watering dose.

In the original 5.22.0 release, a crossed completed-dry reference advanced a moisture inspection. A plateau
can also advance that check even above an older reference. The plateau heuristic
required four readings spanning 3–10 days, a cycle at least seven days old,
at least 10 g of observed loss, and an earlier decline spanning at least two days
after excluding the first 48 hours. The recent loss rate must be at most 20% of
that earlier rate, with a four-reading range within 5% of total observed loss
(a minimum 2 g allowance). A gain above 2 g prompts a setup/measurement review.
These are adjustable starting criteria, not a validated moisture classifier.

Neither signal rewrites dry/wet references or learns a fixed watering interval.
The resulting date means **inspect moisture now**, conditional on the plant's
care guidance. That release withheld automatic dates for missing references
and partial watering; 5.23.0 now permits supported observed plateaus without
forecast anchors while retaining the partial-watering restriction.
P21 retains its upper-2-inch check; P28 retains its leaf-replacement decision.
Calendar dates use the date containing the forecast timestamp, avoiding an
extra next-day shift from rounding a time upward.

[`recent-weights.mjs`](recent-weights.mjs) builds the scoped native migration.
Back up, read fresh metadata and bounded destinations, rehearse on a native copy,
then deploy the matching script before recalculating `Dry-down models!A2`.
Apply layout/formulas before charts and verify calculated sources first.
The four new charts use fixed P-ID rows in **Plant color data DX:EC**, so sorting
Dashboard does not move plant colors. Existing charts and observations are
preserved. Daily care's managed layout marker becomes **v3** to include I:N.

The [chart guide](INSIGHTS-CHARTS.md#recent-weight-comparisons) lists the locations;
[practical care notes](../../docs/care-notes.md#checking-dryness-in-small-pots)
explain the physical check and why 1 g/day is not a collection-wide threshold.

### Previous 5.21.2 baseline

On September 12, 2026, **logger 5.21.2** was published as immutable Apps Script
**version 85**, preserving the existing deployment and phone URL. All three
immutable files and Head sources match commit `46298cf`. The authenticated app
reports **Connected · logger 5.21.2**; its version-85 `doGet` and
`getWebAppBootstrap` executions completed successfully.

The logger and AppSheet intake installers completed without a schema migration.
The queue installer replaced one predecessor; exactly one Head / Time-driven /
Minutes timer / Every 5 minutes trigger remains for `processQueuedAppSheetEntries`.
Its September 12, **5:13:26 p.m. EDT** scheduled execution completed successfully.
The native backup **Garden Plant Tracker — before logger 5.21.2 — 2026-09-12**
is in **My Drive → Archive → Garden Plant Tracker Backups**. Exact comparisons
preserve **809 History observations**, **809 unique Observation IDs**, **742
distinct Request IDs**, all **110 charts**, and the checked values, formulas,
formatting, and validations in the canonical ledger, staging sheets, summaries,
and all 30 plant headers. Integrity reports **0 formula errors**. No synthetic
observation was submitted.

Validation passed **730 logger tests**, the required coverage and source-contract
checks, type checks, lint, formatting, HTML checks, the Pages build, and secret
scans. Desktop and 390-pixel browser checks passed in light and dark modes,
including chart tooltips, disclosure keyboard controls, visibility preferences,
and zero label-grid movement across changing summary heights. The real embedded
app also keeps the full P01 name and A1 badge aligned at phone width and preserves
the grid position when switching to a plant with a different summary height.
The source commit passed the website and Pages, logger, Sonar quality gate,
Codecov, Socket, Gitleaks, and TruffleHog checks before the Apps Script release.

### Previous 5.21.1 baseline

On September 12, 2026, **logger 5.21.1** was published as immutable Apps Script
**version 84**, using the existing deployment and phone URL. All three immutable
files and Head sources match the committed logger. The authenticated app reports
**Connected · logger 5.21.1**; its version-84 `doGet` and `getWebAppBootstrap`
executions completed successfully.

The logger and AppSheet intake installers completed without a schema migration.
The queue installer replaced its one predecessor; exactly one Head / Time-driven /
Minutes timer / Every 5 minutes trigger remains for `processQueuedAppSheetEntries`.
Its September 12, **12:40:44 p.m. EDT** scheduled execution completed successfully.
The native backup **Garden Plant Tracker — before logger 5.21.1 — 2026-09-12**
is in **My Drive → Archive → Garden Plant Tracker Backups**. Exact pre/post
comparisons preserve **809 History observations**, **809 unique Observation IDs**,
**742 distinct Request IDs**, all **110 charts**, and the checked values,
formulas, and validations in Quick log, History view, Baselines, Dry-down models,
AppSheet staging, Dashboard, Plant tracker, and all 30 plant headers. Integrity
reports **0 formula errors**; no synthetic observation was submitted.

The logger source from `42f43c0` was deployed after main commit `fd9146f` passed
the website and Pages, logger, Sonar quality gate, Codecov, Socket, Gitleaks,
and TruffleHog checks. The pending weight-comparison, two-light, four-hook,
placement-image, booklet, and dependency updates are published. The live guide
and all three placement PNGs match the repository. A reproduced booklet hover
regression was also fixed: navigation stays visible while the mouse remains
over its controls, even when a layout shift causes another scroll event.

Local validation passed **850 unit tests**, **726 logger tests with coverage**,
**27 Chromium Storybook tests with coverage**, and **56 desktop/mobile page
checks**, plus type, lint, build, formatting, and secret checks. Dependency
audits report no vulnerabilities. The full external-link check has one known
publisher-side **403** for the existing Wiley DOI source; the newly published
documentation links resolve successfully.

### Mobile Summary and Plant Details (5.21.2)

The selected plant's identity and six summary metrics stay above the picker:
Last water, Latest weight, Last completed dry, Current pot, Avg water interval,
and Cycle avg loss. Activity totals, the watering forecast, current-cycle chart,
photos, reference links, and visibility controls now appear in **Plant details**,
after **Add to queue / Save now** and before the queue and Recent History.
Both sections update together when the selected plant changes; an empty search
hides the detailed section until a plant is selected again.

On phones, the selected name and label share one row below the smaller selection
caption. The label stays visible beside long names, and a name that exceeds the
available width uses an ellipsis; the full name remains in the plant heading.
The chart's readings disclosure aligns its arrow, icon, title, and unbroken count
badge. Bulk care puts its view controls below the help text at phone widths.
Selecting a visible label preserves the grid's screen position when the summary
height changes, without scrolling a picker that is hidden or outside the view.
This is a client layout update; History and AppSheet schemas are unchanged.

### Days Since Water Headers (5.21.1)

The Dashboard's existing **E6:E36** count is labeled **Days since water**.
It continues to read **Plant tracker E2:E31**, which counts calendar days since
the latest recorded, non-removed Water event in the workbook's time zone.
Watering today displays **0**; no watering record stays blank. This is elapsed
time, not a watering interval or a readiness instruction.

All **P01–P30 Care Forecast** headers put the count in **E6:F6**, immediately
below Last watered. Predicted dry date moves to **E7:F7**, Forecast confidence
to **E8:F8**, Condition to **E9:F9**, and Medium to **E10:F10**. The six-row
header retains its gold styling, numeric day count, date formatting, and
existing history boundary at row 11. No History or AppSheet schema changes
are required. The maintained page builder reproduces this layout on refresh.

Apply only the Dashboard label and the existing **D6:F10** forecast cells on
the plant tabs, after a native backup and rehearsal. Preserve the surrounding
headers and charts; do not run a full workbook refresh for this change.

The native workbook update was verified on September 11, 2026, after creating
**Garden Plant Tracker — before days since water — 2026-09-11** in **My Drive →
Archive → Garden Plant Tracker Backups** and rehearsing the changes on a copy.
All 30 plant counts match the tracker; the rehearsal also verified numeric zero
and a blank value when no watering date exists. Exact before/after comparisons
preserved **809 History observations**, **809 unique Observation IDs**, **742
distinct Request IDs**, all **110 charts**, and the checked formulas and
validations in Baselines, Dry-down models, and AppSheet staging. Integrity
reports **0 formula errors**. No synthetic observation was submitted.

### Previous 5.21.0 baseline

On September 10, 2026, the original workbook received the current-weight
comparison and all 30 formatted plant headers. The logger ran **5.21.0** on
immutable Apps Script **version 83**, preserving the existing deployment and
phone URL. All three immutable files match the local repository source, and
the authenticated page reports **Connected · logger 5.21.0**. Its version-83
`doGet` and `getWebAppBootstrap` executions completed successfully.
Exactly one five-minute `processQueuedAppSheetEntries` trigger remains. Its
September 10, **8:39:02 p.m. EDT** execution completed successfully on the
updated Head source.

The native backup **Garden Plant Tracker — before current weight difference —
2026-09-10** is stored in **My Drive → Archive → Garden Plant Tracker Backups**.
The migration was rehearsed on a native copy before production. Exact live
before/after comparisons preserved all **779 History observations**, **779 unique
Observation IDs**, and **712 distinct Request IDs**, plus the entered values,
formulas, and validations in Baselines, Dry-down models, and AppSheet staging.
All 109 original chart IDs and positions remain; the new comparison brings the
workbook to **110 charts**, including **20 in Insights**. All 30 differences
agree across Dashboard, Daily care, and the chart helper. Integrity reports
**0 formula errors**. No synthetic observation was submitted.

Local validation passed **726 logger tests**, coverage (**99.86% lines, 99%
branches, 100% functions**), strict type checks, source-contract checks, lint,
formatting, documentation checks, and secret scans. Native browser review
checked the chart labels, Dashboard column, selected-plant value, and plant
headers. At that verification, the repository changes were still local and
uncommitted; the record describes the live workbook and Apps Script deployment
at that point.

### Current weight difference and plant headers

**Current weight difference (g)** means **latest measured whole-pot weight minus
the last completed dry reference for the current pot setup**. For example,
364 g latest minus 349 g dry displays **+15.0 g**. Negative differences remain
visible; zero displays **0.0**. Missing or invalid readings and dry references
stay blank. This differs from the change since the preceding reading already
shown in logger chart tooltips. It is a weight comparison, not a soil-moisture
reading or an instruction to water.

- **Dashboard I6:I36** follows Latest weight and Dry weight. The table now spans
  **A:Y**. Predicted dry date moves to **J**, recommended water date to **W**,
  watering guidance to **X**, and Weight measurements to **Y**.
- **P01–P30 headers** show the signed difference in **B8:C8**, Last weighed in
  **B9:C9**, and Pot / setup in **B10:C10**. History still begins at row 11.
  Green title bars and blue Weight, gold Care Forecast, and purple Data Quality
  sections distinguish labels and values; the scientific name remains italic.
- **Daily care F40:F70** uses the same label and signed gram formatting.
- **Insights N228:R228** shows the selected plant's difference. The new
  comparison at **A586** shows the collection in fixed P01–P30 order with plant
  colors and numeric labels, retaining zero, negative, and missing values.

[`weight-difference.mjs`](weight-difference.mjs) builds the scoped native
requests from a fresh workbook snapshot. It rejects changed headers, occupied
helper cells, changed plant order, and repeat installation. Rehearse on a
native copy after making a Drive backup. Apply the data and formatting requests
first, read the calculated values, then apply the separate `addChart` request;
Sheets can discard series formatting before formula sources finish calculating.
The migration preserves the KPI positions, existing charts, canonical History,
and AppSheet staging schemas. The maintained logger source also includes the
column and header formatting for future deliberate workbook refreshes.

### Previous 5.20.2 baseline

As of September 9, 2026, production runs **logger 5.20.2** on immutable Apps
Script **version 82**, from source commit `cff580b`. The existing deployment
and phone URL are preserved. All three immutable files and Head sources match
the committed logger, and the authenticated page reports
`Connected · logger 5.20.2`. The live P01 chart shows its newest reading as
**364.5 g**, with **−1.5 g** compared with the preceding **366 g** reading.

The native backup is named **Garden Plant Tracker — before logger 5.20.2 —
2026-09-09**, stored in **My Drive → Archive → Garden Plant Tracker Backups**.
Exact before/after comparisons preserve all **755 History observations**,
**755 unique Observation IDs**, and **688 distinct Request IDs**. The checked
Baselines, Dry-down models, Daily care, Integrity, and AppSheet staging ranges
retain their entered values, formulas, and validations, with no formula errors.
No synthetic observation was submitted.

The logger and AppSheet intake installers completed without a schema migration.
Exactly one Head / Time-driven / Minutes timer / Every 5 minutes trigger remains
for `processQueuedAppSheetEntries`. Its September 9, 7:29:02 p.m. EDT scheduled
execution completed successfully, as did the version-82 `doGet` and
`getWebAppBootstrap` executions.

Local validation passed **717 logger tests**, coverage, strict type checks,
source-contract checks, lint, formatting, and secret scans. Desktop and 390 px
browser checks passed in light and dark themes, including chart popovers,
keyboard dismissal, focus return, and overflow checks. The source commit passed
the website and Pages, logger, Sonar, Socket, Gitleaks, and TruffleHog checks
before the Apps Script deployment.

### Logger 5.20.2 interface update

The forecast card puts each value below its label: **Water date***, **Reweigh**,
and **Forecast basis**. The basis is the estimate's method, such as
**Current-cycle curve**, rather than an additional date. A short asterisk note
keeps the water date conditional on actual dryness and plant condition.

Chart points and watering markers use the same styled help panels as the other
logger controls, with hover, tap, keyboard, and close-button support. Readings
and watering markers share one list sorted newest first. Every measured point
shows the signed gram change from the preceding measured reading in the same
cycle, in both its popover and list row; the first point has no earlier-cycle
comparison. This comparison uses chronological measurements even when the list
is displayed in reverse order. Chart explanations are separate list items.

### Previous 5.20.1 baseline

Earlier on September 9, 2026, production ran **logger 5.20.1** on immutable Apps
Script **version 81**, from source commit `8e8e820`. The existing deployment
and phone URL are preserved. All three immutable files and Head sources match
the committed logger, and the authenticated page reports
`Connected · logger 5.20.1`. The live P01 chart retains ten measured points,
with seven solid segments and two dotted gap connectors.

The native backup is named **Garden Plant Tracker — before logger 5.20.1 —
2026-09-09**. Exact before/after comparisons preserve all **755 History
observations**, **755 unique Observation IDs**, and **688 distinct Request IDs**.
The checked Baselines, Dry-down models, Daily care, Integrity, and AppSheet
staging ranges retain their entered values, formulas, and validations, with
no formula errors. No synthetic observation was submitted.

The logger and AppSheet intake installers completed without a schema migration.
The queue-trigger installer created the five-minute Head trigger and removed
its predecessor. Local validation passed 711 logger tests with 99.86% line
coverage, strict type checks, source-contract checks, lint, formatting, and
secret scans. Desktop and 390 px browser checks passed in light and dark themes.
The source commit passed Pages, Sonar's quality gate, Codecov, Socket, Gitleaks,
and TruffleHog checks before the Apps Script deployment.

### Logger 5.20.1 interface update

The 5.20.1 interface adds a remembered **Hide charts / Show charts** control
beside the photo toggle. It hides the complete current-cycle chart and its
readings without changing photo visibility or the selected plant. Dotted
connectors now span excluded readings and intervals longer than 48 hours;
measured points, nearby solid segments, watering markers, and the previous dry
reference keep their distinct meanings. The chart legend and expanded readings
explain that dotted connectors do not add measured observations.

Plant names have stronger visual emphasis, scientific names are italic, and
the portrait and inventory ID share the top row. The label badge sits at the
right of the scientific-name row. The water date, reweigh window, and forecast
basis share a row where space permits and become compact rows on phones.
Dates, weights, chart facts, selected plant names, and label badges have distinct
formatting and icons. The active **Not weighed today** filter is amber, and
its ordinary remaining-count helper is removed. Empty-search guidance remains
available. Metric icons have slightly more space above their labels.

The release changes client presentation and the logger version only; History,
AppSheet staging schemas, weighing-day boundaries, and save/queue behavior
retain their existing contracts.

### Previous 5.20.0 baseline

Earlier on September 9, 2026, production ran **logger 5.20.0** on immutable Apps
Script **version 80**, preserving the existing deployment and phone URL.
All three immutable files match the checked-in sources, and the authenticated
page reports `Connected · logger 5.20.0`.

The protected **Daily care** tab now has a rolling seven-day weighing and
inspection calendar at **A6:H36**, supporting weights and forecast windows at
**A40:H70**, and integrity checks at **A73:H90**. It keeps the existing sheet ID,
protection, and supporting-table filter criteria. Care days roll at 4:00 a.m.
in `America/New_York`, with minute recalculation. Water checks remain conditional;
neither a forecast date nor a 1–2 g/day loss rate automatically authorizes water.

The native backup is named **Garden Plant Tracker — before rolling Daily care —
2026-09-09**. Exact before/after comparisons preserve all **755 History
observations**, **755 unique Observation IDs**, and **688 distinct Request IDs**.
Baselines, Dry-down models, Integrity, and both AppSheet staging tables retain
their entered values, formulas, and validations. The live calendar has no formula
errors. No synthetic observation was submitted to production.

The Daily care, logger, AppSheet intake, and queue-trigger installers completed
successfully. The queue installer replaced the existing trigger without adding
duplicates. Exactly one Head / Time-driven / Minutes timer / Every 5 minutes
trigger remains. Scheduled queue runs and versioned `doGet` and
`getWebAppBootstrap` executions completed successfully.
No History or AppSheet schema change was needed. A native workbook
copy passed 21 scheduling cases, including midnight and the exact 4:00 a.m.
boundary, and two consecutive installer runs. Local validation passed 709 logger
tests with 99.86% line coverage, strict type checks, source-contract checks,
ESLint, Remark, Prettier, and secret scans. The full external link check encountered
Wiley's HTTP 403 on the verified root-study DOI; the citation remains intact.

### Previous 5.19.6 baseline

Earlier on September 9, 2026, production ran **logger 5.19.6** on immutable Apps
Script **version 78**, from source commit `9f43791`. The existing deployment
was updated in place, preserving the phone URL. All three immutable files and
the Head source match the committed logger, and the authenticated page reports
`Connected · logger 5.19.6`.

The logger, AppSheet intake, and queue-trigger installers completed successfully.
No schema migration was needed. Exactly one Head / Time-driven / Minutes timer /
Every 5 minutes trigger remains for `processQueuedAppSheetEntries`, and its
September 9, 12:14:45 a.m. EDT execution completed successfully. Version-78
`doGet` and `getWebAppBootstrap` executions also completed successfully.

The native backup is named **Garden Plant Tracker — before logger 5.19.6 —
2026-09-09**. The backup and post-install comparison preserve all 738 History
observations, their 738 unique Observation IDs, and 671 distinct Request IDs with
their event-row grouping. Baselines, Dry-down models, Daily care, Integrity,
and both AppSheet staging tables retain their entered values and formulas;
the checked derived ranges have no formula errors. No synthetic observation
was submitted.

The source commit passed logger coverage, website and Storybook checks, Pages
deployment, Sonar's quality gate, Codecov, Socket, Gitleaks, and TruffleHog.
The published booklet CSS and JavaScript match the committed sources, and
the public Storybook index includes its introduction and 31 story/doc entries.

### Compact phone controls in 5.19.6

The 5.19.6 interface keeps List, Labels, and the Not weighed today toggle on
one row. The filter is a keyboard-accessible toggle button and keeps the
current plant available while excluding other saved or queued weights.
Progress reads `X Saved today` and `X Queued`; the 4:00 a.m. weighing-day
cutoff and daylight-saving handling are unchanged. Extra chooser and repeated-care
helper text is removed. Mobile cards use tighter spacing, the portrait and plant
ID stay together, photo visibility sits with the plant links, and Recent History
has one heading row with its entry-count selector.

### September 7 baseline

The September 7, 2026 deployment identified the logger as **5.19.5** on immutable
Apps Script version **77**, matching source commit
`9eac2be`. Native Apps Script now has strict type and lint gates, checked domain
contracts, and validated input and sheet-read boundaries.
The selected plant name has an SVG icon and a vertically centered row below the
pot labels. Daily progress has separate saved and queued badges, the plant status
stays on one line, and current-cycle charts have a larger plot, a visual legend,
and structured dates and readings. Entered weights show independent comparisons
with the latest reading and the last completed Dry, and the compact Not weighed
today control includes the weight icon. Saved-today progress resets at **4:00 a.m.
in the workbook's America/New_York timezone**, including daylight-saving changes;
readings before that cutoff belong to the previous weighing day.
History-backed daily progress, filtered History, refreshable summaries,
current-cycle weight charts, input comparisons, and recoverable saved-entry
corrections are live. The protected Daily care sheet and linked Dashboard
Integrity indicators are installed. Dashboard hides its title row (1), spacer
rows (4–5), and Page/View column (A). The physical freeze remains at row 6 and
column C, leaving three visible frozen rows and the two visible identity columns.
The merged Plants tracked KPI remains visible in B2:B3. These native presentation
settings preserve all A:X formulas and survive the existing Dashboard refresh;
restore them with `hiddenByUser` dimension updates if the sheet is rebuilt.
The existing production deployment was updated in place, so the production URL
above remains unchanged. Treat these values as a handoff baseline, not a
substitute for checking `GARDEN_LOGGER.version`, `clasp versions`,
`clasp deployments`, and the authenticated live page before a future release.

The September 7 UI patch preserves only correction drafts with actual edits;
opening and closing an unchanged correction no longer creates a recovery banner.
Edited drafts offer Resume and Discard, with submitted corrections still protected.
All three immutable deployment files match the committed source, the authenticated
page reports `Connected · logger 5.19.5`, and the logger/intake installers completed
successfully. The source commit passed CI and the Sonar quality gate with no issues.
The queue trigger was replaced in place: exactly one five-minute
`processQueuedAppSheetEntries` trigger remains and has run successfully.
The native backup is named **Garden Plant Tracker — before logger 5.19.5 —
2026-09-07**. The post-install comparison preserved all 726 History observations,
their 726 unique Observation IDs, and the 659 distinct Request IDs with their
event-row grouping. Baselines, dry-down model formulas, and AppSheet staging
values were unchanged; the new Insights helper calculated without errors.

- `History` and `History view` contain 42 physical columns, A:AP. AN stores
  `Rotation (°)`; AO stores `Watering application`; and AP stores the optional
  measured `Water amount (mL)`.
- `App entries` contains 34 physical columns, A:AH. AF stores `Rotation (°)`;
  AG and AH store the watering application and optional amount; and Plant ID
  validation covers P01-P30.
- `App bulk` contains 54 physical columns, A:BB, with P01-P30 weight fields and
  the two watering fields at BA:BB. The current installer recognizes the older
  P01-P22, intermediate P01-P28, P01-P30, and pre-watering contracts, inserts
  only missing columns, and preserves staging rows and trailing care fields.
- `Plant tracker`, `Baselines`, `Quick log`, and the individual workbook tabs
  include P29-P30. The native `QuickCareLog` table covers
  `'Quick log'!A4:O34`, including the two logger-managed watering fields at N:O.
  Canonical History retains its 42-column append-only contract.
- `Dashboard` contains 24 columns, A:X. Its new `Weight measurements` column
  counts active, positive measured Weigh events for each plant.
- Detailed entry supports 12 events: Water, Weigh, Measure, Check, Rotation,
  Clean, Prune, Repot, Flower, Photo, Pest, and Other. Rotation defaults to 90°.
- A weight and a Water event remain independent inputs. The logger no longer
  asks for Dry/Wet/Routine: it stores new weights as `Routine` for append-only
  compatibility and derives states from completed watering cycles in summaries.
  A same-save watering weight is Wet; otherwise, the first positive weight
  within five days after Water is Wet. Only the final eligible non-Wet reading
  before the next Water is Dry, and later readings in an open cycle remain
  Routine. Nutrient choice, product, and amount are
  remembered across single and bulk logger entry for the current browser
  session. The live staging columns validate against `MSU 13-3-15` and
  `SuperThrive Foliage Pro`; the logger presents the same exact choices as
  mobile-logger dropdowns. Older product text remains untouched in History.
- Logger 5.16.3 sorts the compact label picker from `A1`–`H3` in natural
  alphanumeric order, then presents numbered labels `#1`–`#6` last, without
  changing canonical `P01`–`P30` request order. P29-P30 cached photo summaries
  are live and use verified 960 px Gyazo thumbnails.
- The selected-plant summary shows the last completed-cycle Dry reading. The
  first eligible reading within five days after the latest Water is Wet; later
  lower readings remain Routine until the next Water closes the cycle.
  Removed, non-Weigh, invalid, old-setup, and nonpositive records are ignored.
  Plant photos can be hidden without creating image requests, and that
  preference persists locally between sessions.
- The list and label pickers reuse the field guide's plant-specific multicolor
  portraits as small cached SVG image assets, with a built-in generic plant
  fallback. Keeping the detailed portraits out of the Apps Script HTML makes
  each logger load substantially smaller. Recent History keeps a neutral card
  surface with a slim event-color edge and restrained badge/gradient accents
  instead of full tinted cards.
- The AppSheet bridge uses exactly one five-minute
  `processQueuedAppSheetEntries` trigger. Reinstalling it creates the replacement
  first, then removes every previously matching trigger so a transient creation
  failure cannot leave the bridge without a schedule.
- Logger 5.17.0 learns reliable completed dry-down cycles for the same plant
  and pot setup, then blends fresh readings into a historical forecast. The
  logger shows a reweigh window and its basis; existing Dashboard and AppSheet
  fields receive the same model.
- The 5.17.0 rollout used a native Drive backup named
  `Garden Plant Tracker — before dry-down learning 5.17.0 — 2026-09-04 19-49 EDT`.
  The scoped installer preserved all 661 canonical History records, including
  the one Removed record, with 661 unique observation IDs and no duplicate
  active request/plant/event keys. All 5,725 checked workbook formulas were
  error-free. No AppSheet table regeneration was needed.
  Version 62 simplifies the forecast decisions without changing any of the
  30 live-data model results; the cleanup also passed the native Sheets fixture.
- The 5.17.1 portrait rollout published all 36 reviewed SVGs before updating
  the existing Apps Script deployment to version 63. All three immutable
  deployment files match the committed source. A native Drive backup named
  `Garden Plant Tracker — before icon caching and AppSheet review — 2026-09-04`
  was created. The post-deployment read preserved all 661 History records and
  their formulas exactly, with 661 unique observation IDs, no duplicate active
  request/plant/event keys, and no errors in the checked History, tracker,
  Baselines, staging, and Quick log ranges. No workbook writes were needed.
  That rollout's browser follow-up was pending at the time; the September 5
  verification below supersedes that runtime limitation.
- The 5.18.0 rollout verified the authenticated stable page, all 30 inline
  bulk-list SVG portraits, selection preservation between List and Labels,
  and the form/actions → nonempty queue → Recent History order. No test
  observation was submitted. Pages artwork was published before version 64.
- The native September 5 workbook backup and separate disposable rehearsal
  preceded the scoped chart/formula/formatting repair. The final comparison
  preserved all **691 History records and their formulas**, with 691 unique
  observation IDs and no duplicate active request/plant/event keys. All 7,558
  checked formulas across 46 tabs were error-free. All 537 active weight values
  remained identical in the chart helper; all 22 visual estimates remained in
  History. Of 98 chart definitions, 95 were repaired or extended without moving
  any chart. See the [audit receipt](./WORKBOOK-AUDIT-2026-09-05.md).
- The watering-plan rollout gave Baselines 36 derived fields, Dashboard 23,
  and the hidden model 16. Dashboard now has the additional weight-count field.
  Twenty plants currently have conditional planning dates; money tree and
  split rock retain inspection-based guidance. AppSheet **1.100099** is saved
  and deployed: Baselines exposes 37 columns including `_RowNumber`, and its
  new Date and LongText fields are read-only, optional, and adjacent to Next
  dry check in Watering forecast. The changed read-only Insights data helper
  was also regenerated to 31 columns including `_RowNumber`; History and the
  staging schemas were not regenerated.
- Apps Script's editor/Execution API could not start the scoped installer, so
  the watering-column formulas and formatting were applied through the native
  Sheets API from the checked-in installer functions after a successful copy
  rehearsal and fresh preflight. The existing queue trigger was re-saved through
  its native editor with Head / every five minutes, leaving exactly one matching
  trigger. The queue processor and version-64 web app have successful executions.

The [Dry-down learning](#dry-down-learning) section explains the forecast rules.

The [September 5 workbook audit](./WORKBOOK-AUDIT-2026-09-05.md) documents the
scoped repairs to chart bindings, measured-only helpers, summary coverage,
conditional formatting, and display precision, including the native-copy rehearsal.

The subsequent [AppSheet review](./APPSHEET-REVIEW-2026-09-05.md) published
AppSheet **1.100104** with all thirty illustrated plant/planter portraits,
corrected Quick Log navigation, P01-P30 bulk validation, nutrient amounts with
units, clearer prompts, protected processing receipts, and a corrected
current-cycle chart filter. It preserved the
logger's existing 5.18.0/version-64 deployment and canonical workbook data.

The later 5.18.1 patch fixes portrait flashing during plant selection. External
Edge checks at phone and desktop widths retained all 30 decoded SVGs on the
first frame after a tap; the previous renderer retained none and briefly showed
zero ready portraits. All 222 logger tests and the coverage gate passed, along
with GitHub CI, SonarCloud, Codecov, and security checks. The authenticated stable
page reported `Connected · logger 5.18.1`, and all three immutable version-65
files matched the committed source at that rollout.
The native pre-verification Drive backup and post-deployment comparison preserve
all 691 History records and their formulas exactly, including 691 unique
observation IDs, one Removed record, and no duplicate active request/plant/event
keys. All 6,874 checked formula cells are error-free. The logger and AppSheet
intake installers completed successfully; the bulk installer reported no
migration. The single Head queue trigger remains scheduled every five minutes
and has run since deployment. No synthetic observation was submitted.

The 5.18.2 interface update uses immutable version 66 at the same production
URL. All three deployment files match the committed source, and all 83 public
UI SVGs plus the shared sprite match their reviewed files. The live logger
reports `Connected · logger 5.18.2`; all 82 embedded controls use native
64-unit geometry, and all 30 plant-picker portraits decode successfully.
The 38 portrait exports and their cache revision remain unchanged. All 283
focused logger, icon, and site tests passed, along with CI, SonarCloud, Codecov,
and security checks. A fresh native Drive backup and post-installer comparison
preserved all 691 History observations, formulas, and checked validations;
6,874 checked formula cells have no errors. Both installers completed without
an intake migration, and the queue installer replaced the previous trigger
with exactly one Head trigger scheduled every five minutes. Version-66 web-app
executions and a post-deployment time-driven queue execution completed
successfully. No synthetic observation was submitted.

The 5.18.3 cleanup was published on immutable version 68 at the same production
URL. All three immutable files matched the committed source, and the authenticated
phone-width page reported `Connected · logger 5.18.3`. It preserves the portrait
cache revision and the selection-rendering fix. The server cleanup preserves
retry behavior and mixed Sheets cell values, with 2,463 comparisons against the
previous source and 341 passing unit tests. Native Vitest execution fixes the
source-offset mismatch in coverage reporting, allowing removal of all 75 old
V8 ignore comments; branch coverage is 97.3% against the unchanged 90% floor.
GitHub checks, Codecov, and SonarCloud pass, with zero open Sonar issues or
security hotspots.

A native Drive backup named `Garden Plant Tracker — before mobile UI and strict
tooling 5.18.3 — 2026-09-05` preceded the installers. The final comparison
preserved all 691 History observations, 691 unique observation IDs, one Removed
record, and zero duplicate active request/plant/event keys. All 5,936 checked
formula cells are error-free, and the checked entered values, formulas, and
264 validations remain identical. The logger and intake installers completed;
the bulk intake reported no migration. The queue installer replaced one prior
trigger with exactly one Head trigger scheduled every five minutes. AppSheet
remains on verified version 1.100104 with portrait revision `2e71bf2a701aa61f`.
Version-68 web-app executions and the replacement time-driven queue execution
completed successfully. No synthetic observation was submitted.

## Plant summaries and History feedback (5.18.4)

The selected plant's information appears above the List/Labels picker. A name
line beside the picker updates immediately after a selection; mouse hover and
keyboard focus can preview a label's plant name. This gives touch users the
name without relying on a browser's hover-only tooltip.

The summary keeps its main metrics in two columns and the Waterings,
Size logs, and Weights totals in three equal cells on a phone. Counts cover
active History across pot setups. Size logs counts Measure events, so a
single height-and-width observation counts once. Weights counts positive
numeric Weigh readings and excludes estimates and Removed rows.

Average water interval describes the elapsed time between recorded Water
events; it is blank until there are at least two valid dates. **Cycle avg
loss** describes net whole-pot mass loss per elapsed day in the current pot
setup and watering cycle. Its help includes the observed duration and latest
usable interval, making changes in drying speed visible. It needs at least a
day of comparable measured readings; partial watering, ambiguous setup changes,
or conflicting weight gains withhold the rate. Neither average is a watering
schedule or a replacement for inspecting the plant and root zone.

Water dates retain **if ready** beside the compact label. Tap, hover, or focus
the help controls for the full readiness guidance, reweigh-window explanation,
and forecast-basis explanation; Escape dismisses the help. Recent History uses
cached plant portraits to the left of each entry. Refreshing its length shows
a local loading status while the entry form remains usable. Failed refreshes
retain the previous entries, and older responses cannot replace a newer request.
Confirmed single, bulk, and queued saves also refresh the plant summaries in
the background. New watering and weight observations therefore update the
totals and current-cycle figures without reloading the page or clearing a new
entry already being typed.

`installDashboardWeightCounts()` adds **Weight measurements** at
`Dashboard!Y6:Y36`. Its count uses the same measured-weight criteria as the
mobile summary. It preserves the existing A:X columns and all canonical and
staging schemas; `refreshGardenWorkbook()` also includes the new column when
the complete generated Dashboard is deliberately rebuilt. Dashboard is not an
AppSheet source table, so this addition requires no AppSheet regeneration.

The September 6 rollout published logger 5.18.4 on immutable version 70 at the
same production URL. All three immutable files match source commit `951e545`.
The authenticated phone-width page reports `Connected · logger 5.18.4`;
the final mobile review shortened the measurement count label to **Size logs**
so individual letters do not wrap. Desktop and 390 px light/dark checks covered
the metric alignment, portrait display, picker-name feedback, local History
loading, and keyboard/touch-friendly help. The full suite passed 393 tests;
the final logger suite passed 299, with 97.43% branch coverage against the
unchanged 90% floor. Type, lint, CI, SonarCloud, Codecov, and security gates pass.

A native Drive backup named `Garden Plant Tracker — before logger summaries
5.18.4 — 2026-09-06` and a separate native rehearsal copy preceded the scoped
Dashboard installer. All 30 weight totals match an independent count of the
546 valid measured weights. The final comparison preserved all 700 canonical
History records, 700 unique observation IDs, the one Removed record, and zero
duplicate active request/plant/event keys. All 6,636 checked formula cells are
error-free; the existing entered values, formulas, and 8,416 checked validations
remain identical. The logger and intake installers completed without a bulk
schema migration. The replacement Head queue trigger is the only matching
trigger, runs every five minutes, and has completed a scheduled execution.
The final versioned web-app executions also completed successfully. AppSheet
remains on verified version 1.100104 with portrait revision `2e71bf2a701aa61f`.
No synthetic observation was submitted.

## Plant summary and help polish (5.18.5)

The selected plant's 64-unit SVG portrait sits at the top right of its summary,
above the plant ID. The photo toggle lives at the summary's bottom right and
retains focus and its stored preference through updates. Hiding photos keeps
the cached portrait visible. The six metric pills use centered labels, values,
and supporting text, matching the three activity totals.

Latest weight also shows its signed difference from the last completed dry
reading in the current pot setup, for example **+21.5 g vs last dry**. Missing
or invalid readings do not produce a difference. This is a whole-pot mass
comparison, not a measurement of remaining water or a watering instruction.

Help panels have a colored heading, a close button, separated paragraphs, and
highlighted cautions. Only one panel opens at a time. A mouse hover or keyboard
focus opens temporary help; a tap or activation pins it until another tap,
outside interaction, focus departure, Escape, or page movement dismisses it.
The panel stays inside the viewport and can scroll internally. A brief pointer
leave delay allows moving from the trigger into the panel without losing it.
Opening another help control clears the previous pin. Closing from inside the
panel returns keyboard focus to its trigger without reopening it.

The September 6 rollout published source commit `73a0010` at the existing
production URL. All three immutable version-71 files match that commit. The
authenticated page reports `Connected · logger 5.18.5`; external Edge checks
verified the summary and help at desktop and 390 px widths in light and dark
themes, including decoded portraits and collection photos. All 324 logger
tests passed, including 125 client tests, and the server retained 97.43% branch
coverage. Type, lint, formatting, HTML, security, GitHub Pages, SonarCloud, and
Codecov checks passed before deployment.

A native Drive backup named `Garden Plant Tracker — before summary and help
polish 5.18.5 — 2026-09-06` preceded the installer verification. The post-rollout
comparison preserved all 700 canonical History records, 700 unique observation
IDs, 6,636 checked formulas, and 8,416 validations. There were no formula errors
or duplicate active request/plant/event keys; Dashboard weight counts still
matched all 546 active measured weights. Logger and AppSheet intake installers
completed successfully without a schema migration. The queue-trigger installer
created one Head trigger, removed its predecessor, and retained the verified
five-minute schedule. Its first scheduled run at 17:35:30 EDT completed
successfully, as did the version-71 web-app executions. No synthetic
observations were submitted.

## Daily workflow (5.19.0)

The September 6 rollout published immutable version 72 at the existing phone
URL. All three immutable files match commit `065b5d2`; the public history helper
also matches the committed source. The authenticated live logger reports
`Connected · logger 5.19.0` and restores nine plants' saved weights for the
workbook's September 6 day. These counts describe that verification snapshot.

A native Drive backup named `Garden Plant Tracker — backup before logger 5.19.0
daily workflow — 2026-09-06` preceded the structural changes. The final comparison
preserved all **700 canonical History records**, their values, formulas, formats,
and checked validations, with 700 unique observation IDs and no duplicate active
request/plant/event keys. All **17,447 formula cells across 47 sheets** were
error-free. Every Daily care weight/date pair matched an independent History
selection and Baselines, and all thirty dry-weight differences matched their
current-setup references. The only additional native formatting changes were
copies of the former merged title's format after splitting Dashboard at the
freeze boundary; its values and validations stayed unchanged.

The logger, AppSheet intake, Daily care, and queue installers completed
successfully. Existing canonical and staging column counts remain unchanged;
the App bulk installer needed no migration. The single replacement Head queue
trigger is scheduled every five minutes, and its 21:15:54 EDT scheduled execution
completed successfully. Version-72 bootstrap and filtered History executions
also completed successfully. No synthetic production observations were submitted.

Validation passed 740 repository tests, including 639 logger tests. Logger
coverage reached 100% of executable lines and 99.39% of branches without changing
the gates. Types, lint, formatting, browser checks, and GitHub checks passed;
SonarCloud reported zero open issues or hotspots, and Codecov reported 99.63%
project coverage. Native disposable-copy rehearsals exercised atomic corrections,
exact retries, durable rejection recovery, correction chains, true blank cells,
canonical units, and native formula edge cases before production deployment.

The plant picker distinguishes **Queued** weights on this device from **Saved
today** readings confirmed in History. The **Not weighed today** filter uses
the workbook's timezone and a **4:00 a.m. day boundary**, excluding Removed,
estimated, invalid, and future readings. For example, a September 7 reading at
12:30 a.m. belongs to the September 6 weighing day; September 7 starts at 4:00 a.m.
The cutoff follows local wall-clock time through daylight-saving changes. Actual
History timestamps, chart times, and watering forecasts retain their original
meaning. Sending the queue does not erase saved progress. A fresh read restores
that progress on another device; cached data retains its last refresh time.

Recent History offers **All plants / This plant**, event filters, and expandable
notes, measurements, and event details. The server filters before applying the
requested limit. Its loading indicator stays inside History, and responses for
an older selection cannot overwrite the current result.

Plant info separates the latest weight's observation time from **Updated from
Google**, which describes when the displayed data was fetched. Refresh updates
the summaries and History while preserving the current plant, selected events,
typed values, setup edits, bulk selection, queue, and pending saves. Beside the
weight input, the logger compares the entered grams with the previous measured
reading in the current setup and shows the elapsed time. It never changes the
entered number automatically.

The compact current-cycle chart uses measured grams, watering markers, and the
previous completed Dry reference. It starts at the latest watering or setup
boundary. Invalid or excluded readings and gaps longer than 48 hours interrupt
the line. A corrected reading replaces its ancestor in the plotted evidence;
its retained audit row does not create a false gap. The chart describes observed
whole-pot mass, without converting its slope into a watering instruction.

### Daily care and Integrity

Daily care was retired on September 16, 2026 at the owner's request. The daily
chat report and generated report page are the maintained care plan. Do not
recreate the sheet or run `installDailyCareDashboard()` against production;
that compatibility installer and its tests document the old workbook layout.

Dashboard U2:X3 keeps **Data issues** and **Observations still needed**, now
linked directly to the visible Integrity sheet. These count check categories,
not unique plants or observations. Missing results show **Checks unavailable**.
Integrity's formula-error scan excludes the indicators to avoid a cycle and
contains no Daily care reference. Latest-weight/time selection, correction
ordering, recent-weight metrics, and the 4 a.m. care-day boundary remain shared
logger/report behavior. The signed current-weight difference is in Dashboard I.

### Saved-entry corrections

**Correct entry** opens one saved History event. Review the original, edit the
supported fields, provide a reason, preview the exact differences, and confirm.
Other events from the same save remain separate and unchanged. Plant ID, event
type, label provenance, and pot-setup identity are fixed. A date change that
crosses a Repot boundary or invalidates dependent setup observations is refused
with an explanation; coordinated setup migrations require a separate reviewed
workbook operation. Measurement units, quality, and method remain explicit.

Opening an entry without changing it does not create a recovery draft. Real
edits stay in this browser when the editor closes, and the banner offers
**Resume correction draft** or **Discard draft**. Discard removes only the unsent
correction; ordinary entry fields, queued observations, and History remain
unchanged. Pending requests keep their recovery draft until Google confirms the
outcome. Untouched drafts retained by older logger versions are cleared on load.

The four RPCs are `getWebCorrectionEntry`,
`previewWebObservationCorrection`, `saveWebObservationCorrection`, and
`getWebCorrectionStatus`. A preview binds the original revision and relevant
History context. A commit re-reads that context under the shared script lock.
Stale previews, changed headers, duplicate identities, unsupported fields, and
insufficient History capacity fail before any write.

The manifest enables Advanced Sheets v4. The commit uses one atomic
`Sheets.Spreadsheets.batchUpdate`: append a replacement A:AP row and mark only
the original AJ as `Removed`. The original values, formulas, reason, and
formatting are retained. The replacement receives a new Recorded time and
Request ID, the original save group, the immediate ancestor's Observation ID in
AE, and the correction reason in AF. Its M:O and AL:AM helper formulas are
generated for its new row. No correction increments the pot setup or writes
Baselines. The Apps Script menu's exclusion flow also locks and rechecks IDs
after its confirmation alert, then changes only AF and AJ.

Before calling Google, the client durably stores the immutable correction
payload and retry ID. A lost callback, reload, or retry checks that same payload.
History's replacement Observation ID embeds the request ID and operation digest,
so the original receipt remains discoverable even after a later correction or
exclusion. A matching receipt clears the pending operation; a missing receipt
permits retrying that exact request. A different payload cannot reuse its ID.
The preview never mutates History. Status checks cannot claim a different
correction as this request's success.

Before entering the atomic Sheets operation, the server stores and reads back
an operation marker in Script Properties. A deterministic validation rejection
before any attempted write stores a matching terminal result instead. The
client verifies that result's request and payload digests, clears only the
rejected pending request, and retains the correction draft for a fresh review.
An attempted write, transient failure, or missing receipt never becomes a
terminal rejection merely because a response was lost. A matching History
receipt remains authoritative. These operation markers are retained so delayed
retries cannot reuse a rejected request or misclassify an uncertain write.

For rollout, authorize Advanced Sheets in the disposable bound script and prove
the actual installer, correction, retry, and recalculation paths there first.
Then create a fresh native production backup and capture the canonical ranges,
deployment, and triggers. Publish an immutable version through the existing
deployment; run the logger/intake and queue-trigger installers when their
contracts change. Do not run the retired Daily care installer. Refresh the `Dry-down models!A2`
formula from `dryDownModelFormula_()` so its input includes AA and AE; this adds
correction ordering without changing its 16 output columns. Refresh only
`Baselines!C2:C31` and `E2:E31` from `latestMeasuredWeightFormula_()` for the
paired latest reading and date; preserve the other Baselines cells. Verify all History
records and staging schemas, the allowlisted presentation/formula changes,
successful executions, and exactly one five-minute queue trigger before calling
the rollout complete.

## Plant portrait caching

Logger 5.18.2 uses the shared 83-icon UI/category redraw from the canonical
sprite. Its 82 embedded controls use native 64-unit geometry with namespaced
gradients, clipping, reusable details, and accessible descriptions. UI icons
remain inline and require no separate image downloads. Plant-portrait caching
and the 5.18.1 selection fix remain in place.

Logger 5.17.1 loads portraits as they enter the visible picker area and shares
one download between repeated uses of a plant in the current page. The browser's
Cache Storage retains each SVG across reloads, including when the image server
is unreachable. This caches artwork only; it does not make the Google-hosted
logger itself available offline.

`npm run sync:logger-artwork` explicitly derives `PLANT_ICON_REVISION` from the 38 exported SVGs. Ordinary website and artwork-export builds leave the logger source unchanged.
Each image URL includes this revision. The cache stores one entry per portrait
and replaces an older revision when needed, so future artwork updates do not
leave the logger stuck on old icons or accumulate a second complete set.
Publish the Pages assets before deploying a logger that refers to their revision.

If persistent image storage is unavailable, portraits use ordinary browser HTTP
caching. Missing images fall back to the built-in plant icon. Logger 5.18.0 gives
the shared P19 and P20 planters their own photo-informed portraits, independent
of their collection-contents links. Portrait caching never
clears the local draft, save-recovery, or queued-observation storage.

Logger 5.18.1 keeps label buttons and their decoded portraits in place when a
plant is selected. Rebuilding the grid on each tap briefly blanked every SVG
while the asynchronous image loader reattached cached artwork. Background plant
refreshes now update labels, order, and selection while replacing only changed
portraits. Phone hit-target recovery still replaces stale button hit boxes but
retains their images, so orientation changes do not restart portrait loading.

AppSheet uses a separate revisioned Drive folder and relative Image paths,
recorded in [`appsheet-plant-portraits.json`](./appsheet-plant-portraits.json)
and [`appsheet-plant-portrait.txt`](./appsheet-plant-portrait.txt). Its native
mobile offline-content setting is enabled, but browser AppSheet does not
provide the same offline image cache. See the
[AppSheet storage and refresh procedure](../../docs/appsheet-companion.md#portrait-storage-and-caching)
before publishing a future portrait revision.

## Local development and tests

[`clasp`](https://developers.google.com/apps-script/guides/clasp) synchronizes
the checked-in files with the bound Apps Script project, lists deployments, and
reads execution logs. It does **not** emulate `SpreadsheetApp`, `LockService`,
`HtmlService`, or `google.script.run` on the local machine. The Vitest suite
therefore runs the real `.gs` source in a controlled Apps Script mock and opens
the real mobile HTML in a lightweight browser DOM.

Install exactly from the lockfile and run the logger suite:

```powershell
npm ci
npm run lint:apps-script
npm run typecheck:apps-script
npm run test:logger
npm run test:logger:coverage
```

The `.gs` files are checked directly by ESLint as classic scripts with read-only
Apps Script service globals. Actual trigger, menu, web-app, and operator entry
points are listed in `/* exported ... */` comments; private helpers still receive
unused-function checks. Node and browser globals are unavailable in this scope.

`tsconfig.apps-script.json` uses the shared strict TypeScript configuration,
`checkJs`, and `@types/google-apps-script`, with JSDoc and the domain declarations
in `types/apps-script*.d.ts`. Optional properties, unchecked indexed access, and
the declaration files themselves are checked. Apps Script files share a global
scope, so this project uses classic-script detection without isolated modules.
The checker discovers every `.gs` input and presents its exact contents to the
compiler through in-memory JavaScript filenames. It emits no build files and
reports diagnostics at the original `.gs` path and line. Simply adding `.gs`
to an ordinary `tsconfig` include would not check those files.

`npm run typecheck` includes this Apps Script check. The logger CI also runs
the dedicated lint, type, and checker regression gates before coverage.
VS Code associates `.gs` with JavaScript for ESLint and formatting, and its
**Run Task → Check Apps Script types** task links compiler errors to the source.
The existing Prettier JavaScript-parser override formats `.gs` files. These
development declarations and tools stay outside the three-file clasp push set.

The tests cover combined event inference, formula-safe text, request-ID
validation, single and bulk History reconciliation, lost callbacks, late stale
callbacks, the direct-save watchdog, picker persistence, adjustable recent
History, queue-storage failures and rollback, backup recovery, 30-entry
one-call queue sessions, success-path confirmation, bounded retry timing,
deterministic failures, and the Google Photos handoff. The coverage report
measures the Apps Script server file directly and is uploaded to Codecov in CI.
Statements, functions, and lines have 90% CI floors. Branch coverage also has a
90% floor; the one-sided guards marked with `v8 ignore next` have explicit tests
for both outcomes, but the V8 provider otherwise reports an uncovered synthetic
alternate branch for those lines. The inline client script is exercised by DOM
tests but is not included in the V8 percentage, because treating the complete
HTML file as JavaScript would produce a false source map. `npm run check:logger`
remains a fast source-contract smoke check.

For one-time `clasp` setup:

1. Enable the Apps Script API in your Google Apps Script user settings.
2. Run `npm run apps-script:login`. Google opens the authorization flow; finish
   that sign-in yourself.
3. Open **Project Settings** in the bound Apps Script project and copy its
   **Script ID**.
4. Create a local `.clasp.json` at the repository root. It is intentionally
   ignored by Git:

   ```json
   {
    "scriptId": "PASTE_THE_BOUND_PROJECT_SCRIPT_ID_HERE",
    "rootDir": "scripts/google-sheets"
   }
   ```

5. Run `npm run apps-script:status` to verify that only `plant-tracker.gs`,
   `Index.html`, and `appsscript.json` are in the push set.

Useful read-only commands are `npm run apps-script:deployments`,
`npm run apps-script:logs`, and `npm run apps-script:open`. Treat
`apps-script:pull` and `apps-script:push` as synchronization operations:
`pull` can replace local files, while `push` changes the remote Apps Script
project. A push does not update the versioned web-app deployment by itself; the
new version must still be assigned to the existing deployment.

The mobile logger stores an unconfirmed request ID and draft locally before it
calls Google. If the callback is lost, logger 5.8.2 and later check History for that exact
request on timeout and page load. A completed save clears itself automatically;
an absent or partial save keeps the draft available for an idempotent retry.
Logger 5.14.6 and later keep the HTML shell independent from spreadsheet reads and save
the last successful plant list in that browser for up to six hours. A recent
saved list opens immediately while Google refreshes it in the background, so a
slow or dropped iframe callback cannot hide the usable logger. Without a recent
saved list, the logger waits 20 seconds, retries the read-only bootstrap once,
and then replaces the indefinite loading screen with **Retry connection** and
**Reload logger** controls. If Google
explicitly rejects a request and the follow-up History check confirms
that nothing was written, the same form can be corrected and saved under a new
request ID without using **Clear entry**. A timed-out request stays protected
until its result is known because it may still be running remotely.

The 5.14.7-and-later interface uses a self-contained multicolor SVG sprite for
navigation, event, metric, queue, and action controls, so those controls do not
depend on emoji fonts or external icon requests. Detailed plant portraits use
the repository's small standalone SVG exports from GitHub Pages and fall back
to the embedded generic plant icon if an asset is unavailable. Plant cards use
Gyazo's cached 960 px thumbnails rather than source-resolution captures; the
source-quality uploads remain available through the field guide and Gyazo
Collections. Existing current-photo previews cover P01-P30, including the P19 rehab
planter and P20 shared succulent planter, with a readable fallback if a remote
preview is unavailable. Archived P31/P32 have no owned-plant photos; their retained guide artwork is not an arrival image.

For a weighing session, the primary **Add to queue** button stores each
completed reading in this phone's local storage while keeping the current plant
selected, so pots can be weighed in any order. Pressing Enter from the weight
box performs the same queue action; **Save now** remains available as the
secondary direct-to-Google path. The optional **Advance to the next plant after
queueing** setting restores sequential entry and remembers that preference. The
queue is not cleared until Google confirms each request ID in History. A colored
queued marker identifies every plant with a weight in the queue. Separate
History-backed markers show weights saved in the current weighing day, beginning
at **4:00 a.m. in the workbook's timezone**;
the progress line and **Not weighed today** filter distinguish that saved
progress from local queued work. Weight-state controls stay collapsed unless the Weigh
event is active or a weight value is present.

Queued measurements are shown beside weight as `height × width unit` (or as a
single labeled dimension), so an unsent ruler reading can be reviewed without
reopening the draft. Measurement unit, quality, and method persist between
entries. New measurements default to inches and `Ruler / tape measure`; choosing
an estimated method automatically changes quality to `Estimated`.

Before the form clears or advances, the logger writes the complete queue to a
primary browser-storage key, reads it back to verify the exact data, and keeps a
second backup key. On reload it restores a missing or damaged primary copy from
that backup and displays a warning so the entries can be reviewed. If storage is
full or unavailable, the current form remains intact and nothing is sent.

One tap on **Send queue** starts a send session. Logger 5.8.2 and later submit the entire
durably stored queue—up to 50 observations—in one server call. Before the call,
every submitted entry is marked as attempted and both browser-storage copies are
read back and verified. The server validates the History schema and reads its
request IDs once, builds all valid new rows in memory, and commits them with one
contiguous History write and one spreadsheet flush. It also clears any stray
data validation inherited by the derived inch columns before writing those rows.

A complete successful callback is authoritative, so the client durably removes
confirmed IDs without making a redundant History status request. It checks the
expected plant and row count in History only after a failed callback, an
incomplete success response, the execution limit, or reload recovery. The queue
stays visible while sending. Missing IDs receive at most three grouped
automatic retries after 2, 5, and 10 seconds; validation errors, incomplete
History reservations, and request conflicts remain queued for review. The
45-second queue watchdog is informational and never enables a competing send or
invalidates the original callback. Only after six minutes thirty seconds—past
Apps Script's documented execution limit—does the client perform one final
History reconciliation and stop the automatic session. Every unresolved request
keeps its original retry ID, so later deliberate sends remain idempotent. Keep
the browser's site data until the queue is empty; clearing browser data also
clears unsent observations and their backup.

A completed request ID is treated as a duplicate only when its canonical
plant, event order, date, entered values, notes, dimensions, measurement unit,
and provenance still match. Reusing a completed ID with changed data returns a
non-retryable History conflict instead of silently accepting the changed entry
or adding a duplicate.

The logger also listens for browser offline/online changes. It will not start a
single, bulk-care, or queued server save while the device reports that it is
offline. Focus, visibility, and orientation changes no longer cancel an active
request. They schedule one debounced recovery check, while an active queue send
remains exclusively controlled by its callback and six-minute-thirty-second
limit. This keeps a phone rotation from unlocking the form while Google is still
writing.

## AppSheet companion intake

The AppSheet companion is a second phone-friendly entry surface, not a second
database. Its writable tables are the workbook's flat `App entries` and
`App bulk` staging sheets. The app must keep `Plant tracker`, `Baselines`, and
`History` read-only; saved care records still enter the canonical ledger only
through `processAppSheetEntry(entryId)`, `processQueuedAppSheetEntries()`, and
`saveWebObservationBatch()` in
[`plant-tracker.gs`](./plant-tracker.gs). Never configure an AppSheet form,
action, or automation to add or edit `History` directly.

The user-facing view map, visual assets, image-provenance rules, watering badge,
ten-panel Insights dashboard, per-plant chart dashboard, helper-table contract,
and sync troubleshooting are documented in
[`docs/appsheet-companion.md`](../../docs/appsheet-companion.md).

Each intake row has a stable `Entry ID` key and a deterministic
`appsheet-{Entry ID}` request ID. That makes automation retries idempotent: a
lost callback can safely call the bridge again without duplicating History
events. One AppSheet entry may select several events, and the bridge applies the
same validation, formulas, provenance, measurement conversion, pot-setup
handling, and event ordering as the mobile logger. When Weigh and Water are
recorded together, History stores Weigh first and Water second so the displayed
order makes it clear that the weight is the post-watering reading.

The AppSheet form contract is:

- `Plant ID` is a required Ref to `Plant tracker`; `Events` is a required
  EnumList containing Water, Weigh, Measure, Check, Rotation, Clean, Prune,
  Repot, Flower, Photo, Pest, and Other.
- Event-specific fields use `Show_If` and `Required_If` rules. Weigh requires a
  positive weight. Measure requires at least height or width and accepts inches
  or centimeters. Water records whether nutrients were used. Repot requires a
  pot size. Photo requires a URL, Pest requires both the issue and action, and
  Rotation accepts 1–360 degrees with a default of 90.
- New measurements default to inches, `Measured`, and `Ruler`; the server still
  normalizes chart values to centimeters while preserving the entered unit and
  derived inch values.
- `Created by`, `Created at`, request ID, History row count, and the save receipt
  are system fields. Users may inspect the status but must not edit the receipt.

The `App bulk` contract is deliberately narrower and faster: one row is one
collection-wide Water, Weigh, Water + weigh, Rotation, Check, Clean, Prune,
Pest, or Other round. It stores `Round ID`, observation time, one action
selector, a compact EnumList of selected plant IDs, a hidden legacy weight-state
field, optional shared care details, and P01-P30 active gram fields. Empty weight fields are
skipped. `processQueuedAppSheetEntries()` combines the selected IDs and
nonblank weights into no more than one deterministic
`appsheet-bulk-{Round ID}-{Plant ID}` request per plant and sends the complete
round through one `saveWebObservationBatch()` call. A selected plant with a
weight becomes one Water + Weigh request; a selected plant without a weight is
Water-only; a non-selected plant with a weight is Weigh-only. New canonical
weight rows are stored as `Routine`; current-setup Dry/Wet/Routine labels are
derived when the workbook, logger, or public tracker reads them.
Other bulk actions use the selected IDs and their shared rotation, check, pest,
nutrient, or note fields without fabricating per-plant values.

In AppSheet, `Selected plants` is an EnumList of refs whose `Valid_If` is
`SORT(Plant tracker[Plant ID])`. Keep that expression in place so shared-action
rounds can select all current P01-P30 records after the source schema changes.
The `Round action` validation must also cover all 30 active weight fields and require the deprecated P31/P32 fields blank; keep
it aligned with [`appsheet-bulk-validation.txt`](./appsheet-bulk-validation.txt).
The prior P01-P22-only check rejected valid weigh-only rounds for newer plants.
`Nutrient amount` is Text in AppSheet, matching the Apps Script contract and
preserving entered units such as `1 mL/L`.

A normal collection-wide round therefore reaches History as one canonical batch,
while partial validation failures keep the round editable and retries recognize
plant updates that were already saved. Run `installAppSheetBulkSheet()` once
before adding or regenerating the table in AppSheet. Rerunning it migrates the
logger 5.10 weight-only header safely, then verifies the current headers,
validation, formatting, and hidden receipt columns.

Keep the `Detailed log` form's column order explicit so receipt fields cannot drift
back into the entry surface when the source schema changes. The form ends with
`Treatment / action`, omits `Status`, `Status message`, and `Saved at`, and keeps
Save/Cancel at the top for long phone forms. Read-only plant and History cards
must not expose edit or delete actions; their action bars are limited to useful
navigation such as `Detailed log`, the field guide, and the referenced plant. The
`Needs attention` view keeps Edit, plant/photo navigation, and `Retry save`, but
does not expose Delete.
Both staging tables use `ADDS_AND_UPDATES`, and their system Edit actions are
shown only when `[Status] = "Needs correction"`. This keeps saved or processing
receipts inspectable without offering edits that the bridge will not consume.

New AppSheet rows start with `Status = Queued`. Do not configure an AppSheet
**Call a script** task for this bridge. AppSheet currently supports only
[standalone Apps Script projects](https://support.google.com/appsheet/answer/11997142),
while the production logger is intentionally container-bound. Copying the
writer into a standalone project would give it a separate script lock and allow
the AppSheet and mobile writers to race.

Instead, deploy the bridge with the existing bound logger and run
`installAppSheetQueueTrigger()` once from its Apps Script editor. The
installer creates a new five-minute trigger first, then removes every older
matching bridge trigger, including legacy one-minute schedules. The final state
is exactly one trigger for `processQueuedAppSheetEntries()`; creating first
prevents a transient trigger-creation failure from removing the working
schedule. Every five minutes, that function processes
up to 50 ordinary `Queued` or `Retry` observations and one or more complete
bulk rounds totaling no more than 50 observations per canonical batch through
`saveWebObservationBatch()`. This keeps AppSheet and the mobile logger inside
the same project lock. AppSheet requires no access to an Apps Script project,
and the companion app should not contain a second save bot. The status written
back to the intake row is authoritative:

- `Saved` means the expected History event rows are complete.
- `Needs correction` means the entry failed deterministic validation; keep the
  row editable, show `Status message`, and require a deliberate retry after the
  input is corrected.
- `Retry` means infrastructure was busy or unavailable. Keep the original
  request ID so the same entry remains safe to submit again.

The prominent `Retry save` action is available only when `Status` is `Needs
correction`. It changes only `Status` to `Retry`; it preserves the original
request ID and every observation field. Keep the status column visible in
receipt/detail views but hidden from forms with
`CONTEXT("ViewType") <> "Form"`, so users cannot manually rewrite the receipt.
Use narrow receipt formatting rather than recoloring the whole row: saved status
and timestamp use a green success treatment, queued retries use amber, and
`Needs correction` status/message use red. These rules make the current state
scannable without masking the observation fields that need correction.

Production access must require Google sign-in, must not allow every signed-in
user, and should be restricted to the workbook owner or an explicit allowlist.
The workbook uses spreadsheet formulas and queued form rows must reach the
workbook promptly, so leave server caching, delta sync, and quick sync disabled;
enable sync on start and automatic updates; and disable delayed sync. The bound
trigger normally archives a queued entry within five minutes, and the next app
sync retrieves its receipt. The app may start offline so a field note can remain
queued until connectivity returns. Store content for offline use is enabled
for the relative Drive portrait paths; complete the first online download in
the native mobile app. External photo URLs and browser AppSheet retain the
offline limitations documented in the companion guide.
The app's primary views should expose the plant collection, current baselines,
active History, new-care form, and any intake rows needing correction. Do not
connect the generated Dashboard, Integrity, Insights layout, or individual
`P01`–`P30` pages as editable AppSheet tables. The intentionally connected
presentation helpers are the hidden, formula-only, read-only `App insight
activity`, `App insight calibration`, `App insight followups`, and `App plant
charts` sheets described in the companion guide. Removing an AppSheet table
definition does not delete its underlying Google Sheets tab.

The visual identity assets are
[`garden-plant-tracker-icon-v2.png`](../../assets/appsheet/garden-plant-tracker-icon-v2.png)
and
[`garden-plant-tracker-launch-v2.png`](../../assets/appsheet/garden-plant-tracker-launch-v2.png).
Keep the compact cactus-and-scale icon for the app/header mark and use the wide
plant-shelf artwork as the launch image. Both belong to this personal tracker;
they are not evidence of a plant identification or licensed archive photos.

## Production-readiness audit

The complete logger and workbook workflow was audited on August 16, 2026. The
current design intentionally uses one canonical `History` ledger and derives
the tracker, dashboard, insights, baselines, plant pages, and public views from
that ledger. The live workbook's formulas, validation, frozen regions,
conditional formatting, and plant-page structure were checked; no formula
errors remained. The `History` plant-name helper was restored to its row-2
anchor, and mobile recent activity now resolves names directly from `Plant
tracker`, so it is not coupled to that display helper or to the physical sort
order of History rows.

The main production safeguards are:

- **Durable client state:** drafts, pending requests, and queued observations
  are written locally before a server call. Queue writes are read back and
  compared, with a separate backup copy and a 50-entry bound.
- **Idempotent writes:** every request has a stable retry ID. Retries reconcile
  against the hidden History request-ID column and cannot silently duplicate a
  completed observation.
- **Native entry constraints:** `QuickCareLog` uses Google Sheets table column
  types for row-level checkboxes, dropdowns, dates, and numbers. The installer
  configures only the bulk controls so it does not conflict with those native
  types, and warning-only protections guard the managed identity and History
  provenance/status columns without blocking intentional maintenance.
- **Safe batch behavior:** queue validation happens before the lock. One script
  lock protects the whole submitted queue, the History identity/request columns are read once,
  ordinary observations are written contiguously, and each result is returned
  independently. A complete callback removes successful phone entries directly;
  failure recovery verifies History before retaining only unresolved entries.
- **Committed writes:** each locked spreadsheet mutation calls
  `SpreadsheetApp.flush()` before releasing the script lock. This follows
  Google's guidance for committing pending spreadsheet changes while exclusive
  access is still held.
- **Asynchronous recovery:** every important `google.script.run` call has a
  success and failure path. Queue callbacks remain valid past the informational
  watchdog, missing IDs use bounded backoff, and page restoration reconciles
  attempted IDs without silently resuming network writes.
- **Touch hit-test safety:** touch devices keep the action bar in normal
  document flow instead of a sticky blurred compositor layer. Physical taps
  reported on action buttons or label-grid choices are rejected when their
  coordinates fall outside the visible target. Rotation and viewport resize
  events rebuild the label targets and refresh layout geometry without
  discarding the current entry.
- **Efficient reads:** bootstrap data is read in rectangular batches. One
  shared History snapshot supplies both current pot sizes and recent activity,
  eliminating duplicate full-ledger scans while keeping manual spreadsheet
  edits immediately visible. Plant records are also reused during queued saves,
  batch status checks scan all requested retry IDs together, and recent activity
  sorts timestamps in memory instead of depending on the user's current sheet
  sort.
- **Versioned deployment:** production uses a versioned deployment whose
  deployment ID is updated in place, preserving the phone URL. Head deployments
  remain for testing only.
- **Verification:** Vitest executes the real server source with Apps Script
  mocks and the real inline client in a browser DOM. Server statements,
  branches, functions, and lines all have 90% CI floors.

This is deliberately production-grade for a private, single-owner garden
logger without pretending to be a distributed database. The unsent queue is
device-local and is not synchronized between phones or browsers. Do not clear
site data before the queue reaches zero. For operational review, use the Apps
Script **Executions** page and `npm run apps-script:logs`; the manifest already
enables Stackdriver exception logging. A standard Google Cloud project would
add richer Cloud Logging controls, but it is optional at this collection's
scale and would add account/permission maintenance.

The implementation follows Google's official guidance for
[Apps Script performance](https://developers.google.com/apps-script/guides/support/best-practices),
[asynchronous HTML-service calls](https://developers.google.com/apps-script/guides/html/reference/run),
[script locks and spreadsheet flushing](https://developers.google.com/apps-script/reference/lock/lock),
[production deployments](https://developers.google.com/apps-script/concepts/deployments),
[logging](https://developers.google.com/apps-script/guides/logging), and
[service quotas](https://developers.google.com/apps-script/guides/services/quotas).

## One-time installation

These steps describe initial installation. Existing production upgrades follow
the scoped migration and deployment guidance above; do not rerun installers
merely to add a chart or change formatting.

The repository contains the logger source, but Google does not install a
container-bound Apps Script merely because the repository is deployed. Install
or update it in the workbook once:

1. Open the [Garden Plant Tracker](https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit).
2. Choose **Extensions → Apps Script**.
3. Replace the complete `Code.gs` contents with
   [`plant-tracker.gs`](./plant-tracker.gs), replace `Index.html` with
   [`Index.html`](./Index.html), and enable the manifest file before replacing
   it with [`appsscript.json`](./appsscript.json). Save the project.
4. Select `installGardenLogger` in the function menu and click **Run** once.
   Approve access to this spreadsheet when Google asks.
5. Return to the workbook and refresh it. A **Garden logger** menu should
   appear.
6. Do not create a synthetic production observation. When a real observation is
   due, save it through the mobile logger or AppSheet and confirm that the expected event row or
   rows appear at the bottom of `History`. If an end-to-end integration test is
   needed before then, create a native Drive copy of the workbook, bind a
   disposable script copy to it, and submit the test observation there.
7. For the phone interface, create a versioned web-app deployment or update the
   existing deployment to the new version. Keep **Execute as** set to the
   deploying user and access limited to the account that owns the workbook.

`refreshGardenWorkbook()` rebuilds the generated Dashboard, Baselines, and all current plant pages in one pass. If Google Sheets reports a service timeout during
that long presentation-only refresh, run
`refreshGardenWorkbookPages01To10()`,
`refreshGardenWorkbookPages11To20()`,
or `refreshGardenWorkbookPages21To30()` from the Apps Script editor for whichever
page batch remains unfinished. These resumable commands rebuild only the named
plant pages; they do not write to canonical `History` or the AppSheet staging
tables.

The maintained page builder places history headers at **A140:L140**, its formula at
**A141**, and retains capacity through **row 5139**. It preserves the summaries
and chart annotations in **rows 14:138**, while rebuilding the top header and
history. Keep those history spill cells free of manually entered content.
For the analytics migration, use the guarded request builder instead of a full
refresh; the [operator guide](WORKBOOK-ANALYTICS.md) defines its write boundaries.

The mobile app remembers the selected plant, theme, plant-picker style, and
recent-History length on that device. The searchable selector can be switched
to a compact grid containing every current pot label. Selected round events can
be retained between plants; weight state is inferred and has no manual control.
The nutrient yes/no choice, product, and amount are remembered and mirrored
between single and bulk care for that browser session. The 12 single-entry
event buttons form a three-by-four grid; bulk care offers Water, Check,
Rotation, Clean, Prune, Pest, and Other.
It deliberately clears measurements after each confirmed save. Bulk care has
its own remembered **List / Labels** switch, with cached SVG portraits in both
views and multiple selections shared across them. Filtering or switching modes
does not discard selected plants; **Select visible** adds only the current
matches, and **Clear selection** removes all selections. Label buttons use
natural pot-label order while save requests retain canonical P-ID order.
The desktop sidebar keeps the garden links. On both desktop and phones, the
active form's save/queue controls come first, followed by the phone queue when
it contains entries (or a storage warning), then Recent History last. A queued
single-plant observation remains visible and sendable while using bulk care.

Apps Script serves HTML inside Google's own sandboxed wrapper. The Google
authorship banner belongs to that wrapper and cannot be hidden by this project's
HTML or CSS. `doGet()` supplies the cactus favicon and mobile-capable metadata;
use the browser's **Add to Home screen** command to create a phone shortcut.

The reserved `onEdit` function is a simple spreadsheet trigger. Once the code
is saved in the workbook, ticking a checkbox runs it automatically; an
installable trigger is not required.

## Logging behavior

- In the spreadsheet's Quick log, editing Event, Weight, Height, Width, Plant condition, or Notes stamps
  `Started at` once. You can edit that timestamp before saving a backdated
  observation.
- One Save can append several event-specific rows. For example, `Water` plus a
  weight and height produces Water, Weigh, and Measure rows without duplicating
  the input values.
- Select Water explicitly when watering was part of the observation; entering a
  weight alone never creates a Water event. New weight rows are stored as
  `Routine`. Derived views mark a weight saved with Water as Wet. If that save
  did not include a weight, they use the first positive reading within the next
  five days. Only the last eligible non-Wet reading before the following Water
  becomes Dry. This preserves History and prevents an unfinished drying
  cycle's newest low from being mislabeled Dry.
- Height and width can be entered together or independently; both belong to one
  Measure row. The mobile logger accepts inches or centimeters and defaults to
  inches. `History` keeps normalized centimeter values for comparable charts,
  preserves the original entry unit, and calculates matching inch values. The
  logger also records whether the dimensions were measured or estimated and how
  they were obtained. Older pending drafts without an explicit unit remain
  centimeters because the pre-5.8 form was centimeters-only.
- Plant condition and soil moisture are separate Check fields. Growing medium
  is recorded separately on Repot rows, so substrate descriptions no longer
  masquerade as dated plant-condition observations. Notes are attached to the
  first event created by a Save so text is not repeated across several history
  rows.
- Rotation records a clockwise-equivalent turn from 1–360 degrees and defaults
  to 90. Clean and Prune are lightweight dated events whose specifics belong in
  Notes.
- The current pot label and plant name are copied from `Plant tracker` at save
  time. Earlier History rows retain the label that was physically on the pot
  when the observation was made.
- `Pot setup` identifies a complete weighed configuration, not pot diameter.
  The August 14 medium change advances `P01`–`P18` to setup 2, even where the
  same physical pot and top dressing were reused. One `Repot` History event per
  container records the three-parts-Molly's/two-parts-perlite-by-volume change.
  Do not edit setup-1 History rows or average old-medium weights into the new
  dry/wet baseline. `P19`–`P22` remain on their existing setups.
- Row 3 can apply one Event to all plant rows or clear every Event cell.
- To exclude an incorrect saved observation, select its row on `History` and
  use **Garden logger → Exclude selected History observations**. Review the
  dated Plant ID, event, and weight preview, then confirm. The command preserves
  the original record and marks it `Removed` with a timestamped correction
  reason. Derived views ignore removed records, while the audit trail remains
  available. Do not delete whole sheet rows or erase calculated cells on a
  plant page.
- A Water event records one of four application styles: `Flood / soak-through`
  (the default), `Thorough`, `Partial`, or `Spot`. `Water amount (mL)` is
  optional and stays blank when volume was not measured.
- `History` A:L stores core observation data; M:O holds row-local derived
  values; P stores a hidden retry ID; Q:Z stores structured nutrient, repot,
  flower, photo, pest, and treatment details; AA:AJ stores durable
  observation identity, source, quality, correction, soil-moisture, medium,
  method, and status fields; AK:AM stores the entry unit plus automatic
  height/width inch conversions; AN stores rotation degrees; and AO:AP store
  watering application plus optional measured milliliters. A save writes the
  entire A:AP record block in one call so a failed service call cannot
  strand a request ID apart from its
  observation. The installer keeps 5,000 History rows available, and workbook
  formulas use that same bound so new observations cannot outgrow the derived
  dashboards silently.
- The Bulk care tab can append Water, Check, Rotation, Clean, Prune, Pest, or
  Other rows for every selected plant with shared details. Use single-plant
  mode for weights, measurements, repots, flowers, and photos because those
  values differ by plant.
- Photo events accept Google Photos share links and exact Gyazo capture links.
  **Open Google Photos** hands
  off to the app when the phone/browser supports Google Photos links, otherwise
  it opens the website. Select the image there, create a share link, return to
  the logger, and paste it. A browser file picker cannot return a durable Google
  Photos share URL. The public plant history opens the saved link; booklet
  display uses a separately published and verified Gyazo capture recorded by
  `scripts/publish-collection-photo.ps1`. Camera originals stay private and no
  new collection-photo binary is added to the repository.
- `Baselines` derives the latest completed Dry endpoint and the latest Wet
  anchor for the current setup. Wet is either a same-save weight or the first
  positive reading within five days after Water. Its dry-down model learns
  from reliable completed cycles, then updates the estimate with new readings;
  see **Dry-down learning** below. Its 34th
  physical field, hidden `Forecast sort date`, uses the predicted date when
  available and a far-future fallback otherwise. This keeps actionable
  forecasts ahead of plants that do not yet have enough evidence without
  exposing a helper value in AppSheet.

## Dry-down learning

Logger **5.17.0** can estimate a reweigh window after the next Wet reading
without requiring four new weights every watering cycle. The first useful
curve still needs evidence; the model does not invent a history for a new pot.

- Training uses up to five recent, completed cycles for the **same Plant ID and
  pot setup**, ending within 180 days of the current watering. A Repot advances
  the setup, so old-pot curves and anchors cannot carry over. Changes to the
  saucer, top dressing, medium, or other weighed components normally need a new
  setup before the weights are compared. The September 17 adjustment documented above is an owner-authorized exception for paired measurements of known dry added mass; the logger does not apply that compensation automatically.
- A completed cycle needs a Wet anchor, a later non-Wet endpoint before the
  following watering, at least four distinct dated readings spanning three
  days, a descending log-linear fit with R² at least 0.60, and a meaningful
  weight drop. Removed, estimated, non-Weigh, invalid, and nonpositive readings
  do not train the model. Partial/spot watering does not train or receive a
  full-cycle forecast. Blank watering applications remain legacy/unspecified
  evidence; no historical application or Weight state is rewritten.
- Recent, better-fitting cycles have more influence (60-day recency
  half-life). A new Wet reading starts a **Historical estimate**. Two or three
  usable current readings gradually adjust it; four across three days can
  support **Current curve + history**. At six usable current readings, the
  **Current-cycle curve** takes over. A conflicting gain or poor current fit
  prompts a reweigh instead of silently falling back to history.
- The exponential model approaches an asymptote one noise-band below the
  observed completed Dry endpoint. The band is the larger of 2 g or 5% of
  wet-minus-dry capacity. This allows the measured endpoint in a logarithmic
  fit without taking log(0). The predicted check is entry into the near-dry
  band, not a claim that all water has left the pot. Fits use up to 12 recent
  points per cycle.
- **Next dry check** shows a planning window. It widens for sparse training,
  differing cycles, or uncertain fits; it is not a statistical confidence
  interval. **Forecast confidence** names the basis and learned-cycle count.
  The logger shows the same window/basis beside the selected plant. Dates stay
  anchored to the latest actual reading; a missed window says to reweigh.
  Forecasts more than 90 days beyond that reading are withheld as too uncertain.
- Rapid-loss alerts require a supported current curve, not a historical
  prediction or day-one extrapolation. With learned history, a decay rate over
  1.75 times the learned rate prompts **Faster than learned — reweigh**. Without
  learned history, the existing 3%-of-whole-pot-weight daily-loss threshold is
  retained only after the current curve is supported. These are inspection
  prompts, not diagnoses or watering instructions.

One hidden **Dry-down models** sheet runs `GARDEN_DRY_DOWN` over the bounded
History inputs and spills the results for all current tracked containers. The function reads
only its arguments, does not change cells or contact external services, and
recalculates when the referenced History data changes. This follows Google's
[range-based custom-function guidance](https://developers.google.com/apps-script/guides/sheets/functions).
Ordinary formulas in the existing Baselines fields feed Dashboard, plant
pages, and AppSheet. Keep this helper disconnected from AppSheet; all existing
History and staging contracts are unchanged. The original learning rollout used
34 Baselines columns; the watering-planning extension below appends two derived
fields without moving the existing ones.

After backing up and deploying the checked-in script, run
`installDryDownLearning()` to install the helper and replace only the
forecast-related Baselines formulas. It preserves the owner's sheet layout,
charts, and all canonical observations. `refreshGardenWorkbook()` also
includes the helper when deliberately rebuilding the full presentation.

### Conditional watering-planning dates (5.18.0)

`Recommended water date` is a **planning estimate, conditional on inspection**,
not an instruction to water on a deadline. It uses the supported near-dry date
from the same learned curve, using its calendar date. New measurements and
reliable completed cycles update it automatically. Repots, unsupported curves,
and partial watering retain the existing forecast safeguards.

There is no automatic four- or six-day delay after the modeled dry point. A
pre-watering weight does not prove bone-dry soil, and past watering timestamps
cannot establish an optimal drought duration without independent observations
of root-zone dryness and plant condition. The logger retains the broader
**Reweigh** window and model basis beside the date so its uncertainty stays
visible. Missed windows require fresh inspection, not an automatic watering.

- Most cacti and succulent records receive a conditional date with a dry-root
  and plant-readiness check, reducing watering during rest.
- **P21 / money tree** has no weight-only water date. Check the upper 2 in of
  medium as documented by its nursery label; do not wait for the whole root ball
  to become bone dry.
- **P28 / split rock** has no weight-only water date. Check inner-leaf firmness
  and leaf replacement; wrinkled old leaves or a dry pot alone are insufficient.
- **P22 / Kiwi aeonium** calls out active growth versus resting conditions.
- **P31 and P32** are archived canceled-order IDs and receive no active care recommendation.
- **P20 and P30 / shared succulent planters** require checking the shared root
  zone and every component, not just one visible plant.

The verified live derived schema is:

| Sheet                    | Recommended water date | Watering guidance | Total derived fields |
| ------------------------ | ---------------------- | ----------------- | -------------------- |
| Baselines                | AI                     | AJ                | 36                   |
| Dashboard                | W                      | X                 | 31                   |
| Dry-down models (hidden) | O                      | P                 | 22                   |

After a native Drive backup and fresh preflight, `installWateringRecommendations()`
installs the model/forecast formulas and appends only these two visible columns.
It checks both destinations before writing and refuses unexpected headers,
unlabelled content, or formulas. The new formulas use each displayed row's Plant
ID, preserving custom ordering, charts, all original columns, and canonical
History. Existing `installDryDownLearning()` remains available for a forecast-only
refresh. Do not run a full workbook rebuild merely to add these fields.

AppSheet needs a **Baselines-only regeneration and save** to expose the appended
fields in its app. Keep Baselines read-only, configure the new date as Date and
the guidance as LongText, then include both in the Watering forecast view. Do not
add the hidden helper as an AppSheet table or regenerate History/staging for this
change. This watering-only procedure does not require other table changes. The
September 5 chart audit separately expanded Insights data, so that read-only
helper also required regeneration. Both updates are live; the deployment
baseline above records the verified configuration.

Care basis: [University of Minnesota cacti and succulent guidance](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/cacti-and-succulents)
supports drying between waterings and reducing water in low-light rest, not a
universal extra drought interval. Collection-specific exceptions remain in the
[money tree](../../docs/plants/houseplants/pachira-glabra.md),
[split rock](../../docs/plants/succulents/pleiospilos-nelii-royal-flush.md), and
[Kiwi aeonium](../../docs/plants/succulents/aeonium-haworthii-dream-color.md) profiles.

The workbook and public pages are personal but publicly viewable. Do not put
private addresses, credentials, or precise home-location information in Notes.
