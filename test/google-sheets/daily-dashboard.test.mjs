import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

import {
    dailyRuleBuilder,
    dailySheet,
} from "../helpers/daily-dashboard-native.mjs";
import { required } from "../helpers/required.mjs";

const sourceUrl = new URL(
    "../../scripts/google-sheets/plant-tracker.gs",
    import.meta.url
);
const source = fs.readFileSync(sourceUrl, "utf8");

/**
 * Validate this isolated VM adapter without touching the shared API registry.
 *
 * @param {unknown} value
 *
 * @returns {import("../daily-dashboard-fixtures.d.ts").DailyApi}
 */
function dailyApi(value) {
    if (typeof value !== "object" || value === null)
        throw new TypeError("Missing daily API");
    for (const name of [
        "dailyCareErrorScanFormula_",
        "dailyCareIndicatorFormula_",
        "dailyCareRow_",
        "dailyCareTestHeaders_",
        "dailyCareWeightFormula_",
        "installDailyCareDashboard",
    ]) {
        if (typeof Reflect.get(value, name) !== "function")
            throw new TypeError(`Missing daily function ${name}`);
    }
    return /** @type {import("../daily-dashboard-fixtures.d.ts").DailyApi} */ (
        value
    );
}

const errorScan =
    "=SUM(ARRAYFORMULA(N(ISERROR(History!A2:AP5000))),ARRAYFORMULA(N(ISERROR(Dashboard!A1:X254))),ARRAYFORMULA(N(ISERROR(Baselines!A2:AJ1000))))";

