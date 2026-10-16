import { createHash } from "node:crypto";

import palette from "./plant-colors.json" with { type: "json" };

const view = "Light & humidity";
const helper = "Environment data";
const events = [
    "Mist",
    "Move",
    "Temperature",
    "Environment",
    "Propagate",
    "Support",
];
const font = "JetBrains Mono";

/**
 * @typedef {Omit<
 *     import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot,
 *     "cells"
 * > & {
 *     readBounds: Record<string, { rowCount: number; columnCount: number }>;
 *     cells: (import("../../test/workbook-fixtures.d.ts").WorkbookSnapshot["cells"][number] & {
 *         dataValidation?: {
 *             condition: {
 *                 type: string;
 *                 values?: { userEnteredValue: string }[];
 *             };
 *             strict?: boolean;
 *             showCustomUi?: boolean;
 *         };
 *     })[];
 * }} CareEventsSnapshot
 *
 * @typedef {{ history: string[]; entries: string[]; bulk: string[] }} CareEventsSchema
 */

/**
 * @param {{ preconditionDigest: string }} plan @param {CareEventsSnapshot}
 *   fresh
 */
export function assertCareEventsMigrationPreconditions(plan, fresh) {
    if (plan.preconditionDigest !== digest(fresh))
        throw new Error(
            "Workbook drift since planning; rebuild from the fresh snapshot"
        );
}

/**
 * Guarded, one-time schema and environmental-view extension. Supply schema
 * constants extracted from the maintained server source. Native rehearsal and
 * fresh precondition reads precede each write phase; charts follow successful
 * formula calculation. Existing canonical cells, charts and sorts are
 * untouched.
 *
 * @param {CareEventsSnapshot} snapshot
 * @param {CareEventsSchema} schema
 */
