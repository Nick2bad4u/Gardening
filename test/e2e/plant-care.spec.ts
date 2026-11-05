import { expect, type Locator, type Page, test } from "@playwright/test";

import {
    getPlantCareReferences,
    lightComparison,
    // eslint-disable-next-line import-x/extensions -- The maintained Node ESM adapter requires its explicit .mjs extension.
} from "../../site/lib/plant-care.mjs";

const alpineSlug = "aglaonema-commutatum-alpine-spires";
const alpinePath = `/Gardening/plants/${alpineSlug}/`;
const guidePath = "/Gardening/guides/light-moisture/";
const careTitle = "Light & moisture";
const comparisonTitle = "Compare the collection";

const expectNoOverflow = async (page: Readonly<Page>) => {
    expect
        .soft(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
};

const inspectDisclosure = async (page: Readonly<Page>) => {
    const care = page.getByRole("region", {
        exact: true,
        name: careTitle,
    });
    const summary = care.getByText("Acclimation, range assumptions & sources", {
        exact: true,
    });
    const source = care.getByRole("link", {
        exact: true,
        name: "NC State Extension: Aglaonema",
    });
    await expect.soft(source).toBeHidden();
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect.soft(source).toBeVisible();
    await expect
        .soft(source)
        .toHaveAttribute(
            "href",
            "https://plants.ces.ncsu.edu/plants/aglaonema/"
        );
    await expect
        .soft(care.getByText(/spectrum-dependent white-LED/v))
        .toBeVisible();
    await page.keyboard.press("Enter");
    await expect.soft(source).toBeHidden();
};

const inspectPrint = async (page: Readonly<Page>) => {
    const care = page.getByRole("region", {
        exact: true,
        name: careTitle,
    });
    await page.emulateMedia({ media: "print" });
    await expect
        .soft(care.getByText("Recommended working range", { exact: true }))
        .toBeVisible();
    await expect
        .soft(care.getByText("Gentler starting range", { exact: true }))
        .toBeVisible();
    await expect
        .soft(care.getByText("Water when", { exact: true }))
        .toBeVisible();
    await expect
        .soft(
            care.getByRole("link", {
                exact: true,
                name: "NC State Extension: Aglaonema",
            })
        )
        .toBeVisible();
    await page.emulateMedia({ media: "screen" });
    await expect
        .soft(
            care.getByRole("link", {
                exact: true,
                name: "NC State Extension: Aglaonema",
            })
        )
        .toBeHidden();
};

async function prepare(
    page: Readonly<Page>,
    theme: "dark" | "light",
    width: number
) {
    await page.setViewportSize({ height: 900, width });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**://*.googletagmanager.com/**", (route) =>
        route.abort()
    );
    await page.route("**://*.gyazo.com/**", (route) => route.abort());
}

const inspectTerrariumCautions = async (page: Readonly<Page>) => {
    const care = page.getByRole("region", { exact: true, name: careTitle });
    await care
        .getByText("Acclimation, range assumptions & sources", { exact: true })
        .click();
    const content = await care.innerText();
    expect.soft(content).toMatch(/provisional|unidentified/iv);
    expect.soft(content).toContain("spectrum-dependent white-LED comparison");
    expect.soft(content).toMatch(/does not establish.*drainage/v);
    await expect
        .soft(care.getByText("Gentler starting range", { exact: true }))
        .toBeVisible();
    await expect
        .soft(
            page
                .getByRole("region", { name: /container and members/v })
                .getByText("One care record:")
        )
        .toBeVisible();
};

const expectPublishedEvidence = async (page: Readonly<Page>) => {
    const care = page.getByRole("region", { exact: true, name: careTitle });
    const evidence = care
        .getByRole("paragraph")
        .filter({ hasText: /^Published evidence:/v });
    await expect.soft(evidence).toBeVisible();
    await expect.soft(evidence).toContainClass("plant-care-research");
    await expect.soft(evidence).not.toHaveText("Published evidence:");
};

