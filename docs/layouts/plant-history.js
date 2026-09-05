import {
    renderActivityChart,
    renderBarChart,
    renderIntervalChart,
    renderLineChart,
} from "./plant-charts.js";
import {
    comparePlantsByNaturalLabel,
    daysSince,
    displayValue,
    formatDate,
    formatMeasurement,
    formatSigned,
    getRequiredElement,
    historyPageUrl,
    installThemeToggle,
    isActiveHistoryEvent,
    loadCollectionData,
    numericValue,
    parseDate,
    plantLabel,
    sheetUrls,
} from "./plant-tracker-data.js";

/** @typedef {Awaited<ReturnType<typeof loadCollectionData>>["plants"][number]} CollectionPlant */
/** @typedef {import("./plant-tracker-data.js").HistoryEvent} HistoryEvent */
/** @typedef {CollectionPlant["summary"]} PlantSummary */
/** @typedef {Record<string, readonly (readonly [string, string])[]>} FieldGuideProfiles */

/**
 * @param {unknown} value
 *
 * @returns {value is readonly [string, string]}
 */
function isProfileLink(value) {
    return (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === "string" &&
        typeof value[1] === "string"
    );
}

/**
 * @param {unknown} value
 *
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loadFieldGuideProfiles() {
    const response = await fetch(
        new URL("plant-profile-data.json", import.meta.url)
    );
    if (!response.ok) {
        throw new Error(
            `The field-guide profile map returned HTTP ${response.status}.`
        );
    }
    /** @type {unknown} */
    const data = await response.json();
    if (!isRecord(data)) throw new Error("Invalid field-guide profile map.");
    /** @type {FieldGuideProfiles} */
    const profilesById = {};
    for (const [id, profiles] of Object.entries(data)) {
        if (
            !Array.isArray(profiles) ||
            profiles.some((profile) => !isProfileLink(profile))
        ) {
            throw new Error(`Invalid field-guide profiles for ${id}.`);
        }
        profilesById[id] = profiles;
    }
    return profilesById;
}

const HISTORY_HEADERS = Object.freeze([
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
]);

const searchParameters = new URLSearchParams(location.search);
const requestedId = searchParameters.get("id");
const tableBody = getRequiredElement(
    "#history-table tbody",
    HTMLTableSectionElement
);
const searchInput = getRequiredElement("#history-search", HTMLInputElement);
const eventFilter = getRequiredElement(
    "#history-event-filter",
    HTMLSelectElement
);
const chartRange = getRequiredElement("#chart-range", HTMLSelectElement);

/**
 * @type {{
 *     currentPlant: CollectionPlant | null;
 *     fieldGuideProfiles: Readonly<FieldGuideProfiles>;
 *     historySort: {
 *         direction: "ascending" | "descending";
 *         key: string;
 *         type: string;
 *     };
 * }}
 */
const state = {
    currentPlant: null,
    fieldGuideProfiles: Object.freeze({}),
    historySort: { direction: "descending", key: "Date", type: "date" },
};

/**
 * @param {string} eventName
 */
function activityClassName(eventName) {
    const slug = eventName
        .trim()
        .toLowerCase()
        .replaceAll(/[^0-9a-z]+/gv, "-")
        .replaceAll(/^-|-$/gv, "");
    return `activity-${slug || "other"}`;
}

/** @param {HistoryEvent} event */
function conditionValue(event) {
    return [event["Plant condition"], event["Soil moisture"]]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
        .join(" · ");
}

/** @param {HistoryEvent[]} events */
function configureEventFilter(events) {
    const previous = eventFilter.value;
    const names = [
        ...new Set(events.map((event) => String(event["Event"] ?? "").trim())),
    ]
        .filter(Boolean)
        .toSorted((left, right) => left.localeCompare(right));
    eventFilter.replaceChildren(
        new Option("All events", "all"),
        ...names.map((name) => new Option(name, name.toLowerCase()))
    );
    eventFilter.value = [...eventFilter.options].some(
        (option) => option.value === previous
    )
        ? previous
        : "all";
}

/**
 * @param {CollectionPlant[]} plants
 * @param {number} index
 */
function configurePager(plants, index) {
    const previous = getRequiredElement("#previous-plant", HTMLAnchorElement);
    const next = getRequiredElement("#next-plant", HTMLAnchorElement);
    const previousPlant = plants[index - 1];
    const nextPlant = plants[index + 1];
    if (previousPlant) {
        previous.href = historyPageUrl(previousPlant["Plant ID"]);
        previous.textContent = `← ${plantLabel(previousPlant)} · ${previousPlant["Plant / planter"]}`;
    } else {
        previous.hidden = true;
    }
    if (nextPlant) {
        next.href = historyPageUrl(nextPlant["Plant ID"]);
        next.textContent = `${plantLabel(nextPlant)} · ${nextPlant["Plant / planter"]} →`;
    } else {
        next.hidden = true;
    }
}

