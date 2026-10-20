import { expect, type Page, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

// eslint-disable-next-line import-x/extensions -- Shared ESM fixture is also served by the local preview.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const cactusArtwork = await readFile(
    ".pages-site/assets/plant-icons/parodia-leninghausii.svg"
);
const terrariumArtwork = await readFile(
    ".pages-site/assets/plant-icons/terrarium.svg"
);

const expectBalancedLabels = async (
    page: Readonly<Page>,
    theme: "dark" | "light"
) => {
    await page.getByRole("button", { exact: true, name: "Labels" }).click();
    await expect
        .soft(
            page
                .getByRole("group", { name: "Choose plant by pot label" })
                .getByRole("button")
        )
        .toHaveCount(36);
    expect
        .soft(
            await page.evaluate(() => document.documentElement.dataset["theme"])
        )
        .toBe(theme);
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
};

const expectCompactHistory = async (page: Readonly<Page>) => {
    await page.getByRole("button", { name: "Compact history" }).click();
    const correct = page.getByRole("button", {
        exact: true,
        name: "Correct Water entry for Collection plant 1 · Sep 9, 2026, 10:00 AM",
    });
    await expect.soft(correct).toBeHidden();
    const disclosure = page.getByLabel(
        "Collection plant 1 · Water · Sep 9, 2026, 10:00 AM. Show event details",
        { exact: true }
    );
    expect
        .soft(
            await disclosure.evaluate((summary) => {
                const portrait = summary.querySelector(
                    ".recent-compact-portrait"
                );
                const rect = portrait?.getBoundingClientRect();
                return {
                    eventIcon: summary
                        .querySelector(":scope svg use")
                        ?.getAttribute("href"),
                    portraitVisible:
                        rect !== undefined && rect.width > 0 && rect.height > 0,
                };
            })
        )
        .toStrictEqual({ eventIcon: "#app-icon-water", portraitVisible: true });
    await disclosure.focus();
    await page.keyboard.press("Enter");
    await expect.soft(correct).toBeVisible();
    await page
        .getByRole("group", { exact: true, name: "Water saved details" })
        .getByText("Water details", { exact: true })
        .click();
    await expect
        .soft(
            page.getByRole("group", {
                exact: true,
                name: "Water saved details",
            })
        )
        .toContainText("Synthetic browser fixture; no live observation.");
    await page.reload();
    await expect
        .soft(page.getByRole("button", { name: "Compact history" }))
        .toHaveAttribute("aria-pressed", "true");
};

const expectPortraitAccess = async (page: Readonly<Page>, width: number) => {
    const selected = page.getByRole("region", {
        exact: true,
        name: "Selected plant",
    });
    const portrait = selected.getByRole("button", {
        exact: true,
        name: "Enlarge portrait of Collection plant 1",
    });
    await portrait.focus();
    if (width > 860) {
        await portrait.hover();
        const previewPanel = page.getByLabel("Portrait preview", {
            exact: true,
        });
        await previewPanel.hover();
        await expect.soft(previewPanel).toBeVisible();
        await portrait.focus();
        expect
            .soft(
                await page.evaluate(() => {
                    const preview =
                        document.querySelector<HTMLElement>("#portraitPreview");
                    const rect = preview?.getBoundingClientRect();
                    return (
                        preview !== null &&
                        rect !== undefined &&
                        preview.hidden === false &&
                        rect.width > 0 &&
                        rect.left >= 0 &&
                        rect.right <= innerWidth
                    );
                })
            )
            .toBe(true);
    }
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", {
        name: "Collection plant 1 · A1",
    });
    await expect.soft(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect.soft(dialog).toBeHidden();
    await expect.soft(portrait).toBeFocused();
};

const expectEventLayout = async (page: Readonly<Page>) => {
    const layout = await page
        .getByRole("form", { name: "Single plant entry" })
        .evaluate((element) => {
            const chips = [
                ...element.querySelectorAll(":scope #eventChips button"),
            ];
            const save = element.querySelector("#saveButton");
            const queue = element.querySelector("#queueButton");
            const details = element.querySelector("#observedAtDate");
            return {
                actions: chips.map((chip) => chip.textContent),
                clipped: chips
                    .filter((chip) => chip.scrollWidth > chip.clientWidth + 1)
                    .map((chip) => chip.textContent),
                saveBeforeDetails:
                    save !== null &&
                    queue !== null &&
                    details !== null &&
                    save.getBoundingClientRect().top <
                        details.getBoundingClientRect().top &&
                    queue.getBoundingClientRect().top <
                        details.getBoundingClientRect().top,
            };
        });
    expect.soft(layout).toStrictEqual({
        actions: [
            "Water",
            "Weigh",
            "Mist",
            "Humidity",
            "Temperature",
            "Light reading",
            "Soil check",
            "Inspect",
            "Measure",
            "Rotation",
            "Move",
            "Environment",
            "Clean",
            "Prune",
            "Leaf VPD",
            "Repot",
            "Propagate",
            "Flower",
            "Photo",
            "Pest",
            "Other",
        ],
        clipped: [],
        saveBeforeDetails: true,
    });
};

