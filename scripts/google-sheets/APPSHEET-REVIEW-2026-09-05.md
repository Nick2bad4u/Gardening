# AppSheet portrait and usability review — September 5, 2026

The review started from AppSheet 1.100099, logger 5.18.0 (Apps Script version
64), and repository commit `b5aa4574ed190a56735775eb4a42933a46b2db7c`.
The authenticated Edge editor and generated app documentation are the live
configuration evidence.

AppSheet **1.100104** is now saved and deployed. Its generated definition
reports Runnable and Deployable as Yes. The existing logger remains at
5.18.0 / immutable version 64 and retains its stable deployment URL.

## Backup and data boundary

Native workbook backup:
`1OI8DiljCvLxs7Sr8ovPgaWnLV7N9OphH9oQY5Df-5tw`.
The initial live range contains 691 canonical records, 690 active records,
42 physical columns, no blank request IDs, and no duplicate active
request/plant/event keys. Shared request IDs across different event rows are
expected.

The review covers all ten connected data tables, five slices, 41 views,
29 initial actions, three format rules, and the app information, theme, security,
offline, and sync settings. The eleventh table in the generated definition is
AppSheet's internal user-settings table.
The final definition has 28 actions after disabling the detailed staging
table's delete permission.

## Published changes

- Add the Image virtual column `Plant portrait`, with an image label for
  reference pickers. Use it in Plants and dereference it in Care history.
  Preserve the existing photo column and photo access.
- Store the thirty P01-P30 SVGs in
  `GardenPlantPortraits-2e71bf2a701aa61f`, beside the source workbook in Drive.
  The folder is private and the app continues to require signed image URLs.
  The checked-in portrait manifest records the exact source slug for each ID;
  the expression uses the revisioned relative path.
- Repair the per-plant Quick Log action from
  `LINKTOFORM("Log care", "Plant ID", [Plant ID])` to
  `LINKTOFORM("Log", "Plant ID", [Plant ID])`.
- Allow nutrient amounts with units in Bulk Log by using Text instead of
  Number, matching the detailed logger and Apps Script text contract.
- Extend the Round action validation through P30. The previous expression
  considered only P01-P22, rejecting valid weigh-only rounds for P23-P30.
  Require at least one positive weight for Weigh and Water + weigh, and
  selected plants for shared care actions. Label the round as a single action;
  reserve multiple selection for the plant picker.
- Replace the bulk form's implementation descriptions with clear field labels:
  observation time, one round action, selected plants, rotation, condition,
  moisture, pest/issue, treatment/action, nutrients added, nutrient product,
  and nutrient amount with units. AppSheet displays column descriptions as
  form prompts, so the two identical nutrient prompts previously hid which
  field was the product and which was the amount.
- Keep App entries adds and updates enabled, but disable deletes so processing
  receipts remain available. Offer the staging Edit actions only when Status
  is `Needs correction`, avoiding edits to already saved or processing rows.
- Compact the Watering age badge to an elapsed-day count, such as `🟢 1d`.
  This fixes the clipped phone summary and the old `1 days since water` text.
  Keep the full date and days-since-water fields in plant details.
- Correct Current-cycle dry-down, which previously included weights from
  older cycles. A hidden DateTime `Current cycle start` on Plant tracker finds
  the latest active Water or Repot in the current pot setup. The read-only
  current-cycle slice now excludes earlier observations. App plant charts
  retains DateTime values so an earlier reading on the same day is not
  accidentally included. Full weight history remains available separately;
  the canonical and helper spreadsheet formulas are unchanged.
- Update 22-plant and P01-P22 descriptions to the current thirty plants and
  planters, the Log and Bulk Log view names, and the nine supported bulk actions.
  Remove the unsupported AI tag. Replace unrelated README links in the privacy
  and usage information with factual descriptions of this personal app.

## Cache and sync configuration

Offline startup and Store content for offline use are enabled. Sync on start
and Automatic updates are enabled; Delayed sync, Server caching, Delta sync,
and Quick sync are disabled. These existing settings fit a formula-backed
Google Sheet that Apps Script updates directly.

