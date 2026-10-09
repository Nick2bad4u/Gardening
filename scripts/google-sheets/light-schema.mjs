import { isDeepStrictEqual } from "node:util";

import { isRecord } from "../build-data.mjs";
import { inventorySnapshotDigest } from "./inventory-expansion.mjs";

/** @typedef {import("./inventory-expansion.mjs").NativeSnapshot} Snapshot */
/** @typedef {import("./inventory-expansion.mjs").Sheet} Sheet */
/** @typedef {import("./inventory-expansion.mjs").Cell} Cell */
/**
 * @typedef {{
 *     title: string;
 *     column: number;
 *     startRow: number;
 *     endRow: number;
 *     expected: readonly string[];
 *     append: readonly string[];
 *     tableId?: string;
 * }} EnumExtension
 */
/**
 * @typedef {{
 *     historyHeaders: readonly string[];
 *     entryHeaders: readonly string[];
 * }} LightSchema
 */

const historyViewTitle = "History view";

export const lightHeaders = Object.freeze([
    "PPFD (µmol/m²/s)",
    "Illuminance (lux)",
]);

/**
 * Append two independent light readings to the reviewed humidity-era schema.
 * Capture all rows, cells, formats, validations, and native metadata for the
 * five affected sheets. Enum extensions are reviewed against that capture;
 * typed table columns must use their table ID instead of cell validation. This
 * builder never installs the logger or rewrites existing observations.
 *
 * @param {Snapshot} snapshot
 * @param {LightSchema} schema
 */
export function buildLightSchemaRequests(snapshot, schema) {
    if (
        schema.historyHeaders.length !== 43 ||
        schema.entryHeaders.length !== 35 ||
        schema.historyHeaders[42] !== "Relative humidity (%)" ||
        schema.entryHeaders[34] !== "Relative humidity (%)"
    )
        throw new Error("Expected the reviewed 43/35-column light schema");
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    for (const [
        title,
        headers,
        width,
    ] of /** @type {[string, readonly string[] | null, number][]} */ ([
        [
            "History",
            schema.historyHeaders,
            43,
        ],
        [
            historyViewTitle,
            null,
            43,
        ],
        [
            "App entries",
            schema.entryHeaders,
            35,
        ],
    ])) {
        const sheet = uniqueSheet(snapshot, title);
        validateAppendSheet(sheet, headers, width);
        const { columnCount, rowCount } = sheet.properties.gridProperties;
        const sheetId = sheet.properties.sheetId;
        if (columnCount < width + 2)
            requests.push({
                appendDimension: {
                    dimension: "COLUMNS",
                    length: width + 2 - columnCount,
                    sheetId,
                },
            });
        const range = {
            endColumnIndex: width + 2,
            endRowIndex: rowCount,
            sheetId,
            startColumnIndex: width,
            startRowIndex: 0,
        };
        requests.push(
            {
                copyPaste: {
                    destination: range,
                    pasteType: "PASTE_FORMAT",
                    source: {
                        ...range,
                        endColumnIndex: width,
                        startColumnIndex: width - 1,
                    },
                },
            },
            {
                updateCells: {
                    fields: "userEnteredValue",
                    rows: [
                        {
                            values: headers
                                ? lightHeaders.map((stringValue) => ({
                                      userEnteredValue: { stringValue },
                                  }))
                                : [
                                      {
                                          userEnteredValue: {
                                              formulaValue:
                                                  lightViewFormula(45),
                                          },
                                      },
                                  ],
                        },
                    ],
                    start: {
                        columnIndex: headers ? width : 0,
                        rowIndex: 0,
                        sheetId,
                    },
                },
            },
            {
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            numberFormat: { pattern: "0.##", type: "NUMBER" },
                        },
                    },
                    fields: "userEnteredFormat.numberFormat",
                    range: { ...range, startRowIndex: 1 },
                },
            }
        );
        if (headers)
            requests.push({
                setDataValidation: {
                    range: { ...range, startRowIndex: 1 },
                    rule: {
                        condition: {
                            type: "NUMBER_GREATER_THAN_EQ",
                            values: [{ userEnteredValue: "0" }],
                        },
                        strict: true,
                    },
                },
            });
        requests.push(...extendDecorations(sheet, width));
    }
    for (const extension of reviewedEnumExtensions(snapshot))
        requests.push(
            enumRequest(uniqueSheet(snapshot, extension.title), extension)
        );
    return {
        requests,
        schema: structuredClone(schema),
        sourceDigest: inventorySnapshotDigest(snapshot),
    };
}

