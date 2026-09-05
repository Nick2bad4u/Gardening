import { describe, expect, it } from "vitest";

import {
    buildWorkbookAuditRequests,
    parseWorkbookSnapshot,
} from "../../scripts/google-sheets/workbook-audit.mjs";
import { required } from "../helpers/required.mjs";

/** @returns {import("../workbook-fixtures.d.ts").WorkbookSnapshot} */
function fixture() {
    const names = [
        "Dashboard",
        "Baselines",
        "Plant tracker",
        "Insights",
        "Insights data",
        "Integrity",
        "History",
        "App plant charts",
        "App insight activity",
    ];
    /** @type {import("../workbook-fixtures.d.ts").SheetMetadata[]} */
    const sheets = names.map((title, sheetId) => ({
        charts: [],
        conditionalFormats: [],
        properties: {
            gridProperties: {
                columnCount: title === "Insights data" ? 25 : 36,
                rowCount: 1000,
            },
            sheetId,
            title,
        },
    }));
    /** @type {import("../workbook-fixtures.d.ts").WorkbookSnapshot["cells"]} */
    const cells = [
        {
            column: 0,
            row: 0,
            sheet: "Baselines",
            value: { stringValue: "Plant ID" },
        },
        {
            column: 1,
            row: 5,
            sheet: "Dashboard",
            value: { stringValue: "Plant ID" },
        },
    ];
    for (let i = 0; i < 30; i++) {
        const id = `P${String(i + 1).padStart(2, "0")}`;
        cells.push({
            column: 0,
            row: i + 1,
            sheet: "Baselines",
            value: { stringValue: id },
        });
        const sheetId = 100 + i;
        sheets.push({
            charts: [
                "Plant dimensions • measurement history",
                "Weight history • calendar time",
                "Weight trend after latest Water / Repot anchor",
            ].map((title, index) => ({
                chartId: sheetId * 10 + index,
                position: {
                    overlayPosition: {
                        anchorCell: { columnIndex: 12, rowIndex: 2 },
                    },
                },
                spec: {
                    basicChart: {
                        axis: [{ position: "BOTTOM_AXIS" }],
                        domains: [
                            {
                                domain: {
                                    sourceRange: {
                                        sources: [
                                            {
                                                endColumnIndex: 10,
                                                endRowIndex: 336,
                                                sheetId,
                                                startColumnIndex: 9,
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        series: [],
                    },
                    title,
                    titleTextFormat: { italic: true },
                },
            })),
            properties: {
                gridProperties: { columnCount: 18, rowCount: 1000 },
                sheetId,
                title: `${id} Plant`,
            },
        });
    }
    for (const column of [
        15,
        16,
        17,
        19,
    ])
        cells.push({
            column,
            row: 28,
            sheet: "Insights data",
            value: { formulaValue: "='Plant tracker'!A29" },
        });
    return { cells, metadata: { sheets } };
}

describe("one-time native workbook audit repair", () => {
    it("repairs all reviewed insight charts while preserving unrelated chart properties", () => {
        expect.hasAssertions();

        const input = fixture();
        const templateSheet = required(
            input.metadata.sheets.find(
                (sheet) => sheet.properties.title === "P01 Plant"
            )
        );
        const template = required(templateSheet.charts?.[0]);
        const insights = required(
            input.metadata.sheets.find(
                (sheet) => sheet.properties.title === "Insights"
            )
        );
        const domain = required(template.spec.basicChart.domains[0]);
        const titles = [
            "Plant dimensions",
            "Plant shape map",
            "Care activity timeline",
            "Data-quality follow-ups by plant",
            "Recent drying rate by plant",
            "Unrelated owner chart",
        ];
        insights.charts = titles.map((title, index) => ({
            ...structuredClone(template),
            chartId: 2000 + index,
            spec: {
                ...structuredClone(template.spec),
                basicChart: {
                    axis: [{ position: "BOTTOM_AXIS" }],
                    domains: [structuredClone(domain)],
                    series: [
                        {
                            dataLabel: {
                                customLabelData: structuredClone(domain.domain),
                            },
                            series: structuredClone(domain.domain),
                        },
                    ],
                },
                title,
            },
        }));
        const original = structuredClone(input);
        const validated = parseWorkbookSnapshot(input);
        const updates = buildWorkbookAuditRequests(validated).flatMap(
            (request) => {
                const chart = request.updateChartSpec;
                return chart === undefined || chart.chartId < 2000
                    ? []
                    : [chart];
            }
        );
        const ranges = updates.map((chart) => {
            const basic = chart.spec.basicChart;
            const updatedDomain = required(basic.domains[0]);
            const series = required(basic.series[0]);
            return {
                chartId: chart.chartId,
                domain: required(updatedDomain.domain.sourceRange.sources[0]),
                italic: chart.spec.titleTextFormat?.italic,
                series: required(series.series.sourceRange.sources[0]),
            };
        });

        expect(ranges).toStrictEqual([
            {
                chartId: 2000,
                domain: {
                    endColumnIndex: 28,
                    endRowIndex: 31,
                    sheetId: 4,
                    startColumnIndex: 27,
                    startRowIndex: 0,
                },
                italic: true,
                series: {
                    endColumnIndex: 29,
                    endRowIndex: 31,
                    sheetId: 4,
                    startColumnIndex: 28,
                    startRowIndex: 0,
                },
            },
            {
                chartId: 2001,
                domain: {
                    endColumnIndex: 30,
                    endRowIndex: 31,
                    sheetId: 4,
                    startColumnIndex: 29,
                    startRowIndex: 0,
                },
                italic: true,
                series: {
                    endColumnIndex: 29,
                    endRowIndex: 31,
                    sheetId: 4,
                    startColumnIndex: 28,
                    startRowIndex: 0,
                },
            },
            {
                chartId: 2002,
                domain: {
                    endColumnIndex: 10,
                    endRowIndex: 5000,
                    sheetId: 100,
                    startColumnIndex: 9,
                },
                italic: true,
                series: {
                    endColumnIndex: 10,
                    endRowIndex: 5000,
                    sheetId: 100,
                    startColumnIndex: 9,
                },
            },
            {
                chartId: 2003,
                domain: {
                    endColumnIndex: 10,
                    endRowIndex: 31,
                    sheetId: 100,
                    startColumnIndex: 9,
                },
                italic: true,
                series: {
                    endColumnIndex: 10,
                    endRowIndex: 31,
                    sheetId: 100,
                    startColumnIndex: 9,
                },
            },
            {
                chartId: 2004,
                domain: {
                    endColumnIndex: 10,
                    endRowIndex: 336,
                    sheetId: 100,
                    startColumnIndex: 9,
                },
                italic: true,
                series: {
                    endColumnIndex: 31,
                    endRowIndex: 31,
                    sheetId: 1,
                    startColumnIndex: 30,
                    startRowIndex: 0,
                },
            },
        ]);
        expect(input).toStrictEqual(original);
    });

    it("validates a native snapshot without stripping unrelated chart formatting", () => {
        expect.hasAssertions();

        const input = fixture();
        const serialized = JSON.stringify(input);
        const parsed = parseWorkbookSnapshot(JSON.parse(serialized));

        expect(parsed).toStrictEqual(input);
        expect(buildWorkbookAuditRequests(parsed)).toStrictEqual(
            buildWorkbookAuditRequests(input)
        );
    });

    it.each([
        ["outer envelope", null],
        [
            "sheet metadata",
            { cells: [], metadata: { sheets: [{ properties: null }] } },
        ],
        [
            "cell coordinates",
            {
                cells: [
                    {
                        column: "A",
                        row: 0,
                        sheet: "Baselines",
                        value: { stringValue: "Plant ID" },
                    },
                ],
                metadata: { sheets: [] },
            },
        ],
        [
            "entered formula",
            {
                cells: [
                    {
                        column: 0,
                        row: 0,
                        sheet: "Baselines",
                        value: { formulaValue: 42 },
                    },
                ],
                metadata: { sheets: [] },
            },
        ],
    ])("rejects malformed %s at the JSON boundary", (_name, input) => {
        expect.hasAssertions();
        expect(() => parseWorkbookSnapshot(input)).toThrow(/workbook/v);
    });

    it("rejects malformed nested chart ranges before constructing a batch", () => {
        expect.hasAssertions();

        const input = fixture();
        const plant = required(
            input.metadata.sheets.find(
                (sheet) => sheet.properties.title === "P01 Plant"
            )
        );
        const chart = required(plant.charts?.[0]);
        const domain = required(chart.spec.basicChart.domains[0]);
        const source = required(domain.domain.sourceRange.sources[0]);
        Reflect.set(source, "endRowIndex", "1000");

        expect(() => parseWorkbookSnapshot(input)).toThrow(
            "Invalid workbook field: endRowIndex"
        );
    });

    it("restores every plant chart without moving charts or writing canonical history", () => {
        expect.hasAssertions();

        const input = fixture();
        const original = structuredClone(input);
        const requests = buildWorkbookAuditRequests(input);
        const charts = requests
            .map((request) => request.updateChartSpec)
            .filter((chart) => chart !== undefined);

        expect(charts).toHaveLength(90);

        const dimensions = charts.filter((chart) =>
            chart.spec.title.startsWith("Plant dimensions")
        );

        expect(dimensions).toHaveLength(30);

        for (const chart of dimensions) {
            expect(chart.spec.basicChart.series).toHaveLength(2);
            expect(
                required(
                    required(chart.spec.basicChart.domains[0]).domain
                        .sourceRange.sources[0]
                ).startColumnIndex
            ).toBe(18);
            expect(chart.spec.subtitle).toContain("Measured dimensions only");
            expect(required(chart.spec.titleTextFormat).italic).toBe(true);
            expect(chart.spec.hiddenDimensionStrategy).toBe("SHOW_ALL");
        }

        expect(
            requests.some((request) => request.updateEmbeddedObjectPosition)
        ).toBe(false);
        expect(
            requests.some((request) => request.updateCells?.start.sheetId === 6)
        ).toBe(false);
        expect(requests.some((request) => request.setDataValidation)).toBe(
            false
        );
        expect(input).toStrictEqual(original);
    });

    it("covers P29/P30 follow-ups, uses real readiness, and excludes benign alerts", () => {
        expect.hasAssertions();

        const requests = buildWorkbookAuditRequests(fixture());
        const writes = requests
            .map((request) => request.updateCells)
            .filter((write) => write !== undefined);
        const summary = writes.find(
            (write) => write.start.sheetId === 0 && write.start.rowIndex === 2
        );

        const summaryRow = required(required(summary).rows[0]);
        const summaryFormula = required(summaryRow.values[0]).userEnteredValue
            .formulaValue;

        expect(summaryFormula).toContain('"Current cycle supported"');

        const warnings = writes.find(
            (write) => write.start.sheetId === 5 && write.start.rowIndex === 15
        );

        const warningsRow = required(required(warnings).rows[0]);
        const warningsFormula = required(warningsRow.values[0]).userEnteredValue
            .formulaValue;

        expect(warningsFormula).toContain('"<>No current-cycle alert"');
        expect(warningsFormula).toContain("$J$31");

        const p30FollowUp = required(
            writes.find(
                (write) =>
                    write.start.sheetId === 5 &&
                    write.start.rowIndex === 52 &&
                    write.start.columnIndex === 0
            )
        );

        expect(
            required(required(p30FollowUp.rows[0]).values[0]).userEnteredValue
        ).toStrictEqual({
            formulaValue: "=Baselines!A31",
        });

        const helper = writes.find((write) => write.start.sheetId === 7);

        const helperRow = required(required(helper).rows[0]);
        const helperFormula = required(helperRow.values[0]).userEnteredValue
            .formulaValue;

        expect(helperFormula).toContain('History!AJ2:AJ5000<>"Removed"');
    });

    /**
     * @type {{
     *     name: string;
     *     change: (
     *         input: import("../workbook-fixtures.d.ts").WorkbookSnapshot
     *     ) => void;
     *     message: string;
     * }[]}
     */
    const changedSnapshots = [
        {
            change: (input) => {
                required(input.cells[0]).value.stringValue = "Owner notes";
            },
            message: "Unexpected workbook headers",
            name: "header",
        },
        {
            change: (input) => {
                required(input.cells[2]).value.stringValue = "P02";
            },
            message: "Baselines order changed; reread and review",
            name: "order",
        },
        {
            change: (input) => {
                input.metadata.sheets.pop();
            },
            message: "Expected the reviewed P01–P30 inventory",
            name: "missing",
        },
        {
            change: (input) => {
                required(
                    input.metadata.sheets.at(-1)
                ).properties.gridProperties.columnCount = 22;
            },
            message: "Review existing helper columns before migration",
            name: "plant helper",
        },
        {
            change: (input) => {
                required(
                    input.metadata.sheets[4]
                ).properties.gridProperties.columnCount = 30;
            },
            message: "Review existing Insights helper columns",
            name: "insights helper",
        },
        {
            change: (input) => {
                required(required(input.metadata.sheets.at(-1)).charts).pop();
            },
            message: "Unexpected chart inventory",
            name: "chart",
        },
        {
            change: (input) => {
                input.cells.push({
                    column: 15,
                    row: 29,
                    sheet: "Insights data",
                    value: { stringValue: "Owner evidence" },
                });
            },
            message: "New plant helper destination is not blank",
            name: "occupied",
        },
    ];

    it.each(changedSnapshots)(
        "aborts without a batch when the reviewed source changed: $name",
        ({ change, message }) => {
            expect.hasAssertions();

            const input = fixture();
            change(input);

            expect(() => buildWorkbookAuditRequests(input)).toThrow(message);
        }
    );
});