const expectSeparateFormControls = async (page: Readonly<Page>) => {
    const form = page.getByRole("form", { name: "Single plant entry" });
    await page.getByRole("button", { exact: true, name: "Inspect" }).click();
    await expect
        .soft(
            page.getByRole("heading", {
                exact: true,
                name: "Inspect the plant",
            })
        )
        .toBeVisible();
    await expect
        .soft(page.getByRole("heading", { exact: true, name: "Soil check" }))
        .toBeHidden();
    await page.getByRole("button", { exact: true, name: "Soil check" }).click();
    await expect
        .soft(page.getByRole("heading", { exact: true, name: "Soil check" }))
        .toBeVisible();
    await form.getByLabel("Observed date", { exact: true }).fill("2026-09-08");
    await form.getByLabel("Observed time", { exact: true }).fill("09:42");
    await expect
        .soft(page.getByLabel("Canonical observation time", { exact: true }))
        .toHaveValue("2026-09-08T09:42");
    await expect
        .soft(
            page.getByRole("button", { exact: true, name: "Use current time" })
        )
        .toHaveAttribute("aria-pressed", "false");
};

const expectTerrariumContext = async (page: Readonly<Page>) => {
    await page
        .getByRole("button", {
            exact: true,
            name: "Label #12, Mixed tropical terrarium, P38, Queued · Saved today, weight safely queued",
        })
        .click();
    const selected = page.getByRole("region", {
        exact: true,
        name: "Selected plant",
    });
    await expect
        .soft(selected)
        .toContainText("dimension orientation unverified");
    await expect
        .soft(selected.getByRole("emphasis"))
        .toHaveText("Fittonia albivenis + Hypoestes phyllostachya");
    await expect
        .soft(selected.getByRole("emphasis"))
        .toHaveAttribute(
            "title",
            "Probable Fittonia albivenis + Hypoestes phyllostachya; tentative Pilea cf. depressa; fern-like foliage and moss unidentified"
        );
    await expect.soft(selected).toContainText("N/A");
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
    await selected.scrollIntoViewIfNeeded();
};

const openLogger = async (
    page: Readonly<Page>,
    width: number,
    theme: "dark" | "light"
) => {
    await page.clock.setFixedTime("2026-09-09T14:00:00Z");
    await page.setViewportSize({ height: 900, width });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-fixture") {
            await route.fulfill({
                body: loggerBrowserFixture(),
                contentType: "text/html",
            });
        } else if (url.pathname.startsWith("/Gardening/assets/plant-icons/")) {
            // Layout fixtures use a local cactus placeholder except for the actual
            // terrarium artwork; no fixture request reaches the public website.
            await route.fulfill({
                body: url.pathname.endsWith("/terrarium.svg")
                    ? terrariumArtwork
                    : cactusArtwork,
                contentType: "image/svg+xml",
            });
        } else {
            await route.abort();
        }
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

const expectSummaryWithoutOverlap = async (
    page: Readonly<Page>,
    plantId: string,
    name: string,
    progress: string
) => {
    await page
        .getByRole("group", { name: "Choose plant by pot label" })
        .getByRole("button", { name: `${name}, ${plantId}` })
        .click();
    const selected = page.getByRole("region", {
        exact: true,
        name: "Selected plant",
    });
    await expect.soft(selected.getByText(name, { exact: true })).toBeVisible();
    await expect
        .soft(selected.getByText(`${plantId} · ${progress}`, { exact: true }))
        .toBeVisible();
    await expect
        .soft(
            selected.getByRole("button", {
                exact: true,
                name: `Enlarge portrait of ${name}`,
            })
        )
        .toBeVisible();
    expect
        .soft(
            await selected.evaluate((summary) => {
                const element = summary.querySelector(".plant-summary-heading");
                if (element === null) return ["Missing summary heading"];
                const container = element.getBoundingClientRect();
                const parts = [
                    ...element.querySelectorAll<HTMLElement>(
                        ".plant-name, .plant-meta, .plant-label-badge, .portrait-button, .plant-id"
                    ),
                ];
                return parts.flatMap((part, index) => {
                    const rect = part.getBoundingClientRect();
                    const problems: string[] = [];
                    if (
                        rect.left < container.left - 1 ||
                        rect.right > container.right + 1 ||
                        rect.top < container.top - 1 ||
                        rect.bottom > container.bottom + 1 ||
                        part.scrollWidth > part.clientWidth + 1
                    ) {
                        problems.push(`${part.className} exceeds its layout`);
                    }
                    const remaining = parts.slice(index + 1);
                    for (const other of remaining) {
                        const next = other.getBoundingClientRect();
                        if (
                            Math.min(rect.right, next.right) -
                                Math.max(rect.left, next.left) >
                                1 &&
                            Math.min(rect.bottom, next.bottom) -
                                Math.max(rect.top, next.top) >
                                1
                        ) {
                            problems.push(
                                `${part.className} overlaps ${other.className}`
                            );
                        }
                    }
                    return problems;
                });
            })
        )
        .toStrictEqual([]);
};

