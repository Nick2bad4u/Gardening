import { expect, type Locator, type Page, test } from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- The fixture loads maintained logger HTML with a local service bridge.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const fixtureTime = "2026-09-09T14:00:00Z";
const focusStorageKey = "gardenLoggerWateringFocusV1";
const queueStorageKey = "gardenLoggerObservationQueueV1";
const focusName = "Watering focus";
const pressedAttribute = "aria-pressed";
const daysName = "Watering focus threshold in days";
const savedBadgeName = "Weighed today; saved to Google";
const queuedBadgeName =
    "Observations queued on this phone; not yet saved to Google";
const plantNames = {
    P01: /, P01(?:,|$)/v,
    P02: /, P02(?:,|$)/v,
    P03: /, P03(?:,|$)/v,
    P04: /, P04(?:,|$)/v,
    P05: /, P05(?:,|$)/v,
    P06: /, P06(?:,|$)/v,
    P07: /, P07(?:,|$)/v,
    P08: /, P08(?:,|$)/v,
    P38: /, P38(?:,|$)/v,
};

const replaceFixturePart = (
    html: string,
    original: string,
    replacement: string
) => {
    if (!html.includes(original))
        throw new Error("Watering focus fixture bridge changed");
    return html.replace(original, () => replacement);
};

const focusFixture = (hasWateringAges = true) => {
    const persistentQueue = replaceFixturePart(
        loggerBrowserFixture({ preserveQueue: true }),
        'if (!true || !localStorage.getItem("gardenLoggerObservationQueueV1"))',
        'if (sessionStorage.getItem("focusFixtureQueueSeeded") !== "true" && !localStorage.getItem("gardenLoggerObservationQueueV1"))'
    );
    const trackedWrites = replaceFixturePart(
        persistentQueue,
        'saveWebObservation() { failure({ message: "Fixture writes are disabled." }); }',
        'saveWebObservation() { document.documentElement.dataset.fixtureUnexpectedSaves = "true"; failure({ message: "Fixture writes are disabled." }); }'
    );
    const wateringDates = replaceFixturePart(
        trackedWrites,
        "window.google =",
        `sessionStorage.setItem("focusFixtureQueueSeeded", "true");
            fixtureBootstrap.wateringAgesAvailable = ${String(hasWateringAges)};
            fixtureBootstrap.plants.forEach((plant, index) => {
                plant.lastWateredDayKey = ["2026-09-09", "2026-09-08", "2026-09-02", "2026-09-01", "", "2026-02-30", "2026-09-10", "2026-09-03"][index] ?? "2026-09-05";
            });
            window.google =`
    );
    return replaceFixturePart(
        wateringDates,
        "getWebAppBootstrap() { success(fixtureBootstrap); }",
        `getWebAppBootstrap() {
            const count = Number(document.documentElement.dataset.fixtureBootstrapCalls || "0") + 1;
            document.documentElement.dataset.fixtureBootstrapCalls = String(count);
            if (count === 1 && sessionStorage.getItem("focusFixtureHoldBootstrap") !== "true") { success(fixtureBootstrap); return; }
            window.addEventListener("fixture-focus-bootstrap", (event) => {
                if (event.detail === "failure") failure({message: "Fixture connection failed"});
                else success(fixtureBootstrap);
            }, {once: true});
        }`
    );
};