const inspectComparisonGeometry = async (page: Readonly<Page>) => {
    await page.evaluate(async () => document.fonts.ready);
    const problems = await page
        .getByRole("region", { exact: true, name: comparisonTitle })
        .getByRole("listitem")
        .evaluateAll((rows) =>
            rows.flatMap((row) => {
                const bounds = row.getBoundingClientRect();
                const ranges = [
                    ...row.querySelectorAll<HTMLElement>(
                        ":scope .care-comparison-range"
                    ),
                ];
                const isRangeLayoutValid =
                    ranges.length === 3 &&
                    ranges.every((value) => {
                        const text = document.createRange();
                        text.selectNodeContents(value);
                        const rectangles = [...text.getClientRects()].filter(
                            (rect) => rect.width > 0
                        );
                        const rect = value.getBoundingClientRect();
                        const metric = value
                            .closest("dd")
                            ?.parentElement?.getBoundingClientRect();
                        return (
                            rectangles.length === 1 &&
                            metric !== undefined &&
                            rect.left >= metric.left &&
                            rect.right <= metric.right + 1 &&
                            value.scrollWidth <= value.clientWidth + 1 &&
                            rect.left >= bounds.left &&
                            rect.right <= bounds.right
                        );
                    });
                const heading = row.querySelector<HTMLElement>(":scope h3");
                return isRangeLayoutValid &&
                    heading &&
                    heading.scrollWidth <= heading.clientWidth + 1 &&
                    row.scrollWidth <= row.clientWidth + 1
                    ? []
                    : [row.dataset["careRow"]];
            })
        );
    expect.soft(problems).toStrictEqual([]);
};

const loadComparisonPortraits = async (
    rows: readonly Locator[],
    index = 0
): Promise<void> => {
    const row = rows[index];
    if (!row) return;
    await row.scrollIntoViewIfNeeded();
    await row.evaluate(async (element) => {
        const portrait = element.querySelector<HTMLImageElement>(
            ":scope img.care-comparison-portrait"
        );
        if (!portrait) throw new Error("Missing comparison portrait");
        await portrait.decode();
        if (portrait.naturalWidth === 0)
            throw new Error("Comparison portrait did not load");
    });
    await loadComparisonPortraits(rows, index + 1);
};

const captureComparison = async (
    page: Readonly<Page>,
    screenshotPath: string
) => {
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("Missing comparison viewport");
    const comparison = page.getByRole("region", {
        exact: true,
        name: comparisonTitle,
    });
    const target =
        viewport.width === 390
            ? comparison.getByRole("listitem").filter({
                  has: page.getByRole("heading", {
                      exact: true,
                      name: "Variegated moon cactus",
                  }),
              })
            : comparison.getByRole("listitem").filter({
                  has: page.getByRole("heading", {
                      name: /Alpine Spires/v,
                  }),
              });
    await page.setViewportSize({ ...viewport, height: 1500 });
    await target.evaluate((element) => {
        window.scrollTo({
            behavior: "instant",
            top: element.getBoundingClientRect().top + scrollY - 100,
        });
    });
    await page.screenshot({ path: screenshotPath });
    await page.setViewportSize(viewport);
};

const inspectComparisonValues = async (rows: Readonly<Locator>) => {
    const number = new Intl.NumberFormat("en-US");
    const range = (values: null | readonly number[]) => {
        if (!values)
            throw new Error("Active recommendation is missing a numeric range");
        return values.map((value) => number.format(value)).join("–");
    };
    const records = await getPlantCareReferences();
    const expected = records
        .filter((record) => record.light.basis !== "historical")
        .map((record) => {
            const comparison = lightComparison(record.light);
            return {
                slug: record.slug,
                values: [
                    { label: "Recommended lux", value: range(comparison.lux) },
                    { label: "PPFD", value: range(comparison.ppfd) },
                    {
                        label: "Daily light estimate",
                        value: range(record.light.dli),
                    },
                ],
            };
        })
        .toSorted((left, right) => left.slug.localeCompare(right.slug));
    const actual = await rows.evaluateAll((elements) =>
        elements.map((element) => ({
            slug: element.dataset["careRow"],
            values: [
                ...element.querySelectorAll(
                    ":scope .care-comparison-values > div"
                ),
            ].map((metric) => ({
                label: metric.querySelector("dt")?.textContent.trim(),
                value: metric
                    .querySelector(".care-comparison-range")
                    ?.textContent.trim(),
            })),
        }))
    );
    expect
        .soft(
            actual.toSorted((left, right) =>
                (left.slug ?? "").localeCompare(right.slug ?? "")
            )
        )
        .toStrictEqual(expected);
};

