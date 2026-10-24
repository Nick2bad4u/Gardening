import { sourceReadLabel } from "../../../docs/layouts/plant-sheet-cache.js";
import {
    getRequiredElement,
    getSavedHistoryData,
    loadHistorySnapshot,
} from "../../../docs/layouts/plant-tracker-data.js";
import { buildWateringMap } from "./watering-map-data.js";
import { decodeWateringSnapshot } from "./watering-map-snapshot.js";
import { renderWateringMapSvg } from "./watering-map-svg.js";

/** @typedef {import("./watering-map-data.js").PotPlacement} PotPlacement */
/** @typedef {Awaited<ReturnType<typeof loadHistorySnapshot>>} HistorySnapshot */

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
const savedSnapshot = getSavedHistoryData();
const useSavedSnapshot =
    savedSnapshot !== null &&
    (publishedSnapshot === null ||
        savedSnapshot.readAt > publishedSnapshot.readAt);
/**
 * @type {{
 *     snapshot: HistorySnapshot | null;
 *     lastAttempt: number;
 *     isExportBusy: boolean;
 *     sourceState: string;
 *     sourceMessage: string;
 *     sourceKind: "published" | "saved" | "live";
 * }}
 */
const state = {
    isExportBusy: false,
    lastAttempt: 0,
    snapshot: useSavedSnapshot ? savedSnapshot : publishedSnapshot,
    sourceKind: useSavedSnapshot ? "saved" : "published",
    sourceMessage: "Saved preview · refreshing published observations.",
    sourceState: "saved",
};

/** @param {HistorySnapshot} next */
function applySnapshot(next) {
    state.snapshot = next;
    state.sourceKind = "live";
    state.sourceState = "live";
    state.sourceMessage = "Published observations loaded.";
}

/** @param {HistorySnapshot} snapshot */
function createMapModel(snapshot) {
    const asOf =
        state.sourceKind === "published"
            ? new Date(snapshot.readAt)
            : new Date();
    return buildWateringMap(placements, snapshot.history, asOf);
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
    state.sourceState = publishedSnapshot ? "saved" : "error";
    state.sourceMessage = publishedSnapshot
        ? "Saved data expired · showing published snapshot. Counts fixed at its source-read date."
        : "Saved data expired after 24 hours. Refresh data to generate a current image.";
}

/** @param {"png" | "svg"} format */
async function exportImage(format) {
    expireSnapshot();
    if (!state.snapshot || state.isExportBusy) {
        render();
        return;
    }
    setExportBusy(true);
    exportStatus.textContent = `Preparing ${format.toUpperCase()}…`;
    render();
    const model = createMapModel(state.snapshot);
    const svg = new Blob(
        [
            renderWateringMapSvg(
                model,
                {
                    readAt: state.snapshot.readAt,
                    status: state.sourceMessage,
                },
                artwork
            ),
        ],
        { type: "image/svg+xml;charset=utf-8" }
    );
    try {
        const blob = format === "png" ? await pngFromSvg(svg) : svg;
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
            "sill",
        ].includes(value.zone)
    );
}

function markRefreshFailed() {
    state.sourceState = "error";
    if (state.snapshot && state.sourceKind === "published") {
        state.sourceMessage =
            "Live refresh failed · showing published snapshot. Counts fixed at its source-read date.";
        return;
    }
    state.sourceMessage = state.snapshot
        ? "Refresh failed · showing saved observations. Use Refresh data to retry."
        : "Watering log unavailable; no saved preview is available. Use Refresh data to retry.";
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

async function refresh() {
    if (refreshButton.disabled) return;
    state.lastAttempt = Date.now();
    setRefreshBusy(true);
    state.sourceState = "saved";
    state.sourceMessage = refreshingMessage();
    render();
    try {
        const freshSnapshot = await loadHistorySnapshot();
        applySnapshot(freshSnapshot);
    } catch {
        markRefreshFailed();
    } finally {
        setRefreshBusy(false);
        render();
    }
}

function refreshIfDue() {
    if (document.visibilityState !== "visible") return;
    render();
    if (Date.now() - state.lastAttempt >= refreshInterval) void refresh();
}

function refreshingMessage() {
    if (!state.snapshot) return "Loading published watering observations…";
    if (state.sourceKind === "published") {
        return "Published snapshot · refreshing live observations. Counts fixed at its source-read date.";
    }
    return "Saved preview · refreshing published observations.";
}

function render() {
    expireSnapshot();
    sourceStatus.dataset["state"] = state.sourceState;
    sourceStatus.dataset["source"] = state.sourceKind;
    const sourceNote =
        state.sourceKind === "published"
            ? "Newer care may be missing from this dated snapshot."
            : "Published Sheets data may lag recent saves.";
    sourceStatus.textContent = state.snapshot
        ? `${state.sourceMessage} Source read ${sourceReadLabel(state.snapshot.readAt)}. ${sourceNote}`
        : state.sourceMessage;
    pngButton.disabled = state.snapshot === null || state.isExportBusy;
    svgButton.disabled = state.snapshot === null || state.isExportBusy;
    if (state.snapshot) {
        const model = createMapModel(state.snapshot);
        const recorded = model.markers.filter(
            (marker) => marker.days !== null
        ).length;
        totalCount.textContent = String(model.markers.length);
        recordedCount.textContent = String(recorded);
        unknownCount.textContent = String(model.markers.length - recorded);
        const svg = renderWateringMapSvg(
            model,
            {
                readAt: state.snapshot.readAt,
                status: state.sourceMessage,
            },
            artwork
        );
        const parser = new DOMParser();
        const parsed = parser.parseFromString(svg, "image/svg+xml");
        preview.replaceChildren(
            document.importNode(parsed.documentElement, true)
        );
        preview.hidden = false;
        potList.replaceChildren(
            ...model.markers.map((marker) => {
                const item = document.createElement("li");
                item.append(
                    detailText(
                        `${marker.label} · ${marker.id} · ${marker.name}`,
                        "strong"
                    ),
                    detailText(
                        marker.days === null
                            ? "Days since watering: Unknown"
                            : `Days since watering: ${marker.days}`
                    ),
                    detailText(
                        `Last Water: ${marker.lastWater ?? "Not recorded"}`
                    ),
                    detailText(`Recorded position: ${marker.position}`),
                    detailText(
                        `Latest logged location: ${marker.currentLocation || "Not recorded"}`
                    )
                );
                return item;
            })
        );
    } else {
        totalCount.textContent = String(placements.length);
        recordedCount.textContent = "—";
        unknownCount.textContent = "—";
        preview.hidden = true;
        preview.replaceChildren();
        potList.replaceChildren();
    }
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
document.addEventListener("visibilitychange", refreshIfDue);
setInterval(refreshIfDue, 60_000);
void refresh();
