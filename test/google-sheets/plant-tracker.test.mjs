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
    "Condition / soil",
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

function createHistorySheet(observations = []) {
    const header = Array(26).fill("");
    historyHeaders.forEach((value, index) => {
        header[index] = value;
    });
    header[15] = "Request ID";
    historyDetailHeaders.forEach((value, index) => {
        header[16 + index] = value;
    });

    const rows = [
        header,
        ...observations.map(({ values, requestId }) => {
            const row = Array(26).fill("");
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
            rows[targetRow] ??= Array(26).fill("");
            currentRow.forEach((value, columnOffset) => {
                rows[targetRow][column - 1 + columnOffset] = value;
            });
        });
    }

    return {
        __rows: rows,
        getName: () => "History",
        getLastRow: () => rows.length,
        getMaxRows: () => 100,
        hideColumns: () => {},
        insertRowsAfter: () => {},
        getRange(row, column, rowCount = 1, columnCount = 1) {
            const values = () =>
                rangeValues(row, column, rowCount, columnCount);
            const range = {
                getDisplayValue: () => String(values()[0][0] ?? ""),
                getDisplayValues: () =>
                    values().map((currentRow) =>
                        currentRow.map((value) => String(value ?? ""))
                    ),
                getValues: values,
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
                    setRangeValues(row, column, nextValues);
                    return range;
                },
                setNote: () => range,
                setNotes: () => range,
                setNumberFormat: () => range,
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
            openById: () => spreadsheet,
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
    const sheet = {
        __rows: rows,
        __setParent(value) {
            parent = value;
        },
        getParent: () => parent,
        getName: () => name,
        getLastRow: () => rows.length,
        getMaxRows: () => Math.max(rows.length, 100),
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
                setNote: () => range,
                setNumberFormat: () => range,
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

function createLoggerWorkbook(plantIds = ["P01"]) {
    const trackerHeader = Array(15).fill("");
    const trackerRows = [trackerHeader];
    const trackerFormulas = [Array(15).fill("")];
    const baselineRows = [
        [
            "Plant ID",
            "Dry baseline",
            "Pot setup",
        ],
    ];

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
        baselineRows.push([
            plantId,
            "",
            1,
        ]);
    });

    const history = createHistorySheet();
    const sheets = new Map([
        [
            "Plant tracker",
            createDataSheet("Plant tracker", trackerRows, trackerFormulas),
        ],
        ["Baselines", createDataSheet("Baselines", baselineRows)],
        ["History", history],
    ]);
    const spreadsheet = {
        getSheetByName: (name) => sheets.get(name) ?? null,
        getSpreadsheetTimeZone: () => "America/New_York",
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
            "Water",
            "Weigh",
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
        const history = createHistorySheet();
        const trackerHeader = Array(15).fill("");
        const trackerPlant = Array(15).fill("");
        trackerPlant[0] = "P01";
        trackerPlant[1] = "Old man of the Andes";
        trackerPlant[2] = "Oreocereus trollii";
        trackerPlant[3] = new Date("2026-08-01T12:00:00Z");
        trackerPlant[4] = 15;
        trackerPlant[6] = 412;
        trackerPlant[14] = "A1";
        const trackerFormulas = [trackerHeader, Array(15).fill("")];
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
                        "Dry baseline",
                        "Pot setup",
                    ],
                    [
                        "P01",
                        "",
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

        expect(bootstrap.version).toBe("5.4.0");
        expect(bootstrap.plants).toHaveLength(1);
        expect(bootstrap.plants[0]).toMatchObject({
            id: "P01",
            label: "A1",
            potSetup: 2,
            currentPotSize: "4 in",
            latestWeight: 412,
            fieldGuideUrl: "https://example.test/p01",
        });
        expect(Array.from(bootstrap.recent)).toEqual([]);
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
        expect(
            workbook.sheets.get("Baselines").getRange(2, 3).getValues()[0][0]
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
        ]);
        expect(result).toMatchObject({
            ok: true,
            savedCount: 2,
            failedCount: 0,
        });
        expect(result.results.map((entry) => entry.plantId)).toEqual([
            "P01",
            "P02",
        ]);
        expect(workbook.history.__rows.slice(1).map((row) => row[15])).toEqual([
            "garden-queue-one-12345",
            "garden-queue-two-12345",
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
        ]);

        expect(result).toMatchObject({
            ok: false,
            savedCount: 1,
            failedCount: 1,
        });
        expect(result.results[1]).toMatchObject({
            ok: false,
            requestId: "garden-queue-bad-12345",
        });
        expect(result.results[1].message).toMatch(/height or width/i);
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
            "Remove selected History observations",
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
                "Height (cm)",
                "Width (cm)",
                "Condition / soil",
                "Notes",
                "Pot setup",
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
                openById: () => workbook.spreadsheet,
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

        expect(calls.properties.gardenLoggerVersion).toBe("5.4.0");
        expect(calls.toast[1]).toBe("Garden logger verified");
    });

    it("clears selected History observations without touching helper columns", () => {
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

        expect(history.__rows[1].slice(0, 12)).toEqual(Array(12).fill(""));
        expect(history.__rows[1].slice(12, 15)).toEqual([
            "helper-name",
            "helper-cycle",
            "",
        ]);
        expect(history.__rows[1].slice(15, 26)).toEqual(Array(11).fill(""));
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
        errorContext.ensureHistoryRequestIdColumn_(emptyHeaders);
        errorContext.ensureHistoryDetailColumns_(emptyHeaders);
        expect(emptyHeaders.__rows[0][15]).toBe("Request ID");
        expect(emptyHeaders.__rows[0].slice(16, 26)).toEqual(
            historyDetailHeaders
        );
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
        expect(() => context.getWebBatchSaveStatus("not-an-array")).toThrow(
            /up to 50/i
        );
        expect(() =>
            context.getWebBatchSaveStatus([requestId, requestId])
        ).toThrow(/unique/i);
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
                "Height (cm)",
                "Width (cm)",
                "Condition / soil",
                "Notes",
                "Pot setup",
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
                "Height (cm)",
                "Width (cm)",
                "Condition / soil",
                "Notes",
                "Pot setup",
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
            "Height (cm)",
            "Width (cm)",
            "Condition / soil",
            "Notes",
            "Pot setup",
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

        const originalPrepare = context.prepareWebObservation_;
        context.prepareWebObservation_ = () => {
            throw "invalid queue item";
        };
        const invalid = context.saveWebObservationBatch([payload]);
        expect(invalid.savedCount).toBe(0);
        expect(invalid.results[0].message).toBe("invalid queue item");
        context.prepareWebObservation_ = originalPrepare;

        const originalAppend = context.appendPreparedWebObservation_;
        vm.runInContext(
            'appendPreparedWebObservation_ = () => { throw new Error("spreadsheet write failed"); };',
            context
        );
        const failedError = context.saveWebObservationBatch([payload]);
        expect(failedError.results[0].message).toBe("spreadsheet write failed");

        context.appendPreparedWebObservation_ = () => {
            throw "non-error failure";
        };
        const failedString = context.saveWebObservationBatch([
            { ...payload, requestId: "garden-queue-edge-67890" },
        ]);
        expect(failedString.results[0].message).toBe("non-error failure");
        context.appendPreparedWebObservation_ = originalAppend;
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
        context.ensureHistoryRequestIdColumn_(emptyHeaders);
        context.ensureHistoryDetailColumns_(emptyHeaders);
        expect(emptyHeaders.__rows[0][15]).toBe("Request ID");
        expect(emptyHeaders.__rows[0][16]).toBe("Nutrients used");
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
        growing.getMaxRows = () => 1;
        growing.insertRowsAfter = (_row, count) => {
            inserted += count;
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
        expect(inserted).toBe(1);

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
            "Height (cm)",
            "Width (cm)",
            "Condition / soil",
            "Notes",
            "Pot setup",
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
