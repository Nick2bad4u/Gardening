import { createHash } from "node:crypto";

import { isRecord } from "../build-data.mjs";
import { buildInventoryMetadataRequests } from "./inventory-metadata.mjs";
import {
    compactSelectedPlantSeries,
    sharedSelectedRoleFormula,
} from "./plant-chart-colors.mjs";
import activePalette from "./plant-colors.json" with { type: "json" };
// Historical enrollment palettes, independent of the current reassigned roster.
const dryDownSheet = "Dry-down insights";
const palette = [
    { hex: "#BD704B", id: "P31", name: "Terracotta" },
    { hex: "#A36591", id: "P32", name: "Mauve" },
    { hex: "#566E36", id: "P33", name: "Moss" },
    { hex: "#BE719C", id: "P34", name: "Heather" },
];

/** @param {string} id */
function plantColor(id) {
    const color = [...palette, ...activePalette].find(
        (entry) => entry.id === id
    );
    if (!color) throw new Error(`Unknown historical enrollment color: ${id}`);
    return {
        blue: Number.parseInt(color.hex.slice(5, 7), 16) / 255,
        green: Number.parseInt(color.hex.slice(3, 5), 16) / 255,
        red: Number.parseInt(color.hex.slice(1, 3), 16) / 255,
    };
}

/** @typedef {import("../../test/workbook-fixtures.d.ts").EnteredValue} EnteredValue */
/**
 * @typedef {{
 *     userEnteredValue?: EnteredValue;
 *     effectiveValue?: EnteredValue;
 *     dataValidation?: object;
 *     userEnteredFormat?: Record<string, unknown>;
 * }} Cell
 */
/**
 * @typedef {{
 *     properties: {
 *         title: string;
 *         sheetId: number;
 *         index?: number;
 *         gridProperties: { rowCount: number; columnCount: number };
 *     };
 *     data?: {
 *         startRow?: number;
 *         startColumn?: number;
 *         rowData?: { values?: Cell[] }[];
 *     }[];
 *     charts?: { chartId: number; spec: Record<string, unknown> }[];
 *     [key: string]: unknown;
 * }} Sheet
 */
/** @typedef {{ sheets: Sheet[] }} NativeSnapshot */
/**
 * @typedef {(typeof inventoryAdditions)[number] & {
 *     medium?: string;
 *     guideUrl?: string;
 * }} Addition
 */
/**
 * @typedef {{
 *     additions?: Addition[];
 *     bulkStartColumn?: number;
 *     reuseCapacity?: boolean;
 *     existingIds?: string[];
 * }} ExpansionOptions
 */

export const inventoryAdditions = [
    {
        contents:
            "Echeveria 'Cubic Frost'; Sedum adolphi 'Coppertone' (seller identification); Echeveria setosa var. deminuta; Echeveria 'Ruby Slippers' (probable E. harmsii)",
        details:
            "Decorated Amazon Basics polypropylene pot with drainage; four shared succulent components",
        id: "P31",
        label: "#7",
        name: "Four-succulent planter",
        pot: "8 in",
        sheetId: 202_609_310,
        source: "https://www.amazon.com/dp/B0F4QB8C8M",
        title: "P31 Four-succulent planter",
    },
    {
        contents: "Tradescantia 'Nanouk'",
        details:
            "D'vine Dev beaded glazed ceramic, blush mauve, 27-C-Z-K; drainage hole; no saucer in use",
        id: "P32",
        label: "#8",
        name: "Nanouk tradescantia",
        pot: "4 in",
        sheetId: 202_609_320,
        source: "",
        title: "P32 Nanouk tradescantia",
    },
];

const colorDataSheet = "Plant color data";
const calculationSheet = "Workbook calculations";

const analyticsSheet = "Workbook analytics";
const intervalSheet = "Watering intervals";

const appEntriesSheet = "App entries";
const trackerSheet = "Plant tracker";

/** @param {Sheet} template @param {Addition} plant */
function clonePageProtections(template, plant) {
    if (!Array.isArray(template["protectedRanges"])) return [];
    return template["protectedRanges"].map((source) => {
        if (!isRecord(source)) throw new Error("Malformed page protection");
        const protectedRange = structuredClone(source);
        delete protectedRange["protectedRangeId"];
        delete protectedRange["requestingUserCanEdit"];
        if (protectedRange["warningOnly"] === true)
            delete protectedRange["editors"];
        walkRecords(protectedRange, (item) => {
            if (item["sheetId"] === template.properties.sheetId)
                item["sheetId"] = plant.sheetId;
        });
        if (typeof protectedRange["description"] === "string")
            protectedRange["description"] = protectedRange[
                "description"
            ].replace(template.properties.title, () => plant.title);
        return { addProtectedRange: { protectedRange } };
    });
}

const immutableSheets = new Set([
    "App bulk",
    appEntriesSheet,
    "History",
    "History view",
    "RO refills",
]);
const boundedSheets = new Set([
    analyticsSheet,
    "Baselines",
    calculationSheet,
    colorDataSheet,
    "Dry-down models",
    dryDownSheet,
    "Insights data",
    trackerSheet,
]);

/**
 * Build a guarded two-pot expansion from the historical 30-pot or current
 * 32-pot roster, without remote writes. Explicit existingIds selects the
 * latter. Duplicate pages first, then apply values, verify native outputs, and
 * only then apply chart requests. Use finalizeInventoryPageCharts with fresh
 * metadata after duplication to discover Google's newly assigned chart IDs.
 *
 * @param {NativeSnapshot} metadata
 * @param {NativeSnapshot[]} snapshots
 * @param {ExpansionOptions} [options]
 */
