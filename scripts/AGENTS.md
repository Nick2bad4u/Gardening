# Build and maintenance script instructions

## Scope and runtimes

- These are repository tools for a static site and gardening records. Keep
  Node ESM scripts separate from browser JavaScript and bound Apps Script.
  Read `google-sheets/AGENTS.md` before changing the logger, workbook builders,
  or anything that writes to Google services.
- `scripts/build-data.mjs` holds shared build-time validation and imports the
  public tracker's worksheet mapping. Keep validators and their inferred types
  aligned with the actual manifest/profile shapes; do not bypass them with
  unchecked casts or silently coerce missing evidence into values.
- Run commands from the repository root. Use `typecheck:build` and relevant
  `test:unit` files for Node changes. Browser and Apps Script APIs have separate
  checks; a function working in current Node does not prove those runtimes
  support it.

## Generated outputs

- `build-plant-booklet.mjs` generates the field guide and photo album, exports
  canonical SVG artwork, and updates generated artwork in
  `google-sheets/Index.html`. Follow `docs/plant-booklet/AGENTS.md` and review the
  complete generated diff. Its `--check` mode checks freshness without writing.
- `build-pages-site.mjs` replaces only `.pages-site/`. Keep its publication file
  allowlist and path validation explicit; do not broaden it to copy the entire
  repository, private caches, or credentials. It rewrites source-relative links
  for Pages, preserves old field-guide bookmarks, and injects GTM only into the
  publication artifact. Preserve exactly one installation per applicable page.
- `collection-previews.mjs` caches selected Gyazo thumbnails by capture ID in
  `.cache/collection-previews-v1` and publishes responsive, metadata-stripped
  WebP previews. Preserve outbound capture/Collection links and fail on a bad
  download instead of publishing a broken preview. Cached publication previews
  do not replace the source-quality capture or private original.
- `npm run build:pages` runs booklet/report generation before the Pages builder
  and builds Storybook last under `.pages-site/storybook`. Running the Pages
  builder again after that step removes the appended Storybook output.
- `build-daily-report.mjs` validates the newest dated report input and renders
  `templates/daily-report.html`. It does not fetch private sources or make care
  decisions. Read `docs/daily-reports/AGENTS.md` for reviewed input requirements.
- `analyze-drying.mjs` evaluates the checked-in Apps Script detector in a local
  VM. Keep imported History cells as data. Require fresh header-bearing
  `UNFORMATTED_VALUE` input, actual `readAt`, and current plant IDs; numeric dates
  stay Sheets serials in the workbook timezone. Reuse this detector instead of
  maintaining a second plateau algorithm.

## Photo tools

- `fetch-plant-images.ps1` maintains the licensed reference archive. Follow
  `assets/AGENTS.md`, scope network refreshes by plant slug, and preserve source,
  license, attribution, and hash metadata.
- `publish-collection-photo.ps1` is the authorized Gyazo publication path.
  Follow `assets/collection-photos/README.md`; use `-WhatIf` to review the target
  Collection and public metadata. A local build does not authorize an upload.
- Preserve the publisher's metadata sanitizer, source dimensions, explicit-crop
  behavior, remote-image verification, exclusive lock, atomic manifest update,
  and transaction journal. An ambiguous POST outcome must not trigger a blind
  upload retry. Reuse known capture IDs for shared images and recovery.
- Read the token only through `GYAZO_OAUTH_ACCESS_TOKEN`. Keep source paths,
  token values, raw camera metadata, and journals out of published manifests
  and logs. Replacement publication does not authorize deleting older captures.
- For publisher changes, run PowerShell parser/PSScriptAnalyzer checks and
  `Invoke-Pester -Path ./test/powershell/publish-collection-photo.Tests.ps1` in
  PowerShell, with mocked network operations. Keep `.ps1` CRLF endings; do not
  run Prettier on the excluded `fetch-plant-images.ps1`.

## Tooling maintenance

- Preserve `html-eslint-parser.mjs`'s version guards, equivalent parse results,
  and restoration in `finally`. Review `test/html-parser.test.mjs` before
  upgrading either pinned HTML parser package or removing the adapter.
- Use existing shared lint/type/test presets and narrow runtime overrides.
  Some inherited package scripts currently lack implementations: `lint:attw`,
  `sync:node-version-files`, `sync:npm-version` (including `:check`),
  `sync:peer-eslint-range`, and `sync:peer-typescript-range`. Verify their target
  files before using them; do not report them as checks that passed or recreate
  unrelated package-release tooling merely to satisfy a copied script name.
