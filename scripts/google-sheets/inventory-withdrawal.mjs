import { createHash } from "node:crypto";

import { isRecord } from "../build-data.mjs";

/** @typedef {import("./inventory-expansion.mjs").NativeSnapshot} Snapshot */
/** @typedef {import("./inventory-expansion.mjs").Sheet} Sheet */
/** @typedef {import("./inventory-expansion.mjs").Cell} Cell */
/** @typedef {Record<string, unknown>} Request */

const colorDataTitle = "Plant color data";
const analyticsTitle = "Workbook analytics";
const withdrawn = new Set(["P31", "P32"]);
const removedPages = new Set([202_609_310, 202_609_320]);
const immutable = new Set([
    "App bulk",
    "App entries",
    "History",
    "History view",
    "RO refills",
]);
const inventorySheets = new Set([
    analyticsTitle,
    "Baselines",
    colorDataTitle,
    "Dry-down insights",
    "Dry-down models",
    "Insights data",
    "Plant tracker",
    "Workbook calculations",
]);
/** Exact former inventory tails; no row or column dimensions are removed. */
const tails = [
    [
        "Plant tracker",
        31,
        33,
        0,
        36,
    ],
    [
        "Baselines",
        31,
        33,
        0,
        36,
    ],
    [
        "Dashboard",
        36,
        38,
        0,
        31,
    ],
    [
        "Quick log",
        34,
        36,
        0,
        15,
    ],
    [
        "Plant colors",
        34,
        36,
        0,
        6,
    ],
    [
        "Watering calendar",
        34,
        36,
        0,
        57,
    ],
    [
        "Workbook calculations",
        31,
        33,
        0,
        3,
    ],
    [
        analyticsTitle,
        31,
        33,
        5,
        8,
    ],
    [
        "Insights data",
        31,
        33,
        15,
        30,
    ],
    [
        "Dry-down insights",
        31,
        33,
        0,
        24,
    ],
    [
        "Integrity",
        53,
        55,
        0,
        10,
    ],
    [
        colorDataTitle,
        31,
        33,
        127,
        133,
    ],
    [
        colorDataTitle,
        0,
        5001,
        133,
        141,
    ],
    [
        analyticsTitle,
        0,
        5001,
        100,
        106,
    ],
    [
        "Watering intervals",
        0,
        5000,
        90,
        96,
    ],
];

/**
 * Build a withdrawal from fresh, complete native metadata and bounded
 * snapshots. The returned requests never mutate canonical/staging values or
 * dimensions.
 *
 * @param {Snapshot} metadata @param {Snapshot[]} snapshots
 */
export function buildInventoryWithdrawal(metadata, snapshots) {
    const sheets = mergeSheets(snapshots);
    assertWithdrawal(metadata, sheets);
    const clearRanges = [...tails];
    const colorCells = cells(requiredSheet(sheets, colorDataTitle));
    for (const item of colorCells) {
        if (
            item.column === 0 &&
            item.cell.userEnteredValue?.stringValue === "P31"
        )
            clearRanges.push([
                colorDataTitle,
                item.row,
                item.row + 2,
                0,
                6,
            ]);
    }
    /** @type {Request[]} */ const valueRequests = [];
    /** @type {Request[]} */ const metadataRequests = [];
    /** @type {Request[]} */ const chartRequests = [];
    for (const sheet of sheets.values()) {
        if (
            !removedPages.has(sheet.properties.sheetId) &&
            !immutable.has(sheet.properties.title)
        )
            appendSheetRequests(sheet, {
                clearRanges,
                metadataRequests,
                valueRequests,
            });
    }
    for (const sheet of metadata.sheets) {
        if (removedPages.has(sheet.properties.sheetId)) {
            continue;
        }

        metadataRequests.push(...contractSheetMetadata(sheet));
        chartRequests.push(...chartUpdates(sheet, metadata));
    }
    const entries = requiredSheet(sheets, "App entries");
    const oldRule = cells(entries).find(
        (item) => item.row === 1 && item.column === 2
    )?.cell.dataValidation;
    if (
        !isRecord(oldRule) ||
        !isRecord(oldRule["condition"]) ||
        !Array.isArray(oldRule["condition"]["values"])
    )
        throw new Error("Missing App entries ID validation");
    const rule = structuredClone(oldRule);
    const condition = object(rule["condition"]);
    condition["values"] = records(condition["values"]).filter(
        (value) => !withdrawn.has(String(value["userEnteredValue"]))
    );
    metadataRequests.push({
        setDataValidation: {
            range: {
                endColumnIndex: 3,
                endRowIndex: entries.properties.gridProperties.rowCount,
                sheetId: entries.properties.sheetId,
                startColumnIndex: 2,
                startRowIndex: 1,
            },
            rule,
        },
    });
    // P30 is again the last active page. The directory remains the destination.
    const last = requiredSheet(sheets, "P30 Mixed succulent");
    valueRequests.push(
        cellRequest(last.properties.sheetId, 2, 6, {
            formulaValue: '=HYPERLINK("#gid=1875598047","Dashboard →")',
        })
    );
    return {
        chartRequests,
        clearRanges,
        deleteRequests: [...removedPages].map((sheetId) => ({
            deleteSheet: { sheetId },
        })),
        metadataDigest: digest(metadata),
        metadataRequests,
        preservedChartIds: metadata.sheets
            .filter((sheet) => !removedPages.has(sheet.properties.sheetId))
            .flatMap((sheet) =>
                (sheet.charts ?? []).map((chart) => chart.chartId)
            ),
        snapshotsDigest: snapshotDigest(snapshots),
        valueRequests,
    };
}