export function buildInventoryExpansion(metadata, snapshots, options = {}) {
    /** @type {Addition[]} */
    const additions = options.additions ?? inventoryAdditions;
    const bulkStartColumn = options.bulkStartColumn ?? 54;
    const existingIds = expansionRoster(options, additions, bulkStartColumn);
    const baseCount = existingIds.length;
    const offset = baseCount - 30;
    const lastId = existingIds.at(-1) ?? "P30";
    const lastPage = metadata.sheets.find((current) =>
        current.properties.title.startsWith(`${lastId} `)
    );
    if (!lastPage) throw new Error(`Missing last active page: ${lastId}`);
    const lastPageIndex = lastPage.properties.index ?? 36;
    const extendFormula = (/** @type {string} */ formula) =>
        extendInventoryFormula(formula, baseCount);
    const sheets = sheetMap(snapshots);
    /** @param {string} title */
    const sheet = (title) => {
        const found = sheets.get(title);
        if (!found) throw new Error(`Missing full snapshot: ${title}`);
        return found;
    };
    /** @param {string} title */
    const meta = (title) => {
        const found = metadata.sheets.find(
            (item) => item.properties.title === title
        );
        if (!found) throw new Error(`Missing metadata: ${title}`);
        return found;
    };
    /** @param {string} title @param {number} row @param {number} column */
    const cell = (title, row, column) =>
        entries(sheet(title)).find(
            (item) => item.row === row && item.column === column
        )?.cell;
    const { template, validationPreconditions } = assertInventorySources(
        metadata,
        cell,
        meta,
        additions,
        bulkStartColumn,
        existingIds
    );
    if (baseCount === 32) assertCurrentEnrollment(cell, sheet, additions);

    /** @type {Record<string, unknown>[]} */
    const prepareRequests = [];
    /** @type {Record<string, unknown>[]} */
    const valueRequests = [];
    /** @type {Record<string, unknown>[]} */
    const chartRequests = [];
    /**
     * @type {{
     *     sheet: string;
     *     row: number;
     *     column: number;
     *     value: EnteredValue;
     * }[]}
     */ const preconditions = [];
    /**
     * @type {{
     *     sheet: string;
     *     startRow: number;
     *     endRow: number;
     *     startColumn: number;
     *     endColumn: number;
     * }[]}
     */ const emptyRanges = [];
    preconditions.push({
        column: 2,
        row: 0,
        sheet: appEntriesSheet,
        value: { stringValue: "Plant ID" },
    });
    /**
     * @param {string} title @param {number} startRow @param {number} endRow
     * @param {number} startColumn @param {number} endColumn
     */
    function requireEmpty(title, startRow, endRow, startColumn, endColumn) {
        if (
            entries(sheet(title)).some(
                ({ cell: current, column, row }) =>
                    row >= startRow &&
                    row < endRow &&
                    column >= startColumn &&
                    column < endColumn &&
                    (current.userEnteredValue !== undefined ||
                        current.effectiveValue !== undefined)
            )
        )
            throw new Error(
                `Occupied expansion destination: ${title} R${startRow + 1}:R${endRow} C${startColumn + 1}:C${endColumn}`
            );
        emptyRanges.push({
            endColumn,
            endRow,
            sheet: title,
            startColumn,
            startRow,
        });
    }
    /**
     * @param {string} title @param {number} row @param {number} column @param
     *   {EnteredValue} value
     */
    function write(title, row, column, value) {
        const before = cell(title, row, column)?.userEnteredValue ?? {};
        preconditions.push({ column, row, sheet: title, value: before });
        valueRequests.push(
            update(meta(title).properties.sheetId, row, column, value)
        );
    }
    /**
     * @param {string} title @param {number} sourceRow @param {number}
     *   startColumn @param {number} endColumn
     */
    function appendRows(title, sourceRow, startColumn, endColumn) {
        requireEmpty(
            title,
            sourceRow + 1,
            sourceRow + 3,
            startColumn,
            endColumn
        );
        const sheetId = meta(title).properties.sheetId;
        for (const [index, plant] of additions.entries()) {
            const targetRow = sourceRow + index + 1;
            prepareRequests.push({
                copyPaste: {
                    destination: {
                        endColumnIndex: endColumn,
                        endRowIndex: targetRow + 1,
                        sheetId,
                        startColumnIndex: startColumn,
                        startRowIndex: targetRow,
                    },
                    pasteType: "PASTE_FORMAT",
                    source: {
                        endColumnIndex: endColumn,
                        endRowIndex: sourceRow + 1,
                        sheetId,
                        startColumnIndex: startColumn,
                        startRowIndex: sourceRow,
                    },
                },
            });
            const rowEntries = entries(sheet(title)).filter(
                (entry) =>
                    entry.row === sourceRow &&
                    entry.column >= startColumn &&
                    entry.column < endColumn &&
                    entry.cell.userEnteredValue !== undefined
            );
            for (const item of rowEntries) {
                const value = structuredClone(item.cell.userEnteredValue ?? {});
                if (value.formulaValue !== undefined)
                    value.formulaValue = extendFormula(
                        shiftInventoryRow(
                            shiftInventoryRow(
                                value.formulaValue,
                                sourceRow + 1,
                                targetRow + 1
                            ),
                            baseCount + 1,
                            baseCount + 2 + index
                        )
                    ).replaceAll(lastId, () => plant.id);
                if (value.formulaValue !== undefined)
                    value.formulaValue = rebaseIntervalRange(
                        value.formulaValue,
                        index,
                        baseCount,
                        89 + offset * 3
                    );
                if (value.stringValue?.includes(lastId) === true)
                    value.stringValue = value.stringValue.replaceAll(
                        lastId,
                        () => plant.id
                    );
                write(title, targetRow, item.column, value);
            }
        }
    }
    function prepareStructure() {
        for (const [
            title,
            dimension,
            length,
        ] of [
            [
                calculationSheet,
                "ROWS",
                2,
            ],
            [
                analyticsSheet,
                "COLUMNS",
                6,
            ],
            [
                intervalSheet,
                "COLUMNS",
                6,
            ],
            [
                colorDataSheet,
                "COLUMNS",
                8,
            ],
            [
                "App bulk",
                "COLUMNS",
                2,
            ],
        ]) {
            const properties = meta(String(title)).properties.gridProperties;
            const target =
                String(title) === "App bulk"
                    ? bulkStartColumn + 2
                    : {
                          [analyticsSheet]: 106 + offset * 3,
                          [calculationSheet]: 34 + offset,
                          [colorDataSheet]: 141 + offset * 4,
                          [intervalSheet]: 96 + offset * 3,
                      }[String(title)];
            const current =
                dimension === "ROWS"
                    ? properties.rowCount
                    : properties.columnCount;
            const amount =
                target !== undefined && options.reuseCapacity === true
                    ? Math.max(0, target - current)
                    : Number(length);
            if (amount === 0) continue;
            prepareRequests.push({
                appendDimension: {
                    dimension,
                    length: amount,
                    sheetId: meta(String(title)).properties.sheetId,
                },
            });
        }
        for (const [index, plant] of additions.entries()) {
            prepareRequests.push(
                {
                    duplicateSheet: {
                        insertSheetIndex: lastPageIndex + index + 1,
                        newSheetId: plant.sheetId,
                        newSheetName: plant.title,
                        sourceSheetId: template.properties.sheetId,
                    },
                },
                ...clonePageProtections(template, plant)
            );
        }
    }
    prepareStructure();
    /** @param {Sheet} current @param {ReturnType<typeof entries>[number]} item */
    function expandCellReference(current, item) {
        const formula = item.cell.userEnteredValue?.formulaValue;
        if (formula !== undefined) {
            const next = extendFormula(formula);
            if (next !== formula)
                write(current.properties.title, item.row, item.column, {
                    formulaValue: next,
                });
        }
        if (item.cell.dataValidation === undefined) return;
        const before = JSON.stringify(item.cell.dataValidation);
        const after = extendFormula(before);
        if (after === before) return;
        prepareRequests.push({
            setDataValidation: {
                range: {
                    endColumnIndex: item.column + 1,
                    endRowIndex: item.row + 1,
                    sheetId: current.properties.sheetId,
                    startColumnIndex: item.column,
                    startRowIndex: item.row,
                },
                rule: parseRecord(after),
            },
        });
    }
    function expandDerivedReferences() {
        for (const current of sheets.values()) {
            if (immutableSheets.has(current.properties.title)) continue;
            for (const item of entries(current))
                expandCellReference(current, item);
        }
    }
    expandDerivedReferences();
    const colorEntries = entries(sheet(colorDataSheet));
    const integrityEntries = entries(sheet("Integrity"));
    const templateEntries = entries(sheet("P30 Mixed succulent"));
    function appendDerivedRows() {
        for (const [
            title,
            row,
            start,
            end,
        ] of [
            [
                trackerSheet,
                30,
                0,
                36,
            ],
            [
                "Baselines",
                30,
                0,
                36,
            ],
            [
                "Dashboard",
                35,
                0,
                31,
            ],
            [
                "Quick log",
                33,
                0,
                15,
            ],
            [
                "Insights data",
                30,
                15,
                30,
            ],
            [
                dryDownSheet,
                30,
                0,
                24,
            ],
            [
                calculationSheet,
                30,
                0,
                3,
            ],
            [
                analyticsSheet,
                30,
                5,
                8,
            ],
            [
                "Watering calendar",
                33,
                0,
                57,
            ],
            [
                "Plant colors",
                33,
                0,
                6,
            ],
        ])
            appendRows(
                String(title),
                Number(row) + offset,
                Number(start),
                Number(end)
            );
        // Fixed-color comparisons occupy independent 35-row blocks; expand each
        // block in place without relocating the following blocks or any chart.
        for (const item of colorEntries)
            if (
                item.column === 0 &&
                item.cell.userEnteredValue?.stringValue === lastId
            )
                appendRows(colorDataSheet, item.row, 0, 6);
        appendRows(colorDataSheet, baseCount, 127, 133);
    }
    appendDerivedRows();
    function expandIntegrityRows() {
        if (options.reuseCapacity === true) {
            if (
                cell("Integrity", 55 + offset, 0)?.userEnteredValue
                    ?.stringValue !== "Critical source-row exceptions"
            )
                throw new Error("Integrity reusable slots changed");
            requireEmpty("Integrity", 53 + offset, 55 + offset, 0, 10);
        } else {
            if (
                cell("Integrity", 53 + offset, 0)?.userEnteredValue
                    ?.stringValue !== "Critical source-row exceptions"
            )
                throw new Error("Integrity exception section moved");
            prepareRequests.push({
                insertDimension: {
                    inheritFromBefore: true,
                    range: {
                        dimension: "ROWS",
                        endIndex: 55 + offset,
                        sheetId: meta("Integrity").properties.sheetId,
                        startIndex: 53 + offset,
                    },
                },
            });
        }
        for (const index of additions.keys()) {
            for (const item of integrityEntries) {
                const formula = item.cell.userEnteredValue?.formulaValue;
                if (formula !== undefined && item.row === 52 + offset) {
                    const shifted = shiftInventoryRow(
                        formula,
                        baseCount + 1,
                        baseCount + 2 + index
                    );
                    const formulaValue = extendFormula(shifted);
                    valueRequests.push(
                        update(
                            meta("Integrity").properties.sheetId,
                            53 + offset + index,
                            item.column,
                            { formulaValue }
                        )
                    );
                }
            }
        }
    }
    expandIntegrityRows();
    prepareRequests.push(
        ...buildInventoryMetadataRequests(metadata, baseCount)
    );
    /**
     * @param {string} title @param {number} sourceStart @param {number}
     *   targetStart @param {number} width @param {string} id
     */
    function copyHelper(title, sourceStart, targetStart, width, id) {
        requireEmpty(
            title,
            0,
            meta(title).properties.gridProperties.rowCount,
            targetStart,
            targetStart + width
        );
        const sourceEntries = entries(sheet(title));
        for (const item of sourceEntries) {
            if (
                item.row >= 2 ||
                item.column < sourceStart ||
                item.column >= sourceStart + width ||
                item.cell.userEnteredValue === undefined
            )
                continue;
            const value = structuredClone(item.cell.userEnteredValue);
            if (value.formulaValue !== undefined)
                value.formulaValue = value.formulaValue.replaceAll(
                    "P30",
                    () => id
                );
            if (value.stringValue !== undefined)
                value.stringValue = value.stringValue.replaceAll(
                    "P30",
                    () => id
                );
            write(
                title,
                item.row,
                targetStart + item.column - sourceStart,
                value
            );
        }
    }
    /** @param {Addition} plant @param {number} index */
    function copyPlantPage(plant, index) {
        const row = baseCount + 1 + index;
        for (const item of templateEntries)
            if (item.cell.userEnteredValue) {
                const value = structuredClone(item.cell.userEnteredValue);
                if (value.formulaValue !== undefined)
                    value.formulaValue = extendFormula(value.formulaValue)
                        .replaceAll("P30", () => plant.id)
                        .replaceAll("202609300", () => String(plant.sheetId))
                        .replaceAll(
                            /(?<prefix>(?:'Plant tracker'|Baselines)!\$?[A-Z]{1,3}\$?)31\b/gv,
                            (_match, prefix) => `${String(prefix)}${row + 1}`
                        );
                if (value.formulaValue !== undefined)
                    value.formulaValue = rebaseIntervalRange(
                        value.formulaValue,
                        index,
                        baseCount
                    );
                if (
                    item.row === 140 &&
                    item.column === 0 &&
                    value.formulaValue !== undefined
                )
                    value.formulaValue = `=IF(COUNTIFS(History!$B$2:$B$5000,"${plant.id}",History!$A$2:$A$5000,"<>")=0,"",${value.formulaValue.slice(1)})`;
                valueRequests.push(
                    update(plant.sheetId, item.row, item.column, value)
                );
            }
    }
    function appendContainers() {
        for (const [index, plant] of additions.entries()) {
            const row = baseCount + 1 + index;
            const guideUrl = plantGuideUrl(plant);
            const next = additionAt(additions, 1);
            for (const [column, value] of [
                [0, plant.id],
                [1, plant.name],
                [2, plant.contents],
                [13, `=HYPERLINK("${guideUrl}","Open")`],
                [14, plant.label],
                [27, plant.pot],
                [28, plant.details],
                [29, ""],
                [30, plant.source],
            ])
                write(
                    trackerSheet,
                    row,
                    Number(column),
                    entered(String(value))
                );
            write("Baselines", row, 1, entered(plant.name));
            // Initial metadata is not a Repot observation or a fabricated date.
            write(
                "Baselines",
                row,
                17,
                entered(
                    "=IFNA(INDEX(SORT(FILTER({History!$A$2:$A$5000,History!$AH$2:$AH$5000}," +
                        `History!$B$2:$B$5000=$A${row + 1},History!$K$2:$K$5000=$T${row + 1},History!$AH$2:$AH$5000<>"",History!$AJ$2:$AJ$5000<>"Removed"),1,FALSE),1,2),IF($T${row + 1}=1,"${plant.medium ?? "Molly's Succulent Mix"}","Not recorded"))`
                )
            );
            write(
                "Baselines",
                row,
                19,
                entered(
                    `=MAX(1,IFNA(MAX(FILTER(History!$K$2:$K$5000,History!$B$2:$B$5000="${plant.id}",History!$AJ$2:$AJ$5000<>"Removed")),1))`
                )
            );
            write(
                "Dashboard",
                36 + offset + index,
                0,
                entered(`=HYPERLINK("#gid=${plant.sheetId}","View")`)
            );
            const color = [...palette, ...activePalette].find(
                (entry) => entry.id === plant.id
            );
            if (!color) throw new Error(`Missing color for ${plant.id}`);
            for (const [column, value] of [
                [0, plant.id],
                [1, plant.name],
                [2, color.name],
                [3, color.hex],
                [5, `=HYPERLINK("#gid=${plant.sheetId}","Open charts")`],
            ])
                write(
                    "Plant colors",
                    34 + offset + index,
                    Number(column),
                    entered(String(value))
                );
            prepareRequests.push({
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            backgroundColorStyle: {
                                rgbColor: plantColor(plant.id),
                            },
                        },
                    },
                    fields: "userEnteredFormat.backgroundColorStyle",
                    range: {
                        endColumnIndex: 5,
                        endRowIndex: 35 + offset + index,
                        sheetId: meta("Plant colors").properties.sheetId,
                        startColumnIndex: 4,
                        startRowIndex: 34 + offset + index,
                    },
                },
            });
            copyPlantPage(plant, index);
            valueRequests.push(
                update(
                    plant.sheetId,
                    0,
                    0,
                    entered(`${plant.id} · ${plant.name}`)
                ),
                update(plant.sheetId, 1, 0, entered(plant.contents)),
                update(
                    plant.sheetId,
                    2,
                    3,
                    entered(`=HYPERLINK("${guideUrl}","Open field guide ↗")`)
                ),
                update(
                    plant.sheetId,
                    2,
                    6,
                    entered(
                        index === 0
                            ? `=HYPERLINK("#gid=${next.sheetId}","Next · ${next.id} →")`
                            : '=HYPERLINK("#gid=261928558","Next · P01 →")'
                    )
                )
            );
            // Three-column watering helper and cycle-comparison helper append at end.
            for (const [
                title,
                sourceStart,
                targetStart,
                width,
            ] of [
                [
                    intervalSheet,
                    87,
                    90 + offset * 3 + index * 3,
                    3,
                ],
                [
                    analyticsSheet,
                    97,
                    100 + offset * 3 + index * 3,
                    3,
                ],
                [
                    colorDataSheet,
                    94,
                    133 + offset * 4 + index * 4,
                    3,
                ],
                [
                    colorDataSheet,
                    126,
                    136 + offset * 4 + index * 4,
                    1,
                ],
            ]) {
                copyHelper(
                    String(title),
                    Number(sourceStart),
                    Number(targetStart),
                    Number(width),
                    plant.id
                );
            }
            write(
                "App bulk",
                0,
                bulkStartColumn + index,
                entered(`${plant.id} weight (g)`)
            );
        }
    }
    appendContainers();
    requireEmpty(
        "App bulk",
        0,
        meta("App bulk").properties.gridProperties.rowCount,
        bulkStartColumn,
        bulkStartColumn + 2
    );
    write(
        lastPage.properties.title,
        2,
        6,
        entered(
            `=HYPERLINK("#gid=${additionAt(additions, 0).sheetId}","Next · ${additionAt(additions, 0).id} →")`
        )
    );
    // Extend the existing error scan to both new pages and appended helper cells.
    const integrity = cell("Integrity", 11, 1)?.userEnteredValue?.formulaValue;
    write("Integrity", 11, 1, {
        formulaValue: expandedIntegrityFormula(integrity, additions, baseCount),
    });
    // App entries retain every staged observation; only their ID dropdown grows.
    prepareRequests.push({
        setDataValidation: {
            range: {
                endColumnIndex: 3,
                endRowIndex:
                    meta(appEntriesSheet).properties.gridProperties.rowCount,
                sheetId: meta(appEntriesSheet).properties.sheetId,
                startColumnIndex: 2,
                startRowIndex: 1,
            },
            rule: {
                condition: {
                    type: "ONE_OF_LIST",
                    values: [
                        ...existingIds,
                        ...additions.map((plant) => plant.id),
                    ].map((userEnteredValue) => ({ userEnteredValue })),
                },
                showCustomUi: true,
                strict: true,
            },
        },
    });
    expandHelperFormatting(meta, prepareRequests, bulkStartColumn, baseCount);
    /** @param {Sheet} current @param {Record<string, unknown>} protection */
    function expandProtection(current, protection) {
        const range = structuredClone(record(protection["range"]));
        const title = current.properties.title;
        if (
            title === intervalSheet &&
            range["endColumnIndex"] === 90 + offset * 3
        )
            range["endColumnIndex"] = 96 + offset * 3;
        if (
            title === analyticsSheet &&
            range["endColumnIndex"] === 100 + offset * 3
        )
            range["endColumnIndex"] = 106 + offset * 3;
        if (
            title === colorDataSheet &&
            range["endColumnIndex"] === 133 + offset * 4
        )
            range["endColumnIndex"] = 141 + offset * 4;
        if (title === calculationSheet && range["endRowIndex"] === 32 + offset)
            range["endRowIndex"] = 34 + offset;
        if (JSON.stringify(range) === JSON.stringify(protection["range"]))
            return;
        prepareRequests.push({
            updateProtectedRange: {
                fields: "range",
                protectedRange: {
                    protectedRangeId: protection["protectedRangeId"],
                    range,
                },
            },
        });
    }
    function expandProtections() {
        for (const current of metadata.sheets) {
            const protections = records(current["protectedRanges"]);
            for (const protection of protections)
                expandProtection(current, protection);
        }
    }
    expandProtections();
    function expandExistingCharts() {
        for (const current of metadata.sheets) {
            if (current.charts === undefined) continue;
            for (const source of current.charts) {
                const chart = structuredClone(source);
                const before = JSON.stringify(chart.spec);
                extendChartInventory(
                    chart.spec,
                    metadata,
                    additions,
                    baseCount
                );
                if (JSON.stringify(chart.spec) !== before)
                    chartRequests.push({
                        updateChartSpec: {
                            chartId: chart.chartId,
                            spec: chart.spec,
                        },
                    });
            }
        }
    }
    expandExistingCharts();
    if (baseCount === 32)
        compactEnrollmentCharts(
            metadata,
            chartRequests,
            prepareRequests,
            write,
            requireEmpty,
            cell
        );
    const quickLog = meta("Quick log");
    return {
        baseCount,
        capturedSnapshotDigest: inventorySnapshotDigest(
            sourceSnapshot(snapshots)
        ),
        chartRequests,
        emptyRanges,
        metadataDigest: inventorySnapshotDigest(metadata),
        newPageChartFinalizationRequired: true,
        postValueRequests: headerFormatRequests(quickLog, cell, baseCount),
        preconditions,
        prepareRequests: orderedPreparationRequests(prepareRequests),
        validationPreconditions,
        valueRequests,
    };
}

