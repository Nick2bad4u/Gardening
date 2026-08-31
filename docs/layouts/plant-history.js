import {
    comparePlantsByNaturalLabel,
    daysSince,
    formatDate,
    formatMeasurement,
    formatSigned,
    historyPageUrl,
    installThemeToggle,
    loadCollectionData,
    numericValue,
    parseDate,
    plantLabel,
    sheetUrls,
} from "./plant-tracker-data.js";
import {
    renderActivityChart,
    renderBarChart,
    renderIntervalChart,
    renderLineChart,
} from "./plant-charts.js";

let fieldGuideProfiles = Object.freeze({});

async function loadFieldGuideProfiles() {
    const response = await fetch(
        new URL("./plant-profile-data.json", import.meta.url)
    );
    if (!response.ok) {
        throw new Error(
            `The field-guide profile map returned HTTP ${response.status}.`
        );
    }
    return response.json();
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
]);

const requestedId = new URLSearchParams(location.search).get("id");
const tableBody = document.querySelector("#history-table tbody");
const searchInput = document.querySelector("#history-search");
const eventFilter = document.querySelector("#history-event-filter");
const chartRange = document.querySelector("#chart-range");
let currentPlant = null;
let historySort = { direction: "descending", key: "Date", type: "date" };

function setText(selector, value) {
    document.querySelector(selector).textContent = value;
}

function sampleLabel(count) {
    return `${count} ${count === 1 ? "sample" : "samples"}`;
}

function entryLabel(count) {
    return `${count} ${count === 1 ? "entry" : "entries"}`;
}

function formatAverage(value) {
    return value === null ? "—" : `${value.toFixed(1)} g`;
}