/**
 * Contract only explicit inventory bounds and the two removed page scans.
 *
 * @param {string} formula @param {string} title
 */
export function contractWithdrawalFormula(formula, title = "") {
    let next = formula.replaceAll(
        /(?<reference>!\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?)(?<end>33|38)(?!\d)/gv,
        (match, reference, end, offset) => {
            const before = formula.slice(0, Number(offset));
            const name = [...inventorySheets, "Dashboard"].find(
                (sheet) =>
                    before.endsWith(`'${sheet}'`) || before.endsWith(sheet)
            );
            if (
                (name !== undefined &&
                    Number(end) === 33 &&
                    inventorySheets.has(name)) ||
                (name === "Dashboard" && Number(end) === 38)
            )
                return `${String(reference)}${Number(end) - 2}`;
            return match;
        }
    );
    if (title === "Integrity") {
        next = next.replaceAll(/(?<=[A-Z]\$?24:\$?[A-Z]{1,3}\$?)55\b/gv, "53");
        if (next.startsWith("=SUM(")) next = removePageScans(next);
    }
    return next;
}

/**
 * @param {ReturnType<typeof buildInventoryWithdrawal>} plan @param {Snapshot}
 *   metadata @param {Snapshot[]} snapshots
 */
export function verifyInventoryWithdrawalPreconditions(
    plan,
    metadata,
    snapshots
) {
    assertWithdrawal(metadata, mergeSheets(snapshots));
    if (digest(metadata) !== plan.metadataDigest)
        throw new Error("Native metadata changed after withdrawal planning");
    if (snapshotDigest(snapshots) !== plan.snapshotsDigest)
        throw new Error(
            "Source values, formulas, notes, or validations changed after withdrawal planning"
        );
}

/**
 * @param {Sheet} sheet @param {ReturnType<typeof cells>[number]} item @param
 *   {SheetRequests} requests
 */
function appendCellRequests(sheet, item, requests) {
    const { clearRanges, metadataRequests, valueRequests } = requests;
    const value = item.cell.userEnteredValue;
    if (value === undefined) return;
    if (
        isInsideClear(
            sheet.properties.title,
            item.row,
            item.column,
            clearRanges
        )
    ) {
        valueRequests.push(
            cellRequest(sheet.properties.sheetId, item.row, item.column, {})
        );
        return;
    }
    if (value.formulaValue !== undefined) {
        const formula = contractWithdrawalFormula(
            value.formulaValue,
            sheet.properties.title
        );
        if (formula !== value.formulaValue)
            valueRequests.push(
                cellRequest(sheet.properties.sheetId, item.row, item.column, {
                    formulaValue: formula,
                })
            );
    }
    if (item.cell.dataValidation !== undefined) {
        const old = JSON.stringify(item.cell.dataValidation);
        const next = contractWithdrawalFormula(old, sheet.properties.title);
        if (next !== old)
            metadataRequests.push({
                setDataValidation: {
                    range: {
                        endColumnIndex: item.column + 1,
                        endRowIndex: item.row + 1,
                        sheetId: sheet.properties.sheetId,
                        startColumnIndex: item.column,
                        startRowIndex: item.row,
                    },
                    rule: parseRecord(next),
                },
            });
    }
}

