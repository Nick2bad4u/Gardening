import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import palette from "../../scripts/google-sheets/plant-colors.json" with { type: "json" };
import {
    assertWorkbookEnvironmentPreconditions,
    buildWorkbookEnvironmentRequests,
    environmentAppsScriptSource,
    environmentRows,
    environmentSheetId,
} from "../../scripts/google-sheets/workbook-environment.mjs";
import { required } from "../helpers/required.mjs";

const source = readFileSync(
    new URL("../../scripts/google-sheets/plant-tracker.gs", import.meta.url),
    "utf8"
);
const context = vm.createContext({ Date, Map, Set });
vm.runInContext(source, context);
const helpers = /** @type {Parameters<typeof environmentRows>[2]} */ ({
    active: context["activeHistoryRow_"],
    corrections: context["historyCorrectionContext_"],
    timestamp: context["webHistoryTimestamp_"],
});
const asOf = new Date("2026-10-10T12:00:00Z");

/** @returns {import("../../scripts/google-sheets/workbook-environment.mjs").EnvironmentSnapshot} */
function fixture() {
    const chart = {
        chartId: 77,
        position: {
            overlayPosition: {
                anchorCell: { columnIndex: 4, rowIndex: 30 },
                heightPixels: 500,
                widthPixels: 800,
            },
        },
        spec: {
            basicChart: { axis: [], domains: [], series: [] },
            title: "Existing",
        },
    };
    return {
        cells: [
            .../** @type {[number, string][]} */ ([
                [0, "Date"],
                [1, "Plant ID"],
                [2, "Event"],
                [8, "Notes"],
                [26, "Observation ID"],
                [28, "Observation quality"],
                [30, "Corrects observation ID"],
                [34, "Measurement method"],
                [35, "Record status"],
                [42, "Relative humidity (%)"],
                [43, "PPFD (µmol/m²/s)"],
                [44, "Illuminance (lux)"],
            ]).map(([column, label]) => ({
                column,
                row: 0,
                sheet: "History",
                value: { stringValue: label },
            })),
            ...palette.map(({ id }, index) => ({
                column: 0,
                row: index + 1,
                sheet: "Plant tracker",
                value: { stringValue: id },
            })),
            {
                column: 30,
                effectiveValue: { numberValue: 1 },
                row: 41,
                sheet: "Dashboard",
                value: { formulaValue: "=1" },
            },
            {
                column: 1,
                row: 11,
                sheet: "Integrity",
                value: {
                    formulaValue:
                        "=SUM(ARRAYFORMULA(N(ISERROR(History!A2:AP5000))),ARRAYFORMULA(N(ISERROR(Dashboard!U4:X254))))",
                },
            },
        ],
        dashboardReadBounds: { columnCount: 31, rowCount: 254 },
        metadata: {
            sheets: [
                {
                    properties: {
                        gridProperties: { columnCount: 45, rowCount: 5000 },
                        sheetId: 1,
                        title: "History",
                    },
                },
                {
                    charts: [chart],
                    properties: {
                        gridProperties: { columnCount: 31, rowCount: 254 },
                        sheetId: 2,
                        title: "Dashboard",
                    },
                },
                {
                    properties: {
                        gridProperties: { columnCount: 36, rowCount: 1000 },
                        sheetId: 3,
                        title: "Plant tracker",
                    },
                },
                {
                    properties: {
                        gridProperties: { columnCount: 10, rowCount: 414 },
                        sheetId: 4,
                        title: "Integrity",
                    },
                },
            ],
        },
    };
}

/**
 * @param {string} event @param {Partial<Record<number,GardenCell>>} [values]
 *
 * @returns {GardenHistoryRow}
 */
function reading(event, values = {}) {
    const row = /** @type {GardenHistoryRow} */ (
        Array.from({ length: 45 }, () => "")
    );
    Object.assign(row, {
        0: new Date("2026-10-09T12:00:00Z"),
        1: "P01",
        2: event,
        10: 1,
        26: "reading",
        35: "Active",
        ...values,
    });
    return row;
}

