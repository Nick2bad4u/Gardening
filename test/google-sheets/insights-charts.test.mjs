import { describe, expect, it } from "vitest";

import { buildInsightsRequests } from "../../scripts/google-sheets/insights-charts.mjs";
import { parseWorkbookSnapshot } from "../../scripts/google-sheets/workbook-audit.mjs";
import original from "../fixtures/insights-workbook.json" with { type: "json" };
import { required } from "../helpers/required.mjs";

function fixture() {
    return parseWorkbookSnapshot(structuredClone(original));
}

describe("native Insights migration", () => {
    it("writes only derived helpers and an appended explorer", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const requests = buildInsightsRequests(snapshot);
        const writes = requests.flatMap((request) => {
            const entry =
                /** @type {import("../workbook-fixtures.d.ts").WorkbookRequest} */ (
                    request
                ).updateCells;
            return entry === undefined ? [] : [entry];
        });

        expect(snapshot).toStrictEqual(before);
        expect(
            new Set(writes.map((write) => write.start.sheetId))
        ).toStrictEqual(new Set([203_040_506, 907_202_601]));

        const visibleWrites = writes.filter(
            (write) => write.start.sheetId === 203_040_506
        );

        expect(visibleWrites.length).toBeGreaterThan(0);
        expect(
            visibleWrites.every((write) => write.start.rowIndex >= 239)
        ).toBe(true);
        expect(
            requests.some(
                (request) =>
                    "deleteSheet" in request ||
                    "deleteDimension" in request ||
                    "deleteEmbeddedObject" in request
            )
        ).toBe(false);
    });

    it("adds eleven charts and repairs the existing rate chart in place", () => {
        expect.hasAssertions();

        const requests = buildInsightsRequests(fixture());
        const charts = requests.filter((request) => "addChart" in request);

        expect(charts).toHaveLength(11);

        for (const request of charts) {
            expect(request).toMatchObject({
                addChart: {
                    chart: {
                        spec: {
                            basicChart: {
                                headerCount: 1,
                                interpolateNulls: false,
                            },
                            hiddenDimensionStrategy: "SHOW_ALL",
                        },
                    },
                },
            });
        }
        const repairs = requests.filter(
            (request) => "updateChartSpec" in request
        );

        expect(repairs).toHaveLength(1);
        expect(repairs[0]).toMatchObject({
            updateChartSpec: {
                chartId: 88_491_986,
                spec: {
                    basicChart: {
                        series: [
                            {
                                series: {
                                    sourceRange: {
                                        sources: [
                                            {
                                                endColumnIndex: 31,
                                                endRowIndex: 31,
                                                sheetId: 1_087_321_540,
                                                startColumnIndex: 30,
                                                startRowIndex: 0,
                                            },
                                        ],
                                    },
                                },
                                targetAxis: "BOTTOM_AXIS",
                            },
                        ],
                    },
                    title: "Modeled drying rate by plant",
                },
            },
        });
    });

    it.each([
        "Insights",
        "Baselines",
        "History",
        "Dry-down models",
    ])("rejects a missing %s source", (title) => {
        expect.hasAssertions();

        const snapshot = fixture();
        snapshot.metadata.sheets = snapshot.metadata.sheets.filter(
            (sheet) => sheet.properties.title !== title
        );

        expect(() => buildInsightsRequests(snapshot)).toThrow(/Missing sheet/v);
    });

    it("rejects changed source headers and collection IDs", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        snapshot.cells = snapshot.cells.filter(
            (cell) =>
                cell.sheet !== "History" || cell.row !== 0 || cell.column !== 35
        );

        expect(() => buildInsightsRequests(snapshot)).toThrow(
            "Source header changed"
        );

        const changedRoster = fixture();
        changedRoster.cells = changedRoster.cells.filter(
            (cell) =>
                cell.sheet !== "Baselines" ||
                cell.row !== 30 ||
                cell.column !== 0
        );

        expect(() => buildInsightsRequests(changedRoster)).toThrow(
            "Collection roster changed at P30"
        );
    });

    it("rejects replay and a changed append position", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        snapshot.metadata.sheets.push({
            properties: {
                gridProperties: { columnCount: 31, rowCount: 5000 },
                sheetId: 1,
                title: "Dry-down insights",
            },
        });

        expect(() => buildInsightsRequests(snapshot)).toThrow("already exist");

        const changedLayout = fixture();
        const insights = required(
            changedLayout.metadata.sheets.find(
                (sheet) => sheet.properties.title === "Insights"
            )
        );
        insights.properties.gridProperties.rowCount = 500;

        expect(() => buildInsightsRequests(changedLayout)).toThrow(
            "layout changed"
        );
    });
});
