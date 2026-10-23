import { describe, expect, it, onTestFinished, vi } from "vitest";

import { createSheetSnapshotCache } from "../../docs/layouts/plant-sheet-cache.js";
import {
    getSavedCollectionData,
    loadCollectionSnapshot,
    sheetUrls,
} from "../../docs/layouts/plant-tracker-data.js";

const key = "gardening-public-sheet-snapshot-v1";
const sourceKey = "schema-v1:https://example.test/workbook?gid=1&output=csv";
function fixture() {
    const clock = { value: 1_000_000 };
    /** @type {Map<string, string>} */
    const values = new Map();
    const storage = {
        /** @param {string} item */
        getItem: (item) => values.get(item) ?? null,
        /** @param {string} item */
        removeItem: (item) => {
            values.delete(item);
        },
        /** @param {string} item @param {string} value */
        setItem: (item, value) => {
            values.set(item, value);
        },
    };
    const load = vi.fn(() => Promise.resolve("validated source"));
    const options = {
        load,
        now: () => clock.value,
        sourceKey,
        storage: () => storage,
        validate: isText,
    };
    return {
        cache: createSheetSnapshotCache(options),
        clock,
        load,
        options,
        storage,
        values,
    };
}

/** @param {unknown} value @returns {value is string} */
function isText(value) {
    return typeof value === "string";
}

