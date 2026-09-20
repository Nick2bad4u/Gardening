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
        expect(
            plan.prepareRequests
                .slice(firstCopy)
                .every((request) => request["copyPaste"] !== undefined)
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
