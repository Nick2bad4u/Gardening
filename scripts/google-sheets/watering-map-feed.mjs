import { createHash } from "node:crypto";

import { historyLastRow } from "./history-capacity-config.mjs";

export const wateringMapFeedSheetId = 907_202_615;
export const wateringMapFeedTitle = "Watering map";
export const wateringMapFeedRowCount = historyLastRow + 2;
export const wateringMapFeedColumnCount = 12;
export const wateringMapFeedDateFormat = 'yyyy-mm-dd"T"hh:mm:ss.000';
const cellBudget = 20_000_000;
const sourceHeaders = new Map([
    [0, "Date"],
    [1, "Plant ID"],
    [2, "Event"],
    [10, "Pot setup"],
    [16, "Nutrients used"],
    [26, "Observation ID"],
    [30, "Corrects observation ID"],
    [35, "Record status"],
    [49, "New location"],
]);

/**
 * Re-read the same native metadata and header cells immediately before the
 * batch. A matching digest does not make the preceding read and Sheets write
 * atomic.
 *
 * @param {{ preconditionDigest: string }} plan
 * @param {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} fresh
 */
export function assertWateringMapFeedPreconditions(plan, fresh) {
    if (plan.preconditionDigest !== digest(fresh))
        throw new Error(
            "Workbook drift since watering-map planning; capture and review again"
        );
}

/**
 * Build a one-time, add-only helper installation. Supply the complete
 * maintained 67-column server schema and freshly captured native metadata plus
 * History's header cells. Rehearse on a native copy before production. This
 * does not change publication settings, canonical observations, staging, or any
 * existing sheet.
 *
 * @param {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} snapshot
 * @param {readonly string[]} historyHeaders Full schema from the maintained
 *   server.
 *
 * @returns {import("../../types/watering-map-feed.d.ts").WateringMapFeedPlan}
 */
export function buildWateringMapFeedRequests(snapshot, historyHeaders) {
    const allocatedCellsBefore = validateSnapshot(
        snapshot,
        historyHeaders,
        wateringMapFeedRowCount * wateringMapFeedColumnCount
    );
    if (
        snapshot.metadata.sheets.some(
            ({ properties }) =>
                properties.sheetId === wateringMapFeedSheetId ||
                properties.title === wateringMapFeedTitle
        )
    )
        throw new Error(
            "Watering map helper destination already exists; never replay this migration"
        );
    const sheetId = wateringMapFeedSheetId;
    const range = {
        endColumnIndex: wateringMapFeedColumnCount,
        endRowIndex: wateringMapFeedRowCount,
        sheetId,
        startColumnIndex: 0,
        startRowIndex: 0,
    };
    const requests = [
        {
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount: wateringMapFeedColumnCount,
                        frozenRowCount: 2,
                        hideGridlines: true,
                        rowCount: wateringMapFeedRowCount,
                    },
                    hidden: true,
                    index: snapshot.metadata.sheets.length,
                    sheetId,
                    title: wateringMapFeedTitle,
                },
            },
        },
        {
            updateCells: {
                fields: "userEnteredValue,note",
                rows: [
                    {
                        values: [
                            {
                                note: "Read-only Water/Move projection of canonical History. The website validates the Ready/End envelope and record count. Publication may lag recent saves; this formula does not establish an observation or refresh timestamp.",
                                userEnteredValue: {
                                    formulaValue: wateringMapFeedFormula(),
                                },
                            },
                        ],
                    },
                ],
                start: { columnIndex: 0, rowIndex: 0, sheetId },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        textFormat: {
                            fontFamily: "JetBrains Mono",
                            fontSize: 10,
                        },
                        verticalAlignment: "MIDDLE",
                        wrapStrategy: "CLIP",
                    },
                },
                fields: "userEnteredFormat.textFormat,userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy",
                range,
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        backgroundColor: { blue: 0.17, green: 0.24, red: 0.09 },
                        textFormat: {
                            bold: true,
                            foregroundColor: { blue: 1, green: 1, red: 1 },
                        },
                        wrapStrategy: "WRAP",
                    },
                },
                fields: "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.foregroundColor,userEnteredFormat.wrapStrategy",
                range: { ...range, endRowIndex: 2 },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: {
                            pattern: wateringMapFeedDateFormat,
                            type: "DATE_TIME",
                        },
                    },
                },
                fields: "userEnteredFormat.numberFormat",
                range: { ...range, endColumnIndex: 1, startRowIndex: 2 },
            },
        },
        {
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 165 },
                range: {
                    dimension: "COLUMNS",
                    endIndex: wateringMapFeedColumnCount,
                    sheetId,
                    startIndex: 0,
                },
            },
        },
        {
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 255 },
                range: {
                    dimension: "COLUMNS",
                    endIndex: 1,
                    sheetId,
                    startIndex: 0,
                },
            },
        },
        {
            addProtectedRange: {
                protectedRange: {
                    description: "Read-only watering map projection",
                    range: { sheetId },
                    warningOnly: true,
                },
            },
        },
    ];
    return {
        allocatedCellsAfter:
            allocatedCellsBefore +
            wateringMapFeedRowCount * wateringMapFeedColumnCount,
        allocatedCellsBefore,
        footprint: ["New Watering map helper only"],
        preconditionDigest: digest(snapshot),
        requests,
        sheetId,
    };
}

