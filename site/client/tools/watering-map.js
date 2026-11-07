import { sourceReadLabel } from "../../../docs/layouts/plant-sheet-cache.js";
import { getRequiredElement } from "../../../docs/layouts/plant-tracker-data.js";
import {
    buildWateringMap,
    wateringAgeColor,
    wateringNutrientLabel,
} from "./watering-map-data.js";
import {
    getSavedWateringMapData,
    isWateringFeedError,
    loadWateringMapSnapshot,
} from "./watering-map-feed.js";
import { decodeWateringSnapshot } from "./watering-map-snapshot.js";
import { renderWateringMapSvg } from "./watering-map-svg.js";

/** @typedef {import("./watering-map-data.js").PotPlacement} PotPlacement */
/** @typedef {Awaited<ReturnType<typeof loadWateringMapSnapshot>>} HistorySnapshot */

const panel = getRequiredElement("#watering-map", HTMLElement);
const sourceStatus = getRequiredElement("#watering-map-source", HTMLElement);
const exportStatus = getRequiredElement(
    "#watering-map-export-status",
    HTMLElement
);
const preview = getRequiredElement("#watering-map-image", HTMLDivElement);
const refreshLabel = getRequiredElement(
    "#watering-map-refresh-label",
    HTMLElement
);
const enlargeLabel = getRequiredElement(
    "#watering-map-enlarge-label",
    HTMLElement
);
const potList = getRequiredElement("#watering-map-pot-list", HTMLUListElement);
const totalCount = getRequiredElement("#watering-map-total-count", HTMLElement);
const recordedCount = getRequiredElement(
    "#watering-map-recorded-count",
    HTMLElement
);
const unknownCount = getRequiredElement(
    "#watering-map-unknown-count",
    HTMLElement
);
const refreshButton = getRequiredElement(
    "#watering-map-refresh",
    HTMLButtonElement
);
const pngButton = getRequiredElement("#watering-map-png", HTMLButtonElement);
const svgButton = getRequiredElement("#watering-map-svg", HTMLButtonElement);
const enlargeButton = getRequiredElement(
    "#watering-map-enlarge",
    HTMLButtonElement
);
const refreshInterval = 5 * 60 * 1000;
const slowRefreshDelay = 10_000;
const maximumAge = 24 * 60 * 60 * 1000;
/** @type {unknown} */
const placementData = JSON.parse(panel.dataset["placements"] ?? "[]");
const placements = Array.isArray(placementData)
    ? placementData.filter((value) => isPlacement(value))
    : [];
// This is validated canonical vector artwork emitted by the static build, never
// content read from a Sheet. Dynamic text is escaped by the SVG renderer.
/** @type {unknown} */
const artworkData = JSON.parse(
    panel.dataset["artwork"] ?? '{"definitions":"","portraits":{}}'
);
const artwork = isWateringArtwork(artworkData)
    ? artworkData
    : { definitions: "", portraits: {} };

/**
 * @param {unknown} value @returns {value is
 *   import("./watering-map-svg.js").WateringArtwork}
 */
function isWateringArtwork(value) {
    if (
        typeof value !== "object" ||
        value === null ||
        !("definitions" in value) ||
        !("portraits" in value)
    )
        return false;
    if (
        typeof value.definitions !== "string" ||
        typeof value.portraits !== "object" ||
        value.portraits === null
    )
        return false;
    return Object.values(value.portraits).every(
        (slug) => typeof slug === "string" && /^[a-z][\w\-]*$/v.test(slug)
    );
}
const publishedSnapshot = readEmbeddedSnapshot();
const savedSnapshot = getSavedWateringMapData();
const useSavedSnapshot =
    savedSnapshot !== null &&
    (publishedSnapshot === null ||
        savedSnapshot.readAt > publishedSnapshot.readAt);
/**
 * @type {{
 *     snapshot: HistorySnapshot | null;
 *     lastAttempt: number;
 *     isExportBusy: boolean;
 *     reconnectRetryUsed: boolean;
 *     sourceState: string;
 *     sourceMessage: string;
 *     sourceKind: "published" | "saved" | "live";
 * }}
 */
const state = {
    isExportBusy: false,
    lastAttempt: 0,
    reconnectRetryUsed: false,
    snapshot: useSavedSnapshot ? savedSnapshot : publishedSnapshot,
    sourceKind: useSavedSnapshot ? "saved" : "published",
    sourceMessage:
        "Loading watering observations. Counts hidden until data loads.",
    sourceState: "saved",
};
const renderCache = { signature: "" };

/** @param {HistorySnapshot} next */
function applySnapshot(next) {
    state.snapshot = next;
    state.sourceKind = "live";
    state.sourceState = "live";
    state.sourceMessage = "Published observations loaded.";
}

/** @param {HistorySnapshot} snapshot */
function canDownloadSnapshot(snapshot) {
    expireSnapshot();
    return canShowCounts() && state.snapshot === snapshot;
}

function canShowCounts() {
    return (
        state.snapshot !== null &&
        state.sourceKind === "live" &&
        state.sourceState === "live"
    );
}

