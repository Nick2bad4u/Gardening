import { describe, expect, it } from "vitest";

import { buildIntegrityConditionRequests } from "../../scripts/google-sheets/integrity-condition.mjs";
import { required } from "../helpers/required.mjs";

const legacyPredicate = '((History!C2:C5000<>"Check")*(History!H2:H5000<>""))';
const repairedPredicate =
    '((History!C2:C5000<>"Check")*(History!C2:C5000<>"Inspect")*(History!H2:H5000<>"")*(History!AJ2:AJ5000<>"Removed"))';
const exceptionFormula =
    '=IFNA(FILTER({History!A2:A5000,History!B2:B5000,History!C2:C5000,History!I2:I5000,History!P2:P5000,History!AA2:AA5000,History!AF2:AF5000,History!AJ2:AJ5000},History!B2:B5000<>"",((History!AA2:AA5000="")+(History!P2:P5000="")+(History!AJ2:AJ5000="")+((History!C2:C5000="Repot")*(History!U2:U5000=""))+((History!C2:C5000<>"Check")*(History!H2:H5000<>""))+((History!C2:C5000="Weigh")*(History!E2:E5000=""))+((History!C2:C5000="Check")*(History!H2:H5000="")*(History!AG2:AG5000="")*(History!AJ2:AJ5000<>"Removed")))>0),"No critical source-integrity violations")';

/**
 * @param {import("../workbook-fixtures.d.ts").WorkbookSnapshot} snapshot
 * @param {string} sheet
 * @param {number} row
 * @param {number} column
 */
function cell(snapshot, sheet, row, column) {
    return required(
        snapshot.cells.find(
            (entry) =>
                entry.sheet === sheet &&
                entry.row === row &&
                entry.column === column
        )
    );
}

/**
 * @param {number} [headingRow]
 *
 * @returns {import("../workbook-fixtures.d.ts").WorkbookSnapshot}
 */
function fixture(headingRow = 57) {
    return {
        cells: [
            ...[
                [2, "Event"],
                [7, "Plant condition"],
                [35, "Record status"],
            ].map(([column, header]) => ({
                column: Number(column),
                row: 0,
                sheet: "History",
                value: { stringValue: String(header) },
            })),
            {
                column: 0,
                row: 8,
                sheet: "Integrity",
                value: { stringValue: "Medium leaked into plant condition" },
            },
            {
                column: 1,
                row: 8,
                sheet: "Integrity",
                value: {
                    formulaValue:
                        '=COUNTIFS(History!$C$2:$C$5000,"<>Check",History!$H$2:$H$5000,"<>")',
                },
            },
            {
                column: 2,
                row: 8,
                sheet: "Integrity",
                value: { formulaValue: '=IF(B9=0,"Pass","Fail")' },
            },
            {
                column: 0,
                row: headingRow,
                sheet: "Integrity",
                value: { stringValue: "Critical source-row exceptions" },
            },
            {
                column: 0,
                row: headingRow + 2,
                sheet: "Integrity",
                value: { formulaValue: exceptionFormula },
            },
        ],
        metadata: {
            sheets: [
                "History",
                "Integrity",
                "App entries",
                "Dashboard",
            ].map((title, sheetId) => ({
                properties: {
                    gridProperties: { columnCount: 45, rowCount: 5000 },
                    sheetId,
                    title,
                },
            })),
        },
    };
}

