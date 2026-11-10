import { expect, type Locator, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- Shared ESM fixture also serves the isolated browser preview.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const openLogger = async (page: Readonly<Page>) => {
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-fixture") {
            await route.fulfill({
                body: loggerBrowserFixture(),
                contentType: "text/html",
            });
        } else await route.abort();
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

const expectFocusedAfterKey = async (
    page: Readonly<Page>,
    key: string,
    target: Readonly<Locator>
) => {
    await page.keyboard.press(key);
    await expect.soft(target).toBeFocused();
};

const expectActiveMode = async (
    active: Readonly<Locator>,
    inactive: Readonly<Locator>
) => {
    await expect.soft(active).toHaveAttribute("aria-selected", "true");
    await expect.soft(active).toHaveAttribute("tabindex", "0");
    await expect.soft(inactive).toHaveAttribute("aria-selected", "false");
    await expect.soft(inactive).toHaveAttribute("tabindex", "-1");
};

const expectPlantSelection = async (
    page: Readonly<Page>,
    id: string,
    summary: Readonly<Locator>
) => {
    await expect
        .soft(page.getByLabel("Plant", { exact: true }))
        .toHaveValue(id);
    await expect.soft(summary).toBeFocused();
    await expect
        .soft(page.getByRole("listbox", { name: "Matching plants" }))
        .toBeHidden();
};

for (const width of [390, 1280]) {
    for (const theme of ["dark", "light"] as const) {
        test.describe(
            `logger keyboard ${width}px ${theme}`,
            { tag: "@logger" },
            () => {
                test.use({
                    colorScheme: theme,
                    viewport: { height: 900, width },
                });

                test("entry modes support arrow and boundary keys without losing a draft", async ({
                    page,
                }) => {
                    await openLogger(page);
                    const single = page.getByRole("tab", {
                        name: "Single plant",
                    });
                    const bulk = page.getByRole("tab", { name: "Bulk care" });
                    const notes = page.getByRole("textbox", {
                        exact: true,
                        name: "Notes",
                    });
                    await notes.fill("Keep this unsaved observation");
                    await single.focus();
                    await expectActiveMode(single, bulk);
                    await expectFocusedAfterKey(page, "ArrowRight", bulk);
                    await expectActiveMode(bulk, single);
                    await expect
                        .soft(
                            page.getByRole("form", { name: "Bulk care entry" })
                        )
                        .toBeVisible();
                    await expectFocusedAfterKey(page, "ArrowRight", single);
                    await expectFocusedAfterKey(page, "End", bulk);
                    await expectFocusedAfterKey(page, "Home", single);
                    await expectFocusedAfterKey(page, "ArrowLeft", bulk);
                    await expectFocusedAfterKey(page, "ArrowLeft", single);
                    await expectActiveMode(single, bulk);
                    await expect
                        .soft(notes)
                        .toHaveValue("Keep this unsaved observation");
                });

                test("bulk action toggles retain keyboard focus", async ({
                    page,
                }) => {
                    await openLogger(page);
                    await page.getByRole("tab", { name: "Bulk care" }).click();
                    const form = page.getByRole("form", {
                        name: "Bulk care entry",
                    });
                    const rotation = form.getByRole("button", {
                        exact: true,
                        name: "Rotation",
                    });
                    const degrees = form.getByRole("spinbutton", {
                        exact: true,
                        name: "Rotation (degrees)",
                    });
                    await rotation.focus();
                    await expectFocusedAfterKey(page, "Space", rotation);
                    await expect
                        .soft(rotation)
                        .toHaveAttribute("aria-pressed", "true");
                    await expect.soft(degrees).toBeVisible();
                    await expectFocusedAfterKey(page, "Enter", rotation);
                    await expect
                        .soft(rotation)
                        .toHaveAttribute("aria-pressed", "false");
                    await expect.soft(degrees).toBeHidden();
                    await expectFocusedAfterKey(
                        page,
                        "Tab",
                        form.getByRole("button", { exact: true, name: "Move" })
                    );
                });

                test("plant list supports navigation, selection, escape and a single tab stop", async ({
                    page,
                }) => {
                    await openLogger(page);
                    await page
                        .getByRole("button", { exact: true, name: "List" })
                        .click();
                    const summary = page.getByLabel(
                        /^Choose plant\. Current selection:/v
                    );
                    const list = page.getByRole("listbox", {
                        name: "Matching plants",
                    });
                    const first = list
                        .getByRole("option")
                        .filter({ hasText: "P01" });
                    const second = list
                        .getByRole("option")
                        .filter({ hasText: "P02" });
                    const last = list
                        .getByRole("option")
                        .filter({ hasText: "P41" });
                    await summary.focus();
                    await expectFocusedAfterKey(page, "ArrowDown", first);
                    expect
                        .soft(
                            await list.evaluate(
                                (element) =>
                                    element.querySelectorAll('[tabindex="0"]')
                                        .length
                            )
                        )
                        .toBe(1);
                    await expectFocusedAfterKey(page, "ArrowDown", second);
                    await expect
                        .soft(page.getByLabel("Plant", { exact: true }))
                        .toHaveValue("P01");
                    await page.keyboard.press("Enter");
                    await expectPlantSelection(page, "P02", summary);
                    await expectFocusedAfterKey(page, "ArrowDown", second);
                    await expectFocusedAfterKey(page, "End", last);
                    await expectFocusedAfterKey(page, "ArrowDown", last);
                    await expectFocusedAfterKey(page, "Home", first);
                    await expectFocusedAfterKey(page, "ArrowUp", first);
                    await page.keyboard.press("Escape");
                    await expectPlantSelection(page, "P02", summary);
                    await page.keyboard.press("Enter");
                    await expect.soft(list).toBeVisible();
                    await expectFocusedAfterKey(page, "Tab", second);
                    await page.keyboard.press("Escape");
                    await expectFocusedAfterKey(page, "ArrowUp", second);
                    await expectFocusedAfterKey(page, "Home", first);
                    await page.keyboard.press("Space");
                    await expectPlantSelection(page, "P01", summary);
                });
            }
        );
    }
}
