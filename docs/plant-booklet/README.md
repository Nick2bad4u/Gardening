# Browser plant booklet

[`index.html`](./index.html) is the magazine-style browser guide for the full
collection. It has a cover, searchable contents, keyboard and button
navigation, a random-profile jump, light and dark themes, print styling, and
one deep-linkable reading page for each of the 34 plant records. The printed
contents and drawer use a current-plant thumbnail and show the permanent
Google Sheets P-ID separately from the physical pot label and repository
Inventory ID. The starter and newer cactus directories remain separate source
archives but publish as one P-ID-ordered Cacti section. Each page has an
at-a-glance visual description, one interesting fact, acquisition or order
provenance where recorded, and the longer research profile. Each tracked
profile links both to the stable history page and directly to its Google Sheets
tab. Every profile also has a deliberately scoped iNaturalist observation search: exact
species where the record supports it, the underlying species for horticultural
cultivars, and a genus or clearly qualified working ID where greater precision
would overstate the evidence.
Thirty-three profiles are physically documented as present, including the six
Mountain Crest plants received on 2026-08-28. Rehab-04 is retained as a clearly
marked historical record.

Each plant profile ends with its own newest-first photo history. The latest two
collection photographs stay visible, while a prominent action opens the
plant's complete Gyazo Collection. Badges distinguish side, top, detail, and
context frames. Collection-wide room/table views live in their own overview
Collection and appear on the searchable photo Collections index.
Nursery-label photographs appear afterward as compact identification evidence,
separate from both current-plant photographs and reusable-license references.

Where a profile already preserves an exact plant-specific seller listing, the
research rail promotes that URL as a product-page link. Generic seller pages,
care articles, pot listings, and guessed historical products are not promoted.
Seller snapshots use a distinct card treatment and remain explicitly framed as
purchase-time seller claims rather than current measurements or botanical
proof.

The GitHub Pages build publishes the booklet at the repository's Pages URL,
along with the plant tracker, individual history view, grow-spot layout, indoor
acclimation calendar, and photo Collections index. It contains only those
browser tools, their licensed reference photographs, preserved local evidence,
and remote Gyazo image URLs. It does not republish the complete collection-photo
binary archive or the rest of the repository. GitHub Pages must be enabled for
the repository before the deployment workflow can complete.

The production build installs Google Tag Manager container `GTM-T8J6HPLF` on
every published HTML entry point. The source pages opened locally do not load
analytics. GTM's existing History Change trigger handles the field guide's hash
navigation, so moving between profiles does not require a second analytics
script in `booklet.js`.

For publication performance, the build creates ignored 480, 960, and 1440 px
WebP variants of every displayed licensed reference photograph. The repository
keeps its credited source files unchanged, while Pages serves an appropriate
responsive derivative. User-owned Gyazo captures follow the same principle:
the manifest retains the source-quality direct URL, displayed previews use
Gyazo's responsive thumbnail service, and the capture or Collection link opens
the full-resolution hosted record.

The reader links to the local
[photo album entry page](../layouts/photo-album.html), which provides a
searchable index of all 33 plant-specific Gyazo Collections and the overview
Collection. Google Photos remains the private original archive rather than a
public site dependency.

The publication works when `index.html` is opened directly from disk. Its plant
text and source list come from the Markdown profiles under
[`docs/plants`](../plants/). Its local species-reference photographs and
credits come from [`assets/plants`](../../assets/plants/). Reusable-license
reference galleries are included where suitable images are available; rare
cultivar galleries may be sparse. Cultivar, hybrid, and probable profiles
retain their scope notes so reference photography is not mistaken for proof of
the collection identification.

User collection and nursery-label photographs come from
the schema-3 manifest under
[`assets/collection-photos`](../../assets/collection-photos/). Publication
captures are hosted by Gyazo; preserved measurement and nursery-label evidence
continues to use its repository path. They remain separate from the licensed
reference archive and are marked © Nick, all rights reserved. The removed
historical plant without a surviving image displays an explicit pending panel
rather than a substituted image or empty Collection.

The small cactus cursor is limited to devices with a fine pointing device;
touch screens retain their normal behavior. Page, photograph, and detail-card
motion is decorative, short, and disabled by the operating system's reduced
motion preference.

## Publish one of your own photographs

Keep the byte-for-byte camera original in Google Photos or the ignored private
archive. Use the checked-in uploader when the picture should appear in the
booklet:

1. Export the chosen photograph into `.private-photo-sources/` with a
   descriptive name; never commit that private original.
2. Preview the operation with
   [`scripts/publish-collection-photo.ps1`](../../scripts/publish-collection-photo.ps1)
   and `-WhatIf`. Supply the plant slug, literal source path, capture date,
   view, alt text, and caption.
3. Run the same command without `-WhatIf`. For a JPEG, the script strips
   private metadata, auxiliary images, and camera trailers while preserving the
   primary encoded image scans byte-for-byte in the staged file and retaining a
   minimal display-orientation record; it does not resize or recompress the
   source. An explicit crop is emitted at source resolution as a lossless PNG.
   Gyazo normalizes JPEGs after upload, so verification requires the same
   oriented pixel dimensions and at least 0.96 structural similarity when the
   direct response is not byte-identical. The uploader also verifies the public
   app, title, field-guide link, description, and capture date before atomically
   recording the capture. A shared-planter capture can be reused across
   applicable profile placements without another upload.
4. Run `npm run build:booklet` and `npm run check:booklet`, then inspect the
   field guide and photo Collections index on desktop and at phone width.

Do not paste a temporary `googleusercontent.com` image address into the
manifest. Do not hand-edit Gyazo IDs and direct URLs; the checker requires them
to agree with the verified upload response.

Do not edit the generated plant text in `index.html` by hand. Update a source
profile or the photo manifest, then rebuild:

```powershell
npm run build:booklet
```

Check that the generated publication matches its sources:

```powershell
npm run check:booklet
```

Build the minimal GitHub Pages artifact locally:

```powershell
npm run build:pages
```

The ignored output is written to `.pages-site/`. The deployment workflow is
[`pages.yml`](../../.github/workflows/pages.yml).

The maintained presentation files are [`booklet.css`](./booklet.css) and
[`booklet.js`](./booklet.js). The generator is
[`scripts/build-plant-booklet.mjs`](../../scripts/build-plant-booklet.mjs).
