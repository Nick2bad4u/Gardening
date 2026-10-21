import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

import { appsScriptApi } from "../helpers/apps-script-api.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = fs.readFileSync(sourceUrl, "utf8");

/**
 * @param {{
 *     existing?: boolean;
 *     marker?: string;
 *     rows?: number;
 *     columns?: number;
 *     collision?: boolean;
 *     extraCells?: number;
 * }} [options]
 */
function fixture(options = {}) {
    const batchUpdate = vi.fn();
    const helper = {
        getMaxColumns: () => options.columns ?? 9,
        getMaxRows: () => options.rows ?? 50_002,
        getRange: vi.fn(() => ({
            getValue: () => options.marker ?? "Garden History anchor index v1",
        })),
        getSheetId: () => 907_202_613,
    };
    const sheets = [
        {
            getMaxColumns: () => 67,
            getMaxRows: () => 50_001,
            getSheetId: () => 1,
        },
        {
            getMaxColumns: () => 1,
            getMaxRows: () => options.extraCells ?? 0,
            getSheetId: () => 2,
        },
    ];
    if (options.existing === true || options.collision === true)
        sheets.push(helper);
    const spreadsheet = {
        getId: () => "test-workbook",
        getSheetByName: vi.fn((/** @type {string} */ title) =>
            title === "History anchors" && options.existing === true
                ? helper
                : null
        ),
        getSheets: () => sheets,
    };
    const api = runtime({ Sheets: { Spreadsheets: { batchUpdate } } });
    return { api, batchUpdate, helper, spreadsheet };
}

/** @param {Record<string, unknown>} [globals] */
function runtime(globals = {}) {
    const context = vm.createContext(globals);
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    return appsScriptApi(context);
}

