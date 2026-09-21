import { isDeepStrictEqual } from "node:util";

import { isRecord } from "../build-data.mjs";
import { inventorySnapshotDigest } from "./inventory-expansion.mjs";

/** @typedef {import("./inventory-expansion.mjs").NativeSnapshot} Snapshot */
/** @typedef {import("./inventory-expansion.mjs").Sheet} Sheet */
/** @typedef {import("./inventory-expansion.mjs").Cell} Cell */

const identities = [
    {
        from: "P33",
        label: "#7",
        oldLabel: "#9",
        sheetId: 202_609_330,
        title: "P33 Peperomia Bicolor",
        to: "P31",
    },
    {
        from: "P34",
        label: "#8",
        oldLabel: "#10",
        sheetId: 202_609_340,
        title: "P34 Tricolor oyster plant",
        to: "P32",
    },
];
const preserved = new Set([
    "App bulk",
    "App entries",
    "History",
    "History view",
    "RO refills",
]);

/**
 * Explicit owner-requested renumbering; never infer this migration from a
 * normal inventory edit. @param {Snapshot} metadata @param {Snapshot[]}
 * snapshots
 */
export function buildHouseplantRenumber(metadata, snapshots) {
    assertSources(metadata, snapshots);
    /** @type {Record<string, unknown>[]} */ const requests = [];
    for (const snapshot of snapshots)
        for (const sheet of snapshot.sheets) appendSheetValues(sheet, requests);
    for (const sheet of metadata.sheets) appendMetadata(sheet, requests);
    appendHistoryRemap(findSheet(snapshots, "History"), requests);
    const entries = findSheet(snapshots, "App entries");
    for (const item of cells(entries))
        if (item.cell.dataValidation !== undefined) {
            const next = remap(item.cell.dataValidation);
            if (!isDeepStrictEqual(next, item.cell.dataValidation))
                requests.push(
                    update(
                        entries.properties.sheetId,
                        item.row,
                        item.column,
                        { dataValidation: next },
                        "dataValidation"
                    )
                );
        }
    for (const identity of identities)
        requests.push({
            updateSheetProperties: {
                fields: "title",
                properties: {
                    sheetId: identity.sheetId,
                    title: renumberHouseplantText(identity.title),
                },
            },
        });
    return {
        metadataDigest: inventorySnapshotDigest([metadata]),
        requests,
        sourceDigest: sourceDigest(snapshots),
    };
}

/**
 * Replace current identifiers only; UUID substrings and numeric quantities stay
 * intact. @param {string} text
 */
