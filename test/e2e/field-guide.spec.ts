import { expect, type Page, test } from "@playwright/test";

function measureCategoryIcons() {
    return [...document.querySelectorAll(".contents-group-icon")].map(
        (badge) => {
            const svg = badge.querySelector("svg");
            if (svg === null)
                throw new Error("A category badge is missing its SVG.");
            // Read both rectangles in one frame so entry animations cannot skew the comparison.
            const outer = badge.getBoundingClientRect();
            const inner = svg.getBoundingClientRect();
            return Math.max(
                Math.abs(outer.x + outer.width / 2 - inner.x - inner.width / 2),
                Math.abs(
                    outer.y + outer.height / 2 - inner.y - inner.height / 2
                )
            );
        }
    );
}

async function openGuide(
    page: Readonly<Page>,
    theme: "dark" | "light",
    hash: string
) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**://*.gyazo.com/**", (route) => route.abort());
    await page.route("**://*.googletagmanager.com/**", (route) =>
        route.abort()
    );
    await page.goto(`/#${hash}`);
}

function readGuidePortraits() {
    const heading = document.querySelector(
        ".profile-page:not([hidden]) .hero-scientific"
    );
    const icon = heading?.querySelector("svg");
    const name = heading?.querySelector("span");
    if (!icon || !name) throw new Error("Missing scientific name or portrait.");
    const portrait = icon.getBoundingClientRect();
    const text = name.getBoundingClientRect();
    return {
        header: icon.querySelector("use")?.getAttribute("href"),
        isAligned:
            portrait.right <= text.left &&
            Math.abs(
                portrait.top + portrait.height / 2 - text.top - text.height / 2
            ) < 1,
        isWithinViewport: document.documentElement.scrollWidth <= innerWidth,
        next: document.querySelector("#next-page use")?.getAttribute("href"),
        previous: document
            .querySelector("#previous-page use")
            ?.getAttribute("href"),
    };
}