function formatPercent(value) {
    if (!Number.isFinite(value)) return "—";
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}${Math.abs(value * 100).toFixed(1)}%`;
}

function formatDays(value) {
    return Number.isFinite(value) ? `${value.toFixed(1)} days` : "—";
}

function setCheckedValue(valueSelector, dateSelector, event, field, unit) {
    setText(valueSelector, formatMeasurement(event?.[field] ?? "", unit));
    setText(
        dateSelector,
        event ? `Checked ${formatDate(event.Date)}` : "Not checked yet"
    );
}

function tableCell(value, className) {
    const cell = document.createElement("td");
    const blank = value === "" || value === null || value === undefined;
    cell.textContent = blank ? "Not recorded" : String(value);
    cell.className = [className, blank ? "not-recorded" : ""]
        .filter(Boolean)
        .join(" ");
    return cell;
}

function conditionValue(event) {
    return [event["Plant condition"], event["Soil moisture"]]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
        .join(" · ");
}

function latestMatching(events, predicate) {
    return sortedEvents(events, false).findLast(predicate) ?? null;
}

function eventDetails(event) {
    const parts = [];
    const eventName = String(event.Event ?? "")
        .trim()
        .toLowerCase();
    if (eventName === "water") {
        const nutrients = event["Nutrients used"];
        if (nutrients === "Yes") {
            parts.push(
                `Nutrients: ${event["Nutrient product"] || "product not logged"}${event["Nutrient amount"] ? ` · ${event["Nutrient amount"]}` : ""}`
            );
        } else if (nutrients === "No") parts.push("Plain water");
    }
    if (eventName === "repot") {
        parts.push(
            `${event["Previous pot size"] || "previous size not logged"} → ${event["Pot size"] || "new size not logged"}`
        );
        if (event["Medium / substrate"])
            parts.push(`Medium: ${event["Medium / substrate"]}`);
    }
    if (eventName === "flower") {
        if (event["Flower count"]) {
            const flowerCount = Number(event["Flower count"]);
            parts.push(
                `${event["Flower count"]} ${flowerCount === 1 ? "flower / bud" : "flowers / buds"}`
            );
        }
        if (event["Flower details"]) parts.push(event["Flower details"]);
    }
    if (eventName === "pest") {
        if (event["Pest / issue"]) parts.push(event["Pest / issue"]);
        if (event["Treatment / action"])
            parts.push(`Action: ${event["Treatment / action"]}`);
    }
    if (eventName === "rotation") {
        const degrees = numericValue(event["Rotation (°)"]);
        parts.push(
            degrees === null
                ? "Rotation logged · amount not recorded"
                : `${degrees}° clockwise-equivalent turn`
        );
    }
    const measurementUnit = String(event["Measurement unit"] ?? "")
        .trim()
        .toLowerCase();
    if (
        measurementUnit === "in" &&
        (event["Height (in)"] || event["Width (in)"])
    ) {
        const originals = [
            event["Height (in)"] ? `H ${event["Height (in)"]} in` : "",
            event["Width (in)"] ? `W ${event["Width (in)"]} in` : "",
        ].filter(Boolean);
        parts.push(`Original measurement: ${originals.join(" · ")}`);
    }
    if (event["Measurement method"])
        parts.push(`Method: ${event["Measurement method"]}`);
    if (event["Observation quality"])
        parts.push(`Quality: ${event["Observation quality"]}`);
    if (event["Correction reason"])
        parts.push(`Correction: ${event["Correction reason"]}`);
    if (
        event["Record status"] &&
        String(event["Record status"]).trim().toLowerCase() !== "active"
    )
        parts.push(`Record status: ${event["Record status"]}`);
    if (event["Photo URL"])
        parts.push({ href: event["Photo URL"], label: "Open Google Photos ↗" });
    return parts;
}

function eventDetailsCell(event) {
    const cell = document.createElement("td");
    cell.className = "condition-cell event-details-cell";
    const details = eventDetails(event);
    if (!details.length) {
        cell.textContent = "—";
        return cell;
    }
    details.forEach((detail, index) => {
        if (index) cell.append(document.createElement("br"));
        if (typeof detail === "string") cell.append(detail);
        else {
            const link = document.createElement("a");
            link.href = detail.href;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.textContent = detail.label;
            cell.append(link);
        }
    });
    return cell;
}

function sortedEvents(events, descending = true) {
    return [...events].sort((left, right) => {
        const dateDifference =
            (parseDate(right.Date)?.getTime() ?? 0) -
            (parseDate(left.Date)?.getTime() ?? 0);
        const indexDifference = right._index - left._index;
        return (descending ? 1 : -1) * (dateDifference || indexDifference);
    });
}

function sortValue(event, key, type) {
    const raw = key === "condition" ? conditionValue(event) : event[key];
    if (type === "date") return parseDate(raw)?.getTime() ?? null;
    if (type === "number") return numericValue(raw);
    const text = String(raw ?? "").trim();
    return text ? text.toLocaleLowerCase() : null;
}

function sortedVisibleEvents(events) {
    const multiplier = historySort.direction === "ascending" ? 1 : -1;
    return [...events].sort((left, right) => {
        const leftValue = sortValue(left, historySort.key, historySort.type);
        const rightValue = sortValue(right, historySort.key, historySort.type);
        if (leftValue === null && rightValue === null)
            return multiplier * (left._index - right._index);
        if (leftValue === null) return 1;
        if (rightValue === null) return -1;
        const comparison =
            typeof leftValue === "number"
                ? leftValue - rightValue
                : leftValue.localeCompare(rightValue);
        return multiplier * (comparison || left._index - right._index);
    });
}

function updateSortHeaders() {
    document
        .querySelectorAll("#history-table th[data-sort-key]")
        .forEach((header) => {
            const active = header.dataset.sortKey === historySort.key;
            header.setAttribute(
                "aria-sort",
                active ? historySort.direction : "none"
            );
            const indicator = header.querySelector("button span");
            if (indicator)
                indicator.textContent = active
                    ? historySort.direction === "ascending"
                        ? "↑"
                        : "↓"
                    : "↕";
        });
}

function visibleEvents() {
    if (!currentPlant) return [];
    const query = searchInput.value.trim().toLowerCase();
    const selectedEvent = eventFilter.value.toLowerCase();
    return currentPlant.events.filter((event) => {
        const matchesEvent =
            selectedEvent === "all" ||
            event.Event.trim().toLowerCase() === selectedEvent;
        const matchesQuery =
            !query ||
            Object.entries(event)
                .filter(([key]) => key !== "_index")
                .some(([, value]) =>
                    String(value).toLowerCase().includes(query)
                );
        return matchesEvent && matchesQuery;
    });
}

function renderHistory() {
    const events = sortedVisibleEvents(visibleEvents());
    if (events.length === 0) {
        const row = document.createElement("tr");
        const cell = tableCell(
            currentPlant?.events.length
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
            row.append(tableCell(formatDate(event.Date)));
            row.append(tableCell(event.Event));
            row.append(tableCell(event["Weight state"]));
            row.append(tableCell(formatMeasurement(event["Weight (g)"], "g")));
            row.append(
                tableCell(formatMeasurement(event["Height (cm)"], "cm"))
            );
            row.append(tableCell(formatMeasurement(event["Width (cm)"], "cm")));
            row.append(tableCell(conditionValue(event), "condition-cell"));
            row.append(eventDetailsCell(event));
            row.append(tableCell(event.Notes, "notes-cell"));
            row.append(tableCell(formatDate(event["Trend anchor"], "")));
            row.append(tableCell(event["Days after anchor"]));
            row.append(tableCell(event["Pot setup"] || "1"));
            return row;
        });
        tableBody.replaceChildren(...rows);
    }

    setText(
        "#history-count",
        events.length === currentPlant.events.length
            ? entryLabel(events.length)
            : `${events.length} of ${entryLabel(currentPlant.events.length)}`
    );
    updateSortHeaders();
}

function configureEventFilter(events) {
    const previous = eventFilter.value;
    const names = [...new Set(events.map((event) => event.Event.trim()))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
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

function configurePager(plants, index) {
    const previous = document.querySelector("#previous-plant");
    const next = document.querySelector("#next-plant");
    if (index > 0) {
        previous.href = historyPageUrl(plants[index - 1]["Plant ID"]);
        previous.textContent = `← ${plantLabel(plants[index - 1])} · ${plants[index - 1]["Plant / planter"]}`;
    } else {
        previous.hidden = true;
    }
    if (index < plants.length - 1) {
        next.href = historyPageUrl(plants[index + 1]["Plant ID"]);
        next.textContent = `${plantLabel(plants[index + 1])} · ${plants[index + 1]["Plant / planter"]} →`;
    } else {
        next.hidden = true;
    }
}

function setTrendCard(valueSelector, detailSelector, value, detail) {
    setText(valueSelector, value);
    setText(detailSelector, detail);
}

function variabilityDetail(deviation, coefficient, count) {
    if (deviation === null) return ["—", `Needs 2 samples · ${count} logged`];
    return [
        `±${deviation.toFixed(1)} g`,
        `CV ${(coefficient * 100).toFixed(1)}% · ${sampleLabel(count)}`,
    ];
}

function activityClassName(eventName) {
    const slug = String(eventName ?? "")
        .trim()
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-|-$/g, "");
    return `activity-${slug || "other"}`;
}

function renderTrendSnapshot(summary) {
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
        summary.watering.average === null
            ? "Needs 2 recorded water events"
            : `Median ${summary.watering.median.toFixed(1)} · latest ${summary.watering.latest} days`
    );
    setTrendCard(
        "#observation-span",
        "#observation-span-detail",
        currentPlant.events.length
            ? `${summary.observationSpanDays} days`
            : "—",
        summary.firstActivity && summary.latestActivity
            ? `${formatDate(summary.firstActivity.Date)} to ${formatDate(summary.latestActivity.Date)}`
            : "No dated history"
    );
}

function rangeCutoff() {
    if (chartRange.value === "all") return null;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - Number(chartRange.value));
    return cutoff;
}

function inChartRange(point) {
    const cutoff = rangeCutoff();
    return !cutoff || point.date >= cutoff;
}

function renderCharts(summary) {
    const weightPoints = summary.weightSeries.filter(inChartRange);
    renderLineChart(document.querySelector("#weight-chart"), {
        ariaLabel: `Pot-weight history for ${plantLabel(currentPlant)}`,
        emptyMessage: "No weights in this chart range yet.",
        referenceLines: [
            {
                value: summary.dryAverage,
                label: "Dry mean",
                className: "reference-dry",
            },
            {
                value: summary.wetAverage,
                label: "Wet mean",
                className: "reference-wet",
            },
        ],
        series: [
            {
                label: "Pot weight",
                className: "series-weight",
                points: weightPoints,
            },
        ],
        unit: "g",
    });
    setText(
        "#weight-chart-summary",
        weightPoints.length
            ? `${weightPoints.length} ${weightPoints.length === 1 ? "weight" : "weights"} shown for pot setup ${summary.activePotSetup}.`
            : "Add a Quick log weight to begin this chart."
    );

    const heightPoints = summary.heightSeries.filter(inChartRange);
    const widthPoints = summary.widthSeries.filter(inChartRange);
    renderLineChart(document.querySelector("#growth-chart"), {
        ariaLabel: `Measured height and width history for ${plantLabel(currentPlant)}`,
        emptyMessage:
            "No measured height or width readings in this chart range yet.",
        series: [
            {
                label: "Height",
                className: "series-height",
                points: heightPoints,
            },
            {
                label: "Width",
                className: "series-width",
                points: widthPoints,
            },
        ],
        unit: "cm",
    });
    setText(
        "#growth-chart-summary",
        heightPoints.length || widthPoints.length
            ? `${heightPoints.length} measured height ${heightPoints.length === 1 ? "reading" : "readings"} and ${widthPoints.length} measured width ${widthPoints.length === 1 ? "reading" : "readings"} shown.`
            : "No measured height or width readings are available in this range. Estimates remain in observation history."
    );

    const intervals = summary.watering.intervals.filter(inChartRange);
    renderIntervalChart(document.querySelector("#watering-chart"), {
        ariaLabel: `Watering intervals for ${plantLabel(currentPlant)}`,
        emptyMessage: "Two water events are needed to calculate an interval.",
        intervals,
    });
    setText(
        "#watering-chart-summary",
        intervals.length
            ? `${intervals.length} interval${intervals.length === 1 ? "" : "s"} shown; elapsed time is not a watering deadline.`
            : "Log Water only when the container is actually soaked to runoff."
    );

    const activityEvents = currentPlant.events
        .map((event) => {
            const eventName = String(event.Event ?? "").trim();
            return {
                category: eventName || "Other",
                date: parseDate(event.Date),
                label:
                    eventName === "Water" && event["Nutrients used"] === "Yes"
                        ? `Water + ${event["Nutrient product"] || "nutrients"}`
                        : eventName || "Care event",
                className: activityClassName(eventName),
            };
        })
        .filter((event) => event.date && inChartRange(event));
    const eventCounts = new Map();
    activityEvents.forEach((event) =>
        eventCounts.set(
            event.category,
            (eventCounts.get(event.category) ?? 0) + 1
        )
    );
    const eventMix = [...eventCounts]
        .map(([label, value]) => ({
            className: activityClassName(label),
            label,
            value,
        }))
        .sort(
            (left, right) =>
                right.value - left.value ||
                left.label.localeCompare(right.label)
        );
    renderBarChart(document.querySelector("#event-mix-chart"), {
        ariaLabel: `Recorded event types for ${plantLabel(currentPlant)}`,
        emptyMessage: "No dated events in this chart range yet.",
        items: eventMix,
        unit: "events",
    });
    setText(
        "#event-mix-chart-summary",
        eventMix.length
            ? `${activityEvents.length} dated ${activityEvents.length === 1 ? "event" : "events"} across ${eventMix.length} ${eventMix.length === 1 ? "type" : "types"}. Blank fields are not counted as events.`
            : "The chart counts recorded event rows; blanks remain not recorded."
    );
    renderActivityChart(document.querySelector("#activity-chart"), {
        ariaLabel: `Care activity timeline for ${plantLabel(currentPlant)}`,
        emptyMessage: "No care events in this chart range yet.",
        events: activityEvents,
    });
    setText(
        "#activity-chart-summary",
        activityEvents.length
            ? `${activityEvents.length} care ${activityEvents.length === 1 ? "event" : "events"} shown in this range.`
            : "Add a dated event to begin this timeline."
    );
}

function csvCell(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportHistory() {
    if (!currentPlant) return;
    const rows = sortedEvents(currentPlant.events, false).map((event) =>
        HISTORY_HEADERS.map((header) => csvCell(event[header])).join(",")
    );
    const blob = new Blob(
        [
            `\uFEFF${HISTORY_HEADERS.map(csvCell).join(",")}\r\n${rows.join("\r\n")}\r\n`,
        ],
        { type: "text/csv;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentPlant["Plant ID"]}-${plantLabel(currentPlant).replaceAll("#", "number-")}-history.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function renderProfileLinks(plantId) {
    const container = document.querySelector("#profile-actions");
    const profiles = fieldGuideProfiles[plantId] ?? [];
    container.replaceChildren();
    profiles.forEach(([fragment, title], index) => {
        const link = document.createElement("a");
        link.className = "button field-guide-button";
        link.href = `../plant-booklet/#${encodeURIComponent(fragment)}`;
        const icon = document.createElement("span");
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "✦";
        link.append(
            icon,
            document.createTextNode(
                profiles.length === 1
                    ? " Open field-guide profile"
                    : ` ${index + 1}. ${title}`
            )
        );
        container.append(link);
    });
    container.hidden = profiles.length === 0;
}

