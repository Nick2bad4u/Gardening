import { expect, type Page, test } from "@playwright/test";

const pressedAttribute = "aria-pressed";
const plantCsv = [
    "Plant ID,Current pot label,Plant / planter,Scientific name / contents",
    "P01,A1,Variegated moon cactus,Gymnocalycium mihanovichii",
    "P02,A2,Feather cactus,Mammillaria plumosa",
    "P03,A3,Serpent cactus,Nyctocereus serpentinus",
    "P19,#1,Shared cacti,Three cactus species",
    "P20,#2,Shared succulents,Four succulent species",
].join("\n");
const historyCsv = [
    "Date,Plant ID,Event,Weight state,Weight (g),Height (cm),Width (cm),Plant condition,Notes,Pot setup,Record status,Request ID",
    "2026-09-01,P01,Weight,Dry,400,,,Healthy,First dry reading,1,Active,fixture-dry",
    "2026-09-02,P01,Water,,,,,Healthy,Plain water,1,Active,fixture-water",
    "2026-09-02,P01,Weight,Wet,600,,,Healthy,Drained wet reading,1,Active,fixture-wet",
    "2026-09-03,P01,Weight,Routine,550,8,6,Healthy,Routine check,1,Active,fixture-routine",
    "2026-09-04,P02,Check,,,,,Healthy,No weight recorded,1,Active,fixture-check",
    "2026-09-04,P19,Weight,Routine,950,,,Healthy,Shared pot reading,1,Active,fixture-shared",
].join("\n");

async function expectContained(page: Readonly<Page>) {
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
}

async function prepare(
    page: Readonly<Page>,
    theme: "dark" | "light",
    shouldRetry = false
) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**://*.googletagmanager.com/**", (route) =>
        route.abort()
    );
    const responseState = { unavailable: shouldRetry };
    await page.route("https://docs.google.com/**", async (route) => {
        const isFailed = responseState.unavailable;
        const requestUrl = new URL(route.request().url());
        await route.fulfill({
            body: isFailed
                ? "Fixture unavailable"
                : requestUrl.searchParams.get("gid") === "0"
                  ? plantCsv
                  : historyCsv,
            contentType: "text/csv",
            status: isFailed ? 503 : 200,
        });
    });
    return () => {
        responseState.unavailable = false;
    };
}

