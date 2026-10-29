import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    assertDashboardWeightWindowPreconditions,
    buildDashboardWeightWindowRequests,
    dashboardMinimumWeightFormula,
    dashboardWeightWindowHeaders,
} from "../../scripts/google-sheets/dashboard-weight-window.mjs";
import palette from "../../scripts/google-sheets/plant-colors.json" with { type: "json" };
import { required } from "../helpers/required.mjs";

const source = readFileSync(
    new URL("../../scripts/google-sheets/plant-tracker.gs", import.meta.url),
    "utf8"
);
const context = vm.createContext({});
vm.runInContext(source, context);
const headers = /** @type {string[]} */ (
    vm.runInContext("[...DASHBOARD_VIEW_HEADERS]", context)
);
const nativeFormula = /** @type {(row: number) => string} */ (
    context["dashboardMinimumWeightFormula_"]
);

/** @returns {import("../../scripts/google-sheets/dashboard-weight-window.mjs").DashboardWeightWindowSnapshot} */
function fixture() {
    return {
        cells: [
            ...headers.slice(0, 31).map((value, column) => ({
                column,
                row: 5,
                sheet: "Dashboard",
                value: { stringValue: value },
            })),
            ...palette.flatMap(({ id }, index) => [
                {
                    column: 1,
                    row: index + 6,
                    sheet: "Dashboard",
                    value: { stringValue: id },
                },
                {
                    column: 0,
                    row: index + 1,
                    sheet: "Baselines",
                    value: { stringValue: id },
                },
                {
                    column: 19,
                    effectiveValue: { numberValue: 1 },
                    row: index + 1,
                    sheet: "Baselines",
                },
            ]),
            .../** @type {[number, string][]} */ ([
                [0, "Date"],
                [1, "Plant ID"],
                [2, "Event"],
                [4, "Weight (g)"],
                [10, "Pot setup"],
                [28, "Observation quality"],
                [34, "Measurement method"],
                [35, "Record status"],
            ]).map(([column, value]) => ({
                column,
                row: 0,
                sheet: "History",
                value: { stringValue: value },
            })),
            {
                column: 0,
                row: 0,
                sheet: "Baselines",
                value: { stringValue: "Plant ID" },
            },
            {
                column: 19,
                row: 0,
                sheet: "Baselines",
                value: { stringValue: "Pot setup" },
            },
            {
                column: 4,
                row: 0,
                sheet: "Workbook calculations",
                value: { stringValue: "Calculated as of" },
            },
            {
                column: 4,
                effectiveValue: { numberValue: 46_306.5 },
                row: 1,
                sheet: "Workbook calculations",
                value: { formulaValue: "=NOW()" },
            },
            {
                column: 1,
                row: 11,
                sheet: "Integrity",
                value: {
                    formulaValue:
                        "=SUM(ARRAYFORMULA(N(ISERROR(Dashboard!A1:T254))),ARRAYFORMULA(N(ISERROR(Dashboard!U1:X1))),ARRAYFORMULA(N(ISERROR(Dashboard!U4:X254))),ARRAYFORMULA(IFERROR(N(ISERROR(Dashboard!Y1:AE254)),0)),SUM(ARRAYFORMULA(N(ISERROR('Environment data'!A1:J5000)))))",
                },
            },
        ],
        dashboardReadBounds: { columnCount: 31, rowCount: 254 },
        metadata: {
            sheets: [
                "Dashboard",
                "History",
                "Baselines",
                "Workbook calculations",
                "Integrity",
            ].map((title, index) => ({
                charts: [],
                merges: [],
                properties: {
                    gridProperties: {
                        columnCount: title === "Dashboard" ? 31 : 45,
                        rowCount: title === "History" ? 5000 : 254,
                    },
                    sheetId: index + 1,
                    title,
                },
                protectedRanges: [
                    {
                        protectedRangeId: 9,
                        range: { sheetId: index + 1 },
                        warningOnly: true,
                    },
                ],
            })),
        },
    };
}

/**
 * @param {import("../../scripts/google-sheets/dashboard-weight-window.mjs").DashboardWeightWindowSnapshot} snapshot
 * @param {string} kind
 */
