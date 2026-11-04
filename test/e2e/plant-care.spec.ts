import { expect, type Page, test } from "@playwright/test";

const alpineSlug = "aglaonema-commutatum-alpine-spires";
const alpinePath = `/Gardening/plants/${alpineSlug}/`;
const guidePath = "/Gardening/guides/light-moisture/";
const careTitle = "Light & moisture";

async function expectNoOverflow(page: Readonly<Page>) {
    expect
        .soft(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
}

async function inspectDisclosure(page: Readonly<Page>) {
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
}

async function inspectGuideNavigation(page: Readonly<Page>) {
    const care = page.getByRole("region", {
        exact: true,
        name: careTitle,
    });
    await care.getByRole("link", { name: /Compare every plant/v }).click();
    await expect.soft(page).toHaveURL(guidePath);
    const comparison = page.locator("[data-care-comparison]");
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
    await expectNoOverflow(page);
    await comparison
        .locator(
            `[data-care-row] a[href="${alpinePath}#${alpineSlug}-care-reference"]`
        )
        .click();
    await expect
        .soft(page)
        .toHaveURL(`${alpinePath}#${alpineSlug}-care-reference`);
    await expect
        .soft(care.getByRole("heading", { name: careTitle }))
        .toBeInViewport();
}

async function inspectPrint(page: Readonly<Page>) {
    const care = page.getByRole("region", {
        exact: true,
        name: careTitle,
    });
    await page.emulateMedia({ media: "print" });
    await expect
        .soft(care.getByText("Working range", { exact: true }))
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
}

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
        .soft(care.getByText("Starting comparison", { exact: true }))
        .toHaveCount(0);
    await expect
        .soft(
            page
                .getByRole("region", { name: /container and members/v })
                .getByText("One care record:")
        )
        .toBeVisible();
};

test.describe("per-plant care references", { tag: "@care" }, () => {
    test("printing opens the full comparison and restores the disclosure state", async ({
        page,
    }) => {
        await prepare(page, "light", 1280);
        await page.goto(guidePath);
        const comparison = page.locator("[data-care-comparison]");
        const rows = comparison.locator("[data-care-row]");
        await expect.soft(rows).toHaveCount(49);
        await page.emulateMedia({ media: "print" });
        await expect
            .soft(comparison.locator("[data-care-row]:visible"))
            .toHaveCount(49);
        await page.evaluate(() => {
            dispatchEvent(new Event("beforeprint"));
            dispatchEvent(new Event("beforeprint"));
            dispatchEvent(new Event("afterprint"));
        });
        await expect
            .soft(comparison.locator("[data-care-row]:visible"))
            .toHaveCount(49);
        await page.emulateMedia({ media: "screen" });
        await expect
            .soft(comparison.locator("[data-care-row]:visible"))
            .toHaveCount(0);
        await comparison
            .getByText(/^Browse all \d+ active plant references$/v)
            .click();
        await page.emulateMedia({ media: "print" });
        await page.emulateMedia({ media: "screen" });
        await expect
            .soft(comparison.locator("[data-care-row]:visible"))
            .toHaveCount(49);
    });

    for (const theme of ["dark", "light"] as const) {
        for (const width of [390, 1280]) {
            test(`light and moisture reference at ${width}px in ${theme}`, async ({
                page,
            }) => {
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
                expect.soft(content).toContain("Collection trial ranges");
                expect
                    .soft(content)
                    .toMatch(/Working range[\s\S]*Approx\. white-LED lux/v);
                expect.soft(content).toContain("13.5 constant-light hours");
                expect
                    .soft({
                        boundaries: content.includes(
                            "proven optimum and hard minimum"
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
                await inspectGuideNavigation(page);
            });
        }
    }

    for (const theme of ["dark", "light"] as const) {
        test(`terrarium shows a cautious numeric trial at 390px in ${theme}`, async ({
            page,
        }) => {
            await prepare(page, theme, 390);
            await page.goto("/Gardening/plants/terrarium/");
            const care = page.getByRole("region", {
                exact: true,
                name: careTitle,
            });
            const content = await care.innerText();
            expect.soft(content).toContain("Collection trial ranges");
            expect.soft(content).toMatch(/Working range\s*60–125/v);
            expect.soft(content).toMatch(/Daily light total\s*3–6/v);
            expect
                .soft(content)
                .toMatch(/Approx\. white-LED lux\s*3,400–8,600 lx/v);
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
                .soft(care.getByText("Working range", { exact: true }))
                .toHaveCount(0);
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
