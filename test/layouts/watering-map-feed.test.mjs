import { describe, expect, it, onTestFinished, vi } from "vitest";

import { buildWateringMap } from "../../site/client/tools/watering-map-data.js";
import { decodeWateringFeed } from "../../site/client/tools/watering-map-feed.js";

const headers = [
    "Date",
    "Plant ID",
    "Event",
    "Record status",
    "New location",
    "Feed version",
    "Feed status",
    "Record count",
];
const sequence = { value: 0 };
const placements = [
    {
        id: "P01",
        label: "A1",
        name: "Synthetic cactus",
        position: "Front",
        x: 100,
        y: 100,
        zone: /** @type {const} */ ("front"),
    },
];

/** @param {string[][]} rows */
function csv(rows) {
    return rows
        .map((row) =>
            row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")
        )
        .join("\n");
}

/** @param {string[][]} [records] */
function feedRows(
    records = [
        [
            "2026-11-01",
            "P01",
            "Water",
            "Active",
            "",
            "",
            "",
            "",
        ],
    ]
) {
    const count = String(records.length);
    return [
        headers,
        [
            "",
            "",
            "",
            "",
            "",
            "1",
            "Ready",
            count,
        ],
        ...records,
        [
            "",
            "",
            "",
            "",
            "",
            "1",
            "End",
            count,
        ],
    ];
}

async function loaderFixture() {
    const response = { csv: csv(feedRows()) };
    const fetch = vi.fn(
        /** @type {typeof globalThis.fetch} */ (
            () => Promise.resolve(new Response(response.csv))
        )
    );
    vi.stubGlobal("fetch", fetch);
    onTestFinished(() => {
        vi.unstubAllGlobals();
    });
    const url = new URL(
        `../../site/client/tools/watering-map-feed.js?feed-test-${sequence.value++}`,
        import.meta.url
    );
    /** @type {typeof import("../../site/client/tools/watering-map-feed.js")} */
    // eslint-disable-next-line no-unsanitized/method -- Fixed repository module; the counter isolates each page's private feed cache.
    const loader = await import(url.href);
    return { fetch, loader, response };
}

