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
    await expect.soft(comparison).toBeVisible();
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

test.describe("per-plant care references", { tag: "@care" }, () => {
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
                expect.soft(content).toContain("12 constant-light hours");
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

    for (const reference of [
        {
            basis: "Qualitative guidance",
            message:
                "Numeric light range, optimum, and hard limits are not established.",
            slug: "terrarium",
        },
        {
            basis: "Historical reference",
            message: "No active numeric light target.",
            slug: "mammillaria-bombycina",
        },
    ]) {
        test(`${reference.slug} does not acquire an unsupported numeric target`, async ({
            page,
        }) => {
            await prepare(page, "light", 390);
            await page.goto(`/Gardening/plants/${reference.slug}/`);
            const care = page.getByRole("region", {
                exact: true,
                name: careTitle,
            });
            await expect
                .soft(care.getByText(reference.basis, { exact: true }))
                .toBeVisible();
            await expect
                .soft(care.getByText(reference.message, { exact: true }))
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