describe("public Sheet snapshot cache", () => {
    it("keeps independently keyed snapshots separate when one stored payload is invalid", async () => {
        expect.hasAssertions();

        const { cache, options, values } = fixture();
        const historyCache = createSheetSnapshotCache({
            ...options,
            load: () => Promise.resolve("history only"),
            storageKey: "history-test-snapshot",
        });
        await cache.refresh();
        const original = values.get(key);
        await historyCache.refresh();

        expect(values.get(key)).toBe(original);
        expect(values.size).toBe(2);
        expect(historyCache.saved()?.data).toBe("history only");
        expect(cache.saved()?.data).toBe("validated source");

        values.set("history-test-snapshot", "{broken");

        expect(
            createSheetSnapshotCache({
                ...options,
                storageKey: "history-test-snapshot",
            }).saved()
        ).toBeNull();
        expect(createSheetSnapshotCache(options).saved()?.data).toBe(
            "validated source"
        );
    });

    it("shows a saved source on the next page without requiring a new request", async () => {
        expect.hasAssertions();

        const { cache, load, options } = fixture();

        expect(cache.saved()).toBeNull();

        await cache.refresh();
        const nextPage = createSheetSnapshotCache(options);

        expect(nextPage.saved()).toStrictEqual({
            data: "validated source",
            readAt: 1_000_000,
            startedAt: 1_000_000,
        });
        expect(load).toHaveBeenCalledTimes(1);
    });

    it("shares simultaneous refreshes and retains a successful snapshot after failure", async () => {
        expect.hasAssertions();

        const { cache, load } = fixture();
        await Promise.all([cache.refresh(), cache.refresh()]);

        expect(load).toHaveBeenCalledTimes(1);

        load.mockRejectedValueOnce(new Error("offline"));

        await expect(cache.refresh()).rejects.toThrow("offline");
        expect(cache.saved()?.data).toBe("validated source");

        load.mockResolvedValueOnce("recovered source");

        expect((await cache.refresh()).data).toBe("recovered source");
    });

    it("allows successful empty data to replace an older snapshot", async () => {
        expect.hasAssertions();

        const { cache, clock, load, options } = fixture();
        await cache.refresh();
        clock.value += 100;
        load.mockResolvedValueOnce("");
        await cache.refresh();

        expect(createSheetSnapshotCache(options).saved()?.data).toBe("");
    });

    it.each([
        ["corrupted JSON", "{broken"],
        [
            "wrong source",
            JSON.stringify({
                data: "old",
                readAt: 999_999,
                sourceKey: "another-workbook",
                startedAt: 999_990,
                version: 1,
            }),
        ],
        [
            "wrong schema",
            JSON.stringify({
                data: "old",
                readAt: 999_999,
                sourceKey,
                startedAt: 999_990,
                version: 2,
            }),
        ],
        [
            "future clock",
            JSON.stringify({
                data: "old",
                readAt: 1_000_001,
                sourceKey,
                startedAt: 999_990,
                version: 1,
            }),
        ],
        [
            "invalid payload",
            JSON.stringify({
                data: 42,
                readAt: 999_999,
                sourceKey,
                startedAt: 999_990,
                version: 1,
            }),
        ],
        [
            "invalid ordering",
            JSON.stringify({
                data: "old",
                readAt: 999_990,
                sourceKey,
                startedAt: 999_999,
                version: 1,
            }),
        ],
    ])("ignores %s", (_description, raw) => {
        expect.hasAssertions();

        const { cache, values } = fixture();
        values.set(key, raw);

        expect(cache.saved()).toBeNull();
    });

    it("expires memory and disk snapshots after one day", async () => {
        expect.hasAssertions();

        const { cache, clock, options } = fixture();
        await cache.refresh();
        clock.value += 86_400_001;

        expect(cache.saved()).toBeNull();
        expect(createSheetSnapshotCache(options).saved()).toBeNull();
    });

    it("keeps a newer request when a slower previous request finishes later", async () => {
        expect.hasAssertions();

        const { clock, options } = fixture();
        const first = deferredSource();
        const second = deferredSource();
        const older = createSheetSnapshotCache({
            ...options,
            load: () => first.promise,
        });
        const newer = createSheetSnapshotCache({
            ...options,
            load: () => second.promise,
        });
        const oldRequest = older.refresh();
        clock.value += 100;
        const newRequest = newer.refresh();
        second.resolve("newer source");
        await newRequest;
        clock.value += 100;
        first.resolve("older source");

        expect((await oldRequest).data).toBe("newer source");
        expect(createSheetSnapshotCache(options).saved()?.data).toBe(
            "newer source"
        );
    });

    it("does not turn denied storage or quota errors into network failures", async () => {
        expect.hasAssertions();

        const { options, storage } = fixture();
        const denied = createSheetSnapshotCache({
            ...options,
            storage: () => {
                throw new Error("denied");
            },
        });

        expect((await denied.refresh()).data).toBe("validated source");

        const full = createSheetSnapshotCache({
            ...options,
            storage: () => ({
                ...storage,
                setItem: () => {
                    throw new Error("quota");
                },
            }),
        });
        await full.refresh();

        expect(full.saved()?.data).toBe("validated source");
    });

    it("does not retain oversized snapshots", async () => {
        expect.hasAssertions();

        const { cache, load, values } = fixture();
        load.mockResolvedValueOnce("a".repeat(1_048_576));

        expect((await cache.refresh()).data).toHaveLength(1_048_576);
        expect(cache.saved()).toBeNull();
        expect(values.has(key)).toBe(false);
    });

    it("does not persist synthetic Storybook reads into browser storage", async () => {
        expect.hasAssertions();

        const { options, storage, values } = fixture();
        vi.stubGlobal(
            "location",
            new URL("https://example.test/Gardening/storybook/preview/tracker/")
        );
        vi.stubGlobal("localStorage", storage);
        onTestFinished(() => {
            vi.unstubAllGlobals();
        });
        const cache = createSheetSnapshotCache({
            load: options.load,
            sourceKey,
            validate: isText,
        });
        await cache.refresh();

        expect(values.size).toBe(0);
    });

    it.each([
        ["HTML error", "<html>Sign in</html>"],
        [
            "truncated quoted CSV",
            'Date,Plant ID,Event,Weight (g)\n2026-09-01,P02,Weight,"450',
        ],
    ])(
        "rejects %s without losing saved observations, then accepts an empty feed",
        async (_description, invalid) => {
            expect.hasAssertions();

            const trackerHeaders = "Plant ID,Plant / planter,Current pot label";
            const historyHeaders = "Date,Plant ID,Event,Weight (g)";
            const source = {
                history: `${historyHeaders}\n2026-09-01,P02,Weight,450`,
                plants: `${trackerHeaders}\nP02,Feather cactus,A2`,
            };
            vi.stubGlobal(
                "fetch",
                vi.fn((url) =>
                    Promise.resolve(
                        new Response(
                            String(url).includes("gid=0&")
                                ? source.plants
                                : source.history
                        )
                    )
                )
            );
            onTestFinished(() => {
                vi.unstubAllGlobals();
            });
            const initial = await loadCollectionSnapshot();

            expect(initial.collection.history).toHaveLength(1);

            source.history = invalid;

            await expect(loadCollectionSnapshot()).rejects.toThrow(
                "expected columns"
            );
            expect(getSavedCollectionData()?.collection.history).toHaveLength(
                1
            );

            source.history = historyHeaders;
            const empty = await loadCollectionSnapshot();

            expect(empty.collection.history).toHaveLength(0);
            expect(
                empty.collection.plants[0]?.summary.latestWeight
            ).toBeUndefined();
        }
    );
});