/**
 * Extend only explicit inventory ranges. History limits and unrelated 31s stay
 * intact.
 *
 * @param {string} formula @param {number} [baseCount]
 */
export function extendInventoryFormula(formula, baseCount = 30) {
    return formula.replaceAll(
        /(?<reference>!\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?)(?<end>31|33|36|38)(?!\d)/gv,
        (match, reference, end, offset) => {
            const before = formula.slice(0, Number(offset));
            const name = [...boundedSheets, "Dashboard"].find(
                (title) =>
                    before.endsWith(`'${title}'`) || before.endsWith(title)
            );
            if (name === undefined) return match;
            const row = Number(end);
            if (
                (row === baseCount + 1 && boundedSheets.has(name)) ||
                (name === "Dashboard" && row === baseCount + 6)
            )
                return `${String(reference)}${row + 2}`;
            return match;
        }
    );
}

/**
 * Resolve new chart IDs after duplicateSheet. No existing chart is returned.
 *
 * @param {NativeSnapshot} metadata
 * @param {Addition[]} [additions]
 * @param {number} [baseCount]
 */
export function finalizeInventoryPageCharts(
    metadata,
    additions = inventoryAdditions,
    baseCount = 30
) {
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    for (const [index, plant] of additions.entries()) {
        const page = metadata.sheets.find(
            (sheet) => sheet.properties.sheetId === plant.sheetId
        );
        if (page?.charts?.length !== 4)
            throw new Error(`Expected four duplicated charts on ${plant.id}`);
        for (const source of page.charts) {
            const chart = structuredClone(source);
            restoreTemplateChart(chart, metadata, plant.sheetId);
            const title = chart.spec["title"];
            if (typeof title !== "string")
                throw new Error("Missing chart title");
            chart.spec["title"] = title
                .replaceAll("P30", () => plant.id)
                .replaceAll("Tiny mixed succulent planter", () => plant.name);
            patchNewChart(chart.spec, index, plant.id, baseCount);
            if (baseCount === 32 && title === "Time between waterings")
                // Updating a duplicated chart leaves the template alt text in
                // native Sheets. Recreate only this newly enrolled chart with
                // its same ID, position, border, and complete rebound spec.
                requests.push(
                    { deleteEmbeddedObject: { objectId: chart.chartId } },
                    { addChart: { chart } }
                );
            else
                requests.push({
                    updateChartSpec: {
                        chartId: chart.chartId,
                        spec: chart.spec,
                    },
                });
        }
    }
    return requests;
}