/**
 * Upgrade only the installed v1 helper. Capture complete metadata, History's
 * headers, and user-entered values across the entire existing helper grid.
 * Computed spill values are not occupied cells. Rehearse on a native copy, then
 * re-read and assert the precondition digest immediately before writing.
 *
 * @param {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} snapshot
 * @param {readonly string[]} historyHeaders
 *
 * @returns {import("../../types/watering-map-feed.d.ts").WateringMapFeedPlan}
 */
export function buildWateringMapFeedUpgradeRequests(snapshot, historyHeaders) {
    const addedColumns = wateringMapFeedColumnCount - 8;
    const addedCells = wateringMapFeedRowCount * addedColumns;
    const allocatedCellsBefore = validateSnapshot(
        snapshot,
        historyHeaders,
        addedCells
    );
    validateInstalledFeed(snapshot);
    const sheetId = wateringMapFeedSheetId;
    const newColumns = {
        endColumnIndex: wateringMapFeedColumnCount,
        endRowIndex: wateringMapFeedRowCount,
        sheetId,
        startColumnIndex: 8,
        startRowIndex: 0,
    };
    return {
        allocatedCellsAfter: allocatedCellsBefore + addedCells,
        allocatedCellsBefore,
        footprint: [
            "Watering map A1 formula/note and appended I:L columns only",
        ],
        preconditionDigest: digest(snapshot),
        requests: [
            {
                appendDimension: {
                    dimension: "COLUMNS",
                    length: addedColumns,
                    sheetId,
                },
            },
            {
                updateCells: {
                    fields: "userEnteredValue,note",
                    rows: [
                        {
                            values: [
                                {
                                    note: "Read-only Water/Move projection of canonical History, including fertilizer status and correction lineage. The website validates the Ready/End envelope and record count. Publication may lag recent saves; this formula does not establish an observation or refresh timestamp.",
                                    userEnteredValue: {
                                        formulaValue: wateringMapFeedFormula(),
                                    },
                                },
                            ],
                        },
                    ],
                    start: { columnIndex: 0, rowIndex: 0, sheetId },
                },
            },
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            textFormat: {
                                fontFamily: "JetBrains Mono",
                                fontSize: 10,
                            },
                            verticalAlignment: "MIDDLE",
                            wrapStrategy: "CLIP",
                        },
                    },
                    fields: "userEnteredFormat.textFormat,userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy,dataValidation",
                    range: newColumns,
                },
            },
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            backgroundColor: {
                                blue: 0.17,
                                green: 0.24,
                                red: 0.09,
                            },
                            textFormat: {
                                bold: true,
                                foregroundColor: { blue: 1, green: 1, red: 1 },
                            },
                            wrapStrategy: "WRAP",
                        },
                    },
                    fields: "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.foregroundColor,userEnteredFormat.wrapStrategy",
                    range: { ...newColumns, endRowIndex: 2 },
                },
            },
            {
                updateDimensionProperties: {
                    fields: "pixelSize",
                    properties: { pixelSize: 165 },
                    range: {
                        dimension: "COLUMNS",
                        endIndex: wateringMapFeedColumnCount,
                        sheetId,
                        startIndex: 8,
                    },
                },
            },
        ],
        sheetId,
    };
}

