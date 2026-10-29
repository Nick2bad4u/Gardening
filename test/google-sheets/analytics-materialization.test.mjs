import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

import {
    analyticsReadResponse,
    appsScriptApi,
} from "../helpers/apps-script-api.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = readFileSync(sourceUrl, "utf8");
const asOf = new Date("2026-10-18T04:30:00Z");

/** @param {unknown[][]} calls @returns {Record<string, unknown>[]} */
function diagnosticLogs(calls) {
    return calls.map(([message]) => {
        const value = /** @type {unknown} */ (JSON.parse(String(message)));
        if (typeof value !== "object" || value === null)
            throw new Error("Expected structured diagnostic");
        return /** @type {Record<string, unknown>} */ (value);
    });
}

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
 *     failCalculationRead?: boolean;
 *     failLeaseCleanup?: boolean;
 *     cleanupBusy?: boolean;
 *     missingSelectedBaseline?: boolean;
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
    const flush = vi.fn();
    const logError = vi.fn();
    const logInfo = vi.fn();
    const nativeFormatDate = vi.fn(formatDate);
    const historyRead = vi.fn(() => {
        if (isLocked)
            throw new Error("History read must not hold the writer lock");
        return history;
    });
    const valuesRead = vi.fn(
        (
            /** @type {string} */ spreadsheetId,
            /** @type {import("../logger-fixtures.js").AnalyticsReadOptions} */ options
        ) => analyticsReadResponse(spreadsheetId, options, historyRead())
    );
    const releaseLock = vi.fn();
    const batchUpdate = vi.fn(() => {
        if (isLocked)
            throw new Error("Publication must not hold the writer lock");
        if (options.failBatch === true) throw new Error("Derived batch failed");
    });
    let isLocked = false;
    let lockAttempts = 0;
    const getScriptLock = vi.fn(() => ({
        releaseLock: () => {
            isLocked = false;
            releaseLock();
        },
        tryLock: () => {
            lockAttempts += 1;
            if (
                options.busy === true ||
                (lockAttempts === 2 && options.cleanupBusy === true)
            )
                return false;
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
                getMaxColumns: () => 67,
                getMaxRows: () => 50_001,
                /** @param {(string | number)[]} range */
                getRange: (...range) => ({
                    getValue: () => options.selectedPlant ?? "P01",
                    getValues: () => {
                        if (name === "Workbook calculations") {
                            if (options.failCalculationRead === true)
                                throw new Error(
                                    "Calculation status read unavailable"
                                );
                            return [
                                [
                                    options.calculationTime ?? "",
                                    options.calculationStatus ?? "",
                                ],
                            ];
                        }
                        if (name === "History") {
                            const [
                                start,
                                column,
                                count,
                                width,
                            ] = range;
                            if (
                                typeof start !== "number" ||
                                typeof column !== "number" ||
                                typeof count !== "number" ||
                                typeof width !== "number"
                            )
                                throw new Error(
                                    "Unexpected native History fixture range"
                                );
                            return historyRead()
                                .slice(start - 2, start - 2 + count)
                                .map((row) =>
                                    row.slice(column - 1, column - 1 + width)
                                );
                        }
                        if (options.missingSelectedBaseline === true) return [];
                        return [
                            [
                                options.selectedPlant ?? "P01",
                                ...Array.from({ length: 18 }, () => ""),
                                options.selectedSetup ?? 1,
                            ],
                        ];
                    },
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
        console: { error: logError, info: logInfo },
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
                deleteProperty: (key) => {
                    if (options.failLeaseCleanup === true)
                        throw new Error("Lease storage unavailable");
                    return properties.delete(key);
                },
                /** @param {string} key */
                getProperty: (key) => properties.get(key) ?? null,
                /** @param {string} key @param {string} value */
                setProperty: (key, value) => properties.set(key, value),
            }),
        },
        Set,
        Sheets: {
            Spreadsheets: { batchUpdate, Values: { batchGet: valuesRead } },
        },
        SpreadsheetApp: { flush, openById: () => spreadsheet },
        Utilities: {
            formatDate: nativeFormatDate,
            getUuid: () => "fixture-lease",
        },
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
        "gardenAnalyticsCellsRequests_",
        "gardenAnalyticsPayloadBytes_",
        "finishAppSheetQueueRun_",
        "processQueuedAppSheetEntries",
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
        flush,
        getScriptLock,
        historyRead,
        logError,
        logInfo,
        nativeFormatDate,
        properties,
        releaseLock,
        sheets,
        spreadsheet,
        valuesRead,
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

describe("queue and analytics phase diagnostics", () => {
    it("retains failure-status cleanup when preparation fails after finding the calculations sheet", () => {
        expect.hasAssertions();

        const test = fixture();
        const calculations = test.sheets.get("Workbook calculations");
        assert.ok(calculations);
        vi.spyOn(calculations, "getMaxColumns").mockImplementation(() => {
            throw new Error("Preparation failed");
        });

        expect(
            test.api.refreshGardenAnalyticsSafely_(test.spreadsheet)
        ).toMatchObject({
            message: "Preparation failed",
            status: "Refresh failed",
        });
        expect(test.writes).toHaveBeenCalledWith(
            "Workbook calculations",
            ["I2"],
            "Refresh failed"
        );
        expect(test.flush).toHaveBeenCalledTimes(1);
        expect(test.batchUpdate).not.toHaveBeenCalled();
        expect(test.properties.has("gardenAnalyticsRefreshLeaseV1")).toBe(
            false
        );
        expect(diagnosticLogs(test.logError.mock.calls)).toStrictEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    stage: "analytics.prepare",
                    status: "failed",
                }),
            ])
        );
    });

    it("logs before each stage, correlates the run, and includes analytics in total elapsed time", () => {
        expect.hasAssertions();

        let now = 0;
        const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
        try {
            const test = fixture();

            test.context["processQueuedAppSheetEntryRows_"] = () => {
                now += 20;
                return {
                    deferredCount: 0,
                    elapsedMs: 20,
                    needsCorrectionCount: 0,
                    ok: true,
                    processedCount: 2,
                    queuedCount: 2,
                    retryCount: 0,
                    savedCount: 2,
                };
            };

            test.context["processQueuedAppSheetBulkEntries_"] = () => {
                now += 30;
                return {
                    deferredCount: 0,
                    elapsedMs: 30,
                    needsCorrectionCount: 0,
                    ok: true,
                    processedCount: 1,
                    queuedCount: 1,
                    requestedCount: 3,
                    retryCount: 0,
                    savedRequestCount: 3,
                    savedRoundCount: 1,
                };
            };

            test.valuesRead.mockImplementation((id, options) => {
                expect(
                    diagnosticLogs(test.logInfo.mock.calls).at(-1)
                ).toMatchObject({ stage: "analytics.read", status: "started" });

                now += 7;
                return analyticsReadResponse(id, options, test.historyRead());
            });

            test.batchUpdate.mockImplementation(() => {
                expect(
                    diagnosticLogs(test.logInfo.mock.calls).at(-1)
                ).toMatchObject({
                    stage: "analytics.publish",
                    status: "started",
                });

                now += 40;
            });

            test.flush.mockImplementation(() => {
                now += 50;
            });

            const result = test.api.processQueuedAppSheetEntries();
            const logs = diagnosticLogs(test.logInfo.mock.calls);

            expect(
                logs
                    .filter((entry) => entry["status"] === "started")
                    .map((entry) => entry["stage"])
            ).toStrictEqual([
                "run",
                "open-workbook",
                "single-intake",
                "bulk-intake",
                "analytics.freshness",
                "analytics",
                "analytics.lease",
                "analytics.prepare",
                "analytics.read",
                "analytics.calculate",
                "analytics.prepare-publication",
                "analytics.publish",
                "analytics.flush",
                "analytics.release-lease",
            ]);
            expect(new Set(logs.map((entry) => entry["runId"]))).toStrictEqual(
                new Set(["fixture-lease"])
            );
            expect(result).toMatchObject({
                elapsedMs: 161,
                ok: true,
                queuedCount: 2,
            });
            expect(
                logs.find((entry) => entry["stage"] === "summary")
            ).toMatchObject({
                analyticsSkipped: false,
                analyticsStatus: "Ready",
                bulkSavedRequestCount: 3,
                elapsedMs: 161,
                historyRows: 2,
                savedCount: 2,
            });
            expect(logs.at(-1)).toMatchObject({
                elapsedMs: 161,
                stage: "run",
                status: "completed",
            });
        } finally {
            clock.mockRestore();
        }
    });

    it("identifies a failed publication without logging private error text or observations", () => {
        expect.hasAssertions();

        const test = fixture();

        test.batchUpdate.mockImplementation(() => {
            throw new Error("Private note and workbook identifier");
        });

        expect(
            test.api.refreshGardenAnalyticsSafely_(test.spreadsheet)
        ).toMatchObject({
            message: "Private note and workbook identifier",
            status: "Refresh failed",
        });
        expect(diagnosticLogs(test.logError.mock.calls)).toStrictEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    stage: "analytics.publish",
                    status: "failed",
                }),
            ])
        );

        const logged = JSON.stringify([
            ...test.logInfo.mock.calls,
            ...test.logError.mock.calls,
        ]);

        expect(logged).not.toContain("Private note");
        expect(logged).not.toContain("Window shelf");
        expect(logged).not.toContain("disposable-fixture");
        expect(test.flush).toHaveBeenCalledTimes(1);
    });

    it("preserves successful work and original errors when diagnostic output fails", () => {
        expect.hasAssertions();

        const test = fixture();

        test.logInfo.mockImplementation(() => {
            throw new Error("Log unavailable");
        });

        test.logError.mockImplementation(() => {
            throw new Error("Log unavailable");
        });

        expect(
            test.api.refreshGardenAnalyticsSafely_(test.spreadsheet).status
        ).toBe("Ready");

        test.batchUpdate.mockImplementation(() => {
            throw new Error("Original publication failure");
        });

        expect(
            test.api.refreshGardenAnalyticsSafely_(test.spreadsheet)
        ).toMatchObject({
            message: "Original publication failure",
            status: "Refresh failed",
        });
    });
});