describe("compact watering map projection", () => {
    it("retains canonical ordering and removed/future observations for the existing map semantics", () => {
        expect.hasAssertions();

        vi.useFakeTimers({ toFake: ["Date"] });
        onTestFinished(() => {
            vi.useRealTimers();
        });

        const source = csv(
            feedRows([
                [
                    "2026-11-01",
                    "P01",
                    "Water",
                    "Active",
                    "",
                    "",
                    "",
                    "",
                ],
                [
                    "2026-11-02",
                    "P01",
                    "Water",
                    "Removed",
                    "",
                    "",
                    "",
                    "",
                ],
                [
                    "2026-11-03T21:00:00.000",
                    "P01",
                    "Water",
                    "Active",
                    "",
                    "",
                    "",
                    "",
                ],
                [
                    "2026-11-03T12:00:00.000",
                    "P01",
                    "Move",
                    "Active",
                    'Window, "bright" side',
                    "",
                    "",
                    "",
                ],
            ])
        );
        const feed = decodeWateringFeed(source);

        expect(feed.history.map((event) => event._index)).toStrictEqual([
            0,
            1,
            2,
            3,
        ]);
        expect(feed.history[1]?.["Record status"]).toBe("Removed");

        const beforeFutureObservation = Temporal.Instant.from(
            "2026-11-03T20:00:00Z"
        );
        vi.setSystemTime(beforeFutureObservation.epochMilliseconds);
        const currentMap = buildWateringMap(placements, feed.history);

        expect(currentMap.markers[0]).toMatchObject({
            currentLocation: 'Window, "bright" side',
            days: 2,
            lastWater: "2026-11-01",
        });

        const afterFutureObservation = Temporal.Instant.from(
            "2026-11-04T03:00:00Z"
        );
        vi.setSystemTime(afterFutureObservation.epochMilliseconds);
        const updatedMap = buildWateringMap(placements, feed.history);

        expect(updatedMap.markers[0]).toMatchObject({
            days: 0,
            lastWater: "2026-11-03",
        });
    });

    it("accepts a complete explicitly empty projection", () => {
        expect.hasAssertions();

        const source = csv(feedRows([]));

        expect(decodeWateringFeed(source)).toStrictEqual({
            history: [],
            version: 1,
        });
    });

    it.each([
        ["missing terminal marker", () => feedRows().slice(0, -1)],
        [
            "wrong schema version",
            () => [
                headers,
                [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "2",
                    "Ready",
                    "0",
                ],
                [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "2",
                    "End",
                    "0",
                ],
            ],
        ],
        [
            "mismatched record count",
            () => [
                headers,
                [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "1",
                    "Ready",
                    "1",
                ],
                [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "1",
                    "End",
                    "1",
                ],
            ],
        ],
        [
            "mismatched footer count",
            () => [
                headers,
                [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "1",
                    "Ready",
                    "0",
                ],
                [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "1",
                    "End",
                    "1",
                ],
            ],
        ],
        [
            "formula error status",
            () => [
                headers,
                [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "1",
                    "#REF!",
                    "0",
                ],
                [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "1",
                    "End",
                    "0",
                ],
            ],
        ],
        [
            "unexpected header",
            () => [["Timestamp", ...headers.slice(1)], ...feedRows().slice(1)],
        ],
        [
            "duplicate header",
            () => [
                [
                    "Date",
                    "Date",
                    ...headers.slice(2),
                ],
                ...feedRows().slice(1),
            ],
        ],
        [
            "records after terminal marker",
            () => [
                ...feedRows(),
                [
                    "2026-11-02",
                    "P01",
                    "Water",
                    "Active",
                    "",
                    "",
                    "",
                    "",
                ],
            ],
        ],
        [
            "data in metadata fields",
            () =>
                feedRows([
                    [
                        "2026-11-01",
                        "P01",
                        "Water",
                        "Active",
                        "",
                        "1",
                        "Ready",
                        "1",
                    ],
                ]),
        ],
        [
            "unrelated event",
            () =>
                feedRows([
                    [
                        "2026-11-01",
                        "P01",
                        "Weight",
                        "Active",
                        "",
                        "",
                        "",
                        "",
                    ],
                ]),
        ],
        [
            "invalid calendar date",
            () =>
                feedRows([
                    [
                        "2026-02-31",
                        "P01",
                        "Water",
                        "Active",
                        "",
                        "",
                        "",
                        "",
                    ],
                ]),
        ],
        [
            "invalid plant ID",
            () =>
                feedRows([
                    [
                        "2026-11-01",
                        "P1",
                        "Water",
                        "Active",
                        "",
                        "",
                        "",
                        "",
                    ],
                ]),
        ],
        [
            "truncated row",
            () =>
                feedRows([
                    [
                        "2026-11-01",
                        "P01",
                        "Water",
                        "Active",
                    ],
                ]),
        ],
    ])("rejects %s", (_description, makeRows) => {
        expect.hasAssertions();
        expect(() => decodeWateringFeed(csv(makeRows()))).toThrow(
            /watering map feed/v
        );
    });

    it.each([
        "<html>Sign in</html>",
        '"Date","Plant ID","Event',
        "#N/A",
        "",
    ])("rejects incomplete or non-CSV content: %s", (source) => {
        expect.hasAssertions();
        expect(() => decodeWateringFeed(source)).toThrow(/watering map feed/v);
    });

    it("loads only the compact source, shares simultaneous requests, and keeps its true read time after invalid responses", async () => {
        expect.hasAssertions();

        const { fetch, loader, response } = await loaderFixture();
        const before = Date.now();
        const [first, concurrent] = await Promise.all([
            loader.loadWateringMapSnapshot(),
            loader.loadWateringMapSnapshot(),
        ]);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0]?.[0]).toContain("gid=907202615");
        expect(first.readAt).toBeGreaterThanOrEqual(before);
        expect(concurrent).toStrictEqual(first);

        response.csv = csv(feedRows().slice(0, -1));

        await expect(loader.loadWateringMapSnapshot()).rejects.toThrow(
            "incomplete or invalid"
        );
        expect(loader.getSavedWateringMapData()).toStrictEqual(first);

        response.csv = csv(feedRows([]));

        expect((await loader.loadWateringMapSnapshot()).history).toStrictEqual(
            []
        );
    });
});
