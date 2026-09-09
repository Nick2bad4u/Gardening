# Maintaining the browser tools

The field guide and collection tools are static HTML, CSS, and JavaScript. Node.js
builds the publication files; it does not run a production application server.
Use Node.js 26.7 or later and npm 12 or later, then install the checked-in lockfile:

```powershell
npm ci
```

## Live website development

```powershell
npm run dev
```

This starts Vite at `http://127.0.0.1:5173` and opens the field guide. Keep the
terminal running and save edits in your editor: CSS updates in place, preserving
your current page and scroll position. HTML and JavaScript changes reload the
page. SVG sprites, images, and fetched local JSON also trigger a reload.

The terminal prints links to all six pages:

| Page             | Local path                                       |
| ---------------- | ------------------------------------------------ |
| Field guide      | `/docs/plant-booklet/`                           |
| Plant tracker    | `/docs/layouts/plant-tracker.html`               |
| Plant history    | `/docs/layouts/plant-history.html`               |
| Photo album      | `/docs/layouts/photo-album.html`                 |
| Grow-spot layout | `/docs/layouts/grow-spot-layout.html`            |
| Calendar         | `/docs/layouts/indoor-acclimation-calendar.html` |

Edit `docs/plant-booklet/booklet.css` and `booklet.js` for the field guide.
The tracker and history share `docs/layouts/plant-tracker.css`; their scripts
are beside the HTML files. The layout and calendar keep their styles and
scripts inside their HTML files. No Pages or Storybook rebuild is needed for
these presentation edits.

Generated content still uses its existing build command. After editing plant
Markdown or photo metadata, run `npm run build:booklet` in another terminal;
the preview reloads when the generated HTML changes. Do not edit generated
profile text directly in `docs/plant-booklet/index.html`.

This preview serves repository sources, including their original image paths
and live read-only spreadsheet data. Use Storybook for isolated fixture data,
or `npm run build:pages` for the publication output and optimized photo assets.
The local server is separate from the deployed Apps Script logger.
Its dedicated `vite.website.config.mjs` also keeps the website preview settings
out of Storybook and Vitest.

Press **Ctrl+C** in the terminal to stop it. If port 5173 is occupied, stop the
other preview or use `npm run dev -- --port 5174`. Vite uses the existing
development dependency and listens only on this computer by default.

## Shared configuration

The repository uses the shared ESLint, Stylelint, TypeScript, Playwright,
Storybook, and TSDoc packages. Local configuration maps those presets to the
files and runtimes in this notebook:

- TypeScript checks the build scripts, browser JavaScript, test fixtures, and
  tooling files with strict checking and without emitting compiled copies.
  Browser code retains an ES2024 API baseline.
- Vitest rules apply to `test/**/*.test.mjs`; Playwright rules apply to
  `test/e2e/**/*.spec.ts`. The local browser test server is ordinary Node code.
- `lint:actions` discovers `.github/actionlint.yaml`. `lint:yamllint` uses the
  existing YAML ESLint checks, including the yamllint rule configured through
  `yaml-policy.config.mjs`, so both YAML commands share one policy.
- Browser module imports retain their `.js` extensions because Pages serves
  them directly. The booklet entry point remains a classic script.
- The booklet build uses `remark-html`'s default sanitization for Markdown and
  shares the browser's worksheet URL mapping through `scripts/build-data.mjs`.
  Raw HTML and unsafe Markdown links do not pass through to profile content.
- Booklet hover effects respect reduced motion and reserve pointer-driven
  movement for devices with a fine pointer. Keyboard focus retains a visible
  outline, and print output excludes the screen entrance animations.
- Document listeners remain active for the life of each page, including browser
  back-cache restoration.
- Stylelint checks maintained stylesheets and inline styles, including the
  self-contained Apps Script client. Docusaurus-specific rules do not apply to
  these standalone documents.
- Generated artifacts and local audit output are excluded through the existing
  ignore files. Build scripts are included in ESLint, even though the shared
  preset normally ignores script directories.

