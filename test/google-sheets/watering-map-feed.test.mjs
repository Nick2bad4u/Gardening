import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    assertWateringMapFeedPreconditions,
    buildWateringMapFeedRequests,
    buildWateringMapFeedUpgradeRequests,
    wateringMapFeedColumnCount,
    wateringMapFeedDateFormat,
    wateringMapFeedFormula,
    wateringMapFeedRowCount,
    wateringMapFeedSheetId,
    wateringMapFeedTitle,
    wateringMapFeedV1Formula,
} from "../../scripts/google-sheets/watering-map-feed.mjs";
import { required } from "../helpers/required.mjs";

/** @returns {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} */
function fixture() {
    const historyHeaders = maintainedHeaders();
    return {
        cells: historyHeaders.map((header, column) => ({
            column,
            row: 0,
            sheet: "History",
            value: { stringValue: header },
        })),
        metadata: {
            properties: { locale: "en_US", timeZone: "America/New_York" },
            sheets: [
                {
                    basicFilter: {
                        range: {
                            endColumnIndex: 67,
                            sheetId: 100,
                            startRowIndex: 0,
                        },
                    },
                    properties: {
                        gridProperties: { columnCount: 67, rowCount: 50_001 },
                        index: 0,
                        sheetId: 100,
                        title: "History",
                    },
                    protectedRanges: [
                        {
                            protectedRangeId: 200,
                            range: { sheetId: 100 },
                            warningOnly: true,
                        },
                    ],
                },
                {
                    charts: [
                        {
                            chartId: 501,
                            spec: {
                                basicChart: {
                                    axis: [],
                                    domains: [],
                                    series: [],
                                },
                                title: "Retained existing chart",
                            },
                        },
                    ],
                    properties: {
                        gridProperties: { columnCount: 20, rowCount: 1000 },
                        index: 1,
                        sheetId: 101,
                        title: "Dashboard",
                    },
                },
                {
                    properties: {
                        gridProperties: { columnCount: 59, rowCount: 1000 },
                        index: 2,
                        sheetId: 102,
                        title: "App entries",
                    },
                },
                {
                    properties: {
                        gridProperties: { columnCount: 77, rowCount: 1000 },
                        index: 3,
                        sheetId: 103,
                        title: "App bulk",
                    },
                },
                {
                    properties: {
                        gridProperties: { columnCount: 20, rowCount: 1000 },
                        index: 4,
                        sheetId: 104,
                        title: "RO refills",
                    },
                },
            ],
            spreadsheetId: "synthetic-workbook",
        },
        metadataComplete: true,
        readRanges: [
            {
                endColumn: 67,
                endRow: 1,
                sheet: "History",
                startColumn: 0,
                startRow: 0,
            },
        ],
    };
}

/** @returns {string[]} */
function maintainedHeaders() {
    const context = serverContext();
    const serialized = String(
        vm.runInContext(
            `JSON.stringify([
            ...HISTORY_HEADERS, "Plant / planter", "Trend anchor", "Days after anchor", GARDEN_LOGGER.requestIdHeader,
            ...HISTORY_DETAIL_HEADERS, ...HISTORY_PROVENANCE_HEADERS, ...HISTORY_MEASUREMENT_HEADERS,
            ...HISTORY_ROTATION_HEADERS, ...HISTORY_WATER_HEADERS, ...HISTORY_HUMIDITY_HEADERS,
            ...HISTORY_LIGHT_HEADERS, ...HISTORY_CARE_HEADERS
        ])`,
            context
        )
    );
    /** @type {unknown} */
    const headers = JSON.parse(serialized);
    if (!Array.isArray(headers))
        throw new TypeError("Maintained server History schema is invalid");
    return headers.map((header) => {
        if (typeof header !== "string")
            throw new TypeError("Maintained server History schema is invalid");
        return header;
    });
}

