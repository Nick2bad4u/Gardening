import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    assertWorkbookIntegrityPreconditions,
    buildWorkbookIntegrityRequests,
    workbookIntegrityIndicatorFormula,
} from "../../scripts/google-sheets/workbook-integrity.mjs";
import { required } from "../helpers/required.mjs";

/** @returns {import("../../types/workbook-integrity.d.ts").IntegritySnapshot} */
function fixture() {
    const titles = [
        "Integrity",
        "Dashboard",
        "History",
        "History view",
        "Plant tracker",
        "Baselines",
        "Workbook calculations",
        "Workbook analytics",
        "Dry-down models",
        "Environment data",
        "App entries",
        "App bulk",
    ];
    /** @type {import("../../types/workbook-integrity.d.ts").IntegritySnapshot} */
    const result = {
        cells: [],
        metadata: {
            sheets: titles.map((title, sheetId) => ({
                properties: {
                    gridProperties: { columnCount: 80, rowCount: 5000 },
                    sheetId,
                    title,
                },
                protectedRanges: [
                    {
                        protectedRangeId: 100 + sheetId,
                        range: { sheetId },
                        warningOnly: true,
                    },
                ],
            })),
        },
        readRanges: titles.map((sheet) => ({
            endColumn: 80,
            endRow: 5000,
            sheet,
            startColumn: 0,
            startRow: 0,
        })),
    };
    /**
     * @param {string} sheet @param {number} row @param {number} column @param
     *   {string} value
     */
    const put = (sheet, row, column, value) => {
        result.cells.push({
            column,
            row,
            sheet,
            value: value.startsWith("=")
                ? { formulaValue: value }
                : { stringValue: value },
        });
    };
    for (let row = 4; row < 21; row += 1)
        put("Integrity", row, 2, `=IF(B${row + 1}=0,"Pass","Fail")`);
    put("History", 0, 0, "Date");
    put("History", 0, 15, "Request ID");
    put("History", 0, 26, "Observation ID");
    put("History view", 0, 0, "=LET(rows,History!A2:BO5000,rows)");
    put(
        "Dry-down models",
        1,
        0,
        "=GARDEN_DRY_DOWN(History!A2:AP5000,'Plant tracker'!A2:A3)"
    );
    put("Workbook calculations", 1, 4, "=NOW()");
    put("Workbook calculations", 1, 5, "=INT(E2)");
    put(
        "Workbook analytics",
        0,
        0,
        "=GARDEN_CYCLE_COMPARISON(History!A2:AP5000,Insights!B228,1)"
    );
    put(
        "Environment data",
        0,
        0,
        "=GARDEN_ENVIRONMENT_READINGS(History!A2:BH5000)"
    );
    put(
        "Environment data",
        0,
        22,
        "=GARDEN_RECORDED_LOCATIONS(History!A2:BH5000)"
    );
    for (const [index, id] of ["P01", "P02"].entries()) {
        put("Plant tracker", index + 1, 0, id);
        put(
            "Workbook calculations",
            index + 1,
            1,
            '=IFNA(FILTER(History!E2:E5000,History!B2:B5000=A2),"")'
        );
    }
    for (const [index, status] of /** @type {const} */ ([
        "Fail",
        "Action",
    ]).entries()) {
        const description =
            status === "Fail" ? " failed check" : " follow-up check";
        put(
            "Dashboard",
            2,
            20 + index * 2,
            `=HYPERLINK("#gid=0&range=A4:D21",IFERROR(COUNTIF(Integrity!$C$5:$C$21,"${status}")&"${description}","Checks unavailable"))`
        );
    }
    const dashboard = required(result.metadata.sheets[1]);
    dashboard.conditionalFormats = [
        { gradientRule: {}, ranges: [{ sheetId: 1, startRowIndex: 6 }] },
    ];
    const availability = `SUM(${[
        "Pass",
        "Fail",
        "Action",
        "Info",
    ]
        .map((status) => `COUNTIF(INDIRECT("Integrity!C5:C21"),"${status}")`)
        .join(",")})=ROWS(INDIRECT("Integrity!C5:C21"))`;
    for (const [
        startColumnIndex,
        endColumnIndex,
        status,
    ] of /** @type {const} */ ([
        [
            20,
            22,
            "Fail",
        ],
        [
            22,
            31,
            "Action",
        ],
    ]))
        for (const isHealthy of [true, false]) {
            const rule = {
                booleanRule: {
                    condition: {
                        type: "CUSTOM_FORMULA",
                        values: [
                            {
                                userEnteredValue: `=AND(${availability},COUNTIF(INDIRECT("Integrity!C5:C21"),"${status}")${isHealthy ? "=0" : ">0"})`,
                            },
                        ],
                    },
                    format: {
                        backgroundColor: { green: isHealthy ? 1 : 0 },
                        textFormat: { bold: true },
                    },
                },
                ranges: [
                    {
                        endColumnIndex,
                        endRowIndex: 3,
                        sheetId: 1,
                        startColumnIndex,
                        startRowIndex: 2,
                    },
                ],
            };
            dashboard.conditionalFormats.push(rule);
        }
    return result;
}

