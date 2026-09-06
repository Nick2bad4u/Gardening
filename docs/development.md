# Maintaining the browser tools

The field guide and collection tools are static HTML, CSS, and JavaScript. Node.js
builds the publication files; it does not run a production application server.
Use Node.js 26.7 or later and npm 12 or later, then install the checked-in lockfile:

```powershell
npm ci
```

## Shared configuration

The repository uses the shared ESLint, Stylelint, TypeScript, Playwright,
Storybook, and TSDoc packages. Local configuration maps those presets to the
files and runtimes in this notebook:

- TypeScript checks the build scripts, browser JavaScript, test fixtures, and
  tooling files with strict checking and without emitting compiled copies.
  Browser code retains an ES2024 API baseline.
- Vitest rules apply to `test/**/*.test.mjs`; Playwright rules apply to
  `test/e2e/**/*.spec.ts`. The local browser test server is ordinary Node code.
- Browser module imports retain their `.js` extensions because Pages serves
  them directly. The booklet entry point remains a classic script.
- Document listeners remain active for the life of each page, including browser
  back-cache restoration.
- Stylelint checks maintained stylesheets and inline styles, including the
  self-contained Apps Script client. Docusaurus-specific rules do not apply to
  these standalone documents.
- Generated artifacts and local audit output are excluded through the existing
  ignore files. Build scripts are included in ESLint, even though the shared
  preset normally ignores script directories.

The lockfile has one scoped peer override: `tsconfig-nick2bad4u@1.0.0` declares
Vitest 4 as its optional peer, while this repository uses Vitest 5. The package
contains configuration rather than a test runtime. The override keeps the
selected Vitest version consistent; remove it when the shared package declares
a compatible peer range. Installation does not require `--force` or
`--legacy-peer-deps`.

Vitest uses native Node imports through `experimental.viteModuleRunner: false`.
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

The Storybook icon preview loads the existing SVG files from `assets/ui-icons`.
It provides icon, size, and background controls with a default 64 × 64 size.
Use `npm run build:storybook` to build the local workbench under `.cache`.

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