const expectMistTargetControls = async (
    page: Readonly<Page>,
    mode: "Bulk care" | "Single plant"
) => {
    await page.getByRole("tab", { exact: true, name: mode }).click();
    await page.getByRole("button", { exact: true, name: "Mist" }).click();
    const targets = page.getByRole("group", { name: "Where did you mist?" });
    await expect.soft(targets.getByRole("checkbox")).toHaveCount(6);
    const leaves = targets.getByRole("checkbox", {
        exact: true,
        name: "Leaves",
    });
    await leaves.focus();
    await page.keyboard.press("Space");
    await expect.soft(leaves).toBeChecked();
    expect
        .soft(
            await targets.evaluate((element) =>
                Array.from(
                    element.querySelectorAll('svg[aria-hidden="true"]'),
                    (icon) => {
                        const bounds = icon.getBoundingClientRect();
                        return (
                            bounds.width > 0 &&
                            bounds.left >= 0 &&
                            bounds.right <= innerWidth
                        );
                    }
                )
            )
        )
        .toStrictEqual([
            true,
            true,
            true,
            true,
            true,
            true,
        ]);
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
};

for (const theme of ["dark", "light"] as const) {
    for (const width of [
        320,
        360,
        390,
        520,
        768,
        1280,
    ]) {
        test.describe(`${theme} ${width}px logger`, { tag: "@logger" }, () => {
            test("mist target icons and compact history capacity stay accessible", async ({
                page,
            }, testInfo) => {
                const errors: string[] = [];
                page.on("pageerror", (error) => {
                    errors.push(error.message);
                });
                await openLogger(page, width, theme);
                const capacity = page.getByRole("status", {
                    exact: true,
                    name: "History space at last refresh: 500 of 50,000 rows used · 49,500 remaining.",
                });
                await expect.soft(capacity).toHaveText("History · 1% used");
                await capacity.screenshot({
                    path: testInfo.outputPath("history-capacity.png"),
                });
                await expectMistTargetControls(page, "Single plant");
                await page
                    .getByRole("group", { name: "Where did you mist?" })
                    .screenshot({
                        path: testInfo.outputPath("single-mist-targets.png"),
                    });
                await expectMistTargetControls(page, "Bulk care");
                await page
                    .getByRole("group", { name: "Where did you mist?" })
                    .screenshot({
                        path: testInfo.outputPath("bulk-mist-targets.png"),
                    });
                expect.soft(errors).toStrictEqual([]);
            });

            test("long plant names and progress badges never overlap", async ({
                page,
            }, testInfo) => {
                await openLogger(page, width, theme);
                await page
                    .getByRole("button", { exact: true, name: "Labels" })
                    .click();
                await expectSummaryWithoutOverlap(
                    page,
                    "P05",
                    "Old Man of the Andes",
                    "Saved today"
                );
                const selected = page.getByRole("region", {
                    exact: true,
                    name: "Selected plant",
                });
                await selected.screenshot({
                    path: testInfo.outputPath("saved-plant-summary.png"),
                });
                await expectSummaryWithoutOverlap(
                    page,
                    "P06",
                    "Eastern prickly pear cactus",
                    "Queued"
                );
                await expectSummaryWithoutOverlap(
                    page,
                    "P38",
                    "Mixed tropical terrarium",
                    "Queued · Saved today"
                );
                await selected.screenshot({
                    path: testInfo.outputPath("queued-plant-summary.png"),
                });
                expect
                    .soft(
                        await page.evaluate(
                            () =>
                                document.documentElement.scrollWidth <=
                                innerWidth
                        )
                    )
                    .toBe(true);
            });

            test("controls stay accessible and within the viewport", async ({
                page,
            }, testInfo) => {
                const errors: string[] = [];
                const recordError = (error: Readonly<Error>) => {
                    errors.push(error.message);
                };
                page.on("pageerror", recordError);
                await openLogger(page, width, theme);
                await expectBalancedLabels(page, theme);
                await expectEventLayout(page);
                await expectSeparateFormControls(page);
                await expectCompactHistory(page);
                await expectPortraitAccess(page, width);
                await expectTerrariumContext(page);
                await page.screenshot({
                    path: testInfo.outputPath("logger-summary.png"),
                });
                page.off("pageerror", recordError);
                expect.soft(errors).toStrictEqual([]);
            });
        });
    }
}

