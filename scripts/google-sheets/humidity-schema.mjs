import { isDeepStrictEqual } from "node:util";

import { isRecord } from "../build-data.mjs";
import { inventorySnapshotDigest } from "./inventory-expansion.mjs";

/** @typedef {import("./inventory-expansion.mjs").NativeSnapshot} Snapshot */
/** @typedef {import("./inventory-expansion.mjs").Sheet} Sheet */

export const humidityHeader = "Relative humidity (%)";

/**
 * Extend the reviewed History method validation without replacing its other
 * options or flags. Also usable as a guarded repair after humidity columns have
 * already been appended.
 *
 * @param {Sheet} sheet
 */
export function buildHumidityMethodValidationRequest(sheet) {
    if (
        sheet.properties.title !== "History" ||
        sheet.properties.gridProperties.rowCount !== 5000
    )
        throw new Error("Expected complete History method validation");
    const cells = completeCells(sheet);
    if (
        cells.find(({ column, row }) => row === 0 && column === 34)?.cell
            .userEnteredValue?.stringValue !== "Measurement method"
    )
        throw new Error("History measurement method header changed");
    const methods = cells.filter(({ column, row }) => row > 0 && column === 34);
    const rule = methods[0]?.cell.dataValidation;
    const values = [
        "Scale",
        "Ruler",
        "Estimated from photo",
        "Estimated visually",
        "Observed",
        "Other",
        "Unspecified",
    ].map((userEnteredValue) => ({ userEnteredValue }));
    if (
        methods.length !== 4999 ||
        !isRecord(rule) ||
        rule["strict"] !== true ||
        !isRecord(rule["condition"]) ||
        rule["condition"]["type"] !== "ONE_OF_LIST" ||
        !isDeepStrictEqual(rule["condition"]["values"], values) ||
        methods.some(
            ({ cell }) => !isDeepStrictEqual(cell.dataValidation, rule)
        )
    )
        throw new Error("History measurement method validation changed");
    return {
        setDataValidation: {
            range: {
                endColumnIndex: 35,
                endRowIndex: 5000,
                sheetId: sheet.properties.sheetId,
                startColumnIndex: 34,
                startRowIndex: 1,
            },
            rule: {
                ...structuredClone(rule),
                condition: {
                    ...structuredClone(rule["condition"]),
                    values: [...values, { userEnteredValue: "Hygrometer" }],
                },
            },
        },
    };
}

/**
 * Plan the append-only 42-to-43 History / 34-to-35 intake transition. Capture
 * full grid rows for History, History view, and App entries, including values,
 * formulas, validations, formats, and native metadata. Supply the old exact
 * headers from the reviewed source contract. This does not run installers.
 * Rehearse on a copy, then verify the fresh snapshot immediately before
 * applying.
 *
 * @param {Snapshot} snapshot
 * @param {{
 *     historyHeaders: readonly string[];
 *     entryHeaders: readonly string[];
 * }} schema
 */
export function buildHumiditySchemaRequests(snapshot, schema) {
    if (
        schema.historyHeaders.length !== 42 ||
        schema.entryHeaders.length !== 34
    )
        throw new Error("Expected the reviewed legacy humidity schema");
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    for (const [
        title,
        headers,
        width,
    ] of /** @type {[string, readonly string[] | null, number][]} */ ([
        [
            "History",
            schema.historyHeaders,
            42,
        ],
        [
            "History view",
            null,
            42,
        ],
        [
            "App entries",
            schema.entryHeaders,
            34,
        ],
    ])) {
        const sheet = validateSheet(snapshot, title, headers, width);
        const { columnCount, rowCount } = sheet.properties.gridProperties;
        const sheetId = sheet.properties.sheetId;
        if (title === "History")
            requests.push(buildHumidityMethodValidationRequest(sheet));
        if (columnCount === width)
            requests.push({
                appendDimension: { dimension: "COLUMNS", length: 1, sheetId },
            });
        const range = {
            endColumnIndex: width + 1,
            endRowIndex: rowCount,
            sheetId,
            startColumnIndex: width,
            startRowIndex: 0,
        };
        requests.push(
            ...decorationRequests(sheet, width),
            {
                copyPaste: {
                    destination: range,
                    pasteType: "PASTE_FORMAT",
                    source: {
                        ...range,
                        endColumnIndex: width,
                        startColumnIndex: width - 1,
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
                                    userEnteredValue: headers
                                        ? { stringValue: humidityHeader }
                                        : { formulaValue: viewFormula(43) },
                                },
                            ],
                        },
                    ],
                    start: {
                        columnIndex: headers ? width : 0,
                        rowIndex: 0,
                        sheetId,
                    },
                },
            },
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            numberFormat: { pattern: "0.##", type: "NUMBER" },
                        },
                    },
                    fields: "userEnteredFormat.numberFormat",
                    range: { ...range, startRowIndex: 1 },
                },
            }
        );
        if (headers)
            requests.push({
                setDataValidation: {
                    range: { ...range, startRowIndex: 1 },
                    rule: {
                        condition: {
                            type: "NUMBER_BETWEEN",
                            values: [
                                { userEnteredValue: "0" },
                                { userEnteredValue: "100" },
                            ],
                        },
                        strict: true,
                    },
                },
            });
    }
    return {
        requests,
        schema,
        sourceDigest: inventorySnapshotDigest(snapshot),
    };
}

