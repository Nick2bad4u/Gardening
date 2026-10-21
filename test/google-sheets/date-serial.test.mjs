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

/** @param {Date} date @param {number} minutes */
function expectedSerial(date, minutes) {
    return date.getTime() / 86_400_000 + 25_569 + minutes / 1440;
}

/** @param {Record<string, unknown>} [globals] */
function runtime(globals = {}) {
    const context = vm.createContext({ Date, Map, ...globals });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    return appsScriptApi(context);
}

describe("native workbook date serial conversion", () => {
    it("accepts an Intl UTC timezone-name token without a Utilities call", () => {
        expect.hasAssertions();

        const formatDate = vi.fn();
        const context = runtime({
            Intl: {
                DateTimeFormat: vi.fn(function utcFormatter() {
                    return {
                        formatToParts: () => [
                            { type: "timeZoneName", value: "UTC" },
                        ],
                    };
                }),
            },
            Utilities: { formatDate },
        });
        const date = new Date("2026-01-01T00:00:00Z");

        expect(context.dryDownSerialDate_(date, "UTC")).toBe(
            expectedSerial(date, 0)
        );
        expect(formatDate).not.toHaveBeenCalled();
    });

    it.each([
        [
            "America/New_York",
            "2026-03-08T06:59:59.999Z",
            -300,
        ],
        [
            "America/New_York",
            "2026-03-08T07:00:00.000Z",
            -240,
        ],
        [
            "America/New_York",
            "2026-11-01T05:59:59.999Z",
            -240,
        ],
        [
            "America/New_York",
            "2026-11-01T06:00:00.000Z",
            -300,
        ],
        [
            "Australia/Lord_Howe",
            "2026-04-04T14:59:59.999Z",
            660,
        ],
        [
            "Australia/Lord_Howe",
            "2026-04-04T15:00:00.000Z",
            630,
        ],
        [
            "Australia/Lord_Howe",
            "2026-10-03T15:29:59.999Z",
            630,
        ],
        [
            "Australia/Lord_Howe",
            "2026-10-03T15:30:00.000Z",
            660,
        ],
        [
            "Asia/Kathmandu",
            "2026-01-01T23:59:59.123Z",
            345,
        ],
        [
            "Pacific/Chatham",
            "2026-01-01T23:59:59.123Z",
            825,
        ],
        [
            "Pacific/Chatham",
            "2026-07-01T23:59:59.123Z",
            765,
        ],
        [
            "America/St_Johns",
            "2026-01-01T23:59:59.123Z",
            -210,
        ],
        [
            "UTC",
            "2026-12-31T23:59:59.123Z",
            0,
        ],
    ])("preserves exact serials for %s at %s", (zone, timestamp, minutes) => {
        expect.hasAssertions();

        const context = runtime();
        const date = new Date(timestamp);

        expect(context.dryDownSerialDate_(date, zone)).toBe(
            expectedSerial(date, minutes)
        );
        expect(context.dryDownSerialDate_(timestamp, zone)).toBe(
            expectedSerial(date, minutes)
        );
        expect(context.dryDownSerialDate_(date.getTime(), zone)).toBe(
            expectedSerial(date, minutes)
        );
    });

    it("reuses timezone formatters for distinct dates without service calls", () => {
        expect.hasAssertions();

        const DateTimeFormat = vi.fn(
            function createFormatter(
                /** @type {string} */ locale,
                /** @type {Intl.DateTimeFormatOptions} */ options
            ) {
                return new Intl.DateTimeFormat(locale, options);
            }
        );
        const formatDate = vi.fn(() => "+0000");
        const context = runtime({
            Intl: { DateTimeFormat },
            Utilities: { formatDate },
        });

        for (let index = 0; index < 1000; index += 1) {
            const date = new Date(Date.UTC(2026, 0, 1) + index * 600_000);

            expect(context.dryDownSerialDate_(date, "UTC")).toBe(
                expectedSerial(date, 0)
            );
            expect(context.dryDownSerialDate_(date, "Asia/Kathmandu")).toBe(
                expectedSerial(date, 345)
            );
        }

        const beforeDst = new Date("2026-03-08T06:59:59.999Z");
        const afterDst = new Date("2026-03-08T07:00:00.000Z");

        expect(context.dryDownSerialDate_(beforeDst, "America/New_York")).toBe(
            expectedSerial(beforeDst, -300)
        );
        expect(context.dryDownSerialDate_(afterDst, "America/New_York")).toBe(
            expectedSerial(afterDst, -240)
        );
        expect(DateTimeFormat).toHaveBeenCalledTimes(3);
        expect(formatDate).not.toHaveBeenCalled();
    });

    it("ignores invalid cells before consulting timezone services", () => {
        expect.hasAssertions();

        const DateTimeFormat = vi.fn();
        const formatDate = vi.fn();
        const context = runtime({
            Intl: { DateTimeFormat },
            Utilities: { formatDate },
        });

        for (const value of [
            true,
            false,
            null,
            undefined,
            "",
            "bad date",
            0,
            NaN,
            Infinity,
            new Date(NaN),
            {},
            [],
        ]) {
            expect(context.dryDownSerialDate_(value, "bad zone")).toBe(0);
        }

        expect(DateTimeFormat).not.toHaveBeenCalled();
        expect(formatDate).not.toHaveBeenCalled();
    });

    it.each([
        undefined,
        {},
        {
            DateTimeFormat: vi.fn(function missingParts() {
                return {};
            }),
        },
        {
            DateTimeFormat: vi.fn(function emptyParts() {
                return { formatToParts: () => [] };
            }),
        },
    ])("retains Utilities fallback when Intl is unavailable: %j", (intl) => {
        expect.hasAssertions();

        const formatDate = vi.fn(() => "-0330");
        const context = runtime({ Intl: intl, Utilities: { formatDate } });
        const date = new Date("2026-01-01T00:00:00Z");

        expect(context.dryDownSerialDate_(date, "UTC")).toBe(
            expectedSerial(date, -210)
        );
        expect(formatDate).toHaveBeenCalledExactlyOnceWith(date, "UTC", "Z");
    });

    it("retains Utilities historical offset rounding and unrecognized-offset behavior", () => {
        expect.hasAssertions();

        const formatDate = vi.fn(() => "+0541");
        const context = runtime({ Utilities: { formatDate } });
        const date = new Date("1900-01-01T00:00:00Z");

        expect(context.dryDownSerialDate_(date, "Asia/Kathmandu")).toBe(
            expectedSerial(date, 341)
        );
        expect(formatDate).toHaveBeenCalledExactlyOnceWith(
            date,
            "Asia/Kathmandu",
            "Z"
        );

        formatDate.mockReturnValue("unavailable");

        expect(context.dryDownSerialDate_(date, "Asia/Kathmandu")).toBe(
            expectedSerial(date, 0)
        );
    });

    it("caches rejected zones while preserving Utilities results and errors", () => {
        expect.hasAssertions();

        const DateTimeFormat = vi.fn(function rejectZone() {
            throw new RangeError("Unsupported zone");
        });
        const formatDate = vi.fn(() => "+0530");
        const context = runtime({
            Intl: { DateTimeFormat },
            Utilities: { formatDate },
        });
        const date = new Date("2026-01-01T00:00:00Z");

        const later = new Date("2026-07-01T00:00:00Z");

        expect(context.dryDownSerialDate_(later, "unsupported")).toBe(
            expectedSerial(later, 330)
        );
        expect(context.dryDownSerialDate_(date, "unsupported")).toBe(
            expectedSerial(date, 330)
        );
        expect(DateTimeFormat).toHaveBeenCalledTimes(1);
        expect(formatDate).toHaveBeenCalledTimes(2);

        formatDate.mockImplementation(() => {
            throw new Error("Invalid Utilities timezone");
        });

        expect(() => context.dryDownSerialDate_(date, "unsupported")).toThrow(
            "Invalid Utilities timezone"
        );
    });
});
