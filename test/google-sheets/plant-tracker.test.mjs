import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    appsScriptApi,
    overrideAppsScript,
} from "../helpers/apps-script-api.mjs";
import { fixtureMap, required, stringArray } from "../helpers/required.mjs";
import {
    selectSheetValues,
    sheetDisplayValues,
    sheetTextFinder,
    sheetValidationValues,
} from "../helpers/sheet-values.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const sourcePath = fileURLToPath(sourceUrl);
const source = fs.readFileSync(sourceUrl, "utf8");

const historyHeaders = [
    "Date",
    "Plant ID",
    "Event",
    "Weight state",
    "Weight (g)",
    "Height (cm)",
    "Width (cm)",
    "Plant condition",
    "Notes",
    "Recorded",
    "Pot setup",
    "Pot label at entry",
];

const historyDetailHeaders = [
    "Nutrients used",
    "Nutrient product",
    "Nutrient amount",
    "Previous pot size",
    "Pot size",
    "Flower count",
    "Flower details",
    "Photo URL",
    "Pest / issue",
    "Treatment / action",
];

const historyProvenanceHeaders = [
    "Observation ID",
    "Entry source",
    "Observation quality",
    "Save group / batch ID",
    "Corrects observation ID",
    "Correction reason",
    "Soil moisture",
    "Medium / substrate",
    "Measurement method",
    "Record status",
];

const historyMeasurementHeaders = [
    "Measurement unit",
    "Height (in)",
    "Width (in)",
];
const historyRotationHeaders = ["Rotation (°)"];
const historyWaterHeaders = ["Watering application", "Water amount (mL)"];

const appSheetEntryHeaders = [
    "Entry ID",
    "Started at",
    "Plant ID",
    "Events",
    "Weight state",
    "Weight (g)",
    "Height",
    "Width",
    "Measurement unit",
    "Plant condition",
    "Soil moisture",
    "Notes",
    "Nutrients used",
    "Nutrient product",
    "Nutrient amount",
    "Pot size",
    "Medium / substrate",
    "Measurement quality",
    "Measurement method",
    "Flower count",
    "Flower details",
    "Photo URL",
    "Pest / issue",
    "Treatment / action",
    "Created by",
    "Created at",
    "Status",
    "Status message",
    "Request ID",
    "History rows",
    "Saved at",
    "Rotation (°)",
    ...historyWaterHeaders,
];

const appSheetBulkV512Plants = Array.from(
    { length: 22 },
    (_, index) => `P${String(index + 1).padStart(2, "0")}`
);
const appSheetBulkV513Plants = Array.from(
    { length: 28 },
    (_, index) => `P${String(index + 1).padStart(2, "0")}`
);
const appSheetBulkPlants = Array.from(
    { length: 30 },
    (_, index) => `P${String(index + 1).padStart(2, "0")}`
);

const appSheetBulkHeaders = [
    "Round ID",
    "Started at",
    "Observed at",
    "Round action",
    "Selected plants",
    "Weight state",
    ...appSheetBulkPlants.map((plantId) => `${plantId} weight (g)`),
    "Notes",
    "Created by",
    "Created at",
    "Status",
    "Status message",
    "Request count",
    "Saved count",
    "Saved at",
    "Rotation (°)",
    "Plant condition",
    "Soil moisture",
    "Pest / issue",
    "Treatment / action",
    "Nutrients used",
    "Nutrient product",
    "Nutrient amount",
    ...historyWaterHeaders,
];
const appSheetBulkLegacyHeaders = [
    "Round ID",
    "Started at",
    "Observed at",
    "Weight state",
    ...appSheetBulkV512Plants.map((plantId) => `${plantId} weight (g)`),
    "Notes",
    "Created by",
    "Created at",
    "Status",
    "Status message",
    "Request count",
    "Saved count",
    "Saved at",
];
const appSheetBulkV511Headers = [
    "Round ID",
    "Started at",
    "Observed at",
    "Round action",
    "Watered plants",
    "Weight state",
    ...appSheetBulkV512Plants.map((plantId) => `${plantId} weight (g)`),
    "Notes",
    "Created by",
    "Created at",
    "Status",
    "Status message",
    "Request count",
    "Saved count",
    "Saved at",
];
const appSheetBulkV512Headers = [
    ...appSheetBulkV511Headers.slice(0, 4),
    "Selected plants",
    ...appSheetBulkV511Headers.slice(5),
    "Rotation (°)",
    "Plant condition",
    "Soil moisture",
    "Pest / issue",
    "Treatment / action",
    "Nutrients used",
    "Nutrient product",
    "Nutrient amount",
];
const appSheetBulkV513Headers = [
    ...appSheetBulkV512Headers.slice(0, 6),
    ...appSheetBulkV513Plants.map((plantId) => `${plantId} weight (g)`),
    ...appSheetBulkV512Headers.slice(6 + appSheetBulkV512Plants.length),
];
const appSheetBulkActionIndex = 3;
const appSheetBulkSelectedPlantsIndex = 4;
const appSheetBulkWeightStateIndex = 5;
const appSheetBulkWeightStartIndex = 6;
const appSheetBulkNotesIndex =
    appSheetBulkWeightStartIndex + appSheetBulkPlants.length;
const appSheetBulkStatusIndex = appSheetBulkNotesIndex + 3;
const appSheetBulkRotationIndex = appSheetBulkStatusIndex + 5;
const appSheetBulkNutrientsUsedIndex = appSheetBulkRotationIndex + 5;
const appSheetBulkNutrientProductIndex = appSheetBulkRotationIndex + 6;
const appSheetBulkNutrientAmountIndex = appSheetBulkRotationIndex + 7;

const expectedCurrentImageUrls = {
    P01: "https://thumb.gyazo.com/thumb/960/d74483025d55eaa5a8f242b1088e63dd.jpg",
    P02: "https://thumb.gyazo.com/thumb/960/cf2f02119e769c5db8aef2eaaa1ecdcc.jpg",
    P03: "https://thumb.gyazo.com/thumb/960/16784f3bec421b84f050e72c5c8a5dae.jpg",
    P04: "https://thumb.gyazo.com/thumb/960/ac11466d734bfa7b406ccbd7a58057d2.jpg",
    P05: "https://thumb.gyazo.com/thumb/960/8d647c4e8a0306c3ec77b18fda570c7c.jpg",
    P06: "https://thumb.gyazo.com/thumb/960/69be73cfc39fb5819c5355e91e6402cc.jpg",
    P07: "https://thumb.gyazo.com/thumb/960/ce880313d0ff83b3587003c536de218a.jpg",
    P08: "https://thumb.gyazo.com/thumb/960/f7e1a9d53922fa92d6bf662904da0d0a.jpg",
    P09: "https://thumb.gyazo.com/thumb/960/c35899fe81d1be02512a3d5bdea813a3.jpg",
    P10: "https://thumb.gyazo.com/thumb/960/eb94b52eeafac12ce869a661fcdb3f1e.jpg",
    P11: "https://thumb.gyazo.com/thumb/960/51f68e4e6d970ef775550c77754c9b5d.jpg",
    P12: "https://thumb.gyazo.com/thumb/960/de10da31ae4d98c089486a6ef0aefbf9.jpg",
    P13: "https://thumb.gyazo.com/thumb/960/244b18ddb7bf6beb7942ab94ef492227.jpg",
    P14: "https://thumb.gyazo.com/thumb/960/018a854ff35307af4511f0333677472c.jpg",
    P15: "https://thumb.gyazo.com/thumb/960/1a79f72e567fd569a019855e319dd841.jpg",
    P16: "https://thumb.gyazo.com/thumb/960/d4a58b8c2c7fadabc2667f9d60e1906c.jpg",
    P17: "https://thumb.gyazo.com/thumb/960/0382998ccef80e8e35e67cd146aed6a1.jpg",
    P18: "https://thumb.gyazo.com/thumb/960/ebea036fd6fa53fe1ec4fe0bf45ce2e5.jpg",
    P19: "https://thumb.gyazo.com/thumb/960/c5553b1972af905d097020742a883ce0.jpg",
    P20: "https://thumb.gyazo.com/thumb/960/7954fb6f93fc71827ac45cd854eeb25a.jpg",
    P21: "https://thumb.gyazo.com/thumb/960/6fdda39d86f77b957ef59ffae9e8503d.jpg",
    P22: "https://thumb.gyazo.com/thumb/960/b193fbdcef1169d6175c324dec12c0f1.jpg",
    P23: "https://thumb.gyazo.com/thumb/960/387921a6f4930d7051201ed54fb9339d.jpg",
    P24: "https://thumb.gyazo.com/thumb/960/8cb990678c4ca9fd73e5953240b88487.jpg",
    P25: "https://thumb.gyazo.com/thumb/960/19eeb627281c6ea948a362374a27204d.jpg",
    P26: "https://thumb.gyazo.com/thumb/960/a6a4ab586c57518f3fa5d785dcdb279b.jpg",
    P27: "https://thumb.gyazo.com/thumb/960/d0e5da659c8ad07efa7f1410a4be62ec.jpg",
    P28: "https://thumb.gyazo.com/thumb/960/2f26321ee8048f4b88f28545beff1fc2.jpg",
    P29: "https://thumb.gyazo.com/thumb/960/fe4a88cf3a9ab04d4f1ed7635f0bf2c5.jpg",
    P30: "https://thumb.gyazo.com/thumb/960/52ca4a6bae0a377ae39bac78665e32f9.jpg",
};

/** @type {Record<string, string>} */
const expectedNurseryLabelImageUrls = {
    P23: "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p23-paper-spine-label.webp",
    P24: "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p24-coconut-crystal-label.webp",
    P25: "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p25-raindrops-label.webp",
    P26: "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p26-eves-needle-label.webp",
    P27: "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p27-black-widow-label.webp",
    P28: "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p28-royal-flush-label.webp",
    P29: "https://i.gyazo.com/0c5b48d210d0984454f90f5d791b980f.webp",
    P30: "https://i.gyazo.com/a9b8fd1b6ab2e49c263806566ad79087.webp",
};

const expectedPlantImageUrls = Object.fromEntries(
    Object.entries(expectedCurrentImageUrls).map(
        ([plantId, currentImageUrl]) => [
            plantId,
            {
                currentImageUrl,
                nurseryLabelImageUrl:
                    expectedNurseryLabelImageUrls[plantId] ?? "",
            },
        ]
    )
);

/**
 * @param {string} name
 * @param {import("../logger-fixtures.d.ts").CellValue[][]} rows
 * @param {import("../logger-fixtures.d.ts").CellValue[][]} [formulaInputs]
 *
 * @returns {import("../sheet-fixtures.d.ts").DataSheet}
 */
function createDataSheet(name, rows, formulaInputs = []) {
    const formulas = formulaInputs.map((currentRow) =>
        currentRow.map((value) => {
            if (typeof value !== "string")
                throw new TypeError("Mock formulas must be strings");
            return value;
        })
    );
    /** @type {object | null} */
    let parent = null;
    /** @type {import("../sheet-fixtures.d.ts").Protection[]} */
    const protections = [];
    /**
     * @type {(import("../sheet-fixtures.d.ts").RangePosition & {
     *     validation: import("../sheet-fixtures.d.ts").Validation | null;
     * })[]}
     */
    const dataValidationCalls = [];
    /** @type {import("../sheet-fixtures.d.ts").DataSheet} */
    const sheet = {
        __dataValidationCalls: dataValidationCalls,
        __protections: protections,
        __rows: rows,
        getIndex: () => 1,
        getLastColumn: () =>
            Math.max(
                0,
                ...rows.map((row) => row.length),
                ...formulas.map((row) => row.length)
            ),
        getLastRow: () => rows.length,
        getMaxColumns: () =>
            Math.max(
                26,
                ...rows.map((row) => row.length),
                ...formulas.map((row) => row.length)
            ),
        getMaxRows: () => Math.max(rows.length, 100),
        getName: () => name,
        getParent: () => parent,
        getProtections: () => protections,
        getRange(row, column, rowCount = 1, columnCount = 1) {
            /** @template T @param {T[][]} source */
            const select = (source) =>
                selectSheetValues(source, {
                    column,
                    columnCount,
                    row,
                    rowCount,
                });
            /** @type {import("../sheet-fixtures.d.ts").DataRange} */
            const range = {
                clearContent() {
                    for (
                        let rowOffset = 0;
                        rowOffset < rowCount;
                        rowOffset += 1
                    ) {
                        const targetRow = row - 1 + rowOffset;
                        rows[targetRow] ??= [];
                        const values = required(rows[targetRow]);
                        for (
                            let columnOffset = 0;
                            columnOffset < columnCount;
                            columnOffset += 1
                        ) {
                            values[column - 1 + columnOffset] = "";
                        }
                    }
                    return range;
                },
                getColumn: () => column,
                getDisplayValue: () =>
                    String(required(select(rows)[0])[0] ?? ""),
                getDisplayValues: () => sheetDisplayValues(select(rows)),
                getFormula: () => required(select(formulas)[0])[0] ?? "",
                getFormulas: () => select(formulas),
                getLastColumn: () => column + columnCount - 1,
                getLastRow: () => row + rowCount - 1,
                getNumColumns: () => columnCount,
                getNumRows: () => rowCount,
                getRow: () => row,
                getSheet: () => sheet,
                getValue: () => required(select(rows)[0])[0] ?? "",
                getValues: () => select(rows),
                protect() {
                    const protection = createProtection(range);
                    protections.push(protection);
                    return protection;
                },
                setBackground: () => range,
                setDataValidation(validation) {
                    dataValidationCalls.push({
                        column,
                        columnCount,
                        row,
                        rowCount,
                        validation,
                    });
                    return range;
                },
                setFontColor: () => range,
                setFontWeight: () => range,
                setFormula(value) {
                    formulas[row - 1] ??= [];
                    required(formulas[row - 1])[column - 1] = value;
                    return range;
                },
                setNote: () => range,
                setNumberFormat: () => range,
                setValue(
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ value
                ) {
                    rows[row - 1] ??= [];
                    required(rows[row - 1])[column - 1] = value;
                    return range;
                },
                setValues(
                    /** @type {import("../logger-fixtures.d.ts").CellValue[][]} */ values
                ) {
                    for (const [rowOffset, valuesRow] of values.entries()) {
                        rows[row - 1 + rowOffset] ??= [];
                        for (const [
                            columnOffset,
                            value,
                        ] of valuesRow.entries()) {
                            required(rows[row - 1 + rowOffset])[
                                column - 1 + columnOffset
                            ] = value;
                        }
                    }
                    return range;
                },
            };
            return range;
        },
        hideColumns: () => sheet,
        insertColumnsAfter(column, count) {
            for (const currentRow of rows) {
                currentRow.splice(
                    column,
                    0,
                    ...Array.from({ length: count }, () => "")
                );
            }
            for (const currentRow of formulas) {
                currentRow.splice(
                    column,
                    0,
                    ...Array.from({ length: count }, () => "")
                );
            }
            return sheet;
        },
        setColumnWidth: () => sheet,
        setColumnWidths: () => sheet,
        setFrozenRows: () => sheet,
        setHiddenGridlines: () => sheet,
        setParent(value) {
            parent = value;
        },
    };
    return sheet;
}

function createDataValidationBuilder() {
    /** @type {import("../sheet-fixtures.d.ts").Validation} */
    let validation = {};
    const builder = {
        build: () => ({ ...validation }),
        requireCheckbox() {
            validation = { type: "BOOLEAN" };
            return builder;
        },
        requireNumberBetween(
            /** @type {number} */ minimum,
            /** @type {number} */ maximum
        ) {
            validation = {
                type: "NUMBER_BETWEEN",
                values: [minimum, maximum],
            };
            return builder;
        },
        requireNumberGreaterThan(/** @type {number} */ value) {
            validation = { type: "NUMBER_GREATER", values: [value] };
            return builder;
        },
        requireValueInList(
            /** @type {string[]} */ values,
            /** @type {boolean} */ showDropdown
        ) {
            validation = {
                showDropdown,
                type: "ONE_OF_LIST",
                values: Array.from(values),
            };
            return builder;
        },
        setAllowInvalid(/** @type {boolean} */ allowInvalid) {
            validation = { ...validation, allowInvalid };
            return builder;
        },
    };
    return builder;
}

/**
 * @param {{
 *     requestId?: string;
 *     values: import("../logger-fixtures.d.ts").CellValue[];
 * }[]} [observations]
 * @param {{ measurementValidations?: boolean }} [options]
 *
 * @returns {import("../sheet-fixtures.d.ts").HistorySheet}
 */