/** @param {string | number | undefined} value */
function csvCell(value) {
    const text = String(value ?? "");
    return /[\n\r",]/v.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * @param {number} count
 */
function entryLabel(count) {
    return `${count} ${count === 1 ? "entry" : "entries"}`;
}

/** @param {HistoryEvent} event */
function eventDetails(event) {
    /** @type {(string | { href: string; label: string })[]} */
    const parts = eventSpecificDetails(event);
    const measurementUnit = String(event["Measurement unit"] ?? "")
        .trim()
        .toLowerCase();
    const height = displayValue(event["Height (in)"]);
    const width = displayValue(event["Width (in)"]);
    if (measurementUnit === "in" && (height !== "" || width !== "")) {
        const originals = [
            height ? `H ${height} in` : "",
            width ? `W ${width} in` : "",
        ].filter(Boolean);
        parts.push(`Original measurement: ${originals.join(" · ")}`);
    }
    /** @type {readonly (readonly [string, string])[]} */
    const metadata = [
        ["Measurement method", "Method"],
        ["Observation quality", "Quality"],
        ["Correction reason", "Correction"],
    ];
    for (const [key, label] of metadata) {
        const value = displayValue(event[key]);
        if (value) parts.push(`${label}: ${value}`);
    }
    const recordStatus = displayValue(event["Record status"]);
    if (recordStatus && recordStatus.trim().toLowerCase() !== "active")
        parts.push(`Record status: ${recordStatus}`);
    const photoUrl = displayValue(event["Photo URL"]);
    if (photoUrl) parts.push({ href: photoUrl, label: "Open Google Photos ↗" });
    return parts;
}

/** @param {HistoryEvent} event */
function eventDetailsCell(event) {
    const cell = document.createElement("td");
    cell.className = "condition-cell event-details-cell";
    const details = eventDetails(event);
    if (details.length === 0) {
        cell.textContent = "—";
        return cell;
    }
    for (const [index, detail] of details.entries()) {
        if (index) cell.append(document.createElement("br"));
        if (typeof detail === "object") {
            const link = document.createElement("a");
            link.href = detail.href;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.textContent = detail.label;
            cell.append(link);
        } else {
            cell.append(detail);
        }
    }
    return cell;
}

/** @param {HistoryEvent} event */
function eventSpecificDetails(event) {
    const eventName = String(event["Event"] ?? "")
        .trim()
        .toLowerCase();
    switch (eventName) {
        case "flower": {
            const count = displayValue(event["Flower count"]);
            const unit =
                Number(count) === 1 ? "flower / bud" : "flowers / buds";
            return [
                count ? `${count} ${unit}` : "",
                displayValue(event["Flower details"]),
            ].filter(Boolean);
        }
        case "pest": {
            const action = displayValue(event["Treatment / action"]);
            return [
                displayValue(event["Pest / issue"]),
                action ? `Action: ${action}` : "",
            ].filter(Boolean);
        }
        case "repot": {
            const previous = displayValue(
                event["Previous pot size"],
                "previous size not logged"
            );
            const current = displayValue(
                event["Pot size"],
                "new size not logged"
            );
            const medium = displayValue(event["Medium / substrate"]);
            return [
                `${previous} → ${current}`,
                medium ? `Medium: ${medium}` : "",
            ].filter(Boolean);
        }
        case "rotation": {
            const degrees = numericValue(event["Rotation (°)"]);
            return [
                degrees === null
                    ? "Rotation logged · amount not recorded"
                    : `${degrees}° clockwise-equivalent turn`,
            ];
        }
        case "water": {
            if (event["Nutrients used"] === "No") return ["Plain water"];
            if (event["Nutrients used"] !== "Yes") return [];
            const product = displayValue(
                event["Nutrient product"],
                "product not logged"
            );
            const amount = displayValue(event["Nutrient amount"]);
            return [
                [`Nutrients: ${product}`, amount].filter(Boolean).join(" · "),
            ];
        }
        default: {
            return [];
        }
    }
}

function exportHistory() {
    if (!state.currentPlant) return;
    const rows = sortedEvents(state.currentPlant.events, false).map((event) =>
        HISTORY_HEADERS.map((header) => csvCell(event[header])).join(",")
    );
    const blob = new Blob(
        [
            `\u{FEFF}${HISTORY_HEADERS.map((value) => csvCell(value)).join(",")}\r\n${rows.join("\r\n")}\r\n`,
        ],
        { type: "text/csv;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.currentPlant["Plant ID"]}-${plantLabel(state.currentPlant).replaceAll("#", "number-")}-history.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * @param {number | null} value
 */
function formatAverage(value) {
    return value === null ? "—" : `${value.toFixed(1)} g`;
}

/**
 * @param {unknown} value
 */
function formatDays(value) {
    return typeof value === "number" && Number.isFinite(value)
        ? `${value.toFixed(1)} days`
        : "—";
}

/**
 * @param {unknown} value
 */
function formatPercent(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}${Math.abs(value * 100).toFixed(1)}%`;
}

/**
 * @param {{ date: Date | null }} point
 */
function inChartRange(point) {
    const cutoff = rangeCutoff();
    return (
        point.date !== null &&
        (!cutoff || point.date.getTime() >= cutoff.getTime())
    );
}

/**
 * @param {HistoryEvent[]} events
 * @param {(event: HistoryEvent) => boolean} predicate
 */
function latestMatching(events, predicate) {
    return (
        sortedEvents(events, false).findLast((event) => predicate(event)) ??
        null
    );
}

async function loadPlant() {
    try {
        const [collection, loadedFieldGuideProfiles] = await Promise.all([
            loadCollectionData(),
            loadFieldGuideProfiles(),
        ]);
        renderLoadedPlant(collection, loadedFieldGuideProfiles);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setText("#plant-label", "Plant not found");
        setText("#plant-name", "This history page could not load");
        setText("#page-status", message);
        const row = document.createElement("tr");
        const cell = tableCell(message, "loading-cell error-cell");
        cell.colSpan = document.querySelectorAll(
            "#history-table thead th"
        ).length;
        row.append(cell);
        tableBody.replaceChildren(row);
    }
}

function rangeCutoff() {
    if (chartRange.value === "all") return null;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - Number(chartRange.value));
    return cutoff;
}

/** @param {PlantSummary} summary */
function renderCharts(summary) {
    if (!state.currentPlant) return;
    const weightPoints = summary.weightSeries.filter((entry) =>
        inChartRange(entry)
    );
    renderLineChart(getRequiredElement("#weight-chart", HTMLElement), {
        ariaLabel: `Pot-weight history for ${plantLabel(state.currentPlant)}`,
        emptyMessage: "No weights in this chart range yet.",
        referenceLines: [
            {
                className: "reference-dry",
                label: "Dry mean",
                value: summary.dryAverage,
            },
            {
                className: "reference-wet",
                label: "Wet mean",
                value: summary.wetAverage,
            },
        ],
        series: [
            {
                className: "series-weight",
                label: "Pot weight",
                points: weightPoints,
            },
        ],
        unit: "g",
    });
    setText(
        "#weight-chart-summary",
        weightPoints.length > 0
            ? `${weightPoints.length} ${weightPoints.length === 1 ? "weight" : "weights"} shown for pot setup ${summary.activePotSetup}.`
            : "Add a Quick log weight to begin this chart."
    );

    const heightPoints = summary.heightSeries.filter((entry) =>
        inChartRange(entry)
    );
    const widthPoints = summary.widthSeries.filter((entry) =>
        inChartRange(entry)
    );
    renderLineChart(getRequiredElement("#growth-chart", HTMLElement), {
        ariaLabel: `Measured height and width history for ${plantLabel(state.currentPlant)}`,
        emptyMessage:
            "No measured height or width readings in this chart range yet.",
        series: [
            {
                className: "series-height",
                label: "Height",
                points: heightPoints,
            },
            {
                className: "series-width",
                label: "Width",
                points: widthPoints,
            },
        ],
        unit: "cm",
    });
    setText(
        "#growth-chart-summary",
        heightPoints.length > 0 || widthPoints.length > 0
            ? `${heightPoints.length} measured height ${heightPoints.length === 1 ? "reading" : "readings"} and ${widthPoints.length} measured width ${widthPoints.length === 1 ? "reading" : "readings"} shown.`
            : "No measured height or width readings are available in this range. Estimates remain in observation history."
    );

    const intervals = summary.watering.intervals.filter((entry) =>
        inChartRange(entry)
    );
    renderIntervalChart(getRequiredElement("#watering-chart", HTMLElement), {
        ariaLabel: `Watering intervals for ${plantLabel(state.currentPlant)}`,
        emptyMessage: "Two water events are needed to calculate an interval.",
        intervals,
    });
    setText(
        "#watering-chart-summary",
        intervals.length > 0
            ? `${intervals.length} interval${intervals.length === 1 ? "" : "s"} shown; elapsed time is not a watering deadline.`
            : "Log Water only when the container is actually soaked to runoff."
    );

    const activityEvents = state.currentPlant.events
        .map((event) => {
            const eventName = String(event["Event"] ?? "").trim();
            const isActive = isActiveHistoryEvent(event);
            const eventLabel =
                eventName === "Water" && event["Nutrients used"] === "Yes"
                    ? `Water + ${displayValue(event["Nutrient product"], "nutrients")}`
                    : eventName || "Care event";
            return {
                active: isActive,
                category: eventName || "Other",
                className: isActive
                    ? activityClassName(eventName)
                    : "activity-removed",
                date: parseDate(event["Date"]),
                label: isActive ? eventLabel : `Removed · ${eventLabel}`,
            };
        })
        .filter((event) => inChartRange(event));
    const activeActivityEvents = activityEvents.filter((event) => event.active);
    /** @type {Map<string, number>} */
    const eventCounts = new Map();
    for (const event of activeActivityEvents)
        eventCounts.set(
            event.category,
            (eventCounts.get(event.category) ?? 0) + 1
        );
    const eventMix = [...eventCounts]
        .map(([label, value]) => ({
            className: activityClassName(label),
            label,
            value,
        }))
        .toSorted(
            (left, right) =>
                right.value - left.value ||
                left.label.localeCompare(right.label)
        );
    renderBarChart(getRequiredElement("#event-mix-chart", HTMLElement), {
        ariaLabel: `Active recorded event types for ${plantLabel(state.currentPlant)}`,
        emptyMessage: "No dated events in this chart range yet.",
        items: eventMix,
        unit: "events",
    });
    setText(
        "#event-mix-chart-summary",
        eventMix.length > 0
            ? `${activeActivityEvents.length} active dated ${activeActivityEvents.length === 1 ? "event" : "events"} across ${eventMix.length} ${eventMix.length === 1 ? "type" : "types"}. Removed records and blank fields are not counted.`
            : "The chart counts active recorded event rows; Removed records and blanks are not counted."
    );
    renderActivityChart(getRequiredElement("#activity-chart", HTMLElement), {
        ariaLabel: `Care activity timeline for ${plantLabel(state.currentPlant)}`,
        emptyMessage: "No care events in this chart range yet.",
        events: activityEvents,
    });
    const removedCount = activityEvents.length - activeActivityEvents.length;
    const removedDetail =
        removedCount === 0
            ? "."
            : `, including ${removedCount} Removed audit ${removedCount === 1 ? "record" : "records"}.`;
    setText(
        "#activity-chart-summary",
        activityEvents.length > 0
            ? `${activityEvents.length} care ${activityEvents.length === 1 ? "event" : "events"} shown in this range${removedDetail}`
            : "Add a dated event to begin this timeline."
    );
}

function renderHistory() {
    if (!state.currentPlant) return;
    const events = sortedVisibleEvents(visibleEvents());
    if (events.length === 0) {
        const row = document.createElement("tr");
        const cell = tableCell(
            state.currentPlant.events.length > 0
                ? "No observations match the current filters."
                : "No observations have been logged for this plant yet.",
            "loading-cell"
        );
        cell.colSpan = 12;
        row.append(cell);
        tableBody.replaceChildren(row);
    } else {
        const rows = events.map((event) => {
            const row = document.createElement("tr");
            row.append(tableCell(formatDate(event["Date"])));
            row.append(tableCell(event["Event"]));
            row.append(tableCell(event["Weight state"]));
            row.append(tableCell(formatMeasurement(event["Weight (g)"], "g")));
            row.append(
                tableCell(formatMeasurement(event["Height (cm)"], "cm"))
            );
            row.append(tableCell(formatMeasurement(event["Width (cm)"], "cm")));
            row.append(tableCell(conditionValue(event), "condition-cell"));
            row.append(eventDetailsCell(event));
            row.append(tableCell(event["Notes"], "notes-cell"));
            row.append(tableCell(formatDate(event["Trend anchor"], "")));
            row.append(tableCell(event["Days after anchor"]));
            row.append(tableCell(displayValue(event["Pot setup"], "1")));
            return row;
        });
        tableBody.replaceChildren(...rows);
    }

    setText(
        "#history-count",
        events.length === state.currentPlant.events.length
            ? entryLabel(events.length)
            : `${events.length} of ${entryLabel(state.currentPlant.events.length)}`
    );
    updateSortHeaders();
}

/**
 * @param {CollectionPlant} plant
 * @param {CollectionPlant[]} plants
 * @param {number} index
 * @param {number} trackerIndex
 */
function renderPlant(plant, plants, index, trackerIndex) {
    state.currentPlant = plant;
    const summary = plant.summary;
    const name = plant["Plant / planter"];
    const id = plant["Plant ID"];
    const label = plantLabel(plant);
    document.title = `${label} · ${name} · Plant history`;
    setText("#plant-label", `${label} · permanent ID ${id}`);
    setText("#plant-name", name);
    setText("#plant-scientific", plant["Scientific name / contents"]);
    getRequiredElement("#edit-history", HTMLAnchorElement).href =
        `${sheetUrls.editQuickLog}&range=A${trackerIndex + 5}:L${trackerIndex + 5}`;
    getRequiredElement("#sheet-plant-page", HTMLAnchorElement).href =
        sheetUrls.plantPage(id);
    renderProfileLinks(id);

    const waterDate = summary.lastWater?.["Date"] ?? "";
    const elapsed = daysSince(waterDate);
    setText("#last-watered", formatDate(waterDate));
    setText(
        "#water-days",
        elapsed === null
            ? "No watering logged"
            : `${elapsed} ${elapsed === 1 ? "day" : "days"} ago`
    );
    setCheckedValue(
        "#latest-weight",
        "#weight-checked",
        summary.latestWeight,
        "Weight (g)",
        "g"
    );
    setCheckedValue(
        "#latest-height",
        "#height-checked",
        summary.latestHeight,
        "Height (cm)",
        "cm"
    );
    setCheckedValue(
        "#latest-width",
        "#width-checked",
        summary.latestWidth,
        "Width (cm)",
        "cm"
    );

    renderActivitySummary(plant);
    const activeSetupEntries = plant.events.filter(
        (event) =>
            (numericValue(event["Pot setup"]) ?? 1) === summary.activePotSetup
    ).length;
    setText("#setup-entry-count", String(activeSetupEntries));
    setText(
        "#setup-entry-detail",
        `Pot setup ${summary.activePotSetup} · ${entryLabel(activeSetupEntries)}`
    );

    setText("#pot-setup", String(summary.activePotSetup));
    setText("#dry-average", formatAverage(summary.dryAverage));
    setText("#dry-samples", sampleLabel(summary.drySamples));
    setText("#wet-average", formatAverage(summary.wetAverage));
    setText("#wet-samples", sampleLabel(summary.wetSamples));
    setText(
        "#water-capacity",
        summary.capacity !== null && summary.capacity > 0
            ? `${summary.capacity.toFixed(1)} g`
            : "—"
    );
    setText(
        "#water-remaining",
        summary.remainingFraction === null
            ? "—"
            : `${Math.round(summary.remainingFraction * 100)}%`
    );
    renderCareSummary(plant);
    const badge = getRequiredElement("#baseline-status", HTMLElement);
    badge.textContent = summary.baselineStatus;
    badge.dataset["status"] =
        summary.baselineStatus.toLowerCase().split(" ", 1)[0] ?? "";

    configureEventFilter(plant.events);
    renderHistory();
    renderTrendSnapshot(summary);
    renderCharts(summary);
    configurePager(plants, index);
    setText(
        "#page-status",
        `Showing ${entryLabel(plant.events.length)} for ${label} (${id}); published Google Sheets data can take a few minutes to refresh.`
    );
}

/**
 * @param {string | number} plantId
 */
function renderProfileLinks(plantId) {
    const container = getRequiredElement("#profile-actions", HTMLElement);
    const profiles = state.fieldGuideProfiles[plantId] ?? [];
    container.replaceChildren();
    for (const [index, [fragment, title]] of profiles.entries()) {
        const link = document.createElement("a");
        link.className = "button field-guide-button";
        link.href = `../plant-booklet/#${encodeURIComponent(fragment)}`;
        link.append(
            siteIcon("field-guide"),
            document.createTextNode(
                profiles.length === 1
                    ? " Open field-guide profile"
                    : ` ${index + 1}. ${title}`
            )
        );
        container.append(link);
    }
    container.hidden = profiles.length === 0;
}

/** @param {PlantSummary} summary */
function renderTrendSnapshot(summary) {
    if (!state.currentPlant) return;
    setTrendCard(
        "#weight-change",
        "#weight-change-detail",
        summary.weightChange === null
            ? "—"
            : formatSigned(summary.weightChange, "g"),
        summary.weightChange === null
            ? "Needs 2 weights in this pot setup"
            : `${formatPercent(summary.weightChangePercent)} since the previous weight`
    );
    setTrendCard(
        "#weight-moving-average",
        "#weight-average-detail",
        summary.weightMovingAverage === null
            ? "—"
            : `${summary.weightMovingAverage.toFixed(1)} g`,
        `${Math.min(summary.weightSeries.length, 3)} of 3 recent weights · setup ${summary.activePotSetup}`
    );

    const dry = variabilityDetail(
        summary.dryStandardDeviation,
        summary.dryCoefficientOfVariation,
        summary.drySamples
    );
    setTrendCard("#dry-spread", "#dry-spread-detail", dry[0], dry[1]);
    const wet = variabilityDetail(
        summary.wetStandardDeviation,
        summary.wetCoefficientOfVariation,
        summary.wetSamples
    );
    setTrendCard("#wet-spread", "#wet-spread-detail", wet[0], wet[1]);

    setTrendCard(
        "#height-trend",
        "#height-trend-detail",
        summary.heightMonthlyRate === null
            ? "—"
            : `${formatSigned(summary.heightMonthlyRate, "cm")}/mo`,
        summary.heightChange === null
            ? "Needs 2 measured readings."
            : `${formatSigned(summary.heightChange, "cm")} across ${summary.heightSeries.length} readings`
    );
    setTrendCard(
        "#width-trend",
        "#width-trend-detail",
        summary.widthMonthlyRate === null
            ? "—"
            : `${formatSigned(summary.widthMonthlyRate, "cm")}/mo`,
        summary.widthChange === null
            ? "Needs 2 measured readings."
            : `${formatSigned(summary.widthChange, "cm")} across ${summary.widthSeries.length} readings`
    );
    setTrendCard(
        "#watering-average",
        "#watering-detail",
        formatDays(summary.watering.average),
        summary.watering.median === null || summary.watering.latest === null
            ? "Needs 2 recorded water events"
            : `Median ${summary.watering.median.toFixed(1)} · latest ${summary.watering.latest} days`
    );
    setTrendCard(
        "#observation-span",
        "#observation-span-detail",
        state.currentPlant.events.length > 0 &&
            summary.observationSpanDays !== null
            ? `${summary.observationSpanDays} days`
            : "—",
        summary.firstActivity && summary.latestActivity
            ? `${formatDate(summary.firstActivity["Date"])} to ${formatDate(summary.latestActivity["Date"])}`
            : "No dated history"
    );
}

/**
 * @param {number} count
 */
function sampleLabel(count) {
    return `${count} ${count === 1 ? "sample" : "samples"}`;
}

/**
 * @param {string} valueSelector
 * @param {string} dateSelector
 * @param {HistoryEvent | undefined} event
 * @param {string} field
 * @param {string} unit
 */
function setCheckedValue(valueSelector, dateSelector, event, field, unit) {
    setText(valueSelector, formatMeasurement(event?.[field] ?? "", unit));
    setText(
        dateSelector,
        event ? `Checked ${formatDate(event["Date"])}` : "Not checked yet"
    );
}

/**
 * @param {string} selector
 * @param {string | number | null | undefined} value
 */
function setText(selector, value) {
    const target = getRequiredElement(selector, HTMLElement);
    target.textContent =
        value === null || value === undefined ? "" : String(value);
}

/**
 * @param {string} valueSelector
 * @param {string} detailSelector
 * @param {string | undefined} value
 * @param {string | undefined} detail
 */
function setTrendCard(valueSelector, detailSelector, value, detail) {
    setText(valueSelector, value);
    setText(detailSelector, detail);
}

/**
 * @param {string} name
 */
function siteIcon(name) {
    const iconTemplate = getRequiredElement(
        ".brand-mark .site-icon",
        SVGElement
    );
    const icon = iconTemplate.cloneNode(true);
    if (!(icon instanceof SVGElement))
        throw new Error("Invalid site icon template.");
    const use = icon.querySelector("use");
    if (!use)
        throw new Error("The site icon template is missing its use node.");
    use.setAttribute(
        "href",
        String(use.getAttribute("href")).replace(
            /#icon-[\-a-z]+$/v,
            () => `#icon-${name}`
        )
    );
    return icon;
}

/**
 * @param {HistoryEvent[]} events
 * @param {boolean} [isDescending]
 */
function sortedEvents(events, isDescending = true) {
    return events.toSorted((left, right) => {
        const dateDifference =
            (parseDate(right["Date"])?.getTime() ?? 0) -
            (parseDate(left["Date"])?.getTime() ?? 0);
        const { _index: leftIndex } = left;
        const { _index: rightIndex } = right;
        const indexDifference = rightIndex - leftIndex;
        return (isDescending ? 1 : -1) * (dateDifference || indexDifference);
    });
}

/** @param {HistoryEvent[]} events */
function sortedVisibleEvents(events) {
    const multiplier = state.historySort.direction === "ascending" ? 1 : -1;
    return events.toSorted((left, right) => {
        const { _index: leftIndex } = left;
        const { _index: rightIndex } = right;
        const leftValue = sortValue(
            left,
            state.historySort.key,
            state.historySort.type
        );
        const rightValue = sortValue(
            right,
            state.historySort.key,
            state.historySort.type
        );
        if (leftValue === null && rightValue === null)
            return multiplier * (leftIndex - rightIndex);
        if (leftValue === null) return 1;
        if (rightValue === null) return -1;
        const comparison =
            typeof leftValue === "number" && typeof rightValue === "number"
                ? leftValue - rightValue
                : String(leftValue).localeCompare(String(rightValue));
        return multiplier * (comparison || leftIndex - rightIndex);
    });
}

/**
 * @param {HistoryEvent} event
 * @param {string} key
 * @param {string} type
 *
 * @returns {number | string | null}
 */
function sortValue(event, key, type) {
    const raw = key === "condition" ? conditionValue(event) : event[key];
    if (type === "date") return parseDate(raw)?.getTime() ?? null;
    if (type === "number") return numericValue(raw);
    const text = String(raw ?? "").trim();
    return text ? text.toLocaleLowerCase() : null;
}

/**
 * @param {string | number | null | undefined} value
 * @param {string | undefined} [className]
 */
function tableCell(value, className) {
    const cell = document.createElement("td");
    const isBlank = (value ?? "") === "";
    cell.textContent = isBlank ? "Not recorded" : String(value);
    cell.className = [className, isBlank ? "not-recorded" : ""]
        .filter(Boolean)
        .join(" ");
    return cell;
}

function updateSortHeaders() {
    document
        .querySelectorAll("#history-table th[data-sort-key]")
        .forEach((header) => {
            if (!(header instanceof HTMLTableCellElement)) return;
            const isActive =
                header.dataset["sortKey"] === state.historySort.key;
            header.setAttribute(
                "aria-sort",
                isActive ? state.historySort.direction : "none"
            );
            const indicator = header.querySelector(":scope button span");
            if (indicator)
                indicator.textContent = isActive
                    ? state.historySort.direction === "ascending"
                        ? "↑"
                        : "↓"
                    : "↕";
        });
}

/**
 * @param {number | null} deviation
 * @param {number | null} coefficient
 * @param {number} count
 *
 * @returns {[string, string]}
 */
function variabilityDetail(deviation, coefficient, count) {
    if (deviation === null) return ["—", `Needs 2 samples · ${count} logged`];
    const variation =
        coefficient === null
            ? "CV unavailable"
            : `CV ${(coefficient * 100).toFixed(1)}%`;
    return [
        `±${deviation.toFixed(1)} g`,
        `${variation} · ${sampleLabel(count)}`,
    ];
}

function visibleEvents() {
    if (!state.currentPlant) return [];
    const query = searchInput.value.trim().toLowerCase();
    const selectedEvent = eventFilter.value.toLowerCase();
    return state.currentPlant.events.filter((event) => {
        const isMatchesEvent =
            selectedEvent === "all" ||
            String(event["Event"]).trim().toLowerCase() === selectedEvent;
        const isMatchesQuery =
            !query ||
            Object.entries(event)
                .filter(([key]) => key !== "_index")
                .some(([, value]) =>
                    String(value).toLowerCase().includes(query)
                );
        return isMatchesEvent && isMatchesQuery;
    });
}

installThemeToggle(getRequiredElement("#theme-toggle", HTMLButtonElement));
searchInput.addEventListener("input", renderHistory);
eventFilter.addEventListener("change", renderHistory);
chartRange.addEventListener("change", changeChartRange);
for (const button of document.querySelectorAll(
    "#history-table th[data-sort-key] button"
)) {
    button.addEventListener("click", changeHistorySort);
}
getRequiredElement("#export-history", HTMLButtonElement).addEventListener(
    "click",
    exportHistory
);
await loadPlant();

function changeChartRange() {
    if (state.currentPlant) renderCharts(state.currentPlant.summary);
}

/** @param {Event} event */
function changeHistorySort(event) {
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) return;
    const header = button.closest("th");
    if (!(header instanceof HTMLTableCellElement)) return;
    const key = header.dataset["sortKey"];
    if (key === undefined || key === "") return;
    state.historySort = {
        direction:
            state.historySort.key === key &&
            state.historySort.direction === "ascending"
                ? "descending"
                : "ascending",
        key,
        type: displayValue(header.dataset["sortType"], "text"),
    };
    renderHistory();
}

/** @param {CollectionPlant} plant */
function renderActivitySummary(plant) {
    const summary = plant.summary;
    const latestCondition = latestMatching(
        plant.events,
        (event) => conditionValue(event) !== ""
    );
    setText(
        "#latest-activity",
        displayValue(
            summary.latestActivity?.["Event"],
            summary.latestActivity ? "Observation" : "—"
        )
    );
    setText(
        "#latest-activity-detail",
        summary.latestActivity
            ? formatDate(summary.latestActivity["Date"])
            : "No dated history"
    );
    setText(
        "#latest-condition",
        latestCondition ? conditionValue(latestCondition) : "—"
    );
    setText(
        "#latest-condition-detail",
        latestCondition
            ? `Recorded ${formatDate(latestCondition["Date"])}`
            : "Plant condition and soil moisture not recorded"
    );
    setText("#logged-entry-count", String(plant.events.length));
    setText(
        "#logged-entry-detail",
        plant.events.length > 0
            ? `${summary.firstActivity ? formatDate(summary.firstActivity["Date"]) : "Undated"} to ${summary.latestActivity ? formatDate(summary.latestActivity["Date"]) : "undated"}`
            : "No observations yet"
    );
}

/** @param {CollectionPlant} plant */
function renderCareSummary(plant) {
    const summary = plant.summary;
    setText("#current-pot-size", summary.currentPotSize);
    setText("#nutrient-count", String(summary.eventCounts.nutrients));
    setText("#flower-count", String(summary.eventCounts.flowers));
    setText("#photo-count", String(summary.eventCounts.photos));
    setText("#pest-count", String(summary.eventCounts.pests));
    setText("#check-count", String(summary.eventCounts.checks));
    setText("#rotation-count", String(summary.eventCounts.rotations));
    setText("#clean-count", String(summary.eventCounts.cleans));
    setText("#prune-count", String(summary.eventCounts.prunes));
    setText(
        "#latest-repot-detail",
        summary.latestRepot
            ? `Repotted ${formatDate(summary.latestRepot["Date"])}`
            : "No repot logged"
    );
    setText(
        "#latest-nutrient-detail",
        summary.latestNutrients
            ? `${displayValue(summary.latestNutrients["Nutrient product"], "Nutrients")} · ${formatDate(summary.latestNutrients["Date"])}`
            : "No fertilizer logged"
    );
    setText(
        "#latest-flower-detail",
        summary.latestFlower
            ? `${displayValue(summary.latestFlower["Flower details"], "Flower logged")} · ${formatDate(summary.latestFlower["Date"])}`
            : "No flowers logged"
    );
    const photoDetail = getRequiredElement("#latest-photo-detail", HTMLElement);
    photoDetail.replaceChildren();
    if (summary.latestPhoto) {
        const link = document.createElement("a");
        link.href = String(summary.latestPhoto["Photo URL"] ?? "");
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = `Latest photo · ${formatDate(summary.latestPhoto["Date"])} ↗`;
        photoDetail.append(link);
    } else photoDetail.textContent = "No photos logged";
    setText(
        "#latest-pest-detail",
        summary.latestPest
            ? `${displayValue(summary.latestPest["Pest / issue"], "Issue logged")} · ${formatDate(summary.latestPest["Date"])}`
            : "No issues logged"
    );
    setText(
        "#latest-check-detail",
        summary.latestCheck
            ? `${displayValue(summary.latestCheck["Condition / soil"], "Check logged")} · ${formatDate(summary.latestCheck["Date"])}`
            : "No checks logged"
    );
    setText(
        "#latest-rotation-detail",
        summary.latestRotation
            ? `${displayValue(summary.latestRotation["Rotation (°)"], "90")}° · ${formatDate(summary.latestRotation["Date"])}`
            : "No rotation logged"
    );
    const latestClean = latestMatching(
        plant.events,
        (event) => String(event["Event"]).trim().toLowerCase() === "clean"
    );
    const latestPrune = latestMatching(
        plant.events,
        (event) => String(event["Event"]).trim().toLowerCase() === "prune"
    );
    setText(
        "#latest-clean-detail",
        latestClean
            ? `Latest ${formatDate(latestClean["Date"])}`
            : "No cleaning logged"
    );
    setText(
        "#latest-prune-detail",
        latestPrune
            ? `Latest ${formatDate(latestPrune["Date"])}`
            : "No pruning logged"
    );
}

/**
 * @param {Awaited<ReturnType<typeof loadCollectionData>>} collection
 * @param {Readonly<FieldGuideProfiles>} loadedFieldGuideProfiles
 */
function renderLoadedPlant(collection, loadedFieldGuideProfiles) {
    state.fieldGuideProfiles = loadedFieldGuideProfiles;
    const naturallyOrderedPlants = collection.plants.toSorted(
        comparePlantsByNaturalLabel
    );
    const normalizedRequest = requestedId?.trim().toLowerCase();
    const index = naturallyOrderedPlants.findIndex(
        (plant) =>
            plant["Plant ID"].toLowerCase() === normalizedRequest ||
            plantLabel(plant).toLowerCase() === normalizedRequest
    );
    const selectedPlant = naturallyOrderedPlants[index];
    if (!selectedPlant) {
        throw new Error(
            requestedId !== null && requestedId !== ""
                ? `No collection label matches “${requestedId}”.`
                : "No plant label was provided in this URL."
        );
    }
    const trackerIndex = collection.plants.findIndex(
        (plant) => plant["Plant ID"] === selectedPlant["Plant ID"]
    );
    renderPlant(selectedPlant, naturallyOrderedPlants, index, trackerIndex);
}
