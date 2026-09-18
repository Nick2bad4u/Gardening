import { describe, expect, it } from "vitest";

import { plantColor } from "../../scripts/google-sheets/plant-chart-colors.mjs";
import {
    assertPlantChartLayoutPreconditions,
    buildPlantChartLayoutRequests,
} from "../../scripts/google-sheets/plant-chart-layout.mjs";
import { wateringIntervalSheetId } from "../../scripts/google-sheets/watering-intervals.mjs";
import { required } from "../helpers/required.mjs";

const definitions = [
    {
        domain: 18,
        series: [19],
        title: "Weight history • calendar time",
        type: "LINE",
    },
    {
        domain: 16,
        series: [17],
        title: "Weight trend after latest Water / Repot anchor",
        type: "SCATTER",
    },
    {
        domain: 18,
        series: [20, 21],
        title: "Plant dimensions • measurement history",
        type: "LINE",
    },
    { domain: 1, series: [2], title: "Time between waterings", type: "COLUMN" },
];

/**
 * Simulate only the builder's intended final geometry and chart updates.
 *
 * @param {ReturnType<typeof fixture>} before
 * @param {ReturnType<typeof buildPlantChartLayoutRequests>} plan
 */
function finalSnapshot(before, plan) {
    const result = structuredClone(before);
    for (const sheet of result.metadata.sheets)
        sheet.charts = plan.expectedCharts.filter(
            (chart) =>
                chart.position.overlayPosition.anchorCell.sheetId ===
                sheet.properties.sheetId
        );
    for (const dimensions of result.rowDimensions) {
        for (let row = 53; row < 138; row++)
            required(dimensions.rows[row]).pixelSize = row === 108 ? 36 : 30;
    }
    return result;
}

/** Synthetic data only; no live chart IDs or observations. */
function fixture() {
    /** @type {import("../../types/plant-chart-layout.js").PlantLayoutSnapshot} */
    const snapshot = {
        columnDimensions: [],
        metadata: { sheets: [] },
        rowDimensions: [],
        weightMinimums: [],
    };
    for (let index = 0; index < 30; index++) {
        const sheetId = index + 1;
        const id = `P${String(sheetId).padStart(2, "0")}`;
        const charts = definitions.map((role, roleIndex) => {
            const isInterval = role.type === "COLUMN";
            const range = (/** @type {number} */ column) => ({
                sourceRange: {
                    sources: [
                        {
                            endColumnIndex:
                                column + (isInterval ? index * 3 : 0) + 1,
                            endRowIndex: isInterval ? 5000 : 1000,
                            sheetId: isInterval
                                ? wateringIntervalSheetId
                                : sheetId,
                            startColumnIndex:
                                column + (isInterval ? index * 3 : 0),
                            startRowIndex: isInterval ? 0 : 11,
                        },
                    ],
                },
            });
            return {
                border:
                    roleIndex === 0 && index === 0
                        ? { colorStyle: { themeColor: "TEXT" } }
                        : {},
                chartId: sheetId * 10 + roleIndex,
                position: {
                    overlayPosition: {
                        anchorCell: { rowIndex: 54 + roleIndex * 18, sheetId },
                        heightPixels: 560,
                        widthPixels: 952,
                    },
                },
                spec: {
                    altText: `${id} accessible description`,
                    basicChart: {
                        axis: [
                            {
                                format: { fontFamily: "Roboto" },
                                position: "BOTTOM_AXIS",
                                title: isInterval ? "Watering date" : "Date",
                                viewWindowOptions: {},
                            },
                            {
                                position: "LEFT_AXIS",
                                viewWindowOptions: {
                                    viewWindowMax: 900 + index,
                                    viewWindowMin: index === 0 ? 250 : 10,
                                },
                            },
                        ],
                        chartType: role.type,
                        domains: [{ domain: range(role.domain) }],
                        headerCount: 1,
                        legendPosition: isInterval
                            ? "NO_LEGEND"
                            : "BOTTOM_LEGEND",
                        series: role.series.map((column) => ({
                            colorStyle: { rgbColor: plantColor(id) },
                            dataLabel: {
                                textFormat: {
                                    fontFamily: "Roboto",
                                    fontSize: 9,
                                },
                                type: "DATA",
                            },
                            lineStyle: { type: "CUSTOM" },
                            series: range(column),
                            targetAxis: "LEFT_AXIS",
                        })),
                    },
                    fontName: "Roboto",
                    subtitle: `${id} historical evidence`,
                    title: role.title,
                    titleTextFormat: { bold: true, fontSize: 18, italic: true },
                },
            };
        });
        if (index >= 27) {
            const sparse = required(charts[3]);
            // Google omits empty interval series and its value axis.
            Reflect.deleteProperty(sparse.spec.basicChart, "series");
            sparse.spec.basicChart.axis.splice(1);
        }
        snapshot.metadata.sheets.push({
            charts,
            properties: {
                gridProperties: { columnCount: 22, rowCount: 5139 },
                sheetId,
                title: `${id} Synthetic plant`,
            },
        });
        snapshot.rowDimensions.push({
            rows: Array.from({ length: 145 }, (_, row) => ({
                pixelSize: index === 0 ? 21 : row % 2 === 0 ? 28 : 40,
            })),
            sheetId,
        });
        snapshot.columnDimensions.push({
            columns: [
                150,
                115,
                120,
                105,
                105,
                105,
                105,
                180,
                300,
                190,
            ].map((pixelSize, index) => ({
                hiddenByUser: index === 9,
                pixelSize,
            })),
            sheetId,
        });
        snapshot.weightMinimums.push({ minimum: 301, sheetId });
    }
    return snapshot;
}

