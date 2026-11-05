import { sourceReadLabel } from "../../../docs/layouts/plant-sheet-cache.js";
import { wateringAgeColor } from "./watering-map-data.js";

/**
 * @typedef {ReturnType<
 *     typeof import("./watering-map-data.js").buildWateringMap
 * >} WateringMap
 */

/** @typedef {{ definitions: string; portraits: Record<string, string> }} WateringArtwork */
const emptyArtwork = { definitions: "", portraits: {} };
const legendLabelClass = "legend-label";

/**
 * Standalone vectors have their own colors and fonts: no external images,
 * stylesheets, page theme, or network requests are needed to export a PNG.
 *
 * @param {WateringMap} model
 * @param {{ readAt: number | null; status: string; available?: boolean }} source
 * @param {WateringArtwork} [artwork] Trusted build-time artwork only.
 * @param {boolean} [includeDefinitions] Standalone exports include every
 *   definition.
 */
export function renderWateringMapSvg(
    model,
    { available: isAvailable = true, readAt, status },
    artwork = emptyArtwork,
    includeDefinitions = true
) {
    const lowerLayout = lowerPanels(model.markers);
    const recordedCount = model.markers.filter(
        (marker) => marker.days !== null
    ).length;
    const legendTop = lowerLayout.bottom + 32;
    const height = legendTop + 350;
    const text = (
        /** @type {number} */ x,
        /** @type {number} */ y,
        /** @type {string | number} */ value,
        className = "",
        anchor = "start",
        fill = ""
    ) => {
        const fillAttribute = fill ? ` fill="${escapeXml(fill)}"` : "";
        return `<text x="${x}" y="${y}" class="${className}" text-anchor="${anchor}"${fillAttribute}>${escapeXml(value)}</text>`;
    };
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
            const card = lowerLayout.cards.get(marker.id);
            const { x, y } = card ?? marker;
            const isOutside = card !== undefined;
            const watering = markerWatering(marker, isAvailable);
            const description = `${marker.label} / ${marker.id}: ${marker.name}. ${marker.position}. ${watering.description}.${watering.location}`;
            const shape = isOutside
                ? `<rect x="${x - card.width / 2}" y="${y - 40}" width="${card.width}" height="${card.height}" rx="14" class="pot outside"/>`
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
            const nameLines = (card?.nameLines ?? wrapText(marker.name, 28))
                .map(
                    (line, index, lines) =>
                        `<tspan x="${x}" dy="${index === 0 ? 0 : 14}">${escapeXml(line)}${index < lines.length - 1 ? " " : ""}</tspan>`
                )
                .join("");
            const name =
                marker.zone === "front"
                    ? ""
                    : `<text x="${x}" y="${y + (isOutside ? 42 : 78)}" class="name" text-anchor="middle">${nameLines}</text>`;
            const locationLines =
                card?.locationLines
                    .map((line, index) =>
                        text(
                            x,
                            y +
                                62 +
                                (card.nameLines.length - 1) * 14 +
                                index * 14,
                            line,
                            "location",
                            "middle"
                        )
                    )
                    .join("") ?? "";
            return `<g data-pot-id="${escapeXml(marker.id)}" data-placement-zone="${marker.zone}" class="${watering.className}"><title>${escapeXml(description)}</title>${shape}${portrait}
            ${text(portrait ? x + 20 : x, y, watering.count, watering.countClass, "middle", watering.fill)}
            ${text(x, y + 21, `${marker.label} · ${marker.id}`, "identity", "middle")}
            ${name}
            ${locationLines}
        </g>`;
        })
        .join("");
    const sourceText =
        !isAvailable || readAt === null
            ? "Waiting for published watering history"
            : `Source read: ${sourceReadLabel(readAt)}`;
    const dateText = isAvailable ? model.date : "data unavailable";
    const countDescription = isAvailable
        ? "Numbers are calendar days since each pot's latest active Water record. Question mark means no recorded watering."
        : "Watering counts are hidden until a live read succeeds. A dash means watering data is unavailable.";
    return `<svg xmlns="http://www.w3.org/2000/svg" class="wm-svg" data-watering-map="" width="1000" height="${height}" viewBox="0 0 1000 ${height}" role="img" aria-labelledby="watering-map-svg-title watering-map-svg-description" data-color-scheme="dark">
        <title id="watering-map-svg-title">Days since watering — ${escapeXml(dateText)}</title>
        <desc id="watering-map-svg-description">Recorded table positions, viewed from the room. North window at top, Mylar left, white wall right. ${escapeXml(countDescription)} Room-side shelf plants are grouped separately; their left-to-right order is unrecorded. Other locations are listed below. ${escapeXml(status)}. ${escapeXml(sourceText)}.</desc>
        <defs>${includeDefinitions ? artwork.definitions : ""}<linearGradient id="wm-age-gradient"><stop offset="0" stop-color="${wateringAgeColor(0)}"/><stop offset="0.5" stop-color="${wateringAgeColor(14)}"/><stop offset="1" stop-color="${wateringAgeColor(28)}"/></linearGradient></defs>
        <style>
            .wm-svg { fill: #e2efe6; }
            .wm-svg text { font-family: Arial, Helvetica, sans-serif; }
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
            .wm-svg .unavailable .pot { fill: #1b2523; stroke: #82988c; }
            .wm-svg .count { font-size: 36px; font-weight: 700; }
            .wm-svg .unknown { fill: #adbbb3; }
            .wm-svg .identity { font-size: 15px; font-weight: 700; fill: #c8d9ce; }
            .wm-svg .name { font-size: 11px; fill: #c2d5c8; }
            .wm-svg .location { font-size: 11px; fill: #a6bdb0; }
            .wm-svg .total { font-size: 16px; font-weight: 700; fill: #b6ebcc; }
            .wm-svg .legend-heading { font-size: 20px; font-weight: 700; }
            .wm-svg .legend-label { font-size: 16px; font-weight: 700; }
        </style>
        <rect width="1000" height="${height}" fill="#0c1815" data-map-background=""/>
        ${icon("water", 42, 28, 36)}
        ${text(88, 57, "Days since watering", "heading")}
        ${icon("plant", 827, 30, 30)}
        ${text(952, 55, `${model.markers.length} POTS`, "total", "end")}
        ${icon("calendar", 48, 70, 22)}
        ${text(78, 88, isAvailable ? `${model.date} · Calendar days in America/New_York` : "Watering counts unavailable", "subtitle")}
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
        ${lowerLayout.panels
            .map(
                (panel) => `<g data-placement-section="${panel.zone}">
            <rect x="48" y="${panel.top}" width="904" height="${panel.bottom - panel.top}" rx="18" class="surface"/>
            ${icon("pin", 66, panel.top + 16, 24)}
            ${text(100, panel.top + 34, panel.title, "zone")}
            ${text(72, panel.top + 58, panel.subtitle, "note")}
        </g>`
            )
            .join("")}
        ${markers}
        <g data-watering-legend="">
            <rect x="48" y="${legendTop}" width="904" height="256" rx="18" class="surface"/>
            ${text(72, legendTop + 34, "Reading this map", "legend-heading")}
            ${text(72, legendTop + 62, isAvailable ? `${recordedCount} with Water records · ${model.markers.length - recordedCount} without` : "Watering record coverage unavailable until data loads.", "meta")}
            <rect x="72" y="${legendTop + 84}" width="856" height="20" rx="10" fill="url(#wm-age-gradient)" data-watering-age-scale=""/>
            ${text(72, legendTop + 128, "0 days · today", legendLabelClass)}
            ${text(500, legendTop + 128, "14 days", legendLabelClass, "middle")}
            ${text(928, legendTop + 128, "28+ days", legendLabelClass, "end")}
            ${text(72, legendTop + 156, "Calendar days since Water. Elapsed history, not a watering instruction.", "note")}
            <g class="unrecorded"><rect x="72" y="${legendTop + 182}" width="54" height="46" rx="10" class="pot"/>${text(99, legendTop + 212, "?", legendLabelClass, "middle")}</g>
            ${text(140, legendTop + 202, "No Water record", legendLabelClass)}
            ${text(140, legendTop + 224, "Unknown · dashed outline", "note")}
            <g class="unavailable"><rect x="522" y="${legendTop + 182}" width="54" height="46" rx="10" class="pot"/>${text(549, legendTop + 212, "—", legendLabelClass, "middle")}</g>
            ${text(590, legendTop + 202, "Data unavailable", legendLabelClass)}
            ${text(590, legendTop + 224, "Refresh to load observations", "note")}
        </g>
        ${text(48, height - 62, "Recorded arrangement; schematic spacing. A logged Move does not assign a new grid slot.", "note")}
        ${text(48, height - 36, "Published Sheet data can lag workbook edits. Check the source time before using a saved image.", "note")}
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

/**
 * Flow non-table cards beneath the fixed photographed grid. Card heights come
 * from their visible text, so another row or a longer name cannot meet the
 * legend. Shelf order is deliberately presented as a schematic grouping.
 *
 * @param {WateringMap["markers"]} markers
 */
function lowerPanels(markers) {
    /**
     * @type {Map<
     *     string,
     *     {
     *         x: number;
     *         y: number;
     *         width: number;
     *         height: number;
     *         nameLines: string[];
     *         locationLines: string[];
     *     }
     * >}
     */
    const cards = new Map();
    const panels = [];
    let top = 1250;
    for (const zone of ["shelf", "other"]) {
        const group = markers.filter((marker) => marker.zone === zone);
        if (group.length === 0) continue;
        const isShelf = zone === "shelf";
        const columns = isShelf ? 3 : 4;
        const width = isShelf ? 260 : 200;
        let rowTop = top + 82;
        for (let start = 0; start < group.length; start += columns) {
            const row = group.slice(start, start + columns);
            let rowHeight = 0;
            for (const [index, marker] of row.entries()) {
                const nameLines = wrapText(marker.name, isShelf ? 34 : 26);
                const locationLines = isShelf
                    ? []
                    : wrapText(marker.position, 28);
                const nameBottom = 82 + Math.max(0, nameLines.length - 1) * 14;
                const textBottom =
                    locationLines.length === 0
                        ? nameBottom
                        : nameBottom + 20 + (locationLines.length - 1) * 14;
                const height = Math.max(116, textBottom + 20);
                rowHeight = Math.max(rowHeight, height);
                cards.set(marker.id, {
                    height,
                    locationLines,
                    nameLines,
                    width,
                    x: (isShelf ? 220 : 170) + (isShelf ? 280 : 220) * index,
                    y: rowTop + 40,
                });
            }
            rowTop += rowHeight + 18;
        }
        const bottom = rowTop + 2;
        panels.push({
            bottom,
            subtitle: isShelf
                ? "Schematic grouping · left-to-right order unrecorded"
                : "Separate placements; card order does not describe physical positions",
            title: isShelf
                ? "Shelf next to cacti tables · room side"
                : "Other locations",
            top,
            zone,
        });
        top = bottom + 24;
    }
    return { bottom: panels.at(-1)?.bottom ?? 1236, cards, panels };
}

/**
 * @param {WateringMap["markers"][number]} marker
 * @param {boolean} isAvailable
 */
function markerWatering(marker, isAvailable) {
    if (!isAvailable) {
        return {
            className: "unavailable",
            count: "—",
            countClass: "count unknown",
            description: "Watering data unavailable",
            fill: "#adbbb3",
            location: "",
        };
    }
    return {
        className: marker.days === null ? "unrecorded" : "recorded",
        count: marker.days === null ? "?" : String(marker.days),
        countClass: marker.days === null ? "count unknown" : "count",
        description:
            marker.days === null
                ? "No recorded Water event"
                : `${marker.days} calendar days since Water on ${marker.lastWater ?? "unknown date"}`,
        fill: wateringAgeColor(marker.days) || "#adbbb3",
        location:
            marker.currentLocation === ""
                ? ""
                : ` Latest logged location: ${marker.currentLocation}.`,
    };
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