function createHistorySheet(
    observations = [],
    { measurementValidations = false } = {}
) {
    /** @type {import("../sheet-fixtures.d.ts").RangePosition[]} */
    const rangeReads = [];
    /** @type {import("../sheet-fixtures.d.ts").RangePosition[]} */
    const setValuesCalls = [];
    /** @type {import("../sheet-fixtures.d.ts").RangePosition[]} */
    const clearDataValidationCalls = [];
    /** @type {import("../sheet-fixtures.d.ts").Protection[]} */
    const protections = [];
    let maxRows = 100;
    /** @type {Set<string>} */
    const validationCells = new Set();
    if (measurementValidations) {
        for (let row = 2; row <= maxRows; row += 1) {
            validationCells.add(`${row}:38`);
            validationCells.add(`${row}:39`);
        }
    }
    const header = Array.from(
        { length: 42 },
        () => /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
    );
    for (const [index, value] of historyHeaders.entries()) {
        header[index] = value;
    }
    header[15] = "Request ID";
    for (const [index, value] of historyDetailHeaders.entries()) {
        header[16 + index] = value;
    }
    for (const [index, value] of historyProvenanceHeaders.entries()) {
        header[26 + index] = value;
    }
    for (const [index, value] of historyMeasurementHeaders.entries()) {
        header[36 + index] = value;
    }
    for (const [index, value] of historyRotationHeaders.entries()) {
        header[39 + index] = value;
    }
    for (const [index, value] of historyWaterHeaders.entries()) {
        header[40 + index] = value;
    }

    const rows = [
        header,
        ...observations.map(({ requestId, values }) => {
            const row = Array.from(
                { length: 42 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            );
            for (const [index, value] of values.entries()) {
                row[index] = value;
            }
            row[15] = requestId;
            return row;
        }),
    ];

    /**
     * @param {number} row @param {number} column @param {number} rowCount
     * @param {number} columnCount
     */
    function rangeValues(row, column, rowCount, columnCount) {
        return Array.from({ length: rowCount }, (_, rowOffset) =>
            Array.from(
                { length: columnCount },
                (_, columnOffset) =>
                    rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ""
            )
        );
    }

    /**
     * @param {number} row @param {number} column @param
     *   {import("../logger-fixtures.d.ts").CellValue[][]} values
     */
    function setRangeValues(row, column, values) {
        for (const [rowOffset, currentRow] of values.entries()) {
            const targetRow = row - 1 + rowOffset;
            rows[targetRow] ??= Array.from(
                { length: 42 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            );
            for (const [columnOffset, value] of currentRow.entries()) {
                required(rows[targetRow])[column - 1 + columnOffset] = value;
            }
        }
    }

    return {
        __clearDataValidationCalls: clearDataValidationCalls,
        __protections: protections,
        __rangeReads: rangeReads,
        __rows: rows,
        __setValuesCalls: setValuesCalls,
        __validationCells: validationCells,
        getLastRow: () => rows.length,
        getMaxColumns: () => required(rows[0]).length,
        getMaxRows: () => maxRows,
        getName: () => "History",
        getProtections: () => protections,
        getRange(row, column, rowCount = 1, columnCount = 1) {
            rangeReads.push({ column, columnCount, row, rowCount });
            const values = () =>
                rangeValues(row, column, rowCount, columnCount);
            /** @type {import("../sheet-fixtures.d.ts").HistoryRange} */
            const range = {
                clearContent() {
                    setRangeValues(
                        row,
                        column,
                        Array.from({ length: rowCount }, () =>
                            emptyCells(columnCount)
                        )
                    );
                    return range;
                },
                clearDataValidations() {
                    clearDataValidationCalls.push({
                        column,
                        columnCount,
                        row,
                        rowCount,
                    });
                    for (
                        let rowOffset = 0;
                        rowOffset < rowCount;
                        rowOffset += 1
                    ) {
                        for (
                            let columnOffset = 0;
                            columnOffset < columnCount;
                            columnOffset += 1
                        ) {
                            validationCells.delete(
                                `${row + rowOffset}:${column + columnOffset}`
                            );
                        }
                    }
                    return range;
                },
                createTextFinder: (query) =>
                    sheetTextFinder(rows, column, query),
                getDataValidations: () =>
                    sheetValidationValues(validationCells, {
                        column,
                        columnCount,
                        row,
                        rowCount,
                    }),
                getDisplayValue: () => String(required(values()[0])[0] ?? ""),
                getDisplayValues: () => sheetDisplayValues(values()),
                getValues: values,
                protect() {
                    const protection = createProtection(range);
                    protections.push(protection);
                    return protection;
                },
                setDataValidation(validation) {
                    for (
                        let rowOffset = 0;
                        rowOffset < rowCount;
                        rowOffset += 1
                    ) {
                        for (
                            let columnOffset = 0;
                            columnOffset < columnCount;
                            columnOffset += 1
                        ) {
                            const key = `${row + rowOffset}:${column + columnOffset}`;
                            if (validation) validationCells.add(key);
                            else validationCells.delete(key);
                        }
                    }
                    return range;
                },
                setNote: () => range,
                setNotes: () => range,
                setNumberFormat: () => range,
                setValue(
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ value
                ) {
                    setRangeValues(row, column, [[value]]);
                    return range;
                },
                setValues(nextValues) {
                    setValuesCalls.push({
                        column,
                        columnCount,
                        row,
                        rowCount,
                    });
                    setRangeValues(row, column, nextValues);
                    return range;
                },
            };
            return range;
        },
        hideColumns: () => {},
        insertColumnsAfter(column, count) {
            for (const currentRow of rows) {
                currentRow.splice(
                    column,
                    0,
                    ...Array.from({ length: count }, () => "")
                );
            }
        },
        insertRowsAfter: (_row, count) => {
            maxRows += count;
        },
    };
}

function createLoggerWorkbook(plantIds = ["P01"], historyOptions = {}) {
    const trackerHeader = Array.from(
        { length: 15 },
        () => /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
    );
    const trackerRows = [trackerHeader];
    const trackerFormulas = [Array.from({ length: 15 }, () => "")];
    const baselineHeader = Array.from(
        { length: 20 },
        () => /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
    );
    baselineHeader[0] = "Plant ID";
    baselineHeader[19] = "Pot setup";
    const baselineRows = [baselineHeader];

    for (const [index, plantId] of plantIds.entries()) {
        const row = Array.from(
            { length: 15 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        row[0] = plantId;
        row[1] = `Plant ${plantId}`;
        row[2] = `Scientific ${plantId}`;
        row[14] = `Label ${index + 1}`;
        trackerRows.push(row);

        const formulas = Array.from({ length: 15 }, () => "");
        formulas[13] = `=HYPERLINK("https://example.test/${plantId}","Guide")`;
        trackerFormulas.push(formulas);
        const baselineRow = Array.from(
            { length: 20 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        baselineRow[0] = plantId;
        baselineRow[19] = 1;
        baselineRows.push(baselineRow);
    }

    const history = createHistorySheet([], historyOptions);
    const historyView = createDataSheet("History view", [[""]], [[""]]);
    /**
     * @type {Map<
     *     string,
     *     | import("../sheet-fixtures.d.ts").DataSheet
     *     | import("../sheet-fixtures.d.ts").HistorySheet
     * >}
     */
    const sheets = new Map(
        /**
         * @type {[
         *     string,
         *     (
         *         | import("../sheet-fixtures.d.ts").DataSheet
         *         | import("../sheet-fixtures.d.ts").HistorySheet
         *     ),
         * ][]}
         */ ([
            [
                "App bulk",
                createDataSheet("App bulk", [[...appSheetBulkHeaders]]),
            ],
            [
                "App entries",
                createDataSheet("App entries", [[...appSheetEntryHeaders]]),
            ],
            ["Baselines", createDataSheet("Baselines", baselineRows)],
            ["History", history],
            ["History view", historyView],
            [
                "Plant tracker",
                createDataSheet("Plant tracker", trackerRows, trackerFormulas),
            ],
        ])
    );
    const spreadsheet = {
        getSheetByName: (/** @type {string} */ name) =>
            sheets.get(name) ?? null,
        getSpreadsheetTimeZone: () => "America/New_York",
        insertSheet(/** @type {string} */ name) {
            const sheet = createDataSheet(name, []);
            sheet.setParent(spreadsheet);
            sheets.set(name, sheet);
            return sheet;
        },
        /** @type {(message: string, title?: string) => void} */
        toast: () => {},
    };
    sheets.forEach((sheet) => {
        if ("setParent" in sheet) sheet.setParent(spreadsheet);
    });
    const lock = {
        releaseLock: () => {},
        tryLock: () => true,
    };

    return {
        globals: {
            LockService: { getScriptLock: () => lock },
        },
        history,
        sheets,
        spreadsheet,
    };
}

/**
 * @param {object} initialRange @returns
 *   {import("../sheet-fixtures.d.ts").Protection}
 */
function createProtection(initialRange) {
    let description = "";
    let protectedRange = initialRange;
    let isWarningOnly = false;
    /** @type {import("../sheet-fixtures.d.ts").Protection} */
    const protection = {
        getDescription: () => description,
        getRange: () => protectedRange,
        isWarningOnly: () => isWarningOnly,
        setDescription(value) {
            description = value;
            return protection;
        },
        setRange(value) {
            protectedRange = value;
            return protection;
        },
        setWarningOnly(value) {
            isWarningOnly = value;
            return protection;
        },
    };
    return protection;
}

/**
 * @param {object} history @param
 *   {import("../sheet-fixtures.d.ts").RuntimeOptions} [options]
 */
function loadAppsScript(history, options = {}) {
    const spreadsheet = options.spreadsheet ?? {
        getSheetByName: (/** @type {string} */ name) =>
            name === "History" ? history : null,
    };
    const context = vm.createContext({
        console,
        Date,
        Map,
        Object,
        Set,
        SpreadsheetApp: options.SpreadsheetApp ?? {
            flush: () => {},
            newDataValidation: createDataValidationBuilder,
            openById: () => spreadsheet,
            ProtectionType: { RANGE: "RANGE" },
        },
        URL,
        Utilities: options.Utilities ?? {
            formatDate: (/** @type {Date} */ value) => value.toISOString(),
            getUuid: () => "test-request-id",
        },
        ...options.globals,
        encodeURIComponent,
    });
    vm.runInContext(source, context, { filename: sourcePath });
    return appsScriptApi(context);
}

/** @param {{ amount: string | number; application: string; event: string }} options */
function quickLogWateringFixture({ amount, application, event }) {
    const workbook = createLoggerWorkbook();
    workbook.spreadsheet.toast = () => {};
    const row = [
        "P01",
        "Plant P01",
        true,
        new Date("2026-09-05T12:00:00Z"),
        event,
        "Routine",
        451,
        "",
        "",
        "",
        "",
        1,
        "in",
        application,
        amount,
    ];
    const quick = createDataSheet("Quick log", [
        [],
        [],
        [],
        [],
        row,
    ]);
    workbook.sheets.set("Quick log", quick);
    quick.setParent(workbook.spreadsheet);
    const context = loadAppsScript(workbook.history, {
        globals: workbook.globals,
        spreadsheet: workbook.spreadsheet,
    });
    return { context, quick, row, workbook };
}

describe("garden logger input normalization", () => {
    it("escapes formula-like notes and validates request metadata", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        expect(context.safeSheetText_('=IMPORTXML("x")')).toBe(
            '\'=IMPORTXML("x")'
        );
        expect(() => context.normalizeRequestId_("", true)).toThrow(
            /missing its retry key/v
        );
        expect(context.normalizeRequestId_("garden-1234567890", true)).toBe(
            "garden-1234567890"
        );
        expect(context.normalizeRequestId_("", false)).toBe("test-request-id");
        expect(() => context.normalizeRequestId_("short", false)).toThrow(
            /request id is not valid/iv
        );
        expect(context.normalizeRecentLimit_(25)).toBe(25);
        expect(context.normalizeRecentLimit_(999)).toBe(10);
        expect(context.normalizeRecentLimit_("not-a-number")).toBe(10);
    });

    it("validates observation identity, weight state, and required measurements", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        expect(context.normalizeWeightState_("", "")).toBe("");
        expect(context.normalizeWeightState_("", 42)).toBe("Routine");
        expect(() => context.normalizeWeightState_("Invalid", 42)).toThrow(
            /weight state must be/iv
        );
        expect(() => {
            context.validateMeasurementEvents_(["Weigh"], "", "", "");
        }).toThrow(/enter a weight/iv);
        expect(() => {
            context.validateMeasurementEvents_(["Measure"], "", "", "");
        }).toThrow(/height or width/iv);

        context.validateMeasurementEvents_(["Check"], "", "", "");

        expect(() =>
            context.prepareWebObservation_({}, { plantId: "P99" }, new Map())
        ).toThrow(/valid plant/iv);
    });

    it("normalizes measurement methods, quality, and units", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        expect(context.normalizeMeasurementQuality_("", ["Check"])).toBe("");
        expect(context.normalizeMeasurementQuality_("", ["Measure"])).toBe(
            "Estimated"
        );
        expect(
            context.normalizeMeasurementQuality_("Measured", ["Measure"])
        ).toBe("Measured");
        expect(() =>
            context.normalizeMeasurementQuality_("Approximate", ["Measure"])
        ).toThrow(/measured or estimated/iv);
        expect(context.normalizeMeasurementMethod_("", ["Check"])).toBe("");
        expect(context.normalizeMeasurementMethod_("", ["Measure"])).toBe(
            "Unspecified"
        );
        expect(context.normalizeMeasurementMethod_("Ruler", ["Measure"])).toBe(
            "Ruler"
        );
        expect(() =>
            context.normalizeMeasurementMethod_("Laser", ["Measure"])
        ).toThrow(/must be one of/iv);
        expect(context.normalizeMeasurementUnit_("", ["Check"])).toBe("");
        expect(context.normalizeMeasurementUnit_("", ["Measure"])).toBe("cm");
        expect(context.normalizeMeasurementUnit_("inches", ["Measure"])).toBe(
            "in"
        );
        expect(() =>
            context.normalizeMeasurementUnit_("feet", ["Measure"])
        ).toThrow(/in or cm/iv);
        expect(context.measurementToCentimeters_(1.3, "in")).toBe(3.302);
        expect(context.measurementToCentimeters_(12.7, "cm")).toBe(12.7);
        expect(context.measurementToCentimeters_("", "in")).toBe("");
        expect(
            context.normalizeMeasurementQuality_(
                "Estimated",
                ["Measure"],
                "Ruler"
            )
        ).toBe("Measured");
        expect(
            context.normalizeMeasurementQuality_(
                "Measured",
                ["Measure"],
                "Estimated visually"
            )
        ).toBe("Estimated");
    });

    it("normalizes dates and validates positive observation numbers", () => {
        expect.hasAssertions();

        const history = createHistorySheet();
        const context = loadAppsScript(history);

        expect(context.normalizeDate_(null)).toBeInstanceOf(Date);
        expect(context.normalizeDate_("2026-08-16T12:00:00Z")).toBeInstanceOf(
            Date
        );
        expect(() => context.normalizeDate_("not-a-date")).toThrow(
            /not valid/iv
        );
        expect(() => context.normalizeDate_(new Date(NaN))).toThrow(
            /not valid/iv
        );
        expect(context.optionalPositiveNumber_("2.5", "Weight")).toBe(2.5);
        expect(context.optionalPositiveNumber_("", "Weight")).toBe("");
        expect(context.optionalPositiveNumber_(null, "Weight")).toBe("");
        expect(context.optionalPositiveNumber_(undefined, "Weight")).toBe("");
        expect(() => context.optionalPositiveNumber_(0, "Weight")).toThrow(
            /positive number/iv
        );
        expect(context.optionalPositiveInteger_(3, "Count")).toBe(3);
        expect(context.optionalPositiveInteger_(undefined, "Count")).toBe("");
        expect(context.optionalPositiveInteger_(null, "Count")).toBe("");
        expect(context.optionalPositiveInteger_("", "Count")).toBe("");
        expect(() => context.optionalPositiveInteger_(1.5, "Count")).toThrow(
            /whole number/iv
        );
        expect(context.positiveInteger_(2, "Setup")).toBe(2);
        expect(() => context.positiveInteger_(0, "Setup")).toThrow(
            /whole number/iv
        );
    });

    it("normalizes collection links, limits, columns, and History comparison values", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const observedUniqueTextValues = structuredClone(
            Array.from(
                context.uniqueTextValues_([
                    " P01 ",
                    "P01",
                    "",
                ])
            )
        );

        expect(observedUniqueTextValues).toStrictEqual(["P01"]);
        expect(context.fieldGuideUrlForRow_(["", ""])).toContain(
            "nick2bad4u.github.io"
        );

        const guideFormula = Array.from(
            { length: 15 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        guideFormula[13] = '=HYPERLINK("https://example.test/guide","Guide")';

        expect(context.fieldGuideUrlForRow_(guideFormula)).toBe(
            "https://example.test/guide"
        );
        expect(context.normalizeRecentLimit_(25)).toBe(25);
        expect(context.normalizeRecentLimit_(999)).toBe(10);
        expect(context.columnName_(1)).toBe("A");
        expect(context.columnName_(26)).toBe("Z");
        expect(context.columnName_(27)).toBe("AA");

        const comparisonDate = new Date("2026-08-16T12:00:00Z");
        const comparisonTimestamp = comparisonDate.getTime();
        const comparisonText = String(comparisonTimestamp);

        expect(context.comparableHistoryValue_(comparisonDate)).toBe(
            comparisonDate.getTime()
        );
        expect(context.comparableHistoryValue_(null)).toBe("");
        expect(context.comparableHistoryValue_(undefined)).toBe("");
        expect(context.comparableHistoryValue_("  value  ")).toBe("value");
        expect(context.comparableHistoryValue_(comparisonText)).toBe(
            comparisonText
        );
        expect(context.comparableHistoryValue_(comparisonTimestamp)).toBe(
            comparisonText
        );
    });

    it("extracts mixed-case field guide formulas and rejects incomplete links", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const formulaRow = emptyCells(14);
        formulaRow[13] =
            '=hyperlink( \t"https://example.test/guide?q=1","Guide")';

        expect(context.fieldGuideUrlForRow_(formulaRow)).toBe(
            "https://example.test/guide?q=1"
        );

        formulaRow[13] = '=HYPERLINK("https://example.test/unclosed';

        expect(context.fieldGuideUrlForRow_(formulaRow)).toBe(
            context.fieldGuideUrlForRow_(null)
        );

        formulaRow[13] = '=HYPERLINK("","Guide")';

        expect(context.fieldGuideUrlForRow_(formulaRow)).toBe(
            context.fieldGuideUrlForRow_(undefined)
        );
    });

    it("formats valid client dates and withholds malformed dates", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        expect(
            context.formatClientDate_(
                new Date("2026-08-16T12:00:00Z"),
                "America/New_York",
                "MMM d"
            )
        ).toContain("2026-08-16");
        expect(
            context.formatClientDate_("not-a-date", "America/New_York", "MMM d")
        ).toBe("");
        expect(
            context.formatClientDate_(
                new Date(NaN),
                "America/New_York",
                "MMM d"
            )
        ).toBe("");
    });

    it("rejects duplicate plant identities and preserves valid rows", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        context.assertUniquePlantIds_([{ id: "P01" }, { id: "P02" }]);

        expect(() => {
            context.assertUniquePlantIds_([{ id: "P01" }, { id: "P01" }]);
        }).toThrow(/more than once/iv);
        expect(() => {
            context.assertUniqueIdsInRows_([["P01"], ["P01"]], "Baselines");
        }).toThrow(/baselines/iv);

        context.assertUniqueIdsInRows_(
            [
                [""],
                ["P01"],
                ["P02"],
            ],
            "Baselines"
        );
    });

    it("cleans Sheet text and validates retry IDs and required sheets", () => {
        expect.hasAssertions();

        const history = createHistorySheet();
        const context = loadAppsScript(history);

        expect(context.cleanText_(null)).toBe("");
        expect(context.cleanText_(undefined)).toBe("");
        expect(context.cleanText_(" value ")).toBe("value");
        expect(context.safeSheetText_("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
        expect(context.safeSheetText_("plain")).toBe("plain");
        expect(context.normalizeRequestId_("")).toBe("test-request-id");
        expect(() => context.normalizeRequestId_("", true)).toThrow(
            /missing its retry key/iv
        );
        expect(() => context.normalizeRequestId_("short", false)).toThrow(
            /not valid/iv
        );
        expect(
            context.requireSheet_({ getSheetByName: () => history }, "History")
        ).toBe(history);
        expect(() =>
            context.requireSheet_({ getSheetByName: () => null }, "Missing")
        ).toThrow(/missing required sheet/iv);
    });
});

describe("garden logger event inference and structured details", () => {
    it("infers independent event rows from a combined observation", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        const observedBuildEventNamesFromList = structuredClone(
            Array.from(
                context.buildEventNamesFromList_(
                    ["Water"],
                    "Wet",
                    420,
                    7,
                    "",
                    "Firm",
                    "Round check"
                )
            )
        );

        expect(observedBuildEventNamesFromList).toStrictEqual([
            "Weigh",
            "Water",
            "Measure",
            "Check",
        ]);

        const observedBuildEventNames = structuredClone(
            Array.from(
                context.buildEventNames_("Weigh", "Wet", 420, "", "", "", "")
            )
        );

        expect(observedBuildEventNames).toStrictEqual(["Weigh"]);
    });

    it("validates and structures every supported event detail", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const events = [
            "Water",
            "Repot",
            "Flower",
            "Photo",
            "Pest",
        ];
        const details = context.eventDetailsFromPayload_(
            {
                flowerCount: 2,
                flowerDetails: "Pink crown",
                nutrientAmount: "0.5 g/gal",
                nutrientProduct: "MSU 13-3-15",
                nutrientsUsed: "Yes",
                pestIssue: "Mealybug",
                pestTreatment: "Isolated and treated",
                photoUrl: "https://photos.app.goo.gl/example",
                potSize: "5 in",
                waterAmount: 125,
                wateringApplication: "Thorough",
            },
            events,
            { currentPotSize: "4 in" }
        );

        expect(details).toMatchObject({
            flowerCount: 2,
            nutrientsUsed: "Yes",
            pestIssue: "Mealybug",
            photoUrl: "https://photos.app.goo.gl/example",
            potSize: "5 in",
            previousPotSize: "4 in",
            waterAmount: 125,
            wateringApplication: "Thorough",
        });
        expect(
            context.isGooglePhotosShareUrl_(
                "https://photos.google.com/share/example"
            )
        ).toBe(true);
        expect(
            context.isGooglePhotosShareUrl_("https://example.com/photo")
        ).toBe(false);
        expect(() =>
            context.eventDetailsFromPayload_(
                { nutrientsUsed: "Maybe" },
                ["Water"],
                null
            )
        ).toThrow(/choose whether nutrients were used/iv);
        expect(() =>
            context.eventDetailsFromPayload_(
                { nutrientsUsed: "Yes" },
                ["Water"],
                null
            )
        ).toThrow(/nutrient product and amount/iv);
        expect(() =>
            context.eventDetailsFromPayload_({}, ["Repot"], {
                currentPotSize: "4 in",
            })
        ).toThrow(/new pot size/iv);
        expect(() =>
            context.eventDetailsFromPayload_({}, ["Flower"], null)
        ).toThrow(/flower count/iv);
        expect(() =>
            context.eventDetailsFromPayload_({}, ["Photo"], null)
        ).toThrow(/google photos share link/iv);
        expect(() =>
            context.eventDetailsFromPayload_(
                { pestIssue: "Mite" },
                ["Pest"],
                null
            )
        ).toThrow(/treatment or action/iv);
    });

    it("infers observation events from measurements and notes", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        expect(() =>
            context.buildEventNames_("", "", "", "", "", "", "")
        ).toThrow(/enter an event/iv);

        const observedBuildEventNames2 = structuredClone(
            Array.from(
                context.buildEventNames_(
                    "Weigh",
                    "Wet",
                    5,
                    2,
                    3,
                    "Healthy",
                    "Note"
                )
            )
        );

        expect(observedBuildEventNames2).toStrictEqual([
            "Weigh",
            "Measure",
            "Check",
        ]);

        const observedBuildEventNames3 = structuredClone(
            Array.from(context.buildEventNames_("", "", "", "", "", "", "Note"))
        );

        expect(observedBuildEventNames3).toStrictEqual(["Note"]);

        const observedBuildEventNamesFromList2 = structuredClone(
            Array.from(
                context.buildEventNamesFromList_([], "", "", "", "", "", "Note")
            )
        );

        expect(observedBuildEventNamesFromList2).toStrictEqual(["Note"]);
    });

    it("covers optional event-detail and History lookup branches", () => {
        expect.hasAssertions();

        const emptyHistory = createHistorySheet();
        const context = loadAppsScript(emptyHistory);
        const emptyDetails = context.eventDetailsFromPayload_({}, [], null);

        expect(structuredClone(structuredClone(emptyDetails))).toStrictEqual({
            flowerCount: "",
            flowerDetails: "",
            nutrientAmount: "",
            nutrientProduct: "",
            nutrientsUsed: "",
            pestIssue: "",
            pestTreatment: "",
            photoUrl: "",
            potSize: "",
            previousPotSize: "",
            rotationDegrees: "",
            waterAmount: "",
            wateringApplication: "",
        });
        expect(() =>
            context.eventDetailsFromPayload_(
                { nutrientsUsed: "Yes" },
                ["Water"],
                null
            )
        ).toThrow(/both the nutrient product/iv);
        expect(
            context.eventDetailsFromPayload_(
                { nutrientsUsed: "No" },
                ["Water"],
                null
            )
        ).toMatchObject({
            nutrientProduct: "",
            waterAmount: "",
            wateringApplication: "Flood / soak-through",
        });
        expect(() =>
            context.eventDetailsFromPayload_(
                {
                    nutrientsUsed: "No",
                    wateringApplication: "Spritz",
                },
                ["Water"],
                null
            )
        ).toThrow(/watering application/iv);
        expect(() =>
            context.eventDetailsFromPayload_(
                { nutrientsUsed: "No", waterAmount: 0 },
                ["Water"],
                null
            )
        ).toThrow(/water amount must be a positive number/iv);
        expect(() =>
            context.eventDetailsFromPayload_({}, ["Repot"], {})
        ).toThrow(/new pot size/iv);
        expect(() =>
            context.eventDetailsFromPayload_({}, ["Flower"], null)
        ).toThrow(/flower count/iv);
        expect(() =>
            context.eventDetailsFromPayload_(
                { photoUrl: "https://example.test/photo" },
                ["Photo"],
                null
            )
        ).toThrow(/google photos/iv);
        expect(() =>
            context.eventDetailsFromPayload_(
                { pestIssue: "Mites" },
                ["Pest"],
                null
            )
        ).toThrow(/both the pest/iv);
        expect(context.plantRecordForId_({}, "")).toBeNull();
        expect(
            structuredClone(
                context.historyRowsForRequest_(
                    emptyHistory,
                    "garden-none-12345"
                )
            )
        ).toStrictEqual([]);

        const observedSavedRequestStatus = structuredClone(
            structuredClone(
                context.savedRequestStatus_(emptyHistory, "garden-none-12345")
            )
        );

        expect(observedSavedRequestStatus).toStrictEqual({
            requestId: "garden-none-12345",
            state: "missing",
        });
        expect(context.lastHistoryDataRow_(emptyHistory)).toBe(1);
        expect(context.lastHistoryReservedRow_(emptyHistory)).toBe(1);

        const malformedHeaders = createHistorySheet();
        required(malformedHeaders.__rows[0])[15] = "Wrong";

        expect(() => {
            context.ensureHistoryRequestIdColumn_(malformedHeaders);
        }).toThrow(/p1 must be/iv);

        const malformedDetails = createHistorySheet();
        required(malformedDetails.__rows[0])[16] = "Wrong";

        expect(() => {
            context.ensureHistoryDetailColumns_(malformedDetails);
        }).toThrow(/q1 must be/iv);
    });

    it("covers valid structured details and validation helper edges", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const details = context.eventDetailsFromPayload_(
            {
                flowerCount: 2,
                flowerDetails: "Yellow flowers",
                nutrientAmount: "0.5 g/gal",
                nutrientProduct: "MSU 13-3-15",
                nutrientsUsed: "Yes",
                pestIssue: "Mites",
                pestTreatment: "Rinsed and isolated",
                photoUrl: "https://photos.app.goo.gl/abcdefghijkl",
                potSize: "4 inch",
            },
            [
                "Water",
                "Repot",
                "Flower",
                "Photo",
                "Pest",
            ],
            { currentPotSize: "3 inch" }
        );

        expect(structuredClone(details)).toMatchObject({
            flowerCount: 2,
            nutrientProduct: "MSU 13-3-15",
            nutrientsUsed: "Yes",
            pestIssue: "Mites",
            photoUrl: "https://photos.app.goo.gl/abcdefghijkl",
            potSize: "4 inch",
            previousPotSize: "3 inch",
        });
        expect(
            context.eventDetailsFromPayload_(
                { flowerDetails: "Single unopened bud" },
                ["Flower"],
                null
            ).flowerDetails
        ).toBe("Single unopened bud");

        const observedBuildEventNamesFromList3 = structuredClone(
            Array.from(
                context.buildEventNamesFromList_(
                    [],
                    "",
                    "",
                    "",
                    "",
                    "",
                    "note only"
                )
            )
        );

        expect(observedBuildEventNamesFromList3).toStrictEqual(["Note"]);
        expect(() =>
            context.buildEventNamesFromList_([], "", "", "", "", "", "")
        ).toThrow(/choose an event/iv);
        expect(() =>
            context.buildEventNames_("", "", "", "", "", "", "")
        ).toThrow(/enter an event/iv);
        expect(context.optionalPositiveNumber_(undefined, "Weight")).toBe("");
        expect(() =>
            context.optionalPositiveNumber_(Infinity, "Weight")
        ).toThrow(/positive number/iv);
        expect(context.optionalPositiveInteger_(undefined, "Count")).toBe("");
        expect(() => context.optionalPositiveInteger_(1.5, "Count")).toThrow(
            /whole number/iv
        );
        expect(() => context.positiveInteger_(0, "Setup")).toThrow(
            /whole number/iv
        );

        const observedUniqueTextValues2 = structuredClone(
            Array.from(
                context.uniqueTextValues_([
                    "",
                    "P01",
                    "P01",
                ])
            )
        );

        expect(observedUniqueTextValues2).toStrictEqual(["P01"]);
        expect(() =>
            context.requireSheet_({ getSheetByName: () => null }, "X")
        ).toThrow(/missing required sheet/iv);
    });
});

