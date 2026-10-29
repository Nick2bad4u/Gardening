import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

import { LOGGER_VERSION } from "../../scripts/logger-version.mjs";
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
const historyCareHeaders = [
    "Mist targets",
    "Mist amount (mL)",
    "Mist details",
    "Previous location",
    "New location",
    "Temperature (°C)",
    "Temperature target",
    "Temperature entry unit",
    "Environment aspect",
    "Previous setting",
    "New setting",
    "Propagation method",
    "Propagation details",
    "Support action",
    "Support details",
    "Leaf temperature (°C)",
    "Leaf temperature entry unit",
    "Paired air temperature (°C)",
    "Paired air temperature entry unit",
    "Paired relative humidity (%)",
    "Leaf VPD (kPa)",
    "Leaf VPD source",
];
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
    "Relative humidity (%)",
    "PPFD (µmol/m²/s)",
    "Illuminance (lux)",
    ...historyCareHeaders.map((header) => header.replace(" (°C)", "")),
];

const appSheetBulkV512Plants = Array.from(
    { length: 22 },
    (_, index) => `P${String(index + 1).padStart(2, "0")}`
);
const appSheetBulkV513Plants = Array.from(
    { length: 28 },
    (_, index) => `P${String(index + 1).padStart(2, "0")}`
);
const appSheetBulkPlants = [
    ...Array.from(
        { length: 30 },
        (_, index) => `P${String(index + 1).padStart(2, "0")}`
    ),
    "P31",
    "P32",
    "P35",
    "P36",
    "P37",
    "P38",
    "P39",
    "P40",
    "P41",
];

const appSheetBulkHeaders = [
    "Round ID",
    "Started at",
    "Observed at",
    "Round action",
    "Selected plants",
    "Weight state",
    ...appSheetBulkPlants
        .slice(0, 30)
        .map((plantId) => `${plantId} weight (g)`),
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
    "P31 weight (g)",
    "P32 weight (g)",
    "P33 weight (g)",
    "P34 weight (g)",
    "P35 weight (g)",
    "P36 weight (g)",
    "P37 weight (g)",
    "P38 weight (g)",
    ...historyCareHeaders.slice(0, 5),
    ...historyCareHeaders.slice(8, 15),
    "P39 weight (g)",
    "P40 weight (g)",
    "P41 weight (g)",
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
const appSheetBulkNotesIndex = appSheetBulkWeightStartIndex + 30;
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
    let maxRows = Math.max(rows.length, 100);
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
        getMaxRows: () => maxRows,
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
                clearDataValidations() {
                    dataValidationCalls.push({
                        column,
                        columnCount,
                        row,
                        rowCount,
                        validation: null,
                    });
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
        insertRowsAfter(_row, count) {
            maxRows += count;
            return sheet;
        },
        setColumnWidth: () => sheet,
        setColumnWidths: () => sheet,
        setFrozenRows: () => sheet,
        setHiddenGridlines: () => sheet,
        setParent(value) {
            parent = value;
        },
        showColumns: () => sheet,
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
        requireNumberGreaterThanOrEqualTo(/** @type {number} */ value) {
            validation = { type: "NUMBER_GREATER_THAN_EQ", values: [value] };
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
 * @param {{ formulaInputs?: string[][]; measurementValidations?: boolean }} [options]
 *
 * @returns {import("../sheet-fixtures.d.ts").HistorySheet}
 */
function createHistorySheet(
    observations = [],
    { formulaInputs = [], measurementValidations = false } = {}
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
        { length: 60 },
        () => /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
    );
    for (const [index, value] of historyHeaders.entries()) {
        header[index] = value;
    }
    header[42] = "Relative humidity (%)";
    header[43] = "PPFD (µmol/m²/s)";
    header[44] = "Illuminance (lux)";
    for (const [index, value] of historyCareHeaders.entries()) {
        header[45 + index] = value;
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
                { length: 60 },
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
        return Array.from({ length: rowCount }, (_, rowOffset) => {
            const sourceRow = rows[row - 1 + rowOffset] ?? [];
            const values = emptyCells(columnCount);
            const end = Math.min(sourceRow.length, column - 1 + columnCount);
            for (let index = column - 1; index < end; index += 1)
                values[index - column + 1] = sourceRow[index] ?? "";
            return values;
        });
    }

    /**
     * @param {number} row @param {number} column @param
     *   {import("../logger-fixtures.d.ts").CellValue[][]} values
     */
    function setRangeValues(row, column, values) {
        for (const [rowOffset, currentRow] of values.entries()) {
            const targetRow = row - 1 + rowOffset;
            rows[targetRow] ??= Array.from(
                { length: 60 },
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
                getFormulas: () =>
                    values().map((cells, rowOffset) =>
                        cells.map(
                            (value, columnOffset) =>
                                formulaInputs[row - 1 + rowOffset]?.[
                                    column - 1 + columnOffset
                                ] ??
                                (typeof value === "string" &&
                                value.startsWith("=")
                                    ? value
                                    : "")
                        )
                    ),
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
    it.each([
        null,
        undefined,
        false,
        12,
        "P01",
        [],
    ])(
        "rejects a non-object mobile payload (%j) without changing History",
        (payload) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook();
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            const before = structuredClone(workbook.history.__rows);

            expect(() => context.saveWebObservation(payload)).toThrow(
                "Choose a valid plant."
            );
            expect(() => context.saveBulkCareObservation(payload)).toThrow(
                "Choose at least one plant."
            );
            expect(workbook.history.__rows).toStrictEqual(before);
        }
    );

    it("stops header installation when the sheet cannot return its requested row", () => {
        expect.hasAssertions();

        const history = createHistorySheet();
        const getRange = history.getRange.bind(history);
        history.getRange = (...args) => ({
            ...getRange(...args),
            getDisplayValues: () => [],
        });
        const context = loadAppsScript(history);
        const before = structuredClone(history.__rows);

        expect(() => {
            context.ensureHistoryDetailColumns_(history);
        }).toThrow("The spreadsheet returned no values for the requested row.");
        expect(history.__rows).toStrictEqual(before);
    });

    it("preserves numeric and Date timestamp inputs and rejects an invalid Date", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const timestamp = Date.UTC(2026, 8, 7, 12);
        const date = new Date(timestamp);

        expect(context.normalizeDate_(timestamp)).toStrictEqual(date);
        expect(context.normalizeDate_(date)).toBe(date);
        expect(context.dateSortValue_(timestamp)).toBe(timestamp);
        expect(context.dateSortValue_(new Date(NaN))).toBe(0);
    });

    it("infers a single weight event when an older client omits the events array", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const result = context.saveWebObservation({
            observedAt: "2026-09-03T12:00:00Z",
            plantId: "P01",
            requestId: "legacy-client-weight-001",
            weight: 375,
        });

        expect(result).toMatchObject({ historyRows: 1, ok: true });
        expect(workbook.history.__rows).toHaveLength(2);
        expect(required(workbook.history.__rows[1]).slice(1, 5)).toStrictEqual([
            "P01",
            "Weigh",
            "Routine",
            375,
        ]);
    });

    it("rejects bulk care without an events array before writing any observations", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
        });
        const before = structuredClone(workbook.history.__rows);

        expect(() =>
            context.saveBulkCareObservation({ plantIds: ["P01"] })
        ).toThrow("Choose at least one bulk-care event");
        expect(workbook.history.__rows).toStrictEqual(before);
    });

    it.each([1, appSheetEntryHeaders.length])(
        "leaves %s unrecognized App entries headers untouched",
        (width) => {
            expect.hasAssertions();

            const headers = Array.from({ length: width }, () => "Owner header");
            const entries = createDataSheet("App entries", [
                headers,
                ["Owner data"],
            ]);
            const before = structuredClone(entries.__rows);
            const columns = entries.getMaxColumns();
            const context = loadAppsScript(createHistorySheet());

            expect(context.ensureAppSheetEntryColumns_(entries, true)).toBe(
                false
            );
            expect(entries.__rows).toStrictEqual(before);
            expect(entries.getMaxColumns()).toBe(columns);
            expect(entries.__dataValidationCalls).toStrictEqual([]);
            expect(entries.__protections).toStrictEqual([]);
        }
    );

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
            "Inspect",
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
            context.isPhotoShareUrl_("https://photos.google.com/share/example")
        ).toBe(true);
        expect(context.isPhotoShareUrl_("https://example.com/photo")).toBe(
            false
        );
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
            "Inspect",
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
            lux: "",
            nutrientAmount: "",
            nutrientProduct: "",
            nutrientsUsed: "",
            pestIssue: "",
            pestTreatment: "",
            photoUrl: "",
            potSize: "",
            ppfd: "",
            previousPotSize: "",
            relativeHumidity: "",
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
                { length: 60 },
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
                { length: 60 },
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
                { length: 60 },
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

    it("builds deterministic dry-weight and forecast formulas for Baselines", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const baselineRow = context.baselineViewRow_(2, {
            id: "P01",
            name: "Test plant",
        });

        expect({
            length: baselineRow.length,
            time: baselineRow[4],
            weight: baselineRow[2],
        }).toStrictEqual({
            length: 36,
            time: "=XLOOKUP($A2,'Workbook calculations'!$A$2:$A$40,'Workbook calculations'!$C$2:$C$40,\"\")",
            weight: "=XLOOKUP($A2,'Workbook calculations'!$A$2:$A$40,'Workbook calculations'!$B$2:$B$40,\"\")",
        });
        expect(baselineRow.join(" ")).not.toMatch(
            /NOW\(|TODAY\(|\$[A-Z]+:\$[A-Z]+/v
        );

        const modelColumns = /** @type {[number, string][]} */ ([
            [22, "C"],
            [24, "D"],
            [20, "E"],
            [30, "G"],
            [31, "H"],
        ]);
        for (const [index, column] of modelColumns) {
            expect(baselineRow[index]).toContain(
                `XLOOKUP($A2,'Dry-down models'!$A$2:$A$40,'Dry-down models'!$${column}$2:$${column}$40,"")`
            );
            expect(baselineRow[index]).toContain(
                "'Workbook calculations'!$I$2=\"Ready\""
            );
            expect(baselineRow[index]).toContain("*1440<=15");
            expect(baselineRow[index]).toContain("Baselines!$T$2:$T$40,-1)");
        }

        expect(baselineRow[25]).toContain('Y2<=W2),"",Y2-W2');
        expect(baselineRow[12]).toBe('=IF(OR(AE2="",C2<=0),"",AE2/C2)');
        expect(baselineRow[8]).toContain("'Dry-down models'!$L$2:$L$40");
        expect(baselineRow[9]).toContain("'Plant tracker'!$AD$2:$AD$40");
        expect(baselineRow[11]).toContain('TEXT(early,"mmm d")');
        expect(baselineRow[11]).toContain('TEXT(late,"mmm d")');
        expect(baselineRow[32]).toContain("learned cycle");
        expect(baselineRow[33]).toMatch(/DATE\(9999,12,31\)/v);
    });

    it("retains a bounded nonvolatile historical dry-down custom-function formula", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));

        expect(context.dryDownModelFormula_()).toContain("=GARDEN_DRY_DOWN(");
        expect(context.dryDownModelFormula_()).toContain("History!AJ2:AJ50001");
        expect(context.dryDownModelFormula_()).not.toMatch(/NOW\(|TODAY\(/v);
    });

    it("projects the full plant history with photo links and recorded weight states", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));

        expect(context.plantPageHistoryFormula_("P01")).toContain(
            'HYPERLINK(url,"Open photo")'
        );
        expect(context.plantPageHistoryFormula_("P01")).toContain(
            "History!$X$2:$X$50001"
        );
        expect(context.plantPageHistoryFormula_("P01")).toContain(
            "History!$D$2:$D$50001"
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

    it("pairs baseline condition and date with Inspect or a historical condition Check", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const baselineRow = context.baselineViewRow_(2, {
            id: "P01",
            name: "Test plant",
        });

        for (const column of [15, 16]) {
            expect(baselineRow[column]).toContain(
                'REGEXMATCH(History!$C$2:$C$50001,"^(Check|Inspect)$")'
            );
            expect(baselineRow[column]).toContain('History!$H$2:$H$50001<>""');
        }
    });

    it("keeps pot and medium formulas scoped to active current-setup history and the documented seed setup", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const rows = [
            "P22",
            "P23",
            "P24",
            "P25",
            "P26",
            "P27",
            "P28",
            "P29",
        ].map((id, index) =>
            context.baselineViewRow_(index + 2, { id, name: id })
        );
        for (const [index, row] of rows.entries()) {
            for (const column of [5, 17]) {
                expect(row[column]).toContain(
                    `History!$K$2:$K$50001=$T${index + 2}`
                );
                expect(row[column]).toContain(
                    'History!$AJ$2:$AJ$50001<>"Removed"'
                );
            }

            expect(row[5]).toContain('History!$C$2:$C$50001="Repot"');
            expect(row[5]).toContain('History!$U$2:$U$50001<>""');
            expect(row[5]).toContain("'Plant tracker'!$AB$2:$AB$40");
        }

        expect(rows[0]?.[17]).not.toContain("owner estimate");
        expect(rows.at(-1)?.[17]).not.toContain("owner estimate");

        const seededRows = rows.slice(1, -1);
        for (const [index, row] of seededRows.entries()) {
            expect(row[17]).toContain(
                `IF($T${index + 3}=1,"Approximately 80% Molly's Succulent Mix / 20% perlite (owner estimate, September 20, 2026)","Not recorded")`
            );
            expect(row[17]).toContain('History!$AH$2:$AH$50001<>""');
        }
    });

    it.each([
        ["P31", "Approximately 70% greenhouse houseplant mix / 30% perlite"],
        ["P32", "Approximately 70% greenhouse houseplant mix / 30% perlite"],
        ["P38", "LECA balls and larger volcanic rock"],
    ])(
        "limits %s owner medium fallbacks to setup 1 after selecting active history",
        (id, description) => {
            expect.hasAssertions();

            const context = loadAppsScript(createHistorySheet([]));
            const formula = context.baselineViewRow_(32, { id, name: id })[17];

            expect(formula).toContain("History!$B$2:$B$50001=$A32");
            expect(formula).toContain("History!$K$2:$K$50001=$T32");
            expect(formula).toContain('History!$AH$2:$AH$50001<>""');
            expect(formula).toContain('History!$AJ$2:$AJ$50001<>"Removed"');
            expect(formula).toContain(
                `),1,FALSE),1,2),IF($T32=1,"${description}`
            );
            expect(formula).toMatch(/October 24, 2026\)","Not recorded"\)\)$/v);
        }
    );

    it("replaces only Arctic Ice's selected setup-2 placeholder without rewriting canonical evidence", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const formula = context.baselineViewRow_(36, {
            id: "P37",
            name: "Arctic Ice",
        })[17];

        expect(formula).toContain("=LET(recorded,IFNA(INDEX(SORT(FILTER(");
        expect(formula).toContain("History!$B$2:$B$50001=$A36");
        expect(formula).toContain("History!$K$2:$K$50001=$T36");
        expect(formula).toContain('History!$AH$2:$AH$50001<>""');
        expect(formula).toContain('History!$AJ$2:$AJ$50001<>"Removed"');
        expect(formula).toContain('),1,FALSE),1,2),"")');
        expect(formula).toContain(
            'AND($T36=2,OR(recorded="",recorded&""="6"))'
        );
        expect(formula).toContain(
            "100% Molly's Succulent Mix; no added perlite"
        );
        expect(formula).toMatch(
            /IF\(recorded="","Not recorded",recorded\)\)\)$/v
        );
    });

    it.each([
        "P01",
        "P23",
        "P28",
        "P30",
        "P39",
        "P40",
    ])(
        "preserves %s medium formula construction and excludes future repot mixes",
        (id) => {
            expect.hasAssertions();

            const context = loadAppsScript(createHistorySheet([]));
            const fallback = ["P23", "P28"].includes(id)
                ? `IF($T2=1,"Approximately 80% Molly's Succulent Mix / 20% perlite (owner estimate, September 20, 2026)","Not recorded")`
                : '"Not recorded"';

            expect(context.baselineViewRow_(2, { id, name: id })[17]).toBe(
                [
                    '=IFNA(INDEX(SORT(FILTER({History!$A$2:$A$50001,History!$AH$2:$AH$50001},History!$B$2:$B$50001=$A2,History!$K$2:$K$50001=$T2,History!$AH$2:$AH$50001<>"",History!$AJ$2:$AJ$50001<>"Removed"),1,FALSE),1,2),',
                    fallback,
                    ")",
                ].join("")
            );
        }
    );

    it("returns an empty history before evaluating array columns when a new pot has no observations", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        expect(context.plantPageHistoryFormula_("P33")).toMatch(
            /^=IF\(COUNTIFS\(History!\$B\$2:\$B\$50001,"P33",History!\$A\$2:\$A\$50001,"<>"\)=0,"",IFNA\(LET/v
        );
        expect(context.plantPageHistoryFormula_("P34")).toContain(
            'History!$B$2:$B$50001,"P34"'
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
    it("avoids extra full-history pot reads for ordinary queued and bulk care saves", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const existing = emptyCells(67);
        existing[0] = new Date("2026-08-15T12:00:00Z");
        existing[1] = "P01";
        existing[2] = "Weigh";
        existing[4] = 400;
        existing[10] = 1;
        workbook.history.__rows.push(existing);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const queued = context.saveWebObservationBatch([
            {
                events: ["Weigh"],
                observedAt: "2026-08-16T12:00:00Z",
                plantId: "P01",
                requestId: "garden-pot-read-batch-12345",
                weight: 390,
            },
        ]);

        expect(queued.ok).toBe(true);
        expect(
            workbook.history.__rangeReads.filter(
                (read) =>
                    read.column === 1 &&
                    read.columnCount === 67 &&
                    read.row === 2
            )
        ).toHaveLength(1);

        workbook.history.__rangeReads.length = 0;
        const bulk = context.saveBulkCareObservation({
            events: ["Clean"],
            observedAt: "2026-08-16T13:00:00Z",
            plantIds: ["P01"],
            requestId: "garden-pot-read-bulk-12345",
        });

        expect(bulk.ok).toBe(true);
        expect(
            workbook.history.__rangeReads.filter(
                (read) =>
                    read.column === 1 &&
                    read.columnCount === 67 &&
                    read.row === 2
            )
        ).toHaveLength(1);
    });

    it("uses a saved Repot instead of stale tracker metadata in bootstrap and subsequent saves", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const tracker = required(workbook.sheets.get("Plant tracker"));
        required(tracker.__rows[0])[3] = "Current pot size";
        required(tracker.__rows[1])[3] = "Not recorded";
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const saved = context.saveWebObservation({
            events: ["Repot"],
            observedAt: "2026-08-16T10:02:00-04:00",
            plantId: "P01",
            potSize: "5 in",
            requestId: "garden-pot-first-12345",
        });

        expect(saved.ok).toBe(true);
        expect(context.getWebAppBootstrap().plants[0]).toMatchObject({
            currentPotSize: "5 in",
            potSetup: 2,
        });
        expect(
            context.plantRecordForId_(workbook.spreadsheet, "P01")
        ).toMatchObject({ currentPotSize: "5 in", potSetup: 2 });

        const next = context.saveWebObservation({
            events: ["Repot"],
            observedAt: "2026-08-17T10:02:00-04:00",
            plantId: "P01",
            potSize: "6 in",
            requestId: "garden-pot-second-12345",
        });

        expect(next.ok).toBe(true);
        expect(required(workbook.history.__rows[2])[19]).toBe("5 in");
        expect(required(tracker.__rows[1])[3]).toBe("Not recorded");

        // A later timestamp on an older setup must not replace the current pot.
        required(workbook.history.__rows[1])[0] = new Date(
            "2026-08-18T10:02:00Z"
        );
        const removed = [...required(workbook.history.__rows[2])];
        removed[0] = new Date("2026-08-19T10:02:00Z");
        removed[20] = "Removed size";
        removed[35] = "Removed";
        workbook.history.__rows.push(removed);

        expect(context.getWebAppBootstrap().plants[0]).toMatchObject({
            currentPotSize: "6 in",
            potSetup: 3,
        });
        expect(
            context.plantRecordForId_(workbook.spreadsheet, "P01")
        ).toMatchObject({ currentPotSize: "6 in", potSetup: 3 });
    });

    it("does not reuse initial pot seeds after a setup change with no recorded current size", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        required(required(workbook.sheets.get("Baselines")).__rows[1])[19] = 2;
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
        });

        expect(
            context.plantRecordForId_(workbook.spreadsheet, "P01")
        ).toMatchObject({ currentPotSize: "Not logged", potSetup: 2 });
        expect(context.getWebAppBootstrap().plants[0]).toMatchObject({
            currentPotSize: "Not logged",
            potSetup: 2,
        });
    });

    it("preserves tracker pot metadata when History has no Repot and defaults legacy blank setups", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const tracker = required(workbook.sheets.get("Plant tracker"));
        required(tracker.__rows[0])[3] = "Current pot size";
        required(tracker.__rows[1])[3] = "4 in";
        required(required(workbook.sheets.get("Baselines")).__rows[1])[19] = "";
        const anonymous = emptyCells(15);
        anonymous[3] = "Owner annotation";
        tracker.__rows.push(anonymous);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
        });

        expect(
            context.plantRecordsById_(workbook.spreadsheet).keys().toArray()
        ).toStrictEqual(["P01"]);
        expect(
            context.plantRecordForId_(workbook.spreadsheet, "P01")
        ).toMatchObject({ currentPotSize: "4 in", potSetup: 1 });
        expect(
            context.plantRecordForId_(workbook.spreadsheet, "P99")
        ).toBeNull();
    });

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
        overrideAppsScript(context, "installDailyCareDashboard", () => {
            calls.push(["daily"]);
        });

        expect(structuredClone(context.refreshGardenWorkbook())).toStrictEqual({
            baselineColumns: 36,
            dashboardColumns: 33,
            loggerVersion: LOGGER_VERSION,
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
        const plants = appSheetBulkPlants.map((id) => ({ id }));
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
            loggerVersion: LOGGER_VERSION,
            plantPages: 10,
        });
        expect(
            structuredClone(context.refreshGardenWorkbookPages11To20())
        ).toStrictEqual({
            firstPlant: "P11",
            lastPlant: "P20",
            loggerVersion: LOGGER_VERSION,
            plantPages: 10,
        });
        expect(
            structuredClone(context.refreshGardenWorkbookPages21To30())
        ).toStrictEqual({
            firstPlant: "P21",
            lastPlant: "P30",
            loggerVersion: LOGGER_VERSION,
            plantPages: 10,
        });

        expect(
            structuredClone(context.refreshGardenWorkbookPages31To32())
        ).toStrictEqual({
            firstPlant: "P31",
            lastPlant: "P32",
            loggerVersion: LOGGER_VERSION,
            plantPages: 2,
        });
        expect(() => context.refreshGardenWorkbookPages33To34()).toThrow(
            /retired/v
        );

        expect(
            structuredClone(context.refreshGardenWorkbookPages35To36())
        ).toStrictEqual({
            firstPlant: "P35",
            lastPlant: "P36",
            loggerVersion: LOGGER_VERSION,
            plantPages: 2,
        });

        expect(
            structuredClone(context.refreshGardenWorkbookPage37())
        ).toStrictEqual({
            firstPlant: "P37",
            lastPlant: "P37",
            loggerVersion: LOGGER_VERSION,
            plantPages: 1,
        });

        expect(
            structuredClone(context.refreshGardenWorkbookPage38())
        ).toStrictEqual({
            firstPlant: "P38",
            lastPlant: "P38",
            loggerVersion: LOGGER_VERSION,
            plantPages: 1,
        });

        expect(
            structuredClone(context.refreshGardenWorkbookPage39())
        ).toStrictEqual({
            firstPlant: "P39",
            lastPlant: "P39",
            loggerVersion: LOGGER_VERSION,
            plantPages: 1,
        });

        expect(
            structuredClone(context.refreshGardenWorkbookPage40())
        ).toStrictEqual({
            firstPlant: "P40",
            lastPlant: "P40",
            loggerVersion: LOGGER_VERSION,
            plantPages: 1,
        });

        expect(
            structuredClone(context.refreshGardenWorkbookPage41())
        ).toStrictEqual({
            firstPlant: "P41",
            lastPlant: "P41",
            loggerVersion: LOGGER_VERSION,
            plantPages: 1,
        });

        const pageCalls = calls.filter(([name]) => name === "plant");

        expect(pageCalls).toHaveLength(39);
        expect(structuredClone(pageCalls.map((call) => call[4]))).toStrictEqual(
            plants
        );
        expect(structuredClone(required(pageCalls[37]).slice(3))).toStrictEqual(
            [37, plants[37]]
        );

        expect(structuredClone(required(pageCalls[10]).slice(3))).toStrictEqual(
            [10, plants[10]]
        );

        expect(structuredClone(required(pageCalls[20]).slice(3))).toStrictEqual(
            [20, plants[20]]
        );

        expect(calls.filter(([name]) => name === "organize")).toHaveLength(10);
        expect(calls.filter(([name]) => name === "toast")).toHaveLength(10);
        expect(
            calls.some(([name]) => name === "baselines" || name === "dashboard")
        ).toBe(false);
        expect(structuredClone(flushes)).toStrictEqual([
            "flush",
            "flush",
            "flush",
            "flush",
            "flush",
            "flush",
            "flush",
            "flush",
            "flush",
            "flush",
        ]);
    });

    it("reads all active workbook plant records and rejects an incomplete tracker", () => {
        expect.hasAssertions();

        const plantIds = appSheetBulkPlants;
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
        ).toThrow(/P41/v);
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

        expect(row).toHaveLength(33);
        expect(row[0]).toBe('=HYPERLINK("#gid=12345","View")');
        expect(row[5]).toBe("=Baselines!D2");
        expect(row[6]).toBe("=Baselines!C2");
        expect(row[7]).toBe("=Baselines!W2");
        expect(row[8]).toBe(
            '=IF(AND(ISNUMBER(G7),G7>0,ISNUMBER(H7),H7>0),G7-H7,"")'
        );
        expect(row[9]).toBe("=Baselines!AF2");
        expect(row[31]).toBe(context.dashboardMinimumWeightFormula_(7));
        expect(row[32]).toBe(
            '=IF(AND(ISNUMBER(G7),G7>0,ISNUMBER(AF7),AF7>0),G7-AF7,"")'
        );

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
});

