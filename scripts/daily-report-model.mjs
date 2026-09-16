/** @typedef {import("../types/daily-report.d.ts").DailyReport} DailyReport */
/** @typedef {import("../types/daily-report.d.ts").ReportPot} ReportPot */
/** @typedef {import("../types/daily-report.d.ts").ReportWeight} ReportWeight */

const millisecondsPerDay = 86_400_000;
const actions = new Set([
    "check",
    "none",
    "reference",
    "unresolved",
    "water",
    "weigh",
]);
const plateauStates = new Set([
    "confirmed",
    "not-supported",
    "unavailable",
]);

/** @param {ReportPot} left @param {ReportPot} right */
function compareLabels(left, right) {
    const leftGroup = left.label.startsWith("#") ? 1 : 0;
    const rightGroup = right.label.startsWith("#") ? 1 : 0;
    return (
        leftGroup - rightGroup ||
        left.label.localeCompare(right.label, "en", { numeric: true })
    );
}
/** @param {string} value */
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
/** @param {unknown} value @param {string} context */
function finiteNumber(value, context) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
        throw new TypeError(`${context} must be a nonnegative finite number.`);
    return value;
}
/** @param {unknown} value @param {string} [context] */
function instant(value, context = "Timestamp") {
    const source = textValue(value, context);
    try {
        return Temporal.Instant.from(source).epochMilliseconds;
    } catch (error) {
        throw new TypeError(
            `${context} must be a real ISO timestamp with a time-zone offset.`,
            { cause: error }
        );
    }
}
/** @param {unknown} value @param {string} context @returns {unknown[]} */
function list(value, context) {
    if (!Array.isArray(value))
        throw new TypeError(`${context} must be a list.`);
    return value;
}
/** @param {string} value @param {boolean} [includeTime] */
function localDate(value, includeTime = false) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "America/New_York",
        ...(includeTime
            ? { hour: "numeric", minute: "2-digit" }
            : { weekday: "long" }),
    });
    return formatter.format(
        instant(value.length === 10 ? `${value}T12:00:00-04:00` : value)
    );
}
/** @param {number} value @param {number} [digits] */
function number(value, digits = 1) {
    const formatter = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: digits,
    });
    return formatter.format(value);
}
/**
 * @param {unknown} value @param {string} context @returns {Record<string,
 *   unknown>}
 */
function object(value, context) {
    if (value === null || typeof value !== "object" || Array.isArray(value))
        throw new TypeError(`${context} must be an object.`);
    return /** @type {Record<string, unknown>} */ (value);
}
/** @param {number} value @param {number} [digits] */
function signed(value, digits = 1) {
    const rounded = Number(value.toFixed(digits));
    if (rounded === 0 && digits === 2) return "0.00";
    return (
        (rounded > 0 ? "+" : rounded < 0 ? "−" : "") +
        number(Math.abs(rounded), digits)
    );
}
/** @param {unknown} value @param {string} context @param {boolean} [allowEmpty] */
function textValue(value, context, allowEmpty = false) {
    if (typeof value !== "string" || (!allowEmpty && value.trim() === ""))
        throw new TypeError(`${context} must be text.`);
    return value;
}
/** @param {Record<string, unknown>} pot @param {Set<unknown>} mixIds */
function validateAction(pot, mixIds) {
    const action = textValue(pot["action"], "action");
    const reason = textValue(pot["reason"], "reason");
    if (!actions.has(action) || !plateauStates.has(String(pot["plateau"])))
        throw new TypeError("Invalid action or plateau status.");
    if (action === "water" && pot["plateau"] !== "confirmed")
        throw new TypeError("Watering requires a confirmed plateau.");
    if (action === "reference") {
        if (reason !== "reference" || pot["plateau"] === "confirmed")
            throw new TypeError(
                "Reference-only actions need a reached reference without a confirmed plateau."
            );
        validateReachedReference(pot);
    }
    if (action !== "water") {
        if (pot["mixId"] !== null)
            throw new TypeError("Only watering actions may prescribe a mix.");
        if (action === "weigh" && !["flexible", "priority"].includes(reason))
            throw new TypeError("Weigh-ins must identify their priority.");
        return;
    }
    if (!mixIds.has(pot["mixId"]))
        throw new TypeError("Every watering pot needs one mix.");
    if (!["both", "plateau"].includes(reason))
        throw new TypeError("Watering needs a plateau or both reason.");
    if (reason === "both") validateReachedReference(pot);
}
/**
 * @param {unknown} coverage @param {number | null} total @param {number} count
 * @param {number} unresolved
 */