function renderPlant(plant, plants, index, trackerIndex) {
    currentPlant = plant;
    const summary = plant.summary;
    const name = plant["Plant / planter"];
    const id = plant["Plant ID"];
    const label = plantLabel(plant);
    document.title = `${label} · ${name} · Plant history`;
    setText("#plant-label", `${label} · permanent ID ${id}`);
    setText("#plant-name", name);
    setText("#plant-scientific", plant["Scientific name / contents"]);
    document.querySelector("#edit-history").href =
        `${sheetUrls.editQuickLog}&range=A${trackerIndex + 5}:L${trackerIndex + 5}`;
    document.querySelector("#sheet-plant-page").href = sheetUrls.plantPage(id);
    renderProfileLinks(id);

    const waterDate = summary.lastWater?.Date ?? "";
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

    const latestCondition = latestMatching(
        plant.events,
        (event) => conditionValue(event) !== ""
    );
    setText(
        "#latest-activity",
        summary.latestActivity?.Event ||
            (summary.latestActivity ? "Observation" : "—")
    );
    setText(
        "#latest-activity-detail",
        summary.latestActivity
            ? formatDate(summary.latestActivity.Date)
            : "No dated history"
    );
    setText(
        "#latest-condition",
        latestCondition ? conditionValue(latestCondition) : "—"
    );
    setText(
        "#latest-condition-detail",
        latestCondition
            ? `Recorded ${formatDate(latestCondition.Date)}`
            : "Plant condition and soil moisture not recorded"
    );
    setText("#logged-entry-count", String(plant.events.length));
    setText(
        "#logged-entry-detail",
        plant.events.length
            ? `${summary.firstActivity ? formatDate(summary.firstActivity.Date) : "Undated"} to ${summary.latestActivity ? formatDate(summary.latestActivity.Date) : "undated"}`
            : "No observations yet"
    );
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
            ? `Repotted ${formatDate(summary.latestRepot.Date)}`
            : "No repot logged"
    );
    setText(
        "#latest-nutrient-detail",
        summary.latestNutrients
            ? `${summary.latestNutrients["Nutrient product"] || "Nutrients"} · ${formatDate(summary.latestNutrients.Date)}`
            : "No fertilizer logged"
    );
    setText(
        "#latest-flower-detail",
        summary.latestFlower
            ? `${summary.latestFlower["Flower details"] || "Flower logged"} · ${formatDate(summary.latestFlower.Date)}`
            : "No flowers logged"
    );
    const photoDetail = document.querySelector("#latest-photo-detail");
    photoDetail.replaceChildren();
    if (summary.latestPhoto) {
        const link = document.createElement("a");
        link.href = summary.latestPhoto["Photo URL"];
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = `Latest photo · ${formatDate(summary.latestPhoto.Date)} ↗`;
        photoDetail.append(link);
    } else photoDetail.textContent = "No photos logged";
    setText(
        "#latest-pest-detail",
        summary.latestPest
            ? `${summary.latestPest["Pest / issue"] || "Issue logged"} · ${formatDate(summary.latestPest.Date)}`
            : "No issues logged"
    );
    setText(
        "#latest-check-detail",
        summary.latestCheck
            ? `${summary.latestCheck["Condition / soil"] || "Check logged"} · ${formatDate(summary.latestCheck.Date)}`
            : "No checks logged"
    );
    setText(
        "#latest-rotation-detail",
        summary.latestRotation
            ? `${summary.latestRotation["Rotation (°)"] || 90}° · ${formatDate(summary.latestRotation.Date)}`
            : "No rotation logged"
    );
    const latestClean = latestMatching(
        plant.events,
        (event) => String(event.Event).trim().toLowerCase() === "clean"
    );
    const latestPrune = latestMatching(
        plant.events,
        (event) => String(event.Event).trim().toLowerCase() === "prune"
    );
    setText(
        "#latest-clean-detail",
        latestClean
            ? `Latest ${formatDate(latestClean.Date)}`
            : "No cleaning logged"
    );
    setText(
        "#latest-prune-detail",
        latestPrune
            ? `Latest ${formatDate(latestPrune.Date)}`
            : "No pruning logged"
    );
    const badge = document.querySelector("#baseline-status");
    badge.textContent = summary.baselineStatus;
    badge.dataset.status = summary.baselineStatus.toLowerCase().split(" ")[0];

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

