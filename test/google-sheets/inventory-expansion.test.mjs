import { describe, expect, it } from "vitest";

import { isRecord } from "../../scripts/build-data.mjs";
import {
    buildInventoryExpansion,
    extendInventoryFormula,
    finalizeInventoryPageCharts,
    inventoryAdditions,
    shiftInventoryRow,
    verifyInventoryExpansionPreconditions,
} from "../../scripts/google-sheets/inventory-expansion.mjs";
import {
    buildPurchasedHouseplantsExpansion,
    purchasedHouseplants,
    verifyPurchasedHouseplantsPreconditions,
} from "../../scripts/google-sheets/purchased-houseplants.mjs";
import { required } from "../helpers/required.mjs";

/** @typedef {import("../../scripts/google-sheets/inventory-expansion.mjs").NativeSnapshot} Snapshot */
/** @typedef {import("../../scripts/google-sheets/inventory-expansion.mjs").Sheet} Sheet */

function fixture() {
    const names = [
        "Dashboard",
        "Plant tracker",
        "Baselines",
        "P30 Mixed succulent",
        "Quick log",
        "Plant colors",
        "Integrity",
        "Insights data",
        "Dry-down insights",
        "Plant color data",
        "Dry-down models",
        "Watering intervals",
        "Workbook calculations",
        "Workbook analytics",
        "Watering calendar",
        "App bulk",
        "App entries",
        "History",
        "RO refills",
        "Insights",
    ];
    /** @type {Snapshot} */ const snapshot = {
        sheets: names.map((title, index) => ({
            data: [],
            properties: {
                gridProperties: {
                    columnCount: title === "App bulk" ? 54 : 150,
                    rowCount: 5001,
                },
                index,
                sheetId: index + 1,
                title,
            },
        })),
    };
    /** @param {string} name */ const sheet = (name) => {
        const found = snapshot.sheets.find(
            (current) => current.properties.title === name
        );
        if (found === undefined) throw new Error(name);
        return found;
    };
    for (const title of ["Plant tracker", "Baselines"]) {
        for (let index = 1; index <= 30; index += 1)
            put(sheet(title), index, 0, `P${String(index).padStart(2, "0")}`);
        put(sheet(title), 30, 1, "Existing shared planter");
        put(sheet(title), 30, 2, "=Baselines!C31");
    }
    put(sheet("Plant tracker"), 0, 0, "Plant ID");
    put(sheet("App entries"), 0, 2, "Plant ID");
    required(sheet("App entries").data).push({
        rowData: [
            {
                values: [
                    {
                        dataValidation: {
                            condition: {
                                type: "ONE_OF_LIST",
                                values: Array.from(
                                    { length: 30 },
                                    (_, index) => ({
                                        userEnteredValue: `P${String(index + 1).padStart(2, "0")}`,
                                    })
                                ),
                            },
                            showCustomUi: true,
                            strict: true,
                        },
                    },
                ],
            },
        ],
        startColumn: 2,
        startRow: 1,
    });
    put(sheet("App bulk"), 0, 35, "P30 weight (g)");
    put(sheet("Dashboard"), 35, 1, "P30");
    put(sheet("Dashboard"), 35, 2, "='Plant tracker'!B31");
    put(sheet("Dashboard"), 35, 8, '=IF(G36="","",G36-H36)');
    put(
        sheet("Integrity"),
        11,
        1,
        "=SUM(ARRAYFORMULA(N(ISERROR(Baselines!A2:C31))))"
    );
    put(sheet("Integrity"), 52, 0, "=Baselines!A31");
    put(sheet("Integrity"), 53, 0, "Critical source-row exceptions");
    put(sheet("History"), 1, 0, 45_000);
    put(sheet("History"), 1, 1, "P30");
    put(sheet("RO refills"), 19, 0, 45_000);
    put(sheet("App entries"), 1, 0, "pending-entry");
    const page = sheet("P30 Mixed succulent");
    put(page, 0, 0, "P30 · Tiny mixed succulent planter");
    put(page, 4, 1, "=Baselines!C31");
    put(page, 5, 1, "=Baselines!$D$31");
    put(
        page,
        14,
        3,
        "=IFNA(MIN(FILTER('Watering intervals'!$CL$2:$CL$5000,'Watering intervals'!$CL$2:$CL$5000>0)),\"\")"
    );
    put(page, 108, 0, "=COUNT('Watering intervals'!CL2:CL5000)");
    put(sheet("Workbook analytics"), 30, 5, "P30");
    put(
        sheet("Workbook analytics"),
        30,
        6,
        "=IFNA(MIN('Watering intervals'!$CL$2:$CL$5000),\"\")"
    );
    put(
        page,
        140,
        0,
        '=IFNA(LET(plant,"P30",FILTER(History!A2:A5000,History!B2:B5000=plant)),"")'
    );
    page.charts = Array.from({ length: 4 }, (_, index) => ({
        chartId: 100 + index,
        position: {
            overlayPosition: {
                anchorCell: {
                    columnIndex: 0,
                    rowIndex: 53 + index * 28,
                    sheetId: page.properties.sheetId,
                },
            },
        },
        spec: {
            basicChart: {
                axis: [],
                series: [
                    {
                        colorStyle: { rgbColor: { red: 1 } },
                        series: {
                            sourceRange: {
                                sources: [
                                    {
                                        endColumnIndex: 5,
                                        endRowIndex: 5139,
                                        sheetId: page.properties.sheetId,
                                        startColumnIndex: 4,
                                        startRowIndex: 140,
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
            title: "P30 Weight",
        },
    }));
    const metadata = structuredClone(snapshot);
    for (const current of metadata.sheets) delete current.data;
    return { metadata, sheet, snapshot };
}

/**
 * @param {Sheet} sheet @param {number} row @param {number} column @param
 *   {string|number} value
 */
function put(sheet, row, column, value) {
    sheet.data ??= [];
    sheet.data.push({
        rowData: [
            {
                values: [
                    {
                        userEnteredValue:
                            typeof value === "number"
                                ? { numberValue: value }
                                : value.startsWith("=")
                                  ? { formulaValue: value }
                                  : { stringValue: value },
                    },
                ],
            },
        ],
        startColumn: column,
        startRow: row,
    });
}

describe("guarded 30-to-32 inventory expansion", () => {
    it("extends adjacent native bandings before copying row formats", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = fixture();
        const tracker = required(
            metadata.sheets.find(
                (current) => current.properties.title === "Plant tracker"
            )
        );
        tracker["bandedRanges"] = [
            {
                bandedRangeId: 71,
                range: {
                    endColumnIndex: 15,
                    endRowIndex: 31,
                    sheetId: sheet("Plant tracker").properties.sheetId,
                    startColumnIndex: 0,
                    startRowIndex: 0,
                },
            },
            {
                bandedRangeId: 72,
                range: {
                    endColumnIndex: 36,
                    endRowIndex: 31,
                    sheetId: sheet("Plant tracker").properties.sheetId,
                    startColumnIndex: 15,
                    startRowIndex: 0,
                },
            },
        ];
        const plan = buildInventoryExpansion(metadata, [snapshot]);
        const firstCopy = plan.prepareRequests.findIndex(
            (request) => request["copyPaste"] !== undefined
        );
        const bandingRequests = plan.prepareRequests.filter(
            (request) => request["updateBanding"] !== undefined
        );

        expect(bandingRequests).toHaveLength(2);
        expect(firstCopy).toBeGreaterThan(0);

        const lastCopy = plan.prepareRequests.findLastIndex(
            (request) => request["copyPaste"] !== undefined
        );
        const firstSwatch = plan.prepareRequests.findIndex(
            (request) => request["repeatCell"] !== undefined
        );

        expect(firstSwatch).toBeGreaterThan(lastCopy);
        expect(plan.prepareRequests.slice(firstSwatch)).toHaveLength(2);

        expect(
            plan.prepareRequests
                .slice(firstCopy)
                .every(
                    (request) =>
                        request["copyPaste"] !== undefined ||
                        request["repeatCell"] !== undefined
                )
        ).toBe(true);
        expect(JSON.stringify(bandingRequests)).toContain('"bandedRangeId":71');
        expect(JSON.stringify(bandingRequests)).toContain('"bandedRangeId":72');
        expect(JSON.stringify(bandingRequests)).toContain('"endRowIndex":33');
    });

    it("requires complete ledgers and rejects archived input or evidence drift during purchase enrollment", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = fixture();
        sheet("App bulk").properties.gridProperties.columnCount = 56;
        required(
            metadata.sheets.find(
                (current) => current.properties.title === "App bulk"
            )
        ).properties.gridProperties.columnCount = 56;
        sheet("Integrity").data = required(sheet("Integrity").data).filter(
            (block) => block.startRow !== 53
        );
        put(sheet("Integrity"), 55, 0, "Critical source-row exceptions");
        put(sheet("App bulk"), 0, 54, "P31 weight (g)");
        put(sheet("App bulk"), 0, 55, "P32 weight (g)");

        expect(() =>
            buildPurchasedHouseplantsExpansion(metadata, [snapshot])
        ).toThrow("Missing complete ledger");

        for (const title of [
            "History",
            "App entries",
            "App bulk",
            "RO refills",
        ]) {
            const source = sheet(title);
            densifyLedger(source);
        }
        put(sheet("Insights"), 227, 1, "P27");
        const selectorCell = required(
            required(sheet("Insights").data?.[0]).rowData?.[0]?.values?.[0]
        );
        Reflect.set(
            selectorCell,
            "note",
            "Select P01–P30. Only this cell is an input; chart data is derived."
        );
        const plan = buildPurchasedHouseplantsExpansion(metadata, [snapshot]);

        expect(plan.prepareRequests.at(-1)).toStrictEqual({
            updateCells: {
                fields: "note",
                rows: [
                    {
                        values: [
                            {
                                note: "Select an active pot: P01–P30, P33, or P34. Only this cell is an input; chart data is derived.",
                            },
                        ],
                    },
                ],
                start: {
                    columnIndex: 1,
                    rowIndex: 227,
                    sheetId: sheet("Insights").properties.sheetId,
                },
            },
        });
        expect(selectorCell.userEnteredValue).toStrictEqual({
            stringValue: "P27",
        });

        expect(() => {
            verifyPurchasedHouseplantsPreconditions(plan, metadata, [snapshot]);
        }).not.toThrow();

        Reflect.set(selectorCell, "note", "Owner changed selector guidance");

        expect(() =>
            buildPurchasedHouseplantsExpansion(metadata, [snapshot])
        ).toThrow("selector note changed");
        expect(() => {
            verifyPurchasedHouseplantsPreconditions(plan, metadata, [snapshot]);
        }).toThrow("source cells changed");

        Reflect.set(
            selectorCell,
            "note",
            "Select P01–P30. Only this cell is an input; chart data is derived."
        );

        const historyData = required(sheet("History").data?.[0]);
        const historyCell = required(historyData.rowData?.[1]?.values?.[0]);
        const bulkData = required(sheet("App bulk").data?.[0]);
        const bulkRow = required(bulkData.rowData?.[1]?.values);
        while (bulkRow.length <= 54) bulkRow.push({});
        bulkRow[54] = { userEnteredValue: { numberValue: 123 } };

        expect(() =>
            buildPurchasedHouseplantsExpansion(metadata, [snapshot])
        ).toThrow("compatibility fields must remain blank");

        bulkRow[54] = {};
        historyCell.userEnteredValue = { stringValue: "P33" };

        expect(() =>
            buildPurchasedHouseplantsExpansion(metadata, [snapshot])
        ).toThrow("Reserved or new ID already present");
    });

    it("extends inventory ranges without changing observations or unrelated numbers", () => {
        expect.hasAssertions();
        expect(
            extendInventoryFormula(
                "=XLOOKUP(A31,Baselines!$A$2:$A$31,'Plant tracker'!B2:B31)"
            )
        ).toBe("=XLOOKUP(A31,Baselines!$A$2:$A$33,'Plant tracker'!B2:B33)");
        expect(
            extendInventoryFormula(
                "=SUM(History!A2:A5000,Other!A2:A31,DATE(2026,12,31),Dashboard!$I$7:$I$36)"
            )
        ).toBe(
            "=SUM(History!A2:A5000,Other!A2:A31,DATE(2026,12,31),Dashboard!$I$7:$I$38)"
        );
        expect(shiftInventoryRow('=IF(A31="P31",$A$31,B31)', 31, 32)).toBe(
            '=IF(A32="P31",$A$31,B32)'
        );
    });

    it("creates two pot histories, preserves source snapshots, and writes no observations", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = fixture();
        const before = structuredClone(snapshot);
        const plan = buildInventoryExpansion(metadata, [snapshot]);

        expect(snapshot).toStrictEqual(before);
        expect(
            plan.prepareRequests.filter(
                (request) => "duplicateSheet" in request
            )
        ).toHaveLength(2);

        const forbidden = [
            sheet("History").properties.sheetId,
            sheet("RO refills").properties.sheetId,
            sheet("App entries").properties.sheetId,
        ];
        for (const request of plan.valueRequests) {
            const text = JSON.stringify(request);
            for (const sheetId of forbidden)
                expect(text).not.toContain(`"sheetId":${sheetId}`);
        }

        expect(JSON.stringify(plan.valueRequests)).toContain(
            "Four-succulent planter"
        );
        expect(JSON.stringify(plan.valueRequests)).toContain(
            "Nanouk tradescantia"
        );
        expect(JSON.stringify(plan.valueRequests)).toContain("P31 weight (g)");
        expect(JSON.stringify(plan.valueRequests)).toContain("P32 weight (g)");
        expect(JSON.stringify(plan.valueRequests)).toContain(
            "History!$K$2:$K$5000=$T32"
        );
        expect(JSON.stringify(plan.valueRequests)).toContain(
            "History!$K$2:$K$5000=$T33"
        );
        expect(JSON.stringify(plan.valueRequests)).toContain("IF($T32=1");
        expect(JSON.stringify(plan.valueRequests)).toContain("IF($T33=1");
        expect(JSON.stringify(plan.valueRequests)).toContain(
            "=MAX(1,IFNA(MAX(FILTER(History!$K$2:$K$5000"
        );
        expect(plan.prepareRequests).toContainEqual({
            copyPaste: {
                destination: {
                    endColumnIndex: 96,
                    endRowIndex: 5001,
                    sheetId: sheet("Watering intervals").properties.sheetId,
                    startColumnIndex: 90,
                    startRowIndex: 0,
                },
                pasteType: "PASTE_FORMAT",
                source: {
                    endColumnIndex: 90,
                    endRowIndex: 5001,
                    sheetId: sheet("Watering intervals").properties.sheetId,
                    startColumnIndex: 87,
                    startRowIndex: 0,
                },
            },
        });
        expect(
            verifyInventoryExpansionPreconditions(plan, metadata, [snapshot])
        ).toBe(true);
    });

    it("clones page warning protections with fresh IDs and rebound ranges", () => {
        expect.hasAssertions();

        const { metadata, snapshot } = fixture();
        const template = required(
            metadata.sheets.find(
                (item) => item.properties.title === "P30 Mixed succulent"
            )
        );
        template["protectedRanges"] = [
            {
                description: "Garden workbook · P30 Mixed succulent",
                protectedRangeId: 123,
                range: { sheetId: template.properties.sheetId },
                requestingUserCanEdit: true,
                warningOnly: true,
            },
        ];
        const plan = buildInventoryExpansion(metadata, [snapshot]);
        const protections = plan.prepareRequests.filter(
            (request) => "addProtectedRange" in request
        );

        expect(protections).toStrictEqual(
            inventoryAdditions.map((plant) => ({
                addProtectedRange: {
                    protectedRange: {
                        description: `Garden workbook · ${plant.title}`,
                        range: { sheetId: plant.sheetId },
                        warningOnly: true,
                    },
                },
            }))
        );
        expect(template["protectedRanges"]).toHaveLength(1);
    });

    it("rebases local dashboard cells and inventory lookup rows independently", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = fixture();
        const plan = buildInventoryExpansion(metadata, [snapshot]);
        const dashboardId = sheet("Dashboard").properties.sheetId;
        const writes = plan.valueRequests.filter((request) =>
            JSON.stringify(request).includes(`"sheetId":${dashboardId}`)
        );
        const text = JSON.stringify(writes);

        expect(text).toContain("'Plant tracker'!B32");
        expect(text).toContain("'Plant tracker'!B33");
        expect(text).toContain("G37-H37");
        expect(text).toContain("G38-H38");

        const pages = plan.valueRequests.filter((request) =>
            JSON.stringify(request).includes('"sheetId":202609310')
        );

        expect(JSON.stringify(pages)).toContain("Baselines!C32");
        expect(JSON.stringify(pages)).toContain(String.raw`plant,\"P31\"`);
        expect(JSON.stringify(pages)).toContain(
            "'Watering intervals'!$CO$2:$CO$5000"
        );
        expect(JSON.stringify(pages)).toContain(
            "'Watering intervals'!CO2:CO5000"
        );
        expect(JSON.stringify(pages)).not.toContain("$CL");
        expect(JSON.stringify(pages)).toContain(
            "=IF(COUNTIFS(History!$B$2:$B$5000"
        );
    });

    it("rejects replay, an occupied new inventory row, and a changed old roster", () => {
        expect.hasAssertions();

        const replay = fixture();
        replay.metadata.sheets.push({
            properties: {
                gridProperties: { columnCount: 22, rowCount: 5001 },
                sheetId: 202_609_310,
                title: inventoryAdditions[0]?.title ?? "",
            },
        });

        expect(() =>
            buildInventoryExpansion(replay.metadata, [replay.snapshot])
        ).toThrow("already exists");

        const occupied = fixture();
        put(occupied.sheet("Plant tracker"), 31, 0, "existing notes");

        expect(() =>
            buildInventoryExpansion(occupied.metadata, [occupied.snapshot])
        ).toThrow("Occupied expansion destination");

        const changed = fixture();
        const tracker = changed.sheet("Plant tracker");
        tracker.data = required(tracker.data).filter(
            (block) => block.startRow !== 15
        );

        expect(() =>
            buildInventoryExpansion(changed.metadata, [changed.snapshot])
        ).toThrow("Expected ordered 30-pot inventory");

        const header = fixture();
        header.sheet("App entries").data = required(
            header.sheet("App entries").data
        ).filter((block) => block.startRow !== 0);

        expect(() =>
            buildInventoryExpansion(header.metadata, [header.snapshot])
        ).toThrow("Plant ID header changed");
    });

    it("rejects fresh metadata or formula drift before writing", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = fixture();
        const plan = buildInventoryExpansion(metadata, [snapshot]);
        const changed = structuredClone(metadata);
        const first = required(changed.sheets[0]);
        first.properties.gridProperties.columnCount += 1;

        expect(() =>
            verifyInventoryExpansionPreconditions(plan, changed, [snapshot])
        ).toThrow("metadata changed");

        put(sheet("Baselines"), 31, 0, "occupied after planning");

        expect(() =>
            verifyInventoryExpansionPreconditions(plan, metadata, [snapshot])
        ).toThrow("Changed formula/value");
    });

    it("enrolls new permanent IDs in cleared capacity without reusing archived bulk fields", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = fixture();
        sheet("App bulk").properties.gridProperties.columnCount = 56;
        required(
            metadata.sheets.find(
                (current) => current.properties.title === "App bulk"
            )
        ).properties.gridProperties.columnCount = 56;
        sheet("Integrity").data = required(sheet("Integrity").data).filter(
            (block) => block.startRow !== 53
        );
        put(sheet("Integrity"), 55, 0, "Critical source-row exceptions");
        const options = {
            additions: purchasedHouseplants,
            bulkStartColumn: 56,
            reuseCapacity: true,
        };
        const plan = buildInventoryExpansion(metadata, [snapshot], options);
        const dimensions = plan.prepareRequests.filter(
            (request) =>
                request["appendDimension"] !== undefined ||
                request["insertDimension"] !== undefined
        );

        expect(dimensions).toHaveLength(1);
        expect(dimensions[0]).toStrictEqual({
            appendDimension: {
                dimension: "COLUMNS",
                length: 2,
                sheetId: sheet("App bulk").properties.sheetId,
            },
        });

        const bulkWrites = plan.valueRequests.filter(
            (request) =>
                updateStart(request)["sheetId"] ===
                sheet("App bulk").properties.sheetId
        );

        expect(
            bulkWrites.map((request) => updateStart(request)["columnIndex"])
        ).toStrictEqual([56, 57]);
        expect(JSON.stringify(bulkWrites)).toContain("P33 weight (g)");
        expect(JSON.stringify(bulkWrites)).toContain("P34 weight (g)");

        const validation = plan.prepareRequests.find(
            (request) =>
                request["setDataValidation"] !== undefined &&
                JSON.stringify(request).includes('"P34"')
        );

        expect(JSON.stringify(validation)).not.toContain('"P31"');
        expect(JSON.stringify(validation)).not.toContain('"P32"');
        expect(JSON.stringify(plan.valueRequests)).toContain(
            "peperomia-obtipan-bicolor/"
        );

        const mediumWrites = plan.valueRequests.filter(
            (request) =>
                updateStart(request)["sheetId"] ===
                    sheet("Baselines").properties.sheetId &&
                updateStart(request)["columnIndex"] === 17
        );

        expect(mediumWrites).toHaveLength(2);
        expect(JSON.stringify(mediumWrites)).toContain("Not recorded");
        expect(JSON.stringify(mediumWrites)).not.toContain(
            "Molly's Succulent Mix"
        );

        put(sheet("Integrity"), 53, 0, "Owner notes");

        expect(() =>
            buildInventoryExpansion(metadata, [snapshot], options)
        ).toThrow("Occupied expansion destination");
    });

    it("restores latent empty-page series from the populated native template", () => {
        expect.hasAssertions();

        const { metadata } = fixture();
        const template = required(
            metadata.sheets.find(
                (page) => page.properties.title === "P30 Mixed succulent"
            )
        );
        template.properties.sheetId = 202_609_300;
        for (const chart of required(template.charts)) {
            chart.spec["basicChart"] = {
                series: [
                    {
                        series: {
                            sourceRange: {
                                sources: [
                                    {
                                        endColumnIndex: 21,
                                        sheetId: 202_609_300,
                                        startColumnIndex: 20,
                                    },
                                ],
                            },
                        },
                    },
                ],
            };
        }
        for (const [index, plant] of inventoryAdditions.entries()) {
            const page = structuredClone(template);
            page.properties.sheetId = plant.sheetId;
            page.properties.title = plant.title;
            for (const chart of required(page.charts)) {
                chart.chartId += 500 + index * 4;
                chart.spec["basicChart"] = {};
            }
            metadata.sheets.push(page);
        }
        const requests = finalizeInventoryPageCharts(metadata);

        expect(JSON.stringify(requests)).toContain('"sheetId":202609310');
        expect(JSON.stringify(requests)).toContain('"sheetId":202609320');
        expect(JSON.stringify(requests)).not.toContain('"sheetId":202609300');
        expect(JSON.stringify(requests)).toContain('"startColumnIndex":20');
    });

    it("finalizes only newly duplicated charts and discards inherited weight floors", () => {
        expect.hasAssertions();

        const { metadata, sheet } = fixture();

        expect(() => finalizeInventoryPageCharts(metadata)).toThrow(
            "Expected four duplicated charts"
        );

        for (const [index, plant] of inventoryAdditions.entries()) {
            const page = structuredClone(sheet("P30 Mixed succulent"));
            page.properties.sheetId = plant.sheetId;
            page.properties.title = plant.title;
            page.charts = Array.from({ length: 4 }, (_, chartIndex) => ({
                chartId: 500 + index * 4 + chartIndex,
                spec: {
                    altText: "P30: completed intervals",
                    basicChart: {
                        axis: [
                            {
                                position: "LEFT_AXIS",
                                viewWindowOptions: {
                                    viewWindowMax: 500,
                                    viewWindowMin: 250,
                                },
                            },
                        ],
                        series: [],
                    },
                    title:
                        chartIndex === 3
                            ? "Time between waterings"
                            : "P30 · Tiny mixed succulent planter",
                },
            }));
            metadata.sheets.push(page);
        }
        const before = structuredClone(metadata);
        const requests = finalizeInventoryPageCharts(metadata);

        expect(metadata).toStrictEqual(before);
        expect(requests).toHaveLength(8);
        expect(JSON.stringify(requests)).not.toContain('"chartId":100');
        expect(JSON.stringify(requests)).not.toContain("viewWindowMin");
        expect(JSON.stringify(requests)).toContain("Four-succulent planter");
        expect(JSON.stringify(requests)).not.toContain("P30");
        expect(JSON.stringify(requests)).toContain('"startColumnIndex":92');
        expect(JSON.stringify(requests)).toContain('"startColumnIndex":95');
        expect(JSON.stringify(requests)).toContain('"targetAxis":"LEFT_AXIS"');
    });
});

/**
 * Current 32-pot source with retired compatibility fields, using small
 * synthetic cells.
 */
function currentFixture() {
    const result = fixture();
    const { metadata, sheet, snapshot } = result;
    for (const title of ["Plant tracker", "Baselines"]) {
        put(sheet(title), 31, 0, "P31");
        put(sheet(title), 32, 0, "P32");
        put(sheet(title), 32, 1, "Existing oyster plant");
        put(sheet(title), 32, 2, "=Baselines!C33");
    }
    put(sheet("Dashboard"), 37, 1, "P32");
    put(sheet("Dashboard"), 37, 2, "='Plant tracker'!B33");
    put(sheet("Dashboard"), 37, 8, '=IF(G38="","",G38-H38)');
    sheet("Integrity").data = required(sheet("Integrity").data).filter(
        (block) => block.startRow !== 53
    );
    put(sheet("Integrity"), 54, 0, "=Baselines!A33");
    put(sheet("Integrity"), 55, 0, "Critical source-row exceptions");
    for (const [
        id,
        nativeId,
        name,
    ] of [
        [
            "P31",
            202_609_330,
            "Peperomia Bicolor",
        ],
        [
            "P32",
            202_609_340,
            "Tricolor oyster plant",
        ],
    ]) {
        const page = structuredClone(sheet("P30 Mixed succulent"));
        page.properties = {
            ...page.properties,
            index: metadata.sheets.length,
            sheetId: Number(nativeId),
            title: `${String(id)} ${String(name)}`,
        };
        page.data = [];
        page.charts = [];
        snapshot.sheets.push(page);
        const meta = structuredClone(page);
        delete meta.data;
        metadata.sheets.push(meta);
    }
    sheet("App bulk").properties.gridProperties.columnCount = 58;
    required(
        metadata.sheets.find(
            (current) => current.properties.title === "App bulk"
        )
    ).properties.gridProperties.columnCount = 58;
    for (const [index, id] of [
        "P31",
        "P32",
        "P33",
        "P34",
    ].entries())
        put(sheet("App bulk"), 0, 54 + index, `${id} weight (g)`);
    const validation = required(
        required(
            sheet("App entries").data?.find(
                (block) => block.startRow === 1 && block.startColumn === 2
            )
        ).rowData?.[0]?.values?.[0]
    );
    validation.dataValidation = {
        condition: {
            type: "ONE_OF_LIST",
            values: currentIds.map((userEnteredValue) => ({
                userEnteredValue,
            })),
        },
        showCustomUi: true,
        strict: true,
    };
    put(sheet("Watering intervals"), 0, 87, "P30");
    put(
        sheet("Watering intervals"),
        1,
        89,
        '=FILTER(History!A2:A5000,History!B2:B5000="P30")'
    );
    put(sheet("Workbook analytics"), 0, 97, "P30");
    put(sheet("Workbook analytics"), 32, 5, "P32");
    put(
        sheet("Workbook analytics"),
        32,
        6,
        "=COUNT('Watering intervals'!CR2:CR5000)"
    );
    put(sheet("Plant color data"), 0, 94, "P30");
    put(sheet("Plant color data"), 0, 126, "P30");
    put(sheet("Plant color data"), 32, 0, "P32");
    const baseline = required(
        metadata.sheets.find(
            (current) => current.properties.title === "Baselines"
        )
    );
    baseline.charts = [
        {
            chartId: 901,
            spec: {
                basicChart: {
                    domains: [
                        {
                            domain: {
                                sourceRange: {
                                    sources: [
                                        {
                                            endColumnIndex: 1,
                                            endRowIndex: 33,
                                            sheetId:
                                                baseline.properties.sheetId,
                                            startColumnIndex: 0,
                                            startRowIndex: 0,
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    series: [
                        {
                            styleOverrides: currentIds.map((_id, index) => ({
                                color: { red: 0.4 },
                                index,
                            })),
                        },
                    ],
                },
                title: "Existing comparison",
            },
        },
    ];
    for (const title of [
        "History",
        "App entries",
        "App bulk",
        "RO refills",
    ])
        densifyLedger(sheet(title));
    return result;
}

/** @param {Sheet} source */
function densifyLedger(source) {
    /**
     * @type {NonNullable<NonNullable<Sheet["data"]>[number]["rowData"]>}
     */
    const rows = Array.from(
        { length: source.properties.gridProperties.rowCount },
        () => ({ values: [] })
    );
    for (const block of required(source.data)) {
        const blockRows = (block.rowData ?? []).entries();
        for (const [rowIndex, row] of blockRows) {
            const target = required(
                required(rows[(block.startRow ?? 0) + rowIndex]).values
            );
            const cells = (row.values ?? []).entries();
            for (const [column, cell] of cells)
                target[(block.startColumn ?? 0) + column] = cell;
        }
    }
    for (const row of rows) {
        const values = row.values ?? [];
        row.values = Array.from(
            { length: values.length },
            (_, index) => values[index] ?? {}
        );
    }
    source.data = [{ rowData: rows, startColumn: 0, startRow: 0 }];
}

/** @param {Record<string, unknown>} request */
function updateStart(request) {
    const update = request["updateCells"];
    if (!isRecord(update) || !isRecord(update["start"]))
        throw new Error("Expected updateCells request");
    return update["start"];
}
const currentIds = Array.from(
    { length: 32 },
    (_, index) => `P${String(index + 1).padStart(2, "0")}`
);
/** @type {import("../../scripts/google-sheets/inventory-expansion.mjs").Addition[]} */
const livingStoneAdditions = [
    {
        contents: "Lithops species unconfirmed; two pairs share one pot",
        details: "Acquired; repot not confirmed",
        id: "P35",
        label: "#9",
        medium: "Not recorded",
        name: "Shared Lithops",
        pot: "Not recorded",
        sheetId: 202_609_350,
        source: "Owner report",
        title: "P35 Shared Lithops",
    },
    {
        contents: "Probable Pleiospilos nelii; not Royal Flush",
        details: "Acquired; repot not confirmed",
        id: "P36",
        label: "#10",
        medium: "Not recorded",
        name: "Split rock",
        pot: "Not recorded",
        sheetId: 202_609_360,
        source: "Owner report",
        title: "P36 Split rock",
    },
];
const currentOptions = {
    additions: livingStoneAdditions,
    bulkStartColumn: 58,
    existingIds: currentIds,
};

describe("current 32-to-34 noncontiguous inventory enrollment", () => {
    it("restores captured native-table header formatting after extending rows", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = currentFixture();
        const quickLog = sheet("Quick log");
        const quickMetadata = required(
            metadata.sheets.find(
                (item) => item.properties.title === "Quick log"
            )
        );
        quickMetadata["tables"] = [{ name: "QuickCareLog" }];

        expect(() =>
            buildInventoryExpansion(metadata, [snapshot], currentOptions)
        ).toThrow("Missing Quick log header format snapshot");

        const formats = [
            { backgroundColorStyle: { rgbColor: { green: 0.5 } } },
            { textFormat: { bold: true, fontFamily: "JetBrains Mono" } },
        ];
        required(quickLog.data).push({
            rowData: [
                {
                    values: formats.map((userEnteredFormat) => ({
                        userEnteredFormat,
                        userEnteredValue: { stringValue: "Header" },
                    })),
                },
            ],
            startColumn: 13,
            startRow: 3,
        });
        const plan = buildInventoryExpansion(
            metadata,
            [snapshot],
            currentOptions
        );
        const restored = plan.postValueRequests;

        expect(restored).toStrictEqual(
            formats.map((userEnteredFormat, index) => ({
                updateCells: {
                    fields: "userEnteredFormat",
                    rows: [{ values: [{ userEnteredFormat }] }],
                    start: {
                        columnIndex: 13 + index,
                        rowIndex: 3,
                        sheetId: quickLog.properties.sheetId,
                    },
                },
            }))
        );
        expect(
            plan.prepareRequests.some((request) => "updateCells" in request)
        ).toBe(false);
    });

    it("appends two pot records and BG:BH without altering existing ledger or retired fields", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = currentFixture();
        const before = structuredClone({ metadata, snapshot });
        const plan = buildInventoryExpansion(
            metadata,
            [snapshot],
            currentOptions
        );

        expect({ metadata, snapshot }).toStrictEqual(before);
        expect(
            verifyInventoryExpansionPreconditions(plan, metadata, [snapshot])
        ).toBe(true);

        const forbidden = [
            "History",
            "App entries",
            "RO refills",
        ].map((title) => sheet(title).properties.sheetId);
        for (const request of plan.valueRequests)
            expect(forbidden).not.toContain(updateStart(request)["sheetId"]);
        const bulk = plan.valueRequests.filter(
            (request) =>
                updateStart(request)["sheetId"] ===
                sheet("App bulk").properties.sheetId
        );

        expect(
            bulk.map((request) => updateStart(request)["columnIndex"])
        ).toStrictEqual([58, 59]);
        expect(
            bulk.every((request) => updateStart(request)["rowIndex"] === 0)
        ).toBe(true);

        const rows = plan.valueRequests.filter(
            (request) =>
                updateStart(request)["sheetId"] ===
                    sheet("Plant tracker").properties.sheetId &&
                updateStart(request)["columnIndex"] === 0
        );

        expect([
            ...new Set(rows.map((request) => updateStart(request)["rowIndex"])),
        ]).toStrictEqual([33, 34]);
        expect(JSON.stringify(rows)).toContain("P35");
        expect(JSON.stringify(rows)).toContain("P36");

        const pages = plan.valueRequests.filter(
            (request) => updateStart(request)["sheetId"] === 202_609_350
        );

        expect(JSON.stringify(pages)).toContain("Baselines!C34");
        expect(JSON.stringify(pages)).toContain("Baselines!$D$34");
        expect(JSON.stringify(pages)).toContain(
            "'Watering intervals'!CU2:CU5000"
        );
        expect(JSON.stringify(pages)).not.toContain("CL2:CL5000");

        const dashboards = plan.valueRequests.filter(
            (request) =>
                updateStart(request)["sheetId"] ===
                sheet("Dashboard").properties.sheetId
        );

        expect(JSON.stringify(dashboards)).toContain("G39-H39");
        expect(JSON.stringify(dashboards)).toContain("'Plant tracker'!B34");
        expect(JSON.stringify(plan.chartRequests)).toContain(
            '"endRowIndex":35'
        );
        expect(JSON.stringify(plan.chartRequests)).toContain('"index":33');
        expect(JSON.stringify(plan.valueRequests)).toContain("Not recorded");

        const duplicates = plan.prepareRequests.filter(
            (request) => "duplicateSheet" in request
        );

        expect(duplicates).toHaveLength(2);
        expect(JSON.stringify(duplicates)).toContain('"insertSheetIndex":22');
    });

    it("rejects retired-ID reuse, incomplete ledgers, schema drift, replay, and occupied helper spills", () => {
        expect.hasAssertions();

        const original = currentFixture();

        expect(() =>
            buildInventoryExpansion(original.metadata, [original.snapshot], {
                ...currentOptions,
                additions: livingStoneAdditions.map((plant, index) => ({
                    ...plant,
                    id: index === 0 ? "P33" : plant.id,
                })),
            })
        ).toThrow("retired P33/P34");

        const incomplete = currentFixture();
        incomplete.sheet("History").data = [];

        expect(() =>
            buildInventoryExpansion(
                incomplete.metadata,
                [incomplete.snapshot],
                currentOptions
            )
        ).toThrow("Missing complete source rows");

        const headers = currentFixture();
        required(
            required(headers.sheet("App bulk").data?.[0]).rowData?.[0]?.values
        )[56] = { userEnteredValue: { stringValue: "Wrong identity" } };

        expect(() =>
            buildInventoryExpansion(
                headers.metadata,
                [headers.snapshot],
                currentOptions
            )
        ).toThrow("identity headers changed");

        const existingHistory = currentFixture();
        put(existingHistory.sheet("History"), 2, 1, "P35");

        expect(() =>
            buildInventoryExpansion(
                existingHistory.metadata,
                [existingHistory.snapshot],
                currentOptions
            )
        ).toThrow("New identity already appears in History");

        const occupied = currentFixture();
        put(occupied.sheet("Watering intervals"), 700, 98, 12);

        expect(() =>
            buildInventoryExpansion(
                occupied.metadata,
                [occupied.snapshot],
                currentOptions
            )
        ).toThrow("Occupied expansion destination");

        const replay = currentFixture();
        replay.metadata.sheets.push({
            properties: {
                gridProperties: { columnCount: 22, rowCount: 5139 },
                sheetId: 202_609_350,
                title: "P35 Already enrolled",
            },
        });

        expect(() =>
            buildInventoryExpansion(
                replay.metadata,
                [replay.snapshot],
                currentOptions
            )
        ).toThrow("already exists");
    });

    it("rejects later canonical data drift and compares current-size formula bounds without changing history limits", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = currentFixture();
        const plan = buildInventoryExpansion(
            metadata,
            [snapshot],
            currentOptions
        );
        put(sheet("History"), 50, 1, "P01");

        expect(() =>
            verifyInventoryExpansionPreconditions(plan, metadata, [snapshot])
        ).toThrow("source cells changed");
        expect(
            extendInventoryFormula(
                "=SUM(Baselines!A2:A33,Dashboard!A7:A38,History!A2:A5000,Other!A2:A33)",
                32
            )
        ).toBe(
            "=SUM(Baselines!A2:A35,Dashboard!A7:A40,History!A2:A5000,Other!A2:A33)"
        );
    });
});

describe("new current-roster page chart finalization", () => {
    it("keeps existing chart IDs and maps new interval charts to the appended helper columns", () => {
        expect.hasAssertions();

        const { metadata, sheet } = currentFixture();
        for (const [index, plant] of livingStoneAdditions.entries()) {
            const page = structuredClone(sheet("P30 Mixed succulent"));
            page.properties.sheetId = plant.sheetId;
            page.properties.title = plant.title;
            page.charts = (page.charts ?? []).map((chart, chartIndex) => ({
                ...chart,
                border: { colorStyle: { themeColor: "TEXT" } },
                chartId: 2000 + index * 4 + chartIndex,
                position: {
                    overlayPosition: {
                        anchorCell: { rowIndex: 110, sheetId: plant.sheetId },
                        widthPixels: 1285,
                    },
                },
                spec: {
                    ...chart.spec,
                    altText: "P30: completed intervals",
                    title:
                        chartIndex === 3
                            ? "Time between waterings"
                            : "P30 Weight",
                },
            }));
            metadata.sheets.push(page);
        }
        const before = structuredClone(metadata);
        const requests = finalizeInventoryPageCharts(
            metadata,
            livingStoneAdditions,
            32
        );

        expect(metadata).toStrictEqual(before);
        expect(requests).toHaveLength(10);
        expect(
            requests.filter((request) => "deleteEmbeddedObject" in request)
        ).toStrictEqual([
            { deleteEmbeddedObject: { objectId: 2003 } },
            { deleteEmbeddedObject: { objectId: 2007 } },
        ]);
        expect(
            requests.filter((request) => "addChart" in request)
        ).toMatchObject(
            livingStoneAdditions.map((plant, index) => ({
                addChart: {
                    chart: {
                        border: { colorStyle: { themeColor: "TEXT" } },
                        chartId: 2003 + index * 4,
                        position: {
                            overlayPosition: {
                                anchorCell: {
                                    rowIndex: 110,
                                    sheetId: plant.sheetId,
                                },
                                widthPixels: 1285,
                            },
                        },
                        spec: { altText: `${plant.id}: completed intervals` },
                    },
                },
            }))
        );
        expect(
            requests.filter((request) => "updateChartSpec" in request)
        ).toHaveLength(6);
        expect(JSON.stringify(requests)).toContain('"startColumnIndex":97');
        expect(JSON.stringify(requests)).toContain('"startColumnIndex":101');
        expect(JSON.stringify(requests)).not.toContain('"chartId":901');
        expect(JSON.stringify(requests)).not.toContain('"chartId":100');
    });
});

describe("complete source capture boundaries", () => {
    it("accepts contiguous History chunks but rejects a missing row", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = currentFixture();
        const history = sheet("History");
        const rows = required(required(history.data?.[0]).rowData);
        history.data = [
            { rowData: rows.slice(0, 2500), startColumn: 0, startRow: 0 },
            { rowData: rows.slice(2500), startColumn: 0, startRow: 2500 },
        ];
        const plan = buildInventoryExpansion(
            metadata,
            [snapshot],
            currentOptions
        );

        expect(
            verifyInventoryExpansionPreconditions(plan, metadata, [snapshot])
        ).toBe(true);

        required(history.data[1]).startRow = 2501;

        expect(() =>
            buildInventoryExpansion(metadata, [snapshot], currentOptions)
        ).toThrow("Missing complete source rows: History");
    });

    it("ignores recalculated display values but retains entered source drift detection", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = currentFixture();
        const plan = buildInventoryExpansion(
            metadata,
            [snapshot],
            currentOptions
        );
        const cell = required(
            required(sheet("History").data?.[0]).rowData?.[1]?.values?.[0]
        );
        cell.effectiveValue = { numberValue: 45_000 };
        Reflect.set(cell, "formattedValue", "a changed display string");

        expect(
            verifyInventoryExpansionPreconditions(plan, metadata, [snapshot])
        ).toBe(true);

        Reflect.set(cell, "note", "An entered evidence note changed");

        expect(() =>
            verifyInventoryExpansionPreconditions(plan, metadata, [snapshot])
        ).toThrow("source cells changed");
    });
});

describe("native selected-chart series capacity", () => {
    it("retains 34 primary curves, binds two guarded roles, and extends only captured local legacy bounds", () => {
        expect.hasAssertions();

        const { metadata, sheet, snapshot } = currentFixture();
        const charts = [];
        for (const [
            title,
            id,
            columns,
            firstColumn,
        ] of [
            [
                "Plant color data",
                907_202_603,
                141,
                7,
            ],
            [
                "Workbook analytics",
                907_202_608,
                106,
                10,
            ],
        ]) {
            const name = String(title);
            const target = sheet(name);
            target.properties.sheetId = Number(id);
            target.properties.gridProperties.columnCount = Number(columns);
            const meta = required(
                metadata.sheets.find((item) => item.properties.title === name)
            );
            meta.properties = structuredClone(target.properties);
            const isColor = name === "Plant color data";
            const raw = isColor ? "Dry-down insights" : "Workbook analytics";
            const sourceColumns = isColor ? ["AB", "AC"] : ["C", "D"];
            for (const [index, column] of sourceColumns.entries())
                put(
                    target,
                    1,
                    Number(firstColumn) + index + 1,
                    `=VSTACK(IF(ISNUMBER('${raw}'!${column}2:${column}5000),1,""),0)`
                );
            charts.push({
                chartId: isColor ? 7001 : 7002,
                spec: {
                    basicChart: {
                        series: Array.from({ length: 96 }, (_, index) => {
                            const column =
                                Number(firstColumn) +
                                Math.floor(index / 3) * (isColor ? 4 : 3) +
                                (index % 3);
                            return {
                                colorStyle: { rgbColor: { red: index / 100 } },
                                lineStyle: {
                                    type:
                                        index % 3 === 0
                                            ? "SOLID"
                                            : index % 3 === 1
                                              ? "DOTTED"
                                              : "MEDIUM_DASHED",
                                },
                                series: {
                                    sourceRange: {
                                        sources: [
                                            {
                                                endColumnIndex: column + 1,
                                                endRowIndex: 5001,
                                                sheetId: Number(id),
                                                startColumnIndex: column,
                                                startRowIndex: 0,
                                            },
                                        ],
                                    },
                                },
                                targetAxis: "LEFT_AXIS",
                            };
                        }),
                    },
                    title: name,
                },
            });
        }
        required(
            metadata.sheets.find((item) => item.properties.title === "Insights")
        ).charts = charts;
        const anchors = [
            [1, 25],
            [1, 27],
            [1, 28],
            [1, 30],
            ...[
                41,
                81,
                121,
                161,
                201,
                241,
                281,
                321,
            ].map((row) => [row, 0]),
        ];
        for (const [row, column] of anchors)
            put(
                sheet("Dry-down insights"),
                required(row),
                required(column),
                '=SUM($A$2:$A$31,History!A2:A5000,Other!A2:A31)+N("A2:A31")'
            );
        const plan = buildInventoryExpansion(
            metadata,
            [snapshot],
            currentOptions
        );
        for (const [index, id] of [7001, 7002].entries()) {
            const request = required(
                plan.chartRequests.find((item) =>
                    JSON.stringify(item).includes(`"chartId":${id}`)
                )
            );
            const update = request["updateChartSpec"];
            if (
                !isRecord(update) ||
                !isRecord(update["spec"]) ||
                !isRecord(update["spec"]["basicChart"])
            )
                throw new Error("Missing chart spec");
            const result = update["spec"]["basicChart"]["series"];
            if (!Array.isArray(result)) throw new Error("Missing series");

            expect(result).toHaveLength(36);
            expect(result.slice(0, 32)).toStrictEqual(
                required(charts[index]).spec.basicChart.series.filter(
                    (_, position) => position % 3 === 0
                )
            );
            expect(JSON.stringify(result.slice(34))).toContain(
                `"startColumnIndex":${index === 0 ? 149 : 112}`
            );
            expect(JSON.stringify(result.slice(34))).toContain("DOTTED");
            expect(JSON.stringify(result.slice(34))).toContain("MEDIUM_DASHED");
        }
        const text = JSON.stringify(plan.valueRequests);

        expect(text).toContain("'Dry-down insights'!AB2:AB5000");
        expect(text).not.toContain("'Insights data'!AB2:AB5000");
        expect(text).toContain("'Workbook analytics'!C2:C5000");
        expect(text).toContain("IFERROR(INDEX(FILTER(");
        expect(text).toContain("$A$2:$A$35,History!A2:A5000,Other!A2:A31");
        expect(text).toContain(String.raw`N(\"A2:A31\")`);

        const roleCell = required(
            required(
                sheet("Plant color data").data?.find(
                    (block) => block.startRow === 1 && block.startColumn === 8
                )
            ).rowData?.[0]?.values?.[0]
        );
        const originalRole = structuredClone(roleCell.userEnteredValue);
        roleCell.userEnteredValue = {
            formulaValue:
                "=VSTACK(IF(ISNUMBER('Insights data'!AB2:AB5000),1,\"\"),0)",
        };

        expect(() =>
            buildInventoryExpansion(metadata, [snapshot], currentOptions)
        ).toThrow("Selected-role source formula changed");

        roleCell.userEnteredValue = required(originalRole);
        put(sheet("Plant color data"), 0, 149, "Occupied");

        expect(() =>
            buildInventoryExpansion(metadata, [snapshot], currentOptions)
        ).toThrow("Occupied expansion destination");
    });
});
