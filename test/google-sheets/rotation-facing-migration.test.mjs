import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    assertRotationFacingMigrationPreconditions,
    buildRotationDegreeValidationRequests,
    buildRotationFacingMigrationRequests,
} from "../../scripts/google-sheets/rotation-facing-migration.mjs";
import { required, stringArray } from "../helpers/required.mjs";

const viewFormula =
    '=LET(rows,SORT(FILTER(History!A2:BO50001,History!A2:A50001<>""),1,FALSE,10,FALSE),fmt,LAMBDA(d,IF(d="","",IF(MOD(d,1)=0,TEXT(d,"M/d/yyyy"),TEXT(d,"M/d/yyyy h:mm AM/PM")))),VSTACK(History!A1:BO1,HSTACK(MAP(CHOOSECOLS(rows,1),fmt),CHOOSECOLS(rows,SEQUENCE(1,66,2,1)))))';
const scanFormula =
    "=SUM(ARRAYFORMULA(N(ISERROR(History!BI2:BO50001))),SUM(ARRAYFORMULA(N(ISERROR('History view'!BI1:BO50001)))),SUM(ARRAYFORMULA(N(ISERROR('P09 Monk''s hood cactus'!A1:V5000)))))";
const anchorFormula = `=SUM(IFERROR(SUM(N(IFERROR(FORMULATEXT('History view'!A1),"")<>"${viewFormula.replaceAll('"', '""')}"),N(1<>1)),1))`;

function fixture() {
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
                    `JSON.stringify({history:[...HISTORY_HEADERS,"Plant / planter","Trend anchor","Days after anchor",GARDEN_LOGGER.requestIdHeader,...HISTORY_DETAIL_HEADERS,...HISTORY_PROVENANCE_HEADERS,...HISTORY_MEASUREMENT_HEADERS,...HISTORY_ROTATION_HEADERS,...HISTORY_WATER_HEADERS,...HISTORY_HUMIDITY_HEADERS,...HISTORY_LIGHT_HEADERS,...HISTORY_CARE_HEADERS,...HISTORY_ROTATION_FACING_HEADERS],entries:[...APP_SHEET_ENTRY_HEADERS],bulk:[...APP_SHEET_BULK_HEADERS]})`,
                    context
                )
            )
        )
    );
    const schema = {
        bulk: stringArray(parsed["bulk"]),
        entries: stringArray(parsed["entries"]),
        history: stringArray(parsed["history"]),
    };
    const specs = [
        {
            columns: 67,
            headers: schema.history,
            rows: 50_001,
            title: "History",
        },
        {
            columns: 67,
            headers: schema.history,
            rows: 50_001,
            title: "History view",
        },
        {
            columns: 59,
            headers: schema.entries,
            rows: 1000,
            title: "App entries",
        },
        { columns: 77, headers: schema.bulk, rows: 1000, title: "App bulk" },
        { columns: 10, headers: [], rows: 414, title: "Integrity" },
    ];
    /** @type {import("../../types/rotation-facing-migration.d.ts").RotationFacingSnapshot} */
    const snapshot = {
        cells: [],
        metadata: {
            sheets: specs.map(({ columns, rows, title }, sheetId) => ({
                charts: [],
                properties: {
                    gridProperties: { columnCount: columns, rowCount: rows },
                    sheetId,
                    title,
                },
                protectedRanges: [
                    {
                        protectedRangeId: sheetId + 10,
                        range: { sheetId },
                        warningOnly: true,
                    },
                ],
            })),
        },
        metadataComplete: true,
        readRanges: specs.map(({ columns, rows, title }) => ({
            endColumn: columns,
            endRow: rows,
            sheet: title,
            startColumn: 0,
            startRow: 0,
        })),
    };
    for (const { columns, headers, title } of specs)
        for (const [column, stringValue] of headers.slice(0, columns).entries())
            snapshot.cells.push({
                column,
                effectiveValue: { stringValue },
                row: 0,
                sheet: title,
                value:
                    title === "History view"
                        ? column === 0
                            ? { formulaValue: viewFormula }
                            : {}
                        : { stringValue },
            });
    snapshot.cells.push(
        {
            column: 1,
            row: 11,
            sheet: "Integrity",
            value: { formulaValue: scanFormula },
        },
        {
            column: 5,
            row: 4,
            sheet: "Integrity",
            value: { formulaValue: anchorFormula },
        },
        {
            column: 39,
            dataValidation: {
                condition: {
                    type: "NUMBER_BETWEEN",
                    values: [
                        { userEnteredValue: "1" },
                        { userEnteredValue: "360" },
                    ],
                },
                strict: true,
            },
            note: "Original rotation",
            row: 1,
            sheet: "History",
            value: { numberValue: 90 },
        },
        { column: 76, row: 1, sheet: "App bulk", value: { numberValue: 123 } }
    );
    required(
        snapshot.cells.find(
            (cell) =>
                cell.sheet === "History" && cell.row === 0 && cell.column === 39
        )
    ).note =
        "Clockwise-equivalent rotation recorded in degrees. The logger defaults a Rotation event to 90°.";
    const degreeRule = required(
        required(
            snapshot.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.row === 1 &&
                    cell.column === 39
            )
        ).dataValidation
    );
    for (let row = 2; row < 50_001; row += 1)
        snapshot.cells.push({
            column: 39,
            dataValidation: degreeRule,
            row,
            sheet: "History",
            value: {},
        });
    required(snapshot.metadata.sheets[0]).basicFilter = {
        criteria: { 2: { hiddenValues: ["Removed"] } },
        filterSpecs: [
            { columnIndex: 2, filterCriteria: { hiddenValues: ["Removed"] } },
        ],
        range: {
            endColumnIndex: 67,
            endRowIndex: 50_001,
            sheetId: 0,
            startColumnIndex: 0,
            startRowIndex: 0,
        },
        sortSpecs: [{ dimensionIndex: 0, sortOrder: "DESCENDING" }],
    };
    return { schema, snapshot };
}

