import { isDeepStrictEqual } from "node:util";

/**
 * @typedef {{
 *     stringValue?: string;
 *     numberValue?: number;
 *     boolValue?: boolean;
 *     formulaValue?: string;
 * }} CellValue
 */
/**
 * @typedef {{
 *     userEnteredValue?: CellValue;
 *     effectiveValue?: CellValue;
 *     note?: string;
 * }} NativeCell
 */
/**
 * @typedef {{
 *     properties: { sheetId: number; title: string };
 *     data?: {
 *         startRow?: number;
 *         startColumn?: number;
 *         rowData?: { values?: NativeCell[] }[];
 *     }[];
 * }} NativeSheet
 */
/** @typedef {{ spreadsheetId: string; sheets: NativeSheet[] }} CollectionSnapshot */
/** @typedef {{ userEnteredValue: CellValue | null; note: string }} CellState */
/**
 * @typedef {{
 *     sheet: string;
 *     id: string;
 *     column: number;
 *     expected: CellState;
 *     replacement: CellValue;
 *     evidence: string;
 * }} CollectionCorrection
 */

const columns = {
    Baselines: {
        0: "Plant ID",
        5: "Current pot size",
        17: "Medium / substrate",
    },
    "Container members": {
        0: "Inventory ID",
        2: "Container ID",
        7: "Acquired from",
        8: "Acquired date",
        9: "Identification evidence",
    },
    Containers: {
        0: "Container ID",
        14: "Setup notes",
        17: "Acquired from",
        18: "Acquired date",
    },
    "Plant tracker": {
        0: "Plant ID",
        27: "Current pot size",
        28: "Pot details",
        30: "Pot source",
    },
};
const sourceIds = new Set([
    "P23",
    "P24",
    "P25",
    "P26",
    "P27",
    "P28",
    "P39",
    "P40",
]);
const memberIds = new Set([
    "Cactus-07",
    "Cactus-08",
    "Cactus-09",
    "Houseplant-06",
    "Houseplant-07",
    "Succulent-06",
    "Succulent-07",
    "Succulent-08",
]);

/**
 * Re-read the same native inventory ranges immediately before applying the
 * reviewed batch. A moved row, changed note/value, ID or header rejects the
 * plan. Volatile computed values and unrelated inventory cells do not affect
 * guards.
 *
 * @param {ReturnType<typeof buildCollectionRecordReconciliationPlan>} plan
 * @param {CollectionSnapshot} fresh
 */
export function assertCollectionRecordReconciliationPreconditions(plan, fresh) {
    if (plan.spreadsheetId !== fresh.spreadsheetId)
        throw new Error("Workbook identity drift");
    const rebuilt = buildCollectionRecordReconciliationPlan(fresh, plan.guards);
    if (!isDeepStrictEqual(plan, rebuilt))
        throw new Error(
            "Inventory rows, headers or identities drifted since planning"
        );
}

/**
 * Build a single-cell, value-only reconciliation plan. The caller supplies the
 * reviewed source wording/formulas and the original captured value and note.
 * This module never calls Google APIs or writes History, staging or setup IDs.
 *
 * @param {CollectionSnapshot} snapshot
 * @param {CollectionCorrection[]} corrections
 */