/** @param {43 | 45} columns */
export function lightViewFormula(columns) {
    const end = columns === 43 ? "AQ" : "AS";
    return `=LET(rows,SORT(FILTER(History!A2:${end}5000,History!A2:A5000<>""),1,FALSE,10,FALSE),fmt,LAMBDA(d,IF(d="","",IF(MOD(d,1)=0,TEXT(d,"M/d/yyyy"),TEXT(d,"M/d/yyyy h:mm AM/PM")))),VSTACK(History!A1:${end}1,HSTACK(MAP(CHOOSECOLS(rows,1),fmt),CHOOSECOLS(rows,SEQUENCE(1,${columns - 1},2,1)))))`;
}

/**
 * Verify both fresh source evidence and the exact reviewed request set. Do not
 * apply a stale or edited plan; rebuild and rehearse it on the native copy.
 *
 * @param {ReturnType<typeof buildLightSchemaRequests>} plan
 * @param {Snapshot} snapshot
 */
export function verifyLightSchemaPreconditions(plan, snapshot) {
    if (inventorySnapshotDigest(snapshot) !== plan.sourceDigest)
        throw new Error("Light schema snapshot changed; rebuild the plan");
    const rebuilt = buildLightSchemaRequests(snapshot, plan.schema);
    if (!isDeepStrictEqual(plan.requests, rebuilt.requests))
        throw new Error("Light schema requests changed; rebuild the plan");
    return true;
}

/**
 * Compare a fresh readback with the reviewed input: every existing entered
 * value, formula, format, note, and validation stays intact except the exact
 * view formula and enum changes. Effective formula results may recalculate.
 * Validate blank light destinations and their number/validation contract.
 * Native metadata, chart specifications, protections, table properties, and
 * sheet order must remain identical except the planned dimension/filter/banding
 * extensions and typed Event enum.
 *
 * @param {ReturnType<typeof buildLightSchemaRequests>} plan
 * @param {Snapshot} before
 * @param {Snapshot} after
 */
export function verifyLightSchemaReadback(plan, before, after) {
    verifyLightSchemaPreconditions(plan, before);
    const extensions = reviewedEnumExtensions(before);
    for (const title of [
        "History",
        historyViewTitle,
        "App entries",
        "App bulk",
        "Quick log",
    ]) {
        const source = uniqueSheet(before, title);
        const target = uniqueSheet(after, title);
        const width = source.properties.gridProperties.columnCount;
        const isExtended = [
            "App entries",
            "History",
            historyViewTitle,
        ].includes(title);
        const oldWidth = title === "App entries" ? 35 : 43;
        if (
            target.properties.sheetId !== source.properties.sheetId ||
            target.properties.gridProperties.rowCount !==
                source.properties.gridProperties.rowCount ||
            target.properties.gridProperties.columnCount !==
                (isExtended ? oldWidth + 2 : width)
        )
            throw new Error(`Light readback dimensions changed: ${title}`);
        const previous = completeRows(source);
        const current = completeRows(target);
        const enums = extensions.filter(
            (extension) =>
                extension.title === title && extension.tableId === undefined
        );
        for (const [rowIndex, row] of previous.entries()) {
            verifyExistingRow(
                title,
                row,
                current[rowIndex] ?? [],
                rowIndex,
                isExtended ? oldWidth : width,
                enums
            );
            if (isExtended)
                verifyAppendedRow(
                    title,
                    current[rowIndex] ?? [],
                    rowIndex,
                    oldWidth
                );
        }
    }

    const quick = uniqueSheet(after, "Quick log");
    const tables = quick["tables"];
    const update = plan.requests.find((request) => "updateTable" in request)?.[
        "updateTable"
    ];
    if (
        !isRecord(update) ||
        !isRecord(update["table"]) ||
        !Array.isArray(tables)
    )
        throw new Error("Missing light readback table");
    const plannedTable = update["table"];
    const table = records(tables).find(
        (item) => isRecord(item) && item["tableId"] === plannedTable["tableId"]
    );
    if (
        !isRecord(table) ||
        !isDeepStrictEqual(
            table["columnProperties"],
            update["table"]["columnProperties"]
        )
    )
        throw new Error("Light readback table validation changed");
    verifyNativeMetadata(plan, before, after);
    return true;
}

