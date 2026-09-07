import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    correctionRpc,
    loggerCorrectionApi,
} from "../helpers/logger-correction-api.mjs";
import { required } from "../helpers/required.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = readFileSync(sourceUrl, "utf8");
const headers = [
    "Date",
    "Plant ID",
    "Event",
    "Weight state",
    "Weight (g)",
    "Height (cm)",
    "Width (cm)",
    "Plant condition",
    "Notes",
    "Recorded",
    "Pot setup",
    "Pot label at entry",
    "Plant / planter",
    "Trend anchor",
    "Days after anchor",
    "Request ID",
    "Nutrients used",
    "Nutrient product",
    "Nutrient amount",
    "Previous pot size",
    "Pot size",
    "Flower count",
    "Flower details",
    "Photo URL",
    "Pest / issue",
    "Treatment / action",
    "Observation ID",
    "Entry source",
    "Observation quality",
    "Save group / batch ID",
    "Corrects observation ID",
    "Correction reason",
    "Soil moisture",
    "Medium / substrate",
    "Measurement method",
    "Record status",
    "Measurement unit",
    "Height (in)",
    "Width (in)",
    "Rotation (°)",
    "Watering application",
    "Water amount (mL)",
];

/**
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionCell} destination
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionCellData} data
 * @param {string} fields
 * @param {number} column
 * @param {string} timeZone
 */
function applyCell(destination, data, fields, column, timeZone) {
    switch (fields) {
        case "dataValidation": {
            if (Object.keys(data).length > 0)
                throw new Error("Unexpected validation payload");
            destination.validation = "";
            return;
        }
        case "userEnteredFormat.numberFormat": {
            destination.format = required(
                data.userEnteredFormat
            ).numberFormat.pattern;
            return;
        }
        case "userEnteredValue": {
            const entered = data.userEnteredValue;
            if (entered === undefined) {
                destination.formula = "";
                destination.value = "";
                return;
            }
            if (Object.keys(entered).length !== 1)
                throw new Error("Invalid ExtendedValue union");
            destination.formula = entered.formulaValue ?? "";
            if (entered.numberValue === undefined)
                destination.value = entered.stringValue ?? "";
            else {
                if (!Number.isFinite(entered.numberValue))
                    throw new Error("Nonfinite Sheets number");
                destination.value =
                    column === 0 || column === 9
                        ? serialDate(entered.numberValue, timeZone)
                        : entered.numberValue;
            }
            return;
        }
        default: {
            throw new Error(`Unsupported field mask: ${fields}`);
        }
    }
}

/**
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionCell[][]} rows
 * @param {Extract<
 *     import("../logger-correction-fixtures.d.ts").CorrectionSheetsRequest,
 *     { updateCells: object }
 * >["updateCells"]} update
 * @param {number} maxRows
 * @param {string} timeZone
 */
function applyUpdate(rows, update, maxRows, timeZone) {
    const { columnIndex, rowIndex, sheetId } = update.start;
    const values = required(update.rows[0]).values;
    if (
        sheetId !== 27 ||
        rowIndex < 1 ||
        rowIndex >= maxRows ||
        update.rows.length !== 1 ||
        columnIndex < 0 ||
        columnIndex + values.length > 42
    ) {
        throw new Error("Invalid update range");
    }
    while (rows.length <= rowIndex)
        rows.push(Array.from({ length: 42 }, () => cell()));
    for (const [offset, data] of values.entries()) {
        applyCell(
            required(required(rows[rowIndex])[columnIndex + offset]),
            data,
            update.fields,
            columnIndex + offset,
            timeZone
        );
    }
}

/**
 * @param {Date | number | string} [value] @returns
 *   {import("../logger-correction-fixtures.d.ts").CorrectionCell}
 */
function cell(value = "") {
    return {
        format: "preserved-format",
        formula: "",
        validation: "preserved-validation",
        value,
    };
}

/**
 * A precise sparse Sheets mock: validates the entire batch before publishing
 * changes, preserves every unmasked cell property, and can lose a commit
 * reply.
 *
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionCell[][]} [observations]
 * @param {string} [timeZone]
 */
function fixture(
    observations = [observation()],
    timeZone = "America/New_York"
) {
    const state = {
        acquisitions: 0,
        /** @type {string[]} */
        alertMessages: [],
        alerts: 0,
        /** @type {import("../logger-correction-fixtures.d.ts").CorrectionSheetsRequest[][]} */
        batches: [],
        confirmed: true,
        fault: "",
        firstSelectedRow: 2,
        hasSelection: true,
        lastSelectedRow: 2,
        locked: false,
        lockUnavailable: false,
        maxColumns: 42,
        maxRows: Math.max(100, observations.length + 1),
        onAlert: () => {},
        /** @type {Map<string, string>} */
        properties: new Map(),
        propertyFault: "",
        releases: 0,
        rows: [headers.map((header) => cell(header)), ...observations],
        sheetName: "History",
        writes: 0,
    };
    const history = {
        getLastRow: () => state.rows.length,
        getMaxColumns: () => state.maxColumns,
        getMaxRows: () => state.maxRows,
        getName: () => "History",
        /**
         * @param {number} row @param {number} column @param {number} rowCount
         * @param {number} columnCount
         */
        getRange(row, column, rowCount, columnCount) {
            if (
                row + rowCount - 1 > state.maxRows ||
                column + columnCount - 1 > state.maxColumns
            )
                throw new Error("Range outside grid");
            return {
                getFormulas: () =>
                    selectedMatrix(
                        state.rows,
                        row,
                        column,
                        rowCount,
                        columnCount,
                        "formula"
                    ),
                getValues: () =>
                    selectedMatrix(
                        state.rows,
                        row,
                        column,
                        rowCount,
                        columnCount,
                        "value"
                    ),
            };
        },
        getSheetId: () => 27,
    };
    const spreadsheet = {
        getActiveRange: () =>
            state.hasSelection
                ? {
                      getLastRow: () => state.lastSelectedRow,
                      getRow: () => state.firstSelectedRow,
                  }
                : null,
        getActiveSheet: () => ({ getName: () => state.sheetName }),
        getId: () => "disposable-workbook",
        getSheetByName: (/** @type {string} */ name) =>
            name === "History" ? history : null,
        getSpreadsheetTimeZone: () => timeZone,
        toast: () => {},
    };
    /**
     * @param {{
     *     requests: import("../logger-correction-fixtures.d.ts").CorrectionSheetsRequest[];
     * }} batch
     * @param {string} id
     */
    function batchUpdate(batch, id) {
        if (id !== "disposable-workbook" || !state.locked)
            throw new Error(
                "Atomic writes require the workbook and script lock"
            );
        state.batches.push(structuredClone(batch.requests));
        if (state.fault === "before")
            throw new Error("Sheets rejected batch before commit");
        const next = structuredClone(state.rows);
        let maxRows = state.maxRows;
        for (const request of batch.requests) {
            if ("appendDimension" in request) {
                const dimension = request.appendDimension;
                if (
                    dimension.sheetId !== 27 ||
                    dimension.dimension !== "ROWS" ||
                    !Number.isSafeInteger(dimension.length) ||
                    dimension.length === 0
                )
                    throw new Error("Invalid dimension request");
                maxRows += dimension.length;
                continue;
            }
            applyUpdate(next, request.updateCells, maxRows, timeZone);
        }
        state.rows = next;
        state.maxRows = maxRows;
        state.writes += 1;
        if (state.fault === "after")
            throw new Error("Committed; response connection lost");
        return {};
    }
    const context = vm.createContext({
        console,
        Date,
        LockService: {
            getScriptLock: () => ({
                releaseLock: () => {
                    state.locked = false;
                    state.releases += 1;
                },
                tryLock: () => {
                    if (state.locked || state.lockUnavailable) return false;
                    state.locked = true;
                    state.acquisitions += 1;
                    return true;
                },
            }),
        },
        Map,
        Object,
        PropertiesService: {
            getScriptProperties: () => ({
                getProperty: (/** @type {string} */ key) => {
                    if (!state.locked)
                        throw new Error("Property read requires script lock");
                    return state.properties.get(key) ?? null;
                },
                setProperty: (
                    /** @type {string} */ key,
                    /** @type {string} */ value
                ) => {
                    if (!state.locked)
                        throw new Error("Property write requires script lock");
                    if (state.propertyFault === "throw")
                        throw new Error("Property quota exceeded");
                    if (state.propertyFault !== "silent")
                        state.properties.set(key, value);
                },
            }),
        },
        Set,
        Sheets: { Spreadsheets: { batchUpdate } },
        SpreadsheetApp: {
            getActive: () => spreadsheet,
            getUi: () => ({
                alert: (
                    /** @type {string} */ title,
                    /** @type {string} */ message
                ) => {
                    if (state.locked)
                        throw new Error(
                            "A script lock must not cross a UI alert"
                        );
                    state.alerts += 1;
                    state.alertMessages.push(`${title}\n${message}`);
                    state.onAlert();
                    return state.confirmed ? "YES" : "NO";
                },
                Button: { YES: "YES" },
                ButtonSet: { YES_NO: "YES_NO" },
            }),
            openById: () => spreadsheet,
        },
        Utilities: {
            Charset: { UTF_8: "UTF_8" },
            computeDigest: (
                /** @type {string} */ algorithm,
                /** @type {string} */ value,
                /** @type {string} */ charset
            ) => {
                if (algorithm !== "SHA_256" || charset !== "UTF_8")
                    throw new Error("Unexpected digest encoding");
                return [...createHash("sha256").update(value).digest()].map(
                    (byte) => (byte > 127 ? byte - 256 : byte)
                );
            },
            DigestAlgorithm: { SHA_256: "SHA_256" },
            formatDate: (
                /** @type {Date} */ date,
                /** @type {string} */ zone,
                /** @type {string} */ pattern
            ) =>
                pattern === "yyyy-MM-dd'T'HH:mm:ss.SSS"
                    ? wallClock(date, zone)
                    : `${wallClock(date, zone)} ${zone}`,
        },
    });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    const api = loggerCorrectionApi(context);
    return { api, context, state };
}

