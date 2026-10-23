# Spreadsheet and Logger Actions

Use this guide to choose an action, record measurements, and correct saved care
entries. The maintained 5.36.0 logger adds **Leaf VPD** in place of Support for
new entries. Existing Support records, corrections, and queued retries remain
supported. Air, soil, and leaf measurements keep their own context.
The [deployment record](../scripts/google-sheets/README.md) keeps the
logger version and production details.

Read alongside the [watering strategy](./watering-strategy.md), [weighing strategy](./weighing-strategy.md), and [operator runbook](../scripts/google-sheets/README.md).

## Where to Enter Observations

| Surface                                                      | Best use                                                                                                          | What happens after saving                                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Garden Entry Logger, single plant                            | Detailed observations, measurements, photos, repots, and several actions for the same pot.                        | Save now writes through Apps Script; Add to queue retains the entry on the device until the queue is sent and confirmed.       |
| Garden Entry Logger, Bulk care                               | The same supported care action and shared details for selected pots.                                              | Creates separate observations for the selected plants; it does not turn them into a shared container.                          |
| Google Sheets Quick log (hidden compatibility sheet)         | Simple row-based entry of event, time, weight, dimensions, condition, notes, setup, and water application/amount. | The Save checkbox archives event-specific rows in History. It is not the full structured mobile form.                          |
| AppSheet Log                                                 | Detailed phone or desktop form entry.                                                                             | Writes to App entries staging; the Apps Script bridge validates and archives the observation.                                  |
| AppSheet Bulk Log                                            | Water, individual weights, combined Water + weigh, and supported shared-care rounds.                              | Writes to App bulk staging, then the bridge creates the per-plant History records.                                             |
| History, History view, dashboards, Pxx pages, public tracker | Review, comparisons, charts, and history.                                                                         | Derived/read-only views are not a second place to type canonical measurements. Use the supported correction flow for an error. |

Quick log is hidden for compatibility; use the mobile logger or AppSheet for routine entry. Use the daily report for the care plan.