Vitest, its V8 coverage provider, and its Playwright browser provider use the
same 4.1 release line. Storybook 10.6's Vitest addon supports Vitest 3 or 4;
keep these packages compatible when upgrading. The shared TypeScript package
also accepts Vitest 4, so no peer override or forced installation is needed.

The `unit` Vitest project uses native Node imports through
`experimental.viteModuleRunner: false`.
The tests already use native ESM, and the logger harness evaluates the Apps
Script source verbatim in VM contexts. Vite's SSR transform inserts characters
into that file, so applying it only during coverage reporting shifts the V8
offsets and reports exercised code as uncovered. Native execution keeps coverage
aligned with the actual source. The previous per-branch V8 ignore comments are
removed; the existing 90% coverage thresholds remain in force.

The HTML parser dependencies are pinned separately. `@html-eslint/parser@0.65.0`
uses `es-html-parser@0.3.1`, whose source-location helper rescans a document for
each token. The large generated field guide makes that quadratic cost visible.
`scripts/html-eslint-parser.mjs` indexes line breaks for each synchronous parse,
then restores the upstream helper in `finally`. It retains all HTML rules and
parser options. Version guards reject an unreviewed parser upgrade; equivalence
tests cover complete parse results, Unicode line locations, nested parsing, and
restoration after errors. Remove this adapter when an upstream repair passes
those tests.

## Checks

```powershell
npm run typecheck
npm run typecheck:browser
npm run typecheck:build
npm run typecheck:tests
npm run lint:all
npm run test:coverage
npm run check:booklet
npm run check:logger
```

`lint:all` includes ESLint, TypeScript, unit tests, Stylelint, Prettier, Markdown,
HTML, GitHub Actions, package ordering, TSDoc configuration, and secret checks.
Run `npm run lint:lychee` when external links change. Review automated fixes:
an API suggestion must still be supported by the runtime that executes the file.
The link check covers maintained Markdown and HTML; JavaScript fault fixtures
and source-code URL fragments are checked by their regression tests.

## Browser and icon review

```powershell
npm run build:pages
npm run test:e2e
npm run storybook
```

Playwright starts a local server for `.pages-site` and checks desktop and mobile
layouts in light and dark themes. The Windows Chromium project uses installed
Microsoft Edge. Other platforms use Playwright's Chromium; Firefox and WebKit
projects require their matching Playwright browser installations.

Storybook includes the existing SVG icon workbench and six public website
surfaces: the field guide, plant tracker, plant history, photo album, grow-spot
layout, and calendar. Website stories load the actual HTML, CSS, and JavaScript
in separate frames at desktop and 390 px widths, with light and dark themes.
The icon workbench retains icon, size, and background controls.

```powershell
npm run test:storybook
npm run test:storybook:watch
npm run test:storybook:coverage
npm run test:unit
npm run build:storybook
```

`npm test` runs both the Node tests and Storybook browser tests. The Storybook
sidebar's test widget runs the same story assertions and supports coverage.
The browser project explicitly prebundles `storybook/test` and `vitest` so
their CommonJS dependencies also work in the interactive test runner. Run
the sidebar widget and CLI browser tests separately; concurrent runners share
Storybook's dependency cache and can conflict on Windows.
On Windows, the browser project uses installed Microsoft Edge. On other
platforms, install Chromium once with `npx playwright install chromium`.

The story assertions cover reader search and keyboard navigation, plant
filtering and sorting, loading and unavailable data, successful retry, empty
history, chart rendering, photo search, theme changes, table maximization,
layout tabs and riser inputs, and calendar task toggles. Mobile stories also
check horizontal page overflow. These are interaction checks; they do not
compare screenshot baselines or replace the existing Playwright layout tests.