/** @param {unknown} value */
export function inventorySnapshotDigest(value) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** @param {string} formula @param {number} sourceRow @param {number} targetRow */
export function shiftInventoryRow(formula, sourceRow, targetRow) {
    // Double-quoted strings contain IDs, URLs, and prose, never relative cells.
    return formula
        .split(/(?<quoted>"(?:[^"]|"")*")/v)
        .map((part, index) =>
            index % 2
                ? part
                : part.replaceAll(
                      /(?<column>\$?[A-Z]{1,3})(?<absolute>\$?)(?<row>\d+)\b/gv,
                      (match, column, absolute, row) =>
                          absolute === "" && Number(row) === sourceRow
                              ? `${String(column)}${targetRow}`
                              : match
                  )
        )
        .join("");
}
/**
 * Recheck captured destinations and formulas immediately before preparation.
 *
 * @param {ReturnType<typeof buildInventoryExpansion>} plan
 * @param {NativeSnapshot} metadata
 * @param {NativeSnapshot[]} snapshots
 */
export function verifyInventoryExpansionPreconditions(
    plan,
    metadata,
    snapshots
) {
    if (plan.metadataDigest !== inventorySnapshotDigest(metadata))
        throw new Error("Native metadata changed since planning");
    const sheets = sheetMap(snapshots);
    for (const expected of plan.validationPreconditions) {
        const source = sheets.get(expected.sheet);
        if (source === undefined)
            throw new Error(`Missing fresh snapshot: ${expected.sheet}`);
        const actual = entries(source).find(
            (item) =>
                item.row === expected.row && item.column === expected.column
        )?.cell.dataValidation;
        if (JSON.stringify(actual) !== JSON.stringify(expected.rule))
            throw new Error(`Changed validation: ${expected.sheet}`);
    }
    for (const expected of plan.preconditions) {
        const source = sheets.get(expected.sheet);
        if (!source)
            throw new Error(`Missing fresh snapshot: ${expected.sheet}`);
        const actual =
            entries(source).find(
                (item) =>
                    item.row === expected.row && item.column === expected.column
            )?.cell.userEnteredValue ?? {};
        if (JSON.stringify(actual) !== JSON.stringify(expected.value))
            throw new Error(
                `Changed formula/value: ${expected.sheet} row ${expected.row + 1} column ${expected.column + 1}`
            );
    }
    for (const range of plan.emptyRanges) {
        const source = sheets.get(range.sheet);
        if (!source) throw new Error(`Missing fresh snapshot: ${range.sheet}`);
        if (
            entries(source).some(
                ({ cell, column, row }) =>
                    row >= range.startRow &&
                    row < range.endRow &&
                    column >= range.startColumn &&
                    column < range.endColumn &&
                    (cell.userEnteredValue !== undefined ||
                        cell.effectiveValue !== undefined)
            )
        )
            throw new Error(`Occupied destination: ${range.sheet}`);
    }
    if (
        plan.capturedSnapshotDigest !==
        inventorySnapshotDigest(sourceSnapshot(snapshots))
    )
        throw new Error("Captured source cells changed since planning");
    return true;
}
/** @param {Addition[]} additions @param {number} index */
function additionAt(additions, index) {
    const plant = additions[index];
    if (!plant) throw new Error("Inventory expansion requires two additions");
    return plant;
}

