/**
 * Derived cycle comparison for the native workbook. The calculation reuses the
 * bound logger's correction resolver and cycle boundaries; it is not a
 * forecast. History input uses the same 14 columns as GARDEN_DRY_DOWN, except
 * its first column must contain native Date values rather than numeric Sheet
 * serials.
 */

/**
 * @typedef {{
 *     recordsByPlant: (
 *         history: GardenHistoryRow[]
 *     ) => Map<string, DryDownRecord[]>;
 *     cycles: (records: DryDownRecord[]) => GardenDryDownCycle[];
 *     dateLabel: (unixDays: number) => string;
 * }} CycleComparisonHelpers
 */

/**
 * Append this source to the maintained bound script during integration. It uses
 * only global Apps Script functions; imports and Node APIs stay in this module.
 * The wrapper's timezone labels are presentation, never timestamp arithmetic.
 *
 * @returns {string}
 */
export function cycleComparisonAppsScriptSource() {
    // Apps Script's deployed parser rejects numeric separators, and its V8
    // runtime need not provide Node's copying array methods. Both sorts below
    // operate on new arrays, as does the sliced cycle reversal.
    const calculation = cycleComparisonRows
        .toString()
        .replace(
            "function cycleComparisonRows(",
            "function cycleComparisonRows_("
        )
        .replaceAll(".toSorted(", ".sort(")
        .replaceAll(".toReversed()", ".reverse()");
    return `/**
 * Compare the current and last two completed watering cycles in one pot setup.
 * @param {GardenHistoryRow[]} history Native History A:AP range including dates.
 * @param {GardenCell} plantId Selected plant ID.
 * @param {GardenCell} potSetup Current Baselines pot setup.
 * @returns {GardenCell[][]}
 * @customfunction
 */
function GARDEN_CYCLE_COMPARISON(history, plantId, potSetup) {
    const timeZone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const projected = history.map((row) => [
        row[0] ?? "", row[1] ?? "", row[2] ?? "", row[3] ?? "", row[4] ?? "", row[10] ?? "", row[15] ?? "",
        row[29] ?? "", row[35] ?? "", row[40] ?? "", row[28] ?? "", row[34] ?? "", row[26] ?? "", row[30] ?? "",
    ]);
    return cycleComparisonRows_(projected, plantId, potSetup, new Date(), {
        recordsByPlant: dryDownRecordsByPlant_,
        cycles: dryDownCycles_,
        dateLabel: (days) => Utilities.formatDate(new Date(days * 86400000), timeZone, "yyyy-MM-dd"),
    });
}

/**
 * @param {GardenHistoryRow[]} history
 * @param {GardenCell} plantId
 * @param {GardenCell} potSetup
 * @param {Date} asOf
 * @param {{recordsByPlant: (history: GardenHistoryRow[]) => Map<string, DryDownRecord[]>, cycles: (records: DryDownRecord[]) => GardenDryDownCycle[], dateLabel: (unixDays: number) => string}} helpers
 * @returns {GardenCell[][]}
 */
${calculation}
`;
}

/**
 * Build the live dependency formula. No NOW/TODAY input: Google Sheets rejects
 * volatile custom-function arguments. History, selector, and current setup all
 * remain explicit dependencies; the wrapper excludes future rows at
 * evaluation.
 *
 * @param {{
 *     plantCell?: string;
 *     inventoryLastRow?: number;
 *     historyLastRow?: number;
 * }} [options]
 *
 * @returns {string}
 */
export function cycleComparisonFormula({
    historyLastRow = 5000,
    inventoryLastRow = 31,
    plantCell = "'Insights'!$B$228",
} = {}) {
    if (
        [inventoryLastRow, historyLastRow].some(
            (row) => !Number.isSafeInteger(row) || row < 2
        )
    )
        throw new Error(
            "Cycle comparison requires bounded inventory and History ranges"
        );
    const end = historyLastRow;
    return `=GARDEN_CYCLE_COMPARISON(History!A2:AP${end},${plantCell},IFNA(XLOOKUP(${plantCell},Baselines!A2:A${inventoryLastRow},Baselines!T2:T${inventoryLastRow}),""))`;
}

/**
 * Return a four-column spill: elapsed days, current grams, previous grams,
 * older grams. Missing series stay blank; no synthetic zero, wet anchor, or
 * forecast is added. Same-time points within a series retain the last corrected
 * reading. An undated Water/Repot boundary withholds the chart, as in the
 * detector.
 *
 * Native Date inputs retain actual elapsed time through daylight-saving
 * changes. Helpers deliberately come from plant-tracker.gs to avoid a second
 * correction implementation. The explicit asOf makes future exclusions
 * deterministic.
 *
 * @param {GardenHistoryRow[]} history
 * @param {GardenCell} plantId
 * @param {GardenCell} potSetup
 * @param {Date} asOf
 * @param {CycleComparisonHelpers} helpers
 *
 * @returns {GardenCell[][]}
 */
export function cycleComparisonRows(history, plantId, potSetup, asOf, helpers) {
    const empty = [
        [
            "Days since watering",
            "",
            "",
            "",
        ],
        [
            "",
            "",
            "",
            "",
        ],
    ];
    const setup = Number(potSetup);
    if (
        !String(plantId).trim() ||
        !Number.isSafeInteger(setup) ||
        setup < 1 ||
        !Number.isFinite(asOf.getTime())
    )
        return empty;
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const now = asOf.getTime() / millisecondsPerDay;
    const normalized = history.map((row) => {
        const copy = [...row];
        copy[0] =
            row[0] instanceof Date ? row[0].getTime() / millisecondsPerDay : 0;
        return copy;
    });
    const records = (
        helpers.recordsByPlant(normalized).get(String(plantId).trim()) ?? []
    ).filter(
        (record) =>
            record.setup === setup &&
            (record.date <= now || !Number.isFinite(record.date))
    );
    if (
        records.some(
            (record) =>
                ["Repot", "Water"].includes(record.event) &&
                (!Number.isFinite(record.date) || record.date <= 0)
        )
    )
        return empty;
    const ordered = records
        .filter((record) => Number.isFinite(record.date) && record.date > 0)
        .toSorted(
            (left, right) => left.date - right.date || left.index - right.index
        );
    const repot = ordered.findLast((record) => record.event === "Repot");
    const inSetup = ordered.filter(
        (record) =>
            !repot ||
            record.date > repot.date ||
            (record.date === repot.date &&
                (record.index >= repot.index ||
                    (record.save !== "" && record.save === repot.save)))
    );
    const selected = helpers.cycles(inSetup).slice(-3).toReversed();
    const headers = [
        "Days since watering",
        "",
        "",
        "",
    ];
    /** @type {Map<number, GardenCell[]>} */
    const rows = new Map();
    for (const [index, cycle] of selected.entries()) {
        const role =
            [
                "Current",
                "Previous",
                "Older",
            ][index] ?? "Older";
        headers[index + 1] = `${role} · ${helpers.dateLabel(cycle.water.date)}`;
        for (const point of cycle.points) {
            const elapsed = point.date - cycle.water.date;
            const values = rows.get(elapsed) ?? [
                elapsed,
                "",
                "",
                "",
            ];
            values[index + 1] = point.weight;
            rows.set(elapsed, values);
        }
    }
    const entries = [...rows];
    return [
        headers,
        ...(rows.size > 0
            ? entries
                  .toSorted(([left], [right]) => left - right)
                  .map(([, row]) => row)
            : [
                  [
                      "",
                      "",
                      "",
                      "",
                  ],
              ]),
    ];
}
