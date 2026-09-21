import { expect, type Page, test } from "@playwright/test";

const houseplants = [
    {
        id: "P31",
        label: "#7",
        name: "Peperomia Bicolor",
        previous: "P33",
        slug: "peperomia-obtipan-bicolor",
        tab: "202609330",
    },
    {
        id: "P32",
        label: "#8",
        name: "Tricolor oyster plant",
        previous: "P34",
        slug: "tradescantia-spathacea-tricolor",
        tab: "202609340",
    },
] as const;
const plantCsv = [
    "Plant ID,Current pot label,Plant / planter,Scientific name / contents",
    "P31,#7,Peperomia Bicolor,Peperomia obtusifolia",
    "P32,#8,Tricolor oyster plant,Tradescantia spathacea",
].join("\n");
const historyCsv = [
    "Date,Plant ID,Event,Weight state,Weight (g),Height (cm),Width (cm),Plant condition,Notes,Pot setup,Record status,Request ID",
    "2026-09-20,P31,Weight,Routine,610,,,Healthy,Synthetic Peperomia reading,1,Active,fixture-p31",
    "2026-09-20,P32,Weight,Routine,720,,,Healthy,Synthetic Tricolor reading,1,Active,fixture-p32",
].join("\n");

function inspectHistory(main: Readonly<Element>) {
    const sheetLink =
        main.querySelector<HTMLAnchorElement>("#sheet-plant-page");
    if (!sheetLink) throw new Error("Missing native worksheet link");
    const sheetUrl = new URL(sheetLink.href);
    return {
        contained: document.documentElement.scrollWidth <= innerWidth,
        gid: sheetUrl.searchParams.get("gid"),
        label: main.querySelector("#plant-label")?.textContent.trim(),
        name: main.querySelector("h1")?.textContent.trim(),
    };
}

async function prepare(page: Readonly<Page>, theme: "dark" | "light") {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**://*.googletagmanager.com/**", (route) =>
        route.abort()
    );
    await page.route("https://docs.google.com/**", async (route) => {
        if (route.request().method() !== "GET")
            throw new Error("Only synthetic read requests are allowed");
        const url = new URL(route.request().url());
        await route.fulfill({
            body: url.searchParams.get("gid") === "0" ? plantCsv : historyCsv,
            contentType: "text/csv",
        });
    });
}

test.describe("received houseplant identity", { tag: "@identity" }, () => {
    for (const theme of ["dark", "light"] as const) {
        for (const width of [390, 1280]) {
            for (const plant of houseplants) {
                test(`${plant.id} directory, profile, and synthetic history at ${width}px in ${theme}`, async ({
                    page,
                }, testInfo) => {
                    await page.setViewportSize({ height: 900, width });
                    await prepare(page, theme);
                    await page.goto("/Gardening/plants/");
                    await page
                        .getByRole("searchbox", { name: "Find a plant" })
                        .fill(plant.id);
                    const card = page.getByRole("article").filter({
                        has: page.getByRole("heading", {
                            exact: true,
                            name: plant.name,
                        }),
                    });
                    await card.waitFor({ state: "visible" });
                    expect
                        .soft(
                            await card.evaluate((entry) => ({
                                contained:
                                    document.documentElement.scrollWidth <=
                                    innerWidth,
                                id: entry.querySelector(".badge-id")
                                    ?.textContent,
                                label: entry.querySelector(".badge-label")
                                    ?.textContent,
                            }))
                        )
                        .toStrictEqual({
                            contained: true,
                            id: plant.id,
                            label: plant.label,
                        });
                    await card.getByRole("link").click();
                    await expect
                        .soft(page)
                        .toHaveURL(`/Gardening/plants/${plant.slug}/`);
                    const heading = page.getByRole("heading", {
                        exact: true,
                        level: 1,
                        name: plant.name,
                    });
                    await heading.waitFor({ state: "visible" });
                    expect
                        .soft(
                            await heading.evaluate((entry) => ({
                                contained:
                                    document.documentElement.scrollWidth <=
                                    innerWidth,
                                name: entry.textContent.trim(),
                            }))
                        )
                        .toStrictEqual({ contained: true, name: plant.name });
                    await page.screenshot({
                        path: testInfo.outputPath("profile.png"),
                    });
                    await page
                        .getByRole("link", {
                            exact: true,
                            name: `Pot History ${plant.id}`,
                        })
                        .click();
                    await expect
                        .soft(page)
                        .toHaveURL(`/Gardening/pots/${plant.id}/`);
                    await page
                        .getByRole("region", { name: "Observation history" })
                        .getByRole("cell", {
                            exact: true,
                            name: `Synthetic ${plant.id === "P31" ? "Peperomia" : "Tricolor"} reading`,
                        })
                        .waitFor({ state: "visible" });
                    const actual = await page
                        .getByRole("main")
                        .evaluate(inspectHistory);
                    expect.soft(actual).toStrictEqual({
                        contained: true,
                        gid: plant.tab,
                        label: `${plant.label} · permanent ID ${plant.id}`,
                        name: plant.name,
                    });
                    await page.screenshot({
                        path: testInfo.outputPath("history.png"),
                    });
                });
            }
        }
    }
    for (const plant of houseplants) {
        test(`${plant.previous} redirects preserve query and fragment and reach ${plant.id} observations`, async ({
            page,
        }) => {
            await prepare(page, "light");
            await page.goto(
                `/Gardening/pots/${plant.previous}/?from=2026-09-20#history-table`
            );
            await expect
                .soft(page)
                .toHaveURL(
                    `/Gardening/pots/${plant.id}/?from=2026-09-20#history-table`
                );
            await expect
                .soft(page.getByRole("heading", { level: 1 }))
                .toHaveText(plant.name);
            await expect
                .soft(
                    page
                        .getByRole("region", { name: "Observation history" })
                        .getByRole("table")
                )
                .toContainText("Synthetic");
            await page.goto(
                `/Gardening/layouts/plant-history.html?id=${plant.previous}&range=all#history-table`
            );
            await expect
                .soft(page)
                .toHaveURL(
                    `/Gardening/pots/${plant.id}/?range=all#history-table`
                );
            await expect
                .soft(page.getByRole("main"))
                .toContainText(plant.label);
        });
    }
});
