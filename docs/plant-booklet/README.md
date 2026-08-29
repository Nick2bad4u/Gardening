# Browser plant booklet

[`index.html`](./index.html) is the magazine-style browser guide for the full
collection. It has a cover, searchable contents, keyboard and button
navigation, a random-profile jump, light and dark themes, print styling, and
one deep-linkable reading page for each of the 34 plant records. Each page has
an at-a-glance visual description, one interesting fact, acquisition or order
provenance where recorded, and the longer research profile. Each tracked
profile links to the stable history page for its physical container. Every
profile also has a deliberately scoped iNaturalist observation search: exact
species where the record supports it, the underlying species for horticultural
cultivars, and a genus or clearly qualified working ID where greater precision
would overstate the evidence.
Thirty-three profiles are physically documented as present, including the six
Mountain Crest plants received on 2026-08-28. Rehab-04 is retained as a clearly
marked historical record.

The booklet also includes a collection-wide photo-history page for dated room,
table, and setup views. Within each plant profile, user-owned collection photos
are grouped into dated growth sessions ordered from oldest to newest. Badges
distinguish side, top, detail, context, and overview frames. This makes later
photo sessions an extension of the existing history rather than a replacement
for older evidence.

The GitHub Pages build publishes the booklet at the repository's Pages URL,
along with the plant tracker, individual history view, grow-spot layout, indoor
acclimation calendar, and photo-album entry page. It contains only those
browser tools, the licensed reference photographs they use, and web-sized user
collection photographs. It does not publish the rest of the repository. GitHub
Pages must be enabled for the repository before the deployment workflow can
complete.

The reader links to the local
[photo album entry page](../layouts/photo-album.html), which provides a
collection cover and opens the shared Google Photos album in its own tab.
Google Photos cannot be reliably embedded in this GitHub Pages site.

The publication works when `index.html` is opened directly from disk. Its plant
text and source list come from the Markdown profiles under
[`docs/plants`](../plants/). Its local species-reference photographs and
credits come from [`assets/plants`](../../assets/plants/). Reusable-license
reference galleries are included where suitable images are available; rare
cultivar galleries may be sparse. Cultivar, hybrid, and probable profiles
retain their scope notes so reference photography is not mistaken for proof of
the collection identification.

User collection and nursery-label photographs come from
[`assets/collection-photos`](../../assets/collection-photos/). They remain
separate from the licensed reference archive and are marked © Nick, all rights
reserved. All archived nursery-label faces have corresponding web-sized booklet
images. Every physically present plant has repository collection photography;
the removed historical plant without a surviving image displays an explicit
pending panel rather than a substituted image.

The small cactus cursor is limited to devices with a fine pointing device;
touch screens retain their normal behavior. Page, photograph, and detail-card
motion is decorative, short, and disabled by the operating system's reduced
motion preference.

## Add one of your own Google Photos pictures

Google Photos share pages do not expose a durable image URL that a static site
can safely depend on. Use the share URL in a dated Photo event or the album page,
but export a copy when the picture should appear inside the booklet:

1. In Google Photos, open the picture and choose **Download**. Keep the
   byte-for-byte original privately in your photo library or archive.
2. Retain the original privately with a descriptive name. Remove GPS, camera,
   and other unnecessary personal metadata from the publication copy. Make a
   web-sized WebP derivative with a descriptive name such as
   `2026-08-29-oreocereus-trollii-top-160743.webp` and place it in
   [`assets/collection-photos`](../../assets/collection-photos/).
3. Add or update the plant's record in
   [`photo-manifest.json`](../../assets/collection-photos/photo-manifest.json),
   including the local path, evidence date, `view`, alt text, caption, and
   sanitized repository source path when one exists. Put wide room/table views
   in `collection_overviews`; shared-planter frames may be referenced by every
   clearly visible plant with captions specific to each placement.
4. Run `npm run build:booklet` and `npm run check:booklet`, then inspect the
   plant page on desktop and at phone width.

Do not paste a temporary `googleusercontent.com` image address into the
manifest: those links expire and can expose unintended album details.

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
