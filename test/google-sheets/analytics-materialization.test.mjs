import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

import { appsScriptApi } from "../helpers/apps-script-api.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = readFileSync(sourceUrl, "utf8");
const asOf = new Date("2026-10-18T04:30:00Z");

/**
 * @param {{
 *     history?: import("../logger-fixtures.js").CellValue[][];
 *     busy?: boolean;
 *     noLock?: boolean;
 *     lease?: string;
 *     calculationTime?: Date | string;
 *     calculationStatus?: string;
 *     failBatch?: boolean;
 *     failStatus?: boolean;
 *     historyLastRow?: number;
 *     selectedPlant?: string;
 *     selectedSetup?: number | string;
 * }} [options]
 */
function fixture(options = {}) {
    const history = options.history ?? [
        observation(0, "Light"),
        observation(36, "Move"),
    ];
    const writes = vi.fn();
    const historyRead = vi.fn(() => {
        if (isLocked)
            throw new Error("History read must not hold the writer lock");
        return history;
    });
    const releaseLock = vi.fn();
    const batchUpdate = vi.fn(() => {
        if (isLocked)
            throw new Error("Publication must not hold the writer lock");
        if (options.failBatch === true) throw new Error("Derived batch failed");
    });
    let isLocked = false;
    const getScriptLock = vi.fn(() => ({
        releaseLock: () => {
            isLocked = false;
            releaseLock();
        },
        tryLock: () => {
            if (options.busy === true) return false;
            isLocked = true;
            return true;
        },
    }));
    const properties = new Map(
        options.lease === undefined || options.lease === ""
            ? []
            : [["gardenAnalyticsRefreshLeaseV1", options.lease]]
    );
    const sheets = new Map(
        [
            "History",
            "Baselines",
            "Insights",
            "Workbook calculations",
            "Dry-down models",
            "Workbook analytics",
            "Environment data",
        ].map((name, id) => [
            name,
            {
                getLastRow: () =>
                    name === "History"
                        ? (options.historyLastRow ?? history.length + 1)
                        : 100,
                getMaxColumns: () =>
                    name === "Workbook calculations" ? 6 : 67,
                getMaxRows: () => 50_001,
                /** @param {(string | number)[]} range */
                getRange: (...range) => ({
                    getValue: () => options.selectedPlant ?? "P01",
                    getValues: () =>
                        name === "Workbook calculations"
                            ? [
                                  [
                                      options.calculationTime ?? "",
                                      options.calculationStatus ?? "",
                                  ],
                              ]
                            : name === "History"
                              ? historyRead()
                              : [
                                    [
                                        options.selectedPlant ?? "P01",
                                        ...Array.from({ length: 18 }, () => ""),
                                        options.selectedSetup ?? 1,
                                    ],
                                ],
                    /** @param {unknown} value */
                    setValue: (value) => {
                        if (options.failStatus === true)
                            throw new Error("Status write failed");
                        writes(name, range, value);
                    },
                }),
                getSheetId: () => id,
                insertColumnsAfter: vi.fn(),
            },
        ])
    );
    const spreadsheet = {
        getId: () => "disposable-fixture",
        /** @param {string} name */
        getSheetByName: (name) => sheets.get(name),
        getSpreadsheetTimeZone: () => "UTC",
        toast: vi.fn(),
    };
    const context = vm.createContext({
        console: { error: vi.fn(), info: vi.fn() },
        Date,
        Error,
        LockService: {
            getDocumentLock: () =>
                options.noLock === true
                    ? null
                    : { releaseLock, tryLock: () => options.busy !== true },
            getScriptLock,
        },
        Map,
        PropertiesService: {
            getScriptProperties: () => ({
                /** @param {string} key */
                deleteProperty: (key) => properties.delete(key),
                /** @param {string} key */
                getProperty: (key) => properties.get(key) ?? null,
                /** @param {string} key @param {string} value */
                setProperty: (key, value) => properties.set(key, value),
            }),
        },
        Set,
        Sheets: { Spreadsheets: { batchUpdate } },
        SpreadsheetApp: { flush: vi.fn(), openById: () => spreadsheet },
        Utilities: { formatDate, getUuid: () => "fixture-lease" },
    });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    /** @type {(keyof import("../apps-script-fixtures.js").AnalyticsApi)[]} */
    const names = [
        "refreshGardenAnalytics",
        "recalculateGardenWorkbook",
        "acquireGardenAnalyticsLease_",
        "releaseGardenAnalyticsLease_",
        "workbookCalculationStatus_",
        "refreshGardenAnalytics_",
        "refreshGardenAnalyticsSafely_",
        "gardenAnalyticsOutputs_",
        "gardenAnalyticsCellsRequest_",
        "gardenAnalyticsPayloadBytes_",
        "finishAppSheetQueueRun_",
    ];
    for (const name of names)
        if (typeof context[name] !== "function")
            throw new Error(`Missing ${name}`);
    const api =
        /** @type {import("../apps-script-fixtures.js").AnalyticsApi} */ (
            /** @type {unknown} */ (context)
        );
    return {
        api,
        batchUpdate,
        context,
        getScriptLock,
        historyRead,
        properties,
        releaseLock,
        sheets,
        spreadsheet,
        writes,
    };
}

