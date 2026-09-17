import { describe, expect, it } from "vitest";

import {
    buildWateringCalendarRequests,
    plantEvidenceFormulas,
    roSummaryFormulas,
    wateringCalendarFormulas,
    wateringSummaryFormulas,
} from "../../scripts/google-sheets/workbook-analytics.mjs";

const clock = "'Workbook calculations'!$E$2";

/** @returns {import("../workbook-fixtures.d.ts").WorkbookSnapshot} */
function fixture() {
    return {
        cells: [
            [0, "Date"],
            [1, "Plant ID"],
            [2, "Event"],
            [16, "Nutrients used"],
            [35, "Record status"],
        ].map(([column, label]) => ({
            column: Number(column),
            row: 0,
            sheet: "History",
            value: { stringValue: String(label) },
        })),
        metadata: {
            sheets: [
                {
                    properties: {
                        gridProperties: { columnCount: 42, rowCount: 5000 },
                        sheetId: 1,
                        title: "History",
                    },
                },
            ],
        },
    };
}

describe("guarded watering calendar installation", () => {
    it("creates only a new derived, protected sheet and never writes canonical or existing tabs", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const requests = buildWateringCalendarRequests(snapshot, {
            clockReference: clock,
            sheetId: 2026,
        });

        expect(snapshot).toStrictEqual(before);
        expect(requests[0]).toMatchObject({
            addSheet: {
                properties: {
                    gridProperties: {
                        columnCount: 57,
                        frozenColumnCount: 1,
                        frozenRowCount: 4,
                    },
                    sheetId: 2026,
                    title: "Watering calendar",
                },
            },
        });
        expect(requests[1]).toMatchObject({
            addProtectedRange: {
                protectedRange: { range: { sheetId: 2026 }, warningOnly: true },
            },
        });
        expect(requests).toContainEqual({
            mergeCells: {
                mergeType: "MERGE_ALL",
                range: {
                    endColumnIndex: 4,
                    endRowIndex: 2,
                    sheetId: 2026,
                    startColumnIndex: 1,
                    startRowIndex: 1,
                },
            },
        });
        expect(requests).toContainEqual({
            repeatCell: {
                cell: { userEnteredFormat: { wrapStrategy: "WRAP" } },
                fields: "userEnteredFormat.wrapStrategy",
                range: {
                    endColumnIndex: 1,
                    endRowIndex: 2,
                    sheetId: 2026,
                    startColumnIndex: 0,
                    startRowIndex: 1,
                },
            },
        });
        expect(requests).toContainEqual({
            repeatCell: {
                cell: { userEnteredFormat: { textFormat: { fontSize: 9 } } },
                fields: "userEnteredFormat.textFormat.fontSize",
                range: {
                    endColumnIndex: 4,
                    endRowIndex: 2,
                    sheetId: 2026,
                    startColumnIndex: 1,
                    startRowIndex: 1,
                },
            },
        });
        expect(requests).toContainEqual({
            updateDimensionProperties: {
                fields: "pixelSize",
                properties: { pixelSize: 42 },
                range: {
                    dimension: "ROWS",
                    endIndex: 2,
                    sheetId: 2026,
                    startIndex: 1,
                },
            },
        });

        const serialized = JSON.stringify(requests);

        expect(serialized).not.toMatch(/"sheetId":1[,\}]/v);
        expect(serialized).toContain("JetBrains Mono");
        expect(serialized).not.toContain("delete");
    });

    it.each(["title", "id"])(
        "rejects an existing calendar by %s without a destructive replay",
        (collision) => {
            expect.hasAssertions();

            const snapshot = fixture();
            snapshot.metadata.sheets.push({
                properties: {
                    gridProperties: { columnCount: 57, rowCount: 40 },
                    sheetId: collision === "id" ? 2026 : 2027,
                    title:
                        collision === "title"
                            ? "Watering calendar"
                            : "Owner notes",
                },
            });

            expect(() =>
                buildWateringCalendarRequests(snapshot, {
                    clockReference: clock,
                    sheetId: 2026,
                })
            ).toThrow("already exists");
        }
    );

    it("rejects missing source headers and changed ledger dimensions", () => {
        expect.hasAssertions();

        const missing = fixture();
        missing.cells.pop();

        expect(() =>
            buildWateringCalendarRequests(missing, { clockReference: clock })
        ).toThrow("Record status");

        const resized = fixture();
        resized.metadata.sheets = [
            {
                properties: {
                    gridProperties: { columnCount: 42, rowCount: 6000 },
                    sheetId: 1,
                    title: "History",
                },
            },
        ];

        expect(() =>
            buildWateringCalendarRequests(resized, { clockReference: clock })
        ).toThrow("History contract");
    });

    it.each([
        -1,
        1.5,
        NaN,
        Infinity,
    ])("rejects invalid native sheet ID %s", (sheetId) => {
        expect.hasAssertions();
        expect(() =>
            buildWateringCalendarRequests(fixture(), {
                clockReference: clock,
                sheetId,
            })
        ).toThrow("nonnegative integer");
    });

    it.each([
        "NOW()",
        "'Workbook calculations'!E2+1",
        "History!A:A",
        "E2",
        "History!A0",
    ])(
        "rejects an executable or ambiguous clock input %s",
        (clockReference) => {
            expect.hasAssertions();
            expect(() => wateringCalendarFormulas(clockReference)).toThrow(
                "explicit sheet-qualified"
            );
            expect(() => plantEvidenceFormulas("P01", clockReference)).toThrow(
                "explicit sheet-qualified"
            );
        }
    );
});

