import { describe, expect, it } from "vitest";

import { buildInventoryMetadataRequests } from "../../scripts/google-sheets/inventory-metadata.mjs";

describe("inventory presentation range expansion", () => {
    it("preserves filter criteria and sorting while expanding both inventories", () => {
        expect.hasAssertions();

        const metadata = {
            sheets: [
                {
                    basicFilter: {
                        criteria: { 16: { hiddenValues: ["Calibrated"] } },
                        range: {
                            endColumnIndex: 31,
                            endRowIndex: 36,
                            sheetId: 12,
                            startColumnIndex: 0,
                            startRowIndex: 5,
                        },
                        sortSpecs: [
                            { dimensionIndex: 2, sortOrder: "DESCENDING" },
                        ],
                    },
                    properties: { sheetId: 12, title: "Dashboard" },
                },
                {
                    basicFilter: {
                        range: {
                            endColumnIndex: 36,
                            endRowIndex: 31,
                            startColumnIndex: 0,
                            startRowIndex: 0,
                        },
                    },
                    properties: { sheetId: 0, title: "Plant tracker" },
                },
            ],
        };
        const before = structuredClone(metadata);
        const requests = buildInventoryMetadataRequests(metadata);

        expect(metadata).toStrictEqual(before);
        expect(requests).toStrictEqual([
            {
                setBasicFilter: {
                    filter: {
                        ...before.sheets[0]?.basicFilter,
                        range: {
                            ...before.sheets[0]?.basicFilter.range,
                            endRowIndex: 38,
                        },
                    },
                },
            },
            {
                setBasicFilter: {
                    filter: {
                        range: {
                            endColumnIndex: 36,
                            endRowIndex: 33,
                            sheetId: 0,
                            startColumnIndex: 0,
                            startRowIndex: 0,
                        },
                    },
                },
            },
        ]);
    });

    it("extends calibration and calendar rules in place without changing formulas or priority", () => {
        expect.hasAssertions();

        const rule = {
            booleanRule: {
                condition: {
                    type: "CUSTOM_FORMULA",
                    values: [{ userEnteredValue: '=$H2="Calibrated"' }],
                },
                format: { backgroundColor: { green: 0.7 } },
            },
            ranges: [
                {
                    endColumnIndex: 8,
                    endRowIndex: 31,
                    sheetId: 3,
                    startColumnIndex: 7,
                    startRowIndex: 1,
                },
            ],
        };
        const untouched = {
            ...rule,
            ranges: [
                {
                    endColumnIndex: 3,
                    endRowIndex: 21,
                    sheetId: 3,
                    startColumnIndex: 2,
                    startRowIndex: 4,
                },
            ],
        };
        const calendarRule = {
            booleanRule: {
                condition: {
                    type: "TEXT_EQ",
                    values: [{ userEnteredValue: "Fed" }],
                },
            },
            ranges: [
                {
                    endColumnIndex: 57,
                    endRowIndex: 34,
                    sheetId: 4,
                    startColumnIndex: 1,
                    startRowIndex: 4,
                },
            ],
        };
        const metadata = {
            sheets: [
                {
                    conditionalFormats: [untouched, rule],
                    properties: { sheetId: 3, title: "Baselines" },
                },
                {
                    conditionalFormats: [calendarRule],
                    properties: { sheetId: 4, title: "Watering calendar" },
                },
            ],
        };
        const before = structuredClone(metadata);

        expect(buildInventoryMetadataRequests(metadata)).toStrictEqual([
            {
                updateConditionalFormatRule: {
                    index: 1,
                    rule: {
                        ...rule,
                        ranges: [{ ...rule.ranges[0], endRowIndex: 33 }],
                    },
                    sheetId: 3,
                },
            },
            {
                updateConditionalFormatRule: {
                    index: 0,
                    rule: {
                        ...calendarRule,
                        ranges: [
                            { ...calendarRule.ranges[0], endRowIndex: 36 },
                        ],
                    },
                    sheetId: 4,
                },
            },
        ]);
        expect(metadata).toStrictEqual(before);
    });

    it("extends Integrity's previously truncated roster and leaves exception checks intact", () => {
        expect.hasAssertions();

        const metadata = {
            sheets: [
                {
                    basicFilter: {
                        range: {
                            endRowIndex: 51,
                            sheetId: 9,
                            startRowIndex: 22,
                        },
                    },
                    conditionalFormats: [
                        {
                            ranges: [
                                {
                                    endRowIndex: 51,
                                    sheetId: 9,
                                    startRowIndex: 23,
                                },
                            ],
                        },
                        {
                            ranges: [
                                {
                                    endRowIndex: 21,
                                    sheetId: 9,
                                    startRowIndex: 4,
                                },
                            ],
                        },
                    ],
                    properties: { sheetId: 9, title: "Integrity" },
                },
            ],
        };

        expect(buildInventoryMetadataRequests(metadata)).toStrictEqual([
            {
                setBasicFilter: {
                    filter: {
                        range: {
                            endRowIndex: 55,
                            sheetId: 9,
                            startRowIndex: 22,
                        },
                    },
                },
            },
            {
                updateConditionalFormatRule: {
                    index: 0,
                    rule: {
                        ranges: [
                            { endRowIndex: 55, sheetId: 9, startRowIndex: 23 },
                        ],
                    },
                    sheetId: 9,
                },
            },
        ]);
    });

    it("preserves band colors and ignores unrelated, unbounded, foreign, or already expanded ranges", () => {
        expect.hasAssertions();

        const band = {
            bandedRangeId: 90,
            range: { endRowIndex: 31, sheetId: 2, startRowIndex: 0 },
            rowProperties: { headerColor: { red: 0.2 } },
        };
        const metadata = {
            sheets: [
                {
                    bandedRanges: [band],
                    basicFilter: {
                        range: {
                            endRowIndex: 1000,
                            sheetId: 2,
                            startRowIndex: 0,
                        },
                    },
                    conditionalFormats: [
                        {
                            ranges: [
                                {
                                    endRowIndex: 31,
                                    sheetId: 7,
                                    startRowIndex: 1,
                                },
                                {
                                    endRowIndex: 33,
                                    sheetId: 2,
                                    startRowIndex: 1,
                                },
                                { sheetId: 2, startRowIndex: 1 },
                            ],
                        },
                    ],
                    properties: { sheetId: 2, title: "Baselines" },
                },
                {
                    basicFilter: {
                        range: {
                            endRowIndex: 31,
                            sheetId: 7,
                            startRowIndex: 0,
                        },
                    },
                    properties: { sheetId: 7, title: "History" },
                },
            ],
        };

        expect(buildInventoryMetadataRequests(metadata)).toStrictEqual([
            {
                updateBanding: {
                    bandedRange: {
                        ...band,
                        range: { ...band.range, endRowIndex: 33 },
                    },
                    fields: "range",
                },
            },
        ]);
    });
});