const beginWorkbookRecalculation = async (page: Readonly<Page>) => {
    const button = page.getByRole("button", {
        exact: true,
        name: "Recalculate workbook",
    });
    await button.focus();
    await page.keyboard.press("Enter");
    const pendingButton = page.getByRole("button", {
        exact: true,
        name: "Recalculating…",
    });
    await expect.soft(pendingButton).toBeDisabled();
    await expect.soft(pendingButton).toHaveAttribute("aria-busy", "true");
    await expect
        .soft(
            page
                .getByRole("status")
                .filter({ hasText: "Recalculating workbook…" })
        )
        .toBeVisible();
};

const confirmWorkbookRecalculation = async (page: Readonly<Page>) => {
    await page.evaluate(() =>
        dispatchEvent(
            new CustomEvent("fixture-confirm-recalculation", {
                detail: {
                    calculatedAt: "2026-09-09T14:00:00Z",
                    status: "Ready",
                },
            })
        )
    );
    await expect
        .soft(
            page.getByRole("button", {
                exact: true,
                name: "Recalculate workbook",
            })
        )
        .toBeEnabled();
    await expect
        .soft(
            page
                .getByRole("status")
                .filter({ hasText: "Last confirmed calculation:" })
        )
        .toBeVisible();
};

for (const theme of ["dark", "light"] as const) {
    for (const width of [390, 1280]) {
        test.describe(
            `manual workbook recalculation ${theme} ${width}px`,
            { tag: "@logger" },
            () => {
                test("preserves drafts and focus through a pending request and success", async ({
                    page,
                }, testInfo) => {
                    const errors: string[] = [];
                    const recordError = (error: Readonly<Error>) => {
                        errors.push(error.message);
                    };
                    page.on("pageerror", recordError);
                    await openLogger(page, width, theme);
                    const notes = page.getByRole("textbox", {
                        exact: true,
                        name: "Notes",
                    });
                    await notes.fill("Keep this unfinished entry");
                    await beginWorkbookRecalculation(page);
                    await notes.focus();
                    await confirmWorkbookRecalculation(page);
                    await expect
                        .soft(notes)
                        .toHaveValue("Keep this unfinished entry");
                    await expect.soft(notes).toBeFocused();
                    await expect
                        .poll(() =>
                            page.evaluate(
                                () =>
                                    document.documentElement.scrollWidth <=
                                    innerWidth
                            )
                        )
                        .toBe(true);
                    await page
                        .getByRole("status")
                        .filter({ hasText: "Last confirmed calculation:" })
                        .screenshot({
                            path: testInfo.outputPath(
                                "workbook-recalculation.png"
                            ),
                        });
                    page.off("pageerror", recordError);
                    expect.soft(errors).toStrictEqual([]);
                });

                for (const outcome of [
                    "Busy",
                    "Refresh failed",
                    "network",
                ]) {
                    test(`preserves the last success and draft after ${outcome}`, async ({
                        page,
                    }) => {
                        await openLogger(page, width, theme);
                        const notes = page.getByRole("textbox", {
                            exact: true,
                            name: "Notes",
                        });
                        await notes.fill("Keep this unfinished entry");
                        await beginWorkbookRecalculation(page);
                        await confirmWorkbookRecalculation(page);
                        await beginWorkbookRecalculation(page);
                        await page.evaluate(
                            (result) =>
                                dispatchEvent(
                                    new CustomEvent(
                                        "fixture-confirm-recalculation",
                                        {
                                            detail:
                                                result === "network"
                                                    ? result
                                                    : { status: result },
                                        }
                                    )
                                ),
                            outcome
                        );
                        const status = page
                            .getByRole("status")
                            .filter({ hasText: "Last confirmed calculation:" });
                        await expect
                            .soft(status)
                            .toContainText(
                                outcome === "Busy"
                                    ? "workbook is busy"
                                    : outcome === "Refresh failed"
                                      ? "Recalculation failed"
                                      : "did not confirm"
                            );
                        await expect
                            .soft(notes)
                            .toHaveValue("Keep this unfinished entry");
                        await expect
                            .soft(
                                page.getByRole("button", {
                                    exact: true,
                                    name: "Recalculate workbook",
                                })
                            )
                            .toBeEnabled();
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
                }
            }
        );
    }
}
