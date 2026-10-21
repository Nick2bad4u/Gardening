import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

import {
    analyticsReadResponse,
    appsScriptApi,
} from "../helpers/apps-script-api.mjs";
import { required } from "../helpers/required.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = readFileSync(sourceUrl, "utf8");
const spreadsheetId = "analytics-reader-fixture";
const consumed = [
    0,
    1,
    2,
    3,
    4,
    8,
    10,
    15,
    26,
    28,
    29,
    30,
    34,
    35,
    40,
    42,
    43,
    44,
    48,
    49,
    50,
    51,
];
/** @typedef {import("../logger-fixtures.js").CellValue} Cell */
/** @typedef {import("../logger-fixtures.js").AnalyticsReadOptions} ReadOptions */
/** @typedef {import("../logger-fixtures.js").AnalyticsReadResponse} ReadResponse */

/** @param {Cell[][]} history @param {string} [timeZone] */
function fixture(history, timeZone = "UTC") {
    const nativeRead = vi.fn(
        (
            /** @type {number} */ row = 2,
            /** @type {number} */ column = 1,
            /** @type {number} */ count = history.length,
            /** @type {number} */ width = 1
        ) =>
            /** @type {unknown} */ (
                history
                    .slice(row - 2, row - 2 + count)
                    .map((values) =>
                        values.slice(column - 1, column - 1 + width)
                    )
            )
    );
    const sheet = {
        getRange: (row = 2, column = 1, count = history.length, width = 1) => ({
            getValues: () => nativeRead(row, column, count, width),
        }),
    };
    const spreadsheet = { getId: () => spreadsheetId };
    /** @param {string} id @param {ReadOptions} options */
    const response = (id, options) =>
        analyticsReadResponse(id, options, history, (date) =>
            wallSerial(date, timeZone)
        );
    const batchGet = vi.fn(
        (/** @type {string} */ id, /** @type {ReadOptions} */ options) =>
            /** @type {unknown} */ (response(id, options))
    );
    const context = vm.createContext({
        console,
        Date,
        Map,
        Sheets: { Spreadsheets: { Values: { batchGet } } },
        Utilities: {
            formatDate: (/** @type {Date} */ date) =>
                date.toISOString().slice(0, 10),
        },
    });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    const api = appsScriptApi(context);
    return {
        api,
        batchGet,
        context,
        nativeRead,
        read: (count = history.length) =>
            structuredClone(
                api.gardenAnalyticsHistoryRows_(
                    spreadsheet,
                    sheet,
                    count,
                    timeZone
                )
            ),
        response,
        sheet,
        spreadsheet,
    };
}

/** @param {string} scenario */
function historyScenario(scenario) {
    const events = [
        "Water",
        "Weigh",
        "Light",
        "Weigh",
        "Humidity",
        "Weigh",
        "Move",
        "Temperature",
    ];
    const history = Array.from({ length: 480 }, (_, index) =>
        observation(
            index,
            scenario === "environment"
                ? "Light"
                : required(events[Math.floor(index / 3) % events.length])
        )
    );
    if (scenario === "corrections") {
        for (let index = 3; index < 80; index += 3) {
            const prior = required(history[index - 3]);
            const row = required(history[index]);
            prior[35] = "Removed";
            row[30] = prior[26];
        }
    }
    return history;
}

/** @param {number} index @param {string} [event] @returns {Cell[]} */
function observation(index, event = "Weigh") {
    const row = Array.from({ length: 67 }, () => /** @type {Cell} */ (""));
    row[0] = new Date(Date.UTC(2026, 0, 1) + index * 600_000 + 123);
    row[1] = `P${String((index % 3) + 1).padStart(2, "0")}`;
    row[2] = event;
    row[3] = "Routine";
    row[4] = event === "Weigh" ? 900 - (index % 80) : "";
    row[8] = "Synthetic observation";
    row[10] = 1;
    row[15] = `request-${index}`;
    row[26] = `observation-${index}`;
    row[28] = event === "Weigh" ? "Measured" : "Observed";
    row[29] = `save-${index}`;
    row[34] = event === "Weigh" ? "Scale" : "Observed";
    row[35] = "Active";
    row[40] = event === "Water" ? "Top water" : "";
    row[42] = event === "Humidity" ? 35 + (index % 30) : "";
    row[43] = event === "Light" ? index % 400 : "";
    row[49] = event === "Move" ? "Synthetic shelf" : "";
    row[50] = event === "Temperature" ? 23 : "";
    row[51] = event === "Temperature" ? "Air" : "";
    return row;
}