const inspectComparisonRows = async (page: Readonly<Page>) => {
    const rows = page
        .getByRole("region", { exact: true, name: comparisonTitle })
        .getByRole("listitem");
    await expect.soft(rows).toHaveCount(49);
    await loadComparisonPortraits(await rows.all());
    await expect
        .soft(rows.getByRole("link", { exact: true, name: "Care & sources" }))
        .toHaveCount(49);
    expect
        .soft(
            await rows.evaluateAll((elements) =>
                elements.every(
                    (element) =>
                        element
                            .querySelector(":scope h3 a")
                            ?.getAttribute("href") ===
                        element
                            .querySelector(
                                ":scope .care-comparison-source-link"
                            )
                            ?.getAttribute("href")
                )
            )
        )
        .toBe(true);
    await expect
        .soft(rows.filter({ has: page.getByText("P30", { exact: true }) }))
        .toHaveCount(4);
    await expect
        .soft(rows.filter({ has: page.getByText("P35", { exact: true }) }))
        .toHaveCount(3);
    await inspectComparisonGeometry(page);
    await inspectComparisonValues(rows);
};

const inspectGuideNavigation = async (
    page: Readonly<Page>,
    screenshotPath: string
) => {
    const care = page.getByRole("region", {
        exact: true,
        name: careTitle,
    });
    await care.getByRole("link", { name: /Compare every plant/v }).click();
    await expect.soft(page).toHaveURL(guidePath);
    const comparison = page.getByRole("region", {
        exact: true,
        name: comparisonTitle,
    });
    await expect
        .soft(
            comparison.filter({
                hasText: "13.5 constant-light hours for comparison",
            })
        )
        .toBeVisible();
    await comparison
        .getByText(/^Browse all \d+ active plant references$/v)
        .click();
    await inspectComparisonRows(page);
    await expectNoOverflow(page);
    await captureComparison(page, screenshotPath);
    await comparison
        .getByRole("listitem")
        .filter({ has: page.getByRole("heading", { name: /Alpine Spires/v }) })
        .getByRole("link", { exact: true, name: "Care & sources" })
        .click();
    await expect
        .soft(page)
        .toHaveURL(`${alpinePath}#${alpineSlug}-care-reference`);
    await expect
        .soft(care.getByRole("heading", { name: careTitle }))
        .toBeInViewport();
};