/** @param {Sheet} expected @param {Record<string, unknown>} request */
function applyMetadataRequest(expected, request) {
    const sheetId = expected.properties.sheetId;
    const append = request["appendDimension"];
    if (isRecord(append) && append["sheetId"] === sheetId)
        expected.properties.gridProperties.columnCount += Number(
            append["length"]
        );
    const filter = request["setBasicFilter"];
    if (
        isRecord(filter) &&
        isRecord(filter["filter"]) &&
        isRecord(filter["filter"]["range"]) &&
        filter["filter"]["range"]["sheetId"] === sheetId
    )
        expected["basicFilter"] = structuredClone(filter["filter"]);
    const banding = request["updateBanding"];
    if (isRecord(banding) && isRecord(banding["bandedRange"])) {
        const planned = banding["bandedRange"];
        const bands = expected["bandedRanges"];
        const band = Array.isArray(bands)
            ? records(bands).find(
                  (item) =>
                      isRecord(item) &&
                      item["bandedRangeId"] === planned["bandedRangeId"]
              )
            : undefined;
        if (isRecord(band)) band["range"] = structuredClone(planned["range"]);
    }
    const update = request["updateTable"];
    if (isRecord(update) && isRecord(update["table"])) {
        const planned = update["table"];
        const tables = expected["tables"];
        const table = Array.isArray(tables)
            ? records(tables).find(
                  (item) =>
                      isRecord(item) && item["tableId"] === planned["tableId"]
              )
            : undefined;
        if (isRecord(table))
            table["columnProperties"] = structuredClone(
                planned["columnProperties"]
            );
    }
}

/** @param {Sheet} sheet */
function completeRows(sheet) {
    /** @type {Map<number, Cell[]>} */
    const rows = new Map();
    const { columnCount, rowCount } = sheet.properties.gridProperties;
    const blocks = sheet.data ?? [];
    for (const block of blocks) {
        if ((block.startColumn ?? 0) !== 0)
            throw new Error(
                `Expected full-width light rows: ${sheet.properties.title}`
            );
        const entries = (block.rowData ?? []).entries();
        for (const [offset, row] of entries) {
            const index = (block.startRow ?? 0) + offset;
            if (index < 0 || index >= rowCount || rows.has(index))
                throw new Error("Overlapping or out-of-bounds light capture");
            if ((row.values?.length ?? 0) > columnCount)
                throw new Error("Out-of-bounds light columns");
            rows.set(index, row.values ?? []);
        }
    }
    return Array.from({ length: rowCount }, (_, index) => {
        const row = rows.get(index);
        if (!row)
            throw new Error(
                `Missing complete light rows: ${sheet.properties.title}`
            );
        return row;
    });
}

/** @param {Cell | undefined} cell @returns {Record<string, unknown>} */
function editableCell(cell) {
    const result = /** @type {Record<string, unknown>} */ ({ ...cell });
    delete result["effectiveValue"];
    delete result["effectiveFormat"];
    delete result["formattedValue"];
    return result;
}