describe("integrity condition-event repair", () => {
    it("writes only the two Integrity formula cells and preserves its snapshot", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        const before = structuredClone(snapshot);
        const requests = buildIntegrityConditionRequests(snapshot);

        expect(snapshot).toStrictEqual(before);
        expect(requests).toHaveLength(2);
        expect(
            requests.map((request) => {
                expect(Object.keys(request)).toStrictEqual(["updateCells"]);

                const update = required(request.updateCells);

                expect(update.fields).toBe("userEnteredValue");
                expect(update.rows).toHaveLength(1);

                const values = required(update.rows[0]).values;

                expect(values).toHaveLength(1);
                expect(Object.keys(required(values[0]))).toStrictEqual([
                    "userEnteredValue",
                ]);
                expect(
                    Object.keys(required(values[0]).userEnteredValue)
                ).toStrictEqual(["formulaValue"]);

                return update.start;
            })
        ).toStrictEqual([
            { columnIndex: 1, rowIndex: 8, sheetId: 1 },
            { columnIndex: 0, rowIndex: 59, sheetId: 1 },
        ]);
    });

    it("exempts Inspect, legacy Check and Removed condition records in both rules", () => {
        expect.hasAssertions();

        const requests = buildIntegrityConditionRequests(fixture());
        const summary = required(
            required(required(requests[0]).updateCells).rows[0]
        ).values[0]?.userEnteredValue.formulaValue;
        const exceptions = required(
            required(required(requests[1]).updateCells).rows[0]
        ).values[0]?.userEnteredValue.formulaValue;

        expect(summary).toBe(
            '=SUMPRODUCT((History!$C$2:$C$5000<>"Check")*(History!$C$2:$C$5000<>"Inspect")*(History!$H$2:$H$5000<>"")*(History!$AJ$2:$AJ$5000<>"Removed"))'
        );
        expect(exceptions).toBe(
            exceptionFormula.replace(legacyPredicate, () => repairedPredicate)
        );
        expect(exceptions).toContain(
            '((History!C2:C5000="Check")*(History!H2:H5000="")*(History!AG2:AG5000="")*(History!AJ2:AJ5000<>"Removed"))'
        );
        expect(exceptions).toContain(
            '((History!C2:C5000="Repot")*(History!U2:U5000=""))'
        );
        expect(exceptions).toContain(
            '((History!C2:C5000="Weigh")*(History!E2:E5000=""))'
        );
        expect(exceptions).toContain(
            '(History!AA2:AA5000="")+(History!P2:P5000="")+(History!AJ2:AJ5000="")'
        );
        expect(exceptions).toMatch(/^=IFNA\(FILTER\(/v);
    });

    it("finds the exception formula after a moved roster heading", () => {
        expect.hasAssertions();

        const requests = buildIntegrityConditionRequests(fixture(81));

        expect(required(requests[1]).updateCells?.start).toStrictEqual({
            columnIndex: 0,
            rowIndex: 83,
            sheetId: 1,
        });
    });

    it("rejects replay after the returned formulas have been applied", () => {
        expect.hasAssertions();

        const snapshot = fixture();
        for (const request of buildIntegrityConditionRequests(snapshot)) {
            const update = required(request.updateCells);
            cell(
                snapshot,
                "Integrity",
                update.start.rowIndex,
                update.start.columnIndex
            ).value = structuredClone(
                required(required(update.rows[0]).values[0]).userEnteredValue
            );
        }

        expect(() => buildIntegrityConditionRequests(snapshot)).toThrow(
            "already installed"
        );
    });

    it.each(["History", "Integrity"])(
        "rejects missing %s metadata",
        (title) => {
            expect.hasAssertions();

            const snapshot = fixture();
            snapshot.metadata.sheets = snapshot.metadata.sheets.filter(
                (sheet) => sheet.properties.title !== title
            );

            expect(() => buildIntegrityConditionRequests(snapshot)).toThrow(
                "current History schema"
            );
        }
    );

    it.each(
        /** @type {const} */ ([
            ["rowCount", 4999],
            ["columnCount", 35],
        ])
    )("rejects insufficient History %s", (dimension, size) => {
        expect.hasAssertions();

        const snapshot = fixture();
        const grid = required(snapshot.metadata.sheets[0]).properties
            .gridProperties;
        grid[dimension] = size;

        expect(() => buildIntegrityConditionRequests(snapshot)).toThrow(
            "current History schema"
        );
    });

    it.each([
        2,
        7,
        35,
    ])("rejects History header drift in column %s", (column) => {
        expect.hasAssertions();

        const snapshot = fixture();
        cell(snapshot, "History", 0, column).value = {
            stringValue: "Unexpected header",
        };

        expect(() => buildIntegrityConditionRequests(snapshot)).toThrow(
            "History header changed"
        );
    });

    it.each([
        0,
        1,
        2,
    ])("rejects summary drift in column %s", (column) => {
        expect.hasAssertions();

        const snapshot = fixture();
        cell(snapshot, "Integrity", 8, column).value = {
            stringValue: "Changed",
        };

        expect(() => buildIntegrityConditionRequests(snapshot)).toThrow(
            "Integrity summary changed"
        );
    });

    it("rejects a missing or duplicate exception heading", () => {
        expect.hasAssertions();

        const missing = fixture();
        missing.cells = missing.cells.filter(
            (entry) =>
                entry.value.stringValue !== "Critical source-row exceptions"
        );

        expect(() => buildIntegrityConditionRequests(missing)).toThrow(
            "heading is missing or ambiguous"
        );

        const duplicate = fixture();
        duplicate.cells.push({
            ...structuredClone(cell(duplicate, "Integrity", 57, 0)),
            row: 90,
        });

        expect(() => buildIntegrityConditionRequests(duplicate)).toThrow(
            "heading is missing or ambiguous"
        );
    });

    it.each(["missing", "duplicate"])(
        "rejects a %s legacy condition predicate",
        (kind) => {
            expect.hasAssertions();

            const snapshot = fixture();
            cell(snapshot, "Integrity", 59, 0).value.formulaValue =
                exceptionFormula.replace(legacyPredicate, () =>
                    kind === "missing"
                        ? repairedPredicate
                        : `${legacyPredicate}+${legacyPredicate}`
                );

            expect(() => buildIntegrityConditionRequests(snapshot)).toThrow(
                "Integrity exception formula changed"
            );
        }
    );

    it("rejects a missing formula, changed fallback or out-of-bounds destination", () => {
        expect.hasAssertions();

        for (const formulaValue of [
            undefined,
            exceptionFormula.replace("=IFNA(", "=IFERROR("),
            exceptionFormula.replace(
                "No critical source-integrity violations",
                "OK"
            ),
        ]) {
            const snapshot = fixture();
            cell(snapshot, "Integrity", 59, 0).value =
                formulaValue === undefined ? {} : { formulaValue };

            expect(() => buildIntegrityConditionRequests(snapshot)).toThrow(
                "Integrity exception formula changed"
            );
        }

        expect(() => buildIntegrityConditionRequests(fixture(4998))).toThrow(
            "Integrity exception formula changed"
        );
    });
});
