import {
    chartObservationLimit,
    historyLastRow as defaultHistoryLastRow,
} from "./history-capacity-config.mjs";

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
    // runtime need not provide Node's copying array methods. The sorts below
    // operate on new arrays, as does the sliced cycle reversal.
    const calculation = cycleComparisonRows
        .toString()
        .replace(
            "function cycleComparisonRows(",
            "function cycleComparisonRows_("
        )
        .replaceAll("chartObservationLimit", () =>
            String(chartObservationLimit)
        )
        .replaceAll(".toSorted(", ".sort(")
        .replaceAll(".toReversed()", ".reverse()");
    return `/**
 * Compare the current and last two completed watering cycles in one pot setup.
 * @param {GardenHistoryRow[]} history Native History A:AP, including dates.
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
 * Build the historical custom-function formula. New capacity migrations use an
 * ordinary Apps Script snapshot refresh. No NOW/TODAY input: Sheets rejects
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
    historyLastRow = defaultHistoryLastRow,
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
    return `=GARDEN_CYCLE_COMPARISON(History!A2:AP${historyLastRow},${plantCell},IFNA(XLOOKUP(${plantCell},Baselines!A2:A${inventoryLastRow},Baselines!T2:T${inventoryLastRow}),""))`;
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
    // Cap by observation time before merging elapsed-day domains. A recent
    // short cycle must not be displaced by larger elapsed days in an old one.
    const visiblePoints = new Set(
        selected
            .flatMap((cycle) => cycle.points)
            .toSorted(
                (left, right) =>
                    right.date - left.date || right.index - left.index
            )
            .slice(0, chartObservationLimit)
    );
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
        const points = cycle.points.filter((point) => visiblePoints.has(point));
        for (const point of points) {
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

/**
 * A cached cycle is usable only for its calculated plant and setup while the
 * shared snapshot is ready and fresh. Sheet serial timestamps use days.
 *
 * @param {{ inventoryLastRow?: number }} [options]
 *
 * @returns {string} Condition expression without a leading equals sign.
 */
export function cycleSnapshotReadyCondition({ inventoryLastRow = 37 } = {}) {
    if (!Number.isSafeInteger(inventoryLastRow) || inventoryLastRow < 2)
        throw new Error("Cycle snapshot requires a bounded inventory range");
    const state = "'Workbook calculations'!";
    const selector = "'Insights'!$B$228";
    const setup = `IFNA(XLOOKUP(${selector},Baselines!A2:A${inventoryLastRow},Baselines!T2:T${inventoryLastRow}),"")`;
    return `AND(${state}$I$2="Ready",ISNUMBER(${state}$H$2),${state}$H$2>0,${state}$H$2<=${state}$E$2,${state}$E$2-${state}$H$2<=15/1440,${state}$J$2=${selector},${state}$K$2=${setup})`;
}

/**
 * Visible cycle status: delayed selection changes must not relabel old data.
 *
 * @param {{ inventoryLastRow?: number }} [options]
 *
 * @returns {string}
 */
export function cycleSnapshotStatusFormula(options = {}) {
    const state = "'Workbook calculations'!";
    const timestamp = `IF(ISNUMBER(${state}$H$2)," · last calculated "&TEXT(${state}$H$2,"yyyy-mm-dd hh:mm"),"")`;
    return `=IF(${cycleSnapshotReadyCondition(options)},"Calculated as of "&TEXT(${state}$H$2,"yyyy-mm-dd hh:mm"),IF(${state}$I$2="Refresh failed","Refresh failed",IF(${state}$I$2="Refreshing","Refreshing","Waiting for refresh"))&${timestamp})`;
}

/**
 * Hide cached cycle consumers until their identity and freshness match.
 * Existing chart sentinels remain part of the unchanged ready expression.
 *
 * @param {string} formula
 * @param {{ inventoryLastRow?: number }} [options]
 *
 * @returns {string}
 */
export function gateCycleSnapshotFormula(formula, options = {}) {
    if (!formula.startsWith("=") || formula.length < 2)
        throw new Error("Cycle snapshot gate requires a formula");
    return `=IF(${cycleSnapshotReadyCondition(options)},${formula.slice(1)},"")`;
}
