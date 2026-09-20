import { createHash } from "node:crypto";

import { isRecord } from "../build-data.mjs";
import { buildInventoryMetadataRequests } from "./inventory-metadata.mjs";
// Historical September 19 enrollment palette, independent of the active roster.
const palette = [
    { hex: "#BD704B", id: "P31", name: "Terracotta" },
    { hex: "#A36591", id: "P32", name: "Mauve" },
];

/** @param {string} id */
function plantColor(id) {
    const color = palette.find((entry) => entry.id === id);
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
    "Dry-down insights",
    "Dry-down models",
    "Insights data",
    "Plant tracker",
]);

/**
 * Build the one-time 30-to-32 inventory expansion, without any remote writes.
 * Duplicate pages first, then apply values, verify native outputs, and only
 * then apply chart requests. Use finalizeInventoryPageCharts with fresh
 * metadata after duplication to discover Google's newly assigned chart IDs.
 *
 * @param {NativeSnapshot} metadata
 * @param {NativeSnapshot[]} snapshots
 */
export function buildInventoryExpansion(metadata, snapshots) {
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
        meta
    );

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
        for (const [index, plant] of inventoryAdditions.entries()) {
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
                    value.formulaValue = extendInventoryFormula(
                        shiftInventoryRow(
                            shiftInventoryRow(
                                value.formulaValue,
                                sourceRow + 1,
                                targetRow + 1
                            ),
                            31,
                            32 + index
                        )
                    ).replaceAll("P30", () => plant.id);
                if (value.formulaValue !== undefined)
                    value.formulaValue = rebaseIntervalRange(
                        value.formulaValue,
                        index
                    );
                if (value.stringValue?.includes("P30") === true)
                    value.stringValue = value.stringValue.replaceAll(
                        "P30",
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
        ])
            prepareRequests.push({
                appendDimension: {
                    dimension,
                    length,
                    sheetId: meta(String(title)).properties.sheetId,
                },
            });
        for (const [index, plant] of inventoryAdditions.entries())
            prepareRequests.push({
                duplicateSheet: {
                    insertSheetIndex:
                        (template.properties.index ?? 36) + index + 1,
                    newSheetId: plant.sheetId,
                    newSheetName: plant.title,
                    sourceSheetId: template.properties.sheetId,
                },
            });
    }
    prepareStructure();
    /** @param {Sheet} current @param {ReturnType<typeof entries>[number]} item */
    function expandCellReference(current, item) {
        const formula = item.cell.userEnteredValue?.formulaValue;
        if (formula !== undefined) {
            const next = extendInventoryFormula(formula);
            if (next !== formula)
                write(current.properties.title, item.row, item.column, {
                    formulaValue: next,
                });
        }
        if (item.cell.dataValidation === undefined) return;
        const before = JSON.stringify(item.cell.dataValidation);
        const after = extendInventoryFormula(before);
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
                "Plant tracker",
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
                "Dry-down insights",
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
            appendRows(String(title), Number(row), Number(start), Number(end));
        // Fixed-color comparisons occupy independent 35-row blocks; expand each
        // block in place without relocating the following blocks or any chart.
        for (const item of colorEntries)
            if (
                item.column === 0 &&
                item.cell.userEnteredValue?.stringValue === "P30"
            )
                appendRows(colorDataSheet, item.row, 0, 6);
        appendRows(colorDataSheet, 30, 127, 133);
    }
    appendDerivedRows();
    function expandIntegrityRows() {
        if (
            cell("Integrity", 53, 0)?.userEnteredValue?.stringValue !==
            "Critical source-row exceptions"
        )
            throw new Error("Integrity exception section moved");
        prepareRequests.push({
            insertDimension: {
                inheritFromBefore: true,
                range: {
                    dimension: "ROWS",
                    endIndex: 55,
                    sheetId: meta("Integrity").properties.sheetId,
                    startIndex: 53,
                },
            },
        });
        for (const index of inventoryAdditions.keys()) {
            for (const item of integrityEntries) {
                const formula = item.cell.userEnteredValue?.formulaValue;
                if (formula !== undefined && item.row === 52) {
                    const shifted = shiftInventoryRow(formula, 31, 32 + index);
                    const formulaValue = extendInventoryFormula(shifted);
                    valueRequests.push(
                        update(
                            meta("Integrity").properties.sheetId,
                            53 + index,
                            item.column,
                            { formulaValue }
                        )
                    );
                }
            }
        }
    }
    expandIntegrityRows();
    prepareRequests.push(...buildInventoryMetadataRequests(metadata));
    /**
     * @param {string} title @param {number} sourceStart @param {number}
     *   targetStart @param {number} width @param {string} id
     */
    function copyHelper(title, sourceStart, targetStart, width, id) {
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
    /** @param {(typeof inventoryAdditions)[number]} plant @param {number} index */
    function copyPlantPage(plant, index) {
        const row = 31 + index;
        for (const item of templateEntries)
            if (item.cell.userEnteredValue) {
                const value = structuredClone(item.cell.userEnteredValue);
                if (value.formulaValue !== undefined)
                    value.formulaValue = extendInventoryFormula(
                        value.formulaValue
                    )
                        .replaceAll("P30", () => plant.id)
                        .replaceAll("202609300", () => String(plant.sheetId))
                        .replaceAll(
                            /(?<prefix>(?:'Plant tracker'|Baselines)!\$?[A-Z]{1,3})31\b/gv,
                            (_match, prefix) => `${String(prefix)}${row + 1}`
                        );
                if (value.formulaValue !== undefined)
                    value.formulaValue = rebaseIntervalRange(
                        value.formulaValue,
                        index
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
        for (const [index, plant] of inventoryAdditions.entries()) {
            const row = 31 + index;
            for (const [column, value] of [
                [0, plant.id],
                [1, plant.name],
                [2, plant.contents],
                [
                    13,
                    `=HYPERLINK("https://nick2bad4u.github.io/Gardening/pots/${plant.id}/","Open")`,
                ],
                [14, plant.label],
                [27, plant.pot],
                [28, plant.details],
                [29, ""],
                [30, plant.source],
            ])
                write(
                    "Plant tracker",
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
                        `History!$B$2:$B$5000=$A${row + 1},History!$K$2:$K$5000=$T${row + 1},History!$AH$2:$AH$5000<>"",History!$AJ$2:$AJ$5000<>"Removed"),1,FALSE),1,2),IF($T${row + 1}=1,"Molly's Succulent Mix","Not recorded"))`
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
                36 + index,
                0,
                entered(`=HYPERLINK("#gid=${plant.sheetId}","View")`)
            );
            const color = palette.find((entry) => entry.id === plant.id);
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
                    34 + index,
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
                        endRowIndex: 35 + index,
                        sheetId: meta("Plant colors").properties.sheetId,
                        startColumnIndex: 4,
                        startRowIndex: 34 + index,
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
                    entered(
                        `=HYPERLINK("https://nick2bad4u.github.io/Gardening/pots/${plant.id}/","Open field guide ↗")`
                    )
                ),
                update(
                    plant.sheetId,
                    2,
                    6,
                    entered(
                        index === 0
                            ? '=HYPERLINK("#gid=202609320","Next · P32 →")'
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
                    90 + index * 3,
                    3,
                ],
                [
                    analyticsSheet,
                    97,
                    100 + index * 3,
                    3,
                ],
                [
                    colorDataSheet,
                    94,
                    133 + index * 4,
                    3,
                ],
                [
                    colorDataSheet,
                    126,
                    136 + index * 4,
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
            write("App bulk", 0, 54 + index, entered(`${plant.id} weight (g)`));
        }
    }
    appendContainers();
    write(
        "P30 Mixed succulent",
        2,
        6,
        entered('=HYPERLINK("#gid=202609310","Next · P31 →")')
    );
    // Extend the existing error scan to both new pages and appended helper cells.
    const integrity = cell("Integrity", 11, 1)?.userEnteredValue?.formulaValue;
    if (integrity?.startsWith("=SUM(") !== true)
        throw new Error("Integrity formula-error anchor changed");
    const scan = inventoryAdditions
        .map(
            (plant) =>
                `SUM(ARRAYFORMULA(N(ISERROR('${plant.title}'!A1:INDEX('${plant.title}'!V1:V5139,140+MAX(1,COUNTIF(History!$B$2:$B$5000,"${plant.id}")))))))`
        )
        .join(",");
    write("Integrity", 11, 1, {
        formulaValue: `${extendInventoryFormula(integrity).slice(0, -1)},${scan},SUM(ARRAYFORMULA(N(ISERROR('Watering intervals'!CM1:CR5000)))),SUM(ARRAYFORMULA(N(ISERROR('Plant color data'!ED1:EK5001)))),SUM(ARRAYFORMULA(N(ISERROR('Workbook analytics'!CW1:DB5001)))),SUM(ARRAYFORMULA(N(ISERROR('Workbook calculations'!A33:F34)))))`,
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
                    values: Array.from({ length: 32 }, (_, index) => ({
                        userEnteredValue: `P${String(index + 1).padStart(2, "0")}`,
                    })),
                },
                showCustomUi: true,
                strict: true,
            },
        },
    });
    function expandHelperFormatting() {
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
                90,
                6,
            ],
            [
                analyticsSheet,
                97,
                100,
                6,
            ],
            [
                colorDataSheet,
                94,
                133,
                8,
            ],
            [
                "App bulk",
                35,
                54,
                2,
            ],
        ]) {
            const sheetId = meta(String(title)).properties.sheetId;
            prepareRequests.push({
                copyPaste: {
                    destination: {
                        endColumnIndex: Number(targetStart) + Number(width),
                        endRowIndex: meta(String(title)).properties
                            .gridProperties.rowCount,
                        sheetId,
                        startColumnIndex: Number(targetStart),
                        startRowIndex: 0,
                    },
                    pasteType: "PASTE_FORMAT",
                    source: {
                        endColumnIndex:
                            Number(sourceStart) +
                            ([analyticsSheet, intervalSheet].includes(
                                String(title)
                            )
                                ? 3
                                : 1),
                        endRowIndex: meta(String(title)).properties
                            .gridProperties.rowCount,
                        sheetId,
                        startColumnIndex: Number(sourceStart),
                        startRowIndex: 0,
                    },
                },
            });
        }
    }
    expandHelperFormatting();
    /** @param {Sheet} current @param {Record<string, unknown>} protection */
    function expandProtection(current, protection) {
        const range = structuredClone(record(protection["range"]));
        const title = current.properties.title;
        if (title === intervalSheet && range["endColumnIndex"] === 90)
            range["endColumnIndex"] = 96;
        if (title === analyticsSheet && range["endColumnIndex"] === 100)
            range["endColumnIndex"] = 106;
        if (title === colorDataSheet && range["endColumnIndex"] === 133)
            range["endColumnIndex"] = 141;
        if (title === calculationSheet && range["endRowIndex"] === 32)
            range["endRowIndex"] = 34;
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
                extendChartInventory(chart.spec, metadata);
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
    return {
        chartRequests,
        emptyRanges,
        metadataDigest: inventorySnapshotDigest(metadata),
        newPageChartFinalizationRequired: true,
        preconditions,
        prepareRequests,
        validationPreconditions,
        valueRequests,
    };
}