`.storybook/prepare-pages.mjs` copies an explicit list of public files into
`.cache/storybook-pages` when Storybook starts or builds. It adds a fixture
bootstrap to those copies. Each frame has isolated storage and synthetic
spreadsheet responses; no observations are sent to Google Sheets. Remote Gyazo
thumbnails use a labeled placeholder so preview availability cannot affect a
test. Restart Storybook after editing the copied website sources. Production
HTML, scripts, assets, and preferences are not rewritten by this preparation.

`test:storybook:coverage` writes V8 HTML and LCOV reports to
`coverage/storybook`. It measures the external booklet, tracker, history, data,
and chart scripts, with floors of 80% statements, lines, and functions and 60%
branches. The calendar, layout, and photo album retain inline scripts: their
behavior is tested, but their HTML files are outside this JavaScript coverage
report. `test:coverage` retains the logger's separate 90% gate and writes to
`coverage`; run browser coverage afterward to retain both reports.

The **Get started** MDX introduction explains the workbench, preview data, and
test commands. Global `autodocs` tags in `.storybook/preview.ts` add a **Docs**
page to every story group. The website control tables describe the frame wrapper
(theme, width, path, and spreadsheet scenario); the actual website remains static
HTML and JavaScript. Add a description and meaningful controls when adding a
story group.

`npm run build:storybook` and `npx storybook build` both write an independent
static workbench to `storybook-static`. `npm run build:pages` builds the ordinary
website from maintained sources, then adds Storybook and its fixture copies at
`.pages-site/storybook`. The published workbench is served at
`/Gardening/storybook/`. Relative production asset URLs keep both standalone
hosting and the nested Pages address working.

The **Website Checks and Pages** workflow runs on pull requests, pushes to
`main`, and manual dispatch. It installs Chromium, runs Storybook tests with the
coverage thresholds above, uploads the HTML and LCOV coverage artifact for seven
days, builds the combined site, and runs `npm run test:storybook:static`. That
browser smoke check verifies the introduction, generated docs, website frame,
and SVG assets under `/storybook/`. Tests or build failures block deployment.
Only successful runs on `main` outside pull requests can upload and deploy the
Pages artifact. Pull requests never deploy.

After a local `npm run build:pages`, run `npm run test:storybook:static` to check
the same artifact. The published workbench supports browsing and interactions;
the Vitest test widget needs the local development server. Test results and
coverage reports remain CI artifacts rather than website content.

Storybook 10.6.0's Vitest addon still calls the deprecated `vitest.init()` alias
when starting its interactive test widget. Vitest 4.1.11 retains that alias and
the tests still run. The replacement belongs in the upstream addon; there is no
call to replace in this repository. Keep the supported versions aligned instead
of patching installed dependencies or suppressing all deprecation warnings.

## Collection photo previews

The Pages build downloads only the selected Gyazo thumbnails currently shown
in the guide and album. It caches them by capture ID under
`.cache/collection-previews-v1`, then publishes responsive WebP previews at
320, 640, and 960 pixels, capped at the source width. Smaller images do not
produce duplicate size variants. Publication strips image metadata.

The published previews load from the same GitHub Pages origin as the guide, so
viewing a plant does not require the phone to contact Gyazo's thumbnail host.
Original capture links, complete Gyazo Collections, captions, and credits remain
available. The browser tests block Gyazo to verify this behavior.

The Pages workflow restores the capture cache between builds. Existing capture
IDs are reused when the photo manifest changes; new captures are downloaded
once. A failed download or invalid image fails the build instead of publishing a
broken preview. The cache and generated photo variants stay out of Git.

The older `/docs/plant-booklet/` publication address redirects to the current
field-guide root while preserving its query and plant anchor. The fallback
404 document uses an absolute base URL so its styles and links still resolve
when someone opens an obsolete nested bookmark.

## Retired print-book workflow

The dedicated PDF interior and dust-jacket pipeline was retired on September 5, 2026. Its commands, rendering dependencies, and source files are no longer part
of the active toolchain. The owner retains a local archive with the current
source and generated proofs; the last committed implementation is also
recoverable from Git history. The field guide's ordinary browser Print control
continues to use its own screen/print stylesheet.