describe("raw History anchor index", () => {
    it.each([
        2,
        1883,
        50_001,
    ])(
        "keeps the original raw fallback and elapsed formula at row %i",
        (row) => {
            expect.hasAssertions();

            const api = runtime();
            const original = api.historyAnchorOriginalFormula_(row);
            const candidate = api.historyAnchorFormula_(row);

            expect(candidate.endsWith(`,${original.slice(1)})`)).toBe(true);
            expect(original).toContain(`$A$2:$A$50001<=A${row}`);
            expect(original).toContain('$AJ$2:$AJ$50001<>"Removed"');
            expect(original).toContain(
                'REGEXMATCH($C$2:$C$50001,"^(Water|Repot)$")'
            );
            expect(original).not.toMatch(/\$A[CI]\$/v);
            expect(candidate).toContain(`XLOOKUP(A${row},`);
            expect(candidate).toContain(",0,-1,2)");
            expect(candidate).toContain("MAX(1,'History anchors'!$D$4)");
            expect(api.historyHelperFormulas_(row)[1]).toBe(candidate);
            expect(api.historyHelperFormulas_(row)[2]).toBe(
                `=IF(OR(A${row}="",N${row}=""),"",A${row}-N${row})`
            );
        }
    );

    it("guards ambiguous raw types and keys once and bounds the sorted directory", () => {
        expect.hasAssertions();

        const formulas = runtime().historyAnchorSheetFormulas_();

        expect(
            Object.keys(formulas).toSorted((left, right) =>
                left.localeCompare(right)
            )
        ).toStrictEqual([
            "A3",
            "D1",
            "D2",
            "D3",
            "D4",
            "E3",
            "G2",
        ]);
        expect(formulas["D1"]).toContain("IFERROR(SUMPRODUCT(");
        expect(formulas["D1"]).toContain("ISTEXT(History!$C$2:$C$50001)");
        expect(formulas["D2"]).toContain('"^P[0-9]{2}$"');
        expect(formulas["D2"]).toContain("History!$K$2:$K$50001<=999999999");
        expect(formulas["D2"]).toContain(
            "History!$K$2:$K$50001=INT(History!$K$2:$K$50001)"
        );
        expect(formulas["A3"]).not.toMatch(/\$A[CI]\$/v);
        expect(formulas["E3"]).toContain(",1,TRUE,2,TRUE)");
        expect(formulas["G2"]).toContain("group by Col1 order by Col1");
        expect(formulas["G2"]).toContain(
            "$E$3:INDEX($E$3:$E$50002,MAX(1,$D$3))"
        );
    });

    it("creates exactly nine hidden columns and only writes the helper in one batch", () => {
        expect.hasAssertions();

        const { api, batchUpdate, spreadsheet } = fixture();
        api.ensureHistoryAnchors_(spreadsheet);

        expect(batchUpdate).toHaveBeenCalledExactlyOnceWith(
            {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                gridProperties: {
                                    columnCount: 9,
                                    rowCount: 50_002,
                                },
                                hidden: true,
                                sheetId: 907_202_613,
                                title: "History anchors",
                            },
                        },
                    },
                    {
                        addProtectedRange: {
                            protectedRange: {
                                description:
                                    "Read-only raw History anchor index",
                                range: { sheetId: 907_202_613 },
                                warningOnly: true,
                            },
                        },
                    },
                    {
                        updateCells: {
                            fields: "userEnteredValue",
                            range: {
                                endColumnIndex: 9,
                                endRowIndex: 50_002,
                                sheetId: 907_202_613,
                                startColumnIndex: 0,
                                startRowIndex: 0,
                            },
                        },
                    },
                    ...Object.entries({
                        A1: "Garden History anchor index v1",
                        A2: "Raw timestamp",
                        B2: "Raw plant",
                        C2: "Raw setup",
                        ...api.historyAnchorSheetFormulas_(),
                    }).map(([address, value]) => ({
                        updateCells: {
                            fields: "userEnteredValue",
                            rows: [
                                {
                                    values: [
                                        {
                                            userEnteredValue: value.startsWith(
                                                "="
                                            )
                                                ? { formulaValue: value }
                                                : { stringValue: value },
                                        },
                                    ],
                                },
                            ],
                            start: {
                                columnIndex:
                                    (address.codePointAt(0) ?? 65) - 65,
                                rowIndex: Number(address.slice(1)) - 1,
                                sheetId: 907_202_613,
                            },
                        },
                    })),
                ],
            },
            "test-workbook"
        );
        expect(spreadsheet.getSheetByName).toHaveBeenCalledExactlyOnceWith(
            "History anchors"
        );
    });

    it("repairs an owned smaller helper without adding duplicate protection or touching History", () => {
        expect.hasAssertions();

        const { api, batchUpdate, helper, spreadsheet } = fixture({
            existing: true,
            rows: 1000,
        });
        api.ensureHistoryAnchors_(spreadsheet);

        expect(helper.getRange).toHaveBeenCalledExactlyOnceWith("A1");
        expect(batchUpdate).toHaveBeenCalledTimes(1);

        const serialized = JSON.stringify(batchUpdate.mock.calls);

        expect(serialized).toContain(
            '"fields":"hidden,gridProperties.rowCount"'
        );
        expect(serialized).not.toContain('"addSheet"');
        expect(serialized).not.toContain('"addProtectedRange"');
        expect(serialized).not.toContain('"sheetId":1,');
    });

    it.each([
        {
            existing: true,
            marker: "Unrelated user data",
            message: /ownership marker/v,
        },
        { collision: true, message: /already in use/v },
        { columns: 10, existing: true, message: /grid dimensions/v },
        { existing: true, message: /grid dimensions/v, rows: 50_003 },
        { extraCells: 17_000_000, message: /cell limit/v },
    ])(
        "rejects incompatible helper state before writes: $message",
        ({ message, ...options }) => {
            expect.hasAssertions();

            const { api, batchUpdate, spreadsheet } = fixture(options);

            expect(() => {
                api.ensureHistoryAnchors_(spreadsheet);
            }).toThrow(message);
            expect(batchUpdate).not.toHaveBeenCalled();
        }
    );
});
