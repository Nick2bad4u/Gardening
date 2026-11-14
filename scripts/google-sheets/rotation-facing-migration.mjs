import { createHash } from "node:crypto";

import { historyLastRow } from "./history-capacity-config.mjs";

const facingHeaders = ["Rotation from facing", "Rotation to facing"];
const bulkHeaders = ["Rotation to facing", "Rotation facing snapshot"];
const viewTitle = "History view";
const font = "JetBrains Mono";
const oldDegreeNote =
    "Clockwise-equivalent rotation recorded in degrees. The logger defaults a Rotation event to 90°.";
const degreeNote =
    "Clockwise-equivalent degrees. Cardinal endpoints determine this value; an unknown origin leaves it blank and matching endpoints record 0. Legacy degree-only entries default to 90°.";

/**
 * @param {{ preconditionDigest: string }} plan
 * @param {import("../../types/rotation-facing-migration.d.ts").RotationFacingSnapshot} fresh
 */
export function assertRotationFacingMigrationPreconditions(plan, fresh) {
    if (plan.preconditionDigest !== digest(fresh))
        throw new Error(
            "Workbook drift since rotation planning; capture and rebuild before writing"
        );
}

/**
 * Repair the existing degree validation on either the pre-migration workbook or
 * a migrated disposable copy. Existing degree values/formats remain untouched.
 *
 * @param {import("../../types/rotation-facing-migration.d.ts").RotationFacingSnapshot} snapshot
 *
 * @returns {import("../../types/rotation-facing-migration.d.ts").RotationDegreeValidationPlan}
 */
export function buildRotationDegreeValidationRequests(snapshot) {
    if (!snapshot.metadataComplete)
        throw new Error(
            "Capture full native metadata, including charts and protections"
        );
    const access = accessors(snapshot);
    const history = access.sheet("History");
    const grid = history.properties.gridProperties;
    if (
        ![67, 69].includes(grid.columnCount) ||
        grid.rowCount !== historyLastRow
    )
        throw new Error(
            "Unexpected History capacity for degree validation repair"
        );
    access.requireRead("History", 0, 39, historyLastRow, 40);
    const header = access.cell("History", 0, 39);
    if (
        header?.value.stringValue !== "Rotation (°)" ||
        header.note !== oldDegreeNote
    )
        throw new Error(
            "History degree header/note drift or repair already installed"
        );
    const cells = snapshot.cells.filter(
        (entry) =>
            entry.sheet === "History" &&
            entry.column === 39 &&
            entry.row >= 1 &&
            entry.row < historyLastRow
    );
    const rule = cells[0]?.dataValidation;
    const capturedRows = new Set(cells.map((entry) => entry.row));
    if (
        cells.length !== historyLastRow - 1 ||
        capturedRows.size !== historyLastRow - 1 ||
        rule?.condition.type !== "NUMBER_BETWEEN" ||
        rule.strict !== true ||
        JSON.stringify(rule.condition.values) !==
            JSON.stringify([
                { userEnteredValue: "1" },
                { userEnteredValue: "360" },
            ]) ||
        cells.some(
            (entry) =>
                JSON.stringify(entry.dataValidation) !== JSON.stringify(rule)
        )
    )
        throw new Error(
            "History degree validation drift, replay, or incomplete capture"
        );
    const range = {
        endColumnIndex: 40,
        endRowIndex: historyLastRow,
        sheetId: history.properties.sheetId,
        startColumnIndex: 39,
        startRowIndex: 1,
    };
    return {
        footprint: [
            "History!AN2:AN50001 validation only",
            "History!AN1 note only",
        ],
        preconditionDigest: digest(snapshot),
        requests: [
            {
                setDataValidation: {
                    range,
                    rule: {
                        ...rule,
                        condition: {
                            ...rule.condition,
                            values: [
                                { userEnteredValue: "0" },
                                { userEnteredValue: "360" },
                            ],
                        },
                    },
                },
            },
            {
                repeatCell: {
                    cell: { note: degreeNote },
                    fields: "note",
                    range: { ...range, endRowIndex: 1, startRowIndex: 0 },
                },
            },
        ],
    };
}

