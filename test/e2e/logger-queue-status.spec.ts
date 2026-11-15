import {
    type BrowserContext,
    expect,
    type Locator,
    type Page,
    test,
} from "@playwright/test";

// eslint-disable-next-line import-x/extensions -- The fixture loads maintained logger HTML with a local service bridge.
import { loggerBrowserFixture } from "../helpers/logger-browser-fixture.mjs";

const queueStorageKey = "gardenLoggerObservationQueueV1";
const fixtureTime = "2026-09-09T14:00:00Z";
const queuedLabel = "Queued on this phone";
const queuedBadgeLabel =
    "Observations queued on this phone; not yet saved to Google";
const plantIdPatterns = {
    P02: /, P02(?:,|$)/v,
    P03: /, P03(?:,|$)/v,
    P04: /, P04(?:,|$)/v,
    P05: /, P05(?:,|$)/v,
};
const queuedEntry = (
    requestId: string,
    plantId: string,
    events: readonly string[],
    weight = ""
) => ({
    addedAt: fixtureTime,
    payload: {
        events,
        observedAt: fixtureTime,
        plantId,
        potSetup: "1",
        weight,
    },
    requestId,
});
const firstWater = queuedEntry("queue-status-water-first", "P02", ["Water"]);
const secondWater = queuedEntry("queue-status-water-second", "P02", ["Water"]);
const waterQueue = [
    firstWater,
    secondWater,
    queuedEntry("queue-status-water-third", "P03", ["Water"]),
];
const mixedQueue = [
    ...waterQueue,
    queuedEntry("queue-status-weigh-fourth", "P04", ["Weigh"], "430"),
    queuedEntry(
        "queue-status-combined-third",
        "P03",
        ["Water", "Weigh"],
        "540"
    ),
];

const replaceFixturePart = (
    html: string,
    original: string,
    replacement: string
) => {
    if (!html.includes(original))
        throw new Error("Queue fixture bridge changed");
    return html.replace(original, () => replacement);
};
const controlledQueueFixture = (html: string) =>
    replaceFixturePart(
        replaceFixturePart(
            replaceFixturePart(
                html,
                "saveWebObservationBatch(requests) {",
                "saveWebObservationBatch(requests) { document.documentElement.dataset.fixtureRequests = JSON.stringify(requests);"
            ),
            'window.addEventListener("fixture-confirm-batch", () => success({ results: requests.map((request) => ({ok: true, requestId: request.requestId})) }), {once: true});',
            'window.addEventListener("fixture-confirm-batch", (event) => success(event.detail), {once: true});'
        ),
        'getWebBatchSaveStatus(requests) { success(requests.map((request) => ({requestId: typeof request === "string" ? request : request.requestId, state: "missing"}))); },',
        'getWebBatchSaveStatus() { document.documentElement.dataset.fixtureCheckingStatus = "true"; window.addEventListener("fixture-confirm-status", (event) => success(event.detail), {once: true}); },'
    );

const openQueueFixture = async (
    context: Readonly<BrowserContext>,
    page: Readonly<Page>,
    entries = waterQueue,
    hasControlledBatch = false
) => {
    const seeded = loggerBrowserFixture({
        holdBatch: true,
        preserveQueue: true,
    });
    // Seed this scenario once; shared-fixture initialization must never repair a lost queue on reload.
    const unseeded = replaceFixturePart(
        seeded,
        'if (!true || !localStorage.getItem("gardenLoggerObservationQueueV1"))',
        "if (false)"
    );
    const html = hasControlledBatch
        ? controlledQueueFixture(unseeded)
        : unseeded;
    await context.addInitScript(
        ({ key, queue }) => {
            const storage = document.defaultView?.localStorage;
            const session = document.defaultView?.sessionStorage;
            if (session?.getItem("queueStatusFixtureInitialized") === "true")
                return;
            storage?.setItem(key, JSON.stringify(queue));
            session?.setItem("queueStatusFixtureInitialized", "true");
        },
        { key: queueStorageKey, queue: entries }
    );
    await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/Gardening/logger-fixture")
            await route.fulfill({ body: html, contentType: "text/html" });
        else await route.abort();
    });
    await page.clock.setFixedTime(fixtureTime);
    await page.goto("/Gardening/logger-fixture");
    await expect
        .soft(
            page.getByText("Connected · Logger browser-fixture", {
                exact: true,
            })
        )
        .toBeVisible();
};

