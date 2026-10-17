import { createHash } from "node:crypto";

const font = "JetBrains Mono";
const viewTitle = "History view";
const historyHeaders = [
    "Leaf temperature (°C)",
    "Leaf temperature entry unit",
    "Paired air temperature (°C)",
    "Paired air temperature entry unit",
    "Paired relative humidity (%)",
    "Leaf VPD (kPa)",
    "Leaf VPD source",
];
const sourceOptions = [
    "Device",
    "Calculated",
    "Not calculated",
];
const leafMethods = [
    "IR thermometer",
    "VPD meter",
    "Leaf temperature + air/RH",
];

/**
 * Re-read the captured ranges immediately before applying the one-time plan.
 *
 * @param {{ preconditionDigest: string }} plan
 * @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot} fresh
 */
export function assertLeafVpdMigrationPreconditions(plan, fresh) {
    if (plan.preconditionDigest !== digest(fresh))
        throw new Error(
            "Workbook drift since Leaf VPD planning; rebuild from the fresh snapshot"
        );
}

/**
 * Append seven independent Leaf VPD fields without repurposing Support or
 * changing canonical observations. Schema must come from the maintained server;
 * changes to native Sheets require a backup and disposable rehearsal.
 *
 * @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot} snapshot
 * @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSchema} schema
 *
 * @returns {import("../../types/leaf-vpd-migration.d.ts").LeafVpdPlan}
 */
export function buildLeafVpdMigrationRequests(snapshot, schema) {
    const access = accessors(snapshot);
    validateSchema(snapshot, schema);
    const history = access.sheet("History");
    const entries = access.sheet("App entries");
    const view = access.sheet(viewTitle);
    const integrity = access.sheet("Integrity");
    const oldFormula = historyViewFormula(60, "BH");
    if (access.value(viewTitle, 0, 0)?.formulaValue !== oldFormula)
        throw new Error("History view formula drift");
    access.requireRead("Integrity", 11, 1, 12, 2);
    const scan = access.value("Integrity", 11, 1)?.formulaValue;
    if (
        scan?.startsWith("=SUM(") !== true ||
        !scan.endsWith(")") ||
        !scan.includes("History!AT2:BH5000") ||
        scan.includes("History!BI2:BO5000")
    )
        throw new Error("Integrity scan drift or Leaf VPD already installed");
    const prepareRequests = [
        ...appendFields(history, 60, schema.history.slice(60), true),
        ...appendFields(entries, 52, schema.entries.slice(52), false),
        ...appendView(view),
        bulkValidation(snapshot, schema.bulkEvents),
        methodValidation(snapshot),
    ];
    if (history.basicFilter !== undefined) {
        const filter = { ...history.basicFilter };
        if (
            filter.range.endColumnIndex !== 60 ||
            (filter.range.startColumnIndex ?? 0) !== 0 ||
            (filter.range.startRowIndex ?? 0) !== 0
        )
            throw new Error("History basic filter drift");
        // Replaying sortSpecs re-sorts the canonical ledger. Preserve filtering
        // criteria, but extending the range must never issue a sort operation.
        delete filter.sortSpecs;
        prepareRequests.push({
            setBasicFilter: {
                filter: {
                    ...filter,
                    range: { ...filter.range, endColumnIndex: 67 },
                },
            },
        });
    }
    return {
        footprint: [
            "History!BI:BO",
            "History!AI2:AI5000 validation only",
            "History view!BI:BO",
            "History view!A1",
            "App entries!BA:BG",
            "App bulk!D2:D1000 validation only",
            "Integrity!B12",
            "History basic filter range",
        ],
        formulaRequests: [
            write(view.properties.sheetId, 0, 0, [
                [historyViewFormula(67, "BO")],
            ]),
            write(integrity.properties.sheetId, 11, 1, [
                [
                    `${scan.slice(0, -1)},SUM(ARRAYFORMULA(N(ISERROR(History!BI2:BO5000)))),SUM(ARRAYFORMULA(N(ISERROR('History view'!BI1:BO5000)))))`,
                ],
            ]),
        ],
        preconditionDigest: digest(snapshot),
        prepareRequests,
    };
}

