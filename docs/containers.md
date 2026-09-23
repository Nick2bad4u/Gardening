# Containers and shared planters

Last updated: 2026-09-23

The collection has **34 tracked containers**, including **four shared
planters**. Its **44 current profile pages** comprise **42 botanical profile
groups and two whole-planter overviews**. One additional historical profile is
kept for the removed silken pincushion. These are record counts, not a census
of individual stems, heads, cuttings, or root systems.

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

A P-ID persists when the planting is repotted into a different vessel. Record
the new pot, medium, and setup boundary; keep earlier observations under the
same P-ID and their original setup. A change of room or a new species profile
does not itself create another container or a new setup.

## The four shared containers

| Container                                                                                         | Current botanical members                                                                                                                                                                                                                                   | Overview                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [P19 / #1 — shared rehab cacti](https://nick2bad4u.github.io/Gardening/containers/P19/)           | [Variegated blue torch](./plants/rehab/pilosocereus-pachycladus-variegated.md), [monkey tail](./plants/rehab/cleistocactus-colademononis.md), and [golden torch](./plants/rehab/echinopsis-spachiana.md)                                                    | Three member profiles; the removed silken pincushion is historical and is not a current member                                                                                                          |
| [P20 / #2 — shared succulents](https://nick2bad4u.github.io/Gardening/containers/P20/)            | [Pulido's echeveria](./plants/succulents/echeveria-pulidonis.md), [elephant bush](./plants/succulents/portulacaria-afra.md), [silver teaspoons](./plants/succulents/kalanchoe-bracteata.md), and [copper spoons](./plants/succulents/kalanchoe-orgyalis.md) | Four member profiles; one shared root volume                                                                                                                                                            |
| [P30 / #6 — tiny mixed succulent planter](https://nick2bad4u.github.io/Gardening/containers/P30/) | [Pale rosette echeveria](./plants/succulents/tiny-planter-echeveria.md), [coppertone-type sedum](./plants/succulents/tiny-planter-coppertone-sedum.md), and [paddle kalanchoe](./plants/succulents/tiny-planter-paddle-kalanchoe.md)                        | Three probable botanical groups plus the [whole-planter overview](./plants/succulents/tiny-mixed-succulent-planter.md); the seller's five-plant description does not establish five verified identities |
| [P35 / #9 — Lithops shared planter](https://nick2bad4u.github.io/Gardening/containers/P35/)       | [Probable _Lithops lesliei_](./plants/succulents/lithops-lesliei.md), tan/brown, and [probable _Lithops salicola_](./plants/succulents/lithops-salicola.md), grey/green                                                                                     | Two probable species groups plus the [whole-planter overview](./plants/succulents/lithops-shared-planter.md); four visible heads from two nursery pots, with root connections unverified                |

All identification qualifiers remain in the member profiles. An overview
describes the combined planting and is not counted as another botanical member.
The other 30 containers each have one current botanical profile. P33 and P34
remain retired redirects to P31 and P32, not additional container allocations.

## Record care once, describe members separately

Weigh the complete assembly consistently and record the reading once for its
P-ID. Watering or feeding the shared root volume is likewise one container
action. Each component page links to the same history; it does not receive a
copy of the observation or an independent dry/wet reference.

Use the observation notes to identify a particular member: for example,
“P35: tan/brown probable lesliei heads firm; grey/green probable salicola heads
beginning replacement.” This preserves separate observations without pretending
the two groups have separately weighed or watered pots. Inspect every member
before deciding to water the common root volume. Sharing soil does not guarantee
that Lithops heads synchronize their cycles.

Adding a component profile documents an existing planting; it does not create
a second acquisition, repot, or watering event. A measurement must retain its
scope: P35's September 23 **1 in × 1.25 in** measurement describes one head,
not the whole planting, the pot diameter, or a verified species-group size.
See the [watering quick guide](./watering-quick-guide.md) for practical decisions
and the [logger action guide](./logger-actions.md) for recording real events.

## Spreadsheet reference views

The container catalog adds two reference tabs alongside the existing tracker:

- **Containers — 34 data rows:** one row per P-ID, with its label, members,
  shared care notes, setup context, and page links. Current setup, pot details,
  medium, last watering, and weight fields reference the existing `Plant tracker`.
- **Container members — 42 data rows:** one row per current botanical profile
  group, linked to its container, profile, and workbook page. The two aggregate
  overviews and the removed historical profile are excluded from member counts.

These are reference views, not another place to enter observations. Continue
using the existing logger and workbook input surfaces; `History` remains the
canonical observation ledger. A catalog refresh does not append synthetic
plant-care events or duplicate existing history. Acquisition details shown in
the catalog describe the documented purchase; they are not new acquisitions.

## Maintained sources

- [Profile-to-container mapping](./layouts/plant-profile-data.json) — which
  profiles share each P-ID.
- [Shared-container details](./layouts/container-data.json) — shared names,
  overview roles, care notes, and setup context.
- [Plant profiles](./plants/README.md) — botanical identity, inventory IDs,
  evidence, and acquisition facts.
- [Workbook catalog planner](../scripts/google-sheets/container-catalog.mjs) —
  builds the two reference tabs from the catalog and existing tracker structure;
  [operator runbook](../scripts/google-sheets/README.md) covers live deployment.

The website derives its container membership and counts from these maintained
records. Keep profiles and mappings aligned when membership changes; never
hand-edit generated HTML or make an extra P-ID merely to give a species its own
page.
