# Spreadsheet and Logger Actions

Updated: 2026-09-15. This guide describes the checked-in logger 5.23.1 entry contract and the documented AppSheet bridge. It explains what can be recorded; it is not a checklist of chores to perform daily.

Read alongside the [watering strategy](./watering-strategy.md), [weighing strategy](./weighing-strategy.md), and [operator runbook](../scripts/google-sheets/README.md).

## Where to Enter Observations

| Surface                                                      | Best use                                                                                                          | What happens after saving                                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Garden Entry Logger, single plant                            | Detailed observations, measurements, photos, repots, and several actions for the same pot.                        | Save now writes through Apps Script; Add to queue retains the entry on the device until the queue is sent and confirmed.       |
| Garden Entry Logger, Bulk care                               | The same supported care action and shared details for selected pots.                                              | Creates separate observations for the selected plants; it does not turn them into a shared container.                          |
| Google Sheets Quick log                                      | Simple row-based entry of event, time, weight, dimensions, condition, notes, setup, and water application/amount. | The Save checkbox archives event-specific rows in History. It is not the full structured mobile form.                          |
| AppSheet Log                                                 | Detailed phone or desktop form entry.                                                                             | Writes to App entries staging; the Apps Script bridge validates and archives the observation.                                  |
| AppSheet Bulk Log                                            | Water, individual weights, combined Water + weigh, and supported shared-care rounds.                              | Writes to App bulk staging, then the bridge creates the per-plant History records.                                             |
| History, History view, dashboards, Pxx pages, public tracker | Review, comparisons, charts, and history.                                                                         | Derived/read-only views are not a second place to type canonical measurements. Use the supported correction flow for an error. |