/**
 * @typedef {{
 *     clearRanges: (string | number)[][];
 *     valueRequests: Request[];
 *     metadataRequests: Request[];
 * }} SheetRequests
 */
/** @param {Sheet} sheet @param {SheetRequests} requests */
function appendSheetRequests(sheet, requests) {
    const items = cells(sheet);
    for (const item of items) appendCellRequests(sheet, item, requests);
}

/** @param {Map<string, Sheet>} sheets */
function assertEntryValidation(sheets) {
    const validation = cells(requiredSheet(sheets, "App entries")).find(
        (item) => item.row === 1 && item.column === 2
    )?.cell.dataValidation;
    const condition = object(object(validation)["condition"]);
    const ids = records(condition["values"]).map(
        (value) => value["userEnteredValue"]
    );
    if (
        condition["type"] !== "ONE_OF_LIST" ||
        JSON.stringify(ids) !==
            JSON.stringify(
                Array.from(
                    { length: 32 },
                    (_, index) => `P${String(index + 1).padStart(2, "0")}`
                )
            )
    )
        throw new Error("App entries active ID validation changed");
}

/** @param {Sheet} sheet */
function assertLedger(sheet) {
    const title = sheet.properties.title;
    if (
        (sheet.data ?? []).every(
            (block) =>
                (block.startRow ?? 0) !== 0 ||
                (block.startColumn ?? 0) !== 0 ||
                block.rowData?.length !==
                    sheet.properties.gridProperties.rowCount
        )
    )
        throw new Error(`Incomplete ledger snapshot: ${title}`);

    const items = cells(sheet);
    for (const item of items) assertLedgerCell(title, item);
}

/** @param {string} title @param {ReturnType<typeof cells>[number]} item */
function assertLedgerCell(title, item) {
    if (title === "App bulk" && item.row === 0 && item.column >= 54) return;
    const value = item.cell.userEnteredValue?.stringValue;
    if (value !== undefined && /\bP3[12]\b/v.test(value))
        throw new Error(`Withdrawal would orphan ${title} row ${item.row + 1}`);
    if (
        title === "App bulk" &&
        item.row > 0 &&
        item.column >= 54 &&
        item.cell.userEnteredValue !== undefined
    )
        throw new Error("Deprecated App bulk weights contain data");
}

/** @param {Snapshot} metadata @param {Map<string, Sheet>} sheets */
function assertWithdrawal(metadata, sheets) {
    for (const id of removedPages)
        if (
            metadata.sheets.find((sheet) => sheet.properties.sheetId === id)
                ?.charts?.length !== 4
        )
            throw new Error(
                "Expected both active P31/P32 pages with four charts; replay refused"
            );
    for (const title of ["Plant tracker", "Baselines"]) {
        const items = cells(requiredSheet(sheets, title));
        for (let row = 1; row <= 32; row += 1)
            if (
                items.find((item) => item.row === row && item.column === 0)
                    ?.cell.userEnteredValue?.stringValue !==
                `P${String(row).padStart(2, "0")}`
            )
                throw new Error(`Expected ordered 32-pot inventory: ${title}`);
    }
    for (const title of [
        "History",
        "App entries",
        "App bulk",
        "RO refills",
    ])
        assertLedger(requiredSheet(sheets, title));
    const bulk = requiredSheet(sheets, "App bulk");
    if (bulk.properties.gridProperties.columnCount !== 56)
        throw new Error("App bulk compatibility schema changed");
    for (const [index, id] of ["P31", "P32"].entries())
        if (
            cells(bulk).find(
                (item) => item.row === 0 && item.column === 54 + index
            )?.cell.userEnteredValue?.stringValue !== `${id} weight (g)`
        )
            throw new Error("App bulk compatibility headers changed");
    assertEntryValidation(sheets);
    for (const title of [
        "Insights",
        "Integrity",
        "Plant colors",
        colorDataTitle,
        analyticsTitle,
        "Watering intervals",
        "Dry-down models",
        "Quick log",
        "Watering calendar",
        "Workbook calculations",
        "Insights data",
        "Dry-down insights",
        "Dashboard",
    ])
        requiredSheet(sheets, title);
    for (const page of metadata.sheets) {
        if (/^P\d{2} /v.test(page.properties.title))
            requiredSheet(sheets, page.properties.title);
    }
}