/**
 * Extend only explicit inventory ranges. History limits and unrelated 31s stay
 * intact.
 *
 * @param {string} formula
 */
export function extendInventoryFormula(formula) {
    return formula.replaceAll(
        /(?<reference>!\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?)(?<end>31|36)(?!\d)/gv,
        (match, reference, end, offset) => {
            const before = formula.slice(0, Number(offset));
            const name = [...boundedSheets, "Dashboard"].find(
                (title) =>
                    before.endsWith(`'${title}'`) || before.endsWith(title)
            );
            if (name === undefined) return match;
            const row = Number(end);
            if (
                (row === 31 && boundedSheets.has(name)) ||
                (row === 36 && name === "Dashboard")
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
 */
export function finalizeInventoryPageCharts(metadata) {
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    for (const [index, plant] of inventoryAdditions.entries()) {
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
            patchNewChart(chart.spec, index, plant.id);
            requests.push({
                updateChartSpec: { chartId: chart.chartId, spec: chart.spec },
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
    return true;
}
/** @param {unknown[]} series */
function appendColoredSeries(series) {
    const text = JSON.stringify(series.at(-1));
    if (
        !text.includes('"sheetId":907202603') &&
        !text.includes('"sheetId":907202608')
    )
        return;
    const width = series.length === 90 ? 3 : 1;
    const originals = series.slice(-width);
    for (const [index, plant] of inventoryAdditions.entries()) {
        for (const [offset, original] of originals.entries())
            series.push(
                expandedSeries(original, index, plant.id, offset, width)
            );
    }
}

/** @param {(title: string, row: number, column: number) => Cell | undefined} cell */
function assertEntryValidation(cell) {
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
    const expectedIds = Array.from(
        { length: 30 },
        (_, index) => `P${String(index + 1).padStart(2, "0")}`
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
 */
function assertInventorySources(metadata, cell, meta) {
    for (const plant of inventoryAdditions)
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
    for (let i = 1; i <= 30; i += 1)
        for (const title of ["Plant tracker", "Baselines"])
            if (
                cell(title, i, 0)?.userEnteredValue?.stringValue !==
                `P${String(i).padStart(2, "0")}`
            )
                throw new Error(
                    `Expected ordered 30-pot inventory: ${title} row ${i + 1}`
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
    if (meta("App bulk").properties.gridProperties.columnCount !== 54)
        throw new Error("Expected 54-column App bulk schema");
    const entryValidation = assertEntryValidation(cell);
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
 * @param {unknown} original @param {number} index @param {string} id @param
 *   {number} offset @param {number} width
 */
function expandedSeries(original, index, id, offset, width) {
    const next = structuredClone(record(original));
    const data = record(next["series"]);
    const source = record(data["sourceRange"]);
    const ranges = records(source["sources"]);
    const first = ranges[0];
    if (first === undefined || typeof first["startColumnIndex"] !== "number")
        throw new Error("Missing chart column");
    const column =
        first["sheetId"] === 907_202_608
            ? 100 + index * 3 + offset
            : width === 3
              ? 133 + index * 4 + offset
              : 136 + index * 4;
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

/** @param {unknown} value @param {NativeSnapshot} metadata */
function extendChartInventory(value, metadata) {
    walkRecords(value, (item) => {
        const title = metadata.sheets.find(
            (sheet) => sheet.properties.sheetId === item["sheetId"]
        )?.properties.title;
        if (title !== undefined) extendChartRange(item, title);
        const overrides = item["styleOverrides"];
        if (Array.isArray(overrides) && overrides.length === 30) {
            for (const [index, plant] of inventoryAdditions.entries())
                overrides.push({
                    colorStyle: { rgbColor: plantColor(plant.id) },
                    index: 30 + index,
                });
        }
        const series = item["series"];
        if (Array.isArray(series) && [30, 90].includes(series.length))
            appendColoredSeries(series);
    });
}

/** @param {Record<string, unknown>} item @param {string} title */
function extendChartRange(item, title) {
    if (
        title === colorDataSheet &&
        typeof item["startRowIndex"] === "number" &&
        typeof item["endRowIndex"] === "number" &&
        item["endRowIndex"] - item["startRowIndex"] === 31
    ) {
        item["endRowIndex"] += 2;
        return;
    }
    if (item["endRowIndex"] === 31 && boundedSheets.has(title))
        item["endRowIndex"] = 33;
    if (title === "Dashboard" && item["endRowIndex"] === 36)
        item["endRowIndex"] = 38;
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

/** @param {string} source */
function parseRecord(source) {
    const value = /** @type {unknown} */ (JSON.parse(source));
    return record(value);
}

/** @param {Record<string, unknown>} basic @param {number} index */
function patchIntervalChart(basic, index) {
    const domainColumn = 91 + index * 3;
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
 *   id
 */
function patchNewChart(spec, index, id) {
    const basic = record(spec["basicChart"]);
    if (typeof spec["altText"] === "string")
        spec["altText"] = spec["altText"].replaceAll("P30", () => id);
    if (spec["title"] === "Time between waterings")
        patchIntervalChart(basic, index);
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

/**
 * Rebase both endpoints; a reversed CO:CL reference is a multi-column range.
 *
 * @param {string} formula @param {number} index
 */
function rebaseIntervalRange(formula, index) {
    const column = columnName(92 + index * 3);
    /** @type {[string, string][]} */
    const replacements = [
        ["$CL$2:$CL$5000", `$${column}$2:$${column}$5000`],
        ["CL2:CL5000", `${column}2:${column}5000`],
        ["CL$2:CL$5000", `${column}$2:${column}$5000`],
    ];
    let result = formula;
    for (const [source, destination] of replacements)
        result = result.replaceAll(
            `'Watering intervals'!${source}`,
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