describe("garden logger weight-state inference and dry-down formulas", () => {
    it("keeps save-group identity authoritative when deriving wet/dry anchors", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        expect(
            context.historyRecordsShareSave_(
                { saveGroup: "batch-a", timestamp: 1 },
                { saveGroup: "batch-a", timestamp: 2 }
            )
        ).toBe(true);
        expect(
            context.historyRecordsShareSave_(
                { saveGroup: "batch-a", timestamp: 1 },
                { saveGroup: "batch-b", timestamp: 1 }
            )
        ).toBe(false);
        expect(
            context.historyRecordsShareSave_({ timestamp: 1 }, { timestamp: 1 })
        ).toBe(true);
        expect(
            context.historyRecordsShareSave_(
                { observedAt: "2026-09-05" },
                { observedAt: "2026-09-05" }
            )
        ).toBe(true);
        expect(context.historyRecordsShareSave_({}, {})).toBe(false);
        expect(
            context.historyRecordsShareSave_(
                { observedAt: "2026-09-05" },
                { observedAt: "2026-09-06" }
            )
        ).toBe(false);
    });

    it("names the appended water-date columns correctly across the Z/AA boundary", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        expect(
            structuredClone(
                [
                    22,
                    23,
                    26,
                    27,
                    35,
                    36,
                ].map((index) => context.columnName_(index))
            )
        ).toStrictEqual([
            "V",
            "W",
            "Z",
            "AA",
            "AI",
            "AJ",
        ]);
    });

    it("returns the latest completed-cycle dry anchor and ignores open-cycle lows", () => {
        expect.hasAssertions();

        const history = createHistorySheet([]);
        const context = loadAppsScript(history);
        /**
         * @param {{
         *     batch?: string;
         *     event?: string;
         *     observedAt: string;
         *     plantId: string;
         *     setup?: number;
         *     status?: string;
         *     weight?: number | string;
         * }} options
         */
        const weightRow = ({
            batch = "",
            event = "Weigh",
            observedAt,
            plantId,
            setup = 1,
            status = "",
            weight,
        }) => {
            const row = Array.from(
                { length: 42 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            );
            row[0] = observedAt;
            row[1] = plantId;
            row[2] = event;
            row[3] = "Dry";
            row[4] = weight;
            row[10] = setup;
            row[29] = batch;
            row[35] = status;
            return row;
        };

        const rows = [
            weightRow({
                observedAt: "2026-08-01T12:00:00Z",
                plantId: "P01",
                setup: 1,
                weight: 200,
            }),
            weightRow({
                batch: "wet-1",
                observedAt: "2026-08-02T12:00:00Z",
                plantId: "P01",
                setup: 2,
                weight: 500,
            }),
            weightRow({
                batch: "wet-1",
                event: "Water",
                observedAt: "2026-08-02T12:00:00Z",
                plantId: "P01",
                setup: 2,
            }),
            weightRow({
                observedAt: "2026-08-03T12:00:00Z",
                plantId: "P01",
                setup: 2,
                weight: 470,
            }),
            weightRow({
                observedAt: "2026-08-04T12:00:00Z",
                plantId: "P01",
                setup: 2,
                weight: 450,
            }),
            weightRow({
                batch: "wet-2",
                observedAt: "2026-08-05T12:00:00Z",
                plantId: "P01",
                setup: 2,
                weight: 510,
            }),
            weightRow({
                batch: "wet-2",
                event: "Water",
                observedAt: "2026-08-05T12:00:00Z",
                plantId: "P01",
                setup: 2,
            }),
            weightRow({
                observedAt: "2026-08-06T12:00:00Z",
                plantId: "P01",
                setup: 2,
                weight: 430,
            }),
            weightRow({
                observedAt: "2026-08-06T12:30:00Z",
                plantId: "P01",
                setup: 2,
                status: "Removed",
                weight: 400,
            }),
            weightRow({
                observedAt: "2026-08-07T12:00:00Z",
                plantId: "P02",
                weight: 390,
            }),
        ];
        const result = context.dryOrLowestWeightsFromRows_(rows);

        expect(
            structuredClone(
                [...result].map(([plantId, value]) => ({
                    plantId,
                    ...value,
                }))
            )
        ).toStrictEqual([
            {
                basis: "Completed cycle",
                observedAt: "2026-08-04T12:00:00Z",
                plantId: "P01",
                weight: 450,
            },
        ]);
        expect(
            structuredClone([...context.inferredWeightStatesByRow_(rows)])
        ).toStrictEqual([
            [1, "Wet"],
            [3, "Routine"],
            [4, "Dry"],
            [5, "Wet"],
            [7, "Routine"],
            [9, "Routine"],
        ]);
    });

    it("scopes inferred weight states to the current setup and treats a lone Water + weigh as Wet", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        /**
         * @param {{
         *     batch?: string;
         *     event?: string;
         *     observedAt?: string;
         *     setup?: number;
         *     weight?: number | string;
         * }} options
         */
        const row = ({
            batch = "",
            event = "Weigh",
            observedAt = "2026-08-01T12:00:00Z",
            setup = 1,
            weight = "",
        }) => {
            const values = Array.from(
                { length: 42 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            );
            values[0] = observedAt;
            values[1] = "P01";
            values[2] = event;
            values[3] = "Dry";
            values[4] = weight;
            values[10] = setup;
            values[29] = batch;
            values[35] = "Active";
            return values;
        };
        const historyRows = [
            row({ setup: 1, weight: 100 }),
            row({ observedAt: "2026-08-02T12:00:00Z", setup: 2, weight: 250 }),
            row({ observedAt: "2026-08-03T12:00:00Z", setup: 2, weight: 200 }),
        ];

        expect(
            context.dryOrLowestWeightsFromRows_(historyRows).get("P01")
        ).toBeUndefined();
        expect(
            structuredClone(
                context
                    .inferredWeightStatesByRow_(historyRows)
                    .values()
                    .toArray()
            )
        ).toStrictEqual(["Routine", "Routine"]);

        const waterBatchRows = [
            row({
                batch: "same-save",
                event: "Water",
                observedAt: "2026-08-04T12:00:00Z",
                setup: 2,
            }),
            row({
                batch: "same-save",
                observedAt: "2026-08-04T12:00:00Z",
                setup: 2,
                weight: 500,
            }),
        ];

        expect(context.inferredWeightStatesByRow_(waterBatchRows).get(1)).toBe(
            "Wet"
        );
        expect(
            context.dryOrLowestWeightsFromRows_(waterBatchRows).get("P01")
        ).toBeUndefined();

        const tiedTimestampRows = [
            row({
                batch: "previous-cycle",
                observedAt: "2026-08-05T12:00:00Z",
                setup: 2,
                weight: 300,
            }),
            row({
                batch: "new-watering",
                observedAt: "2026-08-05T12:00:00Z",
                setup: 2,
                weight: 450,
            }),
            row({
                batch: "new-watering",
                event: "Water",
                observedAt: "2026-08-05T12:00:00Z",
                setup: 2,
            }),
        ];

        expect(
            structuredClone(
                context
                    .inferredWeightStatesByRow_(tiedTimestampRows)
                    .values()
                    .toArray()
            )
        ).toStrictEqual(["Dry", "Wet"]);
        expect(
            context.dryOrLowestWeightsFromRows_(tiedTimestampRows).get("P01")
        ).toMatchObject({ basis: "Completed cycle", weight: 300 });
    });

    it("uses the first weight within five days after Water as Wet and ages later weights to Routine", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        /**
         * @param {{
         *     batch?: string;
         *     event?: string;
         *     observedAt?: string;
         *     setup?: number;
         *     weight?: number | string;
         * }} options
         */
        const row = ({ event = "Weigh", observedAt, weight = "" }) => {
            const values = Array.from(
                { length: 42 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            );
            values[0] = observedAt;
            values[1] = "P02";
            values[2] = event;
            values[4] = weight;
            values[10] = 2;
            values[35] = "Active";
            return values;
        };
        const withinWindow = [
            row({
                event: "Water",
                observedAt: "2026-08-26T16:22:00Z",
            }),
            row({
                observedAt: "2026-08-27T00:15:00Z",
                weight: 473.5,
            }),
            row({
                observedAt: "2026-08-27T23:08:00Z",
                weight: 434.5,
            }),
        ];

        expect(
            structuredClone(
                context
                    .inferredWeightStatesByRow_(withinWindow)
                    .values()
                    .toArray()
            )
        ).toStrictEqual(["Wet", "Routine"]);

        const outsideWindow = [
            row({
                event: "Water",
                observedAt: "2026-08-01T00:00:00Z",
            }),
            row({
                observedAt: "2026-08-06T00:00:01Z",
                weight: 400,
            }),
        ];

        expect(
            structuredClone(
                context
                    .inferredWeightStatesByRow_(outsideWindow)
                    .values()
                    .toArray()
            )
        ).toStrictEqual(["Routine"]);

        const nextWaterWins = [
            row({
                event: "Water",
                observedAt: "2026-08-10T00:00:00Z",
            }),
            row({
                event: "Water",
                observedAt: "2026-08-11T00:00:00Z",
            }),
            row({
                observedAt: "2026-08-12T00:00:00Z",
                weight: 390,
            }),
        ];

        expect(
            structuredClone(
                context
                    .inferredWeightStatesByRow_(nextWaterWins)
                    .values()
                    .toArray()
            )
        ).toStrictEqual(["Wet"]);

        const exactBoundary = [
            row({
                event: "Water",
                observedAt: "2026-08-15T00:00:00Z",
            }),
            row({
                observedAt: "2026-08-20T00:00:00Z",
                weight: 380,
            }),
        ];

        expect(
            structuredClone(
                context
                    .inferredWeightStatesByRow_(exactBoundary)
                    .values()
                    .toArray()
            )
        ).toStrictEqual(["Wet"]);
    });

    it("builds deterministic dry-weight and forecast formulas for the workbook views", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const baselineRow = context.baselineViewRow_(2, {
            id: "P01",
            name: "Test plant",
        });

        expect(baselineRow).toHaveLength(36);

        const modelColumns = /** @type {[number, string][]} */ ([
            [22, "C"],
            [24, "D"],
            [20, "E"],
            [30, "G"],
            [31, "H"],
        ]);
        for (const [index, column] of modelColumns) {
            expect(baselineRow[index]).toBe(
                `=XLOOKUP($A2,'Dry-down models'!$A$2:$A$31,'Dry-down models'!$${column}$2:$${column}$31,"")`
            );
        }

        expect(baselineRow[25]).toContain('Y2<=W2),"",Y2-W2');
        expect(baselineRow[12]).toBe('=IF(OR(AE2="",C2<=0),"",AE2/C2)');
        expect(baselineRow[8]).toContain("'Dry-down models'!$L$2:$L$31");
        expect(baselineRow[9]).toContain("'Plant tracker'!$AD:$AD");
        expect(baselineRow[11]).toContain('TEXT(early,"mmm d")');
        expect(baselineRow[11]).toContain('TEXT(late,"mmm d")');
        expect(baselineRow[32]).toContain("learned cycle");
        expect(baselineRow[33]).toMatch(/DATE\(9999,12,31\)/v);
        expect(context.dryDownModelFormula_()).toContain("=GARDEN_DRY_DOWN(");
        expect(context.dryDownModelFormula_()).toContain("History!AJ2:AJ5000");
        expect(context.dryDownModelFormula_()).not.toMatch(/NOW\(|TODAY\(/v);
        expect(context.plantPageHistoryFormula_("P01")).toContain(
            "History!$D$2:$D$5000"
        );
        expect(context.plantPageHistoryFormula_("P01")).toContain(
            "recordedStates"
        );
        expect(context.plantPageHistoryFormula_("P01")).not.toContain(
            "weightDate<=lastWaterDate+5"
        );
        expect(context.plantPageHistoryFormula_("P01")).toContain(
            'pounds,MAP(weights,LAMBDA(w,IF(w="","",w/453.59237)))'
        );
    });

    it("sorts valid and invalid repot dates without losing latest pot sizes", () => {
        expect.hasAssertions();

        const first = Array.from(
            { length: 21 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        first[0] = "not-a-date";
        first[1] = "P01";
        first[2] = "Repot";
        first[20] = "5 inch";
        const second = Array.from(
            { length: 21 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        second[0] = "2026-08-16";
        second[1] = "P02";
        second[2] = "Repot";
        second[20] = "6 inch";
        const history = createHistorySheet([
            { values: first },
            { values: second },
        ]);
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? history : null,
        };
        const context = loadAppsScript(history);
        const sizes = context.latestPotSizesByPlant_(spreadsheet);

        expect(sizes.get("P01")).toBe("5 inch");
        expect(sizes.get("P02")).toBe("6 inch");
        expect(context.columnName_(27)).toBe("AA");
    });
});

describe("garden logger workbook refresh and navigation", () => {
    it("rebuilds every workbook surface through the public refresh command", () => {
        expect.hasAssertions();

        /** @type {string[]} */
        const flushes = [];
        const context = loadAppsScript(createHistorySheet([]), {
            SpreadsheetApp: {
                flush: () => {
                    flushes.push("flush");
                },
                newDataValidation: createDataValidationBuilder,
                ProtectionType: { RANGE: "RANGE" },
            },
        });
        /** @type {unknown[][]} */
        const calls = [];
        const spreadsheet = {
            toast: (/** @type {unknown[]} */ ...args) => {
                calls.push(["toast", ...args]);
            },
        };
        const plants = [{ id: "P01" }, { id: "P02" }];
        overrideAppsScript(context, "getGardenSpreadsheet_", () => spreadsheet);
        overrideAppsScript(context, "workbookPlantRecords_", () => plants);
        overrideAppsScript(context, "refreshBaselineView_", (...args) => {
            calls.push(["baselines", ...args]);
        });
        overrideAppsScript(context, "refreshDashboardView_", (...args) => {
            calls.push(["dashboard", ...args]);
        });
        overrideAppsScript(context, "refreshPlantPage_", (...args) => {
            calls.push(["plant", ...args]);
        });
        overrideAppsScript(context, "organizeWorkbookSheets_", (...args) => {
            calls.push(["organize", ...args]);
        });

        expect(structuredClone(context.refreshGardenWorkbook())).toStrictEqual({
            baselineColumns: 36,
            dashboardColumns: 23,
            loggerVersion: "5.18.3",
            plantPages: 2,
        });
        expect(calls.filter(([name]) => name === "plant")).toHaveLength(2);
        expect(structuredClone(calls.map(([name]) => name))).toStrictEqual([
            "baselines",
            "dashboard",
            "plant",
            "plant",
            "organize",
            "toast",
        ]);
        expect(structuredClone(flushes)).toStrictEqual(["flush"]);
    });

    it("refreshes resumable plant-page batches without rebuilding shared views", () => {
        expect.hasAssertions();

        /** @type {string[]} */
        const flushes = [];
        const context = loadAppsScript(createHistorySheet([]), {
            SpreadsheetApp: {
                flush: () => {
                    flushes.push("flush");
                },
                newDataValidation: createDataValidationBuilder,
                ProtectionType: { RANGE: "RANGE" },
            },
        });
        /** @type {unknown[][]} */
        const calls = [];
        const spreadsheet = {
            toast: (/** @type {unknown[]} */ ...args) => {
                calls.push(["toast", ...args]);
            },
        };
        const plants = Array.from({ length: 30 }, (_, index) => ({
            id: `P${String(index + 1).padStart(2, "0")}`,
        }));
        overrideAppsScript(context, "getGardenSpreadsheet_", () => spreadsheet);
        overrideAppsScript(context, "workbookPlantRecords_", () => plants);
        overrideAppsScript(context, "refreshBaselineView_", (...args) => {
            calls.push(["baselines", ...args]);
        });
        overrideAppsScript(context, "refreshDashboardView_", (...args) => {
            calls.push(["dashboard", ...args]);
        });
        overrideAppsScript(context, "refreshPlantPage_", (...args) => {
            calls.push(["plant", ...args]);
        });
        overrideAppsScript(context, "organizeWorkbookSheets_", (...args) => {
            calls.push(["organize", ...args]);
        });

        expect(
            structuredClone(context.refreshGardenWorkbookPages01To10())
        ).toStrictEqual({
            firstPlant: "P01",
            lastPlant: "P10",
            loggerVersion: "5.18.3",
            plantPages: 10,
        });
        expect(
            structuredClone(context.refreshGardenWorkbookPages11To20())
        ).toStrictEqual({
            firstPlant: "P11",
            lastPlant: "P20",
            loggerVersion: "5.18.3",
            plantPages: 10,
        });
        expect(
            structuredClone(context.refreshGardenWorkbookPages21To30())
        ).toStrictEqual({
            firstPlant: "P21",
            lastPlant: "P30",
            loggerVersion: "5.18.3",
            plantPages: 10,
        });

        const pageCalls = calls.filter(([name]) => name === "plant");

        expect(pageCalls).toHaveLength(30);
        expect(structuredClone(required(pageCalls[0]).slice(3))).toStrictEqual([
            0,
            plants[0],
        ]);
        expect(structuredClone(required(pageCalls[9]).slice(3))).toStrictEqual([
            9,
            plants[9],
        ]);
        expect(structuredClone(required(pageCalls[10]).slice(3))).toStrictEqual(
            [10, plants[10]]
        );
        expect(structuredClone(required(pageCalls[19]).slice(3))).toStrictEqual(
            [19, plants[19]]
        );
        expect(structuredClone(required(pageCalls[20]).slice(3))).toStrictEqual(
            [20, plants[20]]
        );
        expect(structuredClone(required(pageCalls[29]).slice(3))).toStrictEqual(
            [29, plants[29]]
        );
        expect(calls.filter(([name]) => name === "organize")).toHaveLength(3);
        expect(calls.filter(([name]) => name === "toast")).toHaveLength(3);
        expect(calls.some(([name]) => name === "baselines")).toBe(false);
        expect(calls.some(([name]) => name === "dashboard")).toBe(false);
        expect(structuredClone(flushes)).toStrictEqual([
            "flush",
            "flush",
            "flush",
        ]);
    });

    it("reads all 30 workbook plant records and rejects an incomplete tracker", () => {
        expect.hasAssertions();

        const plantIds = Array.from(
            { length: 30 },
            (_, index) => `P${String(index + 1).padStart(2, "0")}`
        );
        const complete = createLoggerWorkbook(plantIds);
        required(complete.sheets.get("Plant tracker")).__rows.push(
            Array.from(
                { length: 15 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            )
        );
        const context = loadAppsScript(complete.history, {
            spreadsheet: complete.spreadsheet,
        });
        const plants = context.workbookPlantRecords_(complete.spreadsheet);

        expect(structuredClone([...plants].map(({ id }) => id))).toStrictEqual(
            plantIds
        );
        expect(plants[0]).toMatchObject({
            fieldGuideUrl: "https://example.test/P01",
            label: "Label 1",
            name: "Plant P01",
            scientificName: "Scientific P01",
            trackerRow: 2,
        });

        const incomplete = createLoggerWorkbook(plantIds.slice(0, -1));

        expect(() =>
            context.workbookPlantRecords_(incomplete.spreadsheet)
        ).toThrow(/P30/v);
    });

    it("builds dashboard links and grows sheet capacity only when needed", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const page = { getSheetId: () => 12_345 };
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "P01" ? page : null,
            getSheets: () => [],
        };
        const row = context.dashboardViewRow_(
            spreadsheet,
            { id: "P01", trackerRow: 2 },
            0
        );

        expect(row).toHaveLength(23);
        expect(row[0]).toBe('=HYPERLINK("#gid=12345","View")');
        expect(row[5]).toBe("=Baselines!D2");
        expect(row[6]).toBe("=Baselines!C2");
        expect(row[7]).toBe("=Baselines!W2");
        expect(row[8]).toBe("=Baselines!AF2");

        /** @type {number[][]} */
        const inserts = [];
        context.ensureSheetRowCapacity_(
            {
                getMaxRows: () => 5,
                insertRowsAfter: (/** @type {number[]} */ ...args) => {
                    inserts.push(args);
                },
            },
            8
        );
        context.ensureSheetRowCapacity_(
            {
                getMaxRows: () => 10,
                insertRowsAfter: (/** @type {number[]} */ ...args) => {
                    inserts.push(args);
                },
            },
            8
        );

        expect(structuredClone(inserts)).toStrictEqual([[5, 3]]);
        expect(context.formulaString_('A "quoted" label')).toBe(
            'A ""quoted"" label'
        );
        expect(context.formulaString_(null)).toBe("");
    });

    it("removes the legacy A36:R36 footer merge before writing P30", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const mergedRanges = [
            { column: 1, columnCount: 18, row: 36, rowCount: 1 },
        ];
        const cells = new Map();
        const hasOverlap = (
            /** @type {import("../sheet-fixtures.d.ts").RangePosition} */ left,
            /** @type {import("../sheet-fixtures.d.ts").RangePosition} */ right
        ) =>
            left.row <= right.row + right.rowCount - 1 &&
            left.row + left.rowCount - 1 >= right.row &&
            left.column <= right.column + right.columnCount - 1 &&
            left.column + left.columnCount - 1 >= right.column;
        const mergedCell = (
            /** @type {number} */ row,
            /** @type {number} */ column
        ) =>
            mergedRanges.find(
                (range) =>
                    row >= range.row &&
                    row < range.row + range.rowCount &&
                    column >= range.column &&
                    column < range.column + range.columnCount
            );
        const dashboard = {
            autoResizeRows: () => {},
            getMaxColumns: () => 21,
            getMaxRows: () => 254,
            getName: () => "Dashboard",
            /**
             * @param {number} row
             * @param {number} column
             */
            getRange(row, column, rowCount = 1, columnCount = 1) {
                const coordinates = { column, columnCount, row, rowCount };
                const range = {
                    breakApart() {
                        for (
                            let index = mergedRanges.length - 1;
                            index >= 0;
                            index -= 1
                        ) {
                            if (
                                hasOverlap(
                                    coordinates,
                                    required(mergedRanges[index])
                                )
                            ) {
                                mergedRanges.splice(index, 1);
                            }
                        }
                        return range;
                    },
                    clearContent() {
                        for (
                            let rowOffset = 0;
                            rowOffset < rowCount;
                            rowOffset += 1
                        ) {
                            for (
                                let columnOffset = 0;
                                columnOffset < columnCount;
                                columnOffset += 1
                            ) {
                                cells.delete(
                                    `${row + rowOffset}:${column + columnOffset}`
                                );
                            }
                        }
                        return range;
                    },
                    merge() {
                        mergedRanges.push({ ...coordinates });
                        return range;
                    },
                    setFormula(/** @type {string} */ formula) {
                        cells.set(`${row}:${column}`, formula);
                        return range;
                    },
                    setValue(
                        /** @type {import("../logger-fixtures.d.ts").CellValue} */ value
                    ) {
                        cells.set(`${row}:${column}`, value);
                        return range;
                    },
                    setValues(
                        /** @type {import("../logger-fixtures.d.ts").CellValue[][]} */ values
                    ) {
                        for (const [rowOffset, valuesRow] of values.entries()) {
                            for (const [
                                columnOffset,
                                value,
                            ] of valuesRow.entries()) {
                                const targetRow = row + rowOffset;
                                const targetColumn = column + columnOffset;
                                const merge = mergedCell(
                                    targetRow,
                                    targetColumn
                                );
                                if (
                                    !merge ||
                                    (targetRow === merge.row &&
                                        targetColumn === merge.column)
                                ) {
                                    cells.set(
                                        `${targetRow}:${targetColumn}`,
                                        value
                                    );
                                }
                            }
                        }
                        return range;
                    },
                };
                for (const method of [
                    "setBackground",
                    "setFontColor",
                    "setFontSize",
                    "setFontWeight",
                    "setHorizontalAlignment",
                    "setNumberFormat",
                    "setNotes",
                    "setVerticalAlignment",
                    "setWrap",
                ]) {
                    Reflect.set(range, method, () => range);
                }
                return range;
            },
            insertColumnsAfter: () => {},
            insertRowsAfter: () => {},
            setColumnWidth: () => {},
            setColumnWidths: () => {},
            setFrozenColumns: () => {},
            setFrozenRows: () => {},
            setHiddenGridlines: () => {},
        };
        const plants = Array.from({ length: 30 }, (_, index) => ({
            id: `P${String(index + 1).padStart(2, "0")}`,
            label: index === 29 ? "#6" : `A${index + 1}`,
            name: `Plant ${index + 1}`,
            trackerRow: index + 2,
        }));
        const pages = new Map(
            plants.map((plant, index) => [
                plant.id,
                { getSheetId: () => 1000 + index },
            ])
        );
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "Dashboard" ? dashboard : (pages.get(name) ?? null),
            getSheets: () => [dashboard, ...pages.values()],
        };

        context.refreshDashboardView_(spreadsheet, plants);

        expect(cells.get("36:2")).toBe("P30");
        expect(cells.get("36:3")).toContain("'Plant tracker'!B31");
        expect(cells.get("36:3")).toContain("'Plant tracker'!O31");
        expect(cells.get("36:18")).toBe("=Baselines!J31");
        expect(mergedRanges.some((range) => range.row >= 6)).toBe(false);
    });

    it("formats baseline, dashboard, and plant-page workbook views", () => {
        expect.hasAssertions();

        const conditionalRule = {};
        const ruleBuilder = {
            build: () => conditionalRule,
            setBackground: () => ruleBuilder,
            setBold: () => ruleBuilder,
            setFontColor: () => ruleBuilder,
            setRanges: () => ruleBuilder,
            whenTextEqualTo: () => ruleBuilder,
        };
        /** @type {string[]} */
        const removedFilters = [];
        const makeSheet = (
            /** @type {string} */ name,
            { hasFilter = false, id = 1 } = {}
        ) => {
            const range = {};
            for (const method of [
                "breakApart",
                "clearContent",
                "clearFormat",
                "merge",
                "setBackground",
                "setFontColor",
                "setFontSize",
                "setFontStyle",
                "setFontWeight",
                "setFormula",
                "setHorizontalAlignment",
                "setNote",
                "setNotes",
                "setNumberFormat",
                "setRowHeights",
                "setValue",
                "setValues",
                "setVerticalAlignment",
                "setWrap",
            ]) {
                Reflect.set(range, method, () => range);
            }
            return {
                autoResizeRows: () => {},
                getFilter: () =>
                    hasFilter
                        ? {
                              remove: () => {
                                  removedFilters.push(name);
                              },
                          }
                        : null,
                getMaxColumns: () => 5,
                getMaxRows: () => 20,
                getName: () => name,
                getRange: () => range,
                getSheetId: () => id,
                hideSheet: () => {},
                insertColumnsAfter: () => {},
                insertRowsAfter: () => {},
                setColumnWidth: () => {},
                setColumnWidths: () => {},
                setConditionalFormatRules: () => {},
                setFrozenColumns: () => {},
                setFrozenRows: () => {},
                setHiddenGridlines: () => {},
                setRowHeight: () => {},
                setRowHeights: () => {},
            };
        };
        const sheets = new Map([
            ["Baselines", makeSheet("Baselines")],
            ["Dashboard", makeSheet("Dashboard", { id: 99 })],
            ["Dry-down models", makeSheet("Dry-down models")],
            ["P01", makeSheet("P01", { hasFilter: true, id: 101 })],
            ["P02", makeSheet("P02", { id: 102 })],
        ]);
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                sheets.get(name) ?? null,
            getSheets: () => sheets.values().toArray(),
        };
        const context = loadAppsScript(createHistorySheet([]), {
            SpreadsheetApp: {
                flush: () => {},
                newConditionalFormatRule: () => ruleBuilder,
                newDataValidation: createDataValidationBuilder,
                ProtectionType: { RANGE: "RANGE" },
            },
        });
        const plants = [
            {
                fieldGuideUrl: 'https://example.test/plant?name="one"',
                id: "P01",
                name: "Plant one",
                scientificName: "Species one",
                trackerRow: 2,
            },
            {
                fieldGuideUrl: "https://example.test/two",
                id: "P02",
                name: "Plant two",
                scientificName: "",
                trackerRow: 3,
            },
        ];

        context.refreshBaselineView_(spreadsheet, plants);
        context.refreshDashboardView_(spreadsheet, plants);
        context.refreshPlantPage_(spreadsheet, plants, 0, plants[0]);
        context.refreshPlantPage_(spreadsheet, plants, 1, plants[1]);

        expect(structuredClone(removedFilters)).toStrictEqual(["P01"]);
    });

    it("moves and hides workbook helper sheets while preserving user sheets", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        /** @type {string[]} */
        const events = [];
        const basicSheet = (/** @type {string} */ name) => ({
            hideColumns: (/** @type {number} */ column) => {
                events.push(`${name}:hide:${column}`);
            },
            name,
        });
        const helperSheet = (
            /** @type {string} */ name,
            /** @type {boolean} */ hidden
        ) => ({
            hideSheet: () => {
                events.push(`${name}:hide-sheet`);
            },
            isSheetHidden: () => hidden,
            name,
            showSheet: () => {
                events.push(`${name}:show`);
            },
        });
        const sheets = fixtureMap([
            ["App entries", helperSheet("App entries", false)],
            ["Dashboard", basicSheet("Dashboard")],
            ["History", basicSheet("History")],
            ["History view", basicSheet("History view")],
            ["Integrity", helperSheet("Integrity", true)],
            ["Quick log", basicSheet("Quick log")],
        ]);
        const spreadsheet = {
            getNumSheets: () => sheets.size,
            getSheetByName: (/** @type {string} */ name) =>
                sheets.get(name) ?? null,
            moveActiveSheet: (/** @type {number} */ index) => {
                events.push(`move:${index}`);
            },
            setActiveSheet: (/** @type {{ name: string }} */ sheet) => {
                events.push(`active:${sheet.name}`);
            },
        };

        context.organizeWorkbookSheets_(spreadsheet);

        expect(events).toContain("Quick log:hide:6");
        expect(events).toContain("History:hide:4");
        expect(events).toContain("History view:hide:4");
        expect(events).toContain("Integrity:show");
        expect(events).toContain("Integrity:hide-sheet");
        expect(events).not.toContain("App entries:show");
        expect(events.at(-1)).toBe("active:Dashboard");
    });

    it("resolves descriptive workbook-page names by permanent plant ID", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const pages = [
            { getName: () => "Dashboard" },
            { getName: () => "P01 Moon cactus" },
            { getName: () => "P02 Feather cactus" },
        ];
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "P02" ? { getName: () => "P02" } : null,
            getSheets: () => pages,
        };

        expect(context.plantPageSheet_(spreadsheet, "P01").getName()).toBe(
            "P01 Moon cactus"
        );
        expect(context.plantPageSheet_(spreadsheet, "P02").getName()).toBe(
            "P02"
        );
        expect(() => context.plantPageSheet_(spreadsheet, "P03")).toThrow(
            /Workbook page for P03 is missing/v
        );
        expect(() => context.plantPageSheet_(spreadsheet, "starter-1")).toThrow(
            /Invalid workbook plant ID/v
        );
        expect(() =>
            context.plantPageSheet_(
                {
                    getSheetByName: () => null,
                    getSheets: () => [
                        { getName: () => "P01 first" },
                        { getName: () => "P01 second" },
                    ],
                },
                "p01"
            )
        ).toThrow(/More than one workbook page/v);
    });

    it("requires an exact plant ID boundary before a descriptive page name", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const spreadsheet = {
            getSheetByName: () => null,
            getSheets: () => [
                { getName: () => "P010 Other plant" },
                { getName: () => "P01suffix" },
                { getName: () => "P01\u{00A0}Moon cactus" },
            ],
        };

        expect(context.plantPageSheet_(spreadsheet, " P01 ").getName()).toBe(
            "P01\u{00A0}Moon cactus"
        );
    });
});

describe("garden logger mobile bootstrap and collection lookups", () => {
    it("builds the mobile bootstrap from tracker, baseline, and history data", () => {
        expect.hasAssertions();

        const repotValues = Array.from(
            { length: 21 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        repotValues[0] = new Date("2026-08-10T12:00:00Z");
        repotValues[1] = "P01";
        repotValues[2] = "Repot";
        repotValues[9] = new Date("2026-08-10T12:01:00Z");
        repotValues[20] = "5 in";
        const dryWeightValues = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        dryWeightValues[0] = new Date("2026-08-16T12:00:00Z");
        dryWeightValues[1] = "P01";
        dryWeightValues[2] = "Weigh";
        dryWeightValues[3] = "Dry";
        dryWeightValues[4] = 405;
        dryWeightValues[9] = new Date("2026-08-16T12:01:00Z");
        dryWeightValues[10] = 2;
        dryWeightValues[35] = "Active";
        const higherWeightValues = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        higherWeightValues[0] = new Date("2026-08-15T12:00:00Z");
        higherWeightValues[1] = "P01";
        higherWeightValues[2] = "Weigh";
        higherWeightValues[3] = "Wet";
        higherWeightValues[4] = 450;
        higherWeightValues[9] = new Date("2026-08-15T12:01:00Z");
        higherWeightValues[10] = 2;
        higherWeightValues[29] = "wet-bootstrap";
        higherWeightValues[35] = "Active";
        const firstWaterValues = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        firstWaterValues[0] = new Date("2026-08-15T12:00:00Z");
        firstWaterValues[1] = "P01";
        firstWaterValues[2] = "Water";
        firstWaterValues[10] = 2;
        firstWaterValues[29] = "wet-bootstrap";
        firstWaterValues[35] = "Active";
        const closingWaterValues = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        closingWaterValues[0] = new Date("2026-08-17T12:00:00Z");
        closingWaterValues[1] = "P01";
        closingWaterValues[2] = "Water";
        closingWaterValues[10] = 2;
        closingWaterValues[29] = "next-cycle";
        closingWaterValues[35] = "Active";
        const history = createHistorySheet([
            {
                requestId: "garden-bootstrap-12345",
                values: repotValues,
            },
            {
                requestId: "garden-bootstrap-24680",
                values: higherWeightValues,
            },
            {
                requestId: "garden-bootstrap-water1",
                values: firstWaterValues,
            },
            {
                requestId: "garden-bootstrap-67890",
                values: dryWeightValues,
            },
            {
                requestId: "garden-bootstrap-water2",
                values: closingWaterValues,
            },
        ]);
        const trackerHeader = Array.from(
            { length: 28 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        trackerHeader[27] = "Current pot size";
        const trackerPlant = Array.from(
            { length: 28 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        trackerPlant[0] = "P01";
        trackerPlant[1] = "Old man of the Andes";
        trackerPlant[2] = "Oreocereus trollii";
        trackerPlant[3] = new Date("2026-08-01T12:00:00Z");
        trackerPlant[4] = 15;
        trackerPlant[6] = 412;
        trackerPlant[14] = "A1";
        trackerPlant[27] = "4 in";
        const trackerFormulas = [
            trackerHeader,
            Array.from(
                { length: 28 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            ),
        ];
        required(trackerFormulas[1])[13] =
            '=HYPERLINK("https://example.test/p01","Guide")';
        const sheets = fixtureMap([
            [
                "Baselines",
                createDataSheet("Baselines", [
                    [
                        "Plant ID",
                        "Latest weight",
                        "Last weighed",
                        "Pot setup",
                    ],
                    [
                        "P01",
                        412,
                        new Date("2026-08-16T12:00:00Z"),
                        2,
                    ],
                ]),
            ],
            ["History", history],
            [
                "Plant tracker",
                createDataSheet(
                    "Plant tracker",
                    [trackerHeader, trackerPlant],
                    trackerFormulas
                ),
            ],
        ]);
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                sheets.get(name) ?? null,
            getSpreadsheetTimeZone: () => "America/New_York",
        };
        const context = loadAppsScript(history, { spreadsheet });

        const bootstrap = context.getWebAppBootstrap();

        expect(bootstrap.version).toBe("5.18.3");
        expect(bootstrap.plants).toHaveLength(1);
        expect(bootstrap.plants[0]).toMatchObject({
            currentPotSize: "4 in",
            dryOrLowestWeight: 405,
            dryOrLowestWeightBasis: "Completed cycle",
            dryOrLowestWeightDate: "2026-08-16T12:00:00.000Z",
            fieldGuideUrl: "https://example.test/p01",
            id: "P01",
            label: "A1",
            latestWeight: 412,
            potSetup: 2,
        });
        expect(Array.from(bootstrap.recent)).toHaveLength(5);
        expect(structuredClone(history.__rangeReads)).toStrictEqual([
            { column: 1, columnCount: 42, row: 2, rowCount: 5 },
        ]);
    });

    it("keeps P01-P30 bootstrap order and maps current and nursery-label images exactly", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(appSheetBulkPlants);
        const trackerLabels = [
            "A1",
            "A2",
            "A3",
            "B1",
            "B2",
            "B3",
            "C1",
            "C2",
            "C3",
            "D1",
            "D2",
            "D3",
            "E1",
            "E2",
            "E3",
            "F1",
            "F2",
            "F3",
            "#1",
            "#2",
            "#3",
            "#4",
            "G2",
            "H1",
            "H2",
            "H3",
            "G1",
            "G3",
            "#5",
            "#6",
        ];
        required(workbook.sheets.get("Plant tracker"))
            .getRange(2, 15, trackerLabels.length, 1)
            .setValues(trackerLabels.map((label) => [label]));
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
        });

        const plants = structuredClone(context.getWebAppBootstrap().plants);

        expect(structuredClone(plants.map(({ id }) => id))).toStrictEqual(
            appSheetBulkPlants
        );
        expect(structuredClone(plants.map(({ label }) => label))).toStrictEqual(
            trackerLabels
        );

        const observedRunInContext = structuredClone(
            stringArray(vm.runInContext("APP_SHEET_BULK_PLANTS", context))
        );

        expect(observedRunInContext).toStrictEqual(appSheetBulkPlants);

        const observedFromEntries = structuredClone(
            Object.fromEntries(
                plants.map((plant) => [
                    plant.id,
                    {
                        currentImageUrl: plant.currentImageUrl,
                        nurseryLabelImageUrl: plant.nurseryLabelImageUrl,
                    },
                ])
            )
        );

        expect(observedFromEntries).toStrictEqual(expectedPlantImageUrls);
        expect(plants.find(({ id }) => id === "P28")).toMatchObject({
            currentPotSize: "4 in",
        });
        expect(plants.at(-1)).toMatchObject({
            currentPotSize: "5 in",
            id: "P30",
        });
    });

    it("keeps the logger usable when a forecast is missing and forwards the new date/guidance when present", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
        });
        overrideAppsScript(
            context,
            "dryDownModelsFromHistory_",
            () => new Map([["P01", { window: "Sep 10–Sep 15" }]])
        );
        const missing = context.getWebAppBootstrap().plants;

        expect(missing).toHaveLength(2);
        expect(missing[0]).toMatchObject({
            dryForecastBasis: "",
            dryForecastWindow: "Sep 10–Sep 15",
            recommendedWaterDate: "",
            wateringGuidance: "",
        });
        expect(missing[1]).toMatchObject({
            dryForecastBasis: "",
            dryForecastWindow: "",
            recommendedWaterDate: "",
            wateringGuidance: "",
        });

        overrideAppsScript(
            context,
            "dryDownModelsFromHistory_",
            () =>
                new Map([
                    [
                        "P01",
                        {
                            basis: "Historical estimate · 2 learned cycles",
                            waterDate: "Sep 12, 2026",
                            waterGuidance:
                                "Confirm dry roots and plant readiness.",
                            window: "Sep 10–Sep 15",
                        },
                    ],
                ])
        );

        expect(context.getWebAppBootstrap().plants[0]).toMatchObject({
            dryForecastBasis: "Historical estimate · 2 learned cycles",
            recommendedWaterDate: "Sep 12, 2026",
            wateringGuidance: "Confirm dry roots and plant readiness.",
        });
    });

    it("covers empty bootstrap data and collection defaults", () => {
        expect.hasAssertions();

        const emptyHistory = createHistorySheet();
        const emptyTracker = createDataSheet("Plant tracker", [[]], [[]]);
        const emptyBaselines = createDataSheet("Baselines", [[]]);
        const emptySheets = fixtureMap([
            ["Baselines", emptyBaselines],
            ["History", emptyHistory],
            ["Plant tracker", emptyTracker],
        ]);
        const emptySpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                emptySheets.get(name) ?? null,
            getSpreadsheetTimeZone: () => "America/New_York",
        };
        const emptyContext = loadAppsScript(emptyHistory, {
            spreadsheet: emptySpreadsheet,
        });

        const observedGetWebAppBootstrap = structuredClone(
            structuredClone(emptyContext.getWebAppBootstrap().plants)
        );

        expect(observedGetWebAppBootstrap).toStrictEqual([]);

        const trackerRow = Array.from(
            { length: 15 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        trackerRow[0] = "P99";
        trackerRow[1] = "Unmapped plant";
        trackerRow[14] = "Z9";
        const defaultTracker = createDataSheet(
            "Plant tracker",
            [
                Array.from(
                    { length: 15 },
                    () =>
                        /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                            ""
                        )
                ),
                trackerRow,
            ],
            [
                Array.from(
                    { length: 15 },
                    () =>
                        /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                            ""
                        )
                ),
                Array.from(
                    { length: 15 },
                    () =>
                        /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                            ""
                        )
                ),
            ]
        );
        const defaultBaselines = createDataSheet("Baselines", [
            [
                "Plant ID",
                "Dry baseline",
                "Pot setup",
            ],
        ]);
        const defaultSheets = fixtureMap([
            ["Baselines", defaultBaselines],
            ["History", emptyHistory],
            ["Plant tracker", defaultTracker],
        ]);
        const defaultSpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                defaultSheets.get(name) ?? null,
            getSpreadsheetTimeZone: () => "America/New_York",
        };
        const defaultContext = loadAppsScript(emptyHistory, {
            spreadsheet: defaultSpreadsheet,
        });
        const [plant] = defaultContext.getWebAppBootstrap().plants;

        expect(required(plant).potSetup).toBe(1);
        expect(required(plant).currentPotSize).toBe("Not logged");
        expect(required(plant).fieldGuideUrl).toBe(
            "https://nick2bad4u.github.io/Gardening/"
        );

        defaultBaselines.getRange(2, 1, 1, 3).setValues([
            [
                "P99",
                "",
                "",
            ],
        ]);

        expect(
            required(defaultContext.getWebAppBootstrap().plants[0]).potSetup
        ).toBe(1);
    });

    it("resolves reordered Baselines headers and rejects ambiguous schemas", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const reordered = createDataSheet("Baselines", [
            [
                "Plant ID",
                "Latest weight",
                "Last weighed",
                "Pot setup",
            ],
            [
                "P01",
                412,
                new Date("2026-08-16T12:00:00Z"),
                3,
            ],
        ]);

        const observedBaselinePotSetupData = structuredClone(
            structuredClone(context.baselinePotSetupData_(reordered))
        );

        expect(observedBaselinePotSetupData).toStrictEqual({
            potSetupColumn: 4,
            rows: [["P01", 3]],
        });
        expect(
            context.optionalColumnForHeader_(
                createDataSheet("Empty", [[]]),
                "Plant ID"
            )
        ).toBe(0);
        expect(() =>
            context.optionalColumnForHeader_(
                createDataSheet("Duplicate", [
                    [
                        "Plant ID",
                        "Plant ID",
                        "Pot setup",
                    ],
                ]),
                "Plant ID"
            )
        ).toThrow(/more than one "plant id" header/iv);
        expect(() =>
            context.requiredColumnForHeader_(
                createDataSheet("Missing", [["Plant ID"]]),
                "Pot setup"
            )
        ).toThrow(/missing the "pot setup" header/iv);
    });

    it("covers empty, duplicate, and fallback workbook lookups", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const emptyTracker = createDataSheet("Plant tracker", [[]]);
        const emptyBaselines = createDataSheet("Baselines", [[]]);
        const emptyHistory = createHistorySheet();
        const emptySpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                ({
                    Baselines: emptyBaselines,
                    History: emptyHistory,
                    "Plant tracker": emptyTracker,
                })[name] ?? null,
        };

        expect(context.plantRecordsById_(emptySpreadsheet).size).toBe(0);
        expect(context.plantNamesById_(emptySpreadsheet).size).toBe(0);

        const observedGetRecentObservations = structuredClone(
            context.getRecentObservations_(
                emptySpreadsheet,
                "America/New_York",
                10,
                new Map()
            )
        );

        expect(observedGetRecentObservations).toStrictEqual([]);
        expect(() => {
            context.updateBaselinePotSetup_(emptySpreadsheet, "P01", 2);
        }).toThrow(/missing from baselines/iv);

        const duplicateRow = Array.from(
            { length: 15 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        duplicateRow[0] = "P01";
        const duplicateTracker = createDataSheet(
            "Plant tracker",
            [
                Array.from(
                    { length: 15 },
                    () =>
                        /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                            ""
                        )
                ),
                duplicateRow,
                [...duplicateRow],
            ],
            [
                Array.from(
                    { length: 15 },
                    () =>
                        /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                            ""
                        )
                ),
                Array.from(
                    { length: 15 },
                    () =>
                        /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                            ""
                        )
                ),
                Array.from(
                    { length: 15 },
                    () =>
                        /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                            ""
                        )
                ),
            ]
        );
        const duplicateSpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                ({
                    Baselines: createDataSheet("Baselines", [
                        [
                            "Plant ID",
                            "Dry baseline",
                            "Pot setup",
                        ],
                    ]),
                    History: emptyHistory,
                    "Plant tracker": duplicateTracker,
                })[name] ?? null,
        };

        expect(() => context.plantRecordsById_(duplicateSpreadsheet)).toThrow(
            /more than once in plant tracker/iv
        );
        expect(() => {
            context.assertUniquePlantIds_([{ id: "P01" }, { id: "P01" }]);
        }).toThrow(/more than once/iv);
        expect(() => {
            context.assertUniqueIdsInRows_(
                [
                    [""],
                    ["P01"],
                    ["P01"],
                ],
                "Test"
            );
        }).toThrow(/more than once in test/iv);
    });
});