describe("native plant chart template and spacing", () => {
    it("fits the visible page edge and lowers the preferred floor for lighter recorded pots", () => {
        expect.hasAssertions();

        const before = fixture();
        required(before.weightMinimums[0]).minimum = 249;
        required(before.weightMinimums[1]).minimum = 20;
        required(before.weightMinimums[2]).minimum = null;
        required(required(before.columnDimensions[0]).columns[9]).hiddenByUser =
            false;
        const plan = buildPlantChartLayoutRequests(before);
        for (const [
            sheetId,
            floor,
            width,
        ] of [
            [
                1,
                200,
                1475,
            ],
            [
                2,
                0,
                1285,
            ],
            [
                3,
                250,
                1285,
            ],
        ]) {
            const charts = plan.expectedCharts.filter(
                (chart) =>
                    chart.position.overlayPosition.anchorCell.sheetId ===
                    sheetId
            );

            expect(
                charts.every(
                    (chart) =>
                        chart.position.overlayPosition.widthPixels === width
                )
            ).toBe(true);
            expect(
                charts
                    .filter((chart) => chart.spec.title.startsWith("Weight "))
                    .map(
                        (chart) =>
                            chart.spec.basicChart.axis.find(
                                (axis) => axis.position === "LEFT_AXIS"
                            )?.viewWindowOptions?.["viewWindowMin"]
                    )
            ).toStrictEqual([floor, floor]);
        }
    });

    it("rejects invalid column geometry and invalid weight evidence", () => {
        expect.hasAssertions();

        const before = fixture();
        required(required(before.columnDimensions[0]).columns[0]).pixelSize =
            NaN;

        expect(() => buildPlantChartLayoutRequests(before)).toThrow(/columns/v);

        required(required(before.columnDimensions[0]).columns[0]).pixelSize =
            150;
        required(before.weightMinimums[0]).minimum = 0;

        expect(() => buildPlantChartLayoutRequests(before)).toThrow(
            /weight minimum/v
        );
    });

    it("preserves all 30 identities, live bindings, text, other axis limits and sparse omissions", () => {
        expect.hasAssertions();

        const before = fixture();
        const original = structuredClone(before);
        const plan = buildPlantChartLayoutRequests(before);

        expect(before).toStrictEqual(original);
        expect(plan.expectedCharts).toHaveLength(120);
        expect(plan.sparseChartIds).toStrictEqual([
            283,
            293,
            303,
        ]);

        for (const page of before.metadata.sheets) {
            const id = page.properties.title.slice(0, 3);
            for (const chart of required(page.charts)) {
                const actual = required(
                    plan.expectedCharts.find(
                        (item) => item.chartId === chart.chartId
                    )
                );

                expect([
                    actual.spec.title,
                    actual.spec.subtitle,
                    actual.spec.altText,
                    actual.spec.basicChart.domains,
                ]).toStrictEqual([
                    chart.spec.title,
                    chart.spec.subtitle,
                    chart.spec.altText,
                    chart.spec.basicChart.domains,
                ]);
                expect(
                    actual.spec.basicChart.series?.map(
                        (series) => series.series
                    )
                ).toStrictEqual(
                    chart.spec.basicChart.series?.map((series) => series.series)
                );
                expect(
                    actual.spec.basicChart.series?.map(
                        (series) => series.colorStyle
                    )
                ).toStrictEqual(
                    chart.spec.basicChart.series?.map(() => ({
                        rgbColor: plantColor(id),
                    }))
                );

                const left = actual.spec.basicChart.axis.find(
                    (axis) => axis.position === "LEFT_AXIS"
                );
                const oldLeft = chart.spec.basicChart.axis.find(
                    (axis) => axis.position === "LEFT_AXIS"
                );

                expect(left?.viewWindowOptions).toStrictEqual(
                    oldLeft === undefined
                        ? undefined
                        : {
                              ...oldLeft.viewWindowOptions,
                              ...(chart.spec.title.startsWith("Weight ") && {
                                  viewWindowMin: 250,
                                  viewWindowMode: "EXPLICIT",
                              }),
                              ...(chart.spec.basicChart.chartType ===
                                  "COLUMN" && { viewWindowMin: 0 }),
                          }
                );
                expect(actual.border).toStrictEqual({
                    colorStyle: { themeColor: "TEXT" },
                });
                expect(JSON.stringify(actual.spec)).not.toContain("Roboto");
                expect(actual.spec.titleTextFormat).toMatchObject({
                    bold: true,
                    fontSize: 18,
                    italic: true,
                });
                expect(actual.spec.subtitleTextFormat).toMatchObject({
                    bold: true,
                    fontSize: 12,
                    italic: true,
                });
            }
        }
    });

    it("leaves clear pixel gaps between charts, the watering status and history despite unequal old heights", () => {
        expect.hasAssertions();

        const before = fixture();
        const plan = buildPlantChartLayoutRequests(before);
        const after = finalSnapshot(before, plan);
        for (const page of after.metadata.sheets) {
            const rows = required(
                after.rowDimensions.find(
                    (item) => item.sheetId === page.properties.sheetId
                )
            ).rows;
            const y = (/** @type {number} */ row) =>
                rows
                    .slice(0, row)
                    .reduce(
                        (sum, dimension) => sum + required(dimension.pixelSize),
                        0
                    );
            const charts = required(page.charts);
            const bounds = charts.map((chart) => ({
                height: chart.position.overlayPosition.heightPixels,
                top:
                    y(
                        required(
                            chart.position.overlayPosition.anchorCell.rowIndex
                        )
                    ) + 7,
            }));
            const gap = (/** @type {number} */ index) =>
                required(bounds[index + 1]).top -
                required(bounds[index]).top -
                required(bounds[index]).height;

            expect([
                gap(0),
                gap(1),
                gap(2),
            ]).toStrictEqual([
                49,
                56,
                107,
            ]);
            expect(
                y(108) - required(bounds[2]).top - required(bounds[2]).height
            ).toBe(34);
            expect(required(bounds[3]).top - y(109)).toBe(37);
            expect(
                y(138) - required(bounds[3]).top - required(bounds[3]).height
            ).toBe(393);
            expect(
                charts.map(
                    (chart) => chart.position.overlayPosition.widthPixels
                )
            ).toStrictEqual([
                1285,
                1285,
                1285,
                1285,
            ]);
            expect(rows.slice(138)).toStrictEqual(
                required(
                    before.rowDimensions.find(
                        (item) => item.sheetId === page.properties.sheetId
                    )
                ).rows.slice(138)
            );
        }

        expect(
            plan.requests.every((request) =>
                [
                    "updateChartSpec",
                    "updateDimensionProperties",
                    "updateEmbeddedObjectBorder",
                    "updateEmbeddedObjectPosition",
                ].includes(required(Object.keys(request)[0]))
            )
        ).toBe(true);
    });

    it("is idempotent and ignores non-chart volatile effective values", () => {
        expect.hasAssertions();

        const before = fixture();
        const plan = buildPlantChartLayoutRequests(before);

        expect(
            buildPlantChartLayoutRequests(finalSnapshot(before, plan)).requests
        ).toStrictEqual([]);

        Reflect.set(before, "effectiveCells", [{ error: "Recalculating" }]);

        expect(() => {
            assertPlantChartLayoutPreconditions(before, plan.preconditions);
        }).not.toThrow();
    });

    it("uses relative overlay masks and treats native redundant colors and omitted zero coordinates as unchanged", () => {
        expect.hasAssertions();

        const before = fixture();
        const plan = buildPlantChartLayoutRequests(before);
        const positionRequests = plan.requests.filter(
            (request) => request["updateEmbeddedObjectPosition"] !== undefined
        );

        expect(positionRequests).toHaveLength(120);

        for (const request of positionRequests)
            expect(request).toMatchObject({
                updateEmbeddedObjectPosition: {
                    fields: "anchorCell,offsetXPixels,offsetYPixels,widthPixels,heightPixels",
                },
            });

        const native = finalSnapshot(before, plan);
        const charts = native.metadata.sheets.flatMap((page) =>
            required(page.charts)
        );
        for (const chart of charts) {
            delete chart.position.overlayPosition.anchorCell.columnIndex;
            delete chart.position.overlayPosition.offsetXPixels;
            const seriesList = chart.spec.basicChart.series ?? [];
            for (const series of seriesList) {
                series.color = required(series.colorStyle).rgbColor;
            }
            required(chart.border).color = {};
        }

        expect(buildPlantChartLayoutRequests(native).requests).toStrictEqual(
            []
        );
    });

    it("accepts native float32 palette serialization but still repairs an actual changed color", () => {
        expect.hasAssertions();

        const before = fixture();
        const plan = buildPlantChartLayoutRequests(before);
        const native = finalSnapshot(before, plan);
        const charts = native.metadata.sheets.flatMap((page) =>
            required(page.charts)
        );
        for (const chart of charts) {
            const seriesList = chart.spec.basicChart.series ?? [];
            for (const series of seriesList) {
                const color = required(series.colorStyle).rgbColor;
                for (const component of /** @type {const} */ ([
                    "red",
                    "green",
                    "blue",
                ]))
                    color[component] = Number(
                        Math.fround(color[component]).toPrecision(9)
                    );
            }
        }

        expect(buildPlantChartLayoutRequests(native).requests).toStrictEqual(
            []
        );

        const changed = required(
            required(native.metadata.sheets[1]).charts?.[0]
        );
        required(
            required(changed.spec.basicChart.series?.[0]).colorStyle
        ).rgbColor.red += 0.01;

        expect(buildPlantChartLayoutRequests(native).requests).toMatchObject([
            { updateChartSpec: { chartId: changed.chartId } },
        ]);
    });

    it("hides cramped labels on both weight charts while retaining other roles' labels and point styles", () => {
        expect.hasAssertions();

        const before = fixture();
        const source = required(
            required(before.metadata.sheets[0]).charts?.[0]
        );
        required(source.spec.basicChart.series?.[0]).pointStyle = {
            shape: "CIRCLE",
            size: 5,
        };
        const plan = buildPlantChartLayoutRequests(before);
        const fullHistory = plan.expectedCharts.filter(
            (chart) => chart.spec.title === "Weight history • calendar time"
        );
        for (const chart of fullHistory)
            expect(chart.spec.basicChart.series).toMatchObject([
                {
                    dataLabel: { type: "NONE" },
                    lineStyle: { type: "SOLID", width: 2 },
                    pointStyle: { shape: "CIRCLE", size: 5 },
                },
            ]);
        const weightCharts = plan.expectedCharts.filter((chart) =>
            chart.spec.title.startsWith("Weight ")
        );

        expect(weightCharts).toHaveLength(60);
        expect(
            weightCharts.every(
                (chart) =>
                    chart.spec.basicChart.series?.every(
                        (series) => series.dataLabel?.type === "NONE"
                    ) === true
            )
        ).toBe(true);

        const otherSeries = plan.expectedCharts
            .filter((chart) => !chart.spec.title.startsWith("Weight "))
            .flatMap((chart) => chart.spec.basicChart.series ?? []);

        expect(
            otherSeries.every((series) => series.dataLabel?.type === "DATA")
        ).toBe(true);

        const native = finalSnapshot(before, plan);
        delete required(
            required(required(native.metadata.sheets[0]).charts?.[0]).spec
                .basicChart.series?.[0]
        ).dataLabel;

        expect(buildPlantChartLayoutRequests(native).requests).toStrictEqual(
            []
        );
    });

    it.each([
        "spec",
        "position",
        "border",
        "row",
        "column",
        "weight",
    ])("rejects intervening %s edits before writing", (field) => {
        expect.hasAssertions();

        const before = fixture();
        const plan = buildPlantChartLayoutRequests(before);
        mutateFixture(before, field);

        expect(() => {
            assertPlantChartLayoutPreconditions(before, plan.preconditions);
        }).toThrow(/changed/v);
    });

    it.each([
        "hidden",
        "missing",
        "duplicate",
        "binding",
        "type",
        "series",
        "custom-label",
    ])("rejects unsafe %s input", (field) => {
        expect.hasAssertions();

        const before = fixture();
        mutateFixture(before, field);

        expect(() => buildPlantChartLayoutRequests(before)).toThrow(
            /Expected|Hidden|Review|Unexpected/v
        );
    });
});

