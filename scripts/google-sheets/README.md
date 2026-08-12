# Google Sheets observation logger

The **Garden Plant Tracker** workbook uses permanent `P01`–`P22` plant IDs
internally and keeps the physical pot label (`A1`, `F3`, `#2`, and so on) as a
separate value. That prevents a repot or label change from breaking a plant's
history.

The `Quick log` tab is the input surface. Each plant or shared planter has one
input row, while every saved event becomes a new append-only row on `History`.
The Dashboard, Insights, Baselines, individual plant tabs, and public website
all read from that shared history.

For phone entry, open the
[mobile entry app](https://script.google.com/macros/s/AKfycbytpdMto4ZAqOf49igDNoGYr-J6fmSRDNJOKP4-dKDFRmM2YkTCKJp3kmhrD4gOJShF/exec).
It writes to the same workbook and may ask you to sign in to the Google account
that has access.

Google Sheets formulas cannot preserve a value after an input cell is
overwritten. The bound Apps Script in
[`plant-tracker.gs`](./plant-tracker.gs) supplies that write-time archive step.
It does not need a web-app deployment, database, or external service.

## One-time installation

The repository contains the logger source, but Google does not install a
container-bound Apps Script merely because the repository is deployed. Install
or update it in the workbook once:

1. Open the [Garden Plant Tracker Quick log](https://docs.google.com/spreadsheets/d/1XatdY2Z7izqHtE1ZVfCyu3yWkFviKllhqVQT2Z_88M0/edit?gid=2015971861#gid=2015971861).
2. Choose **Extensions → Apps Script**.
3. Replace the complete `Code.gs` contents with
   [`plant-tracker.gs`](./plant-tracker.gs), then save.
4. Select `installGardenLogger` in the function menu and click **Run** once.
   Approve access to this spreadsheet when Google asks.
5. Return to the workbook and refresh it. A **Garden logger** menu should
   appear.
6. Enter a short test note on one `Quick log` plant row and tick **Save**.
   Confirm that a new row appears at the bottom of `History`.

The reserved `onEdit` function is a simple spreadsheet trigger. Once the code
is saved in the workbook, ticking a checkbox runs it automatically; an
installable trigger is not required.

## Logging behavior

- Editing Event, Weight state, Weight, Height, Width, Condition, or Notes stamps
  `Started at` once. You can edit that timestamp before saving a backdated
  observation.
- One Save can append several event-specific rows. For example, `Water` plus a
  weight and height produces Water, Weigh, and Measure rows without duplicating
  the input values.
- A `Wet` weight also records Water unless Water is already the selected event.
  A weight with no state is stored as `Routine`.
- Height and width can be entered together or independently; both belong to one
  Measure row.
- Condition and Notes are attached to the first event created by that Save so
  the text is not repeated across several history rows.
- The current pot label and plant name are copied from `Plant tracker` at save
  time. Earlier History rows retain the label that was physically on the pot
  when the observation was made.
- Increase `Pot setup` after changing the pot, medium, top dressing, or a saucer
  normally included in the weight. Old readings stay in History but do not
  affect the active dry/wet baseline.
- Row 3 can apply one Event to all plant rows or clear every Event cell. The
  **Garden logger → Clear selected Quick log row** command clears one unfinished
  input row without touching History.
- A Water event means the container was soaked until runoff; water volume is
  intentionally not recorded.
- `History` columns N and O calculate the applicable Water-cycle start and days
  after watering. The logger writes only columns A through M so it does not
  overwrite those array formulas.
- `Baselines` uses completed wet-to-dry cycles to estimate drying time, which is
  shown in `Plant tracker`. Treat that estimate as context, not a watering
  deadline.

The workbook and public pages are personal but publicly viewable. Do not put
private addresses, credentials, or precise home-location information in Notes.