test.describe("per-plant care references", { tag: "@care" }, () => {
    test("printing opens the full comparison and restores the disclosure state", async ({
        page,
    }) => {
        await prepare(page, "light", 1280);
        await page.goto(guidePath);
        const comparison = page.getByRole("region", {
            exact: true,
            name: comparisonTitle,
        });
        const rows = comparison.getByRole("listitem", { includeHidden: true });
        await expect.soft(rows).toHaveCount(49);
        await page.emulateMedia({ media: "print" });
        await inspectComparisonGeometry(page);
        await expect.soft(comparison.getByRole("listitem")).toHaveCount(49);
        await page.evaluate(() => {
            dispatchEvent(new Event("beforeprint"));
            dispatchEvent(new Event("beforeprint"));
            dispatchEvent(new Event("afterprint"));
        });
        await expect.soft(comparison.getByRole("listitem")).toHaveCount(49);
        await page.emulateMedia({ media: "screen" });
        await expect.soft(comparison.getByRole("listitem")).toHaveCount(0);
        await comparison
            .getByText(/^Browse all \d+ active plant references$/v)
            .click();
        await page.emulateMedia({ media: "print" });
        await page.emulateMedia({ media: "screen" });
        await expect.soft(comparison.getByRole("listitem")).toHaveCount(49);
    });

    for (const theme of ["dark", "light"] as const) {
        for (const width of [390, 1280]) {
            test(`light and moisture reference at ${width}px in ${theme}`, async ({
                page,
            }, testInfo) => {
                await prepare(page, theme, width);
                await page.goto(alpinePath);
                const care = page.getByRole("region", {
                    exact: true,
                    name: careTitle,
                });
                await expect
                    .soft(care.getByRole("heading", { name: careTitle }))
                    .toBeVisible();
                const content = await care.innerText();
                await expectPublishedEvidence(page);
                expect.soft(content).toContain("Recommended estimate");
                expect
                    .soft(content)
                    .toMatch(
                        /Recommended working range[\s\S]*lux · white-LED estimate[\s\S]*Equivalent PPFD[\s\S]*Daily light estimate[\s\S]*Gentler starting range[\s\S]*Published evidence:/v
                    );
                expect.soft(content).toContain("13.5 constant-light hours");
                expect
                    .soft({
                        boundaries: content.includes(
                            "not established minimums, safe maximums, or proven optima"
                        ),
                        moisture: [
                            "Water when",
                            "Wait when",
                            "What to check",
                        ].every((label) => content.includes(label)),
                    })
                    .toStrictEqual({ boundaries: true, moisture: true });
                await expectNoOverflow(page);
                await inspectDisclosure(page);
                await inspectPrint(page);
                await inspectGuideNavigation(
                    page,
                    testInfo.outputPath("care-comparison.png")
                );
            });
        }
    }

    for (const theme of ["dark", "light"] as const) {
        test(`feather cactus gives a recommendation without a hard ceiling at 390px in ${theme}`, async ({
            page,
        }) => {
            await prepare(page, theme, 390);
            await page.goto("/Gardening/plants/mammillaria-plumosa/");
            const care = page.getByRole("region", {
                exact: true,
                name: careTitle,
            });
            const content = await care.innerText();
            await expectPublishedEvidence(page);
            expect
                .soft(content)
                .toMatch(/Recommended working range\s*13,600–28,800/v);
            expect
                .soft(content)
                .toMatch(
                    /Daily light estimate\s*12–20[\s\S]*Gentler starting range\s*9,100–17,300 lux ·\s*165–245 PPFD ·\s*8–12 DLI/v
                );
            expect
                .soft(content)
                .toContain(
                    "not established minimums, safe maximums, or proven optima"
                );
            await care
                .getByText("Acclimation, range assumptions & sources", {
                    exact: true,
                })
                .click();
            expect
                .soft(await care.innerText())
                .toContain("Neither 17 nor 20 DLI is a ceiling");
            await expect
                .soft(
                    care.getByRole("link", {
                        exact: true,
                        name: "Arizona-Sonora Desert Museum: Feather cactus",
                    })
                )
                .toBeVisible();
            await expectNoOverflow(page);
        });

        test(`terrarium shows a cautious recommendation and gentler start at 390px in ${theme}`, async ({
            page,
        }) => {
            await prepare(page, theme, 390);
            await page.goto("/Gardening/plants/terrarium/");
            const care = page.getByRole("region", {
                exact: true,
                name: careTitle,
            });
            const content = await care.innerText();
            await expectPublishedEvidence(page);
            expect.soft(content).toContain("Recommended estimate");
            expect
                .soft(content)
                .toMatch(/Recommended working range\s*3,400–7,200/v);
            expect.soft(content).toMatch(/Daily light estimate\s*3–5/v);
            expect.soft(content).toMatch(/Equivalent PPFD\s*60–105/v);
            expect
                .soft(content)
                .toMatch(
                    /Gentler starting range\s*2,300–4,300 lux ·\s*40–60 PPFD ·\s*2–3 DLI/v
                );
            await inspectTerrariumCautions(page);
            await expectNoOverflow(page);
        });

        test(`historical plant retains no active numeric target at 390px in ${theme}`, async ({
            page,
        }) => {
            await prepare(page, theme, 390);
            await page.goto("/Gardening/plants/mammillaria-bombycina/");
            const care = page.getByRole("region", {
                exact: true,
                name: careTitle,
            });
            await expect
                .soft(care.getByText("Historical reference", { exact: true }))
                .toBeVisible();
            await expect
                .soft(
                    care.getByText("No active numeric light target.", {
                        exact: true,
                    })
                )
                .toBeVisible();
            await expect
                .soft(
                    care.getByText("Recommended working range", { exact: true })
                )
                .toHaveCount(0);
            await expect
                .soft(care.getByText("Gentler starting range", { exact: true }))
                .toHaveCount(0);
            await expectPublishedEvidence(page);
            await expectNoOverflow(page);
        });
    }

    test("shared Lithops retains one container care history", async ({
        page,
    }) => {
        await prepare(page, "light", 390);
        await page.goto("/Gardening/plants/lithops-lesliei/");
        await expect
            .soft(
                page.getByRole("region", {
                    exact: true,
                    name: careTitle,
                })
            )
            .toBeVisible();
        const container = page.getByRole("region", {
            name: /container and members/v,
        });
        await expect
            .soft(container.getByText("One care record:"))
            .toBeVisible();
        await expect
            .soft(
                container.getByRole("link", { name: /Open P\d+ care history/v })
            )
            .toBeVisible();
        await expectNoOverflow(page);
    });
});
