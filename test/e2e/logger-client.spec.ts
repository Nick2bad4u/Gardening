import { expect, type Locator, type Page, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

// eslint-disable-next-line import-x/extensions -- Shared ESM fixture is also served by the local preview.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const pressedAttribute = "aria-pressed";
const bulkCareTab = "Bulk care";
const recalculateWorkbookName = "Recalculate workbook";
const fixtureClockTime = "2026-09-09T14:00:00Z";

const wateringAgeFixture = (isAvailable = true) =>
    loggerBrowserFixture()
        .replace(
            "window.google =",
            () => `fixtureBootstrap.wateringAgesAvailable = ${String(isAvailable)};
            fixtureBootstrap.plants.forEach((plant, index) => {
                plant.lastWateredDayKey = ["2026-09-09", "2026-09-08", "", "2026-02-30"][index] ?? "2026-09-05";
            });
            window.google =`
        )
        .replace(
            "getWebAppBootstrap() { success(fixtureBootstrap); }",
            `getWebAppBootstrap() {
                const count = Number(document.documentElement.dataset.fixtureBootstrapCalls || "0") + 1;
                document.documentElement.dataset.fixtureBootstrapCalls = String(count);
                if (count === 1) { success(fixtureBootstrap); return; }
                window.addEventListener("fixture-bootstrap-result", (event) => {
                    if (event.detail === "failure") failure({ message: "Fixture connection failed" });
                    else success(fixtureBootstrap);
                }, { once: true });
            }`
        )
        .replace(
            "getRecentWebObservations() { success(fixtureBootstrap.recent); }",
            `getRecentWebObservations() {
                document.documentElement.dataset.fixtureRecentCalls = String(Number(document.documentElement.dataset.fixtureRecentCalls || "0") + 1);
                success(fixtureBootstrap.recent);
            }`
        );

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
        .toHaveCount(39);
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
        .toHaveAttribute(pressedAttribute, "true");
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
        .toHaveAttribute(pressedAttribute, "false");
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
    theme: "dark" | "light",
    fixtureHtml = loggerBrowserFixture(),
    shouldWaitForConnection = true
) => {
    await page.clock.setFixedTime(fixtureClockTime);
    await page.setViewportSize({ height: 900, width });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-fixture") {
            await route.fulfill({
                body: fixtureHtml,
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
    if (!shouldWaitForConnection) return;
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
                const capacity = page.getByRole("button", {
                    exact: true,
                    name: "History space at last refresh: 500 of 50,000 rows used · 49,500 remaining.",
                });
                await expect.soft(capacity).toHaveText("1%");
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

const tableRows = [
    [
        "P04",
        "P15",
        "P23",
        "P26",
        "P18",
        "P03",
    ],
    [
        "P01",
        "P13",
        "P24",
        "P16",
        "P08",
        "P11",
    ],
    [
        "P02",
        "P05",
        "P25",
        "P28",
        "P09",
        "P07",
    ],
    [
        "P12",
        "P14",
        "P27",
        "P06",
        "P10",
        "P17",
    ],
];

const tablePicker = (page: Readonly<Page>, isBulk = false) =>
    page.getByRole("group", {
        name: isBulk
            ? "Choose plants for bulk care"
            : "Choose plant by pot label",
    });

const tablePlantNames = {
    P05: /, P05(?:,|$)/v,
    P06: /, P06(?:,|$)/v,
    P10: /, P10(?:,|$)/v,
    P27: /, P27(?:,|$)/v,
    P38: /, P38(?:,|$)/v,
};
const tablePlant = (
    picker: Readonly<Locator>,
    id: keyof typeof tablePlantNames
) =>
    picker.getByRole("button", {
        includeHidden: true,
        name: tablePlantNames[id],
    });

const pickerMode = (page: Readonly<Page>, name: string) =>
    page.getByRole("button", { exact: true, name });

const expectTableLayout = async (page: Readonly<Page>, isBulk = false) => {
    const picker = tablePicker(page, isBulk);
    await expect.soft(picker).toHaveClass(/\btable-picker\b/v);
    await expect.soft(picker.getByRole("button")).toHaveCount(39);
    const positions = await picker.evaluate(
        (element, usesBulkId) =>
            [...element.querySelectorAll<HTMLElement>("[data-table-row]")].map(
                (button) => ({
                    column: button.dataset["tableColumn"],
                    gridColumn: getComputedStyle(button).gridColumnStart,
                    gridRow: getComputedStyle(button).gridRowStart,
                    id: button.dataset[usesBulkId ? "bulkPlantId" : "plantId"],
                    row: button.dataset["tableRow"],
                })
            ),
        isBulk
    );
    expect.soft(positions).toStrictEqual(
        tableRows.flatMap((row, visualRow) =>
            row.map((id, column) => ({
                column: String(column + 1),
                gridColumn: String(column + 1),
                gridRow: String(visualRow + 1),
                id,
                row: String(4 - visualRow),
            }))
        )
    );
    const layout = await picker.evaluate((element) => {
        const numbered = [
            ...element.querySelectorAll<HTMLElement>("[data-plant-label^='#']"),
        ];
        const front = [
            ...element.querySelectorAll<HTMLElement>("[data-table-row]"),
        ];
        const frontBottom = Math.max(
            ...front.map((button) => button.getBoundingClientRect().bottom)
        );
        return {
            labels: numbered.map((button) => button.dataset["plantLabel"]),
            numberedBelow: numbered.every(
                (button) => button.getBoundingClientRect().top > frontBottom
            ),
            validBounds: [...front, ...numbered].every((button) => {
                const rect = button.getBoundingClientRect();
                return (
                    rect.width >= 44 &&
                    rect.height >= 44 &&
                    rect.left >= 0 &&
                    rect.right <= innerWidth
                );
            }),
        };
    });
    expect.soft(layout).toStrictEqual({
        labels: Array.from({ length: 15 }, (_, index) => `#${index + 1}`),
        numberedBelow: true,
        validBounds: true,
    });
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
};

const expectSingleTableFilter = async (page: Readonly<Page>) => {
    const picker = tablePicker(page);
    const neighbor = tablePlant(picker, "P10");
    const originalX = await neighbor.evaluate(
        (button) => button.getBoundingClientRect().x
    );
    await pickerMode(page, "Not weighed today").click();
    await expect.soft(tablePlant(picker, "P05")).toBeHidden();
    await expect.soft(tablePlant(picker, "P06")).toBeHidden();
    await expect.soft(neighbor).toBeVisible();
    expect
        .soft(
            await neighbor.evaluate(
                (button) => button.getBoundingClientRect().x
            )
        )
        .toBe(originalX);
    await expect.soft(neighbor).toHaveAttribute("data-table-column", "5");
    await pickerMode(page, "Not weighed today").click();
};

const expectTableProgressFits = async (page: Readonly<Page>) => {
    const terrarium = tablePlant(tablePicker(page), "P38");
    await expect.soft(terrarium).toHaveAccessibleName(/Queued · Saved today/v);
    const bounds = await terrarium.evaluate((button) => {
        const rect = button.getBoundingClientRect();
        const before = getComputedStyle(button, "::before");
        const after = getComputedStyle(button, "::after");
        return {
            badges: [before.content, after.content],
            badgesFit: [before, after].every(
                (style) =>
                    Number(style.width.replace(/px$/v, "")) <=
                        button.clientWidth &&
                    Number(style.height.replace(/px$/v, "")) > 0 &&
                    style.visibility === "visible"
            ),
            childrenFit: [...button.children].every((child) => {
                const childRect = child.getBoundingClientRect();
                return (
                    childRect.left >= rect.left &&
                    childRect.right <= rect.right &&
                    childRect.top >= rect.top &&
                    childRect.bottom <= rect.bottom
                );
            }),
            contentsFit: button.scrollWidth <= button.clientWidth,
        };
    });
    expect.soft(bounds).toStrictEqual({
        badges: ['"Saved today"', '"Queued"'],
        badgesFit: true,
        childrenFit: true,
        contentsFit: true,
    });
};

const expectSingleModeSelection = async (
    page: Readonly<Page>,
    mode: string
) => {
    await pickerMode(page, mode).click();
    expect
        .soft(
            await page.evaluate(
                () =>
                    document.querySelector<HTMLSelectElement>("#plantSelect")
                        ?.value
            )
        )
        .toBe("P27");
};

const expectBulkTableFilter = async (page: Readonly<Page>) => {
    const picker = tablePicker(page, true);
    const selected = tablePlant(picker, "P10");
    const originalX = await selected.evaluate(
        (button) => button.getBoundingClientRect().x
    );
    const search = page.getByRole("searchbox", {
        name: "Find by name, ID, or label",
    });
    await search.fill("P10");
    await expect.soft(tablePlant(picker, "P06")).toBeHidden();
    await expect.soft(selected).toBeVisible();
    expect
        .soft(
            await selected.evaluate(
                (button) => button.getBoundingClientRect().x
            )
        )
        .toBe(originalX);
    await expect.soft(selected).toHaveAttribute("data-table-column", "5");
    await search.fill("");
};

const expectBulkModeSelection = async (page: Readonly<Page>) => {
    const picker = tablePicker(page, true);
    await pickerMode(page, "Labels").click();
    await expect
        .soft(tablePlant(picker, "P10"))
        .toHaveAttribute(pressedAttribute, "true");
    await pickerMode(page, "List").click();
    await expect
        .soft(picker.getByRole("checkbox", { name: /P10/v }))
        .toBeChecked();
    await pickerMode(page, "Table").click();
    await expect
        .soft(tablePlant(picker, "P10"))
        .toHaveAttribute(pressedAttribute, "true");
};

for (const theme of ["dark", "light"] as const) {
    for (const width of [390, 1280]) {
        test.describe(
            `table picker ${theme} ${width}px`,
            { tag: "@logger" },
            () => {
                test("single selection preserves physical slots, filtered holes and saved mode", async ({
                    page,
                }, testInfo) => {
                    await openLogger(page, width, theme);
                    await pickerMode(page, "Table").click();
                    await expectTableLayout(page);
                    await expectTableProgressFits(page);
                    const selected = tablePlant(tablePicker(page), "P27");
                    await selected.focus();
                    await page.keyboard.press("Enter");
                    await expect
                        .soft(selected)
                        .toHaveAttribute(pressedAttribute, "true");
                    await expectSingleTableFilter(page);
                    await expectSingleModeSelection(page, "Labels");
                    await expectSingleModeSelection(page, "List");
                    await expectSingleModeSelection(page, "Table");
                    await page.reload();
                    await expect
                        .soft(pickerMode(page, "Table"))
                        .toHaveAttribute(pressedAttribute, "true");
                    await expectTableLayout(page);
                    await tablePicker(page).screenshot({
                        path: testInfo.outputPath("single-table.png"),
                    });
                });

                test("bulk selection survives modes and search without moving matching pots", async ({
                    page,
                }, testInfo) => {
                    await openLogger(page, width, theme);
                    await page
                        .getByRole("tab", { exact: true, name: bulkCareTab })
                        .click();
                    await pickerMode(page, "Table").click();
                    await expectTableLayout(page, true);
                    const selected = tablePlant(tablePicker(page, true), "P10");
                    await selected.focus();
                    await page.keyboard.press("Space");
                    await expect
                        .soft(selected)
                        .toHaveAttribute(pressedAttribute, "true");
                    await expect
                        .soft(page.getByText("1 selected", { exact: true }))
                        .toBeVisible();
                    await expectBulkTableFilter(page);
                    await expectBulkModeSelection(page);
                    await page.reload();
                    await page
                        .getByRole("tab", { exact: true, name: bulkCareTab })
                        .click();
                    await expect
                        .soft(pickerMode(page, "Table"))
                        .toHaveAttribute(pressedAttribute, "true");
                    await expectTableLayout(page, true);
                    await tablePicker(page, true).screenshot({
                        path: testInfo.outputPath("bulk-table.png"),
                    });
                });
            }
        );
    }
}

const expectRecalculationIcon = async (page: Readonly<Page>) => {
    const icon = await page
        .getByRole("button", { exact: true, name: recalculateWorkbookName })
        .evaluate((button) => {
            const svg = button.querySelector("svg");
            const rect = svg?.getBoundingClientRect();
            return {
                hasDrawing: Boolean(svg?.querySelector("path[d]")),
                labelVisible: Boolean(
                    button
                        .querySelector("#recalculateWorkbookLabel")
                        ?.textContent.trim()
                ),
                visible:
                    rect !== undefined && rect.width > 0 && rect.height > 0,
            };
        });
    expect
        .soft(icon)
        .toStrictEqual({ hasDrawing: true, labelVisible: true, visible: true });
};

const beginWorkbookRecalculation = async (page: Readonly<Page>) => {
    const button = page.getByRole("button", {
        exact: true,
        name: recalculateWorkbookName,
    });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect.soft(button).toBeDisabled();
    await expect.soft(button).toHaveAttribute("aria-busy", "true");
    await expectRecalculationIcon(page);
    await expect
        .soft(
            page
                .getByRole("status")
                .filter({ hasText: "Recalculating workbook…" })
        )
        .toBeVisible();
};

const confirmedCalculationText = "Last confirmed calculation:";

const expectCalculationLayout = async (page: Readonly<Page>) => {
    const details = page.getByRole("group", {
        exact: true,
        name: "Workbook calculation status",
    });
    const bounds = await details.evaluate((element) => {
        const toolbar = document.querySelector(".workflow-toolbar");
        if (!toolbar) throw new Error("Missing workbook controls");
        const card = element.getBoundingClientRect();
        const controls = toolbar.getBoundingClientRect();
        return {
            aligned: Math.abs(card.left - controls.left) < 1,
            contained: card.right <= innerWidth,
            fullWidth: Math.abs(card.width - controls.width) < 1,
            separated: card.top - controls.bottom >= 10,
        };
    });
    expect.soft(bounds).toStrictEqual({
        aligned: true,
        contained: true,
        fullWidth: true,
        separated: true,
    });
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
    await expectRecalculationIcon(page);
    await expect
        .soft(
            page.getByRole("button", {
                exact: true,
                name: recalculateWorkbookName,
            })
        )
        .toBeEnabled();
    await expect
        .soft(
            page
                .getByRole("status")
                .filter({ hasText: confirmedCalculationText })
        )
        .toBeVisible();
    await expectCalculationLayout(page);
    await expect
        .soft(page.getByText(/Last confirmed calculation:/v, { exact: false }))
        .toHaveCSS("display", "block");
};

const expectToolbarGeometry = async (page: Readonly<Page>) => {
    const geometry = await page.evaluate(() => {
        const selectors = [
            "#refreshDataButton",
            "#recalculateWorkbookButton",
            "#historyCapacityStatus",
        ];
        return selectors.map((selector) => {
            const element = document.querySelector(selector);
            if (!element)
                throw new Error(`Missing toolbar control ${selector}`);
            const rect = element.getBoundingClientRect();
            return {
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                top: rect.top,
            };
        });
    });
    expect
        .soft(Math.max(...geometry.map(({ top }) => top)))
        .toBeLessThan(Math.min(...geometry.map(({ bottom }) => bottom)));
    expect
        .soft(geometry.every(({ left, right }) => left >= 0 && right <= 390))
        .toBe(true);
    expect
        .soft(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth
            )
        )
        .toBe(true);
};

const expectCalculationDisclosure = async (page: Readonly<Page>) => {
    const summary = page.getByText("Calculations ready", { exact: true });
    const status = page
        .getByRole("status")
        .filter({ hasText: confirmedCalculationText });
    await summary.click();
    await expect.soft(status).toBeHidden();
    await expectCalculationLayout(page);
    const capacity = page.getByRole("button", {
        name: /History space at last refresh:/v,
    });
    await capacity.click();
    await expect.soft(capacity).toHaveAttribute("aria-expanded", "true");
    await expect
        .soft(
            page.getByText(
                /History space at last refresh: 500 of 50,000 rows used · 49,500 remaining/v
            )
        )
        .toBeVisible();

    await summary.evaluate((element) => element.closest("summary")?.focus());
    await page.keyboard.press("Enter");
    await expect.soft(capacity).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Space");
    await expect.soft(status).toBeVisible();
};

test.describe("button press feedback", { tag: "@logger" }, () => {
    test.use({ hasTouch: true });

    test("normal motion moves enabled controls while disabled controls ignore taps", async ({
        page,
    }) => {
        await page.clock.install({ time: fixtureClockTime });
        await openLogger(page, 390, "dark");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.clock.pauseAt("2026-09-09T14:00:01Z");
        const capacity = page.getByRole("button", {
            name: /History space at last refresh:/v,
        });
        await capacity.tap();
        await expect.soft(capacity).not.toHaveCSS("transform", "none");
        await page.clock.runFor(300);
        await expect.soft(capacity).toHaveCSS("transform", "none");
        await beginWorkbookRecalculation(page);
        await page.clock.runFor(300);
        const recalculate = page.getByRole("button", {
            exact: true,
            name: recalculateWorkbookName,
        });
        const restingFilter = await recalculate.evaluate(
            (element) => getComputedStyle(element).filter
        );
        const rect = await recalculate.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            return {
                height: bounds.height,
                width: bounds.width,
                x: bounds.x,
                y: bounds.y,
            };
        });
        await page.touchscreen.tap(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2
        );
        await expect.soft(recalculate).toHaveCSS("filter", restingFilter);
    });

    for (const theme of ["dark", "light"] as const) {
        test(`touch and keyboard feedback remains visible with reduced motion in ${theme}`, async ({
            page,
        }) => {
            await page.clock.install({
                time: fixtureClockTime,
            });
            await openLogger(page, 390, theme);
            await page.clock.pauseAt("2026-09-09T14:00:01Z");
            const button = page.getByRole("button", {
                name: /History space at last refresh:/v,
            });
            const restingFilter = await button.evaluate(
                (element) => getComputedStyle(element).filter
            );
            await button.tap();
            await expect.soft(button).not.toHaveCSS("filter", restingFilter);
            await expect.soft(button).toHaveCSS("transform", "none");
            await page.clock.runFor(300);
            await expect.soft(button).toHaveCSS("filter", restingFilter);
            await button.focus();
            await page.keyboard.press("Enter");
            await expect.soft(button).not.toHaveCSS("filter", restingFilter);
            await page.clock.runFor(300);
            await expect.soft(button).toHaveCSS("filter", restingFilter);
        });
    }
});

