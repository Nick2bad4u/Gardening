import { describe, expect, it } from "vitest";

import { plantColor } from "../../scripts/google-sheets/plant-chart-colors.mjs";
import {
    buildWateringIntervalStyleRepairRequests,
    wateringIntervalSheetId,
    wateringIntervalTitle,
} from "../../scripts/google-sheets/watering-intervals.mjs";
import { required } from "../helpers/required.mjs";

function fixture() {
    return {
        cells: [],
        metadata: {
            sheets: [
                {
                    properties: {
                        gridProperties: { columnCount: 90, rowCount: 5000 },
                        sheetId: wateringIntervalSheetId,
                        title: "Watering intervals",
                    },
                },
                {
                    charts: [
                        {
                            chartId: 12_345,
                            position: {
                                overlayPosition: {
                                    anchorCell: {
                                        columnIndex: 0,
                                        rowIndex: 110,
                                    },
                                    heightPixels: 440,
                                    offsetYPixels: 7,
                                    widthPixels: 952,
                                },
                            },
                            spec: {
                                altText: "Preserve this description",
                                basicChart: {
                                    axis: [
                                        {
                                            format: {
                                                fontFamily: "JetBrains Mono",
                                            },
                                            position: "BOTTOM_AXIS",
                                            title: "Watering date",
                                            viewWindowOptions: {},
                                        },
                                        {
                                            format: {
                                                fontFamily: "JetBrains Mono",
                                            },
                                            position: "LEFT_AXIS",
                                            viewWindowOptions: {
                                                viewWindowMax: 30,
                                            },
                                        },
                                    ],
                                    chartType: "COLUMN",
                                    domains: [
                                        {
                                            domain: {
                                                sourceRange: {
                                                    sources: [
                                                        {
                                                            endColumnIndex: 71,
                                                            endRowIndex: 5000,
                                                            sheetId:
                                                                wateringIntervalSheetId,
                                                            startColumnIndex: 70,
                                                            startRowIndex: 0,
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                    headerCount: 1,
                                    legendPosition: "NO_LEGEND",
                                    series: /** @type {import("../workbook-fixtures.d.ts").ChartSeries[]} */ ([]),
                                },
                                fontName: "JetBrains Mono",
                                subtitle: "Original subtitle",
                                title: wateringIntervalTitle,
                                titleTextFormat: {
                                    bold: true,
                                    fontFamily: "JetBrains Mono",
                                    fontSize: 16,
                                    italic: false,
                                },
                            },
                        },
                    ],
                    properties: {
                        gridProperties: { columnCount: 22, rowCount: 1000 },
                        sheetId: 24,
                        title: "P24 Test plant",
                    },
                },
            ],
        },
    };
}
const options = { completedIntervalsByPlant: { P24: 1 } };

describe("watering interval style repair", () => {
    it("restores lost populated series and left-axis settings without moving or mutating charts", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const requests = buildWateringIntervalStyleRepairRequests(
            snapshot,
            ["P24"],
            options
        );

        expect(requests).toHaveLength(1);
        expect(requests).toMatchObject([
            {
                updateChartSpec: {
                    chartId: 12_345,
                    spec: {
                        altText: "Preserve this description",
                        basicChart: {
                            axis: [
                                {
                                    position: "BOTTOM_AXIS",
                                    title: "Watering date",
                                },
                                {
                                    position: "LEFT_AXIS",
                                    title: "Days since previous watering",
                                    viewWindowOptions: {
                                        viewWindowMax: 30,
                                        viewWindowMin: 0,
                                    },
                                },
                            ],
                            series: [
                                {
                                    colorStyle: { rgbColor: plantColor("P24") },
                                    dataLabel: {
                                        placement: "OUTSIDE_END",
                                        textFormat: {
                                            bold: true,
                                            fontFamily: "JetBrains Mono",
                                            fontSize: 12,
                                        },
                                        type: "DATA",
                                    },
                                    series: {
                                        sourceRange: {
                                            sources: [
                                                {
                                                    endColumnIndex: 72,
                                                    endRowIndex: 5000,
                                                    sheetId:
                                                        wateringIntervalSheetId,
                                                    startColumnIndex: 71,
                                                    startRowIndex: 0,
                                                },
                                            ],
                                        },
                                    },
                                    targetAxis: "LEFT_AXIS",
                                },
                            ],
                        },
                        fontName: "JetBrains Mono",
                        subtitle: "Original subtitle",
                        title: wateringIntervalTitle,
                        titleTextFormat: {
                            bold: true,
                            fontFamily: "JetBrains Mono",
                            fontSize: 16,
                        },
                    },
                },
            },
        ]);
        expect(snapshot).toStrictEqual(before);
        expect(Object.keys(required(requests[0]))).toStrictEqual([
            "updateChartSpec",
        ]);
    });

    it.each([
        0,
        -1,
        1.5,
        Infinity,
        NaN,
        undefined,
    ])("rejects unverified or empty interval count %s", (count) => {
        expect.hasAssertions();

        const counts = count === undefined ? {} : { P24: count };

        expect(() =>
            buildWateringIntervalStyleRepairRequests(fixture(), ["P24"], {
                completedIntervalsByPlant: counts,
            })
        ).toThrow("positive completed intervals");
    });

    it("rejects duplicate requests, duplicate pages/charts, and missing helper", () => {
        expect.hasAssertions();

        expect(() =>
            buildWateringIntervalStyleRepairRequests(
                fixture(),
                ["P24", "P24"],
                options
            )
        ).toThrow("repeat plants");

        const duplicatePage = fixture();
        duplicatePage.metadata.sheets.push(
            structuredClone(required(duplicatePage.metadata.sheets[1]))
        );

        expect(() =>
            buildWateringIntervalStyleRepairRequests(
                duplicatePage,
                ["P24"],
                options
            )
        ).toThrow("unique watering interval chart");

        const duplicateChart = fixture();
        const charts = required(duplicateChart.metadata.sheets[1]?.charts);
        charts.push(structuredClone(required(charts[0])));

        expect(() =>
            buildWateringIntervalStyleRepairRequests(
                duplicateChart,
                ["P24"],
                options
            )
        ).toThrow("unique watering interval chart");

        const absent = fixture();
        absent.metadata.sheets = absent.metadata.sheets.slice(1);

        expect(() =>
            buildWateringIntervalStyleRepairRequests(absent, ["P24"], options)
        ).toThrow("installed Watering intervals helper");
    });

    it("rejects foreign domain and series bindings before producing repair requests", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const basic = required(
            snapshot.metadata.sheets[1]?.charts?.[0]?.spec.basicChart
        );
        const domain = required(
            basic.domains[0]?.domain.sourceRange.sources[0]
        );
        domain.startColumnIndex = 73;

        expect(() =>
            buildWateringIntervalStyleRepairRequests(snapshot, ["P24"], options)
        ).toThrow("source bindings");
    });

    it("rejects a foreign interval series binding", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const basic = required(
            snapshot.metadata.sheets[1]?.charts?.[0]?.spec.basicChart
        );
        const domain = required(
            basic.domains[0]?.domain.sourceRange.sources[0]
        );
        basic.series.push({
            series: { sourceRange: { sources: [{ ...domain }] } },
        });

        expect(() =>
            buildWateringIntervalStyleRepairRequests(snapshot, ["P24"], options)
        ).toThrow("source bindings");
    });

    it("accepts an existing matching series while preserving unrelated native options", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const basic = required(
            snapshot.metadata.sheets[1]?.charts?.[0]?.spec.basicChart
        );
        basic.series.push({
            pointStyle: { size: 7 },
            series: {
                sourceRange: {
                    sources: [
                        {
                            endColumnIndex: 72,
                            endRowIndex: 5000,
                            sheetId: wateringIntervalSheetId,
                            startColumnIndex: 71,
                            startRowIndex: 0,
                        },
                    ],
                },
            },
        });
        const requests = buildWateringIntervalStyleRepairRequests(
            snapshot,
            ["P24"],
            options
        );

        expect(requests).toMatchObject([
            {
                updateChartSpec: {
                    spec: {
                        basicChart: { series: [{ pointStyle: { size: 7 } }] },
                    },
                },
            },
        ]);
    });
});
