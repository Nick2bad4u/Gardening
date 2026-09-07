import { describe, expect, it } from "vitest";

import {
    buildPlantColorKeyRequests,
    buildPlantInsightColorRequests,
    fixedPlantMetricFormula,
    plantColor,
    plantColorDataSheetId,
    plantColorSheetId,
    selectedPlantColorFormula,
} from "../../scripts/google-sheets/plant-chart-colors.mjs";
import palette from "../../scripts/google-sheets/plant-colors.json" with { type: "json" };
import original from "../fixtures/plant-color-charts.json" with { type: "json" };
import { required } from "../helpers/required.mjs";

/** @returns {import("../plant-chart-colors-fixtures.d.ts").PlantColorSnapshot} */
function fixture() {
    /** @type {import("../plant-chart-colors-fixtures.d.ts").PlantColorSnapshot} */
    const snapshot = structuredClone(original);
    const template = required(
        snapshot.metadata.sheets.find((sheet) =>
            sheet.properties.title.startsWith("P01 ")
        )?.charts
    );

    // Plant pages share three chart shapes; retain one native template instead
    // of duplicating its specifications for every plant in the JSON fixture.
    for (const sheet of snapshot.metadata.sheets) {
        if (
            !/^P\d{2} /v.test(sheet.properties.title) ||
            sheet.charts !== undefined
        )
            continue;
        sheet.charts = template.map((source, index) => {
            const chart = structuredClone(source);
            chart.chartId = sheet.properties.sheetId + index;
            const basic = chart.spec.basicChart;
            const chartData = Iterator.concat(
                basic.domains.map((domain) => domain.domain),
                basic.series.map((series) => series.series)
            );
            for (const data of chartData)
                for (const range of data.sourceRange.sources)
                    range.sheetId = sheet.properties.sheetId;
            return chart;
        });
    }
    return snapshot;
}

describe("plant chart color identity", () => {
    it("assigns thirty distinct colors to permanent IDs and rejects unknown plants", () => {
        expect.hasAssertions();
        expect(palette.map((color) => color.id)).toStrictEqual(
            Array.from(
                { length: 30 },
                (_, index) => `P${String(index + 1).padStart(2, "0")}`
            )
        );

        const uniqueColors = new Set(palette.map((color) => color.hex));

        expect(uniqueColors.size).toBe(30);
        expect(palette.every((color) => /^#[\dA-F]{6}$/v.test(color.hex))).toBe(
            true
        );
        expect(plantColor("P17")).toStrictEqual({
            blue: 150 / 255,
            green: 61 / 255,
            red: 146 / 255,
        });
        expect(() => plantColor("P31")).toThrow("Unknown plant color");
    });

    it("adds a key and colors all existing plant charts without changing their data", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const requests = buildPlantColorKeyRequests(snapshot);

        expect(snapshot).toStrictEqual(before);
        expect(
            requests.filter((request) => "updateChartSpec" in request)
        ).toHaveLength(90);

        const writes = requests.filter((request) => "updateCells" in request);

        expect(writes).toHaveLength(1);
        expect(writes[0]).toMatchObject({
            updateCells: { start: { sheetId: plantColorSheetId } },
        });

        const p17 = snapshot.metadata.sheets.find((sheet) =>
            sheet.properties.title.startsWith("P17 ")
        );
        const source = required(p17?.charts?.[0]);

        const matching = requests.find((request) =>
            JSON.stringify(request).includes(`"chartId":${source.chartId}`)
        );

        expect(matching).toMatchObject({
            updateChartSpec: {
                spec: {
                    basicChart: {
                        domains: source.spec.basicChart.domains,
                        series: source.spec.basicChart.series.map((series) => ({
                            colorStyle: { rgbColor: plantColor("P17") },
                            series: series.series,
                        })),
                    },
                },
            },
        });
    });

    it("colors fourteen comparisons and two selectors while preserving aggregate charts", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const requests = buildPlantInsightColorRequests(snapshot);

        expect(snapshot).toStrictEqual(before);
        expect(
            requests.filter((request) => "updateChartSpec" in request)
        ).toHaveLength(16);
        expect(
            requests.filter((request) => "addConditionalFormatRule" in request)
        ).toHaveLength(30);
        expect(
            requests.some(
                (request) =>
                    "deleteSheet" in request ||
                    "deleteDimension" in request ||
                    "deleteEmbeddedObject" in request
            )
        ).toBe(false);

        const writes = requests.filter((request) => "updateCells" in request);

        expect(writes).toHaveLength(136);

        for (const write of writes)
            expect(write).toMatchObject({
                updateCells: { start: { sheetId: plantColorDataSheetId } },
            });

        expect(
            requests.some((request) =>
                JSON.stringify(request).includes('"chartId":644668554')
            )
        ).toBe(false);
    });

    it("looks metrics up by plant ID and keeps missing readings distinct from zero", () => {
        expect.hasAssertions();

        const formula = fixedPlantMetricFormula(
            "$A2",
            "'Source'!$A$1:$A$31",
            "'Source'!$D$1:$D$31"
        );

        expect(formula).toContain("'Source'!$A$1:$A$31=$A2");
        expect(formula).toContain("ISNUMBER('Source'!$D$1:$D$31)");
        expect(formula.endsWith(',1),"")')).toBe(true);

        const selected = selectedPlantColorFormula(
            "Insights!$B$228",
            "P17",
            "'Source'!$D$2:$D$5000"
        );

        expect(selected.startsWith('=VSTACK(IF(Insights!$B$228="P17",')).toBe(
            true
        );
        expect(selected).toContain("$D$5000");
        expect(selected).toContain(
            "IFERROR(INDEX(FILTER('Source'!$D$2:$D$5000,ISNUMBER('Source'!$D$2:$D$5000)),1),0)"
        );
    });

    it("rejects replay, missing plants, missing selectors, and changed chart inventory", () => {
        expect.hasAssertions();

        const missingPlant = fixture();
        missingPlant.cells = missingPlant.cells.filter(
            (cell) => cell.value.stringValue !== "P17"
        );

        expect(() => buildPlantColorKeyRequests(missingPlant)).toThrow(
            "Missing plant record"
        );

        const missingSelector = fixture();
        missingSelector.cells = missingSelector.cells.filter(
            (cell) => cell.sheet !== "Insights"
        );

        expect(() => buildPlantInsightColorRequests(missingSelector)).toThrow(
            "plant selector"
        );

        const replay = fixture();
        const first = required(replay.metadata.sheets[0]);
        first.properties.title = "Plant color data";

        expect(() => buildPlantInsightColorRequests(replay)).toThrow(
            "already exists"
        );

        first.properties.title = "Plant colors";

        expect(() => buildPlantColorKeyRequests(replay)).toThrow(
            "already exists"
        );

        const changed = fixture();
        const insights = changed.metadata.sheets.find(
            (sheet) => sheet.properties.title === "Insights"
        );
        insights?.charts?.pop();

        expect(() => buildPlantInsightColorRequests(changed)).toThrow(
            "inventory changed"
        );
    });
});
