# Repository scripts

## Plant booklet and GitHub Pages

`build-plant-booklet.mjs` regenerates the standalone field guide from the
Markdown profiles, licensed-photo manifest, and user collection-photo manifest.
`check-plant-booklet.mjs` checks the generated pages, image records, copyright
separation, local evidence links, schema-3 Gyazo capture metadata, per-profile
Collection coverage, and latest-two-only inline rendering.

```powershell
npm run build:booklet
npm run check:booklet
```

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

`build-pages-site.mjs` creates the ignored `.pages-site/` deployment artifact.
It injects the production GTM container only into that artifact, converts
displayed licensed-reference images into responsive WebP sets with Sharp, and
keeps source-quality Gyazo URLs behind capture links while rendering cached
Gyazo thumbnails inline.
It publishes the reader files and licensed/local evidence images used by the
booklet plus the plant tracker, individual plant history, grow-spot layout,
acclimation calendar, and searchable photo Collections index. Collection-photo
publication binaries remain on Gyazo. Source-profile, source-evidence, and
equipment-note links point back to the GitHub repository.

```powershell
npm run build:pages
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
