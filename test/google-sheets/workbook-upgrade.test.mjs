import * as fs from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import palette from "../../scripts/google-sheets/plant-colors.json" with { type: "json" };
import {
    analyticsSheetId,
    buildWorkbookUpgradeRequests,
    calculationsSheetId,
    normalizeDerivedFormula,
} from "../../scripts/google-sheets/workbook-upgrade.mjs";
import { required } from "../helpers/required.mjs";

const runtime = vm.createContext({});
vm.runInContext(
    fs.readFileSync(
        new URL(
            "../../scripts/google-sheets/plant-tracker.gs",
            import.meta.url
        ),
        "utf8"
    ),
    runtime
);
/**
 * @type {{
 *     dailyCareWeightFormula_: (
 *         row: number,
 *         bounds: { history: number; baseline: number },
 *         column: string,
 *         clock: string
 *     ) => string;
 *     plantPageHistoryFormula_: (id: string) => string;
 * }}
 */
const sourceApi =
    /**
     * @type {{
     *     dailyCareWeightFormula_: (
     *         row: number,
     *         bounds: { history: number; baseline: number },
     *         column: string,
     *         clock: string
     *     ) => string;
     *     plantPageHistoryFormula_: (id: string) => string;
     * }}
     */ (/** @type {unknown} */ (runtime));
const factories = {
    latestPair: (/** @type {number} */ row) =>
        /** @type {string} */ (
            sourceApi.dailyCareWeightFormula_(
                row,
                { baseline: palette.length + 1, history: 5000 },
                "A",
                "'Workbook calculations'!$E$2"
            )
        ),
    plantHistory: (/** @type {string} */ id) =>
        /** @type {string} */ (sourceApi.plantPageHistoryFormula_(id)),
};

/** @returns {import("../workbook-fixtures.d.ts").WorkbookSnapshot} */
function fixture() {
    const names = [
        "History",
        "History view",
        "Baselines",
        "Plant tracker",
        "Dashboard",
        "Insights",
        "Integrity",
        "RO refills",
        "Watering intervals",
        "Dry-down insights",
        "App entries",
        "App bulk",
        ...palette.map(({ id }) => `${id} Test`),
    ];
    /** @type {import("../workbook-fixtures.d.ts").WorkbookSnapshot["cells"]} */
    const cells = [];
    /**
     * @param {string} sheet @param {number} row @param {number} column @param
     *   {string} content
     */
    const put = (sheet, row, column, content) => {
        cells.push({
            column,
            row,
            sheet,
            value: content.startsWith("=")
                ? { formulaValue: content }
                : { stringValue: content },
        });
    };
    for (const [column, label] of [
        [0, "Date"],
        [1, "Plant ID"],
        [2, "Event"],
        [16, "Nutrients used"],
        [35, "Record status"],
    ])
        put("History", 0, Number(column), String(label));
    put("Dashboard", 5, 22, "Recommended water date");
    put("Insights", 227, 1, "P01");
    put(
        "Integrity",
        11,
        1,
        "=SUM(ARRAYFORMULA(N(ISERROR(Dashboard!U4:X254))))"
    );
    for (const [index, element] of palette.entries()) {
        const { id } = required(element);
        put("Baselines", index + 1, 0, id);
        put("Plant tracker", index + 1, 0, id);
        put("Dashboard", index + 6, 1, id);
        for (const column of [2, 4])
            put(
                "Baselines",
                index + 1,
                column,
                '=INDEX(IFNA(LET(setup,1,HSTACK(1,1)),{"",""}),1,1)'
            );
        put(`${id} Test`, 12, 0, factories.plantHistory(id));
        for (const [column, heading] of [
            "Date",
            "Event",
            "Recorded state",
            "Weight (lb)",
            "Weight (g)",
            "Height (cm)",
            "Width (cm)",
            "Condition",
            "Notes",
            "Quality / method",
            "Record status",
        ].entries())
            put(`${id} Test`, 11, column, heading);
    }
    return {
        cells,
        metadata: {
            sheets: names.map((title, sheetId) => ({
                charts: [],
                conditionalFormats: title.startsWith("P0")
                    ? [
                          {
                              booleanRule: {
                                  condition: {
                                      type: "TEXT_EQ",
                                      values: [{ userEnteredValue: "Water" }],
                                  },
                              },
                              ranges: [
                                  {
                                      endColumnIndex: 2,
                                      endRowIndex: 108,
                                      sheetId,
                                      startColumnIndex: 1,
                                      startRowIndex: 12,
                                  },
                                  {
                                      endColumnIndex: 2,
                                      endRowIndex: 1000,
                                      sheetId,
                                      startColumnIndex: 1,
                                      startRowIndex: 109,
                                  },
                              ],
                          },
                      ]
                    : [],
                properties: {
                    gridProperties: {
                        columnCount: title === "History" ? 42 : 36,
                        rowCount: title === "History" ? 5000 : 1000,
                    },
                    sheetId,
                    title,
                },
            })),
        },
    };
}

