# Browser plant booklet

[`index.html`](./index.html) is the magazine-style browser guide for the full
collection. It has a cover, searchable contents, keyboard and button
navigation, light and dark themes, print styling, and one deep-linkable reading
page for each of the 28 plant records. Twenty-seven profiles are current;
Rehab-04 is retained as a clearly marked historical record.

The GitHub Pages build publishes the booklet at the repository's Pages URL,
along with the plant tracker, grow-spot layout, and indoor acclimation calendar.
It contains only the generated reader, its styles and script, the three
standalone browser tools, the licensed reference photographs it uses, and
web-sized user collection photographs. It does not publish the rest of the
repository. GitHub Pages must be enabled for the repository before the
deployment workflow can complete.

The publication works when `index.html` is opened directly from disk. Its plant
text and source list come from the Markdown profiles under
[`docs/plants`](../plants/). Its local species-reference photographs and
credits come from [`assets/plants`](../../assets/plants/). All 28 records have
archived reusable-license reference galleries. Cultivar, hybrid, and probable
profiles retain their scope notes so reference photography is not mistaken for
proof of the collection identification.

User collection and nursery-label photographs come from
[`assets/collection-photos`](../../assets/collection-photos/). They remain
separate from the licensed reference archive and are marked © Nick, all rights
reserved. Profiles without a repository photo display an explicit pending
panel rather than a substituted image.

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
