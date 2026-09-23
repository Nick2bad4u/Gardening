# Weighing Strategy

Updated: 2026-09-21. This guide documents the owner's requested transition from frequent learning measurements to fewer, better-timed weigh-ins. The daily chat report and generated report page are the maintained care plan; the Daily care worksheet is retired.

Read alongside the [watering strategy](./watering-strategy.md), [logger action guide](./logger-actions.md), and [daily task prompt](./daily-weighing-watering-prompt.md).

## The Goal: Fewer Useful Measurements

Frequent early weighing helps establish how a particular plant, pot, and medium behave. Once that evidence becomes useful, it should reduce routine work. The long-term aim is the fewest measurements that still support timely decisions and keep the learned pattern honest.

**Four to six pots is an example of a lighter day, not a quota, floor, or cap.** One, two, or zero can be appropriate. A larger group can also be due together. Do not add measurements to fill a list, postpone important readings to make the count look good, or water on staggered days merely to spread the weighing workload.

Reviewing every active container's existing data each morning does not require physically weighing every container. A shared planter counts as one weighed assembly even when several plants live in it.

The active roster has 32 tracked containers: P01–P32. The unreceived [abandoned Amazon plan](./old-plans/amazon-plant-order-2026-09.md) is excluded from weigh-ins; its withdrawn allocations have no real measurements or care events. Do not request weights or create baselines merely to complete those archived records.

## What Exists Today

| Surface                         | Current role                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daily AI task instructions      | The [saved prompt](./daily-weighing-watering-prompt.md) requests an adaptive per-pot schedule that can reduce routine weighing below the former daily/every-other-day cadence when evidence supports it. The daily chat report and generated page apply this policy to freshly reviewed evidence. |
| Logger Not weighed today filter | Shows collection progress within the care day. It is a filter, not a list of plants that must be weighed.                                                                                                                                                                                         |
| Dry-check window                | A forecast of approaching a historical mass reference. It is not the next appointment to weigh.                                                                                                                                                                                                   |
| Water date*                     | A conditional care-planning date. It does not authorize watering from weight alone.                                                                                                                                                                                                               |

The saved prompt does not itself create or update a scheduled task. The existing daily task uses the adaptive policy; do not recreate a second workbook calendar. The existing validity, correction, watering, and measurement rules still apply.

## What Makes a Weight Comparable

Use the same assembly and a stable scale surface. Keep the same pot, plant, medium, labels, and any normally included accessories together. Record the actual grams and observation time. Empty free-standing drainage water before a post-drain reference; do not weigh an accidentally included pool of runoff as if it were retained pot mass.

**Pot setup** means the complete weighed configuration, not pot diameter. Repotting or a substantive medium/configuration change can start a new setup even when the physical pot is reused. Moving a plant to another light or changing a dimmer does not by itself change the setup number, although it can change drying behavior.

Pruning, spilled medium, removed labels, or changed saucers can shift mass independently of drying. Log what actually happened and treat the comparison cautiously. Clean, Prune, Check, and Other notes do not automatically subtract that mass from the model or create a new setup. Do not fabricate a Repot just to make a graph line up; use the appropriate entry and a reviewed setup correction when needed.

The ledger's **Date** is when the observation happened. **Recorded** is when it was saved. **Updated from Google** is when a view was fetched. A newly refreshed screen can still be showing an old measured weight.

### Recorded Dry Top-Dressing Adjustment

On September 16, 2026, the owner added top dressing to the money tree and Kiwi aeonium and weighed each pot before and after. On September 17, the owner confirmed that all added stones were bone dry and requested a one-time historical weight adjustment.

| Pot                           | Original before | Measured after | Added dry mass | Earlier weights adjusted |
| ----------------------------- | --------------: | -------------: | -------------: | -----------------------: |
| #3 · Money tree · P21         |         1,638 g |        1,746 g |         +108 g |                       30 |
| #4 · Kiwi 'Dream Color' · P22 |         841.5 g |          992 g |       +150.5 g |                       29 |

The live History weights before the additions, including the immediate before readings, now include the corresponding offset. The post-dressing readings remain the actual scale values. Original scale readings are retained in weight-cell notes and a native workbook backup; the two post-dressing rows explain the change. Observation times, IDs, watering events, and pot setup numbers remain unchanged.