/**
 * @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot} snapshot
 */
function accessors(snapshot) {
    /** @param {string} name */
    const sheet = (name) => {
        const matches = snapshot.metadata.sheets.filter(
            (entry) => entry.properties.title === name
        );
        if (matches.length !== 1 || !matches[0])
            throw new Error(`Missing or ambiguous sheet: ${name}`);
        return matches[0];
    };
    /** @param {string} name @param {number} row @param {number} column */
    const value = (name, row, column) => {
        const matches = snapshot.cells.filter(
            (entry) =>
                entry.sheet === name &&
                entry.row === row &&
                entry.column === column
        );
        if (matches.length > 1)
            throw new Error(`Duplicate captured cell: ${name}`);
        return matches[0]?.value;
    };
    /**
     * @param {string} name @param {number} startRow @param {number} startColumn
     * @param {number} endRow @param {number} endColumn
     */
    const requireRead = (name, startRow, startColumn, endRow, endColumn) => {
        if (
            snapshot.readRanges.every(
                (range) =>
                    range.sheet !== name ||
                    range.startRow > startRow ||
                    range.startColumn > startColumn ||
                    range.endRow < endRow ||
                    range.endColumn < endColumn
            )
        )
            throw new Error(`Missing complete captured range: ${name}`);
    };
    return { requireRead, sheet, value };
}

/**
 * @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot["metadata"]["sheets"][number]} sheet
 * @param {number} start
 * @param {string[]} headers
 * @param {boolean} isCanonical
 *
 * @returns {Record<string, unknown>[]}
 */
function appendFields(sheet, start, headers, isCanonical) {
    const { gridProperties, sheetId } = sheet.properties;
    const end = start + 7;
    const range = {
        endColumnIndex: end,
        endRowIndex: gridProperties.rowCount,
        sheetId,
        startColumnIndex: start,
        startRowIndex: 1,
    };
    const headerRange = { ...range, endRowIndex: 1, startRowIndex: 0 };
    /** @type {Record<string, unknown>[]} */
    const requests = [
        { appendDimension: { dimension: "COLUMNS", length: 7, sheetId } },
        write(sheetId, 0, start, [headers]),
        {
            copyPaste: {
                destination: headerRange,
                pasteType: "PASTE_FORMAT",
                source: {
                    ...headerRange,
                    endColumnIndex: start,
                    startColumnIndex: start - 1,
                },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: { type: "TEXT" },
                        textFormat: { fontFamily: font },
                        wrapStrategy: "WRAP",
                    },
                },
                fields: "userEnteredFormat",
                range,
            },
        },
        { setDataValidation: { range } },
    ];
    /** @type {[number, string, string[]][]} */
    const validations = [
        [
            0,
            "NUMBER_BETWEEN",
            isCanonical ? ["-50", "100"] : ["-58", "212"],
        ],
        [
            1,
            "ONE_OF_LIST",
            ["C", "F"],
        ],
        [
            2,
            "NUMBER_BETWEEN",
            isCanonical ? ["-50", "100"] : ["-58", "212"],
        ],
        [
            3,
            "ONE_OF_LIST",
            ["C", "F"],
        ],
        [
            4,
            "NUMBER_BETWEEN",
            ["0", "100"],
        ],
        [
            6,
            "ONE_OF_LIST",
            sourceOptions,
        ],
    ];
    if (!isCanonical)
        validations.push([
            5,
            "NUMBER_GREATER_THAN_EQ",
            ["0"],
        ]);
    for (const [
        offset,
        type,
        choices,
    ] of validations) {
        const columnRange = {
            ...range,
            endColumnIndex: start + offset + 1,
            startColumnIndex: start + offset,
        };
        requests.push({
            setDataValidation: {
                range: columnRange,
                rule: {
                    condition: {
                        type,
                        values: choices.map((userEnteredValue) => ({
                            userEnteredValue,
                        })),
                    },
                    showCustomUi: type === "ONE_OF_LIST",
                    strict: true,
                },
            },
        });
        if (type !== "ONE_OF_LIST")
            requests.push({
                repeatCell: {
                    cell: {
                        userEnteredFormat: {
                            numberFormat: { pattern: "0.###", type: "NUMBER" },
                        },
                    },
                    fields: "userEnteredFormat.numberFormat",
                    range: columnRange,
                },
            });
    }
    if (isCanonical)
        requests.push({
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: { pattern: "0.###", type: "NUMBER" },
                    },
                },
                fields: "userEnteredFormat.numberFormat",
                range: {
                    ...range,
                    endColumnIndex: start + 6,
                    startColumnIndex: start + 5,
                },
            },
        });
    return requests;
}

