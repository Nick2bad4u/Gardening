import { expect, type Page, test } from "@playwright/test";

const base = "/Gardening/";
const moneyTreeName = "Money tree";

async function expectContained(page: Readonly<Page>) {
    expect
        .soft(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
}

async function openSite(
    page: Readonly<Page>,
    route: string,
    theme: "dark" | "light"
) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**://*.googletagmanager.com/**", (request) =>
        request.abort()
    );
    await page.route("**://*.gyazo.com/**", (request) => request.abort());
    await page.goto(`${base}${route}`);
}

for (const theme of ["dark", "light"] as const) {
    test.describe(`${theme} modular website`, { tag: "@layout" }, () => {
        test("loads a homepage with normal navigation and a dated report", async ({
            page,
        }) => {
            await openSite(page, "", theme);
            await expect.soft(page.getByRole("main")).toBeVisible();
            await expect
                .soft(page.getByRole("link", { name: /Log Care/v }))
                .toHaveAttribute("href", /script\.google\.com/v);
            await expectContained(page);
        });

        test("searches profiles, preserves query on reload, and filters historical records", async ({
            page,
        }) => {
            await openSite(page, "plants/", theme);
            const search = page.getByRole("searchbox", {
                name: "Find a plant",
            });
            const directory = page.getByRole("list", {
                name: "Plant directory",
            });
            await search.fill("pachira");
            await expect.soft(directory.getByRole("listitem")).toHaveCount(1);
            await expect.soft(page).toHaveURL(/q=pachira/v);
            await page.reload();
            await expect.soft(search).toHaveValue("pachira");
            await expect
                .soft(
                    page.getByRole("heading", {
                        exact: true,
                        name: moneyTreeName,
                    })
                )
                .toBeVisible();
        });

        test("filters missing and historical plants", async ({ page }) => {
            await openSite(page, "plants/", theme);
            const search = page.getByRole("searchbox", {
                name: "Find a plant",
            });
            const directory = page.getByRole("list", {
                name: "Plant directory",
            });
            await search.fill("zzzz-no-such-plant-98765");
            await expect
                .soft(
                    page.getByText(
                        "No matching plants. Try a different name, label, or collection."
                    )
                )
                .toBeVisible();
            await search.clear();
            await page
                .getByRole("combobox", { name: "Records" })
                .selectOption("historical");
            await expect.soft(directory).toContainText("Historical");
            await expect
                .soft(directory.getByRole("heading", { name: moneyTreeName }))
                .toHaveCount(0);
            await expectContained(page);
        });

        test("opens one profile with provenance and browser navigation", async ({
            page,
        }) => {
            await openSite(page, "plants/pachira-glabra/", theme);
            await expect
                .soft(
                    page.getByRole("heading", {
                        exact: true,
                        name: moneyTreeName,
                    })
                )
                .toBeVisible();
            await expect
                .soft(page.getByRole("main").getByRole("article"))
                .toHaveCount(1);
            await expect.soft(page.getByRole("main")).toContainText("Sources");
            await page.goto(`${base}plants/`);
            await page.goBack();
            await expect
                .soft(
                    page.getByRole("heading", {
                        exact: true,
                        name: moneyTreeName,
                    })
                )
                .toBeVisible();
            await page.reload();
            await expect
                .soft(page.getByRole("main").getByRole("article"))
                .toHaveCount(1);
            await expectContained(page);
        });

        test("retains native reading keys and accessible mobile navigation", async ({
            page,
        }) => {
            await page.setViewportSize({ height: 844, width: 390 });
            await openSite(page, "plants/pachira-glabra/", theme);
            const url = page.url();
            await page.keyboard.press("ArrowRight");
            await page.keyboard.press("End");
            await expect.soft(page).toHaveURL(url);
            await page.keyboard.press("Home");
            const menu = page.getByRole("button", {
                exact: true,
                name: "Menu",
            });
            await menu.click();
            await expect.soft(menu).toHaveAttribute("aria-expanded", "true");
            await page.keyboard.press("Escape");
            await expect.soft(menu).toHaveAttribute("aria-expanded", "false");
            await expect.soft(menu).toBeFocused();
            await page
                .getByRole("button", {
                    name: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
                })
                .click();
            await expect
                .soft(
                    page.getByRole("button", {
                        name: `Switch to ${theme} theme`,
                    })
                )
                .toBeVisible();
            await expectContained(page);
        });

        test("prints only the current profile with research evidence", async ({
            page,
        }) => {
            await openSite(
                page,
                "plants/aeonium-haworthii-dream-color/",
                theme
            );
            await page.emulateMedia({ media: "print" });
            await expect
                .soft(page.getByRole("main").getByRole("article"))
                .toHaveCount(1);
            await expect
                .soft(page.getByRole("main"))
                .toContainText("Identification");
            await expect.soft(page.getByRole("main")).toContainText("Sources");
        });
    });
}

