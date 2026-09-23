import { expect, test } from "@playwright/test";

const landings = [
    { icon: "full-report", name: "Full Report", route: "report/" },
    { icon: "garden-equipment", name: "Equipment", route: "setup/equipment/" },
    { icon: "garden-guides", name: "Care Guides", route: "guides/" },
    { icon: "garden-home", name: "The Garden", route: "" },
    { icon: "garden-photos", name: "Garden Photos", route: "photos/" },
    { icon: "garden-placement", name: "Placement", route: "setup/placement/" },
    { icon: "garden-plants", name: "Plant Library", route: "plants/" },
    { icon: "garden-pots", name: "Pot History", route: "pots/" },
    { icon: "garden-reports", name: "Report Archive", route: "reports/" },
    { icon: "garden-search", name: "Garden Search", route: "search/" },
    { icon: "garden-setup", name: "Garden Setup", route: "setup/" },
    { icon: "garden-tracker", name: "Plant Tracker", route: "tracker/" },
    { icon: "pocket-report", name: "Pocket Report", route: "pocket-report/" },
] as const;

test.describe("garden landing app identities", { tag: "@apps" }, () => {
    for (const route of [
        "",
        "tracker/",
        "plants/",
        "guides/",
    ]) {
        for (const theme of ["dark", "light"] as const) {
            test(`${route || "home"} ${theme} keeps its phone layout with app metadata`, async ({
                page,
            }, testInfo) => {
                await page.route("**://*.googletagmanager.com/**", (request) =>
                    request.abort()
                );
                await page.setViewportSize({ height: 844, width: 390 });
                await page.emulateMedia({
                    colorScheme: theme,
                    reducedMotion: "reduce",
                });
                await page.goto(`/Gardening/${route}`);
                await expect
                    .poll(() =>
                        page.evaluate(
                            () =>
                                document.documentElement.scrollWidth <=
                                innerWidth
                        )
                    )
                    .toBe(true);
                await page.screenshot({
                    path: testInfo.outputPath(`landing-${theme}-390.png`),
                });
                expect.soft(await page.pageErrors()).toStrictEqual([]);
            });
        }
    }

    for (const landing of landings) {
        test(`${landing.name} offers a named install with its own usable icons`, async ({
            page,
            request,
        }) => {
            await page.route("**://*.googletagmanager.com/**", (route) =>
                route.abort()
            );
            const route = `/Gardening/${landing.route}`;
            await page.goto(route);
            expect
                .soft(
                    await page.evaluate(() => ({
                        appleName: document
                            .querySelector(
                                'meta[name="apple-mobile-web-app-title"]'
                            )
                            ?.getAttribute("content"),
                        appName: document
                            .querySelector('meta[name="application-name"]')
                            ?.getAttribute("content"),
                        icon: document
                            .querySelector(
                                'link[rel="icon"][type="image/svg+xml"]'
                            )
                            ?.getAttribute("href"),
                        manifest: document
                            .querySelector('link[rel="manifest"]')
                            ?.getAttribute("href"),
                    }))
                )
                .toStrictEqual({
                    appleName: landing.name,
                    appName: landing.name,
                    icon: `/Gardening/assets/ui-icons/${landing.icon}.svg`,
                    manifest: `${route}manifest.webmanifest`,
                });
            const response = await request.get(`${route}manifest.webmanifest`);
            const manifest: unknown = await response.json();
            expect
                .soft({
                    manifest,
                    ok: response.ok(),
                    type: response.headers()["content-type"],
                })
                .toMatchObject({
                    manifest: {
                        display: "standalone",
                        id: route,
                        name: landing.name,
                        scope: route,
                        short_name: landing.name,
                        start_url: `${route}${landing.route === "pocket-report/" ? "#pocket-list" : ""}`,
                    },
                    ok: true,
                    type: expect.stringContaining("application/manifest+json"),
                });
            await Promise.all(
                [192, 512].map(async (size) => {
                    const src = `/Gardening/assets/report-apps/${landing.icon}-${size}.png`;
                    expect.soft(manifest).toMatchObject({
                        icons: expect.arrayContaining([
                            expect.objectContaining({
                                sizes: `${size}x${size}`,
                                src,
                                type: "image/png",
                            }),
                        ]),
                    });
                    const iconResponse = await request.get(src);
                    const bytes = await iconResponse.body();
                    expect
                        .soft({
                            dimensions: [
                                bytes.readUInt32BE(16),
                                bytes.readUInt32BE(20),
                            ],
                            ok: iconResponse.ok(),
                            type: iconResponse.headers()["content-type"],
                        })
                        .toStrictEqual({
                            dimensions: [size, size],
                            ok: true,
                            type: "image/png",
                        });
                })
            );
            expect.soft(await page.pageErrors()).toStrictEqual([]);
        });
    }

    test("plant details keep their document identity while inheriting the Plant Library install", async ({
        page,
    }) => {
        await page.goto("/Gardening/plants/peperomia-obtipan-bicolor/");
        await expect.soft(page).toHaveTitle(/Peperomia.+The Garden/v);
        expect
            .soft(
                await page.evaluate(() => ({
                    icon: document
                        .querySelector('link[rel="icon"][type="image/svg+xml"]')
                        ?.getAttribute("href"),
                    manifest: document
                        .querySelector('link[rel="manifest"]')
                        ?.getAttribute("href"),
                }))
            )
            .toStrictEqual({
                icon: "/Gardening/assets/ui-icons/garden-plants.svg",
                manifest: "/Gardening/plants/manifest.webmanifest",
            });
    });

    test("unmatched error routes do not advertise the home app", async ({
        page,
    }) => {
        await page.goto("/Gardening/404.html");
        expect
            .soft(
                await page.evaluate(
                    () =>
                        document.querySelector('link[rel="manifest"]') === null
                )
            )
            .toBe(true);
    });

    test("edge reports no home-page installability errors", async ({
        browserName,
        context,
        page,
    }) => {
        test.skip(
            browserName !== "chromium",
            "Installability diagnostics require Chromium CDP."
        );
        await page.goto("/Gardening/");
        const session = await context.newCDPSession(page);
        await session.send("Page.enable");
        const result = await session.send("Page.getInstallabilityErrors");
        // Playwright contexts are isolated; ignore only that environment restriction.
        expect
            .soft(
                result.installabilityErrors.filter(
                    (error) => error.errorId !== "in-incognito"
                )
            )
            .toStrictEqual([]);
        await session.detach();
    });
});