describe("native workbook reliability and analytics migration", () => {
    it("builds only additive charts and derived writes while preserving canonical and RO input cells", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const original = structuredClone(snapshot);
        const result = buildWorkbookUpgradeRequests(snapshot, factories);

        expect(snapshot).toStrictEqual(original);
        expect(result.chartRequests).toHaveLength(2);
        expect(result.chartRequests[0]).toHaveProperty(
            "addChart.chart.chartId",
            907_202_609
        );
        expect(result.chartRequests[1]).toHaveProperty(
            "addChart.chart.spec.basicChart.chartType",
            "SCATTER"
        );
        expect(result.chartRequests[1]).toHaveProperty(
            "addChart.chart.spec.basicChart.legendPosition",
            "NO_LEGEND"
        );
        expect(result.chartRequests[1]).toHaveProperty(
            "addChart.chart.spec.basicChart.series.length",
            palette.length * 3
        );
        expect(result.chartRequests[1]).toHaveProperty(
            "addChart.chart.spec.basicChart.series.1.pointStyle.shape",
            "DIAMOND"
        );

        const all = JSON.stringify([
            ...result.prepareRequests,
            ...result.formulaRequests,
            ...result.chartRequests,
        ]);

        expect(all).not.toMatch(
            /deleteEmbeddedObject|deleteSheet|updateChartSpec|updateEmbeddedObjectPosition/v
        );

        const roId = snapshot.metadata.sheets.find(
            (s) => s.properties.title === "RO refills"
        )?.properties.sheetId;
        const immutableIds = snapshot.metadata.sheets
            .filter((s) =>
                [
                    "App bulk",
                    "App entries",
                    "History",
                ].includes(s.properties.title)
            )
            .map((s) => s.properties.sheetId);
        /** @type {number[]} */
        const roColumns = [];
        for (const request of result.formulaRequests) {
            const update =
                /**
                 * @type {{ start?: { sheetId: number; columnIndex: number } }
                 *     | undefined}
                 */ (request["updateCells"]);
            if (!update?.start) continue;

            expect(immutableIds).not.toContain(update.start.sheetId);

            if (update.start.sheetId === roId)
                roColumns.push(update.start.columnIndex);
        }

        expect(roColumns.length).toBeGreaterThan(0);
        expect(roColumns.every((column) => column >= 14)).toBe(true);
        expect(result.verification.historyStartRow).toBe(141);
        expect(result.verification.historyEndRow).toBe(5139);

        const integrity = result.formulaRequests.find((request) =>
            JSON.stringify(request).includes("Insights!A226:W900")
        );

        expect(JSON.stringify(integrity)).toContain(
            "A1:INDEX('P01 Test'!V1:V5139,140+MAX(1,COUNTIF("
        );
        expect(JSON.stringify(integrity)).not.toContain(
            "'Workbook analytics'!A1:BN5001"
        );
        expect(result.emptyRanges).toContainEqual({
            endColumn: 12,
            endRow: 1000,
            sheet: "P01 Test",
            startColumn: 0,
            startRow: 138,
        });
        expect(result.preconditions.length).toBeLessThan(10_000);
    });

    it("removes the old spill before merging summaries and moves history rule ranges without modifying conditions", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const page = required(
            snapshot.metadata.sheets.find(
                (s) => s.properties.title === "P01 Test"
            )
        );
        const result = buildWorkbookUpgradeRequests(snapshot, factories);
        const clear = result.prepareRequests.findIndex((request) => {
            const update =
                /**
                 * @type {{
                 *           start?: {
                 *               sheetId: number;
                 *               rowIndex: number;
                 *               columnIndex: number;
                 *           };
                 *       }
                 *     | undefined}
                 */ (request["updateCells"]);
            return (
                update?.start?.sheetId === page.properties.sheetId &&
                update.start.rowIndex === 12 &&
                update.start.columnIndex === 0
            );
        });
        const merge = result.prepareRequests.findIndex((request) => {
            const merge =
                /**
                 * @type {{ range: { sheetId: number; startRowIndex: number } }
                 *     | undefined}
                 */ (request["mergeCells"]);
            return (
                merge?.range.sheetId === page.properties.sheetId &&
                merge.range.startRowIndex === 13
            );
        });

        expect(clear).toBeGreaterThanOrEqual(0);
        expect(merge).toBeGreaterThan(clear);

        const dashboard = required(
            snapshot.metadata.sheets.find(
                (sheet) => sheet.properties.title === "Dashboard"
            )
        );

        expect(result.prepareRequests).toStrictEqual(
            expect.arrayContaining([
                {
                    updateDimensionProperties: {
                        fields: "hiddenByUser,pixelSize",
                        properties: { hiddenByUser: false, pixelSize: 32 },
                        range: {
                            dimension: "ROWS",
                            endIndex: 4,
                            sheetId: dashboard.properties.sheetId,
                            startIndex: 3,
                        },
                    },
                },
                {
                    updateDimensionProperties: {
                        fields: "hiddenByUser,pixelSize",
                        properties: { hiddenByUser: false, pixelSize: 26 },
                        range: {
                            dimension: "ROWS",
                            endIndex: 5,
                            sheetId: dashboard.properties.sheetId,
                            startIndex: 4,
                        },
                    },
                },
            ])
        );
        expect(result.prepareRequests).toContainEqual({
            updateConditionalFormatRule: {
                index: 0,
                rule: {
                    ...page?.conditionalFormats?.[0],
                    ranges: [
                        {
                            endColumnIndex: 2,
                            endRowIndex: 5139,
                            sheetId: page?.properties.sheetId,
                            startColumnIndex: 1,
                            startRowIndex: 140,
                        },
                    ],
                },
                sheetId: page?.properties.sheetId,
            },
        });
        expect(JSON.stringify(result.formulaRequests)).toContain("Open photo");
        expect(JSON.stringify(result.formulaRequests)).toContain(
            "Plain-water events after feed time"
        );
        expect(result.prepareRequests).toStrictEqual(
            expect.arrayContaining([
                {
                    repeatCell: {
                        cell: {
                            userEnteredFormat: {
                                numberFormat: {
                                    pattern: "0.#",
                                    type: "NUMBER",
                                },
                            },
                        },
                        fields: "userEnteredFormat.numberFormat",
                        range: {
                            endColumnIndex: 10,
                            endRowIndex: 16,
                            sheetId: page.properties.sheetId,
                            startColumnIndex: 3,
                            startRowIndex: 15,
                        },
                    },
                },
                {
                    repeatCell: {
                        cell: {
                            userEnteredFormat: {
                                numberFormat: { pattern: "0", type: "NUMBER" },
                            },
                        },
                        fields: "userEnteredFormat.numberFormat",
                        range: {
                            endColumnIndex: 10,
                            endRowIndex: 33,
                            sheetId: page.properties.sheetId,
                            startColumnIndex: 3,
                            startRowIndex: 32,
                        },
                    },
                },
            ])
        );
    });

    it("guards new helper IDs, edited destination cells, inventory order and circular Integrity scans", () => {
        expect.hasAssertions();

        const cases = [
            (/** @type {ReturnType<typeof fixture>} */ s) => {
                s.metadata.sheets.push({
                    properties: {
                        gridProperties: { columnCount: 6, rowCount: 32 },
                        sheetId: calculationsSheetId,
                        title: "Workbook calculations",
                    },
                });
            },
            (/** @type {ReturnType<typeof fixture>} */ s) => {
                s.cells.push({
                    column: 2,
                    row: 20,
                    sheet: "P01 Test",
                    value: { stringValue: "Owner note" },
                });
            },
            (/** @type {ReturnType<typeof fixture>} */ s) => {
                s.cells.push({
                    column: 0,
                    row: 140,
                    sheet: "P01 Test",
                    value: { stringValue: "Existing destination" },
                });
            },
            (/** @type {ReturnType<typeof fixture>} */ s) => {
                const cell = s.cells.find(
                    (c) =>
                        c.sheet === "Baselines" && c.row === 1 && c.column === 0
                );
                if (cell) cell.value = { stringValue: "P02" };
            },
            (/** @type {ReturnType<typeof fixture>} */ s) => {
                const cell = s.cells.find((c) => c.sheet === "Integrity");
                if (cell)
                    cell.value = {
                        formulaValue: "=SUM(ISERROR(Dashboard!A1:X254))",
                    };
            },
        ];
        for (const mutate of cases) {
            const snapshot = fixture();
            mutate(snapshot);

            expect(() =>
                buildWorkbookUpgradeRequests(snapshot, factories)
            ).toThrow(
                /Occupied destination|Unexpected Baselines|Unexpected Integrity|already exists/v
            );
        }
        const snapshot = fixture();

        expect(() =>
            buildWorkbookUpgradeRequests(snapshot, {
                ...factories,
                latestPair: () => "=NOW()",
            })
        ).toThrow("correction-aware pair");
    });

    it("centralizes only derived formulas and never changes text literals or History formulas", () => {
        expect.hasAssertions();

        const formula =
            '=IF(A2="NOW()",TODAY()+NOW(),XLOOKUP(A2,\'Plant tracker\'!$A:$A,Baselines!C:C,"TODAY()"))';

        expect(normalizeDerivedFormula(formula)).toBe(
            "=IF(A2=\"NOW()\",'Workbook calculations'!$F$2+'Workbook calculations'!$E$2,XLOOKUP(A2,'Plant tracker'!$A$2:$A$33,Baselines!$C$2:$C$33,\"TODAY()\"))"
        );

        const snapshot = fixture();
        snapshot.cells.push(
            {
                column: 12,
                row: 1,
                sheet: "History",
                value: { formulaValue: "=TODAY()" },
            },
            {
                column: 4,
                row: 1,
                sheet: "Plant tracker",
                value: { formulaValue: "=TODAY()-D2" },
            }
        );
        const result = buildWorkbookUpgradeRequests(snapshot, factories);

        expect(result.preconditions).not.toContainEqual(snapshot.cells.at(-2));
        expect(result.preconditions).toContainEqual(snapshot.cells.at(-1));
        expect(result.formulaRequests).toContainEqual({
            updateCells: {
                fields: "userEnteredValue",
                rows: [
                    {
                        values: [
                            {
                                userEnteredValue: {
                                    formulaValue: expect.stringContaining(
                                        "GARDEN_CYCLE_COMPARISON"
                                    ),
                                },
                            },
                        ],
                    },
                ],
                start: {
                    columnIndex: 0,
                    rowIndex: 0,
                    sheetId: analyticsSheetId,
                },
            },
        });
    });
});
