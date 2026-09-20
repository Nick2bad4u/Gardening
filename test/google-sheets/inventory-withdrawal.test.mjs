import { describe, expect, it } from "vitest";

import { isRecord } from "../../scripts/build-data.mjs";
import {
    buildInventoryWithdrawal,
    contractWithdrawalFormula,
    verifyInventoryWithdrawalPreconditions,
} from "../../scripts/google-sheets/inventory-withdrawal.mjs";
import { required } from "../helpers/required.mjs";

/** @typedef {import("../../scripts/google-sheets/inventory-expansion.mjs").NativeSnapshot} Snapshot */
/** @typedef {import("../../scripts/google-sheets/inventory-expansion.mjs").Sheet} Sheet */

function fixture() {
    const names = [
        "Plant tracker",
        "Baselines",
        "History",
        "App entries",
        "App bulk",
        "RO refills",
        "Insights",
        "Integrity",
        "Plant colors",
        "Plant color data",
        "Workbook analytics",
        "Watering intervals",
        "Dry-down models",
        "Quick log",
        "Watering calendar",
        "Workbook calculations",
        "Insights data",
        "Dry-down insights",
        "Dashboard",
        "P30 Mixed succulent",
        "P31 Four-succulent planter",
        "P32 Nanouk tradescantia",
    ];
    /** @type {Snapshot} */ const snapshot = {
        sheets: names.map((title, index) => ({
            data: [
                {
                    rowData: Array.from({ length: 1000 }, () => ({
                        values: [],
                    })),
                    startColumn: 0,
                    startRow: 0,
                },
            ],
            properties: {
                gridProperties: {
                    columnCount: title === "App bulk" ? 56 : 150,
                    rowCount: 1000,
                },
                sheetId: title.startsWith("P31 ")
                    ? 202_609_310
                    : title.startsWith("P32 ")
                      ? 202_609_320
                      : index,
                title,
            },
        })),
    };
    /** @param {string} title */ const sheet = (title) =>
        required(
            snapshot.sheets.find((item) => item.properties.title === title)
        );
    for (const title of ["Plant tracker", "Baselines"])
        for (let row = 1; row <= 32; row += 1)
            put(sheet(title), row, 0, `P${String(row).padStart(2, "0")}`);
    for (const title of [
        "P31 Four-succulent planter",
        "P32 Nanouk tradescantia",
    ])
        sheet(title).charts = Array.from({ length: 4 }, (_, i) => ({
            chartId: sheet(title).properties.sheetId + i,
            spec: { title: "Test chart" },
        }));
    put(sheet("App bulk"), 0, 54, "P31 weight (g)");
    put(sheet("App bulk"), 0, 55, "P32 weight (g)");
    put(sheet("App entries"), 1, 2, "P01");
    const entryBlock = required(required(sheet("App entries").data)[0]);
    const entryRow = required(required(entryBlock.rowData)[1]);
    required(required(entryRow.values)[2]).dataValidation = {
        condition: {
            type: "ONE_OF_LIST",
            values: Array.from({ length: 32 }, (_, i) => ({
                userEnteredValue: `P${String(i + 1).padStart(2, "0")}`,
            })),
        },
        showCustomUi: true,
        strict: true,
    };
    put(sheet("History"), 1, 0, 46_282);
    put(sheet("History"), 1, 1, "P01");
    put(sheet("RO refills"), 19, 0, 46_280);
    put(sheet("Plant tracker"), 31, 1, "Canceled planter");
    put(sheet("Plant tracker"), 2, 2, "=Baselines!C3");
    put(sheet("P30 Mixed succulent"), 4, 1, "=SUM(Baselines!C2:C33)");
    put(sheet("Plant color data"), 31, 0, "P31");
    put(sheet("Plant color data"), 32, 0, "P32");
    put(sheet("Plant color data"), 66, 0, "P31");
    put(sheet("Plant color data"), 67, 0, "P32");
    put(
        sheet("Integrity"),
        11,
        1,
        "=SUM(SUM(History!A2:A5000),SUM('P31 Four-succulent planter'!A1:J10),SUM('P32 Nanouk tradescantia'!A1:J10),SUM(Baselines!A2:A33))"
    );
    sheet("Plant tracker")["basicFilter"] = {
        range: { endRowIndex: 33, sheetId: 0, startRowIndex: 0 },
        sortSpecs: [{ dimensionIndex: 1, sortOrder: "ASCENDING" }],
    };
    sheet("Insights").charts = [
        {
            chartId: 123,
            spec: {
                basicChart: {
                    series: [
                        {
                            series: {
                                sourceRange: {
                                    sources: [
                                        {
                                            endColumnIndex: 98,
                                            sheetId:
                                                sheet("Workbook analytics")
                                                    .properties.sheetId,
                                            startColumnIndex: 97,
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            series: {
                                sourceRange: {
                                    sources: [
                                        {
                                            endColumnIndex: 101,
                                            sheetId:
                                                sheet("Workbook analytics")
                                                    .properties.sheetId,
                                            startColumnIndex: 100,
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                },
                title: "Compare",
            },
        },
    ];
    const metadata = structuredClone(snapshot);
    for (const current of metadata.sheets) delete current.data;
    return { metadata, sheet, snapshot };
}

/**
 * @param {Sheet} sheet @param {number} row @param {number} column @param
 *   {string|number} value
 */
function put(sheet, row, column, value) {
    const block = required(required(sheet.data)[0]);
    const data = required(block.rowData);
    const target = required(data[row]);
    target.values ??= [];
    while (target.values.length <= column) target.values.push({});
    target.values[column] = {
        userEnteredValue:
            typeof value === "number"
                ? { numberValue: value }
                : value.startsWith("=")
                  ? { formulaValue: value }
                  : { stringValue: value },
    };
}

describe("guarded canceled inventory withdrawal", () => {
    it.each([32, 1])(
        "contracts the full native palette but preserves unrelated %i-style overrides",
        (count) => {
            expect.hasAssertions();

            const f = fixture();
            const sheet = required(
                f.metadata.sheets.find(
                    (item) => item.properties.title === "Insights"
                )
            );
            const chart = required(required(sheet.charts)[0]);
            const series = array(record(chart.spec["basicChart"])["series"]);
            record(series[0])["styleOverrides"] = Array.from(
                { length: count },
                (_, index) => ({
                    colorStyle: { rgbColor: { red: 1 } },
                    index: count === 1 ? 31 : index || undefined,
                })
            );
            const plan = buildInventoryWithdrawal(f.metadata, [f.snapshot]);
            const charts = JSON.stringify(plan.chartRequests);

            expect(charts.includes('"index":31')).toBe(count === 1);
            expect(charts).not.toContain('"index":30');
            expect(charts.includes('"index":29')).toBe(count === 32);
        }
    );

    it("rejects note-only drift without changing canonical evidence", () => {
        expect.hasAssertions();

        const f = fixture();
        const plan = buildInventoryWithdrawal(f.metadata, [f.snapshot]);
        const block = required(required(f.sheet("History").data)[0]);
        const row = required(required(block.rowData)[1]);
        Reflect.set(
            required(required(row.values)[1]),
            "note",
            "New owner note"
        );

        expect(() => {
            verifyInventoryWithdrawalPreconditions(plan, f.metadata, [
                f.snapshot,
            ]);
        }).toThrow(/notes/v);
    });

    it("contracts only known inventory bounds and removed page scans", () => {
        expect.hasAssertions();
        expect(
            contractWithdrawalFormula(
                "=SUM(Baselines!A2:A33,History!A2:A5000,Other!A2:A33,Dashboard!B6:B38)"
            )
        ).toBe(
            "=SUM(Baselines!A2:A31,History!A2:A5000,Other!A2:A33,Dashboard!B6:B36)"
        );
        expect(
            contractWithdrawalFormula(
                "=SUM(SUM('P31 Four-succulent planter'!A1:B4),SUM(History!A2:A5000))",
                "Integrity"
            )
        ).toBe("=SUM(SUM(History!A2:A5000))");
    });

    it("preserves ledgers, staging columns, retained charts and dimensions", () => {
        expect.hasAssertions();

        const { metadata, snapshot } = fixture();
        const original = structuredClone(snapshot);
        const plan = buildInventoryWithdrawal(metadata, [snapshot]);

        expect(snapshot).toStrictEqual(original);
        expect(plan.deleteRequests).toStrictEqual([
            { deleteSheet: { sheetId: 202_609_310 } },
            { deleteSheet: { sheetId: 202_609_320 } },
        ]);

        const serialized = JSON.stringify(plan.valueRequests);
        for (const title of [
            "History",
            "App entries",
            "App bulk",
            "RO refills",
        ]) {
            const id = required(
                snapshot.sheets.find((s) => s.properties.title === title)
            ).properties.sheetId;

            expect(
                plan.valueRequests.some((q) => {
                    const update = record(q["updateCells"]);
                    return record(update["start"])["sheetId"] === id;
                })
            ).toBe(false);
        }

        expect(serialized).not.toContain("deleteDimension");
        expect(plan.preservedChartIds).toStrictEqual([123]);
        expect(plan.chartRequests).toHaveLength(1);
        expect(JSON.stringify(plan.chartRequests)).toContain(
            '"startColumnIndex":97'
        );
        expect(JSON.stringify(plan.chartRequests)).not.toContain(
            '"startColumnIndex":100'
        );
        expect(plan.clearRanges).toContainEqual([
            "Plant color data",
            66,
            68,
            0,
            6,
        ]);
        expect(JSON.stringify(plan.metadataRequests)).toContain(
            '"endRowIndex":31'
        );
        expect(JSON.stringify(plan.metadataRequests)).toContain(
            '"sortOrder":"ASCENDING"'
        );

        verifyInventoryWithdrawalPreconditions(plan, metadata, [snapshot]);
    });

    it("rejects observations, staged requests, deprecated weights and incomplete reads", () => {
        expect.hasAssertions();

        for (const title of [
            "History",
            "App entries",
            "App bulk",
        ]) {
            const f = fixture();
            put(
                f.sheet(title),
                5,
                title === "App bulk" ? 54 : 1,
                title === "App bulk" ? 123 : "P31"
            );

            expect(() =>
                buildInventoryWithdrawal(f.metadata, [f.snapshot])
            ).toThrow(title === "App bulk" ? "contain data" : "orphan");
        }
        const partial = fixture();
        required(required(partial.sheet("History").data)[0]).rowData = [];

        expect(() =>
            buildInventoryWithdrawal(partial.metadata, [partial.snapshot])
        ).toThrow("Incomplete ledger snapshot");
    });

    it("rejects replay, roster drift, validation drift and changed evidence", () => {
        expect.hasAssertions();

        const f = fixture();
        const plan = buildInventoryWithdrawal(f.metadata, [f.snapshot]);
        put(f.sheet("History"), 5, 1, "P02");

        expect(() => {
            verifyInventoryWithdrawalPreconditions(plan, f.metadata, [
                f.snapshot,
            ]);
        }).toThrow("Source values");

        const replay = fixture();
        replay.metadata.sheets = replay.metadata.sheets.filter(
            (s) => s.properties.sheetId !== 202_609_310
        );

        expect(() =>
            buildInventoryWithdrawal(replay.metadata, [replay.snapshot])
        ).toThrow("replay refused");

        const roster = fixture();
        put(roster.sheet("Plant tracker"), 31, 0, "P99");

        expect(() =>
            buildInventoryWithdrawal(roster.metadata, [roster.snapshot])
        ).toThrow("ordered 32-pot");
    });
});

/** @param {unknown} value @returns {unknown[]} */
function array(value) {
    if (!Array.isArray(value)) {
        throw new TypeError("Expected series");
    }
    return value;
}

/** @param {unknown} value */
function record(value) {
    if (!isRecord(value)) throw new Error("Expected record");
    return value;
}
