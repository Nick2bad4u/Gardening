# Test and fixture instructions

## Select the right suite

- `npm test` runs both the `unit` Node project and Storybook browser project.
  Use `npm run test:unit -- test/<file>.test.mjs` for a focused Node regression;
  `npm run test:logger` targets `test/google-sheets/`.
- Preserve `experimental.viteModuleRunner: false` for the Node project. Logger
  tests evaluate `.gs` source verbatim in VM contexts; an SSR transform changes
  V8 offsets and can make exercised Apps Script appear uncovered.
- `npm run test:logger:coverage` measures the server with 90% floors.
  `npm run test:storybook:coverage` measures external browser scripts with
  80% statements/lines/functions and 60% branches. Inline HTML scripts are
  behavior-tested but outside that browser coverage report. Do not lower gates
  or add coverage exclusions to conceal a real regression.
- Logger/default coverage cleans `coverage/`; browser coverage writes below it
  at `coverage/storybook`. Run logger coverage first when retaining both outputs.

## Browser previews and publication tests

- Storybook wraps actual static pages in fixture frames; React is the workbench
  wrapper, not the production website architecture. Keep themes, 390 px layout,
  keyboard interactions, loading/error/retry/empty states, and accessibility
  assertions meaningful for the behavior changed.
- `.storybook/prepare-pages.mjs` builds the actual Astro routes into
  `.cache/storybook-pages`, with the `/Gardening/storybook/preview/` base. It
  injects `stories/fixtures/page-bootstrap.js` before page scripts for isolated
  storage and synthetic Sheet responses; reports use `fixtures/daily-report.json`.
  Fixture builds disable analytics and use local photo placeholders. Never use
  a production save as a test fixture.
- The development fixture server maps known Astro source-map entrypoints back
  to their maintained browser modules through Vite for auditable coverage. It
  validates the repository path and serves the same implementation; published
  Storybook uses Astro's ordinary bundled scripts. Keep both paths exercised.
- Astro includes emitted page dependencies automatically. Restart Storybook
  after editing website sources. Do not run the sidebar test widget and CLI
  browser runner concurrently; they share a dependency cache on Windows.
- Build with `npm run build:pages` before `npm run test:e2e` or
  `npm run test:storybook:static`. Playwright's server reads `.pages-site/` at
  `127.0.0.1:4173/Gardening/`; it does not regenerate it. The static Storybook
  smoke check verifies the published `/Gardening/storybook/` subpath and its assets.
- On Windows, configured Chromium/mobile tests use installed Microsoft Edge.
  Firefox/WebKit require their Playwright browsers; other platforms use the
  installed Playwright Chromium. State which projects actually ran instead of
  reporting a Chromium-only run as full cross-browser coverage.

## Harness and data boundaries

- Keep explicit VM API inventories in `helpers/` and `*-fixtures.d.ts` aligned
  with the source/test-facing functions. Narrow unknown data before use; avoid
  replacing the typed harness with `any` or suppressing checking.
- `fixtures/apps-script-checker/` contains deliberate valid/invalid/ambient
  programs. Their failures are test inputs; do not “repair” them or include
  negative fixtures in ordinary repository typechecking.
- Use synthetic or scrubbed deterministic records. Do not commit live canonical
  ledger dumps, credentials, private photo paths, or user observation IDs.
  Mock service writes; read-only production verification is a separate activity.
- Photo publisher tests live in `powershell/` and run with Pester, outside
  Vitest. Preserve their mocked uploads, metadata checks, recovery cases, and
  temporary-path isolation when editing the publisher.
- Run `npm run typecheck:tests` for TypeScript/JSDoc test changes, plus the suite
  that exercises the changed behavior. Snapshot or source-string assertions
  alone do not establish a working browser interaction or safe write/retry path.
- Workbook migration tests must reject occupied destinations, schema drift,
  and replay, and assert that canonical/staging data and existing chart specs
  are outside the write set. Rehearse formula spills at 96, 97, and more plant
  records on a native copy; Node mocks do not evaluate Sheets formulas.
- Test cycle comparisons with corrections, removed/future records, setup
  boundaries, missing weights, and daylight-saving transitions. Compare the
  generated Apps Script snippet with its maintained server copy; Node's VM and
  the ES2023 typecheck do not prove Google's parser or V8 supports an API.