test.describe("migration compatibility", { tag: "@routes" }, () => {
    for (const [section, heading] of [
        ["collection-heading", "Plant Photo History"],
        ["nursery-heading", "Nursery Labels"],
    ] as const) {
        test(`preserves the legacy ${section} bookmark`, async ({ page }) => {
            const slug = "gymnocalycium-mihanovichii-variegated";
            const anchor = `${slug}-${section}`;
            await openSite(page, `docs/plant-booklet/#${anchor}`, "light");
            await expect
                .soft(page)
                .toHaveURL(`${base}plants/${slug}/#${anchor}`);
            await expect
                .soft(page.getByRole("heading", { exact: true, name: heading }))
                .toHaveAttribute("id", anchor);
            await expect
                .soft(page.getByRole("heading", { exact: true, name: heading }))
                .toBeVisible();
        });
    }

    test("preserves legacy root and nested profile bookmarks", async ({
        page,
    }) => {
        await openSite(page, "#pachira-glabra", "light");
        await expect
            .soft(page)
            .toHaveURL(/\/Gardening\/plants\/pachira-glabra\//v);
        await page.goto(
            `${base}docs/plant-booklet/#pachira-glabra-photo-history`
        );
        await expect
            .soft(page)
            .toHaveURL(
                /\/plants\/pachira-glabra\/#pachira-glabra-photo-history$/v
            );
        await expect
            .soft(
                page.getByRole("heading", { exact: true, name: moneyTreeName })
            )
            .toBeVisible();
        await page.goto(`${base}#equipment`);
        await expect.soft(page).toHaveURL(/\/setup\/equipment\//v);
    });

    for (const route of [
        "tracker/",
        "pots/P19/",
        "pots/P20/",
        "report/",
        "reports/",
        "photos/",
        "guides/",
        "setup/",
        "setup/placement/",
        "setup/equipment/",
        "setup/archive/",
        "setup/archive/calendar/",
        "setup/archive/layout/",
        "search/",
    ]) {
        test(`loads ${route} directly`, async ({ page }) => {
            await page.route("**://*.googletagmanager.com/**", (request) =>
                request.abort()
            );
            await page.route("**://docs.google.com/**", (request) =>
                request.abort()
            );
            const response = await page.goto(`${base}${route}`);
            expect.soft(response?.status()).toBe(200);
            await expect.soft(page.getByRole("main")).toBeVisible();
            await expect
                .soft(page.getByRole("heading", { level: 1 }))
                .toHaveCount(1);
        });
    }

    test("remains readable without JavaScript", async ({ browser }) => {
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();
        await page.goto(`${base}plants/pachira-glabra/`);
        await expect
            .soft(
                page.getByRole("heading", { exact: true, name: moneyTreeName })
            )
            .toBeVisible();
        await expect.soft(page.getByRole("main")).toContainText("Sources");
        await page.goto(`${base}plants/`);
        await expect
            .soft(page.getByRole("heading", { name: "Meet the plants." }))
            .toBeVisible();
        await context.close();
    });
});
