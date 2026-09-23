import { expect, type Page, test } from "@playwright/test";

const apps = [
    { icon: "full-report", name: "Full Report", route: "report" },
    { icon: "pocket-report", name: "Pocket Report", route: "pocket-report" },
] as const;

async function openCards(page: Readonly<Page>) {
    return page.evaluate(() =>
        [...document.querySelectorAll("details.pot-card[open]")].map(
            (card) => card.id
        )
    );
}

async function reportContent(page: Readonly<Page>) {
    return page.evaluate(() => ({
        date: document.querySelector<HTMLElement>("[data-report-date]")
            ?.dataset["reportDate"],
        pots: [...document.querySelectorAll("details.pot-card")].map(
            (card) => ({ id: card.id, text: card.textContent })
        ),
    }));
}

test.describe("report home-screen apps", { tag: "@reports" }, () => {
    test.beforeEach(async ({ page }) => {
        await page.route("**://*.googletagmanager.com/**", (route) =>
            route.abort()
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
    });

    for (const app of apps) {
        test(`${app.name} publishes its own launch identity and downloadable icons`, async ({
            page,
            request,
        }) => {
            const launchPath = `/Gardening/${app.route}/`;
            await page.goto(launchPath);
            expect
                .soft(
                    await page.evaluate(() => ({
                        icon: document
                            .querySelector(
                                'link[rel="icon"][type="image/svg+xml"]'
                            )
                            ?.getAttribute("href"),
                        manifest: document
                            .querySelector('link[rel="manifest"]')
                            ?.getAttribute("href"),
                        title: document.title,
                    }))
                )
                .toStrictEqual({
                    icon: `/Gardening/assets/ui-icons/${app.icon}.svg`,
                    manifest: `${launchPath}manifest.webmanifest`,
                    title: app.name,
                });
            const response = await request.get(
                `${launchPath}manifest.webmanifest`
            );
            expect
                .soft({
                    ok: response.ok(),
                    type: response.headers()["content-type"],
                })
                .toMatchObject({
                    ok: true,
                    type: expect.stringContaining("application/manifest+json"),
                });
            const manifest: unknown = await response.json();
            expect.soft(manifest).toMatchObject({
                display: "standalone",
                id: launchPath,
                name: app.name,
                scope: launchPath,
                short_name: app.name,
                start_url: `${launchPath}${app.route === "pocket-report" ? "#pocket-list" : ""}`,
            });
            await Promise.all(
                [192, 512].map(async (size) => {
                    const src = `/Gardening/assets/report-apps/${app.icon}-${size}.png`;
                    expect.soft(manifest).toMatchObject({
                        icons: expect.arrayContaining([
                            expect.objectContaining({
                                sizes: `${size}x${size}`,
                                src,
                                type: "image/png",
                            }),
                        ]),
                    });
                    const icon = await request.get(src);
                    const bytes = await icon.body();
                    expect
                        .soft({
                            dimensions: [
                                bytes.readUInt32BE(16),
                                bytes.readUInt32BE(20),
                            ],
                            ok: icon.ok(),
                        })
                        .toStrictEqual({ dimensions: [size, size], ok: true });
                })
            );
        });
    }

    test("report switches preserve the same reviewed date and pot content", async ({
        page,
    }) => {
        await page.goto("/Gardening/report/");
        const full = await reportContent(page);
        expect.soft(full.date).toBeTruthy();
        expect.soft(full.pots.length).toBeGreaterThan(0);
        await page
            .getByRole("link", { exact: true, name: "Pocket report" })
            .focus();
        await page.keyboard.press("Enter");
        await expect
            .soft(page)
            .toHaveURL(/\/Gardening\/pocket-report\/(?:#pocket-list)?$/v);
        expect.soft(await reportContent(page)).toStrictEqual(full);
        await page
            .getByRole("link", { exact: true, name: "Full report" })
            .click();
        await expect.soft(page).toHaveURL("/Gardening/report/");
    });

    test("pocket launch scrolls to its list while explicit pot anchors take precedence", async ({
        page,
    }) => {
        await page.goto("/Gardening/pocket-report/");
        await expect
            .soft(page.getByRole("region", { name: "Your pocket list" }))
            .toBeInViewport();
        const content = await reportContent(page);
        const potId = content.pots.at(-1)?.id;
        if (potId === undefined)
            throw new Error("Reviewed report requires a pot card.");
        await page.goto(`/Gardening/pocket-report/#${potId}`);
        await expect.soft(page.locator(`#${potId}`)).toBeInViewport();
        await expect
            .soft(page.locator(`#${potId}`))
            .toHaveAttribute("open", "");
        await expect.soft(page).toHaveURL(`/Gardening/pocket-report/#${potId}`);
        await page.goto("/Gardening/report/#pocket-list");
        await expect
            .soft(page.getByRole("region", { name: "Your pocket list" }))
            .toBeInViewport();
    });

    for (const theme of ["dark", "light"] as const) {
        test(`${theme} pocket report fits mobile and restores cards after printing`, async ({
            page,
        }, testInfo) => {
            await page.setViewportSize({ height: 844, width: 390 });
            await page.emulateMedia({ colorScheme: theme });
            await page.goto("/Gardening/pocket-report/");
            await expect
                .soft(page.getByRole("region", { name: "Your pocket list" }))
                .toBeInViewport();
            await expect
                .poll(() =>
                    page.evaluate(
                        () => document.documentElement.scrollWidth <= innerWidth
                    )
                )
                .toBe(true);
            await page.screenshot({
                path: testInfo.outputPath(`pocket-${theme}-390.png`),
            });
            await page.setViewportSize({ height: 900, width: 1280 });
            await page.goto("/Gardening/pocket-report/");
            await expect
                .soft(page.getByRole("region", { name: "Your pocket list" }))
                .toBeInViewport();
            await expect
                .poll(() =>
                    page.evaluate(
                        () => document.documentElement.scrollWidth <= innerWidth
                    )
                )
                .toBe(true);
            await page.screenshot({
                path: testInfo.outputPath(`pocket-${theme}-desktop.png`),
            });
            const before = await openCards(page);
            const content = await reportContent(page);
            const total = content.pots.length;
            await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
            expect.soft(await openCards(page)).toHaveLength(total);
            await page.evaluate(() => dispatchEvent(new Event("afterprint")));
            expect.soft(await openCards(page)).toStrictEqual(before);
            await page.goto("/Gardening/report/");
            await expect
                .soft(page.getByRole("navigation", { name: "Report views" }))
                .toBeInViewport();
            await page.screenshot({
                path: testInfo.outputPath(`full-${theme}-desktop.png`),
            });
            await page.setViewportSize({ height: 844, width: 390 });
            await page.goto("/Gardening/report/");
            await expect
                .soft(page.getByRole("navigation", { name: "Report views" }))
                .toBeInViewport();
            await page.screenshot({
                path: testInfo.outputPath(`full-${theme}-390.png`),
            });
            expect.soft(await page.pageErrors()).toStrictEqual([]);
        });
    }

    test("the main garden does not inherit a report app identity", async ({
        page,
    }) => {
        await page.goto("/Gardening/");
        expect
            .soft(
                await page.evaluate(
                    () =>
                        document.querySelector('link[rel="manifest"]') === null
                )
            )
            .toBe(true);
        await expect.soft(page).not.toHaveTitle(/^(?:Full|Pocket) Report/v);
    });
});
