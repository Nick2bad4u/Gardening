import { createHash } from "node:crypto";

import { historyLastRow } from "./history-capacity-config.mjs";
import palette from "./plant-colors.json" with { type: "json" };

export const dashboardWeightWindowHeaders = [
    "Lowest weight in last 90 days (g)",
    "Latest minus 90-day minimum (g)",
];
const existingHeaders = [
    "Page",
    "Plant ID",
    "Plant / current label",
    "Last watered",
    "Days since water",
    "Latest weight (lb)",
    "Latest weight (g)",
    "Dry weight (g)",
    "Current weight difference (g)",
    "Predicted dry date",
    "Forecast",
    "Height (cm)",
    "Width (cm)",
    "Waterings",
    "Measurements",
    "Avg completed gap (days)",
    "Calibration",
    "Trend",
    "Trend review",
    "Remeasure",
    "Next dry check",
    "Data quality",
    "Model water-date estimate",
    "Model readiness notes",
    "Weight measurements",
    "Last weight change (g)",
    "Last interval loss (g/day)",
    "Average of last 3 weights (g)",
    "Average change across last 3 weights (g)",
    "Last 3 readings loss (g/day)",
    "Curve inspection",
];
const notes = [
    "Lowest active numeric measured weight for the current pot setup within the 90 days ending at Workbook calculations E2 (inclusive). Removed, future, estimated and other-setup readings are excluded. Blank means no eligible reading. This historical minimum is not proof of dry soil or a watering trigger.",
    "Latest measured weight minus the lowest eligible measured weight in the last 90 days for the current pot setup. Blank means either value is unavailable. Zero is retained. This comparison is not a soil-moisture measurement or a watering instruction.",
];

/**
 * @typedef {import("../../test/workbook-fixtures.d.ts").EnteredValue} EnteredValue
 *
 * @typedef {{
 *     sheet: string;
 *     row: number;
 *     column: number;
 *     value?: EnteredValue;
 *     effectiveValue?: EnteredValue;
 *     note?: string;
 * }} WindowCell
 *
 * @typedef {import("../../test/workbook-fixtures.d.ts").SheetMetadata & {
 *     columnGroups?: {
 *         range: {
 *             sheetId: number;
 *             dimension: string;
 *             startIndex: number;
 *             endIndex: number;
 *         };
 *         depth: number;
 *         collapsed: boolean;
 *     }[];
 *     merges?: import("../../test/workbook-fixtures.d.ts").GridRange[];
 *     basicFilter?: {
 *         range: import("../../test/workbook-fixtures.d.ts").GridRange;
 *         sortSpecs?: unknown[];
 *     };
 * }} WindowSheet
 *
 * @typedef {{
 *     metadata: { sheets: WindowSheet[] };
 *     cells: WindowCell[];
 *     dashboardReadBounds: { rowCount: number; columnCount: number };
 * }} DashboardWeightWindowSnapshot
 */

/**
 * @param {{ preconditionDigest: string }} plan @param
 *   {DashboardWeightWindowSnapshot} fresh
 */
export function assertDashboardWeightWindowPreconditions(plan, fresh) {
    if (plan.preconditionDigest !== digest(fresh))
        throw new Error(
            "Workbook drift since planning; rebuild from the fresh snapshot"
        );
}

/**
 * Historical 5,000-row additive migration; do not replay on an upgraded
 * workbook. Read all existing Dashboard cells, including effective values and
 * notes, and full sheet metadata immediately before planning. History headers,
 * Baselines A:T, the shared clock and Integrity B12 are preconditions. No
 * canonical data, staging schema, charts, protections or tab properties are
 * written.
 *
 * @param {DashboardWeightWindowSnapshot} snapshot
 */