function mutatePrecondition(snapshot, kind) {
    const dashboard = required(snapshot.metadata.sheets[0]);
    /** @param {string} sheet @param {number} row @param {number} column */
    const cell = (sheet, row, column) =>
        required(
            snapshot.cells.find(
                (entry) =>
                    entry.sheet === sheet &&
                    entry.row === row &&
                    entry.column === column
            )
        );
    switch (kind) {
        case "bounds": {
            snapshot.dashboardReadBounds.rowCount = 44;
            break;
        }
        case "clock": {
            cell("Workbook calculations", 1, 4).effectiveValue = {
                stringValue: "Loading",
            };
            break;
        }
        case "duplicate": {
            snapshot.cells.push(required(snapshot.cells[0]));
            break;
        }
        case "filter": {
            dashboard.basicFilter = { range: { endColumnIndex: 30 } };
            break;
        }
        case "header": {
            required(snapshot.cells[0]).value = { stringValue: "Unexpected" };
            break;
        }
        case "historyCapacity": {
            required(
                snapshot.metadata.sheets[1]
            ).properties.gridProperties.rowCount = 1000;
            break;
        }
        case "merge": {
            dashboard.merges = [
                {
                    endColumnIndex: 32,
                    endRowIndex: 1,
                    startColumnIndex: 30,
                    startRowIndex: 0,
                },
            ];
            break;
        }
        case "roster": {
            cell("Dashboard", 6, 1).value = { stringValue: "P99" };
            break;
        }
        case "scan": {
            cell("Integrity", 11, 1).value = { formulaValue: "=0" };
            break;
        }
        case "setup": {
            cell("Baselines", 1, 19).effectiveValue = { numberValue: 0 };
            break;
        }
        case "sorting": {
            dashboard.basicFilter = {
                range: { endColumnIndex: 31 },
                sortSpecs: [{ dimensionIndex: 6, sortOrder: "ASCENDING" }],
            };
            break;
        }
        default: {
            throw new Error("Unknown mutation fixture");
        }
    }
}

