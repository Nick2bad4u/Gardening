import { isDeepStrictEqual } from "node:util";

import { plantColor } from "./plant-chart-colors.mjs";
import palette from "./plant-colors.json" with { type: "json" };
import { wateringIntervalSheetId } from "./watering-intervals.mjs";
import { withWorkbookChartFont } from "./workbook-presentation.mjs";

const roles = [
    {
        domain: 18,
        height: 551,
        row: 54,
        series: [19],
        title: "Weight history • calendar time",
        type: "LINE",
        unit: "Weight (g)",
    },
    {
        domain: 16,
        height: 454,
        row: 74,
        series: [17],
        title: "Weight trend after latest Water / Repot anchor",
        type: "SCATTER",
        unit: "Weight (g)",
    },
    {
        domain: 18,
        height: 469,
        row: 91,
        series: [20, 21],
        title: "Plant dimensions • measurement history",
        type: "LINE",
        unit: "Size (cm)",
    },
    {
        domain: 1,
        height: 440,
        row: 110,
        series: [2],
        title: "Time between waterings",
        type: "COLUMN",
        unit: "Days since previous watering",
    },
];

/**
 * Reject edits since planning; volatile calculated cells are intentionally
 * absent.
 *
 * @param {import("../../types/plant-chart-layout.js").PlantLayoutSnapshot} snapshot
 * @param {ReturnType<typeof capture>} preconditions
 */
export function assertPlantChartLayoutPreconditions(snapshot, preconditions) {
    if (!isDeepStrictEqual(capture(snapshot), preconditions))
        throw new Error(
            "Plant chart specifications, positions, dimensions, or weight evidence changed; rebuild the reviewed plan"
        );
}

/**
 * Build a presentation-only native migration from P01's reviewed chart styles.
 * Rows are zero-indexed native dimension arrays starting with worksheet row 1.
 * No network, cells, protections, helper formulas, or Apps Script are changed.
 *
 * @param {import("../../types/plant-chart-layout.js").PlantLayoutSnapshot} snapshot
 */
export function buildPlantChartLayoutRequests(snapshot) {
    const preconditions = capture(snapshot);
    const template = required(preconditions.pages[0]);
    const border = required(required(template.charts[0]).border);
    if (!isDeepStrictEqual(border.colorStyle, { themeColor: "TEXT" }))
        throw new Error(
            "Review P01 weight-history border before applying template"
        );
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    /** @type {import("../../types/plant-chart-layout.js").LayoutChart[]} */
    const expectedCharts = [];
    for (const page of preconditions.pages) {
        for (const [
            startIndex,
            endIndex,
            pixelSize,
        ] of [
            [
                53,
                108,
                30,
            ],
            [
                108,
                109,
                36,
            ],
            [
                109,
                138,
                30,
            ],
        ]) {
            const start = required(startIndex);
            const end = required(endIndex);
            if (
                page.rows
                    .slice(start - 53, end - 53)
                    .some((row) => row.pixelSize !== pixelSize)
            )
                requests.push({
                    updateDimensionProperties: {
                        fields: "pixelSize",
                        properties: { pixelSize },
                        range: {
                            dimension: "ROWS",
                            endIndex: end,
                            sheetId: page.sheetId,
                            startIndex: start,
                        },
                    },
                });
        }
        for (const [index, role] of roles.entries()) {
            const original = required(page.charts[index]);
            const spec = styledSpec(
                required(template.charts[index]).spec,
                original.spec,
                page.id,
                role,
                page.weightFloor
            );
            const position = {
                overlayPosition: {
                    anchorCell: {
                        columnIndex: 0,
                        rowIndex: role.row,
                        sheetId: page.sheetId,
                    },
                    heightPixels: role.height,
                    offsetXPixels: 0,
                    offsetYPixels: 7,
                    widthPixels: page.width,
                },
            };
            const chart = {
                ...structuredClone(original),
                border: structuredClone(border),
                position,
                spec,
            };
            expectedCharts.push(chart);
            if (
                !isDeepStrictEqual(
                    colorComparable(spec),
                    colorComparable(original.spec)
                )
            )
                requests.push({
                    updateChartSpec: { chartId: chart.chartId, spec },
                });
            if (
                !isDeepStrictEqual(
                    positionComparable(position),
                    positionComparable(original.position)
                )
            )
                requests.push({
                    updateEmbeddedObjectPosition: {
                        fields: "anchorCell,offsetXPixels,offsetYPixels,widthPixels,heightPixels",
                        newPosition: position,
                        objectId: chart.chartId,
                    },
                });
            if (
                !isDeepStrictEqual(
                    colorComparable(border),
                    colorComparable(original.border)
                )
            )
                requests.push({
                    updateEmbeddedObjectBorder: {
                        border: structuredClone(border),
                        fields: "color,colorStyle",
                        objectId: chart.chartId,
                    },
                });
        }
    }
    assertGeometry();
    const sparseChartIds = expectedCharts
        .filter((chart) => (chart.spec.basicChart.series ?? []).length === 0)
        .map((chart) => chart.chartId);
    return { expectedCharts, preconditions, requests, sparseChartIds };
}