const options = { activePlantIds: ["P01", "P02"] };

/** @param {import("../../types/workbook-integrity.d.ts").IntegrityPlan} plan */
function table(plan) {
    const update =
        /** @type {import("../workbook-fixtures.d.ts").WorkbookRequest} */ (
            required(plan.requests[0])
        ).updateCells;
    return required(update).rows;
}

describe("workbook Integrity hardening", () => {
    it("builds a bounded value/format-only footprint without changing canonical cells, charts, protections or its snapshot", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const plan = buildWorkbookIntegrityRequests(snapshot, options);

        expect(snapshot).toStrictEqual(before);
        expect(plan.footprint).toStrictEqual([
            "Integrity!E4:H14",
            "Dashboard!U3",
            "Dashboard!W3",
            "Dashboard!U3:V3 / W3:AE3 existing indicator format rules",
            "Integrity!E:H column widths and shared rows 5:14 automatic heights",
        ]);
        expect(plan.anchorCount).toBe(9);
        expect(plan.requests).toHaveLength(13);
        expect(table(plan)).toHaveLength(11);

        for (const request of plan.requests) {
            const keys = Object.keys(request);

            expect(keys).toHaveLength(1);
            expect(keys[0]).toMatch(
                /^(?:autoResizeDimensions|repeatCell|updateCells|updateConditionalFormatRule|updateDimensionProperties)$/v
            );
        }

        expect(plan.requests.slice(-4)).toStrictEqual([
            ...[
                { endIndex: 5, pixelSize: 280, startIndex: 4 },
                { endIndex: 7, pixelSize: 90, startIndex: 5 },
                { endIndex: 8, pixelSize: 360, startIndex: 7 },
            ].map(({ endIndex, pixelSize, startIndex }) => ({
                updateDimensionProperties: {
                    fields: "pixelSize",
                    properties: { pixelSize },
                    range: {
                        dimension: "COLUMNS",
                        endIndex,
                        sheetId: 0,
                        startIndex,
                    },
                },
            })),
            {
                autoResizeDimensions: {
                    dimensions: {
                        dimension: "ROWS",
                        endIndex: 14,
                        sheetId: 0,
                        startIndex: 4,
                    },
                },
            },
        ]);

        const text = JSON.stringify(plan.requests);

        expect(text).not.toContain("Daily care");
        expect(text).not.toContain("updateChartSpec");
        expect(text).not.toContain("updateProtectedRange");
        expect(text).not.toContain("deleteRange");
        expect(() => {
            assertWorkbookIntegrityPreconditions(
                plan,
                structuredClone(snapshot)
            );
        }).not.toThrow();
    });

    it("updates only four existing indicator conditions in place and refuses stale or missing rules", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const plan = buildWorkbookIntegrityRequests(snapshot, options);
        const updates = plan.requests.flatMap((request) => {
            const update =
                /** @type {import("../workbook-fixtures.d.ts").WorkbookRequest} */ (
                    request
                ).updateConditionalFormatRule;
            return update ? [update] : [];
        });

        expect(updates.map((update) => update.index)).toStrictEqual([
            1,
            2,
            3,
            4,
        ]);
        expect(
            updates.map(
                (update) =>
                    update.rule.booleanRule?.condition.values[0]
                        ?.userEnteredValue
            )
        ).toStrictEqual([
            '=LEFT(U3,2)="0 "',
            '=AND(ISNUMBER(SEARCH(" check",U3)),LEFT(U3,2)<>"0 ")',
            '=LEFT(W3,2)="0 "',
            '=AND(ISNUMBER(SEARCH(" check",W3)),LEFT(W3,2)<>"0 ")',
        ]);

        const rules = required(
            required(snapshot.metadata.sheets[1]).conditionalFormats
        );
        for (const update of updates) {
            const original = required(rules[update.index]);
            const restored = structuredClone(update.rule);
            required(restored.booleanRule).condition = required(
                original.booleanRule
            ).condition;

            expect(restored).toStrictEqual(original);
            expect(update.sheetId).toBe(1);
        }
        rules.pop();

        expect(() => buildWorkbookIntegrityRequests(snapshot, options)).toThrow(
            "conditional-format rule drift"
        );
    });

    it("detects constant or missing anchors while protecting every covered source against subsequent drift", () => {
        expect.hasAssertions();

        for (const value of [{ stringValue: "2026-10-17" }, {}]) {
            const snapshot = fixture();
            const clock = required(
                snapshot.cells.find(
                    (entry) =>
                        entry.sheet === "Workbook calculations" &&
                        entry.column === 4
                )
            );
            clock.value = value;

            expect(() =>
                buildWorkbookIntegrityRequests(snapshot, options)
            ).toThrow("Required formula anchor changed");
        }
        const snapshot = fixture();
        const plan = buildWorkbookIntegrityRequests(snapshot, options);
        required(
            snapshot.cells.find((entry) => entry.sheet === "History view")
        ).value.formulaValue = "=LET(rows,History!A2:BO20,rows)";

        expect(() => {
            assertWorkbookIntegrityPreconditions(plan, snapshot);
        }).toThrow("Workbook drift");
    });

    it("refuses replay, occupied destinations, incomplete capture, merges, schema drift and changed inventory", () => {
        expect.hasAssertions();

        const occupied = fixture();
        occupied.cells.push({
            column: 4,
            row: 3,
            sheet: "Integrity",
            value: { stringValue: "Additional check" },
        });

        expect(() => buildWorkbookIntegrityRequests(occupied, options)).toThrow(
            "occupied or migration already installed"
        );

        const missing = fixture();
        missing.readRanges = missing.readRanges.filter(
            (range) => range.sheet !== "Integrity"
        );

        expect(() => buildWorkbookIntegrityRequests(missing, options)).toThrow(
            "Missing complete captured range"
        );

        const merged = fixture();
        required(merged.metadata.sheets[0]).merges = [
            {
                endColumnIndex: 8,
                endRowIndex: 4,
                startColumnIndex: 4,
                startRowIndex: 3,
            },
        ];

        expect(() => buildWorkbookIntegrityRequests(merged, options)).toThrow(
            "merged cells"
        );

        const header = fixture();
        required(
            header.cells.find(
                (entry) => entry.sheet === "History" && entry.column === 26
            )
        ).value.stringValue = "Unexpected";

        expect(() => buildWorkbookIntegrityRequests(header, options)).toThrow(
            "History header drift"
        );

        const inventory = fixture();
        required(
            inventory.cells.find((entry) => entry.sheet === "Plant tracker")
        ).value.stringValue = "P03";

        expect(() =>
            buildWorkbookIntegrityRequests(inventory, options)
        ).toThrow("Active Plant tracker inventory changed");
    });

    it("covers both directions of identity and keeps capacity reservations, warnings and formula failures visible", () => {
        expect.hasAssertions();

        const rows = table(buildWorkbookIntegrityRequests(fixture(), options));
        const values = rows.map((row) =>
            row.values.map((entry) => entry.userEnteredValue)
        );
        const identity = values[2]?.[1]?.formulaValue ?? "";

        expect(identity).toContain(
            "COUNTIF('History view'!AA2:AA5000,History!AA2:AA5000)<>1"
        );
        expect(identity).toContain(
            "COUNTIF(History!AA2:AA5000,'History view'!AA2:AA5000)<>1"
        );
        expect(identity).toContain(",1)");
        expect(values[7]?.[1]?.formulaValue).toContain("LEN(History!P2:P)");
        expect(values[7]?.[1]?.formulaValue).toContain("ROW(History!A2:A)-1");
        expect(values[8]?.[1]?.formulaValue).toBe("=MAX(0,4999-F11)");
        expect(values[10]?.[2]?.formulaValue).toBe(
            '=IFERROR(IF(F11>=F13-1,"Fail",IF(F12<=500,"Action","Pass")),"Fail")'
        );
        expect(values[1]?.[1]?.formulaValue).toContain(
            "FORMULATEXT('History view'!A1)"
        );
        expect(values[1]?.[1]?.formulaValue).toContain(
            "ISFORMULA('Workbook calculations'!B3)"
        );
    });

    it("requires all 27 status cells before reporting health and matches the bound logger expression", () => {
        expect.hasAssertions();

        const source = readFileSync(
            new URL(
                "../../scripts/google-sheets/plant-tracker.gs",
                import.meta.url
            ),
            "utf8"
        );
        const context = vm.createContext({});
        vm.runInContext(source, context);
        for (const status of /** @type {const} */ (["Fail", "Action"])) {
            const formula = workbookIntegrityIndicatorFormula(status, 42);

            expect(formula).toContain(")=27");
            expect(formula).toContain("Integrity!$G$5:$G$14");
            expect(formula).toContain("Checks unavailable");
            expect(formula).toContain("A4:H21");

            const actual = vm.runInContext(
                `dailyCareIndicatorFormula_("${status}",42,"A4:H21")`,
                context
            );

            expect(actual).toBe(formula);
        }

        expect(() => workbookIntegrityIndicatorFormula("Fail", -1)).toThrow(
            "Invalid Integrity sheet ID"
        );
    });
});
