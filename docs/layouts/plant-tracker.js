import {
    comparePlantsByNaturalLabel,
    dayColor,
    daysSince,
    displayValue,
    formatDate,
    formatMeasurement,
    getRequiredElement,
    historyPageUrl,
    installThemeToggle,
    loadCollectionData,
    parseDate,
    plantLabel,
} from "./plant-tracker-data.js";

/** @typedef {Awaited<ReturnType<typeof loadCollectionData>>} CollectionData */
/** @typedef {CollectionData["plants"][number]} CollectionPlant */
/** @typedef {import("./plant-tracker-data.js").HistoryEvent} HistoryEvent */

const tableBody = getRequiredElement(
    "#tracker-table tbody",
    HTMLTableSectionElement
);
const status = getRequiredElement("#sheet-status", HTMLElement);
const refreshButton = getRequiredElement("#refresh-sheet", HTMLButtonElement);
const searchInput = getRequiredElement("#tracker-search", HTMLInputElement);
const baselineFilter = getRequiredElement(
    "#baseline-filter",
    HTMLSelectElement
);
const sortSelect = getRequiredElement("#tracker-sort", HTMLSelectElement);
const sheetPanel = getRequiredElement(".sheet-panel", HTMLElement);
const maximizeButton = getRequiredElement("#maximize-table", HTMLButtonElement);
const maximizeLabel = getRequiredElement("#maximize-label", HTMLElement);
const sortHeaders = [
    ...document.querySelectorAll("#tracker-table th[data-sort]"),
].filter((header) => header instanceof HTMLTableCellElement);
/** @type {{ collection: CollectionData | null; sortDirection: string }} */
const state = { collection: null, sortDirection: "asc" };

/**
 * @param {unknown} value
 * @param {string} unit
 * @param {HistoryEvent | undefined} event
 */
function datedValue(value, unit, event) {
    const container = element("div", undefined, "dated-value");
    container.append(element("strong", formatMeasurement(value, unit)));
    container.append(
        element(
            "small",
            event ? `Checked ${formatDate(event["Date"])}` : "Not checked yet"
        )
    );
    return container;
}

/**
 * @template {Exclude<keyof HTMLElementTagNameMap, "script">} T
 *
 * @param {T} tagName
 * @param {string | number | undefined} [text]
 * @param {string | undefined} [className]
 */
function element(tagName, text, className) {
    const node = document.createElement(tagName);
    if (text !== undefined) node.append(document.createTextNode(String(text)));
    if (className !== undefined && className !== "") node.className = className;
    return node;
}

/** @param {CollectionPlant} plant */
function latestActivityTime(plant) {
    return parseDate(plant.summary.latestActivity?.["Date"])?.getTime() ?? 0;
}