function fixture(
    ids = [
        "P01",
        "P29",
        "P30",
        "P31",
    ]
) {
    const sheets = new Map(
        [
            "Dashboard",
            "Plant tracker",
            "Baselines",
            "Integrity",
            "History",
            ...ids,
        ].map((name, index) => [name, dailySheet(name, index + 1)])
    );
    /** @param {string} name */
    const sheet = (name) => required(sheets.get(name));
    const spreadsheet = {
        getSheetByName: (/** @type {string} */ name) =>
            sheets.get(name)?.api ?? null,
        getSheets: () =>
            sheets
                .values()
                .map((item) => item.api)
                .toArray(),
        insertSheet: (/** @type {string} */ name) => {
            if (sheets.has(name)) throw new Error("Duplicate native sheet");
            const item = dailySheet(name, 100);
            item.state.rows = 10;
            item.state.columns = 8;
            sheets.set(name, item);
            return item.api;
        },
    };
    const context = vm.createContext({
        Session: { getEffectiveUser: () => "owner" },
        SpreadsheetApp: {
            flush: () => {},
            newConditionalFormatRule: dailyRuleBuilder,
            openById: () => spreadsheet,
            ProtectionType: { SHEET: "SHEET" },
        },
    });
    vm.runInContext(source, context, { filename: fileURLToPath(sourceUrl) });
    vm.runInContext(
        "function dailyCareTestHeaders_() { return { baseline: [...BASELINE_VIEW_HEADERS], dashboard: [...DASHBOARD_VIEW_HEADERS] }; }",
        context
    );
    const api = dailyApi(context);
    const headers = api.dailyCareTestHeaders_();
    const dashboard = sheet("Dashboard");
    dashboard.api.getRange(6, 1, 1, 24).setValues([headers.dashboard]);
    dashboard.api.getRange(1, 1).setValue("Garden Dashboard · existing title");
    dashboard.api.getRange(1, 1, 1, 24).merge();
    dashboard.api.getRange(2, 3, 1, 2).merge().setValue("Logs this month");
    dashboard.api
        .getRange(3, 3, 1, 2)
        .merge()
        .setFormula("=COUNTA(History!A2:A5000)");
    dashboard.api
        .getRange(7, 1, ids.length, 24)
        .setValues(
            ids.map((id) =>
                Array.from({ length: 24 }, (_, index) =>
                    index === 1 ? id : `=EXISTING_${index}()`
                )
            )
        );
    dashboard.api
        .getRange(6, 1, ids.length + 1, 24)
        .createFilter()
        .setColumnFilterCriteria(3, "owner filter");
    dashboard.api.setColumnWidth(3, 297);
    dashboard.api.getRange(7, 7).setNumberFormat("0.000");
    dashboard.state.rules = [
        dailyRuleBuilder()
            .setRanges([dashboard.api.getRange("G7:G10")])
            .whenFormulaSatisfied("=G7>0")
            .build(),
    ];
    dashboard.state.frozenRows = 6;
    const tracker = sheet("Plant tracker");
    tracker.api
        .getRange(1, 1, 1, 2)
        .setValues([["Plant ID", "Plant / planter"]]);
    tracker.api.getRange(1, 15).setValue("Current pot label");
    const baseline = sheet("Baselines");
    baseline.api
        .getRange(1, 1, 1, headers.baseline.length)
        .setValues([headers.baseline]);
    const integrity = sheet("Integrity");
    integrity.state.hidden = true;
    integrity.api.getRange(4, 1, 1, 4).setValues([
        [
            "Check",
            "Count",
            "Status",
            "What it means",
        ],
    ]);
    integrity.api.getRange(23, 1, 1, 6).setValues([
        [
            "Plant ID",
            "Plant",
            "Quality summary",
            "Priority",
            "Evidence",
            "Recommended action",
        ],
    ]);
    for (let index = 0; index < 17; index++) {
        const row = index + 5;
        integrity.api.getRange(row, 1, 1, 4).setValues([
            [
                `Existing check ${index}`,
                row === 12 ? errorScan : "=0",
                '=IF(TRUE,"Pass","Fail")',
                "Existing explanation",
            ],
        ]);
        integrity.state.calculated.set(`B${row}`, row === 13 ? 1 : 0);
        integrity.state.calculated.set(`C${row}`, "Pass");
    }
    for (const [index, id] of ids.entries()) {
        tracker.api
            .getRange(index + 2, 1, 1, 2)
            .setValues([[id, `Plant ${id}`]]);
        tracker.api.getRange(index + 2, 15).setValue(`#${index}`);
        baseline.api.getRange(index + 2, 1).setValue(id);
        integrity.api.getRange(index + 24, 1, 1, 6).setValues([
            [
                id,
                `Plant ${id}`,
                "No current flags",
                "OK",
                "Evidence",
                "",
            ],
        ]);
    }
    const history = sheet("History");
    for (const [column, header] of /** @type {[number, string][]} */ ([
        [1, "Date"],
        [2, "Plant ID"],
        [3, "Event"],
        [5, "Weight (g)"],
        [10, "Recorded"],
        [11, "Pot setup"],
        [29, "Observation quality"],
        [35, "Measurement method"],
        [36, "Record status"],
        [42, "Water amount (mL)"],
    ]))
        history.api.getRange(1, column).setValue(header);
    history.api.getRange(2, 1, 1, 5).setValues([
        [
            46_000,
            "P01",
            "Weigh",
            "Routine",
            432.1,
        ],
    ]);
    for (const item of sheets.values()) item.state.writes.length = 0;
    return { api, sheet, sheets };
}

