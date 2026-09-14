# Watering Strategy

Updated: 2026-09-14. This guide explains the collection's care decisions and the checked-in logger 5.22.1 behavior. It is a strategy reference, not a recommendation to water particular pots today.

Read alongside the [weighing strategy](./weighing-strategy.md), [logger action guide](./logger-actions.md), and [daily task prompt](./daily-weighing-watering-prompt.md).

## What We Are Trying to Learn

The aim is to recognize each container's normal dry-down, notice when that pattern changes, and water when the plant and root zone are ready. More data should eventually make care easier. It should not create a requirement to weigh everything daily or keep a plant dry until an arbitrary number is reached.

The scale measures the entire weighing assembly: plant, roots, medium, pot, labels, and any accessories included on the scale. A falling number records a change in that assembly's mass. It does not identify exactly where moisture remains, prove that roots are healthy, or measure a watering dose.

For the usual cactus and succulent group, the care starting point is a thorough watering in a container with working drainage, followed by drying between waterings. Adjust that decision for the actual plant and growing conditions. University of Minnesota Extension supports thorough watering, drainage, and reduced watering during low-light rest; it does not establish a universal number of days between waterings. [University of Minnesota Extension](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/cacti-and-succulents)

## Three Different Decisions

| Decision                        | What it means                                                                                           | What it does not mean                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Weigh today                     | A new measured value will help locate the pot on its curve, resolve a discrepancy, or refresh learning. | The plant needs water today.             |
| Dry-check window or Water check | The model or measured trend suggests that readiness deserves attention.                                 | The substrate has been verified dry.     |
| Water today                     | Current evidence and the plant-specific care rules support watering.                                    | A forecast date alone has authorized it. |

The logger's **Water date*** is conditional; the asterisk matters. Its **Dry-check window** describes uncertainty around approaching a previous mass reference. Older documentation or interfaces may call that window **Reweigh**, but it is not the next weighing appointment. **Forecast basis** explains which observations support the forecast; it is not a separate care action.

The daily AI report deliberately contains only watering and weighing tasks. It must withhold an unsupported watering recommendation and explain the missing evidence briefly. It must not turn that explanation into a new moisture-check chore or request repeated weights to answer a question that weight cannot resolve. That reporting preference does not remove the underlying plant-specific readiness requirements.

## What Wet and Dry References Mean

New Weigh observations are stored as **Routine**. Derived views infer their place in a watering cycle without rewriting the original History rows:

1. An explicitly logged **Water** starts a watering cycle.
2. A weight saved with Water supplies the **Wet** reference. If no weight accompanied that save, the first eligible positive reading within five days can supply it.
3. The final eligible non-Wet weight before the following Water becomes a completed **Dry** endpoint.
4. Low readings in the still-open cycle remain Routine. A new minimum alone does not become a completed dry reference.

The five-day allowance is a recovery rule for missing data, not a recommendation to wait five days to weigh after watering. For a useful wet anchor, weigh after the actual watering has finished draining, using the normal weighing assembly. A delayed reading can miss the earliest mass loss.

The completed Dry endpoint means “the last eligible measured weight before the next watering.” It does not certify a water-free pot or establish that the previous watering decision was ideal. Growth, pruning, spilled medium, changed accessories, or a different watering practice can also make an older reference less representative.

### Reading the Current Weight Difference

`Current weight difference = latest eligible weight − current setup's completed dry reference`

For an illustrative dry reference of 350 g, a current weight of 368 g gives **+18 g**; 346 g gives **−4 g**. Positive means above that historical reference, zero means at it, and negative means below it. Neither sign independently establishes moisture or readiness. The difference is unavailable when a valid comparable reference is missing; blank is not zero.

The wet-to-dry difference describes the observed mass range between references. A “remaining” percentage based on that range is a relative position on the recorded curve, not a measured percentage of water in the substrate.

## How the Curve Supports a Decision

