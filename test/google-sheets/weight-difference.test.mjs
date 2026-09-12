import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import { plantColor } from "../../scripts/google-sheets/plant-chart-colors.mjs";
import palette from "../../scripts/google-sheets/plant-colors.json" with { type: "json" };
import { buildWeightDifferenceRequests } from "../../scripts/google-sheets/weight-difference.mjs";
import { required } from "../helpers/required.mjs";

/** @returns {import("../workbook-fixtures.d.ts").WorkbookSnapshot} */
function fixture() {
    const titles = [
        "Dashboard",
        "Insights",
        "Daily care",
        "Integrity",
        "Dry-down insights",
        ...palette.map((plant) => `${plant.id} Example`),
    ];
    /** @type {import("../workbook-fixtures.d.ts").WorkbookSnapshot} */
    const snapshot = {
        cells: [
            {
                column: 7,
                row: 5,
                sheet: "Dashboard",
                value: { stringValue: "Dry weight (g)" },
            },
            {
                column: 8,
                row: 5,
                sheet: "Dashboard",
                value: { stringValue: "Predicted dry date" },
            },
            {
                column: 23,
                row: 5,
                sheet: "Dashboard",
                value: { stringValue: "Weight measurements" },
            },
            {
                column: 5,
                row: 39,
                sheet: "Daily care",
                value: { stringValue: "Difference vs last completed dry (g)" },
            },
            {
                column: 1,
                row: 11,
                sheet: "Integrity",
                value: {
                    formulaValue:
                        "=SUM(IFERROR(Dashboard!A1:T254,0),IFERROR(Dashboard!U4:X254,0),IFERROR(Dashboard!Y1:Z254,0))",
                },
            },
        ],
        metadata: {
            sheets: titles.map((title, index) => ({
                properties: {
                    gridProperties: {
                        columnCount: title === "Dashboard" ? 24 : 31,
                        rowCount: title === "Insights" ? 585 : 1000,
                    },
                    sheetId: index + 1,
                    title,
                },
            })),
        },
    };
    const dashboard = required(snapshot.metadata.sheets[0]);
    dashboard.basicFilter = {
        range: {
            endColumnIndex: 23,
            endRowIndex: 36,
            sheetId: 1,
            startColumnIndex: 0,
            startRowIndex: 5,
        },
    };
    dashboard.protectedRanges = [
        {
            protectedRangeId: 123,
            range: {
                endColumnIndex: 23,
                endRowIndex: 37,
                sheetId: 1,
                startColumnIndex: 0,
                startRowIndex: 0,
            },
            warningOnly: true,
        },
    ];
    required(snapshot.metadata.sheets[1]).charts = Array.from(
        { length: 19 },
        (_, index) => ({
            chartId: index + 100,
            spec: {
                basicChart: { axis: [], domains: [], series: [] },
                title: `Existing chart ${index}`,
            },
        })
    );
    for (const [index, plant] of palette.entries()) {
        const sheet = `${plant.id} Example`;
        snapshot.cells.push(
            {
                column: 1,
                row: index + 6,
                sheet: "Dashboard",
                value: { stringValue: plant.id },
            },
            {
                column: 0,
                row: 7,
                sheet,
                value: { stringValue: "Last weighed" },
            },
            {
                column: 1,
                row: 7,
                sheet,
                value: { formulaValue: `=Baselines!E${index + 2}` },
            },
            { column: 0, row: 8, sheet, value: { stringValue: "Pot / setup" } },
            {
                column: 1,
                row: 8,
                sheet,
                value: { formulaValue: `='Plant tracker'!D${index + 2}` },
            }
        );
    }
    return snapshot;
}