**History** is the canonical observation ledger. **History view** is its sorted projection. AppSheet staging and a local browser queue are not confirmation that a record has reached History. The [AppSheet companion guide](./appsheet-companion.md#data-ownership-and-save-path) explains the bridge and receipts.

## Identity and Common Fields

- **P-ID** identifies the tracked plant/container over time. **Pot label** is the physical label such as A1 or #2. Saved rows retain the label at entry, so an old label can be correct historical evidence.
- **Observed at / Started at / Date** means when the action or measurement happened. Backdate an observation to its real time when appropriate; **Recorded** separately stores when it was saved.
- In the phone logger, **Observed at** uses the current time when you save or queue an entry. Edit it to record earlier care, or choose **Use current time** to resume automatic timing. Queued entries and retries keep their original observation time.
- **Pot setup** identifies the whole weighed configuration. It is not the pot size in inches.
- **Notes** hold useful details not covered by structured fields. In a multi-event save, the note is attached to the first generated event rather than copied onto every row.
- **Plant condition**, **Soil moisture**, and **Medium / substrate** are different fields. New above-ground condition observations use Inspect; soil moisture uses Soil check (stored as Check). Historical condition-only Check records and their supported corrections remain valid. The growing-medium description belongs to Repot.
- A shared planter receives one observation identity per event. Weigh the
  whole container and name the relevant member in Notes when needed.

For example, select `#2` / `P20` once for a shared-planter weight or watering.
The same applies to #6 / P30 and #9 / P35: their botanical pages share one pot
entry. “Tan/brown Lithops firm; grey/green heads beginning replacement” belongs
in P35's note. Find each planter's members in the [container guide](./containers.md).

## Choosing Pots by Table Position

Both the single-plant picker and **Bulk care** offer **List**, **Labels**, and
**Table** views. Each picker remembers its own view on the current device.
Switching views keeps the selected plant or bulk selection.

**Table** places the 24 lettered pots in the same six-column, four-row arrangement
as the [placement guide](./layouts/table-placement-research.md). The back row
nearest the window is at the top; the front row nearest you is at the bottom.
Numbered pots (`#1`, `#2`, and so on) remain below the table in their usual label
order. Search and **Not weighed today** leave gaps where pots are hidden, so
visible labels retain their actual table positions.

The grid describes the maintained arrangement. Recording a Move does not assign
a new grid slot; update the placement guide when the table arrangement changes.

## The 21 Selectable Actions

The maintained 5.36.0 single-plant form exposes these 21 event choices. Fields listed as required here describe the detailed web/AppSheet writer; Quick log offers a smaller set of structured fields.

| Action        | When to use it                                                                        | Details and effects                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 💧 Water      | Water was actually applied.                                                           | Choose application style and whether nutrients were used. With nutrients, product and amount are required. Optional water volume is measured mL. Starts a watering cycle even without a weight. |
| ⚖️ Weigh      | You have an actual scale reading.                                                     | Requires a positive weight in grams. Does not imply Water. New rows are stored as Routine; derived views infer cycle state.                                                                     |
| Mist          | You misted part of the plant or its growing surface.                                  | Choose one or more targets. Other requires details. Optional amount is measured mL; leaves watering dates and cycles unchanged.                                                                 |
| Humidity      | You have a current hygrometer reading for this container or enclosure.                | Requires a relative-humidity percentage from 0 through 100, including decimals. Stores its own measured event; it does not imply soil moisture, Water, or Weigh.                                |
| Temperature   | You measured air or soil temperature.                                                 | Requires a reading, Air or Soil, and °C or °F. Stores normalized °C plus the entry unit. Zero and negative readings are valid down to absolute zero.                                            |
| Light reading | You have an app PPFD estimate, meter illuminance reading, or both.                    | Stores canonical Light, with PPFD in µmol/m²/s and illuminance in lux. At least one value is required; finite values of zero or greater are valid.                                              |
| 🔎 Soil check | You checked soil moisture.                                                            | Requires soil moisture; stored as Check. Historical condition-only Check records remain readable and correctable. Selecting Check alone does not prove verified dryness.                        |
| Inspect       | You inspected the plant's visible condition.                                          | Requires descriptive Plant condition. Stores Observed / Observed provenance; does not establish root-zone moisture.                                                                             |
| 📏 Measure    | You measured or estimated plant dimensions.                                           | Requires height, width, or both. Keep unit, quality, and method explicit. Both dimensions share one Measure row.                                                                                |
| 🔄 Rotation   | You turned the pot.                                                                   | Records clockwise-equivalent degrees, default 90. The detailed server accepts a value greater than 0 and at most 360. Record the actual turn.                                                   |
| Move          | You moved the pot to a different location.                                            | Requires New location; Previous location is optional. Keeps the same P-ID and pot setup.                                                                                                        |
| Environment   | You changed light, airflow, enclosure, or heating settings.                           | Choose the aspect and enter New setting; Previous setting is optional. Describes a change, not a sensor measurement.                                                                            |
| 🧽 Clean      | You cleaned something associated with this pot.                                       | Lightweight dated event; explain what was cleaned in Notes. No automatic treatment or weight correction follows.                                                                                |
| ✂️ Prune      | You removed or trimmed plant material.                                                | Lightweight dated event; describe what was removed and why in Notes. It does not automatically adjust a weight baseline.                                                                        |
| Leaf VPD      | You recorded a displayed leaf VPD or measured leaf temperature.                       | Choose a device reading or calculation. Device mode requires the displayed kPa; calculation requires leaf temperature, with paired air temperature and humidity together or neither.            |
| 🪴 Repot      | The plant was repotted or its relevant medium/configuration was deliberately changed. | The detailed form requires the new pot-size text, retains the previous size, and advances Pot setup. Record medium separately. The same physical size can still have a new setup.               |
| Propagate     | You took a cutting, separated an offset, divided a plant, or sowed seed.              | Requires method and details. Records the activity against the selected source pot; does not create a new inventory entry.                                                                       |
| 🌸 Flower     | You want to record flowering, buds, or a flowering change.                            | Requires a positive whole-number flower count, descriptive flower details, or both. For no open flowers or spent blooms, use the description; zero is not accepted as a positive count.         |
| 📷 Photo      | You have a photo observation to link.                                                 | Requires an HTTPS Google Photos share link or Gyazo capture link. Does not automatically publish a new website photograph.                                                                      |
| 🐛 Pest       | You observed a pest/problem and want to record the response.                          | Requires both Pest / issue and Treatment / action. If no treatment was applied, say that honestly in the action field; do not invent one.                                                       |
| 📝 Other      | A dated event does not fit the named categories.                                      | Describe an activity not covered by a named action in Notes. Free text does not automatically change forecasts, care rules, or Pot setup.                                                       |

The buttons use seven rows of three, in the order above. Save and queue controls
sit above Details, so a simple entry does not require scrolling past every field.
Compact history includes both the plant portrait and event icon. The plant chooser
uses short display descriptions; detailed identification evidence stays in the
plant profiles.

### Automatic Note Records and Inferred Actions

**Note** can appear in History even though it is not one of the 21 selectable event buttons. If an otherwise event-free submission contains only notes, the writer creates a Note record. Notes entered alongside a selected action stay on the first event; they do not necessarily create a separate Note row.

The mobile writer also adds appropriate events from entered data: a weight adds Weigh, dimensions add Measure, soil moisture adds Check, and plant condition adds Inspect. Each field stays on its own event row. New AppSheet condition and moisture fields apply only to their selected actions. Entering a weight never automatically adds Water. An entirely empty submission is rejected.

This means one click on Save is not always one History row. Review the event summary rather than interpreting several rows with the same save time as duplicates.

## Water, Nutrients, and Weight Are Separate

### Application Style

The exact choices are **Flood / soak-through**, **Thorough**, **Partial**, and **Spot**. Flood / soak-through is the default. Change it when that does not describe what happened. A blank historical application remains legacy/unspecified; do not relabel it without evidence.

Partial and Spot waterings remain real Water events, but do not qualify for the normal full-cycle forecast. Flood / soak-through and Thorough can qualify when the other model evidence is valid. Choose the label that describes the watering you performed.

### Amount Fields

| Field             | Meaning                                                                | Example of honest entry                                                      |
| ----------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Weight (g)        | Entire assembly on the scale.                                          | 412.5 g, if that is the measured reading.                                    |
| Water amount (mL) | Measured liquid applied during that watering.                          | Leave blank when it was not measured.                                        |
| Nutrients used    | Whether nutrient product was included.                                 | Yes or No.                                                                   |
| Nutrient product  | Product actually used, required with Yes.                              | The form suggests MSU 13-3-15 and SuperThrive Foliage Pro.                   |
| Nutrient amount   | Product quantity or concentration, including units, required with Yes. | Record the actual amount and units; this is not a recommendation for a dose. |

There is no separate Fertilize event button. The structured nutrient record belongs to Water. Do not create a fictional watering to document a different activity; use Other with an accurate note when appropriate.

**Water + Weigh** combines two existing events. Water without a scale reading is valid. Weigh without Water is valid. If the weight represents the post-drain condition of that watering, it can be included in the same observation. If it is a pre-watering reading, save it separately at its actual earlier time and record the post-drain reading separately if taken.

The writer places Weigh before Water within a combined save for historical ordering. The shared save identity lets the cycle logic recognize that weight as the watering's Wet anchor. Do not rearrange rows or edit their timestamps merely to make the sheet look chronological.

### Why You Do Not Choose Dry, Wet, or Routine

The Weight state field remains in the workbook for compatibility with older records and drafts. New weights are stored as Routine. Derived views identify the same-save watering weight, or the first eligible positive weight within five days when needed, as Wet. The final eligible non-Wet weight before the next Water can become the completed Dry endpoint. An unfinished cycle's latest low remains Routine.

A derived Wet/Dry label can therefore differ from a canonical History state shown elsewhere. This is expected. See the [watering reference explanation](./watering-strategy.md#what-wet-and-dry-references-mean).

## Humidity Readings

For the terrarium, choose **#12 / P38**, select **Humidity**, and enter the current
sensor reading in **Relative humidity (% RH)**. Enter `72` for a display showing
72% RH, or `72.5` when the sensor supplies that precision. Use the actual
observation time. Zero is a valid value; leaving the field blank does not record
zero. This field records one current reading, not a daily minimum, maximum, or
target.

The saved Humidity row carries **Measured / Hygrometer** provenance and its
percentage in History AQ. Its timestamp, save identity, retry protection,
offline recovery, and supported corrections work like other observations.
Combining Humidity with another action creates separate event rows. The public
container history shows the latest recorded humidity, its history chart, and
the value in CSV exports. Humidity is available only in individual entry forms,
so an enclosure reading cannot be broadcast across a bulk selection.

P38's [October 10 arrival record](./terrarium.md) includes five photographs,
provisional plant identifications, and an owner-reported 99% RH reading below
the cork cap with fogged glass. No humidity target or watering threshold is
assigned; the seller's 90% suggestion remains unverified guidance. Air humidity
alone does not record substrate moisture or an inspection of the plants.

## Light Readings

Choose **Light reading** for the actual pot and observation time. Enter the app's
**PPFD (µmol/m²/s)** estimate, the meter's **Illuminance (lux)** reading, or both.
Zero is valid; a blank means no reading was supplied. The logger stores both
values independently, with no automatic lux-to-PPFD conversion. A row containing
PPFD carries **Estimated / Light app** provenance, including when lux is also
present. A lux-only row carries **Measured / Lux meter** provenance.

The owner's **UNI-T UT383BT** measures illuminance in lux or foot-candles, as
documented by UNI-T. Select its lux display for the logger's lux field. The
**PPFD Meter** app listing describes UT383BT support and lux-to-PPFD conversion;
that app output remains an estimate here, not a direct quantum-sensor reading.
Use the app setting matched to the light being assessed and keep the preset,
lamp settings, daylight contribution, sensor height and orientation in Notes
when useful. A single reading is not a measured daily light integral or a
watering instruction. See the [sources](#sources-and-implementation-references).

History appends these values in **AR:AS**; detailed App entries staging appends
them in **AJ:AK**. Light, Humidity, Temperature, and Leaf VPD remain individual observations and are
not shared Bulk care actions.

## Mist, Movement, and Environment

**Mist** accepts multiple targets: Leaves, Exposed roots, Soil surface, Stem /
plant body, Moss / support, or Other. Add a description for Other. Leave the
amount blank unless you measured the applied liquid. Misting does not update
last-watered dates, watering intervals, or wet-weight anchors; select Water
separately if you also watered the medium.

**Move** records Previous location and New location. The logger can suggest the
latest recorded location; check it against where the pot actually was. The latest
active Move supplies the recorded location, including after corrections. Moving a
pot does not change its identity or weighing setup.

**Environment** records Light, Airflow, Enclosure, Heating, or Other, with the new
setting and an optional previous setting. For example, record a timer changing
from 10 hours to 12 hours. Use Light reading, Humidity, or Temperature for actual
sensor readings taken before or after the change.

## Temperature Readings

Select **Temperature**, choose **Air** or **Soil**, and enter the reading in **°C**
or **°F**. The logger remembers the entry unit. Zero and negative readings are
valid; blank is missing. History stores normalized Celsius, the measurement target,
and the entry unit, so air and soil readings have separate histories and chart
series. These measurements do not alter watering dates or weight references.
Temperature is an individual observation, not a shared Bulk care measurement.

## Leaf VPD and Leaf Temperature

Use **Leaf VPD** for one plant and one observation time. Choose the mode that
matches the evidence:

- **Device:** enter the leaf VPD displayed by the instrument in kPa. Zero is
  valid; negative device readings are rejected. Leaf temperature, paired air
  temperature, and paired relative humidity are optional context. The displayed
  value is retained as Device evidence rather than replaced by a calculation.
- **Calculated:** enter leaf temperature in °C or °F. Add **both** air temperature
  and relative humidity from the same measurement context to calculate leaf VPD.
  With neither paired input, the event records leaf temperature only, leaves VPD
  blank, and labels its source **Not calculated**. One paired input without the
  other is incomplete.

The calculation uses Celsius temperatures and percentage-point humidity:
`e(T) = 0.6108 × exp(17.27 × T / (T + 237.3))`, then
`leaf VPD = e(leaf temperature) − (RH / 100) × e(air temperature)` in kPa. The
saturation-pressure equation and humidity relation come from
[FAO's meteorological-data guidance](https://www.fao.org/4/x0490e/x0490e07.htm);
using leaf temperature for the leaf-side saturation term is the logger's explicit
calculation. Calculated results retain their sign, including negative values, and are rounded
to four decimal places rather than silently clamped to zero.

The calculator accepts −50 to 100°C after unit conversion; this is its technical
input domain, **not a plant-care range or instrument specification**. Blank stays
missing and zero stays a reading. Do not combine a leaf reading with an unrelated
older air or humidity reading; the paired values describe this observation, not
an inferred link to the latest separate events. Leaf VPD does not set watering
thresholds, change watering dates, or prescribe a daily target.

AC Infinity's [VPD Thermometer product page](https://acinfinity.com/vpd-thermometer-handheld-environmental-monitor/)
describes a device that displays both leaf and air VPD alongside temperatures and
humidity. That supports recording a displayed leaf value; it does not establish
which exact meter model is owned. Record the device and useful measurement context
in Notes when known. Keep imported sensor-channel VPD separate from this plant's
leaf observation unless its channel meaning is established.

## Propagation and Historical Supports

**Propagate** offers Stem cutting, Leaf cutting, Offset, Division, Seed, and
Other. Describe what you did and which plant material was involved. The event
belongs to the selected pot; separately enroll a new container when it needs its
own history.

**Support** is retained for historical records, corrections, and existing queued
retries, with its Add, Adjust, or Remove action and details. New observations use
**Other** with a note for support work. Neither a support operation nor Propagate
automatically starts a new weighing setup. If the assembly on the scale changes materially, record **Repot** as well,
using the same pot size if appropriate, to establish the new setup explicitly.

## Dimensions, Condition, and Repot Details

### Measure

The mobile form accepts **in** or **cm**, with inches as its new-entry default. Height and width can be entered independently. History keeps normalized centimeters, the chosen entry unit, and derived inch values for consistent views.

Methods are **Ruler**, **Estimated from photo**, **Estimated visually**, **Other**, and **Unspecified**. Ruler sets measurement quality to Measured; photo and visual methods set it to Estimated. Other/Unspecified retain an explicit compatible quality choice, defaulting to Estimated when absent. A picture-based guess is not a ruler measurement.

Quick log dimensions are currently recorded with Estimated quality and Unspecified method because that sheet does not provide the detailed method controls. Use the detailed form when preserving measured provenance matters. Older pending payloads with no unit use the legacy centimeter interpretation; do not assume every old number is inches.

### Inspect and Check

Use **Inspect** for an above-ground condition observation, such as firm new leaves,
color changes, damage, or the condition of a named shared-planter member.
**Plant condition is required**; provenance is **Observed / Observed**. Use
**Soil check** for the separate soil-moisture observation; a soil-moisture value
is required for a new Check. Selecting both records separate events: condition
stays on Inspect and soil moisture stays on Check. Historical condition-only
Checks, their completed retries, and supported corrections remain valid; do
not relabel or rewrite them as Inspect. AppSheet uses only the condition or
soil-moisture field for its selected action, so a hidden value left by an earlier
selection does not create another care event.

The soil-moisture choices exposed by the detailed form are **Dry**, **Slightly moist**, **Moist**, **Wet**, and **Unknown**. These describe an observation, not a sensor reading automatically inferred from pot weight. Use Unknown when appropriate; a blank or Unknown field does not mean Dry.

Condition describes the plant, while medium describes what it is growing in.
For example, new growth belongs with condition; the potting-mix recipe belongs
with Repot. In a shared planter, mention which member or part of the root zone
you checked.

### Repot and Setup Boundaries

Use the detailed Repot form for its automatic setup advancement and structured old/new pot-size and medium fields. Enter the same physical pot size if the medium was changed while reusing that pot, and describe the actual change.

Quick log reads its Pot setup cell directly and does not provide the same detailed Repot preparation. Selecting Repot in that sheet alone should not be treated as equivalent to the automatic setup change in the mobile form. Avoid manually guessing a setup number or migrating old rows as part of routine entry.

A corrected gram typo is a correction, not a Repot. Record a lighting change with Environment; it does not automatically start a new weighing setup. Significant mass/configuration changes need clear documentation so incompatible baselines are not silently compared.

## Photos and Other Detailed Observations

For Photo, paste an existing Gyazo capture link, or use Open Google Photos and obtain the intended share link. Gyazo links use `https://gyazo.com/` followed by the 32-character lowercase capture ID. A browser file-picker path is not a durable share URL. A saved photo link appears in the observation history; it does not automatically add the image to the plant's website gallery.

For Flower, describe whether a count refers to open flowers, buds, or something else. A text description can record spent blooms without forcing a positive count. For Pest, retain uncertainty in the issue description and distinguish observation from treatment. Clean and Prune also benefit from a short, specific note because they have no separate structured quantity field.

Do not add private account details, addresses, or other unnecessary personal information to notes or shared links. The workbook and public history are intended to be viewable references.

## Which Actions Support Bulk Entry

| Surface                      | Supported round                                                                                                      | Important distinction                                                                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile Bulk care             | Water, Mist, Check, Inspect, Rotation, Move, Environment, Clean, Prune, Propagate, Pest, Other                       | Inspect requires the entered shared condition for each selected plant. Use single-plant mode when observations differ; Leaf VPD, Temperature, Light, and Humidity are individual readings. |
| Mobile single-plant queue    | Separate detailed entries for several pots                                                                           | This is how to collect different individual weights before sending the queue together. It is not one shared weight applied to every pot.                                                   |
| AppSheet Bulk Log            | Water, Weigh, Water + weigh, Mist, Check, Inspect, Rotation, Move, Environment, Clean, Prune, Propagate, Pest, Other | Has dedicated per-plant weight fields; Inspect requires selected plants and shared condition. Leaf VPD, Temperature, Light, and Humidity are individual readings.                          |
| Quick log bulk Event control | Applies an Event selection to input rows or clears those selections                                                  | Choosing an event across rows does not mean those observations were saved. Review and save the intended rows.                                                                              |

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
| Refresh / Updated                     | Refreshes data from Google and reports fetch time. It is not a new observation timestamp.                                              |
| Recalculate                           | Refreshes workbook calculations. Open the calculation status below the toolbar for the last confirmed calculation time and details.    |
| History icon and percentage           | Shows used History capacity. Calculation details include exact used and remaining row counts; capacity warnings remain visible.        |
| Correct entry                         | Opens a supported correction of one saved event, with a reason, preview, and confirmation.                                             |
| Move to another plant                 | Reassigns that event to the selected plant and its valid pot setup, preserving the original entry in the audit trail.                  |
| Delete entry                          | Removes the event from active history and calculations; a deletion record preserves its provenance and retry receipt.                  |
| Exclude selected History observations | The Sheets menu previews selected records and marks confirmed exclusions Removed while retaining the audit trail.                      |

The maintained logger can retain an unfinished ordinary single-plant or bulk
form. **Resume draft** restores it; **Discard draft** removes it deliberately. A draft
is not a queued request or a saved History record. Restoring it does not rewrite
a submitted request or change its retry identity.

Queue changes coordinate across logger tabs in the same browser where the Web
Locks API is available. If another tab owns a queue mutation or send, the logger
asks you to wait and retry while retaining your current entry. If that browser
cannot provide the lock, the queue stays readable and **Save now** remains usable,
but queue changes are disabled with an explanation. Storage events and returning
to the tab refresh its queue view. This does not synchronize separate phones or
browser profiles.

History currently supports **50,000 observation rows** below its header. A save
can create several event rows. The server checks the whole batch against remaining
capacity before appending, so a capacity rejection does not leave half of the
batch saved. Keep the retained request recoverable and have the supported workbook
ranges extended before retrying; do not delete historical rows to make room.

Retry the existing request after a connection problem rather than immediately creating a new observation. The queue and bridge use request identities to avoid duplicating a confirmed save. In AppSheet, use the receipt and supported retry/correction path; staging rows are not a second editable History.

Correct entry operates on one event, not every row from the same Save. Choose whether to edit its details, move it to another plant, or delete it. Each action requires a reason, a preview, and confirmation. A move shows the destination plant, label, and pot setup before saving. The observation time, measurements, and other untouched details are preserved.

The correction dialog keeps its action buttons visible while you scroll the form. Open **Entry details** for the saved setup, historical label, and observation ID. **Back** returns from the preview to your edits; **Close** keeps an unsent draft available to resume.

Edits and moves append a replacement and exclude the original from active calculations. Deletion excludes the original and saves an excluded audit record; neither record contributes to care history or calculations. Event type remains fixed. Repot entries cannot be moved or deleted through this form because other observations depend on their setup boundary. A date change or move with an uncertain setup can also be refused; coordinated setup changes need a separately reviewed correction.

Do not delete entire History rows, overwrite a formula on a Pxx page, or repeatedly add “fixed” measurements without excluding the incorrect ancestor. See the [correction runbook](../scripts/google-sheets/README.md#saved-entry-corrections) for recovery behavior.

## Example Saves

| What actually happened                                        | What to log                                                       | Expected result                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Only a scale reading                                          | Weigh with grams and actual time                                  | One Weigh row; no Water event.                                                     |
| Watered and weighed after draining                            | Water plus the actual post-drain weight and water details         | Separate Weigh and Water rows linked to the same save.                             |
| Watered, weighed, and measured height                         | Water plus grams and height/unit/method                           | Weigh, Water, and Measure records; the values stay on their respective event rows. |
| Recorded visual condition and a scale reading                 | Inspect with descriptive condition plus grams                     | Inspect and Weigh records; condition is not copied into the weight value.          |
| Changed medium in the same size pot                           | Detailed Repot with the reused size and actual medium description | A new setup and a Repot record, even though the pot diameter is unchanged.         |
| Only wrote a dated note with no selected event or measurement | Notes-only entry where supported                                  | An automatic Note record.                                                          |
| Noticed a mistake in a saved Water amount                     | Correct that Water event with a reason                            | A reviewed replacement for that event; the accompanying Weigh row is unchanged.    |

These examples explain how to record care. Use the [daily report policy](./daily-weighing-watering-prompt.md) and each plant's readiness checks to decide which care is due.

## Sources and Implementation References

- [UNI-T UT383/UT383BT manufacturer specifications](https://meters.uni-trend.com/product/ut383-ut383bt/) — illuminance readings in lux or foot-candles; checked October 9, 2026.
- [PPFD Meter developer listing on Google Play](https://play.google.com/store/apps/details?id=com.homestudio.ppfdmeter) — UT383BT support, lux-derived PPFD and app profiles; checked October 9, 2026. Developer accuracy claims do not establish a calibrated PPFD measurement for this collection.
- [Logger source](../scripts/google-sheets/plant-tracker.gs) — `WEB_EVENT_OPTIONS`, `BULK_WEB_EVENT_OPTIONS`, `prepareWebObservation_`, `buildEventNamesFromList_`, `eventDetailsFromPayload_`, `storedObservationRows_`, and `appSheetBulkPayloadsFromRow_`.
- [Mobile form source](../scripts/google-sheets/Index.html) — field controls, queue, progress indicators, and correction interface.
- [Logging behavior](../scripts/google-sheets/README.md#logging-behavior) — canonical records and event-specific data.
- [AppSheet companion](./appsheet-companion.md) — staging, round actions, receipts, and read-only views.
- [Daily care and Integrity](../scripts/google-sheets/README.md#daily-care-and-integrity) — the retired calendar and maintained check indicators.
