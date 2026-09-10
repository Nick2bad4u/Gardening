# Browser plant booklet

[`index.html`](./index.html) is the magazine-style browser guide for the full
collection. It has a cover, searchable contents, a
[Table Placement Guide](https://nick2bad4u.github.io/Gardening/#placement) immediately after the contents,
keyboard and button
navigation, a random-profile jump, light and dark themes, print styling, and
one deep-linkable reading page for each of the 36 plant records. The printed
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
Thirty-five profiles are physically documented as present, including the six
Mountain Crest plants received on 2026-08-28. Rehab-04 is retained as a clearly
marked historical record.

The placement page is generated from
[`docs/layouts/table-placement-research.md`](../layouts/table-placement-research.md).
Edit that document to update the four-column by six-row grid, six glass-table
containers, current light setup, or cited species reasoning, then run
`npm run build:booklet`. Its three illustrated layouts open at full size, and
plant links navigate to the corresponding booklet profiles. The source
document also remains readable in the repository.

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
script in `booklet.js`. The reader publishes a separate
`view_plant_profile` data-layer event only after a plant profile has mounted and
its title is current; this does not replace or duplicate the standard GA4 page
view. The generated `404.html` similarly publishes an explicit
`page_not_found` event instead of guessing from a requested URL containing the
digits `404`.

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

## Profile summaries

The metadata labels use title case. Acquired From and Acquired On share an
equal-width column pair; Photo History has more room for its capture count and
latest date. Narrow screens use two equal columns, with Photo Scope spanning
the row. Section icons align with their titles. Desktop hero portraits are twice
their earlier size and enlarge on hover when reduced motion is not requested.
The scientific name uses an italic sans-serif face and pale mint color beside
the serif common name. Both hero corner labels have a dark backing and shadow.

Identification remains evidence, not a botanical guarantee. The original
Markdown field is free text; the booklet now presents these concise summaries.
Opening a summary reveals the complete original evidence, including rejected
labels, alternative species, uncertain cultivars, and unconfirmed parentage.

| Earlier wording or evidence                                    | Booklet summary                |
| -------------------------------------------------------------- | ------------------------------ |
| Labeled; labeled horticultural name or trade selection         | Nursery Label                  |
| Seller-labeled species, form, or cultivar                      | Seller Label                   |
| High; high confidence                                          | Strong Match                   |
| Very high confidence                                           | Very Strong Match              |
| Probable, including photo-based identifications                | Likely Match                   |
| Probable cultivar without archived provenance                  | Likely Cultivar                |
| Probable hybrid group; cultivar unknown                        | Likely Hybrid Group            |
| Seller label disagrees with a probable photographic correction | Likely Revised ID              |
| Retail tag confirms genus; species is a working candidate      | Genus Known; Species Tentative |
| Mixed planter with provisional component identifications       | Tentative Component IDs        |
| An unfamiliar future evidence description                      | Working ID                     |

Status uses **In Collection** for present plants and received orders,
**Awaiting Arrival** when receipt is explicitly pending or unverified, and
**Archived** for historical records. Existing receipt dates, inspection notes,
and removal dates remain in the expandable detail. Currently no profile is
awaiting arrival. These display summaries do not modify the source evidence or
the live tracker.

The bottom page controls reappear when a mouse enters the area where a hidden
control sits. Scrolling up, keyboard focus, and pinning also reveal them. The
hover behavior does not add an invisible overlay that blocks page links.

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