describe("current 32-pot presentation bounds", () => {
    it("extends current roster metadata by two and leaves stale or unrelated ranges alone", () => {
        expect.hasAssertions();

        const range = {
            endColumnIndex: 36,
            endRowIndex: 33,
            sheetId: 3,
            startColumnIndex: 0,
            startRowIndex: 0,
        };
        const metadata = {
            sheets: [
                {
                    bandedRanges: [{ bandedRangeId: 50, range }],
                    basicFilter: {
                        range,
                        sortSpecs: [
                            { dimensionIndex: 1, sortOrder: "ASCENDING" },
                        ],
                    },
                    conditionalFormats: [
                        {
                            booleanRule: {
                                condition: {
                                    type: "TEXT_EQ",
                                    values: [{ userEnteredValue: "Review" }],
                                },
                            },
                            ranges: [range],
                        },
                    ],
                    properties: { sheetId: 3, title: "Plant tracker" },
                },
            ],
        };
        const before = structuredClone(metadata);
        const requests = buildInventoryMetadataRequests(metadata, 32);

        expect(metadata).toStrictEqual(before);
        expect(requests).toHaveLength(3);
        expect(JSON.stringify(requests)).toContain('"endRowIndex":35');
        expect(JSON.stringify(requests)).toContain('"bandedRangeId":50');
        expect(JSON.stringify(requests)).toContain('"sortOrder":"ASCENDING"');
        expect(JSON.stringify(requests)).toContain(
            '"userEnteredValue":"Review"'
        );

        range.endRowIndex = 31;

        expect(buildInventoryMetadataRequests(metadata, 32)).toStrictEqual([]);
        expect(() => buildInventoryMetadataRequests(metadata, 34)).toThrow(
            "Unsupported inventory base count"
        );
    });
});

describe("current Quick log presentation", () => {
    it("extends the verified current Quick log banding that includes its row-four header", () => {
        expect.hasAssertions();

        const metadata = {
            sheets: [
                {
                    bandedRanges: [
                        {
                            bandedRangeId: 51,
                            range: {
                                endColumnIndex: 15,
                                endRowIndex: 36,
                                sheetId: 4,
                                startColumnIndex: 0,
                                startRowIndex: 3,
                            },
                        },
                    ],
                    properties: { sheetId: 4, title: "Quick log" },
                },
            ],
        };
        const requests = buildInventoryMetadataRequests(metadata, 32);

        expect(requests).toHaveLength(1);
        expect(JSON.stringify(requests)).toContain('"endRowIndex":38');
        expect(JSON.stringify(requests)).toContain('"startRowIndex":3');
        expect(buildInventoryMetadataRequests(metadata, 30)).not.toContainEqual(
            requests[0]
        );
    });
});
