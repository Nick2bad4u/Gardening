# Repository scripts

## Plant booklet and GitHub Pages

`build-plant-booklet.mjs` regenerates the standalone field guide from the
Markdown profiles, licensed-photo manifest, and user collection-photo manifest.
`check-plant-booklet.mjs` checks the generated pages, image records, copyright
separation, and local links.

```powershell
npm run build:booklet
npm run check:booklet
```

`build-pages-site.mjs` creates the ignored `.pages-site/` deployment artifact.
It publishes the reader files and images used by the booklet plus the plant
tracker, grow-spot layout, and acclimation calendar. Source-profile,
original-evidence, and equipment-note links point back to the GitHub repository.

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
