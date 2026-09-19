# Maintaining the Gardening website

The public website uses Astro to build static HTML pages, shared styles, and browser enhancements. There is no production application server. The Google-hosted Quick Logger remains a separate application. Run repository commands from the repository root with Node.js 26.7 or later and npm 12 or later, using the checked-in lockfile and reviewed lifecycle-script allowlist:

```powershell
npm ci
```

## Live website development

```powershell
npm run dev
```

This prepares the explicitly allowed public assets and starts Astro at `http://127.0.0.1:5173/Gardening/`. Development and GitHub Pages use the same project base path. Keep the terminal running while editing; Astro refreshes the affected pages and styles. Stop it with **Ctrl+C**. If port 5173 is occupied, stop the other preview or run `npm run dev -- --port 5174`.

| Area                            | Local path                          |
| ------------------------------- | ----------------------------------- |
| Collection home                 | `/Gardening/`                       |
| Plant directory                 | `/Gardening/plants/`                |
| Individual profile              | `/Gardening/plants/pachira-glabra/` |
| Live tracker                    | `/Gardening/tracker/`               |
| Pot history                     | `/Gardening/pots/P21/`              |
| Latest reviewed report          | `/Gardening/report/`                |
| Report archive                  | `/Gardening/reports/`               |
| Collection photos               | `/Gardening/photos/`                |
| Care guides                     | `/Gardening/guides/`                |
| Current setup                   | `/Gardening/setup/`                 |
| Placement diagrams              | `/Gardening/setup/placement/`       |
| Equipment inventory             | `/Gardening/setup/equipment/`       |
| Historical layouts and calendar | `/Gardening/setup/archive/`         |

The live tracker and history read the published spreadsheet. They do not write observations. Use Storybook for deterministic synthetic responses. The ordinary development preview uses allowed source assets; the production build adds optimized image variants and same-origin collection previews. After changing artwork or other copied assets, rerun `npm run prepare:site` and reload the preview.

Tracker and pot-history pages share a browser-local snapshot of the last validated tracker/history CSV pair. A saved snapshot younger than 24 hours can render immediately while both feeds refresh; the visible freshness status gives its source-read time and reports refresh failures. A successful empty response replaces older data. The first visit still needs a network read, and a successful read of the published feeds does not prove that Google has published the latest workbook edit. Pot names, labels, and profile links are built into the page so they remain available during that first load.

The snapshot is bounded to 1,048,576 serialized characters and keyed by the complete source URLs and schema. Invalid, expired, future-dated, or incompatible snapshots are ignored; blocked or full browser storage leaves ordinary network reads working. Storybook paths do not persist synthetic observations. `docs/layouts/plant-sheet-cache.js` manages storage and refresh coordination; `plant-tracker-data.js` validates the CSV pair and applies the existing data calculations. Keep this browser cache out of report preparation: daily reports require new live reads, not a saved website preview.

## Maintained sources and page boundaries

- `site/pages/` defines individual routes. Plant profile routes use slugs; pot histories use permanent P-IDs because several botanical profiles can share one weighed container.
- `site/components/` contains the shared page layout, navigation, plant cards, profiles, document articles, and tool presentation. `site/styles/` holds design tokens and maintained styles. `site/client/` holds browser enhancements.
- `site/lib/` contains build-time content adapters, route resolution, legacy redirects, and reviewed-report loading. Profile parsing comes from `site/lib/content/profile-source.mjs`; its validated input remains the maintained Markdown under `docs/plants/` and the photo manifests.
- `docs/equipment/inventory.md` remains the equipment catalog. Care and setup Markdown remain the source for their web pages. Do not maintain another editable copy inside an Astro template.
- `docs/layouts/plant-profile-data.json` remains the profile-to-pot mapping. The existing `plant-tracker-data.js` and `plant-charts.js` modules retain spreadsheet parsing and measurement calculations. Website layout work does not authorize changing their data semantics.
- `docs/daily-reports/YYYY-MM-DD.json` contains reviewed report inputs. The renderer preserves source timestamps, incomplete coverage, and historical schema distinctions; it never reads private Sheets or makes new watering decisions during a build.
- `astro.config.ts` controls typed static-output options, the `/Gardening/` base, and the explicitly prepared public directory. `tsconfig.astro.json` extends Astro's `strictest` preset, including exact optional properties and unchecked-index checks, with verbatim module syntax and index-signature access enforced. `.cache/site-public/` and `.pages-site/` are generated artifacts, not content sources.

Markdown rendering uses the existing `remark-html` sanitization. Resolve relative links from their source document through the shared route map. Preserve exact scientific names, identity qualifiers, nursery evidence, acquisition dates, labels, and source citations. The homepage and directory must not embed complete profile bodies.