/** @param {Sheet} sheet @param {EnumExtension} extension */
function enumRequest(sheet, extension) {
    const { append, column, endRow, expected, startRow, tableId } = extension;
    const rows = completeRows(sheet);
    if (
        column >= sheet.properties.gridProperties.columnCount ||
        endRow > rows.length
    )
        throw new Error("Invalid light enum extension");
    const expectedValues = expected.map((userEnteredValue) => ({
        userEnteredValue,
    }));
    const values = [
        ...expectedValues,
        ...append.map((userEnteredValue) => ({ userEnteredValue })),
    ];
    if (tableId !== undefined)
        return tableEnumRequest(sheet, extension, expectedValues, values);

    const tables = sheet["tables"];
    if (
        Array.isArray(tables) &&
        tables.some((table) => {
            if (!isRecord(table) || !isRecord(table["range"])) return false;
            const range = table["range"];
            return (
                column >= Number(range["startColumnIndex"] ?? 0) &&
                column < Number(range["endColumnIndex"]) &&
                startRow < Number(range["endRowIndex"]) &&
                endRow > Number(range["startRowIndex"] ?? 0)
            );
        })
    )
        throw new Error("Use the typed table enum instead of cell validation");
    const rule = rows[startRow]?.[column]?.dataValidation;
    if (
        !isRecord(rule) ||
        rule["strict"] !== true ||
        !isRecord(rule["condition"]) ||
        rule["condition"]["type"] !== "ONE_OF_LIST" ||
        !isDeepStrictEqual(rule["condition"]["values"], expectedValues) ||
        rows
            .slice(startRow, endRow)
            .some(
                (row) => !isDeepStrictEqual(row[column]?.dataValidation, rule)
            )
    )
        throw new Error(
            `Light enum validation changed: ${sheet.properties.title}`
        );
    return {
        setDataValidation: {
            range: {
                endColumnIndex: column + 1,
                endRowIndex: endRow,
                sheetId: sheet.properties.sheetId,
                startColumnIndex: column,
                startRowIndex: startRow,
            },
            rule: {
                ...structuredClone(rule),
                condition: { ...structuredClone(rule["condition"]), values },
            },
        },
    };
}

/** @param {Sheet} sheet @param {number} width */
function extendDecorations(sheet, width) {
    /** @type {Record<string, unknown>[]} */
    const requests = [];
    const filter = sheet["basicFilter"];
    if (isRecord(filter)) {
        if (
            !isRecord(filter["range"]) ||
            (filter["range"]["endColumnIndex"] !== width &&
                (sheet.properties.title !== "History" ||
                    filter["range"]["endColumnIndex"] !== 42))
        )
            throw new Error(
                `Unexpected light filter range: ${sheet.properties.title}`
            );
        const extended = structuredClone(filter);
        // Reapplying sortSpecs immediately sorts canonical rows. Preserve the
        // selection criteria, widen the filter, and never reapply a sort.
        delete extended["sortSpecs"];
        extended["range"] = { ...filter["range"], endColumnIndex: width + 2 };
        requests.push({ setBasicFilter: { filter: extended } });
    }
    const bands = sheet["bandedRanges"];
    const bandEntries = records(bands);
    for (const band of bandEntries) {
        if (
            !isRecord(band) ||
            !isRecord(band["range"]) ||
            band["range"]["endColumnIndex"] !== width
        )
            continue;
        requests.push({
            updateBanding: {
                bandedRange: {
                    ...structuredClone(band),
                    range: { ...band["range"], endColumnIndex: width + 2 },
                },
                fields: "range",
            },
        });
    }
    return requests;
}

/** @param {Sheet} sheet */
function metadataOnly(sheet) {
    const metadata = { ...sheet };
    delete metadata.data;
    return structuredClone(metadata);
}

