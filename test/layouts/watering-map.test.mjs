import { Window } from "happy-dom";
import { describe, expect, it, onTestFinished } from "vitest";

import { buildWateringMap } from "../../site/client/tools/watering-map-data.js";
import { renderWateringMapSvg } from "../../site/client/tools/watering-map-svg.js";
import { getContainers } from "../../site/lib/containers.mjs";
import {
    getWateringArtwork,
    namespaceArtwork,
} from "../../site/lib/watering-artwork.mjs";
import { getWateringPlacements } from "../../site/lib/watering-placement.mjs";
import { required } from "../helpers/required.mjs";

/** @typedef {import("../../site/lib/watering-placement.mjs").PotPlacement} PotPlacement */
/** @typedef {import("../../docs/layouts/plant-tracker-data.js").HistoryEvent} HistoryEvent */

/** @type {PotPlacement[]} */
const placements = [
    {
        id: "P01",
        label: "#7",
        name: "Test cactus",
        position: "R1 C1",
        x: 170,
        y: 1113,
        zone: "front",
    },
    {
        id: "P20",
        label: "#20",
        name: "Shared planter",
        position: "Rear right",
        x: 775,
        y: 425,
        zone: "rear",
    },
    {
        id: "P38",
        label: "#12",
        name: "Terrarium",
        position: "Shelf",
        x: 170,
        y: 1310,
        zone: "other",
    },
];

/** @param {Omit<HistoryEvent, "_index">[]} records @returns {HistoryEvent[]} */
function history(records) {
    return records.map((record, _index) => ({ ...record, _index }));
}