function validateCoverage(coverage, total, count, unresolved) {
    if (total !== null && count > total)
        throw new TypeError("Report contains more pots than the inventory.");
    if (
        coverage === "complete" &&
        (total === null || count !== total || unresolved > 0)
    )
        throw new TypeError(
            "Complete coverage must account for every pot with a resolved action."
        );
    if (coverage === "unavailable" && unresolved !== count)
        throw new TypeError(
            "Unavailable data cannot produce care or no-action conclusions."
        );
}
/** @param {Record<string, unknown>} pot @param {number | null} readAt */
function validateMeasurements(pot, readAt) {
    const latest = weight(pot["latest"], "latest");
    const previous = weight(pot["previous"], "previous");
    const start =
        pot["cycleStartedAt"] === null
            ? null
            : instant(pot["cycleStartedAt"], "cycleStartedAt");
    if (pot["dryReferenceGrams"] !== null)
        finiteNumber(pot["dryReferenceGrams"], "dryReferenceGrams");
    if (latest !== null && (readAt === null || instant(latest.at) > readAt))
        throw new TypeError("A weight cannot be newer than its source read.");
    if (start !== null && (readAt === null || start > readAt))
        throw new TypeError("A cycle cannot start after its source read.");
    if (
        previous !== null &&
        (latest === null ||
            start === null ||
            instant(previous.at) >= instant(latest.at) ||
            instant(previous.at) < start)
    )
        throw new TypeError(
            "Last-two weights must be chronological and within the current cycle."
        );
    validatePlateau(pot, start, latest);
    if (
        ["reference", "water"].includes(String(pot["action"])) &&
        (latest === null || start === null || instant(latest.at) < start)
    )
        throw new TypeError(
            "Watering and reference evidence must belong to the current cycle."
        );
}
/** @param {unknown} input */
function validateMixes(input) {
    const ids = new Set();
    const entries = list(input, "mixes");
    for (const rawMix of entries) {
        const mix = object(rawMix, "Mix");
        const id = textValue(mix["id"], "mix.id");
        if (!/^[a-z][\-0-9a-z]*$/v.test(id) || ids.has(id))
            throw new TypeError("Mix IDs must be unique safe slugs.");
        ids.add(id);
        for (const key of [
            "name",
            "product",
            "condition",
            "rationale",
        ])
            textValue(mix[key], `mix.${key}`, key === "condition");
        if (
            mix["gramsPerGallon"] !== null &&
            finiteNumber(mix["gramsPerGallon"], "gramsPerGallon") === 0
        )
            throw new TypeError(
                "A nutrient dose must be positive; use null for plain water."
            );
    }
    return ids;
}
/**
 * @param {Record<string, unknown>} pot @param {number | null} start @param
 *   {ReportWeight | null} latest
 */
function validatePlateau(pot, start, latest) {
    const tail = list(pot["plateauPoints"], "plateauPoints").map((point) =>
        weight(point, "plateau point")
    );
    let preceding = -Infinity;
    for (const point of tail) {
        if (point === null || start === null)
            throw new TypeError("Plateau points need a current cycle.");
        const at = instant(point.at);
        if (at < start || at <= preceding)
            throw new TypeError(
                "Plateau points must be chronological current-cycle measurements."
            );
        preceding = at;
    }
    if (
        tail.length > 0 &&
        (latest === null ||
            tail.at(-1)?.at !== latest.at ||
            tail.at(-1)?.grams !== latest.grams)
    )
        throw new TypeError("Plateau tail must finish at the latest weight.");
    if (pot["plateau"] === "confirmed" && tail.length !== 4)
        throw new TypeError(
            "Confirmed plateau needs the four-point evidence tail."
        );
}
/**
 * @param {unknown} input @param {Set<unknown>} mixIds @param {number | null}
 *   readAt
 */
