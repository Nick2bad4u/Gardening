import { describe, expect, it, onTestFinished, vi } from "vitest";

const historyCsv = "Date,Plant ID,Event\n2026-10-01,P01,Water";
const fixtureSequence = { value: 0 };

/**
 * @param {number} milliseconds @param {Response} response @returns
 *   {Promise<Response>}
 */
async function delayedResponse(milliseconds, response) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(response);
        }, milliseconds);
    });
}

async function fixture() {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
        const controller = new AbortController();
        setTimeout(() => {
            controller.abort(
                new DOMException("Sheet read timed out", "TimeoutError")
            );
        }, milliseconds);
        return controller.signal;
    });
    const fetch = vi.fn(
        /** @type {typeof globalThis.fetch} */ (
            () => Promise.resolve(new Response(historyCsv))
        )
    );
    vi.stubGlobal("fetch", fetch);
    onTestFinished(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });
    const moduleUrl = new URL(
        `../../docs/layouts/plant-tracker-data.js?csv-request-test-${fixtureSequence.value++}`,
        import.meta.url
    );
    /** @type {typeof import("../../docs/layouts/plant-tracker-data.js")} */
    // eslint-disable-next-line no-unsanitized/method -- Fixed repository module; a counter isolates each test's in-memory cache.
    const data = await import(moduleUrl.href);
    return { data, fetch };
}

/** @param {AbortSignal | null | undefined} signal @returns {Promise<Response>} */
async function pendingFetch(signal) {
    return new Promise((_resolve, reject) => {
        signal?.addEventListener(
            "abort",
            () => {
                reject(
                    new DOMException("Sheet read timed out", "TimeoutError")
                );
            },
            {
                once: true,
            }
        );
    });
}

describe("public Sheet request budget", () => {
    it("allows a response after the old 20-second cutoff and shares concurrent reads", async () => {
        expect.hasAssertions();

        const { data, fetch } = await fixture();
        fetch.mockReturnValueOnce(
            delayedResponse(25_000, new Response(historyCsv))
        );
        const first = data.loadHistorySnapshot();
        const second = data.loadHistorySnapshot();
        await vi.advanceTimersByTimeAsync(20_001);

        expect(data.getSavedHistoryData()).toBeNull();

        await vi.advanceTimersByTimeAsync(4999);
        const [initial, shared] = await Promise.all([first, second]);

        expect(initial.history).toHaveLength(1);
        expect(shared.readAt).toBe(initial.readAt);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0]?.[0]).toContain("gid=1465181080");
    });

    it("aborts a stalled response body at the total deadline without retrying", async () => {
        expect.hasAssertions();

        const { data, fetch } = await fixture();
        fetch.mockImplementationOnce((_url, init) => {
            const body = new ReadableStream({
                start(controller) {
                    init?.signal?.addEventListener(
                        "abort",
                        () => {
                            controller.error(init.signal?.reason);
                        },
                        { once: true }
                    );
                },
            });
            return Promise.resolve(new Response(body));
        });
        await Promise.all([
            expect(data.loadHistorySnapshot()).rejects.toMatchObject({
                name: "TimeoutError",
            }),
            vi.advanceTimersByTimeAsync(60_000),
        ]);

        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("accepts a slow body that finishes after 20 seconds within the shared budget", async () => {
        expect.hasAssertions();

        const { data, fetch } = await fixture();
        const body = new ReadableStream({
            start(controller) {
                setTimeout(() => {
                    const encoder = new TextEncoder();
                    controller.enqueue(encoder.encode(historyCsv));
                    controller.close();
                }, 25_000);
            },
        });
        fetch.mockResolvedValueOnce(new Response(body));
        const result = data.loadHistorySnapshot();
        await vi.advanceTimersByTimeAsync(25_000);

        expect((await result).history).toHaveLength(1);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("retries a network failure while downloading a response body", async () => {
        expect.hasAssertions();

        const { data, fetch } = await fixture();
        const body = new ReadableStream({
            start(controller) {
                controller.error(new TypeError("Connection interrupted"));
            },
        });
        fetch.mockResolvedValueOnce(new Response(body));
        const result = data.loadHistorySnapshot();
        await vi.advanceTimersByTimeAsync(1000);

        expect((await result).history).toHaveLength(1);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it.each([
        408,
        500,
        502,
        503,
        504,
    ])("recovers from HTTP %s once after one second", async (status) => {
        expect.hasAssertions();

        const { data, fetch } = await fixture();
        fetch.mockResolvedValueOnce(
            new Response("Temporary Google error", { status })
        );
        const result = data.loadHistorySnapshot();
        await vi.advanceTimersByTimeAsync(999);

        expect(fetch).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1);

        expect((await result).history).toHaveLength(1);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch.mock.calls[1]?.[1]?.signal).toBe(
            fetch.mock.calls[0]?.[1]?.signal
        );
    });

    it("recovers once from a network TypeError", async () => {
        expect.hasAssertions();

        const { data, fetch } = await fixture();
        fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
        const result = data.loadHistorySnapshot();
        await vi.advanceTimersByTimeAsync(1000);

        expect((await result).history).toHaveLength(1);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it.each([
        401,
        403,
        404,
        429,
    ])("does not retry terminal HTTP %s", async (status) => {
        expect.hasAssertions();

        const { data, fetch } = await fixture();
        fetch.mockResolvedValueOnce(new Response("Unavailable", { status }));

        await expect(data.loadHistorySnapshot()).rejects.toThrow(
            `Google Sheets returned ${status}.`
        );
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("retains saved observations and their source-read time after both attempts fail", async () => {
        expect.hasAssertions();

        const { data, fetch } = await fixture();
        const saved = await data.loadHistorySnapshot();
        await vi.advanceTimersByTimeAsync(5000);
        fetch.mockResolvedValue(
            new Response("Temporary Google error", { status: 503 })
        );
        await Promise.all([
            expect(data.loadHistorySnapshot()).rejects.toThrow(
                "Google Sheets returned 503."
            ),
            vi.advanceTimersByTimeAsync(1000),
        ]);

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(data.getSavedHistoryData()).toStrictEqual(saved);
    });

    it("does not reset the deadline for a second attempt", async () => {
        expect.hasAssertions();

        const { data, fetch } = await fixture();
        fetch.mockReturnValueOnce(
            delayedResponse(35_000, new Response("Temporary", { status: 503 }))
        );
        fetch.mockImplementationOnce((_url, init) =>
            pendingFetch(init?.signal)
        );
        await Promise.all([
            expect(data.loadHistorySnapshot()).rejects.toMatchObject({
                name: "TimeoutError",
            }),
            vi.advanceTimersByTimeAsync(60_000),
        ]);

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("stops at the deadline if it expires during the retry delay", async () => {
        expect.hasAssertions();

        const { data, fetch } = await fixture();
        fetch.mockReturnValueOnce(
            delayedResponse(59_500, new Response("Temporary", { status: 503 }))
        );
        await Promise.all([
            expect(data.loadHistorySnapshot()).rejects.toMatchObject({
                name: "TimeoutError",
            }),
            vi.advanceTimersByTimeAsync(60_000),
        ]);

        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