/** @returns {vm.Context} */
function serverContext() {
    const context = vm.createContext({});
    vm.runInContext(
        readFileSync(
            new URL(
                "../../scripts/google-sheets/plant-tracker.gs",
                import.meta.url
            ),
            "utf8"
        ),
        context
    );
    return context;
}

/** @returns {import("../../types/watering-map-feed.d.ts").WateringMapFeedSnapshot} */
function upgradeFixture() {
    const snapshot = fixture();
    snapshot.metadata.sheets.push({
        properties: {
            gridProperties: {
                columnCount: 8,
                rowCount: wateringMapFeedRowCount,
            },
            hidden: true,
            index: snapshot.metadata.sheets.length,
            sheetId: wateringMapFeedSheetId,
            title: wateringMapFeedTitle,
        },
        protectedRanges: [
            {
                protectedRangeId: 300,
                range: { sheetId: wateringMapFeedSheetId },
                warningOnly: true,
            },
        ],
    });
    snapshot.cells.push({
        column: 0,
        row: 0,
        sheet: wateringMapFeedTitle,
        value: { formulaValue: wateringMapFeedV1Formula() },
    });
    snapshot.readRanges.push({
        endColumn: 8,
        endRow: wateringMapFeedRowCount,
        sheet: wateringMapFeedTitle,
        startColumn: 0,
        startRow: 0,
    });
    return snapshot;
}

