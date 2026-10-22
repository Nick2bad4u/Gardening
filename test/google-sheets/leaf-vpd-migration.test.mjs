import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    assertLeafVpdMigrationPreconditions,
    buildLeafVpdMigrationRequests,
} from "../../scripts/google-sheets/leaf-vpd-migration.mjs";
import { required, stringArray } from "../helpers/required.mjs";

/**
 * @returns {{
 *     schema: import("../../types/leaf-vpd-migration.d.ts").LeafVpdSchema;
 *     snapshot: import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot;
 * }}
 */
function fixture() {
    const schema = sourceSchema();
    const properties = [
        { columns: 60, rows: 5000, title: "History" },
        { columns: 60, rows: 5000, title: "History view" },
        { columns: 52, rows: 1000, title: "App entries" },
        { columns: 74, rows: 1000, title: "App bulk" },
        { columns: 10, rows: 414, title: "Integrity" },
    ];
    /** @type {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot} */
    const snapshot = {
        cells: [],
        metadata: {
            sheets: properties.map(({ columns, rows, title }, sheetId) => ({
                properties: {
                    gridProperties: { columnCount: columns, rowCount: rows },
                    sheetId,
                    title,
                },
                protectedRanges: [
                    {
                        protectedRangeId: sheetId + 100,
                        range: { sheetId },
                        warningOnly: true,
                    },
                ],
            })),
        },
        readRanges: properties.map(({ columns, rows, title }) => ({
            endColumn: columns,
            endRow: rows,
            sheet: title,
            startColumn: 0,
            startRow: 0,
        })),
    };
    for (const [sheet, headers] of /** @type {[string, string[]][]} */ ([
        ["History", schema.history.slice(0, 60)],
        ["App entries", schema.entries.slice(0, 52)],
        ["App bulk", schema.bulk],
    ])) {
        for (const [column, label] of headers.entries())
            snapshot.cells.push({
                column,
                row: 0,
                sheet,
                value: { stringValue: label },
            });
    }
    const history = required(snapshot.metadata.sheets[0]);
    history.basicFilter = {
        criteria: { 2: { hiddenValues: ["Removed"] } },
        range: {
            endColumnIndex: 60,
            endRowIndex: 5000,
            sheetId: 0,
            startColumnIndex: 0,
            startRowIndex: 0,
        },
        sortSpecs: [{ dimensionIndex: 0, sortOrder: "DESCENDING" }],
    };
    snapshot.cells.push(
        {
            column: 0,
            row: 0,
            sheet: "History view",
            value: {
                formulaValue:
                    '=LET(rows,SORT(FILTER(History!A2:BH5000,History!A2:A5000<>""),1,FALSE,10,FALSE),fmt,LAMBDA(d,IF(d="","",IF(MOD(d,1)=0,TEXT(d,"M/d/yyyy"),TEXT(d,"M/d/yyyy h:mm AM/PM")))),VSTACK(History!A1:BH1,HSTACK(MAP(CHOOSECOLS(rows,1),fmt),CHOOSECOLS(rows,SEQUENCE(1,59,2,1)))))',
            },
        },
        {
            column: 1,
            row: 11,
            sheet: "Integrity",
            value: {
                formulaValue:
                    "=SUM(ARRAYFORMULA(N(ISERROR(History!AT2:BH5000))))",
            },
        },
        {
            column: 2,
            row: 1,
            sheet: "History",
            value: { stringValue: "Support" },
        },
        {
            column: 59,
            row: 1,
            sheet: "History",
            value: { stringValue: "Existing support details" },
        },
        {
            column: 3,
            row: 1,
            sheet: "App entries",
            value: { stringValue: "Support" },
        }
    );
    for (let row = 1; row < 5000; row += 1)
        snapshot.cells.push({
            column: 34,
            dataValidation: {
                condition: {
                    type: "ONE_OF_LIST",
                    values: [
                        { userEnteredValue: "Scale" },
                        { userEnteredValue: "Thermometer" },
                    ],
                },
                strict: true,
            },
            row,
            sheet: "History",
            value: {},
        });
    for (let row = 1; row < 1000; row += 1)
        snapshot.cells.push({
            column: 3,
            dataValidation: {
                condition: {
                    type: "ONE_OF_LIST",
                    values: [...schema.bulkEvents, "Support"].map(
                        (userEnteredValue) => ({ userEnteredValue })
                    ),
                },
                showCustomUi: true,
                strict: true,
            },
            row,
            sheet: "App bulk",
            value: row === 1 ? { stringValue: "Support" } : {},
        });
    return { schema, snapshot };
}