export function buildCareEventsMigrationRequests(snapshot, schema) {
    /** @type {Record<string, unknown>[]} */
    const prepareRequests = [];
    /** @type {ReturnType<typeof write>[]} */
    const formulaRequests = [];
    /** @type {Record<string, unknown>[]} */
    const chartRequests = [];
    prepareRequests.push(
        ...schemaRequests(snapshot, schema),
        ...existingValidationRequests(snapshot)
    );
    const historyView = historyViewRequests(snapshot);
    prepareRequests.push(historyView.prepare);
    formulaRequests.push(historyView.formula);

    const { dataId, viewId } = validateEnvironment(snapshot);
    prepareRequests.push(
        {
            appendDimension: {
                dimension: "COLUMNS",
                length: 12,
                sheetId: viewId,
            },
        },
        {
            appendDimension: {
                dimension: "COLUMNS",
                length: 9,
                sheetId: dataId,
            },
        }
    );
    formulaRequests.push(
        write(dataId, 0, 0, [
            ["=GARDEN_ENVIRONMENT_READINGS(History!A2:BH5000)"],
        ]),
        write(dataId, 0, 22, [
            ["=GARDEN_RECORDED_LOCATIONS(History!A2:BH5000)"],
        ]),
        write(viewId, 0, 0, [
            ["Light, humidity & temperature · recorded environmental evidence"],
        ]),
        write(viewId, 1, 0, [
            [
                "Record reading location, device or preset, settings and time in Notes. Air and soil temperatures are separate observations.",
            ],
        ]),
        write(viewId, 2, 0, [
            [
                "PPFD is estimated; lux, relative humidity and temperature keep separate units. Blank means no reading; zero is a reading.",
            ],
        ]),
        write(viewId, 6, 8, [
            [
                "Air temperature (°C)",
                "Air observed at",
                "Soil temperature (°C)",
                "Soil observed at",
                "Latest recorded location",
                "Location observed at",
            ],
        ]),
        write(viewId, 188, 10, [
            ["Air temperature (°C)", "Soil temperature (°C)"],
        ]),
        write(viewId, 189, 0, [
            [
                `=IFNA(FILTER('${helper}'!A2:L5000,'${helper}'!B2:B5000=$B$116),"")`,
            ],
        ]),
        write(viewId, 116, 0, [
            [
                `=IF(COUNTIF('${helper}'!B2:B5000,B116)=0,"No environmental readings recorded for this plant.","Selected plant: original evidence below the charts; each metric keeps its own observation time.")`,
            ],
        ])
    );
    for (const [index, { id }] of palette.entries()) {
        formulaRequests.push(
            write(viewId, 7 + index, 8, [
                [
                    ...["K", "L"].flatMap((column) => [
                        latest(id, column, column),
                        latest(id, column, "A"),
                    ]),
                    location(id, "Z"),
                    location(id, "W"),
                ],
            ])
        );
    }
    for (const [index, target] of ["Air", "Soil"].entries()) {
        const metric = `${target} temperature (°C)`;
        const column = index === 0 ? "K" : "L";
        const selectedColumn = index === 0 ? "T" : "V";
        formulaRequests.push(
            write(dataId, 0, 18 + index * 2, [["Observed at", metric]]),
            write(dataId, 1, 18 + index * 2, [
                [
                    `=IFNA(FILTER(HSTACK(A2:A5000,${column}2:${column}5000),B2:B5000='${view}'!$B$116,ISNUMBER(${column}2:${column}5000)),"")`,
                ],
            ]),
            write(viewId, 45 + index * 23, 13, [
                [
                    `=IF(COUNT(${index === 0 ? "I" : "K"}8:${index === 0 ? "I" : "K"}43)=0,"No ${target.toLowerCase()} temperature readings recorded.","Latest recorded values; observation dates may differ.")`,
                ],
            ]),
            write(viewId, 118 + index * 23, 13, [
                [
                    `=IF(COUNT('${helper}'!${selectedColumn}2:${selectedColumn}5000)=0,"No ${target.toLowerCase()} temperature readings for selected plant.","Recorded points; no continuous monitoring implied.")`,
                ],
            ])
        );
        chartRequests.push(
            temperatureChart(
                907_202_619 + index * 2,
                viewId,
                dataId,
                metric,
                index,
                false
            ),
            temperatureChart(
                907_202_620 + index * 2,
                viewId,
                dataId,
                metric,
                index,
                true
            )
        );
    }
    for (const id of [
        907_202_619,
        907_202_620,
        907_202_621,
        907_202_622,
    ]) {
        if (
            snapshot.metadata.sheets.some(
                (entry) =>
                    entry.charts?.some((chart) => chart.chartId === id) === true
            )
        )
            throw new Error(`Chart ID ${id} occupied`);
    }
    prepareRequests.push({
        repeatCell: {
            cell: {
                userEnteredFormat: {
                    textFormat: { fontFamily: font },
                    verticalAlignment: "TOP",
                    wrapStrategy: "WRAP",
                },
            },
            fields: "userEnteredFormat",
            range: {
                endColumnIndex: 22,
                sheetId: viewId,
                startColumnIndex: 10,
            },
        },
    });
    for (const [
        sheetId,
        column,
        start,
        end,
    ] of /** @type {const} */ ([
        [
            viewId,
            9,
            7,
            43,
        ],
        [
            viewId,
            11,
            7,
            43,
        ],
        [
            viewId,
            13,
            7,
            43,
        ],
        [
            dataId,
            18,
            1,
            5000,
        ],
        [
            dataId,
            20,
            1,
            5000,
        ],
        [
            dataId,
            22,
            1,
            5000,
        ],
    ]))
        prepareRequests.push({
            repeatCell: {
                cell: {
                    userEnteredFormat: {
                        numberFormat: {
                            pattern: "mmm d, yyyy h:mm am/pm",
                            type: "DATE_TIME",
                        },
                    },
                },
                fields: "userEnteredFormat.numberFormat",
                range: {
                    endColumnIndex: column + 1,
                    endRowIndex: end,
                    sheetId,
                    startColumnIndex: column,
                    startRowIndex: start,
                },
            },
        });
    prepareRequests.push(
        {
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 145 },
                range: {
                    dimension: "COLUMNS",
                    endIndex: 22,
                    sheetId: viewId,
                    startIndex: 10,
                },
            },
        },
        {
            copyPaste: {
                destination: {
                    endColumnIndex: 14,
                    endRowIndex: 7,
                    sheetId: viewId,
                    startColumnIndex: 8,
                    startRowIndex: 6,
                },
                pasteType: "PASTE_FORMAT",
                source: {
                    endColumnIndex: 8,
                    endRowIndex: 7,
                    sheetId: viewId,
                    startColumnIndex: 7,
                    startRowIndex: 6,
                },
            },
        },
        {
            copyPaste: {
                destination: {
                    endColumnIndex: 12,
                    endRowIndex: 189,
                    sheetId: viewId,
                    startColumnIndex: 10,
                    startRowIndex: 188,
                },
                pasteType: "PASTE_FORMAT",
                source: {
                    endColumnIndex: 10,
                    endRowIndex: 189,
                    sheetId: viewId,
                    startColumnIndex: 9,
                    startRowIndex: 188,
                },
            },
        }
    );
    formulaRequests.push(integrityRequest(snapshot));
    return {
        chartRequests,
        formulaRequests,
        preconditionDigest: digest(snapshot),
        prepareRequests,
        verification: {
            bulkWidth: 74,
            entriesWidth: 52,
            evidence: "A189:L5188",
            helper: "A1:AA5000",
            historyWidth: 60,
            preserve: [
                "All existing canonical and staging records",
                "Existing formulas outside reviewed anchors",
                "Existing chart IDs/specifications/positions",
                "Protections",
                "Relative tab order",
                "Watering and setup semantics",
            ],
            selectedPlant: "B116",
            summary: "A7:N43",
        },
    };
}