describe("garden logger canonical observation persistence", () => {
    it("flushes spreadsheet writes before releasing the script lock", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        /** @type {string[]} */
        const order = [];
        const context = loadAppsScript(workbook.history, {
            globals: {
                LockService: {
                    getScriptLock: () => ({
                        releaseLock: () => {
                            order.push("release");
                        },
                        tryLock: () => true,
                    }),
                },
            },
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp: {
                flush: () => {
                    order.push("flush");
                },
                openById: () => workbook.spreadsheet,
            },
        });

        context.saveWebObservation({
            events: ["Weigh"],
            observedAt: "2026-08-16T12:00:00Z",
            plantId: "P01",
            requestId: "garden-flush-123456",
            weight: 450,
        });

        expect(structuredClone(order)).toStrictEqual(["flush", "release"]);
    });

    it("appends structured rows and treats a matching retry as idempotent", () => {
        expect.hasAssertions();

        const history = createHistorySheet();
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? history : null,
        };
        const context = loadAppsScript(history, { spreadsheet });
        const input = {
            condition: "Firm",
            currentLabel: "A1",
            details: {
                flowerCount: 2,
                flowerDetails: "Pink crown",
                nutrientAmount: "0.5 g/gal",
                nutrientProduct: "MSU 13-3-15",
                nutrientsUsed: "Yes",
                pestIssue: "Mealybug",
                pestTreatment: "Isolated and treated",
                photoUrl: "https://photos.app.goo.gl/example",
                potSize: "5 in",
                previousPotSize: "4 in",
                waterAmount: 125,
                wateringApplication: "Thorough",
            },
            eventNames: [
                "Water",
                "Weigh",
                "Measure",
                "Check",
                "Repot",
                "Flower",
                "Photo",
                "Pest",
            ],
            height: 12,
            notes: "Full collection check",
            observationDate: new Date("2026-08-16T08:00:00-04:00"),
            plantId: "P01",
            potSetup: 3,
            requestId: "garden-append-12345",
            weight: 430,
            weightState: "Wet",
            width: 7,
        };

        const first = context.appendObservation_(spreadsheet, input);
        const retry = context.appendObservation_(spreadsheet, input);

        expect(first).toMatchObject({
            duplicate: false,
            historyRows: 8,
            targetRow: 2,
        });
        expect(retry).toMatchObject({
            duplicate: true,
            historyRows: 8,
            targetRow: 2,
        });
        expect(required(history.__rows[1])[1]).toBe("P01");
        expect(required(history.__rows[1])[2]).toBe("Water");
        expect(required(history.__rows[1])[15]).toBe("garden-append-12345");
        expect(required(history.__rows[1])[16]).toBe("Yes");
        expect(required(history.__rows[5])[20]).toBe("5 in");
        expect(required(history.__rows[8])[25]).toBe("Isolated and treated");
        expect(history.__rows[1]).toHaveLength(42);
        expect(required(history.__rows[1])[12]).toMatch(/^=IF\(/v);
        expect(required(history.__rows[1])[13]).toMatch(
            /\^\(Water\|Repot\)\$/v
        );
        expect(required(history.__rows[1])[14]).toMatch(/^=IF\(/v);
        expect(
            structuredClone(required(history.__rows[1]).slice(26, 36))
        ).toStrictEqual([
            "garden-append-12345:1:water",
            "Apps Script",
            "Observed",
            "garden-append-12345",
            "",
            "",
            "",
            "",
            "Observed",
            "Active",
        ]);
        expect(
            structuredClone(required(history.__rows[1]).slice(36))
        ).toStrictEqual([
            "",
            '=IF(F2="","",F2/2.54)',
            '=IF(G2="","",G2/2.54)',
            "",
            "Thorough",
            125,
        ]);
        expect(required(history.__rows[2])[28]).toBe("Measured");
        expect(required(history.__rows[2])[34]).toBe("Scale");
        expect(required(history.__rows[3])[28]).toBe("Estimated");
        expect(required(history.__rows[3])[34]).toBe("Unspecified");
        expect(required(history.__rows[3])[36]).toBe("cm");
    });

    it("saves a complete mobile observation and advances a repot setup", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        const payload = {
            condition: "Firm",
            events: [
                "Water",
                "Weigh",
                "Measure",
                "Check",
                "Repot",
                "Flower",
                "Photo",
                "Pest",
            ],
            flowerCount: 1,
            flowerDetails: "Crown bud",
            height: 13,
            measurementMethod: "Ruler",
            measurementQuality: "Measured",
            measurementUnit: "in",
            medium: "Mineral cactus mix",
            notes: "Mobile round",
            nutrientsUsed: "No",
            observedAt: "2026-08-16T08:00:00-04:00",
            pestIssue: "None found",
            pestTreatment: "Routine inspection",
            photoUrl: "https://photos.google.com/share/example",
            plantId: "P01",
            potSize: "5 in",
            requestId: "garden-mobile-12345",
            soilMoisture: "Dry",
            weight: 440,
            weightState: "Wet",
            width: 8,
        };
        const result = context.saveWebObservation(payload);
        const retry = context.saveWebObservation(payload);

        expect(result).toMatchObject({
            duplicate: false,
            historyRows: 8,
            ok: true,
            plantId: "P01",
        });
        expect(result.events).toContain("Repot");
        expect(retry).toMatchObject({ duplicate: true, historyRows: 8 });
        expect(required(workbook.history.__rows[1])[10]).toBe(2);
        expect(required(workbook.history.__rows[3])[28]).toBe("Measured");
        expect(required(workbook.history.__rows[3])[34]).toBe("Ruler");
        expect(required(workbook.history.__rows[3])[5]).toBe(33.02);
        expect(required(workbook.history.__rows[3])[6]).toBe(20.32);
        expect(required(workbook.history.__rows[3])[36]).toBe("in");
        expect(required(workbook.history.__rows[3])[37]).toBe(
            '=IF(F4="","",F4/2.54)'
        );
        expect(required(workbook.history.__rows[4])[32]).toBe("Dry");
        expect(required(workbook.history.__rows[5])[33]).toBe(
            "Mineral cactus mix"
        );

        const observedGetValues = required(
            required(workbook.sheets.get("Baselines"))
                .getRange(2, 20)
                .getValues()[0]
        )[0];

        expect(observedGetValues).toBe(2);
    });

    it("clears inherited AL/AM validation before a batch write and in the installer", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"], {
            measurementValidations: true,
        });
        let flushCount = 0;
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp: {
                flush: () => {
                    flushCount += 1;
                },
                newDataValidation: createDataValidationBuilder,
                openById: () => workbook.spreadsheet,
                ProtectionType: { RANGE: "RANGE" },
            },
        });

        const result = context.saveWebObservationBatch([
            {
                events: ["Measure"],
                height: 5,
                measurementUnit: "in",
                observedAt: "2026-08-16T10:00:00-04:00",
                plantId: "P01",
                requestId: "garden-validation-repair-12345",
                width: 4,
            },
        ]);

        expect(result).toMatchObject({ ok: true, savedCount: 1 });
        expect(flushCount).toBe(1);
        expect(workbook.history.__clearDataValidationCalls).toContainEqual({
            column: 38,
            columnCount: 2,
            row: 2,
            rowCount: 1,
        });
        expect(workbook.history.__validationCells.has("2:38")).toBe(false);
        expect(workbook.history.__validationCells.has("3:38")).toBe(true);

        context.ensureHistoryMeasurementColumns_(workbook.history, true);

        expect(workbook.history.__clearDataValidationCalls).toContainEqual({
            column: 38,
            columnCount: 2,
            row: 2,
            rowCount: 4999,
        });
        expect(
            [...workbook.history.__validationCells].some((key) =>
                /:3[89]$/v.test(key)
            )
        ).toBe(false);
        expect(workbook.history.__validationCells.has("2:37")).toBe(true);
    });

    it("keeps Water second after Weigh and preserves batch measurement metadata", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        const result = context.saveWebObservationBatch([
            {
                events: ["Water", "Weigh"],
                nutrientsUsed: "No",
                observedAt: "2026-08-16T10:00:00-04:00",
                plantId: "P01",
                requestId: "garden-wet-order-12345",
                weight: 1949,
                weightState: "Wet",
            },
            {
                events: ["Measure"],
                height: 5,
                measurementMethod: "Ruler",
                measurementQuality: "Measured",
                measurementUnit: "in",
                observedAt: "2026-08-16T10:01:00-04:00",
                plantId: "P02",
                requestId: "garden-measure-batch-12345",
                width: 4,
            },
        ]);

        expect(
            structuredClone(result.results.map((entry) => entry.historyRows))
        ).toStrictEqual([2, 1]);
        expect(
            structuredClone(
                workbook.history.__rows.slice(1, 3).map((row) => row[2])
            )
        ).toStrictEqual(["Weigh", "Water"]);
        expect(required(workbook.history.__rows[1])[4]).toBe(1949);
        expect(required(workbook.history.__rows[2])[4]).toBe("");
        expect(required(workbook.history.__rows[3])[5]).toBe(12.7);
        expect(required(workbook.history.__rows[3])[6]).toBe(10.16);
        expect(required(workbook.history.__rows[3])[28]).toBe("Measured");
        expect(required(workbook.history.__rows[3])[34]).toBe("Ruler");
        expect(required(workbook.history.__rows[3])[36]).toBe("in");

        const wetRetry = context.saveWebObservationBatch([
            {
                events: ["Water", "Weigh"],
                nutrientsUsed: "No",
                observedAt: "2026-08-16T10:00:00-04:00",
                plantId: "P01",
                requestId: "garden-wet-order-12345",
                weight: 1949,
                weightState: "Wet",
            },
        ]);

        expect(wetRetry.results[0]).toMatchObject({
            duplicate: true,
            historyRows: 2,
            ok: true,
        });
    });

    it("stores weights as Routine for derived classification and defaults rotations to 90 degrees", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        const result = context.saveWebObservationBatch([
            {
                events: ["Weigh"],
                observedAt: "2026-08-16T12:00:00-04:00",
                plantId: "P01",
                requestId: "garden-wet-only-12345",
                weight: 889,
                weightState: "Wet",
            },
            {
                events: ["Rotation"],
                observedAt: "2026-08-16T12:01:00-04:00",
                plantId: "P02",
                requestId: "garden-rotation-default-12345",
            },
        ]);

        expect(result).toMatchObject({
            failedCount: 0,
            ok: true,
            savedCount: 2,
        });
        expect(
            structuredClone(
                workbook.history.__rows.slice(1).map((row) => row[2])
            )
        ).toStrictEqual(["Weigh", "Rotation"]);
        expect(required(workbook.history.__rows[1])[3]).toBe("Routine");
        expect(required(workbook.history.__rows[1])[16]).toBe("");
        expect(required(workbook.history.__rows[2])[39]).toBe(90);
    });

    it("rejects changed payloads that reuse a completed request ID", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            condition: "Firm",
            entrySource: "Mobile logger",
            events: [
                "Weigh",
                "Measure",
                "Check",
            ],
            height: 5,
            measurementMethod: "Ruler",
            measurementQuality: "Measured",
            measurementUnit: "in",
            notes: "Baseline observation",
            observedAt: "2026-08-16T10:00:00-04:00",
            plantId: "P01",
            requestId: "garden-strict-retry-12345",
            weight: 450,
            weightState: "Routine",
            width: 4,
        };

        const saved = context.saveWebObservationBatch([payload]);
        const exactRetry = context.saveWebObservationBatch([payload]);

        expect(saved).toMatchObject({ ok: true, savedCount: 1 });
        expect(exactRetry.results[0]).toMatchObject({
            duplicate: true,
            historyRows: 3,
            ok: true,
        });

        const legacyStateRetry = context.saveWebObservationBatch([
            { ...payload, weightState: "Dry" },
        ]);

        expect(legacyStateRetry.results[0]).toMatchObject({
            duplicate: true,
            historyRows: 3,
            ok: true,
        });

        const changedPayloads = [
            { ...payload, weight: 451 },
            { ...payload, notes: "Changed note" },
            { ...payload, height: 6 },
            { ...payload, measurementUnit: "cm" },
            { ...payload, measurementMethod: "Other" },
            { ...payload, entrySource: "AppSheet" },
            {
                ...payload,
                condition: "",
                events: ["Weigh", "Measure"],
            },
        ];
        for (const changed of changedPayloads) {
            const result = context.saveWebObservationBatch([changed]);

            expect(result.results[0]).toMatchObject({
                errorCode: "HISTORY_CONFLICT",
                ok: false,
                requestId: payload.requestId,
                retryable: false,
            });
            expect(required(result.results[0]).message).toMatch(
                /no longer matches|unexpected history shape/iv
            );
        }
        const prepared = context.prepareWebObservation_(
            workbook.spreadsheet,
            payload
        ).observation;

        expect(() =>
            context.existingObservationResult_(
                prepared,
                payload.requestId,
                [
                    2,
                    3,
                    5,
                ],
                workbook.history.__rows.slice(1)
            )
        ).toThrow(/unexpected history shape/iv);
        expect(workbook.history.__setValuesCalls).toHaveLength(1);
        expect(workbook.history.__rows).toHaveLength(4);
    });
});

describe("garden logger phone queue batches and per-entry failures", () => {
    it("saves a mixed phone queue in one retry-safe batch", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        const result = context.saveWebObservationBatch([
            {
                entrySource: "AppSheet bulk",
                events: ["Weigh"],
                observedAt: "2026-08-16T10:00:00-04:00",
                plantId: "P01",
                requestId: "garden-queue-one-12345",
                weight: 410,
                weightState: "Routine",
            },
            {
                events: ["Measure"],
                height: 12,
                observedAt: "2026-08-16T10:01:00-04:00",
                plantId: "P02",
                requestId: "garden-queue-two-12345",
            },
            {
                events: ["Repot"],
                observedAt: "2026-08-16T10:02:00-04:00",
                plantId: "P01",
                potSize: "5 in",
                requestId: "garden-queue-repot-12345",
            },
        ]);

        expect(result).toMatchObject({
            failedCount: 0,
            ok: true,
            savedCount: 3,
        });
        expect(
            structuredClone(result.results.map((entry) => entry.plantId))
        ).toStrictEqual([
            "P01",
            "P02",
            "P01",
        ]);
        expect(
            structuredClone(
                workbook.history.__rows.slice(1).map((row) => row[15])
            )
        ).toStrictEqual([
            "garden-queue-one-12345",
            "garden-queue-two-12345",
            "garden-queue-repot-12345",
        ]);
        expect(required(workbook.history.__rows[1])[27]).toBe("AppSheet bulk");

        const observedGetValues2 = required(
            required(workbook.sheets.get("Baselines"))
                .getRange(2, 20)
                .getValues()[0]
        )[0];

        expect(observedGetValues2).toBe(2);
    });

    it("writes a 30-plant weighing round in one contiguous constant-I/O batch", () => {
        expect.hasAssertions();

        const plantIds = Array.from(
            { length: 30 },
            (_, index) => `P${String(index + 1).padStart(2, "0")}`
        );
        const workbook = createLoggerWorkbook(plantIds);
        let flushCount = 0;
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp: {
                flush: () => {
                    flushCount += 1;
                },
                newDataValidation: createDataValidationBuilder,
                openById: () => workbook.spreadsheet,
                ProtectionType: { RANGE: "RANGE" },
            },
        });
        const payloads = plantIds.map((plantId, index) => ({
            events: ["Weigh"],
            observedAt: `2026-08-16T10:${String(index).padStart(2, "0")}:00-04:00`,
            plantId,
            requestId: `garden-one-call-${String(index + 1).padStart(2, "0")}-12345`,
            weight: 400 + index,
            weightState: "Routine",
        }));
        const result = context.saveWebObservationBatch(payloads);

        expect(result).toMatchObject({
            failedCount: 0,
            ok: true,
            savedCount: 30,
        });

        const historyWrites = workbook.history.__setValuesCalls.filter(
            (call) =>
                call.row >= 2 && call.column === 1 && call.columnCount === 42
        );

        expect(structuredClone(historyWrites)).toStrictEqual([
            { column: 1, columnCount: 42, row: 2, rowCount: 30 },
        ]);
        expect(flushCount).toBe(1);
        expect(workbook.history.__rangeReads.length).toBeLessThan(20);
        expect(
            structuredClone(
                workbook.history.__rows.slice(1).map((row) => row[15])
            )
        ).toStrictEqual(payloads.map((payload) => payload.requestId));

        const retry = context.saveWebObservationBatch(payloads);

        expect(retry.results.every((entry) => entry.duplicate === true)).toBe(
            true
        );
        expect(workbook.history.__setValuesCalls).toHaveLength(1);
        expect(workbook.history.__rows).toHaveLength(31);

        const historyOperationCount = (/** @type {number} */ count) => {
            const comparisonWorkbook = createLoggerWorkbook(
                plantIds.slice(0, count)
            );
            const comparisonContext = loadAppsScript(
                comparisonWorkbook.history,
                {
                    globals: comparisonWorkbook.globals,
                    spreadsheet: comparisonWorkbook.spreadsheet,
                }
            );
            comparisonContext.saveWebObservationBatch(
                payloads.slice(0, count).map((payload) => ({
                    ...payload,
                    requestId: `${payload.requestId}-compare`,
                }))
            );
            return comparisonWorkbook.history.__rangeReads.length;
        };

        expect(historyOperationCount(30)).toBe(historyOperationCount(1));
    });

    it("keeps a bad queued item isolated while saving valid neighbors", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        const result = context.saveWebObservationBatch([
            {
                events: ["Weigh"],
                observedAt: "2026-08-16T10:00:00-04:00",
                plantId: "P01",
                requestId: "garden-queue-good-12345",
                weight: 410,
            },
            {
                events: ["Measure"],
                observedAt: "2026-08-16T10:01:00-04:00",
                plantId: "P02",
                requestId: "garden-queue-bad-12345",
            },
            {
                events: ["Weigh"],
                observedAt: "2026-08-16T10:02:00-04:00",
                plantId: "P01",
                requestId: "short",
                weight: 411,
            },
        ]);

        expect(result).toMatchObject({
            failedCount: 2,
            ok: false,
            savedCount: 1,
        });
        expect(result.results[1]).toMatchObject({
            ok: false,
            requestId: "garden-queue-bad-12345",
        });
        expect(required(result.results[1]).message).toMatch(
            /height or width/iv
        );
        expect(result.results[2]).toMatchObject({
            errorCode: "VALIDATION",
            ok: false,
            requestId: "short",
            retryable: false,
        });
        expect(required(result.results[2]).message).toMatch(
            /request id is not valid/iv
        );
    });

    it("covers queue size, identity, and lock guards", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(() => context.saveWebObservationBatch([])).toThrow(/empty/iv);
        expect(() =>
            context.saveWebObservationBatch(
                Array.from({ length: 51 }, (_, index) => ({
                    requestId: `garden-overflow-${String(index).padStart(3, "0")}`,
                }))
            )
        ).toThrow(/at most 50/iv);

        const duplicate = {
            events: ["Weigh"],
            observedAt: "2026-08-16T12:00:00Z",
            plantId: "P01",
            requestId: "garden-duplicate-12345",
            weight: 450,
        };

        expect(() =>
            context.saveWebObservationBatch([duplicate, duplicate])
        ).toThrow(/unique request id/iv);

        const locked = loadAppsScript(workbook.history, {
            globals: {
                LockService: {
                    getScriptLock: () => ({
                        releaseLock: () => {},
                        tryLock: () => false,
                    }),
                },
            },
            spreadsheet: workbook.spreadsheet,
        });

        expect(() => locked.saveWebObservation(duplicate)).toThrow(
            /another reading/iv
        );
        expect(() => locked.saveWebObservationBatch([duplicate])).toThrow(
            /queue remains/iv
        );
    });

    it("returns durable per-item failures for invalid and failed queue entries", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            events: ["Weigh"],
            observedAt: "2026-08-16T12:00:00Z",
            plantId: "P01",
            requestId: "garden-queue-edge-12345",
            weight: 450,
        };

        const originalNormalizeRequestId = context.normalizeRequestId_;
        overrideAppsScript(context, "normalizeRequestId_", () => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- Fault injection verifies recovery from non-Error service failures.
            throw "invalid request ID";
        });
        const invalidRequestId = context.saveWebObservationBatch([payload]);

        expect(required(invalidRequestId.results[0]).message).toBe(
            "invalid request ID"
        );

        context.normalizeRequestId_ = originalNormalizeRequestId;

        const originalPrepare = context.prepareWebObservation_;
        overrideAppsScript(context, "prepareWebObservation_", () => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- Fault injection verifies recovery from non-Error service failures.
            throw "invalid queue item";
        });
        const invalid = context.saveWebObservationBatch([payload]);

        expect(invalid.savedCount).toBe(0);
        expect(required(invalid.results[0]).message).toBe("invalid queue item");

        context.prepareWebObservation_ = originalPrepare;

        const originalAppend = context.appendPreparedWebObservationBatch_;
        vm.runInContext(
            'appendPreparedWebObservationBatch_ = () => { throw new Error("spreadsheet write failed"); };',
            context
        );

        expect(() => context.saveWebObservationBatch([payload])).toThrow(
            "spreadsheet write failed"
        );

        vm.runInContext(
            'appendPreparedWebObservationBatch_ = () => { throw "non-error failure"; };',
            context
        );

        expect(() =>
            context.saveWebObservationBatch([
                { ...payload, requestId: "garden-queue-edge-67890" },
            ])
        ).toThrow("non-error failure");

        context.appendPreparedWebObservationBatch_ = originalAppend;
    });

    it("normalizes a non-Error History conflict into a per-item batch result", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const existingRow = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        existingRow[0] = new Date("2026-08-16T12:00:00Z");
        existingRow[1] = "P01";
        existingRow[2] = "Weigh";
        existingRow[15] = "garden-string-conflict-12345";
        workbook.history.__rows.push(existingRow);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        vm.runInContext(
            'existingObservationResult_ = () => { throw "string conflict"; };',
            context
        );

        const result = context.saveWebObservationBatch([
            {
                events: ["Weigh"],
                observedAt: "2026-08-16T12:00:00Z",
                plantId: "P01",
                requestId: "garden-string-conflict-12345",
                weight: 450,
            },
        ]);

        expect(result.results[0]).toMatchObject({
            errorCode: "HISTORY_CONFLICT",
            message: "string conflict",
            ok: false,
            retryable: false,
        });
    });
});

