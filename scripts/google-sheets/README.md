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
History, and the Google Photos handoff. The coverage report measures the Apps
Script server file directly and is uploaded to Codecov in CI. The inline client
script remains exercised by DOM tests but is not included in the V8 percentage,
because treating the complete HTML file as JavaScript would produce a false
source map. `npm run check:logger` remains a fast source-contract smoke check.

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
calls Google. If the callback is lost, logger 5.2 checks History for that exact
request on timeout and page load. A completed save clears itself automatically;
an absent or partial save keeps the draft available for an idempotent retry. If
Google explicitly rejects a request and the follow-up History check confirms
that nothing was written, the same form can be corrected and saved under a new
request ID without using **Clear entry**. A timed-out request stays protected
until its result is known because it may still be running remotely.

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

- Editing Event, Weight state, Weight, Height, Width, Condition, or Notes stamps
  `Started at` once. You can edit that timestamp before saving a backdated
  observation.
- One Save can append several event-specific rows. For example, `Water` plus a
  weight and height produces Water, Weigh, and Measure rows without duplicating
  the input values.
- A `Wet` weight also records Water unless Water is already the selected event.
  A weight with no state is stored as `Routine`.
- Height and width can be entered together or independently; both belong to one
  Measure row.
- Condition / soil belongs to a Check row. Notes are attached to the first event
  created by a Save so text is not repeated across several history rows.
- The current pot label and plant name are copied from `Plant tracker` at save
  time. Earlier History rows retain the label that was physically on the pot
  when the observation was made.
- `Pot setup` identifies a complete weighed configuration, not pot diameter.
  The August 14 medium change advances `P01`–`P18` to setup 2, even where the
  same physical pot and top dressing were reused. One `Repot` History event per
  container records the three-parts-Molly's/two-parts-perlite-by-volume change.
  Do not edit setup-1 History rows or average old-medium weights into the new
  dry/wet baseline. `P19`–`P22` remain on their existing setups.
- Row 3 can apply one Event to all plant rows or clear every Event cell. The
  **Garden logger → Clear selected Quick log row** command clears one unfinished
  input row without touching History.
- A Water event means the container was soaked until runoff; water volume is
  intentionally not recorded.
- `History` A:L stores core observation data; M:O holds workbook-derived values;
  P stores a hidden retry ID; and Q:Z stores structured nutrient, repot, flower,
  photo, pest, and treatment details. The logger does not overwrite the N:O
  array formulas.
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
