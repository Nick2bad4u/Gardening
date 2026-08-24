# Google Sheets observation logger

The **Garden Plant Tracker** workbook uses permanent `P01`–`P22` plant IDs
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
callbacks, the 20-second save watchdog, picker persistence, adjustable recent
History, queue-storage failures, backup recovery, partial batch replies, and the
Google Photos handoff. The coverage report measures the Apps Script server file
directly and is uploaded to Codecov in CI. Statements, functions, and lines have
90% CI floors. Branch coverage also has a 90% floor; the one-sided guards marked
with `v8 ignore next` have explicit tests for both outcomes, but the V8 provider
otherwise reports an uncovered synthetic alternate branch for those lines. The
inline client script is exercised by DOM tests but is not included in the V8
percentage, because treating the complete HTML file as JavaScript would produce
a false source map. `npm run check:logger` remains a fast source-contract smoke
check.

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
calls Google. If the callback is lost, logger 5.8 checks History for that exact
request on timeout and page load. A completed save clears itself automatically;
an absent or partial save keeps the draft available for an idempotent retry. If
Google explicitly rejects a request and the follow-up History check confirms
that nothing was written, the same form can be corrected and saved under a new
request ID without using **Clear entry**. A timed-out request stays protected
until its result is known because it may still be running remotely.

For a weighing session, the primary **Add to queue** button stores each
completed reading in this phone's local storage while keeping the current plant
selected, so pots can be weighed in any order. Pressing Enter from the weight
box performs the same queue action; **Save now** remains available as the
secondary direct-to-Google path. The optional **Advance to the next plant after
queueing** setting restores sequential entry and remembers that preference. The
queue is not cleared until Google confirms each request ID in History. A green
check marks every plant with a weight in the queue, the progress line counts
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
full or unavailable, the current form remains intact and the batch is not sent.
When the round is ready, **Send queue** durably marks every request as attempted,
then submits up to 50 observations in one Apps Script call. Every queued record
has its own retry key, so a lost callback, screen rotation, timeout,
storage-write failure, or partial batch can be reconciled and safely retried
without duplicating successful entries that already arrived. Keep the browser's
site data until the queue is empty; clearing browser data also clears unsent
observations and their backup.

The logger also listens for browser offline/online changes. It will not start a
single, bulk-watering, or queued server save while the device reports that it is
offline. Focus, visibility, and orientation changes no longer cancel an active
request: they schedule one debounced recovery check, and only a request that has
actually exceeded its watchdog is reconciled. This keeps a phone rotation from
unlocking the form while Google is still writing.

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
  lock protects the write phase, each result is returned independently, and a
  partial failure retains only the unresolved phone entries.
- **Committed writes:** each locked spreadsheet mutation calls
  `SpreadsheetApp.flush()` before releasing the script lock. This follows
  Google's guidance for committing pending spreadsheet changes while exclusive
  access is still held.
- **Asynchronous recovery:** every important `google.script.run` call has a
  success and failure path. Lost callbacks, watchdog expiry, page restoration,
  reconnects, and stale late replies all converge on request-ID reconciliation.
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
  and recent activity sorts timestamps in memory instead of depending on the
  user's current sheet sort.
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
6. Enter a short test note on one `Quick log` plant row and tick **Save**.
   Confirm that a new row appears at the bottom of `History`.
7. For the phone interface, create a versioned web-app deployment or update the
   existing deployment to the new version. Keep **Execute as** set to the
   deploying user and access limited to the account that owns the workbook.

The mobile app remembers the selected plant, theme, plant-picker style, and
recent-History length on that device. The searchable selector can be switched
to a compact grid containing every current pot label. Selected round events can
be retained between plants, while the weight state defaults to `Routine` and
remembers the last Dry/Wet/Routine choice only for the current browser session.
It deliberately clears measurements after each confirmed save. The desktop
view keeps links and recent History in a sidebar; phone layouts stack those
surfaces above the single-entry and watering-round tabs.

Apps Script serves HTML inside Google's own sandboxed wrapper. The Google
authorship banner belongs to that wrapper and cannot be hidden by this project's
HTML or CSS. `doGet()` supplies the cactus favicon and mobile-capable metadata;
use the browser's **Add to Home screen** command to create a phone shortcut.

The reserved `onEdit` function is a simple spreadsheet trigger. Once the code
is saved in the workbook, ticking a checkbox runs it automatically; an
installable trigger is not required.

## Logging behavior

- Editing Event, Weight state, Weight, Height, Width, Plant condition, or Notes stamps
  `Started at` once. You can edit that timestamp before saving a backdated
  observation.
- One Save can append several event-specific rows. For example, `Water` plus a
  weight and height produces Water, Weigh, and Measure rows without duplicating
  the input values.
- A `Wet` weight also records Water unless Water is already the selected event.
  A weight with no state is stored as `Routine`.
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
- A Water event means the container was soaked until runoff; water volume is
  intentionally not recorded.
- `History` A:L stores core observation data; M:O holds row-local derived
  values; P stores a hidden retry ID; Q:Z stores structured nutrient, repot,
  flower, photo, pest, and treatment details; AA:AJ stores durable
  observation identity, source, quality, correction, soil-moisture, medium,
  method, and status fields; and AK:AM stores the entry unit plus automatic
  height/width inch conversions. A save writes the entire A:AM record block in one
  call so a failed service call cannot strand a request ID apart from its
  observation. The installer keeps 5,000 History rows available, and workbook
  formulas use that same bound so new observations cannot outgrow the derived
  dashboards silently.
- The Watering round tab can append one Water row for every selected plant with
  shared nutrient and note details. Use single-plant mode when each pot also
  needs its own wet weight.
- Photo events accept Google Photos share links. **Open Google Photos** hands
  off to the app when the phone/browser supports Google Photos links, otherwise
  it opens the website. Select the image there, create a share link, return to
  the logger, and paste it. A browser file picker cannot return a durable Google
  Photos share URL. The public plant history opens the saved link; booklet
  display still requires a local collection-photo derivative.
- `Baselines` uses completed wet-to-dry cycles to estimate drying time, which is
  shown in `Plant tracker`. Treat that estimate as context, not a watering
  deadline.

The workbook and public pages are personal but publicly viewable. Do not put
private addresses, credentials, or precise home-location information in Notes.
