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
- `P35` / `#9` covers the two owner-described Lithops pairs planned for one shared pot; `P36` / `#10` is the separate newly acquired split rock, explicitly not Royal Flush. Never reuse `P33`/`P34`: their old houseplant URLs redirect permanently to `P31`/`P32`. The next profile records are Succulent-15/16; archived Succulent-11–14 remain reserved.
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
  43 profiles: 42 active and one historical, covering 34 tracker allocations.
  Recalculate these separately when the collection changes.
- Keep a substantive Sources section with direct evidence for identification,
  nomenclature, range, and specific care claims. Owner observations need clear
  attribution/date; do not turn them into externally verified botanical facts.
- Run `npm run build:site`, `npm run check:site`, and the root Markdown/link
  checks. Profile and gallery pages are rendered into the ignored site artifact.
  Website builds do not update the logger; synchronize artwork only through the
  explicit artwork command when needed. Do not hand-edit generated plant text
  to make it differ from its Markdown source.
