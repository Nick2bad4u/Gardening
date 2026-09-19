import { isDeepStrictEqual } from "node:util";

import palette from "./plant-colors.json" with { type: "json" };

const labels = new Map([
    [14, ["Watering history", "💧 Watering history"]],
    [15, ["Latest gap (days)"]],
    [16, ["Median gap (days)"]],
    [17, ["Shortest gap (days)"]],
    [18, ["Longest gap (days)"]],
    [19, ["Completed intervals"]],
    [21, ["Latest recorded evidence", "🔎 Latest recorded evidence"]],
    [22, ["Photo", "📷 Photo"]],
    [23, ["Photo observed"]],
    [24, ["Condition"]],
    [25, ["Condition observed"]],
    [26, ["Evidence source"]],
    [27, ["Observation notes"]],
    [29, ["Feeding history", "🌿 Feeding history"]],
    [30, ["Last recorded feed"]],
    [31, ["Product"]],
    [32, ["Recorded dose"]],
    [33, ["Plain-water events after feed time"]],
    [35, ["Calculated as of", "🕒 Calculated as of"]],
    [36, ["Care plan"]],
    [38, ["Dimension evidence"]],
]);

const sections = [
    { background: "EDF5FC", dark: "245276", end: 19, header: 14 },
    { background: "F3F0F9", dark: "574371", end: 27, header: 21 },
    { background: "EDF6EF", dark: "315D3F", end: 33, header: 29 },
];

/**
 * Reject source, layout, formatting or validation drift after planning.
 * Volatile displays are excluded: the formatter never changes calculations.
 *
 * @param {import("../../types/plant-page-presentation.js").PlantPagePresentationSnapshot} snapshot
 * @param {ReturnType<typeof capture>} preconditions
 */
export function assertPlantPagePresentationPreconditions(
    snapshot,
    preconditions
) {
    if (!isDeepStrictEqual(capture(snapshot), preconditions))
        throw new Error(
            "Plant page content, formulas, merges, formats or dimensions changed; rebuild the presentation plan"
        );
}

/**
 * Restyle only the established A1:J38 presentation. Existing merges, number
 * formats, links, data validation and chart positions are never written. Supply
 * fresh native grid data (A1:J38 minimum), including dimension metadata.
 *
 * @param {import("../../types/plant-page-presentation.js").PlantPagePresentationSnapshot} snapshot
 */
export function buildPlantPagePresentationRequests(snapshot) {
    const preconditions = capture(snapshot);
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    /** @type {{ sheetId: number; row: number; pixelSize: number }[]} */
    const rowHeights = [];
    for (const page of orderedPages(snapshot)) {
        const sheetId = page.properties.sheetId;
        for (const [row, allowed] of labels) {
            const original = cell(page, row - 1, 0).userEnteredValue
                ?.stringValue;
            const replacement = required(allowed.at(-1));
            if (original !== replacement)
                requests.push({
                    updateCells: {
                        fields: "userEnteredValue.stringValue",
                        rows: [
                            {
                                values: [
                                    {
                                        userEnteredValue: {
                                            stringValue: replacement,
                                        },
                                    },
                                ],
                            },
                        ],
                        start: { columnIndex: 0, rowIndex: row - 1, sheetId },
                    },
                });
        }
        style(page, requests, 0, 12, 0, 10, {
            "userEnteredFormat.textFormat.fontFamily": "JetBrains Mono",
            "userEnteredFormat.verticalAlignment": "MIDDLE",
            "userEnteredFormat.wrapStrategy": "WRAP",
        });
        for (const { background, dark, end, header } of sections) {
            style(
                page,
                requests,
                header - 1,
                header,
                0,
                3,
                visual(dark, "FFFFFF", 12, true)
            );
            style(
                page,
                requests,
                header - 1,
                header,
                3,
                10,
                visual(dark, "FFFFFF", 10, false)
            );
            style(
                page,
                requests,
                header,
                end,
                0,
                3,
                visual(background, dark, 10, true)
            );
            style(
                page,
                requests,
                header,
                end,
                3,
                10,
                visual(background, "28333E", 10, false)
            );
        }
        for (const row of [
            35,
            36,
            38,
        ]) {
            style(
                page,
                requests,
                row - 1,
                row,
                0,
                3,
                visual("F2F4F5", "495560", 10, true)
            );
            style(
                page,
                requests,
                row - 1,
                row,
                3,
                10,
                visual("F2F4F5", "495560", 10, false)
            );
        }
        const grid = required(page.data[0]);
        const styledRows = Array.from(
            { length: 38 },
            (_, index) => index
        ).filter((row) => row < 12 || labels.has(row + 1));
        for (const row of styledRows) {
            const desired = rowHeight(page, row);
            rowHeights.push({ pixelSize: desired, row: row + 1, sheetId });
            if (required(grid.rowMetadata[row]).pixelSize !== desired)
                requests.push({
                    updateDimensionProperties: {
                        fields: "pixelSize",
                        properties: { pixelSize: desired },
                        range: {
                            dimension: "ROWS",
                            endIndex: row + 1,
                            sheetId,
                            startIndex: row,
                        },
                    },
                });
        }
    }
    return { preconditions, requests, rowHeights };
}

