import { expect, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- Read the same reviewed artifact used by the static site build.
import { getReports } from "../../site/lib/reports.mjs";

async function areFactsContained(page: Readonly<Page>) {
    return page.evaluate(() => {
        const facts = document.querySelector("#pot-P23 .pot-facts");
        return (
            document.documentElement.scrollWidth <= innerWidth &&
            facts instanceof HTMLElement &&
            facts.scrollWidth <= facts.clientWidth &&
            [...facts.children].every(
                (pill) => pill.scrollWidth <= pill.clientWidth
            )
        );
    });
}

async function expectedWatering() {
    const reports = await getReports();
    const latest = reports[0];
    const candidate = latest?.report?.pots.find((pot) => pot.id === "P23");
    if (
        candidate?.lastWateredAt === undefined ||
        candidate.lastWateredAt === null ||
        latest?.sourceReadAt === undefined ||
        latest.sourceReadAt === null
    )
        throw new Error(
            "P23 requires reviewed watering and source-read evidence."
        );
    const days =
        Math.round(
            (Temporal.Instant.from(latest.sourceReadAt).epochMilliseconds -
                Temporal.Instant.from(candidate.lastWateredAt)
                    .epochMilliseconds) /
                8_640_000
        ) / 10;
    return {
        age: `(${days} ${days === 1 ? "day" : "days"} ago)`,
        read: latest.sourceReadAt,
        watered: candidate.lastWateredAt,
    };
}

test.describe("reviewed watering facts", { tag: "@reports" }, () => {
    for (const route of ["report", "pocket-report"]) {
        for (const theme of ["dark", "light"] as const) {
            test(`${route} ${theme} shows recorded watering in readable mobile and desktop facts`, async ({
                page,
            }, testInfo) => {
                const evidence = await expectedWatering();
                await page.route("**://*.googletagmanager.com/**", (request) =>
                    request.abort()
                );
                await page.clock.setFixedTime("2030-01-01T12:00:00Z");
                await page.emulateMedia({
                    colorScheme: theme,
                    reducedMotion: "reduce",
                });
                await page.setViewportSize({ height: 844, width: 390 });
                await page.goto(`/Gardening/${route}/#pot-P23`);
                const card = page.locator("#pot-P23");
                await expect.soft(card).toHaveAttribute("open", "");
                expect
                    .soft(
                        await card.evaluate((element) => {
                            const term = [
                                ...element.querySelectorAll("dt"),
                            ].find((entry) =>
                                entry.textContent.includes("Last watered")
                            );
                            const value = term?.nextElementSibling;
                            return {
                                age: value?.querySelector(".watering-age")
                                    ?.textContent,
                                context: element
                                    .querySelector(":scope .facts-context time")
                                    ?.getAttribute("datetime"),
                                labels: [
                                    ...element.querySelectorAll(
                                        ":scope .pot-facts dt"
                                    ),
                                ].map((entry) => entry.textContent.trim()),
                                watered: value
                                    ?.querySelector("time")
                                    ?.getAttribute("datetime"),
                            };
                        })
                    )
                    .toMatchObject({
                        age: evidence.age,
                        context: evidence.read,
                        labels: expect.arrayContaining([
                            "🕒 Last reading",
                            "💧 Last watered",
                        ]),
                        watered: evidence.watered,
                    });
                await expect.poll(() => areFactsContained(page)).toBe(true);
                await card.screenshot({
                    path: testInfo.outputPath(
                        `${route}-${theme}-facts-390.png`
                    ),
                });
                await page.setViewportSize({ height: 900, width: 1280 });
                await page.goto(`/Gardening/${route}/#pot-P23`);
                await expect.poll(() => areFactsContained(page)).toBe(true);
                await card.screenshot({
                    path: testInfo.outputPath(
                        `${route}-${theme}-facts-desktop.png`
                    ),
                });
                expect.soft(await page.pageErrors()).toStrictEqual([]);
            });
        }
    }
});
