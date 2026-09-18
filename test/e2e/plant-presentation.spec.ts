import { expect, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- The maintained Node ESM adapter requires its explicit .mjs extension.
import { getProfiles } from "../../site/lib/content.mjs";

const profiles = await getProfiles();
const representatives = profiles.filter((profile) =>
    [
        "echeveria-raindrops",
        "mammillaria-bombycina",
        "mammillaria-plumosa",
        "pachira-glabra",
        "pilosocereus-pachycladus-variegated",
    ].includes(profile.slug)
);
const navigationName = "Plant navigation";
const featherPath = "/Gardening/plants/mammillaria-plumosa/";

function inspectProfile(main: Readonly<Element>) {
    const article = main.querySelector("[data-plant-profile]");
    const copy = main.querySelector(".profile-copy");
    if (!article || !copy) throw new Error("Missing plant profile body");
    const headings = [...copy.querySelectorAll("h2")];
    const tables = [...copy.querySelectorAll(".semantic-table")];
    return {
        careRows: copy.querySelectorAll(
            ":scope .semantic-table--care .semantic-row"
        ).length,
        headingIds: headings.map((heading) => heading.id),
        historyId:
            article
                .querySelector(":scope .profile-badges .badge-id strong")
                ?.textContent.trim() ?? null,
        iconsComplete:
            headings.every(
                (heading) =>
                    heading.querySelector(
                        ":scope .profile-section-icon img"
                    ) !== null
            ) &&
            tables.every(
                (table) =>
                    table.querySelector(":scope .semantic-table-icon img") !==
                    null
            ),
        readableWidth:
            copy.getBoundingClientRect().width /
            article.getBoundingClientRect().width,
        text: article.textContent,
        withinViewport: document.documentElement.scrollWidth <= innerWidth,
    };
}

async function openProfile(
    page: Readonly<Page>,
    slug: string,
    theme: "dark" | "light",
    width: number
) {
    await page.setViewportSize({ height: 900, width });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**://*.googletagmanager.com/**", (request) =>
        request.abort()
    );
    await page.route("**://*.gyazo.com/**", (request) => request.abort());
    await page.goto(`/Gardening/plants/${slug}/`);
}

