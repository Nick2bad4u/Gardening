# Daily report instructions

## Fresh evidence and policy

- Daily care is retired from the workbook. Use the canonical ledger and current
  model/Dashboard/Integrity sources; do not require or recreate that tab.

- Read `README.md`, `../daily-weighing-watering-prompt.md`, and
  `scripts/google-sheets/AGENTS.md` before reviewing a day. The prompt defines
  the owner's current Water/weigh policy; old dated inputs are shape examples,
  not current care instructions or fresh observations.
- Read the actual current inventory and canonical History. Count shared pots
  once. Preserve real `sourceReadAt` and `generatedAt` instants, the Eastern
  report date, and complete/partial/unavailable coverage. Never report an
  unreviewed pot as “Nothing today” or relabel old data as a fresh source read.
- Use `scripts/analyze-drying.mjs` with a fresh unformatted History snapshot to
  reuse the checked-in detector. Keep raw snapshots and observation/request IDs
  private in `.cache`. Respect correction, quality, setup, watering-cycle, and
  plant-specific eligibility rules before applying its evidence.
- Current version-2 Water recommendations require a confirmed sustained plateau
  plus the policy's validity/readiness guards. A reference-only hit belongs in
  “Dry reference reached — waiting for plateau,” with no watering recipe.
  Plateau evidence does not prove dry soil. Review actual nutrient history and
  the fertilizer plan separately; weights do not establish a nutrient dose.
- Compute last-two rates from actual elapsed timestamps within one eligible
  cycle/setup, including daylight-saving changes. Missing data stays unavailable;
  do not use zero, compare across a new Water event, or average unequal rates.

## Inputs and generated page

- Keep dated `YYYY-MM-DD.json` inputs as reviewed history. A same-day fresh
  review may revise that day's file. Do not migrate archived version-1 decisions
  to version 2 silently; they reflect an older reporting policy.
- Types are in `types/daily-report.d.ts`; validation and calculations are in
  `scripts/daily-report-model.mjs`. Update types, validator, generator, fixtures,
  and public presentation together for a deliberate contract change.
- Edit report content in `scripts/templates/daily-report.html`, the shared
  renderer, and `site/components/report/`; presentation and browser behavior
  live in `site/styles/report.css` and `site/client/report.js`. Astro supplies
  the common layout and native latest/archive/date routes. Never edit reviewed
  recommendations only in generated output.
- `build:daily-report` writes only an ignored `.cache/daily-report-preview/`
  artifact. `check:daily-report` validates and renders all dated inputs. Version-1
  archives retain original fields and an explicit historical-policy notice; do
  not coerce them into the version-2 validator or silently change decisions.

## Validation and publication

- Follow the exact checks and publication sequence in `README.md`: build/check
  the report, run `test/daily-report.test.mjs`, check the dated JSON
  with ESLint and Prettier, then review `git diff --check`.
- The documented standing authorization applies to the scheduled daily-report
  task's reviewed dated JSON only. Generated HTML is an ignored build artifact. Use an inspected isolated
  worktree when another task or dirty checkout is present. It does not grant
  permission to publish unrelated edits, record care, change the workbook, or
  deploy Apps Script.
- For an authorized publication, verify Website Checks and Pages for the exact
  pushed commit and the resulting public report date/recommendations. Push
  success alone is not deployment proof. Preserve the existing scheduler;
  editing its checked-in prompt does not update the live scheduled task.
