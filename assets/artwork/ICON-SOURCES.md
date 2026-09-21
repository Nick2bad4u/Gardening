# Field-guide icon sources

The field guide and collection tools use `plant-icons.svg`, a local SVG symbol
sprite. The small interface icons were drawn for this repository so they share
one multicolor palette and remain legible in light, dark, and print modes.

Two plant illustrations are adapted from SVG Repo sources:

| Sprite symbol    | Source                                                                       | Author shown by SVG Repo | License                                                     | Changes                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `icon-cactus`    | [Cactus, SVG Repo 206109](https://www.svgrepo.com/svg/206109/cactus)         | SVG Repo                 | [CC0](https://www.svgrepo.com/page/licensing/#CC0)          | Redrawn and simplified for clear rendering from 16–52 px; colors were harmonized with the field-guide palette.       |
| `icon-succulent` | [Succulents, SVG Repo 474474](https://www.svgrepo.com/svg/474474/succulents) | xiyou0608                | [Public domain](https://www.svgrepo.com/page/licensing/#PD) | Redrawn as a compact rosette while retaining the source illustration's concentric soil and layered-leaf composition. |

The 49 `icon-plant-*` portraits and the remaining interface symbols are original
repository artwork. Each portrait uses a different simplified silhouette,
color pattern, growth habit, spine or leaf treatment, and pot where appropriate
to evoke the plant named by that profile. The P29 portrait emphasizes paired,
toothed, white-tubercled _Faucaria_ leaves; the P30 portrait combines a pale
rosette, copper-orange stems, and broad red-edged leaves in one pot. The four
directional controls are custom filled arrows with restrained highlights rather
than font glyphs. Three additional portraits depict the whole shared planters:
physical **#1 / P19** combines the variegated column, golden torch, and trailing
monkey tails in their dark patterned pot; **#2 / P20** combines elephant bush,
silver spoons, copper spoons, and the front rosette in their square wooden planter.
The first two shared-planter shapes follow the owner's Gyazo collection photographs, without replacing
the individual component profiles or asserting a new identification. The September 19 additions illustrate the seller-labeled Cubic Frost, Coppertone, Deminuta, Ruby Slippers, and Nanouk profiles. The third shared portrait combines the four succulents from the canceled Amazon plan; its Nanouk portrait uses a separate mauve beaded pot. Neither archived portrait has a current P-ID or physical label. These new silhouettes are illustrative, not traced seller photographs or depictions of observed specimens. The canceled mixed planter's pot decoration was not documented, so its illustrated pot is neutral.

All 83 interface and category symbols have been redrawn with native 64-unit
geometry, a multicolor material palette, and consistent optical padding. Linear
and radial gradients, clipped surfaces, local reusable details, and restrained
highlights provide depth. Every standalone export has explicit 64×64 dimensions,
a descriptive title, and an associated description. The September 5 review
covered each icon at 64 px and 16–32 px on light and dark backgrounds, correcting
joins, clipped edges, blade pivots, handles, stems, layering, and unclear symbols.
Every symbol is exported to
[`assets/ui-icons/`](../../assets/ui-icons/README.md); the build also synchronizes
the logger's inline copies with namespaced gradient IDs. This keeps the logger's
controls self-contained while making each icon available as a standalone SVG.
The field guide's add and close controls also use the shared SVG artwork.

These are navigation illustrations, not botanical diagrams,
collection-identification evidence, or licensed species-reference photographs.

The Noun Project collections considered during the icon review were not used.
Under its [published plan terms](https://thenounproject.com/pricing/), free
downloads require creator attribution and are supplied as black icons;
editable, no-attribution use depends on a paid license or individual purchase.

The September 19 Amazon-order portraits are retained as archived planning artwork after the order was abandoned on September 20. They are excluded from active plant and pot mappings; their public SVG URLs remain available for [the old plan](../../docs/old-plans/amazon-plant-order-2026-09.md). The current collection has 41 profile portraits, plus five archived plant portraits and three shared-planter illustrations (the third belongs to the archived plan).

The three September 20 P30 component portraits adapt the existing mixed-planter rosette, copper-leaf, and paddle-leaf shapes into separate illustrative subjects. Their terracotta pots are visual framing, not three actual containers: all three foliage groups share #6 / P30. The names retain provisional genus or species-complex identification; the drawings do not resolve those identities. Existing shared-planter portraits and public SVG bytes remain unchanged.

The September 20 houseplant portraits show the owned Carlson-tagged Peperomia Obtipan Bicolor and Rhoeo/Tradescantia Tricolor foliage as original vector illustrations: cream-edged rounded leaves and green/cream/pink pointed rosettes, respectively. Neutral illustrated pots do not establish their actual pot dimensions or setup. The acquisition photographs and exact retail wording remain the identity evidence; illustrations do not verify cultivar identity.

The current September 20 assignments are **#7 / P31 Peperomia Obtipan Bicolor** and **#8 / P32 Tricolor oyster plant**. Their existing slug-based portraits remain `peperomia-obtipan-bicolor.svg` and `tradescantia-spathacea-tricolor.svg`; renumbering does not change artwork or public SVG URLs.