describe("watering map version-1 upgrade", () => {
    it("writes only A1 and new I:L columns, retaining all existing metadata and records", () => {
        expect.hasAssertions();

        const snapshot = upgradeFixture();
        const before = structuredClone(snapshot);
        const plan = buildWateringMapFeedUpgradeRequests(
            snapshot,
            maintainedHeaders()
        );

        expect(snapshot).toStrictEqual(before);
        expect(plan.allocatedCellsAfter - plan.allocatedCellsBefore).toBe(
            200_012
        );
        expect(plan.requests).toHaveLength(5);
        expect(plan.requests[0]).toStrictEqual({
            appendDimension: {
                dimension: "COLUMNS",
                length: 4,
                sheetId: wateringMapFeedSheetId,
            },
        });
        expect(plan.requests[1]).toMatchObject({
            updateCells: {
                fields: "userEnteredValue,note",
                rows: [
                    {
                        values: [
                            {
                                userEnteredValue: {
                                    formulaValue: wateringMapFeedFormula(),
                                },
                            },
                        ],
                    },
                ],
                start: {
                    columnIndex: 0,
                    rowIndex: 0,
                    sheetId: wateringMapFeedSheetId,
                },
            },
        });

        const formattingRequests = plan.requests.slice(2, 4);
        for (const request of formattingRequests)
            expect(request).toMatchObject({
                repeatCell: {
                    range: {
                        endColumnIndex: 12,
                        sheetId: wateringMapFeedSheetId,
                        startColumnIndex: 8,
                    },
                },
            });

        expect(plan.requests[4]).toMatchObject({
            updateDimensionProperties: {
                fields: "pixelSize",
                range: {
                    endIndex: 12,
                    sheetId: wateringMapFeedSheetId,
                    startIndex: 8,
                },
            },
        });

        const serialized = JSON.stringify(plan.requests);
        for (const forbidden of [
            "addSheet",
            "delete",
            "sort",
            "ProtectedRange",
            "basicFilter",
        ])
            expect(serialized).not.toContain(forbidden);
        const existingSheets = snapshot.metadata.sheets.slice(0, -1);
        for (const sheet of existingSheets)
            expect(serialized).not.toContain(
                `"sheetId":${sheet.properties.sheetId},`
            );

        expect(() => {
            assertWateringMapFeedPreconditions(plan, structuredClone(snapshot));
        }).not.toThrow();
    });

    it("does not mistake computed spill cells for occupied user input", () => {
        expect.hasAssertions();

        const snapshot = upgradeFixture();
        snapshot.cells.push({
            column: 7,
            effectiveValue: { numberValue: 50_000 },
            row: 50_002,
            sheet: wateringMapFeedTitle,
            value: {},
        });

        expect(() =>
            buildWateringMapFeedUpgradeRequests(snapshot, maintainedHeaders())
        ).not.toThrow();
    });

    it.each([
        "missing helper",
        "wrong title",
        "visible",
        "rows",
        "columns",
        "no protection",
        "bounded protection",
        "unprotected range",
        "not warning",
        "partial capture",
        "missing anchor",
        "formula drift",
        "replay",
        "occupied",
        "duplicate cell",
    ])("rejects unsafe upgrade state: %s", (scenario) => {
        expect.hasAssertions();

        const snapshot = upgradeFixture();
        const helper = required(snapshot.metadata.sheets.at(-1));
        const anchor = required(snapshot.cells.at(-1));
        const protection = required(helper.protectedRanges?.[0]);
        switch (scenario) {
            case "bounded protection": {
                protection.range.endColumnIndex = 8;
                break;
            }
            case "columns": {
                helper.properties.gridProperties.columnCount = 12;
                break;
            }
            case "duplicate cell": {
                snapshot.cells.push(structuredClone(anchor));
                break;
            }
            case "formula drift": {
                anchor.value = { formulaValue: "=42" };
                break;
            }
            case "missing anchor": {
                snapshot.cells.pop();
                break;
            }
            case "missing helper": {
                snapshot.metadata.sheets.pop();
                break;
            }
            case "no protection": {
                helper.protectedRanges = [];
                break;
            }
            case "not warning": {
                protection.warningOnly = false;
                break;
            }
            case "occupied": {
                snapshot.cells.push({
                    column: 7,
                    row: 50_002,
                    sheet: wateringMapFeedTitle,
                    value: { stringValue: "retain" },
                });
                break;
            }
            case "partial capture": {
                required(snapshot.readRanges.at(-1)).endRow -= 1;
                break;
            }
            case "replay": {
                anchor.value = { formulaValue: wateringMapFeedFormula() };
                break;
            }
            case "rows": {
                helper.properties.gridProperties.rowCount -= 1;
                break;
            }
            case "unprotected range": {
                protection.unprotectedRanges = [
                    { sheetId: wateringMapFeedSheetId },
                ];
                break;
            }
            case "visible": {
                helper.properties.hidden = false;
                break;
            }
            case "wrong title": {
                helper.properties.title = "Other helper";
                break;
            }
            default: {
                throw new Error("Unknown test scenario");
            }
        }

        expect(() =>
            buildWateringMapFeedUpgradeRequests(snapshot, maintainedHeaders())
        ).toThrow(/Watering map/v);
    });

    it("detects an occupied cell added after the plan was built", () => {
        expect.hasAssertions();

        const snapshot = upgradeFixture();
        const plan = buildWateringMapFeedUpgradeRequests(
            snapshot,
            maintainedHeaders()
        );
        snapshot.cells.push({
            column: 7,
            row: 50_002,
            sheet: wateringMapFeedTitle,
            value: { numberValue: 0 },
        });

        expect(() => {
            assertWateringMapFeedPreconditions(plan, snapshot);
        }).toThrow("Workbook drift");
    });

    it("uses the additional four columns in its workbook cell budget", () => {
        expect.hasAssertions();

        const snapshot = upgradeFixture();
        const plan = buildWateringMapFeedUpgradeRequests(
            snapshot,
            maintainedHeaders()
        );
        snapshot.metadata.sheets.push({
            properties: {
                gridProperties: {
                    columnCount: 1,
                    rowCount: 20_000_000 - plan.allocatedCellsAfter,
                },
                index: snapshot.metadata.sheets.length,
                sheetId: 999,
                title: "Large helper",
            },
        });

        expect(
            buildWateringMapFeedUpgradeRequests(snapshot, maintainedHeaders())
                .allocatedCellsAfter
        ).toBe(20_000_000);

        required(
            snapshot.metadata.sheets.at(-1)
        ).properties.gridProperties.rowCount += 1;

        expect(() =>
            buildWateringMapFeedUpgradeRequests(snapshot, maintainedHeaders())
        ).toThrow("cell budget");
    });
});