/**
 * One atomic spill includes a versioned envelope and terminal count marker.
 * Keep all Water/Move records in native order; consumers apply removed/future
 * rules. A source error must propagate instead of becoming an empty success.
 * The bound Apps Script mirrors this formula and is checked for exact parity.
 *
 * @returns {string}
 */
export function wateringMapFeedFormula() {
    const end = historyLastRow;
    const source = `{History!A2:C${end},History!AJ2:AJ${end},History!AX2:AX${end},History!Q2:Q${end},History!K2:K${end},History!AA2:AA${end},History!AE2:AE${end}}`;
    const headers =
        '{"Date","Plant ID","Event","Record status","New location","Nutrients used","Pot setup","Observation ID","Corrects observation ID","Feed version","Feed status","Record count"}';
    const ready = '{"","","","","","","","","",2,"Ready",recordCount}';
    const footer = '{"","","","","","","","","",2,"End",recordCount}';
    return `=LET(wanted,ARRAYFORMULA(REGEXMATCH(LOWER(TRIM(History!C2:C${end})),"^(water|move)$")),recordCount,SUM(ARRAYFORMULA(N(wanted))),records,IF(recordCount>0,FILTER(${source},wanted),{"","","","","","","","",""}),invalid,SUM(ARRAYFORMULA(N(ISERROR(records)))),IF(invalid>0,NA(),IF(recordCount>0,{${headers};${ready};records,ARRAYFORMULA(IF(SEQUENCE(MAX(1,recordCount),3)>0,"",""));${footer}},{${headers};${ready};${footer}})))`;
}

/** Exact installed version-1 formula, retained only as an upgrade precondition. */
export function wateringMapFeedV1Formula() {
    const end = historyLastRow;
    const source = `{History!A2:C${end},History!AJ2:AJ${end},History!AX2:AX${end}}`;
    const headers =
        '{"Date","Plant ID","Event","Record status","New location","Feed version","Feed status","Record count"}';
    const ready = '{"","","","","",1,"Ready",recordCount}';
    const footer = '{"","","","","",1,"End",recordCount}';
    return `=LET(wanted,ARRAYFORMULA(REGEXMATCH(LOWER(TRIM(History!C2:C${end})),"^(water|move)$")),recordCount,SUM(ARRAYFORMULA(N(wanted))),records,IF(recordCount>0,FILTER(${source},wanted),{"","","","",""}),invalid,SUM(ARRAYFORMULA(N(ISERROR(records)))),IF(invalid>0,NA(),IF(recordCount>0,{${headers};${ready};records,ARRAYFORMULA(IF(SEQUENCE(MAX(1,recordCount),3)>0,"",""));${footer}},{${headers};${ready};${footer}})))`;
}

/**
 * Object property insertion order is not part of native metadata semantics.
 *
 * @param {string} _key
 * @param {unknown} value
 *
 * @returns {unknown}
 */
function canonicalObjectKeys(_key, value) {
    if (value === null || typeof value !== "object" || Array.isArray(value))
        return value;
    return Object.fromEntries(
        Object.entries(value).toSorted(([left], [right]) =>
            left.localeCompare(right)
        )
    );
}

