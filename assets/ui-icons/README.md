# Shared interface icons

These 83 standalone multicolor SVGs are generated from the non-portrait symbols
in [the canonical sprite](../../docs/plant-booklet/plant-icons.svg). They cover
menus, buttons, measurement and care fields, status indicators, and generic
plant categories. The separate collection portraits live in `../plant-icons/`.

The interface artwork uses a 64-unit canvas, consistent optical padding, warm
paper highlights, muted botanical greens, blue-gray tools, terracotta accents,
and gentle material shading. Small controls retain simple silhouettes; a button
icon should not carry the same density of spines or leaves as a plant portrait.
Every icon remains transparent, multicolored, static, and self-contained.

Edit the canonical symbol, then run `npm run build:booklet`. The build exports
every icon here and synchronizes the logger's embedded copies, with namespaced
local definitions. The logger stays self-contained and makes no network
requests for interface artwork. `node scripts/sync-ui-icons.mjs --check` detects
drift. Use an adjacent accessible text label for controls; the standalone
exports also include a descriptive title when used as images.

Original source/adaptation details remain in
[ICON-SOURCES.md](../../docs/plant-booklet/ICON-SOURCES.md). No new license is
granted for the repository artwork by exporting it.
