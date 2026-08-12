import {
    dayColor,
    daysSince,
    formatDate,
    formatMeasurement,
    historyPageUrl,
    installThemeToggle,
    loadCollectionData,
    parseDate,
    plantLabel,
} from "./plant-tracker-data.js";

const tableBody = document.querySelector("#tracker-table tbody");
const status = document.querySelector("#sheet-status");
const refreshButton = document.querySelector("#refresh-sheet");
const searchInput = document.querySelector("#tracker-search");
const baselineFilter = document.querySelector("#baseline-filter");
const sortSelect = document.querySelector("#tracker-sort");
let collection = null;

function element(tagName, text, className) {
    const node = document.createElement(tagName);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function datedValue(value, unit, event) {
    const container = element("div", undefined, "dated-value");
    container.append(element("strong", formatMeasurement(value, unit)));
    container.append(
        element(
            "small",
            event ? `Checked ${formatDate(event.Date)}` : "Not checked yet"
        )
    );
    return container;
}

function plantLink(plant, labelOnly = false) {
    const link = element("a", labelOnly ? plantLabel(plant) : undefined);
    link.href = historyPageUrl(plant["Plant ID"]);
    link.title = `${plantLabel(plant)} · permanent ID ${plant["Plant ID"]}`;
    if (!labelOnly) {
        link.append(element("strong", plant["Plant / planter"]));
        link.append(
            element(
                "small",
                plant["Scientific name / contents"],
                "scientific-name"
            )
        );
    }
    return link;
}

function renderRow(plant) {
    const row = document.createElement("tr");
    const summary = plant.summary;
    const lastWaterDate = summary.lastWater?.Date ?? "";
    const waterDays = daysSince(lastWaterDate);

    const idCell = element("td");
    idCell.append(plantLink(plant, true));
    row.append(idCell);

    const plantCell = element("td", undefined, "plant-name-cell");
    plantCell.append(plantLink(plant));
    row.append(plantCell);

    row.append(element("td", formatDate(lastWaterDate)));

    const daysCell = element(
        "td",
        waterDays === null ? "—" : String(waterDays),
        waterDays === null ? "" : "water-days"
    );
    if (waterDays !== null) {
        daysCell.style.backgroundColor = dayColor(waterDays);
        daysCell.title = `${waterDays} days since the recorded watering; this is not a watering deadline.`;
    }
    row.append(daysCell);

    const dryTimeCell = element(
        "td",
        plant["Est. time to dry"] || "Collecting",
        "dry-time-cell"
    );
    dryTimeCell.title =
        "Workbook estimate from established wet-to-dry weight cycles; use it as an observation, not a watering deadline.";
    row.append(dryTimeCell);

    const weightCell = element("td");
    weightCell.append(
        datedValue(
            summary.latestWeight?.["Weight (g)"] ?? "",
            "g",
            summary.latestWeight
        )
    );
    row.append(weightCell);

    const trendCell = element("td");
    if (summary.weightChange === null) {
        trendCell.append(element("span", "Needs 2 weights", "trend-muted"));
    } else {
        const value = summary.weightChange;
        const direction = value > 0 ? "up" : value < 0 ? "down" : "steady";
        const sign = value > 0 ? "+" : value < 0 ? "−" : "";
        trendCell.append(
            element(
                "strong",
                `${sign}${Math.abs(value).toFixed(1)} g`,
                `trend-chip ${direction}`
            )
        );
        trendCell.append(
            element(
                "small",
                summary.weightChangePercent === null
                    ? "from previous"
                    : `${Math.abs(summary.weightChangePercent * 100).toFixed(1)}% from previous`,
                "trend-detail"
            )
        );
    }
    row.append(trendCell);

    const heightCell = element("td");
    heightCell.append(
        datedValue(
            summary.latestHeight?.["Height (cm)"] ?? "",
            "cm",
            summary.latestHeight
        )
    );
    row.append(heightCell);

    const widthCell = element("td");
    widthCell.append(
        datedValue(
            summary.latestWidth?.["Width (cm)"] ?? "",
            "cm",
            summary.latestWidth
        )
    );
    row.append(widthCell);

    row.append(
        element(
            "td",
            summary.latestCondition?.["Condition / soil"] || "Not logged",
            "condition-cell"
        )
    );
    row.append(element("td", formatDate(summary.latestActivity?.Date ?? "")));

    const historyCell = element("td");
    const historyLink = element(
        "a",
        `${plant.events.length} entries`,
        "row-action"
    );
    historyLink.href = historyPageUrl(plant["Plant ID"]);
    historyCell.append(historyLink);
    row.append(historyCell);
    return row;
}

function latestActivityTime(plant) {
    return plant.summary.latestActivity?.Date
        ? (parseDate(plant.summary.latestActivity.Date)?.getTime() ?? 0)
        : 0;
}

function visiblePlants() {
    const query = searchInput.value.trim().toLowerCase();
    const filter = baselineFilter.value;
    const plants = collection.plants.filter((plant) => {
        const matchesQuery = [
            plant["Plant ID"],
            plantLabel(plant),
            plant["Plant / planter"],
            plant["Scientific name / contents"],
        ].some((value) => String(value).toLowerCase().includes(query));
        const matchesFilter =
            filter === "all" ||
            (filter === "needs-baseline" &&
                plant.summary.baselineStatus !== "Ready") ||
            (filter === "has-weight" &&
                plant.summary.latestWeightValue !== null);
        return matchesQuery && matchesFilter;
    });

    const collator = new Intl.Collator("en", {
        numeric: true,
        sensitivity: "base",
    });
    const labelOrder = new Map(
        collection.plants.map((plant, index) => [plant["Plant ID"], index])
    );
    return plants.sort((left, right) => {
        if (sortSelect.value === "water") {
            return (
                (daysSince(right.summary.lastWater?.Date ?? "") ?? -1) -
                (daysSince(left.summary.lastWater?.Date ?? "") ?? -1)
            );
        }
        if (sortSelect.value === "activity") {
            return latestActivityTime(right) - latestActivityTime(left);
        }
        if (sortSelect.value === "name") {
            return collator.compare(
                left["Plant / planter"],
                right["Plant / planter"]
            );
        }
        return (
            labelOrder.get(left["Plant ID"]) - labelOrder.get(right["Plant ID"])
        );
    });
}

function renderTable() {
    const plants = visiblePlants();
    if (plants.length === 0) {
        const row = document.createElement("tr");
        const cell = element(
            "td",
            "No plants match the current search and filter.",
            "loading-cell"
        );
        cell.colSpan = 12;
        row.append(cell);
        tableBody.replaceChildren(row);
        return;
    }
    tableBody.replaceChildren(...plants.map(renderRow));
}

function renderStats() {
    const ready = collection.plants.filter(
        (plant) => plant.summary.baselineStatus === "Ready"
    ).length;
    const latest = collection.plants
        .map((plant) => plant.summary.latestActivity?.Date ?? "")
        .sort(
            (left, right) =>
                (parseDate(right)?.getTime() ?? 0) -
                (parseDate(left)?.getTime() ?? 0)
        )[0];
    document.querySelector("#container-count").textContent = String(
        collection.plants.length
    );
    document.querySelector("#observation-count").textContent = String(
        collection.history.length
    );
    document.querySelector("#baseline-count").textContent =
        `${ready} / ${collection.plants.length}`;
    document.querySelector("#latest-activity").textContent = formatDate(latest);
}

async function loadData() {
    refreshButton.disabled = true;
    status.textContent = "Loading the latest Google Sheets observations…";
    try {
        collection = await loadCollectionData();
        renderStats();
        renderTable();
        status.textContent = `${collection.plants.length} containers and ${collection.history.length} observations loaded from Google Sheets.`;
    } catch (error) {
        const row = document.createElement("tr");
        const cell = element(
            "td",
            `Live data unavailable: ${error.message}`,
            "loading-cell error-cell"
        );
        cell.colSpan = 12;
        row.append(cell);
        tableBody.replaceChildren(row);
        status.textContent =
            "The published log could not load. Open Google Sheets with the button above.";
    } finally {
        refreshButton.disabled = false;
    }
}

installThemeToggle(document.querySelector("#theme-toggle"));
refreshButton.addEventListener("click", loadData);
searchInput.addEventListener("input", () => collection && renderTable());
baselineFilter.addEventListener("change", () => collection && renderTable());
sortSelect.addEventListener("change", () => collection && renderTable());
loadData();
