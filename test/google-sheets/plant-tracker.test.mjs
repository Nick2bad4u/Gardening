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
];

const appSheetBulkPlants = Array.from(
    { length: 22 },
    (_, index) => `P${String(index + 1).padStart(2, "0")}`
);

const appSheetBulkHeaders = [
    "Round ID",
    "Started at",
    "Observed at",
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
];

function createDataValidationBuilder() {
    const builder = {
        requireValueInList: () => builder,
        requireNumberGreaterThan: () => builder,
        requireNumberBetween: () => builder,
        requireCheckbox: () => builder,
        setAllowInvalid: () => builder,
        build: () => ({}),
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
    const header = Array(39).fill("");
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

    const rows = [
        header,
        ...observations.map(({ values, requestId }) => {
            const row = Array(39).fill("");
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
            rows[targetRow] ??= Array(39).fill("");
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
    const sheet = {
        __rows: rows,
        __protections: protections,
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
        getMaxRows: () => Math.max(rows.length, 100),
        getProtections: () => protections,
        hideColumns: () => sheet,
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
                setDataValidation: () => range,
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
    const sheets = new Map([
        [
            "Plant tracker",
            createDataSheet("Plant tracker", trackerRows, trackerFormulas),
        ],
        ["Baselines", createDataSheet("Baselines", baselineRows)],
        ["History", history],
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
        ).toEqual(["Weigh", "Water"]);
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

    it("builds the mobile bootstrap from tracker, baseline, and history data", () => {
        const repotValues = Array(21).fill("");
        repotValues[0] = new Date("2026-08-10T12:00:00Z");
        repotValues[1] = "P01";
        repotValues[2] = "Repot";
        repotValues[9] = new Date("2026-08-10T12:01:00Z");
        repotValues[20] = "5 in";
        const history = createHistorySheet([
            {
                requestId: "garden-bootstrap-12345",
                values: repotValues,
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

        expect(bootstrap.version).toBe("5.10.0");
        expect(bootstrap.plants).toHaveLength(1);
        expect(bootstrap.plants[0]).toMatchObject({
            id: "P01",
            label: "A1",
            potSetup: 2,
            currentPotSize: "4 in",
            latestWeight: 412,
            fieldGuideUrl: "https://example.test/p01",
        });
        expect(Array.from(bootstrap.recent)).toHaveLength(1);
        expect(history.__rangeReads).toEqual([
            { row: 2, column: 1, rowCount: 1, columnCount: 39 },
        ]);
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
        populatedHistory.__rows.push(Array(39).fill(""));
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
        expect(history.__rows[1]).toHaveLength(39);
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

    it("writes a 22-plant weighing round in one contiguous constant-I/O batch", () => {
        const plantIds = Array.from(
            { length: 22 },
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
            savedCount: 22,
            failedCount: 0,
        });

        const historyWrites = workbook.history.__setValuesCalls.filter(
            (call) =>
                call.row >= 2 && call.column === 1 && call.columnCount === 39
        );
        expect(historyWrites).toEqual([
            { row: 2, column: 1, rowCount: 22, columnCount: 39 },
        ]);
        expect(flushCount).toBe(1);
        expect(workbook.history.__rangeReads.length).toBeLessThan(20);
        expect(workbook.history.__rows.slice(1).map((row) => row[15])).toEqual(
            payloads.map((payload) => payload.requestId)
        );

        const retry = context.saveWebObservationBatch(payloads);
        expect(retry.results.every((entry) => entry.duplicate)).toBe(true);
        expect(workbook.history.__setValuesCalls).toHaveLength(1);
        expect(workbook.history.__rows).toHaveLength(23);

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
        expect(historyOperationCount(22)).toBe(historyOperationCount(1));
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
                events: ["Weigh"],
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
                events: ["Weigh"],
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

    it("submits a 22-plant AppSheet weight round in one canonical batch", () => {
        const workbook = createLoggerWorkbook(appSheetBulkPlants);
        const round = Array(appSheetBulkHeaders.length).fill("");
        round[0] = "BULK2201";
        round[1] = new Date("2026-08-25T08:00:00-04:00");
        round[2] = new Date("2026-08-25T08:05:00-04:00");
        round[3] = "Routine";
        appSheetBulkPlants.forEach((_plantId, index) => {
            round[4 + index] = 300 + index;
        });
        round[26] = "Collection weight round.";
        round[29] = "Queued";
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
        expect(batches[0]).toHaveLength(22);
        expect(batches[0].map(({ plantId }) => plantId)).toEqual(
            appSheetBulkPlants
        );
        expect(batches[0].map(({ requestId }) => requestId)).toEqual(
            appSheetBulkPlants.map(
                (plantId) => `appsheet-bulk-BULK2201-${plantId}`
            )
        );
        expect(batches[0][0]).toMatchObject({
            events: ["Weigh"],
            weightState: "Routine",
            weight: 300,
            notes: "Collection weight round.",
            entrySource: "AppSheet",
        });
        expect(round[29]).toBe("Saved");
        expect(round[30]).toBe("22 weights saved.");
        expect(round[31]).toBe(22);
        expect(round[32]).toBe(22);
        expect(round[33]).toBeInstanceOf(Date);
        expect(result).toMatchObject({
            ok: true,
            queuedCount: 0,
            bulk: {
                installed: true,
                queuedCount: 1,
                processedCount: 1,
                savedRoundCount: 1,
                requestedCount: 22,
                savedRequestCount: 22,
                needsCorrectionCount: 0,
                retryCount: 0,
                deferredCount: 0,
            },
        });
    });

    it("keeps a partially valid bulk round idempotent and editable", () => {
        const workbook = createLoggerWorkbook(["P01", "P02"]);
        const round = Array(appSheetBulkHeaders.length).fill("");
        round[0] = "BULKFIX1";
        round[3] = "Routine";
        round[4] = 0;
        round[5] = 420;
        round[29] = "Queued";
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

        expect(round[29]).toBe("Needs correction");
        expect(round[30]).toMatch(/1 of 2 saved.*P01.*greater than zero/i);
        expect(round[31]).toBe(2);
        expect(round[32]).toBe(1);
        expect(first.bulk).toMatchObject({
            savedRequestCount: 1,
            needsCorrectionCount: 1,
        });

        round[4] = 410;
        round[29] = "Retry";
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
        expect(round[29]).toBe("Saved");
        expect(round[30]).toBe("2 weights saved.");
        expect(round[32]).toBe(2);
        expect(retry.bulk).toMatchObject({
            savedRoundCount: 1,
            savedRequestCount: 2,
            needsCorrectionCount: 0,
        });
    });

    it("isolates invalid bulk rounds and defers a whole round beyond the batch cap", () => {
        const workbook = createLoggerWorkbook(appSheetBulkPlants);
        const bulkSheet = workbook.sheets.get("App bulk");
        const makeRound = (roundId, weightCount = 22) => {
            const row = Array(appSheetBulkHeaders.length).fill("");
            row[0] = roundId;
            row[3] = "Routine";
            for (let index = 0; index < weightCount; index += 1) {
                row[4 + index] = 300 + index;
            }
            row[29] = "Queued";
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
        expect(batches[0]).toHaveLength(44);
        expect(missingId[29]).toBe("Needs correction");
        expect(missingId[30]).toMatch(/Round ID is required/i);
        expect(duplicateOne[29]).toBe("Needs correction");
        expect(duplicateTwo[30]).toMatch(/duplicated/i);
        expect(emptyRound[30]).toMatch(/at least one plant weight/i);
        expect(firstRound[29]).toBe("Saved");
        expect(secondRound[29]).toBe("Saved");
        expect(deferredRound[29]).toBe("Queued");
        expect(result.bulk).toMatchObject({
            queuedCount: 7,
            processedCount: 6,
            savedRoundCount: 2,
            requestedCount: 44,
            savedRequestCount: 44,
            needsCorrectionCount: 4,
            deferredCount: 1,
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
        invalidRound[4] = 350;
        invalidRound[29] = "Queued";
        invalidWorkbook.sheets.get("App bulk").__rows.push(invalidRound);
        const invalidContext = loadAppsScript(invalidWorkbook.history, {
            spreadsheet: invalidWorkbook.spreadsheet,
            globals: invalidWorkbook.globals,
        });
        invalidContext.saveWebObservationBatch = () => {
            throw new Error("No batch should be sent.");
        };

        const invalidResult = invalidContext.processQueuedAppSheetEntries();

        expect(invalidRound[29]).toBe("Needs correction");
        expect(invalidResult.bulk).toMatchObject({
            processedCount: 1,
            requestedCount: 0,
            savedRequestCount: 0,
        });

        const malformedWorkbook = createLoggerWorkbook(["P01"]);
        const malformedRound = Array(appSheetBulkHeaders.length).fill("");
        malformedRound[0] = "MALFORMED";
        malformedRound[4] = 350;
        malformedRound[29] = "Queued";
        malformedWorkbook.sheets.get("App bulk").__rows.push(malformedRound);
        const malformedContext = loadAppsScript(malformedWorkbook.history, {
            spreadsheet: malformedWorkbook.spreadsheet,
            globals: malformedWorkbook.globals,
        });
        malformedContext.appSheetBulkPayloadsFromRow_ = () => {
            throw "Malformed bulk row.";
        };

        malformedContext.processQueuedAppSheetEntries();

        expect(malformedRound[29]).toBe("Needs correction");
        expect(malformedRound[30]).toBe("Malformed bulk row.");
    });

    it("defaults single-weight bulk rows and reports incomplete transient results", () => {
        const singleWorkbook = createLoggerWorkbook(["P01"]);
        const singleRound = Array(appSheetBulkHeaders.length).fill("");
        const startedAt = new Date("2026-08-25T08:00:00-04:00");
        singleRound[0] = "SINGLE";
        singleRound[1] = startedAt;
        singleRound[4] = 350;
        singleRound[29] = "Queued";
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
        expect(singleRound[30]).toBe("1 weight saved.");

        const retryWorkbook = createLoggerWorkbook([
            "P01",
            "P02",
            "P03",
        ]);
        const retryRound = Array(appSheetBulkHeaders.length).fill("");
        retryRound[0] = "INCOMPLETE";
        retryRound[3] = "Wet";
        retryRound[4] = 350;
        retryRound[5] = 360;
        retryRound[6] = 370;
        retryRound[29] = "Queued";
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

        expect(retryRound[29]).toBe("Retry");
        expect(retryRound[30]).toMatch(
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
            round[3] = "Routine";
            round[4] = 350;
            round[29] = "Queued";
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

            expect(round[29]).toBe("Retry");
            expect(round[30]).toBe("Server offline.");
            expect(result.bulk.retryCount).toBe(1);
        });
    });

    it("installs, initializes, and verifies the AppSheet bulk staging sheet", () => {
        const existingWorkbook = createLoggerWorkbook(["P01"]);
        const existingContext = loadAppsScript(existingWorkbook.history, {
            spreadsheet: existingWorkbook.spreadsheet,
            globals: existingWorkbook.globals,
        });
        expect(existingContext.installAppSheetBulkSheet()).toMatchObject({
            created: false,
            columnCount: 34,
            plantCount: 22,
        });

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
            created: false,
            removedDuplicateCount: 1,
        });
        expect(deleted).toEqual(["duplicate"]);
        expect(created).toEqual([]);

        triggers = [{ getHandlerFunction: () => "otherHandler" }];
        expect(context.installAppSheetQueueTrigger()).toEqual({
            handler: "processQueuedAppSheetEntries",
            created: true,
            removedDuplicateCount: 0,
        });
        expect(created).toEqual([
            { handler: "processQueuedAppSheetEntries", minutes: 1 },
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
        const partialRow = Array(39).fill("");
        partialRow[0] = new Date("2026-08-16T12:00:00Z");
        partialRow[1] = "P01";
        partialRow[2] = "Weigh";
        partialRow[15] = "garden-partial-batch-12345";
        const conflictRow = Array(39).fill("");
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
        const reservedRow = Array(39).fill("");
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
            { row: 2, column: 1, rowCount: 1, columnCount: 39 },
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

        expect(calls.properties.gardenLoggerVersion).toBe("5.10.0");
        expect(calls.toast[1]).toBe("Garden logger verified");
        expect(quickLog.__protections).toHaveLength(1);
        expect(workbook.history.__protections).toHaveLength(5);
        expect(
            workbook.history.__protections.every((protection) =>
                protection.isWarningOnly()
            )
        ).toBe(true);
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
            "Water",
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
        errorContext.ensureHistoryRequestIdColumn_(emptyHeaders);
        errorContext.ensureHistoryDetailColumns_(emptyHeaders);
        errorContext.ensureHistoryProvenanceColumns_(emptyHeaders);
        errorContext.ensureHistoryMeasurementColumns_(emptyHeaders);
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
        const badMeasurementHeader = createHistorySheet();
        badMeasurementHeader.__rows[0][37] = "Inches";
        expect(() =>
            errorContext.ensureHistoryMeasurementColumns_(badMeasurementHeader)
        ).toThrow(/must be "Height \(in\)"/i);
    });

    it("repairs narrow History grids and enforces defensive source/header guards", () => {
        const context = loadAppsScript(createHistorySheet());

        expect(context.normalizeWebEntrySource_("")).toBe("Mobile logger");
        expect(context.normalizeWebEntrySource_("AppSheet")).toBe("AppSheet");
        expect(() =>
            context.normalizeWebEntrySource_("Unknown client")
        ).toThrow(/Entry source must be Mobile logger or AppSheet/i);

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
        expect(narrowHistory.getMaxColumns()).toBe(39);

        const unvalidatedHistory = createHistorySheet();
        const storedRow = Array(39).fill("");
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
        const recordedFirst = Array(39).fill("");
        recordedFirst[0] = sameObservedAt;
        recordedFirst[1] = "P01";
        recordedFirst[2] = "Weigh";
        recordedFirst[4] = null;
        recordedFirst[9] = new Date("2026-08-25T12:01:00Z");
        const recordedSecond = Array(39).fill("");
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
            Array.from({ length: 22 }, (_, index) => ({
                requestId: `garden-status-${String(index).padStart(2, "0")}-12345`,
                plantId: "P01",
                expectedCount: 1,
            }))
        );
        const twentyTwoStatusReads =
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
            twentyTwoStatusReads
        );
        expect(() => context.getWebBatchSaveStatus("not-an-array")).toThrow(
            /up to 50/i
        );
        expect(() =>
            context.getWebBatchSaveStatus([requestId, requestId])
        ).toThrow(/unique/i);
        [
            0,
            11,
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
            ).toThrow(/integer from 1 to 10/i);
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
        expect(quickRows[4][4]).toBe("Water");

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
            /no weight was entered/i
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
            ).nutrientProduct
        ).toBe("");
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
        const existingRow = Array(39).fill("");
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

    it("rejects invalid and locked bulk watering rounds", () => {
        const workbook = createLoggerWorkbook();
        const context = loadAppsScript(workbook.history, {
            spreadsheet: workbook.spreadsheet,
            globals: workbook.globals,
        });
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
        ).toThrow(/watering round remains/i);
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
        const duplicateHistory = createHistorySheet([
            {
                values: [
                    new Date("2026-08-16T12:00:00Z"),
                    "P01",
                    "Weigh",
                    "Routine",
                    400,
                    "",
                    "",
                    "",
                    "",
                    "not-a-recorded-date",
                    2,
                ],
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
            {
                requestId: duplicateRequestId,
                eventNames: ["Weigh"],
                plantId: "P01",
                potSetup: 3,
            }
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
        expect(rows[4][4]).toBe("Water");

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
