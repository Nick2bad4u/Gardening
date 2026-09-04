import fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

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
const appSheetBulkConditionIndex = appSheetBulkRotationIndex + 1;
const appSheetBulkSoilMoistureIndex = appSheetBulkRotationIndex + 2;
const appSheetBulkPestIssueIndex = appSheetBulkRotationIndex + 3;
const appSheetBulkPestTreatmentIndex = appSheetBulkRotationIndex + 4;
const appSheetBulkNutrientsUsedIndex = appSheetBulkRotationIndex + 5;
const appSheetBulkNutrientProductIndex = appSheetBulkRotationIndex + 6;
const appSheetBulkNutrientAmountIndex = appSheetBulkRotationIndex + 7;
const appSheetBulkWateringApplicationIndex = appSheetBulkRotationIndex + 8;
const appSheetBulkWaterAmountIndex = appSheetBulkRotationIndex + 9;

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
                    expectedNurseryLabelImageUrls[plantId] || "",
            },
        ]
    )
);

function createDataValidationBuilder() {
    let validation = {};
    const builder = {
        requireValueInList(values, showDropdown) {
            validation = {
                type: "ONE_OF_LIST",
                values: Array.from(values),
                showDropdown,
            };
            return builder;
        },
        requireNumberGreaterThan(value) {
            validation = { type: "NUMBER_GREATER", values: [value] };
            return builder;
        },
        requireNumberBetween(minimum, maximum) {
            validation = {
                type: "NUMBER_BETWEEN",
                values: [minimum, maximum],
            };
            return builder;
        },
        requireCheckbox() {
            validation = { type: "BOOLEAN" };
            return builder;
        },
        setAllowInvalid(allowInvalid) {
            validation = { ...validation, allowInvalid };
            return builder;
        },
        build: () => ({ ...validation }),
    };
    return builder;
}