describe("garden logger workbook formatting", () => {
    it("removes the legacy A36:R36 footer merge before writing P30", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const mergedRanges = [
            { column: 1, columnCount: 18, row: 36, rowCount: 1 },
        ];
        const cells = new Map();
        const hiddenRows = new Set([
            4,
            5,
            40,
        ]);
        /** @type {Map<string, unknown>} */
        const appearance = new Map();
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
                    "setFontFamily",
                    "setFontSize",
                    "setFontWeight",
                    "setHorizontalAlignment",
                    "setNumberFormat",
                    "setNote",
                    "setNotes",
                    "setVerticalAlignment",
                    "setWrap",
                ]) {
                    Reflect.set(
                        range,
                        method,
                        (/** @type {unknown[]} */ ...args) => {
                            appearance.set(
                                `${row}:${column}:${method}`,
                                args[0]
                            );
                            return range;
                        }
                    );
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
            setRowHeight: (
                /** @type {number} */ row,
                /** @type {number} */ size
            ) => {
                appearance.set(`height:${row}`, size);
            },
            showRows: (
                /** @type {number} */ start,
                /** @type {number} */ count
            ) => {
                for (let row = start; row < start + count; row += 1)
                    hiddenRows.delete(row);
            },
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
                name === "Dashboard"
                    ? dashboard
                    : name === "Integrity"
                      ? { getSheetId: () => 99 }
                      : (pages.get(name) ?? null),
            getSheets: () => [dashboard, ...pages.values()],
        };

        context.refreshDashboardView_(spreadsheet, plants);

        expect(hiddenRows).toStrictEqual(new Set([40]));
        expect(Object.fromEntries(appearance)).toMatchObject({
            "4:1:setFontSize": 10,
            "4:1:setFontWeight": "normal",
            "4:1:setHorizontalAlignment": "left",
            "4:1:setVerticalAlignment": "middle",
            "4:1:setWrap": true,
            "height:4": 32,
            "height:5": 26,
        });
        expect(cells.get("5:4")).toBe(
            "Calculated as of ← · cached workbook time"
        );
        expect(cells.get("36:2")).toBe("P30");
        expect(cells.get("3:1")).toBe("=COUNTA('Plant tracker'!$A$2:$A$40)");

        for (const column of [
            15,
            17,
            19,
        ]) {
            expect(cells.get(`3:${column}`)).toContain(
                '&" / "&COUNTIFS(Baselines!$A$2:$A$40,"<>",Baselines!$A$2:$A$40,"<>P39",Baselines!$A$2:$A$40,"<>P40",Baselines!$A$2:$A$40,"<>P41")'
            );
            expect(cells.get(`3:${column}`)).not.toContain('"<>P38"');
        }

        expect(cells.get("3:21")).toContain("#gid=99&range=A4:H21");
        expect(cells.get("3:23")).toContain("#gid=99&range=A4:H21");
        expect(cells.get("36:3")).toContain("'Plant tracker'!B31");
        expect(cells.get("36:3")).toContain("'Plant tracker'!O31");
        expect(cells.get("36:19")).toBe("=Baselines!J31");
        expect(cells.get("6:5")).toBe("Days since water");
        expect(cells.get("6:25")).toBe("Weight measurements");
        expect(cells.get("36:25")).toBe(
            context.dashboardWeightCountFormula_(36)
        );
        expect(mergedRanges.some((range) => range.row >= 6)).toBe(false);
    });

    it("formats baseline, dashboard, and plant-page workbook views", () => {
        expect.hasAssertions();

        const headerWrites = new Map();
        /**
         * @type {{
         *     name: string;
         *     row: number;
         *     column: number;
         *     rows: number;
         *     columns: number;
         * }[]}
         */
        const rangeRequests = [];
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
        const existingRule = (/** @type {number[][]} */ coordinates) => ({
            getRanges: () =>
                coordinates.map(
                    ([
                        row = 1,
                        column = 1,
                        lastColumn = 12,
                    ]) => ({
                        getColumn: () => column,
                        getLastColumn: () => lastColumn,
                        getRow: () => row,
                    })
                ),
        });
        const headerRule = existingRule([
            [
                9,
                1,
                12,
            ],
        ]);
        const helperRule = existingRule([
            [
                141,
                14,
                22,
            ],
        ]);
        const mixedRule = existingRule([
            [
                141,
                1,
                12,
            ],
            [
                9,
                1,
                12,
            ],
        ]);
        const wideRule = existingRule([
            [
                141,
                1,
                14,
            ],
        ]);
        const retainedRules = [
            headerRule,
            helperRule,
            mixedRule,
            wideRule,
        ];
        const oldRules = [
            existingRule([
                [
                    13,
                    1,
                    11,
                ],
            ]),
            existingRule([
                [
                    141,
                    2,
                    2,
                ],
            ]),
            ...retainedRules,
        ];
        /** @type {Map<string, unknown[]>} */
        const conditionalWrites = new Map();
        const makeSheet = (
            /** @type {string} */ name,
            { hasFilter = false, id = 1 } = {}
        ) => {
            let maxRows = 20;
            const getRange = (
                /** @type {number} */ row,
                /** @type {number} */ column,
                /** @type {number} */ rows = 1,
                /** @type {number} */ columns = 1
            ) => {
                rangeRequests.push({ column, columns, name, row, rows });
                const range = {};
                for (const method of [
                    "breakApart",
                    "clearContent",
                    "clearFormat",
                    "merge",
                    "setBackground",
                    "setFontColor",
                    "setFontFamily",
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
                    Reflect.set(
                        range,
                        method,
                        (/** @type {unknown[]} */ ...args) => {
                            headerWrites.set(
                                `${name}:${row}:${column}:${method}`,
                                args[0]
                            );
                            return range;
                        }
                    );
                }
                return range;
            };
            return {
                autoResizeRows: () => {},
                getConditionalFormatRules: () =>
                    name.startsWith("P0") ? oldRules : [],
                getFilter: () =>
                    hasFilter
                        ? {
                              remove: () => {
                                  removedFilters.push(name);
                              },
                          }
                        : null,
                getMaxColumns: () => 5,
                getMaxRows: () => maxRows,
                getName: () => name,
                getRange,
                getSheetId: () => id,
                hideSheet: () => {},
                insertColumnsAfter: () => {},
                insertRowsAfter: (
                    /** @type {number} */ _afterPosition,
                    /** @type {number} */ howMany
                ) => {
                    maxRows += howMany;
                },
                setColumnWidth: () => {},
                setColumnWidths: () => {},
                setConditionalFormatRules: (/** @type {unknown[]} */ rules) => {
                    conditionalWrites.set(name, rules);
                },
                setFrozenColumns: () => {},
                setFrozenRows: () => {},
                setHiddenGridlines: () => {},
                setRowHeight: () => {},
                setRowHeights: () => {},
                showRows: () => {},
            };
        };
        const sheets = new Map([
            ["Baselines", makeSheet("Baselines")],
            ["Dashboard", makeSheet("Dashboard", { id: 99 })],
            ["Dry-down models", makeSheet("Dry-down models")],
            ["P01", makeSheet("P01", { hasFilter: true, id: 101 })],
            ["P02", makeSheet("P02", { id: 102 })],
            ["Workbook calculations", makeSheet("Workbook calculations")],
        ]);
        const history = createHistorySheet(
            Array.from({ length: 5101 }, (_, index) => ({
                values: ["", index < 5001 ? "P01" : "P02"],
            }))
        );
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) =>
                name === "History" ? history : (sheets.get(name) ?? null),
            getSheets: () => sheets.values().toArray(),
        };
        const context = loadAppsScript(history, {
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

        vi.spyOn(context, "ensureHistoryAnchors_").mockImplementation(() => {});
        context.refreshBaselineView_(spreadsheet, plants);
        context.refreshDashboardView_(spreadsheet, plants);
        context.refreshPlantPage_(spreadsheet, plants, 0, plants[0]);
        context.refreshPlantPage_(spreadsheet, plants, 1, plants[1]);

        // Page growth follows each plant's own records, not the whole ledger.
        expect(
            ["P01", "P02"].map((name) => ({
                maxRows: required(sheets.get(name)).getMaxRows(),
                retainedRules: required(conditionalWrites.get(name)).filter(
                    (rule) =>
                        oldRules.includes(
                            /** @type {ReturnType<typeof existingRule>} */ (
                                rule
                            )
                        )
                ),
            }))
        ).toStrictEqual([
            { maxRows: 5141, retainedRules },
            { maxRows: 5139, retainedRules },
        ]);
        expect(structuredClone(removedFilters)).toStrictEqual(["P01"]);
        expect(
            headerWrites.get("Workbook calculations:E2:undefined:setFormula")
        ).toBe("=NOW()");
        expect([
            headerWrites.get("Workbook calculations:2:2:setFormula"),
            headerWrites.get("Workbook calculations:2:2:setFormula"),
        ]).toStrictEqual([
            expect.stringContaining(
                "INDEX(records,0,2)<='Workbook calculations'!$E$2"
            ),
            expect.stringContaining("2,FALSE,3,FALSE,4,FALSE"),
        ]);
        expect(headerWrites.has("Workbook calculations:2:3:setFormula")).toBe(
            false
        );

        for (const [index, plant] of plants.entries()) {
            const baselineRow = index + 2;
            // At least 4,999 source records fit below the chart/status area,
            // including the old 97th-record collision and later observations.
            for (const observations of [
                96,
                97,
                150,
                plant.id === "P01" ? 5001 : 4999,
            ]) {
                expect(
                    rangeRequests.some(
                        (range) =>
                            range.name === plant.id &&
                            range.row === 141 &&
                            range.rows >= observations
                    )
                ).toBe(true);
            }

            expect(headerWrites.has(`${plant.id}:14:1:clearContent`)).toBe(
                false
            );

            expect([
                headerWrites.get(`${plant.id}:11:1:setFormula`),
                headerWrites.get(`${plant.id}:139:1:setFormula`),
                headerWrites.get(`${plant.id}:12:1:setFormula`),
            ]).toStrictEqual([
                expect.stringContaining("&range=A140"),
                expect.stringContaining("&range=A54"),
                expect.stringContaining("Jump to charts"),
            ]);
            expect(headerWrites.get(`${plant.id}:141:1:setFormula`)).toBe(
                context.plantPageHistoryFormula_(plant.id)
            );
            expect(headerWrites.has(`${plant.id}:13:1:setFormula`)).toBe(false);

            const historyHeadings = /** @type {unknown[][]} */ (
                headerWrites.get(`${plant.id}:140:1:setValues`)
            );

            expect(historyHeadings[0]).toHaveLength(12);
            expect(headerWrites.get(`${plant.id}:12:7:setFormula`)).toBe(
                "='Workbook calculations'!$E$2"
            );
            expect(headerWrites.get(`${plant.id}:6:4:setValue`)).toBe(
                "Days since water"
            );
            expect(headerWrites.get(`${plant.id}:6:5:setFormula`)).toBe(
                `=IF('Plant tracker'!E${plant.trackerRow}="","",'Plant tracker'!E${plant.trackerRow})`
            );
            expect(headerWrites.get(`${plant.id}:6:5:setNumberFormat`)).toBe(
                "0"
            );
            expect(headerWrites.get(`${plant.id}:7:5:setFormula`)).toBe(
                `=Baselines!AF${baselineRow}`
            );
            expect(headerWrites.get(`${plant.id}:7:5:setNumberFormat`)).toBe(
                "mmm d, yyyy"
            );
            expect(headerWrites.get(`${plant.id}:8:5:setFormula`)).toBe(
                `=Baselines!AG${baselineRow}`
            );
            expect(headerWrites.get(`${plant.id}:9:5:setFormula`)).toBe(
                `=Baselines!P${baselineRow}`
            );
            expect(headerWrites.get(`${plant.id}:10:5:setFormula`)).toBe(
                `=Baselines!R${baselineRow}`
            );
        }
    });

    it("preserves the owner tab order and visibility", () => {
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
        expect(events).not.toContain("Integrity:show");
        expect(events).not.toContain("Integrity:hide-sheet");
        expect(events.some((event) => event.startsWith("move:"))).toBe(false);
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

describe("scoped Dashboard weight count installer", () => {
    function dashboardFixture(columns = 26) {
        const rows = Array.from({ length: 44 }, (_, index) =>
            Array.from({ length: columns }, (_, column) =>
                column === 24 && index >= 5 && index <= 43
                    ? ""
                    : `owner ${index + 1}:${column + 1}`
            )
        );
        const formulas = Array.from({ length: 44 }, (_, index) =>
            Array.from({ length: columns }, (_, column) =>
                column === 24 && index >= 5 && index <= 43
                    ? ""
                    : `="formula ${index + 1}:${column + 1}"`
            )
        );
        const sheet = createDataSheet("Dashboard", rows, formulas);
        let capacity = columns;
        let isMerged = false;
        const originalRange = sheet.getRange;
        /** @type {number[][]} */
        const ranges = [];
        sheet.getRange = (row, column, rowCount = 1, columnCount = 1) => {
            ranges.push([
                row,
                column,
                rowCount,
                columnCount,
            ]);
            const range = originalRange(row, column, rowCount, columnCount);
            Reflect.set(range, "isPartOfMerge", () => isMerged);
            Reflect.set(range, "setWrap", () => range);
            return range;
        };
        sheet.getMaxColumns = () => capacity;
        /** @type {number[][]} */
        const insertions = [];
        sheet.insertColumnsAfter = (column, count) => {
            insertions.push([column, count]);
            capacity += count;
            return sheet;
        };
        const context = loadAppsScript(createHistorySheet([]), {
            spreadsheet: {
                getSheetByName: (/** @type {string} */ name) => {
                    expect(name).toBe("Dashboard");

                    return sheet;
                },
            },
        });
        return {
            context,
            insertions,
            markMerged: () => {
                isMerged = true;
            },
            originalRange,
            ranges,
            rows,
            sheet,
        };
    }

    it.each([24, 26])(
        "installs and reruns idempotently with %i existing columns while preserving everything outside Y6:Y45",
        (columns) => {
            expect.hasAssertions();

            const fixture = dashboardFixture(columns);
            const { context, insertions, originalRange, ranges, rows } =
                fixture;
            const before = structuredClone(rows);
            const beforeFormulas = originalRange(
                1,
                1,
                44,
                columns
            ).getFormulas();

            expect(
                structuredClone(context.installDashboardWeightCounts())
            ).toStrictEqual({
                plants: 39,
                range: "Dashboard!Y6:Y45",
                version: LOGGER_VERSION,
            });

            const after = structuredClone(rows);

            expect(context.installDashboardWeightCounts().range).toBe(
                "Dashboard!Y6:Y45"
            );
            expect(rows).toStrictEqual(after);
            expect(
                originalRange(1, 1, 44, columns).getFormulas()
            ).toStrictEqual(beforeFormulas);

            const untouched = before
                .flatMap((row, index) =>
                    row.map((value, column) => ({ column, index, value }))
                )
                .filter(
                    ({ column, index }) =>
                        column !== 24 || index < 5 || index > 43
                );
            for (const { column, index, value } of untouched) {
                expect(required(rows[index])[column]).toBe(value);
            }

            expect(required(rows[5])[24]).toBe("Weight measurements");

            for (let row = 7; row <= 44; row += 1) {
                expect(required(rows[row - 1])[24]).toBe(
                    context.dashboardWeightCountFormula_(row)
                );
            }

            expect(
                ranges.every(
                    ([
                        row,
                        column,
                        height,
                        width,
                    ]) =>
                        required(column) === 25 &&
                        required(row) >= 6 &&
                        required(row) + required(height) - 1 <= 45 &&
                        width === 1
                )
            ).toBe(true);
            expect(insertions).toStrictEqual(columns === 24 ? [[24, 1]] : []);
        }
    );

    it.each([
        [
            "header",
            6,
            "Owner notes",
            "",
        ],
        [
            "unlabelled value",
            8,
            "Preserve me",
            "",
        ],
        [
            "unlabelled formula",
            8,
            "",
            "=123",
        ],
    ])(
        "refuses %s conflicts before mutating the destination",
        (_kind, row, value, formula) => {
            expect.hasAssertions();

            const { context, insertions, originalRange, rows } =
                dashboardFixture();
            originalRange(row, 25).setValue(value).setFormula(formula);
            const before = structuredClone(rows);
            const formulas = originalRange(1, 1, 44, 26).getFormulas();

            expect(() => context.installDashboardWeightCounts()).toThrow(
                "Unexpected Dashboard column Y"
            );
            expect(rows).toStrictEqual(before);
            expect(originalRange(1, 1, 44, 26).getFormulas()).toStrictEqual(
                formulas
            );
            expect(insertions).toHaveLength(0);
        }
    );

    it("refuses merged destination cells before writing through a merge outside Y", () => {
        expect.hasAssertions();

        const { context, insertions, markMerged, rows } = dashboardFixture();
        const before = structuredClone(rows);
        markMerged();

        expect(() => context.installDashboardWeightCounts()).toThrow(
            "contains merged cells"
        );
        expect(rows).toStrictEqual(before);
        expect(insertions).toHaveLength(0);
    });

    it("refuses an undersized Dashboard without resizing rows or touching other sheets", () => {
        expect.hasAssertions();

        const { context, insertions, ranges, sheet } = dashboardFixture();
        sheet.getMaxRows = () => 35;

        expect(() => context.installDashboardWeightCounts()).toThrow(
            "existing plant rows through row 45"
        );
        expect(ranges).toHaveLength(0);
        expect(insertions).toHaveLength(0);
    });

    it("generates numeric measured-only counts at Y while preserving shifted N/O and W/X positions", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const row = context.dashboardViewRow_(
            {
                getSheetByName: () => ({ getSheetId: () => 1 }),
            },
            { id: "P01", trackerRow: 2 },
            0
        );

        expect(row).toHaveLength(33);
        expect(row[13]).toContain('"Water"');
        expect(row[14]).toContain('"Measure"');
        expect(row[22]).toBe("=Baselines!AI2");
        expect(row[23]).toBe("=Baselines!AJ2");
        expect(row[24]).toBe(context.dashboardWeightCountFormula_(7));

        const formula = context.dashboardWeightCountFormula_(7);

        expect(formula).toContain('EXACT(TRIM(History!$C$2:$C$50001),"Weigh")');
        expect(formula).toContain(
            'EXACT(TRIM(History!$AJ$2:$AJ$50001),"Removed")=FALSE'
        );
        expect(formula).toContain("ISNUMBER(History!$E$2:$E$50001)");
        expect(formula).toContain("History!$E$2:$E$50001>0");
        expect(formula).toContain(
            'History!$AC$2:$AC$50001&" "&History!$AI$2:$AI$50001,"(?i)estimat"'
        );
        expect(formula).not.toContain("History!$K");
    });
});

describe("per-plant activity summaries", () => {
    /**
     * @param {number | string | Date | null | boolean} day
     * @param {string} event
     * @param {import("../logger-fixtures.d.ts").CellValue} [grams]
     * @param {{
     *     id?: string;
     *     setup?: number;
     *     status?: string;
     *     quality?: string;
     *     method?: string;
     *     save?: string;
     *     application?: string;
     * }} [options]
     */
    function activityRow(day, event, grams = "", options = {}) {
        const values = emptyCells(45);
        values[0] =
            typeof day === "number"
                ? new Date(Date.UTC(2026, 8, 1) + day * 86_400_000)
                : day;
        values[1] = options.id ?? "P01";
        values[2] = event;
        values[4] = grams;
        values[10] = options.setup ?? 1;
        values[28] = options.quality ?? "Measured";
        values[29] = options.save ?? "";
        values[34] = options.method ?? "Scale";
        values[35] = options.status ?? "Active";
        values[40] = options.application ?? "";
        return values;
    }
    const emptySummary = {
        averageDryDownGramsPerDay: "",
        averageWaterIntervalDays: "",
        dryDownDays: "",
        dryDownReadingCount: 0,
        recentDryDownDays: "",
        recentDryDownGramsPerDay: "",
        totalMeasurements: 0,
        totalWaterings: 0,
        totalWeights: 0,
        waterIntervalCount: 0,
    };

    it("returns the exact empty API for plants without history", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));

        expect(
            structuredClone(context.plantActivitySummary_([], "P01", 1))
        ).toStrictEqual(emptySummary);
    });

    it("counts active event rows across setups without counting weight companions, estimates, or invalid numeric cells", () => {
        expect.hasAssertions();

        const rows = [
            activityRow(0, "Water", 600),
            activityRow(0, "Weigh", 600),
            activityRow(0, "Measure", 600),
            activityRow(2, "Measure", "", { quality: "Estimated" }),
            activityRow(2, "Weigh", 580, { setup: 2 }),
            activityRow(2, "Weigh", 580, { setup: 2 }),
            activityRow(2, "Weigh", 570, { quality: "Estimated visually" }),
            activityRow(2, "Weigh", 570, {
                method: "ESTIMATED from photo",
                quality: "Corrected",
            }),
            activityRow(2, " Weigh ", 570, {
                id: " P01 ",
                method: "",
                quality: "",
            }),
            ...[
                0,
                -1,
                NaN,
                Infinity,
                "bad",
                "500",
                true,
                null,
                "",
            ].map((grams) => activityRow(3, "Weigh", grams)),
            ...[
                "Water",
                "Measure",
                "Weigh",
            ].map((event) =>
                activityRow(3, event, 800, { status: " Removed " })
            ),
            activityRow(3, "Weigh", 800, { id: "P02" }),
            activityRow(3, "Check", 800),
        ];
        const context = loadAppsScript(createHistorySheet([]));

        expect(
            structuredClone(context.plantActivitySummary_(rows, "P01", 2))
        ).toStrictEqual({
            ...emptySummary,
            totalMeasurements: 2,
            totalWaterings: 1,
            totalWeights: 4,
        });
    });

    it("averages chronological valid Water timestamps across all history including zero-length duplicate intervals", () => {
        expect.hasAssertions();

        const rows = [
            activityRow(10, "Water", "", { setup: 2 }),
            activityRow(0, "Water"),
            activityRow(4, "Water"),
            activityRow(4, "Water"),
            activityRow("invalid", "Water"),
            activityRow(null, "Water"),
            activityRow(true, "Water"),
            activityRow(20, "Water", "", { status: "Removed" }),
        ];
        const context = loadAppsScript(createHistorySheet([]));

        expect(context.plantActivitySummary_(rows, "P01", 2)).toMatchObject({
            averageWaterIntervalDays: 10 / 3,
            totalWaterings: 7,
            waterIntervalCount: 3,
        });
    });

    it("describes observed drying slowdown using unequal real elapsed intervals and preserves model results", () => {
        expect.hasAssertions();

        const rows = [
            activityRow(0, "Water"),
            activityRow(0, "Weigh", 1000),
            activityRow(2, "Weigh", 800),
            activityRow(5.5, "Weigh", 730),
        ];
        const context = loadAppsScript(createHistorySheet([]));
        const before = context.dryDownModelsFromHistory_(
            rows,
            [["P01"]],
            "UTC"
        );

        expect(context.plantActivitySummary_(rows, "P01", 1)).toMatchObject({
            averageDryDownGramsPerDay: 270 / 5.5,
            dryDownDays: 5.5,
            dryDownReadingCount: 3,
            recentDryDownDays: 3.5,
            recentDryDownGramsPerDay: 20,
            totalWaterings: 1,
            totalWeights: 3,
        });
        expect(
            context.dryDownModelsFromHistory_(rows, [["P01"]], "UTC")
        ).toStrictEqual(before);
    });

    it("uses the current setup and latest watering regardless of history row order", () => {
        expect.hasAssertions();

        const rows = [
            activityRow(8, "Weigh", 450, { setup: 2 }),
            activityRow(0, "Water"),
            activityRow(0, "Weigh", 1200),
            activityRow(4, "Weigh", 1100),
            activityRow(6, "Weigh", 500, { save: "water2", setup: 2 }),
            activityRow(5, "Weigh", 300, { setup: 2 }),
            activityRow(6, "Water", "", {
                application: "Thorough",
                save: "water2",
                setup: 2,
            }),
            activityRow(7, "Weigh", 1000, { quality: "Estimated", setup: 2 }),
            activityRow(7, "Weigh", 1100, { setup: 2, status: "Removed" }),
        ];
        const context = loadAppsScript(createHistorySheet([]));

        expect(context.plantActivitySummary_(rows, "P01", 2)).toMatchObject({
            averageDryDownGramsPerDay: 25,
            dryDownDays: 2,
            dryDownReadingCount: 2,
            totalWeights: 5,
        });
        expect(
            context.plantActivitySummary_(rows, "P01", 3)
                .averageDryDownGramsPerDay
        ).toBe("");
    });

    it("collapses duplicate timestamps to their last weight, tolerates tiny noise, and ignores invalid reading gaps", () => {
        expect.hasAssertions();

        const rows = [
            activityRow(0, "Water"),
            activityRow(0, "Weigh", 1000),
            activityRow(2, "Weigh", 901),
            activityRow(2, "Weigh", 900),
            activityRow(3, "Weigh", 901),
            activityRow("invalid", "Weigh", 1500),
            activityRow(4, "Weigh", "bad"),
            activityRow(6, "Weigh", 850),
        ];
        const context = loadAppsScript(createHistorySheet([]));

        expect(context.plantActivitySummary_(rows, "P01", 1)).toMatchObject({
            averageDryDownGramsPerDay: 25,
            dryDownDays: 6,
            dryDownReadingCount: 4,
            recentDryDownDays: 3,
            recentDryDownGramsPerDay: 17,
            totalWeights: 6,
        });
    });

    it.each([
        [
            "gain then loss",
            [
                1000,
                800,
                850,
                700,
            ],
        ],
        [
            "cumulative small gains",
            [
                1000,
                800,
                802,
                804,
                700,
            ],
        ],
        ["only gain", [1000, 1100]],
        ["no observed loss", [1000, 1000]],
    ])("withholds positive loss rates for %s", (_label, grams) => {
        expect.hasAssertions();

        const rows = [
            activityRow(0, "Water"),
            ...grams.map((value, index) =>
                activityRow(index * 2, "Weigh", value)
            ),
        ];
        const context = loadAppsScript(createHistorySheet([]));

        expect(context.plantActivitySummary_(rows, "P01", 1)).toMatchObject({
            averageDryDownGramsPerDay: "",
            recentDryDownGramsPerDay: "",
        });
    });

    it("withholds rates when wet duplicates disagree even if the final duplicate would look usable", () => {
        expect.hasAssertions();

        const rows = [
            activityRow(0, "Water"),
            activityRow(0, "Weigh", 900),
            activityRow(0, "Weigh", 1000),
            activityRow(2, "Weigh", 800),
        ];
        const context = loadAppsScript(createHistorySheet([]));

        expect(context.plantActivitySummary_(rows, "P01", 1)).toMatchObject({
            averageDryDownGramsPerDay: "",
            dryDownReadingCount: 2,
        });
    });

    it.each([
        "Partial",
        "Spot",
        "Unknown",
    ])(
        "withholds whole-pot comparisons for watering application %s",
        (application) => {
            expect.hasAssertions();

            const rows = [
                activityRow(0, "Water", "", { application }),
                activityRow(0, "Weigh", 1000),
                activityRow(2, "Weigh", 800),
            ];
            const context = loadAppsScript(createHistorySheet([]));

            expect(context.plantActivitySummary_(rows, "P01", 1)).toMatchObject(
                { averageDryDownGramsPerDay: "", dryDownReadingCount: 0 }
            );
        }
    );

    it("withholds after a partial latest watering, an undated boundary, or a confusing repot", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const base = [
            activityRow(0, "Water"),
            activityRow(0, "Weigh", 1000),
            activityRow(2, "Weigh", 800),
        ];
        for (const boundary of [
            activityRow(3, "Water", "", {
                application: "Partial",
            }),
            activityRow("invalid", "Water"),
            activityRow("", "Repot"),
            activityRow(1, "Repot"),
        ]) {
            expect(
                context.plantActivitySummary_(
                    [
                        ...base,
                        boundary,
                        activityRow(4, "Weigh", 700),
                    ],
                    "P01",
                    1
                ).averageDryDownGramsPerDay
            ).toBe("");
        }
    });

    it("requires a watering boundary and a meaningful observed span", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        for (const rows of [
            [activityRow(0, "Weigh", 1000), activityRow(2, "Weigh", 800)],
            [activityRow(0, "Water"), activityRow(0, "Weigh", 1000)],
            [
                activityRow(0, "Water"),
                activityRow(0, "Weigh", 1000),
                activityRow(0.5, "Weigh", 800),
            ],
        ]) {
            expect(
                context.plantActivitySummary_(rows, "P01", 1)
                    .averageDryDownGramsPerDay
            ).toBe("");
        }
    });

    it("describes late-starting observations without borrowing the forecast's Wet-anchor window", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const rows = [
            activityRow(0, "Water"),
            activityRow(6, "Weigh", 1000),
            activityRow(8, "Weigh", 800),
        ];

        expect(context.plantActivitySummary_(rows, "P01", 1)).toMatchObject({
            averageDryDownGramsPerDay: 100,
            dryDownDays: 2,
            dryDownReadingCount: 2,
        });
    });

    it("reports a flat recent interval and withholds too-short or rising last intervals", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const base = [
            activityRow(0, "Water"),
            activityRow(0, "Weigh", 1000),
            activityRow(2, "Weigh", 800),
        ];

        expect(
            context.plantActivitySummary_(
                [...base, activityRow(4, "Weigh", 800)],
                "P01",
                1
            )
        ).toMatchObject({
            averageDryDownGramsPerDay: 50,
            recentDryDownDays: 2,
            recentDryDownGramsPerDay: 0,
        });

        for (const last of [
            activityRow(2.5, "Weigh", 790),
            activityRow(4, "Weigh", 801),
        ]) {
            expect(
                context.plantActivitySummary_([...base, last], "P01", 1)
                    .recentDryDownGramsPerDay
            ).toBe("");
        }
    });

    it("uses actual elapsed time across a daylight-saving clock change", () => {
        expect.hasAssertions();

        const rows = [
            activityRow("2026-11-01T00:00:00-04:00", "Water"),
            activityRow("2026-11-01T00:00:00-04:00", "Weigh", 1000),
            activityRow("2026-11-02T00:00:00-05:00", "Weigh", 975),
        ];
        const context = loadAppsScript(createHistorySheet([]));

        expect(
            context.plantActivitySummary_(rows, "P01", 1).dryDownDays
        ).toBeCloseTo(25 / 24, 8);
        expect(
            context.plantActivitySummary_(rows, "P01", 1)
                .averageDryDownGramsPerDay
        ).toBeCloseTo(24, 8);
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
            { length: 60 },
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
            { length: 60 },
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
            { length: 60 },
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
            { length: 60 },
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

        expect(bootstrap.version).toBe(LOGGER_VERSION);
        expect(bootstrap.plants).toHaveLength(1);
        expect(bootstrap.plants[0]).toMatchObject({
            activitySummary: {
                averageDryDownGramsPerDay: "",
                averageWaterIntervalDays: 2,
                dryDownDays: "",
                dryDownReadingCount: 0,
                recentDryDownDays: "",
                recentDryDownGramsPerDay: "",
                totalMeasurements: 0,
                totalWaterings: 2,
                totalWeights: 2,
                waterIntervalCount: 1,
            },
            currentPotSize: "4 in",
            dryOrLowestWeight: 405,
            dryOrLowestWeightBasis: "Completed cycle",
            dryOrLowestWeightDate: "2026-08-16T12:00:00.000Z",
            fieldGuideUrl: "https://example.test/p01",
            id: "P01",
            label: "A1",
            latestWeight: 405,
            latestWeightAt: "2026-08-16T12:00:00.000Z",
            potSetup: 2,
        });
        expect(Array.from(bootstrap.recent)).toHaveLength(5);
        expect(structuredClone(history.__rangeReads)).toStrictEqual([
            { column: 1, columnCount: 67, row: 2, rowCount: 5 },
        ]);
    });

    it("keeps active bootstrap order with archived ID gaps and maps current and nursery-label images exactly", () => {
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
            "#7",
            "#8",
            "#9",
            "#10",
            "#11",
            "#12",
            "#13",
            "#14",
            "#15",
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

        expect(observedFromEntries).toStrictEqual({
            P35: { currentImageUrl: "", nurseryLabelImageUrl: "" },
            P36: { currentImageUrl: "", nurseryLabelImageUrl: "" },
            P37: { currentImageUrl: "", nurseryLabelImageUrl: "" },
            P38: { currentImageUrl: "", nurseryLabelImageUrl: "" },
            P39: {
                currentImageUrl:
                    "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-10-21-p39-fittonia-detail.jpg",
                nurseryLabelImageUrl:
                    "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-10-21-p39-p40-leafjoy-labels.jpg",
            },
            P40: {
                currentImageUrl:
                    "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-10-21-p40-peperomia-overview.jpg",
                nurseryLabelImageUrl:
                    "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-10-21-p39-p40-leafjoy-labels.jpg",
            },
            P41: {
                currentImageUrl: "",
                nurseryLabelImageUrl:
                    "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-10-28-p41-alpine-spires-label.jpg",
            },
            ...expectedPlantImageUrls,
            P31: {
                currentImageUrl:
                    "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-09-20-p33-peperomia-obtipan-bicolor-acquisition.jpg",
                nurseryLabelImageUrl:
                    "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-09-20-p33-peperomia-obtipan-bicolor-acquisition.jpg",
            },
            P32: {
                currentImageUrl:
                    "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-09-20-p34-tradescantia-spathacea-tricolor-acquisition.jpg",
                nurseryLabelImageUrl:
                    "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-09-20-p34-tradescantia-spathacea-tricolor-acquisition.jpg",
            },
        });
        expect(plants.find(({ id }) => id === "P28")).toMatchObject({
            currentPotSize: "4 in",
        });
        expect(plants.at(-1)).toMatchObject({
            currentPotSize: "Not logged",
            id: "P41",
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
                "Inspect",
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
        expect(history.__rows[1]).toHaveLength(67);
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
            structuredClone(required(history.__rows[1]).slice(36, 42))
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

    it.each([
        "https://gyazo.com/0123456789abcdef0123456789abcdef",
        "https://photos.app.goo.gl/example",
        "https://photos.google.com/share/example?key=abc",
    ])("saves Inspect and Photo as two retry-safe rows for %s", (photoUrl) => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            condition: "New leaf pair visible",
            events: ["Inspect", "Photo"],
            notes: "Visual inspection only; firmness not checked.",
            observedAt: "2026-08-16T08:00:00-04:00",
            photoUrl,
            plantId: "P01",
            requestId: "garden-photo-check-12345",
        };

        expect(context.saveWebObservation(payload)).toMatchObject({
            duplicate: false,
            historyRows: 2,
            ok: true,
        });
        expect(context.saveWebObservation(payload)).toMatchObject({
            duplicate: true,
            historyRows: 2,
        });

        const check = required(
            workbook.history.__rows.find((row) => row[2] === "Inspect")
        );
        const photo = required(
            workbook.history.__rows.find((row) => row[2] === "Photo")
        );

        expect(check[2]).toBe("Inspect");
        expect(photo[2]).toBe("Photo");
        expect(check[7]).toBe(payload.condition);
        expect(check[23]).toBe("");
        expect(photo[23]).toBe(photoUrl);
        expect(photo[29]).toBe(check[29]);
        expect(workbook.history.__rows).toHaveLength(3);
    });

    it.each([
        // eslint-disable-next-line sdl/no-insecure-url, sonarjs/no-clear-text-protocols, unicorn/prefer-https -- Deliberate insecure-scheme rejection fixture.
        "http://gyazo.com/0123456789abcdef0123456789abcdef",
        "https://gyazo.com.evil.test/0123456789abcdef0123456789abcdef",
        "https://user@gyazo.com/0123456789abcdef0123456789abcdef",
        "https://gyazo.com:443/0123456789abcdef0123456789abcdef",
        "https://gyazo.com/0123456789ABCDEF0123456789ABCDEF",
        "https://gyazo.com/0123456789abcdef0123456789abcde",
        "https://gyazo.com/0123456789abcdef0123456789abcdef?redirect=evil",
        "https://gyazo.com/0123456789abcdef0123456789abcdef#fragment",
        "https://i.gyazo.com/0123456789abcdef0123456789abcdef.jpg",
        "https://gyazo.com/0123456789abcdef0123456789abcdef/extra",
        "https://photos.app.goo.gl.evil.test/share",
        "https://user@photos.app.goo.gl/share",
        "https://photos.app.goo.gl:443/share",
        "https://photos.app.goo.gl/share with spaces",
        "https://photos.app.goo.gl/<script>",
        // eslint-disable-next-line no-script-url -- Deliberate unsafe-scheme rejection fixture.
        "javascript:alert(1)",
    ])("rejects unsafe or malformed Photo URL %s", (photoUrl) => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());

        expect(() =>
            context.eventDetailsFromPayload_({ photoUrl }, ["Photo"], null)
        ).toThrow(/share link/iv);
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
            historyRows: 9,
            ok: true,
            plantId: "P01",
        });
        expect(result.events).toContain("Repot");
        expect(retry).toMatchObject({ duplicate: true, historyRows: 9 });
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
            rowCount: 50_000,
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
                "Inspect",
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
                call.row >= 2 && call.column === 1 && call.columnCount === 67
        );

        expect(structuredClone(historyWrites)).toStrictEqual([
            { column: 1, columnCount: 67, row: 2, rowCount: 30 },
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

    it("returns per-item validation receipts for falsy RPC entries without writing History", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const before = structuredClone(workbook.history.__rows);
        const result = vm.runInContext(
            "saveWebObservationBatch([null, false, 0])",
            context
        );

        expect(result).toMatchObject({
            results: [
                {
                    errorCode: "VALIDATION",
                    ok: false,
                    plantId: "",
                    requestId: "",
                    retryable: false,
                },
                {
                    errorCode: "VALIDATION",
                    ok: false,
                    plantId: "false",
                    requestId: "false",
                    retryable: false,
                },
                {
                    errorCode: "VALIDATION",
                    ok: false,
                    plantId: "0",
                    requestId: "0",
                    retryable: false,
                },
            ],
            savedCount: 0,
        });
        expect(workbook.history.__rows).toStrictEqual(before);
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
            { length: 60 },
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
        ).toStrictEqual([{ column: 1, columnCount: 67, row: 2, rowCount: 4 }]);
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
        ).toStrictEqual([{ column: 1, columnCount: 67, row: 2, rowCount: 30 }]);
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

/** @param {string} requestId @param {string} [plantId] */
function capacityNote(requestId, plantId = "P01") {
    return {
        events: ["Note"],
        notes: "Capacity boundary",
        observedAt: "2026-08-16T12:00:00Z",
        plantId,
        requestId,
    };
}

/**
 * @param {ReturnType<typeof createLoggerWorkbook>} workbook @param {number}
 *   lastRow
 */
function seedHistoryCapacity(workbook, lastRow) {
    // Range reads pad absent cells to "", just like Sheets. Keep each unused
    // row distinct without allocating millions of blank cells that snapshots
    // would then clone and compare; real writes still land at the 50k boundary.
    while (workbook.history.__rows.length < lastRow)
        workbook.history.__rows.push([]);
    const marker = required(workbook.history.__rows[lastRow - 1]);
    marker[0] = new Date("2026-08-15T12:00:00Z");
    marker[1] = "P01";
    marker[2] = "Note";
    marker[15] = "garden-existing-capacity-marker";
    workbook.history.getMaxRows = () => 60_000;
}

describe("garden logger supported History capacity", () => {
    it("reads independent rectangular cells from compact capacity rows", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        seedHistoryCapacity(workbook, 50_000);
        const range = workbook.history.getRange(49_998, 15, 3, 3);
        const values = range.getValues();

        expect(values).toStrictEqual([
            [
                "",
                "",
                "",
            ],
            [
                "",
                "",
                "",
            ],
            [
                "",
                "garden-existing-capacity-marker",
                "",
            ],
        ]);

        required(values[0])[0] = "Changed local read";
        required(values[2])[1] = "Changed local marker";

        expect(range.getValues()).toStrictEqual([
            [
                "",
                "",
                "",
            ],
            [
                "",
                "",
                "",
            ],
            [
                "",
                "garden-existing-capacity-marker",
                "",
            ],
        ]);
        expect(workbook.history.getLastRow()).toBe(50_000);
    });

    it.each([
        50_000,
        50_001,
        50_002,
    ])(
        "preflights the whole batch at last reserved sheet row %s",
        (lastRow) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook(["P01", "P02"]);
            seedHistoryCapacity(workbook, lastRow);
            const before = structuredClone(workbook.history.__rows);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            const result = context.saveWebObservationBatch([
                capacityNote("garden-capacity-first-12345"),
                capacityNote("garden-capacity-second-12345", "P02"),
            ]);

            expect(result).toMatchObject({
                failedCount: 2,
                ok: false,
                savedCount: 0,
            });
            expect(
                result.results.every(
                    (item) => !item.ok && item.errorCode === "HISTORY_CAPACITY"
                )
            ).toBe(true);
            expect(workbook.history.__rows).toStrictEqual(before);
            expect(workbook.history.__setValuesCalls).toStrictEqual([]);
            expect(workbook.history.__clearDataValidationCalls).toStrictEqual(
                []
            );
        }
    );

    it("fills the final two supported slots in one batch", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        seedHistoryCapacity(workbook, 49_999);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const result = context.saveWebObservationBatch([
            capacityNote("garden-capacity-first-12345"),
            capacityNote("garden-capacity-second-12345", "P02"),
        ]);

        expect(result).toMatchObject({ ok: true, savedCount: 2 });
        expect(workbook.history.__setValuesCalls).toContainEqual({
            column: 1,
            columnCount: 67,
            row: 50_000,
            rowCount: 2,
        });
        expect(workbook.history.__rows).toHaveLength(50_001);
    });

    it("rejects a multi-event single save before grid/header/validation changes, but allows the final slot", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        seedHistoryCapacity(workbook, 50_000);
        let insertedRows = 0;
        workbook.history.getMaxRows = () => 50_000;
        workbook.history.insertRowsAfter = (_row, count) => {
            insertedRows += count;
        };
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const multi = {
            events: ["Water", "Weigh"],
            nutrientsUsed: "No",
            observedAt: "2026-08-16T12:00:00Z",
            plantId: "P01",
            requestId: "garden-capacity-single-multi-12345",
            weight: 450,
        };

        expect(() => context.saveWebObservation(multi)).toThrow(
            /HISTORY_CAPACITY/v
        );
        expect(insertedRows).toBe(0);
        expect(workbook.history.__setValuesCalls).toStrictEqual([]);
        expect(workbook.history.__clearDataValidationCalls).toStrictEqual([]);

        workbook.history.getMaxRows = () => 60_000;
        const last = capacityNote("garden-capacity-final-slot-12345");
        const saved = context.saveWebObservation(last);
        const writes = workbook.history.__setValuesCalls.length;
        const retried = context.saveWebObservation(last);

        expect(saved).toMatchObject({
            duplicate: false,
            historyRows: 1,
            ok: true,
        });
        expect(retried).toMatchObject({
            duplicate: true,
            historyRows: 1,
            ok: true,
        });
        expect(workbook.history.__rows).toHaveLength(50_001);
        expect(workbook.history.__setValuesCalls).toHaveLength(writes);
        expect(() =>
            context.saveWebObservation(
                capacityNote("garden-capacity-one-too-many-12345")
            )
        ).toThrow(/HISTORY_CAPACITY/v);
    });

    it("preserves a completed multi-event retry at capacity while refusing unsaved batch items", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        seedHistoryCapacity(workbook, 49_999);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            events: ["Water", "Weigh"],
            nutrientsUsed: "No",
            observedAt: "2026-08-16T12:00:00Z",
            plantId: "P01",
            requestId: "garden-capacity-complete-12345",
            weight: 450,
        };
        context.saveWebObservationBatch([payload]);
        const before = structuredClone(workbook.history.__rows);
        const writes = workbook.history.__setValuesCalls.length;
        const retry = context.saveWebObservationBatch([
            payload,
            capacityNote("garden-capacity-unsaved-12345"),
        ]);

        expect(retry).toMatchObject({ failedCount: 1, savedCount: 1 });
        expect(retry.results[0]).toMatchObject({
            duplicate: true,
            historyRows: 2,
            ok: true,
        });
        expect(retry.results[1]).toMatchObject({
            errorCode: "HISTORY_CAPACITY",
            ok: false,
        });
        expect(workbook.history.__rows).toStrictEqual(before);
        expect(workbook.history.__setValuesCalls).toHaveLength(writes);
    });

    it("does not write a fitting first item or update Repot baselines when a later item exceeds capacity", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        seedHistoryCapacity(workbook, 50_000);
        const baselines = required(workbook.sheets.get("Baselines"));
        const before = structuredClone(baselines.__rows);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const result = context.saveWebObservationBatch([
            {
                events: ["Repot"],
                observedAt: "2026-08-16T12:00:00Z",
                plantId: "P01",
                potSize: "5 in",
                requestId: "garden-capacity-repot-12345",
            },
            capacityNote("garden-capacity-later-12345"),
        ]);

        expect(result).toMatchObject({ failedCount: 2, savedCount: 0 });
        expect(workbook.history.__setValuesCalls).toStrictEqual([]);
        expect(baselines.__rows).toStrictEqual(before);
    });

    it("counts incomplete reservations and Removed records toward supported capacity", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        seedHistoryCapacity(workbook, 50_000);
        required(workbook.history.__rows[49_999])[35] = "Removed";
        const reservation = emptyCells(60);
        reservation[15] = "garden-capacity-reservation-12345";
        workbook.history.__rows.push(reservation);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const bootstrap = context.getWebAppBootstrap();

        expect(structuredClone(bootstrap.historyCapacity)).toStrictEqual({
            remainingRows: 0,
            supportedLastRow: 50_001,
            supportedObservationRows: 50_000,
            usedRows: 50_000,
        });
        expect(() =>
            context.saveWebObservation(
                capacityNote("garden-capacity-reserved-block-12345")
            )
        ).toThrow(/HISTORY_CAPACITY/v);
        expect(
            context.saveWebObservation(
                capacityNote("garden-capacity-reservation-12345")
            )
        ).toMatchObject({ duplicate: false, ok: true });
        expect(workbook.history.__rows).toHaveLength(50_001);
    });

    it("rejects mobile bulk rounds without partially saving their plants", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        seedHistoryCapacity(workbook, 50_000);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(() =>
            context.saveBulkWaterObservation({
                nutrientsUsed: "No",
                observedAt: "2026-08-16T12:00:00Z",
                plantIds: ["P01", "P02"],
                requestId: "garden-capacity-bulk-12345",
            })
        ).toThrow(/HISTORY_CAPACITY/v);
        expect(workbook.history.__setValuesCalls).toStrictEqual([]);
        expect(workbook.history.__rows).toHaveLength(50_000);
    });

    it("keeps an oversized AppSheet entry staged without writing any event rows", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        seedHistoryCapacity(workbook, 50_000);
        const entry = emptyCells(appSheetEntryHeaders.length);
        entry[0] = "CAPACITY123";
        entry[1] = new Date("2026-08-16T12:00:00Z");
        entry[2] = "P01";
        entry[3] = "Water, Weigh";
        entry[5] = 450;
        entry[12] = "No";
        entry[26] = "Queued";
        required(workbook.sheets.get("App entries")).__rows.push(entry);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const result = context.processAppSheetEntry("CAPACITY123");

        expect(result).toMatchObject({
            errorCode: "HISTORY_CAPACITY",
            ok: false,
        });
        expect(entry[26]).toBe("Needs correction");
        expect(entry[27]).toMatch(/HISTORY_CAPACITY/v);
        expect(entry[3]).toBe("Water, Weigh");
        expect(entry[5]).toBe(450);
        expect(workbook.history.__setValuesCalls).toStrictEqual([]);
    });

    it("preflights all AppSheet bulk plants before saving any History rows", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        seedHistoryCapacity(workbook, 50_000);
        const round = emptyCells(appSheetBulkHeaders.length);
        round[0] = "CAPACITY-BULK123";
        round[1] = new Date("2026-08-16T12:00:00Z");
        round[2] = new Date("2026-08-16T12:00:00Z");
        round[appSheetBulkActionIndex] = "Water";
        round[appSheetBulkSelectedPlantsIndex] = "P01, P02";
        round[appSheetBulkHeaders.indexOf("Nutrients used")] = "No";
        round[appSheetBulkStatusIndex] = "Queued";
        required(workbook.sheets.get("App bulk")).__rows.push(round);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const result = context.processQueuedAppSheetEntries();

        expect(result.bulk).toMatchObject({
            needsCorrectionCount: 1,
            savedRequestCount: 0,
        });
        expect(round[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(workbook.history.__setValuesCalls).toStrictEqual([]);
    });
});