/**
 * @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot["metadata"]["sheets"][number]} sheet
 *
 * @returns {Record<string, unknown>[]}
 */
function appendView(sheet) {
    const sheetId = sheet.properties.sheetId;
    return [
        { appendDimension: { dimension: "COLUMNS", length: 7, sheetId } },
        {
            copyPaste: {
                destination: {
                    endColumnIndex: 67,
                    endRowIndex: 1,
                    sheetId,
                    startColumnIndex: 60,
                    startRowIndex: 0,
                },
                pasteType: "PASTE_FORMAT",
                source: {
                    endColumnIndex: 60,
                    endRowIndex: 1,
                    sheetId,
                    startColumnIndex: 59,
                    startRowIndex: 0,
                },
            },
        },
        {
            setDataValidation: {
                range: {
                    endColumnIndex: 67,
                    endRowIndex: 5000,
                    sheetId,
                    startColumnIndex: 60,
                    startRowIndex: 1,
                },
            },
        },
        {
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        textFormat: { fontFamily: font },
                        wrapStrategy: "WRAP",
                    },
                },
                fields: "userEnteredFormat.textFormat.fontFamily,userEnteredFormat.wrapStrategy",
                range: {
                    endColumnIndex: 67,
                    endRowIndex: 5000,
                    sheetId,
                    startColumnIndex: 60,
                    startRowIndex: 1,
                },
            },
        },
    ];
}

/**
 * @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot} snapshot
 * @param {string[]} choices
 */
function bulkValidation(snapshot, choices) {
    const { requireRead, sheet } = accessors(snapshot);
    const bulk = sheet("App bulk");
    const rows = bulk.properties.gridProperties.rowCount;
    requireRead("App bulk", 1, 3, rows, 4);
    const cells = snapshot.cells.filter(
        (entry) =>
            entry.sheet === "App bulk" &&
            entry.column === 3 &&
            entry.row >= 1 &&
            entry.row < rows
    );
    const first = cells[0]?.dataValidation;
    if (
        first?.condition.type !== "ONE_OF_LIST" ||
        cells.length !== rows - 1 ||
        cells.some(
            (entry) =>
                JSON.stringify(entry.dataValidation) !== JSON.stringify(first)
        )
    )
        throw new Error(
            "App bulk action validation drift or incomplete capture"
        );
    const old =
        first.condition.values?.map((value) => value.userEnteredValue) ?? [];
    if (
        !old.includes("Support") ||
        JSON.stringify(old.filter((value) => value !== "Support")) !==
            JSON.stringify(choices)
    )
        throw new Error(
            "App bulk action choices changed or Support already retired"
        );
    return {
        setDataValidation: {
            range: {
                endColumnIndex: 4,
                endRowIndex: rows,
                sheetId: bulk.properties.sheetId,
                startColumnIndex: 3,
                startRowIndex: 1,
            },
            rule: {
                ...first,
                condition: {
                    type: "ONE_OF_LIST",
                    values: choices.map((userEnteredValue) => ({
                        userEnteredValue,
                    })),
                },
            },
        },
    };
}