export function buildDashboardWeightWindowRequests(snapshot) {
    const { cells, metadata } = snapshot;
    /** @param {string} title */
    const sheet = (title) => {
        const matches = metadata.sheets.filter(
            (entry) => entry.properties.title === title
        );
        if (matches.length !== 1 || !matches[0])
            throw new Error(`Missing or duplicate sheet: ${title}`);
        return matches[0];
    };
    const dashboard = sheet("Dashboard");
    const integrity = sheet("Integrity");
    for (const title of [
        "History",
        "Baselines",
        "Workbook calculations",
    ])
        sheet(title);
    const bounds = dashboard.properties.gridProperties;
    if (
        snapshot.dashboardReadBounds.rowCount !== bounds.rowCount ||
        snapshot.dashboardReadBounds.columnCount !== bounds.columnCount ||
        bounds.rowCount < palette.length + 6 ||
        bounds.columnCount < 31
    )
        throw new Error(
            "Read the complete existing Dashboard grid before planning"
        );
    const keys = new Set();
    for (const entry of cells) {
        const key = `${entry.sheet}:${entry.row}:${entry.column}`;
        if (keys.has(key)) throw new Error("Duplicate snapshot cell");
        keys.add(key);
    }
    /** @param {string} title @param {number} row @param {number} column */
    const cell = (title, row, column) =>
        cells.find(
            (entry) =>
                entry.sheet === title &&
                entry.row === row &&
                entry.column === column
        );
    /**
     * @param {string} title @param {number} row @param {number} column @param
     *   {string} expected
     */
    const header = (title, row, column, expected) => {
        if (cell(title, row, column)?.value?.stringValue !== expected)
            throw new Error(`Unexpected ${title} header: ${expected}`);
    };
    for (const [column, value] of existingHeaders.entries())
        header("Dashboard", 5, column, value);
    for (const [column, value] of /** @type {[number, string][]} */ ([
        [0, "Date"],
        [1, "Plant ID"],
        [2, "Event"],
        [4, "Weight (g)"],
        [10, "Pot setup"],
        [28, "Observation quality"],
        [34, "Measurement method"],
        [35, "Record status"],
    ]))
        header("History", 0, column, value);
    if (sheet("History").properties.gridProperties.rowCount < 5000)
        throw new Error(
            "History lacks the maintained 5000-row formula capacity"
        );
    header("Baselines", 0, 0, "Plant ID");
    header("Baselines", 0, 19, "Pot setup");
    header("Workbook calculations", 0, 4, "Calculated as of");
    const validateClock = () => {
        const clock = cell("Workbook calculations", 1, 4);
        if (
            clock?.value?.formulaValue !== "=NOW()" ||
            typeof clock.effectiveValue?.numberValue !== "number" ||
            !Number.isFinite(clock.effectiveValue.numberValue) ||
            clock.effectiveValue.numberValue <= 90
        )
            throw new Error("Missing valid shared calculation clock");
    };
    validateClock();
    const validateRoster = () => {
        for (const [index, { id }] of palette.entries()) {
            if (
                cell("Dashboard", index + 6, 1)?.value?.stringValue !== id ||
                cell("Baselines", index + 1, 0)?.value?.stringValue !== id
            )
                throw new Error("Dashboard or Baselines plant order changed");
            const setupCell = cell("Baselines", index + 1, 19);
            const setup = (setupCell?.effectiveValue ?? setupCell?.value)
                ?.numberValue;
            if (
                setup === undefined ||
                !Number.isSafeInteger(setup) ||
                setup < 1
            )
                throw new Error(`Invalid current pot setup: ${id}`);
        }
        if (
            cells.some(
                (entry) =>
                    entry.sheet === "Dashboard" &&
                    entry.row >= palette.length + 6 &&
                    entry.column === 1 &&
                    /^P\d+$/v.test(
                        entry.value?.stringValue ??
                            entry.effectiveValue?.stringValue ??
                            ""
                    )
            )
        )
            throw new Error("Unexpected extra Dashboard plant row");
    };
    validateRoster();
    const validateDestination = () => {
        if ((dashboard.basicFilter?.sortSpecs ?? []).length > 0)
            throw new Error(
                "Dashboard filter has active sorting; review before extending"
            );
        if (
            cells.some(
                (entry) =>
                    entry.sheet === "Dashboard" &&
                    entry.column >= 31 &&
                    entry.column < 33 &&
                    ((entry.note ?? "") !== "" ||
                        Object.keys(entry.value ?? {}).length > 0 ||
                        Object.keys(entry.effectiveValue ?? {}).length > 0)
            )
        )
            throw new Error(
                "Dashboard AF:AG is occupied or migration already installed"
            );
        if (
            (dashboard.merges ?? []).some(
                (range) =>
                    (range.startColumnIndex ?? 0) < 33 &&
                    (range.endColumnIndex ?? bounds.columnCount) > 31
            )
        )
            throw new Error("Dashboard AF:AG intersects merged cells");
    };
    validateDestination();
    const validatedScan = () => {
        const scan = cell("Integrity", 11, 1)?.value?.formulaValue;
        if (
            scan?.startsWith("=SUM(") !== true ||
            !scan.endsWith(")") ||
            !scan.includes("Dashboard!A1:T254") ||
            !scan.includes("Dashboard!U1:X1") ||
            !scan.includes("Dashboard!U4:X254") ||
            scan.split("Dashboard!Y1:AE254").length !== 2 ||
            scan.includes("Dashboard!Y1:AG254")
        )
            throw new Error(
                "Unexpected Integrity Dashboard error-scan coverage"
            );
        return scan;
    };
    const scan = validatedScan();
    const dashboardId = dashboard.properties.sheetId;
    const lastRow = palette.length + 6;
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    if (bounds.columnCount < 33)
        requests.push({
            appendDimension: {
                dimension: "COLUMNS",
                length: 33 - bounds.columnCount,
                sheetId: dashboardId,
            },
        });
    requests.push(...restoreDashboardPresentationRequests(dashboard));
    const values = [
        dashboardWeightWindowHeaders,
        ...palette.map((_, index) => {
            const row = index + 7;
            return [
                minimumWeightFormula(row, 5000),
                `=IF(AND(ISNUMBER(G${row}),G${row}>0,ISNUMBER(AF${row}),AF${row}>0),G${row}-AF${row},"")`,
            ];
        }),
    ];
    requests.push({
        updateCells: {
            fields: "userEnteredValue",
            rows: values.map((row) => ({
                values: row.map((value) => ({
                    userEnteredValue: value.startsWith("=")
                        ? { formulaValue: value }
                        : { stringValue: value },
                })),
            })),
            start: { columnIndex: 31, rowIndex: 5, sheetId: dashboardId },
        },
    });
    const blue = { blue: 104 / 255, green: 74 / 255, red: 23 / 255 };
    const light = { blue: 251 / 255, green: 245 / 255, red: 237 / 255 };
    const body = {
        endColumnIndex: 33,
        endRowIndex: lastRow,
        sheetId: dashboardId,
        startColumnIndex: 31,
        startRowIndex: 6,
    };
    requests.push(
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        backgroundColor: light,
                        horizontalAlignment: "CENTER",
                        numberFormat: { pattern: "0.0", type: "NUMBER" },
                        textFormat: {
                            fontFamily: "JetBrains Mono",
                            foregroundColor: blue,
                        },
                        verticalAlignment: "MIDDLE",
                        wrapStrategy: "WRAP",
                    },
                },
                fields: "userEnteredFormat",
                range: body,
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: {
                            pattern: "+0.0;-0.0;0.0",
                            type: "NUMBER",
                        },
                        textFormat: { bold: true },
                    },
                },
                fields: "userEnteredFormat.numberFormat,userEnteredFormat.textFormat.bold",
                range: { ...body, startColumnIndex: 32 },
            },
        }
    );
    for (const [index, note] of notes.entries())
        requests.push({
            repeatCell: {
                cell: {
                    note,
                    userEnteredFormat: {
                        backgroundColor: blue,
                        horizontalAlignment: "CENTER",
                        textFormat: {
                            bold: true,
                            fontFamily: "JetBrains Mono",
                            foregroundColor: { blue: 1, green: 1, red: 1 },
                        },
                        verticalAlignment: "MIDDLE",
                        wrapStrategy: "WRAP",
                    },
                },
                fields: "note,userEnteredFormat",
                range: {
                    endColumnIndex: 32 + index,
                    endRowIndex: 6,
                    sheetId: dashboardId,
                    startColumnIndex: 31 + index,
                    startRowIndex: 5,
                },
            },
        });
    requests.push(
        {
            updateDimensionProperties: {
                fields: "pixelSize,hiddenByUser",
                properties: { hiddenByUser: false, pixelSize: 180 },
                range: {
                    dimension: "COLUMNS",
                    endIndex: 33,
                    sheetId: dashboardId,
                    startIndex: 31,
                },
            },
        },
        {
            updateCells: {
                fields: "userEnteredValue",
                rows: [
                    {
                        values: [
                            {
                                userEnteredValue: {
                                    formulaValue: scan.replace(
                                        "Dashboard!Y1:AE254",
                                        "Dashboard!Y1:AG254"
                                    ),
                                },
                            },
                        ],
                    },
                ],
                start: {
                    columnIndex: 1,
                    rowIndex: 11,
                    sheetId: integrity.properties.sheetId,
                },
            },
        }
    );
    if (dashboard.basicFilter) {
        const range = dashboard.basicFilter.range;
        if (
            range.startRowIndex !== 5 ||
            (range.startColumnIndex ?? 0) !== 0 ||
            range.endRowIndex !== lastRow ||
            range.endColumnIndex !== 31
        )
            throw new Error("Unexpected Dashboard filter bounds");
        requests.push({
            setBasicFilter: {
                filter: {
                    ...dashboard.basicFilter,
                    range: { ...range, endColumnIndex: 33 },
                },
            },
        });
    }
    return {
        plantIds: palette.map(({ id }) => id),
        preconditionDigest: digest(snapshot),
        ranges: [`Dashboard!AF6:AG${lastRow}`, "Integrity!B12"],
        requests,
    };
}

