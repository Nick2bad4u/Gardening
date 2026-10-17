import { describe, expect, it } from "vitest";

import {
    parseAeroLabCsv,
    planSensorImport,
} from "../../scripts/google-sheets/sensor-import.mjs";

const headers =
    "Timestamp(1 min),Built-in Temperature(℉),Built-in Humidity(%),Built-in VPD(kPa),Probe Temperature(℉),Probe Humidity(%),Probe VPD(kPa)";
const options = { sensorId: "aerolab-01", timeZone: "America/New_York" };

/**
 * @param {string[]} rows @param {typeof options} [settings] @param {string}
 *   [header]
 */
function parse(rows, settings = options, header = headers) {
    return parseAeroLabCsv([header, ...rows].join("\n"), settings);
}

/** @param {string} time @param {string} [values] */
function row(time, values = "68,50,1.2,77,40,0.8") {
    return `${time},${values}`;
}

const first = row("2026/10/16 12:00:00");
const second = row("2026/10/16 12:01:00");
const third = row("2026/10/16 12:02:00");

describe("aeroLab CSV parsing", () => {
    it("keeps original values and units while resolving a wide reading to UTC", () => {
        expect.hasAssertions();

        const result = parse([first]);

        expect(result).toMatchObject({
            format: "aerolab-csv",
            issues: [],
            skippedEmptyRows: 0,
            sourceHeaders: headers.split(","),
        });
        expect(result.readings).toStrictEqual([
            {
                builtIn: {
                    humidity: 50,
                    temperature: 68,
                    temperatureC: 20,
                    temperatureUnit: "F",
                    vpd: 1.2,
                },
                key: "aerolab-01|2026-10-16T16:00:00.000Z",
                observedAt: "2026-10-16T16:00:00.000Z",
                probe: {
                    humidity: 40,
                    temperature: 77,
                    temperatureC: 25,
                    temperatureUnit: "F",
                    vpd: 0.8,
                },
                rawTimestamp: "2026/10/16 12:00:00",
                sensorId: "aerolab-01",
                sourceRow: 2,
                timeZone: "America/New_York",
            },
        ]);
    });

    it("handles BOM, CRLF and quoted header/value fields", () => {
        expect.hasAssertions();

        const csv = `\u{FEFF}${headers
            .split(",")
            .map((value) => `"${value}"`)
            .join(
                ","
            )}\r\n"2026/10/16 12:00:00","68","50","1.2","77","40","0.8"\r\n`;

        expect(parseAeroLabCsv(csv, options)).toStrictEqual(parse([first]));
    });

    it("preserves zero and negative temperatures and skips only fully empty readings", () => {
        expect.hasAssertions();

        const result = parse(
            [
                row("2026/10/16 12:00:00", "-,-,-,-,-,-"),
                "",
                row("2026/10/16 12:01:00", "0,0,0,-40,,"),
            ],
            options,
            headers.replaceAll("℉", "℃")
        );

        expect(result.skippedEmptyRows).toBe(2);
        expect(result.issues).toStrictEqual([]);
        expect(result.readings).toHaveLength(1);
        expect(result.readings[0]).toMatchObject({
            builtIn: { humidity: 0, temperatureC: 0, vpd: 0 },
            probe: { humidity: null, temperatureC: -40, vpd: null },
            sourceRow: 4,
        });
    });

    it.each([
        "℃",
        "°C",
        "C",
    ])("supports equivalent Celsius notation %s", (unit) => {
        expect.hasAssertions();
        expect(
            parse(
                [row("2026/10/16 12:00:00", "20,100,0,25,0,0")],
                options,
                headers.replaceAll("℉", () => unit)
            ).readings[0]?.builtIn.temperatureC
        ).toBe(20);
    });

    it.each([
        "℉",
        "°F",
        "F",
    ])("supports equivalent Fahrenheit notation %s", (unit) => {
        expect.hasAssertions();
        expect(
            parse(
                [first],
                options,
                headers.replaceAll("℉", () => unit)
            ).readings[0]?.builtIn.temperatureC
        ).toBe(20);
    });

    it.each([
        headers.replace("Built-in Humidity(%)", "Humidity(%)"),
        headers.replace("Timestamp(1 min)", "Timestamp"),
        headers.replaceAll("℉", "K"),
        `${headers},Extra`,
        headers.split(",").toReversed().join(","),
    ])("rejects unsupported schema %s", (header) => {
        expect.hasAssertions();
        expect(() => parse([first], options, header)).toThrow(
            /Unsupported AeroLab/v
        );
    });

    it.each([
        '"2026/10/16 12:00:00,68,50,1.2,77,40,0.8',
        '2026/10/16 12:00:00,6"8,50,1.2,77,40,0.8',
        '"2026/10/16 12:00:00"suffix,68,50,1.2,77,40,0.8',
    ])("rejects malformed quoting %s", (record) => {
        expect.hasAssertions();
        expect(() => parse([record])).toThrow(/CSV quot/v);
    });

    it("handles escaped quotes and embedded quoted commas/newlines without shifting columns", () => {
        expect.hasAssertions();

        const result = parse([
            '"2026/10/16 12:00:00",68,50,"1,""2\n",77,40,0.8',
        ]);

        expect(result.readings).toStrictEqual([]);
        expect(result.issues).toStrictEqual([
            { message: "VPD must be a finite decimal or missing.", row: 2 },
        ]);
    });

    it.each(["2026/10/16 12:00:00,68", `${first},extra`])(
        "rejects column count errors %s",
        (record) => {
            expect.hasAssertions();
            expect(() => parse([record])).toThrow(/columns; expected 7/v);
        }
    );

    it.each([
        ["NaN,50,0,20,50,0", "finite decimal"],
        ["Infinity,50,0,20,50,0", "finite decimal"],
        ["0x10,50,0,20,50,0", "finite decimal"],
        ["20x,50,0,20,50,0", "finite decimal"],
        ["1e999,50,0,20,50,0", "finite decimal"],
        ["20,-1,0,20,50,0", "Humidity"],
        ["20,101,0,20,50,0", "Humidity"],
        ["20,50,-0.1,20,50,0", "VPD"],
        ["-274,50,0,20,50,0", "absolute zero"],
        ["20,50,0,-274,50,0", "absolute zero"],
    ])("reports invalid metric row %s", (values, message) => {
        expect.hasAssertions();

        const result = parse(
            [row("2026/10/16 12:00:00", values)],
            options,
            headers.replaceAll("℉", "℃")
        );

        expect(result.readings).toStrictEqual([]);
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0]?.message).toContain(message);
    });

    it("accepts physical boundaries without manufacturer-specific upper limits", () => {
        expect.hasAssertions();

        const result = parse(
            [row("2026/10/16 12:00:00", "-273.15,100,99999,10000,0,0")],
            options,
            headers.replaceAll("℉", "℃")
        );

        expect(result.issues).toStrictEqual([]);
        expect(result.readings).toHaveLength(1);
    });

    it("accepts Fahrenheit absolute zero and large finite temperatures without intermediate overflow", () => {
        expect.hasAssertions();

        const result = parse([
            row("2026/10/16 12:00:00", "-459.67,50,0,1e308,50,0"),
        ]);

        expect(result.issues).toStrictEqual([]);
        expect(result.readings[0]?.builtIn.temperatureC).toBe(-273.15);
        expect(Number.isFinite(result.readings[0]?.probe.temperatureC)).toBe(
            true
        );
    });

    it.each([
        "2026/02/29 12:00:00",
        "2026/04/31 12:00:00",
        "2026/13/01 12:00:00",
        "2026/00/01 12:00:00",
        "2026/10/00 12:00:00",
        "2026/10/16 24:00:00",
        "2026/10/16 12:60:00",
        "2026/10/16 12:00:60",
        "2026-10-16 12:00:00",
        "2026/10/16 12:00",
        "0000/01/01 00:00:00",
    ])("rejects invalid timestamp %s", (timestamp) => {
        expect.hasAssertions();

        const result = parse([row(timestamp)]);

        expect(result.readings).toStrictEqual([]);
        expect(result.issues[0]?.message).toMatch(/Timestamp/v);
    });

    it("resolves leap days and UTC without consulting the host timezone", () => {
        expect.hasAssertions();
        expect(
            parse([row("2024/02/29 23:59:59")], { ...options, timeZone: "UTC" })
                .readings[0]?.observedAt
        ).toBe("2024-02-29T23:59:59.000Z");
        expect(
            parse([row("2026/10/16 12:00:00")], {
                ...options,
                timeZone: "Asia/Kathmandu",
            }).readings[0]?.observedAt
        ).toBe("2026-10-16T06:15:00.000Z");
    });

    it("rejects DST gaps and folds while resolving surrounding offsets on the same day", () => {
        expect.hasAssertions();

        const result = parse([
            row("2026/03/08 01:59:00"),
            row("2026/03/08 02:30:00"),
            row("2026/03/08 03:00:00"),
            row("2026/11/01 01:30:00"),
            row("2026/11/01 02:00:00"),
        ]);

        expect(result.issues).toStrictEqual([
            { message: expect.stringContaining("does not exist"), row: 3 },
            { message: expect.stringContaining("ambiguous"), row: 5 },
        ]);
        expect(
            result.readings.map((reading) => reading.observedAt)
        ).toStrictEqual([
            "2026-03-08T06:59:00.000Z",
            "2026-03-08T07:00:00.000Z",
            "2026-11-01T07:00:00.000Z",
        ]);
    });

    it("rejects half-hour DST folds and a skipped calendar day", () => {
        expect.hasAssertions();
        expect(
            parse([row("2026/04/05 01:45:00")], {
                ...options,
                timeZone: "Australia/Lord_Howe",
            }).issues[0]?.message
        ).toContain("ambiguous");
        expect(
            parse([row("2011/12/30 12:00:00")], {
                ...options,
                timeZone: "Pacific/Apia",
            }).issues[0]?.message
        ).toContain("does not exist");
    });

    it.each([
        "",
        " ",
        "Not/AZone",
        "+01:00",
    ])("requires a valid explicit timezone %s", (timeZone) => {
        expect.hasAssertions();
        expect(() => parse([first], { ...options, timeZone })).toThrow(
            /IANA timeZone/v
        );
    });

    it.each([
        "",
        " device ",
        "../device",
        "device|other",
        "a".repeat(129),
    ])("rejects unsafe sensor identity %s", (sensorId) => {
        expect.hasAssertions();
        expect(() => parse([first], { ...options, sensorId })).toThrow(
            /permanent safe identifier/v
        );
    });
});