for (const theme of ["dark", "light"] as const) {
    test.describe(`${theme} native tools`, { tag: "@tools" }, () => {
        test("tracker retries, filters, maximizes, and opens canonical history", async ({
            page,
        }, testInfo) => {
            const restoreSource = await prepare(page, theme, true);
            await page.goto("/Gardening/tracker/");
            await expect
                .soft(
                    page.getByText(
                        "The published log could not load. Open Google Sheets with the button above."
                    )
                )
                .toBeVisible();
            restoreSource();
            await page.getByRole("button", { name: "Refresh data" }).click();
            await expect
                .soft(
                    page.getByText(
                        "5 containers and 6 observations loaded from Google Sheets."
                    )
                )
                .toBeVisible();
            await page
                .getByRole("searchbox", { name: "Find a plant" })
                .fill("moon");
            const table = page.getByRole("table");
            await expect.soft(table.getByRole("row")).toHaveCount(2);
            await page.getByRole("button", { name: "Maximize table" }).click();
            await expect
                .soft(page.getByRole("button", { name: "Restore page" }))
                .toHaveAttribute(pressedAttribute, "true");
            await page.keyboard.press("Escape");
            await expectContained(page);
            await page.screenshot({ path: testInfo.outputPath("tracker.png") });
            await table.getByRole("link", { exact: true, name: "A1" }).click();
            await expect.soft(page).toHaveURL(/\/pots\/P01\//v);
        });

        test("history preserves weight charts, observation filtering, and CSV export", async ({
            page,
        }, testInfo) => {
            await prepare(page, theme);
            await page.goto("/Gardening/pots/P01/");
            await expect
                .soft(
                    page.getByRole("heading", {
                        exact: true,
                        name: "Variegated moon cactus",
                    })
                )
                .toBeVisible();
            await page
                .getByRole("combobox", { name: "Chart range" })
                .selectOption("all");
            await expect
                .soft(
                    page.getByRole("img", {
                        exact: true,
                        name: "Pot-weight history for A1",
                    })
                )
                .toBeVisible();
            await page
                .getByRole("searchbox", { name: "Search this history" })
                .fill("Routine check");
            await expect
                .soft(page.getByRole("table").getByRole("row"))
                .toHaveCount(2);
            const downloadPromise = page.waitForEvent("download");
            await page
                .getByRole("button", { name: "Export this plant CSV" })
                .click();
            const download = await downloadPromise;
            expect.soft(download.suggestedFilename()).toMatch(/\.csv$/v);
            await expectContained(page);
            await page.evaluate(() => {
                scrollTo(0, 0);
            });
            await page.screenshot({ path: testInfo.outputPath("history.png") });
        });

        test("shared containers expose each constituent profile", async ({
            page,
        }) => {
            await prepare(page, theme);
            await page.goto("/Gardening/pots/P19/");
            const profiles = page
                .getByRole("group", { name: "Field guide profiles" })
                .getByRole("link");
            await expect.soft(profiles).toHaveCount(3);
            await page.goto("/Gardening/pots/P20/");
            await expect.soft(profiles).toHaveCount(4);
            await expectContained(page);
        });

        test("unknown pot requests show an error instead of a different plant", async ({
            page,
        }) => {
            await prepare(page, theme);
            await page.goto("/Gardening/pots/?id=unknown");
            await expect
                .soft(
                    page.getByRole("cell", {
                        exact: true,
                        name: "No collection label matches “unknown”.",
                    })
                )
                .toBeVisible();
            await expect
                .soft(
                    page.getByRole("heading", {
                        exact: true,
                        name: "Shared succulents",
                    })
                )
                .toHaveCount(0);
        });

        test("historical diagrams retain keyboard tabs, SVG markers, and riser calculation", async ({
            page,
        }, testInfo) => {
            await prepare(page, theme);
            await page.goto("/Gardening/setup/archive/layout/");
            await page.getByRole("tab", { name: "Plant map" }).click();
            await expect
                .soft(page.getByRole("tabpanel", { name: "Plant map" }))
                .toBeVisible();
            await page
                .getByRole("img", {
                    exact: true,
                    name: "A1, Variegated moon cactus, Variegated Gymnocalycium mihanovichii, direct on wood",
                })
                .focus();
            await expect
                .soft(
                    page.getByText("Paraguay and northeastern Argentina", {
                        exact: true,
                    })
                )
                .toBeVisible();
            await page.getByRole("tab", { name: "Height + risers" }).focus();
            await page.keyboard.press("Enter");
            await page
                .getByRole("spinbutton", {
                    name: "Target starter canopy above wood",
                })
                .fill("8.5");
            await page
                .getByRole("spinbutton", { name: "Selected tip above wood" })
                .fill("5.5");
            await expect
                .soft(
                    page.getByText("Use the +2.75-inch riser.", { exact: true })
                )
                .toBeVisible();
            await page.getByRole("tab", { name: "Height + risers" }).focus();
            await page.keyboard.press("ArrowRight");
            await expect
                .soft(page.getByRole("tab", { name: "Wiring" }))
                .toHaveAttribute("aria-selected", "true");
            await expectContained(page);
            await page.evaluate(() => {
                scrollTo(0, 0);
            });
            await page.screenshot({ path: testInfo.outputPath("layout.png") });
        });

        test("archived calendar retains completion and compact-view preferences on reload", async ({
            page,
        }, testInfo) => {
            await prepare(page, theme);
            await page.goto("/Gardening/setup/archive/calendar/");
            const event = page.getByRole("button", {
                name: "After off · install 3×4 riser map; restore 20 in",
            });
            await event.click();
            await expect.soft(event).toHaveAttribute(pressedAttribute, "true");
            await page.getByRole("button", { name: "Hide empty days" }).click();
            await expect
                .soft(page.getByRole("button", { name: "Show empty days" }))
                .toHaveAttribute(pressedAttribute, "true");
            await page.reload();
            await expect.soft(event).toHaveAttribute(pressedAttribute, "true");
            await expect
                .soft(page.getByRole("button", { name: "Show empty days" }))
                .toHaveAttribute(pressedAttribute, "true");
            await expectContained(page);
            await page.evaluate(() => {
                scrollTo(0, 0);
            });
            await page.screenshot({
                path: testInfo.outputPath("calendar.png"),
            });
        });
    });
}