/** @param {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} snapshot */
function digest(snapshot) {
    // Sheets may return protections in a different order on consecutive reads.
    // Their IDs identify independent protections; all other array order remains
    // significant, including sheet positions and chart specifications.
    const normalized = {
        ...snapshot,
        metadata: {
            ...snapshot.metadata,
            sheets: snapshot.metadata.sheets.map((sheet) => ({
                ...sheet,
                ...(sheet.protectedRanges && {
                    protectedRanges: sheet.protectedRanges.toSorted(
                        (left, right) =>
                            left.protectedRangeId - right.protectedRangeId
                    ),
                }),
            })),
        },
    };
    return createHash("sha256")
        .update(JSON.stringify(normalized, canonicalObjectKeys))
        .digest("hex");
}

/**
 * @param {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} snapshot
 *
 * @returns {number}
 */
function validateAllocation(snapshot) {
    const sheets = snapshot.metadata.sheets;
    if (sheets.length === 0) throw new Error("Native sheet metadata is empty");
    const ids = new Set();
    const titles = new Set();
    const indices = new Set();
    let allocated = 0;
    for (const { properties } of sheets) {
        const { gridProperties, index, sheetId, title } = properties;
        validateSheetProperties(properties, sheets.length);
        if (ids.has(sheetId) || titles.has(title) || indices.has(index))
            throw new Error("Incomplete or ambiguous native sheet metadata");
        ids.add(sheetId);
        titles.add(title);
        indices.add(index);
        allocated += gridProperties.rowCount * gridProperties.columnCount;
    }
    return allocated;
}

/**
 * @param {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} snapshot
 * @param {readonly string[]} historyHeaders
 */
function validateHistory(snapshot, historyHeaders) {
    const history = snapshot.metadata.sheets.find(
        (sheet) => sheet.properties.title === "History"
    );
    const uniqueHeaders = new Set(historyHeaders);
    if (
        history?.properties.gridProperties.columnCount !== 67 ||
        history.properties.gridProperties.rowCount < historyLastRow ||
        historyHeaders.length !== 67 ||
        uniqueHeaders.size !== 67 ||
        historyHeaders.some(
            (header) => typeof header !== "string" || !header.trim()
        )
    )
        throw new Error(
            "Expected the maintained 67-column History schema and 50,000 observation slots"
        );
    for (const [column, expected] of sourceHeaders) {
        if (historyHeaders[column] !== expected)
            throw new Error(
                "Maintained History projection columns do not match the feed contract"
            );
    }
    if (
        snapshot.readRanges.every(
            (range) =>
                range.sheet !== "History" ||
                range.startRow !== 0 ||
                range.endRow < 1 ||
                range.startColumn !== 0 ||
                range.endColumn < 67
        )
    )
        throw new Error(
            "Capture the entire native History header before planning"
        );
    for (const [column, header] of historyHeaders.entries()) {
        const matches = snapshot.cells.filter(
            (cell) =>
                cell.sheet === "History" &&
                cell.row === 0 &&
                cell.column === column
        );
        if (
            matches.length !== 1 ||
            matches[0]?.value.stringValue !== header ||
            Object.keys(matches[0].value).length !== 1
        )
            throw new Error(
                `History header drift or missing capture at column ${column + 1}`
            );
    }
}

