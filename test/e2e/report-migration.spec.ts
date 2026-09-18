/* eslint playwright/max-expects: ["warn", {"max": 20}] -- Shared helpers. */
// The preset counts assertions in shared helpers together; each report test still checks a coherent user flow.
import { expect, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- The shared Node ESM adapter requires its .mjs extension at runtime.
import { getReports } from "../../site/lib/reports.mjs";

type Review = Awaited<ReturnType<typeof getReports>>[number];

async function cardState(page: Readonly<Page>, selector = "details.pot-card") {
    return page.evaluate((query) => {
        const cards = [...document.querySelectorAll(query)].filter(
            (element) => element instanceof HTMLDetailsElement
        );
        return {
            open: cards.filter((card) => card.open).length,
            total: cards.length,
        };
    }, selector);
}

async function currentReview() {
    const reports = await getReports();
    const latest = reports[0];
    if (latest?.report === null || latest?.report === undefined)
        throw new Error(
            "Latest report requires the current reviewed contract."
        );
    return { ...latest, report: latest.report };
}

async function expectContained(page: Readonly<Page>) {
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
}

async function historicalReview(version: number) {
    const reports = await getReports();
    const report = reports.find(
        (entry, index) => entry.version === version && index > 0
    );
    if (report === undefined)
        throw new Error(`Missing reviewed version-${version} archive.`);
    return report;
}

async function prepare(page: Readonly<Page>, theme: "dark" | "light") {
    const sheetRequests: string[] = [];
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**://*.googletagmanager.com/**", (route) =>
        route.abort()
    );
    await page.route(
        /https:\/\/(?:(?:docs|script|sheets)\.google\.com|sheets\.googleapis\.com|script\.googleusercontent\.com)\//v,
        (route) => {
            sheetRequests.push(
                `${route.request().method()} ${route.request().url()}`
            );
            return route.abort();
        }
    );
    await page.addInitScript(() => {
        // eslint-disable-next-line n/no-unsupported-features/node-builtins -- This fixture executes inside the browser page, not Node.
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
                async writeText(text: string) {
                    await Promise.resolve();
                    document.documentElement.dataset["copiedReport"] = text;
                },
            },
        });
    });
    return sheetRequests;
}

async function verifyControls(
    page: Readonly<Page>,
    latest: Readonly<Awaited<ReturnType<typeof currentReview>>>
) {
    const chips = page
        .getByRole("region", { name: "Today's quick list" })
        .getByRole("link", { name: /^[^:]+: /v });
    if ((await chips.count()) === 0) return;
    const chip = chips.first(); // eslint-disable-line playwright/no-nth-methods -- Any real quick-list pot exercises anchor reveal.
    const target = await chip.getAttribute("href");
    if (target === null)
        throw new Error("Reviewed quick list requires a pot anchor.");
    const search = page.getByRole("searchbox", {
        name: "Find a pot by label, name, or ID",
    });
    await search.fill("not-a-real-plant");
    await expect
        .soft(
            page.getByText(
                "No pots match. Try a different name, label, or filter."
            )
        )
        .toBeVisible();
    await chip.click();
    await expect.soft(search).toHaveValue("");
    expect
        .soft(
            await page.evaluate((id) => {
                const card = document.querySelector(id);
                return (
                    card instanceof HTMLDetailsElement &&
                    card.open &&
                    card.hidden === false
                );
            }, target)
        )
        .toBe(true);
    await page.getByRole("button", { exact: true, name: "⚖️ Weigh" }).click();
    const count = latest.report.pots.filter(
        (pot) => pot.action === "weigh"
    ).length;
    await expect
        .soft(page.getByRole("status", { name: "Filter results" }))
        .toContainText(`${count} of ${latest.report.pots.length} pots shown`);
    await page.getByRole("button", { exact: true, name: "All pots" }).click();
}

async function verifyCopy(page: Readonly<Page>, latest: Readonly<Review>) {
    await page.getByRole("button", { exact: true, name: "Copy list" }).click();
    await expect
        .soft(page.getByRole("status", { name: "Copy status" }))
        .toHaveText("Quick list copied.");
    expect
        .soft(
            await page.evaluate(
                () => document.documentElement.dataset["copiedReport"]
            )
        )
        .toContain(`Garden report · ${latest.date}`);
}

