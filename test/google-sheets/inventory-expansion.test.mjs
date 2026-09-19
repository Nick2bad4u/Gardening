import { describe, expect, it } from "vitest";

import {
    buildInventoryExpansion,
    extendInventoryFormula,
    finalizeInventoryPageCharts,
    inventoryAdditions,
    shiftInventoryRow,
    verifyInventoryExpansionPreconditions,
} from "../../scripts/google-sheets/inventory-expansion.mjs";
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