describe("plant history spill allocation", () => {
    it("keeps small saves free of projection reads and grows only concentrated plant pages including Removed and reservations", () => {
        expect.hasAssertions();

        const history = createHistorySheet([]);
        const context = loadAppsScript(history);
        const small = {
            getLastRow: () => 12,
            getRange: () => {
                throw new Error("Unexpected read");
            },
        };
        context.ensurePlantHistoryWriteCapacity_({}, small, [
            { storedRows: [["", "P01"]], targetRow: 13 },
        ]);
        const ids = Array.from({ length: 4999 }, () => ["P01"]);
        ids.push(["P02"]);
        const source = {
            getLastRow: () => ids.length + 1,
            getRange: () => ({ getValues: () => ids }),
        };
        const page = createDataSheet("P01", [[""]]);
        page.insertRowsAfter(100, 5039);
        /** @type {string[]} */
        const requested = [];
        const spreadsheet = {
            getSheetByName: (/** @type {string} */ name) => {
                requested.push(name);
                return name === "P01" ? page : null;
            },
        };
        context.ensurePlantHistoryWriteCapacity_(spreadsheet, source, [
            {
                storedRows: [
                    ["", "P01"],
                    ["", "P01"],
                ],
                targetRow: 5002,
            },
            // Completing an existing reservation does not consume a second slot.
            { storedRows: [["", "P01"]], targetRow: 2 },
        ]);

        expect(page.getMaxRows()).toBe(5141);
        expect(requested).toStrictEqual(["P01"]);
        expect(context.historyPlantIds_(history)).toHaveLength(0);

        const concentrated = {
            getLastRow: () => 50_000,
            getRange: () => ({
                getValues: () => Array.from({ length: 49_999 }, () => ["P01"]),
            }),
        };
        context.ensurePlantHistoryWriteCapacity_(spreadsheet, concentrated, [
            { storedRows: [["", "P01"]], targetRow: 50_001 },
        ]);

        expect(page.getMaxRows()).toBe(50_140);
    });

    it("rejects a missing plant page before reserving spill space", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet([]));
        const history = {
            getLastRow: () => 5001,
            getRange: () => ({
                getValues: () => Array.from({ length: 5000 }, () => ["P01"]),
            }),
        };
        const spreadsheet = { getSheetByName: () => null, getSheets: () => [] };

        expect(() => {
            context.ensurePlantHistoryWriteCapacity_(spreadsheet, history, [
                { storedRows: [["", "P01"]], targetRow: 5002 },
            ]);
        }).toThrow("Workbook page for P01 is missing");
    });

    it.each([false, true])(
        "allocates a growing plant page before a %s batch save, and preserves canonical rows on allocation failure",
        (batch) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook();
            seedHistoryCapacity(workbook, 5000);
            for (let index = 1; index < 5000; index += 1) {
                const row = required(workbook.history.__rows[index]);
                row[1] = "P01";
                row[35] = "Removed";
            }
            const page = createDataSheet("P01", [[""]]);
            page.insertRowsAfter(100, 5039);
            workbook.sheets.set("P01", page);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            const insert = page.insertRowsAfter;
            page.insertRowsAfter = () => {
                throw new Error("Projection allocation failed");
            };
            const payload = capacityNote("garden-concentrated-12345");
            const save = () =>
                batch
                    ? context.saveWebObservationBatch([payload])
                    : context.saveWebObservation(payload);

            expect(save).toThrow("Projection allocation failed");
            expect(workbook.history.__rows).toHaveLength(5000);
            expect(workbook.history.__setValuesCalls).toStrictEqual([]);

            page.insertRowsAfter = (row, count) => {
                expect(workbook.history.__setValuesCalls).toStrictEqual([]);

                return insert(row, count);
            };

            expect(save()).toMatchObject({ ok: true });
            expect(page.getMaxRows()).toBe(5140);
            expect(workbook.history.__rows).toHaveLength(5001);

            page.insertRowsAfter = () => {
                throw new Error("Completed retry must not grow");
            };

            expect(save()).toMatchObject({ ok: true });
            expect(workbook.history.__rows).toHaveLength(5001);
        }
    );
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

    it.each([
        { description: "numeric zero", formula: "", value: 0 },
        {
            description: "a formula displaying blank",
            formula: '=""',
            value: "",
        },
    ])(
        "refuses to replace $description in the App entries humidity destination",
        ({ formula, value }) => {
            expect.hasAssertions();

            const stagedRow = emptyCells(35);
            stagedRow[0] = "PRESERVE-HUMIDITY-ENTRY";
            stagedRow[2] = "P01";
            stagedRow[26] = "Queued";
            stagedRow[34] = value;
            const formulas = emptyCells(35);
            formulas[34] = formula;
            const entries = createDataSheet(
                "App entries",
                [[...appSheetEntryHeaders.slice(0, 34), ""], stagedRow],
                [[], formulas]
            );
            const beforeValues = structuredClone(entries.__rows);
            const beforeFormulas = entries.getRange(1, 1, 2, 35).getFormulas();
            const context = loadAppsScript(createHistorySheet());

            expect(() =>
                context.ensureAppSheetEntryColumns_(entries, true)
            ).toThrow(
                "App entries!AI contains existing data; review before adding humidity."
            );
            expect(entries.__rows).toStrictEqual(beforeValues);
            expect(entries.getRange(1, 1, 2, 35).getFormulas()).toStrictEqual(
                beforeFormulas
            );
            expect(entries.__dataValidationCalls).toStrictEqual([]);
        }
    );

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
                ...appSheetEntryHeaders.slice(0, 32),
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
    it("rejects a care round with no selected plants while preserving staging input", () => {
        expect.hasAssertions();

        const round = emptyCells(appSheetBulkHeaders.length);
        round[appSheetBulkActionIndex] = "Clean";
        round[appSheetBulkNotesIndex] = "Clean leaves";
        const before = [...round];
        const context = loadAppsScript(createHistorySheet());

        expect(() =>
            context.appSheetBulkPayloadsFromRow_(round, "NO-PLANTS")
        ).toThrow("Select at least one plant for this round");
        expect(round).toStrictEqual(before);
    });

    it("submits a 39-plant AppSheet weight round in one canonical batch", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(appSheetBulkPlants);
        const round = emptyCells(appSheetBulkHeaders.length);
        round[0] = "id528-BULK2801";
        round[1] = new Date("2026-08-25T08:00:00-04:00");
        round[2] = new Date("2026-08-25T08:05:00-04:00");
        round[appSheetBulkActionIndex] = "Weigh";
        round[appSheetBulkWeightStateIndex] = "Routine";
        for (const index of appSheetBulkPlants.keys()) {
            round[
                appSheetBulkHeaders.indexOf(
                    `${required(appSheetBulkPlants[index])} weight (g)`
                )
            ] = 300 + index;
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
        expect(batches[0]).toHaveLength(39);
        expect(
            structuredClone(required(batches[0]).map(({ plantId }) => plantId))
        ).toStrictEqual(appSheetBulkPlants);
        expect(
            structuredClone(
                required(batches[0]).map(({ requestId }) => requestId)
            )
        ).toStrictEqual(
            appSheetBulkPlants.map(
                (plantId) => `appsheet-bulk-id528-BULK2801-${plantId}`
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
            "39 plant updates saved."
        );
        expect(round[appSheetBulkStatusIndex + 2]).toBe(39);
        expect(round[appSheetBulkStatusIndex + 3]).toBe(39);
        expect(round[appSheetBulkStatusIndex + 4]).toBeInstanceOf(Date);
        expect(result).toMatchObject({
            bulk: {
                deferredCount: 0,
                installed: true,
                needsCorrectionCount: 0,
                processedCount: 1,
                queuedCount: 1,
                requestedCount: 39,
                retryCount: 0,
                savedRequestCount: 39,
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
        expect(() =>
            context.normalizeAppSheetBulkAction_("Temperature")
        ).toThrow(/must be one of: water, weigh, water \+ weigh, rotation/iv);
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

describe("garden logger structured Check details", () => {
    it("replays a completed legacy condition-only Check and rejects changed retry content", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            condition: "Leaves firm",
            events: ["Check"],
            observedAt: "2026-10-06T12:00:00-04:00",
            plantId: "P01",
            requestId: "garden-check-legacy-condition",
        };
        // Seed a pre-separation Check without going through the new-entry rule.
        context.saveWebObservation({
            ...payload,
            condition: "",
            soilMoisture: "Dry",
        });
        const legacy = required(workbook.history.__rows[1]);
        legacy[7] = payload.condition;
        legacy[32] = "";
        const before = structuredClone(workbook.history.__rows);

        expect(context.saveWebObservation(payload)).toMatchObject({
            duplicate: true,
            historyRows: 1,
        });
        expect(
            context.saveWebObservationBatch([payload]).results[0]
        ).toMatchObject({ duplicate: true });
        expect(() =>
            context.saveWebObservation({ ...payload, condition: "Changed" })
        ).toThrow(/no longer matches/iv);
        expect(workbook.history.__rows).toStrictEqual(before);
    });

    it.each(["AppSheet", "AppSheet bulk"])(
        "ignores stale hidden care fields for new %s entries",
        (entrySource) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook();
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            const payload = {
                condition: "Stale hidden condition",
                entrySource,
                observedAt: "2026-10-10T12:00:00-04:00",
                plantId: "P01",
                requestId: `garden-hidden-fields-${entrySource.replaceAll(" ", "-")}`,
                soilMoisture: "Dry",
            };

            expect(
                context.saveWebObservation({ ...payload, events: ["Check"] })
            ).toMatchObject({ historyRows: 1 });
            expect(required(workbook.history.__rows[1])[7]).toBe("");
            expect(required(workbook.history.__rows[1])[32]).toBe("Dry");
            expect(
                context.saveWebObservation({
                    ...payload,
                    events: ["Inspect"],
                    requestId: `${payload.requestId}-inspect`,
                })
            ).toMatchObject({ historyRows: 1 });
            expect(required(workbook.history.__rows[2])[7]).toBe(
                payload.condition
            );
            expect(required(workbook.history.__rows[2])[32]).toBe("");

            // A completed older Check retains its condition even after selection rules change.
            const legacy = required(workbook.history.__rows[1]);
            legacy[7] = payload.condition;

            expect(
                context.saveWebObservation({ ...payload, events: ["Check"] })
            ).toMatchObject({ duplicate: true });
        }
    );

    it("replays a legacy weight and condition Check without moving condition onto the weight", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            condition: "Leaves firm",
            events: ["Weigh", "Check"],
            observedAt: "2026-10-06T12:00:00-04:00",
            plantId: "P01",
            requestId: "garden-legacy-weight-condition",
            weight: 450,
        };
        context.saveWebObservation({
            ...payload,
            condition: "",
            soilMoisture: "Dry",
        });
        // Recreate an older combined save: condition belongs only to its Check.
        const legacyCheck = required(
            workbook.history.__rows.find((row) => row[2] === "Check")
        );
        legacyCheck[7] = payload.condition;
        legacyCheck[32] = "";
        const before = structuredClone(workbook.history.__rows);

        expect(context.saveWebObservation(payload)).toMatchObject({
            duplicate: true,
            historyRows: 2,
        });
        expect(
            context.saveWebObservationBatch([payload]).results[0]
        ).toMatchObject({ duplicate: true, historyRows: 2 });
        expect(() =>
            context.saveWebObservation({ ...payload, weight: 451 })
        ).toThrow(/no longer matches/iv);
        expect(workbook.history.__rows).toStrictEqual(before);
        expect(
            workbook.history.__rows.slice(1).map((row) => [
                row[2],
                row[4],
                row[7],
            ])
        ).toStrictEqual([
            [
                "Weigh",
                450,
                "",
            ],
            [
                "Check",
                "",
                "Leaves firm",
            ],
        ]);
    });

    it("preserves Inspect when replaying an older AppSheet request with an inferred soil Check", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const requestId = "garden-old-inspect-inferred-soil";
        const observedAt = "2026-10-09T12:00:00-04:00";
        context.appendObservation_(workbook.spreadsheet, {
            condition: "Firm",
            currentLabel: "A1",
            entrySource: "AppSheet",
            eventNames: ["Inspect", "Check"],
            height: "",
            notes: "",
            observationDate: new Date(observedAt),
            plantId: "P01",
            potSetup: 1,
            requestId,
            soilMoisture: "Dry",
            weight: "",
            weightState: "",
            width: "",
        });
        const before = structuredClone(workbook.history.__rows);

        expect(
            context.saveWebObservation({
                condition: "Firm",
                entrySource: "AppSheet",
                events: ["Inspect"],
                observedAt,
                plantId: "P01",
                requestId,
                soilMoisture: "Dry",
            })
        ).toMatchObject({ duplicate: true, historyRows: 2 });
        expect(workbook.history.__rows).toStrictEqual(before);
    });

    it("isolates Inspect, Check, Humidity and Light measurements in a shared request", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            condition: "Leaves firm",
            events: [
                "Inspect",
                "Check",
                "Humidity",
                "Light",
            ],
            lux: 1250,
            observedAt: "2026-10-10T12:00:00-04:00",
            plantId: "P01",
            ppfd: 0,
            relativeHumidity: 0,
            requestId: "garden-separated-environment-care",
            soilMoisture: "Dry",
        };

        expect(context.saveWebObservation(payload)).toMatchObject({
            historyRows: 4,
        });
        expect(context.saveWebObservation(payload)).toMatchObject({
            duplicate: true,
            historyRows: 4,
        });

        const rows = workbook.history.__rows.slice(1);

        expect(rows.map((row) => row[15])).toStrictEqual(
            Array.from({ length: 4 }, () => payload.requestId)
        );
        expect(
            rows.map((row) => [
                row[2],
                row[7],
                row[32],
                row[42],
                row[43],
                row[44],
            ])
        ).toStrictEqual(
            expect.arrayContaining([
                [
                    "Inspect",
                    "Leaves firm",
                    "",
                    "",
                    "",
                    "",
                ],
                [
                    "Check",
                    "",
                    "Dry",
                    "",
                    "",
                    "",
                ],
                [
                    "Humidity",
                    "",
                    "",
                    0,
                    "",
                    "",
                ],
                [
                    "Light",
                    "",
                    "",
                    "",
                    0,
                    1250,
                ],
            ])
        );
    });

    it("replays a completed historical Check without applying the new detail requirement", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            events: ["Check"],
            observedAt: "2026-10-06T12:00:00-04:00",
            plantId: "P01",
            requestId: "garden-check-historical-fixture",
        };
        context.saveWebObservation({ ...payload, soilMoisture: "Dry" });
        // Simulate a completed pre-5.30.2 Check with no structured details.
        required(workbook.history.__rows[1])[32] = "";
        const before = structuredClone(workbook.history.__rows);

        expect(context.saveWebObservation(payload)).toMatchObject({
            duplicate: true,
            ok: true,
        });
        expect(
            context.saveWebObservationBatch([payload]).results[0]
        ).toMatchObject({ duplicate: true, ok: true });
        expect(workbook.history.__rows).toStrictEqual(before);
    });

    it("rejects a notes-only Check without writing, but accepts structured moisture", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            events: ["Check"],
            notes: "Notes alone are not structured inspection evidence.",
            observedAt: "2026-10-06T12:00:00-04:00",
            plantId: "P01",
            requestId: "garden-check-structured-fixture",
        };

        expect(() => context.saveWebObservation(payload)).toThrow(
            "Enter soil moisture for the Soil check event"
        );
        expect(workbook.history.__rows).toHaveLength(1);
        expect(
            context.saveWebObservation({ ...payload, soilMoisture: "Dry" })
        ).toMatchObject({ historyRows: 1, ok: true });
        expect(required(workbook.history.__rows[1])[32]).toBe("Dry");
    });

    it("returns a nonretryable validation error for an empty Check while preserving valid batch writes", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const result = context.saveWebObservationBatch([
            {
                events: ["Check"],
                observedAt: "2026-10-06T12:00:00-04:00",
                plantId: "P01",
                requestId: "garden-check-invalid-fixture",
            },
            {
                condition: "Leaves firm",
                events: ["Inspect"],
                observedAt: "2026-10-06T12:00:00-04:00",
                plantId: "P01",
                requestId: "garden-check-valid-fixture",
            },
        ]);

        expect(result.results[0]).toMatchObject({
            errorCode: "VALIDATION",
            ok: false,
            retryable: false,
        });
        expect(result.results[1]).toMatchObject({ ok: true });
        expect(workbook.history.__rows).toHaveLength(2);
        expect(required(workbook.history.__rows[1])[7]).toBe("Leaves firm");
    });
});

