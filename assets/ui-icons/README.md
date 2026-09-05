# Shared interface icons

These 83 standalone multicolor SVGs are generated from the non-portrait symbols
in [the canonical sprite](../../docs/plant-booklet/plant-icons.svg). They cover
menus, buttons, measurement and care fields, status indicators, and generic
plant categories. The separate collection portraits live in `../plant-icons/`.

Every icon is drawn on a native 64-unit canvas and exported with explicit
`width="64"`, `height="64"`, and `viewBox="0 0 64 64"`. The artwork uses consistent
optical padding, warm
paper highlights, muted botanical greens, blue-gray tools, terracotta accents,
and gentle material shading. Small controls retain simple silhouettes; a button
icon should not carry the same density of spines or leaves as a plant portrait.
Every icon remains transparent, multicolored, static, and self-contained.
Linear and radial gradients shade materials; local `defs` and SVG2 `use`
references repeat details such as clock ticks, sun rays, and rosette leaves.
Clipping keeps calendar colors, photo scenes, and the day/night disc inside
their silhouettes. Rounded strokes, restrained highlights, and opacity-based
ground shadows keep the smaller controls clear on both light and dark surfaces.

The September 5 redraw covers all 83 icons, including revised shears with hollow
handles, a separate handling glove, a two-pot repot action, framed photographs,
connected plant stems, a complete thermometer bulb, and distinct list/queue and
check/status symbols. All icons were reviewed at 64 px and at 16–32 px. The
automated render check rejects empty artwork or paint inside the outer two-pixel
border, and reference checks catch missing or duplicate local definitions.

Edit the canonical symbol, then run `npm run build:booklet`. The build exports
every icon here and synchronizes the logger's embedded copies, with namespaced
local definitions. The logger stays self-contained and makes no network
requests for interface artwork. `node scripts/sync-ui-icons.mjs --check` detects
drift. Use an adjacent accessible text label for controls; the standalone
exports also include a title and an associated description when used as images.
The field guide, public tools, and logger use 64-unit SVG viewports; CSS controls
their displayed size and the existing button hit areas.

Original source/adaptation details remain in
[ICON-SOURCES.md](../../docs/plant-booklet/ICON-SOURCES.md). No new license is
granted for the repository artwork by exporting it.