/** @returns {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSchema} */
function sourceSchema() {
    const context = vm.createContext({});
    vm.runInContext(
        readFileSync(
            new URL(
                "../../scripts/google-sheets/plant-tracker.gs",
                import.meta.url
            ),
            "utf8"
        ),
        context
    );
    const parsed = /** @type {Record<string, unknown>} */ (
        JSON.parse(
            String(
                vm.runInContext(
                    `JSON.stringify({history:[...HISTORY_HEADERS,"Plant / planter","Trend anchor","Days after anchor",GARDEN_LOGGER.requestIdHeader,...HISTORY_DETAIL_HEADERS,...HISTORY_PROVENANCE_HEADERS,...HISTORY_MEASUREMENT_HEADERS,...HISTORY_ROTATION_HEADERS,...HISTORY_WATER_HEADERS,...HISTORY_HUMIDITY_HEADERS,...HISTORY_LIGHT_HEADERS,...HISTORY_CARE_HEADERS],entries:[...APP_SHEET_ENTRY_HEADERS],bulk:[...APP_SHEET_BULK_V536_HEADERS],bulkEvents:[...APP_SHEET_BULK_ACTION_OPTIONS]})`,
                    context
                )
            )
        )
    );
    return {
        bulk: stringArray(parsed["bulk"]),
        bulkEvents: stringArray(parsed["bulkEvents"]),
        entries: stringArray(parsed["entries"]),
        history: stringArray(parsed["history"]),
    };
}