export function renumberHouseplantText(text) {
    return text
        .replaceAll(/\bP33\b/gv, "P31")
        .replaceAll(/\bP34\b/gv, "P32")
        .replaceAll(/#9\b/gv, "#7")
        .replaceAll(/#10\b/gv, "#8")
        .replace("P01–P30, P31, or P32", "P01–P32");
}

/**
 * @param {ReturnType<typeof buildHouseplantRenumber>} plan @param {Snapshot}
 *   metadata @param {Snapshot[]} snapshots
 */
export function verifyHouseplantRenumber(plan, metadata, snapshots) {
    assertSources(metadata, snapshots);
    if (
        plan.sourceDigest !== sourceDigest(snapshots) ||
        plan.metadataDigest !== inventorySnapshotDigest([metadata])
    )
        throw new Error("Workbook changed after renumber plan");
}

/** @param {Sheet} history @param {Record<string, unknown>[]} requests */
function appendHistoryRemap(history, requests) {
    const observations = cells(history).filter(
        (item) => item.row > 0 && item.column === 1
    );
    for (const item of observations) {
        const identity = identities.find(
            (entry) => entry.from === item.cell.userEnteredValue?.stringValue
        );
        if (identity === undefined) continue;
        requests.push(
            update(
                history.properties.sheetId,
                item.row,
                1,
                { userEnteredValue: { stringValue: identity.to } },
                "userEnteredValue"
            )
        );
        const label = value(history, item.row, 11);
        if (label?.stringValue === identity.oldLabel)
            requests.push(
                update(
                    history.properties.sheetId,
                    item.row,
                    11,
                    { userEnteredValue: { stringValue: identity.label } },
                    "userEnteredValue"
                )
            );
    }
}

/** @param {Sheet} sheet @param {Record<string, unknown>[]} requests */
function appendMetadata(sheet, requests) {
    if (sheet.charts !== undefined)
        for (const chart of sheet.charts) {
            const spec = remap(chart.spec);
            if (!isDeepStrictEqual(chart.spec, spec))
                requests.push({
                    updateChartSpec: { chartId: chart.chartId, spec },
                });
        }
    const protections = sheet["protectedRanges"];
    if (!Array.isArray(protections)) return;
    for (const protection of protections) {
        if (!isRecord(protection)) throw new Error("Malformed protection");
        const description = remap(protection["description"]);
        if (description !== protection["description"])
            requests.push({
                updateProtectedRange: {
                    fields: "description",
                    protectedRange: {
                        description,
                        protectedRangeId: protection["protectedRangeId"],
                    },
                },
            });
    }
}

/** @param {Sheet} sheet @param {Record<string, unknown>[]} requests */
function appendSheetValues(sheet, requests) {
    if (preserved.has(sheet.properties.title)) return;
    for (const item of cells(sheet)) {
        for (const field of [
            "userEnteredValue",
            "dataValidation",
            "note",
        ]) {
            /** @type {unknown} */ const before = Reflect.get(item.cell, field);
            const after = remap(before);
            if (!isDeepStrictEqual(before, after))
                requests.push(
                    update(
                        sheet.properties.sheetId,
                        item.row,
                        item.column,
                        { [field]: after },
                        field
                    )
                );
        }
    }
}

/** @param {Sheet} sheet */
function assertLedger(sheet) {
    const title = sheet.properties.title;
    for (const item of cells(sheet)) {
        if (item.row === 0) continue;
        const text = item.cell.userEnteredValue?.stringValue ?? "";
        if (/\bP3[12]\b/v.test(text))
            throw new Error(`Destination identity already appears in ${title}`);
        if (
            title === "App bulk" &&
            item.column >= 54 &&
            item.cell.userEnteredValue !== undefined
        )
            throw new Error(
                "Bulk identity fields must be empty before renumbering"
            );
        if (
            text !== "" &&
            title === "App entries" &&
            item.column === 0 &&
            value(sheet, item.row, 26)?.stringValue !== "Saved"
        )
            throw new Error("Drain pending App entries before renumbering");
        if (
            text !== "" &&
            title === "App bulk" &&
            item.column === 0 &&
            value(sheet, item.row, 39)?.stringValue !== "Saved"
        )
            throw new Error("Drain pending bulk rounds before renumbering");
    }
}

/** @param {Snapshot} metadata @param {Snapshot[]} snapshots */
function assertSources(metadata, snapshots) {
    for (const sheet of metadata.sheets)
        findSheet(snapshots, sheet.properties.title);
    for (const identity of identities) {
        const page = metadata.sheets.find(
            (sheet) => sheet.properties.sheetId === identity.sheetId
        );
        if (page?.properties.title !== identity.title)
            throw new Error(
                "Renumbering already applied or plant page identity changed"
            );
        if (
            metadata.sheets.some((sheet) =>
                sheet.properties.title.startsWith(`${identity.to} `)
            )
        )
            throw new Error("Destination plant page already exists");
    }
    const tracker = findSheet(snapshots, "Plant tracker");
    for (let index = 0; index < 32; index += 1) {
        const id =
            index < 30
                ? `P${String(index + 1).padStart(2, "0")}`
                : identities[index - 30]?.from;
        if (value(tracker, index + 1, 0)?.stringValue !== id)
            throw new Error("Active roster changed");
    }
    for (const title of [
        "History",
        "App entries",
        "App bulk",
        "RO refills",
    ]) {
        const sheet = findSheet(snapshots, title);
        if (
            sheet.data?.some(
                (block) =>
                    (block.startRow ?? 0) === 0 &&
                    block.rowData?.length ===
                        sheet.properties.gridProperties.rowCount
            ) !== true
        )
            throw new Error(`Incomplete ledger capture: ${title}`);
        assertLedger(sheet);
    }
    const bulk = findSheet(snapshots, "App bulk");
    if (bulk.properties.gridProperties.columnCount !== 58)
        throw new Error("Bulk schema changed");
    for (let column = 54; column < 58; column += 1)
        if (
            value(bulk, 0, column)?.stringValue !== `P${column - 23} weight (g)`
        )
            throw new Error("Bulk compatibility headers changed");
}

/** @param {Sheet} sheet */
function cells(sheet) {
    return (sheet.data ?? []).flatMap((block) =>
        (block.rowData ?? []).flatMap((row, r) =>
            (row.values ?? []).map((cell, c) => ({
                cell,
                column: (block.startColumn ?? 0) + c,
                row: (block.startRow ?? 0) + r,
            }))
        )
    );
}

/** @param {Snapshot[]} snapshots @param {string} title */
function findSheet(snapshots, title) {
    const sheet = snapshots
        .flatMap((snapshot) => snapshot.sheets)
        .find((item) => item.properties.title === title);
    if (sheet === undefined)
        throw new Error(`Missing captured sheet: ${title}`);
    return sheet;
}

/** @param {string} key @param {unknown} entry */
function omitCalculatedValue(key, entry) {
    return key === "effectiveValue" ? undefined : entry;
}

/** @param {unknown} input @returns {unknown} */
function remap(input) {
    if (typeof input === "string") return renumberHouseplantText(input);
    if (Array.isArray(input)) return input.map((entry) => remap(entry));
    if (input !== null && typeof input === "object")
        return Object.fromEntries(
            Object.entries(input).map(([key, entry]) => [key, remap(entry)])
        );
    return input;
}

/** @param {Snapshot[]} snapshots */
function sourceDigest(snapshots) {
    return inventorySnapshotDigest(
        JSON.stringify(snapshots, omitCalculatedValue)
    );
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {Record<string, unknown>} cell @param {string} fields
 */
function update(sheetId, row, column, cell, fields) {
    return {
        updateCells: {
            fields,
            rows: [{ values: [cell] }],
            start: { columnIndex: column, rowIndex: row, sheetId },
        },
    };
}

/** @param {Sheet} sheet @param {number} row @param {number} column */
function value(sheet, row, column) {
    return cells(sheet).find(
        (item) => item.row === row && item.column === column
    )?.cell.userEnteredValue;
}