describe("garden logger bulk care and watering rounds", () => {
    it("archives multi-event bulk care with one canonical History write", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        const result = context.saveBulkCareObservation({
            events: ["Rotation", "Clean"],
            notes: "Turned and dusted.",
            observedAt: "2026-08-16T12:15:00-04:00",
            plantIds: ["P01", "P02"],
            requestId: "garden-bulk-care-12345",
            rotationDegrees: 135,
        });

        expect(result).toMatchObject({
            duplicateCount: 0,
            ok: true,
            plantCount: 2,
        });
        expect(structuredClone(Array.from(result.events))).toStrictEqual([
            "Rotation",
            "Clean",
        ]);
        expect(
            structuredClone(
                workbook.history.__rows.slice(1).map((row) => row[2])
            )
        ).toStrictEqual([
            "Rotation",
            "Clean",
            "Rotation",
            "Clean",
        ]);
        expect(required(workbook.history.__rows[1])[39]).toBe(135);
        expect(required(workbook.history.__rows[3])[39]).toBe(135);
        expect(required(workbook.history.__rows[1])[27]).toBe(
            "Mobile bulk care"
        );
        expect(
            structuredClone(
                workbook.history.__setValuesCalls.filter(
                    (call) => call.column === 1 && call.row >= 2
                )
            )
        ).toStrictEqual([{ column: 1, columnCount: 42, row: 2, rowCount: 4 }]);
    });

    it("validates bulk-care inputs and keeps retry messages actionable", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const basePayload = {
            events: ["Clean"],
            observedAt: "2026-08-16T12:30:00-04:00",
            plantIds: ["P01"],
            requestId: "garden-bulk-guard-12345",
        };

        expect(() =>
            context.saveBulkCareObservation({
                ...basePayload,
                plantIds: [],
            })
        ).toThrow(/at least one plant/iv);
        expect(() =>
            context.saveBulkCareObservation({
                ...basePayload,
                events: [],
            })
        ).toThrow(/at least one bulk-care event/iv);
        expect(() =>
            context.saveBulkCareObservation({
                ...basePayload,
                events: ["Photo"],
            })
        ).toThrow(/supports only/iv);

        for (const rotationDegrees of [
            "not-a-number",
            0,
            361,
        ]) {
            expect(() =>
                context.saveBulkCareObservation({
                    ...basePayload,
                    events: ["Rotation"],
                    rotationDegrees,
                })
            ).toThrow(/more than 0 and at most 360/iv);
        }

        const first = context.saveBulkCareObservation(basePayload);

        expect(first.message).toBe("Clean saved for 1 plant.");

        const duplicate = context.saveBulkCareObservation(basePayload);

        expect(duplicate).toMatchObject({ duplicateCount: 1 });
        expect(duplicate.message).toMatch(/already saved/iv);

        const failingContext = loadAppsScript(createHistorySheet(), {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        overrideAppsScript(failingContext, "saveWebObservationBatch", () => {
            throw new Error("Another reading is finishing");
        });

        expect(() =>
            failingContext.saveBulkCareObservation({
                ...basePayload,
                requestId: "garden-bulk-lock-12345",
            })
        ).toThrow(/bulk-care round remains on this screen/iv);

        overrideAppsScript(failingContext, "saveWebObservationBatch", () => {
            throw new Error("Spreadsheet unavailable");
        });

        expect(() =>
            failingContext.saveBulkCareObservation({
                ...basePayload,
                requestId: "garden-bulk-service-12345",
            })
        ).toThrow(/spreadsheet unavailable/iv);

        overrideAppsScript(failingContext, "saveWebObservationBatch", () => ({
            results: [{ message: "Correct this entry.", ok: false }],
        }));

        expect(() =>
            failingContext.saveBulkCareObservation({
                ...basePayload,
                requestId: "garden-bulk-invalid-12345",
            })
        ).toThrow(/correct this entry/iv);

        overrideAppsScript(failingContext, "saveWebObservationBatch", () => ({
            results: [null],
        }));

        expect(() =>
            failingContext.saveBulkCareObservation({
                ...basePayload,
                requestId: "garden-bulk-fallback-12345",
            })
        ).toThrow(/could not be saved/iv);
    });

    it("archives an idempotent multi-plant watering round", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            notes: "Full soak",
            nutrientsUsed: "No",
            observedAt: "2026-08-16T09:00:00-04:00",
            plantIds: [
                "P01",
                "P02",
                "P01",
            ],
            requestId: "garden-bulk-save-12345",
        };

        const first = context.saveBulkWaterObservation(payload);
        const retry = context.saveBulkWaterObservation(payload);
        const recent = Array.from(context.getRecentWebObservations(25));

        expect(first).toMatchObject({
            duplicateCount: 0,
            ok: true,
            plantCount: 2,
        });
        expect(retry).toMatchObject({
            duplicateCount: 2,
            ok: true,
            plantCount: 2,
        });
        expect(recent).toHaveLength(2);
        expect(
            structuredClone(
                recent
                    .map((entry) => entry.plantId)
                    .toSorted((left, right) => left.localeCompare(right))
            )
        ).toStrictEqual(["P01", "P02"]);
    });

    it("archives a 30-plant bulk watering round with one History write and flush", () => {
        expect.hasAssertions();

        const plantIds = Array.from(
            { length: 30 },
            (_, index) => `P${String(index + 1).padStart(2, "0")}`
        );
        const workbook = createLoggerWorkbook(plantIds);
        let flushCount = 0;
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp: {
                flush: () => {
                    flushCount += 1;
                },
                newDataValidation: createDataValidationBuilder,
                openById: () => workbook.spreadsheet,
                ProtectionType: { RANGE: "RANGE" },
            },
        });

        const result = context.saveBulkWaterObservation({
            notes: "Full collection watering",
            nutrientsUsed: "No",
            observedAt: "2026-08-16T10:00:00-04:00",
            plantIds,
            requestId: "garden-bulk-water-30-12345",
        });

        expect(result).toMatchObject({
            duplicateCount: 0,
            ok: true,
            plantCount: 30,
        });
        expect(
            structuredClone(workbook.history.__setValuesCalls)
        ).toStrictEqual([{ column: 1, columnCount: 42, row: 2, rowCount: 30 }]);
        expect(flushCount).toBe(1);
        expect(workbook.history.__rows.slice(1)).toHaveLength(30);
        expect(
            workbook.history.__rows
                .slice(1)
                .every(
                    (row) =>
                        row[2] === "Water" && row[27] === "Mobile bulk water"
                )
        ).toBe(true);

        const requestIds = new Set(
            workbook.history.__rows.slice(1).map((row) => row[15])
        );

        expect(requestIds.size).toBe(30);
    });

    it("rejects invalid, locked, and failed bulk watering rounds", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(() => context.saveBulkWaterObservation()).toThrow(
            /at least one plant/iv
        );
        expect(() => context.saveBulkWaterObservation({})).toThrow(
            /at least one plant/iv
        );
        expect(() =>
            context.saveBulkWaterObservation({
                nutrientsUsed: "No",
                plantIds: ["P99"],
                requestId: "garden-water-invalid-12345",
            })
        ).toThrow(/is not valid/iv);

        const locked = loadAppsScript(workbook.history, {
            globals: {
                LockService: {
                    getScriptLock: () => ({
                        releaseLock: () => {},
                        tryLock: () => false,
                    }),
                },
            },
            spreadsheet: workbook.spreadsheet,
        });

        expect(() =>
            locked.saveBulkWaterObservation({
                nutrientsUsed: "No",
                observedAt: "2026-08-16T12:00:00Z",
                plantIds: ["P01"],
                requestId: "garden-water-locked-12345",
            })
        ).toThrow(/bulk-care round remains/iv);

        const failed = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        vm.runInContext(
            'saveWebObservationBatch = () => ({ results: [{ ok: false, message: "Correct this round." }] });',
            failed
        );

        expect(() =>
            failed.saveBulkWaterObservation({
                nutrientsUsed: "No",
                observedAt: "2026-08-16T12:00:00Z",
                plantIds: ["P01"],
                requestId: "garden-water-failed-12345",
            })
        ).toThrow("Correct this round.");

        vm.runInContext(
            "saveWebObservationBatch = () => ({ results: [{ ok: false }] });",
            failed
        );

        expect(() =>
            failed.saveBulkWaterObservation({
                nutrientsUsed: "No",
                observedAt: "2026-08-16T12:00:00Z",
                plantIds: ["P01"],
                requestId: "garden-water-default-failure-12345",
            })
        ).toThrow(/could not be saved/iv);

        vm.runInContext(
            "saveWebObservationBatch = () => ({ results: [null] });",
            failed
        );

        expect(() =>
            failed.saveBulkWaterObservation({
                nutrientsUsed: "No",
                observedAt: "2026-08-16T12:00:00Z",
                plantIds: ["P01"],
                requestId: "garden-water-null-result-12345",
            })
        ).toThrow(/could not be saved/iv);

        vm.runInContext(
            'saveWebObservationBatch = () => { throw "bulk string failure"; };',
            failed
        );
        let thrown;
        try {
            failed.saveBulkWaterObservation({
                nutrientsUsed: "No",
                observedAt: "2026-08-16T12:00:00Z",
                plantIds: ["P01"],
                requestId: "garden-water-string-failure-12345",
            });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBe("bulk string failure");
    });
});

describe("garden logger AppSheet entry intake", () => {
    it("archives an AppSheet intake row through the canonical batch writer", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const entry = emptyCells(appSheetEntryHeaders.length);
        entry[0] = "A1B2C3D4";
        entry[1] = new Date("2026-08-16T10:00:00-04:00");
        entry[2] = "P01";
        entry[3] = "Water, Weigh";
        entry[4] = "Wet";
        entry[5] = 1949;
        entry[8] = "in";
        entry[12] = "No";
        entry[26] = "Queued";
        required(workbook.sheets.get("App entries")).__rows.push(entry);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        const result = context.processAppSheetEntry("A1B2C3D4");

        expect(result).toMatchObject({
            duplicate: false,
            entryId: "A1B2C3D4",
            historyRows: 2,
            ok: true,
            requestId: "appsheet-A1B2C3D4",
        });
        expect(
            structuredClone(
                workbook.history.__rows.slice(1, 3).map((row) => row[2])
            )
        ).toStrictEqual(["Weigh", "Water"]);
        expect(
            structuredClone(
                workbook.history.__rows.slice(1, 3).map((row) => row[27])
            )
        ).toStrictEqual(["AppSheet", "AppSheet"]);
        expect(entry[26]).toBe("Saved");
        expect(entry[28]).toBe("appsheet-A1B2C3D4");
        expect(entry[29]).toBe(2);
        expect(entry[30]).toBeInstanceOf(Date);

        const retry = context.processAppSheetEntry("A1B2C3D4");

        expect(retry).toMatchObject({
            duplicate: true,
            historyRows: 2,
            ok: true,
        });
        expect(workbook.history.__rows).toHaveLength(3);
    });

    it("archives an AppSheet Rotation entry with its degree value", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const entry = emptyCells(appSheetEntryHeaders.length);
        entry[0] = "ROTATE123";
        entry[1] = new Date("2026-08-16T10:05:00-04:00");
        entry[2] = "P01";
        entry[3] = "Rotation";
        entry[26] = "Queued";
        entry[31] = 180;
        required(workbook.sheets.get("App entries")).__rows.push(entry);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(context.processAppSheetEntry("ROTATE123")).toMatchObject({
            historyRows: 1,
            ok: true,
        });
        expect(required(workbook.history.__rows[1])[2]).toBe("Rotation");
        expect(required(workbook.history.__rows[1])[39]).toBe(180);
    });

    it("stores AppSheet measurement units and leaves validation errors editable", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const measurement = emptyCells(appSheetEntryHeaders.length);
        measurement[0] = "E5F6A7B8";
        measurement[1] = new Date("2026-08-16T10:01:00-04:00");
        measurement[2] = "P01";
        measurement[3] = "Measure";
        measurement[6] = 5;
        measurement[7] = 4;
        measurement[8] = "in";
        measurement[17] = "Measured";
        measurement[18] = "Ruler";
        measurement[26] = "Queued";
        const invalidWater = emptyCells(appSheetEntryHeaders.length);
        invalidWater[0] = "C9D0E1F2";
        invalidWater[1] = new Date("2026-08-16T10:02:00-04:00");
        invalidWater[2] = "P02";
        invalidWater[3] = "Water";
        invalidWater[26] = "Queued";
        const entries = workbook.sheets.get("App entries");
        required(entries).__rows.push(measurement, invalidWater);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        const measured = context.processAppSheetEntry("E5F6A7B8");
        const rejected = context.processAppSheetEntry("C9D0E1F2");

        expect(measured.ok).toBe(true);
        expect(required(workbook.history.__rows[1])[5]).toBe(12.7);
        expect(required(workbook.history.__rows[1])[6]).toBe(10.16);
        expect(required(workbook.history.__rows[1])[36]).toBe("in");
        expect(required(workbook.history.__rows[1])[37]).toBe(
            '=IF(F2="","",F2/2.54)'
        );
        expect(required(workbook.history.__rows[1])[38]).toBe(
            '=IF(G2="","",G2/2.54)'
        );
        expect(rejected).toMatchObject({
            entryId: "C9D0E1F2",
            ok: false,
            retryable: false,
        });
        expect(invalidWater[26]).toBe("Needs correction");
        expect(invalidWater[27]).toMatch(/nutrients/iv);
        expect(invalidWater[28]).toBe("appsheet-C9D0E1F2");
        expect(workbook.history.__rows).toHaveLength(2);
    });

    it("marks an AppSheet intake row Retry when infrastructure is busy", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const entry = emptyCells(appSheetEntryHeaders.length);
        entry[0] = "A9B8C7D6";
        entry[2] = "P01";
        entry[3] = "Check";
        entry[9] = "Firm";
        entry[26] = "Queued";
        required(workbook.sheets.get("App entries")).__rows.push(entry);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        context.LockService = {
            getScriptLock: () => ({
                releaseLock: () => {},
                tryLock: () => false,
            }),
        };

        expect(() => context.processAppSheetEntry("A9B8C7D6")).toThrow(
            /another reading/iv
        );
        expect(entry[26]).toBe("Retry");
        expect(entry[27]).toMatch(/another reading/iv);
        expect(entry[28]).toBe("appsheet-A9B8C7D6");
        expect(workbook.history.__rows).toHaveLength(1);
    });

    it("rejects missing and duplicated AppSheet entry identities", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const entries = workbook.sheets.get("App entries");

        expect(() => context.processAppSheetEntry("")).toThrow(
            /entry id is required/iv
        );
        expect(() => context.processAppSheetEntry("NOTTHERE")).toThrow(
            /was not found/iv
        );

        const other = emptyCells(appSheetEntryHeaders.length);
        other[0] = "OTHER123";
        required(entries).__rows.push(other);

        expect(() => context.processAppSheetEntry("NOTTHERE")).toThrow(
            /was not found/iv
        );

        const duplicate = emptyCells(appSheetEntryHeaders.length);
        duplicate[0] = "DUPLICATE1";
        required(entries).__rows.push(duplicate, [...duplicate]);

        expect(() => context.processAppSheetEntry("DUPLICATE1")).toThrow(
            /duplicated/iv
        );

        const observedAppSheetEventList = structuredClone(
            Array.from(
                context.appSheetEventList_([
                    " Water ",
                    "Water",
                    "Weigh",
                ])
            )
        );

        expect(observedAppSheetEventList).toStrictEqual(["Water", "Weigh"]);
    });

    it("normalizes delimited AppSheet lists without changing array validation", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const whitespace = " \t\n\u{00A0}".repeat(12_500);

        expect(
            Array.from(
                context.appSheetEventList_(
                    ` ; Water${whitespace}; , Weigh, Water;\t; `
                )
            )
        ).toStrictEqual(["Water", "Weigh"]);
        expect(
            Array.from(context.appSheetEventList_(`Check${whitespace}unknown`))
        ).toStrictEqual([`Check${whitespace}unknown`]);
        expect(
            Array.from(context.appSheetEventList_(" ; ,\t; "))
        ).toStrictEqual([]);
        expect(
            Array.from(
                context.appSheetBulkWateredPlants_(
                    ` ; P01${whitespace}; , P30, P01;\t; `
                )
            )
        ).toStrictEqual(["P01", "P30"]);
        expect(
            Array.from(context.appSheetBulkWateredPlants_(whitespace))
        ).toStrictEqual([]);
        expect(() =>
            context.appSheetBulkWateredPlants_(`P01${whitespace}P30`)
        ).toThrow(/Unknown selected plant ID/v);
        expect(() => context.appSheetBulkWateredPlants_(["P01", " "])).toThrow(
            /Unknown selected plant ID/v
        );
        expect(() => context.appSheetBulkWateredPlants_("P01, p30")).toThrow(
            "Unknown selected plant ID: p30."
        );
    });

    it("returns a stable receipt for an already-saved AppSheet row", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const saved = emptyCells(appSheetEntryHeaders.length);
        saved[0] = "SAVED123";
        saved[26] = "Saved";
        required(workbook.sheets.get("App entries")).__rows.push(saved);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(context.processAppSheetEntry("SAVED123")).toMatchObject({
            duplicate: true,
            historyRows: 0,
            message: "This AppSheet entry is saved.",
            ok: true,
            requestId: "",
        });
    });

    it("preserves retryable and malformed AppSheet automation failures", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const retryable = emptyCells(appSheetEntryHeaders.length);
        retryable[0] = "RETRY123";
        retryable[2] = "P01";
        retryable[3] = "Check";
        const malformed = emptyCells(appSheetEntryHeaders.length);
        malformed[0] = "MALFORM1";
        malformed[2] = "P01";
        malformed[3] = "Check";
        const thrown = emptyCells(appSheetEntryHeaders.length);
        thrown[0] = "THROWN12";
        thrown[2] = "P01";
        thrown[3] = "Check";
        const entries = workbook.sheets.get("App entries");
        required(entries).__rows.push(retryable, malformed, thrown);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        overrideAppsScript(context, "saveWebObservationBatch", () => ({
            results: [
                {
                    message: "Temporary service failure.",
                    ok: false,
                    retryable: true,
                },
            ],
        }));

        expect(context.processAppSheetEntry("RETRY123")).toMatchObject({
            ok: false,
            retryable: true,
        });
        expect(retryable[26]).toBe("Retry");

        overrideAppsScript(context, "saveWebObservationBatch", () => ({
            results: [],
        }));

        expect(context.processAppSheetEntry("MALFORM1")).toMatchObject({
            ok: false,
            retryable: false,
        });
        expect(malformed[26]).toBe("Needs correction");
        expect(malformed[27]).toMatch(/needs correction/iv);

        overrideAppsScript(context, "saveWebObservationBatch", () => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- Fault injection verifies recovery from non-Error service failures.
            throw "String service failure";
        });

        expect(() => context.processAppSheetEntry("THROWN12")).toThrow(
            "String service failure"
        );
        expect(thrown[26]).toBe("Retry");
        expect(thrown[27]).toBe("String service failure");
    });

    it("extends the previous AppSheet entry schema without shifting data", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const previousHeaders = appSheetEntryHeaders.slice(0, -2);
        const stagedRow = emptyCells(previousHeaders.length);
        stagedRow[0] = "ENTRY123";
        stagedRow[31] = 90;
        const entries = createDataSheet("App entries", [
            previousHeaders,
            stagedRow,
        ]);
        entries.setParent(workbook.spreadsheet);
        workbook.sheets.set("App entries", entries);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(context.ensureAppSheetEntryColumns_(entries, true)).toBe(true);
        expect(structuredClone(entries.__rows[0])).toStrictEqual(
            appSheetEntryHeaders
        );
        expect(structuredClone(entries.__rows[1])).toStrictEqual(stagedRow);
        expect(
            structuredClone(entries.getRange(2, 33, 1, 2).getDisplayValues()[0])
        ).toStrictEqual(["", ""]);

        const tableBackedEntries = createDataSheet("App entries", [
            [
                ...appSheetEntryHeaders.slice(0, -2),
                "Column 33",
                "Column 34",
            ],
        ]);
        tableBackedEntries.setParent(workbook.spreadsheet);

        expect(
            context.ensureAppSheetEntryColumns_(tableBackedEntries, true)
        ).toBe(true);
        expect(structuredClone(tableBackedEntries.__rows[0])).toStrictEqual(
            appSheetEntryHeaders
        );

        required(entries.__rows[0])[33] = "Water amount";

        expect(() => context.ensureAppSheetEntryColumns_(entries)).toThrow(
            /app entries!ah1 must be "water amount \(ml\)"/iv
        );
    });
});