test.describe("capacity warning toolbar", () => {
    for (const width of [320, 390]) {
        for (const remainingRows of [
            499,
            0,
            null,
        ]) {
            const capacityData =
                remainingRows === null
                    ? null
                    : {
                          remainingRows,
                          supportedLastRow: 50_001,
                          supportedObservationRows: 50_000,
                          usedRows: 50_000 - remainingRows,
                      };

            test(
                `capacity warning toolbar at ${width}px with ${String(remainingRows)} remaining`,
                { tag: "@logger" },
                async ({ page }, testInfo) => {
                    const fixtureHtml = loggerBrowserFixture().replace(
                        "window.google =",
                        () => `fixtureBootstrap.historyCapacity = ${JSON.stringify(capacityData)};
                 fixtureBootstrap.workbookCalculation = { status: "Ready", calculatedAt: "2026-09-09T14:00:00Z" };
                 window.google =`
                    );
                    await openLogger(
                        page,
                        width,
                        width === 320 ? "dark" : "light",
                        fixtureHtml
                    );
                    await page
                        .getByRole("group", { name: "Workbook controls" })
                        .screenshot({
                            path: testInfo.outputPath("warning-toolbar.png"),
                        });
                    const recalculate = page.getByRole("button", {
                        exact: true,
                        name: recalculateWorkbookName,
                    });
                    const geometry = await recalculate.evaluate((button) => {
                        const capacity = document.querySelector(
                            "#historyCapacityStatus"
                        );
                        if (!capacity)
                            throw new Error("Missing history capacity control");
                        const buttonRect = button.getBoundingClientRect();
                        const capacityRect = capacity.getBoundingClientRect();
                        const capacityRange = document.createRange();
                        capacityRange.selectNodeContents(capacity);
                        const capacityContent =
                            capacityRange.getBoundingClientRect();
                        const range = document.createRange();
                        range.selectNodeContents(button);
                        const textRect = range.getBoundingClientRect();
                        return {
                            capacityContentFits:
                                capacityContent.left >= capacityRect.left &&
                                capacityContent.right <= capacityRect.right,
                            controlsSeparated:
                                buttonRect.right <= capacityRect.left ||
                                capacityRect.right <= buttonRect.left ||
                                buttonRect.bottom <= capacityRect.top ||
                                capacityRect.bottom <= buttonRect.top,
                            labelFits:
                                textRect.left >= buttonRect.left &&
                                textRect.right <= buttonRect.right &&
                                textRect.top >= buttonRect.top &&
                                textRect.bottom <= buttonRect.bottom,
                            withinViewport:
                                capacityRect.left >= 0 &&
                                capacityRect.right <= innerWidth &&
                                document.documentElement.scrollWidth <=
                                    innerWidth,
                        };
                    });
                    expect.soft(geometry).toStrictEqual({
                        capacityContentFits: true,
                        controlsSeparated: true,
                        labelFits: true,
                        withinViewport: true,
                    });
                    await expect
                        .soft(
                            page.getByLabel("History capacity details", {
                                exact: true,
                            })
                        )
                        .toBeVisible();
                    await expect
                        .soft(
                            page.getByLabel("History capacity details", {
                                exact: true,
                            })
                        )
                        .toContainText(
                            remainingRows === null
                                ? "Refresh to try again"
                                : "capacity increase"
                        );
                }
            );
        }
    }
});

