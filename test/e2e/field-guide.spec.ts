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

function inspectCardGeometry(entries: readonly Readonly<Element>[]) {
    const rows = new Map<number, number[]>();
    const unlinked: string[] = [];
    for (const entry of entries) {
        const card = entry.querySelector("[data-plant-card]");
        if (!(card instanceof HTMLElement))
            throw new Error("Missing plant card");
        const links = card.querySelectorAll("a");
        const link = links[0];
        if (!link || links.length !== 1)
            throw new Error("Plant card must have exactly one link");
        const original = card.getBoundingClientRect();
        const row = Math.round(original.top + scrollY);
        rows.set(row, [...(rows.get(row) ?? []), original.height]);
        card.scrollIntoView({ block: "center" });
        const box = card.getBoundingClientRect();
        const labels = card.querySelector(".plant-card-labels");
        const labelBox = labels?.getBoundingClientRect();
        const points = [
            [box.left + 6, box.top + 6],
            [box.right - 6, box.top + 6],
            [box.left + 6, box.bottom - 6],
            [box.right - 6, box.bottom - 6],
            [
                labelBox ? labelBox.left + labelBox.width / 2 : box.left,
                labelBox ? labelBox.top + labelBox.height / 2 : box.top,
            ],
        ];
        if (
            points.some(
                ([x, y]) =>
                    document.elementFromPoint(x ?? 0, y ?? 0)?.closest("a") !==
                    link
            )
        ) {
            unlinked.push(link.href);
        }
    }
    return {
        count: entries.length,
        rowHeightDifferences: rows
            .values()
            .map((heights) => Math.max(...heights) - Math.min(...heights))
            .toArray(),
        unlinked,
    };
}

