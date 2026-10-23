# Plant profile instructions

## Identity and parsed metadata

- Keep the existing heading and metadata structure. The build/check scripts
  parse exact labels such as `Inventory`, `Label ID`, `Tracker ID`, `Status`,
  `Visual description`, `Interesting fact`, and acquisition fields. Do not
  rename those labels as a cosmetic edit without updating their consumers.
- Inventory IDs identify profile records, physical labels identify pots, and
  `P##` tracker IDs identify weighed containers. Multiple profiles may share
  one tracker ID; never create independent weigh-ins for their component plants.
- `P19` / `#1` is the shared rehab cactus container and `P20` / `#2` the shared
  succulent container. `P30` / `#6` has aggregate Succulent-10 and component-group profiles
  Succulent-10A/B/C, all sharing one pot; component taxa remain qualified. Removed Rehab-04 remains historical and has no active pot.
- The owner explicitly assigned `P31` / `#7` to Peperomia Bicolor and `P32` / `#8` to Tricolor oyster plant on September 20, 2026. The unreceived Amazon research under `docs/old-plans/` has no physical-label or tracker allocation and is excluded from active profiles.
- `P35` / `#9` is the shared Lithops pot: aggregate Succulent-15 and components Succulent-15A (probable Lithops lesliei, tan/brown) and Succulent-15B (probable Lithops salicola, grey/green). Four visible heads came from two nursery pots; root connections remain unresolved. All three profiles share one container history. `P36` / `#10` is separate Succulent-16, nursery-labelled Pleiospilos nelii, with no cultivar supplied and explicitly not Royal Flush. Use the profiles for current repot evidence. Never reuse `P33`/`P34`: their old houseplant URLs redirect permanently to `P31`/`P32`. Archived Succulent-11–14 remain reserved.
- `P37` / `#11` is Succulent-17, Echeveria 'Arctic Ice'. Use its [profile](./succulents/echeveria-arctic-ice.md) for dated specimen, placement, and setup evidence. Keep owner identification and seller cultivar references distinct from nursery-label proof; a purchased pot is not proof of an installed setup.
- `P38` / `#12` is the Terrarium container. Its [maintained arrival record](../terrarium.md) holds owner photographs, qualified visual identifications, and setup evidence. Houseplant-05 / `terrarium` is its active aggregate overview in Houseplants, with probable Fittonia albivenis and Hypoestes phyllostachya, tentative Pilea cf. depressa, and unidentified fern-like foliage and moss. Preserve these qualifiers and one container history. Count its overview among the 48 active profiles and three aggregates, but do not inflate the 45 botanical member groups with unallocated provisional components. Seller-listed jar dimensions are 6.3 × 3.9 in (16 × 10 cm), with orientation unverified; recording them is not a repot.
- `P39` / `#13` is Houseplant-06, nursery-labelled Fittonia albivenis, Network News™ Nightly™. `P40` / `#14` is Houseplant-07, nursery-labelled Peperomia obtusifolia, Savory Delights™ Spice is Nice™. Their profiles maintain acquisition, owner-reported watering, quarantine, and planned repot evidence. Planned glass drainage pots and incoming mixes are not completed setups or evidence about the current nursery pots. These are separate pots from P38's provisional Fittonia and P31's Peperomia Bicolor. Keep trade names distinct from cultivar evidence and manual moisture checks distinct from cactus dry-down rules.
- Keep seller labels, qualified working IDs, receipt dates, and repot dates
  distinct. Preserve original label evidence when the probable identification
  changes. An order is not a confirmed arrival; a retail pot size is not a
  measured current pot size.
- Use the relevant care/setup/equipment records for current conditions. Older
  profile observations remain dated evidence; do not silently apply an old
  light schedule or placement as the current collection setup.

## Coordinated changes

- Update affected `docs/collection.md`, this directory's `README.md` and
  `labels.md`, relevant setup/care/layout records, and
  `docs/layouts/plant-profile-data.json` together when identity, mapping, status,
  or placement changes. A profile edit does not itself change a live workbook.
- Adding/removing a profile also affects the site build/check inventories,
  canonical SVG portraits, photo manifests, and relevant tests. Check those
  contracts before adding only a Markdown file. The current checker expects
  49 profiles: 48 active and one historical, covering 38 tracker allocations.
  Recalculate these separately when the collection changes.
- Keep a substantive Sources section with direct evidence for identification,
  nomenclature, range, and specific care claims. Owner observations need clear
  attribution/date; do not turn them into externally verified botanical facts.
- Run `npm run build:site`, `npm run check:site`, and the root Markdown/link
  checks. Profile and gallery pages are rendered into the ignored site artifact.
  Website builds do not update the logger; synchronize artwork only through the
  explicit artwork command when needed. Do not hand-edit generated plant text
  to make it differ from its Markdown source.