/** @param {import("../../types/plant-page-presentation.js").PlantPagePresentationSnapshot} snapshot */
function capture(snapshot) {
    return orderedPages(snapshot).map((page) => {
        validate(page);
        const grid = required(page.data[0]);
        return {
            columns: structuredClone(grid.columnMetadata.slice(0, 10)),
            grid: structuredClone(page.properties.gridProperties),
            merges: structuredClone(
                page.merges.filter((merge) => merge.startRowIndex < 38)
            ),
            rows: structuredClone(grid.rowMetadata.slice(0, 38)),
            sheetId: page.properties.sheetId,
            title: page.properties.title,
            values: Array.from({ length: 38 }, (_, row) =>
                Array.from({ length: 10 }, (_item, column) => {
                    const source = cell(page, row, column);
                    return structuredClone({
                        dataValidation: source.dataValidation ?? null,
                        note: source.note ?? null,
                        textFormatRuns: source.textFormatRuns ?? null,
                        userEnteredFormat: source.userEnteredFormat ?? null,
                        userEnteredValue: source.userEnteredValue ?? null,
                    });
                })
            ),
        };
    });
}

/**
 * @param {import("../../types/plant-page-presentation.js").PresentationPage} page
 * @param {number} row @param {number} column
 */
function cell(page, row, column) {
    return required(page.data[0]).rowData[row]?.values?.[column] ?? {};
}

/** @param {unknown} value @param {string[]} path @returns {unknown} */
function field(value, path) {
    let current = value;
    for (const key of path) {
        if (current === null || typeof current !== "object") return undefined;
        current = /** @type {Record<string, unknown>} */ (current)[key];
    }
    return current;
}

/** @param {import("../../types/plant-page-presentation.js").PlantPagePresentationSnapshot} snapshot */
function orderedPages(snapshot) {
    const pages = snapshot.sheets.filter(({ properties }) =>
        /^P\d{2} /v.test(properties.title)
    );
    if (pages.length !== palette.length)
        throw new Error(
            `Expected exactly ${palette.length} complete plant-page snapshots`
        );
    return palette.map(({ id }) => {
        const matches = pages.filter(({ properties }) =>
            properties.title.startsWith(`${id} `)
        );
        if (matches.length !== 1)
            throw new Error(`Missing or duplicate plant page: ${id}`);
        return required(matches[0]);
    });
}

/**
 * @param {import("../../types/plant-page-presentation.js").PresentationPage} page
 * @param {number} startRow @param {number} endRow
 * @param {number} startColumn @param {number} endColumn
 */
function renderedCells(page, startRow, endRow, startColumn, endColumn) {
    /** @type {import("../../types/plant-page-presentation.js").PageCell[]} */
    const cells = [];
    for (let row = startRow; row < endRow; row += 1)
        for (let column = startColumn; column < endColumn; column += 1)
            if (visibleAnchor(page, row, column))
                cells.push(cell(page, row, column));
    return cells;
}

/** @template T @param {T | undefined} value @returns {T} */
function required(value) {
    if (value === undefined) throw new Error("Incomplete plant-page snapshot");
    return value;
}

/** @param {string} hex */
function rgb(hex) {
    return {
        blue: Number.parseInt(hex.slice(4, 6), 16) / 255,
        green: Number.parseInt(hex.slice(2, 4), 16) / 255,
        red: Number.parseInt(hex.slice(0, 2), 16) / 255,
    };
}

/**
 * JetBrains Mono is measured conservatively at 0.84 CSS px per point per
 * character. Word-aware wrapping uses only visible columns of each existing
 * merged cell. Never shrink an explicitly taller owner row or truncate notes.
 *
 * @param {import("../../types/plant-page-presentation.js").PresentationPage} page
 * @param {number} row
 */