for (const theme of ["dark", "light"] as const) {
    test.describe(
        `compact status toolbar ${theme} 390px`,
        { tag: "@logger" },
        () => {
            test("keeps the controls on one row and exposes exact details by click and keyboard", async ({
                page,
            }, testInfo) => {
                await openLogger(page, 390, theme);
                await beginWorkbookRecalculation(page);
                await confirmWorkbookRecalculation(page);
                await expectToolbarGeometry(page);
                await page
                    .getByRole("group", { name: "Workbook controls" })
                    .screenshot({
                        path: testInfo.outputPath("compact-toolbar.png"),
                    });
                await expectCalculationDisclosure(page);
                await expect
                    .soft(
                        page
                            .getByRole("status")
                            .filter({ hasText: confirmedCalculationText })
                    )
                    .toContainText("9/9/2026");
                await page
                    .getByRole("status")
                    .filter({ hasText: confirmedCalculationText })
                    .screenshot({
                        path: testInfo.outputPath("calculation-details.png"),
                    });
            });
        }
    );
}

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
                        .filter({ hasText: confirmedCalculationText })
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
                        await expectRecalculationIcon(page);
                        const status = page
                            .getByRole("status")
                            .filter({ hasText: confirmedCalculationText });
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
                                    name: recalculateWorkbookName,
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