describe("scoped daily Dashboard presentation", () => {
    it("preserves the complete Dashboard and source data while installing native presentation", () => {
        expect.hasAssertions();

        const { api, sheet } = fixture();
        const dashboard = sheet("Dashboard");
        const cells = new Map(dashboard.state.cells);
        const filter = dashboard.state.filter;
        const styles = new Map(dashboard.state.styles);
        const history = new Map(sheet("History").state.cells);
        const result = api.installDailyCareDashboard();

        expect(result).toMatchObject({
            dashboardFrozenColumns: 3,
            historyChanged: false,
            mainRange: "Daily care!A6:H10",
            plants: 4,
            sheet: "Daily care",
        });

        for (const [key, value] of cells)
            expect(dashboard.state.cells.get(key), key).toBe(value);
        for (const [key, value] of styles)
            expect(dashboard.state.styles.get(key), key).toBe(value);

        expect(dashboard.state.filter).toBe(filter);
        expect(dashboard.state.widths).toStrictEqual(new Map([[3, 297]]));
        expect(dashboard.state.frozenRows).toBe(6);
        expect(dashboard.state.frozenColumns).toBe(3);
        expect(dashboard.state.rules[0]?.formula).toBe("=G7>0");
        expect(sheet("History").state.cells).toStrictEqual(history);
        expect(sheet("Integrity").state.hidden).toBe(true);
        expect(sheet("Integrity").state.writes).toStrictEqual(["value:B12"]);
        expect(sheet("Baselines").state.writes).toStrictEqual([]);

        const daily = sheet("Daily care");

        expect(daily.state).toMatchObject({
            columns: 8,
            frozenColumns: 3,
            frozenRows: 6,
            gridlinesHidden: true,
            hidden: false,
            protected: true,
            protectionEditors: ["owner"],
            protectionWarning: false,
        });
        expect(daily.state.filter?.range).toBe("A6:H10");
        expect(daily.state.styles.get("D7:D10:format")).toBe("0.0");
        expect(daily.state.styles.get("E7:E10:format")).toBe(
            "mmm d, yyyy h:mm am/pm"
        );
        expect(daily.state.styles.get("F7:F10:format")).toBe("+0.0;-0.0;0.0");
        expect(daily.state.cells.get("B10")).toContain('XLOOKUP("P31",');
        expect(daily.state.cells.get("C10")).toContain(
            "XLOOKUP($B10,'Plant tracker'!$A$2:$A$5,'Plant tracker'!$B$2:$B$5"
        );
        expect(daily.state.cells.get("D10")).toContain("$B10");
    });

    it("is idempotent and retains daily filter criteria without duplicate rules or protection", () => {
        expect.hasAssertions();

        const { api, sheet, sheets } = fixture();
        const first = api.installDailyCareDashboard();
        const daily = sheet("Daily care");
        daily.state.filter?.setColumnFilterCriteria(8, "follow-ups only");
        const cells = new Map(daily.state.cells);
        const scan = sheet("Integrity").state.cells.get("B12");

        expect(api.installDailyCareDashboard()).toStrictEqual(first);
        expect(sheets.size).toBe(10);
        expect(daily.state.cells).toStrictEqual(cells);
        expect(daily.state.filter?.criteria.get(8)).toBe("follow-ups only");
        expect(daily.state.rules).toHaveLength(4);
        expect(sheet("Dashboard").state.rules).toHaveLength(5);
        expect(sheet("Integrity").state.cells.get("B12")).toBe(scan);
    });

    it("uses the full current inventory and refreshes helper bounds after an addition", () => {
        expect.hasAssertions();

        const { api, sheet, sheets } = fixture(["P01"]);
        api.installDailyCareDashboard();
        sheet("Plant tracker")
            .api.getRange(3, 1, 1, 2)
            .setValues([["P42", "New plant"]]);
        sheet("Baselines").api.getRange(3, 1).setValue("P42");
        sheet("Integrity").api.getRange(25, 1).setValue("P42");
        sheets.set("P42", dailySheet("P42", 42));

        expect(api.installDailyCareDashboard()).toMatchObject({
            checksRange: "Daily care!A11:H28",
            mainRange: "Daily care!A6:H8",
            plants: 2,
        });
        expect(sheet("Daily care").state.cells.get("A8")).toContain("#gid=42");
        expect(sheet("Daily care").state.cells.get("H8")).toContain(
            "Integrity!$A$24:$A$25"
        );
        expect(sheet("Dashboard").state.cells.get("U3")).toContain("range=A11");
    });

    it.each([
        "Dashboard",
        "History",
        "Integrity",
        "Baselines",
        "Plant tracker",
    ])("refuses a missing %s source before writes", (missing) => {
        expect.hasAssertions();

        const { api, sheets } = fixture();
        sheets.delete(missing);

        expect(() => api.installDailyCareDashboard()).toThrow(
            /(?:Baselines|Daily care|Dashboard|History|Integrity|Plant tracker|Sheet|plant ID)/v
        );
        expect(
            sheets
                .values()
                .flatMap((item) => item.state.writes)
                .toArray()
        ).toStrictEqual([]);
        expect(sheets.has("Daily care")).toBe(false);
    });

    it.each([
        [
            "Dashboard",
            "X6",
            "Unexpected",
        ],
        [
            "History",
            "AP1",
            "Unexpected",
        ],
        [
            "Baselines",
            "W1",
            "Wrong dry",
        ],
        [
            "Plant tracker",
            "O1",
            "Old label",
        ],
        [
            "Integrity",
            "F23",
            "Notes",
        ],
        [
            "Integrity",
            "B12",
            "=0",
        ],
        [
            "Plant tracker",
            "A2",
            "PXX",
        ],
        [
            "Plant tracker",
            "A3",
            "P01",
        ],
        [
            "Baselines",
            "A2",
            "P99",
        ],
        [
            "Integrity",
            "A24",
            "P99",
        ],
    ])(
        "refuses malformed %s!%s without any partial installation",
        (name, cell, value) => {
            expect.hasAssertions();

            const { api, sheet, sheets } = fixture();
            sheet(name).state.cells.set(cell, value);

            expect(() => api.installDailyCareDashboard()).toThrow(
                /(?:Baselines|Daily care|Dashboard|History|Integrity|Plant tracker|Sheet|plant ID)/v
            );
            expect(
                sheets
                    .values()
                    .flatMap((item) => item.state.writes)
                    .toArray()
            ).toStrictEqual([]);
        }
    );

    it.each([
        "text",
        "empty-formula",
        "merge",
        "daily-content",
        "daily-chart",
    ])("refuses unrelated occupied destinations: %s", (kind) => {
        expect.hasAssertions();

        const { api, sheet, sheets } = fixture();
        occupyDestination({ api, sheet, sheets }, kind);
        for (const item of sheets.values()) item.state.writes.length = 0;

        expect(() => api.installDailyCareDashboard()).toThrow(
            /(?:Baselines|Daily care|Dashboard|History|Integrity|Plant tracker|Sheet|plant ID)/v
        );
        expect(
            sheets
                .values()
                .flatMap((item) => item.state.writes)
                .toArray()
        ).toStrictEqual([]);
    });

    it.each([
        "Unknown",
        "#REF!",
        "",
    ])("refuses malformed Integrity status %s", (status) => {
        expect.hasAssertions();

        const { api, sheet } = fixture();
        sheet("Integrity").state.calculated.set("C5", status);

        expect(() => api.installDailyCareDashboard()).toThrow(
            "maintained numeric checks"
        );
        expect(sheet("Dashboard").state.writes).toStrictEqual([]);
    });

    it("separates failures from legitimate actions and informational records", () => {
        expect.hasAssertions();

        const { api, sheet } = fixture();
        sheet("Integrity").state.calculated.set("C15", "Action");
        sheet("Integrity").state.calculated.set("B15", 2);
        sheet("Integrity").state.calculated.set("C18", "Info");
        sheet("Integrity").state.calculated.set("B18", 1);
        api.installDailyCareDashboard();
        const data = sheet("Dashboard").api.getRange("U3").getFormula();
        const observations = sheet("Dashboard").api.getRange("W3").getFormula();

        expect(data).toContain('COUNTIF(Integrity!$C$5:$C$21,"Fail")');
        expect(data).toContain("0 · Healthy");
        expect(data).not.toContain("$B$5");
        expect(observations).toContain(
            'COUNTIF(Integrity!$C$5:$C$21,"Action")'
        );
        expect(observations).toContain("0 · None outstanding");
        expect(data).toContain("Checks unavailable");
        expect(data).toContain("=ROWS(Integrity!$C$5:$C$21)");
        expect(sheet("Daily care").state.cells.get("A14")).toBe(
            '=IF(Integrity!A5="","",Integrity!A5)'
        );
    });

    it("bounds real weight/date formulas and guards missing or benign results", () => {
        expect.hasAssertions();

        const { api } = fixture();
        const bounds = {
            baseline: 42,
            history: 5000,
            integrity: 64,
            tracker: 42,
        };
        const formula = api.dailyCareWeightFormula_(7, bounds);
        for (const criterion of [
            'EXACT(TRIM(History!$C$2:$C$5000),"Weigh")',
            'EXACT(TRIM(states),"Removed")=FALSE',
            "ISNUMBER(INDEX(records,0,1))",
            "INDEX(records,0,1)>0",
            "ISNUMBER(INDEX(records,0,2))",
            "INDEX(records,0,2)<=NOW()",
            "COUNTIF(identities,parents)=1",
            "COUNTIF(identities,identities)=1",
            'IFNA(XLOOKUP(parents,identities,states),"")="Removed"',
            "History!$K$2:$K$5000=setup",
            '"(?i)estimat"',
            "2,FALSE,3,FALSE,4,FALSE",
            'HSTACK(INDEX(readings,1,1),INDEX(readings,1,2))),{"",""})',
        ])
            expect(formula).toContain(criterion);

        expect(formula).not.toMatch(/\$[A-Z]+:\$[A-Z]+/v);

        const row = api.dailyCareRow_({ id: "P09", pageId: 20 }, 7, bounds);

        expect(row[4]).toBe("");
        expect(row[5]).toContain("Baselines!$W$2:$W$42");
        expect(row[5]).toContain(
            'IF(AND(ISNUMBER(D7),D7>0,ISNUMBER(dry),dry>0),D7-dry,"")'
        );
        expect(row[6]).toContain("No reweigh window yet");
        expect(row[7]).toContain('priority="No current flags"');
        expect(row[7]).toContain('priority="Info"');
        expect(row[7]).toContain("No follow-up recorded");
        expect(row[7]).toContain("Review plant checks");
    });

    it("removes exactly the new Dashboard KPI dependency from the existing error scan", () => {
        expect.hasAssertions();

        const { api } = fixture();
        const formula = api.dailyCareErrorScanFormula_(errorScan);

        expect(formula).toContain("History!A2:AP5000");
        expect(formula).toContain("Baselines!A2:AJ1000");
        expect(formula).toContain("Dashboard!A1:T254");
        expect(formula).toContain("Dashboard!U1:X1");
        expect(formula).toContain("Dashboard!U4:X254");
        expect(formula).not.toContain("Dashboard!A1:X254");
        expect(api.dailyCareErrorScanFormula_(formula)).toBe(formula);
        expect(() =>
            api.dailyCareErrorScanFormula_("=SUM(Dashboard!A1:X254)")
        ).toThrow("Unexpected Integrity");
    });

    it("preserves the installed audit's reserved Y:Z coverage when excluding KPI cells", () => {
        expect.hasAssertions();

        const { api } = fixture();
        const existing = errorScan.replace(
            "Dashboard!A1:X254",
            "'Dashboard'!$A$1:$Z$254"
        );
        const formula = api.dailyCareErrorScanFormula_(existing);

        expect(formula).toBe(
            existing.replace(
                "ARRAYFORMULA(N(ISERROR('Dashboard'!$A$1:$Z$254)))",
                "ARRAYFORMULA(N(ISERROR(Dashboard!A1:T254))),ARRAYFORMULA(N(ISERROR(Dashboard!U1:X1))),ARRAYFORMULA(N(ISERROR(Dashboard!U4:X254))),ARRAYFORMULA(IFERROR(N(ISERROR(Dashboard!Y1:Z254)),0))"
            )
        );
        expect(api.dailyCareErrorScanFormula_(formula)).toBe(formula);
        expect(() =>
            api.dailyCareErrorScanFormula_(
                formula.replace("Y1:Z254", "Y1:Z255")
            )
        ).toThrow("Unexpected Integrity");
    });

    it("counts a failed zero-count witness check and colors actions separately", () => {
        expect.hasAssertions();

        const { api, sheet } = fixture();
        sheet("Integrity").state.calculated.set("B13", 0);
        sheet("Integrity").state.calculated.set("C13", "Fail");
        sheet("Integrity").state.calculated.set("C15", "Action");
        api.installDailyCareDashboard();

        const rules = sheet("Daily care").state.rules;

        expect(sheet("Daily care").api.getRange("A3").getFormula()).toContain(
            'COUNTIF(Integrity!$C$5:$C$21,"Fail")&" failed check"&IF(COUNTIF(Integrity!$C$5:$C$21,"Fail")=1,"","s")'
        );
        expect(rules.map((rule) => rule.background)).toStrictEqual([
            "#edf4ee",
            "#f8d4d4",
            "#edf4ee",
            "#fff0c7",
        ]);
        expect(rules[0]?.formula).toContain(
            '=ROWS(INDIRECT("Integrity!C5:C21"))'
        );
    });

    it.each([
        "foreign-protection",
        "inaccessible-protection",
        "extra-column",
        "bad-anchor",
    ])("refuses an unsafe managed destination: %s", (kind) => {
        expect.hasAssertions();

        const context = fixture();
        context.api.installDailyCareDashboard();
        damageDailyDestination(context.sheet("Daily care"), kind);
        for (const item of context.sheets.values())
            item.state.writes.length = 0;

        expect(() => context.api.installDailyCareDashboard()).toThrow(
            /Daily care/v
        );
        expect(
            context.sheets
                .values()
                .flatMap((item) => item.state.writes)
                .toArray()
        ).toStrictEqual([]);
    });

    it.each([
        "",
        -1,
        NaN,
    ])("refuses malformed Integrity count %s", (count) => {
        expect.hasAssertions();

        const { api, sheet } = fixture();
        sheet("Integrity").state.calculated.set("B5", count);

        expect(() => api.installDailyCareDashboard()).toThrow(
            "maintained numeric checks"
        );
        expect(sheet("Dashboard").state.writes).toStrictEqual([]);
    });

    it("accepts an existing empty native sheet and a missing-observation History", () => {
        expect.hasAssertions();

        const { api, sheet, sheets } = fixture(["P01"]);
        const daily = dailySheet("Daily care", 100);
        daily.state.columns = 5;
        daily.state.rows = 6;
        sheet("History").api.getRange("A2:E2").clearContent();
        sheets.set("Daily care", daily);

        expect(api.installDailyCareDashboard()).toMatchObject({
            plants: 1,
            sheetId: 100,
        });
        expect(daily.state.columns).toBe(8);
        expect(daily.state.rows).toBe(27);
        expect(daily.api.getRange("D7").getFormula()).toContain('{"",""}');
    });

    it("refuses a scan with any additional Dashboard dependency", () => {
        expect.hasAssertions();

        const { api } = fixture();
        const safe = api.dailyCareErrorScanFormula_(errorScan);

        expect(() =>
            api.dailyCareErrorScanFormula_(`${errorScan}+Dashboard!U3`)
        ).toThrow("Unexpected Integrity");
        expect(() =>
            api.dailyCareErrorScanFormula_(`${safe}+Dashboard!U3`)
        ).toThrow("Unexpected Integrity");
    });
});