async function inspectPlacementMaps(main: Readonly<Element>) {
    const images = [
        ...main.querySelectorAll(
            ":scope .document-article .placement-figure img"
        ),
    ];
    const metrics = [];
    for (const image of images) {
        if (!(image instanceof HTMLImageElement))
            throw new Error("Diagram must be an image");
        // Lazy requests start after the image becomes visible; decode() before
        // that request starts can reject even though the published PNG is valid.
        // eslint-disable-next-line no-await-in-loop -- Each lazy image must load before the next viewport movement.
        await new Promise<void>((resolve, reject) => {
            const controller = new AbortController();
            const loaded = () => {
                controller.abort();
                resolve();
            };
            const failed = () => {
                controller.abort();
                reject(
                    new Error(
                        `Placement image failed to load: ${image.currentSrc || image.src}`
                    )
                );
            };
            image.addEventListener("load", loaded, {
                once: true,
                signal: controller.signal,
            });
            image.addEventListener("error", failed, {
                once: true,
                signal: controller.signal,
            });
            image.scrollIntoView({ behavior: "instant", block: "center" });
            if (image.complete) {
                if (image.naturalWidth > 0) loaded();
                else failed();
            }
        });
        // Each lazy image must enter the viewport and finish decoding before scrolling to the next.
        // eslint-disable-next-line no-await-in-loop -- Parallel scrolling can leave preceding lazy images unloaded.
        await image.decode();
        const body =
            image.closest(".document-section-content") ??
            image.closest(".prose");
        const { height, width } = image.getBoundingClientRect();
        metrics.push({
            fillsBody:
                width >=
                (body?.getBoundingClientRect().width ?? Infinity) * 0.9,
            loaded: image.naturalWidth > 0 && image.naturalHeight > 0,
            nativeAspect:
                Math.abs(
                    width / height - image.naturalWidth / image.naturalHeight
                ) < 0.02,
        });
    }
    return {
        count: metrics.length,
        valid: metrics.every(
            (metric) => metric.fillsBody && metric.nativeAspect && metric.loaded
        ),
    };
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
        for (const width of [390, 1280]) {
            test(`directory cards share row heights and their entire surface is linked at ${width}px`, async ({
                page,
            }) => {
                await page.setViewportSize({ height: 900, width });
                await openSite(page, "plants/", theme);
                const directory = page.getByRole("list", {
                    name: "Plant directory",
                });
                const geometry = await directory
                    .getByRole("listitem")
                    .evaluateAll(inspectCardGeometry);
                expect.soft(geometry.count).toBeGreaterThan(20);
                expect.soft(geometry.unlinked).toStrictEqual([]);
                expect
                    .soft(Math.max(...geometry.rowHeightDifferences))
                    .toBeLessThanOrEqual(1);
                const firstCard = directory.getByRole("article").filter({
                    has: page.getByRole("heading", {
                        exact: true,
                        name: "Variegated moon cactus",
                    }),
                });
                const destination = await firstCard
                    .getByRole("link")
                    .getAttribute("href");
                await firstCard.click({ position: { x: 6, y: 6 } });
                await expect
                    .soft(page)
                    .toHaveURL(destination ?? "missing-card-destination");
            });

            test(`setup previews lead to uncropped full-width placement maps at ${width}px`, async ({
                page,
            }) => {
                await page.setViewportSize({ height: 900, width });
                await openSite(page, "setup/", theme);
                const preview = page.getByRole("link", {
                    name: /Four-Table Arrangement/v,
                });
                const previewSize = await preview
                    .getByRole("img")
                    .evaluate(async (element) => {
                        if (!(element instanceof HTMLImageElement))
                            throw new Error("Preview must be an image");
                        element.scrollIntoView({ block: "center" });
                        await element.decode();
                        return {
                            height: element.clientHeight,
                            width: element.clientWidth,
                        };
                    });
                expect.soft(previewSize.width).toBeGreaterThan(250);
                expect.soft(previewSize.height).toBeGreaterThan(150);
                await preview.click();
                await expect
                    .soft(page)
                    .toHaveURL(
                        /\/setup\/placement\/#illustrated-whole-display$/v
                    );
                const maps = await page
                    .getByRole("main")
                    .evaluate(inspectPlacementMaps);
                expect.soft(maps).toMatchObject({ valid: true });
                expect.soft(maps.count).toBeGreaterThanOrEqual(4);
            });
        }

        for (const route of [
            "plants/pachira-glabra/",
            "guides/watering-strategy/",
            "setup/",
            "setup/equipment/",
        ]) {
            test(`${route} uses the available desktop width for its article text`, async ({
                page,
            }) => {
                await page.setViewportSize({ height: 900, width: 1280 });
                await openSite(page, route, theme);
                const sizes = await page.getByRole("main").evaluate((main) => {
                    const body = main.querySelector(".prose");
                    if (!body) throw new Error("Missing readable article body");
                    const mainBox = main.getBoundingClientRect();
                    const bodyBox = body.getBoundingClientRect();
                    return {
                        leftGap: bodyBox.left - mainBox.left,
                        mainWidth: mainBox.width,
                        width: bodyBox.width,
                    };
                });
                expect.soft(sizes.width).toBeGreaterThan(600);
                expect.soft(sizes.width / sizes.mainWidth).toBeGreaterThan(0.6);
                expect.soft(sizes.leftGap).toBeLessThan(80);
            });
        }

        test("guide contents stays compact on mobile and opens with the keyboard", async ({
            page,
        }) => {
            await page.setViewportSize({ height: 844, width: 390 });
            await openSite(page, "guides/watering-strategy/", theme);
            const contents = page.getByRole("complementary", {
                name: "On this page",
            });
            const section = contents.getByRole("link", {
                name: /what we are trying to learn/iv,
            });
            await expect.soft(section).toBeHidden();
            await contents
                .getByText("On This Page", { exact: false })
                .press("Enter");
            await expect.soft(section).toBeVisible();
            await section.click();
            await expect.soft(page).toHaveURL(/#what-we-are-trying-to-learn$/v);
            await expectContained(page);
        });

        test("profile hero is loaded with attribution and prominent neighbor links work in both directions", async ({
            page,
        }) => {
            await page.setViewportSize({ height: 900, width: 1280 });
            await openSite(page, "plants/mammillaria-plumosa/", theme);
            const hero = await page.getByRole("main").evaluate(async (main) => {
                const image = main.querySelector(".profile-hero-photo");
                if (!(image instanceof HTMLImageElement))
                    throw new Error("Missing profile hero photograph");
                await image.decode();
                const credit = main.querySelector(".profile-hero-credit");
                return {
                    attributed:
                        credit !== null &&
                        credit.textContent.includes("Species reference") &&
                        Boolean(credit.querySelector("a[href]")),
                    height: image.getBoundingClientRect().height,
                    loaded: image.naturalWidth > 0 && image.naturalHeight > 0,
                };
            });
            expect.soft(hero).toMatchObject({ attributed: true, loaded: true });
            expect.soft(hero.height).toBeGreaterThan(250);
            const neighbors = page.getByRole("navigation", {
                name: "Plant navigation",
            });
            await expect.soft(neighbors).toBeInViewport();
            const next = neighbors.getByRole("link", { name: /Next/v });
            const target = await next.getAttribute("href");
            await next.click();
            await expect
                .soft(page)
                .toHaveURL(target ?? "missing-next-destination");
            await page
                .getByRole("navigation", { name: "Plant navigation" })
                .getByRole("link", { name: /Previous/v })
                .click();
            await expect
                .soft(page)
                .toHaveURL(`${base}plants/mammillaria-plumosa/`);
        });

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
            const badgeContrast = await page
                .getByRole("main")
                .evaluate((main) =>
                    [
                        ...main.querySelectorAll(
                            ":scope .profile-badges .badge"
                        ),
                    ].map((badge) => {
                        const channels = getComputedStyle(badge)
                            .color.match(/[\d.]+/gv)
                            ?.slice(0, 3)
                            .map(Number)
                            .map((value) => {
                                const channel = value / 255;
                                return channel <= 0.04045
                                    ? channel / 12.92
                                    : ((channel + 0.055) / 1.055) ** 2.4;
                            });
                        if (channels?.length !== 3)
                            throw new Error("Missing printable badge color");
                        const luminance =
                            0.2126 * (channels[0] ?? 1) +
                            0.7152 * (channels[1] ?? 1) +
                            0.0722 * (channels[2] ?? 1);
                        return 1.05 / (luminance + 0.05);
                    })
                );
            expect.soft(badgeContrast.length).toBeGreaterThan(0);
            expect.soft(Math.min(...badgeContrast)).toBeGreaterThanOrEqual(4.5);
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
