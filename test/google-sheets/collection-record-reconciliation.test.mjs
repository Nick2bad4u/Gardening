import { describe, expect, it } from "vitest";

import {
    assertCollectionRecordReconciliationPreconditions,
    buildCollectionRecordReconciliationPlan,
} from "../../scripts/google-sheets/collection-record-reconciliation.mjs";
import { required } from "../helpers/required.mjs";

/**
 * @param {ReturnType<typeof fixture>["snapshot"]} snapshot @param {number}
 *   sheet @param {number} row @param {number} column
 */
function cell(snapshot, sheet, row, column) {
    const result =
        snapshot.sheets[sheet]?.data?.[0]?.rowData?.[row]?.values?.[column];
    if (!result) throw new Error("Fixture cell missing");
    return result;
}

/**
 * @returns {{
 *     snapshot: import("../../scripts/google-sheets/collection-record-reconciliation.mjs").CollectionSnapshot;
 *     corrections: import("../../scripts/google-sheets/collection-record-reconciliation.mjs").CollectionCorrection[];
 * }}
 */
function fixture() {
    const specifications = [
        {
            column: 27,
            headers: {
                0: "Plant ID",
                27: "Current pot size",
                28: "Pot details",
                30: "Pot source",
            },
            id: "P29",
            title: "Plant tracker",
        },
        {
            column: 5,
            headers: {
                0: "Plant ID",
                5: "Current pot size",
                17: "Medium / substrate",
            },
            id: "P29",
            title: "Baselines",
        },
        {
            column: 17,
            headers: {
                0: "Container ID",
                14: "Setup notes",
                17: "Acquired from",
                18: "Acquired date",
            },
            id: "P39",
            title: "Containers",
        },
        {
            column: 8,
            headers: {
                0: "Inventory ID",
                2: "Container ID",
                7: "Acquired from",
                8: "Acquired date",
                9: "Identification evidence",
            },
            id: "Houseplant-06",
            title: "Container members",
        },
    ];
    /** @type {import("../../scripts/google-sheets/collection-record-reconciliation.mjs").CollectionSnapshot} */
    const snapshot = { sheets: [], spreadsheetId: "synthetic-workbook" };
    /** @type {import("../../scripts/google-sheets/collection-record-reconciliation.mjs").CollectionCorrection[]} */
    const corrections = [];
    for (const [sheetId, spec] of specifications.entries()) {
        /** @type {import("../../scripts/google-sheets/collection-record-reconciliation.mjs").NativeCell[]} */
        const header = Array.from({ length: 36 }, () => ({}));
        for (const [column, text] of Object.entries(spec.headers))
            header[Number(column)] = {
                userEnteredValue: { stringValue: text },
            };
        /** @type {import("../../scripts/google-sheets/collection-record-reconciliation.mjs").NativeCell[]} */
        const row = Array.from({ length: 36 }, () => ({}));
        row[0] = { userEnteredValue: { stringValue: spec.id } };
        if (spec.title === "Container members")
            row[2] = { userEnteredValue: { stringValue: "P39" } };
        const oldValue =
            spec.title === "Baselines"
                ? { formulaValue: "=OLD()" }
                : { stringValue: "Earlier record" };
        row[spec.column] = {
            note: "Preserve this note",
            userEnteredValue: oldValue,
        };
        snapshot.sheets.push({
            data: [{ rowData: [{ values: header }, { values: row }] }],
            properties: { sheetId, title: spec.title },
        });
        corrections.push({
            column: spec.column,
            evidence: "Synthetic reviewed profile evidence",
            expected: {
                note: "Preserve this note",
                userEnteredValue: oldValue,
            },
            id: spec.id,
            replacement:
                spec.title === "Baselines"
                    ? { formulaValue: "=REVIEWED()" }
                    : { stringValue: "Reviewed record" },
            sheet: spec.title,
        });
    }
    return { corrections, snapshot };
}