describe("scheduled analytics materialization", () => {
    it("reports an awaiting snapshot when the metadata read returns no rows", () => {
        expect.hasAssertions();

        const test = fixture();
        const spreadsheet = {
            getSheetByName: () => ({
                getRange: () => ({ getValues: () => [] }),
            }),
        };

        expect(
            structuredClone(test.api.workbookCalculationStatus_(spreadsheet))
        ).toStrictEqual({ status: "Awaiting native refresh" });
    });

    it("publishes compressed large outputs with the existing metadata, timestamp format and NOW clock in one batch", () => {
        expect.hasAssertions();

        const test = fixture({
            history: Array.from({ length: 128 }, (_, index) =>
                observation(index, "Light")
            ),
        });
        const compress = vi.fn(test.api.gardenAnalyticsCellsRequests_);

        test.context["gardenAnalyticsCellsRequests_"] = compress;

        const result = test.api.refreshGardenAnalytics_(test.spreadsheet);
        const [payload] =
            /**
             * @type {[
             *     {
             *         requests: import("../apps-script-fixtures.js").AnalyticsCellsRequest[];
             *     },
             * ]}
             */ (/** @type {unknown} */ (test.batchUpdate.mock.calls[0]));

        expect(result.status).toBe("Ready");
        expect(compress).toHaveBeenCalledTimes(4);
        expect(test.batchUpdate).toHaveBeenCalledTimes(1);
        expect(
            payload.requests.some(
                (request) => request.updateCells?.rows.length === 0
            )
        ).toBe(true);
        expect(
            payload.requests.at(-3)?.updateCells?.rows[1]?.values[1]
                ?.userEnteredValue?.stringValue
        ).toBe("Ready");
        expect(payload.requests.at(-2)).toMatchObject({
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
            payload.requests.at(-1)?.updateCells?.rows[0]?.values[0]
                ?.userEnteredValue?.formulaValue
        ).toBe("=NOW()");
        expect(test.writes).not.toHaveBeenCalled();
    });

    it("reads paired History columns and atomically publishes four correctly sized outputs and one snapshot identity", () => {
        expect.hasAssertions();

        const test = fixture({ selectedPlant: "P01", selectedSetup: 3 });
        const result = test.api.refreshGardenAnalytics_(test.spreadsheet);

        expect(result.status).toBe("Ready");
        expect(test.valuesRead).toHaveBeenCalledTimes(3);
        expect(
            test.valuesRead.mock.calls.map(
                ([, options]) => options.dateTimeRenderOption
            )
        ).toStrictEqual([
            "SERIAL_NUMBER",
            "FORMATTED_STRING",
            "SERIAL_NUMBER",
        ]);
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
        expect(test.writes).not.toHaveBeenCalled();
    });

    it("keeps the installed workbook and prior Ready snapshot untouched until atomic publication", () => {
        expect.hasAssertions();

        const test = fixture({
            calculationStatus: "Ready",
            calculationTime: asOf,
        });

        test.batchUpdate.mockImplementationOnce(() => {
            expect(test.writes).not.toHaveBeenCalled();
            expect(test.flush).not.toHaveBeenCalled();

            for (const sheet of test.sheets.values()) {
                expect(sheet.insertColumnsAfter).not.toHaveBeenCalled();
            }

            expect(
                structuredClone(
                    test.api.workbookCalculationStatus_(test.spreadsheet)
                )
            ).toStrictEqual({
                calculatedAt: asOf.toISOString(),
                status: "Ready",
            });
            expect(
                test.api.refreshGardenAnalytics_(test.spreadsheet).status
            ).toBe("Busy");
        });

        const result = test.api.refreshGardenAnalytics_(test.spreadsheet);

        expect(result.status).toBe("Ready");
        expect(test.batchUpdate).toHaveBeenCalledTimes(1);
        expect(test.flush).toHaveBeenCalledExactlyOnceWith();
        expect(test.flush).toHaveBeenCalledAfter(test.batchUpdate);
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
                "Refresh failed",
            ],
        ]);
        expect(test.releaseLock).toHaveBeenCalledTimes(2);
        expect(test.batchUpdate).toHaveBeenCalledTimes(1);
    });

    it("normalizes a thrown service-adapter string and preserves the previous snapshot", () => {
        expect.hasAssertions();

        const test = fixture({
            calculationStatus: "Ready",
            calculationTime: asOf,
        });

        // A JavaScript adapter can throw a primitive. Exercise the boundary
        // through an actual VM exception rather than replacing the wrapper.
        test.batchUpdate.mockImplementationOnce(() => {
            vm.runInContext(
                'throw "Sheets backend temporarily unavailable"',
                test.context
            );
        });

        const result = structuredClone(
            test.api.refreshGardenAnalyticsSafely_(test.spreadsheet)
        );

        expect(result).toStrictEqual({
            message: "Sheets backend temporarily unavailable",
            status: "Refresh failed",
        });
        expect(test.writes.mock.calls).toStrictEqual([
            [
                "Workbook calculations",
                ["I2"],
                "Refresh failed",
            ],
        ]);
        expect(
            test.api.workbookCalculationStatus_(test.spreadsheet).calculatedAt
        ).toBe(asOf.toISOString());
        expect(test.properties.has("gardenAnalyticsRefreshLeaseV1")).toBe(
            false
        );
    });
});