/** @returns {PromiseWithResolvers<string>} */
function deferredSource() {
    // eslint-disable-next-line canonical/no-use-extend-native -- Promise.withResolvers is a standard ES2024 API available in the required Node 26 runtime.
    return Promise.withResolvers();
}

describe("history-only Sheet loading", () => {
    it("loads canonical history without requesting the tracker and preserves the saved read time on failure", async () => {
        expect.hasAssertions();

        const { storage, values } = fixture();
        const savedAt = Date.now() - 60_000;
        const collectionSourceKey = JSON.stringify({
            history: sheetUrls.historyCsv,
            schema: "collection-csv-v1",
            tracker: sheetUrls.trackerCsv,
        });
        const savedCollection = JSON.stringify({
            data: {
                history: "Date,Plant ID,Event\n2026-09-01,P01,Water",
                plants: "Plant ID,Plant / planter\nP01,Cactus",
            },
            readAt: savedAt,
            sourceKey: collectionSourceKey,
            startedAt: savedAt,
            version: 1,
        });
        values.set(key, savedCollection);
        values.set(
            "gardening-public-history-snapshot-v1",
            JSON.stringify({
                data: "Plant ID,Plant / planter\nP01,Cactus",
                readAt: savedAt + 1000,
                sourceKey: JSON.stringify({
                    history: sheetUrls.historyCsv,
                    schema: "history-csv-v1",
                }),
                startedAt: savedAt + 1000,
                version: 1,
            })
        );
        vi.stubGlobal(
            "location",
            new URL("https://example.test/Gardening/setup/placement/")
        );
        vi.stubGlobal("localStorage", storage);
        const source = {
            csv: "Date,Plant ID,Event\n2026-09-02,P01,Water",
            fail: false,
        };
        const fetch = vi.fn((url) => {
            const requested = new URL(String(url));
            requested.searchParams.delete("refresh");
            if (requested.href !== sheetUrls.historyCsv)
                throw new Error("Unexpected tracker dependency");
            if (source.fail) return Promise.reject(new Error("offline"));
            return Promise.resolve(new Response(source.csv));
        });
        vi.stubGlobal("fetch", fetch);
        onTestFinished(() => {
            vi.unstubAllGlobals();
        });
        // Separate module instances model a fresh page without sharing memory from other tests.
        const moduleUrl = new URL(
            "../../docs/layouts/plant-tracker-data.js?history-only-cache-test",
            import.meta.url
        );
        /** @type {typeof import("../../docs/layouts/plant-tracker-data.js")} */
        // eslint-disable-next-line no-unsanitized/method -- Fixed repository URL; the literal query isolates this page's cache from other test module instances.
        const historyModule = await import(moduleUrl.href);
        const saved = historyModule.getSavedHistoryData();

        expect(saved?.readAt).toBe(savedAt);
        expect(saved?.history[0]).toMatchObject({
            _index: 0,
            Date: "2026-09-01",
            Event: "Water",
            "Plant ID": "P01",
        });
        expect(fetch).not.toHaveBeenCalled();

        const fresh = await historyModule.loadHistorySnapshot();

        expect(fetch).toHaveBeenCalledExactlyOnceWith(
            expect.stringContaining(`${sheetUrls.historyCsv}&refresh=`),
            expect.anything()
        );
        expect(fresh.history[0]).toMatchObject({
            _index: 0,
            Date: "2026-09-02",
            Event: "Water",
            "Plant ID": "P01",
        });
        expect(fresh.readAt).toBeGreaterThan(savedAt);
        expect(values.get(key)).toBe(savedCollection);
        expect(values.has("gardening-public-history-snapshot-v1")).toBe(true);

        source.fail = true;

        await expect(historyModule.loadHistorySnapshot()).rejects.toThrow(
            "offline"
        );
        expect(historyModule.getSavedHistoryData()).toStrictEqual(fresh);

        source.fail = false;
        source.csv = "Plant ID,Plant / planter\nP01,Cactus";

        await expect(historyModule.loadHistorySnapshot()).rejects.toThrow(
            "expected columns"
        );
        expect(historyModule.getSavedHistoryData()?.readAt).toBe(fresh.readAt);

        source.csv = "Date,Plant ID,Event";

        expect(
            (await historyModule.loadHistorySnapshot()).history
        ).toStrictEqual([]);
    });
});
