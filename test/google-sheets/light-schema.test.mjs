import { describe, expect, it } from "vitest";

import {
    buildLightSchemaRequests,
    lightViewFormula,
    verifyLightSchemaPreconditions,
    verifyLightSchemaReadback,
} from "../../scripts/google-sheets/light-schema.mjs";
import { required } from "../helpers/required.mjs";

function fixture() {
    const schema = {
        entryHeaders: [
            ...Array.from({ length: 34 }, (_, i) => `Entry ${i}`),
            "Relative humidity (%)",
        ],
        historyHeaders: [
            ...Array.from({ length: 42 }, (_, i) => `History ${i}`),
            "Relative humidity (%)",
        ],
    };
    /** @type {import("../../scripts/google-sheets/inventory-expansion.mjs").NativeSnapshot} */
    const snapshot = {
        sheets: [
            [
                "History",
                5000,
                43,
            ],
            [
                "History view",
                5000,
                43,
            ],
            [
                "App entries",
                1000,
                35,
            ],
            [
                "App bulk",
                1000,
                62,
            ],
            [
                "Quick log",
                103,
                15,
            ],
        ].map(
            (
                [
                    title,
                    rowCount,
                    columnCount,
                ],
                index
            ) => ({
                data: [
                    {
                        rowData: Array.from(
                            { length: Number(rowCount) },
                            () => ({
                                values: Array.from(
                                    { length: Number(columnCount) },
                                    () => ({})
                                ),
                            })
                        ),
                    },
                ],
                properties: {
                    gridProperties: {
                        columnCount: Number(columnCount),
                        rowCount: Number(rowCount),
                    },
                    sheetId: index + 1,
                    title: String(title),
                },
            })
        ),
    };
    const sheet = /** @param {number} index */ (index) =>
        required(snapshot.sheets[index]);
    const rows = /** @param {number} index */ (index) =>
        required(sheet(index).data?.[0]?.rowData);
    required(rows(0)[0]).values = schema.historyHeaders.map((stringValue) => ({
        userEnteredValue: { stringValue },
    }));
    required(rows(1)[0]).values = [
        { userEnteredValue: { formulaValue: lightViewFormula(43) } },
    ];
    required(rows(2)[0]).values = schema.entryHeaders.map((stringValue) => ({
        userEnteredValue: { stringValue },
    }));
    for (const row of rows(0).slice(1))
        required(row.values)[34] = {
            dataValidation: listRule([
                "Scale",
                "Ruler",
                "Estimated from photo",
                "Estimated visually",
                "Observed",
                "Other",
                "Unspecified",
                "Hygrometer",
            ]),
        };
    for (const row of rows(3).slice(1))
        required(row.values)[3] = {
            dataValidation: listRule([
                "Water",
                "Weigh",
                "Water + weigh",
                "Rotation",
                "Check",
                "Clean",
                "Prune",
                "Pest",
                "Other",
            ]),
        };
    required(required(rows(4)[2]).values)[1] = {
        dataValidation: listRule([
            "Water",
            "Weigh",
            "Measure",
            "Check",
            "Rotation",
            "Clean",
            "Prune",
            "Other",
            "Clear events",
        ]),
    };
    required(required(rows(0)[1]).values)[0] = {
        userEnteredValue: { stringValue: "Historical evidence" },
    };
    required(required(rows(2)[1]).values)[0] = {
        userEnteredValue: { stringValue: "Queued real draft" },
    };
    sheet(0)["basicFilter"] = {
        criteria: { 35: { hiddenValues: ["Removed"] } },
        range: { endColumnIndex: 42, endRowIndex: 5000, sheetId: 1 },
        sortSpecs: [{ dimensionIndex: 0, sortOrder: "ASCENDING" }],
    };
    sheet(0)["bandedRanges"] = [
        {
            bandedRangeId: 91,
            range: { endColumnIndex: 43, endRowIndex: 5000, sheetId: 1 },
        },
    ];
    sheet(0).charts = [
        {
            chartId: 99,
            spec: { basicChart: { domains: [] }, title: "Preserved chart" },
        },
    ];
    sheet(4)["tables"] = [
        {
            columnProperties: [
                { columnIndex: 0, columnName: "Plant ID", columnType: "TEXT" },
                {
                    columnIndex: 4,
                    columnName: "Event",
                    columnType: "DROPDOWN",
                    dataValidationRule: {
                        condition: listRule([
                            "Water",
                            "Weigh",
                            "Measure",
                            "Check",
                            "Repot",
                            "Flower",
                            "Photo",
                            "Pest",
                            "Other",
                        ]).condition,
                    },
                },
            ],
            name: "QuickCareLog",
            range: {
                endColumnIndex: 15,
                endRowIndex: 40,
                sheetId: 5,
                startColumnIndex: 0,
                startRowIndex: 3,
            },
            tableId: "quick-table",
        },
    ];
    return { rows, schema, sheet, snapshot };
}

/** @param {string[]} values */
function listRule(values) {
    return {
        condition: {
            type: "ONE_OF_LIST",
            values: values.map((userEnteredValue) => ({ userEnteredValue })),
        },
        showCustomUi: true,
        strict: true,
    };
}

