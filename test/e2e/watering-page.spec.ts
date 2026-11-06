import { type Download, expect, type Page, test } from "@playwright/test";
import { text } from "node:stream/consumers";

const wateringPath = "/Gardening/watering/";
const placementPath = "/Gardening/setup/placement/";
const ages = [
    { color: "rgb(87, 187, 138)", days: 0, id: "P01" },
    { color: "rgb(171, 201, 120)", days: 7, id: "P02" },
    { color: "rgb(255, 214, 102)", days: 14, id: "P03" },
    { color: "rgb(243, 169, 109)", days: 21, id: "P04" },
    { color: "rgb(230, 124, 115)", days: 28, id: "P39" },
    { color: "rgb(230, 124, 115)", days: 29, id: "P40" },
];
const imageName = /^Days since watering —/v;

const readDownload = async (download: Readonly<Download>) => {
    const stream = await download.createReadStream();
    return text(stream);
};

const prepare = async (page: Readonly<Page>) => {
    await page.clock.setFixedTime("2026-11-05T16:00:00Z");
    await page.route("**://*.googletagmanager.com/**", (route) =>
        route.abort()
    );
    const rows = ages.map(
        ({ days, id }) =>
            `${Temporal.PlainDate.from("2026-11-05").subtract({ days }).toString()},${id},Water,Active,,,,`
    );
    await page.route("https://docs.google.com/**", (route) =>
        route.fulfill({
            body: [
                "Date,Plant ID,Event,Record status,New location,Feed version,Feed status,Record count",
                `,,,,,1,Ready,${rows.length}`,
                ...rows,
                `,,,,,1,End,${rows.length}`,
            ].join("\n"),
            contentType: "text/csv",
        })
    );
};

const waitForLive = async (page: Readonly<Page>) => {
    await expect
        .soft(
            page
                .getByRole("status")
                .filter({ hasText: /^Published observations loaded\./v })
        )
        .toHaveAttribute("data-state", "live");
};