// Independent oracle: assemble wall-calendar components, rather than parsing
// the production helper's GMT offset or using its reverse conversion.
/** @param {Date} date @param {string} timeZone */
function wallSerial(date, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
        month: "2-digit",
        second: "2-digit",
        timeZone,
        year: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const fields = Object.fromEntries(
        parts.map(({ type, value }) => [type, Number(value)])
    );
    return (
        Date.UTC(
            required(fields["year"]),
            required(fields["month"]) - 1,
            required(fields["day"]),
            required(fields["hour"]),
            required(fields["minute"]),
            required(fields["second"]),
            date.getUTCMilliseconds()
        ) /
            86_400_000 +
        25_569
    );
}

describe("paired analytics History reader", () => {
    it("reconstructs truly blank rows when Sheets omits values for empty ranges", () => {
        expect.hasAssertions();

        const test = fixture([Array.from({ length: 67 }, () => "")]);

        test.batchGet.mockImplementation((id, options) => ({
            spreadsheetId: id,
            valueRanges: options.ranges.map((range) => ({
                majorDimension: "ROWS",
                range,
            })),
        }));

        expect(test.read()).toStrictEqual([
            Array.from({ length: 67 }, () => ""),
        ]);
        expect(test.batchGet).toHaveBeenCalledTimes(3);
        expect(test.nativeRead).not.toHaveBeenCalled();
    });

    it("uses the native date when timezone sampling would exceed the Date range", () => {
        expect.hasAssertions();

        const row = observation(0);
        row[0] = new Date(8_640_000_000_000_000);
        const test = fixture([row]);

        expect(test.read()[0]?.[0]).toStrictEqual(row[0]);
        expect(test.nativeRead).toHaveBeenCalledExactlyOnceWith(2, 1, 1, 1);
    });

    it("uses the native date if the candidate instant has an unsupported offset despite valid day samples", () => {
        expect.hasAssertions();

        const row = observation(0);
        const test = fixture([row]);
        const formatToParts = vi
            .fn()
            .mockReturnValueOnce([{ type: "timeZoneName", value: "GMT" }])
            .mockReturnValueOnce([{ type: "timeZoneName", value: "GMT" }])
            .mockReturnValueOnce([{ type: "timeZoneName", value: "GMT" }])
            .mockReturnValue([{ type: "timeZoneName", value: "GMT+00:00:30" }]);

        test.context["Intl"] = {
            DateTimeFormat: vi.fn(function candidateFormatter() {
                return { formatToParts };
            }),
        };

        expect(test.read()[0]?.[0]).toStrictEqual(row[0]);
        expect(formatToParts).toHaveBeenCalledTimes(4);
        expect(test.nativeRead).toHaveBeenCalledExactlyOnceWith(2, 1, 1, 1);
    });

    it("reads exactly the consumed columns, preserves scalars, and reconstructs native row width", () => {
        expect.hasAssertions();

        const row = observation(0);
        row[4] = 0;
        row[8] = false;
        row[10] = "1";
        row[12] = "Unconsumed formula output";
        const test = fixture([row]);
        const actual = test.read();

        expect(actual).toHaveLength(1);
        expect(actual[0]).toHaveLength(67);
        expect(structuredClone(actual[0])).toStrictEqual(
            row.map((value, column) => (consumed.includes(column) ? value : ""))
        );
        expect(test.nativeRead).not.toHaveBeenCalled();
        expect(test.batchGet).toHaveBeenCalledTimes(3);

        const calls = test.batchGet.mock.calls;

        expect(
            calls.map(([, options]) => options.dateTimeRenderOption)
        ).toStrictEqual([
            "SERIAL_NUMBER",
            "FORMATTED_STRING",
            "SERIAL_NUMBER",
        ]);
        expect(structuredClone(calls[0]?.[1].ranges)).toStrictEqual([
            "'History'!A2:A2",
            "'History'!B2:E2",
            "'History'!I2:I2",
            "'History'!K2:K2",
            "'History'!P2:P2",
            "'History'!AA2:AA2",
            "'History'!AC2:AE2",
            "'History'!AI2:AJ2",
            "'History'!AO2:AO2",
            "'History'!AQ2:AS2",
            "'History'!AW2:AZ2",
        ]);
        expect(structuredClone(calls[2]?.[1])).toStrictEqual({
            dateTimeRenderOption: "SERIAL_NUMBER",
            majorDimension: "ROWS",
            ranges: ["'History'!A2:A2"],
            valueRenderOption: "UNFORMATTED_VALUE",
        });
    });

    it("does not call services for empty History and rejects out-of-capacity inputs", () => {
        expect.hasAssertions();

        const test = fixture([]);

        expect(test.read()).toStrictEqual([]);

        for (const count of [
            -1,
            1.5,
            50_001,
            NaN,
            Infinity,
        ]) {
            expect(() => test.read(count)).toThrow(
                "supported analytics capacity"
            );
        }

        expect(test.batchGet).not.toHaveBeenCalled();
        expect(test.nativeRead).not.toHaveBeenCalled();
    });

    it.each([
        "representative",
        "environment",
        "corrections",
    ])(
        "preserves all four complete output matrices for %s History",
        (scenario) => {
            expect.hasAssertions();

            const history = historyScenario(scenario);
            const before = structuredClone(history);
            const test = fixture(history, "America/New_York");
            const result = test.read();
            const asOf = new Date("2026-02-01T00:00:00Z");

            expect(
                structuredClone(
                    test.api.gardenAnalyticsOutputs_(
                        result,
                        "P01",
                        1,
                        asOf,
                        "America/New_York"
                    )
                )
            ).toStrictEqual(
                structuredClone(
                    test.api.gardenAnalyticsOutputs_(
                        history,
                        "P01",
                        1,
                        asOf,
                        "America/New_York"
                    )
                )
            );
            expect(history).toStrictEqual(before);
            expect(test.nativeRead).not.toHaveBeenCalled();
        }
    );

    it.each([
        "UTC",
        "America/New_York",
        "Asia/Kathmandu",
        "Australia/Lord_Howe",
        "Pacific/Chatham",
    ])(
        "round-trips millisecond timestamps and DST transitions in %s",
        (zone) => {
            expect.hasAssertions();

            const dates = [
                "2026-03-08T06:59:59.999Z",
                "2026-03-08T07:00:00.001Z",
                "2026-04-04T14:59:59.123Z",
                "2026-04-04T15:00:00.000Z",
                "2026-10-03T15:29:59.001Z",
                "2026-10-03T15:30:00.999Z",
                "2026-12-31T23:59:59.123Z",
            ].map((value) => new Date(value));
            const history = dates.map((date, index) => {
                const row = observation(index);
                row[0] = date;
                return row;
            });
            const test = fixture(history, zone);

            expect(test.read().map((row) => row[0])).toStrictEqual(dates);
        }
    );

    it("preserves raw numeric, boolean, blank, and text timestamp cells without guessing Dates", () => {
        expect.hasAssertions();

        const values = [
            46_000,
            0,
            -1,
            false,
            true,
            "",
            "2026-10-20T00:00:00Z",
            "bad date",
        ];
        const history = values.map((value, index) => {
            const row = observation(index);
            row[0] = value;
            return row;
        });
        const test = fixture(history);

        expect(test.read().map((row) => row[0])).toStrictEqual(values);
        expect(test.nativeRead).not.toHaveBeenCalled();
    });

    it("uses native values for every non-timestamp Date cell", () => {
        expect.hasAssertions();

        const history = consumed.slice(1).map((column, index) => {
            const row = observation(index);
            row[column] = new Date("2026-10-20T01:02:03.456Z");
            return row;
        });
        const test = fixture(history);
        const actual = test.read();

        for (const [index, column] of consumed.slice(1).entries()) {
            expect(actual[index]?.[column]).toStrictEqual(
                history[index]?.[column]
            );
        }

        expect(test.nativeRead).toHaveBeenCalledTimes(consumed.length - 1);
        expect(
            test.nativeRead.mock.calls.every(
                (call) => call[2] === 1 && call[3] === 1
            )
        ).toBe(true);
    });

    it("preserves hidden-format dates even when their formatted rendering is empty", () => {
        expect.hasAssertions();

        const history = [observation(0)];
        const test = fixture(history);

        test.batchGet.mockImplementation((id, options) => {
            const response = test.response(id, options);
            if (options.dateTimeRenderOption === "FORMATTED_STRING")
                required(response.valueRanges[0]).values = [[""]];
            return response;
        });

        expect(test.read()[0]?.[0]).toStrictEqual(history[0]?.[0]);
        expect(test.nativeRead).not.toHaveBeenCalled();
    });

    it("rounds serial floating-point residue to the original millisecond", () => {
        expect.hasAssertions();

        const row = observation(0);
        const test = fixture([row]);
        const date = new Date("2026-01-01T00:00:00.123Z");
        row[0] = date;
        const serial = wallSerial(date, "UTC") + 0.25 / 86_400_000;

        test.batchGet.mockImplementation((id, options) => {
            const response = test.response(id, options);
            if (options.dateTimeRenderOption === "SERIAL_NUMBER")
                required(response.valueRanges[0]).values = [[serial]];
            return response;
        });

        expect(test.read()[0]?.[0]).toStrictEqual(date);
        expect(test.nativeRead).not.toHaveBeenCalled();
    });

    it("falls back natively when native Intl offset support is unavailable", () => {
        expect.hasAssertions();

        const history = [observation(0), observation(1)];
        const test = fixture(history);

        test.context["Intl"] = null;

        expect(test.read().map((row) => row[0])).toStrictEqual(
            history.map((row) => row[0])
        );
        expect(test.nativeRead).toHaveBeenCalledExactlyOnceWith(2, 1, 2, 1);
    });

    it("groups ambiguous fold times into a native read instead of choosing one instant", () => {
        expect.hasAssertions();

        const dates = [
            new Date("2026-11-01T05:30:00.123Z"),
            new Date("2026-11-01T06:30:00.123Z"),
        ];
        const history = dates.map((date, index) => {
            const row = observation(index);
            row[0] = date;
            return row;
        });
        const test = fixture(history, "America/New_York");

        expect(test.read().map((row) => row[0])).toStrictEqual(dates);
        expect(test.nativeRead).toHaveBeenCalledExactlyOnceWith(2, 1, 2, 1);
    });

    it.each([
        [
            "gap",
            "America/New_York",
            new Date("2026-03-08T07:30:00Z"),
            Date.UTC(2026, 2, 8, 2, 30) / 86_400_000 + 25_569,
        ],
        [
            "historical seconds",
            "Asia/Kathmandu",
            new Date("1900-01-01T00:00:00Z"),
            undefined,
        ],
        [
            "out-of-range date serial",
            "UTC",
            new Date("2026-01-01T00:00:00Z"),
            Number.MAX_VALUE,
        ],
    ])(
        "preserves native timestamp handling for %s",
        (_name, zone, date, serial) => {
            expect.hasAssertions();

            const row = observation(0);
            row[0] = date;
            const test = fixture([row], zone);

            test.batchGet.mockImplementation((id, options) => {
                const response = test.response(id, options);
                if (
                    serial !== undefined &&
                    options.dateTimeRenderOption === "SERIAL_NUMBER"
                )
                    required(response.valueRanges[0]).values = [[serial]];
                return response;
            });

            expect(test.read()[0]?.[0]).toStrictEqual(date);
            expect(test.nativeRead).toHaveBeenCalledExactlyOnceWith(2, 1, 1, 1);
        }
    );

    it("preserves native error strings and hash-prefixed literal text without stripping diagnostics", () => {
        expect.hasAssertions();

        const values = [
            "#DIV/0!",
            "#DIV/0! (literal detail)",
            "#literal",
            "#VALUE!",
        ];
        const history = values.map((value, index) => {
            const row = observation(index);
            row[4] = value;
            return row;
        });
        required(history[3])[0] = "#REF!";
        const test = fixture(history);

        test.batchGet.mockImplementation((id, options) => {
            const response = test.response(id, options);
            for (const range of response.valueRanges)
                range.values = (range.values ?? []).map((row) =>
                    row.map((value) =>
                        value === "#DIV/0!"
                            ? "#DIV/0! (server diagnostic)"
                            : value
                    )
                );
            return response;
        });

        const result = test.read();

        expect(result.map((row) => row[4])).toStrictEqual(values);
        expect(result[3]?.[0]).toBe("#REF!");
        expect(test.nativeRead).toHaveBeenCalledTimes(2);
        expect(test.nativeRead).toHaveBeenCalledWith(2, 5, 4, 1);
    });
});