Ordinary HTML navigation replaces booklet pagination and reader shortcuts. Keep long-page contents links, visible keyboard focus, 44 px touch targets, reduced-motion behavior, and the `gardening-site-theme` preference. Individual profiles, reports, and applicable setup pages have print styles; there is no print-all collection mode.

## Build and publication

```powershell
npm run build:site
npm run check:site
npm run build:pages
```

`build:site` prepares allowed assets, builds Astro into `.pages-site/`, optimizes published images, and adds production analytics. `check:site` checks the built artifact, including expected routes, local references, profile completeness, shared navigation, duplicate IDs, and publication boundaries. It does not build missing pages.

`build:pages` runs the site build and then appends the static Storybook workbench under `.pages-site/storybook/`. Running `build:site` afterward replaces that artifact and removes the appended workbench; run `build:pages` again when a complete deployment artifact is needed.

The builder uses an explicit asset allowlist and contained-path checks. Do not point Astro's public directory at the repository or copy private caches into it. Production GTM appears once on canonical public pages, and does not run in development, fixture builds, or compatibility redirects.

Old root fragments, `/docs/plant-booklet/` bookmarks, and `/layouts/*.html` addresses have small compatibility redirects. Keep nested plant/photo anchors and history P-ID or label query handling working. Update maintained links to canonical routes, but retain these aliases for existing bookmarks. A redirect must not load a retired all-profile document.

For an authorized deployment, push the reviewed commit normally to `main`, follow **Website Checks and Pages** for that exact commit through deployment, and verify the public homepage, a profile, a shared-pot history, the latest and dated reports, legacy bookmarks, and image/icon assets. A successful push alone does not confirm publication. The preceding site commit for the Astro migration is `ef789f7059d58a10653921a4e5e1f74c2120b5c2`. If rollback is needed, inspect subsequent work and revert the migration in a new commit, then run the preceding build and deployment workflow; do not reset or force-push shared history. Revert the scheduled task's publication instructions in coordination with a rollback because the preceding site expects committed report HTML.

For reports:

```powershell
npm run check:daily-report
npm run build:daily-report
```

The first command validates the reviewed report inputs and their rendering. The second also writes a standalone ignored preview under `.cache/daily-report-preview/`. Use the Astro development route to review the report with full site navigation. Daily publication commits the reviewed dated JSON, not generated site HTML; follow the report-specific instructions and existing scheduled-task authority.

## Artwork and photo publication

The canonical portrait and interface artwork lives under `assets/artwork/`. Standalone exports retain their public `/assets/plant-icons/`, `/assets/ui-icons/`, and `/plant-icons.svg` addresses.

```powershell
npm run build:artwork
npm run check:artwork
```

These commands export or check website artwork without rewriting the logger. `npm run sync:site-artwork` is the equivalent explicit export command. A deliberate logger artwork update uses the separate `npm run sync:logger-artwork` command, followed by the logger checks and its authorized deployment procedure. An ordinary website build must leave Apps Script source unchanged.

The publication builder downloads only selected Gyazo thumbnails actually used on public pages. It caches captures under `.cache/collection-previews-v1` and publishes metadata-stripped WebP previews at 320, 640, and 960 pixels, capped at source width. Smaller images do not create duplicate variants. Licensed reference photographs also receive responsive publication variants; their attribution and source links remain available.

Owned-plant pages show the latest two collection photographs, with nursery-label evidence separate and full Gyazo Collection links intact. Public previews do not replace private camera originals or the source-quality captures. An invalid image or failed required download fails publication instead of creating a broken preview. An optional Gyazo preview that remains unavailable after bounded retries receives a visible unavailable notice and its original capture link; the build records this in `assets/collection-preview-status.json`. The Pages workflow restores the capture cache between builds. Tests can block Gyazo to verify that production previews load from the Pages origin.

Follow `assets/AGENTS.md` and the photo-publication runbook for source changes or uploads. A website build does not authorize publishing another photograph or changing its rights.

## Strict checks and runtime boundaries

```powershell
npm run typecheck
npm run typecheck:browser
npm run typecheck:build
npm run typecheck:tests
npm run typecheck:site
npm run lint:all
npm run lint:style
npm run lint:remark
npm run lint:html
npm run check:artwork
npm run check:daily-report
npm run check:logger
```

`typecheck` includes repository TypeScript/checked JavaScript, Astro checking, and the separate Apps Script checker. The focused commands cover their named runtimes. Browser code retains the ES2024 API baseline; build-only Node APIs must not leak into browser or Apps Script code. Imported browser modules keep explicit `.js` extensions even when Astro bundles their entry point.