/**
 * @param {unknown[]} series @param {Addition[]} additions @param {number}
 *   baseCount
 */
function appendColoredSeries(series, additions, baseCount) {
    const text = JSON.stringify(series.at(-1));
    if (
        !text.includes('"sheetId":907202603') &&
        !text.includes('"sheetId":907202608')
    )
        return;
    const width = series.length === baseCount * 3 ? 3 : 1;
    const originals = series.slice(-width);
    for (const [index, plant] of additions.entries()) {
        for (const [offset, original] of originals.entries())
            series.push(
                expandedSeries(
                    original,
                    index,
                    plant.id,
                    offset,
                    width,
                    baseCount
                )
            );
    }
}

/**
 * @param {(title: string, row: number, column: number) => Cell | undefined} cell
 * @param {(title: string) => Sheet} sheet
 * @param {Addition[]} additions
 */
function assertCurrentEnrollment(cell, sheet, additions) {
    assertNewIdentitiesUnused(sheet, additions);
    for (const [column, expected] of [
        [54, "P31 weight (g)"],
        [55, "P32 weight (g)"],
        [56, "P33 weight (g)"],
        [57, "P34 weight (g)"],
    ]) {
        if (
            cell("App bulk", 0, Number(column))?.userEnteredValue
                ?.stringValue !== expected
        )
            throw new Error("Current App bulk identity headers changed");
    }
    for (const title of [
        "History",
        appEntriesSheet,
        "App bulk",
        "RO refills",
    ]) {
        const source = sheet(title);
        if (!hasCompleteSourceRows(source))
            throw new Error(`Missing complete source rows: ${title}`);
    }
}

/**
 * @param {(title: string, row: number, column: number) => Cell | undefined} cell
 * @param {string[]} expectedIds
 */
function assertEntryValidation(cell, expectedIds) {
    if (
        cell(appEntriesSheet, 0, 2)?.userEnteredValue?.stringValue !==
        "Plant ID"
    )
        throw new Error("App entries Plant ID header changed");
    const entryValidation = record(cell(appEntriesSheet, 1, 2)?.dataValidation);
    const entryCondition = record(entryValidation["condition"]);
    const entryIds = records(entryCondition["values"]).map(
        (value) => value["userEnteredValue"]
    );
    if (
        entryCondition["type"] !== "ONE_OF_LIST" ||
        JSON.stringify(entryIds) !== JSON.stringify(expectedIds)
    )
        throw new Error("App entries Plant ID validation changed");
    return entryValidation;
}

/**
 * @param {NativeSnapshot} metadata @param {(title: string, row: number, column:
 *   number) => Cell | undefined} cell @param {(title: string) => Sheet} meta
 * @param {Addition[]} additions @param {number} bulkStartColumn @param
 *   {string[]} existingIds
 */
function assertInventorySources(
    metadata,
    cell,
    meta,
    additions,
    bulkStartColumn,
    existingIds
) {
    for (const plant of additions)
        if (
            metadata.sheets.some(
                (item) =>
                    item.properties.sheetId === plant.sheetId ||
                    item.properties.title.startsWith(`${plant.id} `)
            )
        )
            throw new Error(
                `${plant.id} already exists; do not replay expansion`
            );
    for (let i = 1; i <= existingIds.length; i += 1)
        for (const title of [trackerSheet, "Baselines"])
            if (
                cell(title, i, 0)?.userEnteredValue?.stringValue !==
                existingIds[i - 1]
            )
                throw new Error(
                    `Expected ordered ${existingIds.length}-pot inventory: ${title} row ${i + 1}`
                );
    const template = meta("P30 Mixed succulent");
    if (template.charts?.length !== 4)
        throw new Error("P30 template must retain four charts");
    if (
        cell(
            "P30 Mixed succulent",
            140,
            0
        )?.userEnteredValue?.formulaValue?.includes('plant,"P30"') !== true
    )
        throw new Error("P30 uninterrupted history anchor changed");
    if (
        meta("App bulk").properties.gridProperties.columnCount !==
        bulkStartColumn
    )
        throw new Error(`Expected ${bulkStartColumn}-column App bulk schema`);
    const entryValidation = assertEntryValidation(cell, existingIds);
    const validationPreconditions = [
        {
            column: 2,
            row: 1,
            rule: structuredClone(entryValidation),
            sheet: appEntriesSheet,
        },
    ];

    return { template, validationPreconditions };
}

/** @param {(title: string) => Sheet} sheet @param {Addition[]} additions */
function assertNewIdentitiesUnused(sheet, additions) {
    const newIds = new Set(additions.map((plant) => plant.id));
    const newLabels = new Set(additions.map((plant) => plant.label));
    for (const [title, idColumn] of [
        ["History", 1],
        [appEntriesSheet, 2],
        ["App bulk", 4],
        [trackerSheet, 14],
    ]) {
        const identities = title === trackerSheet ? newLabels : newIds;
        const isFound = entries(sheet(String(title))).some(
            ({ cell, column, row }) =>
                row > 0 &&
                column === idColumn &&
                (cell.userEnteredValue?.stringValue ?? "")
                    .split(/[,;]/v)
                    .some((id) => identities.has(id.trim()))
        );
        if (isFound)
            throw new Error(
                `New identity already appears in ${String(title)}; review enrollment`
            );
    }
}

/** @param {Sheet | undefined} raw @param {Sheet} target @param {boolean} isColor */
function assertSelectedRoleCapacity(raw, target, isColor) {
    if (
        raw === undefined ||
        raw.properties.gridProperties.rowCount < 5000 ||
        raw.properties.gridProperties.columnCount < (isColor ? 29 : 4) ||
        target.properties.gridProperties.rowCount < 5001
    )
        throw new Error(
            "Selected-role helper requires verified source and sentinel rows"
        );
}