/**
 * @param {ReturnType<typeof buildHumiditySchemaRequests>} plan @param
 *   {Snapshot} snapshot
 */
export function verifyHumiditySchemaPreconditions(plan, snapshot) {
    if (inventorySnapshotDigest(snapshot) !== plan.sourceDigest)
        throw new Error("Humidity schema snapshot changed; rebuild the plan");
    buildHumiditySchemaRequests(snapshot, plan.schema);
    return true;
}

/** @param {Sheet} sheet */
function completeCells(sheet) {
    if (sheet.data === undefined)
        throw new Error(
            `Missing complete schema rows: ${sheet.properties.title}`
        );
    /**
     * @type {{
     *     row: number;
     *     column: number;
     *     cell: import("./inventory-expansion.mjs").Cell;
     * }[]}
     */
    const result = [];
    const seen = new Set();
    for (const block of sheet.data) {
        if ((block.startColumn ?? 0) !== 0)
            throw new Error(
                `Expected full-width schema rows: ${sheet.properties.title}`
            );
        const rowEntries = (block.rowData ?? []).entries();
        for (const [index, row] of rowEntries) {
            const rowIndex = (block.startRow ?? 0) + index;
            if (seen.has(rowIndex))
                throw new Error("Overlapping schema capture");
            seen.add(rowIndex);
            const cells = (row.values ?? []).entries();
            for (const [column, cell] of cells)
                result.push({ cell, column, row: rowIndex });
        }
    }
    if (
        seen.size !== sheet.properties.gridProperties.rowCount ||
        !seen.has(0) ||
        !seen.has(sheet.properties.gridProperties.rowCount - 1)
    )
        throw new Error(
            `Missing complete schema rows: ${sheet.properties.title}`
        );
    return result;
}

/** @param {Sheet} sheet @param {number} width */
function decorationRequests(sheet, width) {
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    // Reapplying a filter with sortSpecs sorts existing rows immediately.
    // Preserve filters on canonical and staging sheets, including their bounds.
    const bands = sheet["bandedRanges"];
    if (!Array.isArray(bands)) return requests;
    for (const band of bands) {
        if (
            !isRecord(band) ||
            !isRecord(band["range"]) ||
            band["range"]["endColumnIndex"] !== width
        )
            continue;
        requests.push({
            updateBanding: {
                bandedRange: {
                    ...structuredClone(band),
                    range: { ...band["range"], endColumnIndex: width + 1 },
                },
                fields: "range",
            },
        });
    }
    return requests;
}

/**
 * @param {Snapshot} snapshot @param {string} title @param {readonly string[] |
 *   null} headers @param {number} width
 */
function validateSheet(snapshot, title, headers, width) {
    const matches = snapshot.sheets.filter(
        (sheet) => sheet.properties.title === title
    );
    const sheet = matches[0];
    if (!sheet || matches.length !== 1)
        throw new Error(`Missing unique schema snapshot: ${title}`);
    const { columnCount, rowCount } = sheet.properties.gridProperties;
    if (
        ![width, width + 1].includes(columnCount) ||
        rowCount < 2 ||
        (title === "History" && rowCount !== 5000)
    )
        throw new Error(`Unexpected schema capacity: ${title}`);
    const cells = completeCells(sheet);
    if (
        cells.some(
            ({ cell, column }) =>
                column >= width &&
                (cell.userEnteredValue !== undefined ||
                    cell.effectiveValue !== undefined)
        )
    )
        throw new Error(
            `Humidity destination occupied or migration already installed: ${title}`
        );
    const header = cells.filter(({ row }) => row === 0);
    if (
        headers?.some(
            (value, column) =>
                header.find((entry) => entry.column === column)?.cell
                    .userEnteredValue?.stringValue !== value
        ) === true
    )
        throw new Error(`Legacy headers changed: ${title}`);
    if (
        headers === null &&
        header.find(({ column }) => column === 0)?.cell.userEnteredValue
            ?.formulaValue !== viewFormula(42)
    )
        throw new Error("History view formula changed");
    return sheet;
}

/** @param {number} columns */
function viewFormula(columns) {
    const end = columns === 42 ? "AP" : "AQ";
    return `=LET(rows,SORT(FILTER(History!A2:${end}5000,History!A2:A5000<>""),1,FALSE,10,FALSE),fmt,LAMBDA(d,IF(d="","",IF(MOD(d,1)=0,TEXT(d,"M/d/yyyy"),TEXT(d,"M/d/yyyy h:mm AM/PM")))),VSTACK(History!A1:${end}1,HSTACK(MAP(CHOOSECOLS(rows,1),fmt),CHOOSECOLS(rows,SEQUENCE(1,${columns - 1},2,1)))))`;
}