/** @param {number} row @returns {string} */
export function dashboardMinimumWeightFormula(row) {
    return minimumWeightFormula(row, historyLastRow);
}

/** @param {DashboardWeightWindowSnapshot} snapshot */
function digest(snapshot) {
    return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

/** @param {number} row @param {number} lastRow @returns {string} */
function minimumWeightFormula(row, lastRow) {
    const end = palette.length + 1;
    return `=IFNA(LET(setup,XLOOKUP($B${row},Baselines!$A$2:$A$${end},Baselines!$T$2:$T$${end},""),clock,'Workbook calculations'!$E$2,MIN(FILTER(History!$E$2:$E$${lastRow},EXACT(TRIM(History!$B$2:$B$${lastRow}),$B${row}),EXACT(TRIM(History!$C$2:$C$${lastRow}),"Weigh"),History!$K$2:$K$${lastRow}=setup,History!$K$2:$K$${lastRow}<>"",EXACT(TRIM(History!$AJ$2:$AJ$${lastRow}),"Removed")=FALSE,ISNUMBER(History!$E$2:$E$${lastRow}),History!$E$2:$E$${lastRow}>0,ISNUMBER(History!$A$2:$A$${lastRow}),History!$A$2:$A$${lastRow}>0,History!$A$2:$A$${lastRow}>=clock-90,History!$A$2:$A$${lastRow}<=clock,REGEXMATCH(History!$AC$2:$AC$${lastRow}&" "&History!$AI$2:$AI$${lastRow},"(?i)estimat")=FALSE))),"")`;
}

/**
 * Native column append expands ranges and groups ending at the old grid edge.
 * Restore their exact pre-migration boundaries before formatting the new cells.
 * Only independent depth-one groups can be safely deleted/recreated here.
 *
 * @param {WindowSheet} dashboard
 *
 * @returns {Record<string, unknown>[]}
 */
function restoreDashboardPresentationRequests(dashboard) {
    const { columnCount } = dashboard.properties.gridProperties;
    const sheetId = dashboard.properties.sheetId;
    const groups = dashboard.columnGroups ?? [];
    if (
        groups.some(({ range }) => range.startIndex < 33 && range.endIndex > 31)
    )
        throw new Error(
            "Existing Dashboard group overlaps AF:AG; review before extending"
        );
    if (columnCount >= 33) return [];
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    const conditionalFormats = dashboard.conditionalFormats ?? [];
    for (const [index, rule] of conditionalFormats.entries()) {
        if (rule.ranges.some((range) => range.endColumnIndex === columnCount))
            requests.push({
                updateConditionalFormatRule: {
                    index,
                    rule: structuredClone(rule),
                    sheetId,
                },
            });
    }
    const bandedRanges = dashboard.bandedRanges ?? [];
    for (const banding of bandedRanges) {
        if (banding.range.endColumnIndex === columnCount)
            requests.push({
                updateBanding: {
                    bandedRange: {
                        bandedRangeId: banding.bandedRangeId,
                        range: { ...banding.range },
                    },
                    fields: "range",
                },
            });
    }
    for (const group of groups) {
        if (group.range.endIndex !== columnCount) continue;
        if (
            group.depth !== 1 ||
            group.range.dimension !== "COLUMNS" ||
            group.range.sheetId !== sheetId ||
            groups.some(
                (other) =>
                    other !== group &&
                    other.range.startIndex < group.range.endIndex &&
                    other.range.endIndex > group.range.startIndex
            )
        )
            throw new Error(
                "Unsupported nested or overlapping Dashboard column groups"
            );
        requests.push(
            {
                deleteDimensionGroup: {
                    range: { ...group.range, endIndex: 33 },
                },
            },
            { addDimensionGroup: { range: { ...group.range } } },
            {
                updateDimensionGroup: {
                    dimensionGroup: structuredClone(group),
                    fields: "collapsed",
                },
            }
        );
    }
    return requests;
}