const expectLoadingState = async (page: Readonly<Page>, isLoading: boolean) => {
    const panel = page.getByRole("region", { name: "Garden connection" });
    await expect.soft(panel).toHaveAttribute("aria-busy", String(isLoading));
    expect
        .soft(
            await panel.evaluate((element) => {
                const spinner = element.querySelector("#loadingSpinner");
                const actions = element.querySelector("#loadingActions");
                if (
                    !(spinner instanceof HTMLElement) ||
                    !(actions instanceof HTMLElement)
                )
                    throw new Error("Missing loading feedback");
                return {
                    actionsHidden: actions.hidden,
                    spinnerHidden: spinner.hidden,
                };
            })
        )
        .toStrictEqual({ actionsHidden: isLoading, spinnerHidden: !isLoading });
};

const expectLoadingGeometry = async (page: Readonly<Page>) => {
    const panel = page.getByRole("region", { name: "Garden connection" });
    const geometry = await panel.evaluate((element) => {
        const spinner = element.querySelector("#loadingSpinner");
        if (!spinner) throw new Error("Missing loading spinner");
        const outer = element.getBoundingClientRect();
        const inner = spinner.getBoundingClientRect();
        return {
            centered:
                Math.abs(
                    inner.left + inner.width / 2 - outer.left - outer.width / 2
                ) < 1,
            motion: getComputedStyle(spinner).animationName,
        };
    });
    expect.soft(geometry).toStrictEqual({ centered: true, motion: "none" });
    await expectCalculationLayout(page);
};

const expectLoadingRecoveryLayout = async (page: Readonly<Page>) => {
    await expectLoadingState(page, false);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    const isContained = await page
        .getByRole("region", { name: "Garden connection" })
        .evaluate((element) => {
            const actions = element.querySelector("#loadingActions");
            if (!actions) throw new Error("Missing loading actions");
            const rect = actions.getBoundingClientRect();
            return (
                [...actions.children].every((child) => {
                    const bounds = child.getBoundingClientRect();
                    return (
                        bounds.left >= rect.left &&
                        bounds.right <= rect.right &&
                        bounds.height >= 44 &&
                        child.scrollWidth <= child.clientWidth
                    );
                }) && document.documentElement.scrollWidth <= innerWidth
            );
        });
    expect.soft(isContained).toBe(true);
};

test.describe("loading feedback", { tag: "@logger" }, () => {
    for (const theme of ["dark", "light"] as const) {
        for (const width of [
            320,
            390,
            1280,
        ]) {
            test(`loading panel ${theme} ${width}px stays aligned through retry and recovery`, async ({
                page,
            }, testInfo) => {
                const errors: string[] = [];
                const recordError = (error: Readonly<Error>) => {
                    errors.push(error.message);
                };
                page.on("pageerror", recordError);
                const fixture = loggerBrowserFixture().replace(
                    "getWebAppBootstrap() { success(fixtureBootstrap); }",
                    `getWebAppBootstrap() {
                        window.addEventListener("fixture-release-bootstrap", (event) => {
                            if (event.detail === "failure") failure({ message: "The spreadsheet connection is temporarily unavailable. Please try again." });
                            else success(fixtureBootstrap);
                        }, { once: true });
                    }`
                );
                await page.clock.install({ time: fixtureClockTime });
                await openLogger(page, width, theme, fixture, false);
                await page.clock.pauseAt("2026-09-09T14:00:01Z");
                const loading = page.getByRole("region", {
                    name: "Garden connection",
                });
                await expectLoadingState(page, true);
                await expectLoadingGeometry(page);
                await loading.screenshot({
                    path: testInfo.outputPath("loading.png"),
                });
                await page.clock.fastForward(120_000);
                await expect
                    .soft(
                        page.getByText("Still loading your plants…", {
                            exact: true,
                        })
                    )
                    .toBeVisible();
                await page.evaluate(() =>
                    dispatchEvent(
                        new CustomEvent("fixture-release-bootstrap", {
                            detail: "failure",
                        })
                    )
                );
                await expectLoadingRecoveryLayout(page);
                await loading.screenshot({
                    path: testInfo.outputPath("loading-failure-large-text.png"),
                });
                await page
                    .getByRole("button", { name: "Retry connection" })
                    .focus();
                await page.keyboard.press("Enter");
                await expectLoadingState(page, true);
                await page.evaluate(() =>
                    dispatchEvent(
                        new CustomEvent("fixture-release-bootstrap", {
                            detail: "success",
                        })
                    )
                );
                await expect.soft(loading).toBeHidden();
                await expect
                    .soft(
                        page.getByLabel("2 queued observations", {
                            exact: true,
                        })
                    )
                    .toHaveText("2");
                page.off("pageerror", recordError);
                expect.soft(errors).toStrictEqual([]);
                await expect
                    .soft(
                        page.getByText("Connected · Logger browser-fixture", {
                            exact: true,
                        })
                    )
                    .toBeVisible();
            });
        }
    }
});

