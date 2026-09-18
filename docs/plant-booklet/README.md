# Plant field guide

The booklet has been replaced by a modular Astro website. Browse the
[plant directory](https://nick2bad4u.github.io/Gardening/plants/),
[latest reviewed report](https://nick2bad4u.github.io/Gardening/report/),
[tracker](https://nick2bad4u.github.io/Gardening/tracker/), or
[photo Collections](https://nick2bad4u.github.io/Gardening/photos/).
Existing booklet bookmarks redirect to their matching pages.

## Maintained sources

- Plant profiles: [`docs/plants`](../plants/README.md).
- Placement and illustrated diagrams:
  [`table-placement-research.md`](../layouts/table-placement-research.md).
- Equipment inventory: [`inventory.md`](../equipment/inventory.md).
- Website routes, layouts, components, and browser modules: [source organization](../development.md#maintained-sources-and-page-boundaries).
- Canonical icons and source/adaptation credits:
  [`assets/artwork`](../../assets/artwork/ICON-SOURCES.md).
- Collection photographs:
  [`assets/collection-photos`](../../assets/collection-photos/README.md).
- Licensed reference photographs:
  [`assets/plants`](../../assets/plants/README.md).

Profiles retain their identity qualifiers, sources, latest two owned-plant
photographs, nursery-label evidence, licensed references, and complete Gyazo
Collection links. Shared containers have one observation history linked to all
constituent plant profiles. Each page supports ordinary browser printing.

## Build and validation

```powershell
npm run build:site
npm run check:site
npm run build:pages
```

`build:site` generates the ignored `.pages-site/` artifact; `build:pages` also
appends Storybook. Do not edit generated HTML. Local preview uses `npm run dev`.
See [development.md](../development.md) for runtime, lint, and browser checks.

The former all-profiles HTML, pager scripts, booklet styles, and generator are
retired. The deployed Google-hosted logger remains a separate application.