The model uses eligible observations for the same plant and pot setup. Its forecast can begin with compatible completed cycles and then adapt to the current cycle. The [weighing strategy](./weighing-strategy.md#how-the-model-learns) explains the training requirements and forecast labels.

An initially faster decline followed by slower loss can help describe a dry-down. The actual observations, their timing, and the whole cycle matter. There is no universal **1 g/day** watering threshold: the same mass change can mean very different things in a small pot and a large shared planter. Reaching zero daily loss is not a care objective.

The current implementation has two signals that can bring a readiness inspection forward:

- **Previous weight reference reached:** an eligible current weight has reached or crossed the completed dry reference.
- **Sustained plateau:** the recent tail is small relative to that pot's earlier decline, even if it is still above the old reference.

As implemented in 5.22.1, the plateau heuristic uses four readings spanning 3–10 days, a cycle at least seven days old, at least 10 g of observed loss, and an earlier decline spanning at least two days after excluding the first 48 hours. Recent loss must be no more than 20% of the earlier rate, and the four-reading range must fit within 5% of total observed loss, with a minimum 2 g allowance. A recent gain above 2 g instead raises a measurement/setup concern. These are implementation thresholds, not validated species-specific moisture limits. See the [recent-weight and curve-inspection rules](../scripts/google-sheets/README.md#recent-weights-and-curve-inspection-5220).

A plateau can also reflect measurement noise, changed conditions, or poor uptake. The model therefore advances an inspection opportunity rather than issuing an unconditional watering order. It does not rewrite the dry reference to match the plateau.

## A Practical Decision Sequence

1. **Confirm that the evidence belongs together.** Check the plant/container identity, current setup, actual observation times, last watering, and any corrections or unusual changes. Do not combine old-pot readings with a new setup.
2. **Locate the current observation on its own curve.** Consider the difference from the old dry reference, recent measured losses, any plateau, and whether the current curve agrees with learned history.
3. **Apply the plant-specific rule.** A dry-looking surface, a reached forecast date, or another plant being watered is not enough. The exceptions below take precedence over a general cactus routine.
4. **Choose the supported action.** Water if readiness is supported; request a useful weight if timing or a measurement is the uncertainty; otherwise leave the decision unresolved and explain why. Do not invent a water date just to complete the table.
5. **When watering actually occurs, log it accurately.** Record the application style, nutrients if used, and measured volume only if known. Record a separate post-drain weight or include the actual post-drain weight with Water.

There is no automatic extra four- or six-day drought after reaching the reference. Equally, a pot that remains damp should not be watered to satisfy a forecast. The existing [small-pot dryness guidance](./care-notes.md#checking-dryness-in-small-pots) explains the limitations of a skewer observation without treating it as a calibrated test.

## Collection Exceptions

| Plant or container                                                                          | How the decision differs                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Most established cacti and suitable succulents                                              | Use root-zone drying and plant readiness, with the curve as supporting evidence. Reduce watering during actual rest; do not infer readiness from elapsed days alone.                                                                                                                                                                                             |
| P21 / #3, money tree                                                                        | The archived nursery guidance uses the upper two inches of medium. Do not wait for the entire root ball to become cactus-dry. The working identity is _Pachira glabra_, with the retail label's broader _Pachira_ identification retained. The tracker withholds a weight-only water date. See the [money-tree profile](./plants/houseplants/pachira-glabra.md). |
| P28 / G3, Royal Flush split rock                                                            | Inner-leaf condition and leaf replacement matter. Shrinking old leaves can be supplying the new pair; an old pair wrinkling or a light pot alone does not authorize water. The tracker withholds a weight-only water date. [SANBI's species account](https://pza.sanbi.org/pleiospilos-nelii) explains the transfer of stored moisture during replacement.       |
| P22 / #4, Kiwi aeonium                                                                      | Use observed active growth or rest, not a presumed season. The environment can change growth timing. Its curve does not replace this distinction. [Wisconsin Extension](https://hort.extension.wisc.edu/articles/aeonium/) distinguishes growth and rest and explains their environmental dependence.                                                            |
| P19 / #1, shared cacti; P20 / #2, square wooden succulent box; P30 / #6, tiny mixed planter | One container gives one whole-pot weight. Every component and the shared root zone matter, and drainage must be established before soak-through watering. A thirsty-looking component does not prove the whole planter is ready.                                                                                                                                 |

Do not copy the source publications' regional seasons or illustrative watering intervals into a fixed calendar for this indoor collection. Exact identities and additional exceptions remain in the [plant profiles](./plants/README.md).

## Watering Application and Amount

| Logger value         | What to record                                                                                                 | Model consequence                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Flood / soak-through | A watering that actually soaked through the container; this is the form's default, so verify it before saving. | Eligible as a full watering for forecasting, subject to the other evidence rules. |
| Thorough             | A thorough watering recorded with this application label.                                                      | Also eligible as a full watering, subject to the other rules.                     |
| Partial              | A deliberately incomplete watering.                                                                            | Full-cycle forecasting is withheld for that cycle.                                |
| Spot                 | A localized watering.                                                                                          | Full-cycle forecasting is withheld for that cycle.                                |

These are descriptions of what happened, not prescriptions to use a particular method. A Partial or Spot event still records real watering and changes the current cycle; do not omit it to preserve an attractive forecast. Historical blank application values remain legacy/unspecified evidence; the implementation accepts them for compatibility without pretending the method was measured.

**Water amount (mL)** is optional measured liquid volume. Leave it blank if unknown. It is different from the pot's gram increase and from **Nutrient amount**, which describes the product quantity or concentration with units. The model does not convert “grams above dry” into a required number of milliliters.

## Missing or Conflicting Evidence

| Situation                                          | Interpretation and response                                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| No wet reference or completed dry cycle            | The model lacks an anchor. Keep honest observations during normal care; do not water or prolong drought merely to manufacture one. |
| Undated Water or Repot in the current setup        | The boundary cannot be placed reliably. Forecasts and recent-cycle metrics are withheld until the record issue is resolved.        |
| Unexpected gain, poor fit, or incompatible anchors | Check whether observations are comparable and obtain a useful repeat measurement if needed. A guessed date is not a repair.        |
| Partial or Spot watering                           | Preserve the event and accept that a full-cycle estimate is not appropriate.                                                       |
| Forecast window passed without a new observation   | The model has stale evidence. A useful follow-up weight can be due; the missed date is not permission to water.                    |
| Missing plant-specific confirmation                | Withhold watering. More weighing does not automatically resolve missing leaf-cycle or shared-root-zone evidence.                   |

The September 13 installation of the AW200 and AeroLight 240 W changed growing conditions, not the physical weighing assembly. It does not automatically advance Pot setup. The model does not read lamp settings or recognize a lighting note as a numerical correction; actual subsequent weights must show the response. See the [installed setup record](./equipment/aw200-and-aerolight-240w.md).

## Sources and Implementation References

- [University of Minnesota Extension: cacti and succulents](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/cacti-and-succulents) — general watering and drainage guidance.
- [SANBI: _Pleiospilos nelii_](https://pza.sanbi.org/pleiospilos-nelii) — split-rock leaf replacement and care context.
- [Wisconsin Extension: Aeonium](https://hort.extension.wisc.edu/articles/aeonium/) — observed growth/rest distinctions.
- [Practical care notes](./care-notes.md) and the linked plant profiles — collection-specific evidence and exceptions.
- [Logger source](../scripts/google-sheets/plant-tracker.gs) — `dryDownCycles_`, `fullWateringForForecast_`, `dryDownModelForPlant_`, `cycleInspection_`, and watering guidance.
- [Operator runbook](../scripts/google-sheets/README.md#dry-down-learning) — model behavior and the distinction between a conditional date and a watering instruction.
