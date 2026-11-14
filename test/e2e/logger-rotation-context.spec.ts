import { expect, type Locator, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- Exercise the maintained logger with local synthetic services.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const startingFacing = "Starting facing";
const newFacing = "New facing";
const rotationAction = "Rotation";
const observedFixtureTime = "2026-09-05T12:00:00Z";

const rotationFixture = () =>
    loggerBrowserFixture({ preserveQueue: true })
        .replace(
            "window.google =",
            () => `
            fixtureBootstrap.actionContextsAvailable = true;
            fixtureBootstrap.plants.forEach((plant, index) => {
                plant.rotationFacing = {
                    facing: index === 0 ? "N" : index === 1 ? "E" : "",
                    observedAt: index < 2 ? "${observedFixtureTime}" : "",
                    observationId: "fixture-facing-" + plant.id,
                    potSetup: plant.potSetup,
                };
                plant.latestRelativeHumidity = 68;
                plant.latestRelativeHumidityAt = "${observedFixtureTime}";
                plant.actionContexts = {
                    Measure: {
                        height: {valueCm: 25.4, observedAt: "${observedFixtureTime}", quality: "Measured", method: "Ruler", entryUnit: "in"},
                        width: {valueCm: 12.7, observedAt: "2026-09-04T12:00:00Z", quality: "Estimated", method: "Estimated visually", entryUnit: "cm"},
                    },
                    Check: {observedAt: "${observedFixtureTime}", potSetup: plant.potSetup, details: {soilMoisture: "Slightly moist"}},
                    Inspect: {observedAt: "${observedFixtureTime}", potSetup: plant.potSetup, details: {condition: "Old lower-leaf mark"}},
                };
            });
            window.google =`
        )
        .replace(
            'saveWebObservation() { failure({ message: "Fixture writes are disabled." }); }',
            `saveWebObservation(payload) {
            const requests = JSON.parse(document.documentElement.dataset.rotationRequests || "[]");
            requests.push(payload);
            document.documentElement.dataset.rotationRequests = JSON.stringify(requests);
            failure({message: "Fixture save unconfirmed"});
        }, getWebSaveStatus() { success({state: "missing"}); }`
        )
        .replace(
            'saveBulkCareObservation() { failure({ message: "Fixture writes are disabled." }); }',
            `saveBulkCareObservation(payload) {
            document.documentElement.dataset.bulkRotationRequest = JSON.stringify(payload);
            failure({message: "Fixture bulk save unconfirmed"});
        }`
        );

const openRotationLogger = async (
    page: Readonly<Page>,
    width: number,
    theme: "dark" | "light"
) => {
    await page.setViewportSize({ height: 900, width });
    await page.emulateMedia({ colorScheme: theme });
    await page.clock.install({ time: "2026-09-09T14:00:00Z" });
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-rotation-fixture")
            await route.fulfill({
                body: rotationFixture(),
                contentType: "text/html",
            });
        else await route.abort();
    });
    await page.goto("/Gardening/logger-rotation-fixture");
    return page.getByRole("form", { name: "Single plant entry" });
};

const lastQueuedPayload = async (page: Readonly<Page>): Promise<unknown> =>
    page.evaluate(() => {
        const queue: unknown = JSON.parse(
            document.defaultView?.localStorage.getItem(
                "gardenLoggerObservationQueueV1"
            ) ?? "[]"
        );
        if (!Array.isArray(queue)) throw new Error("Expected fixture queue");
        const last: unknown = queue.at(-1);
        if (
            last === null ||
            last === undefined ||
            typeof last !== "object" ||
            !("payload" in last)
        )
            throw new Error("Expected queued payload");
        return last.payload;
    });

const queueFacing = async (
    page: Readonly<Page>,
    form: Readonly<Locator>,
    to: string,
    degrees: string,
    preview: string
) => {
    await form.getByLabel(startingFacing, { exact: true }).selectOption("N");
    await form.getByLabel(newFacing, { exact: true }).selectOption(to);
    await expect
        .soft(form.getByRole("status", { name: "Rotation turn preview" }))
        .toContainText(preview);
    await form
        .getByRole("button", { exact: true, name: "Add to queue" })
        .click();
    expect.soft(await lastQueuedPayload(page)).toMatchObject({
        rotationDegrees: degrees,
        rotationFromFacing: "N",
        rotationToFacing: to,
    });
};

const checkRecordedContexts = async (form: Readonly<Locator>) => {
    await form
        .getByRole("button", { exact: true, name: "Clear entry" })
        .click();
    await form.getByRole("button", { exact: true, name: "Measure" }).click();
    await expect
        .soft(form.getByText(/Last recorded: height: 10 in/v))
        .toContainText("width: 5 in");
    await expect
        .soft(form.getByText(/Last recorded: height: 10 in/v))
        .toContainText("Estimated visually");
    await expect
        .soft(form.getByLabel("Height (in)", { exact: true }))
        .toHaveValue("");
    await form.getByRole("button", { exact: true, name: "Measure" }).click();
    await form.getByRole("button", { exact: true, name: "Humidity" }).click();
    await expect
        .soft(form.getByText(/Last recorded: 68 % RH/v))
        .toContainText("2026");
    await expect
        .soft(
            form.getByLabel("Current relative humidity (% RH)", { exact: true })
        )
        .toHaveValue("");
};