/** @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot} snapshot */
function digest(snapshot) {
    return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

/** @param {number} width @param {string} lastColumn */
function historyViewFormula(width, lastColumn) {
    return `=LET(rows,SORT(FILTER(History!A2:${lastColumn}5000,History!A2:A5000<>""),1,FALSE,10,FALSE),fmt,LAMBDA(d,IF(d="","",IF(MOD(d,1)=0,TEXT(d,"M/d/yyyy"),TEXT(d,"M/d/yyyy h:mm AM/PM")))),VSTACK(History!A1:${lastColumn}1,HSTACK(MAP(CHOOSECOLS(rows,1),fmt),CHOOSECOLS(rows,SEQUENCE(1,${width - 1},2,1)))))`;
}

/** @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot} snapshot */
function methodValidation(snapshot) {
    const { requireRead, sheet } = accessors(snapshot);
    const history = sheet("History");
    const rows = history.properties.gridProperties.rowCount;
    requireRead("History", 1, 34, rows, 35);
    const cells = snapshot.cells.filter(
        (entry) =>
            entry.sheet === "History" &&
            entry.column === 34 &&
            entry.row >= 1 &&
            entry.row < rows
    );
    const first = cells[0]?.dataValidation;
    if (
        first?.condition.type !== "ONE_OF_LIST" ||
        cells.length !== rows - 1 ||
        cells.some(
            (entry) =>
                JSON.stringify(entry.dataValidation) !== JSON.stringify(first)
        )
    )
        throw new Error(
            "History measurement-method validation drift or incomplete capture"
        );
    const old = first.condition.values ?? [];
    if (
        leafMethods.some((method) =>
            old.some((value) => value.userEnteredValue === method)
        )
    )
        throw new Error("History Leaf VPD methods already installed");
    return {
        setDataValidation: {
            range: {
                endColumnIndex: 35,
                endRowIndex: rows,
                sheetId: history.properties.sheetId,
                startColumnIndex: 34,
                startRowIndex: 1,
            },
            rule: {
                ...first,
                condition: {
                    type: "ONE_OF_LIST",
                    values: [
                        ...old,
                        ...leafMethods.map((userEnteredValue) => ({
                            userEnteredValue,
                        })),
                    ],
                },
            },
        },
    };
}

/**
 * @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSnapshot} snapshot
 * @param {import("../../types/leaf-vpd-migration.d.ts").LeafVpdSchema} schema
 */
function validateSchema(snapshot, schema) {
    const { requireRead, sheet, value } = accessors(snapshot);
    if (
        schema.history.length !== 67 ||
        schema.entries.length !== 59 ||
        schema.bulk.length !== 74 ||
        JSON.stringify(schema.history.slice(60)) !==
            JSON.stringify(historyHeaders) ||
        JSON.stringify(schema.entries.slice(52)) !==
            JSON.stringify(
                historyHeaders.map((header) => header.replace(" (°C)", ""))
            ) ||
        schema.bulkEvents.includes("Leaf VPD") ||
        schema.bulkEvents.includes("Support")
    )
        throw new Error("Expected the maintained append-only Leaf VPD schema");
    for (const [
        name,
        width,
        headers,
    ] of /** @type {[string, number, string[]][]} */ ([
        [
            "History",
            60,
            schema.history,
        ],
        [
            "App entries",
            52,
            schema.entries,
        ],
        [
            "App bulk",
            74,
            schema.bulk,
        ],
    ])) {
        if (sheet(name).properties.gridProperties.columnCount !== width)
            throw new Error(
                `${name} schema drift or migration already installed`
            );
        requireRead(name, 0, 0, 1, width);
        for (let column = 0; column < width; column += 1) {
            if (value(name, 0, column)?.stringValue !== headers[column])
                throw new Error(`${name} header drift at column ${column + 1}`);
        }
    }
    if (
        sheet("History").properties.gridProperties.rowCount !== 5000 ||
        sheet(viewTitle).properties.gridProperties.rowCount !== 5000 ||
        sheet(viewTitle).properties.gridProperties.columnCount !== 60
    )
        throw new Error("Unexpected History/view capacity");
    requireRead(viewTitle, 0, 0, 1, 60);
}

/**
 * @param {number} sheetId @param {number} rowIndex @param {number} columnIndex
 * @param {string[][]} rows
 */
function write(sheetId, rowIndex, columnIndex, rows) {
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: rows.map((row) => ({
                values: row.map((value) => ({
                    userEnteredValue: value.startsWith("=")
                        ? { formulaValue: value }
                        : { stringValue: value },
                })),
            })),
            start: { columnIndex, rowIndex, sheetId },
        },
    };
}
