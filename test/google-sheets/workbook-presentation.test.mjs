import { describe, expect, it } from "vitest";

import {
    buildWorkbookPresentationRequests,
    withWorkbookChartFont,
} from "../../scripts/google-sheets/workbook-presentation.mjs";

/** @returns {import("../workbook-fixtures.d.ts").WorkbookSnapshot} */
function fixture() {
    const names = [
        "Dashboard",
        "Daily care",
        "Integrity",
        "RO refills",
        "Quick log",
        "P01 Test",
    ];
    const headers = [
        "Refill date",
        "5 gal carboy (gal)",
        "5 gal carboy used up on",
        "5.3 gal carboy (gal)",
        "5.3 gal carboy used up on",
        "3 gal jug (gal)",
        "3 gal jug used up on",
        "5 gal jug (gal)",
        "5 gal jug used up on",
        "Total refilled (gal)",
        "Water type",
        "Supplier / location",
        "Notes",
    ];
    return {
        cells: [
            {
                column: 0,
                row: 0,
                sheet: "Daily care",
                value: { stringValue: "Daily care · read-only" },
            },
            ...[20, 22].map((column) => ({
                column,
                row: 2,
                sheet: "Dashboard",
                value: {
                    formulaValue:
                        '=HYPERLINK("#gid=1&range=A73",COUNTIF(Integrity!C5:C21,"Fail"))',
                },
            })),
            {
                column: 1,
                row: 11,
                sheet: "Integrity",
                value: {
                    formulaValue:
                        "=SUM(ARRAYFORMULA(N(ISERROR(History!A2:AP5000))),ARRAYFORMULA(N(ISERROR('Daily care'!I40:N70))))",
                },
            },
            ...headers.map((header, column) => ({
                column,
                row: 18,
                sheet: "RO refills",
                value: { stringValue: header },
            })),
        ],
        metadata: {
            sheets: names.map((title, sheetId) => ({
                charts:
                    title === "P01 Test"
                        ? [
                              {
                                  chartId: 100,
                                  spec: {
                                      basicChart: {
                                          axis: [],
                                          domains: [],
                                          series: [],
                                      },
                                      title: "Time between waterings",
                                  },
                              },
                          ]
                        : [],
                properties: {
                    gridProperties: { columnCount: 26, rowCount: 1000 },
                    sheetId,
                    title,
                },
                protectedRanges:
                    title === "Integrity"
                        ? [
                              {
                                  protectedRangeId: 77,
                                  range: { sheetId },
                                  warningOnly: false,
                              },
                          ]
                        : [],
            })),
        },
    };
}

describe("workbook presentation migration", () => {
    it("changes font overrides while preserving the chart data and source object", () => {
        expect.hasAssertions();

        const original = {
            basicChart: {
                axis: [{ format: { fontFamily: "Roboto", italic: true } }],
                series: [
                    {
                        colorStyle: { rgbColor: { red: 1 } },
                        dataLabel: { textFormat: { fontFamily: "Roboto" } },
                    },
                ],
            },
            fontName: "Roboto",
            title: "Waterings",
            titleTextFormat: { bold: true, fontFamily: "Arial", fontSize: 16 },
        };
        const before = structuredClone(original);
        const updated = withWorkbookChartFont(original);

        expect(original).toStrictEqual(before);
        expect(updated.titleTextFormat).toStrictEqual({
            bold: true,
            fontFamily: "JetBrains Mono",
            fontSize: 16,
        });
        expect(updated.basicChart.axis[0]?.format).toStrictEqual({
            fontFamily: "JetBrains Mono",
            italic: true,
        });
        expect(updated.basicChart.series[0]?.colorStyle).toStrictEqual(
            original.basicChart.series[0]?.colorStyle
        );
        expect(
            updated.basicChart.series[0]?.dataLabel.textFormat.fontFamily
        ).toBe("JetBrains Mono");
    });

    it("rewires dependencies before deletion and preserves existing strict protections", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const requests = buildWorkbookPresentationRequests(snapshot);

        expect(snapshot).toStrictEqual(before);
        expect(requests.at(-1)).toStrictEqual({ deleteSheet: { sheetId: 1 } });
        expect(JSON.stringify(requests.slice(0, 3))).toContain(
            "#gid=2&range=A4:D21"
        );
        expect(JSON.stringify(requests.slice(0, 3))).not.toContain(
            "Daily care"
        );
        expect(
            requests.filter((request) => "repeatCell" in request)
        ).toHaveLength(5);
        expect(
            requests.filter((request) => "addProtectedRange" in request)
        ).toHaveLength(4);
        expect(
            requests.some(
                (request) =>
                    "deleteProtectedRange" in request ||
                    "updateProtectedRange" in request
            )
        ).toBe(false);
        expect(
            requests.some(
                (request) => "updateEmbeddedObjectPosition" in request
            )
        ).toBe(false);
        expect(JSON.stringify(requests)).not.toContain('"index"');
        expect(
            requests.filter((request) => "updateCells" in request)
        ).toHaveLength(3);
    });

    it("leaves refill inputs editable but keeps totals and headers protected", () => {
        expect.hasAssertions();

        const requests = buildWorkbookPresentationRequests(fixture());

        expect(requests).toContainEqual({
            addProtectedRange: {
                protectedRange: {
                    description:
                        "Garden workbook · RO refills · confirm manual edits",
                    range: { sheetId: 3 },
                    unprotectedRanges: [
                        {
                            endColumnIndex: 9,
                            sheetId: 3,
                            startColumnIndex: 0,
                            startRowIndex: 19,
                        },
                        {
                            endColumnIndex: 13,
                            sheetId: 3,
                            startColumnIndex: 10,
                            startRowIndex: 19,
                        },
                    ],
                    warningOnly: true,
                },
            },
        });
    });

    it("leaves explicitly selected charts for the native editor", () => {
        expect.hasAssertions();
        expect(
            buildWorkbookPresentationRequests(fixture(), [100]).some(
                (request) => "updateChartSpec" in request
            )
        ).toBe(false);
    });

    it.each([
        "Daily care",
        "RO refills",
        "Dashboard",
        "Integrity",
    ])("refuses changed %s cells before producing writes", (name) => {
        expect.hasAssertions();

        const snapshot = fixture();
        snapshot.cells = snapshot.cells.filter((cell) => cell.sheet !== name);

        expect(() => buildWorkbookPresentationRequests(snapshot)).toThrow(
            /Unexpected/v
        );
    });

    it("refuses replay after the retired tab has gone", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        snapshot.metadata.sheets = snapshot.metadata.sheets.filter(
            (sheet) => sheet.properties.title !== "Daily care"
        );

        expect(() => buildWorkbookPresentationRequests(snapshot)).toThrow(
            /do not replay/v
        );
    });
});