function rowHeight(page, row) {
    const grid = required(page.data[0]);
    let height = Math.max(
        required(grid.rowMetadata[row]).pixelSize ?? 21,
        row < 2 ? 32 : 30
    );
    for (let column = 0; column < 10; column += 1) {
        const item = cell(page, row, column);
        if (!item.userEnteredValue) continue;
        const merge = page.merges.find(
            (candidate) =>
                candidate.startRowIndex === row &&
                candidate.startColumnIndex === column
        );
        const end = merge?.endColumnIndex ?? column + 1;
        const width = grid.columnMetadata
            .slice(column, end)
            .reduce(
                (sum, dimension) =>
                    sum +
                    (dimension.hiddenByUser === true
                        ? 0
                        : (dimension.pixelSize ?? 0)),
                0
            );
        const known = column === 0 ? labels.get(row + 1)?.at(-1) : undefined;
        const text =
            known ??
            item.formattedValue ??
            item.userEnteredValue.stringValue ??
            "";
        const existingFont = field(item, [
            "userEnteredFormat",
            "textFormat",
            "fontSize",
        ]);
        const fontSize =
            row >= 13
                ? column === 0 &&
                  sections.some(({ header }) => header === row + 1)
                    ? 12
                    : 10
                : typeof existingFont === "number"
                  ? existingFont
                  : 10;
        const characters = Math.max(
            1,
            Math.floor((width - 24) / (fontSize * 0.84))
        );
        const lines = wrappedLines(text, characters);
        height = Math.max(height, Math.ceil(lines * fontSize * 1.7 + 14));
    }
    return height;
}

/** @param {unknown} current @param {unknown} desired @returns {boolean} */
function same(current, desired) {
    if (desired === false && current === undefined) return true;
    if (typeof desired === "object" && desired !== null) {
        return Object.entries(desired).every(([key, value]) => {
            const existing = field(current, [key]);
            if (
                typeof value === "number" &&
                [
                    "blue",
                    "green",
                    "red",
                ].includes(key)
            )
                return (
                    Math.round(
                        (typeof existing === "number" ? existing : 0) * 255
                    ) === Math.round(value * 255)
                );
            return same(existing, value);
        });
    }
    return current === desired;
}

/**
 * Apply only explicit style leaves, preserving number formats and hyperlink
 * metadata. Individual leaves make the readback comparison idempotent.
 *
 * @param {import("../../types/plant-page-presentation.js").PresentationPage} page
 * @param {Record<string, unknown>[]} requests
 * @param {number} startRowIndex @param {number} endRowIndex
 * @param {number} startColumnIndex @param {number} endColumnIndex
 * @param {Record<string, unknown>} values
 */
function style(
    page,
    requests,
    startRowIndex,
    endRowIndex,
    startColumnIndex,
    endColumnIndex,
    values
) {
    // Native Sheets omits entered formats on cells covered by a merge. Those
    // default-looking cells are not independently rendered; compare the anchor.
    const rendered = renderedCells(
        page,
        startRowIndex,
        endRowIndex,
        startColumnIndex,
        endColumnIndex
    );
    const changed = Object.entries(values).filter(([path, value]) =>
        rendered.some((item) => !same(field(item, path.split(".")), value))
    );
    if (changed.length === 0) return;
    /** @type {Record<string, unknown>} */
    const patch = {};
    for (const [path, value] of changed) {
        const keys = path.split(".");
        let target = patch;
        const parents = keys.slice(0, -1);
        for (const key of parents) {
            target[key] ??= {};
            target = /** @type {Record<string, unknown>} */ (target[key]);
        }
        target[required(keys.at(-1))] = value;
    }
    requests.push({
        repeatCell: {
            cell: patch,
            fields: changed.map(([path]) => path).join(","),
            range: {
                endColumnIndex,
                endRowIndex,
                sheetId: page.properties.sheetId,
                startColumnIndex,
                startRowIndex,
            },
        },
    });
}

/** @param {import("../../types/plant-page-presentation.js").PresentationPage} page */
function validate(page) {
    validateDimensions(page);
    validateLabels(page);
    if (
        cell(page, 0, 0).userEnteredValue?.stringValue?.startsWith(
            page.properties.title.slice(0, 3)
        ) !== true
    )
        throw new Error(`Unexpected plant title: ${page.properties.title}`);
    for (const [row, column] of [
        [2, 0],
        [2, 3],
        [2, 6],
        [10, 0],
        [11, 0],
        [11, 6],
    ])
        if (
            cell(
                page,
                required(row),
                required(column)
            ).userEnteredValue?.formulaValue?.startsWith("=") !== true
        )
            throw new Error(
                `Missing navigation or clock formula: ${page.properties.title}`
            );
}

