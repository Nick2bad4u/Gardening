import {
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
import { renderIntervalChart, renderLineChart } from "./plant-charts.js";

const requestedId = new URLSearchParams(location.search).get("id");
const tableBody = document.querySelector("#history-table tbody");
const searchInput = document.querySelector("#history-search");
const eventFilter = document.querySelector("#history-event-filter");
const chartRange = document.querySelector("#chart-range");
let currentPlant = null;

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
    cell.textContent =
        value === "" || value === null || value === undefined
            ? "—"
            : String(value);
    if (className) cell.className = className;
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
    const events = sortedEvents(visibleEvents());
    if (events.length === 0) {
        const row = document.createElement("tr");
        const cell = tableCell(
            currentPlant?.events.length
                ? "No observations match the current filters."
                : "No observations have been logged for this plant yet.",
            "loading-cell"
        );
        cell.colSpan = 11;
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
            row.append(tableCell(event["Condition / soil"], "condition-cell"));
            row.append(tableCell(event.Notes, "notes-cell"));
            row.append(tableCell(formatDate(event["Water cycle start"])));
            row.append(tableCell(event["Days after water"]));
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
            ? "Needs 2 dated heights"
            : `${formatSigned(summary.heightChange, "cm")} across ${summary.heightSeries.length} readings`
    );
    setTrendCard(
        "#width-trend",
        "#width-trend-detail",
        summary.widthMonthlyRate === null
            ? "—"
            : `${formatSigned(summary.widthMonthlyRate, "cm")}/mo`,
        summary.widthChange === null
            ? "Needs 2 dated widths"
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
        ariaLabel: `Height and width history for ${plantLabel(currentPlant)}`,
        emptyMessage: "No height or width readings in this chart range yet.",
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
            ? `${heightPoints.length} height and ${widthPoints.length} width readings shown.`
            : "Height and width can be logged independently."
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
}

function csvCell(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportHistory() {
    if (!currentPlant) return;
    const headers = [
        "Date",
        "Plant ID",
        "Event",
        "Weight state",
        "Weight (g)",
        "Height (cm)",
        "Width (cm)",
        "Condition / soil",
        "Notes",
        "Recorded",
        "Pot setup",
        "Pot label at entry",
        "Plant / planter",
        "Water cycle start",
        "Days after water",
    ];
    const rows = sortedEvents(currentPlant.events, false).map((event) =>
        headers.map((header) => csvCell(event[header])).join(",")
    );
    const blob = new Blob(
        [`\uFEFF${headers.map(csvCell).join(",")}\r\n${rows.join("\r\n")}\r\n`],
        { type: "text/csv;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentPlant["Plant ID"]}-${plantLabel(currentPlant).replaceAll("#", "number-")}-history.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function renderPlant(plant, plants, index) {
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
        `${sheetUrls.editQuickLog}&range=A${index + 5}:L${index + 5}`;
    document.querySelector("#sheet-plant-page").href = sheetUrls.plantPage(id);

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
        const collection = await loadCollectionData();
        const normalizedRequest = requestedId?.trim().toLowerCase();
        const index = collection.plants.findIndex(
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
        renderPlant(collection.plants[index], collection.plants, index);
    } catch (error) {
        setText("#plant-label", "Plant not found");
        setText("#plant-name", "This history page could not load");
        setText("#page-status", error.message);
        const row = document.createElement("tr");
        const cell = tableCell(error.message, "loading-cell error-cell");
        cell.colSpan = 11;
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
    .querySelector("#export-history")
    .addEventListener("click", exportHistory);
loadPlant();