describe("garden logger AppSheet bulk submission and validation", () => {
    it("submits a 30-plant AppSheet weight round in one canonical batch", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(appSheetBulkPlants);
        const round = emptyCells(appSheetBulkHeaders.length);
        round[0] = "BULK2801";
        round[1] = new Date("2026-08-25T08:00:00-04:00");
        round[2] = new Date("2026-08-25T08:05:00-04:00");
        round[appSheetBulkActionIndex] = "Weigh";
        round[appSheetBulkWeightStateIndex] = "Routine";
        for (const index of appSheetBulkPlants.keys()) {
            round[appSheetBulkWeightStartIndex + index] = 300 + index;
        }
        round[appSheetBulkNotesIndex] = "Collection weight round.";
        round[appSheetBulkStatusIndex] = "Queued";
        required(workbook.sheets.get("App bulk")).__rows.push(round);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        /** @type {import("../apps-script-fixtures.d.ts").WebPayload[][]} */
        const batches = [];
        overrideAppsScript(context, "saveWebObservationBatch", (payloads) => {
            batches.push(payloads);
            return {
                results: payloads.map(() => ({
                    historyRows: 1,
                    message: "Weight saved.",
                    ok: true,
                    retryable: false,
                })),
            };
        });

        const result = context.processQueuedAppSheetEntries();

        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(30);
        expect(
            structuredClone(required(batches[0]).map(({ plantId }) => plantId))
        ).toStrictEqual(appSheetBulkPlants);
        expect(
            structuredClone(
                required(batches[0]).map(({ requestId }) => requestId)
            )
        ).toStrictEqual(
            appSheetBulkPlants.map(
                (plantId) => `appsheet-bulk-BULK2801-${plantId}`
            )
        );
        expect(required(batches[0])[0]).toMatchObject({
            entrySource: "AppSheet bulk",
            events: ["Weigh"],
            notes: "Collection weight round.",
            weight: 300,
            weightState: "Routine",
        });
        expect(round[appSheetBulkStatusIndex]).toBe("Saved");
        expect(round[appSheetBulkStatusIndex + 1]).toBe(
            "30 plant updates saved."
        );
        expect(round[appSheetBulkStatusIndex + 2]).toBe(30);
        expect(round[appSheetBulkStatusIndex + 3]).toBe(30);
        expect(round[appSheetBulkStatusIndex + 4]).toBeInstanceOf(Date);
        expect(result).toMatchObject({
            bulk: {
                deferredCount: 0,
                installed: true,
                needsCorrectionCount: 0,
                processedCount: 1,
                queuedCount: 1,
                requestedCount: 30,
                retryCount: 0,
                savedRequestCount: 30,
                savedRoundCount: 1,
            },
            ok: true,
            queuedCount: 0,
        });
    });

    it("submits compact Water-only and combined AppSheet rounds", () => {
        expect.hasAssertions();

        const runRound = (
            /** @type {import("../logger-fixtures.d.ts").CellValue[]} */ round
        ) => {
            const workbook = createLoggerWorkbook([
                "P01",
                "P02",
                "P03",
            ]);
            required(workbook.sheets.get("App bulk")).__rows.push(round);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            /**
             * @type {unknown[]}
             */
            /** @type {import("../apps-script-fixtures.d.ts").WebPayload[][]} */
            const batches = [];
            overrideAppsScript(
                context,
                "saveWebObservationBatch",
                (payloads) => {
                    batches.push(payloads);
                    return {
                        results: payloads.map(() => ({
                            ok: true,
                            retryable: false,
                        })),
                    };
                }
            );
            const result = context.processQueuedAppSheetEntries();
            return { batches, result };
        };

        const waterRound = emptyCells(appSheetBulkHeaders.length);
        waterRound[0] = "WATER-ROUND";
        waterRound[appSheetBulkActionIndex] = "Water";
        waterRound[appSheetBulkSelectedPlantsIndex] = "P01, P03";
        waterRound[appSheetBulkStatusIndex] = "Queued";
        const water = runRound(waterRound);

        expect(water.batches).toHaveLength(1);
        expect(structuredClone(water.batches[0])).toStrictEqual([
            expect.objectContaining({
                events: ["Water"],
                plantId: "P01",
                weight: "",
                weightState: "",
            }),
            expect.objectContaining({
                events: ["Water"],
                plantId: "P03",
                weight: "",
                weightState: "",
            }),
        ]);
        expect(waterRound[appSheetBulkStatusIndex + 1]).toBe(
            "2 plant updates saved."
        );

        const combinedRound = emptyCells(appSheetBulkHeaders.length);
        combinedRound[0] = "COMBINED-ROUND";
        combinedRound[appSheetBulkActionIndex] = "Water + weigh";
        combinedRound[appSheetBulkSelectedPlantsIndex] = "P01 ; P02";
        combinedRound[appSheetBulkWeightStartIndex] = 510;
        combinedRound[appSheetBulkWeightStartIndex + 2] = 530;
        combinedRound[appSheetBulkStatusIndex] = "Queued";
        const combined = runRound(combinedRound);

        expect(combined.batches).toHaveLength(1);
        expect(structuredClone(combined.batches[0])).toStrictEqual([
            expect.objectContaining({
                events: ["Water", "Weigh"],
                plantId: "P01",
                weight: 510,
                weightState: "Routine",
            }),
            expect.objectContaining({
                events: ["Water"],
                plantId: "P02",
                weight: "",
                weightState: "",
            }),
            expect.objectContaining({
                events: ["Weigh"],
                plantId: "P03",
                weight: 530,
                weightState: "Routine",
            }),
        ]);
        expect(combined.result.bulk).toMatchObject({
            requestedCount: 3,
            savedRequestCount: 3,
            savedRoundCount: 1,
        });
    });

    it("validates bulk modes and ignores fields hidden by the selected mode", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const makeRound = (/** @type {string} */ action) => {
            const row = emptyCells(appSheetBulkHeaders.length);
            row[0] = `MODE-${action || "DEFAULT"}`;
            row[appSheetBulkActionIndex] = action;
            return row;
        };

        expect(context.normalizeAppSheetBulkAction_("")).toBe("Weigh");
        expect(() => context.normalizeAppSheetBulkAction_("Mist")).toThrow(
            /must be one of: water, weigh, water \+ weigh, rotation/iv
        );
        expect(
            structuredClone([...context.appSheetBulkWateredPlants_("")])
        ).toStrictEqual([]);
        expect(
            structuredClone([
                ...context.appSheetBulkWateredPlants_([
                    "P01",
                    " P02 ",
                    "P01",
                ]),
            ])
        ).toStrictEqual(["P01", "P02"]);
        expect(() => context.appSheetBulkWateredPlants_("P01, P99")).toThrow(
            /unknown selected plant id: p99/iv
        );

        const waterWithoutPlants = makeRound("Water");

        expect(() =>
            context.appSheetBulkPayloadsFromRow_(
                waterWithoutPlants,
                waterWithoutPlants[0]
            )
        ).toThrow(/at least one watered plant/iv);

        const weighWithoutWeights = makeRound("Weigh");

        expect(() =>
            context.appSheetBulkPayloadsFromRow_(
                weighWithoutWeights,
                weighWithoutWeights[0]
            )
        ).toThrow(/at least one plant weight/iv);

        const combinedWithoutWater = makeRound("Water + weigh");
        combinedWithoutWater[appSheetBulkWeightStartIndex] = 350;

        expect(() =>
            context.appSheetBulkPayloadsFromRow_(
                combinedWithoutWater,
                combinedWithoutWater[0]
            )
        ).toThrow(/at least one watered plant/iv);

        const combinedWithoutWeight = makeRound("Water + weigh");
        combinedWithoutWeight[appSheetBulkSelectedPlantsIndex] = "P01";

        expect(() =>
            context.appSheetBulkPayloadsFromRow_(
                combinedWithoutWeight,
                combinedWithoutWeight[0]
            )
        ).toThrow(/at least one plant weight/iv);

        const waterWithHiddenWeight = makeRound("Water");
        waterWithHiddenWeight[appSheetBulkSelectedPlantsIndex] = "P01";
        waterWithHiddenWeight[appSheetBulkWeightStartIndex] = 999;

        expect(
            structuredClone(
                context.appSheetBulkPayloadsFromRow_(
                    waterWithHiddenWeight,
                    waterWithHiddenWeight[0]
                )
            )
        ).toStrictEqual([
            expect.objectContaining({
                payload: expect.objectContaining({
                    events: ["Water"],
                    weight: "",
                    weightState: "",
                }),
            }),
        ]);

        const zeroWeight = makeRound("Weigh");
        zeroWeight[appSheetBulkWeightStartIndex] = 0;

        expect(
            structuredClone(
                context.appSheetBulkPayloadsFromRow_(zeroWeight, zeroWeight[0])
            )
        ).toStrictEqual([
            expect.objectContaining({
                payload: expect.objectContaining({
                    events: ["Weigh"],
                    weight: 0,
                    weightState: "Routine",
                }),
            }),
        ]);

        const rotation = makeRound("Rotation");
        rotation[appSheetBulkSelectedPlantsIndex] = "P01, P02";
        rotation[appSheetBulkRotationIndex] = 120;

        expect(
            structuredClone(
                context
                    .appSheetBulkPayloadsFromRow_(rotation, rotation[0])
                    .map(({ payload }) => ({
                        events: Array.from(payload.events),
                        plantId: payload.plantId,
                        rotationDegrees: payload.rotationDegrees,
                    }))
            )
        ).toStrictEqual([
            { events: ["Rotation"], plantId: "P01", rotationDegrees: 120 },
            { events: ["Rotation"], plantId: "P02", rotationDegrees: 120 },
        ]);

        const waterWithNutrients = makeRound("Water");
        waterWithNutrients[appSheetBulkSelectedPlantsIndex] = "P01";
        waterWithNutrients[appSheetBulkNutrientsUsedIndex] = "Yes";
        waterWithNutrients[appSheetBulkNutrientProductIndex] = "MSU mix";
        waterWithNutrients[appSheetBulkNutrientAmountIndex] = "0.5 g/gal";

        expect(
            required(
                context.appSheetBulkPayloadsFromRow_(
                    waterWithNutrients,
                    waterWithNutrients[0]
                )[0]
            ).payload
        ).toMatchObject({
            events: ["Water"],
            nutrientAmount: "0.5 g/gal",
            nutrientProduct: "MSU mix",
            nutrientsUsed: "Yes",
        });
    });

    it("keeps a partially valid bulk round idempotent and editable", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const round = emptyCells(appSheetBulkHeaders.length);
        round[0] = "BULKFIX1";
        round[appSheetBulkActionIndex] = "Weigh";
        round[appSheetBulkWeightStateIndex] = "Routine";
        round[appSheetBulkWeightStartIndex] = 0;
        round[appSheetBulkWeightStartIndex + 1] = 420;
        round[appSheetBulkStatusIndex] = "Queued";
        required(workbook.sheets.get("App bulk")).__rows.push(round);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        /** @type {(string | undefined)[][]} */
        const requestIds = [];
        overrideAppsScript(context, "saveWebObservationBatch", (payloads) => {
            requestIds.push(payloads.map(({ requestId }) => requestId));
            return {
                results: [
                    {
                        message: "Weight must be greater than zero.",
                        ok: false,
                        retryable: false,
                    },
                    {
                        historyRows: 1,
                        message: "Weight saved.",
                        ok: true,
                        retryable: false,
                    },
                ],
            };
        });

        const first = context.processQueuedAppSheetEntries();

        expect(round[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(round[appSheetBulkStatusIndex + 1]).toMatch(
            /1 of 2 saved.*p01.*greater than zero/iv
        );
        expect(round[appSheetBulkStatusIndex + 2]).toBe(2);
        expect(round[appSheetBulkStatusIndex + 3]).toBe(1);
        expect(first.bulk).toMatchObject({
            needsCorrectionCount: 1,
            savedRequestCount: 1,
        });

        round[appSheetBulkWeightStartIndex] = 410;
        round[appSheetBulkStatusIndex] = "Retry";
        overrideAppsScript(context, "saveWebObservationBatch", (payloads) => {
            requestIds.push(payloads.map(({ requestId }) => requestId));
            return {
                results: payloads.map(
                    (_payload, /** @type {number} */ index) => ({
                        duplicate: index === 1,
                        historyRows: 1,
                        message: "Weight saved.",
                        ok: true,
                        retryable: false,
                    })
                ),
            };
        });

        const retry = context.processQueuedAppSheetEntries();

        expect(structuredClone(requestIds)).toStrictEqual([
            ["appsheet-bulk-BULKFIX1-P01", "appsheet-bulk-BULKFIX1-P02"],
            ["appsheet-bulk-BULKFIX1-P01", "appsheet-bulk-BULKFIX1-P02"],
        ]);
        expect(round[appSheetBulkStatusIndex]).toBe("Saved");
        expect(round[appSheetBulkStatusIndex + 1]).toBe(
            "2 plant updates saved."
        );
        expect(round[appSheetBulkStatusIndex + 3]).toBe(2);
        expect(retry.bulk).toMatchObject({
            needsCorrectionCount: 0,
            savedRequestCount: 2,
            savedRoundCount: 1,
        });
    });

    it("isolates invalid bulk rounds and defers a whole round beyond the batch cap", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(appSheetBulkPlants);
        const bulkSheet = workbook.sheets.get("App bulk");
        const makeRound = (/** @type {string} */ roundId, weightCount = 30) => {
            const row = emptyCells(appSheetBulkHeaders.length);
            row[0] = roundId;
            row[appSheetBulkActionIndex] = "Weigh";
            row[appSheetBulkWeightStateIndex] = "Routine";
            for (let index = 0; index < weightCount; index += 1) {
                row[appSheetBulkWeightStartIndex + index] = 300 + index;
            }
            row[appSheetBulkStatusIndex] = "Queued";
            required(bulkSheet).__rows.push(row);
            return row;
        };
        const missingId = makeRound("", 1);
        const duplicateOne = makeRound("DUPLICATE", 1);
        const duplicateTwo = makeRound("DUPLICATE", 1);
        const emptyRound = makeRound("EMPTY", 0);
        const firstRound = makeRound("ROUND-A");
        const secondRound = makeRound("ROUND-B");
        const deferredRound = makeRound("ROUND-C");
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        /** @type {import("../apps-script-fixtures.d.ts").WebPayload[][]} */
        const batches = [];
        overrideAppsScript(context, "saveWebObservationBatch", (payloads) => {
            batches.push(payloads);
            return {
                results: payloads.map(() => ({ ok: true, retryable: false })),
            };
        });

        const result = context.processQueuedAppSheetEntries();

        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(30);
        expect(missingId[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(missingId[appSheetBulkStatusIndex + 1]).toMatch(
            /round id is required/iv
        );
        expect(duplicateOne[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(duplicateTwo[appSheetBulkStatusIndex + 1]).toMatch(
            /duplicated/iv
        );
        expect(emptyRound[appSheetBulkStatusIndex + 1]).toMatch(
            /at least one plant weight/iv
        );
        expect(firstRound[appSheetBulkStatusIndex]).toBe("Saved");
        expect(secondRound[appSheetBulkStatusIndex]).toBe("Queued");
        expect(deferredRound[appSheetBulkStatusIndex]).toBe("Queued");
        expect(result.bulk).toMatchObject({
            deferredCount: 2,
            needsCorrectionCount: 4,
            processedCount: 5,
            queuedCount: 7,
            requestedCount: 30,
            savedRequestCount: 30,
            savedRoundCount: 1,
        });
    });

    it("marks a round for correction when its derived request set is empty", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const round = emptyCells(appSheetBulkHeaders.length);
        round[0] = "EMPTY-DERIVED";
        round[appSheetBulkActionIndex] = "Weigh";
        round[appSheetBulkWeightStartIndex] = 410;
        round[appSheetBulkStatusIndex] = "Queued";
        required(workbook.sheets.get("App bulk")).__rows.push(round);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        overrideAppsScript(context, "appSheetBulkPayloadsFromRow_", () => []);

        const result = context.processQueuedAppSheetEntries();

        expect(round[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(round[appSheetBulkStatusIndex + 1]).toMatch(
            /select at least one watered plant or enter at least one weight/iv
        );
        expect(result.bulk).toMatchObject({
            needsCorrectionCount: 1,
            requestedCount: 0,
            savedRequestCount: 0,
        });
    });

    it("handles an unavailable or entirely invalid AppSheet bulk intake", () => {
        expect.hasAssertions();

        const missingWorkbook = createLoggerWorkbook(["P01"]);
        missingWorkbook.sheets.delete("App bulk");
        const missingContext = loadAppsScript(missingWorkbook.history, {
            globals: missingWorkbook.globals,
            spreadsheet: missingWorkbook.spreadsheet,
        });

        expect(
            missingContext.processQueuedAppSheetEntries().bulk
        ).toMatchObject({
            installed: false,
            processedCount: 0,
            queuedCount: 0,
        });

        const invalidWorkbook = createLoggerWorkbook(["P01"]);
        const invalidRound = emptyCells(appSheetBulkHeaders.length);
        invalidRound[appSheetBulkActionIndex] = "Weigh";
        invalidRound[appSheetBulkWeightStartIndex] = 350;
        invalidRound[appSheetBulkStatusIndex] = "Queued";
        required(invalidWorkbook.sheets.get("App bulk")).__rows.push(
            invalidRound
        );
        const invalidContext = loadAppsScript(invalidWorkbook.history, {
            globals: invalidWorkbook.globals,
            spreadsheet: invalidWorkbook.spreadsheet,
        });
        overrideAppsScript(invalidContext, "saveWebObservationBatch", () => {
            throw new Error("No batch should be sent.");
        });

        const invalidResult = invalidContext.processQueuedAppSheetEntries();

        expect(invalidRound[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(invalidResult.bulk).toMatchObject({
            processedCount: 1,
            requestedCount: 0,
            savedRequestCount: 0,
        });

        const malformedWorkbook = createLoggerWorkbook(["P01"]);
        const malformedRound = emptyCells(appSheetBulkHeaders.length);
        malformedRound[0] = "MALFORMED";
        malformedRound[appSheetBulkActionIndex] = "Weigh";
        malformedRound[appSheetBulkWeightStartIndex] = 350;
        malformedRound[appSheetBulkStatusIndex] = "Queued";
        required(malformedWorkbook.sheets.get("App bulk")).__rows.push(
            malformedRound
        );
        const malformedContext = loadAppsScript(malformedWorkbook.history, {
            globals: malformedWorkbook.globals,
            spreadsheet: malformedWorkbook.spreadsheet,
        });
        overrideAppsScript(
            malformedContext,
            "appSheetBulkPayloadsFromRow_",
            () => {
                // eslint-disable-next-line @typescript-eslint/only-throw-error -- Fault injection verifies recovery from non-Error service failures.
                throw "Malformed bulk row.";
            }
        );

        malformedContext.processQueuedAppSheetEntries();

        expect(malformedRound[appSheetBulkStatusIndex]).toBe(
            "Needs correction"
        );
        expect(malformedRound[appSheetBulkStatusIndex + 1]).toBe(
            "Malformed bulk row."
        );
    });

    it("defaults single-weight bulk rows and reports incomplete transient results", () => {
        expect.hasAssertions();

        const singleWorkbook = createLoggerWorkbook(["P01"]);
        const singleRound = emptyCells(appSheetBulkHeaders.length);
        const startedAt = new Date("2026-08-25T08:00:00-04:00");
        singleRound[0] = "SINGLE";
        singleRound[1] = startedAt;
        singleRound[appSheetBulkWeightStartIndex] = 350;
        singleRound[appSheetBulkStatusIndex] = "Queued";
        required(singleWorkbook.sheets.get("App bulk")).__rows.push(
            singleRound
        );
        const singleContext = loadAppsScript(singleWorkbook.history, {
            globals: singleWorkbook.globals,
            spreadsheet: singleWorkbook.spreadsheet,
        });
        let singlePayload;
        overrideAppsScript(
            singleContext,
            "saveWebObservationBatch",
            (payloads) => {
                [singlePayload] = payloads;
                return { results: [{ ok: true, retryable: false }] };
            }
        );

        singleContext.processQueuedAppSheetEntries();

        expect(singlePayload).toMatchObject({
            observedAt: startedAt,
            weight: 350,
            weightState: "Routine",
        });
        expect(singleRound[appSheetBulkStatusIndex + 1]).toBe(
            "1 plant update saved."
        );

        const retryWorkbook = createLoggerWorkbook([
            "P01",
            "P02",
            "P03",
        ]);
        const retryRound = emptyCells(appSheetBulkHeaders.length);
        retryRound[0] = "INCOMPLETE";
        retryRound[appSheetBulkActionIndex] = "Weigh";
        retryRound[appSheetBulkWeightStateIndex] = "Wet";
        retryRound[appSheetBulkWeightStartIndex] = 350;
        retryRound[appSheetBulkWeightStartIndex + 1] = 360;
        retryRound[appSheetBulkWeightStartIndex + 2] = 370;
        retryRound[appSheetBulkStatusIndex] = "Queued";
        required(retryWorkbook.sheets.get("App bulk")).__rows.push(retryRound);
        const retryContext = loadAppsScript(retryWorkbook.history, {
            globals: retryWorkbook.globals,
            spreadsheet: retryWorkbook.spreadsheet,
        });
        overrideAppsScript(retryContext, "saveWebObservationBatch", () => ({
            results: [
                { ok: true, retryable: false },
                undefined,
                { message: "Try again.", ok: false, retryable: true },
            ],
        }));

        const retryResult = retryContext.processQueuedAppSheetEntries();

        expect(retryRound[appSheetBulkStatusIndex]).toBe("Retry");
        expect(retryRound[appSheetBulkStatusIndex + 1]).toMatch(
            /1 of 3 saved.*p02.*no result.*p03.*try again/iv
        );
        expect(retryResult.bulk).toMatchObject({
            retryCount: 1,
            savedRequestCount: 1,
        });
    });

    it("keeps bulk rounds retryable for Error and non-Error batch failures", () => {
        expect.hasAssertions();

        for (const useError of [true, false]) {
            const workbook = createLoggerWorkbook(["P01"]);
            const round = emptyCells(appSheetBulkHeaders.length);
            round[0] = useError ? "ERROR" : "STRING";
            round[appSheetBulkActionIndex] = "Weigh";
            round[appSheetBulkWeightStateIndex] = "Routine";
            round[appSheetBulkWeightStartIndex] = 350;
            round[appSheetBulkStatusIndex] = "Queued";
            required(workbook.sheets.get("App bulk")).__rows.push(round);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            const failure = useError
                ? vm.runInContext('new Error("Server offline.")', context)
                : "Server offline.";
            overrideAppsScript(context, "saveWebObservationBatch", () => {
                throw failure;
            });

            const result = context.processQueuedAppSheetEntries();

            expect(round[appSheetBulkStatusIndex]).toBe("Retry");
            expect(round[appSheetBulkStatusIndex + 1]).toBe("Server offline.");
            expect(result.bulk.retryCount).toBe(1);
        }
    });
});

describe("garden logger AppSheet staging migration and trigger installation", () => {
    it("verifies the current AppSheet bulk staging schema and plant validation", () => {
        expect.hasAssertions();

        const existingWorkbook = createLoggerWorkbook(["P01"]);
        const existingContext = loadAppsScript(existingWorkbook.history, {
            globals: existingWorkbook.globals,
            spreadsheet: existingWorkbook.spreadsheet,
        });

        expect(existingContext.installAppSheetIntake().bulk).toMatchObject({
            columnCount: 54,
            created: false,
            migrated: false,
            plantCount: 30,
        });

        const observedDataSheet = dataSheet(
            required(existingWorkbook.sheets.get("App entries"))
        ).__dataValidationCalls.find(({ column }) => column === 3);

        expect(observedDataSheet).toMatchObject({
            column: 3,
            columnCount: 1,
            row: 2,
            rowCount: 99,
            validation: {
                allowInvalid: false,
                showDropdown: true,
                type: "ONE_OF_LIST",
                values: appSheetBulkPlants,
            },
        });
    });

    it("appends watering fields to the v5.14 AppSheet bulk schema without changing rounds", () => {
        expect.hasAssertions();

        const v514Workbook = createLoggerWorkbook(["P01"]);
        const v514Headers = appSheetBulkHeaders.slice(0, -2);
        const v514Round = emptyCells(v514Headers.length);
        v514Round[0] = "ROUND514";
        v514Round[appSheetBulkActionIndex] = "Water";
        const v514Sheet = createDataSheet("App bulk", [v514Headers, v514Round]);
        v514Sheet.setParent(v514Workbook.spreadsheet);
        v514Workbook.sheets.set("App bulk", v514Sheet);
        const v514Context = loadAppsScript(v514Workbook.history, {
            globals: v514Workbook.globals,
            spreadsheet: v514Workbook.spreadsheet,
        });

        expect(v514Context.installAppSheetBulkSheet()).toMatchObject({
            columnCount: 54,
            created: false,
            migrated: true,
        });
        expect(structuredClone(v514Sheet.__rows[0])).toStrictEqual(
            appSheetBulkHeaders
        );
        expect(structuredClone(v514Sheet.__rows[1])).toStrictEqual(v514Round);
    });

    it("initializes empty and missing AppSheet bulk staging sheets", () => {
        expect.hasAssertions();

        const emptyWorkbook = createLoggerWorkbook(["P01"]);
        const emptySheet = createDataSheet("App bulk", []);
        emptySheet.setParent(emptyWorkbook.spreadsheet);
        emptyWorkbook.sheets.set("App bulk", emptySheet);
        const emptyContext = loadAppsScript(emptyWorkbook.history, {
            globals: emptyWorkbook.globals,
            spreadsheet: emptyWorkbook.spreadsheet,
        });

        expect(emptyContext.installAppSheetBulkSheet().created).toBe(false);
        expect(structuredClone(emptySheet.__rows[0])).toStrictEqual(
            appSheetBulkHeaders
        );

        const missingWorkbook = createLoggerWorkbook(["P01"]);
        missingWorkbook.sheets.delete("App bulk");
        const missingContext = loadAppsScript(missingWorkbook.history, {
            globals: missingWorkbook.globals,
            spreadsheet: missingWorkbook.spreadsheet,
        });

        expect(missingContext.installAppSheetBulkSheet().created).toBe(true);

        const observedGet = structuredClone(
            required(missingWorkbook.sheets.get("App bulk")).__rows[0]
        );

        expect(observedGet).toStrictEqual(appSheetBulkHeaders);
    });

    it("migrates legacy AppSheet bulk rounds and headers while rejecting unrelated sheets", () => {
        expect.hasAssertions();

        const legacyWorkbook = createLoggerWorkbook(["P01"]);
        const legacyRow = emptyCells(appSheetBulkLegacyHeaders.length);
        legacyRow[0] = "LEGACY-ROUND";
        legacyRow[3] = "Routine";
        legacyRow[4] = 345;
        legacyRow[29] = "Queued";
        const legacySheet = createDataSheet("App bulk", [
            [...appSheetBulkLegacyHeaders],
            legacyRow,
        ]);
        legacySheet.setParent(legacyWorkbook.spreadsheet);
        legacyWorkbook.sheets.set("App bulk", legacySheet);
        const legacyContext = loadAppsScript(legacyWorkbook.history, {
            globals: legacyWorkbook.globals,
            spreadsheet: legacyWorkbook.spreadsheet,
        });

        expect(legacyContext.installAppSheetBulkSheet()).toMatchObject({
            columnCount: 54,
            created: false,
            migrated: true,
        });
        expect(structuredClone(legacySheet.__rows[0])).toStrictEqual(
            appSheetBulkHeaders
        );
        expect(required(legacySheet.__rows[1])[appSheetBulkActionIndex]).toBe(
            "Weigh"
        );
        expect(
            required(legacySheet.__rows[1])[appSheetBulkWeightStateIndex]
        ).toBe("Routine");
        expect(
            required(legacySheet.__rows[1])[appSheetBulkWeightStartIndex]
        ).toBe(345);
        expect(required(legacySheet.__rows[1])[appSheetBulkStatusIndex]).toBe(
            "Queued"
        );

        const shortSheet = createDataSheet("App bulk", [["Round ID"]]);

        expect(legacyContext.migrateLegacyAppSheetBulkSheet_(shortSheet)).toBe(
            false
        );

        const legacyHeaderOnly = createDataSheet("App bulk", [
            [...appSheetBulkLegacyHeaders],
        ]);

        expect(
            legacyContext.migrateLegacyAppSheetBulkSheet_(legacyHeaderOnly)
        ).toBe(true);
        expect(structuredClone(legacyHeaderOnly.__rows[0])).toStrictEqual(
            appSheetBulkHeaders
        );
    });

    it("preserves v5.12 AppSheet bulk values and formulas through an idempotent migration", () => {
        expect.hasAssertions();

        const legacyContext = loadAppsScript(createHistorySheet());
        const v512Tail = appSheetBulkV512Headers
            .slice(6 + appSheetBulkV512Plants.length)
            .map((header) => `preserved ${header}`);
        const v512Row = [
            "V512-ROUND",
            new Date("2026-08-27T08:00:00-04:00"),
            new Date("2026-08-27T08:05:00-04:00"),
            "Weigh",
            "P01, P22",
            "Routine",
            ...appSheetBulkV512Plants.map((_plantId, index) => 300 + index),
            ...v512Tail,
        ];
        const v512Formulas = emptyCells(appSheetBulkV512Headers.length);
        v512Formulas[appSheetBulkV512Headers.length - 1] = "=40+2";
        const v512Sheet = createDataSheet(
            "App bulk",
            [[...appSheetBulkV512Headers], v512Row],
            [emptyCells(appSheetBulkV512Headers.length), v512Formulas]
        );

        expect(legacyContext.migrateLegacyAppSheetBulkSheet_(v512Sheet)).toBe(
            true
        );
        expect(structuredClone(v512Sheet.__rows[0])).toStrictEqual(
            appSheetBulkHeaders
        );
        expect(
            structuredClone(
                required(v512Sheet.__rows[1]).slice(
                    appSheetBulkWeightStartIndex +
                        appSheetBulkV512Plants.length,
                    appSheetBulkNotesIndex
                )
            )
        ).toStrictEqual(
            Array.from(
                { length: 8 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            )
        );
        expect(
            structuredClone(
                required(v512Sheet.__rows[1]).slice(appSheetBulkNotesIndex)
            )
        ).toStrictEqual([
            ...v512Tail,
            "",
            "",
        ]);
        expect(required(v512Sheet.getRange(2, 52).getFormulas()[0])[0]).toBe(
            "=40+2"
        );

        const migratedV512Row = [...required(v512Sheet.__rows[1])];

        expect(legacyContext.migrateLegacyAppSheetBulkSheet_(v512Sheet)).toBe(
            false
        );
        expect(structuredClone(v512Sheet.__rows[1])).toStrictEqual(
            migratedV512Row
        );
    });

    it("preserves v5.13 AppSheet bulk values and formulas through an idempotent migration", () => {
        expect.hasAssertions();

        const legacyContext = loadAppsScript(createHistorySheet());
        const v513Tail = appSheetBulkV513Headers
            .slice(6 + appSheetBulkV513Plants.length)
            .map((header) => `preserved ${header}`);
        const v513Row = [
            "V513-ROUND",
            new Date("2026-09-02T08:00:00-04:00"),
            new Date("2026-09-02T08:05:00-04:00"),
            "Weigh",
            "P01, P28",
            "Routine",
            ...appSheetBulkV513Plants.map((_plantId, index) => 400 + index),
            ...v513Tail,
        ];
        const v513Formulas = emptyCells(appSheetBulkV513Headers.length);
        v513Formulas[appSheetBulkV513Headers.length - 1] = "=50+1";
        const v513Sheet = createDataSheet(
            "App bulk",
            [[...appSheetBulkV513Headers], v513Row],
            [emptyCells(appSheetBulkV513Headers.length), v513Formulas]
        );

        expect(legacyContext.migrateLegacyAppSheetBulkSheet_(v513Sheet)).toBe(
            true
        );
        expect(structuredClone(v513Sheet.__rows[0])).toStrictEqual(
            appSheetBulkHeaders
        );
        expect(
            structuredClone(
                required(v513Sheet.__rows[1]).slice(
                    appSheetBulkWeightStartIndex +
                        appSheetBulkV513Plants.length,
                    appSheetBulkNotesIndex
                )
            )
        ).toStrictEqual(
            Array.from(
                { length: 2 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            )
        );
        expect(
            structuredClone(
                required(v513Sheet.__rows[1]).slice(appSheetBulkNotesIndex)
            )
        ).toStrictEqual([
            ...v513Tail,
            "",
            "",
        ]);
        expect(required(v513Sheet.getRange(2, 52).getFormulas()[0])[0]).toBe(
            "=50+1"
        );

        const migratedV513Row = [...required(v513Sheet.__rows[1])];

        expect(legacyContext.migrateLegacyAppSheetBulkSheet_(v513Sheet)).toBe(
            false
        );
        expect(structuredClone(v513Sheet.__rows[1])).toStrictEqual(
            migratedV513Row
        );
    });

    it("keeps exactly one AppSheet queue trigger", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        /** @type {(string | undefined)[]} */
        const deleted = [];
        /** @type {{ handler: string; minutes: number }[]} */
        const created = [];
        /** @type {{ getHandlerFunction: () => string; name?: string }[]} */
        let triggers = [
            {
                getHandlerFunction: () => "processQueuedAppSheetEntries",
                name: "first",
            },
            {
                getHandlerFunction: () => "processQueuedAppSheetEntries",
                name: "duplicate",
            },
            { getHandlerFunction: () => "otherHandler", name: "other" },
        ];
        const ScriptApp = {
            deleteTrigger: (
                /**
                 * @type {{
                 *     getHandlerFunction: () => string;
                 *     name?: string;
                 * }}
                 */ trigger
            ) => {
                deleted.push(trigger.name);
            },
            getProjectTriggers: () => triggers,
            newTrigger: (/** @type {string} */ handler) => ({
                timeBased: () => ({
                    everyMinutes: (/** @type {number} */ minutes) => ({
                        create: () => {
                            created.push({ handler, minutes });
                        },
                    }),
                }),
            }),
        };
        const context = loadAppsScript(workbook.history, {
            globals: { ...workbook.globals, ScriptApp },
            spreadsheet: workbook.spreadsheet,
        });

        expect(
            structuredClone(context.installAppSheetQueueTrigger())
        ).toStrictEqual({
            created: true,
            handler: "processQueuedAppSheetEntries",
            removedDuplicateCount: 1,
            removedTriggerCount: 2,
        });
        expect(structuredClone(deleted)).toStrictEqual(["first", "duplicate"]);
        expect(structuredClone(created)).toStrictEqual([
            { handler: "processQueuedAppSheetEntries", minutes: 5 },
        ]);

        triggers = [{ getHandlerFunction: () => "otherHandler" }];

        expect(
            structuredClone(context.installAppSheetQueueTrigger())
        ).toStrictEqual({
            created: true,
            handler: "processQueuedAppSheetEntries",
            removedDuplicateCount: 0,
            removedTriggerCount: 0,
        });
        expect(structuredClone(created)).toStrictEqual([
            { handler: "processQueuedAppSheetEntries", minutes: 5 },
            { handler: "processQueuedAppSheetEntries", minutes: 5 },
        ]);
    });
});

describe("garden logger AppSheet queue orchestration", () => {
    it("processes queued AppSheet rows in one bound-project batch", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const queued = emptyCells(appSheetEntryHeaders.length);
        queued[0] = "QUEUE001";
        queued[1] = new Date("2026-08-25T04:00:00-04:00");
        queued[2] = "P01";
        queued[3] = "Check";
        queued[9] = "Firm";
        queued[26] = "Queued";
        const retry = emptyCells(appSheetEntryHeaders.length);
        retry[0] = "RETRY001";
        retry[1] = new Date("2026-08-25T04:01:00-04:00");
        retry[2] = "P02";
        retry[3] = "Water";
        retry[12] = "No";
        retry[26] = "Retry";
        const correction = emptyCells(appSheetEntryHeaders.length);
        correction[0] = "FIXME001";
        correction[26] = "Needs correction";
        const saved = emptyCells(appSheetEntryHeaders.length);
        saved[0] = "SAVED001";
        saved[26] = "Saved";
        const entries = workbook.sheets.get("App entries");
        required(entries).__rows.push(queued, retry, correction, saved);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        /** @type {import("../apps-script-fixtures.d.ts").WebPayload[][]} */
        const batches = [];
        overrideAppsScript(context, "saveWebObservationBatch", (payloads) => {
            batches.push(payloads);
            return {
                results: [
                    {
                        historyRows: 1,
                        message: "Check saved.",
                        ok: true,
                        retryable: false,
                    },
                    {
                        message: "Choose a valid nutrient response.",
                        ok: false,
                        retryable: false,
                    },
                ],
            };
        });

        const result = context.processQueuedAppSheetEntries();

        expect(batches).toHaveLength(1);
        expect(
            structuredClone(
                required(batches[0]).map(({ requestId }) => requestId)
            )
        ).toStrictEqual(["appsheet-QUEUE001", "appsheet-RETRY001"]);
        expect(queued[26]).toBe("Saved");
        expect(queued[28]).toBe("appsheet-QUEUE001");
        expect(queued[29]).toBe(1);
        expect(queued[30]).toBeInstanceOf(Date);
        expect(retry[26]).toBe("Needs correction");
        expect(retry[27]).toMatch(/nutrient/iv);
        expect(correction[26]).toBe("Needs correction");
        expect(saved[26]).toBe("Saved");
        expect(result).toMatchObject({
            deferredCount: 0,
            needsCorrectionCount: 1,
            ok: false,
            processedCount: 2,
            queuedCount: 2,
            retryCount: 0,
            savedCount: 1,
        });
    });

    it("isolates missing and duplicated AppSheet queue identities", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(context.processQueuedAppSheetEntries()).toMatchObject({
            ok: true,
            processedCount: 0,
            queuedCount: 0,
        });

        const missing = emptyCells(appSheetEntryHeaders.length);
        missing[26] = "Queued";
        const duplicate = emptyCells(appSheetEntryHeaders.length);
        duplicate[0] = "DUPQUEUE";
        duplicate[26] = "Queued";
        const duplicateAgain = [...duplicate];
        const entries = workbook.sheets.get("App entries");
        required(entries).__rows.push(missing, duplicate, duplicateAgain);
        overrideAppsScript(context, "saveWebObservationBatch", () => {
            throw new Error("Invalid queue rows must not reach History.");
        });

        const result = context.processQueuedAppSheetEntries();

        expect(result).toMatchObject({
            needsCorrectionCount: 3,
            ok: false,
            processedCount: 3,
            queuedCount: 3,
            retryCount: 0,
            savedCount: 0,
        });
        expect(missing[27]).toMatch(/entry id is required/iv);
        expect(duplicate[27]).toMatch(/duplicated/iv);
        expect(duplicateAgain[27]).toMatch(/duplicated/iv);

        const invalidRequest = emptyCells(appSheetEntryHeaders.length);
        invalidRequest[0] = "STRINGERR";
        invalidRequest[26] = "Queued";
        required(entries).__rows.push(invalidRequest);
        overrideAppsScript(context, "normalizeRequestId_", () => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- Fault injection verifies recovery from non-Error service failures.
            throw "String request failure";
        });

        expect(context.processQueuedAppSheetEntries()).toMatchObject({
            needsCorrectionCount: 1,
        });
        expect(invalidRequest[27]).toBe("String request failure");
    });

    it("does not flush or scan History when both AppSheet queues are empty", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        let flushCount = 0;
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp: {
                flush: () => {
                    flushCount += 1;
                },
                newDataValidation: createDataValidationBuilder,
                openById: () => workbook.spreadsheet,
                ProtectionType: { RANGE: "RANGE" },
            },
        });

        const result = context.processQueuedAppSheetEntries();

        expect(result).toMatchObject({
            bulk: {
                processedCount: 0,
                queuedCount: 0,
            },
            ok: true,
            processedCount: 0,
            queuedCount: 0,
        });
        expect(flushCount).toBe(0);
        expect(workbook.history.__rangeReads).toHaveLength(0);
    });

    it("maps retryable and missing AppSheet batch results to receipts", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const first = emptyCells(appSheetEntryHeaders.length);
        first[0] = "QUEUE003";
        first[2] = "P01";
        first[3] = "Check";
        first[9] = "Firm";
        first[26] = "Queued";
        const second = [...first];
        second[0] = "QUEUE004";
        required(workbook.sheets.get("App entries")).__rows.push(first, second);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        overrideAppsScript(context, "saveWebObservationBatch", () => ({
            results: [
                {
                    message: "Temporary service failure.",
                    ok: false,
                    retryable: true,
                },
                null,
            ],
        }));

        const result = context.processQueuedAppSheetEntries();

        expect(first[26]).toBe("Retry");
        expect(second[26]).toBe("Needs correction");
        expect(second[27]).toMatch(/needs correction/iv);
        expect(result).toMatchObject({
            needsCorrectionCount: 1,
            retryCount: 1,
        });
    });

    it("defers AppSheet queue rows beyond the 50-entry batch bound", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const entries = workbook.sheets.get("App entries");
        for (let index = 0; index < 51; index += 1) {
            const entry = emptyCells(appSheetEntryHeaders.length);
            entry[0] = `QUEUE${String(index).padStart(4, "0")}`;
            entry[2] = "P01";
            entry[3] = "Check";
            entry[9] = "Firm";
            entry[26] = "Queued";
            required(entries).__rows.push(entry);
        }
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        let submittedCount = 0;
        overrideAppsScript(context, "saveWebObservationBatch", (payloads) => {
            submittedCount = payloads.length;
            return {
                results: payloads.map(() => ({
                    historyRows: 1,
                    message: "Saved.",
                    ok: true,
                    retryable: false,
                })),
            };
        });

        const result = context.processQueuedAppSheetEntries();

        expect(submittedCount).toBe(50);
        expect(result).toMatchObject({
            deferredCount: 1,
            ok: true,
            processedCount: 50,
            queuedCount: 51,
            savedCount: 50,
        });
        expect(required(required(entries).__rows.at(-1))[26]).toBe("Queued");
    });

    it("keeps queued AppSheet rows retryable after an infrastructure failure", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const entry = emptyCells(appSheetEntryHeaders.length);
        entry[0] = "QUEUE002";
        entry[2] = "P01";
        entry[3] = "Check";
        entry[9] = "Firm";
        entry[26] = "Queued";
        required(workbook.sheets.get("App entries")).__rows.push(entry);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        vm.runInContext(
            'saveWebObservationBatch = () => { throw new Error("Another reading is finishing."); };',
            context
        );

        const result = context.processQueuedAppSheetEntries();

        expect(entry[26]).toBe("Retry");
        expect(entry[27]).toMatch(/another reading/iv);
        expect(entry[28]).toBe("appsheet-QUEUE002");
        expect(result).toMatchObject({
            needsCorrectionCount: 0,
            ok: false,
            processedCount: 1,
            retryCount: 1,
            savedCount: 0,
        });

        entry[26] = "Queued";
        overrideAppsScript(context, "saveWebObservationBatch", () => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- Fault injection verifies recovery from non-Error service failures.
            throw "String service failure";
        });

        expect(context.processQueuedAppSheetEntries()).toMatchObject({
            retryCount: 1,
        });
        expect(entry[27]).toBe("String service failure");
    });
});