const waterAgeToggleName = "Days since watered";
const waterAgeFixtureResult = "fixture-bootstrap-result";

const waterAgeDraft = "Watering-age unfinished draft";
const waterAgeNames = {
    P01: /, P01(?:,|$)/v,
    P02: /, P02(?:,|$)/v,
    P03: /, P03(?:,|$)/v,
    P04: /, P04(?:,|$)/v,
    P05: /, P05(?:,|$)/v,
    P06: /, P06(?:,|$)/v,
};
const waterAgeTile = (
    picker: Readonly<Locator>,
    id: keyof typeof waterAgeNames
) =>
    picker.getByRole("button", {
        includeHidden: true,
        name: waterAgeNames[id],
    });
const refreshLogger = (page: Readonly<Page>) =>
    page
        .getByRole("button", {
            exact: true,
            name: "Refresh plant summaries and History",
        })
        .click();
const confirmWaterAgeRefresh = (page: Readonly<Page>, hasFailed = false) =>
    page.evaluate(
        ({ eventName, isFailure }) =>
            dispatchEvent(
                new CustomEvent(eventName, {
                    detail: isFailure ? "failure" : "success",
                })
            ),
        { eventName: waterAgeFixtureResult, isFailure: hasFailed }
    );
const expectWaterAgeCalls = async (
    page: Readonly<Page>,
    bootstrap: string,
    recent: string | undefined
) => {
    expect
        .soft(
            await page.evaluate(() => ({
                bootstrap:
                    document.documentElement.dataset["fixtureBootstrapCalls"],
                recent: document.documentElement.dataset["fixtureRecentCalls"],
            }))
        )
        .toStrictEqual({ bootstrap, recent });
};
const expectWaterAgeBadges = async (picker: Readonly<Locator>) => {
    await Promise.all(
        (
            [
                ["P01", "0d"],
                ["P02", "1d"],
                ["P03", "No Water"],
                ["P04", "No data"],
                ["P05", "4d"],
            ] as const
        ).map(async ([id, text]) =>
            expect.soft(waterAgeTile(picker, id)).toContainText(text)
        )
    );
};
const expectWaterAgeDraft = async (page: Readonly<Page>) => {
    expect
        .soft(
            await page.evaluate(() => {
                const notes = document.querySelector("#notes");
                const plant = document.querySelector("#plantSelect");
                const weight = document.querySelector("#weight");
                if (
                    !(notes instanceof HTMLTextAreaElement) ||
                    !(plant instanceof HTMLSelectElement) ||
                    !(weight instanceof HTMLInputElement)
                )
                    throw new Error("Missing logger fields");
                return {
                    filtered: document
                        .querySelector("#notWeighedToday")
                        ?.getAttribute("aria-pressed"),
                    fits: document.documentElement.scrollWidth <= innerWidth,
                    notes: notes.value,
                    plant: plant.value,
                    weight: weight.value,
                };
            })
        )
        .toStrictEqual({
            filtered: "true",
            fits: true,
            notes: waterAgeDraft,
            plant: "P02",
            weight: "444",
        });
};
const expectBulkWaterAgeRefresh = async (page: Readonly<Page>) => {
    await page.getByRole("tab", { exact: true, name: bulkCareTab }).click();
    await pickerMode(page, "Table").click();
    const bulk = waterAgeTile(tablePicker(page, true), "P02");
    await bulk.click();
    await refreshLogger(page);
    await expect.soft(bulk).toContainText("Wait…");
    await confirmWaterAgeRefresh(page);
    await expect.soft(bulk).toContainText("1d");
    await expect.soft(bulk).toHaveAttribute(pressedAttribute, "true");
};

const expectObservationHelpTap = async (
    page: Readonly<Page>,
    summary: Readonly<Locator>,
    hint: Readonly<Locator>
) => {
    await page.mouse.move(0, 0);
    await page.keyboard.press("Escape");
    await summary.tap();
    await expect.soft(hint).toBeVisible();
    await summary.tap();
    await expect.soft(hint).toBeHidden();
};

test.describe("observation time help", { tag: "@logger" }, () => {
    test.use({ hasTouch: true });

    for (const theme of ["dark", "light"] as const) {
        for (const [
            mode,
            prefix,
            hintText,
        ] of [
            [
                "Single plant",
                "observedAt",
                "Uses the current time when you save or queue. Edit for an earlier event.",
            ],
            [
                bulkCareTab,
                "bulkObservedAt",
                "Uses the current time when you save. Edit for an earlier event.",
            ],
        ] as const) {
            test(`390px ${theme} ${mode} exposes timestamp guidance by keyboard and pointer`, async ({
                page,
            }) => {
                await openLogger(page, 390, theme);
                await page
                    .getByRole("tab", { exact: true, name: mode })
                    .click();
                const summary = page
                    .getByRole("form", { name: `${mode} entry` })
                    .getByLabel("About observation time", {
                        exact: true,
                    });
                const hint = page.getByText(hintText, { exact: true });
                await expect.soft(hint).toBeHidden();
                await summary.focus();
                await expect.soft(hint).toBeVisible();
                await expect
                    .soft(
                        page
                            .getByLabel("Observed date", { exact: true })
                            .filter({ visible: true })
                    )
                    .toHaveAttribute("aria-describedby", `${prefix}Hint`);
                await page.keyboard.press("Escape");
                await expect.soft(hint).toBeHidden();
                await summary.hover();
                await expect
                    .poll(() =>
                        hint.evaluate((element) => {
                            const rect = element.getBoundingClientRect();
                            return (
                                rect.width > 0 &&
                                rect.left >= 0 &&
                                rect.right <= innerWidth
                            );
                        })
                    )
                    .toBe(true);
                await expectObservationHelpTap(page, summary, hint);
            });
        }

        test(`390px ${theme} preserves native dropdown selection with arrow clearance`, async ({
            page,
        }) => {
            await openLogger(page, 390, theme);
            const select = page.getByRole("combobox", {
                exact: true,
                name: "Event",
            });
            expect
                .soft(
                    await select.evaluate((element) => {
                        const style = getComputedStyle(element);
                        return {
                            arrow: style.backgroundImage !== "none",
                            clearance:
                                Number(
                                    style.paddingInlineEnd.replace("px", "")
                                ) >= 44,
                            nativeArrowHidden: style.appearance === "none",
                        };
                    })
                )
                .toStrictEqual({
                    arrow: true,
                    clearance: true,
                    nativeArrowHidden: true,
                });
            await select.selectOption("Water");
            await expect.soft(select).toHaveValue("Water");
        });
    }
});

const opaqueLuminance = (color: string) => {
    const channels = color.match(/[\d.]+/gv)?.map(Number);
    if (!channels || channels.length < 3 || (channels[3] ?? 1) !== 1)
        throw new Error(`Expected an opaque computed color: ${color}`);
    const [
        red = 0,
        green = 0,
        blue = 0,
    ] = channels.slice(0, 3).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
};