/** @param {unknown} value @returns {Record<string, unknown>[]} */
function records(value) {
    return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** @param {Snapshot} snapshot @returns {EnumExtension[]} */
function reviewedEnumExtensions(snapshot) {
    const quick = uniqueSheet(snapshot, "Quick log");
    const tables = quick["tables"];
    const matches = Array.isArray(tables)
        ? tables.filter(
              (table) => isRecord(table) && table["name"] === "QuickCareLog"
          )
        : [];
    const table = records(matches)[0];
    if (
        !isRecord(table) ||
        matches.length !== 1 ||
        typeof table["tableId"] !== "string"
    )
        throw new Error("Missing reviewed QuickCareLog table");
    const bulk = uniqueSheet(snapshot, "App bulk");
    if (
        bulk.properties.gridProperties.rowCount !== 1000 ||
        bulk.properties.gridProperties.columnCount !== 62
    )
        throw new Error("App bulk light migration contract changed");
    return [
        {
            append: ["Light app", "Lux meter"],
            column: 34,
            endRow: 5000,
            expected: [
                "Scale",
                "Ruler",
                "Estimated from photo",
                "Estimated visually",
                "Observed",
                "Other",
                "Unspecified",
                "Hygrometer",
            ],
            startRow: 1,
            title: "History",
        },
        {
            append: ["Inspect"],
            column: 3,
            endRow: 1000,
            expected: [
                "Water",
                "Weigh",
                "Water + weigh",
                "Rotation",
                "Check",
                "Clean",
                "Prune",
                "Pest",
                "Other",
            ],
            startRow: 1,
            title: "App bulk",
        },
        {
            append: ["Inspect"],
            column: 1,
            endRow: 3,
            expected: [
                "Water",
                "Weigh",
                "Measure",
                "Check",
                "Rotation",
                "Clean",
                "Prune",
                "Other",
                "Clear events",
            ],
            startRow: 2,
            title: "Quick log",
        },
        {
            append: ["Inspect"],
            column: 4,
            endRow: 40,
            expected: [
                "Water",
                "Weigh",
                "Measure",
                "Check",
                "Repot",
                "Flower",
                "Photo",
                "Pest",
                "Other",
            ],
            startRow: 4,
            tableId: table["tableId"],
            title: "Quick log",
        },
    ];
}

/**
 * @param {Sheet} sheet @param {EnumExtension} extension @param
 *   {{userEnteredValue: string}[]} expectedValues @param {{userEnteredValue:
 *   string}[]} values
 */
function tableEnumRequest(sheet, extension, expectedValues, values) {
    const { column, endRow, startRow, tableId } = extension;
    const tables = sheet["tables"];
    const matches = Array.isArray(tables)
        ? tables.filter(
              (table) => isRecord(table) && table["tableId"] === tableId
          )
        : [];
    const table = records(matches)[0];
    if (
        !isRecord(table) ||
        matches.length !== 1 ||
        !isRecord(table["range"]) ||
        !Array.isArray(table["columnProperties"])
    )
        throw new Error("Missing reviewed light enum table");
    const range = table["range"];
    if (
        (range["startRowIndex"] ?? 0) !== startRow - 1 ||
        range["endRowIndex"] !== endRow
    )
        throw new Error("Light enum table rows changed");
    const startColumn = range["startColumnIndex"] ?? 0;
    if (typeof startColumn !== "number")
        throw new Error("Invalid light table start column");
    const properties = structuredClone(records(table["columnProperties"]));
    const property = properties.find(
        (item) => isRecord(item) && item["columnIndex"] === column - startColumn
    );
    if (
        !isRecord(property) ||
        property["columnType"] !== "DROPDOWN" ||
        !isRecord(property["dataValidationRule"])
    )
        throw new Error("Light enum table column changed");
    const rule = property["dataValidationRule"];
    const condition = rule["condition"];
    if (
        !isRecord(condition) ||
        condition["type"] !== "ONE_OF_LIST" ||
        !isDeepStrictEqual(condition["values"], expectedValues)
    )
        throw new Error("Light enum table validation changed");
    rule["condition"] = { ...condition, values };
    return {
        updateTable: {
            fields: "columnProperties",
            table: { columnProperties: properties, tableId },
        },
    };
}

/** @param {Snapshot} snapshot @param {string} title */
function uniqueSheet(snapshot, title) {
    const matches = snapshot.sheets.filter(
        (sheet) => sheet.properties.title === title
    );
    const sheet = matches[0];
    if (!sheet || matches.length !== 1)
        throw new Error(`Missing unique light schema snapshot: ${title}`);
    return sheet;
}

/**
 * @param {Sheet} sheet @param {readonly string[] | null} headers @param
 *   {number} width
 */
function validateAppendSheet(sheet, headers, width) {
    const title = sheet.properties.title;
    const { columnCount, rowCount } = sheet.properties.gridProperties;
    if (
        ![
            width,
            width + 1,
            width + 2,
        ].includes(columnCount) ||
        rowCount < 2 ||
        (title === "History" && rowCount !== 5000)
    )
        throw new Error(`Unexpected light schema capacity: ${title}`);
    const rows = completeRows(sheet);
    const isOccupied = rows.some((row) =>
        row
            .slice(width)
            .some(
                (cell) =>
                    cell.userEnteredValue !== undefined ||
                    cell.effectiveValue !== undefined
            )
    );
    if (isOccupied)
        throw new Error(`Light destination occupied or replay: ${title}`);
    if (
        headers?.some(
            (label, column) =>
                rows[0]?.[column]?.userEnteredValue?.stringValue !== label
        ) === true
    )
        throw new Error(`Legacy light headers changed: ${title}`);
    if (
        headers === null &&
        rows[0]?.[0]?.userEnteredValue?.formulaValue !== lightViewFormula(43)
    )
        throw new Error("History view formula changed");
}

/**
 * @param {string} title @param {Cell[]} current @param {number} rowIndex @param
 *   {number} oldWidth
 */
function verifyAppendedRow(title, current, rowIndex, oldWidth) {
    for (let column = oldWidth; column < oldWidth + 2; column += 1) {
        const cell = current[column];
        const expectedValue =
            rowIndex === 0 && title !== historyViewTitle
                ? { stringValue: lightHeaders[column - oldWidth] }
                : undefined;
        if (!isDeepStrictEqual(cell?.userEnteredValue, expectedValue))
            throw new Error(
                `Unexpected light readback value: ${title} row ${rowIndex + 1}`
            );
        if (
            title !== historyViewTitle &&
            rowIndex > 0 &&
            !isDeepStrictEqual(cell?.dataValidation, {
                condition: {
                    type: "NUMBER_GREATER_THAN_EQ",
                    values: [{ userEnteredValue: "0" }],
                },
                strict: true,
            })
        )
            throw new Error(
                `Light readback numeric validation changed: ${title}`
            );
        if (
            rowIndex > 0 &&
            !isDeepStrictEqual(cell?.userEnteredFormat?.["numberFormat"], {
                pattern: "0.##",
                type: "NUMBER",
            })
        )
            throw new Error(`Light readback numeric format changed: ${title}`);
    }
}

/**
 * @param {string} title @param {Cell[]} row @param {Cell[]} current @param
 *   {number} rowIndex @param {number} width @param {EnumExtension[]} enums
 */
function verifyExistingRow(title, row, current, rowIndex, width, enums) {
    for (let column = 0; column < width; column += 1) {
        const expected = editableCell(row[column]);
        const actual = editableCell(current[column]);
        if (title === historyViewTitle && rowIndex === 0 && column === 0)
            expected["userEnteredValue"] = {
                formulaValue: lightViewFormula(45),
            };
        const extension = enums.find(
            (item) =>
                item.column === column &&
                rowIndex >= item.startRow &&
                rowIndex < item.endRow
        );
        if (extension) {
            const rule = expected["dataValidation"];
            if (!isRecord(rule) || !isRecord(rule["condition"]))
                throw new Error("Missing reviewed light validation");
            expected["dataValidation"] = {
                ...rule,
                condition: {
                    ...rule["condition"],
                    values: [...extension.expected, ...extension.append].map(
                        (userEnteredValue) => ({ userEnteredValue })
                    ),
                },
            };
        }
        if (!isDeepStrictEqual(expected, actual))
            throw new Error(
                `Existing light readback cell changed: ${title} row ${rowIndex + 1} column ${column + 1}`
            );
    }
}

/**
 * @param {ReturnType<typeof buildLightSchemaRequests>} plan
 * @param {Snapshot} before
 * @param {Snapshot} after
 */
function verifyNativeMetadata(plan, before, after) {
    if (
        !isDeepStrictEqual(
            before.sheets.map((sheet) => sheet.properties.sheetId),
            after.sheets.map((sheet) => sheet.properties.sheetId)
        )
    )
        throw new Error("Light readback sheet membership or order changed");
    for (const source of before.sheets) {
        const target = uniqueSheet(after, source.properties.title);
        const expected = metadataOnly(source);
        const actual = metadataOnly(target);
        for (const request of plan.requests)
            applyMetadataRequest(expected, request);
        // The API can return protections in a different order; identities and
        // every other protection field still have to match.
        for (const sheet of [expected, actual]) {
            const protections = sheet["protectedRanges"];
            if (Array.isArray(protections))
                protections.sort(
                    (left, right) =>
                        Number(
                            isRecord(left) ? left["protectedRangeId"] : NaN
                        ) -
                        Number(
                            isRecord(right) ? right["protectedRangeId"] : NaN
                        )
                );
        }
        if (!isDeepStrictEqual(expected, actual))
            throw new Error(
                `Light readback native metadata changed: ${source.properties.title}`
            );
    }
}