/**
 * @param {string} [event]
 * @param {string} [id]
 * @param {Record<number, Date | number | string>} [overrides]
 *
 * @returns {import("../logger-correction-fixtures.d.ts").CorrectionCell[]}
 */
function observation(event = "Weigh", id = "original-1", overrides = {}) {
    const row = Array.from({ length: 42 }, () => cell());
    const values = {
        0: new Date("2026-09-03T16:23:45.123Z"),
        1: "P01",
        2: event,
        8: "saved note",
        9: new Date("2026-09-03T16:24:01Z"),
        10: 2,
        11: "A1 historical",
        15: `save-${id}`,
        26: id,
        27: "Mobile logger",
        28: event === "Weigh" || event === "Measure" ? "Measured" : "Observed",
        29: `save-${id}`,
        31: "Original audit reason remains exact. ",
        34:
            event === "Weigh"
                ? "Scale"
                : event === "Measure"
                  ? "Ruler"
                  : "Observed",
        35: "Active",
        ...overrides,
    };
    for (const [index, value] of Object.entries(values))
        required(row[Number(index)]).value = value;
    for (const index of [
        12,
        13,
        14,
        37,
        38,
    ])
        required(row[index]).formula = `=original_formula_${index}`;
    if (event === "Weigh") {
        required(row[4]).value = overrides[4] ?? 1234.5;
        return row;
    }
    if (event === "Measure") {
        required(row[5]).value = overrides[5] ?? 12.34567;
        required(row[6]).value = overrides[6] ?? 4.32109;
        required(row[36]).value = overrides[36] ?? "in";
    }
    return row;
}

/**
 * @param {ReturnType<typeof fixture>} model
 * @param {Record<string, string | number>} [changes]
 * @param {string} [observationId]
 * @param {string} [requestId]
 *
 * @returns {import("../logger-correction-fixtures.d.ts").CorrectionSavePayload}
 */
function prepare(
    model,
    changes,
    observationId = "original-1",
    requestId = "correction-request-001"
) {
    const entry = model.api.getWebCorrectionEntry({ observationId });
    const request = {
        baseRevision: entry.baseRevision,
        changes: changes ?? { notes: "Corrected note" },
        observationId,
        reason: "Correcting my transcription",
    };
    const preview = model.api.previewWebObservationCorrection(request);
    return { ...request, previewToken: preview.previewToken, requestId };
}

/**
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionSheetsRequest
 *     | undefined} request
 */
function replacementDateCell(request) {
    if (!request || !("updateCells" in request))
        throw new Error("Missing replacement write");
    return required(required(request.updateCells.rows[0]).values[0]);
}

/**
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionCell[][]} rows
 * @param {number} row
 * @param {number} column
 * @param {number} rowCount
 * @param {number} columnCount
 * @param {"formula" | "value"} property
 */
function selectedMatrix(rows, row, column, rowCount, columnCount, property) {
    return Array.from({ length: rowCount }, (_, offset) =>
        Array.from(
            { length: columnCount },
            (_unused, columnOffset) =>
                (rows[row + offset - 1]?.[column + columnOffset - 1] ?? cell())[
                    property
                ]
        )
    );
}

/** @param {number} serial @param {string} timeZone @returns {Date} */
function serialDate(serial, timeZone) {
    const target = Math.round((serial - 25_569) * 86_400_000);
    let result = target;
    for (let step = 0; step < 3; step += 1)
        result +=
            target - Date.parse(`${wallClock(new Date(result), timeZone)}Z`);
    return new Date(result);
}

/**
 * @param {ReturnType<typeof fixture>} model @param {number} row @param {number}
 *   column
 */
function stored(model, row, column) {
    return required(required(model.state.rows[row - 1])[column - 1]);
}