/** Layout uses native rows rather than assuming every sheet's old row height. */
function assertGeometry() {
    const bounds = roles.map((role) => ({
        bottom: top(role.row) + 7 + role.height,
        top: top(role.row) + 7,
    }));
    for (const [index, box] of bounds.entries()) {
        const next = bounds[index + 1];
        if (
            (next !== undefined && box.bottom >= next.top) ||
            box.bottom >= top(138) ||
            (box.top < top(109) && box.bottom > top(108))
        )
            throw new Error(
                "Chart layout intersects another chart, watering status, or history navigation"
            );
    }
}

/** @param {import("../../types/plant-chart-layout.js").PlantLayoutSnapshot} snapshot */
function capture(snapshot) {
    const pages = snapshot.metadata.sheets.filter((sheet) =>
        /^P\d{2}(?:\s|$)/v.test(sheet.properties.title)
    );
    if (pages.length !== 30)
        throw new Error("Expected exactly P01–P30 chart pages");
    const ids = new Set();
    return {
        pages: palette.map((plant, plantIndex) => {
            const matches = pages.filter(
                (sheet) =>
                    sheet.properties.title.split(/\s/v, 1)[0] === plant.id
            );
            const page = required(matches[0]);
            if (
                matches.length !== 1 ||
                page.charts?.length !== 4 ||
                page.properties.gridProperties.rowCount < 140
            )
                throw new Error(`Review four-chart inventory for ${plant.id}`);
            const sheetId = page.properties.sheetId;
            const columnSets = snapshot.columnDimensions.filter(
                (item) => item.sheetId === sheetId
            );
            const columns = required(columnSets[0]).columns.slice(0, 10);
            if (
                columnSets.length !== 1 ||
                columns.length !== 10 ||
                columns.some(
                    (column) =>
                        !Number.isSafeInteger(column.pixelSize) ||
                        Number(column.pixelSize) <= 0
                )
            )
                throw new Error(`Review visible page columns for ${plant.id}`);
            const width = columns
                .filter(
                    (column) =>
                        column.hiddenByUser !== true &&
                        column.hiddenByFilter !== true
                )
                .reduce((sum, column) => sum + required(column.pixelSize), 0);
            if (width < 600)
                throw new Error(`Review narrow page width for ${plant.id}`);
            const weights = snapshot.weightMinimums.filter(
                (item) => item.sheetId === sheetId
            );
            const minimum = required(weights[0]).minimum;
            if (
                weights.length !== 1 ||
                (minimum !== null &&
                    (!Number.isFinite(minimum) || minimum <= 0))
            )
                throw new Error(
                    `Review plotted weight minimum for ${plant.id}`
                );
            // Use the requested common scale without clipping a lighter pot on a later rerun.
            const weightFloor =
                minimum === null || minimum > 250
                    ? 250
                    : Math.max(0, Math.floor((minimum - 25) / 50) * 50);
            const dimensions = snapshot.rowDimensions.filter(
                (item) => item.sheetId === sheetId
            );
            const allRows = required(dimensions[0]).rows;
            if (dimensions.length !== 1 || allRows.length < 140)
                throw new Error(`Missing row dimensions for ${plant.id}`);
            const rows = allRows.slice(53, 140);
            if (
                rows.some(
                    (row) =>
                        !Number.isSafeInteger(row.pixelSize) ||
                        Number(row.pixelSize) <= 0 ||
                        row.hiddenByUser === true ||
                        row.hiddenByFilter === true
                )
            )
                throw new Error(
                    `Hidden or invalid chart/history-boundary rows for ${plant.id}`
                );
            const charts = roles.map((role) => {
                const found =
                    page.charts?.filter(
                        (chart) => chart.spec.title === role.title
                    ) ?? [];
                const chart = required(found[0]);
                if (found.length !== 1 || ids.has(chart.chartId))
                    throw new Error(
                        `Duplicate chart role or ID for ${plant.id}`
                    );
                ids.add(chart.chartId);
                validateBindings(chart, role, sheetId, plantIndex);
                return structuredClone(chart);
            });
            return {
                charts,
                columns: structuredClone(columns),
                id: plant.id,
                minimum,
                rows: structuredClone(rows),
                sheetId,
                title: page.properties.title,
                weightFloor,
                width,
            };
        }),
    };
}