Native mobile offline image storage requires a completed online download and
relative image paths. The new portraits meet that path requirement. AppSheet
in a web browser does not provide native offline image caching; external
reference and collection photo URLs also retain that limitation. Do not claim
that a desktop cache check proves airplane-mode behavior on a phone.

The portrait folder name changes with the artwork revision, so a later release
can replace cached artwork without changing the bytes at an existing image
path. Preserve older folders until existing app clients have synced.

The authenticated browser network check observed successful SVG responses
from AppSheet's image cache with `Cache-Control: private, max-age=0` and
fifteen visible-portrait requests after a reload. That policy is controlled by
AppSheet, so this review does not promise zero-download browser reloads. The
separate quick logger retains its persistent Cache Storage implementation;
its previous browser verification observed zero portrait downloads on warm
and image-server-offline reloads. Native phone airplane-mode behavior was
not exercised in this desktop browser session.

## Verification and retained behavior

- All thirty uploaded P01-P30 files were individually verified as SVGs in the
  private revisioned Drive folder. All thirty live app images completed with
  150 × 150 natural dimensions, including the two shared planters and P30.
- Desktop and 390 px mobile browser inspections covered the portrait list,
  history thumbnails, lookup/search, detailed and bulk forms, all ten Insights
  panels, conditional forecast dates and guidance, and per-plant charts.
  The native dark theme uses garden green `#43a047` and Roboto at 18 px;
  ten user-facing navigation icons remain distinct.
- The corrected P01 current-cycle chart shows eight readings after its latest
  Water, excluding fifteen older readings. Full weight history retains all
  twenty-three. An independent comparison against active canonical records
  found 154 current-cycle weights and 383 earlier weights across all thirty
  plants; the app boundary preserves same-day timestamps and ignores Removed
  anchors and previous pot setups.
- Quick Log opened Log with P30 preselected. Plant lookup found P29 by ID.
  Water-only bulk entry hid the weight fields. A nutrient amount of `1 mL/L`
  remained valid text. P30-only and P23-only positive-weight drafts passed
  Round action validation; empty and zero-weight rounds were rejected.
  Every validation draft was cancelled and discarded, with zero unsynced
  changes and no synthetic observation submitted.
- Bulk rounds and Needs attention had no items. Their empty states were
  checked live; edit/retry conditions were checked in the saved definition
  because there were no existing rows suitable for exercising those actions.
- All eight canonical/helper tables remain `READ_ONLY`; both staging tables
  are `ADDS_AND_UPDATES`. Google sign-in, the restricted allowlist, signed
  image URLs, reference-photo links, and the formula-safe sync settings remain
  intact. No schema regeneration or workbook mutation was needed.
- The final native Sheets comparison preserved all 691 History records and
  formulas exactly, with 691 unique observation IDs, 690 active records,
  no blank request IDs, and no duplicate active request/plant/event keys.
  Tracker, Baselines, and staging user-entered values, formulas, and
  validations matched the pre-review read; the checked ranges had no formula
  errors.
- The logger suite passed all 219 tests, with 99.75% statement coverage,
  90.08% branch coverage, 100% function coverage, and 99.74% line coverage.
  The logger checker and generated booklet checker passed; the latter covered
  38 exported SVGs, 36 profiles, 282 licensed references, 174 collection-photo
  placements, and 31 label placements.
- The source checker now cross-checks AppSheet portrait IDs, SVG source files,
  artwork revision, and every bulk-weight validation field against the logger
  contract, preventing another silent P23-P30 omission during a future update.
  An in-memory omission of P30 was correctly rejected without editing files.
- The authenticated trigger editor showed exactly one Head queue trigger on
  Every 5 minutes. Recent queue runs and version-64 doGet, bootstrap, and
  recent-history executions completed successfully. The existing deployment
  remains assigned to immutable version 64.
- Repository-wide Markdown, Prettier, configured link checks and link smoke,
  Gitleaks, Secretlint, and diff-whitespace checks passed.

## Sources

- [AppSheet offline and sync](https://support.google.com/appsheet/answer/10107724?hl=en)
- [AppSheet image paths, sizing, and CDN caching](https://support.google.com/appsheet/answer/10107317?hl=en)
- [AppSheet sync performance](https://support.google.com/appsheet/answer/10104985?hl=en)
