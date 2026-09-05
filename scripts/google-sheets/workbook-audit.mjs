import fs from "node:fs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const runtime = vm.createContext({ Date, Map, Set });
vm.runInContext(
    fs.readFileSync(new URL("plant-tracker.gs", import.meta.url), "utf8"),
    runtime
);

const benign = [
    "",
    "OK",
    "No trend",
    "No current-cycle alert",
    "Owner-confirmed normal",
];
const noAlert = (cell) =>
    `AND(${benign.map((text) => `${cell}<>"${text}"`).join(",")})`;
const data = (sheetId, column, startRowIndex, endRowIndex) => ({
    sourceRange: {
        sources: [
            {
                sheetId,
                startRowIndex,
                endRowIndex,
                startColumnIndex: column,
                endColumnIndex: column + 1,
            },
        ],
    },
});

/**
 * Build a reviewable native Sheets batch; never authenticates or writes
 * remotely. Input must be a freshly read, complete chart/format metadata
 * snapshot plus userEnteredValue cells for the derived ranges. History values
 * are never written.
 */
export function buildWorkbookAuditRequests({ metadata, cells }) {
    const sheets = new Map(
        metadata.sheets.map((sheet) => [sheet.properties.title, sheet])
    );
    const cell = (name, row, column) =>
        cells.find(
            (item) =>
                item.sheet === name &&
                item.row === row &&
                item.column === column
        )?.value;
    const required = [
        "Dashboard",
        "Baselines",
        "Plant tracker",
        "Insights",
        "Insights data",
        "Integrity",
        "History",
        "App plant charts",
    ];
    for (const name of required)
        if (!sheets.has(name)) throw new Error(`Missing sheet: ${name}`);
    if (
        cell("Baselines", 0, 0)?.stringValue !== "Plant ID" ||
        cell("Dashboard", 5, 1)?.stringValue !== "Plant ID"
    )
        throw new Error("Unexpected workbook headers");
    const plants = [...sheets.values()].filter((sheet) =>
        /^P\d{2} /u.test(sheet.properties.title)
    );
    const ids = plants
        .map((sheet) => sheet.properties.title.slice(0, 3))
        .sort();
    if (
        ids.length !== 30 ||
        ids.some((id, i) => id !== `P${String(i + 1).padStart(2, "0")}`)
    )
        throw new Error("Expected the reviewed P01–P30 inventory");
    for (const [index, id] of ids.entries())
        if (cell("Baselines", index + 1, 0)?.stringValue !== id)
            throw new Error("Baselines order changed; reread and review");
    for (const sheet of plants) {
        if (sheet.properties.gridProperties.columnCount !== 18)
            throw new Error(
                `Review existing helper columns before migration: ${sheet.properties.title}`
            );
        if (
            sheet.charts?.length !== 3 ||
            !sheet.charts.some(
                (chart) =>
                    chart.spec.title ===
                    "Plant dimensions • measurement history"
            ) ||
            !sheet.charts.some(
                (chart) => chart.spec.title === "Weight history • calendar time"
            )
        )
            throw new Error(
                `Unexpected chart inventory: ${sheet.properties.title}`
            );
    }
    if (
        sheets.get("Insights data").properties.gridProperties.columnCount !== 25
    )
        throw new Error("Review existing Insights helper columns");
    const requests = [];
    const idOf = (name) => sheets.get(name).properties.sheetId;
    const range = (name, row, column, rows = 1, columns = 1) => ({
        sheetId: idOf(name),
        startRowIndex: row,
        endRowIndex: row + rows,
        startColumnIndex: column,
        endColumnIndex: column + columns,
    });
    const write = (name, row, column, values) =>
        requests.push({
            updateCells: {
                start: {
                    sheetId: idOf(name),
                    rowIndex: row,
                    columnIndex: column,
                },
                rows: values.map((values) => ({
                    values: values.map((value) => ({
                        userEnteredValue:
                            typeof value === "string" && value.startsWith("=")
                                ? { formulaValue: value }
                                : { stringValue: value },
                    })),
                })),
                fields: "userEnteredValue",
            },
        });
    const format = (
        name,
        row,
        column,
        rows,
        columns,
        userEnteredFormat,
        note
    ) =>
        requests.push({
            repeatCell: {
                range: range(name, row, column, rows, columns),
                cell: { userEnteredFormat, ...(note ? { note } : {}) },
                fields: Object.keys(userEnteredFormat)
                    .map((key) => `userEnteredFormat.${key}`)
                    .concat(note ? ["note"] : [])
                    .join(","),
            },
        });
    const width = (name, startIndex, endIndex, pixelSize) =>
        requests.push({
            updateDimensionProperties: {
                range: {
                    sheetId: idOf(name),
                    dimension: "COLUMNS",
                    startIndex,
                    endIndex,
                },
                properties: { pixelSize },
                fields: "pixelSize",
            },
        });
    const resizeRows = (name, startIndex, endIndex) =>
        requests.push({
            autoResizeDimensions: {
                dimensions: {
                    sheetId: idOf(name),
                    dimension: "ROWS",
                    startIndex,
                    endIndex,
                },
            },
        });
    const columns = (name, count) => {
        if (sheets.get(name).properties.gridProperties.columnCount < count)
            requests.push({
                appendDimension: {
                    sheetId: idOf(name),
                    dimension: "COLUMNS",
                    length:
                        count -
                        sheets.get(name).properties.gridProperties.columnCount,
                },
            });
    };

    // The timeline may grow beyond its original 250-day display window.
    for (const name of ["Insights data", "App insight activity"]) {
        const sheet = sheets.get(name);
        if (!sheet) throw new Error(`Missing sheet: ${name}`);
        const count = sheet.properties.gridProperties.rowCount;
        if (count < 5000)
            requests.push({
                appendDimension: {
                    sheetId: idOf(name),
                    dimension: "ROWS",
                    length: 5000 - count,
                },
            });
    }
    write("App insight activity", 1, 0, [
        [
            "=IFNA(FILTER('Insights data'!A2:D5000,'Insights data'!A2:A5000<>\"\"),\"\")",
        ],
    ]);

    write(
        "Baselines",
        1,
        10,
        ids.map((_, i) => [runtime.remeasureStatusFormula_(i + 2)])
    );
    write("Dashboard", 1, 16, [["Current curve supported"]]);
    write("Dashboard", 2, 16, [
        [
            '=COUNTIF(Baselines!$I$2:$I$31,"Current cycle supported")&" / "&COUNTA(Baselines!$A$2:$A$31)',
        ],
    ]);
    write("App plant charts", 1, 0, [[runtime.appPlantChartsFormula_()]]);

    // Preserve the owner-entered pot/acquisition evidence in Insights data S.
    for (const item of cells.filter(
        (item) =>
            item.sheet === "Insights data" &&
            [
                0,
                7,
                13,
            ].includes(item.column) &&
            item.row === 0
    )) {
        write(item.sheet, item.row, item.column, [
            [
                item.value.formulaValue
                    .replaceAll("1000", "5000")
                    .replace("H2:H29", "H2:H31"),
            ],
        ]);
    }
    for (let row = 2; row <= 31; row++) {
        write("Insights data", row - 1, 20, [
            [
                `=Baselines!A${row}`,
                `=Baselines!B${row}`,
                `=N(Baselines!H${row}<>"Calibrated")`,
                `=N(Baselines!K${row}="Due now")`,
                `=N(${noAlert(`Baselines!J${row}`)})`,
            ],
        ]);
        if (row >= 30) {
            for (const column of [
                15,
                16,
                17,
                19,
            ]) {
                if (cell("Insights data", row - 1, column))
                    throw new Error(
                        "New plant helper destination is not blank"
                    );
                const source = cell("Insights data", 28, column)?.formulaValue;
                if (!source)
                    throw new Error("Missing pot helper formula template");
                write("Insights data", row - 1, column, [
                    [source.replaceAll(/(?<=[A-Z])29\b/gu, String(row))],
                ]);
            }
        }
    }

    const baselineRange = (column) => `Baselines!$${column}$2:$${column}$31`;
    const integrity = new Map([
        [13, `=COUNTIF(${baselineRange("K")},"Due now")`],
        [
            14,
            `=COUNTIFS(${baselineRange("A")},"<>",${baselineRange("H")},"<>Calibrated")`,
        ],
        [
            15,
            `=COUNTIFS(${benign.map((value) => `${baselineRange("J")},"<>${value}"`).join(",")})`,
        ],
        [
            16,
            `=COUNTIFS(${baselineRange("I")},"Current cycle supported",${baselineRange("H")},"<>Calibrated")`,
        ],
        [18, `=COUNTIF(${baselineRange("N")},"No anchor")`],
    ]);
    for (const [row, formula] of integrity)
        write("Integrity", row, 1, [[formula]]);
    write("Integrity", 16, 0, [["Current curve supported but uncalibrated"]]);
    write("Integrity", 17, 2, [['=IF(B18>=0,"Info","Fail")']]);
    write("Integrity", 14, 3, [
        [
            "Needs a usable completed dry endpoint and wet reference in the current pot setup; collect observations, not a forced watering.",
        ],
    ]);
    write("Integrity", 13, 3, [
        [
            "Visual estimates stay in the ledger, but do not enter measured growth charts.",
        ],
    ]);
    const errorRanges = [
        "History!A2:AP5000",
        "Baselines!A2:AJ1000",
        "'Plant tracker'!A2:AJ1000",
        "Dashboard!A1:W254",
        "Insights!A1:R239",
        "'Insights data'!A1:AD5000",
        "'Dry-down models'!A1:P1000",
        "'App plant charts'!A1:H5000",
    ];
    write("Integrity", 11, 1, [
        [
            `=SUM(${errorRanges.map((value) => `ARRAYFORMULA(N(ISERROR(${value})))`).join(",")})`,
        ],
    ]);
    for (let row = 2; row <= 31; row++) {
        const priority = `=IFS(${noAlert(`Baselines!J${row}`)},"Attention",Baselines!K${row}="Due now","Action due",Baselines!H${row}<>"Calibrated","Collect data",TRUE,"OK")`;
        const action = `=TEXTJOIN(" · ",TRUE,IF(Baselines!K${row}="Due now","Take a ruler-based height/width measurement",""),IF(Baselines!H${row}<>"Calibrated","Collect cycle observations in setup "&Baselines!T${row},""),IF(${noAlert(`Baselines!J${row}`)},"Reweigh to confirm "&LOWER(Baselines!J${row}),""))`;
        if (row <= 29) {
            write("Integrity", row + 21, 3, [[priority]]);
            write("Integrity", row + 21, 5, [[action]]);
        } else {
            if (cell("Integrity", row + 21, 0))
                throw new Error("New Integrity destination is not blank");
            write("Integrity", row + 21, 0, [
                [
                    `=Baselines!A${row}`,
                    `=Baselines!B${row}`,
                    `=Baselines!S${row}`,
                    priority,
                    `="Trend: "&Baselines!I${row}&" · calibration: "&Baselines!H${row}&" · trend review: "&Baselines!J${row}`,
                    action,
                    `=Baselines!C${row}`,
                    `=Baselines!E${row}`,
                    `=Baselines!R${row}`,
                    `="Anchor: "&Baselines!N${row}&" · "&Baselines!L${row}`,
                ],
            ]);
        }
    }

    columns("Insights data", 30);
    write("Insights data", 0, 26, [
        [
            "Plant ID",
            "Plant",
            "Measured height (cm)",
            "Measured width (cm)",
        ],
    ]);
    for (let row = 2; row <= 31; row++) {
        const latest = (column) =>
            `=IFNA(INDEX(SORT(FILTER({'App plant charts'!$A$2:$A$5000,'App plant charts'!$${column}$2:$${column}$5000},'App plant charts'!$B$2:$B$5000=$AA${row},'App plant charts'!$${column}$2:$${column}$5000<>""),1,FALSE),1,2)*2.54,"")`;
        write("Insights data", row - 1, 26, [
            [
                `=Baselines!A${row}`,
                `=Baselines!B${row}`,
                latest("E"),
                latest("F"),
            ],
        ]);
    }

    for (const sheet of plants) {
        const name = sheet.properties.title;
        const sheetId = sheet.properties.sheetId;
        columns(name, 22);
        write(name, 11, 18, [
            [
                "Date",
                "Weight (g)",
                "Measured height (cm)",
                "Measured width (cm)",
            ],
        ]);
        write(name, 12, 18, [
            [runtime.plantChartHelperFormula_(name.slice(0, 3))],
        ]);
        write(name, 11, 2, [["Recorded state"]]);
        format(name, 12, 18, 988, 1, {
            numberFormat: {
                type: "DATE_TIME",
                pattern: "mmm d, yyyy h:mm am/pm",
            },
        });
        format(name, 12, 19, 988, 3, {
            numberFormat: { type: "NUMBER", pattern: "0.0#" },
        });
        requests.push({
            updateDimensionProperties: {
                range: {
                    sheetId,
                    dimension: "COLUMNS",
                    startIndex: 18,
                    endIndex: 22,
                },
                properties: { hiddenByUser: true },
                fields: "hiddenByUser",
            },
        });
        for (const chart of sheet.charts) {
            const spec = structuredClone(chart.spec);
            const basic = spec.basicChart;
            if (
                spec.title === "Plant dimensions • measurement history" ||
                spec.title === "Weight history • calendar time"
            ) {
                const dimensions = spec.title.startsWith("Plant dimensions");
                basic.domains = [{ domain: data(sheetId, 18, 11, 1000) }];
                basic.series = (dimensions ? [20, 21] : [19]).map(
                    (column, index) => ({
                        series: data(sheetId, column, 11, 1000),
                        targetAxis: "LEFT_AXIS",
                        colorStyle: {
                            rgbColor:
                                index === 0
                                    ? { red: 0.18, green: 0.49, blue: 0.33 }
                                    : { red: 0.84, green: 0.65, blue: 0.24 },
                        },
                        pointStyle: { size: 5 },
                    })
                );
                basic.axis = basic.axis
                    .filter((axis) => axis.position !== "LEFT_AXIS")
                    .concat([
                        {
                            position: "LEFT_AXIS",
                            title: dimensions ? "Size (cm)" : "Weight (g)",
                        },
                    ]);
                basic.interpolateNulls = true;
                basic.lineSmoothing = false;
                spec.hiddenDimensionStrategy = "SHOW_ALL";
                if (dimensions)
                    spec.subtitle =
                        "Measured dimensions only • estimates remain in the history ledger • two readings needed for a trend";
            } else {
                for (const part of [
                    ...basic.domains.map((item) => item.domain),
                    ...basic.series.map((item) => item.series),
                ])
                    for (const source of part.sourceRange.sources)
                        source.endRowIndex = 1000;
            }
            requests.push({
                updateChartSpec: { chartId: chart.chartId, spec },
            });
        }
    }
    const helperId = idOf("Insights data");
    for (const chart of sheets.get("Insights").charts) {
        const spec = structuredClone(chart.spec);
        const basic = spec.basicChart;
        if (spec.title.startsWith("Plant dimensions")) {
            basic.domains[0].domain = data(helperId, 27, 0, 31);
            basic.series.forEach((series, i) => {
                series.series = data(helperId, 28 + i, 0, 31);
            });
        } else if (spec.title.startsWith("Plant shape map")) {
            basic.domains[0].domain = data(helperId, 29, 0, 31);
            basic.series[0].series = data(helperId, 28, 0, 31);
            basic.series[0].dataLabel.customLabelData = data(
                helperId,
                26,
                0,
                31
            );
        } else if (spec.title === "Data-quality follow-ups by plant") {
            for (const part of [
                ...basic.domains.map((item) => item.domain),
                ...basic.series.map((item) => item.series),
            ])
                for (const source of part.sourceRange.sources)
                    source.endRowIndex = 31;
        } else if (spec.title === "Care activity timeline") {
            for (const part of [
                ...basic.domains.map((item) => item.domain),
                ...basic.series.map((item) => item.series),
            ])
                for (const source of part.sourceRange.sources)
                    source.endRowIndex = 5000;
        } else if (spec.title === "Recent drying rate by plant") {
            basic.series[0].series = data(idOf("Baselines"), 30, 0, 31);
            basic.axis.find((axis) => axis.position === "BOTTOM_AXIS").title =
                "Recent loss (g/day)";
            spec.subtitle =
                "Recent same-cycle loss • not a constant rate or a watering deadline";
        } else continue;
        requests.push({ updateChartSpec: { chartId: chart.chartId, spec } });
    }

    // Repair known legacy conditions in place; retain unrelated rules and colors.
    for (const name of [
        "Dashboard",
        "Baselines",
        "Plant tracker",
    ]) {
        const sheet = sheets.get(name);
        sheet.conditionalFormats.forEach((original, index) => {
            const rule = structuredClone(original);
            const condition = rule.booleanRule?.condition;
            const value = condition?.values?.[0]?.userEnteredValue;
            if (name === "Dashboard") {
                rule.ranges.forEach((item) => {
                    item.endRowIndex = 36;
                    if (
                        item.startColumnIndex >= 11 &&
                        item.startColumnIndex <= 14
                    ) {
                        item.startColumnIndex += 4;
                        item.endColumnIndex += 4;
                    }
                });
                if (value?.startsWith("=OR($N7="))
                    condition.values[0].userEnteredValue = `=${noAlert("$R7")}`;
            }
            if (value === "Ready")
                condition.values[0].userEnteredValue =
                    "Current cycle supported";
            if (value === "Partial calibration") {
                condition.type = "TEXT_CONTAINS";
                condition.values[0].userEnteredValue = "Need";
            }
            if (value === "Uncalibrated") {
                condition.type = "TEXT_CONTAINS";
                condition.values[0].userEnteredValue = "Collecting";
            }
            if (name === "Baselines" && value?.startsWith("=OR($J2="))
                condition.values[0].userEnteredValue = `=${noAlert("$J2")}`;
            if (name === "Plant tracker") {
                if (rule.gradientRule)
                    rule.ranges = rule.ranges.filter(
                        (item) => item.startColumnIndex === 4
                    );
                if (
                    [
                        "Collecting",
                        "≈",
                        "Likely dry now",
                    ].includes(value)
                ) {
                    rule.ranges = rule.ranges.filter(
                        (item) => item.startColumnIndex === 5
                    );
                    condition.type = "TEXT_CONTAINS";
                    condition.values[0].userEnteredValue =
                        value === "Collecting"
                            ? "Need"
                            : value === "≈"
                              ? "Reweigh"
                              : "Overdue";
                }
                if (value === '=AND($S2<>"",$S2<>"OK")')
                    condition.values[0].userEnteredValue = `=${noAlert("$S2")}`;
            }
            if (JSON.stringify(rule) !== JSON.stringify(original))
                requests.push({
                    updateConditionalFormatRule: {
                        sheetId: sheet.properties.sheetId,
                        index,
                        rule,
                    },
                });
        });
    }

    columns("Dashboard", 23);
    columns("Baselines", 36);
    for (const [name, count] of Object.entries({
        Dashboard: 23,
        Baselines: 36,
        "Plant tracker": 36,
        History: 42,
    })) {
        const sheet = sheets.get(name);
        if (sheet.basicFilter)
            requests.push({
                setBasicFilter: {
                    filter: {
                        ...sheet.basicFilter,
                        range: {
                            ...sheet.basicFilter.range,
                            endColumnIndex: count,
                        },
                    },
                },
            });
        if (["Dashboard", "Baselines"].includes(name)) {
            for (const band of sheet.bandedRanges || [])
                requests.push({
                    updateBanding: {
                        bandedRange: {
                            bandedRangeId: band.bandedRangeId,
                            range: { ...band.range, endColumnIndex: count },
                        },
                        fields: "range",
                    },
                });
            for (const protection of sheet.protectedRanges || [])
                if (protection.warningOnly)
                    requests.push({
                        updateProtectedRange: {
                            protectedRange: {
                                protectedRangeId: protection.protectedRangeId,
                                range: {
                                    ...protection.range,
                                    endColumnIndex: count,
                                },
                            },
                            fields: "range",
                        },
                    });
        }
    }
    format("Dashboard", 6, 10, 30, 2, {
        numberFormat: { type: "NUMBER", pattern: "0.0#" },
    });
    format("Dashboard", 6, 12, 30, 2, {
        numberFormat: { type: "NUMBER", pattern: "0" },
    });
    format(
        "Dashboard",
        6,
        14,
        30,
        1,
        { numberFormat: { type: "NUMBER", pattern: '0.0 "days"' } },
        "Historical mean spacing, not a recommended watering interval or dry-down forecast."
    );
    format(
        "Baselines",
        1,
        12,
        30,
        1,
        { numberFormat: { type: "PERCENT", pattern: "0.0%" } },
        "Recent daily loss divided by current weight. Early-cycle loss is not extrapolated across the full cycle."
    );
    format("Plant tracker", 1, 32, 30, 2, {
        numberFormat: { type: "NUMBER", pattern: "0.0#" },
    });
    format("Insights data", 1, 28, 30, 2, {
        numberFormat: { type: "NUMBER", pattern: "0.0#" },
    });
    format("App plant charts", 1, 0, 4999, 1, {
        numberFormat: { type: "DATE_TIME", pattern: "mmm d, yyyy h:mm am/pm" },
    });
    format("App plant charts", 1, 2, 4999, 1, {
        numberFormat: { type: "NUMBER", pattern: "0.0" },
    });
    format("App plant charts", 1, 3, 4999, 1, {
        numberFormat: { type: "NUMBER", pattern: "0.000" },
    });
    format("App plant charts", 1, 4, 4999, 3, {
        numberFormat: { type: "NUMBER", pattern: "0.0#" },
    });
    format("App plant charts", 1, 7, 4999, 1, {
        numberFormat: { type: "NUMBER", pattern: "0.0" },
    });
    format("Dashboard", 6, 0, 30, 23, {
        wrapStrategy: "WRAP",
        verticalAlignment: "MIDDLE",
    });
    format("Integrity", 23, 0, 30, 10, {
        wrapStrategy: "WRAP",
        verticalAlignment: "MIDDLE",
    });
    format("Integrity", 51, 6, 2, 1, {
        numberFormat: { type: "NUMBER", pattern: "0.0" },
    });
    format("Integrity", 51, 7, 2, 1, {
        numberFormat: { type: "DATE_TIME", pattern: "mmm d, yyyy" },
    });
    width("Dashboard", 9, 10, 245);
    resizeRows("Dashboard", 6, 36);
    resizeRows("Baselines", 1, 31);
    resizeRows("Integrity", 23, 53);
    return requests;
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    if (process.argv.length !== 3)
        throw new Error(
            "Usage: node scripts/google-sheets/workbook-audit.mjs <fresh-snapshot.json>"
        );
    process.stdout.write(
        JSON.stringify(
            buildWorkbookAuditRequests(
                JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
            )
        )
    );
}
