import { expect, type Locator, type Page, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

// eslint-disable-next-line import-x/extensions -- Shared ESM fixture is also served by the local preview.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const pressedAttribute = "aria-pressed";
const bulkCareTab = "Bulk care";

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
        .toHaveCount(38);
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
    await expect.soft(picker.getByRole("button")).toHaveCount(38);
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
        labels: Array.from({ length: 14 }, (_, index) => `#${index + 1}`),
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

const beginWorkbookRecalculation = async (page: Readonly<Page>) => {
    const button = page.getByRole("button", {
        exact: true,
        name: "Recalculate workbook",
    });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect.soft(button).toBeDisabled();
    await expect.soft(button).toHaveAttribute("aria-busy", "true");
    await expect
        .soft(
            page
                .getByRole("status")
                .filter({ hasText: "Recalculating workbook…" })
        )
        .toBeVisible();
};

const confirmedCalculationText = "Last confirmed calculation:";

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
                .filter({ hasText: confirmedCalculationText })
        )
        .toBeVisible();
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

    await summary.focus();
    await page.keyboard.press("Enter");
    await expect.soft(capacity).toHaveAttribute("aria-expanded", "false");
    await summary.press("Space");
    await expect.soft(status).toBeVisible();
};

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