function migratedFixture() {
    const { rows, schema, sheet, snapshot } = fixture();
    const before = structuredClone(snapshot);
    const plan = buildLightSchemaRequests(before, schema);
    for (const index of [
        0,
        1,
        2,
    ]) {
        const oldWidth = index === 2 ? 35 : 43;
        sheet(index).properties.gridProperties.columnCount = oldWidth + 2;
        for (const [rowIndex, row] of rows(index).entries()) {
            for (const [offset, label] of [
                "PPFD (µmol/m²/s)",
                "Illuminance (lux)",
            ].entries()) {
                const cell =
                    rowIndex === 0
                        ? index === 1
                            ? {}
                            : { userEnteredValue: { stringValue: label } }
                        : {
                              userEnteredFormat: {
                                  numberFormat: {
                                      pattern: "0.##",
                                      type: "NUMBER",
                                  },
                              },
                              ...(index !== 1 && {
                                  dataValidation: {
                                      condition: {
                                          type: "NUMBER_GREATER_THAN_EQ",
                                          values: [{ userEnteredValue: "0" }],
                                      },
                                      strict: true,
                                  },
                              }),
                          };
                required(row.values)[oldWidth + offset] = cell;
            }
        }
    }
    required(required(rows(1)[0]).values)[0] = {
        userEnteredValue: { formulaValue: lightViewFormula(45) },
    };
    for (const row of rows(0).slice(1))
        required(row.values)[34] = {
            dataValidation: listRule([
                "Scale",
                "Ruler",
                "Estimated from photo",
                "Estimated visually",
                "Observed",
                "Other",
                "Unspecified",
                "Hygrometer",
                "Light app",
                "Lux meter",
            ]),
        };
    for (const row of rows(3).slice(1))
        required(row.values)[3] = {
            dataValidation: listRule([
                "Water",
                "Weigh",
                "Water + weigh",
                "Rotation",
                "Check",
                "Clean",
                "Prune",
                "Pest",
                "Other",
                "Inspect",
            ]),
        };
    required(required(rows(4)[2]).values)[1] = {
        dataValidation: listRule([
            "Water",
            "Weigh",
            "Measure",
            "Check",
            "Rotation",
            "Clean",
            "Prune",
            "Other",
            "Clear events",
            "Inspect",
        ]),
    };
    sheet(0)["basicFilter"] = {
        criteria: { 35: { hiddenValues: ["Removed"] } },
        range: { endColumnIndex: 45, endRowIndex: 5000, sheetId: 1 },
    };
    sheet(0)["bandedRanges"] = [
        {
            bandedRangeId: 91,
            range: { endColumnIndex: 45, endRowIndex: 5000, sheetId: 1 },
        },
    ];
    sheet(4)["tables"] = [
        {
            columnProperties: [
                { columnIndex: 0, columnName: "Plant ID", columnType: "TEXT" },
                {
                    columnIndex: 4,
                    columnName: "Event",
                    columnType: "DROPDOWN",
                    dataValidationRule: {
                        condition: listRule([
                            "Water",
                            "Weigh",
                            "Measure",
                            "Check",
                            "Repot",
                            "Flower",
                            "Photo",
                            "Pest",
                            "Other",
                            "Inspect",
                        ]).condition,
                    },
                },
            ],
            name: "QuickCareLog",
            range: {
                endColumnIndex: 15,
                endRowIndex: 40,
                sheetId: 5,
                startColumnIndex: 0,
                startRowIndex: 3,
            },
            tableId: "quick-table",
        },
    ];
    return { before, plan, rows, sheet, snapshot };
}