const checkBulkFacing = async (page: Readonly<Page>) => {
    await page.getByRole("tab", { exact: true, name: "Bulk care" }).click();
    const form = page.getByRole("form", { name: "Bulk care entry" });
    await form.getByRole("button", { exact: true, name: "Water" }).click();
    await form
        .getByRole("button", { exact: true, name: rotationAction })
        .click();
    await form.getByRole("checkbox", { name: /Collection plant 1\b/v }).check();
    await form.getByRole("checkbox", { name: /Collection plant 2\b/v }).check();
    await form
        .getByLabel("New facing for selected plants", { exact: true })
        .selectOption("W");
    await form
        .getByLabel(/Collection plant 1 — starting facing/v)
        .selectOption("N");
    await expect
        .soft(form.getByLabel(/Collection plant 1 — starting facing/v))
        .toHaveValue("N");
    await expect
        .soft(form.getByLabel(/Collection plant 2 — starting facing/v))
        .toHaveValue("E");
    await form
        .getByRole("button", { exact: true, name: "Save 1 action for 2" })
        .click();
    const payload = await page.evaluate(
        () =>
            JSON.parse(
                document.documentElement.dataset["bulkRotationRequest"] ??
                    "null"
            ) as unknown
    );
    expect.soft(payload).toMatchObject({
        rotationByPlant: {
            P01: {
                rotationDegrees: "270",
                rotationFromFacing: "N",
                rotationToFacing: "W",
            },
            P02: {
                rotationDegrees: "180",
                rotationFromFacing: "E",
                rotationToFacing: "W",
            },
        },
    });
};

const expectNoOverflow = async (page: Readonly<Page>) => {
    expect
        .soft(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
};

test.describe("cardinal rotation and contextual observations", () => {
    for (const width of [390, 1280]) {
        for (const theme of ["dark", "light"] as const) {
            test(
                `cardinal rotations and recorded contexts ${width}px ${theme}`,
                { tag: "@logger" },
                async ({ page }, testInfo) => {
                    const errors: string[] = [];
                    const recordError = (error: Readonly<Error>) => {
                        errors.push(error.message);
                    };
                    page.on("pageerror", recordError);
                    const form = await openRotationLogger(page, width, theme);
                    await form
                        .getByRole("button", {
                            exact: true,
                            name: rotationAction,
                        })
                        .click();
                    await expect
                        .soft(form.getByLabel(startingFacing, { exact: true }))
                        .toHaveValue("N");
                    await queueFacing(page, form, "N", "0", "Same facing");
                    await queueFacing(page, form, "E", "90", "90° clockwise");
                    await queueFacing(page, form, "S", "180", "180° clockwise");
                    await form
                        .getByLabel(newFacing, { exact: true })
                        .selectOption("W");
                    await form
                        .getByRole("status", { name: "Rotation turn preview" })
                        .screenshot({
                            path: testInfo.outputPath("rotation-preview.png"),
                        });
                    await queueFacing(
                        page,
                        form,
                        "W",
                        "270",
                        "90° counterclockwise"
                    );
                    await page
                        .getByRole("button", { exact: true, name: "Labels" })
                        .click();
                    const picker = page.getByRole("group", {
                        name: "Choose plant by pot label",
                    });
                    await picker.getByRole("button", { name: /P02/v }).click();
                    await expect
                        .soft(form.getByLabel(startingFacing, { exact: true }))
                        .toHaveValue("E");
                    await expect
                        .soft(form.getByLabel(newFacing, { exact: true }))
                        .toHaveValue("");
                    await picker.getByRole("button", { name: /P03/v }).click();
                    await form
                        .getByLabel(newFacing, { exact: true })
                        .selectOption("S");
                    await form
                        .getByRole("button", {
                            exact: true,
                            name: "Add to queue",
                        })
                        .click();
                    expect.soft(await lastQueuedPayload(page)).toMatchObject({
                        plantId: "P03",
                        rotationDegrees: "",
                        rotationFromFacing: "",
                        rotationToFacing: "S",
                    });
                    await checkRecordedContexts(form);
                    await checkBulkFacing(page);
                    await expectNoOverflow(page);
                    expect.soft(errors).toStrictEqual([]);
                    page.off("pageerror", recordError);
                }
            );
        }
    }

    test(
        "backdated explicit facing and pending retry retain the same endpoints",
        { tag: "@logger" },
        async ({ page }) => {
            const form = await openRotationLogger(page, 390, "dark");
            await form
                .getByRole("button", { exact: true, name: rotationAction })
                .click();
            await form.getByLabel(newFacing, { exact: true }).selectOption("W");
            await form
                .getByLabel("Observed date", { exact: false })
                .fill("2026-09-04");
            await expect
                .soft(form.getByLabel(startingFacing, { exact: true }))
                .toHaveValue("");
            await form
                .getByLabel(startingFacing, { exact: true })
                .selectOption("S");
            await form
                .getByRole("button", { exact: true, name: "Save now" })
                .click();
            await form
                .getByRole("button", { exact: true, name: "Save now" })
                .click();
            const requests = await page.evaluate(
                () =>
                    JSON.parse(
                        document.documentElement.dataset["rotationRequests"] ??
                            "[]"
                    ) as unknown
            );
            expect.soft(requests).toStrictEqual([
                expect.objectContaining({
                    rotationDegrees: "90",
                    rotationFromFacing: "S",
                    rotationToFacing: "W",
                }),
                expect.objectContaining({
                    rotationDegrees: "90",
                    rotationFromFacing: "S",
                    rotationToFacing: "W",
                }),
            ]);
            const isIdentical = await page.evaluate(() => {
                const saved: unknown = JSON.parse(
                    document.documentElement.dataset["rotationRequests"] ?? "[]"
                );
                return (
                    Array.isArray(saved) &&
                    saved.length === 2 &&
                    JSON.stringify(saved[0]) === JSON.stringify(saved[1])
                );
            });
            expect.soft(isIdentical).toBe(true);
        }
    );
});