/** @param {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} snapshot */
function validateInstalledFeed(snapshot) {
    const helper = snapshot.metadata.sheets.find(
        ({ properties }) => properties.sheetId === wateringMapFeedSheetId
    );
    if (
        helper?.properties.title !== wateringMapFeedTitle ||
        helper.properties.hidden !== true ||
        helper.properties.gridProperties.columnCount !== 8 ||
        helper.properties.gridProperties.rowCount !== wateringMapFeedRowCount
    )
        throw new Error(
            "Expected the hidden 50,003 by 8 version-1 Watering map; reject replay or ownership drift"
        );
    if (
        helper.protectedRanges?.some(
            (protection) =>
                protection.warningOnly === true &&
                Number.isSafeInteger(protection.protectedRangeId) &&
                protection.range.sheetId === wateringMapFeedSheetId &&
                Object.keys(protection.range).length === 1 &&
                (protection.unprotectedRanges?.length ?? 0) === 0
        ) !== true
    )
        throw new Error(
            "Watering map requires its whole-sheet warning protection"
        );
    if (
        snapshot.readRanges.every(
            (range) =>
                range.sheet !== wateringMapFeedTitle ||
                range.startRow !== 0 ||
                range.endRow !== wateringMapFeedRowCount ||
                range.startColumn !== 0 ||
                range.endColumn !== 8
        )
    )
        throw new Error(
            "Capture all Watering map user-entered values before upgrade"
        );
    validateInstalledFeedCells(snapshot);
}

/** @param {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} snapshot */
function validateInstalledFeedCells(snapshot) {
    const cells = snapshot.cells.filter(
        (cell) => cell.sheet === wateringMapFeedTitle
    );
    const seen = new Set();
    let hasAnchor = false;
    for (const cell of cells) {
        const key = `${cell.row}:${cell.column}`;
        if (
            seen.has(key) ||
            !Number.isSafeInteger(cell.row) ||
            cell.row < 0 ||
            cell.row >= wateringMapFeedRowCount ||
            !Number.isSafeInteger(cell.column) ||
            cell.column < 0 ||
            cell.column >= 8
        )
            throw new Error("Ambiguous Watering map user-entered cell capture");
        seen.add(key);
        if (cell.row === 0 && cell.column === 0) {
            hasAnchor =
                Object.keys(cell.value).length === 1 &&
                cell.value.formulaValue === wateringMapFeedV1Formula();
            if (!hasAnchor)
                throw new Error(
                    "Watering map A1 must contain the exact version-1 formula; reject replay or formula drift"
                );
            continue;
        }
        if (Object.keys(cell.value).length > 0) {
            throw new Error(
                "Watering map contains occupied user-entered cells outside A1"
            );
        }
    }
    if (!hasAnchor)
        throw new Error("Missing Watering map version-1 A1 formula capture");
}

/**
 * @param {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot["metadata"]["sheets"][number]["properties"]} properties
 * @param {number} sheetCount
 */
function validateSheetProperties(properties, sheetCount) {
    const { gridProperties, index, sheetId, sheetType, title } = properties;
    if (
        !title ||
        !Number.isSafeInteger(sheetId) ||
        sheetId < 0 ||
        !Number.isSafeInteger(index) ||
        index < 0 ||
        index >= sheetCount ||
        (sheetType !== undefined && sheetType !== "GRID") ||
        !Number.isSafeInteger(gridProperties.rowCount) ||
        gridProperties.rowCount < 1 ||
        !Number.isSafeInteger(gridProperties.columnCount) ||
        gridProperties.columnCount < 1
    )
        throw new Error("Incomplete or ambiguous native sheet metadata");
}

/**
 * @param {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} snapshot
 * @param {readonly string[]} historyHeaders
 * @param {number} addedCells
 *
 * @returns {number}
 */
function validateSnapshot(snapshot, historyHeaders, addedCells) {
    if (
        !snapshot.metadataComplete ||
        !snapshot.metadata.spreadsheetId ||
        snapshot.metadata.properties.timeZone !== "America/New_York"
    )
        throw new Error(
            "Complete native metadata and the garden timezone are required"
        );
    const allocated = validateAllocation(snapshot);
    if (!Number.isSafeInteger(allocated) || allocated + addedCells > cellBudget)
        throw new Error("Watering map would exceed the workbook cell budget");
    validateHistory(snapshot, historyHeaders);
    return allocated;
}
