import { describe, expect, it, onTestFinished, vi } from "vitest";

import { createSheetSnapshotCache } from "../../docs/layouts/plant-sheet-cache.js";
import {
    getSavedCollectionData,
    loadCollectionSnapshot,
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
