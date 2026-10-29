import { describe, expect, it } from "vitest";

import { isRecord } from "../../scripts/build-data.mjs";
import {
    alpineSpiresAddition,
    alpineSpiresEnrollmentDigest,
    assertAlpineSpiresChartPreconditions,
    assertAlpineSpiresEnrollmentPreconditions,
    buildAlpineSpiresEnrollment,
    extendAlpineSpiresFormula,
    finalizeAlpineSpiresEnrollmentCharts,
} from "../../scripts/google-sheets/alpine-spires-enrollment.mjs";

/** @typedef {import("../../scripts/google-sheets/alpine-spires-enrollment.mjs").Snapshot} Snapshot */
/** @typedef {import("../../scripts/google-sheets/inventory-expansion.mjs").Sheet} Sheet */
/**
 * @typedef {import("../../scripts/google-sheets/inventory-expansion.mjs").Cell & {
 *         note?: string;
 *     }} Cell
 */
/** @typedef {import("../../scripts/google-sheets/inventory-expansion.mjs").EnteredValue} Value */
const ids = [
    ...Array.from(
        { length: 32 },
        (_, i) => `P${String(i + 1).padStart(2, "0")}`
    ),
    "P35",
    "P36",
    "P37",
    "P38",
    "P39",
    "P40",
];

/**
 * @param {ReturnType<typeof buildAlpineSpiresEnrollment>} plan @param {string}
 *   sheet @param {number} row @param {number} column
 */
function edited(plan, sheet, row, column) {
    return plan.edits.find(
        (e) => e.sheet === sheet && e.row === row && e.column === column
    )?.value;
}