/** @param {number} index */
function columnName(index) {
    let value = index + 1;
    let name = "";
    while (value > 0) {
        name = String.fromCodePoint(65 + ((value - 1) % 26)) + name;
        value = Math.floor((value - 1) / 26);
    }
    return name;
}

/**
 * Preserve every primary plant curve and two selected reference roles below
 * native Sheets' 99-series limit.
 *
 * @param {NativeSnapshot} metadata
 * @param {Record<string, unknown>[]} chartRequests
 * @param {Record<string, unknown>[]} prepareRequests
 * @param {(
 *     title: string,
 *     row: number,
 *     column: number,
 *     value: EnteredValue
 * ) => void} write
 * @param {(
 *     title: string,
 *     startRow: number,
 *     endRow: number,
 *     startColumn: number,
 *     endColumn: number
 * ) => void} requireEmpty
 * @param {(title: string, row: number, column: number) => Cell | undefined} cell
 */
function compactEnrollmentCharts(
    metadata,
    chartRequests,
    prepareRequests,
    write,
    requireEmpty,
    cell
) {
    const basicCharts = chartRequests.filter((request) =>
        isRecord(
            record(record(request["updateChartSpec"])["spec"])["basicChart"]
        )
    );
    for (const request of basicCharts) {
        const chart = record(request["updateChartSpec"]);
        const spec = record(chart["spec"]);
        const basic = record(spec["basicChart"]);
        const series = records(basic["series"]);
        if (series.length !== 102) continue;
        const seriesData = record(record(series[0])["series"]);
        const source = records(record(seriesData["sourceRange"])["sources"])[0];
        const target = metadata.sheets.find(
            (sheet) => sheet.properties.sheetId === source?.["sheetId"]
        );
        if (
            !target ||
            ![analyticsSheet, colorDataSheet].includes(target.properties.title)
        )
            throw new Error("Unexpected oversized selected-plant chart source");
        const isColor = target.properties.title === colorDataSheet;
        const startColumn = isColor ? 149 : 112;
        const rawTitle = isColor ? dryDownSheet : analyticsSheet;
        const raw = metadata.sheets.find(
            (sheet) => sheet.properties.title === rawTitle
        );
        assertSelectedRoleCapacity(raw, target, isColor);
        if (isColor) expandLegacyDryDownBounds(cell, write);
        requireEmpty(
            target.properties.title,
            0,
            5001,
            startColumn,
            startColumn + 2
        );
        let appended = 0;
        const appends = prepareRequests.filter(
            (current) => current["appendDimension"] !== undefined
        );
        for (const current of appends) {
            const append = record(current["appendDimension"]);
            if (
                append["sheetId"] === target.properties.sheetId &&
                append["dimension"] === "COLUMNS"
            )
                appended += Number(append["length"]);
        }
        const missing =
            startColumn +
            2 -
            target.properties.gridProperties.columnCount -
            appended;
        if (missing > 0)
            prepareRequests.push({
                appendDimension: {
                    dimension: "COLUMNS",
                    length: missing,
                    sheetId: target.properties.sheetId,
                },
            });
        const protectionRequests = prepareRequests.filter(
            (current) => current["updateProtectedRange"] !== undefined
        );
        for (const current of protectionRequests) {
            const protection = record(
                record(current["updateProtectedRange"])["protectedRange"]
            );
            const range = record(protection["range"]);
            if (
                range["sheetId"] === target.properties.sheetId &&
                range["endColumnIndex"] === startColumn
            )
                range["endColumnIndex"] = startColumn + 2;
        }
        const roles = series.slice(1, 3).map((entry, index) => {
            const column = startColumn + index;
            const rawColumn = columnName((isColor ? 27 : 2) + index);
            const values = `'${rawTitle}'!${rawColumn}2:${rawColumn}5000`;
            const roleSource = records(
                record(record(entry["series"])["sourceRange"])["sources"]
            )[0];
            const sourceFormula = cell(
                target.properties.title,
                1,
                Number(roleSource?.["startColumnIndex"])
            )?.userEnteredValue?.formulaValue?.replaceAll("$", "");
            const expectedReference = values;
            if (
                sourceFormula?.includes(`ISNUMBER(${expectedReference})`) !==
                true
            )
                throw new Error("Selected-role source formula changed");
            const label = isColor
                ? index === 0
                    ? "Selected dry reference"
                    : "Selected wet reference"
                : index === 0
                  ? "Selected previous cycle"
                  : "Selected older cycles";
            write(target.properties.title, 0, column, { stringValue: label });
            write(target.properties.title, 1, column, {
                formulaValue: sharedSelectedRoleFormula(values),
            });
            const role = structuredClone(entry);
            role["series"] = {
                sourceRange: {
                    sources: [
                        {
                            endColumnIndex: column + 1,
                            endRowIndex: 5001,
                            sheetId: target.properties.sheetId,
                            startColumnIndex: column,
                            startRowIndex: 0,
                        },
                    ],
                },
            };
            return role;
        });
        basic["series"] = compactSelectedPlantSeries(
            typedEnrollmentSeries(series.filter((_, index) => index % 3 === 0)),
            typedEnrollmentSeries(roles)
        );
        spec["subtitle"] = isColor
            ? "Plant-colored solid circles: measured • neutral dotted diamonds: dry • neutral dashed squares: wet"
            : "Plant-colored solid circles: current • neutral dotted diamonds: previous • neutral dashed squares: older • same pot setup";
    }
}

/** @param {string | number | boolean} value @returns {EnteredValue} */
function entered(value) {
    if (typeof value === "number") return { numberValue: value };
    if (typeof value === "boolean") return { boolValue: value };
    return value.startsWith("=")
        ? { formulaValue: value }
        : { stringValue: value };
}

/** @param {Sheet} sheet */
function entries(sheet) {
    if (sheet.data === undefined) return [];
    return sheet.data.flatMap((block) => {
        if (block.rowData === undefined) return [];
        return block.rowData.flatMap((row, ri) => {
            if (row.values === undefined) return [];
            return row.values.flatMap((cell, ci) => {
                if (
                    cell.userEnteredValue === undefined &&
                    cell.effectiveValue === undefined &&
                    cell.dataValidation === undefined
                )
                    return [];
                return [
                    {
                        cell,
                        column: (block.startColumn ?? 0) + ci,
                        row: (block.startRow ?? 0) + ri,
                    },
                ];
            });
        });
    });
}

/**
 * @param {string | undefined} integrity @param {Addition[]} additions @param
 *   {number} baseCount
 */
function expandedIntegrityFormula(integrity, additions, baseCount) {
    if (integrity?.startsWith("=SUM(") !== true)
        throw new Error("Integrity formula-error anchor changed");
    const offset = baseCount - 30;
    const scan = additions
        .map(
            (plant) =>
                `SUM(ARRAYFORMULA(N(ISERROR('${plant.title}'!A1:INDEX('${plant.title}'!V1:V5139,140+MAX(1,COUNTIF(History!$B$2:$B$5000,"${plant.id}")))))))`
        )
        .join(",");
    const helperScans = [
        `'Watering intervals'!${columnName(90 + offset * 3)}1:${columnName(95 + offset * 3)}5000`,
        `'Plant color data'!${columnName(133 + offset * 4)}1:${columnName(140 + offset * 4)}5001`,
        `'Workbook analytics'!${columnName(100 + offset * 3)}1:${columnName(105 + offset * 3)}5001`,
        `'Workbook calculations'!A${33 + offset}:F${34 + offset}`,
    ]
        .map((range) => `SUM(ARRAYFORMULA(N(ISERROR(${range}))))`)
        .filter((term) => !integrity.includes(term));
    return `${extendInventoryFormula(integrity, baseCount).slice(0, -1)},${[scan, ...helperScans].join(",")})`;
}

/**
 * @param {unknown} original @param {number} index @param {string} id @param
 *   {number} offset @param {number} width @param {number} baseCount
 */