function createHistorySheet(
    observations = [],
    { measurementValidations = false } = {}
) {
    const rangeReads = [];
    const setValuesCalls = [];
    const clearDataValidationCalls = [];
    const protections = [];
    let maxRows = 100;
    const validationCells = new Set();
    if (measurementValidations) {
        for (let row = 2; row <= maxRows; row += 1) {
            validationCells.add(`${row}:38`);
            validationCells.add(`${row}:39`);
        }
    }
    const header = Array(42).fill("");
    historyHeaders.forEach((value, index) => {
        header[index] = value;
    });
    header[15] = "Request ID";
    historyDetailHeaders.forEach((value, index) => {
        header[16 + index] = value;
    });
    historyProvenanceHeaders.forEach((value, index) => {
        header[26 + index] = value;
    });
    historyMeasurementHeaders.forEach((value, index) => {
        header[36 + index] = value;
    });
    historyRotationHeaders.forEach((value, index) => {
        header[39 + index] = value;
    });
    historyWaterHeaders.forEach((value, index) => {
        header[40 + index] = value;
    });

    const rows = [
        header,
        ...observations.map(({ values, requestId }) => {
            const row = Array(42).fill("");
            values.forEach((value, index) => {
                row[index] = value;
            });
            row[15] = requestId;
            return row;
        }),
    ];

    function rangeValues(row, column, rowCount, columnCount) {
        return Array.from({ length: rowCount }, (_, rowOffset) =>
            Array.from(
                { length: columnCount },
                (_, columnOffset) =>
                    rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ""
            )
        );
    }

    function setRangeValues(row, column, values) {
        values.forEach((currentRow, rowOffset) => {
            const targetRow = row - 1 + rowOffset;
            rows[targetRow] ??= Array(42).fill("");
            currentRow.forEach((value, columnOffset) => {
                rows[targetRow][column - 1 + columnOffset] = value;
            });
        });
    }

    return {
        __rows: rows,
        __rangeReads: rangeReads,
        __setValuesCalls: setValuesCalls,
        __clearDataValidationCalls: clearDataValidationCalls,
        __validationCells: validationCells,
        __protections: protections,
        getName: () => "History",
        getLastRow: () => rows.length,
        getMaxColumns: () => rows[0].length,
        getMaxRows: () => maxRows,
        hideColumns: () => {},
        getProtections: () => protections,
        insertColumnsAfter(column, count) {
            rows.forEach((currentRow) => {
                currentRow.splice(column, 0, ...Array(count).fill(""));
            });
        },
        insertRowsAfter: (_row, count) => {
            maxRows += count;
        },
        getRange(row, column, rowCount = 1, columnCount = 1) {
            rangeReads.push({ row, column, rowCount, columnCount });
            const values = () =>
                rangeValues(row, column, rowCount, columnCount);
            const range = {
                getDisplayValue: () => String(values()[0][0] ?? ""),
                getDisplayValues: () =>
                    values().map((currentRow) =>
                        currentRow.map((value) => String(value ?? ""))
                    ),
                getValues: values,
                getDataValidations: () =>
                    Array.from({ length: rowCount }, (_, rowOffset) =>
                        Array.from(
                            { length: columnCount },
                            (_, columnOffset) =>
                                validationCells.has(
                                    `${row + rowOffset}:${column + columnOffset}`
                                )
                                    ? {}
                                    : null
                        )
                    ),
                createTextFinder(query) {
                    let exact = false;
                    const finder = {
                        matchEntireCell(value) {
                            exact = value;
                            return finder;
                        },
                        findAll() {
                            return rows.flatMap((currentRow, index) => {
                                const value = String(
                                    currentRow[column - 1] ?? ""
                                );
                                const matches = exact
                                    ? value === query
                                    : value.includes(query);
                                return matches
                                    ? [{ getRow: () => index + 1 }]
                                    : [];
                            });
                        },
                    };
                    return finder;
                },
                setValue(value) {
                    setRangeValues(row, column, [[value]]);
                    return range;
                },
                setValues(nextValues) {
                    setValuesCalls.push({
                        row,
                        column,
                        rowCount,
                        columnCount,
                    });
                    setRangeValues(row, column, nextValues);
                    return range;
                },
                setNote: () => range,
                setNotes: () => range,
                setNumberFormat: () => range,
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
                clearDataValidations() {
                    clearDataValidationCalls.push({
                        row,
                        column,
                        rowCount,
                        columnCount,
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
                protect() {
                    const protection = createProtection(range);
                    protections.push(protection);
                    return protection;
                },
                clearContent() {
                    setRangeValues(
                        row,
                        column,
                        Array.from({ length: rowCount }, () =>
                            Array(columnCount).fill("")
                        )
                    );
                    return range;
                },
            };
            return range;
        },
    };
}

function loadAppsScript(history, options = {}) {
    const spreadsheet = options.spreadsheet ?? {
        getSheetByName: (name) => (name === "History" ? history : null),
    };
    const context = vm.createContext({
        console,
        Date,
        Map,
        Object,
        Set,
        URL,
        SpreadsheetApp: options.SpreadsheetApp ?? {
            flush: () => {},
            newDataValidation: createDataValidationBuilder,
            openById: () => spreadsheet,
            ProtectionType: { RANGE: "RANGE" },
        },
        Utilities: options.Utilities ?? {
            formatDate: (value) => value.toISOString(),
            getUuid: () => "test-request-id",
        },
        ...options.globals,
        encodeURIComponent,
    });
    vm.runInContext(source, context, { filename: sourcePath });
    return context;
}

function createDataSheet(name, rows, formulas = []) {
    let parent = null;
    const protections = [];
    const dataValidationCalls = [];
    const sheet = {
        __rows: rows,
        __protections: protections,
        __dataValidationCalls: dataValidationCalls,
        __setParent(value) {
            parent = value;
        },
        getParent: () => parent,
        getIndex: () => 1,
        getName: () => name,
        getLastRow: () => rows.length,
        getLastColumn: () =>
            Math.max(
                0,
                ...rows.map((row) => row.length),
                ...formulas.map((row) => row.length)
            ),
        getMaxColumns: () =>
            Math.max(
                26,
                ...rows.map((row) => row.length),
                ...formulas.map((row) => row.length)
            ),
        getMaxRows: () => Math.max(rows.length, 100),
        getProtections: () => protections,
        hideColumns: () => sheet,
        insertColumnsAfter(column, count) {
            rows.forEach((currentRow) => {
                currentRow.splice(column, 0, ...Array(count).fill(""));
            });
            formulas.forEach((currentRow) => {
                currentRow.splice(column, 0, ...Array(count).fill(""));
            });
            return sheet;
        },
        setColumnWidth: () => sheet,
        setColumnWidths: () => sheet,
        setFrozenRows: () => sheet,
        setHiddenGridlines: () => sheet,
        getRange(row, column, rowCount = 1, columnCount = 1) {
            const select = (source) =>
                Array.from({ length: rowCount }, (_, rowOffset) =>
                    Array.from(
                        { length: columnCount },
                        (_, columnOffset) =>
                            source[row - 1 + rowOffset]?.[
                                column - 1 + columnOffset
                            ] ?? ""
                    )
                );
            const range = {
                getColumn: () => column,
                getLastColumn: () => column + columnCount - 1,
                getLastRow: () => row + rowCount - 1,
                getNumColumns: () => columnCount,
                getNumRows: () => rowCount,
                getRow: () => row,
                getSheet: () => sheet,
                getDisplayValue: () => String(select(rows)[0][0] ?? ""),
                getDisplayValues: () =>
                    select(rows).map((currentRow) =>
                        currentRow.map((value) => String(value ?? ""))
                    ),
                getFormulas: () => select(formulas),
                getFormula: () => select(formulas)[0][0] ?? "",
                getValue: () => select(rows)[0][0] ?? "",
                getValues: () => select(rows),
                clearContent() {
                    Array.from({ length: rowCount }, (_, rowOffset) =>
                        Array.from(
                            { length: columnCount },
                            (_, columnOffset) => {
                                rows[row - 1 + rowOffset] ??= [];
                                rows[row - 1 + rowOffset][
                                    column - 1 + columnOffset
                                ] = "";
                            }
                        )
                    );
                    return range;
                },
                setBackground: () => range,
                setFontColor: () => range,
                setFontWeight: () => range,
                setNote: () => range,
                setNumberFormat: () => range,
                setDataValidation(validation) {
                    dataValidationCalls.push({
                        row,
                        column,
                        rowCount,
                        columnCount,
                        validation,
                    });
                    return range;
                },
                protect() {
                    const protection = createProtection(range);
                    protections.push(protection);
                    return protection;
                },
                setValue(value) {
                    rows[row - 1] ??= [];
                    rows[row - 1][column - 1] = value;
                    return range;
                },
                setFormula(value) {
                    formulas[row - 1] ??= [];
                    formulas[row - 1][column - 1] = value;
                    return range;
                },
                setValues(values) {
                    values.forEach((valuesRow, rowOffset) => {
                        rows[row - 1 + rowOffset] ??= [];
                        valuesRow.forEach((value, columnOffset) => {
                            rows[row - 1 + rowOffset][
                                column - 1 + columnOffset
                            ] = value;
                        });
                    });
                    return range;
                },
            };
            return range;
        },
    };
    return sheet;
}

function createProtection(initialRange) {
    let description = "";
    let protectedRange = initialRange;
    let warningOnly = false;
    const protection = {
        getDescription: () => description,
        getRange: () => protectedRange,
        isWarningOnly: () => warningOnly,
        setDescription(value) {
            description = value;
            return protection;
        },
        setRange(value) {
            protectedRange = value;
            return protection;
        },
        setWarningOnly(value) {
            warningOnly = value;
            return protection;
        },
    };
    return protection;
}

function createLoggerWorkbook(plantIds = ["P01"], historyOptions = {}) {
    const trackerHeader = Array(15).fill("");
    const trackerRows = [trackerHeader];
    const trackerFormulas = [Array(15).fill("")];
    const baselineHeader = Array(20).fill("");
    baselineHeader[0] = "Plant ID";
    baselineHeader[19] = "Pot setup";
    const baselineRows = [baselineHeader];

    plantIds.forEach((plantId, index) => {
        const row = Array(15).fill("");
        row[0] = plantId;
        row[1] = `Plant ${plantId}`;
        row[2] = `Scientific ${plantId}`;
        row[14] = `Label ${index + 1}`;
        trackerRows.push(row);

        const formulas = Array(15).fill("");
        formulas[13] = `=HYPERLINK("https://example.test/${plantId}","Guide")`;
        trackerFormulas.push(formulas);
        const baselineRow = Array(20).fill("");
        baselineRow[0] = plantId;
        baselineRow[19] = 1;
        baselineRows.push(baselineRow);
    });

    const history = createHistorySheet([], historyOptions);
    const historyView = createDataSheet("History view", [[""]], [[""]]);
    const sheets = new Map([
        [
            "Plant tracker",
            createDataSheet("Plant tracker", trackerRows, trackerFormulas),
        ],
        ["Baselines", createDataSheet("Baselines", baselineRows)],
        ["History", history],
        ["History view", historyView],
        [
            "App entries",
            createDataSheet("App entries", [[...appSheetEntryHeaders]]),
        ],
        ["App bulk", createDataSheet("App bulk", [[...appSheetBulkHeaders]])],
    ]);
    const spreadsheet = {
        getSheetByName: (name) => sheets.get(name) ?? null,
        getSpreadsheetTimeZone: () => "America/New_York",
        insertSheet(name) {
            const sheet = createDataSheet(name, []);
            sheet.__setParent(spreadsheet);
            sheets.set(name, sheet);
            return sheet;
        },
    };
    sheets.forEach((sheet) => {
        if (sheet.__setParent) sheet.__setParent(spreadsheet);
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

describe("Garden logger server logic", () => {
    it("infers independent event rows from a combined observation", () => {
        const context = loadAppsScript(createHistorySheet());

        expect(
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
        ).toEqual([
            "Weigh",
            "Water",
            "Measure",
            "Check",
        ]);
        expect(
            Array.from(
                context.buildEventNames_("Weigh", "Wet", 420, "", "", "", "")
            )
        ).toEqual(["Weigh"]);
    });

    it("escapes formula-like notes and validates retry identifiers", () => {
        const context = loadAppsScript(createHistorySheet());

        expect(context.safeSheetText_('=IMPORTXML("x")')).toBe(
            '\'=IMPORTXML("x")'
        );
        expect(() => context.normalizeRequestId_("", true)).toThrow(
            /missing its retry key/
        );
        expect(context.normalizeRequestId_("garden-1234567890", true)).toBe(
            "garden-1234567890"
        );
        expect(context.normalizeRequestId_("", false)).toBe("test-request-id");
        expect(() => context.normalizeRequestId_("short", false)).toThrow(
            /request ID is not valid/i
        );
        expect(context.normalizeRecentLimit_(25)).toBe(25);
        expect(context.normalizeRecentLimit_(999)).toBe(10);
        expect(context.normalizeWeightState_("", "")).toBe("");
        expect(context.normalizeWeightState_("", 42)).toBe("Routine");
        expect(() => context.normalizeWeightState_("Invalid", 42)).toThrow(
            /Weight state must be/i
        );
        expect(() =>
            context.validateMeasurementEvents_(["Weigh"], "", "", "")
        ).toThrow(/Enter a weight/i);
        expect(() =>
            context.validateMeasurementEvents_(["Measure"], "", "", "")
        ).toThrow(/height or width/i);
        context.validateMeasurementEvents_(["Check"], "", "", "");
        expect(context.normalizeMeasurementQuality_("", ["Check"])).toBe("");
        expect(context.normalizeMeasurementQuality_("", ["Measure"])).toBe(
            "Estimated"
        );
        expect(
            context.normalizeMeasurementQuality_("Measured", ["Measure"])
        ).toBe("Measured");
        expect(() =>
            context.normalizeMeasurementQuality_("Approximate", ["Measure"])
        ).toThrow(/Measured or Estimated/i);
        expect(context.normalizeMeasurementMethod_("", ["Check"])).toBe("");
        expect(context.normalizeMeasurementMethod_("", ["Measure"])).toBe(
            "Unspecified"
        );
        expect(context.normalizeMeasurementMethod_("Ruler", ["Measure"])).toBe(
            "Ruler"
        );
        expect(() =>
            context.normalizeMeasurementMethod_("Laser", ["Measure"])
        ).toThrow(/must be one of/i);
        expect(context.normalizeMeasurementUnit_("", ["Check"])).toBe("");
        expect(context.normalizeMeasurementUnit_("", ["Measure"])).toBe("cm");
        expect(context.normalizeMeasurementUnit_("inches", ["Measure"])).toBe(
            "in"
        );
        expect(() =>
            context.normalizeMeasurementUnit_("feet", ["Measure"])
        ).toThrow(/in or cm/i);
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
        expect(() =>
            context.prepareWebObservation_({}, { plantId: "P99" }, new Map())
        ).toThrow(/valid plant/i);
        expect(context.normalizeRecentLimit_("not-a-number")).toBe(10);
    });

    it("reports a completed single-plant request as saved", () => {
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
            state: "saved",
            expectedCount: 1,
            savedCount: 1,
        });
    });

    it("does not treat a reserved but incomplete History row as saved", () => {
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
            state: "partial",
            expectedCount: 1,
            savedCount: 0,
        });
    });

    it("checks every per-plant request in a bulk watering round", () => {
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
                requestId,
                plantIds: ["P01", "P02"],
            })
        ).toMatchObject({
            state: "saved",
            expectedCount: 2,
            savedCount: 2,
        });
    });

    it("returns the latest completed-cycle dry anchor and ignores open-cycle lows", () => {
        const history = createHistorySheet([]);
        const context = loadAppsScript(history);
        const weightRow = ({
            plantId,
            observedAt,
            event = "Weigh",
            weight,
            setup = 1,
            batch = "",
            status = "",
        }) => {
            const row = Array(42).fill("");
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
                plantId: "P01",
                observedAt: "2026-08-01T12:00:00Z",
                weight: 200,
                setup: 1,
            }),
            weightRow({
                plantId: "P01",
                observedAt: "2026-08-02T12:00:00Z",
                weight: 500,
                setup: 2,
                batch: "wet-1",
            }),
            weightRow({
                plantId: "P01",
                observedAt: "2026-08-02T12:00:00Z",
                event: "Water",
                setup: 2,
                batch: "wet-1",
            }),
            weightRow({
                plantId: "P01",
                observedAt: "2026-08-03T12:00:00Z",
                weight: 470,
                setup: 2,
            }),
            weightRow({
                plantId: "P01",
                observedAt: "2026-08-04T12:00:00Z",
                weight: 450,
                setup: 2,
            }),
            weightRow({
                plantId: "P01",
                observedAt: "2026-08-05T12:00:00Z",
                weight: 510,
                setup: 2,
                batch: "wet-2",
            }),
            weightRow({
                plantId: "P01",
                observedAt: "2026-08-05T12:00:00Z",
                event: "Water",
                setup: 2,
                batch: "wet-2",
            }),
            weightRow({
                plantId: "P01",
                observedAt: "2026-08-06T12:00:00Z",
                weight: 430,
                setup: 2,
            }),
            weightRow({
                plantId: "P01",
                observedAt: "2026-08-06T12:30:00Z",
                weight: 400,
                setup: 2,
                status: "Removed",
            }),
            weightRow({
                plantId: "P02",
                observedAt: "2026-08-07T12:00:00Z",
                weight: 390,
            }),
        ];
        const result = context.dryOrLowestWeightsFromRows_(rows);

        expect(
            [...result.entries()].map(([plantId, value]) => ({
                plantId,
                ...value,
            }))
        ).toEqual([
            {
                plantId: "P01",
                weight: 450,
                observedAt: "2026-08-04T12:00:00Z",
                basis: "Completed cycle",
            },
        ]);
        expect([...context.inferredWeightStatesByRow_(rows).entries()]).toEqual(
            [
                [1, "Wet"],
                [3, "Routine"],
                [4, "Dry"],
                [5, "Wet"],
                [7, "Routine"],
                [9, "Routine"],
            ]
        );
    });

    it("scopes inferred weight states to the current setup and treats a lone Water + weigh as Wet", () => {
        const context = loadAppsScript(createHistorySheet([]));
        const row = ({
            event = "Weigh",
            weight = "",
            setup = 1,
            batch = "",
            observedAt = "2026-08-01T12:00:00Z",
        }) => {
            const values = Array(42).fill("");
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
            row({ weight: 100, setup: 1 }),
            row({ weight: 250, setup: 2, observedAt: "2026-08-02T12:00:00Z" }),
            row({ weight: 200, setup: 2, observedAt: "2026-08-03T12:00:00Z" }),
        ];
        expect(
            context.dryOrLowestWeightsFromRows_(historyRows).get("P01")
        ).toBeUndefined();
        expect([
            ...context.inferredWeightStatesByRow_(historyRows).values(),
        ]).toEqual(["Routine", "Routine"]);

        const waterBatchRows = [
            row({
                event: "Water",
                setup: 2,
                batch: "same-save",
                observedAt: "2026-08-04T12:00:00Z",
            }),
            row({
                weight: 500,
                setup: 2,
                batch: "same-save",
                observedAt: "2026-08-04T12:00:00Z",
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
                weight: 300,
                setup: 2,
                batch: "previous-cycle",
                observedAt: "2026-08-05T12:00:00Z",
            }),
            row({
                weight: 450,
                setup: 2,
                batch: "new-watering",
                observedAt: "2026-08-05T12:00:00Z",
            }),
            row({
                event: "Water",
                setup: 2,
                batch: "new-watering",
                observedAt: "2026-08-05T12:00:00Z",
            }),
        ];
        expect([
            ...context.inferredWeightStatesByRow_(tiedTimestampRows).values(),
        ]).toEqual(["Dry", "Wet"]);
        expect(
            context.dryOrLowestWeightsFromRows_(tiedTimestampRows).get("P01")
        ).toMatchObject({ weight: 300, basis: "Completed cycle" });
    });

    it("uses the first weight within five days after Water as Wet and ages later weights to Routine", () => {
        const context = loadAppsScript(createHistorySheet([]));
        const row = ({ event = "Weigh", observedAt, weight = "" }) => {
            const values = Array(42).fill("");
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
        expect([
            ...context.inferredWeightStatesByRow_(withinWindow).values(),
        ]).toEqual(["Wet", "Routine"]);

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
        expect([
            ...context.inferredWeightStatesByRow_(outsideWindow).values(),
        ]).toEqual(["Routine"]);

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
        expect([
            ...context.inferredWeightStatesByRow_(nextWaterWins).values(),
        ]).toEqual(["Wet"]);

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
        expect([
            ...context.inferredWeightStatesByRow_(exactBoundary).values(),
        ]).toEqual(["Wet"]);
    });

    it("builds deterministic dry-weight and forecast formulas for the workbook views", () => {
        const context = loadAppsScript(createHistorySheet([]));
        const baselineRow = context.baselineViewRow_(2, {
            id: "P01",
            name: "Test plant",
        });

        expect(baselineRow).toHaveLength(34);
        expect(baselineRow[22]).toMatch(
            /dryKeys,IF\(waterCount,MAP\(waterKeys/
        );
        expect(baselineRow[22]).toMatch(/lastDryKey/);
        expect(baselineRow[24]).toMatch(
            /wetKeys,IF\(waterCount,MAP\(waterKeys/
        );
        expect(baselineRow[24]).toContain("weightDates<=wd+5");
        expect(baselineRow[24]).toMatch(/lastWetKey/);
        expect(baselineRow[25]).toContain('Y2<=W2),"",Y2-W2');
        expect(baselineRow[20]).toContain("currentWetKey");
        expect(baselineRow[20]).toContain("weightKeys>=currentWetKey");
        expect(baselineRow[20]).not.toContain("History!$N$2:$N$5000");
        expect(baselineRow[30]).toContain("SLOPE(logResiduals,elapsed)");
        expect(baselineRow[30]).toContain("RSQ(logResiduals,elapsed)");
        expect(baselineRow[30]).toContain("ROWS(recent)<4");
        expect(baselineRow[30]).toContain("span<3");
        expect(baselineRow[30]).toContain("decay*MAX(0,currentResidual)");
        expect(baselineRow[30]).not.toContain("History!$N$2:$N$5000");
        expect(baselineRow[31]).toContain("MAX(2,Z2*0.05)");
        expect(baselineRow[31]).toContain("LN(residual/tolerance)");
        expect(baselineRow[12]).toBe('=IF(OR(AE2="",C2<=0),"",AE2/C2)');
        expect(baselineRow[32]).toMatch(/Need a completed dry cycle/);
        expect(baselineRow[32]).toContain("Provisional curve");
        expect(baselineRow[32]).toContain("<0.85");
        expect(baselineRow[33]).toMatch(/DATE\(9999,12,31\)/);
        expect(context.plantPageHistoryFormula_("P01")).toContain(
            "weightDates<=wd+5"
        );
        expect(context.plantPageHistoryFormula_("P01")).toContain(
            'IF(COUNTIF(wetKeys,currentKey),"Wet"'
        );
        expect(context.plantPageHistoryFormula_("P01")).toContain(
            'pounds,MAP(weights,LAMBDA(w,IF(w="","",w/453.59237)))'
        );
    });

    it("rebuilds every workbook surface through the public refresh command", () => {
        const flushes = [];
        const context = loadAppsScript(createHistorySheet([]), {
            SpreadsheetApp: {
                flush: () => flushes.push("flush"),
                newDataValidation: createDataValidationBuilder,
                ProtectionType: { RANGE: "RANGE" },
            },
        });
        const calls = [];
        const spreadsheet = {
            toast: (...args) => calls.push(["toast", ...args]),
        };
        const plants = [{ id: "P01" }, { id: "P02" }];
        context.getGardenSpreadsheet_ = () => spreadsheet;
        context.workbookPlantRecords_ = () => plants;
        context.refreshBaselineView_ = (...args) =>
            calls.push(["baselines", ...args]);
        context.refreshDashboardView_ = (...args) =>
            calls.push(["dashboard", ...args]);
        context.refreshPlantPage_ = (...args) => calls.push(["plant", ...args]);
        context.organizeWorkbookSheets_ = (...args) =>
            calls.push(["organize", ...args]);

        expect(context.refreshGardenWorkbook()).toEqual({
            loggerVersion: "5.16.3",
            plantPages: 2,
            baselineColumns: 34,
            dashboardColumns: 21,
        });
        expect(calls.filter(([name]) => name === "plant")).toHaveLength(2);
        expect(calls.map(([name]) => name)).toEqual([
            "baselines",
            "dashboard",
            "plant",
            "plant",
            "organize",
            "toast",
        ]);
        expect(flushes).toEqual(["flush"]);
    });

    it("refreshes resumable plant-page batches without rebuilding shared views", () => {
        const flushes = [];
        const context = loadAppsScript(createHistorySheet([]), {
            SpreadsheetApp: {
                flush: () => flushes.push("flush"),
                newDataValidation: createDataValidationBuilder,
                ProtectionType: { RANGE: "RANGE" },
            },
        });
        const calls = [];
        const spreadsheet = {
            toast: (...args) => calls.push(["toast", ...args]),
        };
        const plants = Array.from({ length: 30 }, (_, index) => ({
            id: `P${String(index + 1).padStart(2, "0")}`,
        }));
        context.getGardenSpreadsheet_ = () => spreadsheet;
        context.workbookPlantRecords_ = () => plants;
        context.refreshBaselineView_ = (...args) =>
            calls.push(["baselines", ...args]);
        context.refreshDashboardView_ = (...args) =>
            calls.push(["dashboard", ...args]);
        context.refreshPlantPage_ = (...args) => calls.push(["plant", ...args]);
        context.organizeWorkbookSheets_ = (...args) =>
            calls.push(["organize", ...args]);

        expect(context.refreshGardenWorkbookPages01To10()).toEqual({
            loggerVersion: "5.16.3",
            firstPlant: "P01",
            lastPlant: "P10",
            plantPages: 10,
        });
        expect(context.refreshGardenWorkbookPages11To20()).toEqual({
            loggerVersion: "5.16.3",
            firstPlant: "P11",
            lastPlant: "P20",
            plantPages: 10,
        });
        expect(context.refreshGardenWorkbookPages21To30()).toEqual({
            loggerVersion: "5.16.3",
            firstPlant: "P21",
            lastPlant: "P30",
            plantPages: 10,
        });
        const pageCalls = calls.filter(([name]) => name === "plant");
        expect(pageCalls).toHaveLength(30);
        expect(pageCalls[0].slice(3)).toEqual([0, plants[0]]);
        expect(pageCalls[9].slice(3)).toEqual([9, plants[9]]);
        expect(pageCalls[10].slice(3)).toEqual([10, plants[10]]);
        expect(pageCalls[19].slice(3)).toEqual([19, plants[19]]);
        expect(pageCalls[20].slice(3)).toEqual([20, plants[20]]);
        expect(pageCalls[29].slice(3)).toEqual([29, plants[29]]);
        expect(calls.filter(([name]) => name === "organize")).toHaveLength(3);
        expect(calls.filter(([name]) => name === "toast")).toHaveLength(3);
        expect(calls.some(([name]) => name === "baselines")).toBe(false);
        expect(calls.some(([name]) => name === "dashboard")).toBe(false);
        expect(flushes).toEqual([
            "flush",
            "flush",
            "flush",
        ]);
    });

    it("reads all 30 workbook plant records and rejects an incomplete tracker", () => {
        const plantIds = Array.from(
            { length: 30 },
            (_, index) => `P${String(index + 1).padStart(2, "0")}`
        );
        const complete = createLoggerWorkbook(plantIds);
        complete.sheets.get("Plant tracker").__rows.push(Array(15).fill(""));
        const context = loadAppsScript(complete.history, {
            spreadsheet: complete.spreadsheet,
        });
        const plants = context.workbookPlantRecords_(complete.spreadsheet);

        expect([...plants].map(({ id }) => id)).toEqual(plantIds);
        expect(plants[0]).toMatchObject({
            name: "Plant P01",
            scientificName: "Scientific P01",
            label: "Label 1",
            fieldGuideUrl: "https://example.test/P01",
            trackerRow: 2,
        });

        const incomplete = createLoggerWorkbook(plantIds.slice(0, -1));
        expect(() =>
            context.workbookPlantRecords_(incomplete.spreadsheet)
        ).toThrow(/P30/);
    });

    it("builds dashboard links and grows sheet capacity only when needed", () => {
        const context = loadAppsScript(createHistorySheet([]));
        const page = { getSheetId: () => 12345 };
        const spreadsheet = {
            getSheetByName: (name) => (name === "P01" ? page : null),
            getSheets: () => [],
        };
        const row = context.dashboardViewRow_(
            spreadsheet,
            { id: "P01", trackerRow: 2 },
            0
        );

        expect(row).toHaveLength(21);
        expect(row[0]).toBe('=HYPERLINK("#gid=12345","View")');
        expect(row[5]).toBe("=Baselines!D2");
        expect(row[6]).toBe("=Baselines!C2");
        expect(row[7]).toBe("=Baselines!W2");
        expect(row[8]).toBe("=Baselines!AF2");

        const inserts = [];
        context.ensureSheetRowCapacity_(
            {
                getMaxRows: () => 5,
                insertRowsAfter: (...args) => inserts.push(args),
            },
            8
        );
        context.ensureSheetRowCapacity_(
            {
                getMaxRows: () => 10,
                insertRowsAfter: (...args) => inserts.push(args),
            },
            8
        );
        expect(inserts).toEqual([[5, 3]]);
        expect(context.formulaString_('A "quoted" label')).toBe(
            'A ""quoted"" label'
        );
        expect(context.formulaString_(null)).toBe("");
    });

    it("removes the legacy A36:R36 footer merge before writing P30", () => {
        const context = loadAppsScript(createHistorySheet([]));
        const mergedRanges = [
            { row: 36, column: 1, rowCount: 1, columnCount: 18 },
        ];
        const cells = new Map();
        const overlaps = (left, right) =>
            left.row <= right.row + right.rowCount - 1 &&
            left.row + left.rowCount - 1 >= right.row &&
            left.column <= right.column + right.columnCount - 1 &&
            left.column + left.columnCount - 1 >= right.column;
        const mergedCell = (row, column) =>
            mergedRanges.find(
                (range) =>
                    row >= range.row &&
                    row < range.row + range.rowCount &&
                    column >= range.column &&
                    column < range.column + range.columnCount
            );
        const dashboard = {
            getName: () => "Dashboard",
            getMaxRows: () => 254,
            getMaxColumns: () => 21,
            getRange(row, column, rowCount = 1, columnCount = 1) {
                const coordinates = { row, column, rowCount, columnCount };
                const range = {
                    breakApart() {
                        for (
                            let index = mergedRanges.length - 1;
                            index >= 0;
                            index -= 1
                        ) {
                            if (overlaps(coordinates, mergedRanges[index])) {
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
                    setValue(value) {
                        cells.set(`${row}:${column}`, value);
                        return range;
                    },
                    setFormula(formula) {
                        cells.set(`${row}:${column}`, formula);
                        return range;
                    },
                    setValues(values) {
                        values.forEach((valuesRow, rowOffset) => {
                            valuesRow.forEach((value, columnOffset) => {
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
                            });
                        });
                        return range;
                    },
                };
                [
                    "setBackground",
                    "setFontColor",
                    "setFontSize",
                    "setFontWeight",
                    "setHorizontalAlignment",
                    "setNumberFormat",
                    "setVerticalAlignment",
                    "setWrap",
                ].forEach((method) => {
                    range[method] = () => range;
                });
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
            name: `Plant ${index + 1}`,
            label: index === 29 ? "#6" : `A${index + 1}`,
            trackerRow: index + 2,
        }));
        const pages = new Map(
            plants.map((plant, index) => [
                plant.id,
                { getSheetId: () => 1000 + index },
            ])
        );
        const spreadsheet = {
            getSheetByName: (name) =>
                name === "Dashboard" ? dashboard : pages.get(name) || null,
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
        const conditionalRule = {};
        const ruleBuilder = {
            whenTextEqualTo: () => ruleBuilder,
            setBackground: () => ruleBuilder,
            setFontColor: () => ruleBuilder,
            setBold: () => ruleBuilder,
            setRanges: () => ruleBuilder,
            build: () => conditionalRule,
        };
        const removedFilters = [];
        const makeSheet = (name, { hasFilter = false, id = 1 } = {}) => {
            const range = {};
            [
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
            ].forEach((method) => {
                range[method] = () => range;
            });
            return {
                getFilter: () =>
                    hasFilter
                        ? { remove: () => removedFilters.push(name) }
                        : null,
                getMaxColumns: () => 5,
                getMaxRows: () => 20,
                getName: () => name,
                getRange: () => range,
                getSheetId: () => id,
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
            ["P01", makeSheet("P01", { hasFilter: true, id: 101 })],
            ["P02", makeSheet("P02", { id: 102 })],
        ]);
        const spreadsheet = {
            getSheetByName: (name) => sheets.get(name) || null,
            getSheets: () => [...sheets.values()],
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
                id: "P01",
                name: "Plant one",
                scientificName: "Species one",
                fieldGuideUrl: 'https://example.test/plant?name="one"',
                trackerRow: 2,
            },
            {
                id: "P02",
                name: "Plant two",
                scientificName: "",
                fieldGuideUrl: "https://example.test/two",
                trackerRow: 3,
            },
        ];

        context.refreshBaselineView_(spreadsheet, plants);
        context.refreshDashboardView_(spreadsheet, plants);
        context.refreshPlantPage_(spreadsheet, plants, 0, plants[0]);
        context.refreshPlantPage_(spreadsheet, plants, 1, plants[1]);

        expect(removedFilters).toEqual(["P01"]);
    });

    it("moves and hides workbook helper sheets while preserving user sheets", () => {
        const context = loadAppsScript(createHistorySheet([]));
        const events = [];
        const basicSheet = (name) => ({
            name,
            hideColumns: (column) => events.push(`${name}:hide:${column}`),
        });
        const helperSheet = (name, hidden) => ({
            name,
            isSheetHidden: () => hidden,
            showSheet: () => events.push(`${name}:show`),
            hideSheet: () => events.push(`${name}:hide-sheet`),
        });
        const sheets = new Map([
            ["Dashboard", basicSheet("Dashboard")],
            ["Quick log", basicSheet("Quick log")],
            ["History", basicSheet("History")],
            ["History view", basicSheet("History view")],
            ["Integrity", helperSheet("Integrity", true)],
            ["App entries", helperSheet("App entries", false)],
        ]);
        const spreadsheet = {
            getSheetByName: (name) => sheets.get(name) || null,
            getNumSheets: () => sheets.size,
            moveActiveSheet: (index) => events.push(`move:${index}`),
            setActiveSheet: (sheet) => events.push(`active:${sheet.name}`),
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
        const context = loadAppsScript(createHistorySheet([]));
        const pages = [
            { getName: () => "Dashboard" },
            { getName: () => "P01 Moon cactus" },
            { getName: () => "P02 Feather cactus" },
        ];
        const spreadsheet = {
            getSheetByName: (name) =>
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
            /Workbook page for P03 is missing/
        );
        expect(() => context.plantPageSheet_(spreadsheet, "starter-1")).toThrow(
            /Invalid workbook plant ID/
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
        ).toThrow(/More than one workbook page/);
    });

    it("builds the mobile bootstrap from tracker, baseline, and history data", () => {
        const repotValues = Array(21).fill("");
        repotValues[0] = new Date("2026-08-10T12:00:00Z");
        repotValues[1] = "P01";
        repotValues[2] = "Repot";
        repotValues[9] = new Date("2026-08-10T12:01:00Z");
        repotValues[20] = "5 in";
        const dryWeightValues = Array(42).fill("");
        dryWeightValues[0] = new Date("2026-08-16T12:00:00Z");
        dryWeightValues[1] = "P01";
        dryWeightValues[2] = "Weigh";
        dryWeightValues[3] = "Dry";
        dryWeightValues[4] = 405;
        dryWeightValues[9] = new Date("2026-08-16T12:01:00Z");
        dryWeightValues[10] = 2;
        dryWeightValues[35] = "Active";
        const higherWeightValues = Array(42).fill("");
        higherWeightValues[0] = new Date("2026-08-15T12:00:00Z");
        higherWeightValues[1] = "P01";
        higherWeightValues[2] = "Weigh";
        higherWeightValues[3] = "Wet";
        higherWeightValues[4] = 450;
        higherWeightValues[9] = new Date("2026-08-15T12:01:00Z");
        higherWeightValues[10] = 2;
        higherWeightValues[29] = "wet-bootstrap";
        higherWeightValues[35] = "Active";
        const firstWaterValues = Array(42).fill("");
        firstWaterValues[0] = new Date("2026-08-15T12:00:00Z");
        firstWaterValues[1] = "P01";
        firstWaterValues[2] = "Water";
        firstWaterValues[10] = 2;
        firstWaterValues[29] = "wet-bootstrap";
        firstWaterValues[35] = "Active";
        const closingWaterValues = Array(42).fill("");
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
        const trackerHeader = Array(28).fill("");
        trackerHeader[27] = "Current pot size";
        const trackerPlant = Array(28).fill("");
        trackerPlant[0] = "P01";
        trackerPlant[1] = "Old man of the Andes";
        trackerPlant[2] = "Oreocereus trollii";
        trackerPlant[3] = new Date("2026-08-01T12:00:00Z");
        trackerPlant[4] = 15;
        trackerPlant[6] = 412;
        trackerPlant[14] = "A1";
        trackerPlant[27] = "4 in";
        const trackerFormulas = [trackerHeader, Array(28).fill("")];
        trackerFormulas[1][13] =
            '=HYPERLINK("https://example.test/p01","Guide")';
        const sheets = new Map([
            [
                "Plant tracker",
                createDataSheet(
                    "Plant tracker",
                    [trackerHeader, trackerPlant],
                    trackerFormulas
                ),
            ],
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
        ]);
        const spreadsheet = {
            getSheetByName: (name) => sheets.get(name) ?? null,
            getSpreadsheetTimeZone: () => "America/New_York",
        };
        const context = loadAppsScript(history, { spreadsheet });

        const bootstrap = context.getWebAppBootstrap();

        expect(bootstrap.version).toBe("5.16.3");
        expect(bootstrap.plants).toHaveLength(1);
        expect(bootstrap.plants[0]).toMatchObject({
            id: "P01",
            label: "A1",
            potSetup: 2,
            currentPotSize: "4 in",
            latestWeight: 412,
            dryOrLowestWeight: 405,
            dryOrLowestWeightBasis: "Completed cycle",
            dryOrLowestWeightDate: "2026-08-16T12:00:00.000Z",
            fieldGuideUrl: "https://example.test/p01",
        });
        expect(Array.from(bootstrap.recent)).toHaveLength(5);
        expect(history.__rangeReads).toEqual([
            { row: 2, column: 1, rowCount: 5, columnCount: 42 },
        ]);
    });

    it("keeps P01-P30 bootstrap order and maps current and nursery-label images exactly", () => {
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
        workbook.sheets
            .get("Plant tracker")
            .getRange(2, 15, trackerLabels.length, 1)
            .setValues(trackerLabels.map((label) => [label]));
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
        });

        const plants = JSON.parse(
            JSON.stringify(context.getWebAppBootstrap().plants)
        );
        expect(plants.map(({ id }) => id)).toEqual(appSheetBulkPlants);
        expect(plants.map(({ label }) => label)).toEqual(trackerLabels);
        expect(
            Array.from(vm.runInContext("APP_SHEET_BULK_PLANTS", context))
        ).toEqual(appSheetBulkPlants);
        expect(
            Object.fromEntries(
                plants.map((plant) => [
                    plant.id,
                    {
                        currentImageUrl: plant.currentImageUrl,
                        nurseryLabelImageUrl: plant.nurseryLabelImageUrl,
                    },
                ])
            )
        ).toEqual(expectedPlantImageUrls);
        expect(plants.find(({ id }) => id === "P28")).toMatchObject({
            currentPotSize: "4 in",
        });
        expect(plants.at(-1)).toMatchObject({
            id: "P30",
            currentPotSize: "5 in",
        });
    });

    it("returns an empty History snapshot and trims reserved blank rows", () => {
        const emptyHistory = createHistorySheet();
        const emptyContext = loadAppsScript(emptyHistory);
        expect(
            Array.from(
                emptyContext.readHistorySnapshot_({
                    getSheetByName: () => emptyHistory,
                })
            )
        ).toEqual([]);

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
        populatedHistory.__rows.push(Array(42).fill(""));
        const populatedContext = loadAppsScript(populatedHistory);
        const snapshot = populatedContext.readHistorySnapshot_({
            getSheetByName: () => populatedHistory,
        });

        expect(Array.from(snapshot)).toHaveLength(1);
        expect(snapshot[0][1]).toBe("P01");
    });

    it("sorts recent activity by timestamps and resolves names without History helpers", () => {
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

        expect(JSON.parse(JSON.stringify(recent))).toEqual([
            {
                observedAt: "2026-08-16T16:00:00.000Z",
                plantId: "P02",
                event: "Measure",
                weightState: "",
                weight: "",
                name: "Feather cactus",
            },
            {
                observedAt: "2026-08-16T14:00:00.000Z",
                plantId: "P01",
                event: "Weigh",
                weightState: "Routine",
                weight: 410,
                name: "Moon cactus",
            },
        ]);
        expect(context.dateSortValue_("not-a-date")).toBe(0);
    });

    it("flushes spreadsheet writes before releasing the script lock", () => {
        const workbook = createLoggerWorkbook();
        const order = [];
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp: {
                flush: () => order.push("flush"),
                openById: () => workbook.spreadsheet,
            },
            globals: {
                LockService: {
                    getScriptLock: () => ({
                        tryLock: () => true,
                        releaseLock: () => order.push("release"),
                    }),
                },
            },
        });

        context.saveWebObservation({
            requestId: "garden-flush-123456",
            plantId: "P01",
            events: ["Weigh"],
            weight: 450,
            observedAt: "2026-08-16T12:00:00Z",
        });

        expect(order).toEqual(["flush", "release"]);
    });

    it("validates and structures every supported event detail", () => {
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
                nutrientsUsed: "Yes",
                nutrientProduct: "MSU 13-3-15",
                nutrientAmount: "0.5 g/gal",
                wateringApplication: "Thorough",
                waterAmount: 125,
                potSize: "5 in",
                flowerCount: 2,
                flowerDetails: "Pink crown",
                photoUrl: "https://photos.app.goo.gl/example",
                pestIssue: "Mealybug",
                pestTreatment: "Isolated and treated",
            },
            events,
            { currentPotSize: "4 in" }
        );

        expect(details).toMatchObject({
            nutrientsUsed: "Yes",
            wateringApplication: "Thorough",
            waterAmount: 125,
            previousPotSize: "4 in",
            potSize: "5 in",
            flowerCount: 2,
            photoUrl: "https://photos.app.goo.gl/example",
            pestIssue: "Mealybug",
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
        ).toThrow(/choose whether nutrients were used/i);
        expect(() =>
            context.eventDetailsFromPayload_(
                { nutrientsUsed: "Yes" },
                ["Water"],
                null
            )
        ).toThrow(/nutrient product and amount/i);
        expect(() =>
            context.eventDetailsFromPayload_({}, ["Repot"], {
                currentPotSize: "4 in",
            })
        ).toThrow(/new pot size/i);
        expect(() =>
            context.eventDetailsFromPayload_({}, ["Flower"], null)
        ).toThrow(/flower count/i);
        expect(() =>
            context.eventDetailsFromPayload_({}, ["Photo"], null)
        ).toThrow(/Google Photos share link/i);
        expect(() =>
            context.eventDetailsFromPayload_(
                { pestIssue: "Mite" },
                ["Pest"],
                null
            )
        ).toThrow(/treatment or action/i);
    });

    it("appends structured rows and treats a matching retry as idempotent", () => {
        const history = createHistorySheet();
        const spreadsheet = {
            getSheetByName: (name) => (name === "History" ? history : null),
        };
        const context = loadAppsScript(history, { spreadsheet });
        const input = {
            plantId: "P01",
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
            observationDate: new Date("2026-08-16T08:00:00-04:00"),
            weightState: "Wet",
            weight: 430,
            height: 12,
            width: 7,
            condition: "Firm",
            notes: "Full collection check",
            potSetup: 3,
            currentLabel: "A1",
            requestId: "garden-append-12345",
            details: {
                nutrientsUsed: "Yes",
                nutrientProduct: "MSU 13-3-15",
                nutrientAmount: "0.5 g/gal",
                wateringApplication: "Thorough",
                waterAmount: 125,
                previousPotSize: "4 in",
                potSize: "5 in",
                flowerCount: 2,
                flowerDetails: "Pink crown",
                photoUrl: "https://photos.app.goo.gl/example",
                pestIssue: "Mealybug",
                pestTreatment: "Isolated and treated",
            },
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
        expect(history.__rows[1][1]).toBe("P01");
        expect(history.__rows[1][2]).toBe("Water");
        expect(history.__rows[1][15]).toBe("garden-append-12345");
        expect(history.__rows[1][16]).toBe("Yes");
        expect(history.__rows[5][20]).toBe("5 in");
        expect(history.__rows[8][25]).toBe("Isolated and treated");
        expect(history.__rows[1]).toHaveLength(42);
        expect(history.__rows[1][12]).toMatch(/^=IF\(/);
        expect(history.__rows[1][13]).toMatch(/\^\(Water\|Repot\)\$/);
        expect(history.__rows[1][14]).toMatch(/^=IF\(/);
        expect(history.__rows[1].slice(26, 36)).toEqual([
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
        expect(history.__rows[1].slice(36)).toEqual([
            "",
            '=IF(F2="","",F2/2.54)',
            '=IF(G2="","",G2/2.54)',
            "",
            "Thorough",
            125,
        ]);
        expect(history.__rows[2][28]).toBe("Measured");
        expect(history.__rows[2][34]).toBe("Scale");
        expect(history.__rows[3][28]).toBe("Estimated");
        expect(history.__rows[3][34]).toBe("Unspecified");
        expect(history.__rows[3][36]).toBe("cm");
    });

    it("saves a complete mobile observation and advances a repot setup", () => {
        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        const payload = {
            plantId: "P01",
            requestId: "garden-mobile-12345",
            observedAt: "2026-08-16T08:00:00-04:00",
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
            weightState: "Wet",
            weight: 440,
            height: 13,
            width: 8,
            condition: "Firm",
            soilMoisture: "Dry",
            medium: "Mineral cactus mix",
            measurementQuality: "Measured",
            measurementMethod: "Ruler",
            measurementUnit: "in",
            notes: "Mobile round",
            nutrientsUsed: "No",
            potSize: "5 in",
            flowerCount: 1,
            flowerDetails: "Crown bud",
            photoUrl: "https://photos.google.com/share/example",
            pestIssue: "None found",
            pestTreatment: "Routine inspection",
        };
        const result = context.saveWebObservation(payload);
        const retry = context.saveWebObservation(payload);

        expect(result).toMatchObject({
            ok: true,
            duplicate: false,
            plantId: "P01",
            historyRows: 8,
        });
        expect(result.events).toContain("Repot");
        expect(retry).toMatchObject({ duplicate: true, historyRows: 8 });
        expect(workbook.history.__rows[1][10]).toBe(2);
        expect(workbook.history.__rows[3][28]).toBe("Measured");
        expect(workbook.history.__rows[3][34]).toBe("Ruler");
        expect(workbook.history.__rows[3][5]).toBe(33.02);
        expect(workbook.history.__rows[3][6]).toBe(20.32);
        expect(workbook.history.__rows[3][36]).toBe("in");
        expect(workbook.history.__rows[3][37]).toBe('=IF(F4="","",F4/2.54)');
        expect(workbook.history.__rows[4][32]).toBe("Dry");
        expect(workbook.history.__rows[5][33]).toBe("Mineral cactus mix");
        expect(
            workbook.sheets.get("Baselines").getRange(2, 20).getValues()[0][0]
        ).toBe(2);
    });

    it("saves a mixed phone queue in one retry-safe batch", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        const result = context.saveWebObservationBatch([
            {
                plantId: "P01",
                requestId: "garden-queue-one-12345",
                observedAt: "2026-08-16T10:00:00-04:00",
                events: ["Weigh"],
                weightState: "Routine",
                weight: 410,
                entrySource: "AppSheet bulk",
            },
            {
                plantId: "P02",
                requestId: "garden-queue-two-12345",
                observedAt: "2026-08-16T10:01:00-04:00",
                events: ["Measure"],
                height: 12,
            },
            {
                plantId: "P01",
                requestId: "garden-queue-repot-12345",
                observedAt: "2026-08-16T10:02:00-04:00",
                events: ["Repot"],
                potSize: "5 in",
            },
        ]);
        expect(result).toMatchObject({
            ok: true,
            savedCount: 3,
            failedCount: 0,
        });
        expect(result.results.map((entry) => entry.plantId)).toEqual([
            "P01",
            "P02",
            "P01",
        ]);
        expect(workbook.history.__rows.slice(1).map((row) => row[15])).toEqual([
            "garden-queue-one-12345",
            "garden-queue-two-12345",
            "garden-queue-repot-12345",
        ]);
        expect(workbook.history.__rows[1][27]).toBe("AppSheet bulk");
        expect(
            workbook.sheets.get("Baselines").getRange(2, 20).getValues()[0][0]
        ).toBe(2);
    });

    it("clears inherited AL/AM validation before a batch write and in the installer", () => {
        const workbook = createLoggerWorkbook(["P01"], {
            measurementValidations: true,
        });
        let flushCount = 0;
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
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
                plantId: "P01",
                requestId: "garden-validation-repair-12345",
                observedAt: "2026-08-16T10:00:00-04:00",
                events: ["Measure"],
                height: 5,
                width: 4,
                measurementUnit: "in",
            },
        ]);

        expect(result).toMatchObject({ ok: true, savedCount: 1 });
        expect(flushCount).toBe(1);
        expect(workbook.history.__clearDataValidationCalls).toContainEqual({
            row: 2,
            column: 38,
            rowCount: 1,
            columnCount: 2,
        });
        expect(workbook.history.__validationCells.has("2:38")).toBe(false);
        expect(workbook.history.__validationCells.has("3:38")).toBe(true);

        context.ensureHistoryMeasurementColumns_(workbook.history, true);
        expect(workbook.history.__clearDataValidationCalls).toContainEqual({
            row: 2,
            column: 38,
            rowCount: 4999,
            columnCount: 2,
        });
        expect(
            [...workbook.history.__validationCells].some((key) =>
                /:(38|39)$/.test(key)
            )
        ).toBe(false);
        expect(workbook.history.__validationCells.has("2:37")).toBe(true);
    });

    it("writes a 30-plant weighing round in one contiguous constant-I/O batch", () => {
        const plantIds = Array.from(
            { length: 30 },
            (_, index) => `P${String(index + 1).padStart(2, "0")}`
        );
        const workbook = createLoggerWorkbook(plantIds);
        let flushCount = 0;
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
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
            plantId,
            requestId: `garden-one-call-${String(index + 1).padStart(2, "0")}-12345`,
            observedAt: `2026-08-16T10:${String(index).padStart(2, "0")}:00-04:00`,
            events: ["Weigh"],
            weightState: "Routine",
            weight: 400 + index,
        }));
        const result = context.saveWebObservationBatch(payloads);
        expect(result).toMatchObject({
            ok: true,
            savedCount: 30,
            failedCount: 0,
        });

        const historyWrites = workbook.history.__setValuesCalls.filter(
            (call) =>
                call.row >= 2 && call.column === 1 && call.columnCount === 42
        );
        expect(historyWrites).toEqual([
            { row: 2, column: 1, rowCount: 30, columnCount: 42 },
        ]);
        expect(flushCount).toBe(1);
        expect(workbook.history.__rangeReads.length).toBeLessThan(20);
        expect(workbook.history.__rows.slice(1).map((row) => row[15])).toEqual(
            payloads.map((payload) => payload.requestId)
        );

        const retry = context.saveWebObservationBatch(payloads);
        expect(retry.results.every((entry) => entry.duplicate)).toBe(true);
        expect(workbook.history.__setValuesCalls).toHaveLength(1);
        expect(workbook.history.__rows).toHaveLength(31);

        const historyOperationCount = (count) => {
            const comparisonWorkbook = createLoggerWorkbook(
                plantIds.slice(0, count)
            );
            const comparisonContext = loadAppsScript(
                comparisonWorkbook.history,
                {
                    spreadsheet: comparisonWorkbook.spreadsheet,
                    globals: comparisonWorkbook.globals,
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

    it("keeps Water second after Weigh and preserves batch measurement metadata", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        const result = context.saveWebObservationBatch([
            {
                plantId: "P01",
                requestId: "garden-wet-order-12345",
                observedAt: "2026-08-16T10:00:00-04:00",
                events: ["Water", "Weigh"],
                weightState: "Wet",
                weight: 1949,
                nutrientsUsed: "No",
            },
            {
                plantId: "P02",
                requestId: "garden-measure-batch-12345",
                observedAt: "2026-08-16T10:01:00-04:00",
                events: ["Measure"],
                height: 5,
                width: 4,
                measurementUnit: "in",
                measurementQuality: "Measured",
                measurementMethod: "Ruler",
            },
        ]);

        expect(result.results.map((entry) => entry.historyRows)).toEqual([
            2,
            1,
        ]);
        expect(
            workbook.history.__rows.slice(1, 3).map((row) => row[2])
        ).toEqual(["Weigh", "Water"]);
        expect(workbook.history.__rows[1][4]).toBe(1949);
        expect(workbook.history.__rows[2][4]).toBe("");
        expect(workbook.history.__rows[3][5]).toBe(12.7);
        expect(workbook.history.__rows[3][6]).toBe(10.16);
        expect(workbook.history.__rows[3][28]).toBe("Measured");
        expect(workbook.history.__rows[3][34]).toBe("Ruler");
        expect(workbook.history.__rows[3][36]).toBe("in");
        const wetRetry = context.saveWebObservationBatch([
            {
                plantId: "P01",
                requestId: "garden-wet-order-12345",
                observedAt: "2026-08-16T10:00:00-04:00",
                events: ["Water", "Weigh"],
                weightState: "Wet",
                weight: 1949,
                nutrientsUsed: "No",
            },
        ]);
        expect(wetRetry.results[0]).toMatchObject({
            ok: true,
            duplicate: true,
            historyRows: 2,
        });
    });

    it("stores weights as Routine for derived classification and defaults rotations to 90 degrees", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        const result = context.saveWebObservationBatch([
            {
                plantId: "P01",
                requestId: "garden-wet-only-12345",
                observedAt: "2026-08-16T12:00:00-04:00",
                events: ["Weigh"],
                weightState: "Wet",
                weight: 889,
            },
            {
                plantId: "P02",
                requestId: "garden-rotation-default-12345",
                observedAt: "2026-08-16T12:01:00-04:00",
                events: ["Rotation"],
            },
        ]);

        expect(result).toMatchObject({
            ok: true,
            savedCount: 2,
            failedCount: 0,
        });
        expect(workbook.history.__rows.slice(1).map((row) => row[2])).toEqual([
            "Weigh",
            "Rotation",
        ]);
        expect(workbook.history.__rows[1][3]).toBe("Routine");
        expect(workbook.history.__rows[1][16]).toBe("");
        expect(workbook.history.__rows[2][39]).toBe(90);
    });

    it("archives multi-event bulk care with one canonical History write", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        const result = context.saveBulkCareObservation({
            plantIds: ["P01", "P02"],
            events: ["Rotation", "Clean"],
            rotationDegrees: 135,
            notes: "Turned and dusted.",
            observedAt: "2026-08-16T12:15:00-04:00",
            requestId: "garden-bulk-care-12345",
        });

        expect(result).toMatchObject({
            ok: true,
            plantCount: 2,
            duplicateCount: 0,
        });
        expect(Array.from(result.events)).toEqual(["Rotation", "Clean"]);
        expect(workbook.history.__rows.slice(1).map((row) => row[2])).toEqual([
            "Rotation",
            "Clean",
            "Rotation",
            "Clean",
        ]);
        expect(workbook.history.__rows[1][39]).toBe(135);
        expect(workbook.history.__rows[3][39]).toBe(135);
        expect(workbook.history.__rows[1][27]).toBe("Mobile bulk care");
        expect(
            workbook.history.__setValuesCalls.filter(
                (call) => call.column === 1 && call.row >= 2
            )
        ).toEqual([{ row: 2, column: 1, rowCount: 4, columnCount: 42 }]);
    });

    it("validates bulk-care inputs and keeps retry messages actionable", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const basePayload = {
            plantIds: ["P01"],
            events: ["Clean"],
            observedAt: "2026-08-16T12:30:00-04:00",
            requestId: "garden-bulk-guard-12345",
        };

        expect(() =>
            context.saveBulkCareObservation({
                ...basePayload,
                plantIds: [],
            })
        ).toThrow(/at least one plant/i);
        expect(() =>
            context.saveBulkCareObservation({
                ...basePayload,
                events: [],
            })
        ).toThrow(/at least one bulk-care event/i);
        expect(() =>
            context.saveBulkCareObservation({
                ...basePayload,
                events: ["Photo"],
            })
        ).toThrow(/supports only/i);

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
            ).toThrow(/more than 0 and at most 360/i);
        }

        const first = context.saveBulkCareObservation(basePayload);
        expect(first.message).toBe("Clean saved for 1 plant.");
        const duplicate = context.saveBulkCareObservation(basePayload);
        expect(duplicate).toMatchObject({ duplicateCount: 1 });
        expect(duplicate.message).toMatch(/already saved/i);

        const failingContext = loadAppsScript(createHistorySheet(), {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        failingContext.saveWebObservationBatch = () => {
            throw new Error("Another reading is finishing");
        };
        expect(() =>
            failingContext.saveBulkCareObservation({
                ...basePayload,
                requestId: "garden-bulk-lock-12345",
            })
        ).toThrow(/bulk-care round remains on this screen/i);

        failingContext.saveWebObservationBatch = () => {
            throw new Error("Spreadsheet unavailable");
        };
        expect(() =>
            failingContext.saveBulkCareObservation({
                ...basePayload,
                requestId: "garden-bulk-service-12345",
            })
        ).toThrow(/Spreadsheet unavailable/i);

        failingContext.saveWebObservationBatch = () => ({
            results: [{ ok: false, message: "Correct this entry." }],
        });
        expect(() =>
            failingContext.saveBulkCareObservation({
                ...basePayload,
                requestId: "garden-bulk-invalid-12345",
            })
        ).toThrow(/Correct this entry/i);

        failingContext.saveWebObservationBatch = () => ({ results: [null] });
        expect(() =>
            failingContext.saveBulkCareObservation({
                ...basePayload,
                requestId: "garden-bulk-fallback-12345",
            })
        ).toThrow(/could not be saved/i);
    });

    it("rejects changed payloads that reuse a completed request ID", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const payload = {
            plantId: "P01",
            requestId: "garden-strict-retry-12345",
            observedAt: "2026-08-16T10:00:00-04:00",
            events: [
                "Weigh",
                "Measure",
                "Check",
            ],
            weightState: "Routine",
            weight: 450,
            height: 5,
            width: 4,
            measurementUnit: "in",
            measurementQuality: "Measured",
            measurementMethod: "Ruler",
            condition: "Firm",
            notes: "Baseline observation",
            entrySource: "Mobile logger",
        };

        const saved = context.saveWebObservationBatch([payload]);
        const exactRetry = context.saveWebObservationBatch([payload]);
        expect(saved).toMatchObject({ ok: true, savedCount: 1 });
        expect(exactRetry.results[0]).toMatchObject({
            ok: true,
            duplicate: true,
            historyRows: 3,
        });
        const legacyStateRetry = context.saveWebObservationBatch([
            { ...payload, weightState: "Dry" },
        ]);
        expect(legacyStateRetry.results[0]).toMatchObject({
            ok: true,
            duplicate: true,
            historyRows: 3,
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
                events: ["Weigh", "Measure"],
                condition: "",
            },
        ];
        changedPayloads.forEach((changed) => {
            const result = context.saveWebObservationBatch([changed]);
            expect(result.results[0]).toMatchObject({
                ok: false,
                requestId: payload.requestId,
                retryable: false,
                errorCode: "HISTORY_CONFLICT",
            });
            expect(result.results[0].message).toMatch(
                /no longer matches|unexpected History shape/i
            );
        });
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
        ).toThrow(/unexpected History shape/i);
        expect(workbook.history.__setValuesCalls).toHaveLength(1);
        expect(workbook.history.__rows).toHaveLength(4);
    });

    it("archives an AppSheet intake row through the canonical batch writer", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const entry = Array(appSheetEntryHeaders.length).fill("");
        entry[0] = "A1B2C3D4";
        entry[1] = new Date("2026-08-16T10:00:00-04:00");
        entry[2] = "P01";
        entry[3] = "Water, Weigh";
        entry[4] = "Wet";
        entry[5] = 1949;
        entry[8] = "in";
        entry[12] = "No";
        entry[26] = "Queued";
        workbook.sheets.get("App entries").__rows.push(entry);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        const result = context.processAppSheetEntry("A1B2C3D4");

        expect(result).toMatchObject({
            ok: true,
            duplicate: false,
            entryId: "A1B2C3D4",
            requestId: "appsheet-A1B2C3D4",
            historyRows: 2,
        });
        expect(
            workbook.history.__rows.slice(1, 3).map((row) => row[2])
        ).toEqual(["Weigh", "Water"]);
        expect(
            workbook.history.__rows.slice(1, 3).map((row) => row[27])
        ).toEqual(["AppSheet", "AppSheet"]);
        expect(entry[26]).toBe("Saved");
        expect(entry[28]).toBe("appsheet-A1B2C3D4");
        expect(entry[29]).toBe(2);
        expect(entry[30]).toBeInstanceOf(Date);

        const retry = context.processAppSheetEntry("A1B2C3D4");
        expect(retry).toMatchObject({
            ok: true,
            duplicate: true,
            historyRows: 2,
        });
        expect(workbook.history.__rows).toHaveLength(3);
    });

    it("archives an AppSheet Rotation entry with its degree value", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const entry = Array(appSheetEntryHeaders.length).fill("");
        entry[0] = "ROTATE123";
        entry[1] = new Date("2026-08-16T10:05:00-04:00");
        entry[2] = "P01";
        entry[3] = "Rotation";
        entry[26] = "Queued";
        entry[31] = 180;
        workbook.sheets.get("App entries").__rows.push(entry);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        expect(context.processAppSheetEntry("ROTATE123")).toMatchObject({
            ok: true,
            historyRows: 1,
        });
        expect(workbook.history.__rows[1][2]).toBe("Rotation");
        expect(workbook.history.__rows[1][39]).toBe(180);
    });

    it("stores AppSheet measurement units and leaves validation errors editable", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const measurement = Array(appSheetEntryHeaders.length).fill("");
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
        const invalidWater = Array(appSheetEntryHeaders.length).fill("");
        invalidWater[0] = "C9D0E1F2";
        invalidWater[1] = new Date("2026-08-16T10:02:00-04:00");
        invalidWater[2] = "P02";
        invalidWater[3] = "Water";
        invalidWater[26] = "Queued";
        const entries = workbook.sheets.get("App entries");
        entries.__rows.push(measurement, invalidWater);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        const measured = context.processAppSheetEntry("E5F6A7B8");
        const rejected = context.processAppSheetEntry("C9D0E1F2");

        expect(measured.ok).toBe(true);
        expect(workbook.history.__rows[1][5]).toBe(12.7);
        expect(workbook.history.__rows[1][6]).toBe(10.16);
        expect(workbook.history.__rows[1][36]).toBe("in");
        expect(workbook.history.__rows[1][37]).toBe('=IF(F2="","",F2/2.54)');
        expect(workbook.history.__rows[1][38]).toBe('=IF(G2="","",G2/2.54)');
        expect(rejected).toMatchObject({
            ok: false,
            retryable: false,
            entryId: "C9D0E1F2",
        });
        expect(invalidWater[26]).toBe("Needs correction");
        expect(invalidWater[27]).toMatch(/nutrients/i);
        expect(invalidWater[28]).toBe("appsheet-C9D0E1F2");
        expect(workbook.history.__rows).toHaveLength(2);
    });

    it("marks an AppSheet intake row Retry when infrastructure is busy", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const entry = Array(appSheetEntryHeaders.length).fill("");
        entry[0] = "A9B8C7D6";
        entry[2] = "P01";
        entry[3] = "Check";
        entry[9] = "Firm";
        entry[26] = "Queued";
        workbook.sheets.get("App entries").__rows.push(entry);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        context.LockService = {
            getScriptLock: () => ({
                releaseLock: () => {},
                tryLock: () => false,
            }),
        };

        expect(() => context.processAppSheetEntry("A9B8C7D6")).toThrow(
            /another reading/i
        );
        expect(entry[26]).toBe("Retry");
        expect(entry[27]).toMatch(/another reading/i);
        expect(entry[28]).toBe("appsheet-A9B8C7D6");
        expect(workbook.history.__rows).toHaveLength(1);
    });

    it("rejects missing and duplicated AppSheet entry identities", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const entries = workbook.sheets.get("App entries");

        expect(() => context.processAppSheetEntry("")).toThrow(
            /Entry ID is required/i
        );
        expect(() => context.processAppSheetEntry("NOTTHERE")).toThrow(
            /was not found/i
        );

        const other = Array(appSheetEntryHeaders.length).fill("");
        other[0] = "OTHER123";
        entries.__rows.push(other);
        expect(() => context.processAppSheetEntry("NOTTHERE")).toThrow(
            /was not found/i
        );

        const duplicate = Array(appSheetEntryHeaders.length).fill("");
        duplicate[0] = "DUPLICATE1";
        entries.__rows.push(duplicate, [...duplicate]);
        expect(() => context.processAppSheetEntry("DUPLICATE1")).toThrow(
            /duplicated/i
        );
        expect(
            Array.from(
                context.appSheetEventList_([
                    " Water ",
                    "Water",
                    "Weigh",
                ])
            )
        ).toEqual(["Water", "Weigh"]);
    });

    it("returns a stable receipt for an already-saved AppSheet row", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const saved = Array(appSheetEntryHeaders.length).fill("");
        saved[0] = "SAVED123";
        saved[26] = "Saved";
        workbook.sheets.get("App entries").__rows.push(saved);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        expect(context.processAppSheetEntry("SAVED123")).toMatchObject({
            ok: true,
            duplicate: true,
            requestId: "",
            historyRows: 0,
            message: "This AppSheet entry is saved.",
        });
    });

    it("preserves retryable and malformed AppSheet automation failures", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const retryable = Array(appSheetEntryHeaders.length).fill("");
        retryable[0] = "RETRY123";
        retryable[2] = "P01";
        retryable[3] = "Check";
        const malformed = Array(appSheetEntryHeaders.length).fill("");
        malformed[0] = "MALFORM1";
        malformed[2] = "P01";
        malformed[3] = "Check";
        const thrown = Array(appSheetEntryHeaders.length).fill("");
        thrown[0] = "THROWN12";
        thrown[2] = "P01";
        thrown[3] = "Check";
        const entries = workbook.sheets.get("App entries");
        entries.__rows.push(retryable, malformed, thrown);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        context.saveWebObservationBatch = () => ({
            results: [
                {
                    ok: false,
                    retryable: true,
                    message: "Temporary service failure.",
                },
            ],
        });
        expect(context.processAppSheetEntry("RETRY123")).toMatchObject({
            ok: false,
            retryable: true,
        });
        expect(retryable[26]).toBe("Retry");

        context.saveWebObservationBatch = () => ({ results: [] });
        expect(context.processAppSheetEntry("MALFORM1")).toMatchObject({
            ok: false,
            retryable: false,
        });
        expect(malformed[26]).toBe("Needs correction");
        expect(malformed[27]).toMatch(/needs correction/i);

        context.saveWebObservationBatch = () => {
            throw "String service failure";
        };
        expect(() => context.processAppSheetEntry("THROWN12")).toThrow(
            "String service failure"
        );
        expect(thrown[26]).toBe("Retry");
        expect(thrown[27]).toBe("String service failure");
    });

    it("processes queued AppSheet rows in one bound-project batch", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const queued = Array(appSheetEntryHeaders.length).fill("");
        queued[0] = "QUEUE001";
        queued[1] = new Date("2026-08-25T04:00:00-04:00");
        queued[2] = "P01";
        queued[3] = "Check";
        queued[9] = "Firm";
        queued[26] = "Queued";
        const retry = Array(appSheetEntryHeaders.length).fill("");
        retry[0] = "RETRY001";
        retry[1] = new Date("2026-08-25T04:01:00-04:00");
        retry[2] = "P02";
        retry[3] = "Water";
        retry[12] = "No";
        retry[26] = "Retry";
        const correction = Array(appSheetEntryHeaders.length).fill("");
        correction[0] = "FIXME001";
        correction[26] = "Needs correction";
        const saved = Array(appSheetEntryHeaders.length).fill("");
        saved[0] = "SAVED001";
        saved[26] = "Saved";
        const entries = workbook.sheets.get("App entries");
        entries.__rows.push(queued, retry, correction, saved);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const batches = [];
        context.saveWebObservationBatch = (payloads) => {
            batches.push(payloads);
            return {
                results: [
                    {
                        ok: true,
                        retryable: false,
                        historyRows: 1,
                        message: "Check saved.",
                    },
                    {
                        ok: false,
                        retryable: false,
                        message: "Choose a valid nutrient response.",
                    },
                ],
            };
        };

        const result = context.processQueuedAppSheetEntries();

        expect(batches).toHaveLength(1);
        expect(batches[0].map(({ requestId }) => requestId)).toEqual([
            "appsheet-QUEUE001",
            "appsheet-RETRY001",
        ]);
        expect(queued[26]).toBe("Saved");
        expect(queued[28]).toBe("appsheet-QUEUE001");
        expect(queued[29]).toBe(1);
        expect(queued[30]).toBeInstanceOf(Date);
        expect(retry[26]).toBe("Needs correction");
        expect(retry[27]).toMatch(/nutrient/i);
        expect(correction[26]).toBe("Needs correction");
        expect(saved[26]).toBe("Saved");
        expect(result).toMatchObject({
            ok: false,
            queuedCount: 2,
            processedCount: 2,
            savedCount: 1,
            needsCorrectionCount: 1,
            retryCount: 0,
            deferredCount: 0,
        });
    });

    it("submits a 30-plant AppSheet weight round in one canonical batch", () => {
        const workbook = createLoggerWorkbook(appSheetBulkPlants);
        const round = Array(appSheetBulkHeaders.length).fill("");
        round[0] = "BULK2801";
        round[1] = new Date("2026-08-25T08:00:00-04:00");
        round[2] = new Date("2026-08-25T08:05:00-04:00");
        round[appSheetBulkActionIndex] = "Weigh";
        round[appSheetBulkWeightStateIndex] = "Routine";
        appSheetBulkPlants.forEach((_plantId, index) => {
            round[appSheetBulkWeightStartIndex + index] = 300 + index;
        });
        round[appSheetBulkNotesIndex] = "Collection weight round.";
        round[appSheetBulkStatusIndex] = "Queued";
        workbook.sheets.get("App bulk").__rows.push(round);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const batches = [];
        context.saveWebObservationBatch = (payloads) => {
            batches.push(payloads);
            return {
                results: payloads.map(() => ({
                    ok: true,
                    retryable: false,
                    historyRows: 1,
                    message: "Weight saved.",
                })),
            };
        };

        const result = context.processQueuedAppSheetEntries();

        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(30);
        expect(batches[0].map(({ plantId }) => plantId)).toEqual(
            appSheetBulkPlants
        );
        expect(batches[0].map(({ requestId }) => requestId)).toEqual(
            appSheetBulkPlants.map(
                (plantId) => `appsheet-bulk-BULK2801-${plantId}`
            )
        );
        expect(batches[0][0]).toMatchObject({
            events: ["Weigh"],
            weightState: "Routine",
            weight: 300,
            notes: "Collection weight round.",
            entrySource: "AppSheet bulk",
        });
        expect(round[appSheetBulkStatusIndex]).toBe("Saved");
        expect(round[appSheetBulkStatusIndex + 1]).toBe(
            "30 plant updates saved."
        );
        expect(round[appSheetBulkStatusIndex + 2]).toBe(30);
        expect(round[appSheetBulkStatusIndex + 3]).toBe(30);
        expect(round[appSheetBulkStatusIndex + 4]).toBeInstanceOf(Date);
        expect(result).toMatchObject({
            ok: true,
            queuedCount: 0,
            bulk: {
                installed: true,
                queuedCount: 1,
                processedCount: 1,
                savedRoundCount: 1,
                requestedCount: 30,
                savedRequestCount: 30,
                needsCorrectionCount: 0,
                retryCount: 0,
                deferredCount: 0,
            },
        });
    });

    it("submits compact Water-only and combined AppSheet rounds", () => {
        const runRound = (round) => {
            const workbook = createLoggerWorkbook([
                "P01",
                "P02",
                "P03",
            ]);
            workbook.sheets.get("App bulk").__rows.push(round);
            const context = loadAppsScript(workbook.history, {
                spreadsheet: workbook.spreadsheet,
                globals: workbook.globals,
            });
            const batches = [];
            context.saveWebObservationBatch = (payloads) => {
                batches.push(payloads);
                return {
                    results: payloads.map(() => ({
                        ok: true,
                        retryable: false,
                    })),
                };
            };
            const result = context.processQueuedAppSheetEntries();
            return { batches, result };
        };

        const waterRound = Array(appSheetBulkHeaders.length).fill("");
        waterRound[0] = "WATER-ROUND";
        waterRound[appSheetBulkActionIndex] = "Water";
        waterRound[appSheetBulkSelectedPlantsIndex] = "P01, P03";
        waterRound[appSheetBulkStatusIndex] = "Queued";
        const water = runRound(waterRound);

        expect(water.batches).toHaveLength(1);
        expect(water.batches[0]).toEqual([
            expect.objectContaining({
                plantId: "P01",
                events: ["Water"],
                weight: "",
                weightState: "",
            }),
            expect.objectContaining({
                plantId: "P03",
                events: ["Water"],
                weight: "",
                weightState: "",
            }),
        ]);
        expect(waterRound[appSheetBulkStatusIndex + 1]).toBe(
            "2 plant updates saved."
        );

        const combinedRound = Array(appSheetBulkHeaders.length).fill("");
        combinedRound[0] = "COMBINED-ROUND";
        combinedRound[appSheetBulkActionIndex] = "Water + weigh";
        combinedRound[appSheetBulkSelectedPlantsIndex] = "P01 ; P02";
        combinedRound[appSheetBulkWeightStartIndex] = 510;
        combinedRound[appSheetBulkWeightStartIndex + 2] = 530;
        combinedRound[appSheetBulkStatusIndex] = "Queued";
        const combined = runRound(combinedRound);

        expect(combined.batches).toHaveLength(1);
        expect(combined.batches[0]).toEqual([
            expect.objectContaining({
                plantId: "P01",
                events: ["Water", "Weigh"],
                weight: 510,
                weightState: "Routine",
            }),
            expect.objectContaining({
                plantId: "P02",
                events: ["Water"],
                weight: "",
                weightState: "",
            }),
            expect.objectContaining({
                plantId: "P03",
                events: ["Weigh"],
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
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const makeRound = (action) => {
            const row = Array(appSheetBulkHeaders.length).fill("");
            row[0] = `MODE-${action || "DEFAULT"}`;
            row[appSheetBulkActionIndex] = action;
            return row;
        };

        expect(context.normalizeAppSheetBulkAction_("")).toBe("Weigh");
        expect(() => context.normalizeAppSheetBulkAction_("Mist")).toThrow(
            /must be one of: Water, Weigh, Water \+ weigh, Rotation/i
        );
        expect([...context.appSheetBulkWateredPlants_("")]).toEqual([]);
        expect([
            ...context.appSheetBulkWateredPlants_([
                "P01",
                " P02 ",
                "P01",
            ]),
        ]).toEqual(["P01", "P02"]);
        expect(() => context.appSheetBulkWateredPlants_("P01, P99")).toThrow(
            /Unknown selected plant ID: P99/i
        );

        const waterWithoutPlants = makeRound("Water");
        expect(() =>
            context.appSheetBulkPayloadsFromRow_(
                waterWithoutPlants,
                waterWithoutPlants[0]
            )
        ).toThrow(/at least one watered plant/i);

        const weighWithoutWeights = makeRound("Weigh");
        expect(() =>
            context.appSheetBulkPayloadsFromRow_(
                weighWithoutWeights,
                weighWithoutWeights[0]
            )
        ).toThrow(/at least one plant weight/i);

        const combinedWithoutWater = makeRound("Water + weigh");
        combinedWithoutWater[appSheetBulkWeightStartIndex] = 350;
        expect(() =>
            context.appSheetBulkPayloadsFromRow_(
                combinedWithoutWater,
                combinedWithoutWater[0]
            )
        ).toThrow(/at least one watered plant/i);

        const combinedWithoutWeight = makeRound("Water + weigh");
        combinedWithoutWeight[appSheetBulkSelectedPlantsIndex] = "P01";
        expect(() =>
            context.appSheetBulkPayloadsFromRow_(
                combinedWithoutWeight,
                combinedWithoutWeight[0]
            )
        ).toThrow(/at least one plant weight/i);

        const waterWithHiddenWeight = makeRound("Water");
        waterWithHiddenWeight[appSheetBulkSelectedPlantsIndex] = "P01";
        waterWithHiddenWeight[appSheetBulkWeightStartIndex] = 999;
        expect(
            context.appSheetBulkPayloadsFromRow_(
                waterWithHiddenWeight,
                waterWithHiddenWeight[0]
            )
        ).toEqual([
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
            context.appSheetBulkPayloadsFromRow_(zeroWeight, zeroWeight[0])
        ).toEqual([
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
            context
                .appSheetBulkPayloadsFromRow_(rotation, rotation[0])
                .map(({ payload }) => ({
                    plantId: payload.plantId,
                    events: Array.from(payload.events),
                    rotationDegrees: payload.rotationDegrees,
                }))
        ).toEqual([
            { plantId: "P01", events: ["Rotation"], rotationDegrees: 120 },
            { plantId: "P02", events: ["Rotation"], rotationDegrees: 120 },
        ]);

        const waterWithNutrients = makeRound("Water");
        waterWithNutrients[appSheetBulkSelectedPlantsIndex] = "P01";
        waterWithNutrients[appSheetBulkNutrientsUsedIndex] = "Yes";
        waterWithNutrients[appSheetBulkNutrientProductIndex] = "MSU mix";
        waterWithNutrients[appSheetBulkNutrientAmountIndex] = "0.5 g/gal";
        expect(
            context.appSheetBulkPayloadsFromRow_(
                waterWithNutrients,
                waterWithNutrients[0]
            )[0].payload
        ).toMatchObject({
            events: ["Water"],
            nutrientsUsed: "Yes",
            nutrientProduct: "MSU mix",
            nutrientAmount: "0.5 g/gal",
        });
    });

    it("keeps a partially valid bulk round idempotent and editable", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const round = Array(appSheetBulkHeaders.length).fill("");
        round[0] = "BULKFIX1";
        round[appSheetBulkActionIndex] = "Weigh";
        round[appSheetBulkWeightStateIndex] = "Routine";
        round[appSheetBulkWeightStartIndex] = 0;
        round[appSheetBulkWeightStartIndex + 1] = 420;
        round[appSheetBulkStatusIndex] = "Queued";
        workbook.sheets.get("App bulk").__rows.push(round);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const requestIds = [];
        context.saveWebObservationBatch = (payloads) => {
            requestIds.push(payloads.map(({ requestId }) => requestId));
            return {
                results: [
                    {
                        ok: false,
                        retryable: false,
                        message: "Weight must be greater than zero.",
                    },
                    {
                        ok: true,
                        retryable: false,
                        historyRows: 1,
                        message: "Weight saved.",
                    },
                ],
            };
        };

        const first = context.processQueuedAppSheetEntries();

        expect(round[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(round[appSheetBulkStatusIndex + 1]).toMatch(
            /1 of 2 saved.*P01.*greater than zero/i
        );
        expect(round[appSheetBulkStatusIndex + 2]).toBe(2);
        expect(round[appSheetBulkStatusIndex + 3]).toBe(1);
        expect(first.bulk).toMatchObject({
            savedRequestCount: 1,
            needsCorrectionCount: 1,
        });

        round[appSheetBulkWeightStartIndex] = 410;
        round[appSheetBulkStatusIndex] = "Retry";
        context.saveWebObservationBatch = (payloads) => {
            requestIds.push(payloads.map(({ requestId }) => requestId));
            return {
                results: payloads.map((_payload, index) => ({
                    ok: true,
                    duplicate: index === 1,
                    retryable: false,
                    historyRows: 1,
                    message: "Weight saved.",
                })),
            };
        };

        const retry = context.processQueuedAppSheetEntries();

        expect(requestIds).toEqual([
            ["appsheet-bulk-BULKFIX1-P01", "appsheet-bulk-BULKFIX1-P02"],
            ["appsheet-bulk-BULKFIX1-P01", "appsheet-bulk-BULKFIX1-P02"],
        ]);
        expect(round[appSheetBulkStatusIndex]).toBe("Saved");
        expect(round[appSheetBulkStatusIndex + 1]).toBe(
            "2 plant updates saved."
        );
        expect(round[appSheetBulkStatusIndex + 3]).toBe(2);
        expect(retry.bulk).toMatchObject({
            savedRoundCount: 1,
            savedRequestCount: 2,
            needsCorrectionCount: 0,
        });
    });

    it("isolates invalid bulk rounds and defers a whole round beyond the batch cap", () => {
        const workbook = createLoggerWorkbook(appSheetBulkPlants);
        const bulkSheet = workbook.sheets.get("App bulk");
        const makeRound = (roundId, weightCount = 30) => {
            const row = Array(appSheetBulkHeaders.length).fill("");
            row[0] = roundId;
            row[appSheetBulkActionIndex] = "Weigh";
            row[appSheetBulkWeightStateIndex] = "Routine";
            for (let index = 0; index < weightCount; index += 1) {
                row[appSheetBulkWeightStartIndex + index] = 300 + index;
            }
            row[appSheetBulkStatusIndex] = "Queued";
            bulkSheet.__rows.push(row);
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
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const batches = [];
        context.saveWebObservationBatch = (payloads) => {
            batches.push(payloads);
            return {
                results: payloads.map(() => ({ ok: true, retryable: false })),
            };
        };

        const result = context.processQueuedAppSheetEntries();

        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(30);
        expect(missingId[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(missingId[appSheetBulkStatusIndex + 1]).toMatch(
            /Round ID is required/i
        );
        expect(duplicateOne[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(duplicateTwo[appSheetBulkStatusIndex + 1]).toMatch(
            /duplicated/i
        );
        expect(emptyRound[appSheetBulkStatusIndex + 1]).toMatch(
            /at least one plant weight/i
        );
        expect(firstRound[appSheetBulkStatusIndex]).toBe("Saved");
        expect(secondRound[appSheetBulkStatusIndex]).toBe("Queued");
        expect(deferredRound[appSheetBulkStatusIndex]).toBe("Queued");
        expect(result.bulk).toMatchObject({
            queuedCount: 7,
            processedCount: 5,
            savedRoundCount: 1,
            requestedCount: 30,
            savedRequestCount: 30,
            needsCorrectionCount: 4,
            deferredCount: 2,
        });
    });

    it("marks a round for correction when its derived request set is empty", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const round = Array(appSheetBulkHeaders.length).fill("");
        round[0] = "EMPTY-DERIVED";
        round[appSheetBulkActionIndex] = "Weigh";
        round[appSheetBulkWeightStartIndex] = 410;
        round[appSheetBulkStatusIndex] = "Queued";
        workbook.sheets.get("App bulk").__rows.push(round);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        context.appSheetBulkPayloadsFromRow_ = () => [];

        const result = context.processQueuedAppSheetEntries();

        expect(round[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(round[appSheetBulkStatusIndex + 1]).toMatch(
            /select at least one watered plant or enter at least one weight/i
        );
        expect(result.bulk).toMatchObject({
            requestedCount: 0,
            savedRequestCount: 0,
            needsCorrectionCount: 1,
        });
    });

    it("handles an unavailable or entirely invalid AppSheet bulk intake", () => {
        const missingWorkbook = createLoggerWorkbook(["P01"]);
        missingWorkbook.sheets.delete("App bulk");
        const missingContext = loadAppsScript(missingWorkbook.history, {
            spreadsheet: missingWorkbook.spreadsheet,
            globals: missingWorkbook.globals,
        });

        expect(
            missingContext.processQueuedAppSheetEntries().bulk
        ).toMatchObject({
            installed: false,
            queuedCount: 0,
            processedCount: 0,
        });

        const invalidWorkbook = createLoggerWorkbook(["P01"]);
        const invalidRound = Array(appSheetBulkHeaders.length).fill("");
        invalidRound[appSheetBulkActionIndex] = "Weigh";
        invalidRound[appSheetBulkWeightStartIndex] = 350;
        invalidRound[appSheetBulkStatusIndex] = "Queued";
        invalidWorkbook.sheets.get("App bulk").__rows.push(invalidRound);
        const invalidContext = loadAppsScript(invalidWorkbook.history, {
            spreadsheet: invalidWorkbook.spreadsheet,
            globals: invalidWorkbook.globals,
        });
        invalidContext.saveWebObservationBatch = () => {
            throw new Error("No batch should be sent.");
        };

        const invalidResult = invalidContext.processQueuedAppSheetEntries();

        expect(invalidRound[appSheetBulkStatusIndex]).toBe("Needs correction");
        expect(invalidResult.bulk).toMatchObject({
            processedCount: 1,
            requestedCount: 0,
            savedRequestCount: 0,
        });

        const malformedWorkbook = createLoggerWorkbook(["P01"]);
        const malformedRound = Array(appSheetBulkHeaders.length).fill("");
        malformedRound[0] = "MALFORMED";
        malformedRound[appSheetBulkActionIndex] = "Weigh";
        malformedRound[appSheetBulkWeightStartIndex] = 350;
        malformedRound[appSheetBulkStatusIndex] = "Queued";
        malformedWorkbook.sheets.get("App bulk").__rows.push(malformedRound);
        const malformedContext = loadAppsScript(malformedWorkbook.history, {
            spreadsheet: malformedWorkbook.spreadsheet,
            globals: malformedWorkbook.globals,
        });
        malformedContext.appSheetBulkPayloadsFromRow_ = () => {
            throw "Malformed bulk row.";
        };

        malformedContext.processQueuedAppSheetEntries();

        expect(malformedRound[appSheetBulkStatusIndex]).toBe(
            "Needs correction"
        );
        expect(malformedRound[appSheetBulkStatusIndex + 1]).toBe(
            "Malformed bulk row."
        );
    });

    it("defaults single-weight bulk rows and reports incomplete transient results", () => {
        const singleWorkbook = createLoggerWorkbook(["P01"]);
        const singleRound = Array(appSheetBulkHeaders.length).fill("");
        const startedAt = new Date("2026-08-25T08:00:00-04:00");
        singleRound[0] = "SINGLE";
        singleRound[1] = startedAt;
        singleRound[appSheetBulkWeightStartIndex] = 350;
        singleRound[appSheetBulkStatusIndex] = "Queued";
        singleWorkbook.sheets.get("App bulk").__rows.push(singleRound);
        const singleContext = loadAppsScript(singleWorkbook.history, {
            spreadsheet: singleWorkbook.spreadsheet,
            globals: singleWorkbook.globals,
        });
        let singlePayload;
        singleContext.saveWebObservationBatch = (payloads) => {
            [singlePayload] = payloads;
            return { results: [{ ok: true, retryable: false }] };
        };

        singleContext.processQueuedAppSheetEntries();

        expect(singlePayload).toMatchObject({
            observedAt: startedAt,
            weightState: "Routine",
            weight: 350,
        });
        expect(singleRound[appSheetBulkStatusIndex + 1]).toBe(
            "1 plant update saved."
        );

        const retryWorkbook = createLoggerWorkbook([
            "P01",
            "P02",
            "P03",
        ]);
        const retryRound = Array(appSheetBulkHeaders.length).fill("");
        retryRound[0] = "INCOMPLETE";
        retryRound[appSheetBulkActionIndex] = "Weigh";
        retryRound[appSheetBulkWeightStateIndex] = "Wet";
        retryRound[appSheetBulkWeightStartIndex] = 350;
        retryRound[appSheetBulkWeightStartIndex + 1] = 360;
        retryRound[appSheetBulkWeightStartIndex + 2] = 370;
        retryRound[appSheetBulkStatusIndex] = "Queued";
        retryWorkbook.sheets.get("App bulk").__rows.push(retryRound);
        const retryContext = loadAppsScript(retryWorkbook.history, {
            spreadsheet: retryWorkbook.spreadsheet,
            globals: retryWorkbook.globals,
        });
        retryContext.saveWebObservationBatch = () => ({
            results: [
                { ok: true, retryable: false },
                undefined,
                { ok: false, retryable: true, message: "Try again." },
            ],
        });

        const retryResult = retryContext.processQueuedAppSheetEntries();

        expect(retryRound[appSheetBulkStatusIndex]).toBe("Retry");
        expect(retryRound[appSheetBulkStatusIndex + 1]).toMatch(
            /1 of 3 saved.*P02.*no result.*P03.*Try again/i
        );
        expect(retryResult.bulk).toMatchObject({
            savedRequestCount: 1,
            retryCount: 1,
        });
    });

    it("keeps bulk rounds retryable for Error and non-Error batch failures", () => {
        [true, false].forEach((useError) => {
            const workbook = createLoggerWorkbook(["P01"]);
            const round = Array(appSheetBulkHeaders.length).fill("");
            round[0] = useError ? "ERROR" : "STRING";
            round[appSheetBulkActionIndex] = "Weigh";
            round[appSheetBulkWeightStateIndex] = "Routine";
            round[appSheetBulkWeightStartIndex] = 350;
            round[appSheetBulkStatusIndex] = "Queued";
            workbook.sheets.get("App bulk").__rows.push(round);
            const context = loadAppsScript(workbook.history, {
                spreadsheet: workbook.spreadsheet,
                globals: workbook.globals,
            });
            const failure = useError
                ? vm.runInContext('new Error("Server offline.")', context)
                : "Server offline.";
            context.saveWebObservationBatch = () => {
                throw failure;
            };

            const result = context.processQueuedAppSheetEntries();

            expect(round[appSheetBulkStatusIndex]).toBe("Retry");
            expect(round[appSheetBulkStatusIndex + 1]).toBe("Server offline.");
            expect(result.bulk.retryCount).toBe(1);
        });
    });

    it("installs, initializes, and verifies the AppSheet bulk staging sheet", () => {
        const existingWorkbook = createLoggerWorkbook(["P01"]);
        const existingContext = loadAppsScript(existingWorkbook.history, {
            spreadsheet: existingWorkbook.spreadsheet,
            globals: existingWorkbook.globals,
        });
        expect(existingContext.installAppSheetIntake().bulk).toMatchObject({
            created: false,
            migrated: false,
            columnCount: 54,
            plantCount: 30,
        });
        expect(
            existingWorkbook.sheets
                .get("App entries")
                .__dataValidationCalls.find(({ column }) => column === 3)
        ).toMatchObject({
            row: 2,
            column: 3,
            rowCount: 99,
            columnCount: 1,
            validation: {
                type: "ONE_OF_LIST",
                values: appSheetBulkPlants,
                showDropdown: true,
                allowInvalid: false,
            },
        });

        const v514Workbook = createLoggerWorkbook(["P01"]);
        const v514Headers = appSheetBulkHeaders.slice(0, -2);
        const v514Round = Array(v514Headers.length).fill("");
        v514Round[0] = "ROUND514";
        v514Round[appSheetBulkActionIndex] = "Water";
        const v514Sheet = createDataSheet("App bulk", [v514Headers, v514Round]);
        v514Sheet.__setParent(v514Workbook.spreadsheet);
        v514Workbook.sheets.set("App bulk", v514Sheet);
        const v514Context = loadAppsScript(v514Workbook.history, {
            spreadsheet: v514Workbook.spreadsheet,
            globals: v514Workbook.globals,
        });
        expect(v514Context.installAppSheetBulkSheet()).toMatchObject({
            created: false,
            migrated: true,
            columnCount: 54,
        });
        expect(v514Sheet.__rows[0]).toEqual(appSheetBulkHeaders);
        expect(v514Sheet.__rows[1]).toEqual(v514Round);

        const emptyWorkbook = createLoggerWorkbook(["P01"]);
        const emptySheet = createDataSheet("App bulk", []);
        emptySheet.__setParent(emptyWorkbook.spreadsheet);
        emptyWorkbook.sheets.set("App bulk", emptySheet);
        const emptyContext = loadAppsScript(emptyWorkbook.history, {
            spreadsheet: emptyWorkbook.spreadsheet,
            globals: emptyWorkbook.globals,
        });
        expect(emptyContext.installAppSheetBulkSheet().created).toBe(false);
        expect(emptySheet.__rows[0]).toEqual(appSheetBulkHeaders);

        const missingWorkbook = createLoggerWorkbook(["P01"]);
        missingWorkbook.sheets.delete("App bulk");
        const missingContext = loadAppsScript(missingWorkbook.history, {
            spreadsheet: missingWorkbook.spreadsheet,
            globals: missingWorkbook.globals,
        });
        expect(missingContext.installAppSheetBulkSheet().created).toBe(true);
        expect(missingWorkbook.sheets.get("App bulk").__rows[0]).toEqual(
            appSheetBulkHeaders
        );

        const legacyWorkbook = createLoggerWorkbook(["P01"]);
        const legacyRow = Array(appSheetBulkLegacyHeaders.length).fill("");
        legacyRow[0] = "LEGACY-ROUND";
        legacyRow[3] = "Routine";
        legacyRow[4] = 345;
        legacyRow[29] = "Queued";
        const legacySheet = createDataSheet("App bulk", [
            [...appSheetBulkLegacyHeaders],
            legacyRow,
        ]);
        legacySheet.__setParent(legacyWorkbook.spreadsheet);
        legacyWorkbook.sheets.set("App bulk", legacySheet);
        const legacyContext = loadAppsScript(legacyWorkbook.history, {
            spreadsheet: legacyWorkbook.spreadsheet,
            globals: legacyWorkbook.globals,
        });

        expect(legacyContext.installAppSheetBulkSheet()).toMatchObject({
            created: false,
            migrated: true,
            columnCount: 54,
        });
        expect(legacySheet.__rows[0]).toEqual(appSheetBulkHeaders);
        expect(legacySheet.__rows[1][appSheetBulkActionIndex]).toBe("Weigh");
        expect(legacySheet.__rows[1][appSheetBulkWeightStateIndex]).toBe(
            "Routine"
        );
        expect(legacySheet.__rows[1][appSheetBulkWeightStartIndex]).toBe(345);
        expect(legacySheet.__rows[1][appSheetBulkStatusIndex]).toBe("Queued");

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
        expect(legacyHeaderOnly.__rows[0]).toEqual(appSheetBulkHeaders);

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
        const v512Formulas = Array(appSheetBulkV512Headers.length).fill("");
        v512Formulas[appSheetBulkV512Headers.length - 1] = "=40+2";
        const v512Sheet = createDataSheet(
            "App bulk",
            [[...appSheetBulkV512Headers], v512Row],
            [Array(appSheetBulkV512Headers.length).fill(""), v512Formulas]
        );

        expect(legacyContext.migrateLegacyAppSheetBulkSheet_(v512Sheet)).toBe(
            true
        );
        expect(v512Sheet.__rows[0]).toEqual(appSheetBulkHeaders);
        expect(
            v512Sheet.__rows[1].slice(
                appSheetBulkWeightStartIndex + appSheetBulkV512Plants.length,
                appSheetBulkNotesIndex
            )
        ).toEqual(Array(8).fill(""));
        expect(v512Sheet.__rows[1].slice(appSheetBulkNotesIndex)).toEqual([
            ...v512Tail,
            "",
            "",
        ]);
        expect(v512Sheet.getRange(2, 52).getFormulas()[0][0]).toBe("=40+2");
        const migratedV512Row = [...v512Sheet.__rows[1]];
        expect(legacyContext.migrateLegacyAppSheetBulkSheet_(v512Sheet)).toBe(
            false
        );
        expect(v512Sheet.__rows[1]).toEqual(migratedV512Row);

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
        const v513Formulas = Array(appSheetBulkV513Headers.length).fill("");
        v513Formulas[appSheetBulkV513Headers.length - 1] = "=50+1";
        const v513Sheet = createDataSheet(
            "App bulk",
            [[...appSheetBulkV513Headers], v513Row],
            [Array(appSheetBulkV513Headers.length).fill(""), v513Formulas]
        );

        expect(legacyContext.migrateLegacyAppSheetBulkSheet_(v513Sheet)).toBe(
            true
        );
        expect(v513Sheet.__rows[0]).toEqual(appSheetBulkHeaders);
        expect(
            v513Sheet.__rows[1].slice(
                appSheetBulkWeightStartIndex + appSheetBulkV513Plants.length,
                appSheetBulkNotesIndex
            )
        ).toEqual(Array(2).fill(""));
        expect(v513Sheet.__rows[1].slice(appSheetBulkNotesIndex)).toEqual([
            ...v513Tail,
            "",
            "",
        ]);
        expect(v513Sheet.getRange(2, 52).getFormulas()[0][0]).toBe("=50+1");
        const migratedV513Row = [...v513Sheet.__rows[1]];
        expect(legacyContext.migrateLegacyAppSheetBulkSheet_(v513Sheet)).toBe(
            false
        );
        expect(v513Sheet.__rows[1]).toEqual(migratedV513Row);
    });

    it("isolates missing and duplicated AppSheet queue identities", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        expect(context.processQueuedAppSheetEntries()).toMatchObject({
            ok: true,
            queuedCount: 0,
            processedCount: 0,
        });

        const missing = Array(appSheetEntryHeaders.length).fill("");
        missing[26] = "Queued";
        const duplicate = Array(appSheetEntryHeaders.length).fill("");
        duplicate[0] = "DUPQUEUE";
        duplicate[26] = "Queued";
        const duplicateAgain = [...duplicate];
        const entries = workbook.sheets.get("App entries");
        entries.__rows.push(missing, duplicate, duplicateAgain);
        context.saveWebObservationBatch = () => {
            throw new Error("Invalid queue rows must not reach History.");
        };

        const result = context.processQueuedAppSheetEntries();

        expect(result).toMatchObject({
            ok: false,
            queuedCount: 3,
            processedCount: 3,
            savedCount: 0,
            needsCorrectionCount: 3,
            retryCount: 0,
        });
        expect(missing[27]).toMatch(/Entry ID is required/i);
        expect(duplicate[27]).toMatch(/duplicated/i);
        expect(duplicateAgain[27]).toMatch(/duplicated/i);

        const invalidRequest = Array(appSheetEntryHeaders.length).fill("");
        invalidRequest[0] = "STRINGERR";
        invalidRequest[26] = "Queued";
        entries.__rows.push(invalidRequest);
        context.normalizeRequestId_ = () => {
            throw "String request failure";
        };
        expect(context.processQueuedAppSheetEntries()).toMatchObject({
            needsCorrectionCount: 1,
        });
        expect(invalidRequest[27]).toBe("String request failure");
    });

    it("does not flush or scan History when both AppSheet queues are empty", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        let flushCount = 0;
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
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
            ok: true,
            queuedCount: 0,
            processedCount: 0,
            bulk: {
                queuedCount: 0,
                processedCount: 0,
            },
        });
        expect(flushCount).toBe(0);
        expect(workbook.history.__rangeReads).toHaveLength(0);
    });

    it("maps retryable and missing AppSheet batch results to receipts", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const first = Array(appSheetEntryHeaders.length).fill("");
        first[0] = "QUEUE003";
        first[2] = "P01";
        first[3] = "Check";
        first[9] = "Firm";
        first[26] = "Queued";
        const second = [...first];
        second[0] = "QUEUE004";
        workbook.sheets.get("App entries").__rows.push(first, second);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        context.saveWebObservationBatch = () => ({
            results: [
                {
                    ok: false,
                    retryable: true,
                    message: "Temporary service failure.",
                },
                null,
            ],
        });

        const result = context.processQueuedAppSheetEntries();

        expect(first[26]).toBe("Retry");
        expect(second[26]).toBe("Needs correction");
        expect(second[27]).toMatch(/needs correction/i);
        expect(result).toMatchObject({
            retryCount: 1,
            needsCorrectionCount: 1,
        });
    });

    it("defers AppSheet queue rows beyond the 50-entry batch bound", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const entries = workbook.sheets.get("App entries");
        for (let index = 0; index < 51; index += 1) {
            const entry = Array(appSheetEntryHeaders.length).fill("");
            entry[0] = `QUEUE${String(index).padStart(4, "0")}`;
            entry[2] = "P01";
            entry[3] = "Check";
            entry[9] = "Firm";
            entry[26] = "Queued";
            entries.__rows.push(entry);
        }
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        let submittedCount = 0;
        context.saveWebObservationBatch = (payloads) => {
            submittedCount = payloads.length;
            return {
                results: payloads.map(() => ({
                    ok: true,
                    retryable: false,
                    historyRows: 1,
                    message: "Saved.",
                })),
            };
        };

        const result = context.processQueuedAppSheetEntries();

        expect(submittedCount).toBe(50);
        expect(result).toMatchObject({
            ok: true,
            queuedCount: 51,
            processedCount: 50,
            savedCount: 50,
            deferredCount: 1,
        });
        expect(entries.__rows.at(-1)[26]).toBe("Queued");
    });

    it("keeps queued AppSheet rows retryable after an infrastructure failure", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const entry = Array(appSheetEntryHeaders.length).fill("");
        entry[0] = "QUEUE002";
        entry[2] = "P01";
        entry[3] = "Check";
        entry[9] = "Firm";
        entry[26] = "Queued";
        workbook.sheets.get("App entries").__rows.push(entry);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        vm.runInContext(
            'saveWebObservationBatch = () => { throw new Error("Another reading is finishing."); };',
            context
        );

        const result = context.processQueuedAppSheetEntries();

        expect(entry[26]).toBe("Retry");
        expect(entry[27]).toMatch(/another reading/i);
        expect(entry[28]).toBe("appsheet-QUEUE002");
        expect(result).toMatchObject({
            ok: false,
            processedCount: 1,
            savedCount: 0,
            needsCorrectionCount: 0,
            retryCount: 1,
        });

        entry[26] = "Queued";
        context.saveWebObservationBatch = () => {
            throw "String service failure";
        };
        expect(context.processQueuedAppSheetEntries()).toMatchObject({
            retryCount: 1,
        });
        expect(entry[27]).toBe("String service failure");
    });

    it("keeps exactly one AppSheet queue trigger", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const deleted = [];
        const created = [];
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
            deleteTrigger: (trigger) => deleted.push(trigger.name),
            getProjectTriggers: () => triggers,
            newTrigger: (handler) => ({
                timeBased: () => ({
                    everyMinutes: (minutes) => ({
                        create: () => created.push({ handler, minutes }),
                    }),
                }),
            }),
        };
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: { ...workbook.globals, ScriptApp },
        });

        expect(context.installAppSheetQueueTrigger()).toEqual({
            handler: "processQueuedAppSheetEntries",
            created: true,
            removedTriggerCount: 2,
            removedDuplicateCount: 1,
        });
        expect(deleted).toEqual(["first", "duplicate"]);
        expect(created).toEqual([
            { handler: "processQueuedAppSheetEntries", minutes: 5 },
        ]);

        triggers = [{ getHandlerFunction: () => "otherHandler" }];
        expect(context.installAppSheetQueueTrigger()).toEqual({
            handler: "processQueuedAppSheetEntries",
            created: true,
            removedTriggerCount: 0,
            removedDuplicateCount: 0,
        });
        expect(created).toEqual([
            { handler: "processQueuedAppSheetEntries", minutes: 5 },
            { handler: "processQueuedAppSheetEntries", minutes: 5 },
        ]);
    });

    it("keeps a bad queued item isolated while saving valid neighbors", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        const result = context.saveWebObservationBatch([
            {
                plantId: "P01",
                requestId: "garden-queue-good-12345",
                observedAt: "2026-08-16T10:00:00-04:00",
                events: ["Weigh"],
                weight: 410,
            },
            {
                plantId: "P02",
                requestId: "garden-queue-bad-12345",
                observedAt: "2026-08-16T10:01:00-04:00",
                events: ["Measure"],
            },
            {
                plantId: "P01",
                requestId: "short",
                observedAt: "2026-08-16T10:02:00-04:00",
                events: ["Weigh"],
                weight: 411,
            },
        ]);

        expect(result).toMatchObject({
            ok: false,
            savedCount: 1,
            failedCount: 2,
        });
        expect(result.results[1]).toMatchObject({
            ok: false,
            requestId: "garden-queue-bad-12345",
        });
        expect(result.results[1].message).toMatch(/height or width/i);
        expect(result.results[2]).toMatchObject({
            ok: false,
            requestId: "short",
            retryable: false,
            errorCode: "VALIDATION",
        });
        expect(result.results[2].message).toMatch(/request ID is not valid/i);
    });

    it("keeps partial and conflicting request reservations non-retryable", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const partialRow = Array(42).fill("");
        partialRow[0] = new Date("2026-08-16T12:00:00Z");
        partialRow[1] = "P01";
        partialRow[2] = "Weigh";
        partialRow[15] = "garden-partial-batch-12345";
        const conflictRow = Array(42).fill("");
        conflictRow[0] = new Date("2026-08-16T12:01:00Z");
        conflictRow[1] = "P02";
        conflictRow[2] = "Weigh";
        conflictRow[15] = "garden-conflict-batch-12345";
        workbook.history.__rows.push(partialRow, conflictRow);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        const result = context.saveWebObservationBatch([
            {
                plantId: "P01",
                requestId: "garden-partial-batch-12345",
                observedAt: "2026-08-16T12:00:00Z",
                events: ["Weigh"],
                weightState: "Wet",
                weight: 450,
                nutrientsUsed: "No",
            },
            {
                plantId: "P02",
                requestId: "garden-conflict-batch-12345",
                observedAt: "2026-08-16T12:01:00Z",
                events: ["Measure"],
                height: 5,
                measurementUnit: "in",
            },
        ]);

        expect(result).toMatchObject({
            ok: false,
            savedCount: 0,
            failedCount: 2,
        });
        expect(result.results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    requestId: "garden-partial-batch-12345",
                    retryable: false,
                    errorCode: "HISTORY_CONFLICT",
                }),
                expect.objectContaining({
                    requestId: "garden-conflict-batch-12345",
                    retryable: false,
                    errorCode: "HISTORY_CONFLICT",
                }),
            ])
        );
        expect(workbook.history.__setValuesCalls).toHaveLength(0);
    });

    it("repairs a correctly shaped but incomplete request reservation", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const reservedRow = Array(42).fill("");
        reservedRow[1] = "P01";
        reservedRow[2] = "Weigh";
        reservedRow[15] = "garden-reserved-batch-12345";
        workbook.history.__rows.push(reservedRow);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const payload = {
            plantId: "P01",
            requestId: "garden-reserved-batch-12345",
            observedAt: "2026-08-16T12:00:00Z",
            events: ["Weigh"],
            weightState: "Routine",
            weight: 450,
        };

        const result = context.saveWebObservationBatch([payload]);
        const retry = context.saveWebObservationBatch([payload]);

        expect(result).toMatchObject({
            ok: true,
            savedCount: 1,
            failedCount: 0,
        });
        expect(retry.results[0]).toMatchObject({
            ok: true,
            duplicate: true,
            historyRows: 1,
        });
        expect(workbook.history.__rows).toHaveLength(2);
        expect(workbook.history.__rows[1][0]).toBeInstanceOf(Date);
        expect(workbook.history.__rows[1][4]).toBe(450);
        expect(workbook.history.__setValuesCalls).toEqual([
            { row: 2, column: 1, rowCount: 1, columnCount: 42 },
        ]);
    });

    it("archives an idempotent multi-plant watering round", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const payload = {
            plantIds: [
                "P01",
                "P02",
                "P01",
            ],
            requestId: "garden-bulk-save-12345",
            observedAt: "2026-08-16T09:00:00-04:00",
            nutrientsUsed: "No",
            notes: "Full soak",
        };

        const first = context.saveBulkWaterObservation(payload);
        const retry = context.saveBulkWaterObservation(payload);
        const recent = Array.from(context.getRecentWebObservations(25));

        expect(first).toMatchObject({
            ok: true,
            plantCount: 2,
            duplicateCount: 0,
        });
        expect(retry).toMatchObject({
            ok: true,
            plantCount: 2,
            duplicateCount: 2,
        });
        expect(recent).toHaveLength(2);
        expect(recent.map((entry) => entry.plantId).sort()).toEqual([
            "P01",
            "P02",
        ]);
    });

    it("archives a 30-plant bulk watering round with one History write and flush", () => {
        const plantIds = Array.from(
            { length: 30 },
            (_, index) => `P${String(index + 1).padStart(2, "0")}`
        );
        const workbook = createLoggerWorkbook(plantIds);
        let flushCount = 0;
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
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
            plantIds,
            requestId: "garden-bulk-water-30-12345",
            observedAt: "2026-08-16T10:00:00-04:00",
            nutrientsUsed: "No",
            notes: "Full collection watering",
        });

        expect(result).toMatchObject({
            ok: true,
            plantCount: 30,
            duplicateCount: 0,
        });
        expect(workbook.history.__setValuesCalls).toEqual([
            { row: 2, column: 1, rowCount: 30, columnCount: 42 },
        ]);
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
        expect(
            new Set(workbook.history.__rows.slice(1).map((row) => row[15])).size
        ).toBe(30);
    });

    it("builds the Apps Script web response and menu entry points", () => {
        const calls = [];
        const menu = {
            addItem(label, action) {
                calls.push([label, action]);
                return menu;
            },
            addSeparator: () => menu,
            addToUi: () => menu,
        };
        const ui = {
            createMenu: () => menu,
            showModalDialog: (html, title) => calls.push([title, html]),
        };
        const html = {
            addMetaTag: () => html,
            setFaviconUrl(value) {
                calls.push(["favicon", value]);
                return html;
            },
            setHeight: () => html,
            setTitle: () => html,
            setWidth: () => html,
        };
        const activeSheets = new Map(
            ["Quick log", "History"].map((name) => [
                name,
                {
                    selected: "",
                    setActiveSelection(cell) {
                        this.selected = cell;
                    },
                },
            ])
        );
        const activeSpreadsheet = {
            getSheetByName: (name) => activeSheets.get(name) ?? null,
            setActiveSheet: () => {},
        };
        const context = loadAppsScript(createHistorySheet(), {
            SpreadsheetApp: {
                getActive: () => activeSpreadsheet,
                getUi: () => ui,
                openById: () => activeSpreadsheet,
            },
            globals: {
                HtmlService: { createHtmlOutputFromFile: () => html },
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
        expect(activeSheets.get("Quick log").selected).toBe("D5");
        expect(activeSheets.get("History").selected).toBe("A2");
    });

    it("verifies the bound workbook installation contract", () => {
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
        quickLog.getRange = (...args) => {
            if (typeof args[0] !== "string") return originalGetRange(...args);
            return { setNote: () => quickLog };
        };
        workbook.sheets.set("Quick log", quickLog);
        const calls = {};
        workbook.spreadsheet.toast = (message, title) => {
            calls.toast = [message, title];
        };
        const context = loadAppsScript(workbook.history, {
            SpreadsheetApp: {
                getActive: () => workbook.spreadsheet,
                newDataValidation: createDataValidationBuilder,
                openById: () => workbook.spreadsheet,
                ProtectionType: { RANGE: "RANGE" },
            },
            spreadsheet: workbook.spreadsheet,
            globals: {
                PropertiesService: {
                    getDocumentProperties: () => ({
                        setProperties: (value) => {
                            calls.properties = value;
                        },
                    }),
                },
                Session: {
                    getScriptTimeZone: () => "America/New_York",
                },
            },
        });

        context.installGardenLogger();
        context.installGardenLogger();

        expect(calls.properties.gardenLoggerVersion).toBe("5.16.3");
        expect(calls.toast[1]).toBe("Garden logger verified");
        expect(calls.toast[0]).toMatch(/Logger 5\.16\.3 is ready/);
        expect(quickLog.__protections).toHaveLength(1);
        expect(workbook.history.__protections).toHaveLength(5);
        expect(
            workbook.history.__protections.every((protection) =>
                protection.isWarningOnly()
            )
        ).toBe(true);
    });

    it("migrates and validates the append-only watering columns", () => {
        const compactHistory = createHistorySheet();
        compactHistory.__rows[0].splice(40, 2);
        const context = loadAppsScript(compactHistory);

        context.ensureHistoryWaterColumns_(compactHistory);
        expect(compactHistory.__rows[0].slice(40, 42)).toEqual(
            historyWaterHeaders
        );
        expect(compactHistory.getMaxColumns()).toBe(42);

        const currentHistory = createHistorySheet();
        currentHistory.getMaxRows = () => 5000;
        const currentContext = loadAppsScript(currentHistory);
        currentContext.ensureHistoryWaterColumns_(currentHistory);
        expect(currentHistory.__rows[0].slice(40, 42)).toEqual(
            historyWaterHeaders
        );

        const malformedHistory = createHistorySheet();
        malformedHistory.__rows[0][41] = "Water amount";
        const malformedContext = loadAppsScript(malformedHistory);
        expect(() =>
            malformedContext.ensureHistoryWaterColumns_(malformedHistory)
        ).toThrow(/History!AP1 must be "Water amount \(mL\)"/i);

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
        expect(partialQuickLog.__rows[3].slice(13, 15)).toEqual(
            historyWaterHeaders
        );
        expect(context.ensureQuickLogWaterColumns_(partialQuickLog)).toBe(
            false
        );

        const tableBackedQuickLog = createDataSheet("Quick log", [
            [],
            [],
            [],
            [
                ...partialQuickLog.__rows[3].slice(0, 13),
                "Column 14",
                "Column 15",
            ],
        ]);
        expect(context.ensureQuickLogWaterColumns_(tableBackedQuickLog)).toBe(
            true
        );
        expect(tableBackedQuickLog.__rows[3].slice(13, 15)).toEqual(
            historyWaterHeaders
        );

        partialQuickLog.__rows[3][14] = "Water amount";
        expect(() =>
            context.ensureQuickLogWaterColumns_(partialQuickLog)
        ).toThrow(/Quick log!O4 must be "Water amount \(mL\)"/i);

        const historyView = createDataSheet(
            "History view",
            [Array(40).fill("")],
            [
                [
                    '=LET(rows,SORT(FILTER(History!A2:AN5000,History!A2:A5000<>""),1,FALSE,10,FALSE),rows)',
                    ...Array(39).fill(""),
                ],
            ]
        );
        const spreadsheet = {
            getSheetByName: (name) =>
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
        tableBackedHistory.__rows[0][40] = "Column 41";
        tableBackedHistory.__rows[0][41] = "Column 42";
        expect(
            context.ensureHistoryWaterColumns_(tableBackedHistory)
        ).toBeUndefined();
        expect(tableBackedHistory.__rows[0].slice(40, 42)).toEqual(
            historyWaterHeaders
        );
    });

    it("extends the previous AppSheet entry schema without shifting data", () => {
        const workbook = createLoggerWorkbook(["P01"]);
        const previousHeaders = appSheetEntryHeaders.slice(0, -2);
        const stagedRow = Array(previousHeaders.length).fill("");
        stagedRow[0] = "ENTRY123";
        stagedRow[31] = 90;
        const entries = createDataSheet("App entries", [
            previousHeaders,
            stagedRow,
        ]);
        entries.__setParent(workbook.spreadsheet);
        workbook.sheets.set("App entries", entries);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        expect(context.ensureAppSheetEntryColumns_(entries, true)).toBe(true);
        expect(entries.__rows[0]).toEqual(appSheetEntryHeaders);
        expect(entries.__rows[1]).toEqual(stagedRow);
        expect(entries.getRange(2, 33, 1, 2).getDisplayValues()[0]).toEqual([
            "",
            "",
        ]);

        const tableBackedEntries = createDataSheet("App entries", [
            [
                ...appSheetEntryHeaders.slice(0, -2),
                "Column 33",
                "Column 34",
            ],
        ]);
        tableBackedEntries.__setParent(workbook.spreadsheet);
        expect(
            context.ensureAppSheetEntryColumns_(tableBackedEntries, true)
        ).toBe(true);
        expect(tableBackedEntries.__rows[0]).toEqual(appSheetEntryHeaders);

        entries.__rows[0][33] = "Water amount";
        expect(() => context.ensureAppSheetEntryColumns_(entries)).toThrow(
            /App entries!AH1 must be "Water amount \(mL\)"/i
        );
    });

    it("excludes selected History observations without destroying their audit trail", () => {
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
        history.__rows[1][12] = "helper-name";
        history.__rows[1][13] = "helper-cycle";
        history.__rows[1][16] = "detail";
        const selection = {
            getRow: () => 2,
            getLastRow: () => 2,
        };
        const activeSpreadsheet = {
            getActiveRange: () => selection,
            getActiveSheet: () => history,
            getSheetByName: (name) => (name === "History" ? history : null),
            getSpreadsheetTimeZone: () => "America/New_York",
            toast: () => {},
        };
        const ui = {
            Button: { YES: "YES" },
            ButtonSet: { YES_NO: "YES_NO" },
            alert: () => "YES",
        };
        const context = loadAppsScript(history, {
            SpreadsheetApp: {
                getActive: () => activeSpreadsheet,
                getUi: () => ui,
            },
        });

        context.removeSelectedHistoryObservations();

        expect(history.__rows[1].slice(0, 5)).toEqual([
            new Date("2026-08-12T12:00:00Z"),
            "P20",
            "Weigh",
            "Routine",
            1450,
        ]);
        expect(history.__rows[1].slice(12, 15)).toEqual([
            "helper-name",
            "helper-cycle",
            "",
        ]);
        expect(history.__rows[1][15]).toBe("garden-remove-12345");
        expect(history.__rows[1][16]).toBe("detail");
        expect(history.__rows[1][31]).toMatch(/Excluded from active analysis/);
        expect(history.__rows[1][35]).toBe("Removed");
    });

    it("covers validation, identity, and formatting helpers", () => {
        const history = createHistorySheet();
        const context = loadAppsScript(history);

        expect(context.normalizeDate_(null)).toBeInstanceOf(Date);
        expect(context.normalizeDate_("2026-08-16T12:00:00Z")).toBeInstanceOf(
            Date
        );
        expect(() => context.normalizeDate_("not-a-date")).toThrow(
            /not valid/i
        );
        expect(() => context.normalizeDate_(new Date(Number.NaN))).toThrow(
            /not valid/i
        );
        expect(context.optionalPositiveNumber_("2.5", "Weight")).toBe(2.5);
        expect(context.optionalPositiveNumber_("", "Weight")).toBe("");
        expect(context.optionalPositiveNumber_(null, "Weight")).toBe("");
        expect(context.optionalPositiveNumber_(undefined, "Weight")).toBe("");
        expect(() => context.optionalPositiveNumber_(0, "Weight")).toThrow(
            /positive number/i
        );
        expect(context.optionalPositiveInteger_(3, "Count")).toBe(3);
        expect(context.optionalPositiveInteger_(undefined, "Count")).toBe("");
        expect(context.optionalPositiveInteger_(null, "Count")).toBe("");
        expect(context.optionalPositiveInteger_("", "Count")).toBe("");
        expect(() => context.optionalPositiveInteger_(1.5, "Count")).toThrow(
            /whole number/i
        );
        expect(context.positiveInteger_(2, "Setup")).toBe(2);
        expect(() => context.positiveInteger_(0, "Setup")).toThrow(
            /whole number/i
        );
        expect(
            Array.from(
                context.uniqueTextValues_([
                    " P01 ",
                    "P01",
                    "",
                ])
            )
        ).toEqual(["P01"]);
        expect(context.fieldGuideUrlForRow_(["", ""])).toContain(
            "nick2bad4u.github.io"
        );
        const guideFormula = Array(15).fill("");
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
        expect(context.comparableHistoryValue_(comparisonDate)).toBe(
            comparisonDate.getTime()
        );
        expect(context.comparableHistoryValue_(null)).toBe("");
        expect(context.comparableHistoryValue_(undefined)).toBe("");
        expect(context.comparableHistoryValue_("  value  ")).toBe("value");
        expect(() =>
            context.buildEventNames_("", "", "", "", "", "", "")
        ).toThrow(/Enter an event/i);
        expect(
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
        ).toEqual([
            "Weigh",
            "Measure",
            "Check",
        ]);
        expect(
            Array.from(context.buildEventNames_("", "", "", "", "", "", "Note"))
        ).toEqual(["Note"]);
        expect(
            Array.from(
                context.buildEventNamesFromList_([], "", "", "", "", "", "Note")
            )
        ).toEqual(["Note"]);
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
                new Date(Number.NaN),
                "America/New_York",
                "MMM d"
            )
        ).toBe("");
        context.assertUniquePlantIds_([{ id: "P01" }, { id: "P02" }]);
        expect(() =>
            context.assertUniquePlantIds_([{ id: "P01" }, { id: "P01" }])
        ).toThrow(/more than once/i);
        expect(() =>
            context.assertUniqueIdsInRows_([["P01"], ["P01"]], "Baselines")
        ).toThrow(/Baselines/i);
        context.assertUniqueIdsInRows_(
            [
                [""],
                ["P01"],
                ["P02"],
            ],
            "Baselines"
        );
        expect(context.cleanText_(null)).toBe("");
        expect(context.cleanText_(undefined)).toBe("");
        expect(context.cleanText_(" value ")).toBe("value");
        expect(context.safeSheetText_("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
        expect(context.safeSheetText_("plain")).toBe("plain");
        expect(context.normalizeRequestId_("")).toBe("test-request-id");
        expect(() => context.normalizeRequestId_("", true)).toThrow(
            /missing its retry key/i
        );
        expect(() => context.normalizeRequestId_("short", false)).toThrow(
            /not valid/i
        );
        expect(
            context.requireSheet_({ getSheetByName: () => history }, "History")
        ).toBe(history);
        expect(() =>
            context.requireSheet_({ getSheetByName: () => null }, "Missing")
        ).toThrow(/Missing required sheet/i);

        const saveCellState = {};
        const errorContext = loadAppsScript(history, {
            SpreadsheetApp: {
                getActive: () => ({
                    toast: (message, title) => {
                        saveCellState.toast = [message, title];
                    },
                }),
                openById: () => ({
                    getSheetByName: (name) =>
                        name === "History" ? history : null,
                }),
            },
        });
        const saveCell = {
            setBackground(value) {
                saveCellState.background = value;
                return saveCell;
            },
            setNote(value) {
                saveCellState.note = value;
                return saveCell;
            },
            setValue(value) {
                saveCellState.value = value;
                return saveCell;
            },
        };
        errorContext.markSaveError_(saveCell, "Try again");
        expect(saveCellState).toMatchObject({
            background: "#f4cccc",
            note: "Not saved: Try again",
            value: false,
            toast: ["Try again", "Observation not saved"],
        });
        expect(() =>
            errorContext.assertHeaders_(
                createDataSheet("Wrong", [["Incorrect"]]),
                ["Expected"],
                1
            )
        ).toThrow(/Wrong!A1 must be/i);
        errorContext.assertHeaders_(
            createDataSheet("Right", [["Expected"]]),
            ["Expected"],
            1
        );

        const emptyHeaders = createHistorySheet();
        emptyHeaders.__rows[0][15] = "";
        historyDetailHeaders.forEach((_, index) => {
            emptyHeaders.__rows[0][16 + index] = "";
        });
        historyProvenanceHeaders.forEach((_, index) => {
            emptyHeaders.__rows[0][26 + index] = "";
        });
        historyMeasurementHeaders.forEach((_, index) => {
            emptyHeaders.__rows[0][36 + index] = "";
        });
        emptyHeaders.__rows[0][39] = "";
        context.ensureHistoryRequestIdColumn_(emptyHeaders);
        context.ensureHistoryDetailColumns_(emptyHeaders);
        context.ensureHistoryProvenanceColumns_(emptyHeaders);
        context.ensureHistoryMeasurementColumns_(emptyHeaders);
        context.ensureHistoryRotationColumns_(emptyHeaders, true);
        expect(emptyHeaders.__rows[0][15]).toBe("Request ID");
        expect(emptyHeaders.__rows[0].slice(16, 26)).toEqual(
            historyDetailHeaders
        );
        expect(emptyHeaders.__rows[0].slice(26, 36)).toEqual(
            historyProvenanceHeaders
        );
        expect(emptyHeaders.__rows[0].slice(36, 39)).toEqual(
            historyMeasurementHeaders
        );
        expect(emptyHeaders.__rows[0].slice(39, 40)).toEqual(
            historyRotationHeaders
        );
        const badMeasurementHeader = createHistorySheet();
        badMeasurementHeader.__rows[0][37] = "Inches";
        expect(() =>
            context.ensureHistoryMeasurementColumns_(badMeasurementHeader)
        ).toThrow(/must be "Height \(in\)"/i);
        const badRotationHeader = createHistorySheet();
        badRotationHeader.__rows[0][39] = "Turn";
        expect(() =>
            context.ensureHistoryRotationColumns_(badRotationHeader)
        ).toThrow(/must be "Rotation \(°\)"/i);
    });

    it("repairs narrow History grids and enforces defensive source/header guards", () => {
        const context = loadAppsScript(createHistorySheet());

        expect(context.normalizeWebEntrySource_("")).toBe("Mobile logger");
        expect(context.normalizeWebEntrySource_("AppSheet")).toBe("AppSheet");
        expect(context.normalizeWebEntrySource_("AppSheet bulk")).toBe(
            "AppSheet bulk"
        );
        expect(() =>
            context.normalizeWebEntrySource_("Unknown client")
        ).toThrow(
            /Entry source must be Mobile logger, Mobile bulk water, Mobile bulk care, AppSheet, or AppSheet bulk/i
        );

        const validHeaders = createHistorySheet();
        context.ensureHistoryProvenanceColumns_(validHeaders);
        context.ensureHistoryMeasurementColumns_(validHeaders);

        const badProvenanceHeader = createHistorySheet();
        badProvenanceHeader.__rows[0][26] = "Wrong observation key";
        expect(() =>
            context.ensureHistoryProvenanceColumns_(badProvenanceHeader)
        ).toThrow(/must be "Observation ID"/i);

        const narrowHistory = createHistorySheet();
        narrowHistory.__rows.forEach((row) => row.splice(30));
        context.ensureHistoryGrid_(narrowHistory);
        expect(narrowHistory.getMaxColumns()).toBe(42);

        const unvalidatedHistory = createHistorySheet();
        const storedRow = Array(42).fill("");
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
                        correctionReason: "Corrected after ruler check",
                        correctedObservationId: "prior-observation",
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
        expect(
            Array.from(
                context.historyProvenanceRow_(
                    { entrySource: "AppSheet" },
                    "appsheet-entry-12345",
                    "Weigh",
                    1
                )
            ).slice(2, 3)
        ).toEqual(["Measured"]);
        expect(
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
        ).toEqual(["Measured"]);

        const sameObservedAt = new Date("2026-08-25T12:00:00Z");
        const recordedFirst = Array(42).fill("");
        recordedFirst[0] = sameObservedAt;
        recordedFirst[1] = "P01";
        recordedFirst[2] = "Weigh";
        recordedFirst[4] = null;
        recordedFirst[9] = new Date("2026-08-25T12:01:00Z");
        const recordedSecond = Array(42).fill("");
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
        expect(sortedHistory.map((row) => row.plantId)).toEqual(["P02", "P01"]);
        expect(sortedHistory[1].weight).toBe("");
    });

    it("handles empty, missing, and noncontiguous History snapshots", () => {
        const emptyHistory = createHistorySheet();
        const emptyTracker = createDataSheet("Plant tracker", [
            ["Plant ID", "Plant / planter"],
        ]);
        const emptySpreadsheet = {
            getSheetByName: (name) =>
                name === "History" ? emptyHistory : emptyTracker,
        };
        const emptyContext = loadAppsScript(emptyHistory, {
            spreadsheet: emptySpreadsheet,
        });

        expect(
            Array.from(emptyContext.readHistorySnapshot_(emptySpreadsheet))
        ).toEqual([]);
        expect(emptyContext.lastHistoryDataRow_(emptyHistory)).toBe(1);
        expect(emptyContext.lastHistoryReservedRow_(emptyHistory)).toBe(1);
        expect(
            Array.from(
                emptyContext.historyRowsForRequest_(
                    emptyHistory,
                    "garden-history-missing-12345"
                )
            )
        ).toEqual([]);
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

        const older = Array(42).fill("");
        older[0] = new Date("2026-08-15T12:00:00Z");
        older[1] = "P01";
        older[2] = "Clean";
        older[9] = new Date("2026-08-15T12:01:00Z");
        const newer = Array(42).fill("");
        newer[0] = new Date("2026-08-16T12:00:00Z");
        newer[1] = "P02";
        newer[2] = "Rotation";
        newer[9] = new Date("2026-08-16T12:01:00Z");
        expect(
            Array.from(
                noncontiguousContext.recentObservationsFromRows_(
                    [older, newer],
                    "America/New_York",
                    10,
                    new Map()
                )
            ).map((row) => row.plantId)
        ).toEqual(["P02", "P01"]);
    });

    it("reports queue request status and rejects unsafe status queries", () => {
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
            getSheetByName: (name) => (name === "History" ? history : null),
        };
        const context = loadAppsScript(history, { spreadsheet });

        expect(
            JSON.parse(
                JSON.stringify(
                    context.getWebBatchSaveStatus([
                        requestId,
                        "garden-missing-67890",
                    ])
                )
            )
        ).toEqual([
            { requestId, state: "saved" },
            {
                requestId: "garden-missing-67890",
                state: "missing",
            },
        ]);
        expect(
            JSON.parse(
                JSON.stringify(
                    context.getWebBatchSaveStatus([
                        {
                            requestId,
                            plantId: "P01",
                        },
                    ])
                )
            )
        ).toEqual([
            {
                requestId,
                state: "saved",
                savedCount: 1,
            },
        ]);
        expect(
            JSON.parse(
                JSON.stringify(
                    context.getWebBatchSaveStatus([
                        {
                            requestId,
                            plantId: "P01",
                            expectedCount: 1,
                        },
                        {
                            requestId: "garden-missing-67890",
                            plantId: "P01",
                            expectedCount: 2,
                        },
                    ])
                )
            )
        ).toEqual([
            {
                requestId,
                state: "saved",
                savedCount: 1,
                expectedCount: 1,
            },
            {
                requestId: "garden-missing-67890",
                state: "missing",
                savedCount: 0,
                expectedCount: 2,
            },
        ]);
        const rangeCountBefore = history.__rangeReads.length;
        context.getWebBatchSaveStatus(
            Array.from({ length: 28 }, (_, index) => ({
                requestId: `garden-status-${String(index).padStart(2, "0")}-12345`,
                plantId: "P01",
                expectedCount: 1,
            }))
        );
        const twentyEightStatusReads =
            history.__rangeReads.length - rangeCountBefore;
        const oneRangeCountBefore = history.__rangeReads.length;
        context.getWebBatchSaveStatus([
            {
                requestId: "garden-one-status-12345",
                plantId: "P01",
                expectedCount: 1,
            },
        ]);
        expect(history.__rangeReads.length - oneRangeCountBefore).toBe(
            twentyEightStatusReads
        );
        expect(() => context.getWebBatchSaveStatus("not-an-array")).toThrow(
            /up to 50/i
        );
        expect(() =>
            context.getWebBatchSaveStatus([requestId, requestId])
        ).toThrow(/unique/i);
        [
            0,
            14,
            1.5,
        ].forEach((expectedCount) => {
            expect(() =>
                context.getWebBatchSaveStatus([
                    {
                        requestId,
                        plantId: "P01",
                        expectedCount,
                    },
                ])
            ).toThrow(/integer from 1 to 13/i);
        });
    });

    it("reports wrong-plant, wrong-count, and noncontiguous batch shapes as incomplete", () => {
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
            getSheetByName: (name) => (name === "History" ? history : null),
        };
        const context = loadAppsScript(history, { spreadsheet });

        const [noncontiguous] = context.getWebBatchSaveStatus([
            { requestId, plantId: "P01", expectedCount: 2 },
        ]);
        const [wrongPlant] = context.getWebBatchSaveStatus([
            {
                requestId: "garden-between-status-12345",
                plantId: "P01",
                expectedCount: 1,
            },
        ]);
        const [wrongCount] = context.getWebBatchSaveStatus([
            {
                requestId: "garden-between-status-12345",
                plantId: "P02",
                expectedCount: 2,
            },
        ]);
        expect(noncontiguous).toMatchObject({
            state: "incomplete",
            savedCount: 2,
            expectedCount: 2,
        });
        expect(wrongPlant).toMatchObject({
            state: "incomplete",
            savedCount: 0,
            expectedCount: 1,
        });
        expect(wrongCount).toMatchObject({
            state: "incomplete",
            savedCount: 1,
            expectedCount: 2,
        });
    });

    it("ignores completely blank rows when building a batch identity snapshot", () => {
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

    it("timestamps and infers Quick log events for partial edits", () => {
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
        quick.__setParent(workbook.spreadsheet);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        context.onEdit({
            range: quick.getRange(5, 7),
            value: "450",
        });
        expect(quickRows[4][3]).toBeInstanceOf(Date);
        expect(quickRows[4][4]).toBe("Weigh");

        context.onEdit({
            range: quick.getRange(6, 8),
            value: "8",
        });
        expect(quickRows[5][4]).toBe("Measure");

        quickRows[4][5] = "Wet";
        context.updateInferredEvent_(quick, 5, 6);
        expect(quickRows[4][4]).toBe("Weigh");

        quickRows[4][5] = "";
        quickRows[4][6] = "";
        quickRows[4][7] = "";
        quickRows[4][8] = "";
        context.updateInferredEvent_(quick, 5, 7);
        expect(quickRows[4][4]).toBe("");
        context.updateInferredEvent_(quick, 5, 2);

        context.applyBulkEvent_(quick);
        expect(quickRows[4][4]).toBe("Water");
        expect(quickRows[5][4]).toBe("Water");
        quickRows[2][1] = "Clear events";
        context.applyBulkEvent_(quick);
        expect(quickRows[4][4]).toBe("");
        expect(quickRows[5][4]).toBe("");
    });

    it("archives a Quick log weight and leaves the row ready for reuse", () => {
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
        const toasts = [];
        workbook.spreadsheet.toast = (...args) => toasts.push(args);
        workbook.sheets.set("Quick log", quick);
        quick.__setParent(workbook.spreadsheet);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        context.archiveQuickLogRow_(quick, 5);

        expect(workbook.history.__rows[1].slice(1, 5)).toEqual([
            "P01",
            "Weigh",
            "Routine",
            451,
        ]);
        expect(quickRows[4].slice(3, 11)).toEqual(Array(8).fill(""));
        expect(quickRows[4][2]).toBe(false);
        expect(toasts[0][0]).toMatch(/History rows? added/);

        quickRows[4][0] = "";
        expect(() => context.archiveQuickLogRow_(quick, 5)).toThrow(
            /no Plant ID/i
        );
    });

    it("rejects invalid Quick log combinations without clearing the row", () => {
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
            Array(12).fill(""),
        ];
        const quick = createDataSheet("Quick log", quickRows);
        workbook.sheets.set("Quick log", quick);
        quick.__setParent(workbook.spreadsheet);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const row = quickRows[4];
        row[0] = "P01";
        row[3] = new Date("2026-08-16T12:00:00Z");
        row[11] = 1;

        row[4] = "Invalid";
        expect(() => context.archiveQuickLogRow_(quick, 5)).toThrow(
            /Event must be one of/i
        );
        row[4] = "";
        row[5] = "Invalid";
        expect(() => context.archiveQuickLogRow_(quick, 5)).toThrow(
            /Weight state must be/i
        );
        row[5] = "Dry";
        expect(() => context.archiveQuickLogRow_(quick, 5)).toThrow(
            /Enter an event, measurement, condition, or note/i
        );
        row[5] = "";
        row[4] = "Weigh";
        expect(() => context.archiveQuickLogRow_(quick, 5)).toThrow(
            /Weigh was selected/i
        );
        row[4] = "Measure";
        expect(() => context.archiveQuickLogRow_(quick, 5)).toThrow(
            /no height or width/i
        );

        row[4] = "Weigh";
        row[6] = 452;
        context.archiveQuickLogRow_(quick, 5);
        expect(workbook.history.__rows[1][3]).toBe("Routine");
    });

    it("covers Quick log edit guards, bulk errors, and label misses", () => {
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
        quick.__setParent(workbook.spreadsheet);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });

        context.onEdit();
        context.onEdit({
            range: createDataSheet("Other", [[]]).getRange(1, 1),
        });
        context.stampEntryStartedAt_(quick, quick.getRange(3, 2));
        context.stampEntryStartedAt_(quick, quick.getRange(5, 5));
        expect(quickRows[4][3]).toBeInstanceOf(Date);

        context.applyBulkEvent_(quick);
        expect(quickRows[2][2]).toBe(false);
        const emptyQuick = createDataSheet("Quick log", [
            [],
            [],
            ["", "Water"],
        ]);
        emptyQuick.__setParent(workbook.spreadsheet);
        context.applyBulkEvent_(emptyQuick);

        expect(context.currentLabelForPlant_(workbook.spreadsheet, "P99")).toBe(
            ""
        );
        const emptyTrackerWorkbook = {
            getSheetByName: (name) =>
                name === "Plant tracker"
                    ? createDataSheet("Plant tracker", [[]])
                    : null,
        };
        expect(context.currentLabelForPlant_(emptyTrackerWorkbook, "P01")).toBe(
            ""
        );
    });

    it("covers optional event-detail and History lookup branches", () => {
        const emptyHistory = createHistorySheet();
        const context = loadAppsScript(emptyHistory);
        const emptyDetails = context.eventDetailsFromPayload_({}, [], null);
        expect(JSON.parse(JSON.stringify(emptyDetails))).toEqual({
            nutrientsUsed: "",
            nutrientProduct: "",
            nutrientAmount: "",
            previousPotSize: "",
            potSize: "",
            flowerCount: "",
            flowerDetails: "",
            photoUrl: "",
            pestIssue: "",
            pestTreatment: "",
            rotationDegrees: "",
            wateringApplication: "",
            waterAmount: "",
        });
        expect(() =>
            context.eventDetailsFromPayload_(
                { nutrientsUsed: "Yes" },
                ["Water"],
                null
            )
        ).toThrow(/both the nutrient product/i);
        expect(
            context.eventDetailsFromPayload_(
                { nutrientsUsed: "No" },
                ["Water"],
                null
            )
        ).toMatchObject({
            nutrientProduct: "",
            wateringApplication: "Flood / soak-through",
            waterAmount: "",
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
        ).toThrow(/watering application/i);
        expect(() =>
            context.eventDetailsFromPayload_(
                { nutrientsUsed: "No", waterAmount: 0 },
                ["Water"],
                null
            )
        ).toThrow(/Water amount must be a positive number/i);
        expect(() =>
            context.eventDetailsFromPayload_({}, ["Repot"], {})
        ).toThrow(/new pot size/i);
        expect(() =>
            context.eventDetailsFromPayload_({}, ["Flower"], null)
        ).toThrow(/flower count/i);
        expect(() =>
            context.eventDetailsFromPayload_(
                { photoUrl: "https://example.test/photo" },
                ["Photo"],
                null
            )
        ).toThrow(/Google Photos/i);
        expect(() =>
            context.eventDetailsFromPayload_(
                { pestIssue: "Mites" },
                ["Pest"],
                null
            )
        ).toThrow(/both the pest/i);
        expect(context.plantRecordForId_({}, "")).toBeNull();
        expect(
            context.historyRowsForRequest_(emptyHistory, "garden-none-12345")
        ).toEqual([]);
        expect(
            JSON.parse(
                JSON.stringify(
                    context.savedRequestStatus_(
                        emptyHistory,
                        "garden-none-12345"
                    )
                )
            )
        ).toEqual({ state: "missing", requestId: "garden-none-12345" });
        expect(context.lastHistoryDataRow_(emptyHistory)).toBe(1);
        expect(context.lastHistoryReservedRow_(emptyHistory)).toBe(1);

        const malformedHeaders = createHistorySheet();
        malformedHeaders.__rows[0][15] = "Wrong";
        expect(() =>
            context.ensureHistoryRequestIdColumn_(malformedHeaders)
        ).toThrow(/P1 must be/i);
        const malformedDetails = createHistorySheet();
        malformedDetails.__rows[0][16] = "Wrong";
        expect(() =>
            context.ensureHistoryDetailColumns_(malformedDetails)
        ).toThrow(/Q1 must be/i);
    });

    it("covers queue size, identity, and lock guards", () => {
        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        expect(() => context.saveWebObservationBatch([])).toThrow(/empty/i);
        expect(() =>
            context.saveWebObservationBatch(
                Array.from({ length: 51 }, (_, index) => ({
                    requestId: `garden-overflow-${String(index).padStart(3, "0")}`,
                }))
            )
        ).toThrow(/at most 50/i);
        const duplicate = {
            requestId: "garden-duplicate-12345",
            plantId: "P01",
            events: ["Weigh"],
            weight: 450,
            observedAt: "2026-08-16T12:00:00Z",
        };
        expect(() =>
            context.saveWebObservationBatch([duplicate, duplicate])
        ).toThrow(/unique request ID/i);

        const locked = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: {
                LockService: {
                    getScriptLock: () => ({
                        tryLock: () => false,
                        releaseLock: () => {},
                    }),
                },
            },
        });
        expect(() => locked.saveWebObservation(duplicate)).toThrow(
            /Another reading/i
        );
        expect(() => locked.saveWebObservationBatch([duplicate])).toThrow(
            /queue remains/i
        );
    });

    it("covers empty bootstrap data and collection defaults", () => {
        const emptyHistory = createHistorySheet();
        const emptyTracker = createDataSheet("Plant tracker", [[]], [[]]);
        const emptyBaselines = createDataSheet("Baselines", [[]]);
        const emptySheets = new Map([
            ["Plant tracker", emptyTracker],
            ["Baselines", emptyBaselines],
            ["History", emptyHistory],
        ]);
        const emptySpreadsheet = {
            getSheetByName: (name) => emptySheets.get(name) ?? null,
            getSpreadsheetTimeZone: () => "America/New_York",
        };
        const emptyContext = loadAppsScript(emptyHistory, {
            spreadsheet: emptySpreadsheet,
        });
        expect(
            JSON.parse(JSON.stringify(emptyContext.getWebAppBootstrap().plants))
        ).toEqual([]);

        const trackerRow = Array(15).fill("");
        trackerRow[0] = "P99";
        trackerRow[1] = "Unmapped plant";
        trackerRow[14] = "Z9";
        const defaultTracker = createDataSheet(
            "Plant tracker",
            [Array(15).fill(""), trackerRow],
            [Array(15).fill(""), Array(15).fill("")]
        );
        const defaultBaselines = createDataSheet("Baselines", [
            [
                "Plant ID",
                "Dry baseline",
                "Pot setup",
            ],
        ]);
        const defaultSheets = new Map([
            ["Plant tracker", defaultTracker],
            ["Baselines", defaultBaselines],
            ["History", emptyHistory],
        ]);
        const defaultSpreadsheet = {
            getSheetByName: (name) => defaultSheets.get(name) ?? null,
            getSpreadsheetTimeZone: () => "America/New_York",
        };
        const defaultContext = loadAppsScript(emptyHistory, {
            spreadsheet: defaultSpreadsheet,
        });
        const [plant] = defaultContext.getWebAppBootstrap().plants;
        expect(plant.potSetup).toBe(1);
        expect(plant.currentPotSize).toBe("Not logged");
        expect(plant.fieldGuideUrl).toBe(
            "https://nick2bad4u.github.io/Gardening/"
        );

        defaultBaselines.getRange(2, 1, 1, 3).setValues([
            [
                "P99",
                "",
                "",
            ],
        ]);
        expect(defaultContext.getWebAppBootstrap().plants[0].potSetup).toBe(1);
    });

    it("resolves reordered Baselines headers and rejects ambiguous schemas", () => {
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

        expect(
            JSON.parse(JSON.stringify(context.baselinePotSetupData_(reordered)))
        ).toEqual({ potSetupColumn: 4, rows: [["P01", 3]] });
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
        ).toThrow(/more than one "Plant ID" header/i);
        expect(() =>
            context.requiredColumnForHeader_(
                createDataSheet("Missing", [["Plant ID"]]),
                "Pot setup"
            )
        ).toThrow(/missing the "Pot setup" header/i);
    });

    it("returns durable per-item failures for invalid and failed queue entries", () => {
        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        const payload = {
            requestId: "garden-queue-edge-12345",
            plantId: "P01",
            events: ["Weigh"],
            weight: 450,
            observedAt: "2026-08-16T12:00:00Z",
        };

        const originalNormalizeRequestId = context.normalizeRequestId_;
        context.normalizeRequestId_ = () => {
            throw "invalid request ID";
        };
        const invalidRequestId = context.saveWebObservationBatch([payload]);
        expect(invalidRequestId.results[0].message).toBe("invalid request ID");
        context.normalizeRequestId_ = originalNormalizeRequestId;

        const originalPrepare = context.prepareWebObservation_;
        context.prepareWebObservation_ = () => {
            throw "invalid queue item";
        };
        const invalid = context.saveWebObservationBatch([payload]);
        expect(invalid.savedCount).toBe(0);
        expect(invalid.results[0].message).toBe("invalid queue item");
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
        const workbook = createLoggerWorkbook();
        const existingRow = Array(42).fill("");
        existingRow[0] = new Date("2026-08-16T12:00:00Z");
        existingRow[1] = "P01";
        existingRow[2] = "Weigh";
        existingRow[15] = "garden-string-conflict-12345";
        workbook.history.__rows.push(existingRow);
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        vm.runInContext(
            'existingObservationResult_ = () => { throw "string conflict"; };',
            context
        );

        const result = context.saveWebObservationBatch([
            {
                requestId: "garden-string-conflict-12345",
                plantId: "P01",
                events: ["Weigh"],
                weight: 450,
                observedAt: "2026-08-16T12:00:00Z",
            },
        ]);

        expect(result.results[0]).toMatchObject({
            ok: false,
            retryable: false,
            errorCode: "HISTORY_CONFLICT",
            message: "string conflict",
        });
    });

    it("rejects invalid, locked, and failed bulk watering rounds", () => {
        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        expect(() => context.saveBulkWaterObservation()).toThrow(
            /at least one plant/i
        );
        expect(() => context.saveBulkWaterObservation({})).toThrow(
            /at least one plant/i
        );
        expect(() =>
            context.saveBulkWaterObservation({
                plantIds: ["P99"],
                nutrientsUsed: "No",
                requestId: "garden-water-invalid-12345",
            })
        ).toThrow(/is not valid/i);

        const locked = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: {
                LockService: {
                    getScriptLock: () => ({
                        tryLock: () => false,
                        releaseLock: () => {},
                    }),
                },
            },
        });
        expect(() =>
            locked.saveBulkWaterObservation({
                plantIds: ["P01"],
                nutrientsUsed: "No",
                requestId: "garden-water-locked-12345",
                observedAt: "2026-08-16T12:00:00Z",
            })
        ).toThrow(/bulk-care round remains/i);

        const failed = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
        vm.runInContext(
            'saveWebObservationBatch = () => ({ results: [{ ok: false, message: "Correct this round." }] });',
            failed
        );
        expect(() =>
            failed.saveBulkWaterObservation({
                plantIds: ["P01"],
                nutrientsUsed: "No",
                requestId: "garden-water-failed-12345",
                observedAt: "2026-08-16T12:00:00Z",
            })
        ).toThrow("Correct this round.");

        vm.runInContext(
            "saveWebObservationBatch = () => ({ results: [{ ok: false }] });",
            failed
        );
        expect(() =>
            failed.saveBulkWaterObservation({
                plantIds: ["P01"],
                nutrientsUsed: "No",
                requestId: "garden-water-default-failure-12345",
                observedAt: "2026-08-16T12:00:00Z",
            })
        ).toThrow(/could not be saved/i);

        vm.runInContext(
            "saveWebObservationBatch = () => ({ results: [null] });",
            failed
        );
        expect(() =>
            failed.saveBulkWaterObservation({
                plantIds: ["P01"],
                nutrientsUsed: "No",
                requestId: "garden-water-null-result-12345",
                observedAt: "2026-08-16T12:00:00Z",
            })
        ).toThrow(/could not be saved/i);

        vm.runInContext(
            'saveWebObservationBatch = () => { throw "bulk string failure"; };',
            failed
        );
        let thrown;
        try {
            failed.saveBulkWaterObservation({
                plantIds: ["P01"],
                nutrientsUsed: "No",
                requestId: "garden-water-string-failure-12345",
                observedAt: "2026-08-16T12:00:00Z",
            });
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBe("bulk string failure");
    });

    it("covers valid structured details and validation helper edges", () => {
        const context = loadAppsScript(createHistorySheet());
        const details = context.eventDetailsFromPayload_(
            {
                nutrientsUsed: "Yes",
                nutrientProduct: "MSU 13-3-15",
                nutrientAmount: "0.5 g/gal",
                potSize: "4 inch",
                flowerCount: 2,
                flowerDetails: "Yellow flowers",
                photoUrl: "https://photos.app.goo.gl/abcdefghijkl",
                pestIssue: "Mites",
                pestTreatment: "Rinsed and isolated",
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
        expect(JSON.parse(JSON.stringify(details))).toMatchObject({
            nutrientsUsed: "Yes",
            nutrientProduct: "MSU 13-3-15",
            previousPotSize: "3 inch",
            potSize: "4 inch",
            flowerCount: 2,
            photoUrl: "https://photos.app.goo.gl/abcdefghijkl",
            pestIssue: "Mites",
        });
        expect(
            context.eventDetailsFromPayload_(
                { flowerDetails: "Single unopened bud" },
                ["Flower"],
                null
            ).flowerDetails
        ).toBe("Single unopened bud");
        expect(
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
        ).toEqual(["Note"]);
        expect(() =>
            context.buildEventNamesFromList_([], "", "", "", "", "", "")
        ).toThrow(/choose an event/i);
        expect(() =>
            context.buildEventNames_("", "", "", "", "", "", "")
        ).toThrow(/enter an event/i);
        expect(context.optionalPositiveNumber_(undefined, "Weight")).toBe("");
        expect(() =>
            context.optionalPositiveNumber_(Infinity, "Weight")
        ).toThrow(/positive number/i);
        expect(context.optionalPositiveInteger_(undefined, "Count")).toBe("");
        expect(() => context.optionalPositiveInteger_(1.5, "Count")).toThrow(
            /whole number/i
        );
        expect(() => context.positiveInteger_(0, "Setup")).toThrow(
            /whole number/i
        );
        expect(
            Array.from(
                context.uniqueTextValues_([
                    "",
                    "P01",
                    "P01",
                ])
            )
        ).toEqual(["P01"]);
        expect(() =>
            context.requireSheet_({ getSheetByName: () => null }, "X")
        ).toThrow(/missing required sheet/i);
    });

    it("covers empty, duplicate, and fallback workbook lookups", () => {
        const context = loadAppsScript(createHistorySheet());
        const emptyTracker = createDataSheet("Plant tracker", [[]]);
        const emptyBaselines = createDataSheet("Baselines", [[]]);
        const emptyHistory = createHistorySheet();
        const emptySpreadsheet = {
            getSheetByName: (name) =>
                ({
                    "Plant tracker": emptyTracker,
                    Baselines: emptyBaselines,
                    History: emptyHistory,
                })[name] ?? null,
        };
        expect(context.plantRecordsById_(emptySpreadsheet).size).toBe(0);
        expect(context.plantNamesById_(emptySpreadsheet).size).toBe(0);
        expect(
            context.getRecentObservations_(
                emptySpreadsheet,
                "America/New_York",
                10,
                new Map()
            )
        ).toEqual([]);
        expect(() =>
            context.updateBaselinePotSetup_(emptySpreadsheet, "P01", 2)
        ).toThrow(/missing from Baselines/i);

        const duplicateRow = Array(15).fill("");
        duplicateRow[0] = "P01";
        const duplicateTracker = createDataSheet(
            "Plant tracker",
            [
                Array(15).fill(""),
                duplicateRow,
                [...duplicateRow],
            ],
            [
                Array(15).fill(""),
                Array(15).fill(""),
                Array(15).fill(""),
            ]
        );
        const duplicateSpreadsheet = {
            getSheetByName: (name) =>
                ({
                    "Plant tracker": duplicateTracker,
                    Baselines: createDataSheet("Baselines", [
                        [
                            "Plant ID",
                            "Dry baseline",
                            "Pot setup",
                        ],
                    ]),
                    History: emptyHistory,
                })[name] ?? null,
        };
        expect(() => context.plantRecordsById_(duplicateSpreadsheet)).toThrow(
            /more than once in Plant tracker/i
        );
        expect(() =>
            context.assertUniquePlantIds_([{ id: "P01" }, { id: "P01" }])
        ).toThrow(/more than once/i);
        expect(() =>
            context.assertUniqueIdsInRows_(
                [
                    [""],
                    ["P01"],
                    ["P01"],
                ],
                "Test"
            )
        ).toThrow(/more than once in Test/i);
    });

    it("covers History helper initialization and row identity fallbacks", () => {
        const history = createHistorySheet([
            {
                values: [
                    "",
                    "P01",
                    "Weigh",
                ],
                requestId: "garden-history-edge-12345",
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
        emptyHeaders.__rows[0][15] = "";
        emptyHeaders.__rows[0].fill("", 16, 26);
        emptyHeaders.__rows[0].fill("", 26, 36);
        emptyHeaders.__rows[0].fill("", 36, 39);
        context.ensureHistoryRequestIdColumn_(emptyHeaders);
        context.ensureHistoryDetailColumns_(emptyHeaders);
        context.ensureHistoryProvenanceColumns_(emptyHeaders);
        context.ensureHistoryMeasurementColumns_(emptyHeaders);
        expect(emptyHeaders.__rows[0][15]).toBe("Request ID");
        expect(emptyHeaders.__rows[0][16]).toBe("Nutrients used");
        expect(emptyHeaders.__rows[0][26]).toBe("Observation ID");
        expect(emptyHeaders.__rows[0][36]).toBe("Measurement unit");
    });

    it("distinguishes saved, partial, and noncontiguous request reservations", () => {
        const completeRequestId = "garden-complete-12345";
        const partialRequestId = "garden-partial-12345";
        const noncontiguousRequestId = "garden-gapped-12345";
        const history = createHistorySheet([
            {
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Weigh",
                ],
                requestId: completeRequestId,
            },
            {
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Water",
                ],
                requestId: completeRequestId,
            },
            {
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P02",
                    "Weigh",
                ],
                requestId: noncontiguousRequestId,
            },
            {
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P03",
                    "Check",
                ],
                requestId: "garden-unrelated-12345",
            },
            {
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P02",
                    "Water",
                ],
                requestId: noncontiguousRequestId,
            },
            {
                values: [
                    "",
                    "P04",
                    "Measure",
                ],
                requestId: partialRequestId,
            },
        ]);
        const context = loadAppsScript(history);

        expect(
            JSON.parse(
                JSON.stringify(
                    context.savedRequestStatus_(history, completeRequestId)
                )
            )
        ).toEqual({ state: "saved", requestId: completeRequestId });
        expect(
            JSON.parse(
                JSON.stringify(
                    context.savedRequestStatus_(history, partialRequestId)
                )
            )
        ).toEqual({ state: "incomplete", requestId: partialRequestId });
        expect(
            JSON.parse(
                JSON.stringify(
                    context.savedRequestStatus_(history, noncontiguousRequestId)
                )
            )
        ).toEqual({ state: "incomplete", requestId: noncontiguousRequestId });
    });

    it("runs every Quick log onEdit path, including bulk and locked saves", () => {
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
        quick.__setParent(workbook.spreadsheet);
        workbook.sheets.set("Quick log", quick);
        const SpreadsheetApp = {
            flush: () => {},
            getActive: () => workbook.spreadsheet,
            openById: () => workbook.spreadsheet,
        };
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp,
            globals: workbook.globals,
        });

        context.onEdit({
            range: quick.getRange(3, 3),
            value: "TRUE",
        });
        expect(quickRows[4][4]).toBe("Water");

        quickRows[4][4] = "";
        quickRows[4][6] = 420;
        context.onEdit({
            range: quick.getRange(5, 7),
            value: "420",
        });
        expect(quickRows[4][4]).toBe("Weigh");
        expect(quickRows[4][3]).toBeInstanceOf(Date);
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
        expect(workbook.history.__rows.length).toBe(2);

        const lockedContext = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp,
            globals: {
                LockService: {
                    getScriptLock: () => ({
                        tryLock: () => false,
                        releaseLock: () => {},
                    }),
                },
            },
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

    it("covers History removal guards, large previews, and cancellation", () => {
        const observations = Array.from({ length: 9 }, (_, index) => ({
            values: [
                `8/${index + 1}/2026`,
                "P01",
                "Weigh",
                "Routine",
                400 + index,
            ],
            requestId: `garden-remove-${String(index).padStart(6, "0")}`,
        }));
        const history = createHistorySheet(observations);
        let selection = null;
        let activeSheet = history;
        const spreadsheet = {
            getActiveRange: () => selection,
            getActiveSheet: () => activeSheet,
            getSheetByName: (name) => (name === "History" ? history : null),
            toast: () => {},
        };
        const ui = {
            Button: { NO: "NO", YES: "YES" },
            ButtonSet: { YES_NO: "YES_NO" },
            alert: () => "NO",
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
        expect(() => context.removeSelectedHistoryObservations()).toThrow(
            /no more than 100/i
        );

        selection = { getLastRow: () => 10, getRow: () => 2 };
        context.removeSelectedHistoryObservations();
        expect(history.__rows[1][0]).toBe("8/1/2026");

        const emptyHistory = createHistorySheet([{ values: [] }]);
        const emptySpreadsheet = {
            getActiveRange: () => ({ getLastRow: () => 2, getRow: () => 2 }),
            getActiveSheet: () => emptyHistory,
            getSheetByName: (name) =>
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

    it("reconciles partial save status and protects mismatched retries", () => {
        const baseRequestId = "garden-bulk-status-12345";
        const history = createHistorySheet([
            {
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Water",
                ],
                requestId: `${baseRequestId}-P01`,
            },
        ]);
        const spreadsheet = {
            getSheetByName: (name) => (name === "History" ? history : null),
        };
        const context = loadAppsScript(history, { spreadsheet });
        const partial = context.getWebSaveStatus({
            requestId: baseRequestId,
            plantIds: ["P01", "P02"],
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
                requestId: "garden-mismatch-12345",
            },
        ]);
        const mismatchSpreadsheet = {
            getSheetByName: (name) => (name === "History" ? mismatched : null),
        };
        const mismatchContext = loadAppsScript(mismatched);
        expect(() =>
            mismatchContext.appendObservation_(mismatchSpreadsheet, {
                requestId: "garden-mismatch-12345",
                eventNames: ["Weigh"],
                plantId: "P01",
                potSetup: 1,
            })
        ).toThrow(/no longer matches/i);

        expect(() =>
            mismatchContext.appendObservation_(mismatchSpreadsheet, {
                requestId: "garden-mismatch-12345",
                eventNames: ["Weigh", "Measure"],
                plantId: "P02",
                potSetup: 1,
            })
        ).toThrow(/unexpected History shape/i);
    });

    it("repairs interrupted reservations and grows History before writing", () => {
        const reservedRequestId = "garden-reserved-edge-12345";
        const reserved = createHistorySheet([
            { values: [], requestId: reservedRequestId },
        ]);
        const reservedSpreadsheet = {
            getSheetByName: (name) => (name === "History" ? reserved : null),
        };
        const context = loadAppsScript(reserved);
        const repaired = context.appendObservation_(reservedSpreadsheet, {
            requestId: reservedRequestId,
            eventNames: ["Weigh"],
            observationDate: new Date("2026-08-16T12:00:00Z"),
            plantId: "P01",
            weightState: "Routine",
            weight: 400,
            height: "",
            width: "",
            condition: "",
            notes: "",
            potSetup: 1,
            currentLabel: "A1",
            details: {},
        });
        expect(repaired.targetRow).toBe(2);
        expect(reserved.__rows[1][1]).toBe("P01");

        const growing = createHistorySheet();
        let inserted = 0;
        let maxRows = 1;
        growing.getMaxRows = () => maxRows;
        growing.insertRowsAfter = (_row, count) => {
            inserted += count;
            maxRows += count;
        };
        const growingSpreadsheet = {
            getSheetByName: (name) => (name === "History" ? growing : null),
        };
        context.appendObservation_(growingSpreadsheet, {
            requestId: "garden-grow-history-12345",
            eventNames: ["Note"],
            observationDate: new Date("2026-08-16T12:00:00Z"),
            plantId: "P01",
            weightState: "",
            weight: "",
            height: "",
            width: "",
            condition: "",
            notes: "growth test",
            potSetup: 1,
            currentLabel: "A1",
            details: {},
        });
        expect(inserted).toBe(4999);

        const duplicateRequestId = "garden-valid-duplicate-12345";
        const duplicateInput = {
            requestId: duplicateRequestId,
            eventNames: ["Weigh"],
            observationDate: new Date("2026-08-16T12:00:00Z"),
            plantId: "P01",
            weightState: "Routine",
            weight: 400,
            height: "",
            width: "",
            condition: "",
            notes: "",
            potSetup: 3,
            currentLabel: "A1",
            details: {},
        };
        const seededDuplicateRow = context.storedObservationRows_(
            { ...duplicateInput, potSetup: 2 },
            duplicateRequestId,
            2,
            "not-a-recorded-date"
        )[0];
        const duplicateHistory = createHistorySheet([
            {
                values: seededDuplicateRow,
                requestId: duplicateRequestId,
            },
        ]);
        const duplicateSpreadsheet = {
            getSheetByName: (name) =>
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

    it("covers Quick log archive failures and installation timezone safety", () => {
        const workbook = createLoggerWorkbook();
        workbook.spreadsheet.toast = () => {};
        const quickRows = Array.from({ length: 5 }, () => Array(12).fill(""));
        quickRows[4][4] = "Weigh";
        const quick = createDataSheet("Quick log", quickRows);
        quick.__setParent(workbook.spreadsheet);
        workbook.sheets.set("Quick log", quick);
        const SpreadsheetApp = {
            flush: () => {},
            getActive: () => workbook.spreadsheet,
            openById: () => workbook.spreadsheet,
        };
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            SpreadsheetApp,
            globals: workbook.globals,
        });
        expect(() => context.archiveQuickLogRow_(quick, 5)).toThrow(
            /no Plant ID/i
        );

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

        const quickHeaderRows = Array.from({ length: 4 }, () => []);
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
        const installSheets = new Map([
            ["Quick log", installQuick],
            ["History", workbook.history],
        ]);
        const installSpreadsheet = {
            getSheetByName: (name) => installSheets.get(name) ?? null,
            getSpreadsheetTimeZone: () => "America/New_York",
        };
        const installContext = loadAppsScript(workbook.history, {
            SpreadsheetApp: {
                flush: () => {},
                getActive: () => installSpreadsheet,
                openById: () => installSpreadsheet,
            },
            globals: {
                Session: { getScriptTimeZone: () => "UTC" },
            },
        });
        expect(() => installContext.installGardenLogger()).toThrow(
            /timezone \(UTC\).*America\/New_York/i
        );
    });

    it("sorts valid and invalid repot dates without losing latest pot sizes", () => {
        const first = Array(21).fill("");
        first[0] = "not-a-date";
        first[1] = "P01";
        first[2] = "Repot";
        first[20] = "5 inch";
        const second = Array(21).fill("");
        second[0] = "2026-08-16";
        second[1] = "P02";
        second[2] = "Repot";
        second[20] = "6 inch";
        const history = createHistorySheet([
            { values: first },
            { values: second },
        ]);
        const spreadsheet = {
            getSheetByName: (name) => (name === "History" ? history : null),
        };
        const context = loadAppsScript(history);
        const sizes = context.latestPotSizesByPlant_(spreadsheet);
        expect(sizes.get("P01")).toBe("5 inch");
        expect(sizes.get("P02")).toBe("6 inch");
        expect(context.columnName_(27)).toBe("AA");
    });

    it("auto-selects and clears every inferred Quick log event", () => {
        const rows = Array.from({ length: 5 }, () => []);
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

        rows[4][5] = "Wet";
        context.updateInferredEvent_(quick, 5, 6);
        expect(rows[4][4]).toBe("");

        rows[4][4] = "";
        rows[4][5] = "";
        rows[4][6] = 400;
        context.updateInferredEvent_(quick, 5, 7);
        expect(rows[4][4]).toBe("Weigh");

        rows[4][4] = "";
        rows[4][6] = "";
        rows[4][7] = 7;
        context.updateInferredEvent_(quick, 5, 8);
        expect(rows[4][4]).toBe("Measure");

        rows[4][7] = "";
        context.updateInferredEvent_(quick, 5, 8);
        expect(rows[4][4]).toBe("");
    });
});
