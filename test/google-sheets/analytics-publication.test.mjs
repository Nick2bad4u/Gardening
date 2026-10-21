import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

import { required } from "../helpers/required.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = readFileSync(sourceUrl, "utf8");
const sheet = { getLastRow: () => 150, getSheetId: () => 6 };

/** @typedef {import("../apps-script-fixtures.js").AnalyticsCellsRequest} Request */
/**
 * @typedef {{
 *     format: string;
 *     value: import("../apps-script-fixtures.js").AnalyticsCellData["userEnteredValue"];
 * }[][]} Grid
 */

/** @param {Grid} grid @param {NonNullable<Request["repeatCell"]>} repeat */
function applyRepeat(grid, repeat) {
    expect(repeat.fields).toBe("userEnteredValue");

    const range = repeat.range;
    for (let row = range.startRowIndex; row < range.endRowIndex; row++)
        for (
            let column = range.startColumnIndex;
            column < range.endColumnIndex;
            column++
        )
            required(required(grid[row])[column]).value = structuredClone(
                repeat.cell.userEnteredValue
            );
}

/** @param {Grid} grid @param {NonNullable<Request["updateCells"]>} update */
function applyUpdate(grid, update) {
    expect(update.fields).toBe("userEnteredValue");

    const startRow =
        update.range?.startRowIndex ?? required(update.start).rowIndex;
    const startColumn =
        update.range?.startColumnIndex ?? required(update.start).columnIndex;
    const rows = update.rows;
    const endRow = update.range?.endRowIndex ?? startRow + rows.length;
    for (let row = startRow; row < endRow; row++) {
        const cells = rows[row - startRow]?.values ?? [];
        const endColumn =
            update.range?.endColumnIndex ?? startColumn + cells.length;
        for (let column = startColumn; column < endColumn; column++)
            required(required(grid[row])[column]).value = structuredClone(
                cells[column - startColumn]?.userEnteredValue
            );
    }
}

function fixture() {
    const context = vm.createContext({ Date, Map });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    for (const name of [
        "gardenAnalyticsCellsRequest_",
        "gardenAnalyticsCellsRequests_",
    ])
        if (typeof context[name] !== "function")
            throw new Error(`Missing ${name}`);
    const api =
        /** @type {import("../apps-script-fixtures.js").AnalyticsApi} */ (
            /** @type {unknown} */ (context)
        );
    return { api, context };
}

/**
 * @param {number} count @returns
 *   {import("../logger-fixtures.js").CellValue[][]}
 */
function outputRows(count) {
    return [
        [
            "timestamp",
            "blank",
            "zero",
            "literal",
            "reading",
            "same-date",
            "label",
            "note",
        ],
        ...Array.from({ length: count - 1 }, (_, index) => [
            new Date(Date.UTC(2026, 9, 1, 0, index)),
            "",
            0,
            "=SUM(A1:A2)",
            index,
            new Date("2026-10-01T12:00:00Z"),
            `Plant ${index}`,
            index % 2 === 0 ? "" : "🌱é水",
        ]),
    ];
}

/**
 * Model only Sheets' userEnteredValue update semantics on a prepopulated grid.
 * Empty CellData removes a value; a start update preserves its surrounding
 * cells.
 *
 * @param {import("../apps-script-fixtures.js").AnalyticsCellsRequest[]} requests
 */
function publishedGrid(requests) {
    const grid = Array.from({ length: 152 }, () =>
        Array.from({ length: 34 }, () => ({
            format: "original-number-format",
            value: /** @type {import("../apps-script-fixtures.js").AnalyticsCellData["userEnteredValue"]} */ ({
                stringValue: "old-value",
            }),
        }))
    );
    for (const request of requests) {
        const update = request.updateCells;
        const repeat = request.repeatCell;
        if (update) applyUpdate(grid, update);
        else if (repeat) applyRepeat(grid, repeat);
        else throw new Error("Unexpected analytics publication request");
    }
    return grid;
}

