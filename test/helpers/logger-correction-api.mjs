/**
 * Evaluate a named real GS function, including malformed inbound RPC tests.
 *
 * @param {unknown} context
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionRpcName} name
 * @param {unknown} [payload]
 *
 * @returns {unknown}
 */
export function correctionRpc(context, name, payload) {
    if (!isRecord(context) || typeof context[name] !== "function") {
        throw new TypeError(`Missing correction API: ${name}`);
    }
    const callable = /** @type {(input: unknown) => unknown} */ (context[name]);
    return callable(payload);
}

/**
 * Validate every exported function and every DTO at the VM boundary.
 *
 * @param {unknown} context
 *
 * @returns {import("../logger-correction-fixtures.d.ts").LoggerCorrectionApi}
 */
export function loggerCorrectionApi(context) {
    /**
     * @type {Record<
     *     import("../logger-correction-fixtures.d.ts").CorrectionRpcName,
     *     null
     * >}
     */
    const functions = {
        getWebCorrectionEntry: null,
        getWebCorrectionStatus: null,
        previewWebObservationCorrection: null,
        removeSelectedHistoryObservations: null,
        saveWebObservationCorrection: null,
    };
    for (const name of Object.keys(functions)) {
        if (!isRecord(context) || typeof context[name] !== "function") {
            throw new TypeError(`Missing correction API: ${name}`);
        }
    }
    return {
        getWebCorrectionEntry(request) {
            const result = correctionRpc(
                context,
                "getWebCorrectionEntry",
                request
            );
            if (!isContext(result))
                throw new TypeError("Invalid correction entry DTO");
            return result;
        },
        getWebCorrectionStatus(request) {
            const result = correctionRpc(
                context,
                "getWebCorrectionStatus",
                request
            );
            if (!isStatus(result))
                throw new TypeError("Invalid correction status DTO");
            return result;
        },
        previewWebObservationCorrection(request) {
            const result = correctionRpc(
                context,
                "previewWebObservationCorrection",
                request
            );
            if (!isPreview(result))
                throw new TypeError("Invalid correction preview DTO");
            return result;
        },
        removeSelectedHistoryObservations() {
            const result = correctionRpc(
                context,
                "removeSelectedHistoryObservations"
            );
            if (result !== undefined)
                throw new TypeError("Unexpected exclusion result");
        },
        saveWebObservationCorrection(request) {
            const result = correctionRpc(
                context,
                "saveWebObservationCorrection",
                request
            );
            if (!isStatus(result) || result.status !== "saved")
                throw new TypeError("Invalid correction receipt DTO");
            return result;
        },
    };
}

/**
 * @param {unknown} value @returns {value is
 *   import("../logger-correction-fixtures.d.ts").CorrectionContext}
 */
function isContext(value) {
    return (
        isRecord(value) &&
        isEntry(value["original"]) &&
        [
            "baseRevision",
            "contextDigest",
            "timeZone",
        ].every((key) => typeof value[key] === "string") &&
        Array.isArray(value["siblings"]) &&
        value["siblings"].every((entry) => isEntry(entry)) &&
        Array.isArray(value["fields"]) &&
        value["fields"].every((field) => isField(field)) &&
        isStrings(value["notices"])
    );
}

/**
 * @param {unknown} value @returns {value is
 *   import("../logger-correction-fixtures.d.ts").CorrectionEntry}
 */
function isEntry(value) {
    return (
        isRecord(value) &&
        [
            "observationId",
            "plantId",
            "event",
            "label",
            "observationDate",
            "recordedAt",
            "requestId",
            "saveGroupId",
            "correctsObservationId",
            "correctionReason",
            "recordStatus",
        ].every((key) => typeof value[key] === "string") &&
        isScalar(value["potSetup"]) &&
        isRecord(value["values"]) &&
        Object.values(value["values"]).every((scalar) => isScalar(scalar))
    );
}

/**
 * @param {unknown} value @returns {value is
 *   import("../logger-correction-fixtures.d.ts").CorrectionField}
 */
function isField(value) {
    return (
        isRecord(value) &&
        [
            "key",
            "label",
            "unit",
        ].every((key) => typeof value[key] === "string") &&
        typeof value["type"] === "string" &&
        [
            "datetime",
            "number",
            "select",
            "text",
            "url",
        ].includes(value["type"]) &&
        typeof value["required"] === "boolean" &&
        isStrings(value["options"])
    );
}

/**
 * @param {unknown} value @returns {value is
 *   import("../logger-correction-fixtures.d.ts").CorrectionPreview}
 */
function isPreview(value) {
    if (!isContext(value)) return false;
    const record = /** @type {unknown} */ (value);
    return (
        isRecord(record) &&
        isEntry(record["replacement"]) &&
        typeof record["payloadDigest"] === "string" &&
        typeof record["previewToken"] === "string" &&
        Array.isArray(record["differences"]) &&
        record["differences"].every(
            (difference) =>
                isRecord(difference) &&
                typeof difference["key"] === "string" &&
                typeof difference["label"] === "string" &&
                isScalar(difference["before"]) &&
                isScalar(difference["after"])
        )
    );
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is string | number} */
function isScalar(value) {
    return (
        typeof value === "string" ||
        (typeof value === "number" && Number.isFinite(value))
    );
}

/**
 * @param {unknown} value @returns {value is
 *   import("../logger-correction-fixtures.d.ts").CorrectionMissing |
 *   import("../logger-correction-fixtures.d.ts").CorrectionRejected |
 *   import("../logger-correction-fixtures.d.ts").CorrectionReceipt}
 */
function isStatus(value) {
    return (
        isRecord(value) &&
        [
            "requestId",
            "observationId",
            "payloadDigest",
            "operationDigest",
        ].every((key) => typeof value[key] === "string") &&
        (value["status"] === "missing" ||
            (value["status"] === "rejected" &&
                typeof value["code"] === "string" &&
                [
                    "HISTORY_CAPACITY",
                    "HISTORY_SCHEMA",
                    "INVALID_CORRECTION",
                    "NOT_FOUND",
                    "REMOVED_ORIGINAL",
                    "SETUP_BOUNDARY",
                    "STALE_PREVIEW",
                ].includes(value["code"]) &&
                typeof value["message"] === "string" &&
                value["message"].length > 0) ||
            (value["status"] === "saved" &&
                typeof value["originalObservationId"] === "string" &&
                typeof value["replacementObservationId"] === "string"))
    );
}

/** @param {unknown} value @returns {value is string[]} */
function isStrings(value) {
    return (
        Array.isArray(value) && value.every((item) => typeof item === "string")
    );
}