for (const theme of ["dark", "light"] as const) {
    test.describe(`${theme} field guide`, () => {
        test(
            "opens the placement guide after contents and links to the reviewed plants",
            { tag: "@layout" },
            async ({ page }) => {
                await openGuide(page, theme, "contents");
                await page.keyboard.press("ArrowRight");
                await expect.soft(page).toHaveURL(/#placement$/v);
                const guide = page.getByRole("region", {
                    exact: true,
                    name: "Table Placement Guide",
                });
                await expect.soft(guide).toBeVisible();
                await guide
                    .getByRole("link", { exact: true, name: "Ming Thing" })
                    .click();
                await expect
                    .soft(
                        page.getByRole("heading", {
                            exact: true,
                            name: "Ming Thing",
                        })
                    )
                    .toBeVisible();
                await page.goBack();
                await expect.soft(guide).toBeVisible();
                await page.keyboard.press("ArrowLeft");
                await expect.soft(page).toHaveURL(/#contents$/v);
            }
        );

        test(
            "keeps the four-column six-row placement and full-size image links within the viewport",
            { tag: "@layout" },
            async ({ page }) => {
                await openGuide(page, theme, "placement");
                const layout = await page.evaluate(() => {
                    const grid = [
                        ...document.querySelectorAll("#placement table"),
                    ].find(
                        (table) =>
                            table.querySelector("th")?.textContent === "Row"
                    );
                    if (!grid) throw new Error("Missing placement grid.");
                    const labels = [
                        ...grid.querySelectorAll(":scope tbody tr"),
                    ].map((row) =>
                        [...row.querySelectorAll("td")]
                            .slice(1)
                            .map(
                                (cell) =>
                                    cell.textContent.trim().split(" · ", 1)[0]
                            )
                    );
                    const images = [
                        ...document.querySelectorAll<HTMLImageElement>(
                            "#placement .placement-figure img"
                        ),
                    ];
                    return {
                        hasOverflow:
                            document.documentElement.scrollWidth > innerWidth,
                        imageCount: images.length,
                        imagesLinkToPublishedAssets: images.every(
                            (img) =>
                                img
                                    .getAttribute("src")
                                    ?.startsWith("./assets/layouts/") ===
                                    true &&
                                img.closest("a")?.href === img.src &&
                                img.width > 0 &&
                                img.height > 0
                        ),
                        labels,
                    };
                });
                expect.soft(layout).toStrictEqual({
                    hasOverflow: false,
                    imageCount: 3,
                    imagesLinkToPublishedAssets: true,
                    labels: [
                        [
                            "D3",
                            "A2",
                            "A1",
                            "G1",
                        ],
                        [
                            "A3",
                            "B2",
                            "E1",
                            "B1",
                        ],
                        [
                            "C2",
                            "H1",
                            "H2",
                            "G2",
                        ],
                        [
                            "B3",
                            "G3",
                            "D1",
                            "H3",
                        ],
                        [
                            "E3",
                            "C3",
                            "F2",
                            "F3",
                        ],
                        [
                            "E2",
                            "D2",
                            "C1",
                            "F1",
                        ],
                    ],
                });
            }
        );

        test(
            "keeps contents cards aligned when plant names wrap",
            { tag: "@layout" },
            async ({ page }) => {
                await openGuide(page, theme, "contents");
                const layout = await page.evaluate(() => {
                    const rows = [
                        ...document.querySelectorAll(
                            '.contents-group[data-group="cacti"] li'
                        ),
                    ];
                    return {
                        count: rows.length,
                        gaps: rows.map((row) => {
                            const link = row.querySelector("a");
                            if (link === null)
                                throw new Error("Missing contents link.");
                            return (
                                row.getBoundingClientRect().height -
                                link.getBoundingClientRect().height
                            );
                        }),
                        hasOverflow:
                            document.documentElement.scrollWidth > innerWidth,
                    };
                });
                expect.soft(layout.count).toBe(21);
                expect.soft(Math.max(...layout.gaps)).toBeLessThan(1);
                expect.soft(layout.hasOverflow).toBe(false);
            }
        );

        test(
            "keeps metadata compact and exposes the full identification evidence",
            { tag: "@layout" },
            async ({ page }) => {
                await openGuide(page, theme, "aeonium-haworthii-dream-color");
                const layout = await page.evaluate(() => {
                    const profile = document.querySelector(
                        ".profile-page:not([hidden])"
                    );
                    const compact = [
                        "inventory",
                        "sheet",
                        "label",
                    ].map((kind) => {
                        const card = profile?.querySelector(
                            `.profile-meta--${kind}`
                        );
                        if (!card)
                            throw new Error("Missing compact metadata card.");
                        return card.getBoundingClientRect().height;
                    });
                    const acquiredFrom = profile?.querySelector(
                        ".profile-meta--source"
                    );
                    const acquiredOn = profile?.querySelector(
                        ".profile-meta--date"
                    );
                    if (!acquiredFrom || !acquiredOn)
                        throw new Error("Missing acquisition metadata.");
                    return {
                        acquisitionWidthDifference: Math.abs(
                            acquiredFrom.getBoundingClientRect().width -
                                acquiredOn.getBoundingClientRect().width
                        ),
                        compact,
                        hasOverflow:
                            document.documentElement.scrollWidth > innerWidth,
                    };
                });
                expect
                    .soft({
                        compact: Math.max(...layout.compact) < 110,
                        equalAcquisitionWidths:
                            layout.acquisitionWidthDifference < 1,
                        hasOverflow: layout.hasOverflow,
                    })
                    .toStrictEqual({
                        compact: true,
                        equalAcquisitionWidths: true,
                        hasOverflow: false,
                    });
                const evidence = page.getByText(
                    "probable cultivar; appearance is consistent, but no nursery label or seller provenance is archived",
                    { exact: true }
                );
                await expect.soft(evidence).toBeHidden();
                await page
                    .getByText("Likely Cultivar", { exact: true })
                    .click();
                await expect.soft(evidence).toBeVisible();
                await page.emulateMedia({
                    media: "print",
                    reducedMotion: "no-preference",
                });
                const printed = await page.evaluate(() => {
                    const profile = document.querySelector(
                        ".profile-page:not([hidden])"
                    );
                    if (!profile) throw new Error("Missing printed profile.");
                    return {
                        animation: getComputedStyle(profile).animationName,
                        hasClippedMetadata: [
                            ...profile.querySelectorAll(".profile-meta"),
                        ].some(
                            (card) => card.scrollWidth > card.clientWidth + 1
                        ),
                    };
                });
                expect.soft(printed).toStrictEqual({
                    animation: "none",
                    hasClippedMetadata: false,
                });
            }
        );

        test(
            "enlarges the hero portrait on hover and honors reduced motion",
            { tag: "@layout" },
            async ({ isMobile, page }) => {
                await openGuide(page, theme, "nyctocereus-serpentinus");
                await page.emulateMedia({ reducedMotion: "no-preference" });
                // The hero and photo-history image share alt text; target the visible hero presentation.
                // eslint-disable-next-line playwright/no-raw-locators -- This visual variant has no distinct accessible name.
                const portraits = page.locator(".plant-avatar--hero:visible");
                await expect.soft(portraits).toHaveCount(isMobile ? 0 : 1);
                const visiblePortraits = await portraits.all();
                await Promise.all(
                    visiblePortraits.map(async (portrait) => {
                        await portrait.hover();
                        await expect
                            .soft(portrait)
                            .toHaveCSS(
                                "transform",
                                "matrix(1.2, 0, 0, 1.2, 0, 0)"
                            );
                        await page.emulateMedia({ reducedMotion: "reduce" });
                        await expect
                            .soft(portrait)
                            .toHaveCSS("transform", "none");
                    })
                );
            }
        );

        test(
            "animates hover and keyboard focus while respecting reduced motion",
            { tag: "@layout" },
            async ({ isMobile, page }) => {
                await openGuide(page, theme, "contents");
                const plant = page.getByRole("link", {
                    name: /^P01 A1 Variegated moon cactus/v,
                });
                await page.emulateMedia({ reducedMotion: "no-preference" });
                await plant.scrollIntoViewIfNeeded();
                // Finish the page/row entrance before putting the pointer on it.
                await page.evaluate(async () => {
                    await Promise.allSettled(
                        document
                            .getAnimations()
                            .map((animation) => animation.finished)
                    );
                });
                await plant.hover();
                await expect
                    .soft(plant)
                    .toHaveCSS("translate", isMobile ? "none" : "0px -3px");
                await plant.focus();
                await expect.soft(plant).toHaveCSS("outline-style", "solid");
                await page.emulateMedia({ reducedMotion: "reduce" });
                await expect.soft(plant).toHaveCSS("translate", "none");
                await expect
                    .poll(() =>
                        plant.evaluate((link) => {
                            const portrait =
                                link.querySelector(".plant-nav-icon");
                            if (portrait === null)
                                throw new Error("Missing plant portrait.");
                            return getComputedStyle(portrait).rotate;
                        })
                    )
                    .toBe("none");
            }
        );

        test(
            "shows destination portraits and a portrait beside the scientific name",
            { tag: "@navigation" },
            async ({ page }) => {
                await openGuide(page, theme, "oreocereus-trollii");
                await expect
                    .poll(() => page.evaluate(readGuidePortraits))
                    .toMatchObject({
                        header: "./plant-icons.svg#icon-plant-oreocereus-trollii",
                        isAligned: true,
                        isWithinViewport: true,
                        next: "./plant-icons.svg#icon-plant-myrtillocactus-geometrizans-indigo-wave",
                        previous:
                            "./plant-icons.svg#icon-plant-stenocactus-phyllacanthus",
                    });

                await page.mouse.wheel(0, -1000);
                await page.getByRole("button", { name: /^Next /v }).click();
                await expect
                    .poll(() => page.evaluate(readGuidePortraits))
                    .toMatchObject({
                        header: "./plant-icons.svg#icon-plant-myrtillocactus-geometrizans-indigo-wave",
                        isAligned: true,
                        isWithinViewport: true,
                        previous:
                            "./plant-icons.svg#icon-plant-oreocereus-trollii",
                    });
                await page.getByRole("main").focus();
                await page.keyboard.press("ArrowLeft");
                await expect
                    .poll(() => page.evaluate(readGuidePortraits))
                    .toMatchObject({
                        header: "./plant-icons.svg#icon-plant-oreocereus-trollii",
                        next: "./plant-icons.svg#icon-plant-myrtillocactus-geometrizans-indigo-wave",
                        previous:
                            "./plant-icons.svg#icon-plant-stenocactus-phyllacanthus",
                    });
            }
        );

        test(
            "keeps a wrapping photo credit below the plant title",
            { tag: "@layout" },
            async ({ page }) => {
                await openGuide(page, theme, "pachira-glabra");
                await expect
                    .soft(page.getByRole("heading", { level: 1 }))
                    .toHaveCount(1);
                await expect
                    .soft(
                        page.getByRole("heading", {
                            exact: true,
                            name: "Money tree",
                        })
                    )
                    .toBeVisible();
                const gap = await page.evaluate(() => {
                    const hero = document.querySelector(
                        ".profile-page:not([hidden]) .profile-hero"
                    );
                    const title = hero?.querySelector(".hero-title");
                    const credit = hero?.querySelector(".hero-credit");
                    if (!title || !credit)
                        throw new Error("Missing profile title or credit.");
                    return (
                        credit.getBoundingClientRect().top -
                        title.getBoundingClientRect().bottom
                    );
                });
                expect.soft(gap).toBeGreaterThanOrEqual(8);
            }
        );

        test(
            "preserves the selected plant in an old booklet bookmark",
            { tag: "@navigation" },
            async ({ page }) => {
                await openGuide(page, theme, "contents");
                await page.goto("/docs/plant-booklet/#pachira-glabra");
                await expect.soft(page).toHaveURL(/\/#pachira-glabra$/v);
                await expect
                    .soft(
                        page.getByRole("heading", {
                            exact: true,
                            name: "Money tree",
                        })
                    )
                    .toBeVisible();
            }
        );

        test(
            "centers category icons and removes the navigation glass bar",
            { tag: "@layout" },
            async ({ page }) => {
                await openGuide(page, theme, "contents");
                await expect
                    .soft(
                        page.getByRole("heading", {
                            name: "A field guide to the collection.",
                        })
                    )
                    .toBeVisible();
                const offsets = await page.evaluate(measureCategoryIcons);
                expect.soft(offsets).toHaveLength(4);
                expect.soft(Math.max(...offsets)).toBeLessThan(0.6);
                await expect
                    .soft(
                        page.getByRole("navigation", {
                            name: "Page navigation",
                        })
                    )
                    .toHaveCSS("backdrop-filter", "none");
                expect
                    .soft(
                        await page.evaluate(
                            () =>
                                document.documentElement.scrollWidth <=
                                innerWidth
                        )
                    )
                    .toBe(true);
            }
        );

        test(
            "loads both current photos when Gyazo is blocked",
            { tag: "@photos" },
            async ({ page }) => {
                await openGuide(
                    page,
                    theme,
                    "gymnocalycium-mihanovichii-black-widow-photo-history"
                );
                const gallery = page.getByRole("region", {
                    exact: true,
                    name: "Plant photo history",
                });
                const photos = gallery.getByRole("img");
                await expect.soft(photos).toHaveCount(2);
                await expect
                    .poll(() =>
                        photos.evaluateAll((images) =>
                            images.every(
                                (image) =>
                                    image instanceof HTMLImageElement &&
                                    image.complete &&
                                    image.naturalWidth > 0
                            )
                        )
                    )
                    .toBe(true);
                const pageUrl = new URL(page.url());
                expect
                    .soft(
                        await photos.evaluateAll((images) =>
                            images.map((image) => {
                                if (!(image instanceof HTMLImageElement))
                                    throw new TypeError(
                                        "A preview must be an image."
                                    );
                                const source = new URL(image.currentSrc);
                                return source.origin;
                            })
                        )
                    )
                    .toStrictEqual([pageUrl.origin, pageUrl.origin]);
                const captureLinks = gallery
                    .getByRole("link")
                    .filter({ has: page.getByRole("img") });
                expect
                    .soft(
                        await captureLinks.evaluateAll((links) =>
                            links.every(
                                (link) =>
                                    link instanceof HTMLAnchorElement &&
                                    link.hostname === "gyazo.com"
                            )
                        )
                    )
                    .toBe(true);
            }
        );

        test(
            "keeps photo source and license links together without overflow",
            { tag: "@layout" },
            async ({ page }) => {
                await openGuide(
                    page,
                    theme,
                    "gymnocalycium-mihanovichii-black-widow-photo-history"
                );
                const credits = await page.evaluate(() => {
                    const rows = [
                        ...document.querySelectorAll(
                            ".reference-photo .photo-credit-links"
                        ),
                    ];
                    return rows.map((row) => ({
                        display: getComputedStyle(row).display,
                        labels: [...row.querySelectorAll("a")].map((link) =>
                            link.textContent.trim()
                        ),
                        wrap: getComputedStyle(row).flexWrap,
                    }));
                });
                expect.soft(credits.length).toBeGreaterThan(0);
                expect
                    .soft(
                        credits.every(
                            (credit) =>
                                credit.display === "flex" &&
                                credit.wrap === "wrap"
                        )
                    )
                    .toBe(true);
                expect
                    .soft(
                        credits.every(
                            (credit) =>
                                credit.labels.includes("Photo source") &&
                                credit.labels.some((label) =>
                                    label.startsWith("License:")
                                )
                        )
                    )
                    .toBe(true);
                expect
                    .soft(
                        await page.evaluate(
                            () =>
                                document.documentElement.scrollWidth <=
                                innerWidth
                        )
                    )
                    .toBe(true);
            }
        );
    });
}