/** @param {Cell} cell @returns {unknown} */
function cellNote(cell) {
    return Reflect.get(cell, "note");
}

/**
 * @param {number} sheetId @param {number} rowIndex @param {number} columnIndex
 * @param {Request} userEnteredValue
 */
function cellRequest(sheetId, rowIndex, columnIndex, userEnteredValue) {
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: [{ values: [{ userEnteredValue }] }],
            start: { columnIndex, rowIndex, sheetId },
        },
    };
}
/** @param {Sheet} sheet */
function cells(sheet) {
    return (sheet.data ?? []).flatMap((block) =>
        (block.rowData ?? []).flatMap((data, row) =>
            (data.values ?? []).map((cell, column) => ({
                cell,
                column: (block.startColumn ?? 0) + column,
                row: (block.startRow ?? 0) + row,
            }))
        )
    );
}
/** @param {Sheet} sheet @param {Snapshot} metadata */
function chartUpdates(sheet, metadata) {
    /** @type {Request[]} */ const requests = [];
    const charts = sheet.charts ?? [];
    for (const chart of charts) {
        const spec = structuredClone(chart.spec);
        contractChart(spec, metadata);
        if (JSON.stringify(spec) !== JSON.stringify(chart.spec))
            requests.push({
                updateChartSpec: { chartId: chart.chartId, spec },
            });
    }
    return requests;
}
/** @param {Request} spec @param {Snapshot} metadata */
function contractChart(spec, metadata) {
    walk(spec, (entry) => {
        if (Array.isArray(entry["series"]))
            entry["series"] = records(entry["series"]).filter(
                (series) => !referencesCanceledHelper(series, metadata)
            );
        if (Array.isArray(entry["styleOverrides"])) {
            const overrides = records(entry["styleOverrides"]);
            if (
                overrides.length === 32 &&
                overrides.every(
                    (point, index) => (point["index"] ?? 0) === index
                )
            ) {
                entry["styleOverrides"] = overrides.slice(0, 30);
            }
        }
        if (typeof entry["sheetId"] !== "number") return;
        const title = metadata.sheets.find(
            (sheet) => sheet.properties.sheetId === entry["sheetId"]
        )?.properties.title;
        if (title === undefined) return;
        if (
            title === colorDataTitle &&
            Number(entry["endRowIndex"]) - Number(entry["startRowIndex"]) === 33
        )
            entry["endRowIndex"] = Number(entry["endRowIndex"]) - 2;
        else if (inventorySheets.has(title) && entry["endRowIndex"] === 33)
            entry["endRowIndex"] = 31;
        else if (title === "Dashboard" && entry["endRowIndex"] === 38)
            entry["endRowIndex"] = 36;
        else {
            /* Other native values/ranges remain unchanged. */
        }
    });
}
/** @param {Request} range @param {string} title */
function contractRange(range, title) {
    const start = Number(range["startRowIndex"] ?? 0);
    const end = range["endRowIndex"];
    if (
        (end === 33 &&
            start <= 1 &&
            ["Baselines", "Plant tracker"].includes(title)) ||
        (title === "Dashboard" && end === 38 && start >= 5 && start <= 6) ||
        (end === 36 &&
            start >= 3 &&
            start <= 4 &&
            [
                "Plant colors",
                "Quick log",
                "Watering calendar",
            ].includes(title)) ||
        (title === "Integrity" && end === 55 && start >= 22 && start <= 23)
    ) {
        range["endRowIndex"] = end - 2;
        return true;
    }
    return false;
}
/** @param {Sheet} sheet */
function contractSheetMetadata(sheet) {
    /** @type {Request[]} */ const requests = [];
    if (isRecord(sheet["basicFilter"])) {
        const filter = structuredClone(sheet["basicFilter"]);
        if (contractRange(object(filter["range"]), sheet.properties.title))
            requests.push({ setBasicFilter: { filter } });
    }
    const conditionalFormats = records(sheet["conditionalFormats"]);
    for (const [index, source] of conditionalFormats.entries()) {
        const rule = structuredClone(source);
        if (
            records(rule["ranges"])
                .map((range) => contractRange(range, sheet.properties.title))
                .some(Boolean)
        )
            requests.push({
                updateConditionalFormatRule: {
                    index,
                    rule,
                    sheetId: sheet.properties.sheetId,
                },
            });
    }
    const bands = records(sheet["bandedRanges"]);
    for (const source of bands) {
        const bandedRange = structuredClone(source);
        if (contractRange(object(bandedRange["range"]), sheet.properties.title))
            requests.push({ updateBanding: { bandedRange, fields: "range" } });
    }
    return requests;
}
/** @param {unknown} value */
function digest(value) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
/**
 * @param {string} title @param {number} row @param {number} column @param
 *   {(string|number)[][]} ranges
 */