`lint:all` aggregates ESLint, type checks, Node and Storybook tests, Prettier, package checks, and secret checks. It does not run every repository check. Run the additional CSS, Markdown, HTML, workflow/YAML, link, and generated-output checks for changed surfaces. `lint:lychee:smoke` discovers README inputs only; use `npm run lint:lychee` to check changed external URLs and inspect changed local targets directly. Review automatic fixes against the actual runtime APIs.

ESLint and Prettier include Astro sources. Stylelint covers maintained CSS and the remaining standalone HTML styles, including the self-contained logger client. Generated artifacts and private caches stay excluded. Preserve the shared configurations and narrow runtime overrides rather than weakening checks to accommodate a migration.

The pinned HTML parser adapter in `scripts/html-eslint-parser.mjs` indexes line breaks to avoid repeated source rescans and restores the upstream helper in `finally`. Its version guards and equivalence tests still apply to the remaining large standalone HTML inputs. Remove the adapter only when an upstream repair passes those tests.

Vitest, its V8 coverage provider, and its Playwright browser provider use the same 4.1 release line. Storybook 10.6's Vitest addon supports Vitest 3 or 4. Keep these dependencies and the shared TypeScript preset compatible when updating; do not force a conflicting installation.

The Node unit project uses native imports through `experimental.viteModuleRunner: false`. The logger harness evaluates Apps Script verbatim in VM contexts; Vite SSR transformations change source offsets and distort its V8 coverage. Preserve native execution and the separate 90% logger thresholds.

## Storybook and browser verification

```powershell
npm run storybook
npm run test:storybook
npm run test:storybook:watch
npm run test:storybook:coverage
npm run test:unit
npm run build:storybook
```

Storybook is the isolated browser workbench at port 6006. Its website stories use the real Astro pages in frames, plus the existing SVG icon workbench. `.storybook/prepare-pages.mjs` builds those pages into `.cache/storybook-pages/` with a fixed report input and synthetic spreadsheet responses. A source fingerprint rebuilds changed fixtures at the next Storybook preparation. Restart Storybook after changing inputs that affect those generated frames.

Fixture HTML receives its storage/network bootstrap before application scripts. The fixture build uses `/Gardening/storybook/preview` as its base, disables analytics, and cannot write observations to Google Sheets. It does not replace production report inputs, preferences, or site output. Keep fixture switches confined to this explicit test build.

`npm test` runs Node unit tests and Storybook browser tests. Run the interactive sidebar test widget and CLI browser tests separately; simultaneous runners share dependency caches and can conflict on Windows. Windows browser tests use installed Microsoft Edge; other platforms use Playwright Chromium. Install the required browsers when missing rather than changing the tested browser silently.

Browser coverage writes HTML and LCOV to `coverage/storybook`, covering `site/client/` modules and the maintained `docs/layouts/` JavaScript, with floors of 80% statements, lines, and functions and 60% branches. Template markup is verified through route/content checks and browser interactions. The separate logger coverage gate remains 90%. Run browser coverage after general coverage if both reports need to be retained.

```powershell
npm run build:pages
npm run check:site
npm run test:e2e
npm run test:storybook:static
```

Playwright serves the built Pages artifact and exercises the actual `/Gardening/` routes. Check direct load, reload, Back/Forward, old bookmarks, shared-container links, 390 px layouts, both themes, keyboard focus, reduced motion, contained table scrolling, and individual-page printing. Include loading, stale, unavailable, empty, correction, retry, filtering, sorting, export, and chart-tooltip behavior where applicable.

`build:storybook` writes a standalone workbench to `storybook-static/`; `build:pages` appends it at `/Gardening/storybook/`. The static smoke check verifies the introduction, generated documentation, website frame, and SVG assets at that nested address. The published workbench supports browsing and interactions; its Vitest widget requires the local development server.

The **Website Checks and Pages** workflow runs on pull requests, `main` pushes, and manual dispatch. It runs maintained-source checks, artwork/report validation, Storybook coverage, the combined build, publication checks, and the Chromium end-to-end suite, including the static Storybook smoke check. Failed checks block deployment. Only successful runs on `main` outside pull requests deploy the Pages artifact. Coverage reports remain CI artifacts rather than public garden content.

## Retired workflows

The all-profiles booklet, reader pager, and booklet-specific build/check commands are retired. Ordinary pages and their compatibility redirects replace them. The earlier PDF interior and dust-jacket pipeline was retired on September 5, 2026; its historical implementation remains in Git history. Neither pipeline is needed to maintain or print the current website.