const openFocusFixture = async (
    page: Readonly<Page>,
    width = 390,
    theme: "dark" | "light" = "light",
    html = focusFixture(),
    shouldFixTime = true
) => {
    if (shouldFixTime) await page.clock.setFixedTime(fixtureTime);
    await page.setViewportSize({ height: 900, width });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-fixture")
            await route.fulfill({ body: html, contentType: "text/html" });
        else await route.abort();
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

const picker = (page: Readonly<Page>, isBulk = false) =>
    page.getByRole("group", {
        name: isBulk
            ? "Choose plants for bulk care"
            : "Choose plant by pot label",
    });
const plant = (list: Readonly<Locator>, id: keyof typeof plantNames) =>
    list.getByRole("button", { name: plantNames[id] });
const focusToggle = (page: Readonly<Page>) =>
    page.getByRole("button", { exact: true, name: focusName });
const focusDays = (page: Readonly<Page>) =>
    page.getByRole("spinbutton", { exact: true, name: daysName });
const chooseMode = (
    page: Readonly<Page>,
    name:
        | "Labels"
        | "List"
        | "Table"
) => page.getByRole("button", { exact: true, name }).click();
const setFocusDays = async (page: Readonly<Page>, days: string) => {
    await focusDays(page).fill(days);
    await focusDays(page).press("Tab");
};
const opacity = (element: Readonly<Locator>) =>
    element.evaluate((node) =>
        Number(
            getComputedStyle(node.closest("[data-bulk-plant-id]") ?? node)
                .opacity
        )
    );
const expectFaded = async (element: Readonly<Locator>, isFaded: boolean) => {
    await expect.soft(element).toBeVisible();
    if (isFaded) await expect.poll(() => opacity(element)).toBeLessThan(1);
    else await expect.poll(() => opacity(element)).toBe(1);
};
const expectPointerSelection = async (
    page: Readonly<Page>,
    control: Readonly<Locator>,
    isMobile: boolean,
    isCheckbox = false
) => {
    if (isMobile) await control.tap();
    else await control.click();
    await page.mouse.move(0, 0);
    if (isCheckbox) await expect.soft(control).toBeChecked();
    else await expect.soft(control).toHaveAttribute(pressedAttribute, "true");
    await expectFaded(control, true);
};
const expectDesktopHover = async (
    page: Readonly<Page>,
    control: Readonly<Locator>,
    isMobile: boolean
) => {
    if (isMobile) return;
    await control.hover();
    await expectFaded(control, false);
    await page.mouse.move(0, 0);
    await expectFaded(control, true);
};
const bulkControl = (list: Readonly<Locator>, mode: string) =>
    mode === "List"
        ? list.getByRole("checkbox", { name: /P02/v })
        : plant(list, "P02");
const expectKeyboardReveal = async (
    page: Readonly<Page>,
    control: Readonly<Locator>
) => {
    await control.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect.soft(control).toBeFocused();
    await expectFaded(control, false);
    await page.keyboard.press("Tab");
    await expectFaded(control, true);
};
const pickerPositions = (list: Readonly<Locator>) =>
    list.evaluate((root) =>
        [
            ...root.querySelectorAll<HTMLElement>(
                "[data-plant-id], [data-bulk-plant-id]"
            ),
        ].map((node) => {
            const rect = node.getBoundingClientRect();
            return {
                height: rect.height,
                id: node.dataset["plantId"] ?? node.dataset["bulkPlantId"],
                width: rect.width,
                x: rect.x + scrollX,
                y: rect.y + scrollY,
            };
        })
    );
const queueBytes = (page: Readonly<Page>) =>
    page.evaluate(
        (key) => document.defaultView?.localStorage.getItem(key),
        queueStorageKey
    );
const readPreference = (page: Readonly<Page>) =>
    page.evaluate(
        (key) => document.defaultView?.localStorage.getItem(key),
        focusStorageKey
    );
const refresh = (page: Readonly<Page>) =>
    page
        .getByRole("button", {
            exact: true,
            name: "Refresh plant summaries and History",
        })
        .click();
const finishRefresh = (page: Readonly<Page>, hasFailed = false) =>
    page.evaluate(
        (isFailure) =>
            dispatchEvent(
                new CustomEvent("fixture-focus-bootstrap", {
                    detail: isFailure ? "failure" : "success",
                })
            ),
        hasFailed
    );
const switchToBulk = (page: Readonly<Page>) =>
    page.getByRole("tab", { exact: true, name: "Bulk care" }).click();
const selectedBulkIds = (list: Readonly<Locator>) =>
    list.getByRole("button", { includeHidden: true }).evaluateAll((buttons) =>
        buttons
            .filter((button) => button.getAttribute("aria-pressed") === "true")
            .map((button) => button.dataset["bulkPlantId"])
            .toSorted((first, second) =>
                (first ?? "").localeCompare(second ?? "")
            )
    );

const expectThresholdStates = async (list: Readonly<Locator>) => {
    await expectFaded(plant(list, "P01"), true);
    await expectFaded(plant(list, "P02"), true);
    await expectFaded(plant(list, "P03"), false);
    await expectFaded(plant(list, "P04"), false);
    await expectFaded(plant(list, "P05"), false);
    await expectFaded(plant(list, "P06"), false);
    await expectFaded(plant(list, "P07"), false);
    await expectFaded(plant(list, "P08"), true);
};

const expectFocusLayout = async (
    page: Readonly<Page>,
    mode: "Labels" | "Table",
    isBulk = false
) => {
    const list = picker(page, isBulk);
    await chooseMode(page, mode);
    await expect
        .soft(focusToggle(page))
        .toHaveAttribute(pressedAttribute, "false");
    const before = await pickerPositions(list);
    await focusToggle(page).click();
    await page.mouse.move(0, 0);
    await expectThresholdStates(list);
    expect.soft(await pickerPositions(list)).toStrictEqual(before);
    await focusToggle(page).click();
    await expectFaded(plant(list, "P02"), false);
    expect.soft(await pickerPositions(list)).toStrictEqual(before);
};

const expectBulkBadgeCounts = async (list: Readonly<Locator>) => {
    await expect
        .soft(list.getByRole("img", { exact: true, name: savedBadgeName }))
        .toHaveCount(2);
    await expect
        .soft(list.getByRole("img", { exact: true, name: queuedBadgeName }))
        .toHaveCount(2);
};

const expectBulkTileStatus = async (list: Readonly<Locator>) => {
    await expect
        .soft(plant(list, "P38"))
        .toHaveAccessibleName(/Weighed today/v);
    await expect
        .soft(plant(list, "P38"))
        .toHaveAccessibleName(/Queued on this phone/v);
    await expect
        .soft(
            plant(list, "P05").getByRole("img", {
                exact: true,
                name: savedBadgeName,
            })
        )
        .toBeVisible();
    await expect
        .soft(
            plant(list, "P06").getByRole("img", {
                exact: true,
                name: queuedBadgeName,
            })
        )
        .toBeVisible();
};

const expectBulkStatus = async (
    page: Readonly<Page>,
    mode:
        | "Labels"
        | "List"
        | "Table"
) => {
    await chooseMode(page, mode);
    const list = picker(page, true);
    await expectBulkBadgeCounts(list);
    if (mode === "List") {
        await expect
            .soft(list.getByRole("checkbox", { name: /P38/v }))
            .toHaveAccessibleName(/Weighed today/v);
        await expect
            .soft(list.getByRole("checkbox", { name: /P38/v }))
            .toHaveAccessibleName(/Queued on this phone/v);
    } else await expectBulkTileStatus(list);
};

const expectFocusPreference = async (page: Readonly<Page>, days: string) => {
    await expect.soft(focusDays(page)).toHaveValue(days);
    await expect
        .soft(focusToggle(page))
        .toHaveAttribute(pressedAttribute, "true");
};
const expectInvalidDays = async (
    page: Readonly<Page>,
    value: string,
    applied:
        | null
        | string
        | undefined
) => {
    await setFocusDays(page, value);
    await expect.soft(focusDays(page)).toHaveAttribute("aria-invalid", "true");
    expect.soft(await readPreference(page)).toBe(applied);
};
const expectBulkSuspended = async (page: Readonly<Page>) => {
    await expect
        .soft(
            page.getByRole("button", {
                exact: true,
                name: "Select highlighted",
            })
        )
        .toBeDisabled();
    await expectFaded(plant(picker(page, true), "P08"), false);
};

test.describe("logger watering focus", { tag: "@logger" }, () => {
    for (const theme of ["dark", "light"] as const) {
        for (const width of [390, 1280]) {
            test(`${width}px ${theme} fades only recent plants without moving either picker`, async ({
                page,
            }, testInfo) => {
                await openFocusFixture(page, width, theme);
                const originalQueue = await queueBytes(page);
                await expectFocusLayout(page, "Labels");
                await expectFocusLayout(page, "Table");
                await focusToggle(page).scrollIntoViewIfNeeded();
                await page.screenshot({
                    path: testInfo.outputPath(
                        "single-watering-focus-controls.png"
                    ),
                });
                await switchToBulk(page);
                await expectFocusLayout(page, "Labels", true);
                await expectFocusLayout(page, "Table", true);
                await expectBulkStatus(page, "List");
                await expectBulkStatus(page, "Labels");
                await expectBulkStatus(page, "Table");
                await focusToggle(page).click();
                await page.mouse.move(0, 0);
                expect
                    .soft(
                        await page.evaluate(
                            () =>
                                document.documentElement.scrollWidth <=
                                innerWidth
                        )
                    )
                    .toBe(true);
                expect.soft(await queueBytes(page)).toBe(originalQueue);
                await picker(page, true).screenshot({
                    path: testInfo.outputPath("bulk-watering-focus.png"),
                });
                await focusToggle(page).scrollIntoViewIfNeeded();
                await page.screenshot({
                    path: testInfo.outputPath("watering-focus-controls.png"),
                });
            });
        }
    }

    test("threshold edits synchronize, validate and persist without changing queued entries", async ({
        page,
    }) => {
        await openFocusFixture(page);
        const originalQueue = await queueBytes(page);
        await chooseMode(page, "Table");
        await setFocusDays(page, "3");
        await expect
            .soft(focusToggle(page))
            .toHaveAttribute(pressedAttribute, "false");
        await focusToggle(page).click();
        await expectFaded(plant(picker(page), "P02"), true);
        await setFocusDays(page, "1");
        await expectFaded(plant(picker(page), "P02"), false);
        await switchToBulk(page);
        await expectFocusPreference(page, "1");
        await setFocusDays(page, "3");
        const applied = await readPreference(page);
        expect
            .soft(JSON.parse(applied ?? "null"))
            .toStrictEqual({ days: 3, enabled: true });
        await expectInvalidDays(page, "", applied);
        await expectInvalidDays(page, "0", applied);
        await expectInvalidDays(page, "-1", applied);
        await expectInvalidDays(page, "1.5", applied);
        await expectInvalidDays(page, "9007199254740992", applied);
        await setFocusDays(page, "3");
        await expect
            .soft(focusDays(page))
            .not.toHaveAttribute("aria-invalid", "true");
        await page.reload();
        await expectFocusPreference(page, "3");
        expect.soft(await queueBytes(page)).toBe(originalQueue);
    });

    test("bulk highlighting keeps manual selections and Select highlighted excludes recent plants", async ({
        page,
    }) => {
        await openFocusFixture(page);
        await switchToBulk(page);
        await chooseMode(page, "Table");
        const list = picker(page, true);
        await plant(list, "P02").click();
        await focusToggle(page).click();
        await page.mouse.move(0, 0);
        await focusToggle(page).focus();
        await expectFaded(plant(list, "P02"), true);
        await expectFaded(plant(list, "P08"), true);
        const select = page.getByRole("button", {
            exact: true,
            name: "Select highlighted",
        });
        const search = page.getByRole("searchbox", {
            exact: true,
            name: "Find by name, ID, or label",
        });
        await search.fill("P03");
        await select.click();
        expect.soft(await selectedBulkIds(list)).toStrictEqual(["P02", "P03"]);
        await search.fill("");
        await select.click();
        expect.soft(await selectedBulkIds(list)).toStrictEqual([
            "P02",
            "P03",
            "P04",
            "P05",
            "P06",
            "P07",
        ]);
        await setFocusDays(page, "30");
        await expect
            .soft(plant(list, "P03"))
            .toHaveAttribute(pressedAttribute, "true");
        await expectFaded(plant(list, "P03"), true);
        await focusToggle(page).click();
        await expect
            .soft(plant(list, "P02"))
            .toHaveAttribute(pressedAttribute, "true");
        await expect
            .soft(
                page.getByRole("button", {
                    exact: true,
                    name: "Select visible",
                })
            )
            .toBeVisible();
    });

    test("editing the focus cutoff preserves an unfinished observation and Enter never submits it", async ({
        page,
    }) => {
        await openFocusFixture(page);
        await chooseMode(page, "Table");
        await plant(picker(page), "P02").click();
        await page.getByRole("button", { exact: true, name: "Weigh" }).click();
        const weight = page.getByRole("spinbutton", {
            exact: true,
            name: "Weight (g)",
        });
        const notes = page.getByRole("textbox", { exact: true, name: "Notes" });
        await weight.fill("444");
        await notes.fill("Unfinished focus fixture observation");
        const originalQueue = await queueBytes(page);
        await focusToggle(page).click();
        await focusDays(page).fill("10");
        await focusDays(page).press("Enter");
        await expectFaded(plant(picker(page), "P02"), true);
        await expectFaded(plant(picker(page), "P03"), true);
        await chooseMode(page, "Labels");
        await expect.soft(weight).toHaveValue("444");
        await expect
            .soft(notes)
            .toHaveValue("Unfinished focus fixture observation");
        expect.soft(await queueBytes(page)).toBe(originalQueue);
        expect
            .soft(
                await page.evaluate(
                    () =>
                        document.documentElement.dataset[
                            "fixtureUnexpectedSaves"
                        ]
                )
            )
            .toBeUndefined();
        await expect
            .soft(plant(picker(page), "P02"))
            .toHaveAttribute(pressedAttribute, "true");
    });

    test("single list and table selections fade after pointer use and reveal for keyboard focus", async ({
        isMobile,
        page,
    }) => {
        await openFocusFixture(page, 1280);
        await focusToggle(page).click();
        await page.getByLabel(/^Choose plant\. Current selection:/v).click();
        const option = page
            .getByRole("listbox", { name: "Matching plants" })
            .getByRole("option")
            .filter({ hasText: "P02" });
        await page.mouse.move(0, 0);
        await expectFaded(option, true);
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await expect.soft(option).toBeFocused();
        await expectFaded(option, false);
        await page.keyboard.press("Enter");
        await expect
            .soft(page.getByLabel(/^Choose plant\. Current selection:/v))
            .toContainText("P02");
        await page.getByLabel(/^Choose plant\. Current selection:/v).click();
        await page.mouse.move(0, 0);
        await expectFaded(option, true);
        await option.click();
        await chooseMode(page, "Table");
        const recent = plant(picker(page), "P08");
        await expectPointerSelection(page, recent, isMobile);
        await expectDesktopHover(page, recent, isMobile);
        await focusToggle(page).focus();
        await page.mouse.move(0, 0);
        await expectFaded(recent, true);
        await expectKeyboardReveal(page, recent);
    });

    for (const mode of [
        "Labels",
        "List",
        "Table",
    ] as const) {
        test(`selected recent plants in bulk ${mode} fade after pointer use and reveal for keyboard focus`, async ({
            isMobile,
            page,
        }) => {
            await openFocusFixture(page);
            const originalQueue = await queueBytes(page);
            await switchToBulk(page);
            await chooseMode(page, mode);
            await focusToggle(page).click();
            const list = picker(page, true);
            const control = bulkControl(list, mode);
            await expectPointerSelection(
                page,
                control,
                isMobile,
                mode === "List"
            );
            await expectDesktopHover(page, control, isMobile);
            await expectKeyboardReveal(page, control);
            expect.soft(await queueBytes(page)).toBe(originalQueue);
        });
    }

    test("refresh retains confirmed focus while failure and offline reveal plants and suspend bulk auto-selection", async ({
        context,
        page,
    }) => {
        await openFocusFixture(page);
        await switchToBulk(page);
        await chooseMode(page, "Table");
        await focusToggle(page).click();
        const recent = plant(picker(page, true), "P02");
        await expectFaded(recent, true);
        await refresh(page);
        await expectFaded(recent, true);
        const select = page.getByRole("button", {
            exact: true,
            name: "Select highlighted",
        });
        await expect.soft(select).toBeDisabled();
        await chooseMode(page, "Labels");
        await expectFaded(recent, true);
        await recent.click();
        await expect.soft(recent).toHaveAttribute(pressedAttribute, "true");
        await finishRefresh(page, true);
        await expectBulkSuspended(page);
        await refresh(page);
        await finishRefresh(page);
        await expect.soft(select).toBeEnabled();
        await expect.soft(recent).toHaveAttribute(pressedAttribute, "true");
        await context.setOffline(true);
        await expectBulkSuspended(page);
        await context.setOffline(false);
        await expectBulkSuspended(page);
        await refresh(page);
        await finishRefresh(page);
        await expect.soft(select).toBeEnabled();
    });

    test("cached and older bootstrap data never fade plants as if their ages were confirmed", async ({
        page,
    }) => {
        await openFocusFixture(page);
        await chooseMode(page, "Table");
        await focusToggle(page).click();
        await expectFaded(plant(picker(page), "P02"), true);
        await page.evaluate(() => {
            document.defaultView?.sessionStorage.setItem(
                "focusFixtureHoldBootstrap",
                "true"
            );
        });
        await page.reload();
        await expect
            .soft(
                page.getByText("Using saved plant list · refreshing Google…", {
                    exact: true,
                })
            )
            .toBeVisible();
        await expectFaded(plant(picker(page), "P02"), false);
        await finishRefresh(page);
        await expectFaded(plant(picker(page), "P02"), true);
        await switchToBulk(page);
        await expect
            .soft(focusToggle(page))
            .toHaveAttribute(pressedAttribute, "true");
    });

    test("unavailable watering dates retain the enabled preference but disable bulk auto-selection", async ({
        page,
    }) => {
        await openFocusFixture(page, 390, "light", focusFixture(false));
        await switchToBulk(page);
        await chooseMode(page, "Table");
        await focusToggle(page).click();
        await expectFaded(plant(picker(page, true), "P02"), false);
        await expect
            .soft(
                page.getByRole("button", {
                    exact: true,
                    name: "Select highlighted",
                })
            )
            .toBeDisabled();
        await page.reload();
        await expect
            .soft(focusToggle(page))
            .toHaveAttribute(pressedAttribute, "true");
        await chooseMode(page, "Table");
        await expectFaded(plant(picker(page), "P02"), false);
    });

    test("midnight advances watering focus while saved-today badges keep the four-hour care day", async ({
        page,
    }) => {
        const start = "2026-09-10T03:59:30Z";
        const html = focusFixture()
            .replaceAll(fixtureTime, () => start)
            .replace('"2026-09-08"', '"2026-09-09"');
        await page.clock.install({ time: start });
        await openFocusFixture(page, 390, "light", html, false);
        await page.clock.pauseAt("2026-09-10T03:59:40Z");
        await switchToBulk(page);
        await chooseMode(page, "Table");
        await setFocusDays(page, "1");
        await focusToggle(page).click();
        await expectFaded(plant(picker(page, true), "P02"), true);
        await page.clock.runFor(60_000);
        await expectFaded(plant(picker(page, true), "P02"), false);
        await expect
            .soft(
                picker(page, true).getByRole("img", {
                    exact: true,
                    name: savedBadgeName,
                })
            )
            .toHaveCount(2);
    });

    test("the minute clock removes bulk saved-today badges at four a.m. without clearing queued markers", async ({
        page,
    }) => {
        const start = "2026-09-10T07:59:30Z";
        await page.clock.install({ time: start });
        await openFocusFixture(
            page,
            390,
            "light",
            focusFixture().replaceAll(fixtureTime, () => start),
            false
        );
        await page.clock.pauseAt("2026-09-10T07:59:40Z");
        await switchToBulk(page);
        await chooseMode(page, "Table");
        const list = picker(page, true);
        await expectBulkBadgeCounts(list);
        await page.clock.runFor(60_000);
        await expect
            .soft(list.getByRole("img", { exact: true, name: savedBadgeName }))
            .toHaveCount(0);
        await expect
            .soft(list.getByRole("img", { exact: true, name: queuedBadgeName }))
            .toHaveCount(2);
        await expect
            .soft(plant(list, "P38"))
            .not.toHaveAccessibleName(/Weighed today/v);
    });
});