describe("garden logger inspection and light evidence", () => {
    it.each([
        { lux: "", method: "Light app", ppfd: 0, quality: "Estimated" },
        { lux: 0, method: "Lux meter", ppfd: "", quality: "Measured" },
        {
            lux: 8120.25,
            method: "Light app",
            ppfd: 125.5,
            quality: "Estimated",
        },
    ])(
        "saves independent light fields and retries $ppfd / $lux",
        ({ lux, method, ppfd, quality }) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook();
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            const payload = {
                events: ["Light", "Weigh"],
                lux,
                observedAt: "2026-10-09T12:00:00-04:00",
                plantId: "P01",
                ppfd,
                requestId: "garden-light-evidence",
                weight: 300,
            };

            expect(context.saveWebObservation(payload)).toMatchObject({
                duplicate: false,
                historyRows: 2,
            });
            expect(
                workbook.history.__rows.slice(1).map((row) => [
                    row[2],
                    row[43],
                    row[44],
                    row[28],
                    row[34],
                ])
            ).toStrictEqual([
                [
                    "Weigh",
                    "",
                    "",
                    "Measured",
                    "Scale",
                ],
                [
                    "Light",
                    ppfd,
                    lux,
                    quality,
                    method,
                ],
            ]);
            expect(context.saveWebObservation(payload)).toMatchObject({
                duplicate: true,
            });
            expect(() =>
                context.saveWebObservation({ ...payload, lux: 100 })
            ).toThrow(/retry no longer matches/iv);
            expect(workbook.history.__rows).toHaveLength(3);
        }
    );

    it.each([
        undefined,
        null,
        "",
        " ",
        -1,
        "bad",
        true,
        [],
        {},
        NaN,
        Infinity,
    ])("rejects invalid or missing light reading %s before writing", (ppfd) => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(() =>
            context.saveWebObservation({
                events: ["Light"],
                plantId: "P01",
                ppfd,
                requestId: "garden-invalid-light",
            })
        ).toThrow(/light event|ppfd/iv);
        expect(workbook.history.__rows).toHaveLength(1);
        expect(() =>
            context.saveWebObservation({
                events: ["Light"],
                lux: ppfd,
                plantId: "P01",
                requestId: "garden-invalid-lux",
            })
        ).toThrow(/illuminance|light event/iv);
        expect(workbook.history.__rows).toHaveLength(1);
    });

    it("keeps Inspect condition separate from Soil check and rejects new condition-only Checks", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            condition: "Leaves firm",
            events: ["Inspect"],
            observedAt: "2026-10-09T12:00:00-04:00",
            plantId: "P01",
            requestId: "garden-inspect-only",
        };

        expect(context.saveWebObservation(payload)).toMatchObject({
            historyRows: 1,
        });
        expect(
            context.saveWebObservation({
                ...payload,
                requestId: "garden-inspect-soil",
                soilMoisture: "Dry",
            })
        ).toMatchObject({ historyRows: 2 });
        expect(() =>
            context.saveWebObservation({
                ...payload,
                events: ["Check"],
                requestId: "garden-legacy-check",
            })
        ).toThrow(/soil moisture/iv);
        expect(
            workbook.history.__rows.slice(1).map((row) => [
                row[2],
                row[7],
                row[32],
            ])
        ).toStrictEqual([
            [
                "Inspect",
                "Leaves firm",
                "",
            ],
            [
                "Inspect",
                "Leaves firm",
                "",
            ],
            [
                "Check",
                "",
                "Dry",
            ],
        ]);
        expect(() =>
            context.saveWebObservation({
                ...payload,
                condition: "",
                requestId: "garden-empty-inspect",
            })
        ).toThrow(/condition.*inspect/iv);
        expect(() =>
            context.saveWebObservation({
                ...payload,
                events: ["Inspect", "Check"],
                requestId: "garden-empty-soil-check",
            })
        ).toThrow(/soil moisture/iv);
        expect(workbook.history.__rows).toHaveLength(4);
    });

    it("supports bulk Inspect while keeping numeric light and humidity out of bulk", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            condition: "Leaves firm",
            events: ["Inspect"],
            observedAt: "2026-10-09T12:00:00-04:00",
            plantIds: ["P01", "P02"],
            requestId: "garden-bulk-inspect",
        };
        context.saveBulkCareObservation(payload);

        expect(
            workbook.history.__rows.slice(1).map((row) => [
                row[1],
                row[2],
                row[7],
            ])
        ).toStrictEqual([
            [
                "P01",
                "Inspect",
                "Leaves firm",
            ],
            [
                "P02",
                "Inspect",
                "Leaves firm",
            ],
        ]);

        for (const event of ["Light", "Humidity"]) {
            expect(() =>
                context.saveBulkCareObservation({ ...payload, events: [event] })
            ).toThrow(/bulk/iv);
        }

        expect(workbook.history.__rows).toHaveLength(3);
    });

    it("maps App entries AJ:AK zero without changing legacy humidity", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const entry = emptyCells(37);
        entry[0] = "LIGHT-ENTRY";
        entry[2] = "P01";
        entry[3] = "Light";
        entry[26] = "Queued";
        entry[35] = 0;
        entry[36] = 0;
        required(workbook.sheets.get("App entries")).__rows.push(entry);
        context.processQueuedAppSheetEntries();

        expect(entry[26]).toBe("Saved");
        expect(
            required(workbook.history.__rows[1]).slice(42, 45)
        ).toStrictEqual([
            "",
            0,
            0,
        ]);
    });

    it.each([43, 44])(
        "guards occupied light destination %s and preserves zero on rerun",
        (index) => {
            expect.hasAssertions();

            const history = createHistorySheet();
            const context = loadAppsScript(history);
            const row = emptyCells(45);
            row[index] = 0;
            history.__rows.push(row);
            context.ensureHistoryLightColumns_(history);

            expect(row[index]).toBe(0);

            required(history.__rows[0])[index] = "";

            expect(() => {
                context.ensureHistoryLightColumns_(history);
            }).toThrow(/existing data/iv);

            required(history.__rows[0])[index] = "Owner field";

            expect(() => {
                context.ensureHistoryLightColumns_(history);
            }).toThrow(/must be/iv);
        }
    );
});

