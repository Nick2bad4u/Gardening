import { describe, expect, it } from "vitest";

import {
    assertHouseplantChartPreconditions,
    assertHouseplantCompactionPreconditions,
    assertHouseplantEnrollmentPreconditions,
    buildHouseplantEnrollment,
    extendHouseplantFormula,
    finalizeHouseplantEnrollmentCharts,
    finalizeHouseplantPageCharts,
    houseplantAdditions,
} from "../../scripts/google-sheets/houseplant-enrollment.mjs";

/** @typedef {import("../../scripts/google-sheets/houseplant-enrollment.mjs").Snapshot} Snapshot */
/** @typedef {import("../../scripts/google-sheets/inventory-expansion.mjs").Sheet} Sheet */

const ids = [
    ...Array.from(
        { length: 32 },
        (_, index) => `P${String(index + 1).padStart(2, "0")}`
    ),
    "P35",
    "P36",
    "P37",
    "P38",
];

/** Synthetic workbook shape; no copied production observations or IDs. */
function fixture() {
    const names = [
        "History",
        "History view",
        "App entries",
        "App bulk",
        "RO refills",
        "Plant tracker",
        "Baselines",
        "Dashboard",
        "Quick log",
        "Plant colors",
        "Watering calendar",
        "Integrity",
        "Insights data",
        "Dry-down insights",
        "Dry-down models",
        "Workbook calculations",
        "Workbook analytics",
        "Watering intervals",
        "Plant color data",
        "Light & humidity",
        "Environment data",
        "Containers",
        "Container members",
        "P37 Arctic Ice",
        "P38 Terrarium",
    ];
    /** @type {Sheet[]} */
    const sheets = names.map((title, index) => ({
        data: [{ rowData: [] }],
        properties: {
            gridProperties: { columnCount: 36, rowCount: 1000 },
            index,
            sheetId: index + 1,
            title,
        },
    }));
    while (sheets.length < 65)
        sheets.push({
            data: [{ rowData: [] }],
            properties: {
                gridProperties: { columnCount: 1, rowCount: 1 },
                sheetId: sheets.length + 1,
                title: `Other ${sheets.length}`,
            },
        });
    /** @param {string} title */
    const sheet = (title) => {
        const found = sheets.find((item) => item.properties.title === title);
        if (!found) throw new Error(title);
        return found;
    };
    /**
     * @param {string} title @param {number} row @param {number} column @param
     *   {string | number} text
     */
    function put(title, row, column, text) {
        const source = sheet(title);
        source.data ??= [{ rowData: [] }];
        const data = source.data[0];
        if (!data) throw new Error("Missing synthetic grid");
        data.rowData ??= [];
        while (data.rowData.length <= row) data.rowData.push({ values: [] });
        const rowData = data.rowData[row];
        if (!rowData) throw new Error("Missing synthetic row");
        rowData.values ??= [];
        while (rowData.values.length <= column) rowData.values.push({});
        rowData.values[column] = {
            userEnteredValue:
                typeof text === "number"
                    ? { numberValue: text }
                    : text.startsWith("=")
                      ? { formulaValue: text }
                      : { stringValue: text },
        };
    }
    sheet("History").properties.gridProperties = {
        columnCount: 67,
        rowCount: 50_001,
    };
    sheet("App entries").properties.gridProperties.columnCount = 59;
    sheet("App bulk").properties.gridProperties.columnCount = 74;
    sheet("Plant color data").properties.gridProperties = {
        columnCount: 159,
        rowCount: 6023,
    };
    put("History", 0, 66, "Leaf VPD source");
    put("App entries", 0, 58, "Leaf VPD source");
    put("App bulk", 0, 73, "Support details");
    for (const [index, id] of ids.entries())
        put("Plant tracker", index + 1, 0, id);
    put("Baselines", 35, 17, '=IF($T36=1,"Nursery mix","Not recorded")');
    put("Baselines", 35, 19, "2");
    put("Plant tracker", 35, 3, "=COUNTIF(History!B2:B50001,$A36)");
    put("Dashboard", 40, 1, "P37");
    put("Dashboard", 40, 2, "='Plant tracker'!B36");
    put("Dashboard", 40, 8, "=G41-H41");
    put(
        "Insights data",
        35,
        17,
        '=IFNA(MAX(FILTER(History!A2:A50001,History!B2:B50001=P31)),"")'
    );
    put(
        "Integrity",
        4,
        5,
        "=SUM(N(COUNTA('Dry-down models'!A2:A37)=36),N(NOT(ISFORMULA('Workbook calculations'!B37))))"
    );
    const roster = ids.map((id) => `"${id}"`).join(";");
    put("Integrity", 6, 5, `=COUNTIF('Plant tracker'!A2:A38,{${roster}})`);
    put("Integrity", 7, 5, "=COUNTIF(Dashboard!B7:B43,'Plant tracker'!A2:A38)");
    put(
        "Integrity",
        14,
        1,
        '=COUNTIFS(Baselines!$A$2:$A$37,"<>",Baselines!$H$2:$H$37,"<>Calibrated")'
    );
    put(
        "Integrity",
        15,
        1,
        '=COUNTIFS(Baselines!$J$2:$J$37,"<>",Baselines!$J$2:$J$37,"<>OK")'
    );
    put("Integrity", 18, 1, '=COUNTIF(Baselines!$N$2:$N$37,"No anchor")');
    for (const column of [
        14,
        16,
        18,
    ])
        put(
            "Dashboard",
            2,
            column,
            '=COUNT(Baselines!$AF$2:$AF$37)&" / "&COUNTA(Baselines!$A$2:$A$37)'
        );
    put("Insights data", 35, 23, '=N(Baselines!K36="Reweigh")');
    put("Workbook calculations", 1, 7, 100);
    put("Workbook calculations", 1, 8, "Ready");
    put("Integrity", 59, 0, "Critical source-row exceptions");
    put("Integrity", 58, 0, "=Baselines!A37");
    put(
        "Integrity",
        11,
        1,
        "=SUM(ARRAYFORMULA(N(ISERROR('Plant color data'!A5506:F6023))))"
    );
    put(
        "P37 Arctic Ice",
        140,
        0,
        '=IFNA(FILTER(History!A2:L50001,History!B2:B50001="P37"),"")'
    );
    put("P37 Arctic Ice", 4, 1, "=Baselines!D36");
    put(
        "P37 Arctic Ice",
        12,
        16,
        '=FILTER(History!E2:E50001,History!B2:B50001="P37")'
    );
    put("Dry-down insights", 41, 0, '=FILTER($A$2:$A$37,$Q$2:$Q$37<>"")');
    put("Light & humidity", 45, 0, "=COUNT(C8:C43)");
    for (let block = 0; block < 14; block += 1) {
        const row = 5505 + block * 37;
        put("Plant color data", row, 0, "Plant ID");
        for (const [index, id] of ids.entries()) {
            put("Plant color data", row + index + 1, 0, id);
            put(
                "Plant color data",
                row + index + 1,
                1,
                `=XLOOKUP($A${row + index + 2},Baselines!$A$2:$A$37,Baselines!$C$2:$C$37,"")`
            );
        }
    }
    sheet("P37 Arctic Ice").charts = Array.from({ length: 4 }, (_, index) => ({
        chartId: index + 100,
        spec: {
            basicChart: {
                series: [
                    {
                        series: {
                            sourceRange: {
                                sources: [
                                    {
                                        endColumnIndex: 19,
                                        endRowIndex: 5011,
                                        sheetId:
                                            sheet("P37 Arctic Ice").properties
                                                .sheetId,
                                        startColumnIndex: 18,
                                        startRowIndex: 11,
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
            title: `Role ${index}`,
        },
    }));
    sheet("Dashboard").charts = Array.from({ length: 178 }, (_, index) => ({
        chartId: index + 1000,
        spec: {
            basicChart: {
                series: [
                    {
                        styleOverrides: Array.from(
                            { length: 36 },
                            (_, styleIndex) =>
                                styleIndex === 0
                                    ? { colorStyle: { rgbColor: { red: 1 } } }
                                    : {
                                          colorStyle: { rgbColor: { red: 1 } },
                                          index: styleIndex,
                                      }
                        ),
                    },
                ],
            },
            title: `Existing ${index}`,
        },
    }));
    /** @type {Snapshot} */
    const snapshot = {
        full: {
            sheets: sheets.filter(
                (item) =>
                    ![
                        "App bulk",
                        "App entries",
                        "History",
                        "History view",
                        "RO refills",
                    ].includes(item.properties.title)
            ),
        },
        intake: [
            {
                sheets: sheets.filter((item) =>
                    [
                        "App bulk",
                        "App entries",
                        "History",
                    ].includes(item.properties.title)
                ),
            },
        ],
        metadata: {
            sheets: structuredClone(sheets).map(
                ({ data: _data, ...rest }) => rest
            ),
        },
    };
    return { put, sheet, snapshot };
}

describe("current houseplant enrollment", () => {
    it("adds identities without creating observations or overwriting staging, and preserves full capacity", () => {
        expect.hasAssertions();

        const { snapshot } = fixture();
        const plan = buildHouseplantEnrollment(snapshot);

        expect(plan.worstCaseCells).toBeLessThan(20_000_000);
        expect(
            plan.edits.filter((edit) =>
                [
                    "App entries",
                    "History",
                    "History view",
                    "RO refills",
                ].includes(edit.sheet)
            )
        ).toStrictEqual([]);
        expect(
            plan.edits
                .filter((edit) => edit.sheet === "App bulk")
                .map((edit) => [
                    edit.row,
                    edit.column,
                    edit.value,
                ])
        ).toStrictEqual([
            [
                0,
                74,
                { stringValue: "P39 weight (g)" },
            ],
            [
                0,
                75,
                { stringValue: "P40 weight (g)" },
            ],
        ]);
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "P39 Fittonia Nightly" && edit.row === 140
            )?.value.formulaValue
        ).toContain('History!B2:B50001="P39"');
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "Dashboard" &&
                    edit.row === 42 &&
                    edit.column === 8
            )?.value.formulaValue
        ).toBe("=G43-H43");
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "Dashboard" &&
                    edit.row === 43 &&
                    edit.column === 2
            )?.value.formulaValue
        ).toBe("='Plant tracker'!B39");
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "Baselines" &&
                    edit.row === 37 &&
                    edit.column === 17
            )?.value.formulaValue
        ).toBe('="Not recorded"');
        expect(
            plan.prepareRequests.some((request) => "deleteDimension" in request)
        ).toBe(false);
        expect(plan.compactRequests).toHaveLength(1);
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "Baselines" &&
                    edit.row === 37 &&
                    edit.column === 19
            )?.value
        ).toStrictEqual({ numberValue: 1 });
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "Insights data" &&
                    edit.row === 37 &&
                    edit.column === 17
            )?.value.formulaValue
        ).toContain("=$P38");
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "Integrity" &&
                    edit.row === 4 &&
                    edit.column === 5
            )?.value.formulaValue
        ).toContain("COUNTA('Dry-down models'!A2:A39)=38");
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "Integrity" &&
                    edit.row === 4 &&
                    edit.column === 5
            )?.value.formulaValue
        ).toContain("ISFORMULA('Workbook calculations'!B39)");
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "Integrity" &&
                    edit.row === 6 &&
                    edit.column === 5
            )?.value.formulaValue
        ).toContain('"P39";"P40"');
        expect(JSON.stringify(plan.chartRequests)).toContain('"index":37');
    });

    it("excludes only the two new manual-care pots from calibration aggregates while retaining reweigh checks", () => {
        expect.hasAssertions();

        const plan = buildHouseplantEnrollment(fixture().snapshot);
        const aggregate = plan.edits.filter(
            (edit) =>
                (edit.sheet === "Integrity" &&
                    edit.column === 1 &&
                    [
                        14,
                        15,
                        18,
                    ].includes(edit.row)) ||
                (edit.sheet === "Dashboard" &&
                    edit.row === 2 &&
                    [
                        14,
                        16,
                        18,
                    ].includes(edit.column))
        );

        expect(aggregate).toHaveLength(6);

        for (const edit of aggregate) {
            expect(edit.value.formulaValue).toContain(
                'Baselines!$A$2:$A$39,"<>P39",Baselines!$A$2:$A$39,"<>P40"'
            );
            expect(edit.value.formulaValue).not.toContain('"<>P38"');
        }
        const insights = plan.edits.filter(
            (edit) =>
                edit.sheet === "Insights data" &&
                [37, 38].includes(edit.row) &&
                [22, 24].includes(edit.column)
        );

        expect(insights.map((edit) => edit.value.formulaValue)).toStrictEqual([
            "=0",
            "=0",
            "=0",
            "=0",
        ]);
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "Insights data" &&
                    edit.row === 37 &&
                    edit.column === 23
            )?.value.formulaValue
        ).toBe('=N(Baselines!K38="Reweigh")');
    });

    it("archives every comparison block and provides all 38 identities in each new comparison", () => {
        expect.hasAssertions();

        const plan = buildHouseplantEnrollment(fixture().snapshot);
        for (let block = 0; block < 14; block += 1) {
            const rows = plan.edits.filter(
                (edit) =>
                    edit.sheet === "Plant comparisons" &&
                    edit.column === 0 &&
                    edit.row > 1022 + block * 39 &&
                    edit.row < 1061 + block * 39
            );

            expect(rows.map((edit) => edit.value.stringValue)).toStrictEqual([
                ...ids,
                "P39",
                "P40",
            ]);
        }

        expect(
            plan.edits.find(
                (edit) => edit.sheet === "Plant comparisons" && edit.row === 504
            )?.value.stringValue
        ).toBe("Plant ID");
        expect(
            plan.edits.find(
                (edit) =>
                    edit.sheet === "Plant comparisons" &&
                    edit.row === 1060 &&
                    edit.column === 1
            )?.value.formulaValue
        ).toContain("$A1061");
    });

    it("fails closed for occupied destinations, missing captures, schema drift, and replay", () => {
        expect.hasAssertions();

        const occupied = fixture();
        occupied.put("Plant tracker", 37, 1, "Unreviewed work");

        expect(() => buildHouseplantEnrollment(occupied.snapshot)).toThrow(
            "Occupied enrollment destination"
        );

        const missing = fixture();
        missing.snapshot.full.sheets = missing.snapshot.full.sheets.filter(
            (sheet) => sheet.properties.title !== "Plant color data"
        );

        expect(() => buildHouseplantEnrollment(missing.snapshot)).toThrow(
            "Missing complete source capture"
        );

        const drift = fixture();
        drift.put("History", 0, 66, "Wrong header");

        expect(() => buildHouseplantEnrollment(drift.snapshot)).toThrow(
            "Changed intake header"
        );

        const replay = fixture();
        const first = required(replay.snapshot.metadata.sheets[0]);
        first.properties.title = "P39 Fittonia Nightly";

        expect(() => buildHouseplantEnrollment(replay.snapshot)).toThrow(
            "Missing complete source capture: P39 Fittonia Nightly"
        );
    });

    it("rejects changed captured formulas but ignores volatile calculated results", () => {
        expect.hasAssertions();

        const { put, sheet, snapshot } = fixture();
        const plan = buildHouseplantEnrollment(snapshot);
        assertHouseplantEnrollmentPreconditions(plan, snapshot);
        const first = required(
            sheet("Baselines").data?.[0]?.rowData?.[35]?.values?.[17]
        );
        first.effectiveValue = { stringValue: "Volatile" };
        assertHouseplantEnrollmentPreconditions(plan, snapshot);
        put("Baselines", 35, 17, "Changed");

        expect(() => {
            assertHouseplantEnrollmentPreconditions(plan, snapshot);
        }).toThrow("Workbook drift");
    });

    it("keeps History limits, numbers and quoted strings while extending named roster ranges", () => {
        expect.hasAssertions();

        expect(
            extendHouseplantFormula(
                '=XLOOKUP("P37",Baselines!A2:A37,Baselines!B2:B37)+SUM(History!E2:E50001)+37'
            )
        ).toBe(
            '=XLOOKUP("P37",Baselines!A2:A39,Baselines!B2:B39)+SUM(History!E2:E50001)+37'
        );
        expect(
            extendHouseplantFormula("=COUNT(C8:C43)", "Light & humidity")
        ).toBe("=COUNT(C8:C45)");
    });

    it("blocks compaction until archived formulas and every existing chart survive readback", () => {
        expect.hasAssertions();

        const { snapshot } = fixture();
        const plan = buildHouseplantEnrollment(snapshot);
        /** @type {Sheet} */
        const archive = {
            charts: Array.from({ length: 8 }, (_, index) => ({
                chartId: 5000 + index,
                spec: { title: "New page chart" },
            })),
            data: [
                {
                    rowData: Array.from({ length: 1568 }, () => ({
                        values: Array.from({ length: 6 }, () => ({})),
                    })),
                },
            ],
            properties: {
                gridProperties: { columnCount: 6, rowCount: 1568 },
                sheetId: 907_202_614,
                title: "Plant comparisons",
            },
        };
        const rows = required(archive.data?.[0]?.rowData);
        const archiveEdits = plan.edits.filter(
            (edit) => edit.sheet === "Plant comparisons"
        );
        for (const edit of archiveEdits) {
            const row = rows[edit.row] ?? { values: [] };
            const values = row.values ?? [];
            values[edit.column] = { userEnteredValue: edit.value };
            row.values = values;
            rows[edit.row] = row;
        }
        snapshot.metadata.sheets.push(archive);
        const captured = { sheets: [archive] };

        expect(
            assertHouseplantCompactionPreconditions(
                plan,
                snapshot.metadata,
                captured
            )
        ).toBe(true);

        const affected = required(
            plan.edits.find((edit) => edit.sheet === "Plant comparisons")
        ).row;
        const original = required(rows[affected]);
        rows[affected] = {
            values: [{ userEnteredValue: { stringValue: "Damaged archive" } }],
        };

        expect(() =>
            assertHouseplantCompactionPreconditions(
                plan,
                snapshot.metadata,
                captured
            )
        ).toThrow("Comparison archive readback mismatch");

        rows[affected] = original;
        const charts = required(archive.charts);
        charts.pop();

        expect(() =>
            assertHouseplantCompactionPreconditions(
                plan,
                snapshot.metadata,
                captured
            )
        ).toThrow("Expected 190 charts");
    });

    it.each([
        { name: "unchanged", status: "Ready", timestamp: 100 },
        { name: "before values", status: "Ready", timestamp: 100.5 },
        { name: "failed", status: "Refresh failed", timestamp: 102 },
    ])(
        "rejects $name analytics before chart publication",
        ({ status, timestamp }) => {
            expect.hasAssertions();

            const workbook = fixture();
            const plan = buildHouseplantEnrollment(workbook.snapshot);
            readyAnalytics(workbook);
            workbook.put("Workbook calculations", 1, 7, timestamp);
            workbook.put("Workbook calculations", 1, 8, status);

            expect(() =>
                assertHouseplantChartPreconditions(
                    plan,
                    workbook.snapshot.full,
                    101
                )
            ).toThrow("completed Ready analytics refresh");
        }
    );

    it.each([0, 15 / 1440])(
        "accepts the native freshness boundary at %s days",
        (age) => {
            expect.hasAssertions();

            const workbook = fixture();
            const plan = buildHouseplantEnrollment(workbook.snapshot);
            readyAnalytics(workbook);
            const calculated = 46_316.84608122685;
            workbook.put("Workbook calculations", 1, 7, calculated);
            workbook.put("Workbook calculations", 1, 4, calculated + age);

            expect(
                assertHouseplantChartPreconditions(
                    plan,
                    workbook.snapshot.full,
                    101
                )
            ).toBe(true);
        }
    );

    it.each([
        { clock: 102 + 901 / 86_400, name: "15 minutes and one second old" },
        { clock: 102 - 1 / 86_400, name: "future analytics" },
        { clock: "", name: "missing clock" },
        { clock: NaN, name: "NaN clock" },
        { clock: Infinity, name: "infinite clock" },
    ])("rejects $name despite Ready and a complete roster", ({ clock }) => {
        expect.hasAssertions();

        const workbook = fixture();
        const plan = buildHouseplantEnrollment(workbook.snapshot);
        readyAnalytics(workbook);
        workbook.put("Workbook calculations", 1, 4, clock);

        expect(() =>
            assertHouseplantChartPreconditions(
                plan,
                workbook.snapshot.full,
                101
            )
        ).toThrow("analytics no older than 15 minutes");
    });

    it("blocks chart publication on incomplete or wrong-setup analytics", () => {
        expect.hasAssertions();

        const workbook = fixture();
        const plan = buildHouseplantEnrollment(workbook.snapshot);
        const fresh = workbook.snapshot.full;

        readyAnalytics(workbook);

        expect(assertHouseplantChartPreconditions(plan, fresh, 101)).toBe(true);

        workbook.put("Dry-down models", 38, 0, "");

        expect(() =>
            assertHouseplantChartPreconditions(plan, fresh, 101)
        ).toThrow("38-pot model roster");

        workbook.put("Dry-down models", 38, 0, "P40");
        workbook.put("Dry-down models", 38, 1, 2);

        expect(() =>
            assertHouseplantChartPreconditions(plan, fresh, 101)
        ).toThrow("model setups matching enrolled Baselines");
    });

    it("uses reviewed chart definitions after readiness rather than sparse native template readback", () => {
        expect.hasAssertions();

        const workbook = fixture();
        const plan = buildHouseplantEnrollment(workbook.snapshot);
        const originalCharts = required(plan.chartTemplate.charts);
        const nativeCharts = required(
            workbook.snapshot.metadata.sheets.find(
                (sheet) => sheet.properties.title === "P37 Arctic Ice"
            )?.charts
        );
        for (const native of nativeCharts)
            native.spec = { title: native.spec["title"] };
        for (const [index, plant] of houseplantAdditions.entries())
            workbook.snapshot.metadata.sheets.push({
                charts: originalCharts.map((chart, offset) => ({
                    chartId: 5000 + index * 4 + offset,
                    spec: { title: chart.spec["title"] },
                })),
                properties: {
                    gridProperties: { columnCount: 22, rowCount: 5139 },
                    sheetId: plant.sheetId,
                    title: plant.title,
                },
            });

        expect(() =>
            finalizeHouseplantEnrollmentCharts(
                plan,
                workbook.snapshot.metadata,
                workbook.snapshot.full,
                101
            )
        ).toThrow("completed Ready analytics refresh");

        readyAnalytics(workbook);
        const requests = finalizeHouseplantEnrollmentCharts(
            plan,
            workbook.snapshot.metadata,
            workbook.snapshot.full,
            101
        );

        expect(requests.slice(0, plan.chartRequests.length)).toStrictEqual(
            plan.chartRequests
        );
        expect(
            JSON.stringify(requests.slice(plan.chartRequests.length))
        ).toContain('"endRowIndex":5011');
        expect(
            JSON.stringify(requests.slice(plan.chartRequests.length))
        ).toContain('"colorStyle"');
        expect(requests).toHaveLength(plan.chartRequests.length + 8);
    });

    it("finalizes eight new chart identities, recreating only interval charts to repair copied alt text", () => {
        expect.hasAssertions();

        const { snapshot } = fixture();
        const sourceCharts = required(
            snapshot.metadata.sheets.find(
                (sheet) => sheet.properties.title === "P37 Arctic Ice"
            )?.charts
        );
        const scatter = required(sourceCharts[1]);
        scatter.spec["title"] =
            "Weight trend after latest Water / Repot anchor";
        scatter.spec["subtitle"] =
            "Current pot setup only • calculated drying rate remains visible before Dry/Wet calibration.";
        const interval = required(sourceCharts[3]);
        interval.spec["title"] = "Time between waterings";
        interval.spec["altText"] = "P37: completed watering intervals.";
        const before = structuredClone(snapshot.metadata);
        for (const [index, plant] of houseplantAdditions.entries())
            snapshot.metadata.sheets.push({
                charts: sourceCharts.map((chart, offset) => ({
                    ...chart,
                    border: { colorStyle: { themeColor: "TEXT" } },
                    chartId: 5000 + index * 4 + offset,
                    position: {
                        overlayPosition: {
                            anchorCell: {
                                rowIndex: 110,
                                sheetId: plant.sheetId,
                            },
                            heightPixels: 440,
                            widthPixels: 1285,
                        },
                    },
                })),
                properties: {
                    gridProperties: { columnCount: 22, rowCount: 5139 },
                    sheetId: plant.sheetId,
                    title: plant.title,
                },
            });
        const requests = finalizeHouseplantPageCharts(snapshot.metadata);

        expect(requests).toHaveLength(10);
        expect(requests[1]).toMatchObject({
            updateChartSpec: {
                chartId: 5001,
                spec: {
                    subtitle:
                        "Measured weights in the current pot setup after the latest Water / Repot anchor • observations only; inspect substrate and plant condition for watering. · Latest 4,999 relevant points; summaries use full history.",
                },
            },
        });
        expect(JSON.stringify(requests)).not.toContain("Dry/Wet calibration");
        expect(JSON.stringify(requests)).not.toContain(
            "calculated drying rate"
        );
        expect(
            requests.filter((request) => "deleteEmbeddedObject" in request)
        ).toStrictEqual([
            { deleteEmbeddedObject: { objectId: 5003 } },
            { deleteEmbeddedObject: { objectId: 5007 } },
        ]);
        expect(requests[4]).toMatchObject({
            addChart: {
                chart: {
                    border: { colorStyle: { themeColor: "TEXT" } },
                    chartId: 5003,
                    position: {
                        overlayPosition: {
                            anchorCell: { rowIndex: 110, sheetId: 202_610_390 },
                            heightPixels: 440,
                            widthPixels: 1285,
                        },
                    },
                    spec: { altText: "P39: completed watering intervals." },
                },
            },
        });
        expect(requests[9]).toMatchObject({
            addChart: {
                chart: {
                    chartId: 5007,
                    spec: { altText: "P40: completed watering intervals." },
                },
            },
        });
        expect(
            snapshot.metadata.sheets.slice(0, before.sheets.length)
        ).toStrictEqual(before.sheets);
        expect(JSON.stringify(requests)).not.toContain('"chartId":100,');
        expect(JSON.stringify(requests)).toContain('"sheetId":202610390');
        expect(JSON.stringify(requests)).toContain('"endRowIndex":5011');
    });
});

/** @param {ReturnType<typeof fixture>} workbook */
function readyAnalytics(workbook) {
    workbook.put("Workbook calculations", 1, 4, 102);
    workbook.put("Workbook calculations", 1, 7, 102);
    workbook.put("Workbook calculations", 1, 8, "Ready");
    for (const [index, id] of [
        ...ids,
        "P39",
        "P40",
    ].entries()) {
        workbook.put("Dry-down models", index + 1, 0, id);
        workbook.put("Dry-down models", index + 1, 1, 1);
    }
    for (const [index, id] of ["P39", "P40"].entries()) {
        workbook.put("Baselines", 37 + index, 0, id);
        workbook.put("Baselines", 37 + index, 19, 1);
    }
}

/** @template T @param {T | undefined} value @returns {T} */
function required(value) {
    if (value === undefined) throw new Error("Missing fixture");
    return value;
}
