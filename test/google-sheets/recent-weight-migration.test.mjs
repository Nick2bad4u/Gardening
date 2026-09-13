import { describe, expect, it } from "vitest";

import { buildRecentWeightRequests } from "../../scripts/google-sheets/recent-weights.mjs";
import { required } from "../helpers/required.mjs";

/** @returns {import("../workbook-fixtures.d.ts").WorkbookSnapshot} */
function fixture() {
    return {
        cells: [
            {
                column: 24,
                row: 5,
                sheet: "Dashboard",
                value: { stringValue: "Weight measurements" },
            },
            {
                column: 1,
                row: 39,
                sheet: "Daily care",
                value: { stringValue: "Plant ID" },
            },
            {
                column: 15,
                row: 0,
                sheet: "Dry-down models",
                value: { stringValue: "Watering guidance" },
            },
            {
                column: 35,
                row: 0,
                sheet: "History",
                value: { stringValue: "Record status" },
            },
            {
                column: 1,
                row: 11,
                sheet: "Integrity",
                value: {
                    formulaValue:
                        "=SUM(ARRAYFORMULA(N(ISERROR(Dashboard!Y1:Z254))),ARRAYFORMULA(N(ISERROR('Dry-down models'!A1:P1000))))",
                },
            },
        ],
        metadata: {
            sheets: [
                "Dashboard",
                "Daily care",
                "Dry-down models",
                "History",
                "Integrity",
                "Plant color data",
                "Insights",
            ].map((title, sheetId) => ({
                properties: {
                    gridProperties: {
                        columnCount: title === "Plant color data" ? 127 : 26,
                        rowCount: title === "Insights" ? 634 : 1000,
                    },
                    sheetId,
                    title,
                },
            })),
        },
    };
}

describe("scoped recent-weight migration", () => {
    it("keys both dashboard views by the Plant ID and never writes the ledger", () => {
        expect.hasAssertions();

        const requests = buildRecentWeightRequests(fixture());
        const writes = requests
            .filter((r) => r["updateCells"] !== undefined)
            .map((r) => JSON.stringify(r["updateCells"]));

        expect(writes.some((r) => r.includes("$B7"))).toBe(true);
        expect(writes.some((r) => r.includes("$B41"))).toBe(true);
        expect(writes.some((r) => r.includes('"sheetId":3'))).toBe(false);
        expect(
            requests.some((r) =>
                [
                    "deleteSheet",
                    "deleteRange",
                    "deleteEmbeddedObject",
                ].some((key) => r[key] !== undefined)
            )
        ).toBe(false);
    });

    it("adds four charts from fixed P-ID helper rows and expands the error scan", () => {
        expect.hasAssertions();

        const requests = buildRecentWeightRequests(fixture());
        const charts = requests.filter((r) => r["addChart"] !== undefined);

        expect(charts).toHaveLength(4);
        expect(JSON.stringify(charts)).toContain('"startColumnIndex":127');
        expect(JSON.stringify(charts)).toContain('"startColumnIndex":132');
        expect(JSON.stringify(requests)).toContain("Dashboard!Y1:AE254");
        expect(JSON.stringify(requests)).toContain("'Daily care'!I40:N70");
        expect(JSON.stringify(requests)).toContain(
            "'Dry-down models'!A1:V1000"
        );
        expect(JSON.stringify(requests)).not.toContain("updateChartSpec");
        expect(JSON.stringify(requests.at(-1))).toContain("Dashboard!Y1:AE254");
    });

    it("refuses occupied destinations, drifted headers and replay", () => {
        expect.hasAssertions();

        const occupied = fixture();
        occupied.cells.push({
            column: 11,
            row: 45,
            sheet: "Daily care",
            value: { numberValue: 0 },
        });

        expect(() => buildRecentWeightRequests(occupied)).toThrow("occupied");

        const changed = fixture();
        required(changed.cells[0]).value = { stringValue: "Owner notes" };

        expect(() => buildRecentWeightRequests(changed)).toThrow(
            "Unexpected Dashboard"
        );

        const replay = fixture();
        required(
            replay.metadata.sheets[5]
        ).properties.gridProperties.columnCount = 133;

        expect(() => buildRecentWeightRequests(replay)).toThrow(
            "append position"
        );
    });
});
