import { expect, type Page, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

// eslint-disable-next-line import-x/extensions -- Shared ESM fixture is also served by the local preview.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const cactusArtwork = await readFile(
    ".pages-site/assets/plant-icons/parodia-leninghausii.svg"
);
const terrariumArtwork = await readFile(
    ".pages-site/assets/plant-icons/terrarium.svg"
);

const expectBalancedLabels = async (
    page: Readonly<Page>,
    theme: "dark" | "light"
) => {
    await page.getByRole("button", { exact: true, name: "Labels" }).click();
    await expect
        .soft(
            page
                .getByRole("group", { name: "Choose plant by pot label" })
                .getByRole("button")
        )
        .toHaveCount(36);
    expect
        .soft(
            await page.evaluate(() => document.documentElement.dataset["theme"])
        )
        .toBe(theme);
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
};

const expectCompactHistory = async (page: Readonly<Page>) => {
    await page.getByRole("button", { name: "Compact history" }).click();
    const correct = page.getByRole("button", {
        exact: true,
        name: "Correct Water entry for Collection plant 1 · Sep 9, 2026, 10:00 AM",
    });
    await expect.soft(correct).toBeHidden();
    const disclosure = page.getByLabel(
        "Collection plant 1 · Water · Sep 9, 2026, 10:00 AM. Show event details",
        { exact: true }
    );
    await disclosure.focus();
    await page.keyboard.press("Enter");
    await expect.soft(correct).toBeVisible();
    await page
        .getByRole("group", { exact: true, name: "Water saved details" })
        .getByText("Water details", { exact: true })
        .click();
    await expect
        .soft(
            page.getByRole("group", {
                exact: true,
                name: "Water saved details",
            })
        )
        .toContainText("Synthetic browser fixture; no live observation.");
    await page.reload();
    await expect
        .soft(page.getByRole("button", { name: "Compact history" }))
        .toHaveAttribute("aria-pressed", "true");
};

const expectPortraitAccess = async (page: Readonly<Page>, width: number) => {
    const selected = page.getByRole("region", {
        exact: true,
        name: "Selected plant",
    });
    const portrait = selected.getByRole("button", {
        exact: true,
        name: "Enlarge portrait of Collection plant 1",
    });
    await portrait.focus();
    if (width > 860) {
        await portrait.hover();
        const previewPanel = page.getByLabel("Portrait preview", {
            exact: true,
        });
        await previewPanel.hover();
        await expect.soft(previewPanel).toBeVisible();
        await portrait.focus();
        expect
            .soft(
                await page.evaluate(() => {
                    const preview =
                        document.querySelector<HTMLElement>("#portraitPreview");
                    const rect = preview?.getBoundingClientRect();
                    return (
                        preview !== null &&
                        rect !== undefined &&
                        preview.hidden === false &&
                        rect.width > 0 &&
                        rect.left >= 0 &&
                        rect.right <= innerWidth
                    );
                })
            )
            .toBe(true);
    }
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", {
        name: "Collection plant 1 · A1",
    });
    await expect.soft(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect.soft(dialog).toBeHidden();
    await expect.soft(portrait).toBeFocused();
};

const expectSeparateFormControls = async (page: Readonly<Page>) => {
    const form = page.getByRole("form", { name: "Single plant entry" });
    await page.getByRole("button", { exact: true, name: "Inspect" }).click();
    await expect
        .soft(
            page.getByRole("heading", {
                exact: true,
                name: "Inspect the plant",
            })
        )
        .toBeVisible();
    await expect
        .soft(page.getByRole("heading", { exact: true, name: "Soil check" }))
        .toBeHidden();
    await page.getByRole("button", { exact: true, name: "Soil check" }).click();
    await expect
        .soft(page.getByRole("heading", { exact: true, name: "Soil check" }))
        .toBeVisible();
    await form.getByLabel("Observed date", { exact: true }).fill("2026-09-08");
    await form.getByLabel("Observed time", { exact: true }).fill("09:42");
    await expect
        .soft(page.getByLabel("Canonical observation time", { exact: true }))
        .toHaveValue("2026-09-08T09:42");
    await expect
        .soft(
            page.getByRole("button", { exact: true, name: "Use current time" })
        )
        .toHaveAttribute("aria-pressed", "false");
};

const expectTerrariumContext = async (page: Readonly<Page>) => {
    await page
        .getByRole("button", {
            exact: true,
            name: "Label #12, Mixed tropical terrarium, P38",
        })
        .click();
    const selected = page.getByRole("region", {
        exact: true,
        name: "Selected plant",
    });
    await expect
        .soft(selected)
        .toContainText("dimension orientation unverified");
    await expect.soft(selected).toContainText("Pilea cf. depressa");
    await expect.soft(selected).toContainText("N/A");
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
    await selected.scrollIntoViewIfNeeded();
};

const openLogger = async (
    page: Readonly<Page>,
    width: number,
    theme: "dark" | "light"
) => {
    await page.setViewportSize({ height: 900, width });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-fixture") {
            await route.fulfill({
                body: loggerBrowserFixture(),
                contentType: "text/html",
            });
        } else if (url.pathname.startsWith("/Gardening/assets/plant-icons/")) {
            // Layout fixtures use a local cactus placeholder except for the actual
            // terrarium artwork; no fixture request reaches the public website.
            await route.fulfill({
                body: url.pathname.endsWith("/terrarium.svg")
                    ? terrariumArtwork
                    : cactusArtwork,
                contentType: "image/svg+xml",
            });
        } else {
            await route.abort();
        }
    });
    await page.goto("/Gardening/logger-fixture");
    await expect
        .soft(
            page.getByText("Connected · Logger browser-fixture", {
                exact: true,
            })
        )
        .toBeVisible();
};

for (const theme of ["dark", "light"] as const) {
    for (const width of [
        320,
        360,
        390,
        768,
        1280,
    ]) {
        test.describe(`${theme} ${width}px logger`, { tag: "@logger" }, () => {
            test("controls stay accessible and within the viewport", async ({
                page,
            }, testInfo) => {
                const errors: string[] = [];
                const recordError = (error: Readonly<Error>) => {
                    errors.push(error.message);
                };
                page.on("pageerror", recordError);
                await openLogger(page, width, theme);
                await expectBalancedLabels(page, theme);
                await expectSeparateFormControls(page);
                await expectCompactHistory(page);
                await expectPortraitAccess(page, width);
                await expectTerrariumContext(page);
                await page.screenshot({
                    path: testInfo.outputPath("logger-summary.png"),
                });
                page.off("pageerror", recordError);
                expect.soft(errors).toStrictEqual([]);
            });
        });
    }
}