/**
 * @param {{
 *     state: {
 *         cells: Map<
 *             string,
 *             import("../daily-dashboard-fixtures.d.ts").DailyCell
 *         >;
 *         columns: number;
 *         notes: Map<string, string>;
 *         protectionDescription: string;
 *         protectionEditable: boolean;
 *     };
 * }} daily
 * @param {string} kind
 */
function damageDailyDestination(daily, kind) {
    switch (kind) {
        case "extra-column": {
            daily.state.columns = 9;
            daily.state.cells.set("I10", "Owner data");
            break;
        }
        case "foreign-protection": {
            daily.state.protectionDescription = "Owner protection";
            break;
        }
        case "inaccessible-protection": {
            daily.state.protectionEditable = false;
            break;
        }
        default: {
            daily.state.notes.delete("A2");
        }
    }
}

/** @param {ReturnType<typeof fixture>} context @param {string} kind */
function occupyDestination({ sheet, sheets }, kind) {
    switch (kind) {
        case "empty-formula": {
            sheet("Dashboard").state.cells.set("U3", '=IF(TRUE,"",1)');
            break;
        }
        case "merge": {
            sheet("Dashboard").api.getRange("C8:E8").merge();
            break;
        }
        case "text": {
            sheet("Dashboard").state.cells.set("W2", "Owner notes");
            break;
        }
        default: {
            const daily = dailySheet("Daily care", 100);
            if (kind === "daily-content")
                daily.state.cells.set("H20", "Owner's worksheet");
            else daily.state.charts = 1;
            sheets.set("Daily care", daily);
        }
    }
}