describe("guarded light and Inspect workbook migration", () => {
    it("verifies a complete readback", () => {
        expect.hasAssertions();

        const { before, plan, snapshot } = migratedFixture();

        expect(verifyLightSchemaReadback(plan, before, snapshot)).toBe(true);
    });

    it.each([
        "evidence",
        "light value",
        "numeric validation",
        "method enum",
        "typed table",
        "chart",
        "protection",
        "order",
    ])("rejects %s drift in readback", (kind) => {
        expect.hasAssertions();

        const { before, plan, rows, sheet, snapshot } = migratedFixture();
        switch (kind) {
            case "chart": {
                required(sheet(0).charts?.[0]).spec["title"] = "Changed chart";
                break;
            }
            case "evidence": {
                required(required(rows(0)[1]).values)[0] = {
                    userEnteredValue: { stringValue: "Changed evidence" },
                };
                break;
            }
            case "light value": {
                required(required(rows(0)[1]).values)[43] = {
                    userEnteredValue: { numberValue: 0 },
                };
                break;
            }
            case "method enum": {
                const values = required(required(rows(0)[1]).values);
                required(values[34]).dataValidation = listRule(["Scale"]);
                break;
            }
            case "numeric validation": {
                const values = required(required(rows(0)[1]).values);
                required(values[43]).dataValidation = { strict: false };
                break;
            }
            case "order": {
                snapshot.sheets.reverse();
                break;
            }
            case "protection": {
                sheet(0)["protectedRanges"] = [
                    { protectedRangeId: 1, warningOnly: true },
                ];
                break;
            }
            case "typed table": {
                sheet(4)["tables"] = [];
                break;
            }
            default: {
                throw new Error("Unknown test mutation");
            }
        }

        expect(() => verifyLightSchemaReadback(plan, before, snapshot)).toThrow(
            /readback/v
        );
    });

    it("appends independent nonnegative readings, updates only reviewed enums, and widens filters without sorting evidence", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const before = structuredClone(snapshot);
        const plan = buildLightSchemaRequests(snapshot, schema);

        expect(snapshot).toStrictEqual(before);
        expect(verifyLightSchemaPreconditions(plan, snapshot)).toBe(true);
        expect(
            plan.requests.filter((request) => "appendDimension" in request)
        ).toHaveLength(3);
        expect(
            plan.requests.filter((request) => "updateCells" in request)
        ).toHaveLength(3);
        expect(plan.requests).toContainEqual({
            setBasicFilter: {
                filter: {
                    criteria: { 35: { hiddenValues: ["Removed"] } },
                    range: {
                        endColumnIndex: 45,
                        endRowIndex: 5000,
                        sheetId: 1,
                    },
                },
            },
        });

        const text = JSON.stringify(plan.requests);

        expect(text).toContain("History!A2:AS5000");
        expect(text).toContain("SEQUENCE(1,44,2,1)");
        expect(text).toContain("NUMBER_GREATER_THAN_EQ");
        expect(text).toContain("Light app");
        expect(text).toContain("Lux meter");
        expect(text).toContain("PPFD (µmol/m²/s)");
        expect(text).toContain("Illuminance (lux)");
        expect(text).not.toContain("sortSpecs");
        expect(text).not.toContain("sortRange");
        expect(text).not.toContain("Historical evidence");
        expect(text).not.toContain("Queued real draft");
        expect(text).not.toContain("Preserved chart");

        const table = plan.requests.find((request) => "updateTable" in request);

        expect(JSON.stringify(table)).toContain("Inspect");
        expect(JSON.stringify(table)).not.toContain("Light");
    });

    it("refuses all occupied destinations including zero and empty-result formulas", () => {
        expect.hasAssertions();

        for (const entered of [
            { numberValue: 0 },
            { stringValue: "PPFD (µmol/m²/s)" },
            { formulaValue: '=IF(TRUE,"",1)' },
        ]) {
            const { rows, schema, sheet, snapshot } = fixture();
            sheet(0).properties.gridProperties.columnCount = 45;
            required(required(rows(0)[4999]).values)[44] = {
                userEnteredValue: entered,
            };

            expect(() => buildLightSchemaRequests(snapshot, schema)).toThrow(
                "destination occupied or replay"
            );
        }
    });

    it("requires full, nonoverlapping native rows and exact legacy headers and view formula", () => {
        expect.hasAssertions();

        const { rows, schema, sheet, snapshot } = fixture();
        required(required(rows(1)[0]).values)[0] = {
            userEnteredValue: { formulaValue: "=History!A1:AQ5000" },
        };

        expect(() => buildLightSchemaRequests(snapshot, schema)).toThrow(
            "History view formula changed"
        );

        required(required(rows(1)[0]).values)[0] = {
            userEnteredValue: { formulaValue: lightViewFormula(43) },
        };
        rows(1).pop();

        expect(() => buildLightSchemaRequests(snapshot, schema)).toThrow(
            "Missing complete light rows"
        );

        rows(1).push({ values: [] });
        required(sheet(1).data).push({ rowData: [{ values: [] }] });

        expect(() => buildLightSchemaRequests(snapshot, schema)).toThrow(
            "Overlapping"
        );

        required(sheet(1).data).pop();
        required(required(rows(0)[0]).values)[0] = {
            userEnteredValue: { stringValue: "Drift" },
        };

        expect(() => buildLightSchemaRequests(snapshot, schema)).toThrow(
            "Legacy light headers changed"
        );
    });

    it("refuses weakened or nonuniform validation, table drift, and changed source or request plans", () => {
        expect.hasAssertions();

        const { rows, schema, sheet, snapshot } = fixture();
        const plan = buildLightSchemaRequests(snapshot, schema);
        plan.requests.push({ deleteSheet: { sheetId: 1 } });

        expect(() => verifyLightSchemaPreconditions(plan, snapshot)).toThrow(
            "requests changed"
        );

        plan.requests.pop();
        const cell = required(required(rows(0)[12]).values)[34];
        required(required(rows(0)[12]).values)[34] = {
            dataValidation: { strict: false },
        };

        expect(() => verifyLightSchemaPreconditions(plan, snapshot)).toThrow(
            "snapshot changed"
        );
        expect(() => buildLightSchemaRequests(snapshot, schema)).toThrow(
            "Light enum validation changed"
        );

        required(required(rows(0)[12]).values)[34] = required(cell);
        sheet(4)["tables"] = [];

        expect(() => buildLightSchemaRequests(snapshot, schema)).toThrow(
            "Missing reviewed QuickCareLog"
        );
    });
});