describe("garden logger light staging guards", () => {
    it.each(["", "Column 44"])(
        "installs History light headers over replaceable %j headers without changing observations",
        (header) => {
            expect.hasAssertions();

            const history = createHistorySheet();
            const headers = required(history.__rows[0]);
            headers[43] = header;
            headers[44] = header ? "Column 45" : "";
            const row = emptyCells(45);
            row[1] = "P01";
            row[2] = "Check";
            row[7] = "Legacy condition";
            row[42] = 0;
            row[12] = '=IF(B2="","",B2)';
            history.__rows.push(row);
            const context = loadAppsScript(history);
            const before = structuredClone(row);

            context.ensureHistoryLightColumns_(history, true);

            expect(headers.slice(43, 45)).toStrictEqual([
                "PPFD (µmol/m²/s)",
                "Illuminance (lux)",
            ]);
            expect(row).toStrictEqual(before);
            expect(history.getRange(2, 13).getFormulas()).toStrictEqual([
                [row[12]],
            ]);
            expect(history.__validationCells.has("2:44")).toBe(true);
            expect(history.__validationCells.has("5000:45")).toBe(true);

            row[43] = 0;
            row[44] = 1000;
            const installed = structuredClone(history.__rows);
            context.ensureHistoryLightColumns_(history);

            expect(history.__rows).toStrictEqual(installed);
            expect(history.getRange(2, 13).getFormulas()).toStrictEqual([
                [row[12]],
            ]);
        }
    );

    it.each([43, 44])(
        "refuses a History light destination %s containing a formula that displays blank",
        (index) => {
            expect.hasAssertions();

            const formulas = Array.from({ length: 60 }, () => "");
            formulas[index] = '=IF(TRUE,"",1)';
            const history = createHistorySheet([{ values: emptyCells(45) }], {
                formulaInputs: [[], formulas],
            });
            const headers = required(history.__rows[0]);
            headers[43] = "";
            headers[44] = "";
            const before = structuredClone(history.__rows);
            const context = loadAppsScript(history);

            expect(() => {
                context.ensureHistoryLightColumns_(history, true);
            }).toThrow(
                /contains existing data; review before adding light readings/v
            );
            expect(history.__rows).toStrictEqual(before);
            expect(history.getRange(2, index + 1).getFormulas()).toStrictEqual([
                [formulas[index]],
            ]);
            expect(history.__validationCells.size).toBe(0);
        }
    );

    it.each([31, 37])(
        "upgrades legacy App entries with %s physical columns and preserves queued data",
        (width) => {
            expect.hasAssertions();

            const headers = emptyCells(width);
            headers.splice(0, 31, ...appSheetEntryHeaders.slice(0, 31));
            const row = emptyCells(width);
            row[0] = "LIGHT-UPGRADE-DRAFT";
            row[2] = "P01";
            row[3] = "Check";
            row[9] = "Legacy condition";
            row[26] = "Queued";
            const before = row.slice(0, 31);
            const entries = createDataSheet("App entries", [headers, row]);
            const context = loadAppsScript(createHistorySheet());

            expect(context.ensureAppSheetEntryColumns_(entries, true)).toBe(
                true
            );
            expect(headers).toStrictEqual(appSheetEntryHeaders);
            expect(row.slice(0, 31)).toStrictEqual(before);
            expect(row.slice(31)).toStrictEqual(emptyCells(28));
            expect(entries.getMaxColumns()).toBe(59);
        }
    );

    it.each([
        { formula: "", index: 35, value: 0 },
        { formula: "", index: 36, value: 0 },
        { formula: '=""', index: 35, value: "" },
        { formula: '=""', index: 36, value: "" },
    ])(
        "preserves occupied App entries destination $index ($formula / $value)",
        ({ formula, index, value }) => {
            expect.hasAssertions();

            const headers = [...appSheetEntryHeaders];
            headers[index] = "";
            const row = emptyCells(37);
            row[index] = value;
            const formulas = emptyCells(37);
            formulas[index] = formula;
            const entries = createDataSheet(
                "App entries",
                [headers, row],
                [[], formulas]
            );
            const before = structuredClone(entries.__rows);
            const context = loadAppsScript(createHistorySheet());

            expect(() =>
                context.ensureAppSheetEntryColumns_(entries, true)
            ).toThrow(/existing data/iv);
            expect(entries.__rows).toStrictEqual(before);
            expect(entries.getRange(2, index + 1, 1, 1).getFormula()).toBe(
                formula
            );
            expect(entries.__dataValidationCalls).toStrictEqual([]);
        }
    );

    it("installs nonnegative light validations and preserves values through reruns", () => {
        expect.hasAssertions();

        const entries = createDataSheet("App entries", [
            appSheetEntryHeaders.slice(0, 35),
            emptyCells(35),
        ]);
        const context = loadAppsScript(createHistorySheet());
        context.ensureAppSheetEntryColumns_(entries, true);

        expect(entries.__rows[0]).toStrictEqual(appSheetEntryHeaders);

        const row = required(entries.__rows[1]);
        row[34] = 45;
        row[35] = 0;
        row[36] = 1234;
        context.ensureAppSheetEntryColumns_(entries, true);

        expect(row.slice(34, 37)).toStrictEqual([
            45,
            0,
            1234,
        ]);
        expect(entries.__dataValidationCalls).toContainEqual(
            expect.objectContaining({
                column: 36,
                columnCount: 2,
                validation: {
                    allowInvalid: false,
                    type: "NUMBER_GREATER_THAN_EQ",
                    values: [0],
                },
            })
        );
    });

    it("saves only Inspect in Quick log and rejects missing condition or unsupported Light", () => {
        expect.hasAssertions();

        const { context, quick, row, workbook } = quickLogWateringFixture({
            amount: "",
            application: "",
            event: "Inspect",
        });
        row[6] = "";

        expect(() => {
            context.archiveQuickLogRow_(quick, 5);
        }).toThrow(/condition.*inspect/iv);
        expect(workbook.history.__rows).toHaveLength(1);

        row[9] = "Leaves firm";
        context.archiveQuickLogRow_(quick, 5);

        expect(workbook.history.__rows).toHaveLength(2);
        expect(required(workbook.history.__rows[1])[2]).toBe("Inspect");
        expect(required(workbook.history.__rows[1])[7]).toBe("Leaves firm");

        row[4] = "Light";

        expect(() => {
            context.archiveQuickLogRow_(quick, 5);
        }).toThrow(/detailed form/iv);
        expect(workbook.history.__rows).toHaveLength(2);
    });
});