describe("watering placement dates", () => {
    it.each([
        "2026-02-30",
        "2026-02-29T12:00:00Z",
        "10/32/2026",
        "not a date",
        "2026-10-21T25:00:00",
        "2026-10-23",
        "2026-10-22T23:59:00",
    ])("leaves watering unknown when the only record has date %s", (date) => {
        expect.hasAssertions();

        const model = buildWateringMap(
            placements,
            history([{ Date: date, Event: "Water", "Plant ID": "P01" }]),
            new Date("2026-10-22T16:00:00Z")
        );

        expect(model.markers[0]).toMatchObject({ days: null, lastWater: null });
    });

    it("compares instants across the repeated fall-back hour", () => {
        expect.hasAssertions();

        const model = buildWateringMap(
            placements,
            history([
                {
                    Date: "2026-11-01T05:50:00Z",
                    Event: "Water",
                    "Plant ID": "P01",
                },
                {
                    Date: "2026-11-01T06:30:00Z",
                    Event: "Water",
                    "Plant ID": "P20",
                },
            ]),
            new Date("2026-11-01T06:10:00Z")
        );

        expect(model.markers[0]).toMatchObject({
            days: 0,
            lastWater: "2026-11-01",
        });
        expect(model.markers[1]).toMatchObject({ days: null, lastWater: null });
    });

    it("shows the chronologically latest move across the repeated fall-back hour", () => {
        expect.hasAssertions();

        const model = buildWateringMap(
            placements,
            history([
                {
                    Date: "2026-11-01T05:50:00Z",
                    Event: "Move",
                    "New location": "Old shelf",
                    "Plant ID": "P01",
                },
                {
                    Date: "2026-11-01T06:10:00Z",
                    Event: "Move",
                    "New location": "New shelf",
                    "Plant ID": "P01",
                },
            ]),
            new Date("2026-11-01T07:00:00Z")
        );

        expect(model.markers[0]).toMatchObject({
            currentLocation: "New shelf",
        });
    });

    it.each([
        { date: "2026-03-08", days: 1, now: "2026-03-09T04:30:00Z" },
        { date: "2026-11-01T04:30:00Z", days: 1, now: "2026-11-02T05:30:00Z" },
        {
            date: "10/22/2026 12:05:00 AM",
            days: 0,
            now: "2026-10-23T03:59:00Z",
        },
        {
            date: "2026-10-22T23:30:00-04:00",
            days: 1,
            now: "2026-10-23T04:01:00Z",
        },
        {
            date: "2026-10-23T00:30:00+02:00",
            days: 0,
            now: "2026-10-23T03:59:00Z",
        },
        { date: "10/21/2026 11:30 PM", days: 1, now: "2026-10-22T04:01:00Z" },
    ])("uses garden calendar days for $date at $now", ({ date, days, now }) => {
        expect.hasAssertions();

        const model = buildWateringMap(
            placements,
            history([{ Date: date, Event: "Water", "Plant ID": "P01" }]),
            new Date(now)
        );

        expect(model.markers[0]?.days).toBe(days);
        expect(model.markers[1]?.days).toBeNull();
    });

    it("ignores future, invalid, removed, and non-Water records without losing the last valid watering", () => {
        expect.hasAssertions();

        const model = buildWateringMap(
            placements,
            history([
                {
                    Date: "2026-10-20",
                    Event: "Water",
                    "Observation ID": "original",
                    "Plant ID": "P01",
                    "Record status": "Removed",
                },
                {
                    "Corrects observation ID": "original",
                    Date: "2026-10-18",
                    Event: "Water",
                    "Observation ID": "correction",
                    "Plant ID": "P01",
                    "Record status": "Active",
                },
                { Date: "2026-10-22", Event: "Mist", "Plant ID": "P01" },
                {
                    Date: "2026-10-22",
                    Event: "Repot",
                    "Plant ID": "P01",
                    "Pot setup": 2,
                },
                {
                    Date: "2026-10-22",
                    Event: "Weight",
                    "Plant ID": "P01",
                    "Weight state": "Wet",
                },
                { Date: "2026-10-23", Event: "Water", "Plant ID": "P01" },
                {
                    Date: "2026-10-22T23:59:00",
                    Event: "Water",
                    "Plant ID": "P01",
                },
                { Date: "2026-02-30", Event: "Water", "Plant ID": "P01" },
                { Date: "10/32/2026", Event: "Water", "Plant ID": "P01" },
                { Date: "not a date", Event: "Water", "Plant ID": "P01" },
                {
                    Date: "2026-10-21T25:00:00",
                    Event: "Water",
                    "Plant ID": "P01",
                },
            ]),
            new Date("2026-10-22T16:00:00Z")
        );

        expect(model.date).toBe("2026-10-22");
        expect(model.markers[0]).toMatchObject({
            days: 4,
            lastWater: "2026-10-18",
        });
    });

    it("joins by permanent pot ID and keeps a shared pot and logged move in their recorded slots", () => {
        expect.hasAssertions();

        const model = buildWateringMap(
            placements,
            history([
                {
                    "Current pot label": "Old label",
                    Date: "2026-10-21",
                    Event: "Water",
                    "Plant ID": "P20",
                },
                { Date: "2026-10-22", Event: "Water", "Plant ID": "#7" },
                {
                    Date: "2026-10-21",
                    Event: "Move",
                    "New location": "Old shelf",
                    "Plant ID": "P20",
                    "Record status": "Removed",
                },
                {
                    Date: "2026-10-21",
                    Event: "Move",
                    "New location": "Window",
                    "Plant ID": "P20",
                },
                {
                    Date: "2026-10-23",
                    Event: "Move",
                    "New location": "Future shelf",
                    "Plant ID": "P20",
                },
            ]),
            new Date("2026-10-22T16:00:00Z")
        );

        expect(model.markers).toHaveLength(placements.length);
        expect(model.markers[0]).toMatchObject({ days: null, lastWater: null });
        expect(model.markers[1]).toMatchObject({
            ...required(placements[1]),
            currentLocation: "Window",
            days: 1,
        });
        expect(placements[1]).not.toHaveProperty("days");
    });

    it("shows missing history as unknown for every maintained placement", () => {
        expect.hasAssertions();
        expect(
            buildWateringMap(
                placements,
                [],
                new Date("2026-10-22T16:00:00Z")
            ).markers.map(({ days, lastWater }) => ({ days, lastWater }))
        ).toStrictEqual(
            placements.map(() => ({ days: null, lastWater: null }))
        );
    });
});