function createMapModel() {
    const history = canShowCounts() ? (state.snapshot?.history ?? []) : [];
    return buildWateringMap(placements, history);
}

/** @param {string} text @param {"strong" | "span"} [tag] */
function detailText(text, tag = "span") {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
}

/** @param {Blob} blob @param {string} filename */
function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 30_000);
}

/** Recheck the lifetime even when this tab has stayed open overnight. */
function expireSnapshot() {
    if (
        state.sourceKind === "published" ||
        !state.snapshot ||
        (Date.now() - state.snapshot.readAt <= maximumAge &&
            state.snapshot.readAt <= Date.now())
    ) {
        return;
    }

    state.snapshot = publishedSnapshot;
    state.sourceKind = "published";
    state.sourceState = "error";
    state.sourceMessage =
        "Watering data expired. Counts hidden. Use Refresh data to reload.";
}

/** @param {"png" | "svg"} format */
async function exportImage(format) {
    expireSnapshot();
    if (!canShowCounts() || !state.snapshot || state.isExportBusy) {
        render();
        return;
    }
    setExportBusy(true);
    exportStatus.textContent = `Preparing ${format.toUpperCase()}…`;
    render();
    const snapshot = state.snapshot;
    const model = createMapModel();
    const svg = new Blob(
        [
            renderWateringMapSvg(
                model,
                {
                    readAt: snapshot.readAt,
                    status: state.sourceMessage,
                },
                artwork
            ),
        ],
        { type: "image/svg+xml;charset=utf-8" }
    );
    try {
        const blob = format === "png" ? await pngFromSvg(svg) : svg;
        if (!canDownloadSnapshot(snapshot)) {
            exportStatus.textContent =
                "Watering data changed while preparing the image. Refresh data before downloading.";
            return;
        }
        download(blob, `watering-placement-${model.date}.${format}`);
        exportStatus.textContent = `${format.toUpperCase()} download prepared. The image includes the source-read time and freshness status.`;
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "The image could not be exported.";
        exportStatus.textContent = `Export failed: ${message} Try again or download SVG.`;
    } finally {
        setExportBusy(false);
        render();
    }
}

/** @param {unknown} value @returns {value is PotPlacement} */
function isPlacement(value) {
    if (typeof value !== "object" || value === null) return false;
    return (
        "id" in value &&
        typeof value.id === "string" &&
        "label" in value &&
        typeof value.label === "string" &&
        "name" in value &&
        typeof value.name === "string" &&
        "position" in value &&
        typeof value.position === "string" &&
        "x" in value &&
        typeof value.x === "number" &&
        Number.isFinite(value.x) &&
        "y" in value &&
        typeof value.y === "number" &&
        Number.isFinite(value.y) &&
        "zone" in value &&
        typeof value.zone === "string" &&
        [
            "front",
            "other",
            "rear",
            "shelf",
            "sill",
        ].includes(value.zone)
    );
}

/** @param {unknown} error */
function markRefreshFailed(error) {
    state.sourceState = "error";
    state.sourceMessage = `Watering data unavailable. ${refreshFailureReason(error)} Counts hidden. Use Refresh data to retry.`;
}

/** @param {Blob} svg @returns {Promise<Blob>} */
async function pngFromSvg(svg) {
    const url = URL.createObjectURL(svg);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth * 2;
        canvas.height = image.naturalHeight * 2;
        const context = canvas.getContext("2d");
        if (!context)
            throw new Error("Image export is unavailable in this browser.");
        context.fillStyle = "#0c1815";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("The browser could not create the PNG."));
            }, "image/png");
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Decode only the reviewed snapshot embedded in this page; never cache it as a
 * live read.
 */
function readEmbeddedSnapshot() {
    try {
        /** @type {unknown} */
        const value = JSON.parse(panel.dataset["historySnapshot"] ?? "null");
        return decodeWateringSnapshot(value);
    } catch {
        return null;
    }
}

/** @param {boolean} [isReconnect] */
async function refresh(isReconnect = false) {
    if (refreshButton.disabled) return;
    if (!isReconnect) state.reconnectRetryUsed = false;
    state.lastAttempt = Date.now();
    setRefreshBusy(true);
    state.sourceState = "saved";
    state.sourceMessage =
        "Refreshing watering observations. Counts hidden until data loads.";
    render();
    const slowRefreshTimer = setTimeout(() => {
        state.sourceMessage =
            "Still waiting for the published Sheet. Counts stay hidden until data loads.";
        render();
    }, slowRefreshDelay);
    try {
        const freshSnapshot = await loadWateringMapSnapshot();
        applySnapshot(freshSnapshot);
    } catch (error) {
        markRefreshFailed(error);
    } finally {
        clearTimeout(slowRefreshTimer);
        setRefreshBusy(false);
        render();
    }
}

/** Permit one reconnect attempt after each ordinary failed refresh. */
function refreshAfterReconnect() {
    if (
        document.visibilityState !== "visible" ||
        state.sourceState !== "error" ||
        refreshButton.disabled ||
        state.reconnectRetryUsed
    )
        return;
    state.reconnectRetryUsed = true;
    void refresh(true);
}

