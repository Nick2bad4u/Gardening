import {
    type BrowserContext,
    expect,
    type Locator,
    type Page,
    test,
} from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- Actual logger markup with a local-only service bridge.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const usualDoseActionName = "Save as usual dose";
const singlePlantEntryName = "Single plant entry";
const nutrientCheckboxName = "Add nutrients";

const createSharedNutrientService = () => {
    const preferences: { doses: Record<string, string>; product: string } = {
        doses: {},
        product: "",
    };
    const request = (method: string, payload: unknown) => {
        if (method === "sync") return structuredClone(preferences);
        if (
            payload === null ||
            typeof payload !== "object" ||
            !("product" in payload) ||
            typeof payload.product !== "string" ||
            !("amount" in payload) ||
            typeof payload.amount !== "string" ||
            !("expectedAmount" in payload) ||
            typeof payload.expectedAmount !== "string"
        )
            throw new Error("Malformed fixture preference request");
        const isSaved =
            (preferences.doses[payload.product] ?? "") ===
            payload.expectedAmount;
        if (isSaved) {
            preferences.doses[payload.product] = payload.amount;
            preferences.product = payload.product;
        }
        return { preferences: structuredClone(preferences), saved: isSaved };
    };
    return { preferences, request };
};

const installSharedNutrientLogger = async (
    context: Readonly<BrowserContext>,
    service: Readonly<
        Pick<ReturnType<typeof createSharedNutrientService>, "request">
    >
) => {
    await context.exposeFunction(
        "fixtureSharedNutrientService",
        service.request
    );
    await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-shared-nutrients") {
            await route.fulfill({
                body: loggerBrowserFixture({ preserveQueue: true }),
                contentType: "text/html",
            });
        } else await route.abort();
    });
};

const prepareSharedDose = async (page: Readonly<Page>, amount: string) => {
    const form = page.getByRole("form", { name: singlePlantEntryName });
    await form.getByRole("button", { exact: true, name: "Water" }).click();
    await form.getByRole("checkbox", { name: nutrientCheckboxName }).check();
    await form
        .getByLabel("Product / mix", { exact: true })
        .selectOption("MSU 13-3-15");
    await form.getByLabel("Dose", { exact: true }).fill(amount);
    await form
        .getByLabel("Unit / concentration", { exact: true })
        .selectOption("g per gallon");
    return form;
};

const expectSharedDefaults = async (page: Readonly<Page>) => {
    const form = page.getByRole("form", { name: singlePlantEntryName });
    await expect
        .soft(form.getByLabel("Dose", { exact: true }))
        .toHaveValue("0.5");
    await expect
        .soft(form.getByLabel(nutrientCheckboxName, { exact: true }))
        .not.toBeChecked();
};

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
    const nutrients = form.getByRole("checkbox", {
        name: nutrientCheckboxName,
    });
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
    await form.getByRole("button", { name: usualDoseActionName }).click();
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
    const nutrients = form.getByRole("checkbox", {
        name: nutrientCheckboxName,
    });
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
        .soft(bulk.getByRole("checkbox", { name: nutrientCheckboxName }))
        .not.toBeChecked();
    await bulk.getByRole("checkbox", { name: nutrientCheckboxName }).check();
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
                        name: singlePlantEntryName,
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

test.describe(
    "nutrient doses across independent browsers",
    { tag: "@logger" },
    () => {
        test("shares defaults without sharing opt-ins and requires review before replacing a concurrent update", async ({
            browser,
        }) => {
            const service = createSharedNutrientService();
            const phone = await browser.newContext({
                viewport: { height: 844, width: 390 },
            });
            const computer = await browser.newContext({
                viewport: { height: 900, width: 1280 },
            });
            try {
                await installSharedNutrientLogger(phone, service);
                await installSharedNutrientLogger(computer, service);
                const phonePage = await phone.newPage();
                await phonePage.goto(
                    "https://logger-fixture.test/Gardening/logger-shared-nutrients"
                );
                const phoneForm = await prepareSharedDose(phonePage, "0.5");
                await phoneForm
                    .getByRole("button", { name: usualDoseActionName })
                    .click();
                await expect
                    .poll(() => service.preferences.doses["MSU 13-3-15"])
                    .toBe("0.5 g per gallon");
                const computerPage = await computer.newPage();
                await computerPage.goto(
                    "https://logger-fixture.test/Gardening/logger-shared-nutrients"
                );
                await expectSharedDefaults(computerPage);
                const computerForm = await prepareSharedDose(
                    computerPage,
                    "0.25"
                );
                await phoneForm
                    .getByLabel("Dose", { exact: true })
                    .fill("0.75");
                await phoneForm
                    .getByRole("button", { name: usualDoseActionName })
                    .click();
                await expect
                    .poll(() => service.preferences.doses["MSU 13-3-15"])
                    .toBe("0.75 g per gallon");
                await computerForm
                    .getByRole("button", { name: usualDoseActionName })
                    .click();
                await expect
                    .soft(
                        computerPage
                            .getByRole("status")
                            .filter({ hasText: "changed on another device" })
                    )
                    .toContainText("changed on another device");
                await expect
                    .soft(computerForm.getByLabel("Dose", { exact: true }))
                    .toHaveValue("0.25");
                await computerForm
                    .getByRole("button", { name: usualDoseActionName })
                    .click();
                await expect
                    .poll(() => service.preferences.doses["MSU 13-3-15"])
                    .toBe("0.25 g per gallon");
            } finally {
                await phone.close();
                await computer.close();
            }
        });
    }
);