const queueIdentity = async (page: Readonly<Page>) =>
    page.evaluate((key) => {
        const entries: unknown = JSON.parse(
            document.defaultView?.localStorage.getItem(key) ?? "null"
        );
        if (!Array.isArray(entries))
            throw new Error("Queue storage must remain an array");
        return entries.map((entry: unknown) => {
            if (
                entry === null ||
                typeof entry !== "object" ||
                !("requestId" in entry) ||
                !("payload" in entry)
            )
                throw new Error("Malformed queue entry");
            return { payload: entry.payload, requestId: entry.requestId };
        });
    }, queueStorageKey);
const expectedIdentity = (
    entries: readonly {
        readonly payload: unknown;
        readonly requestId: string;
    }[]
) => entries.map(({ payload, requestId }) => ({ payload, requestId }));
const pickerPlant = (
    picker: Readonly<Locator>,
    id: keyof typeof plantIdPatterns
) => picker.getByRole("button", { name: plantIdPatterns[id] });
const singlePicker = (page: Readonly<Page>) =>
    page.getByRole("group", { name: "Choose plant by pot label" });

const expectQueuedPlantState = async (
    page: Readonly<Page>,
    id: keyof typeof plantIdPatterns,
    isQueued: boolean,
    hasQueuedWeight = false
) => {
    const plant = pickerPlant(singlePicker(page), id);
    await expect
        .soft(plant.getByRole("img", { name: queuedBadgeLabel }))
        .toHaveCount(isQueued ? 1 : 0);
    await expect
        .soft(plant)
        .toHaveAttribute("data-queued-weighed", String(hasQueuedWeight));
};

const expectQueueCounts = async (
    page: Readonly<Page>,
    count: number,
    plants: number,
    weights = 0
) => {
    const observation = count === 1 ? "observation" : "observations";
    const plant = plants === 1 ? "plant" : "plants";
    const weightSummary = weights
        ? ` Weights queued for ${weights} of 39 plants.`
        : "";
    await expect
        .soft(page.getByText(`${count} queued ${observation}`, { exact: true }))
        .toBeVisible();
    if (!count) {
        await expect
            .soft(
                page.getByRole("heading", {
                    name: "Observations waiting to send",
                })
            )
            .toBeHidden();
        return;
    }
    await expect
        .soft(
            page.getByLabel(`${count} queued ${observation}`, { exact: true })
        )
        .toHaveText(String(count));
    await expect
        .soft(
            page.getByRole("button", {
                exact: true,
                name: `Send ${count} queued`,
            })
        )
        .toBeVisible();
    await expect
        .soft(
            page
                .getByRole("status")
                .filter({ hasText: "safely queued on this phone." })
        )
        .toHaveText(
            `${count} ${observation} for ${plants} ${plant} safely queued on this phone.${weightSummary}`
        );
};

const expectSelectedQueueState = async (page: Readonly<Page>) => {
    const selected = page.getByRole("region", {
        exact: true,
        name: "Selected plant",
    });
    await expect.soft(selected).toContainText(queuedLabel);
    await expect.soft(selected).not.toContainText("Weighed today");
};
const expectWaterOnlyPicker = async (
    page: Readonly<Page>,
    mode:
        | "Labels"
        | "List"
        | "Table"
) => {
    await page.getByRole("button", { exact: true, name: mode }).click();
    if (mode === "List") {
        await page.getByLabel(/^Choose plant\. Current selection:/v).click();
        const option = page
            .getByRole("listbox", { name: "Matching plants" })
            .getByRole("option")
            .filter({ hasText: "P02" });
        await expect.soft(option).toContainText(queuedLabel);
        await option.click();
        await expect
            .soft(page.getByLabel(/^Choose plant\. Current selection:/v))
            .toContainText(queuedLabel);
    } else {
        const plant = pickerPlant(singlePicker(page), "P02");
        await expect
            .soft(plant)
            .toHaveAccessibleName(new RegExp(queuedLabel, "v"));
        await expect
            .soft(plant.getByRole("img", { name: queuedBadgeLabel }))
            .toBeVisible();
        await expect
            .soft(plant)
            .toHaveAttribute("data-queued-weighed", "false");
        await plant.click();
    }
    await expectSelectedQueueState(page);
};