describe("collection record reconciliation", () => {
    it("emits only single-cell value writes and preserves source snapshots", () => {
        expect.hasAssertions();

        const { corrections, snapshot } = fixture();
        const before = structuredClone(snapshot);
        const plan = buildCollectionRecordReconciliationPlan(
            snapshot,
            corrections
        );

        expect(plan.requests).toHaveLength(4);

        for (const request of plan.requests) {
            expect(request.updateCells.fields).toBe("userEnteredValue");
            expect(
                request.updateCells.range.endRowIndex -
                    request.updateCells.range.startRowIndex
            ).toBe(1);
            expect(
                request.updateCells.range.endColumnIndex -
                    request.updateCells.range.startColumnIndex
            ).toBe(1);
            expect(
                Object.keys(request.updateCells.rows[0]?.values[0] ?? {})
            ).toStrictEqual(["userEnteredValue"]);
        }

        expect(snapshot).toStrictEqual(before);
        expect(() => {
            assertCollectionRecordReconciliationPreconditions(plan, snapshot);
        }).not.toThrow();
    });

    it("rejects canonical/staging writes and unreviewed formula columns", () => {
        expect.hasAssertions();

        const { corrections, snapshot } = fixture();
        const edit = required(corrections[0]);
        for (const sheet of [
            "History",
            "App entries",
            "App bulk",
        ])
            expect(() =>
                buildCollectionRecordReconciliationPlan(snapshot, [
                    { ...edit, sheet },
                ])
            ).toThrow("Outside reconciliation scope");

        expect(() =>
            buildCollectionRecordReconciliationPlan(snapshot, [
                { ...edit, column: 19, sheet: "Baselines" },
            ])
        ).toThrow("Outside reconciliation scope");
    });

    it("rejects duplicate IDs, duplicate targets, and header drift", () => {
        expect.hasAssertions();

        const { corrections, snapshot } = fixture();
        const first = required(corrections[0]);

        expect(() =>
            buildCollectionRecordReconciliationPlan(snapshot, [
                ...corrections,
                first,
            ])
        ).toThrow("Duplicate correction");

        const rows = required(snapshot.sheets[0]?.data?.[0]?.rowData);
        const existing = required(rows[1]);
        rows.push(structuredClone(existing));

        expect(() =>
            buildCollectionRecordReconciliationPlan(snapshot, corrections)
        ).toThrow("duplicate inventory ID");

        rows.pop();
        cell(snapshot, 0, 0, 27).userEnteredValue = {
            stringValue: "Wrong heading",
        };

        expect(() =>
            buildCollectionRecordReconciliationPlan(snapshot, corrections)
        ).toThrow("Header drift");
    });

    it("rejects changed entered values and notes immediately before writing", () => {
        expect.hasAssertions();

        for (const kind of ["value", "note"]) {
            const { corrections, snapshot } = fixture();
            const plan = buildCollectionRecordReconciliationPlan(
                snapshot,
                corrections
            );
            if (kind === "value")
                cell(snapshot, 0, 1, 27).userEnteredValue = {
                    stringValue: "Concurrent edit",
                };
            else cell(snapshot, 0, 1, 27).note = "Concurrent note";

            expect(() => {
                assertCollectionRecordReconciliationPreconditions(
                    plan,
                    snapshot
                );
            }).toThrow("Expected cell drift");
        }
    });

    it("rejects replay after applying the reviewed values", () => {
        expect.hasAssertions();

        const { corrections, snapshot } = fixture();
        const plan = buildCollectionRecordReconciliationPlan(
            snapshot,
            corrections
        );
        for (const guard of plan.guards) {
            const index = snapshot.sheets.findIndex(
                (sheet) => sheet.properties.sheetId === guard.sheetId
            );
            cell(snapshot, index, guard.row, guard.column).userEnteredValue =
                guard.replacement;
        }

        expect(() => {
            assertCollectionRecordReconciliationPreconditions(plan, snapshot);
        }).toThrow("Expected cell drift");

        const replay = corrections.map((correction) => ({
            ...correction,
            expected: {
                ...correction.expected,
                userEnteredValue: correction.replacement,
            },
        }));

        expect(() =>
            buildCollectionRecordReconciliationPlan(snapshot, replay)
        ).toThrow("already applied");
    });

    it("preserves unrelated and calculated values while checking identity bindings", () => {
        expect.hasAssertions();

        const { corrections, snapshot } = fixture();
        const plan = buildCollectionRecordReconciliationPlan(
            snapshot,
            corrections
        );
        cell(snapshot, 1, 1, 5).effectiveValue = {
            stringValue: "Fresh calculation",
        };
        cell(snapshot, 0, 1, 4).userEnteredValue = {
            stringValue: "Unrelated metadata",
        };

        expect(() => {
            assertCollectionRecordReconciliationPreconditions(plan, snapshot);
        }).not.toThrow();

        cell(snapshot, 3, 1, 2).userEnteredValue = { stringValue: "P40" };

        expect(() => {
            assertCollectionRecordReconciliationPreconditions(plan, snapshot);
        }).toThrow("identities drifted");
    });

    it("rejects formulas in metadata and lost or wrongly typed Baselines formulas", () => {
        expect.hasAssertions();

        const { corrections, snapshot } = fixture();
        const metadata = required(corrections[0]);
        const formula = required(corrections[1]);

        expect(() =>
            buildCollectionRecordReconciliationPlan(snapshot, [
                { ...metadata, replacement: { formulaValue: "=DANGEROUS()" } },
            ])
        ).toThrow("Invalid replacement type");
        expect(() =>
            buildCollectionRecordReconciliationPlan(snapshot, [
                { ...formula, replacement: { stringValue: "text" } },
            ])
        ).toThrow("Invalid replacement type");

        cell(snapshot, 1, 1, 5).userEnteredValue = {
            stringValue: "lost formula",
        };

        expect(() =>
            buildCollectionRecordReconciliationPlan(snapshot, [
                {
                    ...formula,
                    expected: {
                        note: "Preserve this note",
                        userEnteredValue: { stringValue: "lost formula" },
                    },
                },
            ])
        ).toThrow("Expected existing Baselines formula");
    });

    it("rejects workbook identity drift and altered request payloads", () => {
        expect.hasAssertions();

        const { corrections, snapshot } = fixture();
        const plan = buildCollectionRecordReconciliationPlan(
            snapshot,
            corrections
        );

        expect(() => {
            assertCollectionRecordReconciliationPreconditions(plan, {
                ...snapshot,
                spreadsheetId: "different",
            });
        }).toThrow("Workbook identity drift");

        const request = required(plan.requests[0]);
        request.updateCells.range.startColumnIndex = 5;

        expect(() => {
            assertCollectionRecordReconciliationPreconditions(plan, snapshot);
        }).toThrow("drifted since planning");
    });
});