**History** is the canonical observation ledger. **History view** is its sorted projection. AppSheet staging and a local browser queue are not confirmation that a record has reached History. The [AppSheet companion guide](./appsheet-companion.md#data-ownership-and-save-path) explains the bridge and receipts.

## Identity and Common Fields

- **P-ID** identifies the tracked plant/container over time. **Pot label** is the physical label such as A1 or #2. Saved rows retain the label at entry, so an old label can be correct historical evidence.
- **Observed at / Started at / Date** means when the action or measurement happened. Backdate an observation to its real time when appropriate; **Recorded** separately stores when it was saved.
- In the phone logger, **Observed at** uses the current time when you save or queue an entry. Edit it to record earlier care, or choose **Use current time** to resume automatic timing. Queued entries and retries keep their original observation time.
- **Pot setup** identifies the whole weighed configuration. It is not the pot size in inches.
- **Notes** hold useful details not covered by structured fields. In a multi-event save, the note is attached to the first generated event rather than copied onto every row.
- **Plant condition**, **Soil moisture**, and **Medium / substrate** are different fields. Condition and moisture belong to Check; the growing-medium description belongs to Repot.
- A shared planter receives one observation identity per event for that container. Its components do not receive invented individual weights.

## The 12 Selectable Actions

The single-plant logger exposes exactly these 12 event choices. Fields listed as required here describe the detailed web/AppSheet writer; Quick log offers a smaller set of structured fields.

| Action      | When to use it                                                                        | Details and effects                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 💧 Water    | Water was actually applied.                                                           | Choose application style and whether nutrients were used. With nutrients, product and amount are required. Optional water volume is measured mL. Starts a watering cycle even without a weight. |
| ⚖️ Weigh    | You have an actual scale reading.                                                     | Requires a positive weight in grams. Does not imply Water. New rows are stored as Routine; derived views infer cycle state.                                                                     |
| 📏 Measure  | You measured or estimated plant dimensions.                                           | Requires height, width, or both. Keep unit, quality, and method explicit. Both dimensions share one Measure row.                                                                                |
| 🔎 Check    | You observed condition or soil moisture.                                              | Condition is descriptive; moisture has its own field. Record only what was observed. Selecting Check alone is not proof of a specific condition or verified dryness.                            |
| 🔄 Rotation | You turned the pot.                                                                   | Records clockwise-equivalent degrees, default 90. The detailed server accepts a value greater than 0 and at most 360. Record the actual turn.                                                   |
| 🧽 Clean    | You cleaned something associated with this pot.                                       | Lightweight dated event; explain what was cleaned in Notes. No automatic treatment or weight correction follows.                                                                                |
| ✂️ Prune    | You removed or trimmed plant material.                                                | Lightweight dated event; describe what was removed and why in Notes. It does not automatically adjust a weight baseline.                                                                        |
| 🪴 Repot    | The plant was repotted or its relevant medium/configuration was deliberately changed. | The detailed form requires the new pot-size text, retains the previous size, and advances Pot setup. Record medium separately. The same physical size can still have a new setup.               |
| 🌸 Flower   | You want to record flowering, buds, or a flowering change.                            | Requires a positive whole-number flower count, descriptive flower details, or both. For no open flowers or spent blooms, use the description; zero is not accepted as a positive count.         |
| 📷 Photo    | You have a photo observation to link.                                                 | Requires an HTTPS Google Photos link from photos.google.com or photos.app.goo.gl. Does not automatically publish a new booklet photograph.                                                      |
| 🐛 Pest     | You observed a pest/problem and want to record the response.                          | Requires both Pest / issue and Treatment / action. If no treatment was applied, say that honestly in the action field; do not invent one.                                                       |
| 📝 Other    | A dated event does not fit the named categories.                                      | Describe it in Notes, such as a move or lighting change. Free text does not automatically change forecasts, care rules, or Pot setup.                                                           |

### Automatic Note Records and Inferred Actions

**Note** can appear in History even though it is not one of the 12 selectable event buttons. If an otherwise event-free submission contains only notes, the writer creates a Note record. Notes entered alongside a selected action stay on the first event; they do not necessarily create a separate Note row.

The writer also adds appropriate events from entered data: a weight adds Weigh, dimensions add Measure, and condition or soil-moisture information adds Check in the detailed form. Entering a weight never automatically adds Water. An entirely empty submission is rejected.

This means one click on Save is not always one History row. Review the event summary rather than interpreting several rows with the same save time as duplicates.

## Water, Nutrients, and Weight Are Separate

### Application Style

The exact choices are **Flood / soak-through**, **Thorough**, **Partial**, and **Spot**. Flood / soak-through is the default. Change it when that does not describe what happened. A blank historical application remains legacy/unspecified; do not relabel it without evidence.

Partial and Spot waterings remain real Water events, but do not qualify for the normal full-cycle forecast. Flood / soak-through and Thorough can qualify when the other model evidence is valid. Choosing a more favorable label to restore a forecast would corrupt the record.

### Amount Fields

| Field             | Meaning                                                                | Example of honest entry                                                      |
| ----------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Weight (g)        | Entire assembly on the scale.                                          | 412.5 g, if that is the measured reading.                                    |
| Water amount (mL) | Measured liquid applied during that watering.                          | Leave blank when it was not measured.                                        |
| Nutrients used    | Whether nutrient product was included.                                 | Yes or No.                                                                   |
| Nutrient product  | Product actually used, required with Yes.                              | The form suggests MSU 13-3-15 and SuperThrive Foliage Pro.                   |
| Nutrient amount   | Product quantity or concentration, including units, required with Yes. | Record the actual amount and units; this is not a recommendation for a dose. |

There is no separate Fertilize event button. The structured nutrient record belongs to Water. Do not create a fictional watering to document a different activity; use Other with an accurate note when appropriate.

**Water + Weigh** is a combination of events, not a thirteenth single-plant event. Water without a scale reading is valid. Weigh without Water is valid. If the weight represents the post-drain condition of that watering, it can be included in the same observation. If it is a pre-watering reading, save it separately at its actual earlier time and record the post-drain reading separately if taken.

The writer places Weigh before Water within a combined save for historical ordering. The shared save identity lets the cycle logic recognize that weight as the watering's Wet anchor. Do not rearrange rows or edit their timestamps merely to make the sheet look chronological.

### Why You Do Not Choose Dry, Wet, or Routine

The Weight state field remains in the workbook for compatibility with older records and drafts. New weights are stored as Routine. Derived views identify the same-save watering weight, or the first eligible positive weight within five days when needed, as Wet. The final eligible non-Wet weight before the next Water can become the completed Dry endpoint. An unfinished cycle's latest low remains Routine.

A derived Wet/Dry label can therefore differ from a canonical History state shown elsewhere. This is expected. See the [watering reference explanation](./watering-strategy.md#what-wet-and-dry-references-mean).

## Dimensions, Condition, and Repot Details

### Measure

The mobile form accepts **in** or **cm**, with inches as its new-entry default. Height and width can be entered independently. History keeps normalized centimeters, the chosen entry unit, and derived inch values for consistent views.

Methods are **Ruler**, **Estimated from photo**, **Estimated visually**, **Other**, and **Unspecified**. Ruler sets measurement quality to Measured; photo and visual methods set it to Estimated. Other/Unspecified retain an explicit compatible quality choice, defaulting to Estimated when absent. A picture-based guess is not a ruler measurement.

Quick log dimensions are currently recorded with Estimated quality and Unspecified method because that sheet does not provide the detailed method controls. Use the detailed form when preserving measured provenance matters. Older pending payloads with no unit use the legacy centimeter interpretation; do not assume every old number is inches.

### Check

The soil-moisture choices exposed by the detailed form are **Dry**, **Slightly moist**, **Moist**, **Wet**, and **Unknown**. These describe an observation, not a sensor reading automatically inferred from pot weight. Use Unknown when appropriate; a blank or Unknown field does not mean Dry.

Condition describes the plant, while medium describes what it is growing in. For example, a note about new growth belongs with condition; the potting-mix recipe belongs with Repot. A moisture selection does not itself cause the forecast model to certify all parts of a shared root ball or automatically authorize water.

### Repot and Setup Boundaries

Use the detailed Repot form for its automatic setup advancement and structured old/new pot-size and medium fields. Enter the same physical pot size if the medium was changed while reusing that pot, and describe the actual change.

Quick log reads its Pot setup cell directly and does not provide the same detailed Repot preparation. Selecting Repot in that sheet alone should not be treated as equivalent to the automatic setup change in the mobile form. Avoid manually guessing a setup number or migrating old rows as part of routine entry.

A corrected gram typo is a correction, not a Repot. A lighting change can be Other, not an automatic new weighing setup. Significant mass/configuration changes need clear documentation so incompatible baselines are not silently compared.

## Photos and Other Detailed Observations

For Photo, use Open Google Photos, obtain the intended share link, and paste it into the form. A browser file-picker path is not a durable share URL. Logging a photo link and publishing an image into the online booklet are separate operations; the latter has its own checked photo-publication workflow.

For Flower, describe whether a count refers to open flowers, buds, or something else. A text description can record spent blooms without forcing a positive count. For Pest, retain uncertainty in the issue description and distinguish observation from treatment. Clean and Prune also benefit from a short, specific note because they have no separate structured quantity field.

Do not add private account details, addresses, or other unnecessary personal information to notes or shared links. The workbook and public history are intended to be viewable references.

## Which Actions Support Bulk Entry

| Surface                      | Supported round                                                         | Important distinction                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile Bulk care             | Water, Check, Rotation, Clean, Prune, Pest, Other                       | Shared details are applied to each selected plant. Use single-plant mode for different weights, dimensions, repots, flowers, or photos.  |
| Mobile single-plant queue    | Separate detailed entries for several pots                              | This is how to collect different individual weights before sending the queue together. It is not one shared weight applied to every pot. |
| AppSheet Bulk Log            | Water, Weigh, Water + weigh, Rotation, Check, Clean, Prune, Pest, Other | Has dedicated per-plant weight fields in addition to selected plants and shared details.                                                 |
| Quick log bulk Event control | Applies an Event selection to input rows or clears those selections     | Choosing an event across rows does not mean those observations were saved. Review and save the intended rows.                            |

In AppSheet **Weigh** rounds, populated per-plant weight fields determine the weighed plants. **Water** requires selected watered plants. **Water + weigh** requires selected watered plants and at least one entered weight; the bridge handles each plant's actual combination. A selected watered pot can have no weight, and an entered weight can belong to a pot that was not watered. Do not assume every weight field belongs to the watered selection.

Shared bulk details must really be shared. In particular, a common water-volume value is applied to each applicable plant's record, not divided as a total for the entire round. Split the entries when measured volumes, application styles, nutrient details, or observations differ.

## Saving, Queues, and Corrections

| Control or state                      | Meaning                                                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Add to queue                          | Retains the observation in the current browser/device for later submission.                                                            |
| Send queue                            | Submits the retained observations. Keep them recoverable until Google confirms the result.                                             |
| Save now                              | Submits the current observation immediately through the writer.                                                                        |
| Queued                                | A pending local observation exists; this is not yet proof of a canonical saved weight.                                                 |
| Saved today                           | History confirms an eligible weight in the current local care day.                                                                     |
| Not weighed today                     | A progress filter using the 4 a.m. care-day boundary. It neither logs a skipped action nor requires every remaining pot to be weighed. |
| Refresh / Updated from Google         | Refreshes data and reports fetch time. It is not a new observation timestamp.                                                          |
| Correct entry                         | Opens a supported correction of one saved event, with a reason, preview, and confirmation.                                             |
| Exclude selected History observations | The Sheets menu previews selected records and marks confirmed exclusions Removed while retaining the audit trail.                      |

Retry the existing request after a connection problem rather than immediately creating a new observation. The queue and bridge use request identities to avoid duplicating a confirmed save. In AppSheet, use the receipt and supported retry/correction path; staging rows are not a second editable History.

Correct entry operates on one event, not every row from the same Save. A correction appends a replacement and excludes the original from active calculations while retaining its provenance. Plant ID, event type, label provenance, and setup identity are fixed in this flow. A date change that crosses a setup boundary can be refused; it is not a routine way to reorganize history.

Do not delete entire History rows, overwrite a formula on a Pxx page, or repeatedly add “fixed” measurements without excluding the incorrect ancestor. See the [correction runbook](../scripts/google-sheets/README.md#saved-entry-corrections) for recovery behavior.

## Example Saves

| What actually happened                                        | What to log                                                       | Expected result                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Only a scale reading                                          | Weigh with grams and actual time                                  | One Weigh row; no Water event.                                                     |
| Watered and weighed after draining                            | Water plus the actual post-drain weight and water details         | Separate Weigh and Water rows linked to the same save.                             |
| Watered, weighed, and measured height                         | Water plus grams and height/unit/method                           | Weigh, Water, and Measure records; the values stay on their respective event rows. |
| Recorded condition and a scale reading                        | Check information plus grams                                      | Check and Weigh records; condition is not copied into the weight value.            |
| Changed medium in the same size pot                           | Detailed Repot with the reused size and actual medium description | A new setup and a Repot record, even though the pot diameter is unchanged.         |
| Only wrote a dated note with no selected event or measurement | Notes-only entry where supported                                  | An automatic Note record.                                                          |
| Noticed a mistake in a saved Water amount                     | Correct that Water event with a reason                            | A reviewed replacement for that event; the accompanying Weigh row is unchanged.    |

These examples explain the data contract. They are not instructions to perform the underlying care actions. The daily task remains limited to supported watering and useful weighing.

## Sources and Implementation References

- [Logger source](../scripts/google-sheets/plant-tracker.gs) — `WEB_EVENT_OPTIONS`, `BULK_WEB_EVENT_OPTIONS`, `prepareWebObservation_`, `buildEventNamesFromList_`, `eventDetailsFromPayload_`, `storedObservationRows_`, and `appSheetBulkPayloadsFromRow_`.
- [Mobile form source](../scripts/google-sheets/Index.html) — field controls, queue, progress indicators, and correction interface.
- [Logging behavior](../scripts/google-sheets/README.md#logging-behavior) — canonical records and event-specific data.
- [AppSheet companion](./appsheet-companion.md) — staging, round actions, receipts, and read-only views.
- [Daily care and Integrity](../scripts/google-sheets/README.md#daily-care-and-integrity) — the retired calendar and maintained check indicators.
