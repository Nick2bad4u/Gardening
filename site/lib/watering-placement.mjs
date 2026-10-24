import { readFile } from "node:fs/promises";
import * as path from "node:path";

import { getContainers } from "./containers.mjs";

// Astro relocates this module into its output directory; sources stay at the
// repository build root, as they do for the other site content adapters.
const root = process.cwd();

/** @typedef {import("../client/tools/watering-map-data.js").PotPlacement} PotPlacement */
/**
 * @typedef {Pick<
 *     import("./containers.mjs").Container,
 *     "id" | "label" | "name"
 * >} PlacementContainer
 */

// Rear coordinates translate the October 22 owner photos into schematic spacing.
// The owner confirmed the gray/blue rosette as P37 Arctic Ice on October 23.
/** @type {Omit<PotPlacement, "label" | "name">[]} */
const rearPlacements = [
    { id: "P22", position: "Rear left", x: 215, y: 490, zone: "rear" },
    { id: "P19", position: "Rear center", x: 455, y: 475, zone: "rear" },
    {
        id: "P20",
        position: "Rear right, toward window",
        x: 800,
        y: 330,
        zone: "rear",
    },
    { id: "P30", position: "Front of rear zone", x: 610, y: 560, zone: "rear" },
    {
        id: "P29",
        position: "Rear right, in front of box",
        x: 800,
        y: 520,
        zone: "rear",
    },
    {
        id: "P35",
        position: "Back left, behind Kiwi",
        x: 190,
        y: 300,
        zone: "rear",
    },
    {
        id: "P36",
        position: "Back center-right, between shared cacti and box",
        x: 600,
        y: 300,
        zone: "rear",
    },
    {
        id: "P37",
        position: "Back center-left, between Lithops and shared cacti",
        x: 390,
        y: 300,
        zone: "rear",
    },
];
const otherPositions = new Map([
    ["P21", "Stool on room side"],
    ["P31", "Kitchen window shelf"],
    ["P32", "Kitchen window shelf"],
    ["P38", "Desk to right of tables"],
    ["P39", "Quarantine in another room"],
    ["P40", "Quarantine in another room"],
]);

/**
 * Read the current written grid, whose confirmed swap supersedes the artwork.
 * Reject incomplete or ambiguous tables instead of drawing misleading
 * positions.
 *
 * @param {string} markdown
 * @param {readonly PlacementContainer[]} containers
 *
 * @returns {PotPlacement[]}
 */
export function buildWateringPlacements(markdown, containers) {
    const records = containers.map(({ id, label, name }) => ({
        id,
        label,
        name,
    }));
    const byId = new Map(records.map((container) => [container.id, container]));
    const byLabel = new Map(
        records.map((container) => [container.label, container])
    );
    if (byId.size !== containers.length || byLabel.size !== containers.length)
        throw new Error("Duplicate container ID or label in placement source.");

    const placements = frontPlacements(markdown, byLabel);
    const placed = new Set(placements.map(({ id }) => id));
    for (const placement of rearPlacements) {
        const container = byId.get(placement.id);
        if (!container)
            throw new Error(`Missing placement container: ${placement.id}`);
        if (placed.has(container.id))
            throw new Error(`Duplicate placement: ${container.id}`);
        placed.add(container.id);
        placements.push({ ...container, ...placement });
    }
    const others = records
        .filter((container) => !placed.has(container.id))
        .toSorted((left, right) => left.id.localeCompare(right.id));
    for (const [index, container] of others.entries()) {
        placements.push({
            ...container,
            position: otherPositions.get(container.id) ?? "Position unrecorded",
            x: 170 + 220 * (index % 4),
            y: 1305 + 130 * Math.floor(index / 4),
            zone: "other",
        });
    }
    return placements;
}

/** @returns {Promise<PotPlacement[]>} */
export async function getWateringPlacements() {
    const [markdown, containers] = await Promise.all([
        readFile(
            path.join(root, "docs/layouts/table-placement-research.md"),
            "utf8"
        ),
        getContainers(),
    ]);
    return buildWateringPlacements(markdown, containers);
}

/**
 * @param {string} markdown
 * @param {ReadonlyMap<string, PlacementContainer>} byLabel
 *
 * @returns {PotPlacement[]}
 */
function frontPlacements(markdown, byLabel) {
    const section = markdown
        .split("## Front Tables: Six Columns, Four Rows", 2)[1]
        ?.split(/\n## /v, 1)[0];
    const table = section
        ?.split(/\r?\n/v)
        .filter((line) => line.trimStart().startsWith("|"));
    if (table?.length !== 6)
        throw new Error(
            "Placement grid must contain a header, separator, and four rows."
        );

    /** @type {PotPlacement[]} */
    const placements = [];
    const placed = new Set();
    for (const [index, line] of table.slice(2).entries()) {
        const cells = line
            .trim()
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim());
        const row = index + 1;
        if (cells.length !== 7 || cells[0]?.split(/\s/v, 1)[0] !== String(row))
            throw new Error(
                `Placement grid row ${row} must have its row label and six pots.`
            );
        for (const [column, cell] of cells.slice(1).entries()) {
            const label = cell.split("·", 1)[0]?.trim() ?? "";
            const container = byLabel.get(label);
            if (!container)
                throw new Error(`Unknown placement label: ${label}`);
            if (placed.has(container.id))
                throw new Error(`Duplicate placement: ${container.id}`);
            placed.add(container.id);
            placements.push({
                ...container,
                position: `R${row}C${column + 1}`,
                x: 170 + 132 * column,
                y: 730 + 126 * (4 - row),
                zone: "front",
            });
        }
    }
    return placements;
}
