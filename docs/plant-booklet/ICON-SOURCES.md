# Field-guide icon sources

The field guide and collection tools use `plant-icons.svg`, a local SVG symbol
sprite. The small interface icons were drawn for this repository so they share
one multicolor palette and remain legible in light, dark, and print modes.

Two plant illustrations are adapted from SVG Repo sources:

| Sprite symbol    | Source                                                                       | Author shown by SVG Repo | License                                                     | Changes                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `icon-cactus`    | [Cactus, SVG Repo 206109](https://www.svgrepo.com/svg/206109/cactus)         | SVG Repo                 | [CC0](https://www.svgrepo.com/page/licensing/#CC0)          | Redrawn and simplified for clear rendering from 16–52 px; colors were harmonized with the field-guide palette.       |
| `icon-succulent` | [Succulents, SVG Repo 474474](https://www.svgrepo.com/svg/474474/succulents) | xiyou0608                | [Public domain](https://www.svgrepo.com/page/licensing/#PD) | Redrawn as a compact rosette while retaining the source illustration's concentric soil and layered-leaf composition. |

The 38 `icon-plant-*` portraits and the remaining interface symbols are original
repository artwork. Each portrait uses a different simplified silhouette,
color pattern, growth habit, spine or leaf treatment, and pot where appropriate
to evoke the plant named by that profile. The P29 portrait emphasizes paired,
toothed, white-tubercled _Faucaria_ leaves; the P30 portrait combines a pale
rosette, copper-orange stems, and broad red-edged leaves in one pot. The four
directional controls are custom filled arrows with restrained highlights rather
than font glyphs. The two additional portraits depict the whole shared planters:
physical **#1 / P19** combines the variegated column, golden torch, and trailing
monkey tails in their dark patterned pot; **#2 / P20** combines elephant bush,
silver spoons, copper spoons, and the front rosette in their rectangular planter.
Their shapes follow the owner's Gyazo collection photographs, without replacing
the individual component profiles or asserting a new identification.

All 83 interface and category symbols now use the same 64-unit drawing canvas,
multicolor material palette, and optical padding as the plant portraits. The
water drop, digital scale, calendar, clock, dry-soil indicator, and directional
arrows have revised silhouettes and details. Every symbol is exported to
[`assets/ui-icons/`](../../assets/ui-icons/README.md); the build also synchronizes
the logger's inline copies with namespaced gradient IDs. This keeps the logger's
controls self-contained while making each icon available as a standalone SVG.

These are navigation illustrations, not botanical diagrams,
collection-identification evidence, or licensed species-reference photographs.

The Noun Project collections considered during the icon review were not used.
Under its [published plan terms](https://thenounproject.com/pricing/), free
downloads require creator attribution and are supplied as black icons;
editable, no-attribution use depends on a paid license or individual purchase.