function validatePots(input, mixIds, readAt) {
    const pots = list(input, "pots");
    const ids = new Set();
    const labels = new Set();
    for (const rawPot of pots) {
        const pot = object(rawPot, "Pot");
        const id = textValue(pot["id"], "pot.id");
        const label = textValue(pot["label"], "pot.label");
        if (!/^P\d{2,3}$/v.test(id) || ids.has(id) || labels.has(label))
            throw new TypeError("Pot IDs and labels must be unique.");
        if (!/^(?:[A-Z]\d{1,2}|#\d{1,2})$/v.test(label))
            throw new TypeError("Invalid physical pot label.");
        ids.add(id);
        labels.add(label);
        for (const key of [
            "name",
            "recommendation",
            "metricsNote",
        ])
            textValue(pot[key], `pot.${key}`, key === "metricsNote");
        validateAction(pot, mixIds);
        validateMeasurements(pot, readAt);
    }
    return pots;
}
/** @param {Record<string, unknown>} pot */
function validateReachedReference(pot) {
    const latest = weight(pot["latest"], "latest");
    if (
        latest === null ||
        pot["dryReferenceGrams"] === null ||
        latest.grams >
            finiteNumber(pot["dryReferenceGrams"], "dryReferenceGrams")
    )
        throw new TypeError(
            "A reference reason requires reaching the dry reference."
        );
}

/** @param {unknown} input @returns {DailyReport} */
function validateReport(input) {
    const report = object(input, "Report");
    const date = textValue(report["date"], "date");
    if (
        !/^\d{4}-\d{2}-\d{2}$/v.test(date) ||
        Temporal.PlainDate.from(date).toString() !== date
    )
        throw new TypeError("Report date must be a real YYYY-MM-DD date.");
    if (report["version"] !== 2 || report["timeZone"] !== "America/New_York")
        throw new TypeError("Unsupported daily-report version or time zone.");
    const generated = instant(report["generatedAt"], "generatedAt");
    const coverage = report["coverage"];
    if (
        ![
            "complete",
            "partial",
            "unavailable",
        ].includes(String(coverage))
    )
        throw new TypeError("Invalid coverage.");
    const readAt =
        report["sourceReadAt"] === null
            ? null
            : instant(report["sourceReadAt"], "sourceReadAt");
    if (coverage !== "unavailable" && readAt === null)
        throw new TypeError(
            "A reviewed report needs its actual source-read time."
        );
    if (readAt !== null && readAt > generated)
        throw new TypeError("Source read cannot be after report generation.");
    const total =
        report["totalPots"] === null
            ? null
            : finiteNumber(report["totalPots"], "totalPots");
    if (total !== null && !Number.isSafeInteger(total))
        throw new TypeError("Inventory total must be an integer.");
    textValue(report["summary"], "summary");
    if (report["aiRecommendation"] !== undefined) {
        const assessment = list(report["aiRecommendation"], "aiRecommendation");
        if (assessment.length === 0)
            throw new TypeError(
                "AI recommendation must contain an assessment."
            );
        for (const line of assessment)
            textValue(line, "AI recommendation line");
    }
    const notes = list(report["notes"], "notes");
    for (const note of notes) textValue(note, "note");
    const pots = validatePots(
        report["pots"],
        validateMixes(report["mixes"]),
        readAt
    );
    const unresolved = pots.filter(
        (pot) => object(pot, "Pot")["action"] === "unresolved"
    ).length;
    validateCoverage(coverage, total, pots.length, unresolved);
    return /** @type {DailyReport} */ (input);
}
/** @param {unknown} value @param {string} context @returns {ReportWeight | null} */
function weight(value, context) {
    if (value === null) return null;
    const entry = object(value, context);
    const grams = finiteNumber(entry["grams"], `${context}.grams`);
    if (grams === 0)
        throw new TypeError(`${context} must be a positive measured weight.`);
    instant(entry["at"], `${context}.at`);
    return { at: textValue(entry["at"], `${context}.at`), grams };
}
/** @param {ReportPot} pot */
function weightChange(pot) {
    if (pot.latest === null || pot.previous === null) return null;
    const days =
        (instant(pot.latest.at) - instant(pot.previous.at)) /
        millisecondsPerDay;
    const delta = pot.latest.grams - pot.previous.grams;
    return { days, delta, perDay: delta / days };
}
export {
    compareLabels,
    escapeHtml,
    instant,
    localDate,
    number,
    signed,
    validateReport,
    weightChange,
};
