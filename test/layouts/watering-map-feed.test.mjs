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

/** @param {string[][]} [records] */
function versionTwoRows(
    records = [
        [
            "2026-11-01",
            "P01",
            "Water",
            "Active",
            "",
            "Yes",
            "1",
            "water-1",
            "",
        ],
    ]
) {
    const count = String(records.length);
    const blankFields = Array.from({ length: 9 }, () => "");
    return [
        [
            ...headers.slice(0, 5),
            "Nutrients used",
            "Pot setup",
            "Observation ID",
            "Corrects observation ID",
            ...headers.slice(5),
        ],
        [
            ...blankFields,
            "2",
            "Ready",
            count,
        ],
        ...records.map((record) => [
            ...record,
            "",
            "",
            "",
        ]),
        [
            ...blankFields,
            "2",
            "End",
            count,
        ],
    ];
}

describe("compact watering map projection", () => {
    it("retains version 2 nutrient evidence and correction lineage in physical ledger order", () => {
        expect.hasAssertions();

        const records = [
            [
                "2026-11-01",
                "P01",
                "Water",
                "Removed",
                "",
                "Yes",
                "1",
                "original",
                "",
            ],
            [
                "2026-11-01",
                "P01",
                "Water",
                "Active",
                "",
                "No",
                "2",
                "later",
                "",
            ],
            [
                "2026-11-01",
                "P01",
                "Water",
                "Active",
                "",
                "",
                "1",
                "replacement",
                "original",
            ],
            [
                "2026-11-02",
                "P01",
                "Move",
                "Active",
                'Shelf, "room" side',
                "",
                "2",
                "move",
                "",
            ],
            [
                "2026-11-03",
                "P02",
                "Water",
                "Active",
                "",
                "not recorded",
                "1",
                "unknown",
                "",
            ],
        ];
        const feed = decodeWateringFeed(csv(versionTwoRows(records)));

        expect(feed.version).toBe(2);
        expect(feed.history.map((event) => event._index)).toStrictEqual([
            0,
            1,
            2,
            3,
            4,
        ]);
        expect(
            feed.history.map((event) => event["Nutrients used"])
        ).toStrictEqual([
            "Yes",
            "No",
            "",
            "",
            "not recorded",
        ]);
        expect(feed.history[0]).toMatchObject({
            "Observation ID": "original",
            "Record status": "Removed",
        });
        expect(feed.history[2]).toMatchObject({
            "Corrects observation ID": "original",
            "Observation ID": "replacement",
            "Pot setup": "1",
        });
        expect(feed.history[3]?.["New location"]).toBe('Shelf, "room" side');
    });

    it("accepts complete empty version 2 and retains version 1 without inventing nutrient evidence", () => {
        expect.hasAssertions();

        const empty = csv(versionTwoRows([]));

        expect(decodeWateringFeed(empty)).toStrictEqual({
            history: [],
            version: 2,
        });

        const legacy = decodeWateringFeed(csv(feedRows()));

        expect(legacy.version).toBe(1);
        expect(legacy.history[0]).not.toHaveProperty("Nutrients used");
        expect(legacy.history[0]).not.toHaveProperty("Observation ID");
    });

    it.each([
        [
            "incorrect version",
            1,
            9,
            "3",
        ],
        [
            "mixed footer version",
            3,
            9,
            "1",
        ],
        [
            "missing record count",
            1,
            11,
            "",
        ],
        [
            "mismatched record count",
            1,
            11,
            "2",
        ],
        [
            "mismatched footer count",
            3,
            11,
            "2",
        ],
        [
            "source data in boundary",
            1,
            5,
            "Yes",
        ],
        [
            "metadata inside a record",
            2,
            9,
            "2",
        ],
        [
            "incorrect nutrient header",
            0,
            5,
            "Fertilizer",
        ],
        [
            "incorrect correction header",
            0,
            8,
            "Corrects",
        ],
        [
            "error status",
            1,
            10,
            "#REF!",
        ],
    ])(
        "rejects version 2 with %s",
        (_description, rowIndex, columnIndex, replacement) => {
            expect.hasAssertions();

            const malformed = versionTwoRows().map((row, index) =>
                index === rowIndex
                    ? row.map((value, column) =>
                          column === columnIndex ? replacement : value
                      )
                    : row
            );

            expect(() => decodeWateringFeed(csv(malformed))).toThrow(
                /watering map feed/v
            );
        }
    );

    it("rejects truncated version 2 records and footer fields even when the row count still matches", () => {
        expect.hasAssertions();

        for (const rowIndex of [2, 3]) {
            const truncated = versionTwoRows().map((row, index) =>
                index === rowIndex ? row.slice(0, -1) : row
            );

            expect(() => decodeWateringFeed(csv(truncated))).toThrow(
                /watering map feed/v
            );
        }

        expect(() =>
            decodeWateringFeed(csv(versionTwoRows()).slice(0, -1))
        ).toThrow(/watering map feed/v);
    });

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

    it("upgrades a live version 1 read to version 2 without changing fertilizer evidence or accepting a partial refresh", async () => {
        expect.hasAssertions();

        const { loader, response } = await loaderFixture();
        const legacy = await loader.loadWateringMapSnapshot();

        expect(legacy.history[0]).not.toHaveProperty("Nutrients used");

        response.csv = csv(versionTwoRows());
        const current = await loader.loadWateringMapSnapshot();

        expect(current.history[0]?.["Nutrients used"]).toBe("Yes");
        expect(current.readAt).toBeGreaterThanOrEqual(legacy.readAt);

        response.csv = csv(versionTwoRows().slice(0, -1));

        await expect(loader.loadWateringMapSnapshot()).rejects.toThrow(
            "incomplete or invalid"
        );
        expect(loader.getSavedWateringMapData()).toStrictEqual(current);
    });
});
