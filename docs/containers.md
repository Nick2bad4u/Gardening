# Containers and shared planters

Last updated: 2026-09-24

The collection has **34 tracked containers**, including **four shared
planters**. Its **44 current profile pages** comprise **42 botanical profile
groups and two whole-planter overviews**. One additional historical profile is
kept for the removed silken pincushion. A profile may cover a clump or several
heads of the same kind of plant.

Use the [container directory](https://nick2bad4u.github.io/Gardening/containers/)
to see what shares a pot, then open a member's profile for identification and
botanical care. Container pages bring the members, shared care notes, setup
context, and links to the existing observation history together.

## Which identifier means what?

| Identifier               | What it identifies                                         | Example                                                                          |
| ------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Inventory ID             | One botanical profile or aggregate overview                | Succulent-15A is probable _Lithops lesliei_; Succulent-15 is the shared overview |
| Container / tracker P-ID | The permanent tracked planting and its observation history | P35 includes both probable Lithops species                                       |
| Physical label           | The short label on that container                          | #9 is P35; an A/B profile suffix does not create another pot label               |
| Pot setup                | A configuration within that container's history            | P35 moved to setup 2 at its September 23 repot                                   |

A P-ID stays with the planting when it is repotted. Each setup records the pot
and growing mix used at that stage, so its history can be followed across
changes in containers.

## The four shared containers

| Container                                                                                         | Current botanical members                                                                                                                                                                                                                                   | Overview                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [P19 / #1 — shared rehab cacti](https://nick2bad4u.github.io/Gardening/containers/P19/)           | [Variegated blue torch](./plants/rehab/pilosocereus-pachycladus-variegated.md), [monkey tail](./plants/rehab/cleistocactus-colademononis.md), and [golden torch](./plants/rehab/echinopsis-spachiana.md)                                                    | Three member profiles; the removed silken pincushion is historical and is not a current member                                                                                                          |
| [P20 / #2 — shared succulents](https://nick2bad4u.github.io/Gardening/containers/P20/)            | [Pulido's echeveria](./plants/succulents/echeveria-pulidonis.md), [elephant bush](./plants/succulents/portulacaria-afra.md), [silver teaspoons](./plants/succulents/kalanchoe-bracteata.md), and [copper spoons](./plants/succulents/kalanchoe-orgyalis.md) | Four member profiles; one shared root volume                                                                                                                                                            |
| [P30 / #6 — tiny mixed succulent planter](https://nick2bad4u.github.io/Gardening/containers/P30/) | [Pale rosette echeveria](./plants/succulents/tiny-planter-echeveria.md), [coppertone-type sedum](./plants/succulents/tiny-planter-coppertone-sedum.md), and [paddle kalanchoe](./plants/succulents/tiny-planter-paddle-kalanchoe.md)                        | Three probable botanical groups plus the [whole-planter overview](./plants/succulents/tiny-mixed-succulent-planter.md); the seller's five-plant description does not establish five verified identities |
| [P35 / #9 — Lithops shared planter](https://nick2bad4u.github.io/Gardening/containers/P35/)       | [Probable _Lithops lesliei_](./plants/succulents/lithops-lesliei.md), tan/brown, and [probable _Lithops salicola_](./plants/succulents/lithops-salicola.md), grey/green                                                                                     | Two probable species groups plus the [whole-planter overview](./plants/succulents/lithops-shared-planter.md); four visible heads from two nursery pots, with root connections unverified                |

Member profiles explain each plant's identification and care. The two overview
pages describe their combined plantings. The other 30 containers each have one
current botanical profile.

## Record care once, describe members separately

Weigh the complete assembly consistently and record the reading once for its
P-ID. Watering or feeding the shared root volume is likewise one container
action. Each member's profile links to that shared history.

Use the observation notes to identify a particular member: for example,
“P35: tan/brown probable lesliei heads firm; grey/green probable salicola heads
beginning replacement.” This keeps each plant's condition easy to follow. Inspect every member
before deciding to water the common root volume. Sharing soil does not guarantee
that Lithops heads synchronize their cycles.

When recording size, say which plant or head was measured. P35's September 23
**1 in × 1.25 in** measurement, for example, describes one Lithops head.
See the [watering quick guide](./watering-quick-guide.md) for practical decisions
and the [logger action guide](./logger-actions.md) for recording real events.

For a shared planter, open its container page first: compare the members' care
notes, check the shared setup, then follow the history link for recent weights
and watering. Use the individual profiles when identifying a head, comparing
new growth, or deciding whether one member is being shaded.

## Spreadsheet reference views

Two spreadsheet views make the collection easier to browse:

- **Containers — 34 data rows:** one row per P-ID, with its label, members,
  shared care notes, setup context, and page links. Current setup, pot details,
  medium, last watering, and weight fields reference the existing `Plant tracker`.
- **Container members — 42 data rows:** one row per current botanical profile
  group, linked to its container, profile, and workbook page. The two aggregate
  overviews and the removed historical profile are excluded from member counts.

Use **Log Care** to record observations. These spreadsheet views bring the
existing plant and container records together for reference.

## Maintained sources

- [Profile-to-container mapping](./layouts/plant-profile-data.json) — which
  profiles share each P-ID.
- [Shared-container details](./layouts/container-data.json) — shared names,
  overview roles, care notes, and setup context.
- [Plant profiles](./plants/README.md) — botanical identity, inventory IDs,
  evidence, and acquisition facts.
- [Logger action guide](./logger-actions.md) — how to record watering, weighing,
  and other care events.
