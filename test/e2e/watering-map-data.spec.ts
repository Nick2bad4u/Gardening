import { expect, type Locator, type Page, test } from "@playwright/test";

const mapPath = "/Gardening/setup/placement/#watering-map";
const refreshName = "Refresh data";
const initialWaterDate = "2026-11-01";
const sourceStateAttribute = "data-state";
const historyHeader =
    "Date,Plant ID,Event,Record status,New location,Feed version,Feed status,Record count";

interface HistoryResponse {
    blocked: boolean;
    failed: boolean;
    invalid?: boolean;
    waterDate: string;
}

function createNetworkGate() {
    const events = new EventTarget();
    const controller = new AbortController();
    let isReleased = false;
    return {
        release() {
            isReleased = true;
            events.dispatchEvent(new Event("release"));
            controller.abort();
        },
        async wait() {
            if (isReleased) return;
            await new Promise<void>((resolve) => {
                events.addEventListener(
                    "release",
                    () => {
                        resolve();
                    },
                    { once: true, signal: controller.signal }
                );
            });
        },
    };
}

function details(page: Readonly<Page>): Locator {
    return page.getByRole("list", {
        includeHidden: true,
        name: "Watering details by pot",
    });
}

async function expectDownloads(page: Readonly<Page>, isAvailable: boolean) {
    const enabled = await page
        .getByRole("button", { name: /^Download (?:PNG|SVG)$/v })
        .evaluateAll((buttons) =>
            buttons.map(
                (button) =>
                    button instanceof HTMLButtonElement && !button.disabled
            )
        );
    expect.soft(enabled).toStrictEqual([isAvailable, isAvailable]);
}

async function expectFailedRead(page: Readonly<Page>) {
    await expect
        .soft(freshness(page))
        .toHaveAttribute(sourceStateAttribute, "error");
    await expectUnavailable(page);
}

async function expectFreshCount(
    page: Readonly<Page>,
    count: string,
    date: string
) {
    await expect
        .configure({ soft: true })
        .poll(async () => {
            const detailsText = await details(page).textContent();
            return {
                count: await mapImage(page).evaluate(
                    (svg) =>
                        svg.querySelector(
                            ':scope [data-pot-id="P01"] text.count'
                        )?.textContent
                ),
                hasWaterDate: detailsText?.includes(`Last Water: ${date}`),
                state: await freshness(page).getAttribute(sourceStateAttribute),
            };
        })
        .toStrictEqual({ count, hasWaterDate: true, state: "live" });
    await expectDownloads(page, true);
}

async function expectIdleRequests(
    page: Readonly<Page>,
    sourceIds: readonly string[],
    count: number
) {
    expect
        .soft({
            isEnabled: await page
                .getByRole("button", { name: refreshName })
                .isEnabled(),
            requests: sourceIds.length,
        })
        .toStrictEqual({ isEnabled: true, requests: count });
}

async function expectUnavailable(page: Readonly<Page>) {
    const counts = await mapImage(page).evaluate((svg) =>
        Array.from(
            svg.querySelectorAll(":scope [data-pot-id] text.count"),
            (count) => count.textContent
        )
    );
    const detailsText = (await details(page).textContent()) ?? "";
    const coverage = await page
        .getByRole("region", { exact: true, name: "Days since watering" })
        .getByRole("definition")
        .allTextContents();
    expect
        .soft({
            counts,
            coverage: coverage.map((value) => value.trim()),
            hasPots: counts.length > 0,
            hasStaleDetails: /Days since watering: \d|Last Water: 2026-/v.test(
                detailsText
            ),
            hasUnavailableDetails: detailsText.includes(
                "Last Water: Unavailable"
            ),
        })
        .toStrictEqual({
            counts: Array.from({ length: counts.length }, () => "—"),
            coverage: [
                String(counts.length),
                "—",
                "—",
            ],
            hasPots: true,
            hasStaleDetails: false,
            hasUnavailableDetails: true,
        });
    await expectDownloads(page, false);
}

function freshness(page: Readonly<Page>): Locator {
    return page.getByRole("status").filter({
        hasText:
            /^(?:Refreshing watering observations|Still waiting for the published Sheet\.|Published observations loaded\.|Watering data (?:expired|unavailable)\.)/v,
    });
}

function mapImage(page: Readonly<Page>): Locator {
    return page.getByRole("img", { name: /^Days since watering/v });
}

