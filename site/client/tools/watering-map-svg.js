import { sourceReadLabel } from "../../../docs/layouts/plant-sheet-cache.js";

/**
 * @typedef {ReturnType<
 *     typeof import("./watering-map-data.js").buildWateringMap
 * >} WateringMap
 */

/** @typedef {{ definitions: string; portraits: Record<string, string> }} WateringArtwork */
const emptyArtwork = { definitions: "", portraits: {} };

/**
 * Standalone vectors have their own colors and fonts: no external images,
 * stylesheets, page theme, or network requests are needed to export a PNG.
 *
 * @param {WateringMap} model
 * @param {{ readAt: number | null; status: string }} source
 * @param {WateringArtwork} [artwork] Trusted build-time artwork only.
 */
export function renderWateringMapSvg(
    model,
    { readAt, status },
    artwork = emptyArtwork
) {
    const otherCount = model.markers.filter(
        (marker) => marker.zone === "other"
    ).length;
    const recordedCount = model.markers.filter(
        (marker) => marker.days !== null
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
    const icon = (
        /** @type {string} */ name,
        /** @type {number} */ x,
        /** @type {number} */ y,
        size = 26
    ) =>
        artwork.definitions === ""
            ? ""
            : `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><use href="#wm-art-ui-${name}"/></svg>`;
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
                ? `<rect x="${x - 100}" y="${y - 40}" width="200" height="125" rx="14" class="pot outside"/>`
                : marker.id === "P20"
                  ? `<rect x="${x - 61}" y="${y - 61}" width="122" height="122" rx="12" class="pot"/>`
                  : `<circle cx="${x}" cy="${y}" r="${marker.zone === "front" ? 54 : 61}" class="pot"/>`;
            const slug = artwork.portraits[marker.id];
            const portrait =
                slug !== undefined &&
                slug !== "" &&
                /^[a-z][\w\-]*$/v.test(slug)
                    ? `<svg x="${x - 47}" y="${y - 36}" width="44" height="44" viewBox="0 0 64 64" data-plant-slug="${slug}" aria-hidden="true"><use href="#wm-art-plant-${slug}"/></svg>`
                    : "";
            const nameLines = wrapText(
                marker.name,
                isOutside ? 26 : marker.zone === "front" ? 18 : 28
            );
            return `<g data-pot-id="${escapeXml(marker.id)}" class="${marker.days === null ? "unrecorded" : "recorded"}"><title>${escapeXml(description)}</title>${shape}${portrait}
            ${text(portrait ? x + 20 : x, y, count, marker.days === null ? "count unknown" : "count", "middle")}
            ${text(x, y + 21, `${marker.label} · ${marker.id}`, "identity", "middle")}
            <text x="${x}" y="${y + (isOutside ? 42 : marker.zone === "front" ? 39 : 78)}" class="name" text-anchor="middle">${nameLines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : 12}">${escapeXml(line)}${index < nameLines.length - 1 ? " " : ""}</tspan>`).join("")}</text>
            ${isOutside ? text(x, y + 74, marker.position, "location", "middle") : ""}
        </g>`;
        })
        .join("");
    const sourceText =
        readAt === null
            ? "Waiting for published watering history"
            : `Source read: ${sourceReadLabel(readAt)}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="wm-svg" data-watering-map="" width="1000" height="${height}" viewBox="0 0 1000 ${height}" role="img" aria-labelledby="watering-map-svg-title watering-map-svg-description" data-color-scheme="dark">
        <title id="watering-map-svg-title">Days since watering — ${escapeXml(model.date)}</title>
        <desc id="watering-map-svg-description">Recorded table positions, viewed from the room. North window at top, Mylar left, white wall right. Numbers are calendar days since each pot's latest active Water record. Question mark means no recorded watering. Off-grid pots are listed separately. ${escapeXml(status)}. ${escapeXml(sourceText)}.</desc>
        <defs>${artwork.definitions}</defs>
        <style>
            .wm-svg text { font-family: Arial, Helvetica, sans-serif; fill: #e2efe6; }
            .wm-svg .heading { font-size: 34px; font-weight: 700; }
            .wm-svg .subtitle { font-size: 18px; fill: #c2d5c8; }
            .wm-svg .meta { font-size: 15px; fill: #a6bdb0; }
            .wm-svg .zone { font-size: 17px; font-weight: 700; letter-spacing: 1px; }
            .wm-svg .note { font-size: 14px; fill: #a6bdb0; }
            .wm-svg .surface { fill: #101f1a; stroke: #344d40; stroke-width: 2; }
            .wm-svg .window { fill: #183a32; stroke: #46745c; stroke-width: 2; }
            .wm-svg .divider { stroke: #344d40; stroke-width: 2; stroke-dasharray: 7 7; }
            .wm-svg .pot { fill: #172c25; stroke: #79ad8d; stroke-width: 2; }
            .wm-svg .outside { fill: #13271f; }
            .wm-svg .unrecorded .pot { fill: #1b2523; stroke: #82988c; stroke-dasharray: 5 5; }
            .wm-svg .count { font-size: 36px; font-weight: 700; fill: #d1f7df; }
            .wm-svg .unknown { fill: #adbbb3; }
            .wm-svg .identity { font-size: 15px; font-weight: 700; fill: #c8d9ce; }
            .wm-svg .name { font-size: 11px; fill: #c2d5c8; }
            .wm-svg .location { font-size: 11px; fill: #a6bdb0; }
            .wm-svg .total { font-size: 16px; font-weight: 700; fill: #b6ebcc; }
        </style>
        <rect width="1000" height="${height}" fill="#0c1815" data-map-background=""/>
        ${icon("water", 42, 28, 36)}
        ${text(88, 57, "Days since watering", "heading")}
        ${icon("plant", 827, 30, 30)}
        ${text(952, 55, `${model.markers.length} POTS`, "total", "end")}
        ${icon("calendar", 48, 70, 22)}
        ${text(78, 88, `${model.date} · Calendar days in America/New_York`, "subtitle")}
        ${icon("clock", 48, 99, 22)}
        ${text(78, 116, sourceText, "meta")}
        ${text(48, 140, shortText(status, 112), "meta")}
        <rect x="92" y="165" width="816" height="45" rx="18" class="window"/>
        ${icon("light", 302, 175, 24)}
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
        ${icon("pin", 42, 1231, 26)}
        ${text(78, 1253, "OTHER LOCATIONS / PLACEMENT UNCONFIRMED", "zone")}
        ${markers}
        ${text(48, height - 105, `${recordedCount} with Water records · ${model.markers.length - recordedCount} without · dashed outline = no recorded Water`, "meta")}
        ${icon("info", 48, height - 98, 22)}
        ${text(78, height - 81, "? = no recorded Water event. Counts describe history, not when to water.", "meta")}
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

/**
 * Keep complete visible names in SVG text so browser Find can search them.
 *
 * @param {string} value @param {number} maximum
 */
function wrapText(value, maximum) {
    /** @type {string[]} */
    const lines = [];
    let line = "";
    for (const word of value.split(/\s+/v)) {
        if (line && line.length + word.length + 1 > maximum) {
            lines.push(line);
            line = word;
        } else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    return lines;
}