const expectUnavailableAgeContrast = async (tile: Readonly<Locator>) => {
    await tile.click();
    await expect.soft(tile).toHaveAttribute(pressedAttribute, "true");
    const colors = await tile
        .getByText("No data", { exact: true })
        .evaluate((badge) => {
            const style = getComputedStyle(badge);
            return {
                background: style.backgroundColor,
                foreground: style.color,
            };
        });
    const foreground = opaqueLuminance(colors.foreground);
    const background = opaqueLuminance(colors.background);
    const ratio =
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05);
    expect.soft(ratio).toBeGreaterThanOrEqual(4.5);
};

const expectAlignedPicker = async (
    page: Readonly<Page>,
    mode: "Labels" | "Table",
    isBulk: boolean,
    areAgesShown: boolean
) => {
    await pickerMode(page, mode).click();
    const geometry = await tablePicker(page, isBulk).evaluate((picker) => {
        const tiles = [...picker.querySelectorAll<HTMLElement>(".label-choice")]
            .filter((tile) => tile.getClientRects().length > 0)
            .map((tile) => {
                const label = tile.querySelector<HTMLElement>(":scope > span");
                if (!label) throw new Error("Missing pot identity label");
                const age = tile.querySelector<HTMLElement>(".water-age");
                return {
                    ageTop: age?.getBoundingClientRect().top ?? null,
                    fertilized: tile.classList.contains(
                        "has-last-water-fertilizer"
                    ),
                    id: tile.dataset["plantId"] ?? tile.dataset["bulkPlantId"],
                    label: label.textContent,
                    labelTop: label.getBoundingClientRect().top,
                    queued: tile.classList.contains("queued-weighed"),
                    saved: tile.classList.contains("saved-today"),
                    tileTop: tile.getBoundingClientRect().top,
                };
            });
        const rows = new Map<number, typeof tiles>();
        for (const tile of tiles) {
            const rowTop = Math.round(tile.tileTop);
            const row = rows.get(rowTop) ?? [];
            row.push(tile);
            rows.set(rowTop, row);
        }
        const violations = [...rows].flatMap(([rowTop, row]) => {
            const ageTops = row.flatMap((tile) =>
                tile.ageTop === null ? [] : [tile.ageTop]
            );
            const labelSpread =
                Math.max(...row.map((tile) => tile.labelTop)) -
                Math.min(...row.map((tile) => tile.labelTop));
            const ageSpread =
                ageTops.length > 1
                    ? Math.max(...ageTops) - Math.min(...ageTops)
                    : 0;
            return labelSpread > 1 || ageSpread > 1
                ? [
                      {
                          ageSpread,
                          ids: row.map((tile) => tile.id),
                          labelSpread,
                          rowTop,
                      },
                  ]
                : [];
        });
        return {
            ageCount: tiles.filter((tile) => tile.ageTop !== null).length,
            fits: document.documentElement.scrollWidth <= innerWidth,
            tiles,
            violations,
        };
    });
    const state = `${isBulk ? "bulk" : "single"} ${mode} ages ${areAgesShown ? "on" : "off"}`;
    expect.soft(geometry.tiles).toHaveLength(39);
    expect
        .soft(
            {
                fertilized: geometry.tiles.some((tile) => tile.fertilized),
                plain: geometry.tiles.some((tile) => !tile.fertilized),
                queued: geometry.tiles.some((tile) => tile.queued),
                saved: geometry.tiles.some((tile) => tile.saved),
            },
            state
        )
        .toMatchObject({
            fertilized: true,
            plain: true,
            ...(!isBulk && { queued: true, saved: true }),
        });
    expect.soft(geometry.ageCount, state).toBe(areAgesShown ? 39 : 0);
    expect.soft(geometry.fits, state).toBe(true);
    expect.soft(geometry.violations, state).toStrictEqual([]);
    return { state, ...geometry };
};
const expectFertilizerAlignment = async (page: Readonly<Page>) => {
    const singleLabelsOff = await expectAlignedPicker(
        page,
        "Labels",
        false,
        false
    );
    const singleTableOff = await expectAlignedPicker(
        page,
        "Table",
        false,
        false
    );
    await pickerMode(page, waterAgeToggleName).click();
    const singleLabelsOn = await expectAlignedPicker(
        page,
        "Labels",
        false,
        true
    );
    const singleTableOn = await expectAlignedPicker(page, "Table", false, true);
    await page.getByRole("tab", { exact: true, name: bulkCareTab }).click();
    const bulkLabelsOn = await expectAlignedPicker(page, "Labels", true, true);
    const bulkTableOn = await expectAlignedPicker(page, "Table", true, true);
    await page.getByRole("tab", { exact: true, name: "Single plant" }).click();
    await pickerMode(page, waterAgeToggleName).click();
    await page.getByRole("tab", { exact: true, name: bulkCareTab }).click();
    const bulkLabelsOff = await expectAlignedPicker(
        page,
        "Labels",
        true,
        false
    );
    const bulkTableOff = await expectAlignedPicker(page, "Table", true, false);
    await page.getByRole("tab", { exact: true, name: "Single plant" }).click();
    return [
        singleLabelsOff,
        singleTableOff,
        singleLabelsOn,
        singleTableOn,
        bulkLabelsOn,
        bulkTableOn,
        bulkLabelsOff,
        bulkTableOff,
    ];
};

const expectNutrientStreakIcons = async (page: Readonly<Page>) => {
    const picker = tablePicker(page);
    const plain = waterAgeTile(picker, "P01").getByRole("img", {
        name: "4 waterings in a row without nutrients",
    });
    const fed = waterAgeTile(picker, "P02").getByRole("img", {
        name: "3 waterings in a row with nutrients",
    });
    const readBadge = (badge: Readonly<Locator>) =>
        badge.evaluate((element) => ({
            count: element.querySelector(".watering-streak-count")?.textContent,
            icon: element.querySelector("use")?.getAttribute("href"),
        }));
    await expect.soft(plain).toBeVisible();
    expect
        .soft(await readBadge(plain))
        .toStrictEqual({ count: "4", icon: "#app-icon-water" });
    expect
        .soft(await readBadge(fed))
        .toStrictEqual({ count: "3", icon: "#app-icon-feeding" });
};