export function buildCollectionRecordReconciliationPlan(snapshot, corrections) {
    if (!snapshot.spreadsheetId || corrections.length === 0)
        throw new Error(
            "Workbook identity and reviewed corrections are required"
        );
    const seen = new Set();
    const guards = corrections.map((correction) => {
        if (!allowed(correction))
            throw new Error(
                `Outside reconciliation scope: ${correction.sheet}/${correction.id}/${correction.column}`
            );
        if (!correction.evidence.trim())
            throw new Error("Every correction needs reviewed source evidence");
        const { rows, sheet } = sheetRows(snapshot, correction.sheet);
        const schema =
            columns[/** @type {keyof typeof columns} */ (correction.sheet)];
        const headers = Object.entries(schema).map(([column, text]) => {
            const cell = rows[0]?.values?.[Number(column)];
            if (cell?.userEnteredValue?.stringValue !== text)
                throw new Error(`Header drift: ${correction.sheet}/${column}`);
            return { column: Number(column), expected: state(cell) };
        });
        const matches = rows.flatMap((row, index) =>
            index > 0 && identity(row.values?.[0]) === correction.id
                ? [index]
                : []
        );
        const row = matches[0];
        if (row === undefined || matches.length !== 1)
            throw new Error(
                `Missing or duplicate inventory ID: ${correction.sheet}/${correction.id}`
            );
        const key = `${sheet.properties.sheetId}/${row}/${correction.column}`;
        if (seen.has(key)) throw new Error(`Duplicate correction: ${key}`);
        seen.add(key);
        const current = state(rows[row]?.values?.[correction.column]);
        if (!isDeepStrictEqual(current, correction.expected))
            throw new Error(`Expected cell drift: ${key}`);
        validateReplacement(correction, current, key);
        if (isDeepStrictEqual(current.userEnteredValue, correction.replacement))
            throw new Error(`Reconciliation already applied: ${key}`);
        return {
            ...correction,
            container:
                correction.sheet === "Container members"
                    ? state(rows[row]?.values?.[2])
                    : null,
            headers,
            identity: state(rows[row]?.values?.[0]),
            row,
            sheetId: sheet.properties.sheetId,
        };
    });
    return {
        guards,
        requests: guards.map((guard) => ({
            updateCells: {
                fields: "userEnteredValue",
                range: {
                    endColumnIndex: guard.column + 1,
                    endRowIndex: guard.row + 1,
                    sheetId: guard.sheetId,
                    startColumnIndex: guard.column,
                    startRowIndex: guard.row,
                },
                rows: [{ values: [{ userEnteredValue: guard.replacement }] }],
            },
        })),
        spreadsheetId: snapshot.spreadsheetId,
    };
}

/** @param {CollectionCorrection} correction */
function allowed(correction) {
    const { column, id, sheet } = correction;
    if (sheet === "Plant tracker")
        return (
            ([
                "P29",
                "P30",
                "P37",
            ].includes(id) &&
                [
                    27,
                    28,
                    30,
                ].includes(column)) ||
            ([
                "P38",
                "P39",
                "P40",
            ].includes(id) &&
                column === 28) ||
            (["P39", "P40"].includes(id) && column === 30)
        );
    if (sheet === "Baselines")
        return (
            /^P(?:0[1-9]|[12]\d|3[0125-9]|40)$/v.test(id) &&
            (column === 5 || (column === 17 && /^P2[3-8]$/v.test(id)))
        );
    if (sheet === "Containers")
        return (
            (column === 14 &&
                [
                    "P30",
                    "P37",
                    "P38",
                    "P39",
                    "P40",
                ].includes(id)) ||
            ([17, 18].includes(column) && sourceIds.has(id))
        );
    return (
        sheet === "Container members" &&
        (([7, 8].includes(column) && memberIds.has(id)) ||
            (column === 9 && id === "Succulent-17"))
    );
}

/** @param {NativeCell | undefined} cell */
function identity(cell) {
    return (
        cell?.userEnteredValue?.stringValue ??
        cell?.effectiveValue?.stringValue ??
        ""
    );
}

/** @param {CollectionSnapshot} snapshot @param {string} title */
function sheetRows(snapshot, title) {
    const matches = snapshot.sheets.filter(
        (sheet) => sheet.properties.title === title
    );
    const sheet = matches[0];
    if (!sheet || matches.length !== 1)
        throw new Error(`Missing or ambiguous sheet: ${title}`);
    const blocks = sheet.data ?? [];
    const block = blocks[0];
    if (
        !block ||
        blocks.length !== 1 ||
        (block.startRow ?? 0) !== 0 ||
        (block.startColumn ?? 0) !== 0
    )
        throw new Error(
            `Expected complete header-bearing inventory grid: ${title}`
        );
    return { rows: block.rowData ?? [], sheet };
}

/** @param {NativeCell | undefined} cell @returns {CellState} */
function state(cell) {
    return {
        note: cell?.note ?? "",
        userEnteredValue: cell?.userEnteredValue ?? null,
    };
}

/**
 * @param {CollectionCorrection} correction @param {CellState} current @param
 *   {string} key
 */
function validateReplacement(correction, current, key) {
    const isFormula = correction.replacement.formulaValue !== undefined;
    if (
        Object.keys(correction.replacement).length !== 1 ||
        (correction.sheet === "Baselines"
            ? !isFormula
            : typeof correction.replacement.stringValue !== "string")
    )
        throw new Error(`Invalid replacement type: ${key}`);
    if (
        correction.sheet !== "Baselines" &&
        current.userEnteredValue?.formulaValue !== undefined
    )
        throw new Error(`Refusing metadata formula replacement: ${key}`);
    if (
        correction.sheet === "Baselines" &&
        current.userEnteredValue?.formulaValue === undefined
    )
        throw new Error(`Expected existing Baselines formula: ${key}`);
}