describe("analytics recovery and publication guards", () => {
    it.each([false, true])(
        "flushes failure status before releasing its lease and preserves the original error (flush failure: %s)",
        (failFlush) => {
            expect.hasAssertions();

            const test = fixture({
                calculationStatus: "Ready",
                calculationTime: asOf,
                failBatch: true,
            });

            test.flush.mockImplementationOnce(() => {
                expect(test.writes).toHaveBeenCalledExactlyOnceWith(
                    "Workbook calculations",
                    ["I2"],
                    "Refresh failed"
                );
                expect(
                    test.properties.has("gardenAnalyticsRefreshLeaseV1")
                ).toBe(true);
                expect(test.releaseLock).toHaveBeenCalledTimes(1);

                if (failFlush) throw new Error("Failure-status flush failed");
            });

            const result = test.api.refreshGardenAnalyticsSafely_(
                test.spreadsheet
            );

            expect(result).toMatchObject({
                message: "Derived batch failed",
                status: "Refresh failed",
            });
            expect(test.flush).toHaveBeenCalledExactlyOnceWith();
            expect(test.flush).toHaveBeenCalledAfter(test.writes);
            expect(test.releaseLock).toHaveBeenCalledTimes(2);
            expect(test.properties.has("gardenAnalyticsRefreshLeaseV1")).toBe(
                false
            );
            expect(
                test.api.workbookCalculationStatus_(test.spreadsheet)
                    .calculatedAt
            ).toBe(asOf.toISOString());
            expect(
                test.logError.mock.calls.some(([message]) =>
                    String(message).includes(
                        '"stage":"analytics.failure-flush"'
                    )
                )
            ).toBe(failFlush);
        }
    );

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
        { age: 0, skipped: true, status: "Ready" },
        { age: 479_999, skipped: true, status: "Ready" },
        { age: 480_000, skipped: false, status: "Ready" },
        { age: 600_000, skipped: false, status: "Ready" },
        { age: -1, skipped: false, status: "Ready" },
        { age: 0, skipped: false, status: "Refresh failed" },
        { age: 0, skipped: false, status: "Refreshing" },
        { age: 0, skipped: false, status: "" },
    ])(
        "scheduled analytics age $age / $status skips=$skipped without skipping intake",
        ({ age, skipped, status }) => {
            expect.hasAssertions();

            const expectedSkip = skipped ? true : undefined;
            const expectedBatches = skipped ? 0 : 1;
            const clock = vi.spyOn(Date, "now").mockReturnValue(asOf.getTime());
            try {
                const calculatedAt = new Date(asOf.getTime() - age);
                const test = fixture({
                    calculationStatus: status,
                    calculationTime: calculatedAt,
                });
                const bulk = vi.fn(() => ({ ok: true }));

                test.context["processQueuedAppSheetBulkEntries_"] = bulk;

                const summary = test.api.finishAppSheetQueueRun_(
                    test.spreadsheet,
                    {
                        ok: true,
                        savedCount: 3,
                    }
                );

                expect(summary).toMatchObject({
                    analytics: { status: "Ready" },
                    ok: true,
                    savedCount: 3,
                });
                expect(bulk).toHaveBeenCalledExactlyOnceWith(test.spreadsheet);
                expect(summary.analytics.skipped).toBe(expectedSkip);
                expect(test.batchUpdate).toHaveBeenCalledTimes(expectedBatches);
                expect(test.valuesRead).toHaveBeenCalledTimes(
                    expectedBatches * 3
                );
            } finally {
                clock.mockRestore();
            }
        }
    );

    it("returns the previous successful time without locks or writes when scheduled analytics is skipped", () => {
        expect.hasAssertions();

        const clock = vi.spyOn(Date, "now").mockReturnValue(asOf.getTime());
        try {
            const test = fixture({
                calculationStatus: "Ready",
                calculationTime: asOf,
            });

            test.context["processQueuedAppSheetBulkEntries_"] = () => ({
                ok: true,
            });

            const summary = test.api.finishAppSheetQueueRun_(test.spreadsheet, {
                ok: true,
                savedCount: 0,
            });

            expect(summary.analytics.calculatedAt).toBe(asOf.toISOString());
            expect(summary.analytics.skipped).toBe(true);
            expect(test.getScriptLock).not.toHaveBeenCalled();
            expect(test.writes).not.toHaveBeenCalled();
            expect(test.flush).not.toHaveBeenCalled();
        } finally {
            clock.mockRestore();
        }
    });

    it.each([
        "",
        "2026-10-18T04:30:00Z",
        new Date(NaN),
    ])(
        "refreshes scheduled analytics for malformed or missing native timestamp %s",
        (calculationTime) => {
            expect.hasAssertions();

            const test = fixture({
                calculationStatus: "Ready",
                calculationTime,
            });

            test.context["processQueuedAppSheetBulkEntries_"] = () => ({
                ok: true,
            });

            const summary = test.api.finishAppSheetQueueRun_(test.spreadsheet, {
                ok: true,
                savedCount: 0,
            });

            expect(summary.analytics.skipped).toBeUndefined();
            expect(test.batchUpdate).toHaveBeenCalledTimes(1);
        }
    );

    it("refreshes scheduled analytics when prior metadata cannot be read", () => {
        expect.hasAssertions();

        const test = fixture({ failCalculationRead: true });

        test.context["processQueuedAppSheetBulkEntries_"] = () => ({
            ok: true,
        });

        const summary = test.api.finishAppSheetQueueRun_(test.spreadsheet, {
            ok: true,
            savedCount: 0,
        });

        expect(summary.analytics.status).toBe("Ready");
        expect(test.batchUpdate).toHaveBeenCalledTimes(1);
    });

    it.each(["recalculateGardenWorkbook", "refreshGardenAnalytics"])(
        "%s always refreshes a recent successful snapshot",
        (action) => {
            expect.hasAssertions();

            const test = fixture({
                calculationStatus: "Ready",
                calculationTime: new Date(),
            });
            const result =
                action === "recalculateGardenWorkbook"
                    ? test.api.recalculateGardenWorkbook()
                    : test.api.refreshGardenAnalytics();

            expect(result.status).toBe("Ready");
            expect(test.batchUpdate).toHaveBeenCalledTimes(1);
            expect(test.valuesRead).toHaveBeenCalledTimes(3);
        }
    );

    it.each([
        { busy: true, status: "Busy" },
        { lease: `${Date.now() + 480_000}:other-refresh`, status: "Busy" },
        { historyLastRow: 50_002, status: "Refresh failed" },
    ])(
        "fails safely before outputs for $status / $busy $noLock $historyLastRow",
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

    it("preserves the original publication failure when failure-status writing also fails", () => {
        expect.hasAssertions();

        const test = fixture({ failBatch: true, failStatus: true });
        const result = test.api.refreshGardenAnalyticsSafely_(test.spreadsheet);

        expect(result).toMatchObject({
            message: "Derived batch failed",
            status: "Refresh failed",
        });
        expect(test.logError).toHaveBeenCalledWith(
            expect.stringContaining('"stage":"analytics.failure-status"')
        );
        expect(test.writes).not.toHaveBeenCalled();
        expect(test.flush).not.toHaveBeenCalled();
        expect(test.properties.has("gardenAnalyticsRefreshLeaseV1")).toBe(
            false
        );
    });

    it.each([
        {
            batches: 0,
            busy: true,
            message:
                "Another save or calculation is running. Try again shortly.",
            status: "Busy",
        },
        {
            batches: 1,
            failBatch: true,
            message:
                "Recalculation failed. Previous results and saved observations are retained; retry the refresh.",
            status: "Refresh failed",
        },
    ])(
        "reports a manual $status result without claiming completion",
        ({ batches, message, status, ...options }) => {
            expect.hasAssertions();

            const test = fixture(options);
            const result = test.api.recalculateGardenWorkbook();

            expect(result.status).toBe(status);
            expect(result).not.toHaveProperty("calculatedAt");
            expect(test.batchUpdate).toHaveBeenCalledTimes(batches);
            expect(test.spreadsheet.toast).toHaveBeenLastCalledWith(
                message,
                "Garden calculations",
                8
            );
        }
    );

    it("reports unavailable metadata when the native read fails without changing the snapshot", () => {
        expect.hasAssertions();

        const test = fixture({
            calculationStatus: "Ready",
            calculationTime: asOf,
            failCalculationRead: true,
        });
        const result = structuredClone(
            test.api.workbookCalculationStatus_(test.spreadsheet)
        );

        expect(result).toStrictEqual({ status: "Unavailable" });
        expect(test.logError).toHaveBeenCalledWith(
            JSON.stringify({
                operation: "workbookCalculationStatus",
                status: "failed",
            })
        );
        expect(test.writes).not.toHaveBeenCalled();
        expect(test.batchUpdate).not.toHaveBeenCalled();
    });

    it("releases its reservation if the calculation sheet is missing and reports no available snapshot", () => {
        expect.hasAssertions();

        const test = fixture();

        test.sheets.delete("Workbook calculations");

        const result = test.api.refreshGardenAnalyticsSafely_(test.spreadsheet);

        expect(result.status).toBe("Refresh failed");
        expect(test.properties.has("gardenAnalyticsRefreshLeaseV1")).toBe(
            false
        );
        expect(test.historyRead).not.toHaveBeenCalled();
        expect(test.batchUpdate).not.toHaveBeenCalled();
        expect(
            test.api.workbookCalculationStatus_(test.spreadsheet).status
        ).toBe("Unavailable");
    });

    it("retains successful publication and a bounded reservation if a save blocks lease cleanup", () => {
        expect.hasAssertions();

        const startedAt = Date.now();
        let currentTime = startedAt;
        const clock = vi
            .spyOn(Date, "now")
            .mockImplementation(() => currentTime);
        try {
            const test = fixture({ cleanupBusy: true });
            const result = test.api.recalculateGardenWorkbook();
            const lease = test.properties.get("gardenAnalyticsRefreshLeaseV1");
            const expiresAt = Number(lease?.split(":", 1)[0]);

            expect(result.status).toBe("Ready");
            expect(result.calculatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/v);
            expect(expiresAt).toBe(startedAt + 480_000);
            expect(test.api.recalculateGardenWorkbook().status).toBe("Busy");
            expect(test.batchUpdate).toHaveBeenCalledTimes(1);
            // The second refresh acquired and released the script lock. Its
            // Busy result therefore comes from the retained valid lease.
            expect(test.releaseLock).toHaveBeenCalledTimes(2);

            currentTime = expiresAt + 1;
            const recovered = test.api.recalculateGardenWorkbook();

            expect(recovered.status).toBe("Ready");
            expect(test.batchUpdate).toHaveBeenCalledTimes(2);
            expect(test.properties.has("gardenAnalyticsRefreshLeaseV1")).toBe(
                false
            );
        } finally {
            clock.mockRestore();
        }
    });

    it("keeps a committed snapshot successful when lease cleanup storage fails", () => {
        expect.hasAssertions();

        const test = fixture({ failLeaseCleanup: true });
        const result = test.api.recalculateGardenWorkbook();

        expect(result.status).toBe("Ready");
        expect(result.calculatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/v);
        expect(test.batchUpdate).toHaveBeenCalledTimes(1);
        expect(test.properties.get("gardenAnalyticsRefreshLeaseV1")).toMatch(
            /^\d+:fixture-lease$/v
        );
        expect(test.logError).toHaveBeenCalledWith(
            expect.stringContaining('"stage":"analytics.release-lease"')
        );
        expect(test.releaseLock).toHaveBeenCalledTimes(2);
    });

    it("publishes empty cycle identity when the selected plant has no current baseline", () => {
        expect.hasAssertions();

        const test = fixture({
            missingSelectedBaseline: true,
            selectedPlant: "P99",
        });
        const result = test.api.recalculateGardenWorkbook();
        const metadataRows = expect.arrayContaining([
            {
                values: [
                    { userEnteredValue: { numberValue: expect.any(Number) } },
                    { userEnteredValue: { stringValue: "Ready" } },
                    { userEnteredValue: { stringValue: "P99" } },
                    {},
                ],
            },
        ]);
        const metadataCells = expect.objectContaining({ rows: metadataRows });
        const metadataRequest = expect.objectContaining({
            updateCells: metadataCells,
        });
        const expectedBatch = expect.objectContaining({
            requests: expect.arrayContaining([metadataRequest]),
        });

        expect(result.status).toBe("Ready");
        expect(test.batchUpdate).toHaveBeenCalledWith(
            expectedBatch,
            "disposable-fixture"
        );
        expect(test.properties.has("gardenAnalyticsRefreshLeaseV1")).toBe(
            false
        );
    });

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
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "UTC",
            timeZoneName: "longOffset",
        });
        const formatToParts = vi.fn((/** @type {Date} */ date) =>
            formatter.formatToParts(date)
        );

        // Only this VM receives the spy; no shared Intl globals are replaced.
        test.context["Intl"] = {
            DateTimeFormat: vi.fn(function createFormatter() {
                return { formatToParts };
            }),
        };

        const first = observation(0, "Light");
        const second = observation(36, "Humidity");
        const sharedDate = new Date("2025-01-01T00:00:00Z");
        first[0] = sharedDate;
        second[0] = sharedDate;
        second[42] = 40;
        const history = [first, second];
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

        const conversions = test.nativeFormatDate.mock.calls.filter(
            (formatCall) => formatCall[2] === "Z"
        );

        expect(conversions).toHaveLength(0);
        expect(formatToParts).toHaveBeenCalledExactlyOnceWith(sharedDate);
        expect(
            request.updateCells.rows[2]?.values[0]?.userEnteredValue
                ?.numberValue
        ).toBe(serials.get(timestamp));
    });

    it("preserves numeric Sheet serial dates and excludes invalid stored dates from models", () => {
        expect.hasAssertions();

        const test = fixture();
        const events = [
            "Water",
            "Weigh",
            "Weigh",
            "Water",
            "Weigh",
            "Weigh",
        ];
        const dates = [
            46_000,
            46_000,
            46_001,
            46_002,
            46_002,
            "invalid date",
        ];
        const weights = [
            "",
            1000,
            900,
            "",
            1000,
            100,
        ];
        const history = events.map((event, index) => {
            const row = observation(index, event);
            row[0] = dates[index] ?? "";
            row[1] = "P01";
            row[4] = weights[index] ?? "";
            return row;
        });
        const cache = new Map();
        const result = test.api.gardenAnalyticsOutputs_(
            history,
            "P01",
            1,
            asOf,
            "UTC",
            cache
        );
        const model = result.models.find(([id]) => id === "P01");

        expect(structuredClone(model?.slice(0, 4))).toStrictEqual([
            "P01",
            1,
            900,
            1000,
        ]);
        expect(cache.size).toBe(0);
        expect(history[5]?.[0]).toBe("invalid date");
    });

    it("counts UTF-8 bytes and rejects an oversized atomic payload without publishing", () => {
        expect.hasAssertions();

        const test = fixture();

        expect(test.api.gardenAnalyticsPayloadBytes_("\0Aé水🌱")).toBe(
            Buffer.byteLength("\0Aé水🌱")
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
        expect(output.models).toHaveLength(40);
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
