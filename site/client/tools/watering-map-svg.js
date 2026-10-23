import { sourceReadLabel } from "../../../docs/layouts/plant-sheet-cache.js";

/**
 * @typedef {ReturnType<
 *     typeof import("./watering-map-data.js").buildWateringMap
 * >} WateringMap
 */

/**
 * Standalone vectors have their own colors and fonts: no external images,
 * stylesheets, page theme, or network requests are needed to export a PNG.
 *
 * @param {WateringMap} model
 * @param {{ readAt: number | null; status: string }} source
 */
export function renderWateringMapSvg(model, { readAt, status }) {
    const otherCount = model.markers.filter(
        (marker) => marker.zone === "other"
    ).length;
    const height = 1380 + Math.ceil(otherCount / 4) * 130;
    const text = (
        /** @type {number} */ x,
        /** @type {number} */ y,
        /** @type {string | number} */ value,
        className = "",
        anchor = "start"
    ) =>
        `<text x="${x}" y="${y}" class="${className}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
    const markers = model.markers
        .map((marker) => {
            const { x, y } = marker;
            const isOutside = marker.zone === "other";
            const count = marker.days === null ? "?" : String(marker.days);
            const watering =
                marker.days === null
                    ? "No recorded Water event"
                    : `${marker.days} calendar days since Water on ${marker.lastWater ?? "unknown date"}`;
            const location =
                marker.currentLocation === ""
                    ? ""
                    : ` Latest logged location: ${marker.currentLocation}.`;
            const description = `${marker.label} / ${marker.id}: ${marker.name}. ${marker.position}. ${watering}.${location}`;
            const shape = isOutside
                ? `<rect x="${x - 100}" y="${y - 40}" width="200" height="112" rx="14" class="pot outside"/>`
                : marker.id === "P20"
                  ? `<rect x="${x - 61}" y="${y - 61}" width="122" height="122" rx="12" class="pot"/>`
                  : `<circle cx="${x}" cy="${y}" r="${marker.zone === "front" ? 54 : 61}" class="pot"/>`;
            return `<g data-pot-id="${escapeXml(marker.id)}"><title>${escapeXml(description)}</title>${shape}
            ${text(x, y + (isOutside ? 0 : 7), count, marker.days === null ? "count unknown" : "count", "middle")}
            ${text(x, y + (isOutside ? 22 : 29), `${marker.label} · ${marker.id}`, "identity", "middle")}
            ${text(x, y + (isOutside ? 42 : marker.zone === "front" ? 68 : 78), shortText(marker.name, isOutside ? 25 : marker.zone === "front" ? 18 : 27), "name", "middle")}
            ${isOutside ? text(x, y + 61, shortText(marker.position, 30), "location", "middle") : ""}
        </g>`;
        })
        .join("");
    const sourceText =
        readAt === null
            ? "Waiting for published watering history"
            : `Source read: ${sourceReadLabel(readAt)}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}" role="img" aria-labelledby="watering-map-title watering-map-description">
        <title id="watering-map-title">Days since watering — ${escapeXml(model.date)}</title>
        <desc id="watering-map-description">Recorded table positions, viewed from the room. North window at top, Mylar left, white wall right. Numbers are calendar days since each pot's latest active Water record. Question mark means no recorded watering. Off-grid pots are listed separately. ${escapeXml(status)}. ${escapeXml(sourceText)}.</desc>
        <style>
            text { font-family: Arial, Helvetica, sans-serif; fill: #234334; }
            .heading { font-size: 34px; font-weight: 700; }
            .subtitle { font-size: 18px; }
            .meta { font-size: 15px; fill: #526859; }
            .zone { font-size: 17px; font-weight: 700; letter-spacing: 1px; }
            .note { font-size: 14px; fill: #526859; }
            .surface { fill: #e7ede2; stroke: #b9c8b3; stroke-width: 2; }
            .divider { stroke: #b9c8b3; stroke-width: 2; stroke-dasharray: 7 7; }
            .pot { fill: #fffef8; stroke: #5b7b60; stroke-width: 2; }
            .outside { fill: #f5f3ec; stroke: #c1cbbb; }
            .count { font-size: 40px; font-weight: 700; }
            .unknown { fill: #788575; }
            .identity { font-size: 15px; font-weight: 700; }
            .name { font-size: 13px; }
            .location { font-size: 11px; fill: #526859; }
        </style>
        <rect width="1000" height="${height}" fill="#fffef8"/>
        ${text(48, 57, "Days since watering", "heading")}
        ${text(48, 88, `${model.date} · Calendar days in America/New_York`, "subtitle")}
        ${text(48, 116, sourceText, "meta")}
        ${text(48, 140, shortText(status, 112), "meta")}
        <rect x="92" y="165" width="816" height="45" rx="18" class="surface"/>
        ${text(500, 194, "REAR TABLES · NORTH WINDOW", "zone", "middle")}
        <rect x="92" y="220" width="816" height="425" rx="18" class="surface"/>
        <path d="M500 220V645" class="divider"/>
        <rect x="92" y="663" width="816" height="530" rx="18" class="surface"/>
        <path d="M500 663V1193" class="divider"/>
        ${[
            4,
            3,
            2,
            1,
        ]
            .map((row, index) =>
                text(75, 735 + index * 126, `R${row}`, "note", "end")
            )
            .join("")}
        ${[
            1,
            2,
            3,
            4,
            5,
            6,
        ]
            .map((column, index) =>
                text(170 + index * 132, 660, `C${column}`, "note", "middle")
            )
            .join("")}
        <text transform="translate(28 940) rotate(-90)" text-anchor="middle" class="zone">MYLAR · LEFT</text>
        <text transform="translate(968 940) rotate(90)" text-anchor="middle" class="zone">WHITE WALL · RIGHT</text>
        ${text(500, 1224, "FRONT TABLES · OPEN ROOM / VIEWER", "zone", "middle")}
        ${text(70, 1253, "OTHER LOCATIONS / PLACEMENT UNCONFIRMED", "zone")}
        ${markers}
        ${text(48, height - 81, "? = no recorded Water event. Counts describe history, not when to water.", "meta")}
        ${text(48, height - 56, "Recorded arrangement; schematic spacing. A logged Move does not assign a new grid slot.", "note")}
        ${text(48, height - 31, "Published Sheet data can lag workbook edits. Check the source time before using a saved image.", "note")}
    </svg>`;
}

/** @param {string | number} value */
function escapeXml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

/** @param {string} value @param {number} maximum */
function shortText(value, maximum) {
    return value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;
}
