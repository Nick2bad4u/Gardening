# Custom plant portraits

These standalone multicolor SVGs are generated from
[`docs/plant-booklet/plant-icons.svg`](../../docs/plant-booklet/plant-icons.svg).
Each file represents one field-guide profile and can be reused without loading
the complete sprite.

Every export identifies its subject with `data-plant-slug` and exposes a
human-readable `<title>` plus a visual `<desc>` through unique, slug-prefixed
`aria-labelledby` IDs. The artwork remains deliberately static and
style-independent so the transparent multicolor portraits work on the
collection's light, dark, print, and embedded surfaces without inheriting an
unexpected CSS cascade.

Run `npm run build:booklet` after changing the canonical sprite. The build keeps
these standalone exports synchronized, and the Google Apps Script logger loads
them from the public Pages site instead of embedding the complete portrait
sprite in every response. Do not hand-edit the generated SVG files.