describe("standalone watering image", () => {
    it("renders each pot once with readable counts, unknowns, dates, and source freshness", () => {
        expect.hasAssertions();

        const model = buildWateringMap(
            placements,
            history([
                { Date: "2026-10-22", Event: "Water", "Plant ID": "P01" },
            ]),
            new Date("2026-10-22T16:00:00Z")
        );
        const svg = renderWateringMapSvg(model, {
            readAt: Date.parse("2026-10-22T16:00:00Z"),
            status: "Published observations loaded",
        });
        const window = new Window();
        onTestFinished(async () => window.happyDOM.close());
        const parser = new window.DOMParser();
        const document = parser.parseFromString(svg, "image/svg+xml");

        expect(document.querySelector("parsererror")).toBeNull();
        expect(document.documentElement.tagName.toLowerCase()).toBe("svg");
        expect(document.documentElement.getAttribute("data-color-scheme")).toBe(
            "dark"
        );
        expect(document.querySelector("svg > rect")?.getAttribute("fill")).toBe(
            "#0c1815"
        );
        expect(document.querySelectorAll("[data-pot-id]")).toHaveLength(3);

        expect(
            Array.from(document.querySelectorAll("[data-pot-id]"), (marker) =>
                marker.getAttribute("data-pot-id")
            )
        ).toStrictEqual(placements.map(({ id }) => id));

        expect(
            document.querySelector('[data-pot-id="P01"] .count')?.textContent
        ).toBe("0");
        expect(
            document.querySelector('[data-pot-id="P20"] .count')?.textContent
        ).toBe("?");

        for (const placement of placements) {
            const marker = Array.from(
                document.querySelectorAll("[data-pot-id]")
            ).find(
                (candidate) =>
                    candidate.getAttribute("data-pot-id") === placement.id
            );

            expect(marker?.querySelector("text.name")?.textContent).toBe(
                placement.zone === "front" ? undefined : placement.name
            );
            expect(marker?.querySelector("title")?.textContent).toContain(
                placement.name
            );
            expect(marker?.querySelector(".identity")?.textContent).toBe(
                `${placement.label} · ${placement.id}`
            );
        }

        expect(document.querySelector("desc")?.textContent).toContain(
            "Published observations loaded"
        );
        expect(document.querySelector("desc")?.textContent).toContain(
            "Source read:"
        );
        expect(document.querySelector("title")?.textContent).toContain(
            "2026-10-22"
        );
        expect(
            document.querySelectorAll(
                "image, script, foreignObject, link, [href], [src]"
            )
        ).toHaveLength(0);
        expect(svg).not.toMatch(/@import|url\(/v);
    });

    it("escapes imported plant names, labels, placement notes, and status as text", () => {
        expect.hasAssertions();

        const hostile = "<script>alert(\"test\")</script> & 'quoted'";
        const model = buildWateringMap(
            [
                {
                    ...required(placements[0]),
                    label: hostile,
                    name: hostile,
                    position: hostile,
                },
            ],
            history([
                {
                    Date: "2026-10-21",
                    Event: "Move",
                    "New location": hostile,
                    "Plant ID": "P01",
                },
            ]),
            new Date("2026-10-22T16:00:00Z")
        );
        const svg = renderWateringMapSvg(model, {
            readAt: null,
            status: hostile,
        });
        const window = new Window();
        onTestFinished(async () => window.happyDOM.close());
        const parser = new window.DOMParser();
        const document = parser.parseFromString(svg, "image/svg+xml");

        expect(document.querySelector("script")).toBeNull();
        expect(
            document.querySelector('[data-pot-id="P01"] title')?.textContent
        ).toContain(hostile);
        expect(document.querySelector("desc")?.textContent).toContain(hostile);
        expect(svg).toContain("&lt;script&gt;");
        expect(svg).toContain("&quot;test&quot;");
        expect(svg).toContain("&apos;quoted&apos;");
        expect(document.querySelector("desc")?.textContent).toContain(
            "Waiting for published watering history"
        );
    });

    it("keeps rear plant names as visible SVG text so browser Find can match them", () => {
        expect.hasAssertions();

        const name = "Probable Haworthiopsis attenuata cultivar unknown";
        const model = buildWateringMap(
            [{ ...required(placements[1]), name }],
            [],
            new Date("2026-10-22T16:00:00Z")
        );
        const window = new Window();
        onTestFinished(async () => window.happyDOM.close());
        const parser = new window.DOMParser();
        const document = parser.parseFromString(
            renderWateringMapSvg(model, { readAt: null, status: "Loading" }),
            "image/svg+xml"
        );
        const visibleName = document.querySelector(
            '[data-pot-id="P20"] text.name'
        );

        expect(visibleName?.textContent).toBe(name);
        expect(visibleName?.getAttribute("aria-hidden")).not.toBe("true");
        expect(visibleName?.getAttribute("display")).not.toBe("none");
        expect(document.querySelector(".count")?.textContent).toBe("?");
        expect(document.querySelector("desc")?.textContent).toContain(
            "Question mark means no recorded watering"
        );
    });
});

describe("inline watering artwork", () => {
    it("uses the maintained container portraits and resolves every embedded reference without network images", async () => {
        expect.hasAssertions();

        const [
            artwork,
            currentPlacements,
            containers,
        ] = await Promise.all([
            getWateringArtwork(),
            getWateringPlacements(),
            getContainers(),
        ]);
        const model = buildWateringMap(
            currentPlacements,
            [],
            new Date("2026-10-24T16:00:00Z")
        );
        const window = new Window();
        onTestFinished(async () => window.happyDOM.close());
        const parser = new window.DOMParser();
        const svg = renderWateringMapSvg(
            model,
            { readAt: null, status: "Loading" },
            artwork
        );
        const document = parser.parseFromString(svg, "image/svg+xml");
        const ids = Array.from(
            document.querySelectorAll("[id]"),
            (element) => element.id
        );

        expect(document.querySelector("parsererror")).toBeNull();

        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(ids.length);
        expect(document.querySelectorAll("[data-plant-slug]")).toHaveLength(38);
        expect(
            document.querySelectorAll(
                "image, script, foreignObject, link, [src]"
            )
        ).toHaveLength(0);

        for (const container of containers) {
            const marker = Array.from(
                document.querySelectorAll("[data-pot-id]")
            ).find(
                (element) =>
                    element.getAttribute("data-pot-id") === container.id
            );

            expect(
                marker
                    ?.querySelector("[data-plant-slug]")
                    ?.getAttribute("data-plant-slug")
            ).toBe(container.portraitSlug);
            expect(artwork.portraits[container.id]).toBe(
                container.portraitSlug
            );
        }

        for (const element of document.querySelectorAll("[href]")) {
            const reference = element.getAttribute("href") ?? "";

            expect(reference).toMatch(/^#[\w\-]+$/v);
            expect(ids).toContain(reference.slice(1));
        }

        for (const reference of svg.matchAll(/url\(#(?<id>[\w\-]+)\)/gv)) {
            expect(ids).toContain(reference.groups?.["id"]);
        }

        expect(svg).not.toMatch(/@import|url\((?!#)/v);
    });

    it("namespaces local gradient, mask, and use references together", () => {
        expect.hasAssertions();

        const source =
            '<defs><linearGradient id="color"><stop offset="0" stop-color="#fff"/></linearGradient><mask id="cut"><rect width="64" height="64" fill="#fff"/></mask><path id="leaf" d="M0 0L10 10"/></defs><use href="#leaf" fill="url(#color)" mask="url(#cut)"/>';
        const result = namespaceArtwork(source, "test-portrait-");

        expect(result).toContain('id="test-portrait-color"');
        expect(result).toContain('id="test-portrait-cut"');
        expect(result).toContain('id="test-portrait-leaf"');
        expect(result).toContain('href="#test-portrait-leaf"');
        expect(result).toContain('fill="url(#test-portrait-color)"');
        expect(result).toContain('mask="url(#test-portrait-cut)"');
    });

    it.each([
        '<script>alert("test")</script>',
        "<style>text { display: none; }</style>",
        '<image href="https://example.invalid/plant.svg"/>',
        '<path onclick="alert(1)" d="M0 0"/>',
        '<path style="fill:red" d="M0 0"/>',
        '<use href="https://example.invalid/plant.svg#leaf"/>',
        '<path fill="url(https://example.invalid/paint.svg#color)" d="M0 0"/>',
        '<path id="leaf"/><path id="leaf"/>',
        '<use href="#missing"/>',
    ])(
        "rejects unsafe or unresolved artwork before it enters the page: %s",
        (source) => {
            expect.hasAssertions();

            expect(() => namespaceArtwork(source, "test-portrait-")).toThrow(
                /artwork/iv
            );
        }
    );

    it.each([
        [
            "decimal entity in paint token",
            '<path fill="u&#114;l(https://example.invalid/paint.svg#color)" d="M0 0"/>',
        ],
        [
            "hexadecimal entity in paint token",
            '<path fill="u&#x72;l(https://example.invalid/paint.svg#color)" d="M0 0"/>',
        ],
        [
            "named entities around a paint URL",
            '<path fill="url(&quot;https://example.invalid/paint.svg#color&quot;)" d="M0 0"/>',
        ],
        ["encoded local fragment", '<path id="leaf"/><use href="&#35;leaf"/>'],
        ["encoded definition ID", '<path id="lea&#102;"/><use href="#leaf"/>'],
        [
            "CSS escape in paint token",
            String.raw`<path fill="u\72l(https://example.invalid/paint.svg#color)" d="M0 0"/>`,
        ],
        [
            "CSS escape with whitespace terminator",
            String.raw`<path fill="\75 rl(https://example.invalid/paint.svg#color)" d="M0 0"/>`,
        ],
    ])(
        "rejects %s before browser decoding can expose a reference",
        (_description, source) => {
            expect.hasAssertions();

            expect(() => namespaceArtwork(source, "test-portrait-")).toThrow(
                "Encoded values are not allowed in artwork attributes."
            );
        }
    );
});
