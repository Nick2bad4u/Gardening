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
 *     wrongFormula?: boolean;
 *     wrongId?: boolean;
 *     wrongHeader?: boolean;
 *     rows?: number;
 *     columns?: number;
 *     collision?: boolean;
 *     extraCells?: number;
 * }} [options]
 */
function fixture(options = {}) {
    const batchUpdate = vi.fn();
    const context = vm.createContext({
        Sheets: { Spreadsheets: { batchUpdate } },
    });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    const api = appsScriptApi(context);
    const headers = Array.from({ length: 50 }, () => "");
    headers[0] = "Date";
    headers[1] = "Plant ID";
    headers[2] = "Event";
    headers[35] = "Record status";
    headers[49] = options.wrongHeader === true ? "Location" : "New location";
    const history = {
        getMaxColumns: () => 67,
        getMaxRows: () => 50_001,
        getRange: vi.fn(() => ({ getDisplayValues: () => [headers] })),
        getSheetId: () => 1,
    };
    const helper = {
        getMaxColumns: () => options.columns ?? 8,
        getMaxRows: () => options.rows ?? 50_003,
        getRange: vi.fn(() => ({
            getFormula: () =>
                options.wrongFormula === true
                    ? "=42"
                    : api.wateringMapFeedFormula_(),
        })),
        getSheetId: () => (options.wrongId === true ? 123 : 907_202_615),
    };
    const sheets = [
        history,
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
        getSheetByName: (/** @type {string} */ name) => {
            if (name === "History") return history;
            return name === "Watering map" && options.existing === true
                ? helper
                : null;
        },
        getSheets: () => sheets,
    };
    return { api, batchUpdate, helper, history, spreadsheet };
}

describe("watering-map projection installation", () => {
    it("adds only the hidden protected feed and its one formula with ISO date display", () => {
        expect.hasAssertions();

        const { api, batchUpdate, history, spreadsheet } = fixture();
        api.ensureWateringMapFeed_(spreadsheet);

        expect(history.getRange).toHaveBeenCalledExactlyOnceWith(1, 1, 1, 50);
        expect(batchUpdate).toHaveBeenCalledExactlyOnceWith(
            {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                gridProperties: {
                                    columnCount: 8,
                                    rowCount: 50_003,
                                },
                                hidden: true,
                                sheetId: 907_202_615,
                                title: "Watering map",
                            },
                        },
                    },
                    {
                        addProtectedRange: {
                            protectedRange: {
                                description:
                                    "Read-only watering map projection",
                                range: { sheetId: 907_202_615 },
                                warningOnly: true,
                            },
                        },
                    },
                    {
                        updateCells: {
                            fields: "userEnteredValue",
                            rows: [
                                {
                                    values: [
                                        {
                                            userEnteredValue: {
                                                formulaValue:
                                                    api.wateringMapFeedFormula_(),
                                            },
                                        },
                                    ],
                                },
                            ],
                            start: {
                                columnIndex: 0,
                                rowIndex: 0,
                                sheetId: 907_202_615,
                            },
                        },
                    },
                    {
                        repeatCell: {
                            cell: {
                                userEnteredFormat: {
                                    numberFormat: {
                                        pattern: 'yyyy-mm-dd"T"hh:mm:ss.000',
                                        type: "DATE_TIME",
                                    },
                                },
                            },
                            fields: "userEnteredFormat.numberFormat",
                            range: {
                                endColumnIndex: 1,
                                endRowIndex: 50_003,
                                sheetId: 907_202_615,
                                startColumnIndex: 0,
                                startRowIndex: 2,
                            },
                        },
                    },
                ],
            },
            "test-workbook"
        );
    });

    it("extends an owned smaller feed without clearing contents or adding duplicate protection", () => {
        expect.hasAssertions();

        const { api, batchUpdate, helper, spreadsheet } = fixture({
            existing: true,
            rows: 1000,
        });
        api.ensureWateringMapFeed_(spreadsheet);

        expect(helper.getRange).toHaveBeenCalledExactlyOnceWith("A1");

        const serialized = JSON.stringify(batchUpdate.mock.calls);

        expect(serialized).toContain(
            '"fields":"hidden,gridProperties.rowCount"'
        );
        expect(serialized).not.toContain('"addSheet"');
        expect(serialized).not.toContain('"addProtectedRange"');
        expect(serialized).not.toContain('"sheetId":1,');
        expect(serialized).not.toContain('"fields":"userEnteredValue","range"');
    });

    it.each([
        { message: /source headers/v, wrongHeader: true },
        { existing: true, message: /ownership/v, wrongFormula: true },
        { existing: true, message: /ownership/v, wrongId: true },
        { collision: true, message: /already in use/v },
        { columns: 9, existing: true, message: /grid dimensions/v },
        { existing: true, message: /grid dimensions/v, rows: 50_004 },
        { extraCells: 17_000_000, message: /cell limit/v },
    ])(
        "rejects incompatible feed state before writes: $message",
        ({ message, ...options }) => {
            expect.hasAssertions();

            const { api, batchUpdate, spreadsheet } = fixture(options);

            expect(() => {
                api.ensureWateringMapFeed_(spreadsheet);
            }).toThrow(message);
            expect(batchUpdate).not.toHaveBeenCalled();
        }
    );
});