test.describe("latest-water fertilizer badge", { tag: "@logger" }, () => {
    const badgeLabel = "3 waterings in a row with nutrients";
    const expectSingleFertilizer = async (page: Readonly<Page>) => {
        await pickerMode(page, "Table").click();
        const fertilized = waterAgeTile(tablePicker(page), "P02");
        await expect
            .soft(fertilized.getByRole("img", { name: badgeLabel }))
            .toBeVisible();
        await expectNutrientStreakIcons(page);
        await expect
            .soft(
                waterAgeTile(tablePicker(page), "P01").getByRole("img", {
                    name: badgeLabel,
                })
            )
            .toHaveCount(0);
        await expect
            .soft(fertilized)
            .toHaveAccessibleName(/3 waterings in a row with nutrients/v);
        await expect
            .soft(fertilized.getByText("1d", { exact: true }))
            .toHaveCount(0);
        await fertilized.focus();
        await page.keyboard.press("Enter");
        await pickerMode(page, "Labels").click();
        await expect
            .soft(fertilized.getByRole("img", { name: badgeLabel }))
            .toBeVisible();
    };
    const expectFertilizerAgePreference = async (page: Readonly<Page>) => {
        const fertilized = waterAgeTile(tablePicker(page), "P02");
        await pickerMode(page, waterAgeToggleName).click();
        await expect.soft(fertilized).toContainText("1d");
        await pickerMode(page, waterAgeToggleName).click();
        await expect
            .soft(fertilized.getByRole("img", { name: badgeLabel }))
            .toBeVisible();
        await pickerMode(page, "List").click();
        const summary = page.getByLabel(/^Choose plant\. Current selection:/v);
        await expect
            .soft(summary.getByRole("img", { name: badgeLabel }))
            .toBeVisible();
        await summary.click();
        await expect
            .soft(
                page
                    .getByRole("option", { name: /\bP02\b/v })
                    .getByRole("img", { name: badgeLabel })
            )
            .toBeVisible();
        await page.keyboard.press("Escape");
    };
    const expectBulkFertilizer = async (
        page: Readonly<Page>,
        mode:
            | "Labels"
            | "List"
            | "Table"
    ) => {
        await pickerMode(page, mode).click();
        await expect
            .soft(
                tablePicker(page, true).getByRole("img", { name: badgeLabel })
            )
            .toBeVisible();
        expect
            .soft(
                await page.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth
                )
            )
            .toBe(true);
    };
    for (const theme of ["dark", "light"] as const) {
        for (const width of [390, 1280]) {
            test(`${width}px ${theme} identifies fertilizer across pickers and withholds unconfirmed refreshes`, async ({
                page,
            }, testInfo) => {
                const fixture = wateringAgeFixture().replace(
                    "plant.lastWateredDayKey =",
                    'plant.lastWateredNutrientsUsed = index === 1 ? "Yes" : "No"; plant.lastWateredNutrientStreakCount = index === 1 ? 3 : index === 0 ? 4 : 1; plant.lastWateredDayKey ='
                );
                await openLogger(page, width, theme, fixture);
                const alignment = await expectFertilizerAlignment(page);
                await testInfo.attach("picker-row-alignment", {
                    body: JSON.stringify(alignment, null, 2),
                    contentType: "application/json",
                });
                await pickerMode(page, "Labels").click();
                await pickerMode(page, waterAgeToggleName).click();
                await tablePicker(page).screenshot({
                    path: testInfo.outputPath(
                        "fertilizer-single-labels-ages.png"
                    ),
                    style: ".actions { visibility: hidden !important; }",
                });
                await pickerMode(page, "Table").click();
                await tablePicker(page).screenshot({
                    path: testInfo.outputPath(
                        "fertilizer-single-table-ages.png"
                    ),
                    style: ".actions { visibility: hidden !important; }",
                });
                await pickerMode(page, waterAgeToggleName).click();
                await expectSingleFertilizer(page);
                await expectFertilizerAgePreference(page);
                const picker = tablePicker(page);
                await pickerMode(page, "Table").click();
                await picker.screenshot({
                    path: testInfo.outputPath("fertilizer-single-table.png"),
                });

                await page
                    .getByRole("tab", { exact: true, name: bulkCareTab })
                    .click();
                await expectBulkFertilizer(page, "Table");
                await expectBulkFertilizer(page, "Labels");
                await expectBulkFertilizer(page, "List");
                await pickerMode(page, "Table").click();
                await tablePicker(page, true).screenshot({
                    path: testInfo.outputPath("fertilizer-bulk-table.png"),
                });
                await refreshLogger(page);
                await expect
                    .soft(page.getByRole("img", { name: badgeLabel }))
                    .toHaveCount(0);
                await confirmWaterAgeRefresh(page, true);
                await expect
                    .soft(page.getByRole("img", { name: badgeLabel }))
                    .toHaveCount(0);
                await refreshLogger(page);
                await confirmWaterAgeRefresh(page);
                await expect
                    .soft(
                        waterAgeTile(tablePicker(page, true), "P02").getByRole(
                            "img",
                            { name: badgeLabel }
                        )
                    )
                    .toBeVisible();
            });
        }
    }
});

const refreshControl = (page: Readonly<Page>) =>
    page.getByRole("button", {
        name: /^Refresh(?:ing)? plant summaries/v,
    });
const expectRefreshProgress = async (
    page: Readonly<Page>,
    isPending: boolean
) => {
    const refresh = refreshControl(page);
    expect
        .soft(
            await refresh.evaluate((element) => ({
                busy: element.getAttribute("aria-busy"),
                disabled: element.hasAttribute("disabled"),
                text: element.textContent.trim(),
            }))
        )
        .toStrictEqual({
            busy: String(isPending),
            disabled: isPending,
            text: isPending ? "Refreshing…" : "Refresh",
        });
    await expect
        .soft(refresh)
        .toHaveAccessibleName(
            isPending
                ? "Refreshing plant summaries, watering days and History"
                : "Refresh plant summaries and History"
        );
};
const expectRefreshMotion = async (
    page: Readonly<Page>,
    isReduced: boolean
) => {
    await page.emulateMedia({
        reducedMotion: isReduced ? "reduce" : "no-preference",
    });
    expect
        .soft(
            await refreshControl(page).evaluate((button) => {
                const icon = button.querySelector("svg");
                if (!icon) throw new Error("Missing refresh icon");
                return getComputedStyle(icon).animationName;
            })
        )
        .toBe(isReduced ? "none" : "spin");
};