/** @param {ReturnType<typeof fixture>} before @param {string} field */
function mutateFixture(before, field) {
    const page = required(before.metadata.sheets[0]);
    const chart = required(page.charts?.[0]);
    const series = required(chart.spec.basicChart.series?.[0]);
    switch (field) {
        case "binding": {
            required(series.series.sourceRange.sources[0]).sheetId = 999;
            break;
        }
        case "border": {
            chart.border = {};
            break;
        }
        case "column": {
            required(
                required(before.columnDimensions[0]).columns[0]
            ).pixelSize = 175;
            break;
        }
        case "custom-label": {
            series.dataLabel = { customLabelData: series.series };
            break;
        }
        case "duplicate": {
            required(page.charts).push(chart);
            break;
        }
        case "hidden": {
            required(required(before.rowDimensions[0]).rows[90]).hiddenByUser =
                true;
            break;
        }
        case "missing": {
            before.metadata.sheets.pop();
            break;
        }
        case "position": {
            chart.position.overlayPosition.offsetYPixels = 99;
            break;
        }
        case "row": {
            required(required(before.rowDimensions[0]).rows[90]).pixelSize = 99;
            break;
        }
        case "series": {
            chart.spec.basicChart.series = [];
            break;
        }
        case "spec": {
            chart.spec.subtitle = "Owner edit";
            break;
        }
        case "type": {
            chart.spec.basicChart.chartType = "BAR";
            break;
        }
        case "weight": {
            required(before.weightMinimums[0]).minimum = 200;
            break;
        }
        default: {
            throw new Error(`Unknown test mutation: ${field}`);
        }
    }
}