/** @param {Date} date @param {string} zone @param {string} pattern */
function formatDate(date, zone, pattern) {
    if (zone !== "UTC") throw new Error("Unexpected fixture timezone");
    if (pattern === "Z") return "+0000";
    if (pattern === "yyyy-MM-dd") return date.toISOString().slice(0, 10);
    return date.toISOString().slice(0, -1);
}

/**
 * @param {number} index @param {string} [event] @returns
 *   {import("../logger-fixtures.js").CellValue[]}
 */
function observation(index, event = "Weigh") {
    const row = Array.from(
        { length: 67 },
        () => /** @type {import("../logger-fixtures.js").CellValue} */ ("")
    );
    row[0] = new Date(Date.UTC(2025, 0, 1) + index * 600_000);
    row[1] = `P${String((index % 36) + 1).padStart(2, "0")}`;
    row[2] = event;
    row[3] = "Routine";
    row[4] = event === "Weigh" ? 800 - (index % 80) : "";
    row[10] = 1;
    row[15] = `request-${index}`;
    row[26] = `observation-${index}`;
    row[28] = "Measured";
    row[35] = "Active";
    row[43] = event === "Light" ? index % 400 : "";
    row[49] = event === "Move" ? "Window shelf" : "";
    return row;
}

describe("scheduled analytics materialization", () => {
    it("reads History once and atomically publishes four correctly sized outputs and one snapshot identity", () => {
        expect.hasAssertions();

        const test = fixture({ selectedPlant: "P01", selectedSetup: 3 });
        const result = test.api.refreshGardenAnalytics_(test.spreadsheet);

        expect(result.status).toBe("Ready");
        expect(test.historyRead).toHaveBeenCalledTimes(1);
        expect(test.getScriptLock).toHaveBeenCalledTimes(2);
        expect(test.releaseLock).toHaveBeenCalledTimes(2);
        expect(test.batchUpdate).toHaveBeenCalledTimes(1);

        const [payload, workbook] =
            /**
             * @type {[
             *     {
             *         requests: {
             *             updateCells: {
             *                 range: {
             *                     sheetId: number;
             *                     startColumnIndex: number;
             *                     endColumnIndex: number;
             *                     endRowIndex: number;
             *                 };
             *                 rows: {
             *                     values: {
             *                         userEnteredValue?: {
             *                             stringValue?: string;
             *                             numberValue?: number;
             *                         };
             *                     }[];
             *                 }[];
             *             };
             *         }[];
             *     },
             *     string,
             * ]}
             */ (/** @type {unknown} */ (test.batchUpdate.mock.calls[0]));

        expect(workbook).toBe("disposable-fixture");
        expect(payload.requests).toHaveLength(7);
        expect(
            structuredClone(
                payload.requests.slice(0, 5).map(({ updateCells: request }) => [
                    request.range.sheetId,
                    request.range.startColumnIndex,
                    request.range.endColumnIndex,
                ])
            )
        ).toStrictEqual([
            [
                4,
                0,
                22,
            ],
            [
                5,
                0,
                4,
            ],
            [
                6,
                0,
                12,
            ],
            [
                6,
                22,
                27,
            ],
            [
                3,
                7,
                11,
            ],
        ]);
        expect(structuredClone(payload.requests[5])).toStrictEqual({
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: {
                            pattern: "mmm d, yyyy h:mm:ss AM/PM",
                            type: "DATE_TIME",
                        },
                    },
                },
                fields: "userEnteredFormat.numberFormat",
                range: {
                    endColumnIndex: 8,
                    endRowIndex: 2,
                    sheetId: 3,
                    startColumnIndex: 7,
                    startRowIndex: 1,
                },
            },
        });
        expect(
            payload.requests
                .slice(0, 4)
                .every(
                    ({ updateCells: request }) =>
                        request.range.endRowIndex === 100
                )
        ).toBe(true);

        const metadata = payload.requests[4]?.updateCells.rows[1]?.values;

        expect(metadata?.[1]?.userEnteredValue?.stringValue).toBe("Ready");
        expect(metadata?.[2]?.userEnteredValue?.stringValue).toBe("P01");
        expect(metadata?.[3]?.userEnteredValue?.numberValue).toBe(3);
        expect(metadata?.[0]?.userEnteredValue?.numberValue).toBe(
            Date.parse(result.calculatedAt ?? "") / 86_400_000 + 25_569
        );
        expect(test.writes.mock.calls).toStrictEqual([
            [
                "Workbook calculations",
                ["I2"],
                "Refreshing",
            ],
        ]);
    });

    it("does not publish outputs or advance last-success metadata when the atomic batch fails", () => {
        expect.hasAssertions();

        const test = fixture({ failBatch: true });

        expect(
            structuredClone(
                test.api.refreshGardenAnalyticsSafely_(test.spreadsheet)
            )
        ).toStrictEqual({
            message: "Derived batch failed",
            status: "Refresh failed",
        });
        expect(test.writes.mock.calls).toStrictEqual([
            [
                "Workbook calculations",
                ["I2"],
                "Refreshing",
            ],
            [
                "Workbook calculations",
                ["I2"],
                "Refresh failed",
            ],
        ]);
        expect(test.releaseLock).toHaveBeenCalledTimes(2);
        expect(test.batchUpdate).toHaveBeenCalledTimes(1);
    });

    it("preserves queue save receipts and success when analytics fails after bulk processing", () => {
        expect.hasAssertions();

        const test = fixture({ failBatch: true });
        const bulk = vi.fn(() => ({ ok: true }));

        test.context["processQueuedAppSheetBulkEntries_"] = bulk;

        const summary = test.api.finishAppSheetQueueRun_(test.spreadsheet, {
            ok: true,
            savedCount: 3,
        });

        expect(summary).toMatchObject({
            analytics: { status: "Refresh failed" },
            ok: true,
            savedCount: 3,
        });
        expect(bulk).toHaveBeenCalledBefore(test.batchUpdate);
    });

    it.each([
        { busy: true, status: "Busy" },
        { lease: `${Date.now() + 480_000}:other-refresh`, status: "Busy" },
        { historyLastRow: 50_002, status: "Refresh failed" },
        { failStatus: true, status: "Refresh failed" },
    ])(
        "fails safely before outputs for $status / $busy $noLock $historyLastRow $failStatus",
        ({ status, ...options }) => {
            expect.hasAssertions();

            const test = fixture(options);

            expect(
                test.api.refreshGardenAnalyticsSafely_(test.spreadsheet).status
            ).toBe(status);
            expect(test.batchUpdate).not.toHaveBeenCalled();
            expect(test.historyRead).not.toHaveBeenCalled();
        }
    );

    it("supports an empty ledger and explicit menu refresh", () => {
        expect.hasAssertions();

        const test = fixture({
            history: [],
            selectedPlant: "",
            selectedSetup: "",
        });

        expect(test.api.refreshGardenAnalytics().status).toBe("Ready");
        expect(test.historyRead).not.toHaveBeenCalled();
        expect(test.spreadsheet.toast).toHaveBeenCalledWith(
            "Workbook calculations refreshed from History.",
            "Garden calculations",
            8
        );
    });

    it("supports web-app execution without a document lock and refreshes the shared clock atomically", () => {
        expect.hasAssertions();

        const test = fixture({ noLock: true });

        expect(test.api.recalculateGardenWorkbook().status).toBe("Ready");

        const clockRequest = {
            updateCells: {
                fields: "userEnteredValue",
                range: {
                    endColumnIndex: 5,
                    endRowIndex: 2,
                    sheetId: 3,
                    startColumnIndex: 4,
                    startRowIndex: 1,
                },
                rows: [
                    {
                        values: [
                            { userEnteredValue: { formulaValue: "=NOW()" } },
                        ],
                    },
                ],
            },
        };

        expect(structuredClone(test.batchUpdate.mock.calls[0])).toStrictEqual([
            { requests: expect.arrayContaining([clockRequest]) },
            "disposable-fixture",
        ]);
    });

    it("recovers expired leases and rejects a concurrent refresh", () => {
        expect.hasAssertions();

        const test = fixture({ lease: "1:expired" });
        const lease = test.api.acquireGardenAnalyticsLease_();

        expect(lease).toMatch(/^\d+:fixture-lease$/v);
        expect(test.api.acquireGardenAnalyticsLease_()).toBeNull();
        expect(test.properties.get("gardenAnalyticsRefreshLeaseV1")).toBe(
            lease
        );
    });

    it("preserves another refresh's reservation when cleanup has a different token", () => {
        expect.hasAssertions();

        const test = fixture();
        const lease = test.api.acquireGardenAnalyticsLease_();

        test.api.releaseGardenAnalyticsLease_("another-lease");

        expect(test.properties.get("gardenAnalyticsRefreshLeaseV1")).toBe(
            lease
        );
        expect(test.api.acquireGardenAnalyticsLease_()).toBeNull();
    });

    it("removes the matching reservation and permits a new refresh", () => {
        expect.hasAssertions();

        const test = fixture();
        const lease = test.api.acquireGardenAnalyticsLease_();

        test.api.releaseGardenAnalyticsLease_(lease ?? "");

        expect(test.properties.has("gardenAnalyticsRefreshLeaseV1")).toBe(
            false
        );
        expect(test.api.acquireGardenAnalyticsLease_()).toMatch(
            /^\d+:fixture-lease$/v
        );
    });

    it.each([
        {
            calculationStatus: "Ready",
            calculationTime: asOf,
            expected: { calculatedAt: asOf.toISOString(), status: "Ready" },
        },
        {
            calculationStatus: "Refresh failed",
            calculationTime: asOf,
            expected: {
                calculatedAt: asOf.toISOString(),
                status: "Refresh failed",
            },
        },
        {
            calculationStatus: "",
            calculationTime: "",
            expected: { status: "Awaiting native refresh" },
        },
    ])(
        "returns serializable snapshot freshness metadata",
        ({ expected, ...options }) => {
            expect.hasAssertions();

            const test = fixture(options);

            const status = structuredClone(
                test.api.workbookCalculationStatus_(test.spreadsheet)
            );

            expect(status).toStrictEqual(expected);
        }
    );

    it("reuses per-run timezone serials when publishing environment timestamps", () => {
        expect.hasAssertions();

        const test = fixture();
        const history = [observation(0, "Light")];
        const serials = new Map();
        const outputs = test.api.gardenAnalyticsOutputs_(
            history,
            "P01",
            1,
            asOf,
            "UTC",
            serials
        );
        const observedAt = new Date(String(history[0]?.[0]));
        const timestamp = observedAt.getTime();

        expect(serials.has(timestamp)).toBe(true);

        const request = test.api.gardenAnalyticsCellsRequest_(
            { getLastRow: () => 2, getSheetId: () => 6 },
            1,
            12,
            outputs.environment,
            "UTC",
            serials
        );

        expect(
            request.updateCells.rows[1]?.values[0]?.userEnteredValue
                ?.numberValue
        ).toBe(serials.get(timestamp));
        expect(serials.size).toBe(1);
    });

    it("counts UTF-8 bytes and rejects an oversized atomic payload without publishing", () => {
        expect.hasAssertions();

        const test = fixture();

        expect(test.api.gardenAnalyticsPayloadBytes_("Aé水🌱")).toBe(
            Buffer.byteLength("Aé水🌱")
        );

        test.context["gardenAnalyticsPayloadBytes_"] = () => 40_000_001;

        expect(
            test.api.refreshGardenAnalyticsSafely_(test.spreadsheet).message
        ).toContain("40 MB atomic refresh limit");
        expect(test.batchUpdate).not.toHaveBeenCalled();
        expect(test.writes.mock.calls.at(-1)).toStrictEqual([
            "Workbook calculations",
            ["I2"],
            "Refresh failed",
        ]);
    });

    it("clears only its owned old tail and stores formula-like evidence as literal text", () => {
        expect.hasAssertions();

        const test = fixture();
        const request = test.api.gardenAnalyticsCellsRequest_(
            { getLastRow: () => 50, getSheetId: () => 6 },
            23,
            2,
            [["=danger", ""]],
            "UTC"
        );

        expect(request.updateCells.range).toMatchObject({
            endColumnIndex: 24,
            endRowIndex: 50,
            startColumnIndex: 22,
            startRowIndex: 0,
        });
        expect(
            structuredClone(request.updateCells.rows[0]?.values)
        ).toStrictEqual([{ userEnteredValue: { stringValue: "=danger" } }, {}]);
        expect(() =>
            test.api.gardenAnalyticsCellsRequest_({}, 1, 2, [["bad"]], "UTC")
        ).toThrow("Invalid analytics output width");
    });

    it("uses one as-of boundary for environmental, location and cycle algorithms", () => {
        expect.hasAssertions();

        const test = fixture();
        const past = observation(0, "Light");
        const future = observation(1, "Move");
        future[0] = new Date(asOf.getTime() + 1);
        const output = test.api.gardenAnalyticsOutputs_(
            [past, future],
            "P01",
            1,
            asOf,
            "UTC"
        );

        expect(output.environment).toHaveLength(2);
        expect(output.locations).toHaveLength(1);
        expect(output.models).toHaveLength(37);
        expect(output.models.every((row) => row.length === 22)).toBe(true);
    });

    it("preserves exact algorithm outputs for 50,000 populated mixed-event rows", () => {
        expect.hasAssertions();

        const test = fixture();
        const model = appsScriptApi(test.context);
        const history = Array.from({ length: 50_000 }, (_, index) =>
            observation(
                index,
                [
                    "Weigh",
                    "Light",
                    "Move",
                    "Water",
                    "Weigh",
                    "Inspect",
                ][Math.floor(index / 36) % 6]
            )
        );
        const startedAt = performance.now();
        const output = test.api.gardenAnalyticsOutputs_(
            history,
            "P01",
            1,
            asOf,
            "UTC"
        );
        const elapsedMs = performance.now() - startedAt;
        const projected = history.map((row) => [
            row[0] instanceof Date ? row[0].getTime() / 86_400_000 + 25_569 : 0,
            row[1],
            row[2],
            row[3],
            row[4],
            row[10],
            row[15],
            row[29],
            row[35],
            row[40],
            row[28],
            row[34],
            row[26],
            row[30],
        ]);
        const ids = output.models.slice(1).map((row) => [row[0]]);

        expect(output.models.slice(1)).toStrictEqual(
            model.GARDEN_DRY_DOWN(projected, ids)
        );
        expect(output.environment).toStrictEqual(
            model.GARDEN_ENVIRONMENT_READINGS(history)
        );
        expect(output.locations).toStrictEqual(
            model.GARDEN_RECORDED_LOCATIONS(history)
        );
        expect(output.cycles[0]?.[0]).toBe("Days since watering");

        const payload = {
            requests: Object.values(output).map((rows, index) =>
                test.api.gardenAnalyticsCellsRequest_(
                    { getLastRow: () => rows.length, getSheetId: () => index },
                    1,
                    rows[0]?.length ?? 0,
                    rows,
                    "UTC"
                )
            ),
        };
        const payloadBytes = Buffer.byteLength(JSON.stringify(payload));
        console.info(
            `50,000-row four-output materialization: ${Math.round(elapsedMs)} ms; ${payloadBytes} payload bytes (Node only; excludes Sheets read/write latency).`
        );
    }, 30_000);

    it("measures a populated 50,000-row environmental output without truncation", () => {
        expect.hasAssertions();

        const test = fixture();
        const history = Array.from({ length: 50_000 }, (_, index) => {
            const row = observation(index, "Light");
            row[8] = "x".repeat(76);
            return row;
        });
        const startedAt = performance.now();
        const output = test.api.gardenAnalyticsOutputs_(
            history,
            "P01",
            1,
            asOf,
            "UTC"
        );

        expect(output.environment).toHaveLength(50_001);

        const payload = {
            requests: Object.values(output).map((rows, index) =>
                test.api.gardenAnalyticsCellsRequest_(
                    { getLastRow: () => rows.length, getSheetId: () => index },
                    1,
                    rows[0]?.length ?? 0,
                    rows,
                    "UTC"
                )
            ),
        };
        const serialized = JSON.stringify(payload);

        expect(test.api.gardenAnalyticsPayloadBytes_(serialized)).toBe(
            Buffer.byteLength(serialized)
        );

        console.info(
            `50,000-row all-environment materialization+serialization: ${Math.round(performance.now() - startedAt)} ms; ${Buffer.byteLength(serialized)} payload bytes (Node only).`
        );
    }, 30_000);
});