describe("garden logger History snapshots and request status", () => {
    it("reports a completed single-plant request as saved", () => {
        expect.hasAssertions();

        const requestId = "garden-single-12345";
        const history = createHistorySheet([
            {
                requestId,
                values: [
                    new Date("2026-08-15T10:00:00-04:00"),
                    "P01",
                    "Weigh",
                    "Routine",
                    420,
                ],
            },
        ]);
        const context = loadAppsScript(history);

        expect(context.getWebSaveStatus({ requestId })).toMatchObject({
            expectedCount: 1,
            savedCount: 1,
            state: "saved",
        });
    });

    it("does not treat a reserved but incomplete History row as saved", () => {
        expect.hasAssertions();

        const requestId = "garden-incomplete-12345";
        const history = createHistorySheet([
            {
                requestId,
                values: [
                    "",
                    "",
                    "",
                ],
            },
        ]);
        const context = loadAppsScript(history);

        expect(context.getWebSaveStatus({ requestId })).toMatchObject({
            expectedCount: 1,
            savedCount: 0,
            state: "partial",
        });
    });

    it("checks every per-plant request in a bulk watering round", () => {
        expect.hasAssertions();

        const requestId = "garden-bulk-123456";
        const history = createHistorySheet(
            ["P01", "P02"].map((plantId) => ({
                requestId: `${requestId}-${plantId}`,
                values: [
                    new Date("2026-08-15T10:00:00-04:00"),
                    plantId,
                    "Water",
                ],
            }))
        );
        const context = loadAppsScript(history);

        expect(
            context.getWebSaveStatus({
                plantIds: ["P01", "P02"],
                requestId,
            })
        ).toMatchObject({
            expectedCount: 2,
            savedCount: 2,
            state: "saved",
        });
    });

    it("returns an empty History snapshot and trims reserved blank rows", () => {
        expect.hasAssertions();

        const emptyHistory = createHistorySheet();
        const emptyContext = loadAppsScript(emptyHistory);

        const observedReadHistorySnapshot = structuredClone(
            Array.from(
                emptyContext.readHistorySnapshot_({
                    getSheetByName: () => emptyHistory,
                })
            )
        );

        expect(observedReadHistorySnapshot).toStrictEqual([]);

        const populatedHistory = createHistorySheet([
            {
                requestId: "garden-snapshot-12345",
                values: [
                    new Date("2026-08-16T10:00:00-04:00"),
                    "P01",
                    "Weigh",
                ],
            },
        ]);
        populatedHistory.__rows.push(
            Array.from(
                { length: 42 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            )
        );
        const populatedContext = loadAppsScript(populatedHistory);
        const snapshot = populatedContext.readHistorySnapshot_({
            getSheetByName: () => populatedHistory,
        });

        expect(Array.from(snapshot)).toHaveLength(1);
        expect(required(snapshot[0])[1]).toBe("P01");
    });

    it("sorts recent activity by timestamps and resolves names without History helpers", () => {
        expect.hasAssertions();

        const history = createHistorySheet([
            {
                requestId: "garden-newer-123456",
                values: [
                    new Date("2026-08-16T10:00:00-04:00"),
                    "P01",
                    "Weigh",
                    "Routine",
                    410,
                    "",
                    "",
                    "",
                    "",
                    new Date("2026-08-16T10:01:00-04:00"),
                ],
            },
            {
                requestId: "garden-older-123456",
                values: [
                    new Date("2026-08-14T10:00:00-04:00"),
                    "P02",
                    "Water",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    new Date("2026-08-14T10:01:00-04:00"),
                ],
            },
            {
                requestId: "garden-newest-12345",
                values: [
                    new Date("2026-08-16T12:00:00-04:00"),
                    "P02",
                    "Measure",
                    "",
                    "",
                    8,
                    "",
                    "",
                    "",
                    new Date("2026-08-16T12:02:00-04:00"),
                ],
            },
        ]);
        const context = loadAppsScript(history);

        const recent = context.getRecentObservations_(
            { getSheetByName: () => history },
            "America/New_York",
            2,
            new Map([
                ["P01", "Moon cactus"],
                ["P02", "Feather cactus"],
            ])
        );

        expect(structuredClone(structuredClone(recent))).toStrictEqual([
            {
                event: "Measure",
                name: "Feather cactus",
                observedAt: "2026-08-16T16:00:00.000Z",
                plantId: "P02",
                weight: "",
                weightState: "",
            },
            {
                event: "Weigh",
                name: "Moon cactus",
                observedAt: "2026-08-16T14:00:00.000Z",
                plantId: "P01",
                weight: 410,
                weightState: "Routine",
            },
        ]);
        expect(context.dateSortValue_("not-a-date")).toBe(0);
    });

    it("handles empty, missing, and noncontiguous History snapshots", () => {
        expect.hasAssertions();

        const emptyHistory = createHistorySheet();
        const emptyTracker = createDataSheet("Plant tracker", [
            ["Plant ID", "Plant / planter"],
        ]);
        const emptySpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? emptyHistory : emptyTracker,
        };
        const emptyContext = loadAppsScript(emptyHistory, {
            spreadsheet: emptySpreadsheet,
        });

        const observedReadHistorySnapshot2 = structuredClone(
            Array.from(emptyContext.readHistorySnapshot_(emptySpreadsheet))
        );

        expect(observedReadHistorySnapshot2).toStrictEqual([]);
        expect(emptyContext.lastHistoryDataRow_(emptyHistory)).toBe(1);
        expect(emptyContext.lastHistoryReservedRow_(emptyHistory)).toBe(1);

        const observedHistoryRowsForRequest = structuredClone(
            Array.from(
                emptyContext.historyRowsForRequest_(
                    emptyHistory,
                    "garden-history-missing-12345"
                )
            )
        );

        expect(observedHistoryRowsForRequest).toStrictEqual([]);
        expect(
            emptyContext.savedRequestStatus_(
                emptyHistory,
                "garden-history-missing-12345"
            )
        ).toMatchObject({ state: "missing" });
        expect(emptyContext.plantNamesById_(emptySpreadsheet).size).toBe(0);

        const requestId = "garden-history-gap-12345";
        const noncontiguousHistory = createHistorySheet([
            {
                requestId,
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Rotation",
                ],
            },
            {
                requestId: "garden-history-between-12345",
                values: [
                    new Date("2026-08-16T12:01:00Z"),
                    "P02",
                    "Check",
                ],
            },
            {
                requestId,
                values: [
                    new Date("2026-08-16T12:02:00Z"),
                    "P01",
                    "Clean",
                ],
            },
        ]);
        const noncontiguousContext = loadAppsScript(noncontiguousHistory);

        expect(
            noncontiguousContext.savedRequestStatus_(
                noncontiguousHistory,
                requestId
            )
        ).toMatchObject({ state: "incomplete" });

        const older = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        older[0] = new Date("2026-08-15T12:00:00Z");
        older[1] = "P01";
        older[2] = "Clean";
        older[9] = new Date("2026-08-15T12:01:00Z");
        const newer = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        newer[0] = new Date("2026-08-16T12:00:00Z");
        newer[1] = "P02";
        newer[2] = "Rotation";
        newer[9] = new Date("2026-08-16T12:01:00Z");

        const recentRecords = noncontiguousContext.recentObservationsFromRows_(
            [older, newer],
            "America/New_York",
            10,
            new Map()
        );
        const observedRecentObservationsFromRows = Array.from(
            recentRecords,
            (row) => row.plantId
        );

        expect(observedRecentObservationsFromRows).toStrictEqual([
            "P02",
            "P01",
        ]);
    });

    it("preserves malformed retry keys and accepts absent expected row counts", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        for (const payload of [false, 0]) {
            expect(() => context.getWebSaveStatus(payload)).toThrow(
                "The mobile save request ID is not valid."
            );
            expect(() => context.getWebBatchSaveStatus([payload])).toThrow(
                "The mobile save request ID is not valid."
            );
        }
        for (const payload of [
            null,
            undefined,
            "",
        ]) {
            expect(() => context.getWebSaveStatus(payload)).toThrow(
                "This save is missing its retry key."
            );
            expect(() => context.getWebBatchSaveStatus([payload])).toThrow(
                "This save is missing its retry key."
            );
        }

        expect(
            context.getWebBatchSaveStatus([
                {
                    expectedCount: null,
                    plantId: "P01",
                    requestId: "garden-null-count-12345",
                },
            ])
        ).toMatchObject([
            { requestId: "garden-null-count-12345", state: "missing" },
        ]);
        expect(workbook.history.__rows).toHaveLength(1);
    });

    it("reports queue request status and rejects unsafe status queries", () => {
        expect.hasAssertions();

        const requestId = "garden-status-12345";
        const history = createHistorySheet([
            {
                requestId,
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Weigh",
                ],
            },
        ]);
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? history : null,
        };
        const context = loadAppsScript(history, { spreadsheet });

        const observedGetWebBatchSaveStatus = structuredClone(
            structuredClone(
                context.getWebBatchSaveStatus([
                    requestId,
                    "garden-missing-67890",
                ])
            )
        );

        expect(observedGetWebBatchSaveStatus).toStrictEqual([
            { requestId, state: "saved" },
            {
                requestId: "garden-missing-67890",
                state: "missing",
            },
        ]);

        const observedGetWebBatchSaveStatus2 = structuredClone(
            structuredClone(
                context.getWebBatchSaveStatus([
                    {
                        plantId: "P01",
                        requestId,
                    },
                ])
            )
        );

        expect(observedGetWebBatchSaveStatus2).toStrictEqual([
            {
                requestId,
                savedCount: 1,
                state: "saved",
            },
        ]);

        const observedGetWebBatchSaveStatus3 = structuredClone(
            structuredClone(
                context.getWebBatchSaveStatus([
                    {
                        expectedCount: 1,
                        plantId: "P01",
                        requestId,
                    },
                    {
                        expectedCount: 2,
                        plantId: "P01",
                        requestId: "garden-missing-67890",
                    },
                ])
            )
        );

        expect(observedGetWebBatchSaveStatus3).toStrictEqual([
            {
                expectedCount: 1,
                requestId,
                savedCount: 1,
                state: "saved",
            },
            {
                expectedCount: 2,
                requestId: "garden-missing-67890",
                savedCount: 0,
                state: "missing",
            },
        ]);

        const rangeCountBefore = history.__rangeReads.length;
        context.getWebBatchSaveStatus(
            Array.from({ length: 28 }, (_, index) => ({
                expectedCount: 1,
                plantId: "P01",
                requestId: `garden-status-${String(index).padStart(2, "0")}-12345`,
            }))
        );
        const twentyEightStatusReads =
            history.__rangeReads.length - rangeCountBefore;
        const oneRangeCountBefore = history.__rangeReads.length;
        context.getWebBatchSaveStatus([
            {
                expectedCount: 1,
                plantId: "P01",
                requestId: "garden-one-status-12345",
            },
        ]);

        expect(history.__rangeReads.length - oneRangeCountBefore).toBe(
            twentyEightStatusReads
        );
        expect(() => context.getWebBatchSaveStatus("not-an-array")).toThrow(
            /up to 50/iv
        );
        expect(() =>
            context.getWebBatchSaveStatus([requestId, requestId])
        ).toThrow(/unique/iv);

        for (const expectedCount of [
            0,
            14,
            1.5,
        ]) {
            expect(() =>
                context.getWebBatchSaveStatus([
                    {
                        expectedCount,
                        plantId: "P01",
                        requestId,
                    },
                ])
            ).toThrow(/integer from 1 to 13/iv);
        }
    });

    it("reports wrong-plant, wrong-count, and noncontiguous batch shapes as incomplete", () => {
        expect.hasAssertions();

        const requestId = "garden-shaped-status-12345";
        const history = createHistorySheet([
            {
                requestId,
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Weigh",
                ],
            },
            {
                requestId: "garden-between-status-12345",
                values: [
                    new Date("2026-08-16T12:00:30Z"),
                    "P02",
                    "Check",
                ],
            },
            {
                requestId,
                values: [
                    new Date("2026-08-16T12:01:00Z"),
                    "P01",
                    "Water",
                ],
            },
        ]);
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? history : null,
        };
        const context = loadAppsScript(history, { spreadsheet });

        const [noncontiguous] = context.getWebBatchSaveStatus([
            { expectedCount: 2, plantId: "P01", requestId },
        ]);
        const [wrongPlant] = context.getWebBatchSaveStatus([
            {
                expectedCount: 1,
                plantId: "P01",
                requestId: "garden-between-status-12345",
            },
        ]);
        const [wrongCount] = context.getWebBatchSaveStatus([
            {
                expectedCount: 2,
                plantId: "P02",
                requestId: "garden-between-status-12345",
            },
        ]);

        expect(noncontiguous).toMatchObject({
            expectedCount: 2,
            savedCount: 2,
            state: "incomplete",
        });
        expect(wrongPlant).toMatchObject({
            expectedCount: 1,
            savedCount: 0,
            state: "incomplete",
        });
        expect(wrongCount).toMatchObject({
            expectedCount: 2,
            savedCount: 1,
            state: "incomplete",
        });
    });

    it("ignores completely blank rows when building a batch identity snapshot", () => {
        expect.hasAssertions();

        const history = createHistorySheet([
            {
                requestId: "",
                values: [
                    "",
                    "",
                    "",
                ],
            },
        ]);
        const context = loadAppsScript(history);

        const snapshot = context.historyObservationSnapshot_(history);

        expect(snapshot.lastReservedRow).toBe(1);
        expect(snapshot.rowsByRequest.size).toBe(0);
    });
});

describe("garden logger request reservations and retry reconciliation", () => {
    it("keeps partial and conflicting request reservations non-retryable", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const partialRow = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        partialRow[0] = new Date("2026-08-16T12:00:00Z");
        partialRow[1] = "P01";
        partialRow[2] = "Weigh";
        partialRow[15] = "garden-partial-batch-12345";
        const conflictRow = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        conflictRow[0] = new Date("2026-08-16T12:01:00Z");
        conflictRow[1] = "P02";
        conflictRow[2] = "Weigh";
        conflictRow[15] = "garden-conflict-batch-12345";
        workbook.history.__rows.push(partialRow, conflictRow);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        const result = context.saveWebObservationBatch([
            {
                events: ["Weigh"],
                nutrientsUsed: "No",
                observedAt: "2026-08-16T12:00:00Z",
                plantId: "P01",
                requestId: "garden-partial-batch-12345",
                weight: 450,
                weightState: "Wet",
            },
            {
                events: ["Measure"],
                height: 5,
                measurementUnit: "in",
                observedAt: "2026-08-16T12:01:00Z",
                plantId: "P02",
                requestId: "garden-conflict-batch-12345",
            },
        ]);

        expect(result).toMatchObject({
            failedCount: 2,
            ok: false,
            savedCount: 0,
        });
        expect(structuredClone(result.results)).toStrictEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    errorCode: "HISTORY_CONFLICT",
                    requestId: "garden-partial-batch-12345",
                    retryable: false,
                }),
                expect.objectContaining({
                    errorCode: "HISTORY_CONFLICT",
                    requestId: "garden-conflict-batch-12345",
                    retryable: false,
                }),
            ])
        );
        expect(workbook.history.__setValuesCalls).toHaveLength(0);
    });

    it("repairs a correctly shaped but incomplete request reservation", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const reservedRow = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        reservedRow[1] = "P01";
        reservedRow[2] = "Weigh";
        reservedRow[15] = "garden-reserved-batch-12345";
        workbook.history.__rows.push(reservedRow);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            events: ["Weigh"],
            observedAt: "2026-08-16T12:00:00Z",
            plantId: "P01",
            requestId: "garden-reserved-batch-12345",
            weight: 450,
            weightState: "Routine",
        };

        const result = context.saveWebObservationBatch([payload]);
        const retry = context.saveWebObservationBatch([payload]);

        expect(result).toMatchObject({
            failedCount: 0,
            ok: true,
            savedCount: 1,
        });
        expect(retry.results[0]).toMatchObject({
            duplicate: true,
            historyRows: 1,
            ok: true,
        });
        expect(workbook.history.__rows).toHaveLength(2);
        expect(required(workbook.history.__rows[1])[0]).toBeInstanceOf(Date);
        expect(required(workbook.history.__rows[1])[4]).toBe(450);
        expect(
            structuredClone(workbook.history.__setValuesCalls)
        ).toStrictEqual([{ column: 1, columnCount: 42, row: 2, rowCount: 1 }]);
    });

    it("distinguishes saved, partial, and noncontiguous request reservations", () => {
        expect.hasAssertions();

        const completeRequestId = "garden-complete-12345";
        const partialRequestId = "garden-partial-12345";
        const noncontiguousRequestId = "garden-gapped-12345";
        const history = createHistorySheet([
            {
                requestId: completeRequestId,
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Weigh",
                ],
            },
            {
                requestId: completeRequestId,
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Water",
                ],
            },
            {
                requestId: noncontiguousRequestId,
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P02",
                    "Weigh",
                ],
            },
            {
                requestId: "garden-unrelated-12345",
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P03",
                    "Check",
                ],
            },
            {
                requestId: noncontiguousRequestId,
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P02",
                    "Water",
                ],
            },
            {
                requestId: partialRequestId,
                values: [
                    "",
                    "P04",
                    "Measure",
                ],
            },
        ]);
        const context = loadAppsScript(history);

        const observedSavedRequestStatus2 = structuredClone(
            structuredClone(
                context.savedRequestStatus_(history, completeRequestId)
            )
        );

        expect(observedSavedRequestStatus2).toStrictEqual({
            requestId: completeRequestId,
            state: "saved",
        });

        const observedSavedRequestStatus3 = structuredClone(
            structuredClone(
                context.savedRequestStatus_(history, partialRequestId)
            )
        );

        expect(observedSavedRequestStatus3).toStrictEqual({
            requestId: partialRequestId,
            state: "incomplete",
        });

        const observedSavedRequestStatus4 = structuredClone(
            structuredClone(
                context.savedRequestStatus_(history, noncontiguousRequestId)
            )
        );

        expect(observedSavedRequestStatus4).toStrictEqual({
            requestId: noncontiguousRequestId,
            state: "incomplete",
        });
    });

    it("reconciles partial save status and protects mismatched retries", () => {
        expect.hasAssertions();

        const baseRequestId = "garden-bulk-status-12345";
        const history = createHistorySheet([
            {
                requestId: `${baseRequestId}-P01`,
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Water",
                ],
            },
        ]);
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? history : null,
        };
        const context = loadAppsScript(history, { spreadsheet });
        const partial = context.getWebSaveStatus({
            plantIds: ["P01", "P02"],
            requestId: baseRequestId,
        });

        expect(partial.state).toBe("partial");
        expect(partial.savedCount).toBe(1);
        expect(
            context.getWebSaveStatus({
                requestId: "garden-status-missing-12345",
            }).state
        ).toBe("missing");
        expect(
            context.getWebSaveStatus({
                requestId: `${baseRequestId}-P01`,
            }).state
        ).toBe("saved");

        const mismatched = createHistorySheet([
            {
                requestId: "garden-mismatch-12345",
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P02",
                    "Weigh",
                    "Routine",
                    400,
                    "",
                    "",
                    "",
                    "",
                    new Date("2026-08-16T12:00:01Z"),
                    1,
                ],
            },
        ]);
        const mismatchSpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? mismatched : null,
        };
        const mismatchContext = loadAppsScript(mismatched);

        expect(() =>
            mismatchContext.appendObservation_(mismatchSpreadsheet, {
                eventNames: ["Weigh"],
                plantId: "P01",
                potSetup: 1,
                requestId: "garden-mismatch-12345",
            })
        ).toThrow(/no longer matches/iv);

        expect(() =>
            mismatchContext.appendObservation_(mismatchSpreadsheet, {
                eventNames: ["Weigh", "Measure"],
                plantId: "P02",
                potSetup: 1,
                requestId: "garden-mismatch-12345",
            })
        ).toThrow(/unexpected history shape/iv);
    });

    it("repairs interrupted reservations and grows History before writing", () => {
        expect.hasAssertions();

        const reservedRequestId = "garden-reserved-edge-12345";
        const reserved = createHistorySheet([
            { requestId: reservedRequestId, values: [] },
        ]);
        const reservedSpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? reserved : null,
        };
        const context = loadAppsScript(reserved);
        const repaired = context.appendObservation_(reservedSpreadsheet, {
            condition: "",
            currentLabel: "A1",
            details: {},
            eventNames: ["Weigh"],
            height: "",
            notes: "",
            observationDate: new Date("2026-08-16T12:00:00Z"),
            plantId: "P01",
            potSetup: 1,
            requestId: reservedRequestId,
            weight: 400,
            weightState: "Routine",
            width: "",
        });

        expect(repaired.targetRow).toBe(2);
        expect(required(reserved.__rows[1])[1]).toBe("P01");

        const growing = createHistorySheet();
        let inserted = 0;
        let maxRows = 1;
        growing.getMaxRows = () => maxRows;
        growing.insertRowsAfter = (_row, count) => {
            inserted += count;
            maxRows += count;
        };
        const growingSpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? growing : null,
        };
        context.appendObservation_(growingSpreadsheet, {
            condition: "",
            currentLabel: "A1",
            details: {},
            eventNames: ["Note"],
            height: "",
            notes: "growth test",
            observationDate: new Date("2026-08-16T12:00:00Z"),
            plantId: "P01",
            potSetup: 1,
            requestId: "garden-grow-history-12345",
            weight: "",
            weightState: "",
            width: "",
        });

        expect(inserted).toBe(4999);

        const duplicateRequestId = "garden-valid-duplicate-12345";
        const duplicateInput = {
            condition: "",
            currentLabel: "A1",
            details: {},
            eventNames: ["Weigh"],
            height: "",
            notes: "",
            observationDate: new Date("2026-08-16T12:00:00Z"),
            plantId: "P01",
            potSetup: 3,
            requestId: duplicateRequestId,
            weight: 400,
            weightState: "Routine",
            width: "",
        };
        const seededDuplicateRow = context.storedObservationRows_(
            { ...duplicateInput, potSetup: 2 },
            duplicateRequestId,
            2,
            "not-a-recorded-date"
        )[0];
        const duplicateHistory = createHistorySheet([
            {
                requestId: duplicateRequestId,
                values: required(seededDuplicateRow),
            },
        ]);
        const duplicateSpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? duplicateHistory : null,
        };
        const duplicateContext = loadAppsScript(duplicateHistory);
        const duplicate = duplicateContext.appendObservation_(
            duplicateSpreadsheet,
            duplicateInput
        );

        expect(duplicate.duplicate).toBe(true);
        expect(duplicate.potSetup).toBe(2);
    });
});