describe("garden logger humidity and terrarium enrollment", () => {
    it.each([
        { description: "no observations", history: [] },
        {
            description: "weights without watering",
            history: [
                [
                    10,
                    "P38",
                    "Weigh",
                    "",
                    500,
                    1,
                ],
                [
                    12,
                    "P38",
                    "Weigh",
                    "",
                    490,
                    1,
                ],
            ],
        },
        {
            description: "waterings with repeated weights",
            history: [
                [
                    10,
                    "P38",
                    "Water",
                    "",
                    "",
                    1,
                ],
                [
                    10,
                    "P38",
                    "Weigh",
                    "",
                    500,
                    1,
                ],
                [
                    12,
                    "P38",
                    "Weigh",
                    "",
                    490,
                    1,
                ],
                [
                    13,
                    "P38",
                    "Water",
                    "",
                    "",
                    1,
                ],
                [
                    13,
                    "P38",
                    "Weigh",
                    "",
                    510,
                    1,
                ],
            ],
        },
    ])(
        "keeps terrarium calibration manual with $description",
        ({ history }) => {
            expect.hasAssertions();

            const context = loadAppsScript(createHistorySheet());
            const before = structuredClone(history);
            const model = required(
                context.GARDEN_DRY_DOWN(history, [["P38"]])[0]
            );
            const baseline = context.baselineViewRow_(37, {
                id: "P38",
                name: "Terrarium",
            });

            expect(baseline[7]).toBe(
                '="Closed-jar terrarium; inspect enclosure, substrate and plants"'
            );
            expect(model[11]).toBe(
                "Closed-jar terrarium; inspect enclosure, substrate and plants"
            );
            expect(model[3]).toBe("");
            expect(history).toStrictEqual(before);
            expect(
                context.baselineViewRow_(2, {
                    id: "P01",
                    name: "Moon cactus",
                })[7]
            ).toContain('"Need a wet weight"');
        }
    );

    it("keeps terrarium weight evidence without a dry-out watering recommendation", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const history = [
            [
                10,
                "P38",
                "Water",
                "",
                "",
                1,
            ],
            [
                10,
                "P38",
                "Weigh",
                "",
                500,
                1,
            ],
            [
                11,
                "P38",
                "Weigh",
                "",
                490,
                1,
            ],
            [
                12,
                "P38",
                "Weigh",
                "",
                489,
                1,
            ],
            [
                13,
                "P38",
                "Weigh",
                "",
                488,
                1,
            ],
        ];
        const model = required(context.GARDEN_DRY_DOWN(history, [["P38"]])[0]);

        expect(structuredClone(model.slice(2, 4))).toStrictEqual(["", ""]);
        expect(model[6]).toBe("");
        expect(structuredClone(model.slice(7, 10))).toStrictEqual([
            "",
            "",
            "",
        ]);
        expect(model[10]).toBe("Closed-jar terrarium");
        expect(model[11]).toBe(
            "Closed-jar terrarium; inspect enclosure, substrate and plants"
        );
        expect(model[14]).toBe("");
        expect(model[15]).toContain("do not use a cactus dry reference");
        expect(model[16]).toBe(-1);
        expect(model[21]).toBe(
            "Closed-jar terrarium; no weight-based watering trigger"
        );
        expect(history[1]).toStrictEqual([
            10,
            "P38",
            "Weigh",
            "",
            500,
            1,
        ]);
    });

    it("processes the 61-column legacy bulk contract without appending P38 until explicitly installed", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P37"]);
        const round = emptyCells(61);
        round[0] = "LEGACY-ARCTIC-WEIGH";
        round[appSheetBulkActionIndex] = "Weigh";
        round[60] = 420;
        round[appSheetBulkStatusIndex] = "Queued";
        const legacy = createDataSheet("App bulk", [
            appSheetBulkHeaders.slice(0, 61),
            round,
        ]);
        legacy.setParent(workbook.spreadsheet);
        workbook.sheets.set("App bulk", legacy);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        context.processQueuedAppSheetEntries();

        expect(legacy.getLastColumn()).toBe(61);
        expect(round[appSheetBulkStatusIndex]).toBe("Saved");
        expect(required(workbook.history.__rows[1])[1]).toBe("P37");
        expect(required(workbook.history.__rows[1])[4]).toBe(420);
        expect(context.migrateLegacyAppSheetBulkSheet_(legacy)).toBe(true);
        expect(legacy.__rows[0]).toStrictEqual(appSheetBulkHeaders);
        expect(round[60]).toBe(420);
        expect(round[61]).toBe("");
    });

    it.each([
        0,
        100,
        67.5,
    ])(
        "saves %s percent independently from other event rows and preserves retries",
        (relativeHumidity) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook(["P38"]);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            const payload = {
                events: [
                    "Humidity",
                    "Water",
                    "Measure",
                ],
                height: 3,
                measurementMethod: "Ruler",
                measurementQuality: "Measured",
                measurementUnit: "cm",
                nutrientsUsed: "No",
                observedAt: "2026-10-08T12:00:00-04:00",
                plantId: "P38",
                relativeHumidity,
                requestId: "garden-humidity-fixture",
            };

            expect(context.saveWebObservation(payload)).toMatchObject({
                duplicate: false,
                historyRows: 3,
            });

            const rows = workbook.history.__rows.slice(1);

            expect(
                rows.map((row) => [
                    row[2],
                    row[42],
                    row[28],
                    row[34],
                ])
            ).toStrictEqual([
                [
                    "Water",
                    "",
                    "Observed",
                    "Observed",
                ],
                [
                    "Measure",
                    "",
                    "Measured",
                    "Ruler",
                ],
                [
                    "Humidity",
                    relativeHumidity,
                    "Measured",
                    "Hygrometer",
                ],
            ]);
            expect(context.saveWebObservation(payload)).toMatchObject({
                duplicate: true,
            });
            expect(() =>
                context.saveWebObservation({
                    ...payload,
                    relativeHumidity: relativeHumidity === 0 ? 1 : 0,
                })
            ).toThrow(/retry no longer matches/iv);
            expect(workbook.history.__rows).toHaveLength(4);
        }
    );

    it.each([
        undefined,
        null,
        "",
        " ",
        -1,
        101,
        "not a number",
        true,
        NaN,
        Infinity,
    ])("rejects invalid humidity %s before appending", (relativeHumidity) => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P38"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(() =>
            context.saveWebObservation({
                events: ["Humidity"],
                plantId: "P38",
                relativeHumidity,
                requestId: "garden-humidity-invalid",
            })
        ).toThrow(/relative humidity/iv);
        expect(workbook.history.__rows).toHaveLength(1);
    });

    it("maps App entries AI zero and new bulk BJ weight without shifting legacy rows", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P38"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const entry = emptyCells(35);
        entry[0] = "HUMIDITY-ENTRY";
        entry[2] = "P38";
        entry[3] = "Humidity";
        entry[26] = "Queued";
        entry[34] = 0;
        required(workbook.sheets.get("App entries")).__rows.push(entry);
        const round = emptyCells(62);
        round[0] = "TERRARIUM-WEIGH";
        round[appSheetBulkActionIndex] = "Weigh";
        round[61] = 1234;
        round[appSheetBulkStatusIndex] = "Queued";
        required(workbook.sheets.get("App bulk")).__rows.push(round);
        context.processQueuedAppSheetEntries();

        expect(entry[26]).toBe("Saved");
        expect(round[appSheetBulkStatusIndex]).toBe("Saved");
        expect(
            workbook.history.__rows.slice(1).map((row) => [
                row[1],
                row[2],
                row[4],
                row[42],
            ])
        ).toStrictEqual([
            [
                "P38",
                "Humidity",
                "",
                0,
            ],
            [
                "P38",
                "Weigh",
                1234,
                "",
            ],
        ]);

        const legacyHeaders = stringArray(
            vm.runInContext("APP_SHEET_BULK_V531_HEADERS", context)
        );

        expect(structuredClone(legacyHeaders)).toStrictEqual(
            appSheetBulkHeaders.slice(0, 61)
        );
    });

    it("installs Hygrometer provenance in native History while rejecting it for dimensions", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P38"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const history = workbook.history;
        /** @type {unknown[]} */
        const validationCalls = [];
        const originalGetRange = history.getRange;
        history.getRange = (row, column, rowCount = 1, columnCount = 1) => {
            const range = originalGetRange(row, column, rowCount, columnCount);
            const originalSetValidation = range.setDataValidation;
            range.setDataValidation = (validation) => {
                validationCalls.push({
                    column,
                    columnCount,
                    row,
                    rowCount,
                    validation,
                });
                return originalSetValidation(validation);
            };
            return range;
        };
        const before = structuredClone(history.__rows);
        context.ensureHistoryHumidityColumn_(history, true);

        expect(validationCalls).toContainEqual({
            column: 35,
            columnCount: 1,
            row: 2,
            rowCount: history.getMaxRows() - 1,
            validation: {
                allowInvalid: false,
                showDropdown: true,
                type: "ONE_OF_LIST",
                values: [
                    "Scale",
                    "Ruler",
                    "Estimated from photo",
                    "Estimated visually",
                    "Observed",
                    "Other",
                    "Unspecified",
                    "Hygrometer",
                    "Light app",
                    "Lux meter",
                    "Thermometer",
                    "IR thermometer",
                    "VPD meter",
                    "Leaf temperature + air/RH",
                ],
            },
        });
        expect(validationCalls).toContainEqual({
            column: 43,
            columnCount: 1,
            row: 2,
            rowCount: history.getMaxRows() - 1,
            validation: {
                allowInvalid: false,
                type: "NUMBER_BETWEEN",
                values: [0, 100],
            },
        });
        expect(history.__rows).toStrictEqual(before);
        expect(() =>
            context.saveWebObservation({
                events: ["Measure"],
                height: 3,
                measurementMethod: "Hygrometer",
                measurementQuality: "Measured",
                measurementUnit: "cm",
                observedAt: "2026-10-08T12:00:00-04:00",
                plantId: "P38",
                requestId: "terrarium-invalid-dimension-method",
            })
        ).toThrow(/measurement method must be one of/iv);
        expect(workbook.history.__rows).toHaveLength(1);
        expect(workbook.history.__setValuesCalls).toStrictEqual([]);
    });

    it("guards the legacy History append and leaves existing humidity intact on rerun", () => {
        expect.hasAssertions();

        const history = createHistorySheet();
        required(history.__rows[0]).splice(42);
        const context = loadAppsScript(history);
        context.ensureHistoryHumidityColumn_(history);

        expect(required(history.__rows[0])[42]).toBe("Relative humidity (%)");

        const row = emptyCells(45);
        row[42] = 0;
        history.__rows.push(row);
        context.ensureHistoryHumidityColumn_(history);

        expect(row[42]).toBe(0);

        required(history.__rows[0])[42] = "";

        expect(() => {
            context.ensureHistoryHumidityColumn_(history);
        }).toThrow(/existing data/iv);

        required(history.__rows[0])[42] = "Owner field";

        expect(() => {
            context.ensureHistoryHumidityColumn_(history);
        }).toThrow(/AQ1/v);
    });
});

describe("garden logger Arctic Ice enrollment", () => {
    it("starts with empty evidence and saves P37 weight, measurement, and photo as retry-safe event rows", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P37"]);
        const tracker = required(workbook.sheets.get("Plant tracker"));
        tracker.getRange(2, 2).setValues([["Echeveria 'Arctic Ice'"]]);
        tracker.getRange(2, 15).setValues([["#11"]]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(context.getWebAppBootstrap().plants).toMatchObject([
            {
                currentImageUrl: "",
                currentPotSize: "Not logged",
                id: "P37",
                label: "#11",
                nurseryLabelImageUrl: "",
            },
        ]);
        expect(workbook.history.__rows).toHaveLength(1);

        const payload = {
            events: [
                "Weigh",
                "Measure",
                "Photo",
            ],
            height: 4,
            measurementUnit: "cm",
            observedAt: "2026-10-06T12:00:00-04:00",
            photoUrl: "https://gyazo.com/0123456789abcdef0123456789abcdef",
            plantId: "P37",
            requestId: "garden-arctic-ice-fixture",
            weight: 420,
            width: 8,
        };

        expect(context.saveWebObservation(payload)).toMatchObject({
            duplicate: false,
            historyRows: 3,
        });
        expect(context.saveWebObservation(payload)).toMatchObject({
            duplicate: true,
            historyRows: 3,
        });
        expect(
            workbook.history.__rows.slice(1).map((row) => [
                row[1],
                row[2],
                row[11],
            ])
        ).toStrictEqual([
            [
                "P37",
                "Weigh",
                "#11",
            ],
            [
                "P37",
                "Measure",
                "#11",
            ],
            [
                "P37",
                "Photo",
                "#11",
            ],
        ]);
        expect(required(workbook.history.__rows[1])[4]).toBe(420);
        expect(required(workbook.history.__rows[2]).slice(5, 7)).toStrictEqual([
            4,
            8,
        ]);
        expect(required(workbook.history.__rows[3])[23]).toBe(payload.photoUrl);
    });

    it("processes the appended P37 bulk weight and preserves completed retry identity", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P37"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const round = emptyCells(61);
        round[0] = "ARCTIC-WEIGH";
        round[appSheetBulkActionIndex] = "Weigh";
        round[60] = 420;
        round[appSheetBulkStatusIndex] = "Queued";
        required(workbook.sheets.get("App bulk")).__rows.push(round);
        context.processQueuedAppSheetEntries();

        expect(round[appSheetBulkStatusIndex]).toBe("Saved");
        expect(required(workbook.history.__rows[1]).slice(1, 5)).toStrictEqual([
            "P37",
            "Weigh",
            "Routine",
            420,
        ]);

        round[appSheetBulkStatusIndex] = "Retry";
        context.processQueuedAppSheetEntries();

        expect(workbook.history.__rows).toHaveLength(2);
    });

    it("keeps 60-column staging usable until explicit enrollment and rejects an occupied BI", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P36"]);
        const round = emptyCells(60);
        round[0] = "LEGACY60";
        round[appSheetBulkActionIndex] = "Weigh";
        round[59] = 410;
        round[appSheetBulkStatusIndex] = "Queued";
        const sheet = createDataSheet("App bulk", [
            appSheetBulkHeaders.slice(0, 60),
            round,
        ]);
        workbook.sheets.set("App bulk", sheet);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        context.processQueuedAppSheetEntries();

        expect(sheet.__rows[0]).toHaveLength(60);
        expect(round[appSheetBulkStatusIndex]).toBe("Saved");

        const before = structuredClone(sheet.__rows[1]);

        expect(context.migrateLegacyAppSheetBulkSheet_(sheet)).toBe(true);
        expect(sheet.__rows[0]).toStrictEqual(appSheetBulkHeaders);
        expect(required(sheet.__rows[1]).slice(0, 60)).toStrictEqual(before);

        const occupied = createDataSheet("App bulk", [
            [...appSheetBulkHeaders.slice(0, 60), "Owner data"],
        ]);

        expect(() => context.migrateLegacyAppSheetBulkSheet_(occupied)).toThrow(
            "Unexpected App bulk columns after BH"
        );
    });
});

describe("garden logger mesemb enrollment", () => {
    it("enrolls the new shared Lithops and split-rock pots without inventing observations and saves their appended weights retry-safely", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P35", "P36"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(
            context.getWebAppBootstrap().plants.map(({ id }) => id)
        ).toStrictEqual(["P35", "P36"]);
        expect(workbook.history.__rows).toHaveLength(1);

        const round = emptyCells(appSheetBulkHeaders.length);
        round[0] = "MESEMB-WEIGH";
        round[appSheetBulkActionIndex] = "Weigh";
        round[58] = 450;
        round[59] = 480;
        round[appSheetBulkStatusIndex] = "Queued";
        required(workbook.sheets.get("App bulk")).__rows.push(round);
        context.processQueuedAppSheetEntries();

        expect(round[appSheetBulkStatusIndex]).toBe("Saved");
        expect(
            workbook.history.__rows.slice(1).map((row) => [
                row[1],
                row[2],
                row[4],
            ])
        ).toStrictEqual([
            [
                "P35",
                "Weigh",
                450,
            ],
            [
                "P36",
                "Weigh",
                480,
            ],
        ]);

        round[appSheetBulkStatusIndex] = "Retry";
        context.processQueuedAppSheetEntries();

        expect(workbook.history.__rows).toHaveLength(3);
    });

    it("preserves the 58-column roster until explicit enrollment and never drops unknown tail columns", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const round = emptyCells(58);
        round[0] = "LEGACY58";
        round[appSheetBulkActionIndex] = "Weigh";
        round[6] = 410;
        round[appSheetBulkStatusIndex] = "Queued";
        const sheet = createDataSheet("App bulk", [
            appSheetBulkHeaders.slice(0, 58),
            round,
        ]);
        workbook.sheets.set("App bulk", sheet);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        context.processQueuedAppSheetEntries();

        expect(sheet.__rows[0]).toHaveLength(58);

        const before = structuredClone(sheet.__rows[1]);

        expect(context.migrateLegacyAppSheetBulkSheet_(sheet)).toBe(true);
        expect(sheet.__rows[0]).toStrictEqual(appSheetBulkHeaders);
        expect(required(sheet.__rows[1]).slice(0, 58)).toStrictEqual(before);

        const occupied = createDataSheet("App bulk", [
            [...appSheetBulkHeaders.slice(0, 58), "Owner data"],
        ]);

        expect(() => context.migrateLegacyAppSheetBulkSheet_(occupied)).toThrow(
            "Unexpected App bulk columns after BF"
        );

        const unknown = createDataSheet("App bulk", [
            [...appSheetBulkHeaders, "Unreviewed weight"],
            [
                ...round,
                "",
                "",
                123,
            ],
        ]);
        workbook.sheets.set("App bulk", unknown);

        expect(() => context.processQueuedAppSheetEntries()).toThrow(
            "Unexpected App bulk columns"
        );
        expect(required(unknown.__rows[1]).at(-1)).toBe(123);
        expect(workbook.history.__rows).toHaveLength(2);

        const selected = emptyCells(60);
        selected[appSheetBulkActionIndex] = "Weigh";
        selected[appSheetBulkSelectedPlantsIndex] = "P99";
        selected[58] = 450;

        expect(() =>
            context.appSheetBulkPayloadsFromRow_(selected, "UNKNOWN")
        ).toThrow("Unknown selected plant ID");
    });
});