/** @param {import("../../types/plant-page-presentation.js").PresentationPage} page */
function validateDimensions(page) {
    const grid = required(page.data[0]);
    if (
        page.data.length !== 1 ||
        (grid.startRow ?? 0) !== 0 ||
        (grid.startColumn ?? 0) !== 0 ||
        grid.rowMetadata.length < 38 ||
        grid.columnMetadata.length < 10 ||
        grid.rowData.length < 38
    )
        throw new Error(
            `Incomplete native A1:J38 grid: ${page.properties.title}`
        );
    if (
        grid.rowMetadata
            .slice(0, 38)
            .some(
                (row) =>
                    row.hiddenByUser === true ||
                    row.hiddenByFilter === true ||
                    typeof row.pixelSize !== "number"
            ) ||
        grid.columnMetadata
            .slice(0, 10)
            .some(
                (column) =>
                    typeof column.pixelSize !== "number" ||
                    column.pixelSize <= 0 ||
                    column.hiddenByFilter === true
            ) ||
        grid.columnMetadata
            .slice(0, 9)
            .some((column) => column.hiddenByUser === true) ||
        grid.columnMetadata[9]?.hiddenByUser !== true
    )
        throw new Error(
            `Review visible columns A:I and row dimensions: ${page.properties.title}`
        );
}

/** @param {import("../../types/plant-page-presentation.js").PresentationPage} page */
function validateLabels(page) {
    for (const [row, allowed] of labels) {
        const labelCell = cell(page, row - 1, 0);
        if (
            labelCell.userEnteredValue?.stringValue !== allowed.at(-1) &&
            ((labelCell.textFormatRuns?.length ?? 0) > 0 ||
                field(labelCell, [
                    "userEnteredFormat",
                    "textFormat",
                    "link",
                ]) !== undefined)
        )
            throw new Error(
                `Review rich text or linked label before adding an icon: ${page.properties.title}!A${row}`
            );
        if (
            !allowed.includes(
                cell(page, row - 1, 0).userEnteredValue?.stringValue ?? ""
            )
        )
            throw new Error(
                `Unexpected label at ${page.properties.title}!A${row}`
            );
        for (const [start, end] of [
            [0, 3],
            [3, 10],
        ]) {
            if (
                page.merges.every(
                    (merge) =>
                        merge.startRowIndex !== row - 1 ||
                        merge.endRowIndex !== row ||
                        merge.startColumnIndex !== start ||
                        merge.endColumnIndex !== end
                )
            )
                throw new Error(
                    `Review summary merge at ${page.properties.title}!${row}`
                );
        }
        const value = cell(page, row - 1, 3).userEnteredValue;
        const isHeading = sections.some(({ header }) => header === row);
        if (isHeading && typeof value?.stringValue !== "string")
            throw new Error(`Missing section explanation at row ${row}`);
        if (!isHeading && value?.formulaValue?.startsWith("=") !== true)
            throw new Error(
                `Missing summary formula at ${page.properties.title}!D${row}`
            );
    }
}

/**
 * @param {import("../../types/plant-page-presentation.js").PresentationPage} page
 * @param {number} row @param {number} column
 */
function visibleAnchor(page, row, column) {
    if (required(page.data[0]).columnMetadata[column]?.hiddenByUser === true)
        return false;
    const merge = page.merges.find(
        (candidate) =>
            row >= candidate.startRowIndex &&
            row < candidate.endRowIndex &&
            column >= candidate.startColumnIndex &&
            column < candidate.endColumnIndex
    );
    return (
        merge === undefined ||
        (merge.startRowIndex === row && merge.startColumnIndex === column)
    );
}

/**
 * @param {string} background @param {string} foreground @param {number}
 *   fontSize @param {boolean} bold
 */
function visual(background, foreground, fontSize, bold) {
    return {
        "userEnteredFormat.backgroundColorStyle": { rgbColor: rgb(background) },
        "userEnteredFormat.padding": { bottom: 6, left: 10, right: 10, top: 6 },
        "userEnteredFormat.textFormat.bold": bold,
        "userEnteredFormat.textFormat.fontFamily": "JetBrains Mono",
        "userEnteredFormat.textFormat.fontSize": fontSize,
        "userEnteredFormat.textFormat.foregroundColorStyle": {
            rgbColor: rgb(foreground),
        },
        "userEnteredFormat.verticalAlignment": "MIDDLE",
        "userEnteredFormat.wrapStrategy": "WRAP",
    };
}

/** @param {string} text @param {number} characters */
function wrappedLines(text, characters) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    let lines = 0;
    for (const paragraph of text.split("\n")) {
        let line = 0;
        lines += 1;
        for (const word of paragraph.split(/\s+/v)) {
            const length = [...segmenter.segment(word)].length;
            if (line > 0 && line + 1 + length > characters) {
                lines += 1;
                line = 0;
            }
            if (line > 0) line += 1;
            const total = line + length;
            lines += Math.max(0, Math.ceil(total / characters) - 1);
            line = total === 0 ? 0 : ((total - 1) % characters) + 1;
        }
    }
    return lines;
}