async function loadPlant() {
    try {
        const [collection, loadedFieldGuideProfiles] = await Promise.all([
            loadCollectionData(),
            loadFieldGuideProfiles(),
        ]);
        fieldGuideProfiles = loadedFieldGuideProfiles;
        const naturallyOrderedPlants = [...collection.plants].sort(
            comparePlantsByNaturalLabel
        );
        const normalizedRequest = requestedId?.trim().toLowerCase();
        const index = naturallyOrderedPlants.findIndex(
            (plant) =>
                plant["Plant ID"].toLowerCase() === normalizedRequest ||
                plantLabel(plant).toLowerCase() === normalizedRequest
        );
        if (index === -1) {
            throw new Error(
                requestedId
                    ? `No collection label matches “${requestedId}”.`
                    : "No plant label was provided in this URL."
            );
        }
        const trackerIndex = collection.plants.findIndex(
            (plant) =>
                plant["Plant ID"] === naturallyOrderedPlants[index]["Plant ID"]
        );
        renderPlant(
            naturallyOrderedPlants[index],
            naturallyOrderedPlants,
            index,
            trackerIndex
        );
    } catch (error) {
        setText("#plant-label", "Plant not found");
        setText("#plant-name", "This history page could not load");
        setText("#page-status", error.message);
        const row = document.createElement("tr");
        const cell = tableCell(error.message, "loading-cell error-cell");
        cell.colSpan = document.querySelectorAll(
            "#history-table thead th"
        ).length;
        row.append(cell);
        tableBody.replaceChildren(row);
    }
}

installThemeToggle(document.querySelector("#theme-toggle"));
searchInput.addEventListener("input", renderHistory);
eventFilter.addEventListener("change", renderHistory);
chartRange.addEventListener(
    "change",
    () => currentPlant && renderCharts(currentPlant.summary)
);
document
    .querySelectorAll("#history-table th[data-sort-key] button")
    .forEach((button) =>
        button.addEventListener("click", () => {
            const header = button.closest("th");
            const key = header.dataset.sortKey;
            historySort = {
                direction:
                    historySort.key === key &&
                    historySort.direction === "ascending"
                        ? "descending"
                        : "ascending",
                key,
                type: header.dataset.sortType || "text",
            };
            renderHistory();
        })
    );
document
    .querySelector("#export-history")
    .addEventListener("click", exportHistory);
loadPlant();