describe("analytics reader response boundaries", () => {
    /**
     * @type {{
     *     name: string;
     *     mutate: (response: ReadResponse) => unknown;
     * }[]}
     */
    const invalid = [
        { mutate: () => null, name: "null response" },
        {
            mutate: (response) => ({ ...response, spreadsheetId: "other" }),
            name: "wrong spreadsheet",
        },
        {
            mutate: (response) => ({ ...response, valueRanges: [] }),
            name: "missing blocks",
        },
        {
            mutate: (response) => ({ ...response, valueRanges: {} }),
            name: "non-array blocks",
        },
        {
            mutate: (response) => ({
                ...response,
                valueRanges: response.valueRanges.map(() => null),
            }),
            name: "missing block",
        },
        ...[
            { change: { range: "'History'!A3:A3" }, name: "wrong range" },
            { change: { range: "'Other'!A2:A2" }, name: "wrong sheet" },
            { change: { range: "'His'tory'!A2:A2" }, name: "embedded quotes" },
            {
                change: { majorDimension: "COLUMNS" },
                name: "column orientation",
            },
            { change: { values: {} }, name: "non-array rows" },
            { change: { values: [[1], [2]] }, name: "too many rows" },
            { change: { values: [1] }, name: "non-array row" },
            { change: { values: [[1, 2]] }, name: "too many columns" },
            { change: { values: [[{}]] }, name: "object cell" },
            { change: { values: [[Infinity]] }, name: "nonfinite cell" },
        ].map(({ change, name }) => ({
            mutate: (/** @type {ReadResponse} */ response) => ({
                ...response,
                valueRanges: response.valueRanges.map((range, index) =>
                    index === 0 ? { ...range, ...change } : range
                ),
            }),
            name,
        })),
    ];

    it.each(invalid)(
        "rejects $name before using a partial snapshot",
        ({ mutate }) => {
            expect.hasAssertions();

            const test = fixture([observation(0)]);

            test.batchGet.mockImplementationOnce((id, options) =>
                mutate(test.response(id, options))
            );

            expect(() => test.read()).toThrow(/analytics history/iv);
            expect(test.nativeRead).not.toHaveBeenCalled();
        }
    );

    it("accepts unquoted matching ranges and omitted trailing rows/cells as blanks", () => {
        expect.hasAssertions();

        const test = fixture([observation(0), observation(1)]);

        test.batchGet.mockImplementation((id, options) => ({
            spreadsheetId: id,
            valueRanges: options.ranges.map((range) => ({
                majorDimension: "ROWS",
                range: range.replaceAll("'", ""),
                values: [[null]],
            })),
        }));

        expect(test.read()).toStrictEqual(
            Array.from({ length: 2 }, () =>
                Array.from({ length: 67 }, () => "")
            )
        );
        expect(test.nativeRead).not.toHaveBeenCalled();
    });

    it.each([
        [123, 124],
        ["text", 123],
        [false, true],
    ])("rejects ordinary primitive drift from %s to %s", (left, right) => {
        expect.hasAssertions();

        const row = observation(0);
        row[4] = left;
        const test = fixture([row]);

        test.batchGet.mockImplementation((id, options) => {
            const response = test.response(id, options);
            if (options.dateTimeRenderOption === "FORMATTED_STRING")
                required(required(response.valueRanges[1]).values?.[0])[3] =
                    right;
            return response;
        });

        expect(() => test.read()).toThrow("reads disagree");
        expect(test.batchGet).toHaveBeenCalledTimes(2);
    });

    it("rejects a timestamp changed after paired reads or native fallbacks", () => {
        expect.hasAssertions();

        const test = fixture([observation(0)]);
        let calls = 0;

        test.batchGet.mockImplementation((id, options) => {
            calls += 1;
            const response = test.response(id, options);
            if (calls === 3)
                required(response.valueRanges[0]).values = [["changed"]];
            return response;
        });

        expect(() => test.read()).toThrow("timestamps changed");
        expect(test.batchGet).toHaveBeenCalledTimes(3);
    });

    it.each([
        null,
        [],
        [["#literal"], ["extra"]],
        [[]],
        [["#literal", "extra"]],
        [[{}]],
    ])("rejects malformed native fallback cells: %j", (native) => {
        expect.hasAssertions();

        const row = observation(0);
        row[8] = "#literal";
        const test = fixture([row]);

        test.nativeRead.mockReturnValueOnce(native);

        expect(() => test.read()).toThrow(/fallback|response cell/v);
        expect(test.batchGet).toHaveBeenCalledTimes(2);
    });

    it("reports missing Advanced Sheets service instead of falling back to an unbounded native read", () => {
        expect.hasAssertions();

        const test = fixture([observation(0)]);

        Reflect.deleteProperty(test.context, "Sheets");

        expect(() => test.read()).toThrow("values service is unavailable");
        expect(test.nativeRead).not.toHaveBeenCalled();
    });
});
