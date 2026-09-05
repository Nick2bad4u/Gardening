# Custom plant portraits

These standalone multicolor SVGs are generated from
[`docs/plant-booklet/plant-icons.svg`](../../docs/plant-booklet/plant-icons.svg).
The 38 files cover 36 field-guide profiles and two whole-planter portraits and
can be used without loading the complete sprite. The latter are
`shared-rehab-cactus-planter.svg` (**#1 / P19**) and
`shared-succulent-planter.svg` (**#2 / P20**). They fix the generic-seedling
fallback for tracker records that link to the field guide's contents instead
of a single component profile.

Plant portraits use a native `0 0 64 64` coordinate system. The larger drawing
grid supports collection-specific silhouettes, clipped rib and spine detail,
subtle gradients, and reusable leaf or areole geometry while keeping the
portraits legible when they are displayed at 24 px. Interior textures should be
clipped to their plant body, definition IDs must remain unique across the
canonical sprite, and every local `href` or `url(#...)` reference must be
self-contained so standalone exports and external sprite uses render alike.

Keep each leaf, stem, or offset together with its own surface detail, then
paint the next overlapping part. Rib shading, variegation, flecks, and areoles
belong inside their plant silhouette; the trailing monkey-tail hairs use
stroke-shaped masks. Spines and marginal teeth may project beyond the body,
but must attach to it. Reuse complete leaf and areole groups through local
`<use>` references instead of painting a texture across several overlapping
plants. Leave room around leaf tips, spines, pot edges, and shadows inside the
viewBox.

The portraits follow the profile descriptions and labeled collection photos
for distinctive growth habits and colors. Keep the illustrations recognizable
at 24 px and inspect their larger details on both light and dark backgrounds.
They remain stylized navigation artwork, not identification evidence.

Every export identifies its subject with `data-plant-slug` and exposes a
human-readable `<title>` plus a visual `<desc>` through unique, slug-prefixed
`aria-labelledby` IDs. The artwork remains deliberately static and
style-independent so the transparent multicolor portraits work on the
collection's light, dark, print, and embedded surfaces without inheriting an
unexpected CSS cascade.

Run `npm run build:booklet` after changing the canonical sprite. The build keeps
these standalone exports synchronized, and the Google Apps Script logger loads
them from the public Pages site instead of embedding the complete portrait
sprite in every response. The build also derives the logger's artwork revision
from all exported SVGs. Its browser cache keeps one copy per portrait, fetches
only visible portraits, and replaces an older revision when that portrait is
next displayed. Do not hand-edit the generated SVG files or revision constant.