for (const theme of ["dark", "light"] as const) {
    for (const width of [390, 1280]) {
        test.describe(
            `${theme} ${width}px plant presentation`,
            { tag: "@presentation" },
            () => {
                for (const profile of representatives) {
                    test(`${profile.slug} retains decorated content, identity, and full article width`, async ({
                        page,
                    }) => {
                        await openProfile(page, profile.slug, theme, width);
                        await expect
                            .soft(
                                page.getByRole("heading", {
                                    exact: true,
                                    level: 1,
                                    name: profile.title,
                                })
                            )
                            .toBeVisible();
                        const actual = await page
                            .getByRole("main")
                            .evaluate(inspectProfile);
                        expect
                            .soft(actual.headingIds)
                            .toStrictEqual(
                                profile.toc
                                    .filter((item) => item.level === 2)
                                    .map((item) => item.id)
                            );
                        expect.soft(actual).toMatchObject({
                            historyId: profile.trackerId ?? null,
                            iconsComplete: true,
                            withinViewport: true,
                        });
                        expect
                            .soft({
                                care: actual.careRows > 0,
                                identity:
                                    actual.text.includes(profile.inventoryId) &&
                                    actual.text.includes(
                                        profile.drawerLabel.primary
                                    ),
                                width: actual.readableWidth > 0.85,
                            })
                            .toStrictEqual({
                                care: true,
                                identity: true,
                                width: true,
                            });
                    });
                }

                test("floating navigation reveals by keyboard and remembers pinning", async ({
                    page,
                }) => {
                    await openProfile(
                        page,
                        "mammillaria-plumosa",
                        theme,
                        width
                    );
                    const navigation = page.getByRole("navigation", {
                        exact: true,
                        name: navigationName,
                    });
                    await page.mouse.move(0, 0);
                    await page.evaluate(() => {
                        scrollTo(0, 1200);
                    });
                    const reveal = navigation.getByRole("button", {
                        exact: true,
                        name: "Plant Navigation",
                    });
                    await expect.soft(reveal).toBeVisible();
                    await reveal.focus();
                    await expect
                        .soft(
                            navigation.getByRole("link", {
                                name: /^Previous plant:/v,
                            })
                        )
                        .toBeFocused();
                    await navigation
                        .getByRole("button", {
                            exact: true,
                            name: "Pin plant navigation",
                        })
                        .click();
                    await page.reload();
                    const pin = navigation.getByRole("button", {
                        exact: true,
                        name: "Unpin plant navigation",
                    });
                    await expect
                        .soft(pin)
                        .toHaveAttribute("aria-pressed", "true");
                    await page.evaluate(() => {
                        scrollTo(0, 1800);
                    });
                    await expect
                        .soft(
                            navigation.getByRole("link", {
                                name: /^Next plant:/v,
                            })
                        )
                        .toBeInViewport();
                    await expect.soft(page).toHaveURL(featherPath);
                });

                test("jump links preserve inventory, Escape focus, and ordinary browser navigation", async ({
                    page,
                }) => {
                    await openProfile(
                        page,
                        "mammillaria-plumosa",
                        theme,
                        width
                    );
                    const navigation = page.getByRole("navigation", {
                        exact: true,
                        name: navigationName,
                    });
                    const summary =
                        navigation.getByLabel(/^Jump to a plant\./v);
                    await summary.click();
                    await expect
                        .soft(navigation.getByRole("listitem"))
                        .toHaveCount(profiles.length);
                    await page.keyboard.press("Escape");
                    await expect.soft(summary).toBeFocused();
                    await summary.click();
                    const moneyTree = navigation.getByRole("link", {
                        name: /Money tree Label #3/v,
                    });
                    await moneyTree.click();
                    await expect
                        .soft(page)
                        .toHaveURL("/Gardening/plants/pachira-glabra/");
                    await page.goBack();
                    await expect.soft(page).toHaveURL(featherPath);
                    await expect.soft(summary).toBeVisible();
                });

                test("respects pointer, reduced-motion, and print presentation", async ({
                    page,
                }) => {
                    await openProfile(
                        page,
                        "mammillaria-plumosa",
                        theme,
                        width
                    );
                    const appearance = await page
                        .getByRole("main")
                        .evaluate((main) => {
                            const article = main.querySelector(
                                "[data-plant-profile]"
                            );
                            const panel = main.querySelector(
                                "[data-profile-panel]"
                            );
                            const link = main.querySelector(
                                ":scope .profile-badges a"
                            );
                            if (!article || !panel || !link)
                                throw new Error(
                                    "Missing interactive plant presentation"
                                );
                            const cursor = getComputedStyle(article).cursor;
                            return {
                                cursorCorrect: matchMedia(
                                    "(hover: hover) and (pointer: fine)"
                                ).matches
                                    ? cursor.includes("cactus-cursor.svg")
                                    : !cursor.includes("cactus-cursor.svg"),
                                linkCursor: getComputedStyle(link).cursor,
                                panelTransition:
                                    getComputedStyle(panel).transitionDuration,
                            };
                        });
                    expect.soft(appearance).toMatchObject({
                        cursorCorrect: true,
                        linkCursor: "pointer",
                        panelTransition: "0s",
                    });
                    await page.emulateMedia({ media: "print" });
                    await expect
                        .soft(
                            page.getByRole("navigation", {
                                exact: true,
                                name: navigationName,
                            })
                        )
                        .toBeHidden();
                    await expect
                        .soft(
                            page.getByRole("heading", {
                                exact: true,
                                level: 1,
                                name: "Feather cactus",
                            })
                        )
                        .toBeVisible();
                });
            }
        );
    }
}