/**
 * Append cardinal-facing fields; retain all existing ledger/staging cells.
 * Callers must back up and rehearse on a native copy, then re-read and assert
 * preconditions immediately before applying prepareRequests and
 * formulaRequests.
 *
 * @param {import("../../types/rotation-facing-migration.d.ts").RotationFacingSnapshot} snapshot
 * @param {import("../../types/rotation-facing-migration.d.ts").RotationFacingSchema} schema
 *
 * @returns {import("../../types/rotation-facing-migration.d.ts").RotationFacingPlan}
 */
export function buildRotationFacingMigrationRequests(snapshot, schema) {
    const access = accessors(snapshot);
    validateSchema(snapshot, schema);
    const history = access.sheet("History");
    const view = access.sheet(viewTitle);
    const integrity = access.sheet("Integrity");
    const oldViewFormula = historyViewFormula(67, "BO");
    if (access.cell(viewTitle, 0, 0)?.value.formulaValue !== oldViewFormula)
        throw new Error("History view formula drift");
    const newViewFormula = historyViewFormula(69, "BQ");
    access.requireRead("Integrity", 11, 1, 12, 2);
    access.requireRead("Integrity", 4, 5, 5, 6);
    const scan = access.cell("Integrity", 11, 1)?.value.formulaValue;
    if (
        scan?.startsWith("=SUM(") !== true ||
        !scan.endsWith(")") ||
        !scan.includes(`History!BI2:BO${historyLastRow}`) ||
        !scan.includes(`'History view'!BI1:BO${historyLastRow}`) ||
        /(?:'History view'|History)!\$?B[PQ]/v.test(scan)
    )
        throw new Error(
            "Integrity error scan drift or rotation already installed"
        );
    const anchor = access.cell("Integrity", 4, 5)?.value.formulaValue;
    const oldAnchor = `N(IFERROR(FORMULATEXT('History view'!A1),"")<>${quoted(oldViewFormula)})`;
    if (
        anchor?.startsWith("=SUM(") !== true ||
        anchor.split(oldAnchor).length !== 2
    )
        throw new Error("Integrity History view formula anchor drift");
    const newAnchor = `N(IFERROR(FORMULATEXT('History view'!A1),"")<>${quoted(newViewFormula)})`;

    const prepareRequests = [
        ...buildRotationDegreeValidationRequests(snapshot).requests,
        ...appendFields(history, 67, facingHeaders, 2),
        ...appendFields(view, 67, [], 0),
        ...appendFields(access.sheet("App entries"), 59, facingHeaders, 2),
        ...appendFields(access.sheet("App bulk"), 77, bulkHeaders, 1),
    ];
    if (history.basicFilter !== undefined) {
        const filter = structuredClone(history.basicFilter);
        if (
            filter.range.sheetId !== history.properties.sheetId ||
            filter.range.endColumnIndex !== 67 ||
            filter.range.endRowIndex !== historyLastRow ||
            !isAtOrigin(filter.range)
        )
            throw new Error("History basic filter drift");
        // Sheets re-sorts canonical rows when sortSpecs are replayed.
        delete filter.sortSpecs;
        prepareRequests.push({
            setBasicFilter: {
                filter: {
                    ...filter,
                    range: { ...filter.range, endColumnIndex: 69 },
                },
            },
        });
    }
    return {
        footprint: [
            "History!AN2:AN50001 validation only",
            "History!AN1 note only",
            "History!BP:BQ",
            "History view!BP:BQ",
            "History view!A1",
            "App entries!BH:BI",
            "App bulk!BZ:CA",
            "Integrity!B12",
            "Integrity!F5",
            "History basic filter range",
        ],
        formulaRequests: [
            write(view.properties.sheetId, 0, 0, [newViewFormula]),
            write(integrity.properties.sheetId, 11, 1, [
                `${scan.slice(0, -1)},SUM(ARRAYFORMULA(N(ISERROR(History!BP2:BQ${historyLastRow})))),SUM(ARRAYFORMULA(N(ISERROR('History view'!BP1:BQ${historyLastRow})))))`,
            ]),
            write(integrity.properties.sheetId, 4, 5, [
                anchor.replace(oldAnchor, () => newAnchor),
            ]),
        ],
        preconditionDigest: digest(snapshot),
        prepareRequests,
    };
}

