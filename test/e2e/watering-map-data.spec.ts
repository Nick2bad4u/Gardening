import { expect, type Locator, type Page, test } from "@playwright/test";

const mapPath = "/Gardening/setup/placement/#watering-map";
const refreshName = "Refresh data";
const sourceStateAttribute = "data-state";
const historyHeader =
    "Date,Plant ID,Event,Weight state,Weight (g),Height (cm),Width (cm),Plant condition,Notes,Pot setup,Record status,Request ID";

interface HistoryResponse {
    blocked: boolean;
    failed: boolean;
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

async function expectFreshCount(
    page: Readonly<Page>,
    count: string,
    date: string
) {
    await expect
        .soft(freshness(page))
        .toHaveAttribute(sourceStateAttribute, "live");
    expect
        .soft(
            await mapImage(page).evaluate(
                (svg) =>
                    svg.querySelector(':scope [data-pot-id="P01"] text.count')
                        ?.textContent
            )
        )
        .toBe(count);
    await expect.soft(details(page)).toContainText(`Last Water: ${date}`);
    await expectDownloads(page, true);
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
            /^(?:Refreshing watering observations|Published observations loaded\.|Watering data (?:expired|unavailable)\.)/v,
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
    await page.clock.setFixedTime("2026-11-03T20:00:00Z");
    await page.route("**://*.googletagmanager.com/**", (route) =>
        route.abort()
    );
    await page.route("https://docs.google.com/**", async (route) => {
        if (response.blocked) await gate.wait();
        await route.fulfill({
            body: response.failed
                ? "Temporarily unavailable"
                : `${historyHeader}\n${response.waterDate},P01,Water,,,,,Healthy,Synthetic watering,1,Active,map-fixture`,
            contentType: "text/csv",
            status: response.failed ? 503 : 200,
        });
    });
}

test.describe(
    "watering map unavailable observations",
    { tag: "@watering-map" },
    () => {
        test("hides cached counts throughout reload and failure, then restores changed live data", async ({
            page,
        }) => {
            const gate = createNetworkGate();
            const response: HistoryResponse = {
                blocked: false,
                failed: false,
                waterDate: "2026-11-01",
            };
            await mockHistory(page, response, gate);
            await page.goto(mapPath);
            await expectFreshCount(page, "2", response.waterDate);
            expect
                .soft(
                    await page.evaluate(() =>
                        document.defaultView?.localStorage.getItem(
                            "gardening-public-history-snapshot-v1"
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
                waterDate: "2026-11-01",
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
                waterDate: "2026-11-01",
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
