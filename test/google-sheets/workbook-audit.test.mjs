import { describe, expect, it } from "vitest";
import { buildWorkbookAuditRequests } from "../../scripts/google-sheets/workbook-audit.mjs";

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
    const sheets = names.map((title, sheetId) => ({
        properties: {
            title,
            sheetId,
            gridProperties: {
                rowCount: 1000,
                columnCount: title === "Insights data" ? 25 : 36,
            },
        },
        charts: [],
        conditionalFormats: [],
    }));
    const cells = [
        {
            sheet: "Baselines",
            row: 0,
            column: 0,
            value: { stringValue: "Plant ID" },
        },
        {
            sheet: "Dashboard",
            row: 5,
            column: 1,
            value: { stringValue: "Plant ID" },
        },
    ];
    for (let i = 0; i < 30; i++) {
        const id = `P${String(i + 1).padStart(2, "0")}`;
        cells.push({
            sheet: "Baselines",
            row: i + 1,
            column: 0,
            value: { stringValue: id },
        });
        const sheetId = 100 + i;
        sheets.push({
            properties: {
                title: `${id} Plant`,
                sheetId,
                gridProperties: { rowCount: 1000, columnCount: 18 },
            },
            charts: [
                "Plant dimensions • measurement history",
                "Weight history • calendar time",
                "Weight trend after latest Water / Repot anchor",
            ].map((title, index) => ({
                chartId: sheetId * 10 + index,
                position: {
                    overlayPosition: {
                        anchorCell: { rowIndex: 2, columnIndex: 12 },
                    },
                },
                spec: {
                    title,
                    titleTextFormat: { italic: true },
                    basicChart: {
                        axis: [{ position: "BOTTOM_AXIS" }],
                        domains: [
                            {
                                domain: {
                                    sourceRange: {
                                        sources: [
                                            {
                                                sheetId,
                                                startColumnIndex: 9,
                                                endColumnIndex: 10,
                                                endRowIndex: 336,
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        series: [],
                    },
                },
            })),
        });
    }
    for (const column of [
        15,
        16,
        17,
        19,
    ])
        cells.push({
            sheet: "Insights data",
            row: 28,
            column,
            value: { formulaValue: "='Plant tracker'!A29" },
        });
    return { metadata: { sheets }, cells };
}

describe("one-time native workbook audit repair", () => {
    it("restores every plant chart without moving charts or writing canonical history", () => {
        const input = fixture();
        const original = structuredClone(input);
        const requests = buildWorkbookAuditRequests(input);
        const charts = requests
            .filter((request) => request.updateChartSpec)
            .map((request) => request.updateChartSpec);
        expect(charts).toHaveLength(90);
        const dimensions = charts.filter((chart) =>
            chart.spec.title.startsWith("Plant dimensions")
        );
        expect(dimensions).toHaveLength(30);
        for (const chart of dimensions) {
            expect(chart.spec.basicChart.series).toHaveLength(2);
            expect(
                chart.spec.basicChart.domains[0].domain.sourceRange.sources[0]
                    .startColumnIndex
            ).toBe(18);
            expect(chart.spec.subtitle).toContain("Measured dimensions only");
            expect(chart.spec.titleTextFormat.italic).toBe(true);
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
        expect(input).toEqual(original);
    });

    it("covers P29/P30 follow-ups, uses real readiness, and excludes benign alerts", () => {
        const requests = buildWorkbookAuditRequests(fixture());
        const writes = requests
            .filter((request) => request.updateCells)
            .map((request) => request.updateCells);
        const summary = writes.find(
            (write) => write.start.sheetId === 0 && write.start.rowIndex === 2
        );
        expect(
            summary.rows[0].values[0].userEnteredValue.formulaValue
        ).toContain('"Current cycle supported"');
        const warnings = writes.find(
            (write) => write.start.sheetId === 5 && write.start.rowIndex === 15
        );
        expect(
            warnings.rows[0].values[0].userEnteredValue.formulaValue
        ).toContain('"<>No current-cycle alert"');
        expect(
            warnings.rows[0].values[0].userEnteredValue.formulaValue
        ).toContain("$J$31");
        expect(
            writes.find(
                (write) =>
                    write.start.sheetId === 5 &&
                    write.start.rowIndex === 52 &&
                    write.start.columnIndex === 0
            )
        ).toBeDefined();
        const helper = writes.find((write) => write.start.sheetId === 7);
        expect(
            helper.rows[0].values[0].userEnteredValue.formulaValue
        ).toContain('History!AJ2:AJ5000<>"Removed"');
    });

    it.each([
        "header",
        "order",
        "missing",
        "plant helper",
        "insights helper",
        "chart",
        "occupied",
    ])(
        "aborts without a batch when the reviewed source changed: %s",
        (change) => {
            const input = fixture();
            if (change === "header")
                input.cells[0].value.stringValue = "Owner notes";
            if (change === "order") input.cells[2].value.stringValue = "P02";
            if (change === "missing") input.metadata.sheets.pop();
            if (change === "plant helper")
                input.metadata.sheets.at(
                    -1
                ).properties.gridProperties.columnCount = 22;
            if (change === "insights helper")
                input.metadata.sheets[4].properties.gridProperties.columnCount = 30;
            if (change === "chart") input.metadata.sheets.at(-1).charts.pop();
            if (change === "occupied")
                input.cells.push({
                    sheet: "Insights data",
                    row: 29,
                    column: 15,
                    value: { stringValue: "Owner evidence" },
                });
            expect(() => buildWorkbookAuditRequests(input)).toThrow();
        }
    );
});
