import { describe, expect, it } from "vitest";

import {
    buildHouseplantRenumber,
    renumberHouseplantText,
    verifyHouseplantRenumber,
} from "../../scripts/google-sheets/houseplant-renumber.mjs";
import { required } from "../helpers/required.mjs";
/** @typedef {import("../../scripts/google-sheets/inventory-expansion.mjs").NativeSnapshot} Snapshot */
/** @typedef {import("../../scripts/google-sheets/inventory-expansion.mjs").Cell} Cell */
function fixture() {
    const titles = [
        "History",
        "App entries",
        "App bulk",
        "RO refills",
        "Plant tracker",
        "P33 Peperomia Bicolor",
        "P34 Tricolor oyster plant",
    ];
    /** @type {Snapshot} */ const snapshot = {
        sheets: titles.map((title, index) => ({
            data: [
                {
                    rowData: Array.from({ length: 40 }, () => ({
                        values: Array.from({ length: 58 }, () => ({})),
                    })),
                },
            ],
            properties: {
                gridProperties: { columnCount: 58, rowCount: 40 },
                sheetId:
                    index === 5
                        ? 202_609_330
                        : index === 6
                          ? 202_609_340
                          : index + 1,
                title,
            },
        })),
    };
    /**
     * @param {string} title @param {number} row @param {number} column @param
     *   {string} text
     */
    function set(title, row, column, text) {
        const sheet = snapshot.sheets.find((s) => s.properties.title === title);
        const cell = sheet?.data?.[0]?.rowData?.[row]?.values?.[column];
        if (cell === undefined) throw new Error("Fixture cell missing");
        cell.userEnteredValue = { stringValue: text };
        return cell;
    }
    for (let i = 1; i <= 32; i++)
        set(
            "Plant tracker",
            i,
            0,
            `P${String(i > 30 ? i + 2 : i).padStart(2, "0")}`
        );
    for (let c = 54; c < 58; c++)
        set("App bulk", 0, c, `P${c - 23} weight (g)`);
    set("History", 0, 1, "Plant ID");
    set("History", 0, 11, "Pot label at entry");
    set("History", 1, 1, "P33");
    set("History", 1, 11, "#9");
    set("History", 1, 8, "Original note mentions P33 #9");
    set("History", 1, 26, "observation-uuid");
    set("P33 Peperomia Bicolor", 0, 0, "P33 · Peperomia Bicolor");
    set("P34 Tricolor oyster plant", 0, 0, "P34 · Tricolor oyster plant");
    const metadata = structuredClone(snapshot);
    for (const sheet of metadata.sheets) delete sheet.data;
    return { metadata, set, snapshot };
}

describe("explicit houseplant renumbering", () => {
    it("renumbers identities without changing quantities or embedded ID substrings", () => {
        expect.hasAssertions();
        expect(
            renumberHouseplantText("P33 #9 P34 #10 9 in 10 g XP33 P330")
        ).toBe("P31 #7 P32 #8 9 in 10 g XP33 P330");
    });

    it("preserves sheets, charts, real observations, and processed staging", () => {
        expect.hasAssertions();

        const { metadata, set, snapshot } = fixture();
        set("App entries", 1, 0, "original-request");
        set("App entries", 1, 2, "P33");
        set("App entries", 1, 26, "Saved");
        const plan = buildHouseplantRenumber(metadata, [snapshot]);

        expect(
            plan.requests.filter((r) => "updateSheetProperties" in r)
        ).toHaveLength(2);
        expect(JSON.stringify(plan.requests)).not.toMatch(
            /addSheet|deleteSheet|duplicateSheet|updateChartSpec/v
        );

        const history = plan.requests.filter((r) =>
            /"sheetId":1[,\}]/v.test(JSON.stringify(r))
        );

        expect(history).toHaveLength(2);
        expect(JSON.stringify(history)).toContain('"P31"');
        expect(JSON.stringify(history)).toContain('"#7"');
        expect(JSON.stringify(plan.requests)).not.toContain("Original note");
        expect(JSON.stringify(plan.requests)).not.toContain("observation-uuid");
        expect(
            plan.requests.filter((r) =>
                /"sheetId":2[,\}]/v.test(JSON.stringify(r))
            )
        ).toHaveLength(0);
        expect(() => {
            verifyHouseplantRenumber(plan, metadata, [snapshot]);
        }).not.toThrow();

        set("History", 1, 8, "Later owner annotation");

        expect(() => {
            verifyHouseplantRenumber(plan, metadata, [snapshot]);
        }).toThrow("changed");
    });

    it("rejects destination observations, pending queues, and occupied compatibility weights", () => {
        expect.hasAssertions();

        const first = fixture();
        first.set("History", 2, 1, "P31");

        expect(() =>
            buildHouseplantRenumber(first.metadata, [first.snapshot])
        ).toThrow("Destination identity");

        const second = fixture();
        second.set("App entries", 1, 0, "pending");
        second.set("App entries", 1, 26, "Pending");

        expect(() =>
            buildHouseplantRenumber(second.metadata, [second.snapshot])
        ).toThrow("Drain pending");

        const third = fixture();
        third.set("App bulk", 1, 56, "123");

        expect(() =>
            buildHouseplantRenumber(third.metadata, [third.snapshot])
        ).toThrow("must be empty");
    });

    it("rejects replay and incomplete ledger captures", () => {
        expect.hasAssertions();

        const a = fixture();
        const page = required(a.metadata.sheets[5]);
        page.properties.title = "P31 Peperomia Bicolor";
        required(a.snapshot.sheets[5]).properties.title = page.properties.title;

        expect(() => buildHouseplantRenumber(a.metadata, [a.snapshot])).toThrow(
            "already applied"
        );

        const b = fixture();
        b.snapshot.sheets[0]?.data?.[0]?.rowData?.pop();

        expect(() => buildHouseplantRenumber(b.metadata, [b.snapshot])).toThrow(
            "Incomplete ledger"
        );
    });
});
