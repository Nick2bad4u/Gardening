import { describe, expect, it } from "vitest";

import {
    buildHumiditySchemaRequests,
    verifyHumiditySchemaPreconditions,
} from "../../scripts/google-sheets/humidity-schema.mjs";
import { required } from "../helpers/required.mjs";

function fixture() {
    const schema = {
        entryHeaders: Array.from({ length: 34 }, (_, i) => `Entry ${i}`),
        historyHeaders: Array.from({ length: 42 }, (_, i) => `History ${i}`),
    };
    const formula =
        '=LET(rows,SORT(FILTER(History!A2:AP5000,History!A2:A5000<>""),1,FALSE,10,FALSE),fmt,LAMBDA(d,IF(d="","",IF(MOD(d,1)=0,TEXT(d,"M/d/yyyy"),TEXT(d,"M/d/yyyy h:mm AM/PM")))),VSTACK(History!A1:AP1,HSTACK(MAP(CHOOSECOLS(rows,1),fmt),CHOOSECOLS(rows,SEQUENCE(1,41,2,1)))))';
    /** @type {import("../../scripts/google-sheets/inventory-expansion.mjs").NativeSnapshot} */
    const snapshot = {
        sheets: [
            "History",
            "History view",
            "App entries",
        ].map((title, index) => {
            const rowCount = index === 0 ? 5000 : 1000;
            const headers =
                index === 2 ? schema.entryHeaders : schema.historyHeaders;
            /** @type {import("../../scripts/google-sheets/inventory-expansion.mjs").Cell[][]} */
            const rows = Array.from({ length: rowCount }, () => []);
            rows[0] =
                index === 1
                    ? [{ userEnteredValue: { formulaValue: formula } }]
                    : headers.map((stringValue) => ({
                          userEnteredValue: { stringValue },
                      }));
            rows[1] = [
                {
                    userEnteredValue: {
                        stringValue:
                            index === 2
                                ? "Queued real draft"
                                : "Existing evidence",
                    },
                },
            ];
            return {
                data: [{ rowData: rows.map((values) => ({ values })) }],
                properties: {
                    gridProperties: {
                        columnCount: headers.length,
                        rowCount,
                    },
                    sheetId: index + 1,
                    title,
                },
            };
        }),
    };
    return { schema, snapshot };
}

describe("guarded native humidity schema extension", () => {
    it("preserves existing evidence and staging while adding humidity columns and the sorted projection", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const history = required(snapshot.sheets[0]);
        history["basicFilter"] = {
            range: { endColumnIndex: 42, endRowIndex: 5000, sheetId: 1 },
            sortSpecs: [{ dimensionIndex: 0, sortOrder: "ASCENDING" }],
        };
        history["bandedRanges"] = [
            {
                bandedRangeId: 99,
                range: { endColumnIndex: 42, endRowIndex: 5000, sheetId: 1 },
                rowProperties: { headerColor: { red: 0.3 } },
            },
        ];
        required(snapshot.sheets[2])["basicFilter"] = {
            range: { endColumnIndex: 34, endRowIndex: 1000, sheetId: 3 },
            sortSpecs: [{ dimensionIndex: 1, sortOrder: "DESCENDING" }],
        };
        const before = structuredClone(snapshot);
        const plan = buildHumiditySchemaRequests(snapshot, schema);

        expect(snapshot).toStrictEqual(before);
        expect(verifyHumiditySchemaPreconditions(plan, snapshot)).toBe(true);

        expect(
            plan.requests.some(
                (request) =>
                    "setBasicFilter" in request ||
                    "clearBasicFilter" in request ||
                    "sortRange" in request
            )
        ).toBe(false);
        expect(plan.requests).toContainEqual({
            updateBanding: {
                bandedRange: {
                    bandedRangeId: 99,
                    range: {
                        endColumnIndex: 43,
                        endRowIndex: 5000,
                        sheetId: 1,
                    },
                    rowProperties: { headerColor: { red: 0.3 } },
                },
                fields: "range",
            },
        });

        const text = JSON.stringify(plan.requests);

        expect(text).toContain("History!A2:AQ5000");
        expect(text).toContain("SEQUENCE(1,42,2,1)");
        expect(text).toContain("NUMBER_BETWEEN");
        expect(text).not.toContain("showCustomUi");
        expect(text).not.toContain("Queued real draft");
        expect(text).not.toContain("Existing evidence");
        expect(
            plan.requests.filter((request) => "appendDimension" in request)
        ).toHaveLength(3);
        expect(
            plan.requests.filter((request) => "updateCells" in request)
        ).toHaveLength(3);
    });

    it("rejects occupied destinations, replay, schema drift, incomplete snapshots, and changed canonical rows", () => {
        expect.hasAssertions();

        const { schema, snapshot } = fixture();
        const plan = buildHumiditySchemaRequests(snapshot, schema);
        const history = required(snapshot.sheets[0]);
        const rows = required(history.data?.[0]?.rowData);
        required(rows[1]).values = [
            { userEnteredValue: { stringValue: "New real evidence" } },
        ];

        expect(() => verifyHumiditySchemaPreconditions(plan, snapshot)).toThrow(
            "snapshot changed"
        );

        required(required(rows[0]).values)[42] = {
            userEnteredValue: { stringValue: "Relative humidity (%)" },
        };

        expect(() => buildHumiditySchemaRequests(snapshot, schema)).toThrow(
            "destination occupied"
        );

        required(required(rows[0]).values).pop();
        required(rows[1]).values = Array.from({ length: 43 }, () => ({}));
        required(required(rows[1]).values)[42] = {
            effectiveValue: { numberValue: 80 },
        };

        expect(() => buildHumiditySchemaRequests(snapshot, schema)).toThrow(
            /Humidity destination occupied.*History/v
        );

        required(rows[1]).values = [];
        required(required(rows[0]).values)[0] = {
            userEnteredValue: { stringValue: "Unexpected header" },
        };

        expect(() => buildHumiditySchemaRequests(snapshot, schema)).toThrow(
            "Legacy headers changed"
        );

        required(required(rows[0]).values)[0] = {
            userEnteredValue: {
                stringValue: required(schema.historyHeaders[0]),
            },
        };
        rows.pop();

        expect(() => buildHumiditySchemaRequests(snapshot, schema)).toThrow(
            "Missing complete schema rows"
        );
    });
});