describe("atomic analytics CellData compression", () => {
    it.each([
        0,
        1,
        2,
        127,
    ])("keeps the original representation for %i rows", (count) => {
        expect.hasAssertions();

        const { api } = fixture();
        const rows = count === 0 ? [] : outputRows(count);
        const original = api.gardenAnalyticsCellsRequest_(
            sheet,
            23,
            8,
            rows,
            "UTC"
        );
        const requests = api.gardenAnalyticsCellsRequests_(
            sheet,
            23,
            8,
            rows,
            "UTC"
        );

        expect(structuredClone(requests)).toStrictEqual(
            structuredClone([original])
        );
    });

    it("preserves complete cells, true blanks, old tails, neighbors and formats at the threshold", () => {
        expect.hasAssertions();

        const { api } = fixture();
        const rows = outputRows(128);
        const original = api.gardenAnalyticsCellsRequest_(
            sheet,
            23,
            8,
            rows,
            "UTC"
        );
        const requests = api.gardenAnalyticsCellsRequests_(
            sheet,
            23,
            8,
            rows,
            "UTC"
        );
        const actual = publishedGrid(requests);

        expect(actual).toStrictEqual(publishedGrid([original]));
        expect(Buffer.byteLength(JSON.stringify(requests))).toBeLessThan(
            Buffer.byteLength(JSON.stringify([original]))
        );
        expect(requests[0]?.updateCells?.rows).toHaveLength(0);
        expect(requests.filter((request) => request.repeatCell)).toHaveLength(
            3
        );
        expect(actual[1]?.[23]?.value).toBeUndefined();
        expect(actual[1]?.[24]?.value).toStrictEqual({ numberValue: 0 });
        expect(actual[1]?.[25]?.value).toStrictEqual({
            stringValue: "=SUM(A1:A2)",
        });
        expect(actual[149]?.[22]?.value).toBeUndefined();
        expect(actual[150]?.[22]?.value).toStrictEqual({
            stringValue: "old-value",
        });
        expect(actual[1]?.[21]?.value).toStrictEqual({
            stringValue: "old-value",
        });
        expect(actual[1]?.[30]?.value).toStrictEqual({
            stringValue: "old-value",
        });
        expect(rows[1]?.[0]).toBeInstanceOf(Date);
    });

    it("keeps variable values when every column varies", () => {
        expect.hasAssertions();

        const { api } = fixture();
        const rows = Array.from({ length: 128 }, (_, index) => [
            index,
            String(index),
        ]);

        expect(
            structuredClone(
                api.gardenAnalyticsCellsRequests_(sheet, 1, 2, rows, "UTC")
            )
        ).toStrictEqual(
            structuredClone([
                api.gardenAnalyticsCellsRequest_(sheet, 1, 2, rows, "UTC"),
            ])
        );
    });

    it("restores headers and leaves all-blank data genuinely empty", () => {
        expect.hasAssertions();

        const { api } = fixture();
        const rows = [
            ["first", "second"],
            ...Array.from({ length: 127 }, () => ["", ""]),
        ];
        const requests = api.gardenAnalyticsCellsRequests_(
            sheet,
            23,
            2,
            rows,
            "UTC"
        );

        expect(requests).toHaveLength(2);
        expect(publishedGrid(requests)).toStrictEqual(
            publishedGrid([
                api.gardenAnalyticsCellsRequest_(sheet, 23, 2, rows, "UTC"),
            ])
        );
    });

    it("falls back if the encoded candidate is not smaller", () => {
        expect.hasAssertions();

        const { api, context } = fixture();
        const rows = outputRows(128);
        const bytes = vi.fn(() => 10);
        context["gardenAnalyticsPayloadBytes_"] = bytes;

        expect(
            structuredClone(
                api.gardenAnalyticsCellsRequests_(sheet, 23, 8, rows, "UTC")
            )
        ).toStrictEqual(
            structuredClone([
                api.gardenAnalyticsCellsRequest_(sheet, 23, 8, rows, "UTC"),
            ])
        );
        expect(bytes).toHaveBeenCalledTimes(2);
    });

    it("retains baseline width validation before considering compression", () => {
        expect.hasAssertions();

        const { api } = fixture();

        expect(() =>
            api.gardenAnalyticsCellsRequests_(sheet, 23, 2, [["bad"]], "UTC")
        ).toThrow("Invalid analytics output width");
    });
});
