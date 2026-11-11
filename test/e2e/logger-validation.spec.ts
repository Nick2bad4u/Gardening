import { expect, type Locator, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- Exercise the maintained logger with an isolated service bridge.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const invalidAttribute = "aria-invalid";
const queueKey = "gardenLoggerObservationQueueV1";
const queueName = "Add to queue";
const retainedNote = "Keep this note while choosing a target.";

const openLogger = async (page: Readonly<Page>) => {
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-validation")
            await route.fulfill({
                body: loggerBrowserFixture(),
                contentType: "text/html",
            });
        else await route.abort();
    });
    await page.goto("/Gardening/logger-validation");
    await expect
        .soft(
            page.getByText("Connected · Logger browser-fixture", {
                exact: true,
            })
        )
        .toBeVisible();
};

const singleForm = (page: Readonly<Page>) =>
    page.getByRole("form", { name: "Single plant entry" });
const queueSnapshot = async (page: Readonly<Page>) =>
    page.evaluate(
        (key) => document.defaultView?.localStorage.getItem(key),
        queueKey
    );

const expectInvalid = async (
    control: Readonly<Locator>,
    feedback: Readonly<Locator>,
    message: string
) => {
    await expect.soft(control).toBeFocused();
    await expect.soft(control).toHaveAttribute(invalidAttribute, "true");
    await expect.soft(feedback).toHaveText(message);
};

const expectResolved = async (
    control: Readonly<Locator>,
    feedback: Readonly<Locator>
) => {
    await expect.soft(feedback).toHaveCount(0);
    await expect.soft(control).not.toHaveAttribute(invalidAttribute);
};

const expectRetained = async (
    page: Readonly<Page>,
    control: Readonly<Locator>,
    feedback: Readonly<Locator>,
    queueBefore:
        | null
        | string
        | undefined
) => {
    await page.clock.fastForward(12_000);
    await expect.soft(feedback).toBeVisible();
    await expect.soft(control).toHaveValue("-2");
    expect.soft(await queueSnapshot(page)).toBe(queueBefore);
};