function expandedSeries(original, index, id, offset, width, baseCount) {
    const next = structuredClone(record(original));
    const data = record(next["series"]);
    const source = record(data["sourceRange"]);
    const ranges = records(source["sources"]);
    const first = ranges[0];
    if (first === undefined || typeof first["startColumnIndex"] !== "number")
        throw new Error("Missing chart column");
    const column =
        first["sheetId"] === 907_202_608
            ? 100 + (baseCount - 30) * 3 + index * 3 + offset
            : width === 3
              ? 133 + (baseCount - 30) * 4 + index * 4 + offset
              : 136 + (baseCount - 30) * 4 + index * 4;
    const difference = column - first["startColumnIndex"];
    for (const range of ranges) {
        if (
            typeof range["startColumnIndex"] !== "number" ||
            typeof range["endColumnIndex"] !== "number"
        )
            throw new Error("Invalid chart columns");
        range["startColumnIndex"] += difference;
        range["endColumnIndex"] += difference;
    }
    next["colorStyle"] = { rgbColor: plantColor(id) };
    delete next["color"];
    return next;
}

/**
 * @param {(title: string) => Sheet} meta @param {Record<string, unknown>[]}
 *   prepareRequests @param {number} bulkStartColumn @param {number} baseCount
 */
function expandHelperFormatting(
    meta,
    prepareRequests,
    bulkStartColumn,
    baseCount
) {
    const offset = baseCount - 30;
    // Fill the newly appended helper columns with their existing number formats.
    for (const [
        title,
        sourceStart,
        targetStart,
        width,
    ] of [
        [
            intervalSheet,
            87,
            90 + offset * 3,
            6,
        ],
        [
            analyticsSheet,
            97,
            100 + offset * 3,
            6,
        ],
        [
            colorDataSheet,
            94,
            133 + offset * 4,
            8,
        ],
        [
            "App bulk",
            35,
            bulkStartColumn,
            2,
        ],
    ]) {
        const sheetId = meta(String(title)).properties.sheetId;
        prepareRequests.push({
            copyPaste: {
                destination: {
                    endColumnIndex: Number(targetStart) + Number(width),
                    endRowIndex: meta(String(title)).properties.gridProperties
                        .rowCount,
                    sheetId,
                    startColumnIndex: Number(targetStart),
                    startRowIndex: 0,
                },
                pasteType: "PASTE_FORMAT",
                source: {
                    endColumnIndex:
                        Number(sourceStart) +
                        ([analyticsSheet, intervalSheet].includes(String(title))
                            ? 3
                            : 1),
                    endRowIndex: meta(String(title)).properties.gridProperties
                        .rowCount,
                    sheetId,
                    startColumnIndex: Number(sourceStart),
                    startRowIndex: 0,
                },
            },
        });
    }
}

/**
 * Extend only the twelve captured legacy helper anchors. Their exact original
 * formulas remain preconditions; quoted strings and qualified ranges stay
 * intact.
 *
 * @param {(title: string, row: number, column: number) => Cell | undefined} cell
 * @param {(
 *     title: string,
 *     row: number,
 *     column: number,
 *     value: EnteredValue
 * ) => void} write
 */