const inspectMap = async (page: Readonly<Page>) => {
    const actual = await page
        .getByRole("img", { name: imageName })
        .evaluate((svg) => {
            const markers = [
                ...svg.querySelectorAll<SVGGElement>("[data-pot-id]"),
            ];
            const sections = [
                ...svg.querySelectorAll<SVGGElement>(
                    "[data-placement-section]"
                ),
            ];
            const legend = svg
                .querySelector("[data-watering-legend]")
                ?.getBoundingClientRect();
            const uniqueIds = new Set(
                markers.map((marker) => marker.dataset["potId"])
            );
            const countSelector = "text.count";
            const overflow = markers.filter((marker) => {
                const zone = marker.dataset["placementZone"];
                const section = sections.find(
                    (entry) => entry.dataset["placementSection"] === zone
                );
                if (!section) return false;
                const bounds = marker.getBoundingClientRect();
                const area = section.getBoundingClientRect();
                return (
                    bounds.left < area.left ||
                    bounds.right > area.right ||
                    bounds.top < area.top ||
                    bounds.bottom > area.bottom
                );
            });
            return {
                colors: markers
                    .filter(
                        (marker) =>
                            marker.querySelector(countSelector)?.textContent !==
                            "?"
                    )
                    .map((marker) => ({
                        color: getComputedStyle(
                            marker.querySelector(countSelector) ?? marker
                        ).fill,
                        days: Number(
                            marker.querySelector(countSelector)?.textContent
                        ),
                        id: marker.dataset["potId"],
                    })),
                count: markers.length,
                legendFits:
                    legend !== undefined &&
                    legend.bottom < svg.getBoundingClientRect().bottom &&
                    sections.every(
                        (section) =>
                            section.getBoundingClientRect().bottom < legend.top
                    ),
                overflow: overflow.map((marker) => marker.dataset["potId"]),
                shelf: markers
                    .filter(
                        (marker) => marker.dataset["placementZone"] === "shelf"
                    )
                    .map((marker) => marker.dataset["potId"]),
                unique: uniqueIds.size,
                unknown: markers
                    .filter(
                        (marker) =>
                            marker.querySelector(countSelector)?.textContent ===
                            "?"
                    )
                    .every(
                        (marker) =>
                            getComputedStyle(
                                marker.querySelector(countSelector) ?? marker
                            ).fill === "rgb(173, 187, 179)"
                    ),
            };
        });
    expect
        .soft({
            ...actual,
            colors: actual.colors.toSorted((left, right) =>
                (left.id ?? "").localeCompare(right.id ?? "")
            ),
        })
        .toStrictEqual({
            colors: ages,
            count: 39,
            legendFits: true,
            overflow: [],
            shelf: [
                "P39",
                "P40",
                "P41",
            ],
            unique: 39,
            unknown: true,
        });
    const details = await page
        .getByRole("list", {
            includeHidden: true,
            name: "Watering details by pot",
        })
        .evaluate((list) =>
            [...list.children].map((item) => ({
                color: item.querySelector<HTMLElement>(".watering-map-age")
                    ?.style.color,
                id: /\bP\d+\b/v.exec(
                    item.querySelector("strong")?.textContent ?? ""
                )?.[0],
            }))
        );
    expect
        .soft(
            details
                .filter((item) => item.color !== "")
                .toSorted((left, right) =>
                    (left.id ?? "").localeCompare(right.id ?? "")
                )
        )
        .toStrictEqual(ages.map(({ color, id }) => ({ color, id })));
    expect
        .soft(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
};

test.describe(
    "dedicated and embedded watering maps",
    { tag: "@watering" },
    () => {
        for (const route of [wateringPath, placementPath]) {
            for (const theme of ["dark", "light"] as const) {
                for (const width of [390, 1280]) {
                    test(`${route} ${theme} ${width}px preserves shelf, day colors, and print`, async ({
                        page,
                    }, testInfo) => {
                        await prepare(page);
                        await page.setViewportSize({ height: 900, width });
                        await page.emulateMedia({
                            colorScheme: theme,
                            reducedMotion: "reduce",
                        });
                        await page.goto(route);
                        await waitForLive(page);
                        await inspectMap(page);
                        await page
                            .getByRole("img", { name: imageName })
                            .screenshot({
                                path: testInfo.outputPath(
                                    `watering-${theme}-${width}.png`
                                ),
                            });
                        await page.emulateMedia({ media: "print" });
                        await expect
                            .soft(page.getByRole("img", { name: imageName }))
                            .toBeVisible();
                        await inspectMap(page);
                        expect.soft(await page.pageErrors()).toStrictEqual([]);
                    });
                }
            }
        }

        test("exports the same day colors and shelf as the live map", async ({
            page,
        }) => {
            await prepare(page);
            await page.goto(wateringPath);
            await waitForLive(page);
            const pending = page.waitForEvent("download");
            await page
                .getByRole("button", { exact: true, name: "Download SVG" })
                .click();
            const download = await pending;
            const svg = await readDownload(download);
            const exported = await page.evaluate((markup) => {
                const parser = new DOMParser();
                const document = parser.parseFromString(markup, "text/html");
                const countSelector = "text.count";
                const markers = [
                    ...document.querySelectorAll<SVGGElement>("[data-pot-id]"),
                ];
                return {
                    colors: markers
                        .filter(
                            (marker) =>
                                marker.querySelector(countSelector)
                                    ?.textContent !== "?"
                        )
                        .map((marker) => ({
                            color: marker
                                .querySelector(countSelector)
                                ?.getAttribute("fill"),
                            days: Number(
                                marker.querySelector(countSelector)?.textContent
                            ),
                            id: marker.dataset["potId"],
                        })),
                    count: markers.length,
                    externalAssets: document.querySelectorAll(
                        "image, script, foreignObject, link, [src]"
                    ).length,
                    gradient:
                        document.querySelector("#wm-age-gradient") !== null,
                    shelf: markers
                        .filter(
                            (marker) =>
                                marker.dataset["placementZone"] === "shelf"
                        )
                        .map((marker) => marker.dataset["potId"]),
                };
            }, svg);
            expect
                .soft({
                    ...exported,
                    colors: exported.colors.toSorted((left, right) =>
                        (left.id ?? "").localeCompare(right.id ?? "")
                    ),
                })
                .toStrictEqual({
                    colors: ages,
                    count: 39,
                    externalAssets: 0,
                    gradient: true,
                    shelf: [
                        "P39",
                        "P40",
                        "P41",
                    ],
                });
        });

        test("opens the dedicated map from phone navigation and returns to placement", async ({
            page,
        }) => {
            await prepare(page);
            await page.setViewportSize({ height: 844, width: 390 });
            await page.goto(placementPath);
            await page
                .getByRole("button", { exact: true, name: "Menu" })
                .click();
            await page
                .getByRole("navigation")
                .getByRole("link", { exact: true, name: "Watering map" })
                .click();
            await expect.soft(page).toHaveURL(wateringPath);
            await waitForLive(page);
            await page
                .getByRole("link", {
                    exact: true,
                    name: "Current Plant Placement",
                })
                .click();
            await expect.soft(page).toHaveURL(placementPath);
            await waitForLive(page);
            await expect
                .soft(page.getByRole("img", { name: imageName }))
                .toBeVisible();
        });
    }
);