/** Deterministic native shape; no production observations or private IDs. */
function fixture() {
    const titles = [
        "History",
        "History view",
        "App entries",
        "App bulk",
        "RO refills",
        "Plant tracker",
        "Baselines",
        "Dashboard",
        "Quick log",
        "Insights",
        "Insights data",
        "Dry-down insights",
        "Dry-down models",
        "Workbook calculations",
        "Workbook analytics",
        "Watering intervals",
        "Plant color data",
        "Plant colors",
        "Watering calendar",
        "Containers",
        "Container members",
        "Light & humidity",
        "Integrity",
        "Plant comparisons",
        "P40 Peperomia Spice is Nice",
        "P01 Moon cactus",
    ];
    /** @type {Sheet[]} */ const sheets = titles.map((title, i) => ({
        data: [{ rowData: [] }],
        properties: {
            gridProperties: { columnCount: 36, rowCount: 1000 },
            index: i,
            sheetId: i + 1,
            title,
        },
    }));
    /** @param {string} title */ const sheet = (title) => {
        const s = sheets.find((s) => s.properties.title === title);
        if (!s) throw new Error(title);
        return s;
    };
    /**
     * @param {string} title @param {number} row @param {number} col @param
     *   {string|number} text
     */
    const put = (title, row, col, text) => {
        setCell(sheet(title), row, col, {
            userEnteredValue:
                typeof text === "number"
                    ? { numberValue: text }
                    : text.startsWith("=")
                      ? { formulaValue: text }
                      : { stringValue: text },
        });
    };
    for (const [
        title,
        rows,
        cols,
    ] of /** @type {[string, number, number][]} */ ([
        [
            "History",
            50_001,
            67,
        ],
        [
            "History view",
            50_001,
            67,
        ],
        [
            "App entries",
            1000,
            59,
        ],
        [
            "App bulk",
            1000,
            76,
        ],
        [
            "Plant color data",
            5001,
            167,
        ],
        [
            "Workbook analytics",
            5001,
            126,
        ],
        [
            "Watering intervals",
            5000,
            114,
        ],
        [
            "Workbook calculations",
            39,
            11,
        ],
        [
            "Plant colors",
            42,
            6,
        ],
        [
            "Watering calendar",
            42,
            57,
        ],
        [
            "Light & humidity",
            50_189,
            22,
        ],
        [
            "Plant comparisons",
            1568,
            6,
        ],
        [
            "P40 Peperomia Spice is Nice",
            5139,
            22,
        ],
    ]))
        sheet(title).properties.gridProperties = {
            columnCount: cols,
            rowCount: rows,
        };
    sheet("Watering intervals").properties.sheetId = 907_202_605;
    put("History", 0, 66, "Leaf VPD source");
    put("App entries", 0, 58, "Leaf VPD source");
    put("App bulk", 0, 75, "P40 weight (g)");
    for (const [i, id] of ids.entries()) put("Plant tracker", i + 1, 0, id);
    put("Plant tracker", 38, 1, "Peperomia Spice is Nice");
    put("Plant tracker", 38, 2, "Peperomia nursery label");
    put("Plant tracker", 38, 14, "#14");
    put("Plant tracker", 38, 27, "8 in");
    put("Plant tracker", 38, 28, "Other plant setup");
    put("Plant tracker", 38, 30, "Other acquisition");
    put(
        "Plant tracker",
        38,
        6,
        '=IFNA(FILTER(History!E2:E50001,History!B2:B50001=$A39),"")'
    );
    put("Baselines", 38, 0, "P40");
    put("Baselines", 38, 1, "Peperomia Spice is Nice");
    put(
        "Baselines",
        38,
        17,
        '=IFNA(FILTER(History!AH2:AH50001,History!B2:B50001=$A39,History!K2:K50001=$T39),"Not recorded")'
    );
    put("Baselines", 38, 19, 1);
    put(
        "Baselines",
        38,
        7,
        '="Manual houseplant care; inspect mix and drainage"'
    );
    put("Baselines", 38, 9, '="Manual substrate and plant-condition check"');
    put(
        "Baselines",
        38,
        11,
        '="Manual houseplant care; inspect mix and drainage"'
    );
    put("Baselines", 38, 32, '="Manual houseplant care"');
    for (const col of [
        22,
        24,
        25,
        30,
        31,
        34,
    ])
        put("Baselines", 38, col, '=""');
    for (const [
        title,
        row,
        col,
    ] of /** @type {[string, number, number][]} */ ([
        [
            "Dashboard",
            43,
            1,
        ],
        [
            "Quick log",
            41,
            0,
        ],
        [
            "Insights data",
            38,
            15,
        ],
        [
            "Dry-down insights",
            38,
            0,
        ],
        [
            "Workbook calculations",
            38,
            0,
        ],
        [
            "Workbook analytics",
            38,
            5,
        ],
        [
            "Watering calendar",
            41,
            0,
        ],
        [
            "Plant colors",
            41,
            0,
        ],
        [
            "Plant color data",
            38,
            127,
        ],
        [
            "Containers",
            38,
            0,
        ],
        [
            "Container members",
            45,
            2,
        ],
        [
            "Light & humidity",
            44,
            0,
        ],
    ]))
        put(title, row, col, "P40");
    put(
        "Dashboard",
        43,
        2,
        "='Plant tracker'!B39&IF('Plant tracker'!O39=\"\",\"\",\" · label \"&'Plant tracker'!O39)"
    );
    for (const [column, formula] of /** @type {[number, string][]} */ ([
        [3, "='Plant tracker'!D39"],
        [4, "='Plant tracker'!E39"],
        [5, "=Baselines!D39"],
        [6, "=Baselines!C39"],
        [7, "=Baselines!W39"],
        [9, "=Baselines!AF39"],
        [10, "=Baselines!AG39"],
        [11, "='Plant tracker'!I39"],
        [12, "='Plant tracker'!K39"],
        [16, "=Baselines!H39"],
        [17, "=Baselines!I39"],
        [18, "=Baselines!J39"],
        [19, "=Baselines!K39"],
        [20, "=Baselines!L39"],
        [21, "=Baselines!S39"],
    ]))
        put("Dashboard", 43, column, formula);
    put(
        "Dashboard",
        43,
        8,
        '=IF(AND(ISNUMBER(G44),G44>0,ISNUMBER(H44),H44>0),G44-H44,"")'
    );
    put(
        "Dashboard",
        43,
        13,
        '=COUNTIFS(History!$B$2:$B$50001,$B44,History!$C$2:$C$50001,"Water")'
    );
    put("Container members", 45, 0, "Houseplant-07");
    put("Containers", 38, 17, "Old acquisition");
    put("Containers", 38, 18, "Old date");
    put("Container members", 45, 7, "Old acquisition");
    put("Container members", 45, 8, "Old date");
    put(
        "Light & humidity",
        45,
        0,
        '=IF(COUNT(C8:C45)=0,"No readings","Latest values")'
    );
    put(
        "Light & humidity",
        45,
        13,
        '=IF(COUNT(I8:I45)=0,"No readings","Latest values")'
    );
    sheet("Light & humidity")["merges"] = [
        {
            endColumnIndex: 8,
            endRowIndex: 46,
            sheetId: sheet("Light & humidity").properties.sheetId,
            startColumnIndex: 0,
            startRowIndex: 45,
        },
    ];
    put("Integrity", 61, 0, "Critical source-row exceptions");
    put("Integrity", 60, 0, "=Baselines!A39");
    put("Integrity", 60, 1, "=Baselines!B39");
    put("Integrity", 60, 3, "Manual care");
    put("Integrity", 60, 5, "Other plant care");
    put(
        "Integrity",
        4,
        5,
        "=SUM(N(COUNTA('Dry-down models'!A2:A39)=38),N(NOT(ISFORMULA('Workbook calculations'!B39))))"
    );
    const quotedIds = ids.map((id) => `"${id}"`).join(";");
    put("Integrity", 6, 5, `=COUNTIF('Plant tracker'!A2:A39,{${quotedIds}})`);
    put(
        "Integrity",
        11,
        1,
        "=SUM(ARRAYFORMULA(N(ISERROR(Baselines!A2:AJ39))),SUM(ARRAYFORMULA(N(ISERROR('Light & humidity'!K1:V50189)))))"
    );
    put(
        "Dashboard",
        2,
        14,
        '=COUNT(Baselines!AF2:AF39)&" / "&COUNTIFS(Baselines!$A$2:$A$39,"<>",Baselines!$A$2:$A$39,"<>P39",Baselines!$A$2:$A$39,"<>P40")'
    );
    for (const [
        title,
        col,
        width,
    ] of /** @type {[string, number, number][]} */ ([
        [
            "Watering intervals",
            111,
            3,
        ],
        [
            "Workbook analytics",
            123,
            3,
        ],
        [
            "Plant color data",
            163,
            4,
        ],
    ]))
        for (let i = 0; i < width; i++) {
            put(title, 0, col + i, `P40 helper ${i}`);
            put(title, 1, col + i, '=IF(Insights!$B$228="P40",1,"")');
        }
    for (let b = 0; b < 14; b++) {
        const from = 1022 + b * 39;
        put("Plant comparisons", from, 0, "Plant ID");
        put("Plant comparisons", from, 1, "=Dashboard!E6");
        for (const [i, id] of ids.entries()) {
            put("Plant comparisons", from + i + 1, 0, id);
            put(
                "Plant comparisons",
                from + i + 1,
                1,
                `=XLOOKUP($A${from + i + 2},'Plant tracker'!A2:A39,'Plant tracker'!G2:G39,"")`
            );
        }
    }
    put("Plant comparisons", 0, 0, "Preserved historical comparison archive");
    const page = sheet("P40 Peperomia Spice is Nice");
    put(
        page.properties.title,
        140,
        0,
        '=IFNA(FILTER(History!A2:L50001,History!B2:B50001="P40"),"")'
    );
    put(page.properties.title, 4, 1, "=Baselines!D39");
    put(
        page.properties.title,
        108,
        0,
        "=COUNTA('Watering intervals'!DI2:DI5000)"
    );
    page.charts = [
        "Weight trend after latest Water / Repot anchor",
        "Plant dimensions • measurement history",
        "Weight history • calendar time",
        "Time between waterings",
    ].map((title, i) => ({
        chartId: 200 + i,
        position: {
            overlayPosition: {
                anchorCell: { rowIndex: 40, sheetId: page.properties.sheetId },
            },
        },
        spec: {
            basicChart: {
                domains: [
                    {
                        domain: {
                            sourceRange: {
                                sources: [
                                    {
                                        endColumnIndex: 17,
                                        endRowIndex: 5011,
                                        sheetId: page.properties.sheetId,
                                        startColumnIndex: 16,
                                        startRowIndex: 12,
                                    },
                                ],
                            },
                        },
                    },
                ],
                series: [
                    {
                        series: {
                            sourceRange: {
                                sources: [
                                    {
                                        endColumnIndex: i === 3 ? 114 : 18,
                                        endRowIndex: 5000,
                                        sheetId:
                                            i === 3
                                                ? sheet("Watering intervals")
                                                      .properties.sheetId
                                                : page.properties.sheetId,
                                        startColumnIndex: i === 3 ? 113 : 17,
                                        startRowIndex: 1,
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
            title,
        },
    }));
    const canonical = sheet("P01 Moon cactus");
    canonical.charts = structuredClone(page.charts).map((chart) => ({
        ...chart,
        chartId: chart.chartId + 300,
    }));
    for (const chart of canonical.charts) {
        const text = JSON.stringify(chart.spec).replaceAll(
            `"sheetId":${page.properties.sheetId}`,
            () => `"sheetId":${canonical.properties.sheetId}`
        );
        /** @type {unknown} */ const parsed = JSON.parse(text);
        if (!isRecord(parsed)) throw new Error("Synthetic chart spec");
        chart.spec = parsed;
        const basic = chart.spec["basicChart"];
        if (isRecord(basic))
            basic["axis"] = [
                {
                    position: "LEFT_AXIS",
                    viewWindowOptions: {
                        viewWindowMax: 750,
                        viewWindowMin: 250,
                    },
                },
            ];
    }
    const dimensions = canonical.charts.find(
        (chart) =>
            chart.spec["title"] === "Plant dimensions • measurement history"
    );
    if (!dimensions) throw new Error("dimensions");
    const dimBasic = dimensions.spec["basicChart"];
    if (!isRecord(dimBasic)) throw new Error("dimensions basic");
    dimBasic["series"] = [
        {
            series: {
                sourceRange: {
                    sources: [
                        {
                            endColumnIndex: 21,
                            endRowIndex: 5011,
                            sheetId: canonical.properties.sheetId,
                            startColumnIndex: 20,
                            startRowIndex: 11,
                        },
                    ],
                },
            },
        },
        {
            series: {
                sourceRange: {
                    sources: [
                        {
                            endColumnIndex: 22,
                            endRowIndex: 5011,
                            sheetId: canonical.properties.sheetId,
                            startColumnIndex: 21,
                            startRowIndex: 11,
                        },
                    ],
                },
            },
        },
    ];
    const interval = canonical.charts[3];
    if (!interval) throw new Error("interval");
    const intervalBasic = interval.spec["basicChart"];
    if (!isRecord(intervalBasic)) throw new Error("interval basic");
    intervalBasic["axis"] = [
        { position: "LEFT_AXIS", viewWindowOptions: { viewWindowMin: 0 } },
    ];
    intervalBasic["domains"] = [
        {
            domain: {
                sourceRange: {
                    sources: [
                        {
                            endColumnIndex: 2,
                            endRowIndex: 5000,
                            sheetId: 907_202_605,
                            startColumnIndex: 1,
                            startRowIndex: 0,
                        },
                    ],
                },
            },
        },
    ];
    intervalBasic["series"] = [
        {
            series: {
                sourceRange: {
                    sources: [
                        {
                            endColumnIndex: 3,
                            endRowIndex: 5000,
                            sheetId: 907_202_605,
                            startColumnIndex: 2,
                            startRowIndex: 0,
                        },
                    ],
                },
            },
        },
    ];
    sheet("Insights").charts = [
        {
            chartId: 300,
            spec: {
                basicChart: {
                    domains: [
                        {
                            domain: {
                                sourceRange: {
                                    sources: [
                                        {
                                            endColumnIndex: 1,
                                            endRowIndex: 1100,
                                            sheetId:
                                                sheet("Plant comparisons")
                                                    .properties.sheetId,
                                            startColumnIndex: 0,
                                            startRowIndex: 1061,
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    series: [
                        {
                            series: {
                                sourceRange: {
                                    sources: [
                                        {
                                            endColumnIndex: 124,
                                            endRowIndex: 5001,
                                            sheetId: 907_202_608,
                                            startColumnIndex: 123,
                                            startRowIndex: 0,
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                },
                title: "Current inventory",
            },
        },
    ];
    sheet("Plant tracker")["basicFilter"] = {
        range: {
            endColumnIndex: 36,
            endRowIndex: 39,
            sheetId: sheet("Plant tracker").properties.sheetId,
            startColumnIndex: 0,
            startRowIndex: 0,
        },
        sortSpecs: [{ dimensionIndex: 0, sortOrder: "ASCENDING" }],
    };
    const metadata = {
        sheets: structuredClone(sheets).map((s) => {
            delete s.data;
            return s;
        }),
    };
    /** @type {Snapshot} */ const snapshot = {
        full: {
            sheets: sheets.filter(
                (s) =>
                    ![
                        "App bulk",
                        "App entries",
                        "History",
                        "History view",
                        "RO refills",
                    ].includes(s.properties.title)
            ),
        },
        intake: [
            {
                sheets: sheets.filter((s) =>
                    [
                        "App bulk",
                        "App entries",
                        "History",
                    ].includes(s.properties.title)
                ),
            },
        ],
        metadata,
    };
    return { put, sheet, snapshot };
}
/**
 * @param {Sheet} sheet @param {number} row @param {number} col @param {Cell}
 *   cell
 */
function setCell(sheet, row, col, cell) {
    sheet.data ??= [{ rowData: [] }];
    const d = sheet.data[0];
    if (!d) throw new Error("grid");
    d.rowData ??= [];
    while (d.rowData.length <= row) d.rowData.push({ values: [] });
    const r = d.rowData[row];
    if (!r) throw new Error("row");
    r.values ??= [];
    while (r.values.length <= col) r.values.push({});
    r.values[col] = cell;
}

describe("alpine Spires one-time enrollment", () => {
    it("keeps P41 Dashboard identity, label and live weight attached to its own source row", () => {
        expect.hasAssertions();

        const plan = buildAlpineSpiresEnrollment(fixture().snapshot);
        const cells = new Map(
            /** @type {[string, string | number][]} */ ([
                ["Baselines!C39", 1935],
                ["Baselines!C40", 125],
                ["Plant tracker!B39", "Peperomia Spice is Nice"],
                ["Plant tracker!B40", "Alpine Spires Chinese evergreen"],
                ["Plant tracker!O39", "#14"],
                ["Plant tracker!O40", "#15"],
            ])
        );
        const name = edited(plan, "Dashboard", 44, 2)?.formulaValue ?? "";
        const references = Array.from(
            name.matchAll(
                /(?<sheet>'Plant tracker'|Baselines)!(?<cell>[A-Z]{1,3}\d{1,6})/gv
            ),
            (match) => {
                const cell = match.groups?.["cell"],
                    sheet = match.groups?.["sheet"];
                if (sheet === undefined || cell === undefined)
                    throw new Error("Missing direct source reference");
                return cells.get(`${sheet.replaceAll("'", "")}!${cell}`);
            }
        );

        expect(edited(plan, "Dashboard", 44, 1)).toStrictEqual({
            stringValue: "P41",
        });
        expect(references).toStrictEqual([
            "Alpine Spires Chinese evergreen",
            "#15",
            "#15",
        ]);

        const weight = edited(plan, "Dashboard", 44, 6)?.formulaValue ?? "";

        expect(weight).toBe("=Baselines!C40");
        expect(cells.get(weight.slice(1))).toBe(125);
        expect(cells.get(weight.slice(1))).not.toBe(1935);

        for (const column of [
            2,
            3,
            4,
            5,
            6,
            7,
            9,
            10,
            11,
            12,
            16,
            17,
            18,
            19,
            20,
            21,
        ])
            expect(
                edited(plan, "Dashboard", 44, column)?.formulaValue
            ).not.toMatch(
                /(?:'Plant tracker'|Baselines)!\$?[A-Z]{1,3}\$?39\b/v
            );

        expect(edited(plan, "Dashboard", 44, 8)?.formulaValue).toContain(
            "G45-H45"
        );
        expect(edited(plan, "Dashboard", 44, 13)?.formulaValue).toContain(
            "History!$B$2:$B$50001,$B45"
        );
    });

    it("adds permanent identity and truthful acquisition without fabricated setup or history", () => {
        expect.hasAssertions();

        const { snapshot } = fixture();
        const before = JSON.stringify(snapshot);
        const plan = buildAlpineSpiresEnrollment(snapshot);

        expect(JSON.stringify(snapshot)).toBe(before);
        expect(edited(plan, "Plant tracker", 39, 0)).toStrictEqual({
            stringValue: "P41",
        });
        expect(edited(plan, "Plant tracker", 39, 14)).toStrictEqual({
            stringValue: "#15",
        });
        expect(edited(plan, "Plant tracker", 39, 27)).toStrictEqual({
            stringValue: "Not recorded",
        });
        expect(edited(plan, "Container members", 46, 0)).toStrictEqual({
            stringValue: "Houseplant-08",
        });
        expect(edited(plan, "Containers", 39, 18)).toStrictEqual({
            stringValue: "2026-10-28",
        });
        expect(edited(plan, "Containers", 39, 17)?.stringValue).toContain(
            "$19.99"
        );
        expect(edited(plan, "Baselines", 39, 19)).toStrictEqual({
            numberValue: 1,
        });
        expect(edited(plan, "Baselines", 39, 7)?.formulaValue).toContain(
            "Manual houseplant care"
        );

        for (const c of [
            22,
            24,
            25,
            30,
            31,
            34,
        ])
            expect(edited(plan, "Baselines", 39, c)).toStrictEqual({
                formulaValue: '=""',
            });

        expect(
            plan.edits.filter((e) =>
                [
                    "App entries",
                    "History",
                    "History view",
                    "RO refills",
                ].includes(e.sheet)
            )
        ).toStrictEqual([]);
        expect(plan.edits.filter((e) => e.sheet === "App bulk")).toStrictEqual([
            {
                column: 76,
                row: 0,
                sheet: "App bulk",
                value: { stringValue: "P41 weight (g)" },
            },
        ]);
        expect(
            edited(plan, "P41 Alpine Spires", 140, 0)?.formulaValue
        ).toContain('History!B2:B50001="P41"');
        expect(edited(plan, "P41 Alpine Spires", 4, 1)).toStrictEqual({
            formulaValue: "=Baselines!D40",
        });
        expect(
            edited(plan, "P41 Alpine Spires", 108, 0)?.formulaValue
        ).toContain("DL2:DL5000");
        expect(edited(plan, "Integrity", 11, 1)?.formulaValue).toContain(
            "'Light & humidity'!K1:N50189"
        );
        expect(plan.compactedCells).toBe(50_189 * 8);
        expect(plan.worstCaseCells).toBeLessThan(20_000_000);
    });

    it("preserves archived blocks and inserts exactly one identity in each current comparison", () => {
        expect.hasAssertions();

        const plan = buildAlpineSpiresEnrollment(fixture().snapshot);

        expect(
            plan.edits.some(
                (e) => e.sheet === "Plant comparisons" && e.row < 1022
            )
        ).toBe(false);

        for (let b = 0; b < 14; b++) {
            const end = 1022 + b * 40 + 39;

            expect(edited(plan, "Plant comparisons", end, 0)).toStrictEqual({
                stringValue: "P41",
            });
            expect(
                edited(plan, "Plant comparisons", end, 1)?.formulaValue
            ).toContain(`$A${end + 1}`);
            expect(
                edited(plan, "Plant comparisons", end, 1)?.formulaValue
            ).toContain("A2:A40");
        }
        const copies = plan.prepareRequests
            .filter(
                (r) =>
                    r["copyPaste"] !== undefined &&
                    !JSON.stringify(r).includes('"rowIndex":-1')
            )
            .map((r) => r["copyPaste"])
            .filter(
                (r) =>
                    isRecord(r) &&
                    "source" in r &&
                    JSON.stringify(r).includes('"startRowIndex":1529')
            );

        expect(copies.length).toBeGreaterThan(0);
    });

    it("allows retained A:N and other-sheet references during tail compaction", () => {
        expect.hasAssertions();

        const { put, snapshot } = fixture();
        put(
            "Light & humidity",
            100,
            0,
            "=XLOOKUP(A1,'Environment data'!X2:X50001,'Environment data'!Z2:Z50001)"
        );
        put("Insights", 1, 1, "=COUNT('Light & humidity'!A1:N100)");

        expect(buildAlpineSpiresEnrollment(snapshot).compactedCells).toBe(
            50_189 * 8
        );
    });

    it("moves environment summary one row while leaving lower chart anchors and selectors unchanged", () => {
        expect.hasAssertions();

        const plan = buildAlpineSpiresEnrollment(fixture().snapshot);

        expect(edited(plan, "Light & humidity", 45, 0)).toStrictEqual({
            stringValue: "P41",
        });
        expect(edited(plan, "Light & humidity", 46, 0)?.formulaValue).toContain(
            "C8:C46"
        );
        expect(
            plan.prepareRequests.some((r) => r["unmergeCells"] !== undefined)
        ).toBe(true);
        expect(
            plan.prepareRequests.filter(
                (r) => r["insertDimension"] !== undefined
            )
        ).toHaveLength(1);
    });

    it("extends filters without reapplying native sorting", () => {
        expect.hasAssertions();

        const plan = buildAlpineSpiresEnrollment(fixture().snapshot);
        const filter = plan.prepareRequests.find(
            (r) => r["setBasicFilter"] !== undefined
        );

        expect(filter).toMatchObject({
            setBasicFilter: { filter: { range: { endRowIndex: 40 } } },
        });
        expect(JSON.stringify(filter)).not.toContain("sortSpecs");
    });

    it.each([
        "roster",
        "header",
        "destination",
        "comparison",
        "missing capture",
        "tail data",
        "tail validation",
        "tail formula",
        "tail range end",
        "tail whole columns",
        "tail self reference",
        "tail self range",
        "tail note",
        "tail metadata",
    ])("rejects %s drift before any request", (kind) => {
        expect.hasAssertions();

        const { put, sheet, snapshot } = fixture();
        switch (kind) {
            case "comparison": {
                put("Plant comparisons", 1060, 0, "P99");
                break;
            }
            case "destination": {
                put("Plant tracker", 39, 0, "P41");
                break;
            }
            case "header": {
                put("App bulk", 0, 75, "Unexpected header");
                break;
            }
            case "missing capture": {
                snapshot.full.sheets = snapshot.full.sheets.filter(
                    (s) => s.properties.title !== "Insights"
                );
                break;
            }
            case "roster": {
                put("Plant tracker", 38, 0, "P99");
                break;
            }
            case "tail data": {
                put("Light & humidity", 100, 14, "Do not erase");
                break;
            }
            case "tail formula": {
                put("Insights", 1, 1, "='Light & humidity'!O100");
                break;
            }
            case "tail metadata": {
                const env = snapshot.metadata.sheets.find(
                    (s) => s.properties.title === "Light & humidity"
                );
                if (!env) throw new Error("Missing synthetic environment");
                env["protectedRanges"] = [
                    {
                        range: {
                            endColumnIndex: 15,
                            sheetId: env.properties.sheetId,
                            startColumnIndex: 14,
                        },
                    },
                ];
                break;
            }
            case "tail note": {
                setCell(sheet("Light & humidity"), 100, 14, {
                    note: "Preserve owner note",
                });
                break;
            }
            case "tail range end": {
                put("Insights", 1, 1, "=COUNT('Light & humidity'!A1:V100)");
                break;
            }
            case "tail self range": {
                put("Light & humidity", 100, 0, "=COUNT(A1:V100)");
                break;
            }
            case "tail self reference": {
                put("Light & humidity", 100, 0, "=O100");
                break;
            }
            case "tail validation": {
                setCell(sheet("Light & humidity"), 100, 14, {
                    dataValidation: { condition: { type: "NUMBER_GREATER" } },
                });
                break;
            }
            case "tail whole columns": {
                put("Insights", 1, 1, "=COUNT('Light & humidity'!A:V)");
                break;
            }
            default: {
                throw new Error("Unknown drift fixture");
            }
        }

        expect(() => buildAlpineSpiresEnrollment(snapshot)).toThrow(
            /Missing|Occupied|binding|changed|contain|references/v
        );
    });

    it("rejects replay and fresh source or metadata changes, ignoring only calculated results", () => {
        expect.hasAssertions();

        const { put, sheet, snapshot } = fixture();
        const plan = buildAlpineSpiresEnrollment(snapshot);

        assertAlpineSpiresEnrollmentPreconditions(plan, snapshot);

        setCell(sheet("Plant tracker"), 38, 6, {
            ...sheet("Plant tracker").data?.[0]?.rowData?.[38]?.values?.[6],
            effectiveValue: { numberValue: 999 },
        });

        expect(alpineSpiresEnrollmentDigest(snapshot)).toBe(
            plan.preconditionDigest
        );

        put("Plant tracker", 38, 1, "Changed owner data");

        expect(() => {
            assertAlpineSpiresEnrollmentPreconditions(plan, snapshot);
        }).toThrow(/drift/v);

        const again = fixture().snapshot;
        again.metadata.sheets.push({
            properties: {
                gridProperties: { columnCount: 22, rowCount: 5139 },
                sheetId: 202_610_410,
                title: "P41 Alpine Spires",
            },
        });

        expect(() => buildAlpineSpiresEnrollment(again)).toThrow(
            /already installed/v
        );
    });
});

describe("bounded formula enrollment", () => {
    it("extends current inventory, comparison blocks, environment and manual-care denominator only", () => {
        expect.hasAssertions();
        expect(
            extendAlpineSpiresFormula(
                "=XLOOKUP(A1,Baselines!$A$2:$A$39,Baselines!$T$2:$T$39)"
            )
        ).toBe("=XLOOKUP(A1,Baselines!$A$2:$A$40,Baselines!$T$2:$T$40)");
        expect(
            extendAlpineSpiresFormula("=COUNTIF(History!B2:B50001,A39)")
        ).toBe("=COUNTIF(History!B2:B50001,A39)");
        expect(
            extendAlpineSpiresFormula("=COUNTIF(History!B2:B50001,A39)")
        ).not.toContain("B2:B50002");
        expect(
            extendAlpineSpiresFormula("='Plant comparisons'!A1062:F1100")
        ).toBe("='Plant comparisons'!A1063:F1102");
        expect(
            extendAlpineSpiresFormula("=COUNT(C8:C45)", "Light & humidity")
        ).toBe("=COUNT(C8:C46)");
        expect(
            extendAlpineSpiresFormula(
                '=COUNTIFS(Baselines!$A$2:$A$39,"<>P40")',
                "Dashboard"
            )
        ).toContain('"<>P41"');
    });
});

describe("native readiness and new-chart finalization", () => {
    /** @param {Snapshot} snapshot */
    function ready(snapshot) {
        const fresh = structuredClone(snapshot.full);
        /** @param {string} title */
        const sheet = (title) => {
            const s = fresh.sheets.find((s) => s.properties.title === title);
            if (!s) throw new Error(title);
            return s;
        };
        setCell(sheet("Workbook calculations"), 1, 4, {
            effectiveValue: { numberValue: 100.01 },
        });
        setCell(sheet("Workbook calculations"), 1, 7, {
            effectiveValue: { numberValue: 100.005 },
        });
        setCell(sheet("Workbook calculations"), 1, 8, {
            effectiveValue: { stringValue: "Ready" },
        });
        for (const [i, id] of [...ids, "P41"].entries())
            setCell(sheet("Dry-down models"), i + 1, 0, {
                effectiveValue: { stringValue: id },
            });
        setCell(sheet("Baselines"), 39, 0, {
            effectiveValue: { stringValue: "P41" },
        });
        setCell(sheet("Baselines"), 39, 19, {
            effectiveValue: { numberValue: 1 },
        });
        return { fresh, sheet };
    }

    it("requires fresh native results for every new roster record and setup", () => {
        expect.hasAssertions();

        const { fresh, sheet } = ready(fixture().snapshot);

        expect(assertAlpineSpiresChartPreconditions(fresh, 100)).toBe(true);

        setCell(sheet("Workbook calculations"), 1, 8, {
            effectiveValue: { stringValue: "Failed" },
        });

        expect(() => assertAlpineSpiresChartPreconditions(fresh, 100)).toThrow(
            /native analytics/v
        );
    });

    it("rebinds four new chart roles, preserving all original chart IDs", () => {
        expect.hasAssertions();

        const { snapshot } = fixture();
        const plan = buildAlpineSpiresEnrollment(snapshot);
        const { fresh } = ready(snapshot);
        const metadata = structuredClone(snapshot.metadata);
        const page = structuredClone(plan.chartTemplate);
        page.properties = {
            ...page.properties,
            sheetId: 202_610_410,
            title: alpineSpiresAddition.title,
        };
        page.charts = (page.charts ?? []).map((c) => ({
            ...c,
            chartId: c.chartId + 1000,
        }));
        metadata.sheets.push(page);
        const requests = finalizeAlpineSpiresEnrollmentCharts(
            plan,
            metadata,
            fresh,
            100
        );

        expect(
            requests.filter((r) => r["deleteEmbeddedObject"] !== undefined)
        ).toStrictEqual([{ deleteEmbeddedObject: { objectId: 1503 } }]);
        expect(
            requests.filter((r) => r["addChart"] !== undefined)
        ).toHaveLength(1);
        expect(JSON.stringify(requests)).toContain('"sheetId":202610410');
        expect(plan.originalChartIds).toStrictEqual([
            300,
            200,
            201,
            202,
            203,
            500,
            501,
            502,
            503,
        ]);

        const output = JSON.stringify(requests);

        expect(output).not.toContain(
            `"sheetId":${plan.chartTemplate.properties.sheetId}`
        );
        expect(output).not.toContain('"viewWindowMin":250');
        expect(output).not.toContain('"viewWindowMax":750');
        expect(output).toContain('"startColumnIndex":116');
        expect(output).toContain('"startColumnIndex":21');
    });
});
