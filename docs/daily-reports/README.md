# Daily garden report

The [daily report](https://nick2bad4u.github.io/Gardening/layouts/daily-report.html)
is a static page for the phone: a quick list, watering recipes, searchable
plant cards, weight changes, plateau evidence, a compact pocket list, and a
separate AI recommendation at the bottom.
It shows the report date and actual workbook-read time. An older report gets
a visible date warning when opened or revisited. Refresh the page to retrieve
a newly published report; it does not poll or write to the spreadsheet.

The **Garden — Watering & Weighing** task runs at **9:45 a.m. Eastern daily**.
Its [complete instructions](../daily-weighing-watering-prompt.md) govern the
live review and care recommendations. The owner authorized daily report commits
and pushes on September 14, 2026. This permission covers report publication;
it does not authorize recording care, changing workbook formulas, or deploying
the logger. The computer, Codex app, source connections, and GitHub access must
be available for the local task to complete.

The Daily care worksheet was retired on September 16, 2026. This report and
the existing daily chat task are the maintained plan; neither needs that tab.
Dashboard and Integrity remain live workbook summaries.

## One layout, dated inputs

- `YYYY-MM-DD.json` holds the reviewed public report for that Eastern date.
  Historical inputs stay in this directory; Git also records same-day revisions.
- [Report types](../../types/daily-report.d.ts) define the version 2 input.
- [Validation and calculations](../../scripts/daily-report-model.mjs) check
  coverage, identifiers, timestamps, current-cycle intervals, plateau tails,
  and watering-reason/mix consistency. They calculate the last-two change per
  actual elapsed day, including daylight-saving transitions.
- [Generator](../../scripts/build-daily-report.mjs) selects the latest dated
  input and renders the [HTML template](../../scripts/templates/daily-report.html).
- [Generated page](../layouts/daily-report.html),
  [styles](../layouts/daily-report.css), and
  [browser enhancements](../layouts/daily-report.js) use the existing Pages build.
  The readable HTML and native expandable cards work without JavaScript.

The generator formats reviewed decisions. It does not access private accounts,
recalculate the workbook's plateau predicate, infer plant readiness from one
weight, or decide which pots need fertilizer. The daily task must review fresh
sources first and preserve the current model's eligibility and setup rules.

Since September 15, **Water requires a confirmed sustained plateau** as well as
the existing validity and plant-specific guards. A dry-reference hit without a
confirmed plateau belongs in **⏳ Dry reference reached — waiting for plateau**,
with no watering recipe. The quick list, filter, and amber card badge keep these
pots separate from Water and Nothing today. The usual moisture/readiness check
still applies to Water candidates. Plateau evidence does not prove dry soil.

Version 2 enforces this distinction during validation. Archived version 1 inputs
retain the decisions made under the previous policy; they are not valid inputs
for the current generator without a reviewed policy migration. Do not rewrite
historical observations or label a policy-only revision as a fresh workbook read.

Each new review also includes `aiRecommendation`: a nonempty array of plain-text
paragraphs authored by the reviewing AI after considering the full evidence.
The generator displays them in a separate **🤖 AI recommendation** section after
the pocket list; Copy list includes them after the main recommendations.
The main Water list remains plateau-gated. If the AI suggests a different action,
it must label an **AI exception to the main list**, explain the evidence and
uncertainty, and retain the plant-specific readiness and nutrient conditions.
See the [task instructions](../daily-weighing-watering-prompt.md) for the full
assessment policy. The generator does not infer or invent this assessment.

The field is optional only for compatibility with earlier version-2 reports.
An older report without it shows an explicit not-recorded notice. Do not backfill
an old snapshot with new advice or change its date/source-read time just to add
this section.

## Shared detector analysis

Run the current Apps Script detector locally before authoring a fresh report:

```powershell
node scripts/analyze-drying.mjs .cache/current-history.json > .cache/current-drying.json
```

The input contains `readAt` (the actual source-read instant with a timezone),
`plantIds` (the freshly verified active P-ID list), and `history` (the bounded
canonical History values, including headers, read with `UNFORMATTED_VALUE`).
Keep this private snapshot in `.cache`; do not publish the ledger or its IDs.
Columns are matched by their unique names, not guessed positions.

The output includes the detector version, the unchanged 22-field model row,
current-cycle points, independent reference/plateau evidence, selected tail,
and `inspectionSupported`. Numeric dates remain Sheets serials in the workbook
timezone. Use `inspectionSupported` and the model's validity/manual guards
before turning raw evidence into a recommendation. P21/P28, partial watering,
newer Water records, setup changes, and moisture/condition exceptions still
control the final action. Nutrient decisions remain a separate source review.

This analyzer evaluates only the checked-in Apps Script; imported cells are
data. It preserves the workbook's correction ordering, estimates/removed-row
rules, cycle boundaries, and numerical predicate so the daily task does not
maintain a second plateau algorithm. It does not access or write live services.

## Input contract

Use the checked-in dated input as a **shape example**, never as fresh evidence.
Do not copy its inventory count, action membership, nutrient eligibility,
notes, dates, or observations into a new day without reviewing current sources.
Keep the input limited to the public care report: no credentials, request IDs,
private notes, or raw ledger dumps.

| Field                         | Meaning                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `version`, `timeZone`         | `2`, `America/New_York`                                                                          |
| `date`                        | Report's Eastern date, matching its filename                                                     |
| `generatedAt`, `sourceReadAt` | Actual ISO timestamps with explicit offsets; source time is `null` when unavailable              |
| `coverage`, `totalPots`       | `complete`, `partial`, or `unavailable`; current inventory total, or `null` if unknown           |
| `summary`, `notes`            | Brief public report and material limitations                                                     |
| `mixes`                       | Unique `id`, descriptive `name`, exact `product`, `condition`, `rationale`, and `gramsPerGallon` |
| `pots`                        | One record per tracked container, using its exact `id`, physical `label`, and qualified `name`   |

A mix with a positive `gramsPerGallon` produces one- and two-US-gallon powder
recipes; `null` means plain water with no nutrients. State growth conditions and
plain-RO fallbacks in `condition`. Do not coerce a liquid dose into grams; extend
the type and generator before supporting a different dosing unit.

Each pot has these additional fields:

| Field                           | Meaning                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `action`                        | `water`, `reference`, `weigh`, `check`, `none`, or `unresolved`                                                                   |
| `reason`                        | Water: `plateau` or `both`; reference-only: `reference`; weigh: `priority` or `flexible`; other actions: their descriptive reason |
| `mixId`                         | A defined mix for a watering candidate; `null` for every other action                                                             |
| `recommendation`, `metricsNote` | Practical action and any evidence limitation                                                                                      |
| `latest`, `previous`            | `{ "at": "ISO timestamp with offset", "grams": 123.5 }`, or `null` when unavailable                                               |
| `cycleStartedAt`                | Actual current watering/setup boundary, or `null` if unknown                                                                      |
| `dryReferenceGrams`             | Comparable completed reference, or `null`; never substitute zero for missing                                                      |
| `plateau`                       | `confirmed`, `not-supported`, or `unavailable`                                                                                    |
| `plateauPoints`                 | Four chronological, eligible current-cycle measurements for a confirmed plateau; the last must equal `latest`                     |

If the latest observed weight predates a new watering, it may be shown as
context with a clear `metricsNote`, but `previous` must be `null`. It cannot
justify a new watering recommendation. All normal last-two comparisons must
remain inside the current cycle. A confirmed plateau and a reached reference
are independent signals; display `both` when both are supported.

Complete coverage must include every active pot exactly once, including
reviewed `none` records. Partial coverage must identify unresolved pots when
their IDs are known. If inventory access fails completely, use `unavailable`,
`sourceReadAt: null`, empty `mixes` and `pots`, and an explicit failure summary.
Unreviewed pots never belong in “Nothing today.”

## Generate, validate, publish

1. Inspect repository instructions and Git status. Fetch `origin/main` before
   preparing the report. On a clean main checkout, fast-forward normally. When
   the checkout is dirty or another task is active, create a separate worktree
   from `origin/main` with a `chore/daily-report-YYYY-MM-DD` branch. Reuse an
   existing report worktree only after inspecting its state. Preserve other work.
2. Review the live workbook and current care sources using the daily task's
   instructions. Write today's dated JSON, with the actual source-read time.
   A same-day rerun may revise that day's file using its fresh review.
3. Run the generator and relevant checks below. Fix a real validation failure
   in the source data or implementation; never weaken evidence checks to publish.
4. Review the diff and explicitly stage only today's JSON and the generated
   `docs/layouts/daily-report.html`. Routine daily publication should not change
   templates, scripts, nutrient plans, workbook code, or other gardening edits.
5. Commit with an emoji/type message such as
   `📝 [docs] Publish garden report for YYYY-MM-DD`. Push normally to `main`
   (`git push origin HEAD:main` from an isolated worktree). Do not force push.
   If the remote advanced, fetch, integrate the new main into the isolated
   report work, regenerate, and repeat the affected checks before retrying.
6. Follow **Website Checks and Pages** for that exact commit through successful
   deployment. Fetch the public report URL and verify its report date and
   expected recommendations. A successful push alone does not prove publication.
   If checks, deployment, or source access fail, report the specific limitation.

For step 3, replace `YYYY-MM-DD` with the date being published:

```powershell
npm run build:daily-report
npm run check:daily-report
npm run test:unit -- test/daily-report.test.mjs
npx eslint docs/daily-reports/YYYY-MM-DD.json docs/layouts/daily-report.html --max-warnings 0
npx prettier docs/daily-reports/YYYY-MM-DD.json docs/layouts/daily-report.html --check
git diff --check
```

Install dependencies with `npm ci` when the worktree does not have the locked
dependencies. On a report-layout or generator change, also run the repository's
build/browser types, HTML/style checks, Pages build, and browser checks at
desktop and 390 px in both themes. Check search, filters, chip links, printing,
no-JavaScript reading, date warnings, and horizontal overflow.

`npm run build:pages` regenerates the report and includes its HTML, CSS, and JS
in `.pages-site/layouts/`. The existing push-to-main workflow publishes it.
There is no second scheduler or GitHub-hosted private-workbook job. The daily
task supplies the fresh review; GitHub Actions builds and deploys that commit.