const expectBulkRosterUnfiltered = async (page: Readonly<Page>) => {
    await page.getByRole("tab", { exact: true, name: "Bulk care" }).click();
    await page.getByRole("button", { exact: true, name: "Table" }).click();
    const bulk = page.getByRole("group", {
        name: "Choose plants for bulk care",
    });
    await expect.soft(bulk.getByRole("button")).toHaveCount(39);
    await expect.soft(pickerPlant(bulk, "P02")).toBeVisible();
    await page.getByRole("tab", { exact: true, name: "Single plant" }).click();
};

const expectWeightOnlyFilter = async (
    page: Readonly<Page>,
    hasQueuedWeights = false
) => {
    await page.getByRole("button", { exact: true, name: "Table" }).click();
    await page
        .getByRole("button", { exact: true, name: "Not weighed today" })
        .click();
    await expect.soft(pickerPlant(singlePicker(page), "P02")).toBeVisible();
    await expect.soft(pickerPlant(singlePicker(page), "P05")).toBeHidden();
    if (hasQueuedWeights)
        await expect.soft(pickerPlant(singlePicker(page), "P04")).toBeHidden();
    else
        await expect.soft(pickerPlant(singlePicker(page), "P03")).toBeVisible();
    await expectBulkRosterUnfiltered(page);
    await page
        .getByRole("button", { exact: true, name: "Not weighed today" })
        .click();
};
const removeQueuedRequest = async (page: Readonly<Page>, requestId: string) => {
    const buttons = await page
        .getByRole("button", { name: /^Remove .* from queue$/v })
        .all();
    const identified = await Promise.all(
        buttons.map(async (button) => ({
            button,
            requestId: await button.getAttribute("data-remove-queue"),
        }))
    );
    const target = identified.find(
        (item) => item.requestId === requestId
    )?.button;
    if (!target)
        throw new Error(`Queued request ${requestId} has no removal control`);
    await target.click();
};
const clearQueue = async (page: Readonly<Page>) => {
    const confirmation = page.waitForEvent("dialog");
    const click = page
        .getByRole("button", { exact: true, name: "Clear queue" })
        .click();
    const dialog = await confirmation;
    await dialog.accept();
    await click;
};

const confirmPartialBatch = async (page: Readonly<Page>) => {
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.dataset["fixtureBatch"]
            )
        )
        .toBe("1");
    await page.evaluate(
        (requestId) =>
            dispatchEvent(
                new CustomEvent("fixture-confirm-batch", {
                    detail: { results: [{ ok: true, requestId }] },
                })
            ),
        firstWater.requestId
    );
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.dataset["fixtureCheckingStatus"]
            )
        )
        .toBe("true");
    await page.evaluate(
        (requests) =>
            dispatchEvent(
                new CustomEvent("fixture-confirm-status", {
                    detail: requests.map((entry, index) => ({
                        requestId: entry.requestId,
                        state: index === 0 ? "saved" : "missing",
                    })),
                })
            ),
        waterQueue
    );
    await expect
        .soft(page.getByText("2 queued observations", { exact: true }))
        .toBeVisible();
    await expect
        .soft(
            page
                .getByRole("status")
                .filter({ hasText: "1 confirmed · 2 remaining" })
        )
        .toBeVisible();
    expect
        .soft(await queueIdentity(page))
        .toStrictEqual(expectedIdentity(waterQueue.slice(1)));
};
const confirmRetriedBatch = async (page: Readonly<Page>) => {
    await page.clock.fastForward(2000);
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.dataset["fixtureBatch"]
            )
        )
        .toBe("2");
    const sent: unknown = JSON.parse(
        await page.evaluate(
            () => document.documentElement.dataset["fixtureRequests"] ?? "null"
        )
    );
    expect
        .soft(sent)
        .toStrictEqual(
            waterQueue
                .slice(1)
                .map(({ payload, requestId }) => ({ ...payload, requestId }))
        );
    await page.evaluate(
        (requests) =>
            dispatchEvent(
                new CustomEvent("fixture-confirm-batch", {
                    detail: {
                        results: requests.map((entry) => ({
                            ok: true,
                            requestId: entry.requestId,
                        })),
                    },
                })
            ),
        waterQueue.slice(1)
    );
    await expectQueueCounts(page, 0, 0);
    expect.soft(await queueIdentity(page)).toStrictEqual([]);
};