describe("dashboard rolling measured minimum", () => {
    it("keeps maintained source, headers and native formulas identical", () => {
        expect.hasAssertions();
        expect(structuredClone(headers.slice(31))).toStrictEqual(
            dashboardWeightWindowHeaders
        );

        for (const row of [7, 45])
            expect(nativeFormula(row)).toBe(dashboardMinimumWeightFormula(row));
        const formula = dashboardMinimumWeightFormula(7);

        expect(formula).toContain("ISNUMBER(History!$E$2:$E$50001)");
        expect(formula).toContain("History!$E$2:$E$50001>0");
        expect(formula).toContain("History!$K$2:$K$50001=setup");
        expect(formula).toContain("History!$A$2:$A$50001>=clock-90");
        expect(formula).toContain("History!$A$2:$A$50001<=clock");
        expect(formula).toContain('"(?i)estimat")=FALSE');
        expect(formula).toContain('"Removed")=FALSE');
        expect(formula).not.toContain("NOW()");
    });

    it("limits writes to additive Dashboard columns and Integrity coverage", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const plan = buildDashboardWeightWindowRequests(snapshot);

        expect(snapshot).toStrictEqual(before);
        expect(plan.ranges).toStrictEqual([
            "Dashboard!AF6:AG45",
            "Integrity!B12",
        ]);
        expect(plan.requests[0]).toStrictEqual({
            appendDimension: { dimension: "COLUMNS", length: 2, sheetId: 1 },
        });
        expect(plan.requests).toHaveLength(8);
        expect(
            plan.requests.map((request) => Object.keys(request)[0])
        ).toStrictEqual([
            "appendDimension",
            "updateCells",
            "repeatCell",
            "repeatCell",
            "repeatCell",
            "repeatCell",
            "updateDimensionProperties",
            "updateCells",
        ]);

        const text = JSON.stringify(plan.requests);

        expect(text).toContain("Dashboard!Y1:AG254");
        expect(text).toContain("Dashboard!U4:X254");
        expect(text).toContain("'Environment data'!A1:J5000");
        expect(text).toContain("G7-AF7");
        expect(text).toContain("History!$E$2:$E$5000");
        expect(text).not.toContain("History!$E$2:$E$50001");
        expect(text).toContain("+0.0;-0.0;0.0");
        expect(text).not.toContain("updateChart");
        expect(text).not.toContain("updateProtectedRange");
        expect(text).not.toContain("Daily care");
        expect(() => {
            assertDashboardWeightWindowPreconditions(plan, snapshot);
        }).not.toThrow();

        required(snapshot.cells[0]).value = { stringValue: "changed" };

        expect(() => {
            assertDashboardWeightWindowPreconditions(plan, snapshot);
        }).toThrow(/drift/v);
    });

    it("accepts existing blank capacity and extends only the existing table filter", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const dashboard = required(snapshot.metadata.sheets[0]);
        dashboard.properties.gridProperties.columnCount = 35;
        snapshot.dashboardReadBounds.columnCount = 35;
        dashboard.basicFilter = {
            range: {
                endColumnIndex: 31,
                endRowIndex: 45,
                sheetId: 1,
                startColumnIndex: 0,
                startRowIndex: 5,
            },
        };
        const plan = buildDashboardWeightWindowRequests(snapshot);

        expect(
            plan.requests.some((request) => "appendDimension" in request)
        ).toBe(false);
        expect(plan.requests.at(-1)).toMatchObject({
            setBasicFilter: {
                filter: { range: { endColumnIndex: 33, endRowIndex: 45 } },
            },
        });
    });

    it.each([true, false])(
        "restores append-expanded formatting and group boundaries with collapsed=%s",
        (collapsed) => {
            expect.hasAssertions();

            const snapshot = fixture();
            const dashboard = required(snapshot.metadata.sheets[0]);
            const firstRule = {
                ranges: [
                    {
                        endColumnIndex: 20,
                        endRowIndex: 3,
                        sheetId: 1,
                        startColumnIndex: 0,
                        startRowIndex: 2,
                    },
                ],
            };
            const tailRule = {
                booleanRule: {
                    condition: {
                        type: "CUSTOM_FORMULA",
                        values: [{ userEnteredValue: '=$A3="Action"' }],
                    },
                },
                ranges: [
                    {
                        endColumnIndex: 31,
                        endRowIndex: 3,
                        sheetId: 1,
                        startColumnIndex: 20,
                        startRowIndex: 2,
                    },
                    {
                        endColumnIndex: 5,
                        endRowIndex: 6,
                        sheetId: 1,
                        startColumnIndex: 4,
                        startRowIndex: 5,
                    },
                ],
            };
            dashboard.conditionalFormats = [firstRule, tailRule];
            const banding = {
                bandedRangeId: 77,
                range: {
                    endColumnIndex: 31,
                    endRowIndex: 45,
                    sheetId: 1,
                    startColumnIndex: 0,
                    startRowIndex: 5,
                },
            };
            dashboard.bandedRanges = [banding];
            const untouchedGroup = {
                collapsed: true,
                depth: 1,
                range: {
                    dimension: "COLUMNS",
                    endIndex: 15,
                    sheetId: 1,
                    startIndex: 11,
                },
            };
            const tailGroup = {
                collapsed,
                depth: 1,
                range: {
                    dimension: "COLUMNS",
                    endIndex: 31,
                    sheetId: 1,
                    startIndex: 24,
                },
            };
            dashboard.columnGroups = [untouchedGroup, tailGroup];
            const before = structuredClone(snapshot);
            const plan = buildDashboardWeightWindowRequests(snapshot);

            expect(snapshot).toStrictEqual(before);
            expect(plan.requests.slice(1, 6)).toStrictEqual([
                {
                    updateConditionalFormatRule: {
                        index: 1,
                        rule: tailRule,
                        sheetId: 1,
                    },
                },
                { updateBanding: { bandedRange: banding, fields: "range" } },
                {
                    deleteDimensionGroup: {
                        range: { ...tailGroup.range, endIndex: 33 },
                    },
                },
                { addDimensionGroup: { range: tailGroup.range } },
                {
                    updateDimensionGroup: {
                        dimensionGroup: tailGroup,
                        fields: "collapsed",
                    },
                },
            ]);
            expect(
                plan.requests.find(
                    (request) => "updateDimensionProperties" in request
                )
            ).toStrictEqual({
                updateDimensionProperties: {
                    fields: "pixelSize,hiddenByUser",
                    properties: { hiddenByUser: false, pixelSize: 180 },
                    range: {
                        dimension: "COLUMNS",
                        endIndex: 33,
                        sheetId: 1,
                        startIndex: 31,
                    },
                },
            });
            expect(
                plan.requests.filter(
                    (request) => "updateConditionalFormatRule" in request
                )
            ).toHaveLength(1);
            expect(
                plan.requests.filter(
                    (request) => "deleteDimensionGroup" in request
                )
            ).toHaveLength(1);
        }
    );

    it("leaves formatting boundaries and independent groups alone when no append is needed", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const dashboard = required(snapshot.metadata.sheets[0]);
        dashboard.properties.gridProperties.columnCount = 35;
        snapshot.dashboardReadBounds.columnCount = 35;
        dashboard.conditionalFormats = [{ ranges: [{ endColumnIndex: 31 }] }];
        dashboard.bandedRanges = [
            { bandedRangeId: 77, range: { endColumnIndex: 31 } },
        ];
        dashboard.columnGroups = [
            {
                collapsed: true,
                depth: 1,
                range: {
                    dimension: "COLUMNS",
                    endIndex: 31,
                    sheetId: 1,
                    startIndex: 24,
                },
            },
        ];
        const plan = buildDashboardWeightWindowRequests(snapshot);

        expect(
            plan.requests.some(
                (request) =>
                    "updateConditionalFormatRule" in request ||
                    "updateBanding" in request ||
                    "deleteDimensionGroup" in request
            )
        ).toBe(false);
        expect(
            plan.requests.find(
                (request) => "updateDimensionProperties" in request
            )
        ).toMatchObject({
            updateDimensionProperties: { properties: { hiddenByUser: false } },
        });
    });

    it.each([
        [
            {
                collapsed: true,
                depth: 2,
                range: {
                    dimension: "COLUMNS",
                    endIndex: 31,
                    sheetId: 1,
                    startIndex: 24,
                },
            },
        ],
        [
            {
                collapsed: true,
                depth: 1,
                range: {
                    dimension: "COLUMNS",
                    endIndex: 31,
                    sheetId: 1,
                    startIndex: 24,
                },
            },
            {
                collapsed: true,
                depth: 2,
                range: {
                    dimension: "COLUMNS",
                    endIndex: 30,
                    sheetId: 1,
                    startIndex: 25,
                },
            },
        ],
        [
            {
                collapsed: true,
                depth: 1,
                range: {
                    dimension: "COLUMNS",
                    endIndex: 33,
                    sheetId: 1,
                    startIndex: 24,
                },
            },
        ],
    ])("rejects unsupported column-group boundaries: %j", (...groups) => {
        expect.hasAssertions();

        const snapshot = fixture();
        required(snapshot.metadata.sheets[0]).columnGroups = groups;

        expect(() => buildDashboardWeightWindowRequests(snapshot)).toThrow(
            /nested|overlap/v
        );
    });

    it.each([
        "entered",
        "effective",
        "note",
        "replay",
    ])("rejects occupied destinations: %s", (kind) => {
        expect.hasAssertions();

        const snapshot = fixture();
        required(
            snapshot.metadata.sheets[0]
        ).properties.gridProperties.columnCount = 33;
        snapshot.dashboardReadBounds.columnCount = 33;
        snapshot.cells.push({
            column: 31,
            row: kind === "replay" ? 5 : 100,
            sheet: "Dashboard",
            ...(kind === "effective"
                ? { effectiveValue: { numberValue: 0 } }
                : kind === "note"
                  ? { note: "Owner note" }
                  : {
                        value: {
                            stringValue:
                                kind === "replay"
                                    ? required(dashboardWeightWindowHeaders[0])
                                    : "Existing",
                        },
                    }),
        });

        expect(() => buildDashboardWeightWindowRequests(snapshot)).toThrow(
            /already installed|occupied/v
        );
    });

    it.each([
        "bounds",
        "header",
        "roster",
        "setup",
        "clock",
        "merge",
        "scan",
        "filter",
        "duplicate",
        "historyCapacity",
        "sorting",
    ])("rejects changed preconditions: %s", (kind) => {
        expect.hasAssertions();

        const snapshot = fixture();
        mutatePrecondition(snapshot, kind);

        expect(() => buildDashboardWeightWindowRequests(snapshot)).toThrow(
            /Duplicate|Invalid|Missing|Unexpected|capacity|changed|complete|merged|sorting/v
        );
    });
});
