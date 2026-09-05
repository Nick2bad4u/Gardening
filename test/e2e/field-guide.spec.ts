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

for (const theme of ["dark", "light"] as const) {
    test.describe(`${theme} field guide`, () => {
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