/** @param {unknown} error */
function refreshFailureReason(error) {
    if (isWateringFeedError(error)) {
        return "The published watering data is incomplete or invalid.";
    }
    if (
        error instanceof Error &&
        ["AbortError", "TimeoutError"].includes(error.name)
    ) {
        return "The published Sheet took too long to respond.";
    }
    if (
        error instanceof TypeError ||
        (error instanceof Error && typeof error.cause === "number")
    ) {
        return "Could not reach the published Sheet.";
    }
    return "The refresh could not complete.";
}

function refreshIfDue() {
    if (document.visibilityState !== "visible") return;
    render();
    if (Date.now() - state.lastAttempt >= refreshInterval) void refresh();
}

function render() {
    expireSnapshot();
    const isAvailable = canShowCounts();
    sourceStatus.dataset["state"] = state.sourceState;
    sourceStatus.dataset["source"] = state.sourceKind;
    sourceStatus.textContent =
        isAvailable && state.snapshot
            ? `${state.sourceMessage} Source read ${sourceReadLabel(state.snapshot.readAt)}. Published Sheets data may lag recent saves.`
            : state.sourceMessage;
    pngButton.disabled = !isAvailable || state.isExportBusy;
    svgButton.disabled = !isAvailable || state.isExportBusy;
    const model = createMapModel();
    // Re-evaluate dates so future same-day observations can become eligible, but
    // preserve the existing SVG and details when their visible inputs are equal.
    const signature = JSON.stringify({
        available: isAvailable,
        model,
        readAt: isAvailable ? state.snapshot?.readAt : null,
        status: state.sourceMessage,
    });
    if (signature === renderCache.signature) return;
    const definitions = preview.querySelector(":scope > svg > defs");
    const recorded = model.markers.filter(
        (marker) => marker.days !== null
    ).length;
    totalCount.textContent = String(model.markers.length);
    recordedCount.textContent = isAvailable ? String(recorded) : "—";
    unknownCount.textContent = isAvailable
        ? String(model.markers.length - recorded)
        : "—";
    const svg = renderWateringMapSvg(
        model,
        {
            available: isAvailable,
            readAt: state.snapshot?.readAt ?? null,
            status: state.sourceMessage,
        },
        artwork,
        definitions === null
    );
    const parser = new DOMParser();
    const parsed = parser.parseFromString(svg, "image/svg+xml");
    const nextSvg = document.importNode(parsed.documentElement, true);
    if (definitions)
        nextSvg.querySelector(":scope > defs")?.replaceWith(definitions);
    preview.replaceChildren(nextSvg);
    preview.hidden = false;
    potList.replaceChildren(
        ...model.markers.map((marker) => {
            const item = document.createElement("li");
            const days = marker.days === null ? "Unknown" : String(marker.days);
            const age = detailText(
                `Days since watering: ${isAvailable ? days : "Unavailable"}`
            );
            age.className = "watering-map-age";
            if (isAvailable && marker.days !== null)
                age.style.color = wateringAgeColor(marker.days);
            const nutrients = detailText(
                `Nutrients at last Water: ${wateringNutrientLabel(marker, isAvailable)}`
            );
            nutrients.className = "watering-map-nutrients";
            if (isAvailable && marker.lastWaterNutrientsUsed !== null)
                nutrients.dataset["nutrientsUsed"] =
                    marker.lastWaterNutrientsUsed;
            item.append(
                detailText(
                    `${marker.label} · ${marker.id} · ${marker.name}`,
                    "strong"
                ),
                age,
                detailText(
                    `Last Water: ${isAvailable ? (marker.lastWater ?? "Not recorded") : "Unavailable"}`
                ),
                nutrients,
                detailText(`Recorded position: ${marker.position}`),
                detailText(
                    `Latest logged location: ${isAvailable ? marker.currentLocation || "Not recorded" : "Unavailable"}`
                )
            );
            return item;
        })
    );
    renderCache.signature = signature;
}

/** @param {boolean} busy */
function setExportBusy(busy) {
    state.isExportBusy = busy;
}

/** @param {boolean} busy */
function setRefreshBusy(busy) {
    refreshButton.disabled = busy;
    refreshLabel.textContent = busy ? "Refreshing…" : "Refresh data";
}

refreshButton.addEventListener("click", () => {
    void refresh();
});
pngButton.addEventListener("click", () => {
    void exportImage("png");
});
svgButton.addEventListener("click", () => {
    void exportImage("svg");
});
enlargeButton.addEventListener("click", () => {
    const isEnlarged = panel.dataset["enlarged"] !== "true";
    panel.dataset["enlarged"] = String(isEnlarged);
    enlargeButton.setAttribute("aria-pressed", String(isEnlarged));
    enlargeLabel.textContent = isEnlarged ? "Fit image" : "Enlarge image";
});
window.addEventListener("focus", refreshIfDue);
addEventListener("online", refreshAfterReconnect);
document.addEventListener("visibilitychange", refreshIfDue);
setInterval(refreshIfDue, 60_000);
void refresh();