async function mockHistory(
    page: Readonly<Page>,
    response: Readonly<HistoryResponse>,
    gate: Readonly<ReturnType<typeof createNetworkGate>>
) {
    const sourceIds: string[] = [];
    await page.clock.setFixedTime("2026-11-03T20:00:00Z");
    await page.route("**://*.googletagmanager.com/**", (route) =>
        route.abort()
    );
    await page.route("https://docs.google.com/**", async (route) => {
        const sourceUrl = new URL(route.request().url());
        const sourceId = sourceUrl.searchParams.get("gid");
        sourceIds.push(sourceId ?? "missing");
        if (sourceId !== "907202615") {
            await route.abort();
            return;
        }
        if (response.blocked) await gate.wait();
        await route.fulfill({
            body: response.failed
                ? "Temporarily unavailable"
                : response.invalid === true
                  ? "#REF!"
                  : `${historyHeader}\n,,,,,1,Ready,1\n${response.waterDate},P01,Water,Active,,,,\n,,,,,1,End,1`,
            contentType: "text/csv",
            status: response.failed ? 503 : 200,
        });
    });
    return sourceIds;
}

test.describe(
    "watering map unavailable observations",
    { tag: "@watering-map" },
    () => {
        test("explains a slow read while keeping counts hidden and clears its delayed notice after success", async ({
            page,
        }) => {
            await page.clock.install({
                time: "2026-11-03T20:00:00Z",
            });
            const gate = createNetworkGate();
            const response: HistoryResponse = {
                blocked: true,
                failed: false,
                waterDate: initialWaterDate,
            };
            await mockHistory(page, response, gate);
            try {
                await page.goto(mapPath);
                await expect
                    .soft(freshness(page))
                    .toContainText("Refreshing watering observations");
                await page.clock.fastForward(10_000);
                await expect
                    .soft(freshness(page))
                    .toContainText("Still waiting for the published Sheet.");
                await expectUnavailable(page);
                gate.release();
                await expectFreshCount(page, "2", response.waterDate);
                response.blocked = false;
                await page.getByRole("button", { name: refreshName }).click();
                await expectFreshCount(page, "2", response.waterDate);
                await page.clock.fastForward(10_000);
                await expect
                    .soft(freshness(page))
                    .toContainText("Published observations loaded.");
            } finally {
                gate.release();
            }
        });

        test("reconnects once after failure, ignores hidden or repeated reconnects, and leaves manual retry available", async ({
            page,
        }) => {
            const gate = createNetworkGate();
            const response: HistoryResponse = {
                blocked: false,
                failed: true,
                waterDate: initialWaterDate,
            };
            const sourceIds = await mockHistory(page, response, gate);
            await page.goto(mapPath);
            await expectFailedRead(page);
            await expect
                .soft(freshness(page))
                .toContainText("Could not reach the published Sheet.");
            await expectIdleRequests(page, sourceIds, 2);
            await page.evaluate(() => {
                Object.defineProperty(document, "visibilityState", {
                    configurable: true,
                    value: "hidden",
                });
                dispatchEvent(new Event("online"));
            });
            await expectIdleRequests(page, sourceIds, 2);
            response.blocked = true;
            try {
                await page.evaluate(() => {
                    Object.defineProperty(document, "visibilityState", {
                        configurable: true,
                        value: "visible",
                    });
                    dispatchEvent(new Event("online"));
                    dispatchEvent(new Event("online"));
                    dispatchEvent(new Event("online"));
                });
                await expect
                    .soft(page.getByRole("button", { name: "Refreshing…" }))
                    .toBeDisabled();
                await expect.poll(() => sourceIds.length).toBe(3);
                await expectUnavailable(page);
                gate.release();
                await expectFailedRead(page);
                await expectIdleRequests(page, sourceIds, 4);
                await page.evaluate(() => dispatchEvent(new Event("online")));
                await expectIdleRequests(page, sourceIds, 4);
                response.failed = false;
                response.blocked = false;
                await page.getByRole("button", { name: refreshName }).click();
                await expectFreshCount(page, "2", response.waterDate);
                await expectIdleRequests(page, sourceIds, 5);
                await page.evaluate(() => dispatchEvent(new Event("online")));
                await expectIdleRequests(page, sourceIds, 5);
            } finally {
                gate.release();
            }
        });

        test("restores fresh counts on reconnect without changing the saved timestamp during failure", async ({
            page,
        }) => {
            const response: HistoryResponse = {
                blocked: false,
                failed: false,
                waterDate: initialWaterDate,
            };
            await mockHistory(page, response, createNetworkGate());
            await page.goto(mapPath);
            await expectFreshCount(page, "2", response.waterDate);
            const saved = await page.evaluate(() =>
                document.defaultView?.localStorage.getItem(
                    "gardening-public-watering-map-snapshot-v1"
                )
            );
            await page.clock.setFixedTime("2026-11-03T20:01:00Z");
            response.failed = true;
            await page.getByRole("button", { name: refreshName }).click();
            await expect
                .soft(freshness(page))
                .toHaveAttribute(sourceStateAttribute, "error");
            await expectUnavailable(page);
            expect
                .soft(
                    await page.evaluate(() =>
                        document.defaultView?.localStorage.getItem(
                            "gardening-public-watering-map-snapshot-v1"
                        )
                    )
                )
                .toBe(saved);
            response.failed = false;
            response.waterDate = "2026-11-02";
            await page.evaluate(() => dispatchEvent(new Event("online")));
            await expectFreshCount(page, "1", response.waterDate);
        });

        test("identifies an invalid published feed without exposing its response", async ({
            page,
        }) => {
            await mockHistory(
                page,
                {
                    blocked: false,
                    failed: false,
                    invalid: true,
                    waterDate: initialWaterDate,
                },
                createNetworkGate()
            );
            await page.goto(mapPath);
            await expect
                .soft(freshness(page))
                .toContainText(
                    "The published watering data is incomplete or invalid."
                );
            await expect.soft(freshness(page)).not.toContainText("#REF!");
            await expectUnavailable(page);
        });

        test("identifies a timed-out read without exposing the browser exception", async ({
            page,
        }) => {
            await page.clock.install({
                time: "2026-11-03T20:00:00Z",
            });
            await page.addInitScript(() => {
                const nativeFetch = fetch.bind(globalThis);
                const syntheticFetch: typeof fetch = (input, init) => {
                    const url = new URL(
                        input instanceof Request ? input.url : String(input),
                        location.href
                    );
                    return url.hostname === "docs.google.com"
                        ? Promise.reject(
                              new DOMException(
                                  "Synthetic private timeout detail",
                                  "TimeoutError"
                              )
                          )
                        : nativeFetch(input, init);
                };
                Object.defineProperty(globalThis, "fetch", {
                    value: syntheticFetch,
                });
            });
            await page.goto(mapPath);
            await expect
                .soft(freshness(page))
                .toContainText("The published Sheet took too long to respond.");
            await expect
                .soft(freshness(page))
                .not.toContainText("Synthetic private timeout detail");
            await expectUnavailable(page);
            await page.clock.fastForward(10_000);
            await expect
                .soft(freshness(page))
                .toContainText("The published Sheet took too long to respond.");
        });

        test("preserves the rendered image during an unchanged minute check", async ({
            page,
        }) => {
            const response: HistoryResponse = {
                blocked: false,
                failed: false,
                waterDate: initialWaterDate,
            };
            const sourceIds = await mockHistory(
                page,
                response,
                createNetworkGate()
            );
            await page.goto(mapPath);
            await expectFreshCount(page, "2", response.waterDate);
            await mapImage(page).evaluate((svg) => {
                svg.dataset["renderPreserved"] = "true";
            });
            await page.clock.setFixedTime("2026-11-03T20:01:00Z");
            await page.evaluate(() => dispatchEvent(new Event("focus")));
            await expect
                .soft(mapImage(page))
                .toHaveAttribute("data-render-preserved", "true");
            await expectFreshCount(page, "2", response.waterDate);
            expect.soft(sourceIds).toStrictEqual(["907202615"]);
        });

        test("activates a future same-day observation without waiting for another feed read", async ({
            page,
        }) => {
            const response: HistoryResponse = {
                blocked: false,
                failed: false,
                waterDate: "2026-11-03T15:00:05.000",
            };
            const sourceIds = await mockHistory(
                page,
                response,
                createNetworkGate()
            );
            await page.goto(mapPath);
            await expectFreshCount(page, "?", "Not recorded");
            const originalSource = await freshness(page).textContent();
            await page.clock.setFixedTime("2026-11-03T20:00:10Z");
            await page.evaluate(() => dispatchEvent(new Event("focus")));
            await expectFreshCount(page, "0", "2026-11-03");
            await expect.soft(freshness(page)).toHaveText(originalSource ?? "");
            expect.soft(sourceIds).toStrictEqual(["907202615"]);
        });

        test("hides cached counts throughout reload and failure, then restores changed live data", async ({
            page,
        }) => {
            const gate = createNetworkGate();
            const response: HistoryResponse = {
                blocked: false,
                failed: false,
                waterDate: initialWaterDate,
            };
            await mockHistory(page, response, gate);
            await page.goto(mapPath);
            await expectFreshCount(page, "2", response.waterDate);
            expect
                .soft(
                    await page.evaluate(() =>
                        document.defaultView?.localStorage.getItem(
                            "gardening-public-watering-map-snapshot-v1"
                        )
                    )
                )
                .toContain(response.waterDate);
            response.blocked = true;
            try {
                await page.reload();
                await expect
                    .soft(freshness(page))
                    .toHaveAttribute("data-source", "saved");
                await expect
                    .soft(page.getByRole("button", { name: "Refreshing…" }))
                    .toBeDisabled();
                await expectUnavailable(page);
                response.failed = true;
                gate.release();
                await expect
                    .soft(freshness(page))
                    .toHaveAttribute(sourceStateAttribute, "error");
                await expectUnavailable(page);
                response.blocked = false;
                response.failed = false;
                response.waterDate = "2026-11-02";
                await page.getByRole("button", { name: refreshName }).click();
                await expectFreshCount(page, "1", response.waterDate);
            } finally {
                gate.release();
            }
        });

        test("discards a PNG still being prepared when its source refresh fails", async ({
            page,
        }) => {
            await page.addInitScript(() => {
                Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
                    value(callback: BlobCallback) {
                        const controller = new AbortController();
                        document.documentElement.dataset["pngPending"] = "true";
                        document.addEventListener(
                            "release-test-png",
                            () => {
                                controller.abort();
                                callback(
                                    new Blob(["Synthetic PNG"], {
                                        type: "image/png",
                                    })
                                );
                            },
                            { once: true, signal: controller.signal }
                        );
                    },
                });
            });
            const response: HistoryResponse = {
                blocked: false,
                failed: false,
                waterDate: initialWaterDate,
            };
            await mockHistory(page, response, createNetworkGate());
            let downloads = 0;
            function recordDownload() {
                downloads += 1;
            }
            page.on("download", recordDownload);
            try {
                await page.goto(mapPath);
                await expectFreshCount(page, "2", response.waterDate);
                await page
                    .getByRole("button", { name: "Download PNG" })
                    .click();
                await expect
                    .poll(async () =>
                        page.evaluate(
                            () => document.documentElement.dataset["pngPending"]
                        )
                    )
                    .toBe("true");
                response.failed = true;
                await page.getByRole("button", { name: refreshName }).click();
                await expect
                    .soft(freshness(page))
                    .toHaveAttribute(sourceStateAttribute, "error");
                await expectUnavailable(page);
                await page.evaluate(() =>
                    document.dispatchEvent(new Event("release-test-png"))
                );
                await expect
                    .soft(
                        page.getByRole("status").filter({
                            hasText:
                                "Watering data changed while preparing the image.",
                        })
                    )
                    .toBeVisible();
                expect.soft(downloads).toBe(0);
            } finally {
                page.off("download", recordDownload);
            }
        });

        test("hides expired observations before a delayed refresh can replace them", async ({
            page,
        }) => {
            const gate = createNetworkGate();
            const response: HistoryResponse = {
                blocked: false,
                failed: false,
                waterDate: initialWaterDate,
            };
            await mockHistory(page, response, gate);
            await page.goto(mapPath);
            await expectFreshCount(page, "2", response.waterDate);
            response.blocked = true;
            try {
                await page.clock.setFixedTime("2026-11-04T21:00:00Z");
                await page.evaluate(() => dispatchEvent(new Event("focus")));
                await expect
                    .soft(page.getByRole("button", { name: "Refreshing…" }))
                    .toBeDisabled();
                await expectUnavailable(page);
            } finally {
                gate.release();
            }
        });
    }
);