describe("environmental evidence projection", () => {
    it("retains independent zero readings, original methods, notes, dates and setup-independent history", () => {
        expect.hasAssertions();

        const rows = environmentRows(
            [
                reading("Light", {
                    8: "Top of canopy; preset A",
                    26: "light",
                    28: "Estimated",
                    34: "Light app",
                    43: 0,
                    44: 0,
                }),
                reading("Humidity", {
                    10: 2,
                    26: "humidity",
                    28: "Measured",
                    34: "Hygrometer",
                    42: 0,
                }),
            ],
            asOf,
            helpers
        );

        expect(rows).toHaveLength(3);
        expect(rows[1]).toStrictEqual([
            new Date("2026-10-09T12:00:00Z"),
            "P01",
            "Light",
            0,
            0,
            "",
            "Estimated",
            "Light app",
            "Top of canopy; preset A",
            "light",
        ]);
        expect(rows[2]?.slice(3, 8)).toStrictEqual([
            "",
            "",
            0,
            "Measured",
            "Hygrometer",
        ]);
    });

    it("does not coerce blank, negative, infinite, textual, out-of-range or wrong-event values", () => {
        expect.hasAssertions();
        expect(
            environmentRows(
                [
                    reading("Light", { 43: "", 44: "0" }),
                    reading("Light", { 43: -1, 44: Infinity }),
                    reading("Humidity", { 42: 101 }),
                    reading("Weigh", { 42: 40, 43: 200, 44: 5000 }),
                ],
                asOf,
                helpers
            )
        ).toHaveLength(1);
        expect(
            environmentRows(
                [reading("Light", { 43: NaN, 44: 2500 })],
                asOf,
                helpers
            )[1]?.slice(3, 6)
        ).toStrictEqual([
            "",
            2500,
            "",
        ]);
    });

    it("excludes removed/future/undated observations and resolves correction order with canonical helpers", () => {
        expect.hasAssertions();

        const rows = environmentRows(
            [
                reading("Light", { 26: "original", 35: "Removed", 43: 100 }),
                reading("Light", { 26: "later", 43: 200 }),
                reading("Light", {
                    26: "replacement",
                    30: "original",
                    43: 150,
                }),
                reading("Light", {
                    0: new Date("2026-10-11T00:00:00Z"),
                    26: "future",
                    43: 900,
                }),
                reading("Humidity", { 0: "", 42: 40 }),
            ],
            asOf,
            helpers
        );

        expect(rows.slice(1).map((row) => row[3])).toStrictEqual([150, 200]);
    });

    it("emits executable Apps Script with the same projection and no volatile formula argument", () => {
        expect.hasAssertions();

        vm.runInContext(environmentAppsScriptSource(), context);
        const generated = /** @type {typeof environmentRows} */ (
            context["environmentRows_"]
        );
        const rows = [reading("Humidity", { 42: 100 })];

        expect(
            Array.from(generated(rows, asOf, helpers), (row) => Array.from(row))
        ).toStrictEqual(environmentRows(rows, asOf, helpers));
    });
});

