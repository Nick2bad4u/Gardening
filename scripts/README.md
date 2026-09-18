# Repository scripts

## Astro website and GitHub Pages

The maintained website lives under `site/`, with separate routes, layouts,
components, styles, and browser modules. Its content adapters read the existing
plant Markdown, licensed-photo manifests, collection-photo manifests, and
reviewed daily-report JSON. `build-pages-site.mjs` prepares the public asset
allowlist, builds Astro pages, optimizes published images, and installs
production analytics. It never changes the logger source or workbook.

Each build uses its own ignored public-asset snapshot, so concurrent production
and Storybook builds cannot remove assets from one another. Local development
keeps the stable `.cache/site-public` asset directory.

Collection thumbnails are retried after transient network failures. If the
thumbnail service remains unavailable, the publisher uses only the exact
capture's `image_url` from the validated public manifest. Images are decoded
before caching and metadata is stripped from published derivatives. Corrupt
bytes or untrusted source mappings fail the build. Optional owner-photo network
outages produce a visible “Photo preview unavailable” state while preserving
capture links, captions, and provenance; affected IDs are logged and recorded
in `assets/collection-preview-status.json` in the artifact. The lower-level
publisher remains strict unless this behavior is explicitly requested.
Storybook fixture builds use a deterministic local preview illustration and
never request Gyazo images.

```powershell
npm run build:site
npm run check:site
npm run build:pages
```

`build:pages` appends Storybook after the public site. `prepare:site` prepares
allowed assets for local preview. The canonical SVG source and attribution live
under `assets/artwork/`; `build:artwork` exports standalone icons and
`check:artwork` verifies them. Logger artwork synchronization is a separate,
explicit `sync:logger-artwork` command subject to the logger runbook.

`publish-collection-photo.ps1` is the repeatable Gyazo publication interface.
Single-photo mode prepares a private camera file in a validated temporary
directory, uploads it into the plant's recorded Collection, verifies the direct
image response and public upload metadata, and then atomically updates the
manifest. The staged full-resolution JPEG retains its primary encoded image
scans without resize or recompression while private metadata, auxiliary images,
and camera trailers are removed; explicit source crops use lossless PNG. Gyazo
normalizes JPEG containers, so remote verification requires unchanged oriented
pixel dimensions and at least 0.96 structural similarity whenever the served
bytes are not an exact staged-file hash match.
`-MigrateManifest` groups legacy placements by publication filename so a
shared image is uploaded once and reused. `-ReplaceExistingFromSources`
replaces derivative captures from the private source cache while deliberately
retaining the old remote captures for a separately verified cleanup. Both
modes support `-WhatIf`; `-PassThru` emits structured, credential-free result
objects. An exclusive lock, manifest hash guard, and schema-2 transaction
journal prevent concurrent writes and duplicate retries after interruptions.
The script reads only `GYAZO_OAUTH_ACCESS_TOKEN`.

```powershell
pwsh -File scripts/publish-collection-photo.ps1 `
  -MigrateManifest `
  -ReplaceExistingFromSources `
  -WhatIf
```

## Daily report

`build-daily-report.mjs` validates the newest reviewed dated JSON in
`docs/daily-reports/`. Astro renders the latest report and dated archive pages;
only reviewed JSON is committed by report publication. See the
[input and publication guide](../docs/daily-reports/README.md).

```powershell
npm run build:daily-report
npm run check:daily-report
```

## `fetch-plant-images.ps1`

Builds the licensed reference-photo archive from Wikimedia Commons and
iNaturalist.

```powershell
.\scripts\fetch-plant-images.ps1
```

The default target is ten images per plant, with lifecycle searches preferring
young plants, flowers, fruit or seed, habitat, mature habit, and useful close
details. Some taxa have fewer reusable images available. Limit a refresh to one or more
catalog slugs when needed:

```powershell
.\scripts\fetch-plant-images.ps1 `
  -ImagesPerPlant 6 `
  -PlantSlug 'mammillaria-plumosa', 'cleistocactus-colademononis'
```

The script:

- accepts only CC0, CC BY, CC BY-SA, and public-domain images;
- stores a local image only after validating its binary signature;
- keeps source, creator, license, location/date when available, and SHA-256;
- combines up to four Commons references with wild research-grade iNaturalist
  observations where licensed examples exist;
- retains a visual-QA exclusion list for misleading search results;
- uses a [Wikimedia cached standard thumbnail size](https://www.mediawiki.org/wiki/Common_thumbnail_sizes)
  to avoid custom-render load;
- resumes safely from the existing manifest; and
- regenerates the global index, per-plant galleries, attribution table, and
  JSON manifest.

Network availability and upstream rate limits can still leave a plant below the
requested count. Running the same scoped command again is safe.