describe("sensor overlap planning", () => {
    it("fully deduplicates repeated exports without mutating either input", () => {
        expect.hasAssertions();

        const existing = parse([first, second]).readings;
        const incoming = parse([second, first]).readings;
        const before = JSON.stringify({ existing, incoming });
        const result = planSensorImport(incoming, existing);

        expect(result.additions).toStrictEqual([]);
        expect(result.conflicts).toStrictEqual([]);
        expect(result.duplicates).toHaveLength(2);
        expect(JSON.stringify({ existing, incoming })).toBe(before);
    });

    it("adds only previously unseen timestamps in unordered, partially overlapping ranges", () => {
        expect.hasAssertions();

        const existing = parse([first, second]).readings;
        const incoming = parse([
            third,
            first,
            second,
        ]).readings;
        const result = planSensorImport(incoming, existing);

        expect(result.additions).toStrictEqual(incoming.slice(0, 1));
        expect(result.duplicates).toHaveLength(2);
        expect(result.conflicts).toStrictEqual([]);
    });

    it("deduplicates repeated rows within one export", () => {
        expect.hasAssertions();

        const result = planSensorImport(
            parse([
                first,
                first,
                first,
            ]).readings
        );

        expect(result.additions).toHaveLength(1);
        expect(result.duplicates).toHaveLength(2);
        expect(result.conflicts).toStrictEqual([]);
    });

    it("quarantines every incoming row of a conflicting key, preserving both versions", () => {
        expect.hasAssertions();

        const incoming = parse([
            first,
            row("2026/10/16 12:00:00", "69,50,1.2,77,40,0.8"),
            first,
            second,
        ]).readings;
        const result = planSensorImport(incoming);

        expect(result.additions).toStrictEqual(incoming.slice(3));
        expect(result.duplicates).toStrictEqual([]);
        expect(result.conflicts).toStrictEqual([
            {
                existing: [],
                incoming: incoming.slice(0, 3),
                key: incoming[0]?.key,
            },
        ]);
    });

    it("preserves existing evidence and quarantines conflicting payloads and missing/present changes", () => {
        expect.hasAssertions();

        const existing = parse([first]).readings;
        const incoming = parse([
            first,
            row("2026/10/16 12:00:00", "68,-,1.2,77,40,0.8"),
        ]).readings;
        const result = planSensorImport(incoming, existing);

        expect(result.additions).toStrictEqual([]);
        expect(result.duplicates).toStrictEqual([]);
        expect(result.conflicts).toStrictEqual([
            { existing, incoming, key: existing[0]?.key },
        ]);
    });

    it("flags conflicting existing versions when the incoming key matches either version", () => {
        expect.hasAssertions();

        const existing = parse([
            first,
            row("2026/10/16 12:00:00", "69,50,1.2,77,40,0.8"),
        ]).readings;
        const incoming = parse([first]).readings;
        const result = planSensorImport(incoming, existing);

        expect(result.conflicts).toStrictEqual([
            { existing, incoming, key: incoming[0]?.key },
        ]);
        expect(result.additions).toStrictEqual([]);
    });

    it("retains equal payloads from different sensors or times", () => {
        expect.hasAssertions();

        const existing = parse([first]).readings;
        const incoming = [
            ...parse([second]).readings,
            ...parse([first], { ...options, sensorId: "aerolab-02" }).readings,
        ];

        expect(planSensorImport(incoming, existing)).toStrictEqual({
            additions: incoming,
            conflicts: [],
            duplicates: [],
        });
    });

    it("compares normalized temperature within machine precision across units", () => {
        expect.hasAssertions();

        const existing = parse([
            row("2026/10/16 12:00:00", "32.18,50,0,77,40,0"),
        ]).readings;
        const incoming = parse(
            [row("2026/10/16 12:00:00", "0.1,50,0,25,40,0")],
            options,
            headers.replaceAll("℉", "℃")
        ).readings;

        expect(planSensorImport(incoming, existing).duplicates).toHaveLength(1);
        expect(planSensorImport(incoming, existing).conflicts).toStrictEqual(
            []
        );
    });

    it.each([
        ["32.09", "0.05"],
        ["31.91", "-0.05"],
        ["32.0018", "0.001"],
        ["31.9982", "-0.001"],
        ["-459.67", "-273.15"],
    ])(
        "deduplicates equivalent near-freezing readings %s F and %s C in either import order",
        (fahrenheit, celsius) => {
            expect.hasAssertions();

            const inFahrenheit = parse([
                row(
                    "2026/10/16 12:00:00",
                    `${fahrenheit},50,0,${fahrenheit},40,0`
                ),
            ]).readings;
            const inCelsius = parse(
                [row("2026/10/16 12:00:00", `${celsius},50,0,${celsius},40,0`)],
                options,
                headers.replaceAll("℉", "℃")
            ).readings;

            expect(
                planSensorImport(inFahrenheit, inCelsius).duplicates
            ).toHaveLength(1);
            expect(
                planSensorImport(inCelsius, inFahrenheit).duplicates
            ).toHaveLength(1);
            expect(
                planSensorImport(inFahrenheit, inCelsius).conflicts
            ).toStrictEqual([]);
        }
    );

    it.each([
        [
            "℉",
            "32.09",
            "32.09000000000001",
        ],
        [
            "℃",
            "0.05",
            "0.05000000000000001",
        ],
    ])(
        "preserves representable temperature differences within the same unit %s",
        (unit, previous, next) => {
            expect.hasAssertions();

            const header = headers.replaceAll("℉", () => unit);
            const existing = parse(
                [
                    row(
                        "2026/10/16 12:00:00",
                        `${previous},50,0,${previous},40,0`
                    ),
                ],
                options,
                header
            ).readings;
            const incoming = parse(
                [row("2026/10/16 12:00:00", `${next},50,0,${next},40,0`)],
                options,
                header
            ).readings;

            expect(planSensorImport(incoming, existing).conflicts).toHaveLength(
                1
            );
            expect(
                planSensorImport(incoming, existing).duplicates
            ).toStrictEqual([]);
        }
    );

    it("keeps same-unit comparisons exact within a mixed-unit group in every input order", () => {
        expect.hasAssertions();

        const inCelsius = parse(
            [row("2026/10/16 12:00:00", "0.05,50,0,25,40,0")],
            options,
            headers.replaceAll("℉", "℃")
        ).readings;
        const inFahrenheit = parse([
            row("2026/10/16 12:00:00", "32.09,50,0,77,40,0"),
            row("2026/10/16 12:00:00", "32.089999999999996,50,0,77,40,0"),
        ]).readings;
        const readings = [...inCelsius, ...inFahrenheit];
        const forward = planSensorImport(readings);
        const reverse = planSensorImport(readings.toReversed());

        expect(forward.conflicts).toHaveLength(1);
        expect(reverse.conflicts).toHaveLength(1);
        expect(forward.additions).toStrictEqual([]);
        expect(reverse.additions).toStrictEqual([]);
    });

    it("preserves a small cross-unit difference exceeding conversion arithmetic uncertainty", () => {
        expect.hasAssertions();

        const existing = parse([
            row("2026/10/16 12:00:00", "32.0900000000018,50,0,77,40,0"),
        ]).readings;
        const incoming = parse(
            [row("2026/10/16 12:00:00", "0.05,50,0,25,40,0")],
            options,
            headers.replaceAll("℉", "℃")
        ).readings;

        expect(planSensorImport(incoming, existing).conflicts).toHaveLength(1);
        expect(planSensorImport(incoming, existing).duplicates).toStrictEqual(
            []
        );
    });

    it("does not round away small real changes", () => {
        expect.hasAssertions();

        const existing = parse([first]).readings;
        const incoming = parse([
            row("2026/10/16 12:00:00", "68,50.00000001,1.2,77,40,0.8"),
        ]).readings;

        expect(planSensorImport(incoming, existing).conflicts).toHaveLength(1);
    });

    it("compares unconverted humidity and VPD exactly, even for machine-scale changes", () => {
        expect.hasAssertions();

        const existing = parse([
            row("2026/10/16 12:00:00", "68,0,0,77,40,0.8"),
        ]).readings;
        const humidityChange = parse([
            row("2026/10/16 12:00:00", "68,0.0000000000000001,0,77,40,0.8"),
        ]).readings;
        const vpdChange = parse([
            row("2026/10/16 12:00:00", "68,0,0.0000000000000001,77,40,0.8"),
        ]).readings;

        expect(
            planSensorImport(humidityChange, existing).conflicts
        ).toHaveLength(1);
        expect(planSensorImport(vpdChange, existing).conflicts).toHaveLength(1);
    });

    it("keys equivalent instants independently of original wall-time notation", () => {
        expect.hasAssertions();

        const existing = parse([first]).readings;
        const incoming = parse([row("2026/10/16 16:00:00")], {
            ...options,
            timeZone: "UTC",
        }).readings;

        expect(planSensorImport(incoming, existing).duplicates).toHaveLength(1);
    });

    it("rejects mismatched precomputed keys", () => {
        expect.hasAssertions();

        const incoming = parse([first]).readings.map((reading) => ({
            ...reading,
            key: "wrong",
        }));

        expect(() => planSensorImport(incoming)).toThrow(/Reading identity/v);
    });
});