describe("garden logger AppSheet staging migration and trigger installation", () => {
    it("normalizes array-valued bulk selections without mutating the staged round", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const round = emptyCells(56);
        round[appSheetBulkActionIndex] = "Water + weigh";
        round[appSheetBulkWeightStartIndex] = 300;
        // Exercise the supported external array shape, which native Sheet cells
        // ordinarily serialize as comma-separated text.
        Reflect.set(round, appSheetBulkSelectedPlantsIndex, [" P01 ", "P02"]);
        const before = structuredClone(round);

        const requests = context.appSheetBulkPayloadsFromRow_(
            round,
            "ARRAY-SELECTION"
        );

        expect(
            structuredClone(requests.map(({ plantId }) => plantId))
        ).toStrictEqual(["P01", "P02"]);
        expect(requests[0]?.payload).toMatchObject({
            events: ["Water", "Weigh"],
            plantId: "P01",
            weight: 300,
        });
        expect(requests[1]?.payload).toMatchObject({
            events: ["Water"],
            plantId: "P02",
            weight: "",
        });
        expect(round).toStrictEqual(before);
    });

    it.each(["P33", "P34"])(
        "rejects mixed active/archived array selections for %s before writing any observations",
        (plantId) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook(["P01"]);
            const round = emptyCells(56);
            round[0] = `ARRAY-${plantId}`;
            round[appSheetBulkActionIndex] = "Weigh";
            round[appSheetBulkWeightStartIndex] = 300;
            round[appSheetBulkStatusIndex] = "Queued";
            const selection = ["P01", ` ${plantId} `];
            Reflect.set(round, appSheetBulkSelectedPlantsIndex, selection);
            required(workbook.sheets.get("App bulk")).__rows.push(round);
            const before = structuredClone(workbook.history.__rows);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });

            const result = context.processQueuedAppSheetEntries();

            expect(result.bulk["needsCorrectionCount"]).toBe(1);
            expect(result.bulk["savedRequestCount"]).toBe(0);
            expect(round[appSheetBulkStatusIndex]).toBe("Needs correction");
            expect(round[appSheetBulkStatusIndex + 1]).toMatch(/retired IDs/v);
            expect(round[appSheetBulkSelectedPlantsIndex]).toStrictEqual(
                selection
            );
            expect(round[appSheetBulkWeightStartIndex]).toBe(300);
            expect(workbook.history.__rows).toStrictEqual(before);
        }
    );

    it.each(["P33", "P34"])(
        "rejects archived %s drafts even when stale tracker rows remain",
        (plantId) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook(["P01", plantId]);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });

            expect(
                context.getWebAppBootstrap().plants.map(({ id }) => id)
            ).toStrictEqual(["P01"]);
            expect(() =>
                context.saveWebObservation({
                    events: ["Weigh"],
                    plantId,
                    requestId: `archived-${plantId}`,
                    weight: 100,
                })
            ).toThrow(/retired/v);
            expect(workbook.history.__rows).toHaveLength(1);
            expect(
                context.wateringRecommendation_(plantId, {}).guidance
            ).toMatch(/Retired/v);
        }
    );

    it.each([
        "Water",
        "Weigh",
        "Water + weigh",
        "Rotation",
    ])(
        "retains archived bulk values and rejects the whole %s round",
        (action) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook(["P01"]);
            const round = emptyCells(58);
            round[0] = "ARCHIVED";
            round[appSheetBulkActionIndex] = action;
            round[appSheetBulkSelectedPlantsIndex] = "P01";
            round[appSheetBulkWeightStartIndex] = 300;
            round[56] = 100;
            round[57] = 200;
            round[appSheetBulkStatusIndex] = "Queued";
            required(workbook.sheets.get("App bulk")).__rows.push(round);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            context.processQueuedAppSheetEntries();

            expect(round[appSheetBulkStatusIndex]).toBe("Needs correction");
            expect(round[appSheetBulkStatusIndex + 1]).toMatch(
                /Archived plant weight fields/v
            );
            expect(round.slice(56)).toStrictEqual([100, 200]);
            expect(workbook.history.__rows).toHaveLength(1);

            round[56] = "";
            round[57] = "";
            round[appSheetBulkSelectedPlantsIndex] = "P33, P34";

            expect(() =>
                context.appSheetBulkPayloadsFromRow_(round, "ARCHIVED")
            ).toThrow(/retired IDs/v);
        }
    );

    it("processes the prior 54-column staging schema without moving or appending its columns", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook([
            "P01",
            "P29",
            "P30",
        ]);
        const oldHeaders = appSheetBulkHeaders.slice(0, 54);
        const round = emptyCells(54);
        round[0] = "OLD54";
        round[1] = new Date("2026-09-19T08:00:00-04:00");
        round[appSheetBulkActionIndex] = "Water";
        round[appSheetBulkSelectedPlantsIndex] = "P29, P30";
        round[appSheetBulkNotesIndex] = "Preserve notes";
        round[appSheetBulkStatusIndex] = "Queued";
        round[52] = "Partial";
        round[53] = 25;
        const sheet = createDataSheet("App bulk", [oldHeaders, round]);
        sheet.setParent(workbook.spreadsheet);
        workbook.sheets.set("App bulk", sheet);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        /** @type {import("../apps-script-fixtures.d.ts").WebPayload[]} */
        const requests = [];
        overrideAppsScript(context, "saveWebObservationBatch", (payloads) => {
            requests.push(...payloads);
            return {
                results: payloads.map(() => ({ ok: true, retryable: false })),
            };
        });
        context.processQueuedAppSheetEntries();

        expect(sheet.__rows[0]).toStrictEqual(oldHeaders);
        expect(sheet.__rows[0]).toHaveLength(54);
        expect(requests).toHaveLength(2);
        expect(requests.map(({ plantId }) => plantId)).toStrictEqual([
            "P29",
            "P30",
        ]);
        expect(requests[0]).toMatchObject({
            notes: "Preserve notes",
            waterAmount: 25,
            wateringApplication: "Partial",
        });
        expect(round[appSheetBulkStatusIndex]).toBe("Saved");
        expect(round[52]).toBe("Partial");
        expect(round[53]).toBe(25);
    });

    it("appends current staging weights without changing any prior field or saved round", () => {
        expect.hasAssertions();

        const context = loadAppsScript(createHistorySheet());
        const oldHeaders = appSheetBulkHeaders.slice(0, 54);
        const original = oldHeaders.map((_, index) => `preserved ${index}`);
        const sheet = createDataSheet("App bulk", [
            [...oldHeaders],
            [...original],
        ]);

        expect(context.migrateLegacyAppSheetBulkSheet_(sheet, false)).toBe(
            false
        );
        expect(context.migrateLegacyAppSheetBulkSheet_(sheet)).toBe(true);
        expect(sheet.__rows[0]).toStrictEqual(appSheetBulkHeaders);
        expect(required(sheet.__rows[1]).slice(0, 54)).toStrictEqual(original);
        expect(context.migrateLegacyAppSheetBulkSheet_(sheet)).toBe(false);

        const occupied = createDataSheet("App bulk", [
            [...oldHeaders, "Owner data"],
        ]);

        expect(() => context.migrateLegacyAppSheetBulkSheet_(occupied)).toThrow(
            "Unexpected App bulk columns after BB"
        );
    });

    it("preserves 56-column rounds until explicit enrollment appends the new active fields", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(appSheetBulkPlants);
        const oldHeaders = appSheetBulkHeaders.slice(0, 56);
        const round = emptyCells(56);
        round[0] = "LEGACY56";
        round[appSheetBulkActionIndex] = "Weigh";
        round[appSheetBulkWeightStateIndex] = "Routine";
        round[6] = 410;
        round[appSheetBulkStatusIndex] = "Queued";
        const sheet = createDataSheet("App bulk", [[...oldHeaders], round]);
        sheet.setParent(workbook.spreadsheet);
        workbook.sheets.set("App bulk", sheet);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        expect(
            context.processQueuedAppSheetEntries().bulk["savedRequestCount"]
        ).toBe(1);
        expect(sheet.__rows[0]).toStrictEqual(oldHeaders);

        const savedRound = structuredClone(sheet.__rows[1]);

        expect(context.migrateLegacyAppSheetBulkSheet_(sheet, false)).toBe(
            false
        );
        expect(context.migrateLegacyAppSheetBulkSheet_(sheet)).toBe(true);
        expect(sheet.__rows[0]).toStrictEqual(appSheetBulkHeaders);
        expect(required(sheet.__rows[1]).slice(0, 56)).toStrictEqual(
            savedRound
        );
        expect(required(sheet.__rows[1]).slice(56, 62)).toStrictEqual([
            "",
            "",
            "",
            "",
            "",
            "",
        ]);
        expect(required(sheet.__rows[0]).slice(54, 62)).toStrictEqual([
            "P31 weight (g)",
            "P32 weight (g)",
            "P33 weight (g)",
            "P34 weight (g)",
            "P35 weight (g)",
            "P36 weight (g)",
            "P37 weight (g)",
            "P38 weight (g)",
        ]);

        const occupied = createDataSheet("App bulk", [
            [...oldHeaders, "Owner data"],
        ]);

        expect(() => context.migrateLegacyAppSheetBulkSheet_(occupied)).toThrow(
            "Unexpected App bulk columns after BD"
        );
    });

    it.each(["P31", "P32"])(
        "requires a current identity revision for reassigned %s and preserves retry idempotency",
        (plantId) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook([plantId]);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            const stale = {
                events: ["Weigh"],
                observedAt: "2026-09-20T12:00:00Z",
                plantId,
                requestId: `mobile-${plantId}-reassignment`,
                weight: 125,
            };

            expect(() => context.saveWebObservation(stale)).toThrow(
                "predates the P31/P32"
            );
            expect(workbook.history.__rows).toHaveLength(1);

            const current = { ...stale, inventoryRevision: "id528" };

            expect(context.saveWebObservation(current)).toMatchObject({
                ok: true,
            });
            expect(context.saveWebObservation(current)).toMatchObject({
                message: expect.stringContaining("already saved"),
                ok: true,
            });
            expect(workbook.history.__rows).toHaveLength(2);
            expect(stale).not.toHaveProperty("inventoryRevision");
        }
    );

    it.each(["P31", "P32"])(
        "requires new AppSheet-created IDs for reassigned %s while retaining old drafts",
        (plantId) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook([plantId]);
            const stale = emptyCells(appSheetEntryHeaders.length);
            stale[0] = `old-${plantId}`;
            stale[2] = plantId;
            stale[3] = "Weigh";
            stale[5] = 250;
            stale[26] = "Queued";
            const current = [...stale];
            current[0] = `id528-new-${plantId}`;
            required(workbook.sheets.get("App entries")).__rows.push(
                stale,
                current
            );
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });

            context.processQueuedAppSheetEntries();

            expect(stale[26]).toBe("Needs correction");
            expect(stale[27]).toContain("Refresh or sync");
            expect(stale[5]).toBe(250);
            expect(current[26]).toBe("Saved");
            expect(workbook.history.__rows).toHaveLength(2);
        }
    );

    it("rejects a stale AppSheet round containing reassigned plants before writing any part of it", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P31"]);
        const round = emptyCells(58);
        round[0] = "old-canceled-order-round";
        round[appSheetBulkActionIndex] = "Weigh";
        round[6] = 300;
        round[54] = 200;
        round[appSheetBulkStatusIndex] = "Queued";
        required(workbook.sheets.get("App bulk")).__rows.push(round);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });

        context.processQueuedAppSheetEntries();

        expect(round[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(round[appSheetBulkStatusIndex + 1]).toContain("Sync AppSheet");
        expect(round[54]).toBe(200);
        expect(workbook.history.__rows).toHaveLength(1);
    });

    it("forwards the creation-time identity revision through mobile bulk care", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P31", "P32"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            events: ["Rotation"],
            observedAt: "2026-09-20T15:00:00Z",
            plantIds: ["P31", "P32"],
            requestId: "mobile-houseplant-rotation",
            rotationDegrees: 90,
        };

        expect(() => context.saveBulkCareObservation(payload)).toThrow(
            "predates the P31/P32 plant reassignment"
        );
        expect(workbook.history.__rows).toHaveLength(1);
        expect(
            context.saveBulkCareObservation({
                ...payload,
                inventoryRevision: "id528",
            })
        ).toMatchObject({ ok: true, plantCount: 2 });
        expect(
            workbook.history.__rows.slice(1).map((row) => row[1])
        ).toStrictEqual(["P31", "P32"]);
    });

    it("verifies the current AppSheet bulk staging schema and plant validation", () => {
        expect.hasAssertions();

        const existingWorkbook = createLoggerWorkbook(["P01"]);
        const existingContext = loadAppsScript(existingWorkbook.history, {
            globals: existingWorkbook.globals,
            spreadsheet: existingWorkbook.spreadsheet,
        });

        expect(existingContext.installAppSheetIntake().bulk).toMatchObject({
            columnCount: 77,
            created: false,
            migrated: false,
            plantCount: 39,
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
        const v514Headers = appSheetBulkHeaders.slice(0, 52);
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
            columnCount: 77,
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
            columnCount: 77,
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
            "",
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
                required(v512Sheet.__rows[1]).slice(appSheetBulkNotesIndex, 62)
            )
        ).toStrictEqual([
            ...v512Tail,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
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
            "",
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
                required(v513Sheet.__rows[1]).slice(appSheetBulkNotesIndex, 62)
            )
        ).toStrictEqual([
            ...v513Tail,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
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
                { length: 60 },
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

        emptyHistory.__rows.push(emptyCells(45));

        expect(emptyContext.lastHistoryDataRow_(emptyHistory)).toBe(1);
        expect([
            ...emptyContext.readHistorySnapshot_({
                getSheetByName: () => emptyHistory,
            }),
        ]).toStrictEqual([]);
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
                details: {
                    height: 8,
                    heightCm: 8,
                    heightIn: 8 / 2.54,
                    measurementUnit: "cm",
                    recordedAtIso: "2026-08-16T16:02:00.000Z",
                },
                event: "Measure",
                name: "Feather cactus",
                observationId: "",
                observedAt: "2026-08-16T16:00:00.000Z",
                observedAtIso: "2026-08-16T16:00:00.000Z",
                plantId: "P02",
                weight: "",
                weightState: "",
            },
            {
                details: {
                    recordedAtIso: "2026-08-16T14:01:00.000Z",
                },
                event: "Weigh",
                name: "Moon cactus",
                observationId: "",
                observedAt: "2026-08-16T14:00:00.000Z",
                observedAtIso: "2026-08-16T14:00:00.000Z",
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
            { length: 60 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        older[0] = new Date("2026-08-15T12:00:00Z");
        older[1] = "P01";
        older[2] = "Clean";
        older[9] = new Date("2026-08-15T12:01:00Z");
        const newer = Array.from(
            { length: 60 },
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
            23,
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
            ).toThrow(/integer from 1 to 22/iv);
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
            { length: 60 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        partialRow[0] = new Date("2026-08-16T12:00:00Z");
        partialRow[1] = "P01";
        partialRow[2] = "Weigh";
        partialRow[15] = "garden-partial-batch-12345";
        const conflictRow = Array.from(
            { length: 60 },
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
            { length: 60 },
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
        ).toStrictEqual([{ column: 1, columnCount: 67, row: 2, rowCount: 1 }]);
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

        expect(inserted).toBe(50_000);

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
            "Refresh P37 page",
            "refreshGardenWorkbookPage37",
        ]);
        expect(calls).toContainEqual([
            "Refresh P38 page",
            "refreshGardenWorkbookPage38",
        ]);
        expect(calls).toContainEqual([
            "Refresh P39 page",
            "refreshGardenWorkbookPage39",
        ]);
        expect(calls).toContainEqual([
            "Refresh P40 page",
            "refreshGardenWorkbookPage40",
        ]);
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

        vi.spyOn(context, "ensureHistoryAnchors_").mockImplementation(() => {});
        context.installGardenLogger();
        context.installGardenLogger();

        expect(context.ensureHistoryAnchors_).toHaveBeenCalledTimes(2);

        expect(required(calls.properties)["gardenLoggerVersion"]).toBe(
            LOGGER_VERSION
        );
        expect(required(calls.toast)[1]).toBe("Garden logger verified");
        expect(required(calls.toast)[0]).toContain(
            `Logger ${LOGGER_VERSION} is ready`
        );
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
        required(compactHistory.__rows[0]).splice(40);
        const context = loadAppsScript(compactHistory);

        context.ensureHistoryWaterColumns_(compactHistory);

        expect(
            structuredClone(required(compactHistory.__rows[0]).slice(40, 42))
        ).toStrictEqual(historyWaterHeaders);
        expect(compactHistory.getMaxColumns()).toBe(67);

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
        expect(historyView.getMaxColumns()).toBe(67);
        expect(historyView.getRange(1, 1).getFormula()).toContain(
            "History!A2:BO50001"
        );
        expect(historyView.getRange(1, 1).getFormula()).toContain(
            "SEQUENCE(1,66,2,1)"
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

        expect(narrowHistory.getMaxColumns()).toBe(67);

        const unvalidatedHistory = createHistorySheet();
        const storedRow = Array.from(
            { length: 60 },
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
            { length: 60 },
            () =>
                /** @type {import("../logger-fixtures.d.ts").CellValue} */ ("")
        );
        recordedFirst[0] = sameObservedAt;
        recordedFirst[1] = "P01";
        recordedFirst[2] = "Weigh";
        recordedFirst[4] = null;
        recordedFirst[9] = new Date("2026-08-25T12:01:00Z");
        const recordedSecond = Array.from(
            { length: 60 },
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
        expect(required(sortedHistory[1]).weight).toBe("");
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

    it("infers width-only measurements and retains the event until both dimensions are cleared", () => {
        expect.hasAssertions();

        const rows = Array.from({ length: 5 }, () => emptyCells(15));
        const values = required(rows[4]);
        values[0] = "P01";
        values[8] = 2;
        const quick = createDataSheet("Quick log", rows);
        const context = loadAppsScript(createHistorySheet());

        context.updateInferredEvent_(quick, 5, 9);

        expect(values[4]).toBe("Measure");

        context.updateInferredEvent_(quick, 5, 8);

        expect(values[4]).toBe("Measure");

        values[8] = "";
        context.updateInferredEvent_(quick, 5, 9);

        expect(values[4]).toBe("");
    });

    it("archives a width-only Quick log measurement with default setup and honest estimated provenance", () => {
        expect.hasAssertions();

        const { context, quick, row, workbook } = quickLogWateringFixture({
            amount: "",
            application: "",
            event: "Measure",
        });
        row[6] = "";
        row[8] = 2;
        row[11] = "";
        context.archiveQuickLogRow_(quick, 5);

        const saved = required(workbook.history.__rows[1]);

        expect(saved[2]).toBe("Measure");
        expect(saved[5]).toBe("");
        expect(saved[6]).toBe(5.08);
        expect(saved[10]).toBe(1);
        expect(saved[28]).toBe("Estimated");
        expect(saved[34]).toBe("Unspecified");
        expect(saved[36]).toBe("in");
        expect(required(quick.__rows[4])[8]).toBe("");
        expect(required(quick.__rows[4])[2]).toBe(false);
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
    /** @type {import("../logger-fixtures.d.ts").CellValue[]} */
    const cells = [];
    cells.length = length;
    return cells.fill("");
}

describe("structured care and temperature events", () => {
    const care = {
        environmentAspect: "Light",
        environmentFrom: "8 hours",
        environmentTo: "10 hours",
        mistAmountMl: 2.5,
        mistDetails: "Light spray",
        mistTargets: ["Soil surface", "Leaves"],
        moveFrom: "Lower shelf",
        moveTo: "Upper shelf",
        propagationDetails: "One offset separated",
        propagationMethod: "Offset",
        supportAction: "Adjust",
        supportDetails: "Loosened tie",
        temperature: 32,
        temperatureTarget: "Soil",
        temperatureUnit: "F",
    };

    it("persists six distinct events, canonical temperature and retry identity without watering or setup changes", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            ...care,
            events: [
                "Mist",
                "Move",
                "Temperature",
                "Environment",
                "Propagate",
                "Support",
            ],
            observedAt: "2026-10-15T16:00:00Z",
            plantId: "P01",
            requestId: "garden-care-all-fixture",
        };

        expect(context.saveWebObservation(payload)).toMatchObject({
            historyRows: 6,
            ok: true,
        });

        const rows = workbook.history.__rows.slice(1);

        expect(rows.map((row) => row[2])).toStrictEqual(payload.events);
        expect(
            rows.every(
                (row) =>
                    row.length === 67 &&
                    row[10] === 1 &&
                    row[4] === "" &&
                    row[41] === ""
            )
        ).toBe(true);
        expect(required(rows[0]).slice(45, 48)).toStrictEqual([
            "Leaves, Soil surface",
            2.5,
            "Light spray",
        ]);
        expect(required(rows[2]).slice(50, 53)).toStrictEqual([
            0,
            "Soil",
            "F",
        ]);
        expect(required(rows[2]).slice(28, 29)).toStrictEqual(["Measured"]);
        expect(required(rows[2])[34]).toBe("Thermometer");
        expect(context.getWebAppBootstrap().plants[0]?.currentLocation).toBe(
            "Upper shelf"
        );
        expect(
            context.saveWebObservation({
                ...payload,
                mistTargets: "Leaves; Soil surface",
            })
        ).toMatchObject({ duplicate: true });
        expect(() =>
            context.saveWebObservation({ ...payload, moveTo: "Window" })
        ).toThrow(
            "This retry no longer matches the entry that was already saved."
        );
        expect(workbook.history.__rows).toHaveLength(7);

        const recent = context.getRecentWebObservations(10);

        expect(
            recent.some(
                (row) =>
                    row.event === "Temperature" &&
                    row.details?.temperatureC === 0
            )
        ).toBe(true);
    });

    it.each([
        { expected: 0, temperature: 0, temperatureUnit: "C" },
        { expected: -10, temperature: -10, temperatureUnit: "C" },
        { expected: -10, temperature: 14, temperatureUnit: "F" },
        { expected: -273.15, temperature: -273.15, temperatureUnit: "C" },
    ])(
        "preserves temperature $temperature $temperatureUnit",
        ({ expected, temperature, temperatureUnit }) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook();
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });

            expect(
                context.saveWebObservation({
                    events: ["Temperature"],
                    observedAt: "2026-10-15T16:00:00Z",
                    plantId: "P01",
                    requestId: "garden-temperature-fixture",
                    temperature,
                    temperatureTarget: "Air",
                    temperatureUnit,
                })
            ).toMatchObject({ ok: true });
            expect(required(workbook.history.__rows[1])[50]).toBe(expected);
        }
    );

    it.each([
        {
            event: "Mist",
            expectedError: "Choose at least one listed mist target.",
            fields: { mistTargets: [] },
        },
        {
            event: "Mist",
            expectedError: "Choose at least one listed mist target.",
            fields: { mistTargets: "Invalid" },
        },
        {
            event: "Mist",
            expectedError: "Describe the other mist target.",
            fields: { mistDetails: "", mistTargets: "Other" },
        },
        {
            event: "Mist",
            expectedError: "Mist amount must be a positive number.",
            fields: { mistAmountMl: 0, mistTargets: "Leaves" },
        },
        {
            event: "Mist",
            expectedError: "Mist amount must be a positive finite number.",
            fields: { mistAmountMl: true, mistTargets: "Leaves" },
        },
        {
            event: "Mist",
            expectedError: "Mist amount must be a positive number.",
            fields: { mistAmountMl: Infinity, mistTargets: "Leaves" },
        },
        {
            event: "Move",
            expectedError: "New location is required.",
            fields: { moveTo: "" },
        },
        {
            event: "Temperature",
            expectedError: "Enter a finite temperature reading.",
            fields: { temperature: "" },
        },
        {
            event: "Temperature",
            expectedError: "Enter a finite temperature reading.",
            fields: { temperature: NaN },
        },
        {
            event: "Temperature",
            expectedError: "Enter a finite temperature reading.",
            fields: { temperature: Infinity },
        },
        {
            event: "Temperature",
            expectedError: "Temperature cannot be below absolute zero.",
            fields: { temperature: -274 },
        },
        {
            event: "Temperature",
            expectedError: "Temperature unit: choose C, F.",
            fields: { temperature: 10, temperatureUnit: "K" },
        },
        {
            event: "Temperature",
            expectedError: "Temperature target: choose Air, Soil.",
            fields: { temperature: 10, temperatureTarget: "Leaf" },
        },
        {
            event: "Environment",
            expectedError: "Environment aspect: choose",
            fields: { environmentAspect: "Invalid" },
        },
        {
            event: "Environment",
            expectedError: "New setting is required.",
            fields: { environmentTo: "" },
        },
        {
            event: "Propagate",
            expectedError: "Propagation method: choose",
            fields: { propagationMethod: "Invalid" },
        },
        {
            event: "Propagate",
            expectedError: "Propagation details is required.",
            fields: { propagationDetails: "" },
        },
        {
            event: "Support",
            expectedError: "Support action: choose",
            fields: { supportAction: "Invalid" },
        },
        {
            event: "Support",
            expectedError: "Support details is required.",
            fields: { supportDetails: "" },
        },
    ])(
        "rejects invalid $event detail without writes: $fields",
        ({ event, expectedError, fields }) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook();
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });

            expect(() =>
                context.saveWebObservation({
                    ...care,
                    temperatureUnit: "C",
                    ...fields,
                    events: [event],
                    observedAt: "2026-10-15T16:00:00Z",
                    plantId: "P01",
                    requestId: "garden-invalid-care-fixture",
                })
            ).toThrow(expectedError);
            expect(workbook.history.__rows).toHaveLength(1);
        }
    );

    it("uses shared care values for each selected pot, retains safe literal text and excludes sensor bulk actions", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            ...care,
            events: [
                "Mist",
                "Move",
                "Environment",
                "Propagate",
                "Support",
            ],
            mistDetails: "=special",
            mistTargets: "Other",
            moveTo: "=window",
            observedAt: "2026-10-15T16:00:00Z",
            plantIds: ["P01", "P02"],
            requestId: "garden-bulk-care-fixture",
        };

        expect(context.saveBulkCareObservation(payload)).toMatchObject({
            ok: true,
            plantCount: 2,
        });
        expect(context.saveBulkCareObservation(payload)).toMatchObject({
            duplicateCount: 2,
        });
        expect(workbook.history.__rows).toHaveLength(11);
        expect(required(workbook.history.__rows[1])[47]).toBe("'=special");
        expect(required(workbook.history.__rows[2])[49]).toBe("'=window");

        for (const event of [
            "Temperature",
            "Humidity",
            "Light",
        ])
            expect(() =>
                context.saveBulkCareObservation({ ...payload, events: [event] })
            ).toThrow("Bulk care supports only:");
    });

    it("maps appended AppSheet single and bulk fields while ignoring unselected stale details", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const entries = required(workbook.sheets.get("App entries"));
        const entry = emptyCells(appSheetEntryHeaders.length);
        entry[0] = "care-staging";
        entry[2] = "P01";
        entry[3] = "Temperature";
        entry[26] = "Queued";
        entry[42] = 14;
        entry[43] = "Air";
        entry[44] = "F";
        entry[37] = "Invalid stale mist";
        entries.__rows.push(entry);

        expect(context.processQueuedAppSheetEntries()).toMatchObject({
            savedCount: 1,
        });
        expect(
            required(workbook.history.__rows[1]).slice(50, 53)
        ).toStrictEqual([
            -10,
            "Air",
            "F",
        ]);

        const round = emptyCells(appSheetBulkHeaders.length);
        round[0] = "care-round";
        round[3] = "Support";
        round[4] = "P01";
        round[72] = "Add";
        round[73] = "Small stake";
        const requests = context.appSheetBulkPayloadsFromRow_(
            round,
            "care-round"
        );

        expect(requests[0]?.payload).toMatchObject({
            events: ["Support"],
            supportAction: "Add",
            supportDetails: "Small stake",
        });
        expect(
            context.saveWebObservation(required(requests[0]).payload)
        ).toMatchObject({ ok: true });
        expect(
            required(workbook.history.__rows[2]).slice(58, 60)
        ).toStrictEqual(["Add", "Small stake"]);
    });

    it("guards every appended History destination and installs native numeric/enum validation", () => {
        expect.hasAssertions();

        const history = createHistorySheet();
        const context = loadAppsScript(history);
        for (let index = 45; index < 60; index += 1) {
            const header = required(history.__rows[0]);
            const original = header[index];
            header[index] = "Unexpected";

            expect(() => {
                context.ensureHistoryCareColumns_(history);
            }).toThrow(/must be/v);

            header[index] = original;
        }
        history.__validationCells.add("2:45");
        for (let column = 46; column <= 60; column += 1)
            history.__validationCells.add(`2:${column}`);
        context.ensureHistoryCareColumns_(history, true);

        expect(history.__validationCells.has("2:45")).toBe(true);
        expect(history.__validationCells.has("2:46")).toBe(false);
        expect(history.__validationCells.has("2:48")).toBe(false);
        expect(history.__validationCells.has("2:49")).toBe(false);
        expect(history.__validationCells.has("2:50")).toBe(false);
        expect(history.__validationCells.has("2:60")).toBe(false);
        expect(history.__validationCells.has("2:47")).toBe(true);
        expect(history.__validationCells.has("2:51")).toBe(true);

        const header = required(history.__rows[0]);
        header[45] = "";
        const row = emptyCells(60);
        row[45] = "Existing";
        history.__rows.push(row);

        expect(() => {
            context.ensureHistoryCareColumns_(history);
        }).toThrow(/existing data/v);

        row[45] = "";
        context.ensureHistoryCareColumns_(history);

        expect(header[45]).toBe("Mist targets");
    });
});