describe("append-only Leaf VPD workbook migration", () => {
    it("uses the maintained 67/59/74 schema and never repurposes Support or rewrites any old canonical/staging value", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const before = structuredClone(snapshot);
        const plan = buildLeafVpdMigrationRequests(snapshot, schema);

        expect(snapshot).toStrictEqual(before);
        expect(schema.history.slice(58, 62)).toStrictEqual([
            "Support action",
            "Support details",
            "Leaf temperature (°C)",
            "Leaf temperature entry unit",
        ]);
        expect(schema.entries[52]).toBe("Leaf temperature");
        expect(schema.entries[54]).toBe("Paired air temperature");
        expect(schema.bulk).toHaveLength(74);
        expect(plan.prepareRequests).toHaveLength(38);
        expect(plan.formulaRequests).toHaveLength(2);

        const writes = plan.prepareRequests
            .filter((request) => "updateCells" in request)
            .map(
                (request) =>
                    /** @type {import("../workbook-fixtures.d.ts").WorkbookRequest} */ (
                        request
                    ).updateCells
            );

        expect(writes.map((write) => write?.start)).toStrictEqual([
            { columnIndex: 60, rowIndex: 0, sheetId: 0 },
            { columnIndex: 52, rowIndex: 0, sheetId: 2 },
        ]);
        expect(JSON.stringify(plan)).not.toContain("updateChartSpec");
        expect(JSON.stringify(plan)).not.toContain("updateProtectedRange");
        expect(() => {
            assertLeafVpdMigrationPreconditions(
                plan,
                structuredClone(snapshot)
            );
        }).not.toThrow();
    });

    it("clears inherited validation only in appended columns and preserves signed calculated VPD", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const plan = buildLeafVpdMigrationRequests(snapshot, schema);
        const rules = plan.prepareRequests.flatMap((request) => {
            if (!("setDataValidation" in request)) return [];
            return [
                /**
                 * @type {{
                 *     range: import("../workbook-fixtures.d.ts").GridRange;
                 *     rule?: import("../../types/leaf-vpd-migration.d.ts").LeafVpdValidation;
                 * }}
                 */ (request["setDataValidation"]),
            ];
        });

        expect(
            rules
                .filter((rule) => rule.rule === undefined)
                .map((rule) => [
                    rule.range.sheetId,
                    rule.range.startColumnIndex,
                    rule.range.endColumnIndex,
                ])
        ).toStrictEqual([
            [
                0,
                60,
                67,
            ],
            [
                2,
                52,
                59,
            ],
            [
                1,
                60,
                67,
            ],
        ]);
        expect(
            rules.some(
                (rule) =>
                    rule.range.sheetId === 0 &&
                    rule.range.startColumnIndex === 65 &&
                    rule.rule !== undefined
            )
        ).toBe(false);
        expect(
            rules.find(
                (rule) =>
                    rule.range.sheetId === 2 &&
                    rule.range.startColumnIndex === 57
            )?.rule?.condition
        ).toStrictEqual({
            type: "NUMBER_GREATER_THAN_EQ",
            values: [{ userEnteredValue: "0" }],
        });
        expect(
            rules.find(
                (rule) =>
                    rule.range.sheetId === 0 &&
                    rule.range.startColumnIndex === 60 &&
                    rule.range.endColumnIndex === 61
            )?.rule?.condition
        ).toStrictEqual({
            type: "NUMBER_BETWEEN",
            values: [{ userEnteredValue: "-50" }, { userEnteredValue: "100" }],
        });
        expect(
            rules.find(
                (rule) =>
                    rule.range.sheetId === 2 &&
                    rule.range.startColumnIndex === 52 &&
                    rule.range.endColumnIndex === 53
            )?.rule?.condition
        ).toStrictEqual({
            type: "NUMBER_BETWEEN",
            values: [{ userEnteredValue: "-58" }, { userEnteredValue: "212" }],
        });

        const methods = rules
            .find(
                (rule) =>
                    rule.range.sheetId === 0 &&
                    rule.range.startColumnIndex === 34
            )
            ?.rule?.condition.values?.map((value) => value.userEnteredValue);

        expect(methods).toStrictEqual([
            "Scale",
            "Thermometer",
            "IR thermometer",
            "VPD meter",
            "Leaf temperature + air/RH",
        ]);
    });

    it("extends read-only projection/error scanning and filtering without replaying ledger sorting", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const plan = buildLeafVpdMigrationRequests(snapshot, schema);
        const filterRequest = plan.prepareRequests.find(
            (request) => "setBasicFilter" in request
        );
        const filter =
            /**
             * @type {{
             *     filter: {
             *         criteria: unknown;
             *         range: { endColumnIndex: number };
             *         sortSpecs?: unknown;
             *     };
             * }}
             */ (filterRequest?.["setBasicFilter"]);

        expect(filter.filter.range.endColumnIndex).toBe(67);
        expect(filter.filter.criteria).toStrictEqual({
            2: { hiddenValues: ["Removed"] },
        });
        expect(filter.filter.sortSpecs).toBeUndefined();

        const formulas = JSON.stringify(plan.formulaRequests);

        expect(formulas).toContain("History!A2:BO5000");
        expect(formulas).toContain("SEQUENCE(1,66,2,1)");
        expect(formulas).toContain("History!BI2:BO5000");
        expect(formulas).toContain("'History view'!BI1:BO5000");

        const bulkRule = required(
            plan.prepareRequests.find((request) => {
                const validation =
                    /**
                     * @type {{
                     *           range?: {
                     *               sheetId?: number;
                     *               startColumnIndex?: number;
                     *           };
                     *       }
                     *     | undefined}
                     */ (request["setDataValidation"]);
                return (
                    validation?.range?.sheetId === 3 &&
                    validation.range.startColumnIndex === 3
                );
            })
        );

        expect(JSON.stringify(bulkRule)).not.toContain("Support");
        expect(JSON.stringify(bulkRule)).not.toContain("Leaf VPD");
    });

    it("refuses schema replay, renamed old columns, formula drift, partial validation reads and mixed validation rules", () => {
        expect.hasAssertions();

        const data = fixture();
        required(
            data.snapshot.metadata.sheets[0]
        ).properties.gridProperties.columnCount = 67;

        expect(() =>
            buildLeafVpdMigrationRequests(data.snapshot, data.schema)
        ).toThrow("schema drift or migration already installed");

        const renamed = fixture();
        required(
            renamed.snapshot.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.column === 59 &&
                    cell.row === 0
            )
        ).value.stringValue = "Leaf details";

        expect(() =>
            buildLeafVpdMigrationRequests(renamed.snapshot, renamed.schema)
        ).toThrow("header drift");

        const formula = fixture();
        required(
            formula.snapshot.cells.find((cell) => cell.sheet === "History view")
        ).value.formulaValue = "=History!A1:BH10";

        expect(() =>
            buildLeafVpdMigrationRequests(formula.snapshot, formula.schema)
        ).toThrow("History view formula drift");

        const partial = fixture();
        required(
            partial.snapshot.readRanges.find(
                (range) => range.sheet === "App bulk"
            )
        ).endRow = 2;

        expect(() =>
            buildLeafVpdMigrationRequests(partial.snapshot, partial.schema)
        ).toThrow("Missing complete captured range");

        const mixed = fixture();
        required(
            mixed.snapshot.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.row === 10 &&
                    cell.column === 34
            )
        ).dataValidation = {
            condition: {
                type: "NUMBER_GREATER",
                values: [{ userEnteredValue: "0" }],
            },
        };

        expect(() =>
            buildLeafVpdMigrationRequests(mixed.snapshot, mixed.schema)
        ).toThrow("measurement-method validation drift");
    });

    it("invalidates a prepared plan after a queued entry, validation, filter or protection changes", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const plan = buildLeafVpdMigrationRequests(snapshot, schema);
        const altered = structuredClone(snapshot);
        required(
            altered.cells.find(
                (cell) => cell.sheet === "App entries" && cell.row === 1
            )
        ).value.stringValue = "Leaf VPD";

        expect(() => {
            assertLeafVpdMigrationPreconditions(plan, altered);
        }).toThrow("Workbook drift");

        const protections = structuredClone(snapshot);
        required(required(protections.metadata.sheets[0]).protectedRanges)[0] =
            {
                protectedRangeId: 100,
                range: { sheetId: 0 },
                warningOnly: false,
            };

        expect(() => {
            assertLeafVpdMigrationPreconditions(plan, protections);
        }).toThrow("Workbook drift");
    });
});