/** @param {Date} date @param {string} timeZone @returns {string} */
function wallClock(date, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        fractionalSecondDigits: 3,
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
        month: "2-digit",
        second: "2-digit",
        timeZone,
        year: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const part = (/** @type {Intl.DateTimeFormatPartTypes} */ type) =>
        required(parts.find((item) => item.type === type)).value;
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}.${part("fractionalSecond")}`;
}

describe("atomic saved History corrections", () => {
    it("returns exact canonical values, immutable metadata, applicable fields and audit context", () => {
        expect.hasAssertions();

        const model = fixture([observation("Measure")]);
        const entry = model.api.getWebCorrectionEntry({
            observationId: "original-1",
        });

        expect(entry.original.values).toStrictEqual({
            heightCm: 12.34567,
            measurementMethod: "Ruler",
            measurementQuality: "Measured",
            measurementUnit: "in",
            notes: "saved note",
            observationDate: "2026-09-03T16:23:45.123Z",
            widthCm: 4.32109,
        });
        expect(entry).toMatchObject({
            original: { label: "A1 historical", plantId: "P01", potSetup: 2 },
            timeZone: "America/New_York",
        });
        expect(entry.fields.map((field) => field.key)).not.toContain("plantId");
        expect(model.state).toMatchObject({
            acquisitions: 1,
            locked: false,
            releases: 1,
            writes: 0,
        });
    });

    it("writes only original AJ and one full replacement with correct formulas and literal text", () => {
        expect.hasAssertions();

        const model = fixture();
        const before = structuredClone(model.state.rows);
        const payload = prepare(model, {
            notes: "=SUM(A1:A9)",
            weight: "1250.125",
        });
        const receipt = model.api.saveWebObservationCorrection(payload);
        const expectedOriginal = required(before[1]);
        required(expectedOriginal[35]).value = "Removed";

        expect(model.state.rows[1]).toStrictEqual(expectedOriginal);
        expect(model.state.rows[0]).toStrictEqual(before[0]);
        expect(receipt).toMatchObject({
            originalObservationId: "original-1",
            requestId: payload.requestId,
            status: "saved",
        });
        expect(stored(model, 3, 27).value).toBe(
            `correction:${payload.requestId}:${receipt.operationDigest}`
        );
        expect(stored(model, 3, 9)).toMatchObject({
            formula: "",
            value: "=SUM(A1:A9)",
        });
        expect(stored(model, 3, 5).value).toBe(1250.125);
        expect(stored(model, 3, 13).formula).toContain("B3");
        expect(stored(model, 3, 38)).toMatchObject({
            formula: '=IF(F3="","",F3/2.54)',
            validation: "",
        });
        expect(stored(model, 3, 30).value).toBe("save-original-1");
        expect(stored(model, 3, 31).value).toBe("original-1");
        expect(stored(model, 3, 32).value).toBe(payload.reason);
        expect(model.state.writes).toBe(1);
    });

    it("leaves no mutation on a rejected atomic batch and retries the same payload", () => {
        expect.hasAssertions();

        const model = fixture();
        const payload = prepare(model);
        const before = structuredClone(model.state.rows);
        model.state.fault = "before";

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "before commit"
        );
        expect(model.state.rows).toStrictEqual(before);
        expect(model.api.getWebCorrectionStatus(payload)).toMatchObject({
            requestId: payload.requestId,
            status: "missing",
        });

        model.state.fault = "";

        expect(model.api.saveWebObservationCorrection(payload).status).toBe(
            "saved"
        );
        expect(model.state).toMatchObject({ locked: false, writes: 1 });
    });

    it("recovers a committed write whose response was lost and rejects a changed retry", () => {
        expect.hasAssertions();

        const model = fixture();
        const payload = prepare(model);
        model.state.fault = "after";

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "connection lost"
        );

        const committed = structuredClone(model.state.rows);
        const status = model.api.getWebCorrectionStatus(payload);

        expect(model.api.saveWebObservationCorrection(payload)).toStrictEqual(
            status
        );
        expect(() =>
            model.api.saveWebObservationCorrection({
                ...payload,
                changes: { notes: "Changed retry" },
            })
        ).toThrow("REQUEST_CONFLICT");
        expect(() =>
            model.api.getWebCorrectionStatus({
                ...payload,
                reason: "Different reason",
            })
        ).toThrow("REQUEST_CONFLICT");
        expect(model.state.rows).toStrictEqual(committed);
        expect(model.state.writes).toBe(1);
    });

    it("resolves IDs after sorting and does not invalidate an unrelated new plant", () => {
        expect.hasAssertions();

        const model = fixture([
            observation(),
            observation("Other", "other-plant", { 1: "P02" }),
        ]);
        const payload = prepare(model);
        const other = structuredClone(model.state.rows[2]);
        model.state.rows.splice(
            1,
            2,
            required(model.state.rows[2]),
            required(model.state.rows[1])
        );
        model.state.rows.push(
            observation("Repot", "new-plant", { 1: "P30", 10: 5 })
        );
        const result = model.api.saveWebObservationCorrection(payload);

        expect(model.state.rows[1]).toStrictEqual(other);
        expect(stored(model, 3, 36).value).toBe("Removed");
        expect(stored(model, 5, 27).value).toBe(
            result.replacementObservationId
        );
    });

    it("rejects competing corrections and supports correction lineage after later exclusion", () => {
        expect.hasAssertions();

        const model = fixture();
        const first = prepare(model);
        const competing = prepare(
            model,
            { weight: 500 },
            "original-1",
            "competing-request-002"
        );
        const receipt = model.api.saveWebObservationCorrection(first);

        expect(() => model.api.saveWebObservationCorrection(competing)).toThrow(
            "REMOVED_ORIGINAL"
        );

        const second = prepare(
            model,
            { weight: 900 },
            receipt.replacementObservationId,
            "correction-request-003"
        );
        const secondReceipt = model.api.saveWebObservationCorrection(second);
        model.state.firstSelectedRow = 4;
        model.state.lastSelectedRow = 4;
        model.api.removeSelectedHistoryObservations();
        const after = structuredClone(model.state.rows);

        expect(model.api.saveWebObservationCorrection(first)).toStrictEqual(
            receipt
        );
        expect(model.api.getWebCorrectionStatus(second)).toStrictEqual(
            secondReceipt
        );
        expect(model.state.rows).toStrictEqual(after);
        expect(stored(model, 4, 31).value).toBe(
            receipt.replacementObservationId
        );
        expect(stored(model, 4, 32).value).toContain(
            `${second.reason}\nExcluded`
        );
        expect(stored(model, 4, 36).value).toBe("Removed");
    });

    it("keeps status lookup behind the shared lock while a correction is in flight", () => {
        expect.hasAssertions();

        const model = fixture();
        const payload = prepare(model);
        model.state.locked = true;

        expect(() => model.api.getWebCorrectionStatus(payload)).toThrow(
            "CORRECTION_BUSY"
        );
        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "CORRECTION_BUSY"
        );
        expect(model.state.writes).toBe(0);
    });

    it("preserves Water/Weigh save groups, siblings and notes without companion events", () => {
        expect.hasAssertions();

        const model = fixture([
            observation("Water", "original-1", {
                16: "No",
                29: "",
                40: "Partial",
                41: 45,
            }),
            observation("Weigh", "same-save-weight", {
                8: "Sibling-only note",
                15: "save-original-1",
                29: "",
            }),
        ]);
        const sibling = structuredClone(model.state.rows[2]);
        const entry = model.api.getWebCorrectionEntry({
            observationId: "original-1",
        });

        expect(entry.siblings.map((row) => row.observationId)).toStrictEqual([
            "same-save-weight",
        ]);

        const payload = prepare(model, {
            observationDate: "2026-09-03T16:25:00Z",
            waterAmount: 75,
        });
        model.api.saveWebObservationCorrection(payload);

        expect(model.state.rows[2]).toStrictEqual(sibling);
        expect(model.state.rows).toHaveLength(4);
        expect(stored(model, 4, 30).value).toBe("save-original-1");
        expect(stored(model, 4, 5).value).toBe("");
        expect(stored(model, 4, 42).value).toBe(75);
    });

    it.each([
        ["Measured", "Ruler"],
        ["Estimated", "Estimated visually"],
        ["Corrected", "Ruler"],
    ])(
        "preserves dimension provenance %s/%s and exact stored centimetres",
        (quality, method) => {
            expect.hasAssertions();

            const model = fixture([
                observation("Measure", "original-1", {
                    28: quality,
                    34: method,
                }),
            ]);
            model.api.saveWebObservationCorrection(
                prepare(model, { notes: "Provenance stays" })
            );

            expect(stored(model, 3, 6).value).toBe(12.34567);
            expect(stored(model, 3, 29).value).toBe(quality);
            expect(stored(model, 3, 35).value).toBe(method);
            expect(stored(model, 3, 37).value).toBe("in");
        }
    );

    it("never upgrades an estimated weight through correction provenance", () => {
        expect.hasAssertions();

        const model = fixture([
            observation("Weigh", "original-1", {
                28: "Estimated",
                34: "Estimated from photo",
            }),
        ]);
        model.api.saveWebObservationCorrection(
            prepare(model, { weight: 1100 })
        );

        expect([
            stored(model, 3, 29).value,
            stored(model, 3, 35).value,
        ]).toStrictEqual(["Estimated", "Estimated from photo"]);
        expect(() =>
            prepare(
                model,
                { measurementQuality: "Measured" },
                String(stored(model, 3, 27).value)
            )
        ).toThrow("same evidence");
    });

    it("corrects historical Repot details after a newer setup without consulting or changing Baselines", () => {
        expect.hasAssertions();

        const model = fixture([
            observation("Repot", "original-1", {
                19: "3 in",
                20: "4 in",
                33: "Old mix",
            }),
            observation("Repot", "new-repot", {
                0: new Date("2026-09-05T12:00:00Z"),
                10: 3,
                20: "6 in",
            }),
        ]);
        model.api.saveWebObservationCorrection(
            prepare(model, { medium: "Correct mix", potSize: "4.5 in" })
        );

        expect([
            stored(model, 4, 11).value,
            stored(model, 4, 20).value,
            stored(model, 4, 21).value,
            stored(model, 4, 34).value,
        ]).toStrictEqual([
            2,
            "3 in",
            "4.5 in",
            "Correct mix",
        ]);
        expect(stored(model, 3, 11).value).toBe(3);
    });

    it("rejects setup/date moves across Repot or dependent readings and stale context", () => {
        expect.hasAssertions();

        const model = fixture([
            observation("Repot", "original-1", { 20: "4 in" }),
            observation("Weigh", "dependent", {
                0: new Date("2026-09-04T12:00:00Z"),
            }),
            observation("Repot", "next-setup", {
                0: new Date("2026-09-05T12:00:00Z"),
                10: 3,
            }),
        ]);

        expect(() =>
            prepare(model, { observationDate: "2026-09-04T13:00:00Z" })
        ).toThrow("SETUP_BOUNDARY");
        expect(() =>
            prepare(
                model,
                { observationDate: "2026-09-05T13:00:00Z" },
                "dependent"
            )
        ).toThrow("SETUP_BOUNDARY");

        const payload = prepare(model);
        stored(model, 4, 1).value = new Date("2026-09-06T12:00:00Z");

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "STALE_PREVIEW"
        );
        expect(model.state.writes).toBe(0);
    });

    it.each([
        [
            "America/New_York",
            "2026-03-08T06:59:59.125Z",
            "2026-03-08T01:59:59.125",
        ],
        [
            "America/New_York",
            "2026-03-08T07:00:01.875Z",
            "2026-03-08T03:00:01.875",
        ],
        [
            "Asia/Kathmandu",
            "2026-09-03T23:30:00.125Z",
            "2026-09-04T05:15:00.125",
        ],
    ])(
        "writes timezone-correct Sheets serial dates for %s at %s",
        (zone, iso, expectedLocal) => {
            expect.hasAssertions();

            const model = fixture([observation()], zone);
            model.api.saveWebObservationCorrection(
                prepare(model, { observationDate: iso })
            );
            const requests = required(model.state.batches[0]);
            const write = requests.find(
                (request) =>
                    "updateCells" in request &&
                    request.updateCells.start.columnIndex === 0
            );
            const dateCell = replacementDateCell(write);

            expect(required(dateCell.userEnteredValue).numberValue).toBeCloseTo(
                Date.parse(`${expectedLocal}Z`) / 86_400_000 + 25_569,
                10
            );
            expect(stored(model, 3, 1).value).toStrictEqual(new Date(iso));
        }
    );

    it("uses row 5000 exactly and rejects row 5001 without mutation", () => {
        expect.hasAssertions();

        const model = fixture();
        model.state.rows.length = 4998;
        for (let index = 2; index < 4998; index += 1)
            model.state.rows[index] = Array.from({ length: 42 }, () => cell());
        model.state.rows.push(
            observation("Other", "last-existing", { 1: "P02" })
        );
        model.state.maxRows = 4999;
        const payload = prepare(model);
        const result = model.api.saveWebObservationCorrection(payload);

        expect(model.state.maxRows).toBe(5000);
        expect(stored(model, 5000, 27).value).toBe(
            result.replacementObservationId
        );

        const next = prepare(
            model,
            { notes: "Next correction" },
            result.replacementObservationId,
            "correction-at-capacity"
        );

        expect(() => model.api.saveWebObservationCorrection(next)).toThrow(
            "HISTORY_CAPACITY"
        );
        expect(model.api.saveWebObservationCorrection(payload)).toStrictEqual(
            result
        );
        expect(model.state.writes).toBe(1);
    });

    it("rejects duplicate identities, reused request namespaces, changed originals and wrong schema", () => {
        expect.hasAssertions();

        const duplicate = fixture([observation(), observation()]);

        expect(() =>
            duplicate.api.getWebCorrectionEntry({ observationId: "original-1" })
        ).toThrow("DUPLICATE_IDENTITY");

        const model = fixture();
        const payload = prepare(model);
        stored(model, 2, 16).value = payload.requestId;

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "REQUEST_CONFLICT"
        );

        stored(model, 2, 16).value = "save-original-1";
        stored(model, 2, 9).value = "Concurrent edit";

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "STALE_PREVIEW"
        );

        stored(model, 1, 42).value = "wrong header";

        expect(() =>
            model.api.getWebCorrectionEntry({ observationId: "original-1" })
        ).toThrow("HISTORY_SCHEMA");
        expect(model.state.writes).toBe(0);
    });

    it("rejects canonical formulas and missing Advanced Sheets before any mutation", () => {
        expect.hasAssertions();

        const model = fixture();
        stored(model, 2, 9).formula = '=IF(TRUE,"saved note","")';

        expect(() =>
            model.api.getWebCorrectionEntry({ observationId: "original-1" })
        ).toThrow("Canonical observation cells must contain values");

        stored(model, 2, 9).formula = "";
        const payload = prepare(model);
        delete model.context["Sheets"];

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "CORRECTION_API_UNAVAILABLE"
        );
        expect(model.state).toMatchObject({ locked: false, writes: 0 });
    });

    it.each([
        { plantId: "P02" },
        { event: "Water" },
        { status: "Removed" },
        { rowIndex: 2 },
        { weight: "=1+2" },
        { weight: "" },
        { weight: -1 },
        { weight: "NaN" },
        { photoUrl: "https://photos.app.goo.gl/example" },
        { observationDate: "2026-09-03T12:00" },
        { observationDate: "2026-02-30T12:00:00Z" },
    ])(
        "rejects unsupported or invalid patches without writes: %j",
        (changes) => {
            expect.hasAssertions();

            const model = fixture();

            expect(() => prepare(model, changes)).toThrow("INVALID_CORRECTION");
            expect(model.state.writes).toBe(0);
        }
    );

    it("rejects malformed RPC scalars, unknown envelope keys, missing reasons and no-op patches", () => {
        expect.hasAssertions();

        const model = fixture();
        const payload = prepare(model);
        const malformed = [
            null,
            [],
            { ...payload, reason: " " },
            { ...payload, table: "History" },
            { ...payload, changes: { notes: null } },
            { ...payload, changes: { notes: {} } },
            { ...payload, changes: { weight: NaN } },
            { ...payload, changes: { notes: "saved note" } },
        ];
        for (const input of malformed)
            expect(() =>
                correctionRpc(
                    model.context,
                    "saveWebObservationCorrection",
                    input
                )
            ).toThrow("INVALID_CORRECTION");

        expect(model.state.writes).toBe(0);
    });

    it.each([
        [
            "Check",
            { condition: "Firm", soilMoisture: "Dry" },
            7,
            "Firm",
        ],
        [
            "Water",
            {
                nutrientAmount: "1 mL/L",
                nutrientProduct: "Legacy exact product",
                nutrientsUsed: "Yes",
            },
            17,
            "Legacy exact product",
        ],
        [
            "Flower",
            { flowerCount: 3, flowerDetails: "Three blooms" },
            21,
            3,
        ],
        [
            "Photo",
            { photoUrl: "https://photos.app.goo.gl/share123" },
            23,
            "https://photos.app.goo.gl/share123",
        ],
        [
            "Pest",
            { pestIssue: "Scale", pestTreatment: "Removed by hand" },
            25,
            "Removed by hand",
        ],
        [
            "Rotation",
            { rotationDegrees: 180 },
            39,
            180,
        ],
        [
            "Note",
            { notes: "" },
            8,
            "",
        ],
        [
            "Other",
            { notes: "Update" },
            8,
            "Update",
        ],
        [
            "Prune",
            { notes: "Two leaves" },
            8,
            "Two leaves",
        ],
        [
            "Clean",
            { notes: "Wiped" },
            8,
            "Wiped",
        ],
    ])(
        "supports %s event-specific fields and legacy blanks",
        (event, changes, column, expectedValue) => {
            expect.hasAssertions();

            const model = fixture([observation(event)]);
            model.api.saveWebObservationCorrection(prepare(model, changes));

            expect(stored(model, 3, column + 1).value).toBe(expectedValue);
            expect(stored(model, 3, 3).value).toBe(event);
        }
    );

    it("hashes reordered patch keys identically while retaining scalar type distinctions", () => {
        expect.hasAssertions();

        const model = fixture();
        const first = prepare(model, { notes: "text", weight: 500 });
        /** @type {[string, string | number][]} */
        const reorderedEntries = [
            ["weight", 500],
            ["notes", "text"],
        ];
        const reordered = {
            ...first,
            changes: Object.fromEntries(reorderedEntries),
        };

        expect(Object.keys(reordered.changes)).not.toStrictEqual(
            Object.keys(first.changes)
        );

        const receipt = model.api.saveWebObservationCorrection(first);

        expect(model.api.saveWebObservationCorrection(reordered)).toStrictEqual(
            receipt
        );
        expect(() =>
            model.api.saveWebObservationCorrection({
                ...first,
                changes: { notes: "text", weight: "500" },
            })
        ).toThrow("REQUEST_CONFLICT");
    });
});

describe("correction validation and durable receipt boundaries", () => {
    it("preserves legacy blank setup and recording metadata while moving a date within setup one", () => {
        expect.hasAssertions();

        const model = fixture([
            observation("Weigh", "original-1", { 9: "", 10: "" }),
            observation("Weigh", "legacy-reading", {
                0: new Date("2026-09-02T12:00:00Z"),
                10: "",
                26: "",
            }),
            observation("Water", "legacy-sibling", {
                0: "",
                9: "",
                29: "save-original-1",
                35: "Removed",
            }),
        ]);
        const entry = model.api.getWebCorrectionEntry({
            observationId: "original-1",
        });

        expect(entry.original.recordedAt).toBe("");
        expect(entry.siblings).toMatchObject([
            {
                observationDate: "",
                observationId: "legacy-sibling",
                recordedAt: "",
            },
        ]);

        const before = structuredClone(model.state.rows.slice(2));
        model.api.saveWebObservationCorrection(
            prepare(model, { observationDate: "2026-09-03T18:00:00Z" })
        );

        expect(stored(model, 5, 1).value).toStrictEqual(
            new Date("2026-09-03T18:00:00Z")
        );
        expect(stored(model, 5, 11).value).toBe("");
        expect(model.state.rows.slice(2, 4)).toStrictEqual(before);
    });

    it.each([NaN, Infinity])(
        "rejects a nonfinite canonical weight %s before reserving a correction",
        (weight) => {
            expect.hasAssertions();

            const model = fixture([
                observation("Weigh", "original-1", { 4: weight }),
            ]);
            const before = structuredClone(model.state.rows);

            expect(() => prepare(model)).toThrow(
                "HISTORY_SCHEMA: Unsupported canonical cell type"
            );
            expect(model.state.rows).toStrictEqual(before);
            expect(model.state.properties.size).toBe(0);
            expect(model.state.batches).toHaveLength(0);
        }
    );

    it("rejects a date move when a related reading has a blank date", () => {
        expect.hasAssertions();

        const model = fixture([
            observation(),
            observation("Weigh", "invalid-related-date", { 0: "" }),
        ]);
        const before = structuredClone(model.state.rows);

        expect(() =>
            prepare(model, { observationDate: "2026-09-03T18:00:00Z" })
        ).toThrow("HISTORY_SCHEMA: A related observation has an invalid date");
        expect(model.state.rows).toStrictEqual(before);
        expect(model.state.batches).toHaveLength(0);
    });

    it("rejects moving into an earlier setup even without an intervening Repot record", () => {
        expect.hasAssertions();

        const model = fixture([
            observation(),
            observation("Weigh", "earlier-setup", {
                0: new Date("2026-09-02T12:00:00Z"),
                10: 1,
            }),
        ]);
        const before = structuredClone(model.state.rows);

        expect(() =>
            prepare(model, { observationDate: "2026-09-02T12:00:00Z" })
        ).toThrow("SETUP_BOUNDARY");
        expect(model.state.rows).toStrictEqual(before);
        expect(model.state.batches).toHaveLength(0);
    });

    it("rejects moving a Repot backward across an already recorded dependent reading", () => {
        expect.hasAssertions();

        const model = fixture([
            observation("Repot"),
            observation("Weigh", "dependent-reading", {
                0: new Date("2026-09-03T12:00:00Z"),
            }),
        ]);
        const before = structuredClone(model.state.rows);

        expect(() =>
            prepare(model, { observationDate: "2026-09-03T11:00:00Z" })
        ).toThrow("SETUP_BOUNDARY");
        expect(model.state.rows).toStrictEqual(before);
        expect(model.state.batches).toHaveLength(0);
    });

    it.each([
        ["2026-09-03T12:00:00Z", "2026-09-03T13:00:00Z"],
        ["2026-09-03T18:00:00Z", "2026-09-03T15:00:00Z"],
    ])(
        "checks a backward Repot move against a reading at %s when moving to %s",
        (readingDate, destination) => {
            expect.hasAssertions();

            const model = fixture([
                observation("Repot"),
                observation("Weigh", "dependent-reading", {
                    0: new Date(readingDate),
                }),
            ]);
            const before = structuredClone(model.state.rows);
            const preview = prepare(model, { observationDate: destination });

            expect(preview.changes).toStrictEqual({
                observationDate: destination,
            });
            expect(model.state.rows).toStrictEqual(before);
            expect(model.state.batches).toHaveLength(0);
        }
    );

    it("accepts a consistent downgrade to estimated provenance without changing saved dimensions", () => {
        expect.hasAssertions();

        const model = fixture([observation("Measure")]);
        model.api.saveWebObservationCorrection(
            prepare(model, {
                measurementMethod: "Estimated visually",
                measurementQuality: "Estimated",
            })
        );

        expect(stored(model, 3, 29).value).toBe("Estimated");
        expect(stored(model, 3, 35).value).toBe("Estimated visually");
        expect(stored(model, 3, 6).value).toBe(12.34567);
        expect(stored(model, 3, 7).value).toBe(4.32109);
    });

    it("changes canonical centimetres without converting through the saved display unit", () => {
        expect.hasAssertions();

        const model = fixture([observation("Measure")]);
        model.api.saveWebObservationCorrection(
            prepare(model, { heightCm: 13.98765 })
        );

        expect([
            stored(model, 3, 6).value,
            stored(model, 3, 7).value,
            stored(model, 3, 37).value,
        ]).toStrictEqual([
            13.98765,
            4.32109,
            "in",
        ]);
        expect([
            stored(model, 3, 29).value,
            stored(model, 3, 35).value,
        ]).toStrictEqual(["Measured", "Ruler"]);
    });

    it.each([
        ["Measure", { heightCm: "", widthCm: "" }],
        ["Measure", { measurementUnit: "feet" }],
        [
            "Measure",
            {
                measurementMethod: "Estimated visually",
                measurementQuality: "Measured",
            },
        ],
        [
            "Measure",
            { measurementMethod: "Other", measurementQuality: "Measured" },
        ],
        ["Measure", { measurementQuality: "Estimated" }],
        ["Measure", { measurementMethod: "Scale" }],
        ["Water", { nutrientsUsed: "Yes" }],
        ["Water", { nutrientProduct: "Product without nutrient choice" }],
        ["Water", { wateringApplication: "Spray everything" }],
        ["Water", { waterAmount: 0 }],
        ["Flower", { flowerCount: 1.5 }],
        ["Flower", { flowerCount: "", flowerDetails: "" }],
        ["Photo", { photoUrl: "https://photos.app.goo.gl.evil.example/share" }],
        ["Photo", { photoUrl: "https://photos.app.goo.gl:443/share" }],
        ["Photo", { photoUrl: "https://photos.app.goo.gl/@user share" }],
        ["Photo", { photoUrl: "" }],
        ["Pest", { pestIssue: "" }],
        ["Repot", { potSize: " " }],
        ["Rotation", { rotationDegrees: 361 }],
        ["Check", { condition: 5 }],
        ["Check", { soilMoisture: "Not a listed option" }],
    ])(
        "rejects invalid %s changes and their relevant dependencies",
        (event, changes) => {
            expect.hasAssertions();

            const model = fixture([observation(event)]);

            expect(() => prepare(model, changes)).toThrow("INVALID_CORRECTION");
            expect(model.state.writes).toBe(0);
        }
    );

    it("preserves legacy blank Water details on a notes edit and explicitly clears nutrients", () => {
        expect.hasAssertions();

        const legacy = fixture([observation("Water")]);
        legacy.api.saveWebObservationCorrection(prepare(legacy));

        expect([
            stored(legacy, 3, 17).value,
            stored(legacy, 3, 41).value,
        ]).toStrictEqual(["", ""]);

        const model = fixture([
            observation("Water", "original-1", {
                16: "Yes",
                17: "Older custom formula",
                18: "0.5 tsp",
            }),
        ]);

        expect(() => prepare(model, { nutrientsUsed: "No" })).toThrow(
            "explicitly cleared"
        );

        model.api.saveWebObservationCorrection(
            prepare(model, {
                nutrientAmount: "",
                nutrientProduct: "",
                nutrientsUsed: "No",
            })
        );

        expect([
            stored(model, 3, 17).value,
            stored(model, 3, 18).value,
            stored(model, 3, 19).value,
        ]).toStrictEqual([
            "No",
            "",
            "",
        ]);
    });

    it("encodes cleared and legacy blank fields as truly empty native cells", () => {
        expect.hasAssertions();

        const model = fixture([
            observation("Water", "original-1", {
                16: "Yes",
                17: "Previous nutrient",
                18: "0.5 tsp",
            }),
        ]);
        model.api.saveWebObservationCorrection(
            prepare(model, {
                nutrientAmount: "",
                nutrientProduct: "",
                nutrientsUsed: "No",
            })
        );
        const rowWrites = required(model.state.batches[0]).filter(
            (request) => "updateCells" in request
        );
        const write = required(
            rowWrites.find(
                (request) => request.updateCells.start.columnIndex === 0
            )
        );
        const cells = required(write.updateCells.rows[0]).values;

        // The native API must clear values, not store literal empty text:
        // COUNTIFS(...,"<>") treats the latter as populated in real Sheets.
        expect(write.updateCells.fields).toBe("userEnteredValue");
        expect([
            cells[7],
            cells[17],
            cells[18],
        ]).toStrictEqual([
            {},
            {},
            {},
        ]);
        expect(cells[16]).toStrictEqual({
            userEnteredValue: { stringValue: "No" },
        });
    });

    it("allows a date move within setup but rejects moving before its Repot or prior setup", () => {
        expect.hasAssertions();

        const model = fixture([
            observation(),
            observation("Repot", "start-setup", {
                0: new Date("2026-09-02T12:00:00Z"),
            }),
            observation("Weigh", "old-setup", {
                0: new Date("2026-09-01T12:00:00Z"),
                10: 1,
            }),
        ]);

        expect(() =>
            prepare(model, { observationDate: "2026-09-02T11:00:00Z" })
        ).toThrow("SETUP_BOUNDARY");
        expect(() =>
            prepare(model, { observationDate: "2026-09-01T11:00:00Z" })
        ).toThrow("SETUP_BOUNDARY");

        const payload = prepare(model, {
            observationDate: "2026-09-03T13:00:00-04:00",
        });
        model.api.saveWebObservationCorrection(payload);

        expect(stored(model, 5, 1).value).toStrictEqual(
            new Date("2026-09-03T17:00:00Z")
        );
    });

    it("invalidates a preview after a same-save sibling changes and excludes no sibling silently", () => {
        expect.hasAssertions();

        const model = fixture([
            observation(),
            observation("Water", "sibling", { 29: "save-original-1" }),
        ]);
        const payload = prepare(model);
        stored(model, 3, 9).value = "Sibling edit";

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "STALE_PREVIEW"
        );
        expect(stored(model, 2, 36).value).toBe("Active");
        expect(model.state.writes).toBe(0);
    });

    it.each([
        [0, "2026-09-03"],
        [9, 4000],
        [10, 1.5],
        [10, 0],
        [4, "1234.5"],
        [1, 123],
        [2, "Invented event"],
        [35, "Pending"],
        [9, new Date(NaN)],
    ])("rejects incorrectly typed original column %s", (column, value) => {
        expect.hasAssertions();

        const model = fixture();
        stored(model, 2, column + 1).value = value;

        expect(() =>
            model.api.getWebCorrectionEntry({ observationId: "original-1" })
        ).toThrow("HISTORY_SCHEMA");
        expect(model.state.writes).toBe(0);
    });

    it("rejects incomplete grids and headers containing formulas", () => {
        expect.hasAssertions();

        const model = fixture();
        model.state.maxColumns = 40;

        expect(() =>
            model.api.getWebCorrectionEntry({ observationId: "original-1" })
        ).toThrow("42-column");

        model.state.maxColumns = 42;
        stored(model, 1, 1).formula = '="Date"';

        expect(() =>
            model.api.getWebCorrectionEntry({ observationId: "original-1" })
        ).toThrow("HISTORY_SCHEMA");
        expect(model.state.writes).toBe(0);
    });

    it("rejects missing identity, malformed envelopes and payload size limits", () => {
        expect.hasAssertions();

        const model = fixture();

        expect(() =>
            model.api.getWebCorrectionEntry({ observationId: "not-present" })
        ).toThrow("NOT_FOUND");
        expect(() =>
            model.api.getWebCorrectionEntry({ observationId: "" })
        ).toThrow("INVALID_CORRECTION");

        const payload = prepare(model);
        const badPayloads = [
            { ...payload, requestId: "short" },
            { ...payload, previewToken: "invalid" },
            { ...payload, baseRevision: "invalid" },
            { ...payload, reason: "x".repeat(2001) },
            { ...payload, changes: { notes: "x".repeat(10_001) } },
            { ...payload, changes: {} },
            { ...payload, changes: { weight: true } },
            { ...payload, observationId: "=unsafe" },
        ];
        for (const input of badPayloads)
            expect(() =>
                correctionRpc(
                    model.context,
                    "saveWebObservationCorrection",
                    input
                )
            ).toThrow("INVALID_CORRECTION");

        expect(model.state.writes).toBe(0);
    });

    it("detects duplicate retry namespaces and damaged durable receipts", () => {
        expect.hasAssertions();

        const model = fixture();
        const payload = prepare(model);
        const receipt = model.api.saveWebObservationCorrection(payload);
        stored(model, 3, 16).value = "externally-changed-request";

        expect(() => model.api.getWebCorrectionStatus(payload)).toThrow(
            "CORRECTION_RECEIPT_INVALID"
        );

        stored(model, 3, 16).value = payload.requestId;
        stored(model, 2, 36).value = "Active";

        expect(() => model.api.getWebCorrectionStatus(payload)).toThrow(
            "retirement is missing"
        );

        stored(model, 2, 36).value = "Removed";
        model.state.rows.push(
            observation("Other", "namespace-duplicate", {
                1: "P02",
                15: payload.requestId,
            })
        );

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "REQUEST_CONFLICT"
        );
        expect(stored(model, 3, 27).value).toBe(
            receipt.replacementObservationId
        );
        expect(model.state.writes).toBe(1);
    });

    it("binds rejected preview tokens durably and saves only a fresh request", () => {
        expect.hasAssertions();

        const model = fixture();
        const payload = prepare(model);

        expect(() =>
            model.api.saveWebObservationCorrection({
                ...payload,
                previewToken: "0".repeat(64),
            })
        ).toThrow("STALE_PREVIEW");

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "REQUEST_CONFLICT"
        );

        const fresh = { ...payload, requestId: "fresh-correction-request-001" };
        const receipt = model.api.saveWebObservationCorrection(fresh);

        expect(() =>
            model.api.getWebCorrectionStatus({
                ...fresh,
                previewToken: "0".repeat(64),
            })
        ).toThrow("REQUEST_CONFLICT");
        expect(() =>
            model.api.getWebCorrectionStatus({
                ...payload,
                baseRevision: "0".repeat(64),
            })
        ).toThrow("REQUEST_CONFLICT");
        expect(() =>
            model.api.getWebCorrectionStatus({
                ...payload,
                observationId: "different-observation",
            })
        ).toThrow("REQUEST_CONFLICT");
        expect(model.api.getWebCorrectionStatus(fresh)).toStrictEqual(receipt);
    });
});

describe("durable pre-batch correction rejection", () => {
    it("terminates a stale sibling preview under lock and cannot revive it after History is restored", () => {
        expect.hasAssertions();

        const model = fixture([
            observation(),
            observation("Water", "sibling", { 29: "save-original-1" }),
        ]);
        const original = structuredClone(model.state.rows);
        const payload = prepare(model, { weight: 432.5 });
        const sibling = prepare(
            model,
            { notes: "Sibling corrected" },
            "sibling",
            "sibling-correction-request"
        );
        model.api.saveWebObservationCorrection(sibling);

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "STALE_PREVIEW"
        );

        const rejected = model.api.getWebCorrectionStatus(payload);

        expect(rejected).toMatchObject({
            code: "STALE_PREVIEW",
            observationId: payload.observationId,
            requestId: payload.requestId,
            status: "rejected",
        });
        expect(stored(model, 2, 36).value).toBe("Active");

        const property = required(
            model.state.properties.get(
                `gardenLoggerCorrectionOperationV1:${payload.requestId}`
            )
        );

        expect(JSON.parse(property)).toStrictEqual(structuredClone(rejected));

        model.state.rows = original;

        expect(model.api.getWebCorrectionStatus(payload)).toStrictEqual(
            rejected
        );

        const reloaded = fixture(original.slice(1));
        reloaded.state.properties = new Map(model.state.properties);

        expect(() =>
            reloaded.api.saveWebObservationCorrection(payload)
        ).toThrow("STALE_PREVIEW");
        expect(reloaded.state.batches).toHaveLength(0);

        for (const changed of [
            { ...payload, changes: { weight: 433 } },
            { ...payload, previewToken: "0".repeat(64) },
            { ...payload, reason: "different" },
        ]) {
            expect(() =>
                model.api.saveWebObservationCorrection(changed)
            ).toThrow("REQUEST_CONFLICT");
            expect(() => model.api.getWebCorrectionStatus(changed)).toThrow(
                "REQUEST_CONFLICT"
            );
        }

        expect(model.state.writes).toBe(1);
        expect(model.state.acquisitions).toBe(model.state.releases);
    });

    it("does not terminate an attempted batch even when a later retry fails deterministic validation", () => {
        expect.hasAssertions();

        const model = fixture();
        const payload = prepare(model);
        model.state.fault = "before";

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "before commit"
        );

        stored(model, 2, 9).value = "Changed after attempted batch";

        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            "STALE_PREVIEW"
        );
        expect(model.api.getWebCorrectionStatus(payload).status).toBe(
            "missing"
        );

        const property = required(
            model.state.properties.get(
                `gardenLoggerCorrectionOperationV1:${payload.requestId}`
            )
        );

        expect(JSON.parse(property)).toMatchObject({ status: "attempted" });

        stored(model, 2, 9).value = "saved note";
        model.state.fault = "";

        expect(model.api.saveWebObservationCorrection(payload).status).toBe(
            "saved"
        );
        expect(model.state.writes).toBe(1);
    });

    it.each(["throw", "silent"])(
        "retains recovery with zero batch calls if property persistence fails: %s",
        (fault) => {
            expect.hasAssertions();

            const model = fixture();
            const payload = prepare(model);
            const original = structuredClone(model.state.rows);
            model.state.propertyFault = fault;

            expect(() =>
                model.api.saveWebObservationCorrection(payload)
            ).toThrow(/CORRECTION_STORAGE|Property quota exceeded/v);
            expect(model.api.getWebCorrectionStatus(payload).status).toBe(
                "missing"
            );

            stored(model, 2, 9).value = "Changed";

            expect(() =>
                model.api.saveWebObservationCorrection(payload)
            ).toThrow(/CORRECTION_STORAGE|Property quota exceeded/v);
            expect(model.api.getWebCorrectionStatus(payload).status).toBe(
                "missing"
            );
            expect(model.state.batches).toHaveLength(0);

            model.state.rows = original;
            model.state.propertyFault = "";

            expect(model.api.saveWebObservationCorrection(payload).status).toBe(
                "saved"
            );
        }
    );

    it("uses History saved receipts before even unreadable operation properties", () => {
        expect.hasAssertions();

        const model = fixture();
        const payload = prepare(model);
        const receipt = model.api.saveWebObservationCorrection(payload);
        model.state.properties.set(
            `gardenLoggerCorrectionOperationV1:${payload.requestId}`,
            "broken json"
        );

        expect(model.api.getWebCorrectionStatus(payload)).toStrictEqual(
            receipt
        );
        expect(model.api.saveWebObservationCorrection(payload)).toStrictEqual(
            receipt
        );
        expect(model.state.writes).toBe(1);
    });

    it.each([
        "NOT_FOUND",
        "REMOVED_ORIGINAL",
        "HISTORY_SCHEMA",
        "INVALID_CORRECTION",
        "SETUP_BOUNDARY",
        "HISTORY_CAPACITY",
    ])("records deterministic %s only during save", (code) => {
        expect.hasAssertions();

        const model = fixture();
        const payload = prepare(model);
        switch (code) {
            case "HISTORY_CAPACITY": {
                while (model.state.rows.length < 4999)
                    model.state.rows.push(
                        Array.from({ length: 42 }, () => cell())
                    );
                model.state.rows.push(
                    observation("Other", "capacity-end", { 1: "P02" })
                );
                model.state.maxRows = 5000;
                break;
            }
            case "HISTORY_SCHEMA": {
                stored(model, 2, 5).value = "invalid weight";
                break;
            }
            case "INVALID_CORRECTION": {
                payload.changes = { weight: -1 };
                break;
            }
            case "NOT_FOUND": {
                model.state.rows.splice(1);
                break;
            }
            case "REMOVED_ORIGINAL": {
                stored(model, 2, 36).value = "Removed";
                break;
            }
            case "SETUP_BOUNDARY": {
                model.state.rows.push(
                    observation("Repot", "boundary", {
                        0: new Date("2026-09-01T16:00:00Z"),
                    })
                );
                payload.changes = { observationDate: "2026-08-31T16:00:00Z" };
                break;
            }
            default: {
                throw new Error("Unexpected terminal code");
            }
        }

        expect(model.api.getWebCorrectionStatus(payload).status).toBe(
            "missing"
        );
        expect(model.state.properties.size).toBe(0);
        expect(() => model.api.saveWebObservationCorrection(payload)).toThrow(
            code
        );
        expect(model.api.getWebCorrectionStatus(payload)).toMatchObject({
            code,
            status: "rejected",
        });
        expect(model.state.batches).toHaveLength(0);
    });
});

describe("menu exclusion identity recheck", () => {
    it("excludes multiple confirmed identities atomically and creates missing audit reasons", () => {
        expect.hasAssertions();

        const model = fixture([
            observation("Weigh", "original-1", { 31: "" }),
            observation("Water", "original-2", { 31: "" }),
            observation("Check", "untouched"),
        ]);
        const before = structuredClone(model.state.rows);
        model.state.lastSelectedRow = 3;
        model.api.removeSelectedHistoryObservations();

        for (const rowNumber of [2, 3]) {
            const reason = stored(model, rowNumber, 32).value;

            expect(reason).toMatch(
                /^Excluded from active analysis through the Garden logger menu on /v
            );

            required(required(before[rowNumber - 1])[31]).value = reason;
            required(required(before[rowNumber - 1])[35]).value = "Removed";
        }

        expect(model.state.rows).toStrictEqual(before);
        expect(model.state).toMatchObject({
            acquisitions: 1,
            alerts: 1,
            releases: 1,
            writes: 1,
        });
        expect(model.state.batches).toHaveLength(1);
    });

    it("resolves selection by ID after an alert-time sort and appends the old reason", () => {
        expect.hasAssertions();

        const model = fixture([
            observation(),
            observation("Other", "unselected", { 1: "P02" }),
        ]);
        const untouched = structuredClone(model.state.rows[2]);
        const selected = structuredClone(required(model.state.rows[1]));
        model.state.onAlert = () => {
            model.state.rows.splice(
                1,
                2,
                required(model.state.rows[2]),
                required(model.state.rows[1])
            );
        };
        model.api.removeSelectedHistoryObservations();

        expect(model.state.rows[1]).toStrictEqual(untouched);
        expect(stored(model, 3, 32).value).toContain(
            "Original audit reason remains exact. \nExcluded"
        );
        expect(stored(model, 3, 36).value).toBe("Removed");

        required(selected[31]).value = stored(model, 3, 32).value;
        required(selected[35]).value = "Removed";

        expect(model.state.rows[2]).toStrictEqual(selected);
        expect(model.state).toMatchObject({
            acquisitions: 1,
            alerts: 1,
            releases: 1,
            writes: 1,
        });
    });

    it("rejects exclusion if a correction commits during the unlocked confirmation", () => {
        expect.hasAssertions();

        const model = fixture();
        const payload = prepare(model);
        model.state.onAlert = () => {
            model.api.saveWebObservationCorrection(payload);
        };

        expect(() => {
            model.api.removeSelectedHistoryObservations();
        }).toThrow("STALE_PREVIEW");
        expect(stored(model, 3, 36).value).toBe("Active");
        expect(stored(model, 2, 32).value).toBe(
            "Original audit reason remains exact. "
        );
        expect(model.state.writes).toBe(1);
    });

    it("does not write when confirmation is cancelled or selection is invalid", () => {
        expect.hasAssertions();

        const model = fixture();
        model.state.confirmed = false;
        model.api.removeSelectedHistoryObservations();
        model.state.hasSelection = false;
        model.api.removeSelectedHistoryObservations();
        model.state.hasSelection = true;
        model.state.sheetName = "Plant tracker";
        model.api.removeSelectedHistoryObservations();
        model.state.sheetName = "History";
        model.state.firstSelectedRow = 1;
        model.state.lastSelectedRow = 1;
        model.api.removeSelectedHistoryObservations();

        expect(model.state).toMatchObject({
            acquisitions: 0,
            alerts: 1,
            writes: 0,
        });
    });

    it("bounds removal previews and leaves cancelled multi-row selections intact", () => {
        expect.hasAssertions();

        const model = fixture(
            Array.from({ length: 9 }, (_, index) =>
                observation("Weigh", `original-${index + 1}`, {
                    4: 400 + index,
                })
            )
        );
        const before = structuredClone(model.state.rows);
        model.state.lastSelectedRow = 102;

        expect(() => {
            model.api.removeSelectedHistoryObservations();
        }).toThrow(/no more than 100/iv);

        model.state.lastSelectedRow = 10;
        model.state.confirmed = false;
        model.api.removeSelectedHistoryObservations();

        expect(model.state.alertMessages[0]).toContain(
            "1 more selected observation"
        );
        expect(model.state.rows).toStrictEqual(before);
        expect(model.state.writes).toBe(0);
    });

    it("does not confirm or write an empty or already excluded selection", () => {
        expect.hasAssertions();

        for (const model of [
            fixture([]),
            fixture([observation("Weigh", "removed", { 35: "Removed" })]),
        ]) {
            model.api.removeSelectedHistoryObservations();

            expect(model.state).toMatchObject({
                acquisitions: 0,
                alerts: 0,
                writes: 0,
            });
        }
    });
});
