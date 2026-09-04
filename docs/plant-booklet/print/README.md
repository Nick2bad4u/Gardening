# Lulu hardcover photo-book edition

This directory contains the tracked source for a separate, print-first edition
of **The Fenton Collection**. Generated HTML, staged print photographs, PDFs,
page renders, and downloaded Lulu templates are written to the ignored
`.print-output/` directory. Nothing in this workflow uploads a file or creates a
Lulu project.

## Selected product

The intended Lulu configuration is:

| Option        | Selection                                      |
| ------------- | ---------------------------------------------- |
| Product       | Photo Book                                     |
| Trim size     | US Letter portrait, 8.5 × 11 in / 216 × 279 mm |
| Binding       | Hardcover Linen Wrap with Dust Jacket          |
| Interior      | Premium Color                                  |
| Paper         | 80# White — Coated                             |
| Jacket finish | Matte                                          |
| Page range    | 24–800 pages                                   |

This combination was verified in Lulu's live
[pricing calculator](https://www.lulu.com/pricing) on 2026-09-03. The final
336-page configuration was $87.45 USD per copy before shipping and tax. Lulu
pricing is a point-in-time quote and should be checked again immediately before
ordering.

The Photo Book workflow is the right fit because the guide is photograph-heavy
and the selected premium-color/80# coated specification is Lulu's best match for
high-resolution images. The physical print options—not the marketing category
alone—control the result. US Letter landscape was rejected because Lulu does
not offer Linen Wrap for that combination. US Letter portrait supports both the
preferred paper/ink and the preferred linen binding.

## Printer geometry

The interior PDF uses one page per PDF page, never reader spreads:

- finished trim: 8.5 × 11 in;
- supplied page: 8.75 × 11.25 in, including 0.125 in bleed on every edge;
- PDF MediaBox and BleedBox: 630 × 810 pt;
- PDF TrimBox and ArtBox: `[9 9 621 801]` pt;
- minimum outer safety from the trim edge: 0.5 in;
- planned text-page inside margin for a 151–400-page book: 1.0 in from the trim
  edge;
- no crop, trim, bleed, margin, or registration marks.

The final interior contains 336 pages. A two-pass pagination audit maps every
group and plant opener after the browser has laid out the complete book, then
inserts 18 designed, full-color facing-page transitions where necessary so all
40 openers begin on odd-numbered recto pages. A designed closing verso keeps the
printer file even. There are no empty or printer-generated blank pages.

The matching custom Lulu dust-jacket template is 25.819444 × 11.75 in
(1859 × 846 pt), with a 1.069444 in spine for this exact 336-page paper block.
The jacket must be regenerated from a new custom template if the interior page
count changes.

The build changes the inside margin if the final page count crosses a Lulu
gutter threshold. Full-bleed photographs may extend through the bleed, but
titles, labels, faces of pots, and other important content stay within the safe
area.

These rules follow Lulu's current
[Book Creation Guide](https://assets.lulu.com/media/guides/en/lulu-book-creation-guide.pdf)
and the official
[US Letter template bundle](https://assets.lulu.com/media/templates/book/lulu-book-template-us-letter.zip).

## Page design

The print edition is a fixed-page editorial book, not a browser-page dump. Every
interior page prints a group-specific full-color field: forest greens for
cacti, mineral clays for succulents, violet for rehabilitation records, and
blue-green for houseplants. Cream cards are deliberately limited to readable
text, evidence, and metadata surfaces; they sit inside the colored page rather
than becoming white pages.

Each profile uses a repeatable visual sequence:

1. a full-bleed photographic opener;
2. a QR-enabled collection-record plate;
3. balanced field-note pages with plant-specific multicolor vector portraits;
4. one to three full-page collection-photo galleries;
5. nursery-label evidence, when present;
6. licensed habitat/reference context and its source list.

Inside and outside safe areas alternate on recto and verso pages. Text cards,
captions, QR codes, and important photographic content remain clear of the
trim, bleed, and one-inch binding-side safety area. Low-resolution reference
photographs are never enlarged to fill space: deliberately framed artwork or a
vector portrait preserves the page composition without inventing raster
detail.

## Photograph policy

Print images are generated from the highest-quality local source in this order:

1. the full-resolution Google Photos exports in `.private-photo-sources/`;
2. preserved originals in `assets/measurements/` or
   `assets/nursery-labels/`;
3. the original licensed reference file in `assets/plants/`.

The printer master never uses the booklet's responsive WebP previews or Gyazo
thumbnail service. Camera originals remain ignored and untouched. The build
creates metadata-stripped, sRGB, JPEG or PNG print derivatives at the exact
needed dimensions. Photographic JPEGs use quality 95 and 4:4:4 chroma; no WebP
is used. Images are never enlarged and every printed placement must resolve to
300–600 effective pixels per inch. Low-resolution reference pictures are
printed smaller or omitted from the curated reference gallery instead of being
upscaled.

Collection photographs remain identified as the owner's records. Licensed
reference photographs retain their author, source, license, and source URL in
the printed caption. Nursery labels remain seller evidence rather than proof of
identity.

## Local workflow

```powershell
npm run build:print-book
npm run render:print-book
npm run review:print-book
npm run check:print-book
```

The resulting inspection package is under `.print-output/`:

- `interior/index.html` — paginated local browser proof;
- `interior/fenton-collection-interior.pdf` — final 336-page Lulu-sized
  interior PDF;
- `cover/fenton-collection-dust-jacket.pdf` — integrated back/spine/front/flap
  dust-jacket PDF generated against the exact final page count;
- `page-review/pages/` and `page-review/contact-sheets/` — all 336 pages at
  review resolution plus 21 numbered contact sheets;
- `page-review/report.json` — per-page classification, image statistics, text
  density, duplicate detection, and the exact reviewed-PDF hash;
- `proof-pages/` — high-resolution representative and jacket proof renders;
- `preflight-report.json` and `preflight-report.md` — page geometry, image PPI,
  font, color, and file-integrity evidence;
- `inspection.html` — the exhaustive all-page visual-review index;
- `cover-inspection.html` — the jacket artwork overlaid with Lulu's exact
  template and linked to the PDFs.

The review step rasterizes and extracts text from every PDF page, classifies
every page by semantic type, measures page color and whitespace, hashes rendered
pixels to detect accidental duplicates, and builds the contact sheets used for
manual review. The checker rejects a stale review hash, a missing or
unclassified page, a blank page, an accidental duplicate, a browser overflow,
or a page-type count that does not account for all 336 pages.

The cover generator must use a freshly downloaded custom Lulu dust-jacket
template for the final page count. If pagination changes, rebuild the interior,
download the new template, and regenerate the jacket before upload.

## Approval boundary

The local package is for inspection only. Do not upload either PDF to Lulu,
start the book wizard, approve Lulu's transformed print files, order a proof, or
publish the project until the repository owner explicitly approves the local
interior and jacket.
