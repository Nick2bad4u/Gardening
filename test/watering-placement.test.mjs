import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { getContainers } from "../site/lib/containers.mjs";
import {
    buildWateringPlacements,
    getWateringPlacements,
} from "../site/lib/watering-placement.mjs";

const source = await readFile(
    new URL("../docs/layouts/table-placement-research.md", import.meta.url),
    "utf8"
);
const containers = await getContainers();

describe("watering placement source", () => {
    it("maps every current container once and preserves the photographed front-grid swaps", async () => {
        expect.hasAssertions();

        const placements = await getWateringPlacements();
        const ids = new Set(placements.map(({ id }) => id));

        expect(placements).toHaveLength(39);
        expect(ids.size).toBe(39);
        expect(
            placements
                .map(({ id }) => id)
                .toSorted((left, right) => left.localeCompare(right))
        ).toStrictEqual(
            containers
                .map(({ id }) => id)
                .toSorted((left, right) => left.localeCompare(right))
        );
        expect(
            placements
                .filter(({ zone }) => zone === "front")
                .map(({ id }) => id)
        ).toStrictEqual([
            "P12",
            "P14",
            "P27",
            "P06",
            "P10",
            "P17",
            "P02",
            "P05",
            "P25",
            "P28",
            "P09",
            "P07",
            "P01",
            "P13",
            "P24",
            "P16",
            "P08",
            "P11",
            "P04",
            "P15",
            "P23",
            "P26",
            "P18",
            "P03",
        ]);
        expect(placements.find(({ id }) => id === "P03")).toMatchObject({
            label: "A3",
            position: "R4C6",
            x: 830,
            y: 730,
        });
        expect(placements.find(({ id }) => id === "P16")).toMatchObject({
            label: "F1",
            position: "R3C4",
            x: 566,
            y: 856,
        });

        for (const container of containers) {
            expect(
                placements.find(({ id }) => id === container.id)
            ).toMatchObject({ label: container.label, name: container.name });
        }
    });

    it("maps the photographed rear pots including the owner's Arctic Ice confirmation", () => {
        expect.hasAssertions();

        const placements = buildWateringPlacements(source, containers);

        expect(
            placements
                .filter(({ zone }) => zone === "rear")
                .map(({ id }) => id)
                .toSorted((left, right) => left.localeCompare(right))
        ).toStrictEqual([
            "P19",
            "P20",
            "P22",
            "P29",
            "P30",
            "P35",
            "P36",
            "P37",
        ]);
        expect(placements.filter(({ zone }) => zone === "sill")).toStrictEqual(
            []
        );
        expect(placements.find(({ id }) => id === "P22")).toMatchObject({
            x: 215,
            y: 490,
        });
        expect(placements.find(({ id }) => id === "P35")).toMatchObject({
            position: "Back left, behind Kiwi",
            x: 190,
            y: 300,
        });
        expect(placements.find(({ id }) => id === "P36")).toMatchObject({
            position: "Back center-right, between shared cacti and box",
            x: 600,
            y: 300,
        });
        expect(placements.find(({ id }) => id === "P37")).toMatchObject({
            position: "Back center-left, between Lithops and shared cacti",
            x: 390,
            y: 300,
            zone: "rear",
        });

        const others = placements.filter(({ zone }) => zone === "other");

        expect(
            others.map(({ id, position }) => ({ id, position }))
        ).toStrictEqual([
            { id: "P21", position: "Stool on room side" },
            { id: "P31", position: "Kitchen window shelf" },
            { id: "P32", position: "Kitchen window shelf" },
            { id: "P38", position: "Desk to right of tables" },
            { id: "P39", position: "Quarantine in another room" },
            { id: "P40", position: "Quarantine in another room" },
            { id: "P41", position: "Position unrecorded" },
        ]);
        expect(others[0]).toMatchObject({ x: 170, y: 1305 });
        expect(others[5]).toMatchObject({ x: 390, y: 1435 });
    });

    it("keeps planned terrarium-shelf moves separate from the current positions and watering history", () => {
        expect.hasAssertions();

        const placements = buildWateringPlacements(source, containers);
        for (const id of ["P39", "P40"]) {
            expect(
                placements.find((placement) => placement.id === id)
            ).toMatchObject({
                position: "Quarantine in another room",
                zone: "other",
            });
        }
        for (const placement of placements) {
            expect(placement).not.toHaveProperty("days");
            expect(placement).not.toHaveProperty("lastWater");
        }
    });

    it.each([
        [
            "unknown label",
            "D3 · Ming Thing",
            "Z9 · Ming Thing",
            /Unknown placement label/v,
        ],
        [
            "duplicate pot",
            "D3 · Ming Thing",
            "E2 · Ming Thing",
            /Duplicate placement/v,
        ],
        [
            "missing cell",
            "| D3 · Ming Thing",
            "D3 · Ming Thing",
            /six pots/v,
        ],
        [
            "wrong row",
            "| 1 · Room edge",
            "| 2 · Room edge",
            /row 1/v,
        ],
        [
            "missing section",
            "## Front Tables: Six Columns, Four Rows",
            "## Missing grid",
            /four rows/v,
        ],
    ])(
        "rejects %s instead of drawing a misleading map",
        (_description, previous, replacement, error) => {
            expect.hasAssertions();

            expect(() =>
                buildWateringPlacements(
                    source.replace(previous, () => replacement),
                    containers
                )
            ).toThrow(error);
        }
    );

    it("rejects missing rear containers and ambiguous container labels", () => {
        expect.hasAssertions();

        expect(() =>
            buildWateringPlacements(
                source,
                containers.filter(({ id }) => id !== "P19")
            )
        ).toThrow(/Missing placement container: P19/v);
        expect(() =>
            buildWateringPlacements(
                source,
                containers.map((container) =>
                    container.id === "P40"
                        ? { ...container, label: "A1" }
                        : container
                )
            )
        ).toThrow(/Duplicate container ID or label/v);
    });
});