test.describe("watering age picker", { tag: "@logger" }, () => {
    for (const theme of ["dark", "light"] as const) {
        test(`390px ${theme} shows refresh progress and stops on timeout without accepting a late reply`, async ({
            page,
        }, testInfo) => {
            await openLogger(page, 390, theme, wateringAgeFixture());
            await pickerMode(page, "Labels").click();
            await pickerMode(page, waterAgeToggleName).click();
            await refreshLogger(page);
            await expectRefreshProgress(page, true);
            await expect
                .soft(waterAgeTile(tablePicker(page), "P02"))
                .toContainText("Wait…");
            await expectRefreshMotion(page, false);
            await expectRefreshMotion(page, true);
            await refreshControl(page).screenshot({
                path: testInfo.outputPath("refresh-pending.png"),
            });
            await page.clock.runFor(121_000);
            await expectRefreshProgress(page, false);
            await expect
                .soft(waterAgeTile(tablePicker(page), "P02"))
                .toContainText("No data");
            await confirmWaterAgeRefresh(page);
            await expect
                .soft(waterAgeTile(tablePicker(page), "P02"))
                .toContainText("No data");
            await refreshLogger(page);
            await confirmWaterAgeRefresh(page);
            await expectRefreshProgress(page, false);
            await expect
                .soft(waterAgeTile(tablePicker(page), "P02"))
                .toContainText("1d");
        });
    }

    for (const theme of ["dark", "light"] as const) {
        const neutralColor =
            theme === "dark" ? "rgb(17, 25, 20)" : "rgb(255, 255, 255)";

        test(`390px ${theme} matches workbook color interpolation and clears unconfirmed colors`, async ({
            page,
        }) => {
            const fixture = wateringAgeFixture().replace(
                '["2026-09-09", "2026-09-08", "", "2026-02-30"]',
                '["2026-09-09", "2026-09-02", "2026-08-26", "2026-08-19", "2026-08-12", "2026-08-11", "", "2026-02-30"]'
            );
            await openLogger(page, 390, theme, fixture);
            await pickerMode(page, "Labels").click();
            await pickerMode(page, waterAgeToggleName).click();
            const badges = tablePicker(page).getByRole("button");
            const readColors = () =>
                badges.evaluateAll((elements) =>
                    elements
                        .filter((element) =>
                            /^P0[1-8]$/v.test(element.dataset["plantId"] ?? "")
                        )
                        .toSorted((left, right) =>
                            (left.dataset["plantId"] ?? "").localeCompare(
                                right.dataset["plantId"] ?? ""
                            )
                        )
                        .map((element) => {
                            const badge =
                                element.querySelector<HTMLElement>(
                                    ":scope .water-age"
                                );
                            if (!badge)
                                throw new Error("Missing watering age badge");
                            return {
                                color: getComputedStyle(badge).backgroundColor,
                                days: badge.dataset["days"] ?? "unknown",
                            };
                        })
                );
            expect.soft(await readColors()).toStrictEqual([
                { color: "rgb(87, 187, 138)", days: "0" },
                { color: "rgb(171, 201, 120)", days: "7" },
                { color: "rgb(255, 214, 102)", days: "14" },
                { color: "rgb(243, 169, 109)", days: "21" },
                { color: "rgb(230, 124, 115)", days: "28" },
                { color: "rgb(230, 124, 115)", days: "29" },
                { color: neutralColor, days: "unknown" },
                { color: neutralColor, days: "unknown" },
            ]);
            await refreshLogger(page);
            expect.soft(await readColors()).toStrictEqual(
                Array.from({ length: 8 }, () => ({
                    color: neutralColor,
                    days: "unknown",
                }))
            );
            await confirmWaterAgeRefresh(page, true);
            expect.soft(await readColors()).toStrictEqual(
                Array.from({ length: 8 }, () => ({
                    color: neutralColor,
                    days: "unknown",
                }))
            );
            await expectUnavailableAgeContrast(
                waterAgeTile(tablePicker(page), "P02")
            );
            const queued = waterAgeTile(tablePicker(page), "P06");
            await expect.soft(queued).toHaveAccessibleName(/Queued/v);
            await expectUnavailableAgeContrast(queued);
        });

        test(`390px ${theme} toggles ages without changing drafts or filters`, async ({
            page,
        }, testInfo) => {
            await openLogger(page, 390, theme, wateringAgeFixture());
            await pickerMode(page, "Table").click();
            const picker = tablePicker(page);
            await waterAgeTile(picker, "P02").click();
            await page
                .getByRole("button", { exact: true, name: "Weigh" })
                .click();
            await page
                .getByRole("spinbutton", { exact: true, name: "Weight (g)" })
                .fill("444");
            await page
                .getByRole("textbox", { exact: true, name: "Notes" })
                .fill(waterAgeDraft);
            const toggle = pickerMode(page, waterAgeToggleName);
            expect
                .soft(
                    await toggle.evaluate((element) =>
                        element
                            .querySelector(":scope svg use")
                            ?.getAttribute("href")
                    )
                )
                .toBe("#app-icon-water");
            await toggle.focus();
            await page.keyboard.press("Enter");
            await expect.soft(toggle).toBeFocused();
            await expectWaterAgeBadges(picker);
            await pickerMode(page, "Not weighed today").click();
            await expect.soft(waterAgeTile(picker, "P05")).toBeHidden();
            await page
                .getByRole("searchbox", { name: "Find by name, ID, or label" })
                .fill("P02");
            await toggle.click();
            await expect
                .soft(
                    waterAgeTile(picker, "P02").getByText("1d", { exact: true })
                )
                .toBeHidden();
            await toggle.click();
            await expectWaterAgeDraft(page);
            await page
                .getByRole("searchbox", { name: "Find by name, ID, or label" })
                .fill("");
            await picker.screenshot({
                path: testInfo.outputPath("watering-ages.png"),
            });
            await expectBulkWaterAgeRefresh(page);
        });
    }

    test("default refresh uses one RPC and withholds unconfirmed watering ages", async ({
        page,
    }) => {
        await openLogger(page, 390, "light", wateringAgeFixture());
        await pickerMode(page, "Labels").click();
        await pickerMode(page, waterAgeToggleName).click();
        const plant = waterAgeTile(tablePicker(page), "P02");
        await refreshLogger(page);
        await expect.soft(plant).toContainText("Wait…");
        await expectWaterAgeCalls(page, "2", undefined);
        await confirmWaterAgeRefresh(page, true);
        await expect.soft(plant).toContainText("No data");
        await expect
            .soft(
                page
                    .getByRole("status")
                    .filter({ hasText: "History refresh unavailable" })
            )
            .toBeVisible();
        await refreshLogger(page);
        await confirmWaterAgeRefresh(page);
        await expect.soft(plant).toContainText("1d");
        await page
            .getByRole("combobox", { exact: true, name: "Event" })
            .selectOption("Water");
        await expectWaterAgeCalls(page, "3", "1");
        await refreshLogger(page);
        await expectWaterAgeCalls(page, "4", "2");
        await confirmWaterAgeRefresh(page);
        await expect
            .soft(page.getByRole("combobox", { exact: true, name: "Event" }))
            .toHaveValue("Water");
    });

    test("older roster data stays unavailable and display preference survives reload", async ({
        page,
    }) => {
        await openLogger(page, 390, "dark", wateringAgeFixture(false));
        await pickerMode(page, "Labels").click();
        await pickerMode(page, waterAgeToggleName).click();
        await expect
            .soft(waterAgeTile(tablePicker(page), "P03"))
            .toContainText("No data");
        await page.reload();
        await expect
            .soft(pickerMode(page, waterAgeToggleName))
            .toHaveAttribute(pressedAttribute, "true");
        await expect
            .soft(waterAgeTile(tablePicker(page), "P02"))
            .toContainText("No data");
    });

    test("watering age crosses New York midnight before the four-hour care day", async ({
        page,
    }) => {
        const fixture = wateringAgeFixture()
            .replaceAll(fixtureClockTime, "2026-11-01T03:59:30Z")
            .replace('"2026-09-08"', '"2026-10-31"');
        await openLogger(page, 390, "light", fixture);
        await pickerMode(page, "Labels").click();
        await pickerMode(page, waterAgeToggleName).click();
        const plant = waterAgeTile(tablePicker(page), "P02");
        await expect.soft(plant).toContainText("0d");
        await page.clock.setFixedTime("2026-09-09T14:01:00Z");
        await pickerMode(page, waterAgeToggleName).click();
        await pickerMode(page, waterAgeToggleName).click();
        await expect.soft(plant).toContainText("1d");
    });
});