function isInsideClear(title, row, column, ranges) {
    return ranges.some(
        (range) =>
            range[0] === title &&
            row >= Number(range[1]) &&
            row < Number(range[2]) &&
            column >= Number(range[3]) &&
            column < Number(range[4])
    );
}
/** @param {Snapshot[]} snapshots */
function mergeSheets(snapshots) {
    /** @type {Map<string, Sheet>} */ const result = new Map();
    for (const snapshot of snapshots)
        for (const sheet of snapshot.sheets) {
            const prior = result.get(sheet.properties.title);
            result.set(sheet.properties.title, {
                ...sheet,
                data: [...(prior?.data ?? []), ...(sheet.data ?? [])],
            });
        }
    return result;
}

/** @param {unknown} value @returns {Request} */
function object(value) {
    if (!isRecord(value)) throw new Error("Expected native object");
    return value;
}
/** @param {string} text */
function parseRecord(text) {
    /** @type {unknown} */ const parsed = JSON.parse(text);
    return object(parsed);
}
/** @param {unknown} value @returns {Request[]} */
function records(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error("Expected native array");
    return value.map((item) => object(item));
}
/** @param {Request} series @param {Snapshot} metadata */
function referencesCanceledHelper(series, metadata) {
    let isFound = false;
    walk(series, (entry) => {
        const title = metadata.sheets.find(
            (sheet) => sheet.properties.sheetId === entry["sheetId"]
        )?.properties.title;
        if (
            (title === colorDataTitle &&
                Number(entry["startColumnIndex"]) >= 133) ||
            (title === analyticsTitle &&
                Number(entry["startColumnIndex"]) >= 100)
        )
            isFound = true;
    });
    return isFound;
}

/** @param {string} formula */
function removePageScans(formula) {
    let depth = 0;
    let isQuoted = false;
    let start = 5;
    const args = [];
    for (let i = 5; i < formula.length - 1; i += 1) {
        const char = formula[i];
        if (char === '"') isQuoted = !isQuoted;
        if (isQuoted) continue;
        if (char === "(") depth += 1;
        else if (char === ")") depth -= 1;
        else {
            /* Other characters do not change the nesting depth. */
        }
        if (char === "," && depth === 0) {
            args.push(formula.slice(start, i));
            start = i + 1;
        }
    }
    args.push(formula.slice(start, -1));
    return `=SUM(${args.filter((arg) => !/'P3[12] [^']+'!/v.test(arg)).join(",")})`;
}
/** @param {Map<string, Sheet>} sheets @param {string} title */
function requiredSheet(sheets, title) {
    const sheet = sheets.get(title);
    if (sheet === undefined)
        throw new Error(`Missing fresh snapshot: ${title}`);
    return sheet;
}

/** @param {Snapshot[]} snapshots */
function snapshotDigest(snapshots) {
    return digest(
        [...mergeSheets(snapshots)].map(([title, sheet]) => ({
            cells: cells(sheet)
                .filter(
                    (item) =>
                        item.cell.userEnteredValue !== undefined ||
                        item.cell.dataValidation !== undefined ||
                        cellNote(item.cell) !== undefined
                )
                .map((item) => ({
                    column: item.column,
                    note: cellNote(item.cell),
                    row: item.row,
                    validation: item.cell.dataValidation,
                    value: item.cell.userEnteredValue,
                })),
            title,
        }))
    );
}

/** @param {unknown} value @param {(record:Request)=>void} visit */
function walk(value, visit) {
    if (Array.isArray(value)) {
        for (const item of value) walk(item, visit);
        return;
    }
    if (!isRecord(value)) return;
    visit(value);
    for (const item of Object.values(value)) walk(item, visit);
}
