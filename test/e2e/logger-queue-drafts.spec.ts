import { type BrowserContext, expect, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- Shared ESM fixture also serves the isolated browser preview.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const routeLogger = async (context: Readonly<BrowserContext>) => {
    await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-fixture") {
            await route.fulfill({
                body: loggerBrowserFixture({
                    holdBatch: true,
                    preserveQueue: true,
                }),
                contentType: "text/html",
            });
        } else await route.abort();
    });
};
const openLogger = async (page: Readonly<Page>) => {
    await page.goto("/Gardening/logger-fixture");
    await expect
        .soft(
            page.getByText("Connected · Logger browser-fixture", {
                exact: true,
            })
        )
        .toBeVisible();
};
const readQueue = async (page: Readonly<Page>) =>
    page.evaluate(() => {
        const parsed: unknown = JSON.parse(
            document.defaultView?.localStorage.getItem(
                "gardenLoggerObservationQueueV1"
            ) ?? "[]"
        );
        if (!Array.isArray(parsed)) throw new Error("Expected a queue array");
        return parsed.map((value: unknown) => {
            if (
                value === null ||
                typeof value !== "object" ||
                !("payload" in value) ||
                value.payload === null ||
                typeof value.payload !== "object" ||
                !("weight" in value.payload)
            )
                throw new Error("Expected queued weight");
            return String(value.payload.weight);
        });
    });
const queueWeight = async (page: Readonly<Page>, grams: string) => {
    const weigh = page.getByRole("button", { exact: true, name: "Weigh" });
    if ((await weigh.getAttribute("aria-pressed")) !== "true")
        await weigh.click();
    await page.getByLabel("Weight (g)", { exact: true }).fill(grams);
    await page
        .getByRole("button", { exact: true, name: "Add to queue" })
        .click();
};
const expectBlockedWriter = async (
    page: Readonly<Page>,
    expected: readonly string[]
) => {
    await queueWeight(page, "433");
    await expect
        .soft(page.getByRole("alert").filter({ hasText: "another logger tab" }))
        .toBeVisible();
    await expect
        .soft(page.getByLabel("Weight (g)", { exact: true }))
        .toHaveValue("433");
    expect.soft(await readQueue(page)).toStrictEqual(expected);
};
const waitForBatch = async (page: Readonly<Page>) => {
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.dataset["fixtureBatch"]
            )
        )
        .toBe("1");
};
const expectRestoredDraft = async (page: Readonly<Page>) => {
    await expect
        .soft(page.getByRole("textbox", { exact: true, name: "Notes" }))
        .toHaveValue("Unsent leaf reading");
    await expect
        .soft(page.getByLabel("Leaf temperature", { exact: true }))
        .toHaveValue("22");
    await expect
        .soft(page.getByRole("textbox", { exact: true, name: "Notes" }))
        .toBeFocused();
    await expect
        .soft(page.getByRole("status", { name: "Leaf VPD preview" }))
        .toContainText("1.06 kPa");
    expect
        .soft(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
};
const expectHistoryCapacity = async (page: Readonly<Page>) => {
    const description =
        "History space at last refresh: 500 of 50,000 rows used · 49,500 remaining.";
    const capacity = page.getByRole("status", {
        exact: true,
        name: description,
    });
    await expect.soft(capacity).toHaveText("History · 1% used");
    await expect.soft(capacity).toHaveAttribute("title", description);
};

test.describe(
    "logger queue ownership and unsent drafts",
    { tag: "@logger" },
    () => {
        test("native Web Locks release ownership when the sending tab closes", async ({
            context,
            page,
        }) => {
            await routeLogger(context);
            await openLogger(page);
            await page.evaluate(() => {
                document.defaultView?.localStorage.setItem(
                    "gardenLoggerObservationQueueV1",
                    "[]"
                );
            });
            await page.reload();
            const second = await context.newPage();
            await openLogger(second);
            await queueWeight(page, "431");
            await expect.poll(() => readQueue(page)).toStrictEqual(["431"]);
            await queueWeight(second, "432");
            await expect
                .poll(() => readQueue(page))
                .toStrictEqual(["431", "432"]);
            await page.getByRole("button", { name: /^Send /v }).click();
            await waitForBatch(page);
            await expectBlockedWriter(second, ["431", "432"]);
            await page.close();
            await queueWeight(second, "433");
            await expect
                .poll(() => readQueue(second))
                .toStrictEqual([
                    "431",
                    "432",
                    "433",
                ]);
            await second.reload();
            await second.getByRole("button", { name: /^Send /v }).click();
            await waitForBatch(second);
            await second.evaluate(() =>
                dispatchEvent(new Event("fixture-confirm-batch"))
            );
            await expect.poll(() => readQueue(second)).toStrictEqual([]);
        });

        for (const width of [390, 1280]) {
            for (const theme of ["dark", "light"] as const) {
                test(`ordinary drafts and leaf VPD remain accessible at ${width}px in ${theme}`, async ({
                    context,
                    page,
                }) => {
                    await routeLogger(context);
                    await page.setViewportSize({ height: 900, width });
                    await page.emulateMedia({ colorScheme: theme });
                    await openLogger(page);
                    await page
                        .getByRole("button", { exact: true, name: "Leaf VPD" })
                        .click();
                    await page
                        .getByLabel("Leaf temperature unit", { exact: true })
                        .selectOption("C");
                    await page
                        .getByLabel("Air temperature unit", { exact: true })
                        .selectOption("C");
                    await page
                        .getByLabel("Leaf temperature", { exact: true })
                        .fill("22");
                    await page
                        .getByLabel("Paired air temperature", { exact: true })
                        .fill("25");
                    await page
                        .getByLabel("Paired relative humidity (%)", {
                            exact: true,
                        })
                        .fill("50");
                    await page
                        .getByRole("textbox", { exact: true, name: "Notes" })
                        .fill("Unsent leaf reading");
                    await expect
                        .soft(
                            page.getByRole("status", {
                                name: "Leaf VPD preview",
                            })
                        )
                        .toContainText("1.06 kPa");
                    await expect
                        .poll(() =>
                            page.evaluate(
                                () =>
                                    Object.keys(
                                        document.defaultView?.localStorage ?? {}
                                    ).filter((key) =>
                                        key.startsWith(
                                            "gardenLoggerEntryDraftV1:"
                                        )
                                    ).length
                            )
                        )
                        .toBe(1);
                    await page.reload();
                    await expect
                        .soft(
                            page.getByRole("textbox", {
                                exact: true,
                                name: "Notes",
                            })
                        )
                        .toHaveValue("");
                    await page
                        .getByRole("button", {
                            exact: true,
                            name: "Resume draft",
                        })
                        .click();
                    await expectRestoredDraft(page);
                    await expectHistoryCapacity(page);
                });
            }
        }
    }
);