for (const theme of ["dark", "light"] as const) {
    test.describe(
        `logger persistent validation ${theme}`,
        { tag: "@logger" },
        () => {
            test.use({
                colorScheme: theme,
                viewport: { height: 844, width: 390 },
            });

            test("invalid measurements keep feedback and focus without losing their draft", async ({
                page,
            }) => {
                await openLogger(page);
                await page.clock.install();
                const form = singleForm(page);
                await form
                    .getByRole("button", { exact: true, name: "Weigh" })
                    .click();
                const weight = form.getByRole("spinbutton", {
                    exact: true,
                    name: "Weight (g)",
                });
                await weight.fill("-2");
                const queueBefore = await queueSnapshot(page);
                await form.getByRole("button", { name: queueName }).click();
                const feedback = form.getByRole("alert");
                await expectInvalid(
                    weight,
                    feedback,
                    "Weight must be a number greater than zero."
                );
                await expect
                    .soft(weight)
                    .toHaveAttribute(
                        "aria-describedby",
                        "weightFeedback entryValidation"
                    );
                await expectRetained(page, weight, feedback, queueBefore);
                await weight.fill("0");
                await expect.soft(feedback).toBeVisible();
                await weight.fill("430");
                await expectResolved(weight, feedback);
                await expect
                    .soft(weight)
                    .toHaveAttribute("aria-describedby", "weightFeedback");
            });

            test("paired reading feedback clears after a valid zero or removal of its event", async ({
                page,
            }) => {
                await openLogger(page);
                const form = singleForm(page);
                const light = form.getByRole("button", {
                    exact: true,
                    name: "Light reading",
                });
                const ppfd = form.getByRole("spinbutton", {
                    name: /PPFD app estimate/v,
                });
                const lux = form.getByRole("spinbutton", {
                    exact: true,
                    includeHidden: true,
                    name: "Illuminance (lux)",
                });
                const feedback = form.getByRole("alert");
                await light.click();
                await form.getByRole("button", { name: queueName }).click();
                await expectInvalid(
                    ppfd,
                    feedback,
                    "Enter PPFD, illuminance, or both for the Light reading."
                );
                await expect
                    .soft(lux)
                    .toHaveAttribute(invalidAttribute, "true");
                await lux.fill("0");
                await expectResolved(ppfd, feedback);
                await lux.fill("");
                await form.getByRole("button", { name: queueName }).click();
                await expect.soft(feedback).toBeVisible();
                await light.click();
                await expectResolved(lux, feedback);
            });

            test("bulk errors identify the missing target and disappear only when corrected", async ({
                page,
            }) => {
                await openLogger(page);
                await page
                    .getByRole("tab", { exact: true, name: "Bulk care" })
                    .click();
                const form = page.getByRole("form", {
                    name: "Bulk care entry",
                });
                await form.getByRole("checkbox", { name: /P01/v }).check();
                await form
                    .getByRole("button", { exact: true, name: "Mist" })
                    .click();
                await form
                    .getByRole("button", { name: /Save \d+ actions? for/v })
                    .click();
                const leaves = form.getByRole("checkbox", {
                    exact: true,
                    name: "Leaves",
                });
                const feedback = form.getByRole("alert");
                await expectInvalid(
                    leaves,
                    feedback,
                    "Choose where you misted."
                );
                const notes = form.getByRole("textbox", {
                    exact: true,
                    name: "Notes",
                });
                await notes.fill(retainedNote);
                await expect.soft(feedback).toBeVisible();
                await leaves.check();
                await expectResolved(leaves, feedback);
                await expect.soft(notes).toHaveValue(retainedNote);
            });

            test("save now focuses the invalid reading and a cleared time keeps its valid date", async ({
                page,
            }) => {
                await openLogger(page);
                const form = singleForm(page);
                await form
                    .getByRole("button", { exact: true, name: "Humidity" })
                    .click();
                const humidity = form.getByRole("spinbutton", {
                    name: /relative humidity/v,
                });
                const save = form.getByRole("button", {
                    exact: true,
                    name: "Save now",
                });
                const feedback = form.getByRole("alert");
                await humidity.fill("101");
                await save.click();
                await expectInvalid(
                    humidity,
                    feedback,
                    "Relative humidity must be between 0 and 100 % RH."
                );
                await humidity.fill("50");
                await expectResolved(humidity, feedback);
                const date = form.getByLabel("Observed date", { exact: true });
                const time = form.getByLabel("Observed time", { exact: true });
                const retainedDate = await date.inputValue();
                await time.fill("");
                await save.click();
                await expectInvalid(
                    time,
                    feedback,
                    "Choose a valid observation date and time."
                );
                await expect.soft(date).toHaveValue(retainedDate);
                await expect.soft(date).not.toHaveAttribute(invalidAttribute);
                await time.fill("12:34");
                await expectResolved(time, feedback);
            });

            test("unmapped failures remain a persistent summary without blaming a field", async ({
                page,
            }) => {
                await openLogger(page);
                await page.clock.install();
                await page.addScriptTag({
                    content:
                        'payloadFromForm = () => { throw new Error("Fixture validation is unavailable."); };',
                });
                const form = singleForm(page);
                await form.getByRole("button", { name: queueName }).click();
                const feedback = form.getByRole("alert");
                await expect.soft(feedback).toBeFocused();
                await expect
                    .soft(feedback)
                    .toHaveText("Fixture validation is unavailable.");
                expect
                    .soft(
                        await form.evaluate(
                            (element) =>
                                element.querySelectorAll(
                                    '[aria-invalid="true"]'
                                ).length
                        )
                    )
                    .toBe(0);
                await page.clock.fastForward(12_000);
                await expect.soft(feedback).toBeVisible();
            });
        }
    );
}
