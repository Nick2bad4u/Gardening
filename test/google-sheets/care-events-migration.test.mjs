import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    assertCareEventsMigrationPreconditions,
    buildCareEventsMigrationRequests,
} from "../../scripts/google-sheets/care-events-migration.mjs";
import palette from "../../scripts/google-sheets/plant-colors.json" with { type: "json" };
import { required } from "../helpers/required.mjs";

const source = readFileSync(
    new URL("../../scripts/google-sheets/plant-tracker.gs", import.meta.url),
    "utf8"
);
const schema =
    /** @type {import("../../scripts/google-sheets/care-events-migration.mjs").CareEventsSchema} */ (
        vm.runInNewContext(
            `${source}\nJSON.parse(JSON.stringify({history:[...HISTORY_HEADERS,"Plant / planter","Trend anchor","Days after anchor",GARDEN_LOGGER.requestIdHeader,...HISTORY_DETAIL_HEADERS,...HISTORY_PROVENANCE_HEADERS,...HISTORY_MEASUREMENT_HEADERS,...HISTORY_ROTATION_HEADERS,...HISTORY_WATER_HEADERS,...HISTORY_HUMIDITY_HEADERS,...HISTORY_LIGHT_HEADERS,...HISTORY_CARE_HEADERS],entries:APP_SHEET_ENTRY_HEADERS,bulk:APP_SHEET_BULK_HEADERS}))`
        )
    );

/** @returns {import("../../scripts/google-sheets/care-events-migration.mjs").CareEventsSnapshot} */
function fixture() {
    const sheets = [
        { columns: 45, headers: schema.history, rows: 5000, title: "History" },
        {
            columns: 37,
            headers: schema.entries,
            rows: 5000,
            title: "App entries",
        },
        { columns: 62, headers: schema.bulk, rows: 5000, title: "App bulk" },
        { columns: 10, headers: [], rows: 5188, title: "Light & humidity" },
        { columns: 18, headers: [], rows: 5000, title: "Environment data" },
        { columns: 10, headers: [], rows: 414, title: "Integrity" },
        {
            columns: 45,
            headers: [],
            rows: 5000,
            title: "History view",
        },
    ];
    return {
        cells: [
            {
                column: 34,
                dataValidation: {
                    condition: {
                        type: "ONE_OF_LIST",
                        values: [{ userEnteredValue: "Scale" }],
                    },
                    strict: true,
                },
                row: 1,
                sheet: "History",
                value: {},
            },
            {
                column: 3,
                dataValidation: {
                    condition: {
                        type: "ONE_OF_LIST",
                        values: [{ userEnteredValue: "Water" }],
                    },
                    strict: true,
                },
                row: 1,
                sheet: "App bulk",
                value: {},
            },
            {
                column: 0,
                row: 0,
                sheet: "History view",
                value: {
                    formulaValue:
                        '=LET(rows,SORT(FILTER(History!A2:AS5000,History!A2:A5000<>""),1,FALSE,10,FALSE),fmt,LAMBDA(d,IF(d="","",IF(MOD(d,1)=0,TEXT(d,"M/d/yyyy"),TEXT(d,"M/d/yyyy h:mm AM/PM")))),VSTACK(History!A1:AS1,HSTACK(MAP(CHOOSECOLS(rows,1),fmt),CHOOSECOLS(rows,SEQUENCE(1,44,2,1)))))',
                },
            },
            ...sheets.flatMap(({ columns, headers, title }) =>
                headers.slice(0, columns).map((stringValue, column) => ({
                    column,
                    row: 0,
                    sheet: title,
                    value: { stringValue },
                }))
            ),
            ...palette.map(({ id }, index) => ({
                column: 0,
                row: 7 + index,
                sheet: "Light & humidity",
                value: { stringValue: id },
            })),
            {
                column: 0,
                row: 0,
                sheet: "Environment data",
                value: {
                    formulaValue:
                        "=GARDEN_ENVIRONMENT_READINGS(History!A2:AS5000)",
                },
            },
            {
                column: 0,
                row: 189,
                sheet: "Light & humidity",
                value: {
                    formulaValue:
                        "=IFNA(FILTER('Environment data'!A2:J5000,'Environment data'!B2:B5000=$B$116),\"\")",
                },
            },
            {
                column: 0,
                row: 115,
                sheet: "Light & humidity",
                value: { stringValue: "Selected plant" },
            },
            {
                column: 1,
                row: 11,
                sheet: "Integrity",
                value: {
                    formulaValue:
                        "=SUM(ARRAYFORMULA(N(ISERROR(History!AQ2:AS5000))),ARRAYFORMULA(N(ISERROR('Environment data'!M1:R5000))))",
                },
            },
        ],
        metadata: {
            sheets: sheets.map(({ columns, rows, title }, index) => ({
                properties: {
                    gridProperties: { columnCount: columns, rowCount: rows },
                    sheetId: index + 1,
                    title,
                },
                ...(index === 0 && {
                    basicFilter: {
                        criteria: { 2: { hiddenValues: ["Other"] } },
                        range: {
                            endColumnIndex: 45,
                            endRowIndex: 5000,
                            sheetId: 1,
                            startColumnIndex: 0,
                            startRowIndex: 0,
                        },
                        sortSpecs: [
                            {
                                dimensionIndex: 0,
                                sortOrder: "DESCENDING",
                            },
                        ],
                    },
                }),
            })),
        },
        readBounds: Object.fromEntries(
            sheets.map(({ columns, rows, title }) => [
                title,
                { columnCount: columns, rowCount: rows },
            ])
        ),
    };
}