async function loadData() {
    refreshButton.disabled = true;
    status.textContent = "Loading the latest Google Sheets observations…";
    try {
        state.collection = await loadCollectionData();
        renderStats();
        renderTable();
        status.textContent = `${state.collection.plants.length} containers and ${state.collection.history.length} observations loaded from Google Sheets.`;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const row = document.createElement("tr");
        const cell = element(
            "td",
            `Live data unavailable: ${message}`,
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

/**
 * @param {CollectionPlant} plant
 * @param {boolean} [isLabelOnly]
 */
function plantLink(plant, isLabelOnly = false) {
    const link = element("a", isLabelOnly ? plantLabel(plant) : undefined);
    link.href = historyPageUrl(plant["Plant ID"]);
    link.title = `${plantLabel(plant)} · permanent ID ${plant["Plant ID"]}`;
    if (!isLabelOnly) {
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

/** @param {CollectionPlant} plant */
function renderRow(plant) {
    const row = document.createElement("tr");
    const summary = plant.summary;
    const lastWaterDate = summary.lastWater?.["Date"] ?? "";
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

    const trendCell = weightTrendCell(summary);
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

    const rotationCell = element("td");
    if (summary.latestRotation) {
        rotationCell.append(
            element(
                "strong",
                `${displayValue(summary.latestRotation["Rotation (°)"], "90")}°`
            ),
            element(
                "small",
                `Rotated ${formatDate(summary.latestRotation["Date"])}`
            )
        );
    } else {
        rotationCell.append(element("span", "Not logged", "trend-muted"));
    }
    row.append(rotationCell);

    row.append(
        element(
            "td",
            displayValue(
                summary.latestCondition?.["Condition / soil"],
                "Not logged"
            ),
            "condition-cell"
        )
    );
    row.append(
        element("td", formatDate(summary.latestActivity?.["Date"] ?? ""))
    );

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

function renderStats() {
    if (!state.collection) return;
    const ready = state.collection.plants.filter(
        (plant) => plant.summary.baselineStatus === "Ready"
    ).length;
    const latest = state.collection.plants
        .map((plant) => plant.summary.latestActivity?.["Date"] ?? "")
        .toSorted(
            (left, right) =>
                (parseDate(right)?.getTime() ?? 0) -
                (parseDate(left)?.getTime() ?? 0)
        )[0];
    getRequiredElement("#container-count", HTMLElement).textContent = String(
        state.collection.plants.length
    );
    getRequiredElement("#observation-count", HTMLElement).textContent = String(
        state.collection.history.length
    );
    getRequiredElement("#baseline-count", HTMLElement).textContent =
        `${ready} / ${state.collection.plants.length}`;
    getRequiredElement("#latest-activity", HTMLElement).textContent =
        formatDate(latest);
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
    tableBody.replaceChildren(...plants.map((plant) => renderRow(plant)));
}

/**
 * @param {boolean} maximized
 */
function setMaximized(maximized) {
    sheetPanel.classList.toggle("is-maximized", maximized);
    document.body.classList.toggle("table-maximized", maximized);
    maximizeButton.setAttribute("aria-pressed", String(maximized));
    maximizeLabel.textContent = maximized ? "Restore page" : "Maximize table";
    if (maximized) {
        getRequiredElement("#tracker-table-wrap", HTMLElement).focus();
    }
}

/**
 * @param {string} key
 */
function setSort(key, shouldToggleDirection = false) {
    if (shouldToggleDirection && sortSelect.value === key) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    } else {
        sortSelect.value = key;
        state.sortDirection = ["activity", "water"].includes(key)
            ? "desc"
            : "asc";
    }
    updateSortHeaders();
    if (state.collection) renderTable();
}

function updateSortHeaders() {
    for (const header of sortHeaders) {
        const isActive = header.dataset["sort"] === sortSelect.value;
        header.setAttribute(
            "aria-sort",
            isActive
                ? state.sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                : "none"
        );
    }
}

function visiblePlants() {
    if (!state.collection) return [];
    const query = searchInput.value.trim().toLowerCase();
    const filter = baselineFilter.value;
    const plants = state.collection.plants.filter((plant) => {
        const isMatchesQuery = [
            plant["Plant ID"],
            plantLabel(plant),
            plant["Plant / planter"],
            plant["Scientific name / contents"],
        ].some((value) => value.toLowerCase().includes(query));
        const isMatchesFilter =
            filter === "all" ||
            (filter === "needs-baseline" &&
                plant.summary.baselineStatus !== "Ready") ||
            (filter === "has-weight" &&
                plant.summary.latestWeightValue !== null);
        return isMatchesQuery && isMatchesFilter;
    });

    const collator = new Intl.Collator("en", {
        numeric: true,
        sensitivity: "base",
    });
    const sorted = plants.toSorted((left, right) => {
        if (sortSelect.value === "water") {
            return (
                (daysSince(left.summary.lastWater?.["Date"] ?? "") ?? -1) -
                (daysSince(right.summary.lastWater?.["Date"] ?? "") ?? -1)
            );
        }
        if (sortSelect.value === "activity") {
            return latestActivityTime(left) - latestActivityTime(right);
        }
        if (sortSelect.value === "water-date") {
            return lastWaterTime(left) - lastWaterTime(right);
        }
        if (sortSelect.value === "weight") {
            return (
                (left.summary.latestWeightValue ?? -Infinity) -
                (right.summary.latestWeightValue ?? -Infinity)
            );
        }
        if (sortSelect.value === "name") {
            return collator.compare(
                left["Plant / planter"],
                right["Plant / planter"]
            );
        }
        return comparePlantsByNaturalLabel(left, right);
    });
    return state.sortDirection === "desc" ? sorted.toReversed() : sorted;
}

installThemeToggle(getRequiredElement("#theme-toggle", HTMLButtonElement));
refreshButton.addEventListener("click", refreshData);
searchInput.addEventListener("input", renderTable);
baselineFilter.addEventListener("change", renderTable);
sortSelect.addEventListener("change", changeSort);
for (const header of sortHeaders) {
    const button = header.querySelector("button");
    if (button instanceof HTMLButtonElement)
        button.addEventListener("click", changeHeaderSort);
}
maximizeButton.addEventListener("click", toggleMaximized);
document.addEventListener("keydown", handleEscape);
updateSortHeaders();
await loadData();

/** @param {Event} event */
function changeHeaderSort(event) {
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) return;
    const header = button.closest("th");
    if (!(header instanceof HTMLTableCellElement)) return;
    const key = header.dataset["sort"];
    if (key !== undefined && key !== "") setSort(key, true);
}

function changeSort() {
    setSort(sortSelect.value);
}

/** @param {KeyboardEvent} event */
function handleEscape(event) {
    if (
        event.key !== "Escape" ||
        !sheetPanel.classList.contains("is-maximized")
    )
        return;
    setMaximized(false);
    maximizeButton.focus();
}

/** @param {CollectionPlant} plant */
function lastWaterTime(plant) {
    return parseDate(plant.summary.lastWater?.["Date"])?.getTime() ?? 0;
}

function refreshData() {
    void loadData();
}

function toggleMaximized() {
    setMaximized(!sheetPanel.classList.contains("is-maximized"));
}

/** @param {CollectionPlant["summary"]} summary */
function weightTrendCell(summary) {
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
    return trendCell;
}
