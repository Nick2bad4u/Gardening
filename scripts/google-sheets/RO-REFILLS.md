# RO refill log

The **RO refills** tab in Garden Plant Tracker records water-supply refill
visits. It is maintained directly in Google Sheets and is separate from plant
observations in `History`. No logger or AppSheet deployment is needed.

## Entering a refill

Add one row per refill visit beneath the headers in **A19:M19**. Enter the
date, the amount added to each container in US gallons, the water type, and
the supplier. Leave containers that were not refilled blank. For a partial
fill, enter the amount added rather than the container's capacity.

| Column | Field                              |
| ------ | ---------------------------------- |
| A      | Refill date                        |
| B      | 5 gal carboy: amount added (gal)   |
| C      | 5 gal carboy: used up on           |
| D      | 5.3 gal carboy: amount added (gal) |
| E      | 5.3 gal carboy: used up on         |
| F      | 3 gal jug: amount added (gal)      |
| G      | 3 gal jug: used up on              |
| H      | 5 gal jug: amount added (gal)      |
| I      | 5 gal jug: used up on              |
| J      | Total refilled (gal), calculated   |
| K      | Water type                         |
| L      | Supplier / location                |
| M      | Notes                              |

The total formula in **J20** is copied through **J1000** with relative row
references:

```text
=IF(OR(A20="",COUNT(B20,D20,F20,H20)=0),"",SUM(B20,D20,F20,H20))
```

The **RO refills by date** column chart above the log uses **A19:A1000** for
dates and **J19:J1000** for totals, including one header row. New rows within
that range are included automatically. Each bar represents one logged refill
visit, not remaining stock or water consumption. The date and nonnegative
amount validations also extend through row 1000. Extend the formulas,
validations, filter, and chart together if that limit is reached.

## Recording a container as used up

In the row for that refill, enter the date the container became empty in
its **Used up on** column: C for the 5 gal carboy, E for the 5.3 gal carboy,
G for the 3 gal jug, or I for the 5 gal jug. Each container can finish on a
different date. Blank means no finish date has been recorded; it does not
prove that water remains.

The date must be on or after the refill date, and the same row must have a
positive refill amount for that container. Clearing a mistaken date is
allowed. Refill visits always get a new row; retain old refill amounts and
finish dates for history. Do not automatically mark an old entry empty when
logging another refill. If you top up a partly full container, explain that
in Notes so the history is not mistaken for a completely separate fill.

All four finish dates for the September 14 refill are initially blank.
This log records historical dates only; it does not estimate remaining water.

## First recorded refill

On **September 14, 2026**, the owner reported filling all four containers
with **pure RO** from **Beaumont's Water, Howell**: a 5 gal carboy, a 5.3 gal
carboy, a 3 gal water jug, and a 5 gal water jug, totaling **18.3 US gal**.
The amounts reflect the stated capacities of the filled containers; no
separate metered volume or water-quality measurement was supplied.

## Workbook maintenance

The analytics migration adds a read-only summary in **O1:T12**, beside the
existing chart and above the entry log. It shows the latest recorded refill
visit and gallons added, then each container's latest fill date, amount,
recorded empty date, and status. **Not marked empty** means the empty-date field
is blank; it is not an estimate of available stock. Containers without a
recorded refill remain unknown. The summary reads the existing records and
does not create another entry table.

This addition was verified in production on September 17, 2026; see the
[analytics rollout record](WORKBOOK-ANALYTICS.md#rollout-record). Keep the manual
entry exceptions **A20:I1000** and **K20:M1000**, calculated totals in J, and the
existing chart unchanged. The summary formulas are maintained in
[`workbook-analytics.mjs`](workbook-analytics.mjs).

Back up the native workbook before structural changes. Preserve this tab,
its manually entered refill records, and its chart during workbook refreshes.
It has no plant ID, does not write to `History`, and does not alter watering
forecasts. Keep plant observation headers, formulas, staging tables, triggers,
and deployment assignments unchanged when maintaining this supply log.
Do not rewrite the RO chart through the Sheets API for an unrelated change:
native readback has shown that a full specification update drops its custom
axis-title colors. Inspect any necessary presentation repair in the chart editor.
