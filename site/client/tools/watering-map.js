import { sourceReadLabel } from "../../../docs/layouts/plant-sheet-cache.js";
import {
    getRequiredElement,
    getSavedCollectionData,
    loadCollectionSnapshot,
} from "../../../docs/layouts/plant-tracker-data.js";
import { buildWateringMap } from "./watering-map-data.js";
import { renderWateringMapSvg } from "./watering-map-svg.js";

/** @typedef {import("./watering-map-data.js").PotPlacement} PotPlacement */
/** @typedef {Awaited<ReturnType<typeof loadCollectionSnapshot>>} CollectionSnapshot */

const panel = getRequiredElement("#watering-map", HTMLElement);
const sourceStatus = getRequiredElement("#watering-map-source", HTMLElement);
const exportStatus = getRequiredElement(
    "#watering-map-export-status",
    HTMLElement
);
const preview = getRequiredElement("#watering-map-image", HTMLImageElement);
const potList = getRequiredElement("#watering-map-pot-list", HTMLUListElement);
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
/**
 * @type {{
 *     snapshot: CollectionSnapshot | null;
 *     lastAttempt: number;
 *     isExportBusy: boolean;
 *     previewUrl: string;
 *     sourceState: string;
 *     sourceMessage: string;
 * }}
 */
const state = {
    isExportBusy: false,
    lastAttempt: 0,
    previewUrl: "",
    snapshot: getSavedCollectionData(),
    sourceMessage: "Saved preview · refreshing published observations.",
    sourceState: "saved",
};

/** @param {CollectionSnapshot} next */
function applySnapshot(next) {
    state.snapshot = next;
    state.sourceState = "live";
    state.sourceMessage = "Published observations loaded.";
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
        !state.snapshot ||
        (Date.now() - state.snapshot.readAt <= maximumAge &&
            state.snapshot.readAt <= Date.now())
    ) {
        return;
    }

    state.snapshot = null;
    state.sourceState = "error";
    state.sourceMessage =
        "Saved data expired after 24 hours. Refresh data to generate a current image.";
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
    const model = buildWateringMap(
        placements,
        state.snapshot.collection.history
    );
    const svg = new Blob(
        [
            renderWateringMapSvg(model, {
                readAt: state.snapshot.readAt,
                status: state.sourceMessage,
            }),
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
        context.fillStyle = "#ffffff";
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

async function refresh() {
    if (refreshButton.disabled) return;
    state.lastAttempt = Date.now();
    setRefreshBusy(true);
    state.sourceState = "saved";
    state.sourceMessage = state.snapshot
        ? "Saved preview · refreshing published observations."
        : "Loading published watering observations…";
    render();
    try {
        const freshSnapshot = await loadCollectionSnapshot();
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

function render() {
    expireSnapshot();
    sourceStatus.dataset["state"] = state.sourceState;
    sourceStatus.textContent = state.snapshot
        ? `${state.sourceMessage} Source read ${sourceReadLabel(state.snapshot.readAt)}. Published Sheets data may lag recent saves.`
        : state.sourceMessage;
    pngButton.disabled = state.snapshot === null || state.isExportBusy;
    svgButton.disabled = state.snapshot === null || state.isExportBusy;
    const previousUrl = state.previewUrl;
    state.previewUrl = "";
    if (state.snapshot) {
        const model = buildWateringMap(
            placements,
            state.snapshot.collection.history
        );
        const svg = renderWateringMapSvg(model, {
            readAt: state.snapshot.readAt,
            status: state.sourceMessage,
        });
        state.previewUrl = URL.createObjectURL(
            new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
        );
        preview.src = state.previewUrl;
        preview.hidden = false;
        preview.alt = `Recorded table placements with days since watering as of ${model.date}. Equivalent details follow below.`;
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
        preview.hidden = true;
        preview.removeAttribute("src");
        potList.replaceChildren();
    }
    if (previousUrl) URL.revokeObjectURL(previousUrl);
}

/** @param {boolean} busy */
function setExportBusy(busy) {
    state.isExportBusy = busy;
}

/** @param {boolean} busy */
function setRefreshBusy(busy) {
    refreshButton.disabled = busy;
    refreshButton.textContent = busy ? "Refreshing…" : "Refresh data";
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
    enlargeButton.textContent = isEnlarged ? "Fit image" : "Enlarge image";
});
window.addEventListener("focus", refreshIfDue);
document.addEventListener("visibilitychange", refreshIfDue);
setInterval(refreshIfDue, 60_000);
void refresh();