describe("care event workbook migration", () => {
    it("matches the maintained installer native validation rules for every appended care field", () => {
        expect.hasAssertions();

        /** @type {unknown} */
        const nativeResult = vm.runInNewContext(`${source}
            const installed = {};
            const SpreadsheetApp = {
                newDataValidation() {
                    let condition;
                    return {
                        requireValueInList(values) { condition = {type: "ONE_OF_LIST", values}; return this; },
                        requireNumberGreaterThan(value) { condition = {type: "NUMBER_GREATER", values: [String(value)]}; return this; },
                        requireNumberGreaterThanOrEqualTo(value) { condition = {type: "NUMBER_GREATER_THAN_EQ", values: [String(value)]}; return this; },
                        setAllowInvalid(value) { if (value !== false) throw Error("Native validation must remain strict"); return this; },
                        build() { return condition; },
                    };
                },
            };
            for (const [name, headers] of Object.entries(${JSON.stringify(schema)})) {
                const rules = new Map();
                const sheet = {
                    getMaxRows() { return 5000; },
                    getMaxColumns() { return 60; },
                    getRange(row, column, height, width) {
                        return {
                            getDisplayValues() { return [headers.slice(column - 1, column - 1 + width)]; },
                            clearDataValidations() { return this; },
                            setDataValidation(rule) { rules.set(column - 1, {column: column - 1, ...rule}); return this; },
                            setNumberFormat() { return this; },
                        };
                    },
                };
                if (name === "history") ensureHistoryCareColumns_(sheet, true);
                else configureCareColumns_(sheet, headers);
                installed[name] = [...rules.values()].sort((a,b) => a.column - b.column);
            }
            JSON.stringify(installed);
        `);
        const native =
            /**
             * @type {Record<
             *     string,
             *     { column: number; type: string; values: string[] }[]
             * >}
             */ (JSON.parse(String(nativeResult)));
        const requests =
            /**
             * @type {{
             *     setDataValidation?: {
             *         range: { sheetId: number; startColumnIndex: number };
             *         rule?: {
             *             condition: {
             *                 type: string;
             *                 values: { userEnteredValue: string }[];
             *             };
             *             strict: boolean;
             *         };
             *     };
             * }[]}
             */ (
                buildCareEventsMigrationRequests(fixture(), schema)
                    .prepareRequests
            );
        for (const [
            name,
            sheetId,
            start,
        ] of /** @type {const} */ ([
            [
                "history",
                1,
                45,
            ],
            [
                "entries",
                2,
                37,
            ],
            [
                "bulk",
                3,
                62,
            ],
        ])) {
            const rules = requests
                .map((request) => request.setDataValidation)
                .filter((entry) => entry !== undefined)
                .filter(
                    (entry) =>
                        entry.range.sheetId === sheetId &&
                        entry.range.startColumnIndex >= start &&
                        entry.rule !== undefined
                );
            const actual = rules
                .map((entry) => ({
                    column: entry.range.startColumnIndex,
                    type: required(entry.rule).condition.type,
                    values: required(entry.rule).condition.values.map(
                        (value) => value.userEnteredValue
                    ),
                }))
                .toSorted((a, b) => a.column - b.column);

            expect(actual).toStrictEqual(native[name]);
            expect(rules.every((entry) => entry.rule?.strict === true)).toBe(
                true
            );
        }
    });

    it("clears inherited validation only on appended columns before applying their intended rules", () => {
        expect.hasAssertions();

        const requests =
            /**
             * @type {{
             *     setDataValidation?: {
             *         range: {
             *             sheetId: number;
             *             startColumnIndex: number;
             *             endColumnIndex: number;
             *         };
             *         rule?: { condition: { type: string } };
             *     };
             * }[]}
             */ (
                buildCareEventsMigrationRequests(fixture(), schema)
                    .prepareRequests
            );
        for (const [
            sheetId,
            first,
            end,
        ] of /** @type {const} */ ([
            [
                1,
                45,
                60,
            ],
            [
                2,
                37,
                52,
            ],
            [
                3,
                62,
                74,
            ],
        ])) {
            const changes = requests
                .map((request) => request.setDataValidation)
                .filter((change) => change !== undefined)
                .filter(
                    (change) =>
                        change.range.sheetId === sheetId &&
                        change.range.startColumnIndex >= first
                );

            expect(changes[0]).toStrictEqual({
                range: {
                    endColumnIndex: end,
                    sheetId,
                    startColumnIndex: first,
                    startRowIndex: 1,
                },
            });
            expect(
                changes.slice(1).every((change) => change.rule !== undefined)
            ).toBe(true);
            expect(
                changes
                    .slice(1)
                    .some((change) => change.range.startColumnIndex === first)
            ).toBe(false);
            expect(changes[1]?.rule?.condition.type).toBe("NUMBER_GREATER");
        }
    });

    it("requires positive mist amounts without imposing that restriction on temperatures", () => {
        expect.hasAssertions();

        const requests = buildCareEventsMigrationRequests(
            fixture(),
            schema
        ).prepareRequests;
        const validations = requests.filter(
            (request) => "setDataValidation" in request
        );
        const serialized = JSON.stringify(validations);

        expect(serialized).toContain('"type":"NUMBER_GREATER"');
        expect(serialized).toContain('"userEnteredValue":"-273.15"');
        expect(serialized).toContain('"userEnteredValue":"-459.67"');
        expect(serialized).toContain('"startColumnIndex":50');
    });

    it("refuses custom existing validation and preserves gaps between validated rows", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const rule = required(
            snapshot.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.column === 34 &&
                    cell.row === 1
            )
        );
        snapshot.cells.push({ ...structuredClone(rule), row: 3 });
        const text = JSON.stringify(
            buildCareEventsMigrationRequests(snapshot, schema).prepareRequests
        );

        expect(text).toContain('"endRowIndex":2');
        expect(text).toContain('"endRowIndex":4');

        snapshot.cells.push({
            ...structuredClone(rule),
            dataValidation: {
                condition: {
                    type: "ONE_OF_LIST",
                    values: [{ userEnteredValue: "Owner rule" }],
                },
            },
            row: 4,
        });

        expect(() =>
            buildCareEventsMigrationRequests(snapshot, schema)
        ).toThrow("custom validation drift");
    });

    it("extends schemas without overwriting observations, retains filter criteria, and never replays ledger sorting", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const plan = buildCareEventsMigrationRequests(snapshot, schema);
        const text = JSON.stringify(plan);

        expect(snapshot).toStrictEqual(before);
        expect(text).not.toContain("sortSpecs");
        expect(text).toContain('"hiddenValues":["Other"]');
        expect(text).not.toContain("deleteDimension");
        expect(text).not.toContain("deleteSheet");
        expect(text).not.toContain("updateChartSpec");
        expect(plan.verification).toMatchObject({
            bulkWidth: 74,
            entriesWidth: 52,
            historyWidth: 60,
        });
        expect(
            plan.formulaRequests.every(
                (request) => request.updateCells.start.sheetId >= 4
            )
        ).toBe(true);
    });

    it("keeps temperature dates and targets separate and preserves negative and zero native chart values", () => {
        expect.hasAssertions();

        const plan = buildCareEventsMigrationRequests(fixture(), schema);
        const text = JSON.stringify(plan);

        expect(plan.chartRequests).toHaveLength(4);
        expect(text).toContain("Air temperature (°C)");
        expect(text).toContain("Soil temperature (°C)");
        expect(text).not.toContain("viewWindowMin");
        expect(text).not.toContain("NOW()");
        expect(text).toContain("GARDEN_RECORDED_LOCATIONS(History!A2:BH5000)");
        expect(text).toContain("ISNUMBER('Environment data'!$K$2:$K$5000)");
        expect(text).toContain("ISNUMBER('Environment data'!$L$2:$L$5000)");
        expect(text).toContain("History!AT2:BH5000");
        expect(text).toContain("'Environment data'!S1:AA5000");
    });

    it("rejects historical header/schema drift and replay", () => {
        expect.hasAssertions();

        const header = fixture();
        required(
            header.cells.find(
                (cell) =>
                    cell.sheet === "History" &&
                    cell.row === 0 &&
                    cell.column === 0
            )
        ).value = { stringValue: "Changed" };

        expect(() => buildCareEventsMigrationRequests(header, schema)).toThrow(
            "header drift"
        );

        const replay = fixture();
        required(
            replay.metadata.sheets[0]
        ).properties.gridProperties.columnCount = 60;

        expect(() => buildCareEventsMigrationRequests(replay, schema)).toThrow(
            "already installed"
        );

        const badSchema = { ...schema, history: schema.history.slice(0, 59) };

        expect(() =>
            buildCareEventsMigrationRequests(fixture(), badSchema)
        ).toThrow("schema drift");
    });

    it("rejects occupied destinations and incomplete reads", () => {
        expect.hasAssertions();

        const occupied = fixture();
        occupied.cells.push({
            column: 10,
            row: 15,
            sheet: "Environment data",
            value: { stringValue: "Owner content" },
        });

        expect(() =>
            buildCareEventsMigrationRequests(occupied, schema)
        ).toThrow("Occupied");

        const incomplete = fixture();
        incomplete.readBounds["Environment data"] = {
            columnCount: 18,
            rowCount: 100,
        };

        expect(() =>
            buildCareEventsMigrationRequests(incomplete, schema)
        ).toThrow("Complete");
    });

    it("rejects formula anchors, inventory, filter or chart-ID changes", () => {
        expect.hasAssertions();

        const anchor = fixture();
        required(
            anchor.cells.find((cell) => cell.sheet === "Environment data")
        ).value = { formulaValue: "=1" };

        expect(() => buildCareEventsMigrationRequests(anchor, schema)).toThrow(
            "anchor formula drift"
        );

        const inventory = fixture();
        required(
            inventory.cells.find(
                (cell) => cell.sheet === "Light & humidity" && cell.row === 7
            )
        ).value = { stringValue: "P99" };

        expect(() =>
            buildCareEventsMigrationRequests(inventory, schema)
        ).toThrow("inventory drift");

        const filter = fixture();
        required(
            required(filter.metadata.sheets[0]).basicFilter
        ).range.endColumnIndex = 44;

        expect(() => buildCareEventsMigrationRequests(filter, schema)).toThrow(
            "filter range drift"
        );

        const charts = fixture();
        required(charts.metadata.sheets[3]).charts = [
            {
                chartId: 907_202_619,
                spec: {
                    basicChart: { axis: [], domains: [], series: [] },
                    title: "Existing",
                },
            },
        ];

        expect(() => buildCareEventsMigrationRequests(charts, schema)).toThrow(
            "occupied"
        );
    });

    it("rechecks every captured native value and metadata before mutation", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const plan = buildCareEventsMigrationRequests(snapshot, schema);

        expect(() => {
            assertCareEventsMigrationPreconditions(plan, snapshot);
        }).not.toThrow();

        snapshot.cells.push({
            column: 8,
            row: 1920,
            sheet: "History",
            value: { stringValue: "New observation" },
        });

        expect(() => {
            assertCareEventsMigrationPreconditions(plan, snapshot);
        }).toThrow("drift");
    });
});