/** @param {import("../../types/rotation-facing-migration.d.ts").RotationFacingSnapshot} snapshot */
function accessors(snapshot) {
    /** @param {string} name */
    const sheet = (name) => {
        const matches = snapshot.metadata.sheets.filter(
            (entry) => entry.properties.title === name
        );
        if (matches.length !== 1 || !matches[0])
            throw new Error(`Missing or ambiguous sheet: ${name}`);
        return matches[0];
    };
    /** @param {string} name @param {number} row @param {number} column */
    const cell = (name, row, column) => {
        const matches = snapshot.cells.filter(
            (entry) =>
                entry.sheet === name &&
                entry.row === row &&
                entry.column === column
        );
        if (matches.length > 1)
            throw new Error(`Duplicate captured cell: ${name}`);
        return matches[0];
    };
    /**
     * @param {string} name @param {number} startRow @param {number} startColumn
     * @param {number} endRow @param {number} endColumn
     */
    const requireRead = (name, startRow, startColumn, endRow, endColumn) => {
        if (
            snapshot.readRanges.every(
                (range) =>
                    range.sheet !== name ||
                    range.startRow > startRow ||
                    range.startColumn > startColumn ||
                    range.endRow < endRow ||
                    range.endColumn < endColumn
            )
        )
            throw new Error(`Missing complete captured range: ${name}`);
    };
    return { cell, requireRead, sheet };
}

/**
 * @param {import("../../types/rotation-facing-migration.d.ts").RotationFacingSnapshot["metadata"]["sheets"][number]} sheet
 * @param {number} start
 * @param {string[]} headers Empty for the formula-owned History view.
 * @param {number} facingColumns
 *
 * @returns {Record<string, unknown>[]}
 */
function appendFields(sheet, start, headers, facingColumns) {
    const { gridProperties, sheetId } = sheet.properties;
    const range = {
        endColumnIndex: start + 2,
        endRowIndex: gridProperties.rowCount,
        sheetId,
        startColumnIndex: start,
        startRowIndex: 1,
    };
    const headerRange = { ...range, endRowIndex: 1, startRowIndex: 0 };
    /** @type {Record<string, unknown>[]} */
    const requests = [
        { appendDimension: { dimension: "COLUMNS", length: 2, sheetId } },
        {
            copyPaste: {
                destination: headerRange,
                pasteType: "PASTE_FORMAT",
                source: {
                    ...headerRange,
                    endColumnIndex: start,
                    startColumnIndex: start - 1,
                },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: { type: "TEXT" },
                        textFormat: { fontFamily: font },
                        wrapStrategy: "WRAP",
                    },
                },
                fields: "userEnteredFormat.numberFormat,userEnteredFormat.textFormat.fontFamily,userEnteredFormat.wrapStrategy",
                range: { ...range, startRowIndex: 0 },
            },
        },
        // Appended columns inherit the preceding column's validation.
        { setDataValidation: { range: { ...range, startRowIndex: 0 } } },
    ];
    if (headers.length > 0) requests.push(write(sheetId, 0, start, headers));
    if (facingColumns > 0)
        requests.push({
            setDataValidation: {
                range: { ...range, endColumnIndex: start + facingColumns },
                rule: {
                    condition: {
                        type: "ONE_OF_LIST",
                        values: [
                            "N",
                            "E",
                            "S",
                            "W",
                        ].map((userEnteredValue) => ({ userEnteredValue })),
                    },
                    showCustomUi: true,
                    strict: true,
                },
            },
        });
    if (sheet.properties.title === "App bulk")
        requests.push({
            repeatCell: {
                cell: {
                    note: "Bridge-owned JSON snapshot of per-plant rotation facing; read-only and hidden in AppSheet. Do not edit.",
                },
                fields: "note",
                range: { ...headerRange, startColumnIndex: start + 1 },
            },
        });
    return requests;
}

/**
 * @param {import("../../types/rotation-facing-migration.d.ts").RotationFacingSnapshot["cells"][number]
 *     | undefined} captured
 * @param {string} name
 */