/**
 * Compare native float32 RGB channels, duplicate legacy colors, and default
 * NONE labels.
 *
 * @param {unknown} value @returns {unknown}
 */
function colorComparable(value, isRgb = false) {
    if (Array.isArray(value))
        return value.map((child) => colorComparable(child));
    if (value === null || typeof value !== "object") return value;
    const record = /** @type {Record<string, unknown>} */ (value);
    return Object.fromEntries(
        Object.entries(record)
            .filter(
                ([key, child]) =>
                    (![
                        "backgroundColor",
                        "color",
                        "foregroundColor",
                    ].includes(key) ||
                        record[`${key}Style`] === undefined) &&
                    (key !== "dataLabel" ||
                        child === null ||
                        typeof child !== "object" ||
                        Reflect.get(child, "type") !== "NONE")
            )
            .map(([key, child]) => [
                key,
                isRgb && typeof child === "number"
                    ? Math.fround(child)
                    : colorComparable(child, key === "rgbColor"),
            ])
    );
}

/**
 * Native Sheets may omit explicit zero offsets and zero anchor coordinates.
 *
 * @param {import("../../types/plant-chart-layout.js").LayoutChart["position"]} position
 */
function positionComparable(position) {
    const overlay = position.overlayPosition;
    return {
        ...overlay,
        anchorCell: {
            ...overlay.anchorCell,
            columnIndex: overlay.anchorCell.columnIndex ?? 0,
            rowIndex: overlay.anchorCell.rowIndex ?? 0,
        },
        offsetXPixels: overlay.offsetXPixels ?? 0,
        offsetYPixels: overlay.offsetYPixels ?? 0,
    };
}

/** @template T @param {T | undefined} value @returns {T} */
function required(value) {
    if (value === undefined) throw new Error("Missing chart-layout metadata");
    return value;
}

/**
 * @param {import("../../types/plant-chart-layout.js").LayoutChart["spec"]} template
 * @param {import("../../types/plant-chart-layout.js").LayoutChart["spec"]} original
 * @param {string} plantId @param {typeof roles[number]} role @param {number}
 *   weightFloor
 */
function styledSpec(template, original, plantId, role, weightFloor) {
    const spec = withWorkbookChartFont(template);
    spec.title = original.title;
    delete spec.subtitle;
    delete spec.altText;
    if (original.subtitle !== undefined) spec.subtitle = original.subtitle;
    if (original.altText !== undefined) spec.altText = original.altText;
    spec.titleTextFormat = {
        ...spec.titleTextFormat,
        bold: true,
        fontFamily: "JetBrains Mono",
        fontSize: 18,
        italic: true,
    };
    spec.subtitleTextFormat = {
        ...spec.subtitleTextFormat,
        bold: true,
        fontFamily: "JetBrains Mono",
        fontSize: 12,
        italic: true,
    };
    spec.titleTextPosition = { horizontalAlignment: "CENTER" };
    spec.subtitleTextPosition = { horizontalAlignment: "CENTER" };
    spec.basicChart.domains = structuredClone(original.basicChart.domains);
    spec.basicChart.axis = original.basicChart.axis.map((target) => {
        const axis = required(
            template.basicChart.axis.find(
                (item) => item.position === target.position
            )
        );
        const result = {
            ...axis,
            ...(target.title !== undefined && { title: target.title }),
            format: {
                ...axis.format,
                bold: true,
                fontFamily: "JetBrains Mono",
                fontSize: 12,
                italic: true,
            },
        };
        delete result.viewWindowOptions;
        if (target.viewWindowOptions !== undefined)
            result.viewWindowOptions = structuredClone(
                target.viewWindowOptions
            );
        if (axis.position === "LEFT_AXIS") {
            result.title = role.unit;
            if (role.unit === "Weight (g)")
                result.viewWindowOptions = {
                    ...result.viewWindowOptions,
                    viewWindowMin: weightFloor,
                    viewWindowMode: "EXPLICIT",
                };
            if (role.type === "COLUMN")
                result.viewWindowOptions = {
                    ...result.viewWindowOptions,
                    viewWindowMin: 0,
                };
        }
        return result;
    });
    const styledSeries = required(spec.basicChart.series);
    spec.basicChart.series = (original.basicChart.series ?? []).map(
        (target, index) => {
            const series = required(styledSeries[index]);
            const result = {
                ...series,
                colorStyle: { rgbColor: plantColor(plantId) },
                series: structuredClone(target.series),
            };
            delete result.color;
            delete result.styleOverrides;
            if (role.domain === 18 && role.series.length === 1) {
                result.lineStyle = { type: "SOLID", width: 2 };
            }
            if (role.unit === "Weight (g)") {
                // Dense weight labels obscure the curve; markers/tooltips retain each reading.
                result.dataLabel = { type: "NONE" };
            }
            return result;
        }
    );
    if (original.basicChart.series === undefined) delete spec.basicChart.series;
    return spec;
}