**Enter future weights directly from the scale. Do not add or subtract these offsets again.** Wet/dry references, charts, and other derived values recalculate from the adjusted history. Earlier losses and wet-to-dry capacities stay the same; this preserves comparable mass history without claiming that future drying conditions will be identical. Dated reports, photographs, and older repository observations remain evidence of what was recorded at that time.

This was an owner-authorized correction for measured, dry added mass, not an automatic logger feature or permission to normalize an unknown change. Other changes still need the comparison and setup review described above. The [workbook runbook](../scripts/google-sheets/README.md#september-17-dry-top-dressing-normalization) records the scope and verification.

## Useful Points in a Cycle

| Stage                                              | Why a weight can help                                                | How to reduce effort                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Before a genuinely supported watering              | Preserves the final measured endpoint of the preceding cycle.        | Take it during the existing care session if useful; do not delay necessary care to chase a particular number. |
| After watering has drained                         | Establishes a comparable Wet anchor for the new cycle.               | Save Water with the actual post-drain weight, or log Water first and Weigh afterward.                         |
| Earlier predictable part of an established cycle   | Confirms that this cycle has not departed from history.              | Allow longer gaps and use occasional intermediate samples.                                                    |
| Approaching the earliest plausible relevant window | Locates the pot more closely as the care decision becomes sensitive. | Shorten the interval for this pot, without putting the whole collection on the same cadence.                  |
| Unexpected behavior or insufficient evidence       | Tests a specific discrepancy or improves a weak model.               | Temporarily measure more often, then relax when the uncertainty is resolved.                                  |

The five-day wet-anchor recovery allowance does not mean that any reading five days later is as informative as a post-drain reading. Water never implies that a weight was taken. A new low in an open cycle also does not automatically become a completed Dry endpoint. See [reference meanings](./watering-strategy.md#what-wet-and-dry-references-mean).

## How the Model Learns

The current implementation selects up to five recent, usable completed cycles for the same plant and setup, with endpoints within 180 days of the current watering. It does not borrow another plant's cycle because the species or pot looks similar.

A usable training cycle needs a Wet anchor, a later eligible endpoint before the following watering, at least four distinct dated readings spanning three days, a descending log-linear fit with R² of at least 0.60, and meaningful observed loss. Its bounding waterings must be compatible with full-cycle forecasting. Partial/Spot cycles are excluded from that full-cycle training; legacy blank application values retain their compatibility treatment. These are software evidence criteria, not biological guarantees.

Recent, better-fitting cycles receive more influence, including a 60-day recency half-life. A supported historical estimate can be used before the current cycle has four new readings. Two or three current readings gradually adjust the historical estimate; four across three days can support a blended basis; six usable readings allow the supported current curve to take over. Other validity and fit checks still apply.

| Forecast basis                                       | Practical interpretation                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Historical estimate                                  | Earlier compatible cycles provide most of the timing information. The current cycle still needs occasional confirmation.                  |
| Current curve + history                              | Current observations and learned history both contribute.                                                                                 |
| Current-cycle curve                                  | Enough usable current evidence supports relying on this cycle's curve.                                                                    |
| Current cycle differs — reweigh / related alert      | Current evidence conflicts with the expected pattern. The implementation does not silently hide a contradictory curve behind old history. |
| Need a wet weight, completed cycle, or valid anchors | A particular input is missing or inconsistent. Extra readings only help if they address that problem.                                     |

Forecast windows widen with weak or variable evidence. They are planning ranges, not statistical confidence intervals or promises that nothing can happen earlier. The model withholds very distant forecasts beyond its implemented 90-day horizon from the last observation; a displayed window still does not justify waiting that long without useful intermediate evidence.

### Keep Learning Without Repeating the Initial Work Forever

Not every later cycle needs intensive daily sampling. A reliable historical estimate is the benefit of the earlier work. Preserve occasional intermediate points and periodically obtain a well-sampled completed cycle so usable history can remain recent.

There is a tradeoff: a cycle with too few measurements may help the current care decision but fail the training criteria. Do not label it a newly learned cycle just because a lighter schedule was desired. If qualifying evidence ages out, the pot's setup changes, or current behavior contradicts history, increase sampling for that pot temporarily.

## Choosing Today's Small Subset

1. **Read the current evidence for every active container.** Include new waterings, corrections, exact weight times, current setup, model support, and unresolved alerts. Do not use yesterday's task message as today's spreadsheet snapshot.
2. **Remove already-satisfied work.** A confirmed eligible weight is different from a queued draft. Do not ask for a duplicate merely because a filter or date changed.
3. **Prioritize necessary follow-ups.** Missing post-water anchors, credible measurement problems, genuinely overdue observations, and pots approaching or at a relevant window come first.
4. **Choose a few flexible learning samples only when useful.** Favor the pot for which a reading would reduce meaningful uncertainty or prevent its evidence becoming stale. An unfamiliar curve is a reason to plan learning, not an automatic lifelong daily assignment.
5. **Spread flexible work within defensible windows.** Use each pot's last actual reading and current evidence. Do not use fixed groups that can put a rapidly changing pot on the wrong day.
6. **Explain exceptions briefly.** If many pots really need weights today, include them. If none needs one, the report can say “No weigh-ins due” after a complete review.

For any request, the useful question is: **What will this weight help decide or validate?** If missing leaf-cycle, drainage, or other plant-specific confirmation is the only obstacle to watering, another gram reading may not resolve it. The daily report should retain any plant-specific Check-only exception, distinguish it from Water candidates, and avoid repeated weights that cannot resolve the missing evidence. A dry-reference hit alone stays in the hold/monitor category until a plateau is confirmed; another same-evening weight should not be requested merely to force that signal.

### Partial-Drying Houseplants

**P31 / #7 [Peperomia Bicolor](./plants/houseplants/peperomia-obtipan-bicolor.md)** and **P32 / #8 [Tricolor oyster plant](./plants/houseplants/tradescantia-spathacea-tricolor.md)** need manual partial-drying checks rather than a cactus-style whole-pot plateau. Peperomia should partially dry without prolonged drought; the oyster plant uses an upper 1–2-inch check scaled to its actual root-ball depth once measured. The [watering exceptions](./watering-strategy.md#collection-exceptions) link the supporting species guidance.

Request a weight when it can establish a real baseline, clarify a changing trend, check a credible measurement problem, or support a justified follow-up. Missing root-zone moisture or plant-condition evidence calls for that physical check; repeated weights cannot supply it. Keep their Check-only decisions separate from main Water candidates, and do not prolong drought to obtain a flat curve. Purchase alone supplies no scale reading, dry reference, watering event, or learned cycle.

### Leaf-Cycle Plants

The same evidence rule applies to **P35 / #9 shared Lithops**, **P36 / #10 split rock**, and **P28 / G3 Royal Flush**: another weight cannot establish the leaf-replacement stage. Their [manual watering exceptions](./watering-strategy.md#collection-exceptions) take priority over a weight-only forecast. P35 is now one shared pot and P36 a separate pot, both repotted into **setup 2 on September 23**. Their initial setup-2 Routine weights are **1247 g for P35** and **713.5 g for P36**, with Dry medium and firm plants recorded separately. Neither is a verified dry baseline, and neither repot batch records a Water event. Keep nursery/setup-1 observations outside the new setup's comparisons; weigh the entire P35 container once, not its four visible heads separately.

### Avoid Indefinite Deferral

Anchor a proposed next observation to actual records and a plausible measurement window. Do not recalculate “today plus three days” every morning while no new evidence arrives. That would continually move the appointment away.

Carry genuinely overdue evidence-based follow-ups into today. An old every-other-day flag alone need not make an otherwise predictable pot urgent under the adaptive policy, but every deferral still needs a reason. When a longer gap cannot be justified, use the repository's conservative cadence temporarily for the affected pot.

## Examples of the Policy

These examples illustrate reasoning, not instructions for named plants or fixed intervals.

| Evidence today                                                                                                           | Reasonable scheduling response                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Several compatible completed cycles, a recent confirming weight, and ample time before the early edge of a stable window | Defer today's routine weighing; keep the next evidence-based sample anchored to the latest actual reading.                                |
| Only one such pot needs an intermediate sample; the others have fresh evidence                                           | Weigh that one pot. Do not add three to five more merely to fill the list.                                                                |
| A pot reaches its relevant window sooner than its neighbors                                                              | Bring that pot forward. A rotation group does not outrank its evidence.                                                                   |
| A new setup has no valid history                                                                                         | Collect a useful sequence during normal care, using closer spacing where justified. Do not infer its behavior from the old pot's weights. |
| Eight pots have necessary follow-ups together                                                                            | Request all eight and explain the reason. The workload preference is not a cap.                                                           |
| Every active pot has been reviewed and no useful measurement is due                                                      | Request zero weigh-ins.                                                                                                                   |

## Understanding the Weight Metrics

Use positive elapsed time between distinct eligible readings from the same watering cycle and setup. The current implementation resolves timestamp ties using correction-aware record ordering and excludes unusable observations.

For an illustrative sequence of **400 g on day 0**, **390 g on day 2**, and **387 g on day 3**, all measured at the same time of day:

| Metric                               | Calculation                     | Result                       |
| ------------------------------------ | ------------------------------- | ---------------------------- |
| Last weight change                   | 387 − 390                       | −3 g                         |
| Last interval loss                   | (390 − 387) / 1 day             | 3 g/day                      |
| Average of last 3 weights            | (400 + 390 + 387) / 3           | About 392.33 g               |
| Average change across last 3 weights | ((390 − 400) + (387 − 390)) / 2 | −6.5 g per observed interval |
| Last 3 readings loss                 | (400 − 387) / 3 days            | About 4.33 g/day             |

The first interval lost 5 g/day and the second 3 g/day. Their simple mean, 4 g/day, would give unequal-duration intervals equal influence. The total-change/total-time value is the relevant elapsed-time-weighted rate here. A mean weight has units of grams, not grams per day.

Negative signed change means the weight fell. Positive loss rate means drying-related mass loss; a negative loss rate means a gain. Neither proves its cause. Blank metrics mean insufficient usable evidence, not zero loss. A modeled cycle-loss estimate is also distinct from an observed two- or three-reading rate.

## Care Days, Saved Readings, and Retries

The workbook uses **America/New_York** and a **4 a.m. local care-day boundary**, including daylight-saving changes. A Monday 3 a.m. reading belongs to Sunday's care-day progress; Monday begins at 4 a.m. The observation keeps its actual Monday timestamp. The rollover uses local wall time, not an assumed fixed UTC offset.

Rollover alone is not a reason to repeat a recent reading at 9 a.m. The daily task should use the actual elapsed time and adaptive need. A new watering after that reading or a genuine measurement problem can justify a further weight.

**Queued** means the device is holding an entry. **Saved today** means the relevant observation has been confirmed in History for that care day. Send or recover the existing request before entering it again; a retry should retain its original identity. See [saving and corrections](./logger-actions.md#saving-queues-and-corrections).

## What Causes the Schedule to Tighten Again

- A real repot or changed weighing setup invalidates comparison with old-setup anchors.
- Changed light, airflow, temperature, or plant activity may make the earlier drying pattern less predictive without changing the setup number.
- Unexpected gains, rapid loss, conflicting fits, partial watering, or stale evidence can make a closer observation useful.
- Sparse or aged-out training may require another informative completed cycle.

The model does not automatically interpret an Other note about lighting, prune away an unexplained mass change, or know that a plant is resting. The reviewer must use the recorded context and avoid inventing confidence. Any temporary increase should have an evidence-based reason and a path back to less work.

## Sources and Implementation References

- [Daily task prompt](./daily-weighing-watering-prompt.md) — the owner's adaptive workload policy and report restrictions.
- [Dry-down learning](../scripts/google-sheets/README.md#dry-down-learning) — eligible cycles, forecast basis, and learning limits.
- [Daily care and Integrity](../scripts/google-sheets/README.md#daily-care-and-integrity) — the retired calendar and maintained integrity checks.
- [Recent-weight metrics](../scripts/google-sheets/README.md#recent-weights-and-curve-inspection-5220) — signed changes and elapsed-time rates. See the [current detector rules](../scripts/google-sheets/README.md#improved-drying-detector-5230) for plateau evidence.
- [Logger source](../scripts/google-sheets/plant-tracker.gs) — `recentWeightMetrics_`, `learnedDryDownCurves_`, and care-day handling.
- [Practical care notes](./care-notes.md#using-weights-without-chasing-zero-daily-loss) — collection-specific interpretation and the limits of scale evidence.