describe("append-only cardinal rotation migration", () => {
    it("repairs only the existing strict degree validation and its guarded header note on old and migrated grids", () => {
        expect.hasAssertions();

        const { snapshot } = fixture();
        const before = structuredClone(snapshot);
        const plan = buildRotationDegreeValidationRequests(snapshot);

        expect(snapshot).toStrictEqual(before);
        expect(plan.requests).toStrictEqual([
            {
                setDataValidation: {
                    range: {
                        endColumnIndex: 40,
                        endRowIndex: 50_001,
                        sheetId: 0,
                        startColumnIndex: 39,
                        startRowIndex: 1,
                    },
                    rule: {
                        condition: {
                            type: "NUMBER_BETWEEN",
                            values: [
                                { userEnteredValue: "0" },
                                { userEnteredValue: "360" },
                            ],
                        },
                        strict: true,
                    },
                },
            },
            {
                repeatCell: {
                    cell: {
                        note: "Clockwise-equivalent degrees. Cardinal endpoints determine this value; an unknown origin leaves it blank and matching endpoints record 0. Legacy degree-only entries default to 90°.",
                    },
                    fields: "note",
                    range: {
                        endColumnIndex: 40,
                        endRowIndex: 1,
                        sheetId: 0,
                        startColumnIndex: 39,
                        startRowIndex: 0,
                    },
                },
            },
        ]);

        required(
            snapshot.metadata.sheets[0]
        ).properties.gridProperties.columnCount = 69;

        expect(
            buildRotationDegreeValidationRequests(snapshot).requests
        ).toStrictEqual(plan.requests);
        expect(JSON.stringify(plan.requests)).not.toContain("updateCells");
    });

    it("rejects incomplete or mixed degree validation, zero-rule replay, changed notes and shortened capture bounds", () => {
        expect.hasAssertions();

        const { snapshot } = fixture();
        const partial = structuredClone(snapshot);
        partial.cells = partial.cells.filter(
            (cell) =>
                cell.sheet !== "History" ||
                cell.row !== 50_000 ||
                cell.column !== 39
        );

        expect(() => buildRotationDegreeValidationRequests(partial)).toThrow(
            "incomplete capture"
        );

        const mixed = structuredClone(snapshot);
        const last = required(
            mixed.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.row === 50_000 &&
                    cell.column === 39
            )
        );
        last.dataValidation = {
            condition: {
                type: "NUMBER_BETWEEN",
                values: [
                    { userEnteredValue: "0" },
                    { userEnteredValue: "360" },
                ],
            },
            strict: true,
        };

        expect(() => buildRotationDegreeValidationRequests(mixed)).toThrow(
            "validation drift"
        );

        const replay = structuredClone(snapshot);
        for (const cell of replay.cells) {
            if (cell.sheet === "History" && cell.column === 39 && cell.row >= 1)
                cell.dataValidation = last.dataValidation;
        }

        expect(() => buildRotationDegreeValidationRequests(replay)).toThrow(
            "replay"
        );

        const note = structuredClone(snapshot);
        required(
            note.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.row === 0 &&
                    cell.column === 39
            )
        ).note = "Changed note";

        expect(() => buildRotationDegreeValidationRequests(note)).toThrow(
            "header/note drift"
        );

        const bounded = structuredClone(snapshot);
        required(
            bounded.readRanges.find((range) => range.sheet === "History")
        ).endRow = 50_000;

        expect(() => buildRotationDegreeValidationRequests(bounded)).toThrow(
            "Missing complete captured range"
        );
    });

    it("preserves existing values while updating new columns, degree metadata and three guarded formula anchors", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const before = structuredClone(snapshot);
        const plan = buildRotationFacingMigrationRequests(snapshot, schema);

        expect(snapshot).toStrictEqual(before);

        const requests =
            /** @type {import("../workbook-fixtures.d.ts").WorkbookRequest[]} */ (
                plan.prepareRequests
            );

        expect(
            requests
                .filter((request) => request.appendDimension !== undefined)
                .map((request) => request.appendDimension)
        ).toStrictEqual(
            [
                0,
                1,
                2,
                3,
            ].map((sheetId) => ({
                dimension: "COLUMNS",
                length: 2,
                sheetId,
            }))
        );
        expect(
            requests
                .filter((request) => request.updateCells !== undefined)
                .map((request) => request.updateCells?.start)
        ).toStrictEqual([
            { columnIndex: 67, rowIndex: 0, sheetId: 0 },
            { columnIndex: 59, rowIndex: 0, sheetId: 2 },
            { columnIndex: 77, rowIndex: 0, sheetId: 3 },
        ]);

        const formatRanges = requests
            .filter(
                (request) =>
                    request.repeatCell?.fields.includes("userEnteredFormat") ===
                    true
            )
            .map((request) => required(request.repeatCell).range);
        for (const range of formatRanges) {
            expect(range.startColumnIndex).toBeGreaterThanOrEqual(
                [
                    67,
                    67,
                    59,
                    77,
                ][range.sheetId ?? 0] ?? 999
            );
        }

        expect(plan.formulaRequests).toHaveLength(3);
        expect(JSON.stringify(plan)).not.toMatch(
            /clear|deletedimension|sortrange|updatechartspec|updateprotectedrange/iv
        );
        expect(() => {
            assertRotationFacingMigrationPreconditions(
                plan,
                structuredClone(snapshot)
            );
        }).not.toThrow();
    });

    it("clears inherited validation only in new columns and applies strict blank-compatible cardinal lists", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const plan = buildRotationFacingMigrationRequests(snapshot, schema);
        const rules = plan.prepareRequests
            .filter((request) => "setDataValidation" in request)
            .map(
                (request) =>
                    /**
                     * @type {{
                     *     range: import("../workbook-fixtures.d.ts").GridRange;
                     *     rule?: import("../../types/leaf-vpd-migration.d.ts").LeafVpdValidation;
                     * }}
                     */ (request["setDataValidation"])
            );

        expect(
            rules
                .filter((rule) => !rule.rule)
                .map((rule) => [
                    rule.range.sheetId,
                    rule.range.startRowIndex,
                    rule.range.startColumnIndex,
                    rule.range.endColumnIndex,
                ])
        ).toStrictEqual([
            [
                0,
                0,
                67,
                69,
            ],
            [
                1,
                0,
                67,
                69,
            ],
            [
                2,
                0,
                59,
                61,
            ],
            [
                3,
                0,
                77,
                79,
            ],
        ]);
        expect(
            rules
                .filter((rule) => rule.rule?.condition.type === "ONE_OF_LIST")
                .map((rule) => [
                    rule.range.sheetId,
                    rule.range.startColumnIndex,
                    rule.range.endColumnIndex,
                ])
        ).toStrictEqual([
            [
                0,
                67,
                69,
            ],
            [
                2,
                59,
                61,
            ],
            [
                3,
                77,
                78,
            ],
        ]);

        const cardinalRules = rules.filter(
            (item) => item.rule?.condition.type === "ONE_OF_LIST"
        );
        for (const { rule } of cardinalRules)
            expect(rule).toStrictEqual({
                condition: {
                    type: "ONE_OF_LIST",
                    values: [
                        "N",
                        "E",
                        "S",
                        "W",
                    ].map((userEnteredValue) => ({
                        userEnteredValue,
                    })),
                },
                showCustomUi: true,
                strict: true,
            });

        expect(JSON.stringify(plan.prepareRequests)).toContain(
            "Bridge-owned JSON snapshot"
        );
    });

    it("preserves filter criteria without sorting and extends full-capacity formulas without changing other anchors", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const plan = buildRotationFacingMigrationRequests(snapshot, schema);
        const filterRequest =
            /**
             * @type {{
             *     setBasicFilter: {
             *         filter: import("../../types/rotation-facing-migration.d.ts").RotationFacingSnapshot["metadata"]["sheets"][number]["basicFilter"];
             *     };
             * }}
             */ (
                required(
                    plan.prepareRequests.find(
                        (request) => "setBasicFilter" in request
                    )
                )
            );
        const filter = required(filterRequest.setBasicFilter.filter);

        expect(filter.sortSpecs).toBeUndefined();
        expect(filter.criteria).toStrictEqual(
            required(snapshot.metadata.sheets[0]).basicFilter?.criteria
        );
        expect(filter.filterSpecs).toStrictEqual(
            required(snapshot.metadata.sheets[0]).basicFilter?.filterSpecs
        );
        expect(filter.range.endColumnIndex).toBe(69);

        const formulas =
            /** @type {import("../workbook-fixtures.d.ts").WorkbookRequest[]} */ (
                plan.formulaRequests
            );
        const values = formulas.map(
            (request) =>
                request.updateCells?.rows[0]?.values[0]?.userEnteredValue
                    .formulaValue
        );

        expect(values[0]).toBe(
            viewFormula
                .replaceAll("BO", "BQ")
                .replace("SEQUENCE(1,66", "SEQUENCE(1,68")
        );
        expect(values[1]).toBe(
            `${scanFormula.slice(0, -1)},SUM(ARRAYFORMULA(N(ISERROR(History!BP2:BQ50001)))),SUM(ARRAYFORMULA(N(ISERROR('History view'!BP1:BQ50001)))))`
        );
        expect(values[2]).toBe(
            anchorFormula
                .replaceAll("BO", "BQ")
                .replace("SEQUENCE(1,66", "SEQUENCE(1,68")
        );
    });

    it("rejects replay, occupied destinations, exact-header drift and incomplete metadata or range captures", () => {
        expect.hasAssertions();

        for (const index of [
            0,
            1,
            2,
            3,
        ]) {
            const { schema, snapshot } = fixture();
            required(
                snapshot.metadata.sheets[index]
            ).properties.gridProperties.columnCount += 2;

            expect(() =>
                buildRotationFacingMigrationRequests(snapshot, schema)
            ).toThrow("schema drift");
        }
        const occupied = fixture();
        occupied.snapshot.cells.push({
            column: 67,
            row: 1,
            sheet: "History",
            value: { stringValue: "N" },
        });

        expect(() =>
            buildRotationFacingMigrationRequests(
                occupied.snapshot,
                occupied.schema
            )
        ).toThrow("occupied destination");

        const renamed = fixture();
        required(renamed.snapshot.cells[0]).value.stringValue = "Date ";

        expect(() =>
            buildRotationFacingMigrationRequests(
                renamed.snapshot,
                renamed.schema
            )
        ).toThrow("header drift");

        const missing = fixture();
        missing.snapshot.readRanges = missing.snapshot.readRanges.filter(
            (range) => range.sheet !== "Integrity"
        );

        expect(() =>
            buildRotationFacingMigrationRequests(
                missing.snapshot,
                missing.schema
            )
        ).toThrow("Missing complete captured range");

        const metadata = fixture();
        Reflect.deleteProperty(metadata.snapshot, "metadataComplete");

        expect(() =>
            buildRotationFacingMigrationRequests(
                metadata.snapshot,
                metadata.schema
            )
        ).toThrow("full native metadata");
    });

    it("rejects truncated projection/scan capacity, altered formula anchors and source schema suffix drift", () => {
        expect.hasAssertions();

        for (const [
            sheet,
            row,
            column,
        ] of /** @type {[string, number, number][]} */ ([
            [
                "History view",
                0,
                0,
            ],
            [
                "Integrity",
                11,
                1,
            ],
            [
                "Integrity",
                4,
                5,
            ],
        ])) {
            const { schema, snapshot } = fixture();
            const cell = required(
                snapshot.cells.find(
                    (item) =>
                        item.sheet === sheet &&
                        item.row === row &&
                        item.column === column
                )
            );
            cell.value.formulaValue = required(
                cell.value.formulaValue
            ).replaceAll("50001", "5000");

            expect(() =>
                buildRotationFacingMigrationRequests(snapshot, schema)
            ).toThrow(/drift/v);
        }
        const suffix = fixture();
        suffix.schema.bulk[78] = "Editable facing";

        expect(() =>
            buildRotationFacingMigrationRequests(suffix.snapshot, suffix.schema)
        ).toThrow("maintained append-only rotation schema");
    });

    it("invalidates plans after ledger, notes, validation, filter, chart or protection drift", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const plan = buildRotationFacingMigrationRequests(snapshot, schema);
        const changedCell = structuredClone(snapshot);
        required(
            changedCell.cells.find(
                (cell) => cell.row === 1 && cell.sheet === "History"
            )
        ).note = "Changed";

        expect(() => {
            assertRotationFacingMigrationPreconditions(plan, changedCell);
        }).toThrow("Workbook drift");

        const changedMetadata = structuredClone(snapshot);
        required(
            required(
                required(changedMetadata.metadata.sheets[0]).protectedRanges
            )[0]
        ).warningOnly = false;

        expect(() => {
            assertRotationFacingMigrationPreconditions(plan, changedMetadata);
        }).toThrow("Workbook drift");
    });
});
