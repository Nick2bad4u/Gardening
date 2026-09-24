import { describe, expect, it } from "vitest";

import { analyzeDrying } from "../scripts/analyze-drying.mjs";

const header = [
    "Date",
    "Plant ID",
    "Event",
    "Weight state",
    "Weight (g)",
    "Pot setup",
    "Request ID",
    "Save group / batch ID",
    "Record status",
    "Watering application",
    "Observation quality",
    "Measurement method",
    "Observation ID",
    "Corrects observation ID",
];
const snapshot = () => ({
    history: [
        header,
        [
            46_000,
            "P01",
            "Water",
            "Routine",
            "",
            1,
        ],
        ...[
            [0, 200],
            [1, 160],
            [2, 113],
            [2.75, 112],
            [3.5, 111],
            [4, 110],
        ].map(([day, weight]) => [
            46_000 + Number(day),
            "P01",
            "Weigh",
            "Routine",
            weight,
            1,
        ]),
    ],
    plantIds: ["P01"],
    readAt: "2026-09-14T22:00:00Z",
});

describe("shared drying analysis", () => {
    it("returns current-cycle evidence from the workbook detector without a dry reference", async () => {
        expect.hasAssertions();

        const result = await analyzeDrying(snapshot());

        expect(result.detectorVersion).toBe("5.30.1");
        expect(result.pots).toHaveLength(1);
        expect(result.pots[0]).toMatchObject({
            evidence: { plateau: true, referenceReached: false },
            id: "P01",
            inspectionSupported: true,
            waterDate: 46_000,
        });
        expect(result.pots[0]?.evidence?.tail).toHaveLength(4);
        expect(result.pots[0]?.model[2]).toBe("");
    });

    it("preserves manual decisions and suppresses partial watering despite a flat tail", async () => {
        expect.hasAssertions();

        const input = snapshot();
        input.plantIds = ["P21", "P28"];
        input.history = [
            header,
            ...input.history
                .slice(1)
                .flatMap((row) =>
                    input.plantIds.map((id) =>
                        row.map((cell, index) => (index === 1 ? id : cell))
                    )
                ),
        ];
        const result = await analyzeDrying(input);

        expect(result.pots.map((pot) => pot.model[14])).toStrictEqual(["", ""]);
        expect(result.pots.map((pot) => pot.model[21])).toStrictEqual([
            "Check upper 2 in of mix",
            "Leaf-cycle check only",
        ]);

        const partial = snapshot();
        partial.history[1] = [
            46_000,
            "P01",
            "Water",
            "Routine",
            "",
            1,
            "",
            "",
            "Active",
            "Spot / partial",
        ];
        const partialResult = await analyzeDrying(partial);

        expect(partialResult.pots[0]?.inspectionSupported).toBe(false);
    });

    it("rejects formatted dates, ambiguous headers and duplicate IDs", async () => {
        expect.hasAssertions();

        const formatted = snapshot();
        formatted.history[1] = [
            "Sep 14",
            "P01",
            "Water",
        ];

        await expect(analyzeDrying(formatted)).rejects.toThrow(
            "UNFORMATTED_VALUE"
        );
        await expect(
            analyzeDrying({ ...snapshot(), plantIds: ["P01", "P01"] })
        ).rejects.toThrow("unique");
        await expect(
            analyzeDrying({ ...snapshot(), history: [[...header, "Date"]] })
        ).rejects.toThrow("duplicate History column");
        await expect(
            analyzeDrying({ ...snapshot(), readAt: "2026-09-14" })
        ).rejects.toThrow("timezone");
    });
});
