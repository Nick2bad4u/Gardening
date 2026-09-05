# Google Sheets observation logger

The **Garden Plant Tracker** workbook uses permanent `P01`–`P30` plant IDs
internally and keeps the physical pot label (`A1`, `F3`, `#2`, and so on) as a
separate value. That prevents a repot or label change from breaking a plant's
history.

The `Quick log` tab is the input surface. Each plant or shared planter has one
input row, while every saved event becomes a new append-only row on `History`.
The Dashboard, Insights, Baselines, individual plant tabs, and public website
all read from that shared history.

For phone entry, open the
[mobile entry app](https://script.google.com/macros/s/AKfycbytpdMto4ZAqOf49igDNoGYr-J6fmSRDNJOKP4-dKDFRmM2YkTCKJp3kmhrD4gOJShF/exec).
It writes to the same workbook and may ask you to sign in to the Google account
that has access.

Google Sheets formulas cannot preserve a value after an input cell is
overwritten. The bound Apps Script in
[`plant-tracker.gs`](./plant-tracker.gs) supplies that write-time archive step.
[`Index.html`](./Index.html) is the mobile entry UI, and
[`appsscript.json`](./appsscript.json) records the project runtime settings.

## Current production baseline

The production baseline verified before the 5.17.1 rollout on September 4, 2026,
identifies the logger as **5.17.0** on immutable Apps Script version **62**.
The existing production deployment was updated in place, so the production URL
above remains unchanged. Treat these values as a handoff baseline, not a
substitute for checking `GARDEN_LOGGER.version`, `clasp versions`,
`clasp deployments`, and the authenticated live page before a future release.

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
  include P29-P30. The native `QuickCareLog` table remains
  `'Quick log'!A4:M34`; the two logger-managed watering fields sit immediately
  beside it at N:O. Existing canonical History rows remain unchanged while its
  append-only schema gains AO:AP.
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

The [Dry-down learning](#dry-down-learning) section explains the forecast rules.

## Plant portrait caching

Logger 5.17.1 loads portraits as they enter the visible picker area and shares
one download between repeated uses of a plant in the current page. The browser's
Cache Storage retains each SVG across reloads, including when the image server
is unreachable. This caches artwork only; it does not make the Google-hosted
logger itself available offline.

`npm run build:booklet` derives `PLANT_ICON_REVISION` from the 36 exported SVGs.
Each image URL includes this revision. The cache stores one entry per portrait
and replaces an older revision when needed, so future artwork updates do not
leave the logger stuck on old icons or accumulate a second complete set.
Publish the Pages assets before deploying a logger that refers to their revision.

If persistent image storage is unavailable, portraits use ordinary browser HTTP
caching. Missing images fall back to the built-in plant icon. The shared P19 and
P20 planters use that icon directly because their field-guide links point to the
collection contents rather than a single plant profile. Portrait caching never
clears the local draft, save-recovery, or queued-observation storage.

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
npm run test:logger
npm run test:logger:coverage
```

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
Collections. Current-photo previews now cover P01-P30, including the P19 rehab
planter and P20 shared succulent planter, with a readable fallback if a remote
preview is unavailable.

For a weighing session, the primary **Add to queue** button stores each
completed reading in this phone's local storage while keeping the current plant
selected, so pots can be weighed in any order. Pressing Enter from the weight
box performs the same queue action; **Save now** remains available as the
secondary direct-to-Google path. The optional **Advance to the next plant after
queueing** setting restores sequential entry and remembers that preference. The
queue is not cleared until Google confirms each request ID in History. A colored
queued marker identifies every plant with a weight in the queue, the progress line counts
weighed plants, and the queue card turns green when every tracked plant has a
weight safely queued. Weight-state controls stay collapsed unless the Weigh
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
field, optional shared care details, and P01-P30 gram fields. Empty weight fields are
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

A normal 30-plant round therefore reaches History as one canonical batch,
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
queued until connectivity returns, but do not cache every image and file for
offline use.
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

The repository contains the logger source, but Google does not install a
container-bound Apps Script merely because the repository is deployed. Install
or update it in the workbook once:

1. Open the [Garden Plant Tracker Quick log](https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=2015971861#gid=2015971861).
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
   due, save it through `Quick log` and confirm that the expected event row or
   rows appear at the bottom of `History`. If an end-to-end integration test is
   needed before then, create a native Drive copy of the workbook, bind a
   disposable script copy to it, and submit the test observation there.
7. For the phone interface, create a versioned web-app deployment or update the
   existing deployment to the new version. Keep **Execute as** set to the
   deploying user and access limited to the account that owns the workbook.

`refreshGardenWorkbook()` rebuilds the generated Dashboard, Baselines, and all
30 plant pages in one pass. If Google Sheets reports a service timeout during
that long presentation-only refresh, run
`refreshGardenWorkbookPages01To10()`,
`refreshGardenWorkbookPages11To20()`, or
`refreshGardenWorkbookPages21To30()` from the Apps Script editor for whichever
page batch remains unfinished. These resumable commands rebuild only the named
plant pages; they do not write to canonical `History` or the AppSheet staging
tables.

The mobile app remembers the selected plant, theme, plant-picker style, and
recent-History length on that device. The searchable selector can be switched
to a compact grid containing every current pot label. Selected round events can
be retained between plants; weight state is inferred and has no manual control.
The nutrient yes/no choice, product, and amount are remembered and mirrored
between single and bulk care for that browser session. The 12 single-entry
event buttons form a three-by-four grid; bulk care offers Water, Check,
Rotation, Clean, Prune, Pest, and Other.
It deliberately clears measurements after each confirmed save. The desktop
view keeps links and recent History in a sidebar; phone layouts stack those
surfaces above the single-entry and bulk-care tabs.

Apps Script serves HTML inside Google's own sandboxed wrapper. The Google
authorship banner belongs to that wrapper and cannot be hidden by this project's
HTML or CSS. `doGet()` supplies the cactus favicon and mobile-capable metadata;
use the browser's **Add to Home screen** command to create a phone shortcut.

The reserved `onEdit` function is a simple spreadsheet trigger. Once the code
is saved in the workbook, ticking a checkbox runs it automatically; an
installable trigger is not required.

## Logging behavior

- Editing Event, Weight, Height, Width, Plant condition, or Notes stamps
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
- Photo events accept Google Photos share links. **Open Google Photos** hands
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
  saucer, top dressing, medium, or other weighed components also need a new
  setup before the weights are compared.
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
History inputs and spills the results for all 30 plants. The function reads
only its arguments, does not change cells or contact external services, and
recalculates when the referenced History data changes. This follows Google's
[range-based custom-function guidance](https://developers.google.com/apps-script/guides/sheets/functions).
Ordinary formulas in the existing Baselines fields feed Dashboard, plant
pages, and AppSheet. Keep this helper disconnected from AppSheet; all existing
History, staging, and 34-column Baselines contracts are unchanged.

After backing up and deploying the checked-in script, run
`installDryDownLearning()` to install the helper and replace only the
forecast-related Baselines formulas. It preserves the owner's sheet layout,
charts, and all canonical observations. `refreshGardenWorkbook()` also
includes the helper when deliberately rebuilding the full presentation.

The workbook and public pages are personal but publicly viewable. Do not put
private addresses, credentials, or precise home-location information in Notes.