function expandLegacyDryDownBounds(cell, write) {
    const anchors = [
        [1, 25],
        [1, 27],
        [1, 28],
        [1, 30],
        ...[
            41,
            81,
            121,
            161,
            201,
            241,
            281,
            321,
        ].map((row) => [row, 0]),
    ];
    for (const [row, column] of anchors) {
        if (row === undefined || column === undefined)
            throw new Error("Missing legacy helper coordinate");
        const before = cell(dryDownSheet, row, column)?.userEnteredValue
            ?.formulaValue;
        if (before === undefined || before === "")
            throw new Error("Missing captured legacy dry-down helper formula");
        const after = before
            .split(/(?<quoted>"(?:[^"]|"")*")/v)
            .map((part, index) =>
                index % 2
                    ? part
                    : part.replaceAll(
                          /(?<![\w!$'])(?<start>\$?(?<column>[A-W])\$?2:\$?\k<column>\$?)31(?!\d)/gv,
                          "$<start>35"
                      )
            )
            .join("");
        if (after === before)
            throw new Error("Legacy dry-down helper bounds changed");
        write(dryDownSheet, row, column, { formulaValue: after });
    }
}

/**
 * @param {ExpansionOptions} options @param {Addition[]} additions @param
 *   {number} bulkStartColumn
 */
function expansionRoster(options, additions, bulkStartColumn) {
    const existingIds =
        options.existingIds ??
        Array.from(
            { length: 30 },
            (_, index) => `P${String(index + 1).padStart(2, "0")}`
        );
    const baseCount = existingIds.length;
    const uniqueIds = new Set(
        Iterator.concat(
            existingIds,
            additions.map((plant) => plant.id)
        )
    );
    if (
        ![30, 32].includes(baseCount) ||
        additions.length !== 2 ||
        existingIds.some(
            (id, index) => id !== `P${String(index + 1).padStart(2, "0")}`
        ) ||
        uniqueIds.size !== baseCount + 2
    )
        throw new Error(
            "Expected an ordered 30- or 32-pot roster and two distinct new IDs"
        );
    if (
        baseCount === 32 &&
        (bulkStartColumn !== 58 ||
            additions.some((plant) => ["P33", "P34"].includes(plant.id)))
    )
        throw new Error(
            "Current enrollment must preserve retired P33/P34 and append after 58 bulk columns"
        );
    return existingIds;
}

/**
 * @param {unknown} value @param {NativeSnapshot} metadata @param {Addition[]}
 *   additions @param {number} baseCount
 */
function extendChartInventory(value, metadata, additions, baseCount) {
    walkRecords(value, (item) => {
        const title = metadata.sheets.find(
            (sheet) => sheet.properties.sheetId === item["sheetId"]
        )?.properties.title;
        if (title !== undefined) extendChartRange(item, title, baseCount);
        const overrides = item["styleOverrides"];
        if (Array.isArray(overrides) && overrides.length === baseCount) {
            for (const [index, plant] of additions.entries())
                overrides.push({
                    colorStyle: { rgbColor: plantColor(plant.id) },
                    index: baseCount + index,
                });
        }
        const series = item["series"];
        if (
            Array.isArray(series) &&
            [baseCount, baseCount * 3].includes(series.length)
        )
            appendColoredSeries(series, additions, baseCount);
    });
}

/**
 * @param {Record<string, unknown>} item @param {string} title @param {number}
 *   baseCount
 */
function extendChartRange(item, title, baseCount) {
    if (
        title === colorDataSheet &&
        typeof item["startRowIndex"] === "number" &&
        typeof item["endRowIndex"] === "number" &&
        item["endRowIndex"] - item["startRowIndex"] === baseCount + 1
    ) {
        item["endRowIndex"] += 2;
        return;
    }
    if (item["endRowIndex"] === baseCount + 1 && boundedSheets.has(title))
        item["endRowIndex"] = baseCount + 3;
    if (title === "Dashboard" && item["endRowIndex"] === baseCount + 6)
        item["endRowIndex"] = baseCount + 8;
}
/** @param {Sheet} source */
function hasCompleteSourceRows(source) {
    const intervals = (source.data ?? [])
        .filter((block) => (block.startColumn ?? 0) === 0)
        .map((block) => ({
            end: (block.startRow ?? 0) + (block.rowData?.length ?? 0),
            start: block.startRow ?? 0,
        }))
        .toSorted((left, right) => left.start - right.start);
    let end = 0;
    for (const interval of intervals) {
        if (interval.start > end) return false;
        end = Math.max(end, interval.end);
    }
    return end === source.properties.gridProperties.rowCount;
}
/**
 * @param {Sheet} quickLog
 * @param {(title: string, row: number, column: number) => Cell | undefined} cell
 * @param {number} baseCount
 */
function headerFormatRequests(quickLog, cell, baseCount) {
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    if (baseCount === 32 && records(quickLog["tables"]).length > 0) {
        // Extending the native table clears explicit colors on its two newer
        // headers. Restore their captured formats after the format copies.
        for (const columnIndex of [13, 14]) {
            const userEnteredFormat = cell(
                "Quick log",
                3,
                columnIndex
            )?.userEnteredFormat;
            if (!userEnteredFormat)
                throw new Error("Missing Quick log header format snapshot");
            requests.push({
                updateCells: {
                    fields: "userEnteredFormat",
                    rows: [{ values: [{ userEnteredFormat }] }],
                    start: {
                        columnIndex,
                        rowIndex: 3,
                        sheetId: quickLog.properties.sheetId,
                    },
                },
            });
        }
    }
    return requests;
}

/** @param {number} column */
function intervalChartSource(column) {
    return {
        sourceRange: {
            sources: [
                {
                    endColumnIndex: column + 1,
                    endRowIndex: 5000,
                    sheetId: 907_202_605,
                    startColumnIndex: column,
                    startRowIndex: 0,
                },
            ],
        },
    };
}

/**
 * Native format copying can expand banding and overwrite swatches. Resize
 * banding first, copy formats second, and apply the new palette colors last.
 *
 * @param {Record<string, unknown>[]} prepareRequests
 */
function orderedPreparationRequests(prepareRequests) {
    return [
        ...prepareRequests.filter(
            (request) =>
                request["copyPaste"] === undefined &&
                request["repeatCell"] === undefined
        ),
        ...prepareRequests.filter(
            (request) => request["copyPaste"] !== undefined
        ),
        // Row-format copies include the old swatch background. Apply the
        // two new palette colors after those copies so they remain visible.
        ...prepareRequests.filter(
            (request) => request["repeatCell"] !== undefined
        ),
    ];
}

/** @param {string} source */
function parseRecord(source) {
    const value = /** @type {unknown} */ (JSON.parse(source));
    return record(value);
}

/**
 * @param {Record<string, unknown>} basic @param {number} index @param {number}
 *   baseCount
 */
function patchIntervalChart(basic, index, baseCount) {
    const domainColumn = 91 + (baseCount - 30) * 3 + index * 3;
    basic["domains"] = [{ domain: intervalChartSource(domainColumn) }];
    basic["series"] = [
        {
            ...records(basic["series"])[0],
            series: intervalChartSource(domainColumn + 1),
            targetAxis: "LEFT_AXIS",
        },
    ];
}

/**
 * @param {Record<string, unknown>} spec @param {number} index @param {string}
 *   id @param {number} baseCount
 */
function patchNewChart(spec, index, id, baseCount) {
    const basic = record(spec["basicChart"]);
    if (typeof spec["altText"] === "string")
        spec["altText"] = spec["altText"].replaceAll("P30", () => id);
    if (spec["title"] === "Time between waterings")
        patchIntervalChart(basic, index, baseCount);
    const seriesEntries = records(basic["series"]);
    for (const series of seriesEntries) {
        series["colorStyle"] = { rgbColor: plantColor(id) };
        delete series["color"];
    }
    const axes = records(basic["axis"]);
    for (const axis of axes) {
        if (!isRecord(axis["viewWindowOptions"])) continue;
        delete axis["viewWindowOptions"]["viewWindowMin"];
        delete axis["viewWindowOptions"]["viewWindowMax"];
    }
}

/** @param {Addition} plant */
function plantGuideUrl(plant) {
    return (
        plant.guideUrl ??
        `https://nick2bad4u.github.io/Gardening/pots/${plant.id}/`
    );
}

/**
 * Rebase both endpoints; a reversed CO:CL reference is a multi-column range.
 *
 * @param {string} formula @param {number} index @param {number} baseCount
 * @param {number} [sourceColumn]
 */
function rebaseIntervalRange(formula, index, baseCount, sourceColumn = 89) {
    const column = columnName(92 + (baseCount - 30) * 3 + index * 3);
    const source = columnName(sourceColumn);
    /** @type {[string, string][]} */
    const replacements = [
        [`$${source}$2:$${source}$5000`, `$${column}$2:$${column}$5000`],
        [`${source}2:${source}5000`, `${column}2:${column}5000`],
        [`${source}$2:${source}$5000`, `${column}$2:${column}$5000`],
    ];
    let result = formula;
    for (const [from, destination] of replacements)
        result = result.replaceAll(
            `'Watering intervals'!${from}`,
            () => `'Watering intervals'!${destination}`
        );
    return result;
}

/** @param {unknown} value @returns {Record<string, unknown>} */
function record(value) {
    if (!isRecord(value)) throw new Error("Expected native object");
    return value;
}

/** @param {unknown} value @returns {Record<string, unknown>[]} */
function records(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error("Expected native array");
    return value.map((entry) => record(entry));
}

/**
 * Native Sheets omits empty series in reads. Restore the populated template
 * spec before updating so a metadata round trip cannot delete latent series.
 *
 * @param {{ spec: Record<string, unknown> }} chart
 * @param {NativeSnapshot} metadata @param {number} sheetId
 */
function restoreTemplateChart(chart, metadata, sheetId) {
    const template = metadata.sheets
        .find((sheet) => sheet.properties.sheetId === 202_609_300)
        ?.charts?.find(
            (candidate) => candidate.spec["title"] === chart.spec["title"]
        );
    if (template === undefined) return;
    chart.spec = structuredClone(template.spec);
    walkRecords(chart.spec, (entry) => {
        if (entry["sheetId"] === 202_609_300) entry["sheetId"] = sheetId;
    });
}
/** @param {NativeSnapshot[]} snapshots */
function sheetMap(snapshots) {
    /** @type {Map<string, Sheet>} */
    const result = new Map();
    for (const snapshot of snapshots)
        for (const sheet of snapshot.sheets)
            result.set(sheet.properties.title, sheet);
    return result;
}

/**
 * Compare entered evidence without volatile calculated clock values. @param
 * {NativeSnapshot[]} snapshots
 */
function sourceSnapshot(snapshots) {
    const copy = structuredClone(snapshots);
    walkRecords(copy, (item) => {
        delete item["effectiveValue"];
        delete item["formattedValue"];
        delete item["effectiveFormat"];
    });
    return copy;
}

/**
 * @param {Record<string, unknown>[]} series
 *
 * @returns {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorSeries[]}
 */
function typedEnrollmentSeries(series) {
    for (const entry of series) {
        const sources = records(
            record(record(entry["series"])["sourceRange"])["sources"]
        );
        if (
            sources.length !== 1 ||
            sources.some(
                (source) =>
                    [
                        "sheetId",
                        "startRowIndex",
                        "endRowIndex",
                        "startColumnIndex",
                        "endColumnIndex",
                    ].some((field) => !Number.isSafeInteger(source[field])) ||
                    source["startRowIndex"] !== 0 ||
                    source["endRowIndex"] !== 5001 ||
                    Number(source["endColumnIndex"]) !==
                        Number(source["startColumnIndex"]) + 1
            )
        )
            throw new Error("Invalid selected-role chart source binding");
    }
    return /** @type {import("../../test/plant-chart-colors-fixtures.d.ts").PlantColorSeries[]} */ (
        /** @type {unknown} */ (series)
    );
}

/**
 * @param {number} sheetId @param {number} row @param {number} column @param
 *   {EnteredValue} value
 */
function update(sheetId, row, column, value) {
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: [{ values: [{ userEnteredValue: value }] }],
            start: { columnIndex: column, rowIndex: row, sheetId },
        },
    };
}

/**
 * @param {unknown} value @param {(entry: Record<string, unknown>) => void}
 *   visit
 */
function walkRecords(value, visit) {
    if (Array.isArray(value)) {
        for (const entry of value) walkRecords(entry, visit);
        return;
    }
    if (!isRecord(value)) return;
    visit(value);
    for (const child of Object.values(value)) walkRecords(child, visit);
}