async function verifyLatest(
    page: Readonly<Page>,
    latest: Readonly<Awaited<ReturnType<typeof currentReview>>>
) {
    await expect
        .soft(page.getByText(latest.summary, { exact: true }))
        .toBeVisible();
    await expect
        .soft(
            page.getByRole("searchbox", {
                name: "Find a pot by label, name, or ID",
            })
        )
        .toBeVisible();
    await expect
        .soft(page.getByRole("status", { name: "Filter results" }))
        .toContainText(
            `${latest.report.pots.length} of ${latest.report.pots.length} pots shown`
        );
    const reviewed = latest.report.pots.filter(
        (pot) => pot.action !== "unresolved"
    ).length;
    const coverage =
        latest.coverage === "complete"
            ? `Complete review · ${reviewed} pots`
            : `${latest.coverage === "partial" ? "Partial review" : "Review unavailable"} · ${reviewed} of`;
    await expect.soft(page.getByText(coverage, { exact: false })).toBeVisible();
    expect
        .soft(
            await page.evaluate(() => {
                const element = document.querySelector("[data-report-date]");
                const freshness = document.querySelector("#freshness-message");
                return {
                    date:
                        element instanceof HTMLElement
                            ? element.dataset["reportDate"]
                            : undefined,
                    freshnessHidden:
                        freshness instanceof HTMLElement && freshness.hidden,
                };
            })
        )
        .toStrictEqual({ date: latest.date, freshnessHidden: true });
}

async function verifyLocalImages(page: Readonly<Page>) {
    await expect
        .poll(() =>
            page.evaluate(() =>
                [...document.images]
                    .filter((image) => {
                        const source = new URL(image.currentSrc || image.src);
                        return (
                            source.origin === location.origin &&
                            image.loading !== "lazy"
                        );
                    })
                    .every((image) => image.complete && image.naturalWidth > 0)
            )
        )
        .toBe(true);
}

async function verifyPrinting(
    page: Readonly<Page>,
    selector = "details.pot-card"
) {
    const before = await cardState(page, selector);
    await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
    await expect
        .poll(() => cardState(page, selector))
        .toStrictEqual({ open: before.total, total: before.total });
    await page.evaluate(() => dispatchEvent(new Event("afterprint")));
    await expect.poll(() => cardState(page, selector)).toStrictEqual(before);
}

test.describe("native reviewed reports", { tag: "@reports" }, () => {
    for (const theme of ["dark", "light"] as const) {
        test(`${theme} latest report preserves review data and interactive behavior`, async ({
            page,
        }, testInfo) => {
            const latest = await currentReview();
            const sheetRequests = await prepare(page, theme);
            await page.clock.setFixedTime(`${latest.date}T16:00:00Z`);
            await page.setViewportSize({ height: 844, width: 390 });
            await page.goto("/Gardening/report/");
            await verifyLatest(page, latest);
            await verifyLocalImages(page);
            await expectContained(page);
            await page.screenshot({
                path: testInfo.outputPath(`report-${theme}-390.png`),
            });
            await verifyControls(page, latest);
            await verifyCopy(page, latest);
            await verifyPrinting(page);
            await page.setViewportSize({ height: 900, width: 1280 });
            await expectContained(page);
            await page.screenshot({
                path: testInfo.outputPath(`report-${theme}-desktop.png`),
            });
            expect.soft(await page.pageErrors()).toStrictEqual([]);
            expect.soft(sheetRequests).toStrictEqual([]);
        });
    }

    test("dated reports distinguish archived freshness from the latest review", async ({
        page,
    }) => {
        const dated = await historicalReview(2);
        const sheetRequests = await prepare(page, "light");
        await page.clock.setFixedTime("2030-01-01T16:00:00Z");
        await page.goto("/Gardening/reports/");
        await page.getByRole("link", { exact: true, name: dated.date }).click();
        await expect.soft(page).toHaveURL(`/Gardening/reports/${dated.date}/`);
        await expect
            .soft(
                page.getByText(`Archived report from ${dated.date}.`, {
                    exact: false,
                })
            )
            .toBeVisible();
        await expect
            .soft(
                page.getByText("Eastern · a recorded snapshot", {
                    exact: false,
                })
            )
            .toBeVisible();
        await page.reload();
        await expect
            .soft(
                page.getByText("not been refreshed for today", { exact: false })
            )
            .toBeVisible();
        expect.soft(sheetRequests).toStrictEqual([]);
    });

    test("version-1 archives preserve original decisions, pot anchors, and printable evidence", async ({
        page,
    }) => {
        const archived = await historicalReview(1);
        const sheetRequests = await prepare(page, "dark");
        await page.setViewportSize({ height: 844, width: 390 });
        await page.goto(`/Gardening/reports/${archived.date}/#pot-P01`);
        await expect
            .soft(
                page.getByText("Archived version 1 policy.", { exact: false })
            )
            .toBeVisible();
        await expect
            .soft(
                page.getByRole("heading", {
                    name: "A1 · Variegated moon cactus",
                })
            )
            .toBeVisible();

        await page
            .getByText("Original recorded evidence", { exact: true })
            .first() // eslint-disable-line playwright/no-nth-methods -- Open one preserved record before checking print restoration.
            .click();
        await verifyPrinting(page, ".report-archive details");
        await expectContained(page);
        expect.soft(sheetRequests).toStrictEqual([]);
    });
});
