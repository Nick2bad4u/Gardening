import { expect, type Locator, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- Actual logger markup with a local-only service bridge.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const readLastPayload = async (page: Readonly<Page>) =>
    page.evaluate(() => {
        const queue: unknown = JSON.parse(
            document.defaultView?.localStorage.getItem(
                "gardenLoggerObservationQueueV1"
            ) ?? "[]"
        );
        if (!Array.isArray(queue)) throw new Error("Expected fixture queue");
        const last: unknown = queue.at(-1);
        if (last === null || typeof last !== "object" || !("payload" in last))
            throw new Error("Expected queued payload");
        return last.payload;
    });

const saveAndOverride = async (form: Readonly<Locator>) => {
    const nutrients = form.getByRole("checkbox", { name: "Add nutrients" });
    await expect.soft(nutrients).not.toBeChecked();
    await expect.soft(form.getByLabel("Dose", { exact: true })).toBeHidden();
    await nutrients.check();
    await form
        .getByLabel("Product / mix", { exact: true })
        .selectOption("MSU 13-3-15");
    await form.getByLabel("Dose", { exact: true }).fill("0.5");
    await form
        .getByLabel("Unit / concentration", { exact: true })
        .selectOption("g per gallon");
    await form.getByRole("button", { name: "Save as usual dose" }).click();
    await expect
        .soft(form.getByText("Usual dose: 0.5 g per gallon.", { exact: false }))
        .toBeVisible();
    await form.getByLabel("Dose", { exact: true }).fill("0.25");
    await form
        .getByRole("button", { exact: true, name: "Add to queue" })
        .click();
    await expect.soft(nutrients).not.toBeChecked();
};

const checkReloadedDose = async (
    page: Readonly<Page>,
    form: Readonly<Locator>
) => {
    await page.reload();
    const nutrients = form.getByRole("checkbox", { name: "Add nutrients" });
    await expect.soft(nutrients).not.toBeChecked();
    const water = form.getByRole("button", { exact: true, name: "Water" });
    if ((await water.getAttribute("aria-pressed")) !== "true")
        await water.click();
    await nutrients.check();
    await expect
        .soft(form.getByLabel("Dose", { exact: true }))
        .toHaveValue("0.5");
    await expect
        .soft(form.getByLabel("Unit / concentration", { exact: true }))
        .toHaveValue("g per gallon");
    await form.getByLabel("Dose", { exact: true }).fill("0.1");
    await form.getByRole("button", { name: "Use saved dose" }).click();
    await expect
        .soft(form.getByLabel("Dose", { exact: true }))
        .toHaveValue("0.5");
};

const checkBulkDose = async (page: Readonly<Page>) => {
    await page.getByRole("tab", { exact: true, name: "Bulk care" }).click();
    const bulk = page.getByRole("form", { name: "Bulk care entry" });
    await expect
        .soft(bulk.getByRole("checkbox", { name: "Add nutrients" }))
        .not.toBeChecked();
    await bulk.getByRole("checkbox", { name: "Add nutrients" }).check();
    await bulk
        .getByLabel("Product / mix", { exact: true })
        .selectOption("MSU 13-3-15");
    await expect
        .soft(bulk.getByLabel("Dose", { exact: true }))
        .toHaveValue("0.5");
};

for (const width of [390, 1280]) {
    for (const theme of ["dark", "light"] as const) {
        test.describe(
            `nutrient preferences ${width}px ${theme}`,
            { tag: "@logger" },
            () => {
                test("keeps a usual dose separate from one-off amounts and requires explicit opt-in", async ({
                    page,
                }) => {
                    await page.setViewportSize({ height: 900, width });
                    await page.emulateMedia({ colorScheme: theme });
                    await page.route("**/*", async (route) => {
                        const url = new URL(route.request().url());
                        if (
                            url.pathname ===
                            "/Gardening/logger-nutrient-fixture"
                        ) {
                            await route.fulfill({
                                body: loggerBrowserFixture({
                                    preserveQueue: true,
                                }),
                                contentType: "text/html",
                            });
                        } else await route.abort();
                    });
                    await page.goto("/Gardening/logger-nutrient-fixture");
                    const form = page.getByRole("form", {
                        name: "Single plant entry",
                    });
                    await form
                        .getByRole("button", { exact: true, name: "Water" })
                        .click();
                    await saveAndOverride(form);
                    expect.soft(await readLastPayload(page)).toMatchObject({
                        nutrientAmount: "0.25 g per gallon",
                        nutrientProduct: "MSU 13-3-15",
                        nutrientsUsed: "Yes",
                    });
                    await checkReloadedDose(page, form);
                    await checkBulkDose(page);
                    expect
                        .soft(
                            await page.evaluate(
                                () =>
                                    document.documentElement.scrollWidth <=
                                    innerWidth
                            )
                        )
                        .toBe(true);
                });
            }
        );
    }
}
