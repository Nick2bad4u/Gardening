import fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const sourcePath = fileURLToPath(sourceUrl);
const source = fs.readFileSync(sourceUrl, "utf8");

const historyHeaders = [
    "Date",
    "Plant ID",
    "Event",
    "Weight state",
    "Weight (g)",
    "Height (cm)",
    "Width (cm)",
    "Condition / soil",
    "Notes",
    "Recorded",
    "Pot setup",
    "Pot label at entry",
];

function createHistorySheet(observations = []) {
    const rows = [
        [
            ...historyHeaders,
            "",
            "",
            "",
            "Request ID",
        ],
        ...observations.map(({ values, requestId }) => {
            const row = Array(16).fill("");
            values.forEach((value, index) => {
                row[index] = value;
            });
            row[15] = requestId;
            return row;
        }),
    ];

    function rangeValues(row, column, rowCount, columnCount) {
        return Array.from({ length: rowCount }, (_, rowOffset) =>
            Array.from(
                { length: columnCount },
                (_, columnOffset) =>
                    rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ""
            )
        );
    }

    return {
        getLastRow: () => rows.length,
        getRange(row, column, rowCount = 1, columnCount = 1) {
            const values = () =>
                rangeValues(row, column, rowCount, columnCount);
            return {
                getDisplayValue: () => String(values()[0][0] ?? ""),
                getDisplayValues: () =>
                    values().map((currentRow) =>
                        currentRow.map((value) => String(value ?? ""))
                    ),
                getValues: values,
                createTextFinder(query) {
                    let exact = false;
                    const finder = {
                        matchEntireCell(value) {
                            exact = value;
                            return finder;
                        },
                        findAll() {
                            return rows.flatMap((currentRow, index) => {
                                const value = String(
                                    currentRow[column - 1] ?? ""
                                );
                                const matches = exact
                                    ? value === query
                                    : value.includes(query);
                                return matches
                                    ? [{ getRow: () => index + 1 }]
                                    : [];
                            });
                        },
                    };
                    return finder;
                },
            };
        },
    };
}

function loadAppsScript(history) {
    const spreadsheet = {
        getSheetByName: (name) => (name === "History" ? history : null),
    };
    const context = vm.createContext({
        console,
        Date,
        Map,
        Object,
        Set,
        URL,
        SpreadsheetApp: {
            openById: () => spreadsheet,
        },
        Utilities: { getUuid: () => "test-request-id" },
        encodeURIComponent,
    });
    vm.runInContext(source, context, { filename: sourcePath });
    return context;
}

describe("Garden logger server logic", () => {
    it("infers independent event rows from a combined observation", () => {
        const context = loadAppsScript(createHistorySheet());

        expect(
            Array.from(
                context.buildEventNamesFromList_(
                    ["Water"],
                    "Wet",
                    420,
                    7,
                    "",
                    "Firm",
                    "Round check"
                )
            )
        ).toEqual([
            "Water",
            "Weigh",
            "Measure",
            "Check",
        ]);
        expect(
            Array.from(
                context.buildEventNames_("Weigh", "Wet", 420, "", "", "", "")
            )
        ).toEqual(["Weigh", "Water"]);
    });

    it("escapes formula-like notes and validates retry identifiers", () => {
        const context = loadAppsScript(createHistorySheet());

        expect(context.safeSheetText_('=IMPORTXML("x")')).toBe(
            '\'=IMPORTXML("x")'
        );
        expect(() => context.normalizeRequestId_("", true)).toThrow(
            /missing its retry key/
        );
        expect(context.normalizeRequestId_("garden-1234567890", true)).toBe(
            "garden-1234567890"
        );
        expect(context.normalizeRecentLimit_(25)).toBe(25);
        expect(context.normalizeRecentLimit_(999)).toBe(10);
        expect(context.normalizeRecentLimit_("not-a-number")).toBe(10);
    });

    it("reports a completed single-plant request as saved", () => {
        const requestId = "garden-single-12345";
        const history = createHistorySheet([
            {
                requestId,
                values: [
                    new Date("2026-08-15T10:00:00-04:00"),
                    "P01",
                    "Weigh",
                    "Routine",
                    420,
                ],
            },
        ]);
        const context = loadAppsScript(history);

        expect(context.getWebSaveStatus({ requestId })).toMatchObject({
            state: "saved",
            expectedCount: 1,
            savedCount: 1,
        });
    });

    it("does not treat a reserved but incomplete History row as saved", () => {
        const requestId = "garden-incomplete-12345";
        const history = createHistorySheet([
            {
                requestId,
                values: [
                    "",
                    "",
                    "",
                ],
            },
        ]);
        const context = loadAppsScript(history);

        expect(context.getWebSaveStatus({ requestId })).toMatchObject({
            state: "partial",
            expectedCount: 1,
            savedCount: 0,
        });
    });

    it("checks every per-plant request in a bulk watering round", () => {
        const requestId = "garden-bulk-123456";
        const history = createHistorySheet(
            ["P01", "P02"].map((plantId) => ({
                requestId: `${requestId}-${plantId}`,
                values: [
                    new Date("2026-08-15T10:00:00-04:00"),
                    plantId,
                    "Water",
                ],
            }))
        );
        const context = loadAppsScript(history);

        expect(
            context.getWebSaveStatus({
                requestId,
                plantIds: ["P01", "P02"],
            })
        ).toMatchObject({
            state: "saved",
            expectedCount: 2,
            savedCount: 2,
        });
    });
});