test.describe("logger queue status", { tag: "@logger" }, () => {
    for (const theme of ["dark", "light"] as const) {
        for (const width of [390, 1280]) {
            test(`${width}px ${theme} counts Water-only requests in every picker mode without claiming weights`, async ({
                context,
                page,
            }, testInfo) => {
                await page.setViewportSize({ height: 900, width });
                await page.emulateMedia({ colorScheme: theme });
                await openQueueFixture(context, page);
                await expectQueueCounts(page, 3, 2);
                await expectWaterOnlyPicker(page, "List");
                await expectWaterOnlyPicker(page, "Labels");
                await expectWaterOnlyPicker(page, "Table");
                await expectWeightOnlyFilter(page);
                expect
                    .soft(await queueIdentity(page))
                    .toStrictEqual(expectedIdentity(waterQueue));
                await page.reload();
                await expectQueueCounts(page, 3, 2);
                expect
                    .soft(await queueIdentity(page))
                    .toStrictEqual(expectedIdentity(waterQueue));
                expect
                    .soft(
                        await page.evaluate(
                            () =>
                                document.documentElement.scrollWidth <=
                                innerWidth
                        )
                    )
                    .toBe(true);
                await page.screenshot({
                    fullPage: true,
                    path: testInfo.outputPath("water-only-queue.png"),
                });
            });
        }
    }

    test("mixed queues update distinct-plant and weight counts after duplicate removal and clear", async ({
        context,
        page,
    }) => {
        await openQueueFixture(context, page, mixedQueue);
        await expectQueueCounts(page, 5, 3, 2);
        await expectWeightOnlyFilter(page, true);
        await expectQueuedPlantState(page, "P02", true);
        await expectQueuedPlantState(page, "P03", true, true);
        await expectQueuedPlantState(page, "P04", true, true);
        await removeQueuedRequest(page, firstWater.requestId);
        await expectQueueCounts(page, 4, 3, 2);
        await expectQueuedPlantState(page, "P02", true);
        expect
            .soft(await queueIdentity(page))
            .toStrictEqual(expectedIdentity(mixedQueue.slice(1)));
        await removeQueuedRequest(page, "queue-status-weigh-fourth");
        await expectQueueCounts(page, 3, 2, 1);
        await expectQueuedPlantState(page, "P04", false);
        await removeQueuedRequest(page, "queue-status-combined-third");
        await expectQueueCounts(page, 2, 2);
        await expectQueuedPlantState(page, "P03", true);
        await removeQueuedRequest(page, "queue-status-water-third");
        await expectQueueCounts(page, 1, 1);
        expect
            .soft(await queueIdentity(page))
            .toStrictEqual(expectedIdentity([secondWater]));
        await clearQueue(page);
        await expectQueueCounts(page, 0, 0);
        await expectQueuedPlantState(page, "P02", false);
        expect.soft(await queueIdentity(page)).toStrictEqual([]);
        await page.reload();
        await expectQueueCounts(page, 0, 0);
        expect.soft(await queueIdentity(page)).toStrictEqual([]);
    });

    test("partial confirmation counts only retained requests and automatic retry preserves their payloads", async ({
        context,
        page,
    }) => {
        await page.clock.install({ time: fixtureTime });
        await openQueueFixture(context, page, waterQueue, true);
        await page.clock.pauseAt("2026-09-09T14:00:01Z");
        await expectQueueCounts(page, 3, 2);
        await page
            .getByRole("button", { exact: true, name: "Send 3 queued" })
            .click();
        await confirmPartialBatch(page);
        await confirmRetriedBatch(page);
        expect.soft(await queueIdentity(page)).toStrictEqual([]);
    });
});