/** @param {CareEventsSnapshot} snapshot */
function accessors(snapshot) {
    const sheet = (/** @type {string} */ name) => {
        const found = snapshot.metadata.sheets.find(
            (entry) => entry.properties.title === name
        );
        if (!found) throw new Error(`Missing ${name}`);
        return found;
    };
    const value = (
        /** @type {string} */ name,
        /** @type {number} */ row,
        /** @type {number} */ column
    ) =>
        snapshot.cells.find(
            (cell) =>
                cell.sheet === name &&
                cell.row === row &&
                cell.column === column
        )?.value;
    return { sheet, value };
}

/** @param {CareEventsSnapshot} snapshot */
function assertEmptyEnvironmentDestinations(snapshot) {
    for (const cell of snapshot.cells) {
        if (
            ((cell.sheet === helper && cell.column >= 10 && cell.column < 12) ||
                (cell.sheet === view &&
                    cell.row >= 6 &&
                    cell.row < 7 + palette.length &&
                    cell.column >= 8)) &&
            Object.values(cell.value).some((entry) => entry !== "")
        )
            throw new Error("Occupied environment extension destination");
    }
}

/** @param {CareEventsSnapshot} snapshot */
function digest(snapshot) {
    return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

/** @param {CareEventsSnapshot} snapshot */
function existingValidationRequests(snapshot) {
    const { sheet } = accessors(snapshot);
    /** @type {Record<string, unknown>[]} */
    const prepareRequests = [];
    for (const [
        name,
        column,
        additional,
    ] of /** @type {[string, number, string[]][]} */ ([
        [
            "History",
            34,
            ["Thermometer"],
        ],
        [
            "App bulk",
            3,
            events.filter((event) => event !== "Temperature"),
        ],
    ])) {
        const rows = sheet(name).properties.gridProperties.rowCount;
        if ((snapshot.readBounds[name]?.rowCount ?? 0) < rows)
            throw new Error(`Complete ${name} validation read required`);
        const validated = snapshot.cells
            .filter(
                (cell) =>
                    cell.sheet === name &&
                    cell.column === column &&
                    cell.row > 0 &&
                    cell.dataValidation !== undefined
            )
            .toSorted((a, b) => a.row - b.row);
        const first = validated[0]?.dataValidation;
        if (first?.condition.type !== "ONE_OF_LIST")
            throw new Error(`${name} expected validation missing`);
        const standard = JSON.stringify(first);
        if (
            validated.some(
                (cell) => JSON.stringify(cell.dataValidation) !== standard
            )
        )
            throw new Error(`${name} custom validation drift`);
        const oldValues = first.condition.values ?? [];
        if (
            additional.some((item) =>
                oldValues.some((entry) => entry.userEnteredValue === item)
            )
        )
            throw new Error(`${name} validation already extended`);
        const rule = {
            ...first,
            condition: {
                ...first.condition,
                values: [
                    ...oldValues,
                    ...additional.map((userEnteredValue) => ({
                        userEnteredValue,
                    })),
                ],
            },
        };
        let start = -1;
        let end = -1;
        const emit = () => {
            if (start >= 0)
                prepareRequests.push({
                    setDataValidation: {
                        range: {
                            endColumnIndex: column + 1,
                            endRowIndex: end + 1,
                            sheetId: sheet(name).properties.sheetId,
                            startColumnIndex: column,
                            startRowIndex: start,
                        },
                        rule,
                    },
                });
        };
        for (const cell of validated) {
            if (cell.row !== end + 1) {
                emit();
                start = cell.row;
            }
            end = cell.row;
        }
        emit();
    }
    return prepareRequests;
}

/** @param {CareEventsSnapshot} snapshot */
function historyViewRequests(snapshot) {
    const { sheet, value } = accessors(snapshot);
    const historyView = sheet("History view");
    const historyViewFormula =
        '=LET(rows,SORT(FILTER(History!A2:AS5000,History!A2:A5000<>""),1,FALSE,10,FALSE),fmt,LAMBDA(d,IF(d="","",IF(MOD(d,1)=0,TEXT(d,"M/d/yyyy"),TEXT(d,"M/d/yyyy h:mm AM/PM")))),VSTACK(History!A1:AS1,HSTACK(MAP(CHOOSECOLS(rows,1),fmt),CHOOSECOLS(rows,SEQUENCE(1,44,2,1)))))';
    if (
        historyView.properties.gridProperties.columnCount !== 45 ||
        value("History view", 0, 0)?.formulaValue !== historyViewFormula
    )
        throw new Error("History view schema/formula drift");
    return {
        formula: write(historyView.properties.sheetId, 0, 0, [
            [
                historyViewFormula
                    .replaceAll("AS", "BH")
                    .replace("SEQUENCE(1,44,2,1)", "SEQUENCE(1,59,2,1)"),
            ],
        ]),
        prepare: {
            appendDimension: {
                dimension: "COLUMNS",
                length: 15,
                sheetId: historyView.properties.sheetId,
            },
        },
    };
}

/** @param {CareEventsSnapshot} snapshot */
function integrityRequest(snapshot) {
    const { sheet, value } = accessors(snapshot);
    const integrity = value("Integrity", 11, 1)?.formulaValue;
    if (
        integrity?.startsWith("=SUM(") !== true ||
        !integrity.endsWith(")") ||
        !integrity.includes(`'${helper}'!M1:R5000`) ||
        !integrity.includes("History!AQ2:AS5000") ||
        integrity.includes("History!AT2:BH5000")
    )
        throw new Error(
            "Integrity formula drift or extension already installed"
        );
    return write(sheet("Integrity").properties.sheetId, 11, 1, [
        [
            `${integrity.slice(0, -1)},SUM(ARRAYFORMULA(N(ISERROR(History!AT2:BH5000)))),SUM(ARRAYFORMULA(N(ISERROR('${helper}'!K1:L5000)))),SUM(ARRAYFORMULA(N(ISERROR('${helper}'!S1:AA5000)))),SUM(ARRAYFORMULA(N(ISERROR('${view}'!K1:V5188)))))`,
        ],
    ]);
}

/** @param {string} id @param {string} metric @param {string} result */
function latest(id, metric, result) {
    return `=XLOOKUP(1,ARRAYFORMULA(('${helper}'!$B$2:$B$5000="${id}")*ISNUMBER('${helper}'!$${metric}$2:$${metric}$5000)),'${helper}'!$${result}$2:$${result}$5000,"",0,-1)`;
}

/** @param {string} id @param {string} result */
function location(id, result) {
    return `=XLOOKUP("${id}",'${helper}'!$X$2:$X$5000,'${helper}'!$${result}$2:$${result}$5000,"",0,-1)`;
}

/** @param {number} sheetId @param {number} column @param {string} header */
function numericCareValidation(sheetId, column, header) {
    if (header === "Mist amount (mL)")
        return validation(sheetId, column, "NUMBER_GREATER", ["0"]);
    return validation(sheetId, column, "NUMBER_GREATER_THAN_EQ", [
        header === "Temperature (°C)" ? "-273.15" : "-459.67",
    ]);
}

/** @param {CareEventsSnapshot} snapshot @param {CareEventsSchema} schema */
function schemaRequests(snapshot, schema) {
    const { sheet, value } = accessors(snapshot);
    /** @type {Record<string, unknown>[]} */
    const prepareRequests = [];
    const schemas = /** @type {const} */ ([
        [
            "History",
            45,
            60,
            schema.history,
        ],
        [
            "App entries",
            37,
            52,
            schema.entries,
        ],
        [
            "App bulk",
            62,
            74,
            schema.bulk,
        ],
    ]);
    for (const [
        name,
        oldWidth,
        newWidth,
        headers,
    ] of schemas) {
        const current = sheet(name);
        const { gridProperties, sheetId } = current.properties;
        const bounds = snapshot.readBounds[name];
        if (
            !bounds ||
            gridProperties.columnCount !== oldWidth ||
            headers.length !== newWidth ||
            bounds.rowCount < 1 ||
            bounds.columnCount < oldWidth
        )
            throw new Error(
                `${name} schema drift or migration already installed`
            );
        for (let column = 0; column < oldWidth; column += 1) {
            if (value(name, 0, column)?.stringValue !== headers[column])
                throw new Error(`${name} header drift at column ${column + 1}`);
        }
        prepareRequests.push(
            {
                appendDimension: {
                    dimension: "COLUMNS",
                    length: newWidth - oldWidth,
                    sheetId,
                },
            },
            write(sheetId, 0, oldWidth, [headers.slice(oldWidth)]),
            {
                copyPaste: {
                    destination: {
                        endColumnIndex: newWidth,
                        endRowIndex: 1,
                        sheetId,
                        startColumnIndex: oldWidth,
                        startRowIndex: 0,
                    },
                    pasteType: "PASTE_FORMAT",
                    source: {
                        endColumnIndex: oldWidth,
                        endRowIndex: 1,
                        sheetId,
                        startColumnIndex: oldWidth - 1,
                        startRowIndex: 0,
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
                    range: {
                        endColumnIndex: newWidth,
                        sheetId,
                        startColumnIndex: oldWidth,
                        startRowIndex: 1,
                    },
                },
            },
            {
                // Native column extension inherits the previous last column's
                // validation, including on text fields. Clear only the appended
                // range before applying each new field's intended rule below.
                setDataValidation: {
                    range: {
                        endColumnIndex: newWidth,
                        sheetId,
                        startColumnIndex: oldWidth,
                        startRowIndex: 1,
                    },
                },
            }
        );
        const numericHeaders = [
            "Mist amount (mL)",
            "Temperature (°C)",
            "Temperature",
        ].filter((candidate) => headers.indexOf(candidate) >= oldWidth);
        for (const header of numericHeaders) {
            const column = headers.indexOf(header);
            prepareRequests.push(
                {
                    repeatCell: {
                        cell: {
                            userEnteredFormat: {
                                numberFormat: {
                                    pattern: "0.##",
                                    type: "NUMBER",
                                },
                            },
                        },
                        fields: "userEnteredFormat.numberFormat",
                        range: {
                            endColumnIndex: column + 1,
                            sheetId,
                            startColumnIndex: column,
                            startRowIndex: 1,
                        },
                    },
                },
                numericCareValidation(sheetId, column, header)
            );
        }
        for (const [header, choices] of /** @type {[string, string[]][]} */ ([
            ["Temperature target", ["Air", "Soil"]],
            ["Temperature entry unit", ["C", "F"]],
            [
                "Environment aspect",
                [
                    "Light",
                    "Airflow",
                    "Enclosure",
                    "Heating",
                    "Other",
                ],
            ],
            [
                "Propagation method",
                [
                    "Stem cutting",
                    "Leaf cutting",
                    "Offset",
                    "Division",
                    "Seed",
                    "Other",
                ],
            ],
            [
                "Support action",
                [
                    "Add",
                    "Adjust",
                    "Remove",
                ],
            ],
        ])) {
            const column = headers.indexOf(header);
            if (column >= oldWidth)
                prepareRequests.push(
                    validation(sheetId, column, "ONE_OF_LIST", choices)
                );
        }
        if (current.basicFilter) {
            const range = current.basicFilter.range;
            if (
                (range.startColumnIndex ?? 0) !== 0 ||
                range.endColumnIndex !== oldWidth
            )
                throw new Error(`${name} filter range drift`);
            // Explicitly remove sortSpecs: replaying them re-sorts the ledger.
            const filter = {
                ...current.basicFilter,
                range: { ...range, endColumnIndex: newWidth },
            };
            Reflect.deleteProperty(filter, "sortSpecs");
            prepareRequests.push({ setBasicFilter: { filter } });
        }
    }
    return prepareRequests;
}

/**
 * @param {number} chartId @param {number} viewId @param {number} dataId @param
 *   {string} metric @param {number} index @param {boolean} selected
 */
function temperatureChart(chartId, viewId, dataId, metric, index, selected) {
    const source = (/** @type {number} */ column) => ({
        sourceRange: {
            sources: [
                {
                    endColumnIndex: column + 1,
                    endRowIndex: selected ? 5000 : 43,
                    sheetId: selected ? dataId : viewId,
                    startColumnIndex: column,
                    startRowIndex: selected ? 0 : 6,
                },
            ],
        },
    });
    return {
        addChart: {
            chart: {
                chartId,
                position: {
                    overlayPosition: {
                        anchorCell: {
                            columnIndex: 13,
                            rowIndex: (selected ? 119 : 46) + index * 23,
                            sheetId: viewId,
                        },
                        heightPixels: 500,
                        widthPixels: 1120,
                    },
                },
                spec: {
                    basicChart: {
                        axis: [
                            {
                                format: { fontFamily: font },
                                position: "BOTTOM_AXIS",
                                title: selected ? "Observed at" : "Plant ID",
                            },
                            {
                                format: { fontFamily: font },
                                position: "LEFT_AXIS",
                                title: metric,
                            },
                        ],
                        chartType: selected ? "SCATTER" : "COLUMN",
                        domains: [
                            { domain: source(selected ? 18 + index * 2 : 0) },
                        ],
                        headerCount: 1,
                        interpolateNulls: false,
                        legendPosition: "NO_LEGEND",
                        series: [
                            {
                                colorStyle: {
                                    rgbColor:
                                        index === 0
                                            ? {
                                                  blue: 0.16,
                                                  green: 0.31,
                                                  red: 0.76,
                                              }
                                            : {
                                                  blue: 0.19,
                                                  green: 0.32,
                                                  red: 0.42,
                                              },
                                },
                                dataLabel: {
                                    textFormat: { fontFamily: font },
                                    type: "NONE",
                                },
                                series: source((selected ? 19 : 8) + index * 2),
                                targetAxis: "LEFT_AXIS",
                                ...(selected && {
                                    pointStyle: {
                                        shape: "CIRCLE",
                                        size: 5,
                                    },
                                }),
                            },
                        ],
                    },
                    fontName: font,
                    hiddenDimensionStrategy: "SHOW_ALL",
                    subtitle: selected
                        ? "Selected plant · recorded observations"
                        : "Latest recorded readings · dates may differ",
                    subtitleTextFormat: { fontFamily: font },
                    title: metric,
                    titleTextFormat: { bold: true, fontFamily: font },
                },
            },
        },
    };
}

/** @param {CareEventsSnapshot} snapshot */
function validateEnvironment(snapshot) {
    const { sheet, value } = accessors(snapshot);
    const environment = sheet(view);
    const data = sheet(helper);
    if (
        environment.properties.gridProperties.columnCount !== 10 ||
        data.properties.gridProperties.columnCount !== 18 ||
        environment.properties.gridProperties.rowCount < 5188 ||
        data.properties.gridProperties.rowCount !== 5000
    )
        throw new Error(
            "Environment view schema drift or migration already installed"
        );
    for (const name of [view, helper]) {
        const current = sheet(name).properties.gridProperties;
        const bounds = snapshot.readBounds[name];
        if (
            !bounds ||
            bounds.columnCount < current.columnCount ||
            bounds.rowCount < current.rowCount
        )
            throw new Error(`Complete ${name} cell read required`);
    }
    assertEmptyEnvironmentDestinations(snapshot);
    if (
        value(helper, 0, 0)?.formulaValue !==
            "=GARDEN_ENVIRONMENT_READINGS(History!A2:AS5000)" ||
        value(view, 189, 0)?.formulaValue !==
            `=IFNA(FILTER('${helper}'!A2:J5000,'${helper}'!B2:B5000=$B$116),"")` ||
        value(view, 115, 0)?.stringValue !== "Selected plant"
    )
        throw new Error("Environment anchor formula drift");
    for (const [index, plant] of palette.entries()) {
        if (value(view, 7 + index, 0)?.stringValue !== plant.id)
            throw new Error("Environment inventory drift");
    }
    return {
        dataId: data.properties.sheetId,
        viewId: environment.properties.sheetId,
    };
}

/**
 * @param {number} sheetId @param {number} column @param {string} type @param
 *   {string[]} choices
 */
function validation(sheetId, column, type, choices) {
    return {
        setDataValidation: {
            range: {
                endColumnIndex: column + 1,
                sheetId,
                startColumnIndex: column,
                startRowIndex: 1,
            },
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
    };
}

/**
 * @param {number} sheetId @param {number} rowIndex @param {number} columnIndex
 * @param {string[][]} rows
 */
function write(sheetId, rowIndex, columnIndex, rows) {
    return {
        updateCells: {
            fields: "userEnteredValue",
            rows: rows.map((values) => ({
                values: values.map((value) => ({
                    userEnteredValue: value.startsWith("=")
                        ? { formulaValue: value }
                        : { stringValue: value },
                })),
            })),
            start: { columnIndex, rowIndex, sheetId },
        },
    };
}
