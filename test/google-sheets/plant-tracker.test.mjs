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
    return {
        getName: () => name,
        getLastRow: () => rows.length,
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
                getDisplayValue: () => String(select(rows)[0][0] ?? ""),
                getDisplayValues: () =>
                    select(rows).map((currentRow) =>
                        currentRow.map((value) => String(value ?? ""))
                    ),
                getFormulas: () => select(formulas),
                getValues: () => select(rows),
                setValue(value) {
                    rows[row - 1] ??= [];
                    rows[row - 1][column - 1] = value;
                    return range;
                },
            };
            return range;
        },
    };
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

        expect(bootstrap.version).toBe("5.3.0");
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

        expect(calls.properties.gardenLoggerVersion).toBe("5.3.0");
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
        expect(context.optionalPositiveNumber_("2.5", "Weight")).toBe(2.5);
        expect(context.optionalPositiveNumber_("", "Weight")).toBe("");
        expect(() => context.optionalPositiveNumber_(0, "Weight")).toThrow(
            /positive number/i
        );
        expect(context.optionalPositiveInteger_(3, "Count")).toBe(3);
        expect(context.optionalPositiveInteger_(undefined, "Count")).toBe("");
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
        expect(context.columnName_(1)).toBe("A");
        expect(context.columnName_(26)).toBe("Z");
        expect(context.columnName_(27)).toBe("AA");
        expect(() =>
            context.buildEventNames_("", "", "", "", "", "", "")
        ).toThrow(/Enter an event/i);
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
        expect(() =>
            context.assertUniquePlantIds_([{ id: "P01" }, { id: "P01" }])
        ).toThrow(/more than once/i);
        expect(() =>
            context.assertUniqueIdsInRows_([["P01"], ["P01"]], "Baselines")
        ).toThrow(/Baselines/i);
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
});