describe("current weight difference migration", () => {
    it("inserts only Dashboard table cells and preserves history positions and source inputs", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const requests = buildWeightDifferenceRequests(snapshot);

        expect(snapshot).toStrictEqual(before);
        expect(
            requests.filter((request) => "insertRange" in request)
        ).toStrictEqual([
            {
                insertRange: {
                    range: {
                        endColumnIndex: 9,
                        endRowIndex: 36,
                        sheetId: 1,
                        startColumnIndex: 8,
                        startRowIndex: 5,
                    },
                    shiftDimension: "COLUMNS",
                },
            },
        ]);
        expect(
            requests.filter((request) => "appendDimension" in request)
        ).toStrictEqual([
            {
                appendDimension: {
                    dimension: "COLUMNS",
                    length: 1,
                    sheetId: 1,
                },
            },
            { appendDimension: { dimension: "ROWS", length: 49, sheetId: 2 } },
        ]);
        expect(
            requests.some(
                (request) =>
                    "deleteSheet" in request ||
                    "deleteDimension" in request ||
                    "updateChartSpec" in request ||
                    "setDataValidation" in request
            )
        ).toBe(false);

        const writes = requests.filter((request) => "updateCells" in request);

        expect(writes).toContainEqual({
            updateCells: {
                fields: "userEnteredValue",
                rows: [
                    {
                        values: [
                            {
                                userEnteredValue: {
                                    stringValue:
                                        "Current weight difference (g)",
                                },
                            },
                            {
                                userEnteredValue: {
                                    formulaValue:
                                        '=IF(AND(ISNUMBER(B6),B6>0,ISNUMBER(B7),B7>0),B6-B7,"")',
                                },
                            },
                        ],
                    },
                    {
                        values: [
                            {
                                userEnteredValue: {
                                    stringValue: "Last weighed",
                                },
                            },
                            {
                                userEnteredValue: {
                                    formulaValue: "=Baselines!E2",
                                },
                            },
                        ],
                    },
                    {
                        values: [
                            {
                                userEnteredValue: {
                                    stringValue: "Pot / setup",
                                },
                            },
                            {
                                userEnteredValue: {
                                    formulaValue: "='Plant tracker'!D2",
                                },
                            },
                        ],
                    },
                ],
                start: { columnIndex: 0, rowIndex: 7, sheetId: 6 },
            },
        });
        expect(requests).toContainEqual({
            updateProtectedRange: {
                fields: "range",
                protectedRange: {
                    protectedRangeId: 123,
                    range: {
                        endColumnIndex: 25,
                        endRowIndex: 37,
                        sheetId: 1,
                        startColumnIndex: 0,
                        startRowIndex: 0,
                    },
                },
            },
        });
    });

    it("keeps the Apps Script and native formulas and explanations consistent", async () => {
        expect.hasAssertions();

        const source = await readFile(
            new URL(
                "../../scripts/google-sheets/plant-tracker.gs",
                import.meta.url
            ),
            "utf8"
        );
        const result = /** @type {unknown} */ (
            vm.runInNewContext(
                `${source}\nJSON.stringify([currentWeightDifferenceFormula_("G7","H7"),WEIGHT_DIFFERENCE_NOTE])`
            )
        );

        expect(result).toBeTypeOf("string");

        const requests = JSON.stringify(
            buildWeightDifferenceRequests(fixture())
        );
        const values = /** @type {string[]} */ (JSON.parse(String(result)));
        for (const value of values)
            expect(requests).toContain(JSON.stringify(value));
    });

    it("keeps numeric zero and missing references distinct in a fixed plant-order chart", () => {
        expect.hasAssertions();

        const requests = buildWeightDifferenceRequests(fixture());
        const chart = requests.filter((request) => "addChart" in request);

        expect(chart).toHaveLength(1);
        expect(chart[0]).toMatchObject({
            addChart: {
                chart: {
                    chartId: 907_202_604,
                    position: {
                        overlayPosition: {
                            anchorCell: { rowIndex: 585, sheetId: 2 },
                        },
                    },
                    spec: {
                        basicChart: {
                            chartType: "BAR",
                            series: [
                                {
                                    dataLabel: { type: "DATA" },
                                    series: {
                                        sourceRange: {
                                            sources: [
                                                {
                                                    endColumnIndex: 23,
                                                    endRowIndex: 31,
                                                    sheetId: 5,
                                                    startColumnIndex: 22,
                                                },
                                            ],
                                        },
                                    },
                                    styleOverrides: palette.map(
                                        (plant, index) => ({
                                            colorStyle: {
                                                rgbColor: plantColor(plant.id),
                                            },
                                            index,
                                        })
                                    ),
                                },
                            ],
                        },
                    },
                },
            },
        });

        const text = JSON.stringify(requests);

        expect(text).toContain("ISNUMBER(Dashboard!$I$7:$I$36)");
        expect(text).toContain("Dashboard!$B$7:$B$36");
        expect(text).toContain("Current weight difference (g)");
    });

    it.each([
        [
            "Dashboard",
            5,
            8,
            "Current weight difference (g)",
            "already installed",
        ],
        [
            "Dashboard",
            6,
            1,
            "P02",
            "plant order changed",
        ],
        [
            "Daily care",
            39,
            5,
            "Changed header",
            "Daily care weight header changed",
        ],
        [
            "Dry-down insights",
            5,
            22,
            "Important value",
            "W:X is occupied",
        ],
        [
            "P01 Example",
            9,
            0,
            "Existing content",
            "Plant header changed",
        ],
    ])(
        "refuses changed destination %s row %i column %i",
        (sheet, row, column, value, message) => {
            expect.hasAssertions();

            const snapshot = fixture();
            snapshot.cells = snapshot.cells.filter(
                (cell) =>
                    cell.sheet !== sheet ||
                    cell.row !== row ||
                    cell.column !== column
            );
            snapshot.cells.push({
                column,
                row,
                sheet,
                value: { stringValue: value },
            });

            expect(() => buildWeightDifferenceRequests(snapshot)).toThrow(
                message
            );
        }
    );

    it("rejects reused chart IDs and a shifted append location", () => {
        expect.hasAssertions();

        const reused = fixture();
        required(required(reused.metadata.sheets[1]).charts?.[0]).chartId =
            907_202_604;

        expect(() => buildWeightDifferenceRequests(reused)).toThrow(
            "chart already exists"
        );

        const moved = fixture();
        required(moved.metadata.sheets[1]).properties.gridProperties.rowCount =
            600;

        expect(() => buildWeightDifferenceRequests(moved)).toThrow(
            "chart layout changed"
        );
    });
});