function capturedHeader(captured, name) {
    return name === viewTitle
        ? captured?.effectiveValue?.stringValue
        : captured?.value.stringValue;
}

/** @param {import("../../types/rotation-facing-migration.d.ts").RotationFacingSnapshot} snapshot */
function digest(snapshot) {
    return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

/** @param {number} width @param {string} lastColumn */
function historyViewFormula(width, lastColumn) {
    return `=LET(rows,SORT(FILTER(History!A2:${lastColumn}${historyLastRow},History!A2:A${historyLastRow}<>""),1,FALSE,10,FALSE),fmt,LAMBDA(d,IF(d="","",IF(MOD(d,1)=0,TEXT(d,"M/d/yyyy"),TEXT(d,"M/d/yyyy h:mm AM/PM")))),VSTACK(History!A1:${lastColumn}1,HSTACK(MAP(CHOOSECOLS(rows,1),fmt),CHOOSECOLS(rows,SEQUENCE(1,${width - 1},2,1)))))`;
}

/** @param {import("../../test/workbook-fixtures.d.ts").GridRange} range */
function isAtOrigin(range) {
    return (
        (range.startColumnIndex ?? 0) === 0 && (range.startRowIndex ?? 0) === 0
    );
}

/** @param {string} value */
function quoted(value) {
    return `"${value.replaceAll('"', '""')}"`;
}

/**
 * @param {import("../../types/rotation-facing-migration.d.ts").RotationFacingSnapshot} snapshot
 * @param {import("../../types/rotation-facing-migration.d.ts").RotationFacingSchema} schema
 */
function validateSchema(snapshot, schema) {
    if (!snapshot.metadataComplete)
        throw new Error(
            "Capture full native metadata, including charts and protections"
        );
    if (
        schema.history.length !== 69 ||
        schema.entries.length !== 61 ||
        schema.bulk.length !== 79 ||
        JSON.stringify(schema.history.slice(67)) !==
            JSON.stringify(facingHeaders) ||
        JSON.stringify(schema.entries.slice(59)) !==
            JSON.stringify(facingHeaders) ||
        JSON.stringify(schema.bulk.slice(77)) !== JSON.stringify(bulkHeaders)
    )
        throw new Error("Expected the maintained append-only rotation schema");
    const { cell, requireRead, sheet } = accessors(snapshot);
    for (const [
        name,
        width,
        headers,
    ] of /** @type {[string, number, string[]][]} */ ([
        [
            "History",
            67,
            schema.history,
        ],
        [
            viewTitle,
            67,
            schema.history,
        ],
        [
            "App entries",
            59,
            schema.entries,
        ],
        [
            "App bulk",
            77,
            schema.bulk,
        ],
    ])) {
        const grid = sheet(name).properties.gridProperties;
        if (
            grid.columnCount !== width ||
            !Number.isSafeInteger(grid.rowCount) ||
            grid.rowCount < 2
        )
            throw new Error(
                `${name} schema drift or migration already installed`
            );
        if (
            (name === "History" || name === viewTitle) &&
            grid.rowCount !== historyLastRow
        )
            throw new Error("Unexpected History/view capacity");
        requireRead(name, 0, 0, 1, width);
        for (let column = 0; column < width; column += 1) {
            const header = capturedHeader(cell(name, 0, column), name);
            if (header !== headers[column])
                throw new Error(`${name} header drift at column ${column + 1}`);
        }
        // A wider physical grid is rejected above, even if appended cells look
        // empty. Out-of-grid capture coordinates are likewise never trusted.
        if (
            snapshot.cells.some(
                (entry) => entry.sheet === name && entry.column >= width
            )
        )
            throw new Error(
                `${name} occupied destination or inconsistent capture`
            );
    }
}

/**
 * @param {number} sheetId @param {number} rowIndex @param {number} columnIndex
 * @param {string[]} values
 */
function write(sheetId, rowIndex, columnIndex, values) {
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: [
                {
                    values: values.map((value) => ({
                        userEnteredValue: value.startsWith("=")
                            ? { formulaValue: value }
                            : { stringValue: value },
                    })),
                },
            ],
            start: { columnIndex, rowIndex, sheetId },
        },
    };
}