describe("native derived formula contracts", () => {
    it("uses the correct helper triplet at both ends and never invents an empty interval", () => {
        expect.hasAssertions();

        const first = wateringSummaryFormulas("P01");
        const last = wateringSummaryFormulas("P30");

        expect(first.count).toBe("=COUNT('Watering intervals'!$C$2:$C$5000)");
        expect(last.count).toBe("=COUNT('Watering intervals'!$CL$2:$CL$5000)");

        for (const value of [
            first.latest,
            first.median,
            first.minimum,
            first.maximum,
        ]) {
            expect(value).toContain("ISNUMBER(");
            expect(value).toContain('),"")');
        }

        expect(() => wateringSummaryFormulas("P31")).toThrow("Unknown plant");
        expect(() => plantEvidenceFormulas('P01"')).toThrow("Unknown plant");
    });

    it("retains active-observation provenance and guards future evidence with the shared clock", () => {
        expect.hasAssertions();

        const formulas = plantEvidenceFormulas("P01", clock);
        for (const formula of Object.values(formulas)) {
            expect(formula).toContain('History!$AJ$2:$AJ$5000<>"Removed"');
            expect(formula).toContain(`History!$A$2:$A$5000<=${clock}`);
            expect(formula).not.toMatch(/(?:NOW|TODAY)\(/v);
        }

        expect(formulas.photoLink).toContain(
            'HYPERLINK(url,"Open latest photo")'
        );
        expect(formulas.conditionEvidence).toContain(
            '="Photo","Photo-only observation"'
        );
        expect(formulas.conditionEvidence).toContain("History!$AC$2:$AC$5000");
        expect(formulas.conditionEvidence).toContain("History!$AI$2:$AI$5000");
        expect(formulas.conditionNotes).toContain("History!$I$2:$I$5000");
        expect(formulas.conditionEvidence).not.toContain("Physical inspection");
    });

    it("keeps unknown doses and nutrients unknown and counts only explicit plain Water after feeding", () => {
        expect.hasAssertions();

        const formulas = plantEvidenceFormulas("P01");

        expect(formulas.feedDose).toContain(
            'IF(History!$S$2:$S$5000="","Unknown",History!$S$2:$S$5000)'
        );
        expect(formulas.feedProduct).toContain('History!$Q$2:$Q$5000="Yes"');
        expect(formulas.plainWaterEventsSinceFeed).toContain(
            'History!$Q$2:$Q$5000="No"'
        );
        expect(formulas.plainWaterEventsSinceFeed).toContain(
            'History!$C$2:$C$5000="Water"'
        );
        expect(formulas.plainWaterEventsSinceFeed).toContain(
            "History!$A$2:$A$5000>lastDate"
        );
        expect(formulas.plainWaterEventsSinceFeed).toContain(")),0)))");
    });

    it("labels explicitly recorded photo-only Check notes without making generic checks physical", () => {
        expect.hasAssertions();

        const { conditionEvidence } = plantEvidenceFormulas("P01", clock);

        expect(conditionEvidence).toContain(
            'IF(History!$C$2:$C$5000="Photo","Photo-only observation",IF((History!$C$2:$C$5000="Check")*REGEXMATCH(History!$I$2:$I$5000&"","(?i)photo[- ]only"),"Photo-only Check record",History!$C$2:$C$5000&" record"))'
        );
        expect(conditionEvidence).toContain("History!$AC$2:$AC$5000");
        expect(conditionEvidence).toContain("History!$AI$2:$AI$5000");
        expect(conditionEvidence).not.toContain("Physical");
    });

    it("does not order same-time plain water by physical correction-append position", () => {
        expect.hasAssertions();

        const formulas = plantEvidenceFormulas("P01", clock);

        expect(formulas.plainWaterEventsSinceFeed).toContain(
            "lastDate,IFNA(MAX(FILTER(History!$A$2:$A$5000"
        );
        expect(formulas.plainWaterEventsSinceFeed).toContain(
            'History!$Q$2:$Q$5000="No",History!$A$2:$A$5000>lastDate'
        );
        expect(formulas.plainWaterEventsSinceFeed).not.toContain("ROW(");
        expect(formulas.plainWaterEventsSinceFeed).not.toContain("=lastDate");
        expect(formulas.feedProduct).toContain("ROW(History!$A$2:$A$5000)");
        expect(formulas.feedProduct).toContain("1,FALSE,2,FALSE");
    });

    it("keeps the missing feed anchor blank before counting zero later events", () => {
        expect.hasAssertions();

        const { plainWaterEventsSinceFeed } = plantEvidenceFormulas(
            "P30",
            clock
        );

        expect(plainWaterEventsSinceFeed).toContain(
            'History!$Q$2:$Q$5000="Yes")),""),IF(lastDate="","",IFNA(ROWS('
        );
        expect(plainWaterEventsSinceFeed).toContain(
            "History!$A$2:$A$5000>lastDate)),0)))"
        );
        expect(plainWaterEventsSinceFeed).not.toMatch(/^=IFNA\(LET/v);
    });

    it("filters each plant once for 56 dates and distinguishes mixed same-day nutrient classes", () => {
        expect.hasAssertions();

        const calendar = wateringCalendarFormulas(clock);

        expect(calendar.plantRows).toHaveLength(30);
        expect(calendar.dates).toBe(`=SEQUENCE(1,56,INT(${clock})-55,1)`);
        expect(calendar.plantRows.map(({ plantId }) => plantId)).toStrictEqual(
            Array.from(
                { length: 30 },
                (_, index) => `P${String(index + 1).padStart(2, "0")}`
            )
        );

        for (const { formula } of calendar.plantRows) {
            expect(formula.match(/FILTER\(\{History/gv)).toHaveLength(1);
            expect(formula).toContain('N((flags<>"Yes")*(flags<>"No"))');
            expect(formula).toContain(
                '(N(fed>0)+N(plain>0)+N(unknown>0))>1,"Mixed"'
            );
            expect(formula).toContain('"__NO_WATER__",""');
            expect(formula).toContain('"Plain","Unknown"');
        }
    });

    it("uses positive recorded partial fills, keeps missing empty dates unknown, and sums visit totals", () => {
        expect.hasAssertions();

        const summary = roSummaryFormulas();

        expect(summary.containers).toHaveLength(4);

        for (const [index, entry] of summary.containers.entries()) {
            const column =
                [
                    "B",
                    "D",
                    "F",
                    "H",
                ][index] ?? "";

            expect(entry.lastFillGallons).toContain(
                `'RO refills'!$${column}$20:$${column}$1000>0`
            );
            expect(entry.status).toContain('"Not marked empty"');
            expect(entry.status).toContain('"No recorded fill"');
            expect(entry.status).not.toContain("remaining");
            expect(entry.emptyDate).toContain("ARRAYFORMULA(IF(");
        }

        expect(summary.latestVisitGallons).toContain(
            "SUM(FILTER('RO refills'!$J$20:$J$1000"
        );
        expect(summary.latestVisitGallons).toContain('IF(lastDate="","",');
    });
});