describe("guarded workbook environment plan", () => {
    it("uses native-supported point markers only on scatter plots and keeps column series marker-free", () => {
        expect.hasAssertions();

        const charts = buildWorkbookEnvironmentRequests(
            fixture()
        ).chartRequests.map(
            (request) => request.addChart.chart.spec.basicChart
        );
        const columns = charts.filter((chart) => chart.chartType === "COLUMN");
        const scatter = charts.filter((chart) => chart.chartType === "SCATTER");

        expect(columns).toHaveLength(3);
        expect(scatter).toHaveLength(3);
        expect(
            columns
                .flatMap((chart) => chart.series)
                .every((series) => !("pointStyle" in series))
        ).toBe(true);
        expect(
            scatter
                .flatMap((chart) => chart.series)
                .map((series) => series.pointStyle)
        ).toStrictEqual(
            Array.from({ length: 3 }, () => ({ shape: "CIRCLE", size: 5 }))
        );
        expect(
            charts.every((chart) =>
                chart.series.every(
                    (series) =>
                        series.targetAxis === "LEFT_AXIS" &&
                        series.series.sourceRange.sources.length === 1
                )
            )
        ).toBe(true);
    });

    it("extends the existing Integrity scan without introducing Dashboard self-reference", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const previous = required(
            snapshot.cells.find((cell) => cell.sheet === "Integrity")?.value
                ?.formulaValue
        );
        const plan = buildWorkbookEnvironmentRequests(snapshot);
        const request = required(
            plan.formulaRequests.find(
                (item) => item.updateCells.start.sheetId === 4
            )
        );
        const formula = required(
            request.updateCells.rows[0]?.values[0]?.userEnteredValue
                .formulaValue
        );

        expect(formula.startsWith(previous.slice(0, -1))).toBe(true);
        expect(formula).toContain("ISERROR('Light & humidity'!A1:J5188)");
        expect(formula).toContain("ISERROR('Environment data'!M1:R5000)");
        expect(formula).toContain("ISERROR(History!AQ2:AS5000)");
        expect(formula).not.toContain("Dashboard!U3");

        snapshot.cells = snapshot.cells.filter(
            (cell) => cell.sheet !== "Integrity"
        );

        expect(() => buildWorkbookEnvironmentRequests(snapshot)).toThrow(
            "Integrity B12 formula drift"
        );
    });

    it("accepts native empty cells and rejects charts missing native dimensions", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        snapshot.cells.push({ column: 0, row: 100, sheet: "Dashboard" });

        expect(
            buildWorkbookEnvironmentRequests(snapshot).verification
                .dashboardFirstChartRow
        ).toBe(46);

        const chart = required(snapshot.metadata.sheets[1]?.charts?.[0]);
        chart.position = {
            overlayPosition: { anchorCell: { columnIndex: 0, rowIndex: 40 } },
        };

        expect(() => buildWorkbookEnvironmentRequests(snapshot)).toThrow(
            "pixel dimensions"
        );
    });

    it("moves existing chart anchors below all data without replacing IDs, sizes, or specifications", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const plan = buildWorkbookEnvironmentRequests(snapshot);

        expect(snapshot).toStrictEqual(before);
        expect(plan.verification.dashboardFirstChartRow).toBe(46);
        expect(plan.prepareRequests[1]).toMatchObject({
            updateEmbeddedObjectPosition: {
                fields: "anchorCell,offsetXPixels,offsetYPixels",
                newPosition: {
                    overlayPosition: {
                        anchorCell: { columnIndex: 0, rowIndex: 45 },
                    },
                },
                objectId: 77,
            },
        });
        expect(JSON.stringify(plan)).not.toContain("updateChartSpec");
        expect(plan.chartRequests).toHaveLength(6);
        expect(
            plan.formulaRequests.every((request) =>
                [
                    4,
                    907_202_611,
                    907_202_612,
                ].includes(request.updateCells.start.sheetId)
            )
        ).toBe(true);
        expect(plan.verification.selector).toBe("B116");
        expect(plan.verification.evidence).toBe("A189:J5188");
    });

    it("rejects schema/header drift, inventory drift, existing destinations and chart-ID collisions", () => {
        expect.hasAssertions();

        const schema = fixture();
        const history = required(schema.metadata.sheets[0]);
        history.properties.gridProperties.columnCount = 43;

        expect(() => buildWorkbookEnvironmentRequests(schema)).toThrow(
            "schema drift"
        );

        const header = fixture();
        header.cells[0] = {
            column: 0,
            row: 0,
            sheet: "History",
            value: { stringValue: "Changed" },
        };

        expect(() => buildWorkbookEnvironmentRequests(header)).toThrow(
            "header drift"
        );

        const inventory = fixture();
        inventory.cells = inventory.cells.filter(
            (cell) => cell.sheet !== "Plant tracker" || cell.row !== 1
        );

        expect(() => buildWorkbookEnvironmentRequests(inventory)).toThrow(
            "inventory drift"
        );

        const replay = fixture();
        replay.metadata.sheets.push({
            properties: {
                gridProperties: { columnCount: 10, rowCount: 100 },
                sheetId: environmentSheetId,
                title: "Light & humidity",
            },
        });

        expect(() => buildWorkbookEnvironmentRequests(replay)).toThrow(
            "refuse replay"
        );

        const collision = fixture();
        const chart = required(collision.metadata.sheets[1]?.charts?.[0]);
        chart.chartId = 907_202_613;

        expect(() => buildWorkbookEnvironmentRequests(collision)).toThrow(
            "occupied"
        );
    });

    it("requires complete read bounds, fresh cells and an empty chart destination", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const plan = buildWorkbookEnvironmentRequests(snapshot);

        expect(() => {
            assertWorkbookEnvironmentPreconditions(plan, snapshot);
        }).not.toThrow();

        snapshot.cells.push({
            column: 2,
            row: 52,
            sheet: "Dashboard",
            value: { stringValue: "new data" },
        });

        expect(() => {
            assertWorkbookEnvironmentPreconditions(plan, snapshot);
        }).toThrow("drift");

        const incomplete = fixture();
        incomplete.dashboardReadBounds.rowCount = 100;

        expect(() => buildWorkbookEnvironmentRequests(incomplete)).toThrow(
            "complete bounded"
        );

        const occupied = fixture();
        occupied.cells.push({
            column: 0,
            effectiveValue: { stringValue: "spilled data" },
            row: 250,
            sheet: "Dashboard",
            value: {},
        });

        expect(() => buildWorkbookEnvironmentRequests(occupied)).toThrow(
            "verified empty space"
        );
    });

    it("keeps latest metrics independent and no-data messages separate from numeric sources", () => {
        expect.hasAssertions();

        const plan = buildWorkbookEnvironmentRequests(fixture());
        const first = plan.formulaRequests.find(
            (request) =>
                request.updateCells.start.sheetId === environmentSheetId &&
                request.updateCells.start.rowIndex === 7
        );
        const formulas = first?.updateCells.rows[0]?.values.map(
            (cell) =>
                cell.userEnteredValue.formulaValue ??
                cell.userEnteredValue.stringValue
        );

        expect(formulas?.[2]).toContain(
            "ISNUMBER('Environment data'!$D$2:$D$5000)"
        );
        expect(formulas?.[4]).toContain(
            "ISNUMBER('Environment data'!$E$2:$E$5000)"
        );
        expect(formulas?.[6]).toContain(
            "ISNUMBER('Environment data'!$F$2:$F$5000)"
        );
        expect(JSON.stringify(plan.formulaRequests)).toContain(
            "No light or humidity readings recorded"
        );
        expect(JSON.stringify(plan.formulaRequests)).not.toContain("NOW()");
    });

    it("generates explicit array masks and reverse exact lookups for both values and their original dates", () => {
        expect.hasAssertions();

        const plan = buildWorkbookEnvironmentRequests(fixture());
        const summary = plan.formulaRequests.filter(
            (request) =>
                request.updateCells.start.sheetId === environmentSheetId &&
                request.updateCells.start.rowIndex >= 7 &&
                request.updateCells.start.rowIndex < 7 + palette.length
        );
        const formulas = summary.flatMap((request) =>
            required(request.updateCells.rows[0])
                .values.slice(2)
                .map((cell) => required(cell.userEnteredValue.formulaValue))
        );

        expect(formulas).toHaveLength(palette.length * 6);
        expect(
            formulas.every((formula) =>
                formula.startsWith("=XLOOKUP(1,ARRAYFORMULA(")
            )
        ).toBe(true);
        expect(formulas.every((formula) => formula.endsWith(',"",0,-1)'))).toBe(
            true
        );
        expect(
            formulas.some((formula) => formula.includes("IFNA(LOOKUP"))
        ).toBe(false);
        expect(formulas.slice(-2)).toStrictEqual([
            "=XLOOKUP(1,ARRAYFORMULA(('Environment data'!$B$2:$B$5000=\"P38\")*ISNUMBER('Environment data'!$F$2:$F$5000)),'Environment data'!$F$2:$F$5000,\"\",0,-1)",
            "=XLOOKUP(1,ARRAYFORMULA(('Environment data'!$B$2:$B$5000=\"P38\")*ISNUMBER('Environment data'!$F$2:$F$5000)),'Environment data'!$A$2:$A$5000,\"\",0,-1)",
        ]);
    });
});