/** @param {number} row */
function top(row) {
    return (row - 53) * 30 + (row > 108 ? 6 : 0);
}

/**
 * @param {import("../../types/plant-chart-layout.js").LayoutChart} chart
 * @param {(typeof roles)[number]} role @param {number} sheetId @param {number}
 *   plantIndex
 */
function validateBindings(chart, role, sheetId, plantIndex) {
    const basic = chart.spec.basicChart;
    const series = basic.series ?? [];
    const isSparse = role.type === "COLUMN" && series.length === 0;
    if (
        basic.chartType !== role.type ||
        (!isSparse && series.length !== role.series.length) ||
        basic.domains.length !== 1 ||
        basic.headerCount !== 1
    )
        throw new Error(`Unexpected chart shape: ${role.title}`);
    const isInterval = role.type === "COLUMN";
    const firstRow = isInterval ? 0 : 11;
    const endRow = isInterval ? 5000 : 1000;
    const sourceSheet = isInterval ? wateringIntervalSheetId : sheetId;
    const offset = isInterval ? plantIndex * 3 : 0;
    const bindings = [
        required(basic.domains[0]).domain,
        ...series.map((item) => item.series),
    ];
    const columns = isSparse ? [role.domain] : [role.domain, ...role.series];
    for (const [index, column] of columns.entries()) {
        const sources = required(bindings[index]).sourceRange.sources;
        const range = required(sources[0]);
        const expected = {
            endColumnIndex: column + offset + 1,
            endRowIndex: endRow,
            sheetId: sourceSheet,
            startColumnIndex: column + offset,
            startRowIndex: firstRow,
        };
        if (
            sources.length !== 1 ||
            !isDeepStrictEqual(
                { ...range, startRowIndex: range.startRowIndex ?? 0 },
                expected
            )
        )
            throw new Error(`Unexpected source binding: ${role.title}`);
    }
    validatePresentation(chart, isSparse);
}

/**
 * @param {import("../../types/plant-chart-layout.js").LayoutChart} chart
 * @param {boolean} sparse
 */
function validatePresentation(chart, sparse) {
    const basic = chart.spec.basicChart;
    if (
        (basic.series ?? []).some(
            (series) =>
                series.dataLabel?.customLabelData !== undefined ||
                series.targetAxis !== "LEFT_AXIS"
        )
    )
        throw new Error(
            `Review custom data labels or series axes: ${chart.spec.title}`
        );
    const axes = new Set(basic.axis.map((axis) => axis.position));
    const expected = sparse ? 1 : 2;
    if (
        basic.axis.length !== expected ||
        axes.size !== expected ||
        !axes.has("BOTTOM_AXIS") ||
        basic.axis.some(
            (axis) => !["BOTTOM_AXIS", "LEFT_AXIS"].includes(axis.position)
        )
    )
        throw new Error(`Unexpected chart axes: ${chart.spec.title}`);
    if (
        !Number.isFinite(chart.position.overlayPosition.heightPixels) ||
        !Number.isFinite(chart.position.overlayPosition.widthPixels)
    )
        throw new Error(`Missing chart geometry: ${chart.spec.title}`);
}