describe("care schema destination and optional validation guards", () => {
    it.each(Array.from({ length: 15 }, (_, index) => 37 + index))(
        "preserves occupied appended App entries column %s and formulas displaying blank",
        (index) => {
            expect.hasAssertions();

            for (const input of [
                { formula: "", value: 0 },
                { formula: '=IF(TRUE,"",1)', value: "" },
            ]) {
                const headers = [...appSheetEntryHeaders];
                headers[index] = "";
                const row = emptyCells(52);
                row[index] = input.value;
                const formulas = emptyCells(52);
                formulas[index] = input.formula;
                const entries = createDataSheet(
                    "App entries",
                    [headers, row],
                    [[], formulas]
                );
                const before = structuredClone(entries.__rows);
                const context = loadAppsScript(createHistorySheet());

                expect(() =>
                    context.ensureAppSheetEntryColumns_(entries, true)
                ).toThrow(
                    "contains existing data; review before adding care events."
                );
                expect(entries.__rows).toStrictEqual(before);
                expect(
                    entries.getRange(2, index + 1).getFormulas()
                ).toStrictEqual([[input.formula]]);
            }
        }
    );

    it("adds care headers to a pre-expanded blank grid without altering an existing formula", () => {
        expect.hasAssertions();

        const headers = [
            ...appSheetEntryHeaders.slice(0, 37),
            ...emptyCells(15),
        ];
        const row = emptyCells(52);
        row[0] = "existing-queued-id";
        const formulas = emptyCells(52);
        formulas[11] = '="preserved note"';
        const entries = createDataSheet(
            "App entries",
            [headers, row],
            [[], formulas]
        );
        const context = loadAppsScript(createHistorySheet());

        expect(context.ensureAppSheetEntryColumns_(entries, true)).toBe(true);
        expect(headers).toStrictEqual(appSheetEntryHeaders);
        expect(entries.getRange(2, 12).getFormulas()).toStrictEqual([
            ['="preserved note"'],
        ]);
        expect(row[0]).toBe("existing-queued-id");
    });

    it("leaves unrelated native validation intact when optional care columns are absent", () => {
        expect.hasAssertions();

        const sheet = createDataSheet("Partial schema", [
            ["Unrelated", "Temperature target"],
        ]);
        const context = loadAppsScript(createHistorySheet());
        context.clearCareColumnValidations_(sheet, ["Unrelated"]);

        expect(sheet.__dataValidationCalls).toStrictEqual([]);

        context.configureCareColumns_(sheet, [
            "Unrelated",
            "Temperature target",
        ]);

        expect(sheet.__dataValidationCalls).toHaveLength(1);
        expect(sheet.__dataValidationCalls[0]).toMatchObject({
            column: 2,
            columnCount: 1,
            validation: { type: "ONE_OF_LIST", values: ["Air", "Soil"] },
        });
    });
});

describe("leaf VPD canonical retry identity", () => {
    it("archives raw AppSheet Fahrenheit Leaf inputs in canonical Celsius and preserves paired zero humidity", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const entries = required(workbook.sheets.get("App entries"));
        const entry = emptyCells(appSheetEntryHeaders.length);
        entry[0] = "leaf-staging-fixture";
        entry[2] = "P01";
        entry[3] = "Leaf VPD";
        entry[26] = "Queued";
        entry[52] = 68;
        entry[53] = "F";
        entry[54] = 77;
        entry[55] = "F";
        entry[56] = 0;
        entry[58] = "Calculated";
        entries.__rows.push(entry);

        expect(context.processQueuedAppSheetEntries()).toMatchObject({
            savedCount: 1,
        });
        expect(required(workbook.history.__rows[1]).slice(60)).toStrictEqual([
            20,
            "F",
            25,
            "F",
            0,
            2.3383,
            "Calculated",
        ]);
        expect(context.processQueuedAppSheetEntries()).toMatchObject({
            savedCount: 0,
        });
        expect(workbook.history.__rows).toHaveLength(2);
    });

    it.each([
        { leafTemperature: 30 },
        { leafAirTemperature: 30 },
        { leafHumidity: 0 },
        { leafTemperature: 68, leafTemperatureUnit: "F" },
        { leafAirTemperature: 77, leafAirTemperatureUnit: "F" },
        { leafVpd: 0.7544, leafVpdSource: "Device" },
    ])("rejects a changed calculated Leaf retry %j", (change) => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            events: ["Leaf VPD"],
            leafAirTemperature: 25,
            leafAirTemperatureUnit: "C",
            leafHumidity: 50,
            leafTemperature: 20,
            leafTemperatureUnit: "C",
            leafVpdSource: "Calculated",
            observedAt: "2026-10-15T16:00:00Z",
            plantId: "P01",
            requestId: "garden-leaf-retry-fixture",
        };

        expect(context.saveWebObservation(payload)).toMatchObject({
            historyRows: 1,
            ok: true,
        });
        expect(context.saveWebObservation(payload)).toMatchObject({
            duplicate: true,
        });
        expect(() =>
            context.saveWebObservation({ ...payload, ...change })
        ).toThrow("This retry no longer matches");
        expect(workbook.history.__rows).toHaveLength(2);
    });

    it("rejects a changed device VPD retry", () => {
        expect.hasAssertions();

        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            globals: workbook.globals,
            spreadsheet: workbook.spreadsheet,
        });
        const payload = {
            events: ["Leaf VPD"],
            leafVpd: 0,
            leafVpdSource: "Device",
            observedAt: "2026-10-15T16:00:00Z",
            plantId: "P01",
            requestId: "garden-leaf-device-retry",
        };

        expect(context.saveWebObservation(payload)).toMatchObject({
            historyRows: 1,
            ok: true,
        });
        expect(() =>
            context.saveWebObservation({ ...payload, leafVpd: 1 })
        ).toThrow("This retry no longer matches");
        expect(workbook.history.__rows).toHaveLength(2);
    });
});

describe("october houseplant enrollment", () => {
    it.each([
        "P39",
        "P40",
        "P41",
    ])(
        "saves and retries a real %s weight without inventing a watering or setup event",
        (plantId) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook([plantId]);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            const payload = {
                events: ["Weigh"],
                observedAt: "2026-10-21T12:00:00Z",
                plantId,
                requestId: `houseplant-weight-${plantId}`,
                weight: 123,
            };

            expect(context.saveWebObservation(payload)).toMatchObject({
                duplicate: false,
                historyRows: 1,
            });
            expect(context.saveWebObservation(payload)).toMatchObject({
                duplicate: true,
            });
            expect(() =>
                context.saveWebObservation({ ...payload, weight: 124 })
            ).toThrow(/retry no longer matches/iv);
            expect(workbook.history.__rows).toHaveLength(2);
            expect(
                required(workbook.history.__rows[1]).slice(1, 5)
            ).toStrictEqual([
                plantId,
                "Weigh",
                "Routine",
                123,
            ]);
            expect(
                context.baselineViewRow_(38, { id: plantId, name: plantId })[7]
            ).toBe('="Manual houseplant care; inspect mix and drainage"');

            const baseline = context.baselineViewRow_(38, {
                id: plantId,
                name: plantId,
            });
            for (const index of [
                22,
                24,
                25,
                30,
                31,
                34,
            ])
                expect(baseline[index]).toBe('=""');

            expect(baseline[9]).toBe(
                '="Manual substrate and plant-condition check"'
            );
            expect(baseline[11]).toBe(
                '="Manual houseplant care; inspect mix and drainage"'
            );
            expect(baseline[32]).toBe('="Manual houseplant care"');
            expect(context.wateringRecommendation_(plantId, {})).toMatchObject({
                date: "",
                guidance: expect.stringContaining(
                    "do not use a cactus dry-weight plateau"
                ),
            });
        }
    );

    it("rejects occupied appended bulk columns before changing the existing schema", () => {
        expect.hasAssertions();

        const legacy = createDataSheet("App bulk", [
            [...appSheetBulkHeaders.slice(0, 74), "Owner field"],
            [...emptyCells(74), "Preserve owner value"],
        ]);
        const before = structuredClone(legacy.__rows);
        const context = loadAppsScript(createHistorySheet());

        expect(() => context.migrateLegacyAppSheetBulkSheet_(legacy)).toThrow(
            "Unexpected App bulk columns after BV"
        );
        expect(legacy.__rows).toStrictEqual(before);
    });

    it.each([
        { column: 61, plantId: "P38", width: 74 },
        { column: 74, plantId: "P39", width: 76 },
        { column: 75, plantId: "P40", width: 76 },
    ])(
        "processes a $width-column $plantId pre-enrollment round and appends new columns only on explicit migration",
        ({ column, plantId, width }) => {
            expect.hasAssertions();

            const workbook = createLoggerWorkbook([plantId]);
            const round = emptyCells(width);
            round[0] = "PRE-ENROLLMENT-ROUND";
            round[appSheetBulkActionIndex] = "Weigh";
            round[column] = 450;
            round[73] = "Historical support details";
            round[appSheetBulkStatusIndex] = "Queued";
            const legacy = createDataSheet("App bulk", [
                appSheetBulkHeaders.slice(0, width),
                round,
            ]);
            legacy.setParent(workbook.spreadsheet);
            workbook.sheets.set("App bulk", legacy);
            const context = loadAppsScript(workbook.history, {
                globals: workbook.globals,
                spreadsheet: workbook.spreadsheet,
            });
            context.processQueuedAppSheetEntries();

            expect(legacy.getLastColumn()).toBe(width);
            expect(round[appSheetBulkStatusIndex]).toBe("Saved");
            expect(required(workbook.history.__rows[1])[1]).toBe(plantId);
            expect(required(workbook.history.__rows[1])[4]).toBe(450);

            const before = structuredClone(round);

            expect(context.migrateLegacyAppSheetBulkSheet_(legacy)).toBe(true);
            expect(legacy.__rows[0]).toStrictEqual(appSheetBulkHeaders);
            expect(round.slice(0, width)).toStrictEqual(before);
            expect(round.slice(width)).toStrictEqual(
                emptyCells(appSheetBulkHeaders.length - width)
            );
            expect(context.migrateLegacyAppSheetBulkSheet_(legacy)).toBe(false);
        }
    );
});
