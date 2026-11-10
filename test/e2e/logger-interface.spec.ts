import { expect, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- The shared fixture uses the maintained logger HTML.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const openLogger = async (page: Readonly<Page>, shouldFailHistory = false) => {
    const html = loggerBrowserFixture().replace(
        "getRecentWebObservations() { success(fixtureBootstrap.recent); }",
        () => `getRecentWebObservations() {
            const attempt = Number(document.documentElement.dataset.historyAttempts || "0") + 1;
            document.documentElement.dataset.historyAttempts = String(attempt);
            if (${String(shouldFailHistory)} && attempt === 1) failure({ message: "Fixture connection lost" });
            else success(fixtureBootstrap.recent);
        }`
    );
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-fixture") {
            await route.fulfill({ body: html, contentType: "text/html" });
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

for (const width of [390, 1280]) {
    for (const theme of ["dark", "light"] as const) {
        test.describe(
            `logger interface ${width}px ${theme}`,
            { tag: "@logger" },
            () => {
                test.use({
                    colorScheme: theme,
                    viewport: { height: 900, width },
                });

                test("water instructions appear once and measurement help stays open while editing", async ({
                    page,
                }) => {
                    await openLogger(page);
                    const form = page.getByRole("form", {
                        name: "Single plant entry",
                    });
                    await form
                        .getByRole("button", { exact: true, name: "Water" })
                        .click();
                    await expect
                        .soft(
                            form.getByText(
                                "Enter an amount only if measured. Select Weigh separately for a scale reading."
                            )
                        )
                        .toBeVisible();
                    await expect
                        .soft(
                            form.getByText(
                                /Water · (?:how to record|recording help)/v
                            )
                        )
                        .toHaveCount(0);
                    const label = form.getByText("Water amount (mL)", {
                        exact: true,
                    });
                    await expect
                        .soft(label)
                        .toHaveCSS("text-transform", "none");
                    await form
                        .getByRole("button", { exact: true, name: "Weigh" })
                        .click();
                    const help = form.getByText("Weigh · recording help", {
                        exact: true,
                    });
                    await help.click();
                    const instruction = form.getByText(
                        "Weigh the complete current pot setup in grams.",
                        { exact: true }
                    );
                    await form
                        .getByRole("spinbutton", {
                            exact: true,
                            name: "Weight (g)",
                        })
                        .fill("412.5");
                    await expect.soft(instruction).toBeVisible();
                    await expect
                        .poll(() =>
                            page.evaluate(
                                () =>
                                    document.documentElement.scrollWidth <=
                                    innerWidth
                            )
                        )
                        .toBe(true);
                });

                test("history retries stay next to retained entries and preserve an unsaved draft", async ({
                    page,
                }) => {
                    await openLogger(page, true);
                    const notes = page.getByRole("textbox", {
                        exact: true,
                        name: "Notes",
                    });
                    await notes.fill("Keep my unsaved observation");
                    const history = page.getByRole("region", {
                        name: "Recent History",
                    });
                    const entries = history.getByRole("button", {
                        name: /^Correct .* entry for /v,
                    });
                    const before = await entries.count();
                    const retry = history.getByRole("button", {
                        exact: true,
                        name: "Refresh history",
                    });
                    await retry.click();
                    await expect
                        .soft(history.getByRole("status"))
                        .toContainText("keeping previous entries");
                    await expect.soft(entries).toHaveCount(before);
                    await expect.soft(retry).toBeEnabled();
                    await retry.click();
                    await expect
                        .soft(history.getByRole("status"))
                        .toContainText("Showing");
                    await expect
                        .soft(notes)
                        .toHaveValue("Keep my unsaved observation");
                });

                test("invalid measurements stay in the form instead of entering the offline queue", async ({
                    page,
                }) => {
                    await openLogger(page);
                    const form = page.getByRole("form", {
                        name: "Single plant entry",
                    });
                    const queue = form.getByRole("button", {
                        exact: true,
                        name: "Add to queue",
                    });
                    const before = await page.evaluate(() =>
                        document.defaultView?.localStorage.getItem(
                            "gardenLoggerObservationQueueV1"
                        )
                    );
                    const weight = form.getByRole("spinbutton", {
                        exact: true,
                        name: "Weight (g)",
                    });
                    await form
                        .getByRole("button", { exact: true, name: "Weigh" })
                        .click();
                    await weight.fill("-1");
                    await queue.click();
                    await expect
                        .soft(
                            page.getByText(
                                "Weight must be a number greater than zero.",
                                { exact: true }
                            )
                        )
                        .toBeVisible();
                    await expect.soft(weight).toHaveValue("-1");
                    await weight.fill("0");
                    await queue.click();
                    await weight.fill("410");
                    await form
                        .getByRole("button", { exact: true, name: "Measure" })
                        .click();
                    const height = form.getByRole("spinbutton", {
                        exact: true,
                        name: "Height (in)",
                    });
                    await height.fill("-2");
                    await queue.click();
                    await expect
                        .soft(
                            page.getByText(
                                "Height must be a number greater than zero.",
                                { exact: true }
                            )
                        )
                        .toBeVisible();
                    await expect.soft(height).toHaveValue("-2");
                    expect
                        .soft(
                            await page.evaluate(() =>
                                document.defaultView?.localStorage.getItem(
                                    "gardenLoggerObservationQueueV1"
                                )
                            )
                        )
                        .toBe(before);
                });
            }
        );
    }
}