describe("watering map feed migration", () => {
    it("adds only the complete hidden helper, preserving every existing sheet and record", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const plan = buildWateringMapFeedRequests(
            snapshot,
            maintainedHeaders()
        );

        expect(snapshot).toStrictEqual(before);
        expect(plan.allocatedCellsAfter - plan.allocatedCellsBefore).toBe(
            600_036
        );
        expect(plan.sheetId).toBe(wateringMapFeedSheetId);
        expect(plan.requests[0]).toStrictEqual({
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount: 12,
                        frozenRowCount: 2,
                        hideGridlines: true,
                        rowCount: 50_003,
                    },
                    hidden: true,
                    index: 5,
                    sheetId: wateringMapFeedSheetId,
                    title: wateringMapFeedTitle,
                },
            },
        });

        const serialized = JSON.stringify(plan.requests);
        for (const sheet of snapshot.metadata.sheets)
            expect(serialized).not.toContain(
                `"sheetId":${sheet.properties.sheetId},`
            );

        expect(
            plan.requests.map((request) => Object.keys(request))
        ).toStrictEqual([
            ["addSheet"],
            ["updateCells"],
            ["repeatCell"],
            ["repeatCell"],
            ["repeatCell"],
            ["updateDimensionProperties"],
            ["updateDimensionProperties"],
            ["addProtectedRange"],
        ]);
        expect(plan.requests.at(-1)).toStrictEqual({
            addProtectedRange: {
                protectedRange: {
                    description: "Read-only watering map projection",
                    range: { sheetId: wateringMapFeedSheetId },
                    warningOnly: true,
                },
            },
        });
        expect(plan.requests[4]).toMatchObject({
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: {
                            pattern: wateringMapFeedDateFormat,
                            type: "DATE_TIME",
                        },
                    },
                },
                range: {
                    endColumnIndex: 1,
                    endRowIndex: 50_003,
                    sheetId: wateringMapFeedSheetId,
                    startColumnIndex: 0,
                    startRowIndex: 2,
                },
            },
        });
        expect(() => {
            assertWateringMapFeedPreconditions(plan, structuredClone(snapshot));
        }).not.toThrow();
    });

    it("uses the exact formula, sheet identity and capacity of the bound server", () => {
        expect.hasAssertions();

        const context = serverContext();

        expect(
            String(vm.runInContext("wateringMapFeedFormula_()", context))
        ).toBe(wateringMapFeedFormula());
        expect(
            vm.runInContext("GARDEN_LOGGER.wateringMapSheetId", context)
        ).toBe(wateringMapFeedSheetId);
        expect(vm.runInContext("GARDEN_LOGGER.wateringMapSheet", context)).toBe(
            wateringMapFeedTitle
        );
        expect(
            vm.runInContext("GARDEN_LOGGER.historyCapacityRows + 2", context)
        ).toBe(wateringMapFeedRowCount);
        expect(wateringMapFeedColumnCount).toBe(12);
        expect(
            buildWateringMapFeedRequests(fixture(), maintainedHeaders())
                .requests[1]
        ).toMatchObject({
            updateCells: {
                fields: "userEnteredValue,note",
                rows: [
                    {
                        values: [
                            {
                                userEnteredValue: {
                                    formulaValue: wateringMapFeedFormula(),
                                },
                            },
                        ],
                    },
                ],
                start: {
                    columnIndex: 0,
                    rowIndex: 0,
                    sheetId: wateringMapFeedSheetId,
                },
            },
        });
    });

    it.each([
        { title: wateringMapFeedTitle },
        { sheetId: wateringMapFeedSheetId },
    ])(
        "rejects an occupied destination by %j without producing a repair plan",
        (collision) => {
            expect.hasAssertions();

            const snapshot = fixture();
            const target = required(snapshot.metadata.sheets[1]).properties;
            Object.assign(target, collision);

            expect(() =>
                buildWateringMapFeedRequests(snapshot, maintainedHeaders())
            ).toThrow("destination already exists");
        }
    );

    it("rejects replay even when the installed formula matches", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        snapshot.metadata.sheets.push({
            properties: {
                gridProperties: { columnCount: 8, rowCount: 50_003 },
                hidden: true,
                index: snapshot.metadata.sheets.length,
                sheetId: wateringMapFeedSheetId,
                title: wateringMapFeedTitle,
            },
        });
        snapshot.cells.push({
            column: 0,
            row: 0,
            sheet: wateringMapFeedTitle,
            value: { formulaValue: wateringMapFeedFormula() },
        });

        expect(() =>
            buildWateringMapFeedRequests(snapshot, maintainedHeaders())
        ).toThrow("never replay");
    });

    it.each([
        "metadata",
        "timezone",
        "empty",
        "duplicate title",
        "duplicate id",
        "duplicate index",
        "missing index",
        "rows",
        "columns",
        "sheet type",
    ])("rejects incomplete native capture: %s", (scenario) => {
        expect.hasAssertions();

        const snapshot = fixture();
        const sheet = required(snapshot.metadata.sheets[1]).properties;
        switch (scenario) {
            case "columns": {
                sheet.gridProperties.columnCount = 0;
                break;
            }
            case "duplicate id": {
                sheet.sheetId = 100;
                break;
            }
            case "duplicate index": {
                sheet.index = 0;
                break;
            }
            case "duplicate title": {
                sheet.title = "History";
                break;
            }
            case "empty": {
                snapshot.metadata.sheets = [];
                break;
            }
            case "metadata": {
                snapshot.metadataComplete = false;
                break;
            }
            case "missing index": {
                sheet.index = 5;
                break;
            }
            case "rows": {
                sheet.gridProperties.rowCount = NaN;
                break;
            }
            case "sheet type": {
                sheet.sheetType = "OBJECT";
                break;
            }
            case "timezone": {
                snapshot.metadata.properties.timeZone = "UTC";
                break;
            }
            default: {
                throw new Error("Unexpected test scenario");
            }
        }

        expect(() =>
            buildWateringMapFeedRequests(snapshot, maintainedHeaders())
        ).toThrow(/metadata|native|timezone/v);
    });

    it.each([
        "header",
        "duplicate cell",
        "missing cell",
        "formula header",
        "capture range",
        "capacity",
        "width",
        "schema length",
        "schema uniqueness",
        "projection order",
    ])("rejects History schema/capture drift: %s", (scenario) => {
        expect.hasAssertions();

        const snapshot = fixture();
        const headers = maintainedHeaders();
        const history = required(snapshot.metadata.sheets[0]).properties;
        switch (scenario) {
            case "capacity": {
                history.gridProperties.rowCount = 50_000;
                break;
            }
            case "capture range": {
                required(snapshot.readRanges[0]).endColumn = 66;
                break;
            }
            case "duplicate cell": {
                snapshot.cells.push(
                    structuredClone(required(snapshot.cells[0]))
                );
                break;
            }
            case "formula header": {
                required(snapshot.cells[0]).value.formulaValue = '="Date"';
                break;
            }
            case "header": {
                required(snapshot.cells[35]).value = {
                    stringValue: "Wrong status",
                };
                break;
            }
            case "missing cell": {
                snapshot.cells.pop();
                break;
            }
            case "projection order": {
                headers[0] = "Something else";
                break;
            }
            case "schema length": {
                headers.pop();
                break;
            }
            case "schema uniqueness": {
                headers[66] = required(headers[65]);
                break;
            }
            case "width": {
                history.gridProperties.columnCount = 68;
                break;
            }
            default: {
                throw new Error("Unexpected test scenario");
            }
        }

        expect(() => buildWateringMapFeedRequests(snapshot, headers)).toThrow(
            "History"
        );
    });

    it("includes the entire allocation and allows exactly the existing cell budget", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const base = buildWateringMapFeedRequests(
            snapshot,
            maintainedHeaders()
        );
        const extraRows = 20_000_000 - base.allocatedCellsAfter;
        snapshot.metadata.sheets.push({
            properties: {
                gridProperties: { columnCount: 1, rowCount: extraRows },
                index: 5,
                sheetId: 105,
                title: "Existing large helper",
            },
        });

        expect(
            buildWateringMapFeedRequests(snapshot, maintainedHeaders())
                .allocatedCellsAfter
        ).toBe(20_000_000);

        required(
            snapshot.metadata.sheets.at(-1)
        ).properties.gridProperties.rowCount += 1;

        expect(() =>
            buildWateringMapFeedRequests(snapshot, maintainedHeaders())
        ).toThrow("cell budget");
    });

    it("accepts reordered protections and object keys while retaining every protection field", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const protections = required(
            snapshot.metadata.sheets[0]
        ).protectedRanges;
        required(protections).push({
            protectedRangeId: 201,
            range: { endRowIndex: 10, sheetId: 100, startRowIndex: 1 },
            warningOnly: false,
        });
        const before = structuredClone(snapshot);
        const plan = buildWateringMapFeedRequests(
            snapshot,
            maintainedHeaders()
        );
        const fresh = structuredClone(snapshot);
        const freshProtections = required(
            required(fresh.metadata.sheets[0]).protectedRanges
        );
        freshProtections.reverse();
        delete fresh.metadata.properties.locale;
        fresh.metadata.properties.locale = "en_US";

        expect(() => {
            assertWateringMapFeedPreconditions(plan, fresh);
        }).not.toThrow();
        expect(snapshot).toStrictEqual(before);

        required(freshProtections[0]).range.endRowIndex = 11;

        expect(() => {
            assertWateringMapFeedPreconditions(plan, fresh);
        }).toThrow("Workbook drift");
    });

    it("retains chart array order in native preconditions", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const charts = required(required(snapshot.metadata.sheets[1]).charts);
        const second = structuredClone(required(charts[0]));
        second.chartId = 502;
        charts.push(second);
        const plan = buildWateringMapFeedRequests(
            snapshot,
            maintainedHeaders()
        );
        charts.reverse();

        expect(() => {
            assertWateringMapFeedPreconditions(plan, snapshot);
        }).toThrow("Workbook drift");
    });

    it.each([
        "headers",
        "chart",
        "protection",
        "grid",
        "spreadsheet",
        "new sheet",
    ])("requires a fresh plan after %s changes", (scenario) => {
        expect.hasAssertions();

        const snapshot = fixture();
        const plan = buildWateringMapFeedRequests(
            snapshot,
            maintainedHeaders()
        );
        switch (scenario) {
            case "chart": {
                required(
                    required(snapshot.metadata.sheets[1]).charts?.[0]
                ).spec.title = "Changed chart";
                break;
            }
            case "grid": {
                required(
                    snapshot.metadata.sheets[0]
                ).properties.gridProperties.rowCount += 1;
                break;
            }
            case "headers": {
                required(snapshot.cells[0]).value.stringValue = "Changed";
                break;
            }
            case "new sheet": {
                snapshot.metadata.sheets.push({
                    properties: {
                        gridProperties: { columnCount: 8, rowCount: 50_003 },
                        index: 5,
                        sheetId: wateringMapFeedSheetId,
                        title: wateringMapFeedTitle,
                    },
                });
                break;
            }
            case "protection": {
                required(
                    required(snapshot.metadata.sheets[0]).protectedRanges?.[0]
                ).warningOnly = false;
                break;
            }
            case "spreadsheet": {
                snapshot.metadata.spreadsheetId = "another-workbook";
                break;
            }
            default: {
                throw new Error("Unexpected test scenario");
            }
        }

        expect(() => {
            assertWateringMapFeedPreconditions(plan, snapshot);
        }).toThrow("Workbook drift");
    });
});
