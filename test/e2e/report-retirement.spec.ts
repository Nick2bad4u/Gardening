import { expect, test } from "@playwright/test";
import { readdir } from "node:fs/promises";

const archiveUrl =
    "https://github.com/Nick2bad4u/Gardening/tree/main/docs/archive/daily-reports";
const retiredRoute = /\/Gardening\/(?:pocket-report|report|reports)\//v;

test.describe("retired daily reports", { tag: "@report-retirement" }, () => {
    for (const route of [
        "report/",
        "pocket-report/",
        "reports/",
        "reports/2026-09-14/",
    ]) {
        test(`${route} explains retirement without old care actions`, async ({
            page,
        }) => {
            await page.route("**://*.googletagmanager.com/**", (request) =>
                request.abort()
            );
            await page.goto(`/Gardening/${route}`);
            await expect
                .soft(
                    page.getByRole("heading", {
                        level: 1,
                        name: "Daily reports archived",
                    })
                )
                .toBeVisible();
            await expect
                .soft(
                    page.getByRole("link", {
                        name: "Open the report archive on GitHub",
                    })
                )
                .toHaveAttribute("href", archiveUrl);
            await expect
                .soft(page.getByRole("link", { name: "Open the watering map" }))
                .toHaveAttribute("href", "/Gardening/watering/");
            expect
                .soft(
                    await page.evaluate(() => ({
                        buttons: document.querySelectorAll(
                            "main button, main input, main select"
                        ).length,
                        manifest:
                            document.querySelector('link[rel="manifest"]') !==
                            null,
                        reportCards: document.querySelectorAll(
                            "[data-report-date], .pot-card, .report-toolbar"
                        ).length,
                        robots: document
                            .querySelector('meta[name="robots"]')
                            ?.getAttribute("content"),
                    }))
                )
                .toStrictEqual({
                    buttons: 0,
                    manifest: false,
                    reportCards: 0,
                    robots: expect.stringContaining("noindex"),
                });
            expect.soft(await page.pageErrors()).toStrictEqual([]);
        });
    }

    test("preserves every historical date as a retirement notice linked to the external archive", async ({
        request,
    }) => {
        const filenames = await readdir("docs/archive/daily-reports");
        const files = filenames.filter((name) =>
            /^\d{4}-\d{2}-\d{2}\.json$/v.test(name)
        );
        expect.soft(files).toHaveLength(31);
        const results = await Promise.all(
            files.map(async (name) => {
                const date = name.replace(/\.json$/v, "");
                const response = await request.get(
                    `/Gardening/reports/${date}/`
                );
                const html = await response.text();
                return {
                    date,
                    hasArchive: html.includes(archiveUrl),
                    hasCareCards: /data-report-date|class="pot-card/v.test(
                        html
                    ),
                    retired: html.includes("Daily reports archived"),
                    status: response.status(),
                };
            })
        );
        expect.soft(results).toStrictEqual(
            files.map((name) => ({
                date: name.replace(/\.json$/v, ""),
                hasArchive: true,
                hasCareCards: false,
                retired: true,
                status: 200,
            }))
        );
    });

    test("omits reports from public navigation, search, sitemap, and Storybook", async ({
        page,
        request,
    }) => {
        await page.route("**://*.googletagmanager.com/**", (route) =>
            route.abort()
        );
        await page.goto("/Gardening/");
        const destinations = await page
            .getByRole("link")
            .evaluateAll((links) =>
                links.map((link) => link.getAttribute("href") ?? "")
            );
        expect
            .soft(destinations.filter((href) => retiredRoute.test(href)))
            .toStrictEqual([]);
        const responses = await Promise.all(
            [
                "search-index.json",
                "sitemap.xml",
                "storybook/index.json",
            ].map(async (route) => {
                const response = await request.get(`/Gardening/${route}`);
                return { body: await response.text(), ok: response.ok() };
            })
        );
        expect.soft(responses.every((response) => response.ok)).toBe(true);
        expect
            .soft(responses.map((response) => response.body).join("\n"))
            .not.toMatch(
                /\/Gardening\/(?:pocket-report|report|reports)\/|Website\/Daily report|website-daily-report/v
            );
    });
});