describe("garden logger workbook installation and History headers", () => {
    it("builds the Apps Script web response and menu entry points", () => {
        expect.hasAssertions();

        /** @type {unknown[][]} */
        const calls = [];
        const menu = {
            addItem(/** @type {string} */ label, /** @type {string} */ action) {
                calls.push([label, action]);
                return menu;
            },
            addSeparator: () => menu,
            addToUi: () => menu,
        };
        const ui = {
            createMenu: () => menu,
            showModalDialog: (
                /** @type {object} */ html,
                /** @type {string} */ title
            ) => {
                calls.push([title, html]);
            },
        };
        const html = {
            addMetaTag: () => html,
            setFaviconUrl(/** @type {string} */ value) {
                calls.push(["favicon", value]);
                return html;
            },
            setHeight: () => html,
            setTitle: () => html,
            setWidth: () => html,
        };
        const activeSheets = new Map(
            ["Quick log", "History"].map((name) => {
                const sheet = {
                    selected: "",
                    /** @param {string} cell */
                    setActiveSelection(cell) {
                        sheet.selected = cell;
                    },
                };
                return [name, sheet];
            })
        );
        const activeSpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                activeSheets.get(name) ?? null,
            setActiveSheet: () => {},
        };
        const context = loadAppsScript(createHistorySheet(), {
            globals: {
                HtmlService: { createHtmlOutputFromFile: () => html },
            },
            SpreadsheetApp: {
                getActive: () => activeSpreadsheet,
                getUi: () => ui,
                openById: () => activeSpreadsheet,
            },
        });

        context.onOpen();
        context.openMobileEntry();

        expect(context.doGet()).toBe(html);

        context.openQuickLog();
        context.openHistory();

        expect(calls).toContainEqual(["Open mobile entry", "openMobileEntry"]);
        expect(calls).toContainEqual([
            "Exclude selected History observations",
            "removeSelectedHistoryObservations",
        ]);
        expect(calls).toContainEqual([
            "favicon",
            "https://i.gyazo.com/0fdb0739ffe391ade24deb6df2973a21.png",
        ]);
        expect(required(activeSheets.get("Quick log")).selected).toBe("D5");
        expect(required(activeSheets.get("History")).selected).toBe("A2");
    });

    it("verifies the bound workbook installation contract", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const quickLogRows = [
            [],
            [],
            [],
            [
                "Plant ID",
                "Plant / current label",
                "Save",
                "Started at",
                "Event",
                "Weight state",
                "Weight (g)",
                "Height",
                "Width",
                "Plant condition",
                "Notes",
                "Pot setup",
                "Measurement unit",
            ],
        ];
        const quickLog = createDataSheet("Quick log", quickLogRows);
        const originalGetRange = quickLog.getRange;
        Reflect.set(
            quickLog,
            "getRange",
            (
                /** @type {string | number} */ row,
                /** @type {number[]} */ ...args
            ) => {
                if (typeof row !== "string")
                    return originalGetRange(
                        row,
                        required(args[0]),
                        args[1],
                        args[2]
                    );
                return { setNote: () => quickLog };
            }
        );
        workbook.sheets.set("Quick log", quickLog);
        /**
         * @type {{
         *     toast?: [string, string | undefined];
         *     properties?: Record<string, string>;
         * }}
         */
        const calls = {};
        workbook.spreadsheet.toast = (message, title) => {
            calls.toast = [message, title];
        };
        const context = loadAppsScript(workbook.history, {
            globals: {
                PropertiesService: {
                    getDocumentProperties: () => ({
                        setProperties: (
                            /** @type {Record<string, string>} */ value
                        ) => {
                            calls.properties = value;
                        },
                    }),
                },
                Session: {
                    getScriptTimeZone: () => "America/New_York",
                },
            },
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp: {
                getActive: () => workbook.spreadsheet,
                newDataValidation: createDataValidationBuilder,
                openById: () => workbook.spreadsheet,
                ProtectionType: { RANGE: "RANGE" },
            },
        });

        context.installGardenLogger();
        context.installGardenLogger();

        expect(required(calls.properties)["gardenLoggerVersion"]).toBe(
            "5.18.3"
        );
        expect(required(calls.toast)[1]).toBe("Garden logger verified");
        expect(required(calls.toast)[0]).toMatch(/Logger 5\.18\.3 is ready/v);
        expect(quickLog.__protections).toHaveLength(1);
        expect(workbook.history.__protections).toHaveLength(5);
        expect(
            workbook.history.__protections.every((protection) =>
                protection.isWarningOnly()
            )
        ).toBe(true);
    });

    it("migrates and validates the append-only watering columns", () => {
        expect.hasAssertions();

        const compactHistory = createHistorySheet();
        required(compactHistory.__rows[0]).splice(40, 2);
        const context = loadAppsScript(compactHistory);

        context.ensureHistoryWaterColumns_(compactHistory);

        expect(
            structuredClone(required(compactHistory.__rows[0]).slice(40, 42))
        ).toStrictEqual(historyWaterHeaders);
        expect(compactHistory.getMaxColumns()).toBe(42);

        const currentHistory = createHistorySheet();
        currentHistory.getMaxRows = () => 5000;
        const currentContext = loadAppsScript(currentHistory);
        currentContext.ensureHistoryWaterColumns_(currentHistory);

        expect(
            structuredClone(required(currentHistory.__rows[0]).slice(40, 42))
        ).toStrictEqual(historyWaterHeaders);

        const malformedHistory = createHistorySheet();
        required(malformedHistory.__rows[0])[41] = "Water amount";
        const malformedContext = loadAppsScript(malformedHistory);

        expect(() => {
            malformedContext.ensureHistoryWaterColumns_(malformedHistory);
        }).toThrow(/history!ap1 must be "water amount \(ml\)"/iv);

        const partialQuickLog = createDataSheet("Quick log", [
            [],
            [],
            [],
            [
                "Plant ID",
                "Plant / current label",
                "Save",
                "Started at",
                "Event",
                "Weight state",
                "Weight (g)",
                "Height",
                "Width",
                "Plant condition",
                "Notes",
                "Pot setup",
                "Measurement unit",
                "Watering application",
            ],
        ]);

        expect(context.ensureQuickLogWaterColumns_(partialQuickLog)).toBe(true);
        expect(
            structuredClone(required(partialQuickLog.__rows[3]).slice(13, 15))
        ).toStrictEqual(historyWaterHeaders);
        expect(context.ensureQuickLogWaterColumns_(partialQuickLog)).toBe(
            false
        );

        const tableBackedQuickLog = createDataSheet("Quick log", [
            [],
            [],
            [],
            [
                ...required(partialQuickLog.__rows[3]).slice(0, 13),
                "Column 14",
                "Column 15",
            ],
        ]);

        expect(context.ensureQuickLogWaterColumns_(tableBackedQuickLog)).toBe(
            true
        );
        expect(
            structuredClone(
                required(tableBackedQuickLog.__rows[3]).slice(13, 15)
            )
        ).toStrictEqual(historyWaterHeaders);

        required(partialQuickLog.__rows[3])[14] = "Water amount";

        expect(() =>
            context.ensureQuickLogWaterColumns_(partialQuickLog)
        ).toThrow(/quick log!o4 must be "water amount \(ml\)"/iv);

        const historyView = createDataSheet(
            "History view",
            [
                Array.from(
                    { length: 40 },
                    () =>
                        /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                            ""
                        )
                ),
            ],
            [
                [
                    '=LET(rows,SORT(FILTER(History!A2:AN5000,History!A2:A5000<>""),1,FALSE,10,FALSE),rows)',
                    ...Array.from(
                        { length: 39 },
                        () =>
                            /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                                ""
                            )
                    ),
                ],
            ]
        );
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History view" ? historyView : null,
        };

        expect(context.ensureHistoryView_(spreadsheet)).toBe(true);
        expect(historyView.getMaxColumns()).toBe(42);
        expect(historyView.getRange(1, 1).getFormula()).toContain(
            "History!A2:AP5000"
        );
        expect(historyView.getRange(1, 1).getFormula()).toContain(
            "SEQUENCE(1,41,2,1)"
        );
        expect(context.ensureHistoryView_(spreadsheet)).toBe(false);

        const tableBackedHistory = createHistorySheet();
        required(tableBackedHistory.__rows[0])[40] = "Column 41";
        required(tableBackedHistory.__rows[0])[41] = "Column 42";

        expect(
            // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- Verify that this mutating Apps Script installer returns no payload.
            context.ensureHistoryWaterColumns_(tableBackedHistory)
        ).toBeUndefined();
        expect(
            structuredClone(
                required(tableBackedHistory.__rows[0]).slice(40, 42)
            )
        ).toStrictEqual(historyWaterHeaders);
    });

    it("marks failed saves with recoverable feedback and validates sheet headers", () => {
        expect.hasAssertions();

        const history = createHistorySheet();

        /**
         * @type {{
         *     toast?: [string, string];
         *     background?: string;
         *     note?: string;
         *     value?: import("../logger-fixtures.d.ts").CellValue;
         * }}
         */
        const saveCellState = {};
        const errorContext = loadAppsScript(history, {
            SpreadsheetApp: {
                getActive: () => ({
                    toast: (
                        /** @type {string} */ message,
                        /** @type {string} */ title
                    ) => {
                        saveCellState.toast = [message, title];
                    },
                }),
                openById: () => ({
                    getSheetByName: (/** @type {string} */ name) =>
                        name === "History" ? history : null,
                }),
            },
        });
        const saveCell = {
            setBackground(/** @type {string} */ value) {
                saveCellState.background = value;
                return saveCell;
            },
            setNote(/** @type {string} */ value) {
                saveCellState.note = value;
                return saveCell;
            },
            setValue(
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ value
            ) {
                saveCellState.value = value;
                return saveCell;
            },
        };
        errorContext.markSaveError_(saveCell, "Try again");

        expect(saveCellState).toMatchObject({
            background: "#f4cccc",
            note: "Not saved: Try again",
            toast: ["Try again", "Observation not saved"],
            value: false,
        });
        expect(() => {
            errorContext.assertHeaders_(
                createDataSheet("Wrong", [["Incorrect"]]),
                ["Expected"],
                1
            );
        }).toThrow(/wrong!a1 must be/iv);

        errorContext.assertHeaders_(
            createDataSheet("Right", [["Expected"]]),
            ["Expected"],
            1
        );
    });

    it("initializes missing History extension headers and rejects conflicts", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const emptyHeaders = createHistorySheet();
        required(emptyHeaders.__rows[0])[15] = "";
        for (const index of historyDetailHeaders.keys()) {
            required(emptyHeaders.__rows[0])[16 + index] = "";
        }
        for (const index of historyProvenanceHeaders.keys()) {
            required(emptyHeaders.__rows[0])[26 + index] = "";
        }
        for (const index of historyMeasurementHeaders.keys()) {
            required(emptyHeaders.__rows[0])[36 + index] = "";
        }
        required(emptyHeaders.__rows[0])[39] = "";
        context.ensureHistoryRequestIdColumn_(emptyHeaders);
        context.ensureHistoryDetailColumns_(emptyHeaders);
        context.ensureHistoryProvenanceColumns_(emptyHeaders);
        context.ensureHistoryMeasurementColumns_(emptyHeaders);
        context.ensureHistoryRotationColumns_(emptyHeaders, true);

        expect(required(emptyHeaders.__rows[0])[15]).toBe("Request ID");
        expect(
            structuredClone(required(emptyHeaders.__rows[0]).slice(16, 26))
        ).toStrictEqual(historyDetailHeaders);
        expect(
            structuredClone(required(emptyHeaders.__rows[0]).slice(26, 36))
        ).toStrictEqual(historyProvenanceHeaders);
        expect(
            structuredClone(required(emptyHeaders.__rows[0]).slice(36, 39))
        ).toStrictEqual(historyMeasurementHeaders);
        expect(
            structuredClone(required(emptyHeaders.__rows[0]).slice(39, 40))
        ).toStrictEqual(historyRotationHeaders);

        const badMeasurementHeader = createHistorySheet();
        required(badMeasurementHeader.__rows[0])[37] = "Inches";

        expect(() => {
            context.ensureHistoryMeasurementColumns_(badMeasurementHeader);
        }).toThrow(/must be "height \(in\)"/iv);

        const badRotationHeader = createHistorySheet();
        required(badRotationHeader.__rows[0])[39] = "Turn";

        expect(() => {
            context.ensureHistoryRotationColumns_(badRotationHeader);
        }).toThrow(/must be "rotation \(°\)"/iv);
    });

    it("repairs narrow History grids and enforces defensive source/header guards", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        expect(context.normalizeWebEntrySource_("")).toBe("Mobile logger");
        expect(context.normalizeWebEntrySource_("AppSheet")).toBe("AppSheet");
        expect(context.normalizeWebEntrySource_("AppSheet bulk")).toBe(
            "AppSheet bulk"
        );
        expect(() =>
            context.normalizeWebEntrySource_("Unknown client")
        ).toThrow(
            /entry source must be mobile logger, mobile bulk water, mobile bulk care, appsheet, or appsheet bulk/iv
        );

        const validHeaders = createHistorySheet();
        context.ensureHistoryProvenanceColumns_(validHeaders);
        context.ensureHistoryMeasurementColumns_(validHeaders);

        const badProvenanceHeader = createHistorySheet();
        required(badProvenanceHeader.__rows[0])[26] = "Wrong observation key";

        expect(() => {
            context.ensureHistoryProvenanceColumns_(badProvenanceHeader);
        }).toThrow(/must be "observation id"/iv);

        const narrowHistory = createHistorySheet();
        for (const row of narrowHistory.__rows) row.splice(30);
        context.ensureHistoryGrid_(narrowHistory);

        expect(narrowHistory.getMaxColumns()).toBe(42);

        const unvalidatedHistory = createHistorySheet();
        const storedRow = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        context.writeStoredObservationRows_(unvalidatedHistory, 2, [storedRow]);
        context.writeStoredObservationRows_(unvalidatedHistory, 101, [
            storedRow,
        ]);

        expect(unvalidatedHistory.getMaxRows()).toBe(101);

        const inheritedValidationHistory = createHistorySheet([], {
            measurementValidations: true,
        });
        const writeResult = context.writeStoredObservationRows_(
            inheritedValidationHistory,
            2,
            [storedRow]
        );

        expect(writeResult.validationRowsCleared).toBe(1);
        expect(
            inheritedValidationHistory.__clearDataValidationCalls
        ).toHaveLength(1);

        expect(
            Array.from(
                context.historyProvenanceRow_(
                    {
                        correctedObservationId: "prior-observation",
                        correctionReason: "Corrected after ruler check",
                        entrySource: "AppSheet",
                    },
                    "appsheet-entry-12345",
                    "Check",
                    0
                )
            )
        ).toMatchObject({
            0: "appsheet-entry-12345:1:check",
            2: "Corrected",
            4: "prior-observation",
            5: "Corrected after ruler check",
        });

        const observedHistoryProvenanceRow = structuredClone(
            Array.from(
                context.historyProvenanceRow_(
                    { entrySource: "AppSheet" },
                    "appsheet-entry-12345",
                    "Weigh",
                    1
                )
            ).slice(2, 3)
        );

        expect(observedHistoryProvenanceRow).toStrictEqual(["Measured"]);

        const observedHistoryProvenanceRow2 = structuredClone(
            Array.from(
                context.historyProvenanceRow_(
                    {
                        entrySource: "AppSheet",
                        measurementMethod: "Tape measure",
                        measurementQuality: "Measured",
                    },
                    "appsheet-entry-12345",
                    "Measure",
                    2
                )
            ).slice(2, 3)
        );

        expect(observedHistoryProvenanceRow2).toStrictEqual(["Measured"]);

        const sameObservedAt = new Date("2026-08-25T12:00:00Z");
        const recordedFirst = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        recordedFirst[0] = sameObservedAt;
        recordedFirst[1] = "P01";
        recordedFirst[2] = "Weigh";
        recordedFirst[4] = null;
        recordedFirst[9] = new Date("2026-08-25T12:01:00Z");
        const recordedSecond = Array.from(
            { length: 42 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        recordedSecond[0] = sameObservedAt;
        recordedSecond[1] = "P02";
        recordedSecond[2] = "Check";
        recordedSecond[9] = new Date("2026-08-25T12:02:00Z");
        const sortedHistory = Array.from(
            context.recentObservationsFromRows_(
                [recordedFirst, recordedSecond],
                "America/New_York",
                10,
                new Map([
                    ["P01", "First plant"],
                    ["P02", "Second plant"],
                ])
            )
        );

        expect(
            structuredClone(sortedHistory.map((row) => row.plantId))
        ).toStrictEqual(["P02", "P01"]);
        expect(required(sortedHistory[1])["weight"]).toBe("");
    });

    it("covers History helper initialization and row identity fallbacks", () => {
        expect.hasAssertions();

        const history = createHistorySheet([
            {
                requestId: "garden-history-edge-12345",
                values: [
                    "",
                    "P01",
                    "Weigh",
                ],
            },
        ]);
        const context = loadAppsScript(history);

        expect(context.lastHistoryDataRow_(history)).toBe(2);
        expect(context.lastHistoryReservedRow_(history)).toBe(2);

        const noRequestHistory = createHistorySheet([
            {
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Weigh",
                ],
            },
        ]);

        expect(context.lastHistoryReservedRow_(noRequestHistory)).toBe(2);

        const emptyHeaders = createHistorySheet();
        required(emptyHeaders.__rows[0])[15] = "";
        required(emptyHeaders.__rows[0]).fill("", 16, 26);
        required(emptyHeaders.__rows[0]).fill("", 26, 36);
        required(emptyHeaders.__rows[0]).fill("", 36, 39);
        context.ensureHistoryRequestIdColumn_(emptyHeaders);
        context.ensureHistoryDetailColumns_(emptyHeaders);
        context.ensureHistoryProvenanceColumns_(emptyHeaders);
        context.ensureHistoryMeasurementColumns_(emptyHeaders);

        expect(required(emptyHeaders.__rows[0])[15]).toBe("Request ID");
        expect(required(emptyHeaders.__rows[0])[16]).toBe("Nutrients used");
        expect(required(emptyHeaders.__rows[0])[26]).toBe("Observation ID");
        expect(required(emptyHeaders.__rows[0])[36]).toBe("Measurement unit");
    });
});

describe("garden logger History removal and audit safeguards", () => {
    it("excludes selected History observations without destroying their audit trail", () => {
        expect.hasAssertions();

        const history = createHistorySheet([
            {
                requestId: "garden-remove-12345",
                values: [
                    new Date("2026-08-12T12:00:00Z"),
                    "P20",
                    "Weigh",
                    "Routine",
                    1450,
                ],
            },
        ]);
        required(history.__rows[1])[12] = "helper-name";
        required(history.__rows[1])[13] = "helper-cycle";
        required(history.__rows[1])[16] = "detail";
        const selection = {
            getLastRow: () => 2,
            getRow: () => 2,
        };
        const activeSpreadsheet = {
            getActiveRange: () => selection,
            getActiveSheet: () => history,
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? history : null,
            getSpreadsheetTimeZone: () => "America/New_York",
            toast: () => {},
        };
        const ui = {
            alert: () => "YES",
            Button: { YES: "YES" },
            ButtonSet: { YES_NO: "YES_NO" },
        };
        const context = loadAppsScript(history, {
            SpreadsheetApp: {
                getActive: () => activeSpreadsheet,
                getUi: () => ui,
            },
        });

        context.removeSelectedHistoryObservations();

        expect(
            structuredClone(required(history.__rows[1]).slice(0, 5))
        ).toStrictEqual([
            new Date("2026-08-12T12:00:00Z"),
            "P20",
            "Weigh",
            "Routine",
            1450,
        ]);
        expect(
            structuredClone(required(history.__rows[1]).slice(12, 15))
        ).toStrictEqual([
            "helper-name",
            "helper-cycle",
            "",
        ]);
        expect(required(history.__rows[1])[15]).toBe("garden-remove-12345");
        expect(required(history.__rows[1])[16]).toBe("detail");
        expect(required(history.__rows[1])[31]).toMatch(
            /Excluded from active analysis/v
        );
        expect(required(history.__rows[1])[35]).toBe("Removed");
    });

    it("covers History removal guards, large previews, and cancellation", () => {
        expect.hasAssertions();

        const observations = Array.from({ length: 9 }, (_, index) => ({
            requestId: `garden-remove-${String(index).padStart(6, "0")}`,
            values: [
                `8/${index + 1}/2026`,
                "P01",
                "Weigh",
                "Routine",
                400 + index,
            ],
        }));
        const history = createHistorySheet(observations);
        /**
         * @type {{
         *     getLastRow:
         *         | (() => number)
         *         | (() => number)
         *         | (() => number)
         *         | (() => number);
         *     getRow:
         *         | (() => number)
         *         | (() => number)
         *         | (() => number)
         *         | (() => number);
         * } | null}
         */
        let selection = null;
        /**
         * @type {import("../sheet-fixtures.d.ts").HistorySheet
         *     | import("../sheet-fixtures.d.ts").DataSheet}
         */
        let activeSheet = history;
        const spreadsheet = {
            getActiveRange: () => selection,
            getActiveSheet: () => activeSheet,
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? history : null,
            toast: () => {},
        };
        const ui = {
            alert: () => "NO",
            Button: { NO: "NO", YES: "YES" },
            ButtonSet: { YES_NO: "YES_NO" },
        };
        const context = loadAppsScript(history, {
            SpreadsheetApp: {
                flush: () => {},
                getActive: () => spreadsheet,
                getUi: () => ui,
                openById: () => spreadsheet,
            },
        });

        context.removeSelectedHistoryObservations();
        activeSheet = createDataSheet("Other", [[]]);
        selection = { getLastRow: () => 2, getRow: () => 2 };
        context.removeSelectedHistoryObservations();

        activeSheet = history;
        selection = { getLastRow: () => 1, getRow: () => 1 };
        context.removeSelectedHistoryObservations();

        selection = { getLastRow: () => 102, getRow: () => 2 };

        expect(() => {
            context.removeSelectedHistoryObservations();
        }).toThrow(/no more than 100/iv);

        selection = { getLastRow: () => 10, getRow: () => 2 };
        context.removeSelectedHistoryObservations();

        expect(required(history.__rows[1])[0]).toBe("8/1/2026");

        const emptyHistory = createHistorySheet([{ values: [] }]);
        const emptySpreadsheet = {
            getActiveRange: () => ({ getLastRow: () => 2, getRow: () => 2 }),
            getActiveSheet: () => emptyHistory,
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? emptyHistory : null,
            toast: () => {},
        };
        const emptyContext = loadAppsScript(emptyHistory, {
            SpreadsheetApp: {
                flush: () => {},
                getActive: () => emptySpreadsheet,
                getUi: () => ui,
                openById: () => emptySpreadsheet,
            },
        });
        emptyContext.removeSelectedHistoryObservations();
    });
});

describe("garden logger Quick log editing and archiving", () => {
    it("timestamps and infers Quick log events for partial edits", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const quickRows = [
            [],
            [],
            [
                "",
                "Water",
                false,
            ],
            [
                "Plant ID",
                "Plant / current label",
                "Save",
                "Started at",
                "Event",
                "Weight state",
                "Weight (g)",
                "Height",
                "Width",
                "Plant condition",
                "Notes",
                "Pot setup",
                "Measurement unit",
            ],
            [
                "P01",
                "Plant P01",
                false,
                "",
                "",
                "Routine",
                450,
            ],
            [
                "P02",
                "Plant P02",
                false,
                "",
                "",
                "",
                "",
                8,
            ],
        ];
        const quick = createDataSheet("Quick log", quickRows);
        workbook.spreadsheet.toast = () => {};
        workbook.sheets.set("Quick log", quick);
        quick.setParent(workbook.spreadsheet);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        context.onEdit({
            range: quick.getRange(5, 7),
            value: "450",
        });

        expect(required(quickRows[4])[3]).toBeInstanceOf(Date);
        expect(required(quickRows[4])[4]).toBe("Weigh");

        context.onEdit({
            range: quick.getRange(6, 8),
            value: "8",
        });

        expect(required(quickRows[5])[4]).toBe("Measure");

        required(quickRows[4])[5] = "Wet";
        context.updateInferredEvent_(quick, 5, 6);

        expect(required(quickRows[4])[4]).toBe("Weigh");

        required(quickRows[4])[5] = "";
        required(quickRows[4])[6] = "";
        required(quickRows[4])[7] = "";
        required(quickRows[4])[8] = "";
        context.updateInferredEvent_(quick, 5, 7);

        expect(required(quickRows[4])[4]).toBe("");

        context.updateInferredEvent_(quick, 5, 2);

        context.applyBulkEvent_(quick);

        expect(required(quickRows[4])[4]).toBe("Water");
        expect(required(quickRows[5])[4]).toBe("Water");

        required(quickRows[2])[1] = "Clear events";
        context.applyBulkEvent_(quick);

        expect(required(quickRows[4])[4]).toBe("");
        expect(required(quickRows[5])[4]).toBe("");
    });

    it.each([
        { amount: "", application: "Partial", event: "Weigh" },
        { amount: 40, application: "", event: "Weigh" },
    ])(
        "rejects watering details without a Water event in Quick log: %j",
        (options) => {
            expect.hasAssertions();

            const { context, quick, row, workbook } =
                quickLogWateringFixture(options);
            const before = [...row];

            expect(() => {
                context.archiveQuickLogRow_(quick, 5);
            }).toThrow(/only for a Water event/v);
            expect(structuredClone(row)).toStrictEqual(before);
            expect(workbook.history.__rows).toHaveLength(1);
        }
    );

    it.each([
        { amount: 200, application: "Flood / soak-through", event: "Water" },
        { amount: 40, application: "Partial", event: "Water" },
        { amount: 20, application: "Spot", event: "Water" },
    ])(
        "keeps watering details attached to a real Water event in Quick log: %j",
        (options) => {
            expect.hasAssertions();

            const { context, quick, workbook } =
                quickLogWateringFixture(options);
            context.archiveQuickLogRow_(quick, 5);
            const saved = workbook.history.__rows.find(
                (record) => record[2] === "Water"
            );

            expect(
                structuredClone(required(saved).slice(40, 42))
            ).toStrictEqual([options.application, options.amount]);
            expect(
                required(
                    workbook.history.__rows.find(
                        (record) => record[2] === "Weigh"
                    )
                )[4]
            ).toBe(451);
        }
    );

    it("covers Quick log edit guards, bulk errors, and label misses", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        workbook.spreadsheet.toast = () => {};
        const quickRows = [
            [],
            [],
            [
                "",
                "",
                false,
            ],
            [],
            [
                "P01",
                "Plant P01",
                false,
                new Date(),
                "",
                "",
                "",
            ],
        ];
        const quick = createDataSheet("Quick log", quickRows);
        workbook.sheets.set("Quick log", quick);
        quick.setParent(workbook.spreadsheet);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        context.onEdit();
        context.onEdit({
            range: createDataSheet("Other", [[]]).getRange(1, 1),
        });
        context.stampEntryStartedAt_(quick, quick.getRange(3, 2));
        context.stampEntryStartedAt_(quick, quick.getRange(5, 5));

        expect(required(quickRows[4])[3]).toBeInstanceOf(Date);

        context.applyBulkEvent_(quick);

        expect(required(quickRows[2])[2]).toBe(false);

        const emptyQuick = createDataSheet("Quick log", [
            [],
            [],
            ["", "Water"],
        ]);
        emptyQuick.setParent(workbook.spreadsheet);
        context.applyBulkEvent_(emptyQuick);

        expect(context.currentLabelForPlant_(workbook.spreadsheet, "P99")).toBe(
            ""
        );

        const emptyTrackerWorkbook = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "Plant tracker"
                    ? createDataSheet("Plant tracker", [[]])
                    : null,
        };

        expect(context.currentLabelForPlant_(emptyTrackerWorkbook, "P01")).toBe(
            ""
        );
    });

    it("runs every Quick log onEdit path, including bulk and locked saves", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        workbook.spreadsheet.toast = () => {};
        const quickRows = [
            [],
            [],
            [
                "",
                "Water",
                false,
            ],
            [],
            [
                "P01",
                "Plant P01",
                false,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                1,
            ],
            [
                "",
                "",
                false,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                1,
            ],
        ];
        const quick = createDataSheet("Quick log", quickRows);
        quick.setParent(workbook.spreadsheet);
        workbook.sheets.set("Quick log", quick);
        const SpreadsheetApp = {
            flush: () => {},
            getActive: () => workbook.spreadsheet,
            openById: () => workbook.spreadsheet,
        };
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp,
        });

        context.onEdit({
            range: quick.getRange(3, 3),
            value: "TRUE",
        });

        expect(required(quickRows[4])[4]).toBe("Water");

        required(quickRows[4])[4] = "";
        required(quickRows[4])[6] = 420;
        context.onEdit({
            range: quick.getRange(5, 7),
            value: "420",
        });

        expect(required(quickRows[4])[4]).toBe("Weigh");
        expect(required(quickRows[4])[3]).toBeInstanceOf(Date);

        context.onEdit({});
        context.onEdit({
            range: quick.getRange(4, 5),
            value: "Check",
        });
        context.onEdit({
            range: quick.getRange(5, 5, 1, 2),
            value: "Weigh",
        });

        context.onEdit({
            range: quick.getRange(5, 3),
            value: "TRUE",
        });

        expect(workbook.history.__rows).toHaveLength(2);

        const lockedContext = loadAppsScript(workbook.history, {
            globals: {
                LockService: {
                    getScriptLock: () => ({
                        releaseLock: () => {},
                        tryLock: () => false,
                    }),
                },
            },
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp,
        });
        quickRows[4] = [
            "P01",
            "Plant P01",
            false,
            "",
            "Weigh",
            "Routine",
            400,
            "",
            "",
            "",
            "",
            1,
        ];
        lockedContext.onEdit({
            range: quick.getRange(5, 3),
            value: "TRUE",
        });

        expect(quickRows[4][2]).toBe(false);
    });

    it("auto-selects and clears every inferred Quick log event", () => {
        expect.hasAssertions();

        const rows = Array.from({ length: 5 }, () => emptyCells(0));
        rows[4] = [
            "P01",
            "Plant",
            false,
            "",
            "",
            "",
            "",
            "",
            "",
        ];
        const quick = createDataSheet("Quick log", rows);
        const context = loadAppsScript(createHistorySheet());

        required(rows[4])[5] = "Wet";
        context.updateInferredEvent_(quick, 5, 6);

        expect(required(rows[4])[4]).toBe("");

        required(rows[4])[4] = "";
        required(rows[4])[5] = "";
        required(rows[4])[6] = 400;
        context.updateInferredEvent_(quick, 5, 7);

        expect(required(rows[4])[4]).toBe("Weigh");

        required(rows[4])[4] = "";
        required(rows[4])[6] = "";
        required(rows[4])[7] = 7;
        context.updateInferredEvent_(quick, 5, 8);

        expect(required(rows[4])[4]).toBe("Measure");

        required(rows[4])[7] = "";
        context.updateInferredEvent_(quick, 5, 8);

        expect(required(rows[4])[4]).toBe("");
    });

    it("archives a Quick log weight and leaves the row ready for reuse", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const quickRows = [
            [],
            [],
            [],
            [
                "Plant ID",
                "Plant / current label",
                "Save",
                "Started at",
                "Event",
                "Weight state",
                "Weight (g)",
                "Height",
                "Width",
                "Plant condition",
                "Notes",
                "Pot setup",
                "Measurement unit",
            ],
            [
                "P01",
                "Plant P01",
                true,
                new Date("2026-08-16T12:00:00Z"),
                "Weigh",
                "Routine",
                451,
                "",
                "",
                "Healthy",
                "Scale verified",
                1,
            ],
        ];
        const quick = createDataSheet("Quick log", quickRows);
        /** @type {Parameters<typeof workbook.spreadsheet.toast>[]} */
        const toasts = [];
        workbook.spreadsheet.toast = (...args) => {
            toasts.push(args);
        };
        workbook.sheets.set("Quick log", quick);
        quick.setParent(workbook.spreadsheet);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        context.archiveQuickLogRow_(quick, 5);

        expect(
            structuredClone(required(workbook.history.__rows[1]).slice(1, 5))
        ).toStrictEqual([
            "P01",
            "Weigh",
            "Routine",
            451,
        ]);
        expect(
            structuredClone(required(quickRows[4]).slice(3, 11))
        ).toStrictEqual(
            Array.from(
                { length: 8 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            )
        );
        expect(required(quickRows[4])[2]).toBe(false);
        expect(required(toasts[0])[0]).toMatch(/History rows? added/v);

        required(quickRows[4])[0] = "";

        expect(() => {
            context.archiveQuickLogRow_(quick, 5);
        }).toThrow(/no plant id/iv);
    });

    it("rejects invalid Quick log combinations without clearing the row", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        workbook.spreadsheet.toast = () => {};
        const header = [
            "Plant ID",
            "Plant / current label",
            "Save",
            "Started at",
            "Event",
            "Weight state",
            "Weight (g)",
            "Height",
            "Width",
            "Plant condition",
            "Notes",
            "Pot setup",
            "Measurement unit",
        ];
        const quickRows = [
            [],
            [],
            [],
            header,
            Array.from(
                { length: 12 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            ),
        ];
        const quick = createDataSheet("Quick log", quickRows);
        workbook.sheets.set("Quick log", quick);
        quick.setParent(workbook.spreadsheet);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const row = quickRows[4];
        required(row)[0] = "P01";
        required(row)[3] = new Date("2026-08-16T12:00:00Z");
        required(row)[11] = 1;

        required(row)[4] = "Invalid";

        expect(() => {
            context.archiveQuickLogRow_(quick, 5);
        }).toThrow(/event must be one of/iv);

        required(row)[4] = "";
        required(row)[5] = "Invalid";

        expect(() => {
            context.archiveQuickLogRow_(quick, 5);
        }).toThrow(/weight state must be/iv);

        required(row)[5] = "Dry";

        expect(() => {
            context.archiveQuickLogRow_(quick, 5);
        }).toThrow(/enter an event, measurement, condition, or note/iv);

        required(row)[5] = "";
        required(row)[4] = "Weigh";

        expect(() => {
            context.archiveQuickLogRow_(quick, 5);
        }).toThrow(/weigh was selected/iv);

        required(row)[4] = "Measure";

        expect(() => {
            context.archiveQuickLogRow_(quick, 5);
        }).toThrow(/no height or width/iv);

        required(row)[4] = "Weigh";
        required(row)[6] = 452;
        context.archiveQuickLogRow_(quick, 5);

        expect(required(workbook.history.__rows[1])[3]).toBe("Routine");
    });

    it("covers Quick log archive failures and installation timezone safety", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        workbook.spreadsheet.toast = () => {};
        const quickRows = Array.from({ length: 5 }, () =>
            Array.from(
                { length: 12 },
                () =>
                    /** @type {import("../logger-fixtures.d.ts").CellValue} */ (
                        ""
                    )
            )
        );
        required(quickRows[4])[4] = "Weigh";
        const quick = createDataSheet("Quick log", quickRows);
        quick.setParent(workbook.spreadsheet);
        workbook.sheets.set("Quick log", quick);
        const SpreadsheetApp = {
            flush: () => {},
            getActive: () => workbook.spreadsheet,
            openById: () => workbook.spreadsheet,
        };
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp,
        });

        expect(() => {
            context.archiveQuickLogRow_(quick, 5);
        }).toThrow(/no plant id/iv);

        quickRows[4] = [
            "P01",
            "Plant P01",
            false,
            new Date(),
            "Bogus",
            "",
            "",
            "",
            "",
            "",
            "",
            1,
        ];
        context.onEdit({ range: quick.getRange(5, 3), value: "TRUE" });

        expect(quickRows[4][2]).toBe(false);

        vm.runInContext(
            'archiveQuickLogRow_ = () => { throw "string archive failure"; };',
            context
        );
        context.onEdit({ range: quick.getRange(5, 3), value: "TRUE" });

        expect(quickRows[4][2]).toBe(false);

        const quickHeaderRows = Array.from({ length: 4 }, () => emptyCells(0));
        quickHeaderRows[3] = [
            "Plant ID",
            "Plant / current label",
            "Save",
            "Started at",
            "Event",
            "Weight state",
            "Weight (g)",
            "Height",
            "Width",
            "Plant condition",
            "Notes",
            "Pot setup",
            "Measurement unit",
        ];
        const installQuick = createDataSheet("Quick log", quickHeaderRows);
        const installSheets = fixtureMap([
            ["History", workbook.history],
            ["Quick log", installQuick],
        ]);
        const installSpreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                installSheets.get(name) ?? null,
            getSpreadsheetTimeZone: () => "America/New_York",
        };
        const installContext = loadAppsScript(workbook.history, {
            globals: {
                Session: { getScriptTimeZone: () => "UTC" },
            },
            SpreadsheetApp: {
                flush: () => {},
                getActive: () => installSpreadsheet,
                openById: () => installSpreadsheet,
            },
        });

        expect(() => {
            installContext.installGardenLogger();
        }).toThrow(/timezone \(utc\).*america\/new_york/iv);
    });
});

/**
 * @param {import("../sheet-fixtures.d.ts").DataSheet
 *     | import("../sheet-fixtures.d.ts").HistorySheet} sheet
 */
function dataSheet(sheet) {
    if (!("__dataValidationCalls" in sheet))
        throw new TypeError("Expected data sheet fixture");
    return sheet;
}

/**
 * @param {number} length @returns
 *   {import("../logger-fixtures.d.ts").CellValue[]}
 */
function emptyCells(length) {
    return Array.from({ length }, () => "");
}
