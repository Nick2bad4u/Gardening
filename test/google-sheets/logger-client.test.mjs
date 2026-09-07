import {
    DOMRect,
    Element,
    EventTarget,
    HTMLAnchorElement,
    HTMLButtonElement,
    HTMLDetailsElement,
    HTMLDialogElement,
    HTMLElement,
    HTMLFormElement,
    HTMLImageElement,
    HTMLInputElement,
    HTMLOptionElement,
    HTMLSelectElement,
    HTMLTextAreaElement,
    IntersectionObserver,
    IntersectionObserverEntry,
    Window,
} from "happy-dom";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { comparePlantsByNaturalLabel } from "../../docs/layouts/plant-tracker-data.js";
import { queryElement, queryElements, required } from "../helpers/required.mjs";
import {
    jsonRecord,
    parseStoredJson,
    parseStoredQueue,
    parseStoredRecord,
} from "../helpers/stored-json.mjs";

const html = fs.readFileSync(
    new URL("../../scripts/google-sheets/Index.html", import.meta.url),
    "utf8"
);
const scripts = Array.from(
    html.matchAll(/<script>(?<source>[\s\S]*?)<\/script>/gv)
);
const scriptSource = required(scripts.at(-1)?.groups?.["source"]);
const portraitRevision = required(
    /const PLANT_ICON_REVISION = "(?<revision>[0-9a-f]+)";/v.exec(html)
        ?.groups?.["revision"]
);

/** @type {Set<Window>} */
const loggerWindows = new Set();
/** @type {Map<ReturnType<typeof setTimeout>, typeof clearTimeout>} */
const loggerTimers = new Map();

/**
 * @param {Parameters<typeof setTimeout>[0]} callback
 * @param {number} [delay]
 * @param {unknown[]} args
 */
function trackedLoggerTimeout(callback, delay, ...args) {
    const timer = setTimeout(callback, delay, ...args);
    loggerTimers.set(timer, clearTimeout);
    return timer;
}

/** @type {import("../logger-fixtures.d.ts").Bootstrap} */
const bootstrap = {
    events: [
        "Water",
        "Weigh",
        "Measure",
        "Check",
        "Rotation",
        "Clean",
        "Prune",
        "Repot",
        "Flower",
        "Photo",
        "Pest",
        "Other",
    ],
    links: {
        calendar: "https://example.test/calendar",
        fieldGuide: "https://example.test/guide",
        layout: "https://example.test/layout",
        photos: "https://example.test/photos",
        quickLog: "https://example.test/quick",
        spreadsheet: "https://example.test/sheet",
        tracker: "https://example.test/tracker",
    },
    plants: [
        {
            currentPotSize: "4 in",
            daysSinceWater: 15,
            dryOrLowestWeight: 398,
            dryOrLowestWeightBasis: "Completed cycle",
            dryOrLowestWeightDate: "Aug 10, 2026",
            fieldGuideUrl:
                "https://example.test/guide#gymnocalycium-mihanovichii-variegated",
            historyUrl: "https://example.test/history?id=P01",
            id: "P01",
            label: "A1",
            lastWatered: "Jul 31, 2026",
            latestWeight: 420,
            name: "Moon cactus",
            potSetup: 2,
            scientificName: "Gymnocalycium mihanovichii",
        },
        {
            currentPotSize: "4 in",
            daysSinceWater: 1,
            dryOrLowestWeight: 475,
            dryOrLowestWeightBasis: "Completed cycle",
            dryOrLowestWeightDate: "Aug 2, 2026",
            fieldGuideUrl: "https://example.test/guide#parodia-leninghausii",
            historyUrl: "https://example.test/history?id=P02",
            id: "P02",
            label: "F3",
            lastWatered: "Aug 15, 2026",
            latestWeight: 510,
            name: "Yellow tower cactus",
            potSetup: 2,
            scientificName: "Parodia leninghausii",
        },
    ],
    recent: [],
    serverTime: "2026-08-15T14:00:00.000Z",
    version: "test",
};

const recentExample = {
    event: "Weigh",
    name: "Moon cactus",
    observedAt: "Sep 5, 2026",
    plantId: "P01",
    weight: 430,
    weightState: "Routine",
};

/** @param {Window} window @param {string} id @param {string} value */
function changeWorkflowSelect(window, id, value) {
    const select = queryElement(window.document, `#${id}`, HTMLSelectElement);
    select.value = value;
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
}

/** @param {Window} window @param {string} id @param {string} value */
function enterWorkflowValue(window, id, value) {
    const input = queryElement(window.document, `#${id}`, HTMLInputElement);
    input.value = value;
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

/** @param {Window} window */
function refreshWorkflow(window) {
    queryElement(
        window.document,
        "#refreshDataButton",
        HTMLButtonElement
    ).click();
}

/** @returns {import("../logger-fixtures.d.ts").Bootstrap} */
function workflowBootstrap() {
    return {
        ...bootstrap,
        dayKey: "2026-09-06",
        plants: bootstrap.plants.map((plant) => ({
            ...plant,
            latestWeightAt: "2026-09-05T16:00:00.000Z",
            weightSeries: {
                excludedCount: 1,
                points: [
                    {
                        breakBefore: false,
                        observationId: "first",
                        observedAt: "2026-09-01T16:00:00.000Z",
                        weight: 480,
                    },
                    {
                        breakBefore: false,
                        observationId: "second",
                        observedAt: "2026-09-02T16:00:00.000Z",
                        weight: 460,
                    },
                    {
                        breakBefore: true,
                        observationId: "third",
                        observedAt: "2026-09-03T16:00:00.000Z",
                        weight: 445,
                    },
                    {
                        breakBefore: false,
                        observationId: "fourth",
                        observedAt: "2026-09-05T17:00:00.000Z",
                        weight: 420,
                    },
                ],
                potSetup: 2,
                previousDry: {
                    observedAt: "2026-08-31T16:00:00.000Z",
                    weight: 400,
                },
                setupStartedAt: "2026-08-14T16:00:00.000Z",
                startedAt: "2026-09-01T16:00:00.000Z",
                startKind: "Water",
                waterings: [
                    {
                        application: "Thorough",
                        observedAt: "2026-09-01T16:00:00.000Z",
                    },
                ],
            },
        })),
        serverTime: "2026-09-06T16:00:00.000Z",
        timeZone: "America/New_York",
        weighedTodayPlantIds: ["P01"],
    };
}

describe("garden logger daily progress, filtered History and measured charts", () => {
    afterEach(restoreLoggerMocks);

    it("shows independent saved and queued markers, keeps the selected completed plant accessible, and reuses portraits", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-06T16:05:00Z"));
        const { window } = createLoggerWindow({
            bootstrapData: workflowBootstrap(),
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify([
                    queuedWeight(),
                    queuedWeight({
                        plantId: "P02",
                        requestId: "garden-second-queued-12345",
                    }),
                ]),
                gardenLoggerPlantPickerModeV1: "labels",
            },
        });
        const first = queryElement(
            window.document,
            '#labelPicker [data-plant-id="P01"]',
            HTMLButtonElement
        );
        const portrait = required(first.querySelector(".plant-choice-icon"));

        expect(first.dataset["savedToday"]).toBe("true");
        expect(first.dataset["queuedWeighed"]).toBe("true");
        expect(first.getAttribute("aria-label")).toContain(
            "Queued · Saved today"
        );
        expect(
            queryElement(window.document, "#roundProgress", HTMLElement)
                .textContent
        ).toContain("1 of 2 Saved today · 2 Queued");

        queryElement(
            window.document,
            "#notWeighedToday",
            HTMLInputElement
        ).click();

        expect(
            queryElement(window.document, "#plantFilterStatus", HTMLElement)
                .textContent
        ).toContain("No remaining plants");
        expect(first.hidden).toBe(false);
        expect(
            queryElement(
                window.document,
                '#labelPicker [data-plant-id="P02"]',
                HTMLButtonElement
            ).hidden
        ).toBe(true);
        expect(
            queryElement(window.document, "#plantSelect", HTMLSelectElement)
                .value
        ).toBe("P01");

        queryElement(
            window.document,
            "#notWeighedToday",
            HTMLInputElement
        ).click();

        expect(first.querySelector(".plant-choice-icon")).toBe(portrait);
        expect(
            queryElement(
                window.document,
                '#labelPicker [data-plant-id="P02"]',
                HTMLButtonElement
            ).hidden
        ).toBe(false);
    });

    it("expires previous-day saved markers at workbook midnight while offline and preserves queued weights and pot setup", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-07T03:59:30Z"));
        const { window } = createLoggerWindow({
            bootstrapData: workflowBootstrap(),
            online: false,
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify([
                    queuedWeight(),
                ]),
                gardenLoggerPlantPickerModeV1: "labels",
            },
        });
        enterWorkflowValue(window, "potSetup", "7");
        enterWorkflowValue(window, "weight", "419.5");
        queryElement(
            window.document,
            "#notWeighedToday",
            HTMLInputElement
        ).click();
        vi.advanceTimersByTime(60_000);

        expect(
            queryElement(window.document, "#roundProgress", HTMLElement)
                .textContent
        ).toContain("Saved today unavailable");

        const button = queryElement(
            window.document,
            '#labelPicker [data-plant-id="P01"]',
            HTMLButtonElement
        );

        expect(button.dataset["savedToday"]).toBe("false");
        expect(button.dataset["queuedWeighed"]).toBe("true");
        expect(
            queryElement(window.document, "#potSetup", HTMLInputElement).value
        ).toBe("7");
        expect(
            queryElement(window.document, "#weight", HTMLInputElement).value
        ).toBe("419.5");
    });

    it("restores History-backed progress from the bootstrap cache without inventing absent fields", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-06T16:05:00Z"));
        const current = createLoggerWindow({
            online: false,
            storage: {
                gardenLoggerBootstrapV2: JSON.stringify({
                    bootstrap: workflowBootstrap(),
                    savedAt: Date.now(),
                }),
            },
        });

        expect(
            queryElement(current.window.document, "#roundProgress", HTMLElement)
                .textContent
        ).toContain("1 of 2 Saved today");

        const old = { ...bootstrap, serverTime: "" };
        const legacy = createLoggerWindow({
            online: false,
            storage: {
                gardenLoggerBootstrapV2: JSON.stringify({
                    bootstrap: old,
                    savedAt: Date.now(),
                }),
            },
        });

        expect(
            queryElement(legacy.window.document, "#roundProgress", HTMLElement)
                .textContent
        ).toContain("Saved today unavailable");
        expect(
            queryElement(legacy.window.document, "#dataFreshness", HTMLElement)
                .textContent
        ).toBe("Updated from Google: time unavailable");
        expect(
            queryElement(legacy.window.document, ".weight-chart", HTMLElement)
                .textContent
        ).toContain("chart data unavailable");
    });

    it.each(["single", "queue"])(
        "updates saved-today progress after a confirmed %s send and persists it for reload",
        (mode) => {
            expect.hasAssertions();

            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-09-06T16:05:00Z"));
            const initial = {
                ...workflowBootstrap(),
                weighedTodayPlantIds: [],
            };
            const { behaviors, window } = createLoggerWindow({
                bootstrapData: initial,
                storage:
                    mode === "queue"
                        ? {
                              gardenLoggerObservationQueueV1: JSON.stringify([
                                  queuedWeight(),
                              ]),
                          }
                        : {},
            });
            behaviors.getWebAppBootstrap = ({ success }) => {
                success(workflowBootstrap());
            };
            behaviors.saveWebObservation = ({ success }) => {
                success({ message: "Saved" });
            };
            behaviors.saveWebObservationBatch = ({ args, success }) => {
                success({
                    failedCount: 0,
                    ok: true,
                    results: args[0].map(({ requestId }) => ({
                        ok: true,
                        requestId,
                    })),
                    savedCount: args[0].length,
                });
            };
            confirmSummarySave(window, mode);

            expect(
                queryElement(window.document, "#roundProgress", HTMLElement)
                    .textContent
            ).toContain("1 of 2 Saved today · 0 Queued");

            const reload = createLoggerWindow({
                online: false,
                storage: {
                    gardenLoggerBootstrapV2: required(
                        window.localStorage.getItem("gardenLoggerBootstrapV2")
                    ),
                },
            });

            expect(
                queryElement(
                    reload.window.document,
                    "#roundProgress",
                    HTMLElement
                ).textContent
            ).toContain("1 of 2 Saved today");
        }
    );

    it("does not invent saved-today progress when the successful-send refresh fails", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-06T16:05:00Z"));
        const { behaviors, window } = createLoggerWindow({
            bootstrapData: { ...workflowBootstrap(), weighedTodayPlantIds: [] },
        });
        behaviors.saveWebObservation = ({ success }) => {
            success({ message: "Saved" });
        };
        behaviors.getWebAppBootstrap = ({ failure }) => {
            failure(new Error("Read failed"));
        };
        confirmSummarySave(window, "single");

        expect(
            queryElement(window.document, "#roundProgress", HTMLElement)
                .textContent
        ).toContain("0 of 2 Saved today");
        expect(
            queryElement(window.document, "#dataFreshness", HTMLElement)
                .textContent
        ).toContain("5 min ago");
    });

    it("filters History before the server limit and ignores old callbacks after event and plant changes", () => {
        expect.hasAssertions();

        const { behaviors, calls, window } = createLoggerWindow({
            bootstrapData: { ...bootstrap, recent: [recentExample] },
        });
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getRecentWebObservations">[]} */
        const pending = [];
        behaviors.getRecentWebObservations = (handlers) => {
            pending.push(handlers);
        };
        changeWorkflowSelect(window, "recentScope", "plant");
        changeWorkflowSelect(window, "recentEvent", "Water");
        changeWorkflowSelect(window, "plantSelect", "P02");

        expect(
            structuredClone(
                calls
                    .filter(
                        ({ method }) => method === "getRecentWebObservations"
                    )
                    .map(({ args }) => args)
            )
        ).toStrictEqual([
            [10, { event: "", plantId: "P01" }],
            [10, { event: "Water", plantId: "P01" }],
            [10, { event: "Water", plantId: "P02" }],
        ]);

        const list = queryElement(window.document, "#recentList", HTMLElement);

        expect(list.children).toHaveLength(0);

        required(pending[2]).success([
            {
                ...recentExample,
                event: "Water",
                name: "Newest plant",
                plantId: "P02",
                weight: "",
            },
        ]);
        required(pending[0]).success([recentExample]);
        required(pending[1]).failure(new Error("Old failure"));

        expect(list.textContent).toContain("Newest plant");
        expect(list.textContent).not.toContain("Moon cactus");
        expect(
            queryElement(window.document, "#recentStatus", HTMLElement)
                .textContent
        ).toBe("Showing 1 recent entry.");
    });

    it("keeps every History filter visible on initial empty, filtered empty, offline, and no-selected-plant states", () => {
        expect.hasAssertions();

        const { calls, window } = createLoggerWindow();

        expect(
            queryElement(window.document, "#recentCard", HTMLElement).hidden
        ).toBe(false);
        expect(
            queryElements(
                window.document,
                "#recentEvent option",
                HTMLOptionElement
            ).map((option) => option.value)
        ).toStrictEqual(["", ...bootstrap.events]);

        changeWorkflowSelect(window, "recentEvent", "Repot");

        expect(
            queryElement(window.document, "#recentStatus", HTMLElement)
                .textContent
        ).toBe("No History entries match these filters.");

        enterWorkflowValue(window, "plantSearch", "no such plant");
        const count = calls.length;
        changeWorkflowSelect(window, "recentScope", "plant");

        expect(calls).toHaveLength(count);
        expect(
            queryElement(window.document, "#recentStatus", HTMLElement)
                .textContent
        ).toBe("Choose a plant to view its History.");
        expect(
            queryElement(window.document, "#recentEvent", HTMLSelectElement)
                .disabled
        ).toBe(false);
        expect(
            queryElement(window.document, "#recentScope", HTMLSelectElement)
                .disabled
        ).toBe(false);

        Object.defineProperty(window.navigator, "onLine", {
            configurable: true,
            value: false,
        });
        changeWorkflowSelect(window, "recentScope", "all");

        expect(
            queryElement(window.document, "#recentStatus", HTMLElement)
                .textContent
        ).toContain("Offline");
        expect(
            queryElement(window.document, "#recentCard", HTMLElement).hidden
        ).toBe(false);
    });

    it("expands escaped event details with original measurement units and preserves the correction observation ID", () => {
        expect.hasAssertions();

        const { behaviors, window } = createLoggerWindow();
        /** @type {import("../logger-workflow-fixtures.d.ts").WebRecentObservation} */
        const entry = {
            ...recentExample,
            details: {
                height: 2.5,
                heightCm: 6.35,
                measurementMethod: "Ruler",
                measurementUnit: "in",
                notes: "<img src=x onerror=alert(1)>\nsecond line",
                observationQuality: "Measured",
                potSetup: 2,
                width: 1.25,
            },
            event: "Measure",
            observationId: "observation-correct-later",
            observedAtIso: "2026-09-05T16:00:00Z",
            weight: "",
        };
        behaviors.getRecentWebObservations = ({ success }) => {
            success([entry]);
        };
        changeWorkflowSelect(window, "recentEvent", "Measure");
        const item = queryElement(window.document, ".recent-item", HTMLElement);

        expect(item.dataset["observationId"]).toBe("observation-correct-later");

        const details = queryElement(
            item,
            ".history-details",
            HTMLDetailsElement
        );

        expect(details.open).toBe(false);

        queryElement(details, "summary", HTMLElement).click();

        expect(details.open).toBe(true);
        expect(details.textContent).toContain("2.5");
        expect(details.textContent).toContain("Original measurement unitin");
        expect(details.textContent).toContain(
            "<img src=x onerror=alert(1)>\nsecond line"
        );
        expect(details.querySelector("img")).toBeNull();
        expect(details.textContent).toContain("Ruler");
    });

    it("uses measured dots, gram labels, water markers and a dry reference without bridging excluded or long gaps", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: workflowBootstrap(),
        });
        const chart = queryElement(
            window.document,
            ".weight-chart",
            HTMLElement
        );

        expect(chart.querySelectorAll(".chart-point")).toHaveLength(4);
        expect(chart.querySelectorAll(".chart-segment")).toHaveLength(1);
        expect(chart.querySelectorAll(".chart-watering")).toHaveLength(1);
        expect(chart.querySelectorAll(".chart-dry")).toHaveLength(1);
        expect(chart.textContent).toContain("Setup 2");

        const readings = queryElement(
            chart,
            ".chart-readings",
            HTMLDetailsElement
        );

        expect(readings.open).toBe(false);
        expect(readings.textContent).toContain("Aug 14, 2026");
        expect(readings.textContent).toContain("400 g");
        expect(readings.textContent).toContain("48 hours");
        expect(readings.textContent).toContain("1 reading excluded.");
        expect(readings.textContent).toContain("Thorough");
        expect(
            [...chart.children]
                .filter((child) => child.tagName === "P")
                .map((child) => child.textContent)
                .join(" ")
        ).not.toMatch(/48 hours|readings excluded|setup started/v);
        expect(
            queryElement(chart, "svg", Element).getAttribute("aria-label")
        ).toContain("4 measured weights in grams");
        expect(
            chart.querySelectorAll(":scope .chart-readings li")
        ).toHaveLength(5);
        expect(
            queryElement(
                chart,
                '.chart-point[data-observation-id="fourth"]',
                Element
            ).querySelector("title")?.textContent
        ).toContain("420 g");
    });

    it.each([0, 1])(
        "shows an honest current-cycle state for %s measured points",
        (count) => {
            expect.hasAssertions();

            const data = workflowBootstrap();
            const plant = required(data.plants[0]);
            const series = required(plant.weightSeries);
            plant.weightSeries = {
                ...series,
                excludedCount: 0,
                points: series.points.slice(0, count),
                previousDry: null,
            };
            const { window } = createLoggerWindow({ bootstrapData: data });
            const chart = queryElement(
                window.document,
                ".weight-chart",
                HTMLElement
            );

            expect(chart.textContent).toContain(
                count ? "One measured point" : "No measured weights"
            );
            expect(chart.querySelectorAll(".chart-point")).toHaveLength(count);
            expect(chart.querySelectorAll(".chart-segment")).toHaveLength(0);
            expect(chart.textContent).toContain("No completed dry reference");
            expect(chart.textContent).toContain("Water (W)");
        }
    );

    it("rejects a mismatched-setup series instead of joining old-pot weights", () => {
        expect.hasAssertions();

        const data = workflowBootstrap();
        const plant = required(data.plants[0]);
        plant.weightSeries = { ...required(plant.weightSeries), potSetup: 1 };
        const { window } = createLoggerWindow({ bootstrapData: data });

        expect(
            queryElement(window.document, ".weight-chart", HTMLElement)
                .textContent
        ).toContain("chart data unavailable");
        expect(window.document.querySelector(".chart-point")).toBeNull();
    });

    it("refreshes only read data and preserves every draft control, bulk selection, queue, and an external correction hook", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-06T16:05:00Z"));
        const { behaviors, window } = createLoggerWindow({
            bootstrapData: workflowBootstrap(),
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify([
                    queuedWeight(),
                ]),
            },
        });
        queryElement(
            window.document,
            "#bulkModeTab",
            HTMLButtonElement
        ).click();
        queryElement(
            window.document,
            "#bulkPlantList input",
            HTMLInputElement
        ).click();
        enterWorkflowValue(window, "bulkSearch", "Moon");
        enterWorkflowValue(window, "plantSearch", "Moon");
        enterWorkflowValue(window, "weight", "419.1");
        enterWorkflowValue(window, "height", "2.25");
        enterWorkflowValue(window, "width", "1.5");
        enterWorkflowValue(window, "potSetup", "9");
        enterWorkflowValue(window, "observedAt", "2026-09-05T10:31");
        enterWorkflowValue(window, "bulkObservedAt", "2026-09-04T11:42");
        queryElement(window.document, "#notes", HTMLTextAreaElement).value =
            "  exact draft\nkeep spaces  ";
        queryElement(window.document, "#bulkNotes", HTMLTextAreaElement).value =
            "bulk draft";
        changeWorkflowSelect(window, "recentScope", "plant");
        changeWorkflowSelect(window, "recentEvent", "Water");
        const hook = window.document.createElement("input");
        hook.id = "externalCorrectionDraft";
        hook.value = "pending correction integration";
        window.document.body.append(hook);
        const controls = () =>
            [
                ...queryElements(window.document, "input", HTMLInputElement),
                ...queryElements(window.document, "select", HTMLSelectElement),
                ...queryElements(
                    window.document,
                    "textarea",
                    HTMLTextAreaElement
                ),
            ].map((control) => ({
                checked:
                    control instanceof HTMLInputElement
                        ? control.checked
                        : false,
                disabled: control.disabled,
                id: control.id,
                value: control.value,
            }));
        const before = controls();
        const queue = window.localStorage.getItem(
            "gardenLoggerObservationQueueV1"
        );
        const eventChoices = queryElement(
            window.document,
            "#eventChips",
            HTMLElement
        ).getHTML();
        const bulkChoices = queryElement(
            window.document,
            "#bulkEventChips",
            HTMLElement
        ).getHTML();
        behaviors.getWebAppBootstrap = ({ success }) => {
            success({
                ...workflowBootstrap(),
                plants: workflowBootstrap().plants.map((plant) => ({
                    ...plant,
                    latestWeight: 418,
                    potSetup: 3,
                })),
                serverTime: "2026-09-06T16:05:00Z",
            });
        };
        refreshWorkflow(window);

        expect(controls()).toStrictEqual(before);
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe(queue);
        expect(
            queryElement(window.document, "#eventChips", HTMLElement).getHTML()
        ).toBe(eventChoices);
        expect(
            queryElement(
                window.document,
                "#bulkEventChips",
                HTMLElement
            ).getHTML()
        ).toBe(bulkChoices);
        expect(
            queryElement(window.document, "#bulkWaterForm", HTMLFormElement)
                .hidden
        ).toBe(false);
        expect(
            queryElement(window.document, "#dataFreshness", HTMLElement)
                .textContent
        ).toContain("less than a minute ago");
        expect(
            queryElement(window.document, ".metrics", HTMLElement).textContent
        ).toContain("Sep 5, 2026");
        expect(
            queryElement(
                window.document,
                "#externalCorrectionDraft",
                HTMLInputElement
            )
        ).toBe(hook);
    });

    it.each([
        "single",
        "bulk",
        "queue",
    ])(
        "refresh keeps an active %s save locked with its original draft and retry ID",
        (mode) => {
            expect.hasAssertions();

            const { behaviors, calls, window } = createLoggerWindow({
                bootstrapData: workflowBootstrap(),
                storage:
                    mode === "queue"
                        ? {
                              gardenLoggerObservationQueueV1: JSON.stringify([
                                  queuedWeight(),
                              ]),
                          }
                        : {},
            });
            confirmSummarySave(window, mode);
            const pending = window.localStorage.getItem(
                "gardenLoggerPendingSaveV1"
            );
            const bulk = window.localStorage.getItem(
                "gardenLoggerBulkPendingV1"
            );
            const queue = window.localStorage.getItem(
                "gardenLoggerObservationQueueV1"
            );
            const savingStatus = queryElement(
                window.document,
                "#connectionStatus",
                HTMLElement
            ).textContent;

            expect(
                queryElement(window.document, "#saveButton", HTMLButtonElement)
                    .disabled
            ).toBe(true);
            expect(
                queryElement(
                    window.document,
                    "#refreshDataButton",
                    HTMLButtonElement
                ).disabled
            ).toBe(false);

            behaviors.getWebAppBootstrap = ({ success }) => {
                success(workflowBootstrap());
            };
            refreshWorkflow(window);

            expect(
                window.localStorage.getItem("gardenLoggerPendingSaveV1")
            ).toBe(pending);
            expect(
                window.localStorage.getItem("gardenLoggerBulkPendingV1")
            ).toBe(bulk);
            expect(
                window.localStorage.getItem("gardenLoggerObservationQueueV1")
            ).toBe(queue);
            expect(
                queryElement(window.document, "#saveButton", HTMLButtonElement)
                    .disabled
            ).toBe(true);
            expect(
                queryElement(window.document, "#weight", HTMLInputElement)
                    .disabled
            ).toBe(true);
            expect(
                queryElements(
                    window.document,
                    "#plantChoiceList button",
                    HTMLButtonElement
                ).every((button) => button.disabled)
            ).toBe(true);
            expect(
                queryElement(window.document, "#connectionStatus", HTMLElement)
                    .textContent
            ).toBe(savingStatus);
            expect(
                calls.filter(({ method }) => method.startsWith("save"))
            ).toHaveLength(1);
            expect(
                queryElements(
                    window.document,
                    "#bulkPlantList input",
                    HTMLInputElement
                ).every((input) => input.disabled)
            ).toBe(true);
        }
    );

    it("ignores stale summary and History refreshes and timed-out callbacks without advancing freshness", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-06T16:05:00Z"));
        const { behaviors, window } = createLoggerWindow({
            bootstrapData: workflowBootstrap(),
        });
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getWebAppBootstrap">[]} */
        const summaries = [];
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getRecentWebObservations">[]} */
        const history = [];
        behaviors.getWebAppBootstrap = (handlers) => {
            summaries.push(handlers);
        };
        behaviors.getRecentWebObservations = (handlers) => {
            history.push(handlers);
        };
        refreshWorkflow(window);
        refreshWorkflow(window);
        required(summaries[1]).success({
            ...workflowBootstrap(),
            serverTime: "2026-09-06T16:05:00Z",
            weighedTodayPlantIds: ["P01", "P02"],
        });
        required(history[1]).success([{ ...recentExample, weight: 418 }]);
        required(summaries[0]).success(workflowBootstrap());
        required(history[0]).success([{ ...recentExample, weight: 999 }]);
        required(summaries[1]).failure(new Error("Duplicate old callback"));

        expect(
            queryElement(window.document, "#roundProgress", HTMLElement)
                .textContent
        ).toContain("2 of 2 Saved today");
        expect(
            queryElement(window.document, "#recentList", HTMLElement)
                .textContent
        ).toContain("418 g");
        expect(
            queryElement(window.document, "#dataFreshness", HTMLElement)
                .textContent
        ).toContain("less than a minute ago");
        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toContain("Connected");

        refreshWorkflow(window);
        vi.advanceTimersByTime(20_000);
        required(summaries[2]).success(workflowBootstrap());
        required(history[2]).success([]);

        expect(
            queryElement(window.document, "#roundProgress", HTMLElement)
                .textContent
        ).toContain("2 of 2 Saved today");
        expect(
            queryElement(window.document, "#recentList", HTMLElement)
                .textContent
        ).toContain("418 g");
        expect(
            queryElement(
                window.document,
                "#refreshDataButton",
                HTMLButtonElement
            ).getAttribute("aria-busy")
        ).toBe("false");
    });

    it("shows signed input changes and elapsed observation time, clears invalid input, and never changes the entered value", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: workflowBootstrap(),
        });
        const feedback = queryElement(
            window.document,
            "#weightFeedback",
            HTMLElement
        );
        enterWorkflowValue(window, "weight", "425.5");

        expect(feedback.textContent).toContain(
            "+5.5 g vs latest 420 g · 1 d 0 h since latest reading"
        );

        enterWorkflowValue(window, "weight", "400");

        expect(feedback.textContent).toContain("-20 g");

        enterWorkflowValue(window, "weight", "420");

        expect(feedback.textContent).toContain("0 g vs latest");

        enterWorkflowValue(window, "potSetup", "3");

        expect(feedback.textContent).toContain("Different pot setup");
        expect(
            queryElement(window.document, "#weight", HTMLInputElement).value
        ).toBe("420");

        enterWorkflowValue(window, "weight", "0");

        expect(feedback.hidden).toBe(true);

        enterWorkflowValue(window, "weight", "");

        expect(feedback.textContent).toBe("");
    });
});

/** @param {Window} window @param {string} value */
function changeRecentLimit(window, value) {
    const select = queryElement(
        window.document,
        "#recentLimit",
        HTMLSelectElement
    );
    select.value = value;
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
}

const correctionDraftKey = "gardenLoggerCorrectionDraftV1";
const correctionPendingKey = "gardenLoggerCorrectionPendingV1";
const correctionPayloadDigest = "a".repeat(64);
const correctionOperationDigest = "b".repeat(64);

/** @param {Window} window @param {string} id */
function clickCorrection(window, id) {
    queryElement(window.document, `#${id}`, HTMLButtonElement).click();
}

/**
 * @param {string} [event] @returns
 *   {import("../logger-correction-fixtures.d.ts").CorrectionContext}
 */
function correctionContext(event = "Weigh") {
    /**
     * @type {Record<
     *     string,
     *     import("../logger-correction-fixtures.d.ts").CorrectionField[]
     * >}
     */
    const eventFields = {
        Check: [
            correctionField("condition", "select", "", ["Healthy", "Watch"]),
            correctionField("soilMoisture", "select", "", ["Dry", "Damp"]),
        ],
        Clean: [],
        Flower: [
            correctionField("flowerCount", "number"),
            correctionField("flowerDetails"),
        ],
        Measure: [
            correctionField("heightCm", "number", "cm"),
            correctionField("widthCm", "number", "cm"),
            correctionField("measurementUnit", "select", "", ["cm", "in"]),
        ],
        Note: [],
        Other: [],
        Pest: [correctionField("pestIssue"), correctionField("pestTreatment")],
        Photo: [correctionField("photoUrl", "url")],
        Prune: [],
        Repot: [
            correctionField("previousPotSize"),
            correctionField("potSize"),
            correctionField("medium"),
        ],
        Rotation: [correctionField("rotationDegrees", "number", "°")],
        Water: [
            correctionField("nutrientsUsed", "select", "", ["No", "Yes"]),
            correctionField("nutrientProduct"),
            correctionField("nutrientAmount"),
            correctionField("wateringApplication", "select", "", [
                "Thorough",
                "Partial",
            ]),
            correctionField("waterAmount", "number", "mL"),
        ],
        Weigh: [correctionField("weight", "number", "g")],
    };
    const fields = [
        correctionField("observationDate", "datetime"),
        ...required(eventFields[event]),
        correctionField("notes"),
    ];
    if (["Measure", "Weigh"].includes(event))
        fields.push(
            correctionField("measurementQuality", "select", "", [
                "Measured",
                "Estimated",
            ]),
            correctionField("measurementMethod", "select", "", [
                "Scale",
                "Ruler",
            ])
        );
    const values = Object.fromEntries(
        fields.map((field) => [
            field.key,
            field.type === "number" ? 10 : (field.options[0] ?? "saved text"),
        ])
    );
    values["observationDate"] = "2026-09-05T16:23:47.123Z";
    values["notes"] = "=SUM(A1:A2)\n<img src=x onerror=alert(1)>";
    switch (event) {
        case "Measure": {
            values["heightCm"] = 6.350000000000001;
            values["widthCm"] = 4.572;
            values["measurementUnit"] = "in";
            break;
        }
        case "Photo": {
            values["photoUrl"] = "https://example.test/photo";
            break;
        }
        default: {
            break;
        }
    }
    return {
        baseRevision: "saved-revision-1",
        contextDigest: "context-1",
        fields,
        notices: [
            "Only this event is corrected. Other events retain their dates.",
            "The pot setup boundary is unchanged.",
        ],
        original: {
            correctionReason: "",
            correctsObservationId: "",
            event,
            label: "A1",
            observationDate: values["observationDate"],
            observationId: "saved-observation-1",
            plantId: "P01",
            potSetup: 2,
            recordedAt: "2026-09-05T16:25:00Z",
            recordStatus: "Active",
            requestId: "saved-group-request",
            saveGroupId: "saved-group-request",
            values,
        },
        siblings: [],
        timeZone: "America/New_York",
    };
}

/**
 * @param {string} key
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionField["type"]} [type]
 * @param {string} [unit]
 * @param {string[]} [options]
 *
 * @returns {import("../logger-correction-fixtures.d.ts").CorrectionField}
 */
function correctionField(key, type = "text", unit = "", options = []) {
    return {
        key,
        label: key,
        options,
        required: key === "observationDate",
        type,
        unit,
    };
}

/**
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionContext} context
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionPreviewPayload} payload
 *
 * @returns {import("../logger-correction-fixtures.d.ts").CorrectionPreview}
 */
function correctionPreview(context, payload) {
    return {
        ...context,
        differences: Object.entries(payload.changes).map(([key, after]) => ({
            after,
            before: context.original.values[key] ?? "",
            key,
            label: key,
        })),
        payloadDigest: correctionPayloadDigest,
        previewToken: "signed-preview-token",
        replacement: {
            ...context.original,
            values: { ...context.original.values, ...payload.changes },
        },
    };
}

/**
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionSavePayload} payload
 *
 * @returns {import("../logger-correction-fixtures.d.ts").CorrectionReceipt}
 */
function correctionReceipt(payload) {
    return {
        observationId: payload.observationId,
        operationDigest: correctionOperationDigest,
        originalObservationId: payload.observationId,
        payloadDigest: correctionPayloadDigest,
        replacementObservationId: `correction:${payload.requestId}:${correctionOperationDigest}`,
        requestId: payload.requestId,
        status: "saved",
    };
}

/**
 * @param {import("../logger-correction-fixtures.d.ts").CorrectionSavePayload} payload
 *
 * @returns {import("../logger-correction-fixtures.d.ts").CorrectionRejected}
 */
function correctionRejection(payload) {
    return {
        code: "STALE_PREVIEW",
        message: "Related History changed. Reload the entry and review again.",
        observationId: payload.observationId,
        operationDigest: createHash("sha256")
            .update(
                JSON.stringify({
                    payloadDigest: correctionPayloadDigest,
                    previewToken: payload.previewToken,
                    requestId: payload.requestId,
                })
            )
            .digest("hex"),
        payloadDigest: correctionPayloadDigest,
        requestId: payload.requestId,
        status: "rejected",
    };
}

/** @param {string} [event] */
function createCorrectionLogger(event = "Weigh") {
    const context = correctionContext(event);
    const logger = createLoggerWindow({
        bootstrapData: {
            ...workflowBootstrap(),
            recent: [
                {
                    ...recentExample,
                    event,
                    observationId: context.original.observationId,
                },
                { ...recentExample, observationId: "second-observation" },
            ],
        },
    });
    logger.behaviors.getWebCorrectionEntry = ({ success }) => {
        success(context);
    };
    logger.behaviors.previewWebObservationCorrection = ({ args, success }) => {
        success(correctionPreview(context, args[0]));
    };
    return { ...logger, context };
}

/** @param {Window} window @param {string} key @param {string} value */
function editCorrection(window, key, value) {
    const selector =
        key === "reason" ? "#correctionReason" : `#correctionField-${key}`;
    const input = required(window.document.querySelector(selector));
    if (
        !(input instanceof HTMLInputElement) &&
        !(input instanceof HTMLTextAreaElement) &&
        !(input instanceof HTMLSelectElement)
    )
        throw new TypeError("Expected an editable correction field.");
    input.value = value;
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    input.dispatchEvent(new window.Event("change", { bubbles: true }));
}

/** @param {Window} window */
function openFirstCorrection(window) {
    queryElement(
        window.document,
        ".recent-item .correct-entry",
        HTMLButtonElement
    ).click();
}

/** @param {Window} window */
function prepareWeightCorrection(window) {
    openFirstCorrection(window);
    editCorrection(window, "weight", "432.5");
    editCorrection(window, "reason", "Transposed digits on scale");
    submitCorrectionReview(window);
}

/** @param {Window} window */
function submitCorrectionReview(window) {
    queryElement(
        window.document,
        "#correctionForm",
        HTMLFormElement
    ).dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true })
    );
}

describe("saved History correction editor and durable recovery", () => {
    afterEach(restoreLoggerMocks);

    it("fetches a full Weigh entry, reviews safe stacked values and confirms without changing the ordinary draft", () => {
        expect.hasAssertions();

        const { behaviors, calls, context, window } = createCorrectionLogger();
        context.siblings = [
            {
                ...context.original,
                event: "Water",
                observationId: "saved-water-sibling",
            },
        ];
        enterWorkflowValue(window, "weight", "501");
        const ordinaryNotes = queryElement(
            window.document,
            "#notes",
            HTMLTextAreaElement
        );
        ordinaryNotes.value = "ordinary draft";
        behaviors.saveWebObservationCorrection = ({ args, success }) => {
            expect(window.localStorage.getItem(correctionPendingKey)).toContain(
                args[0].requestId
            );
            expect(window.localStorage.getItem(correctionDraftKey)).toContain(
                "Transposed digits"
            );
            expect(Object.isFrozen(args[0])).toBe(true);
            expect(Object.isFrozen(args[0].changes)).toBe(true);

            success(correctionReceipt(args[0]));
        };
        prepareWeightCorrection(window);
        const review = queryElement(
            window.document,
            "#correctionReview",
            HTMLElement
        );

        expect(
            structuredClone(
                calls.find((call) => call.method === "getWebCorrectionEntry")
                    ?.args
            )
        ).toStrictEqual(
            structuredClone([{ observationId: "saved-observation-1" }])
        );
        expect(review.hidden).toBe(false);
        expect(
            structuredClone(
                [...review.querySelectorAll(":scope > section > h3")].map(
                    (heading) => heading.textContent
                )
            )
        ).toStrictEqual(structuredClone(["Original", "Replacement"]));
        expect(review.textContent).toContain(context.original.values["notes"]);
        expect(review.querySelector("img")).toBeNull();
        expect(review.textContent).toContain("America/New_York");
        expect(review.textContent).toContain("23:47");
        expect(review.textContent).toContain("432.5 g");
        expect(review.textContent).toContain(
            "Other entries from this save (1)"
        );
        expect(review.textContent).toContain("Only this event is corrected");
        expect(
            queryElement(window.document, "#correctionIdentity", HTMLElement)
                .textContent
        ).toContain("P01 · Weigh · Setup 2 · Historical label A1");
        expect(
            calls.filter(
                (call) => call.method === "saveWebObservationCorrection"
            )
        ).toHaveLength(0);

        clickCorrection(window, "correctionConfirm");
        const saved = required(
            calls.find((call) => call.method === "saveWebObservationCorrection")
        );

        expect(structuredClone(saved.args[0].changes)).toStrictEqual(
            structuredClone({ weight: 432.5 })
        );
        expect(
            queryElement(window.document, "#weight", HTMLInputElement).value
        ).toBe("501");
        expect(ordinaryNotes.value).toBe("ordinary draft");
        expect(window.localStorage.getItem(correctionPendingKey)).toBeNull();
        expect(window.localStorage.getItem(correctionDraftKey)).toBeNull();
        expect(
            queryElement(
                window.document,
                "#correctionDialog",
                HTMLDialogElement
            ).open
        ).toBe(false);
        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(2);
    });

    it("hides the action for legacy History rows without an observation ID", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: { ...bootstrap, recent: [recentExample] },
        });

        expect(window.document.querySelector(".correct-entry")).toBeNull();
    });

    it("preserves exact canonical Measure values and the original instant through unit round trips and note-only edits", () => {
        expect.hasAssertions();

        const { behaviors, calls, context, window } =
            createCorrectionLogger("Measure");
        openFirstCorrection(window);

        expect(
            queryElement(
                window.document,
                "#correctionField-heightCm",
                HTMLInputElement
            ).value
        ).toBe("6.350000000000001");
        expect(
            queryElement(
                window.document,
                'label[for="correctionField-heightCm"]',
                HTMLElement
            ).textContent
        ).toContain("(cm)");
        expect(
            queryElement(window.document, "#correctionFields", HTMLElement)
                .textContent
        ).toContain("changing this unit does not convert or rewrite");

        editCorrection(window, "measurementUnit", "cm");
        editCorrection(window, "measurementUnit", "in");
        editCorrection(window, "notes", "Updated note");
        editCorrection(window, "reason", "Clarify measurement");
        submitCorrectionReview(window);
        const preview = required(
            calls.find(
                (call) => call.method === "previewWebObservationCorrection"
            )
        );

        expect(structuredClone(preview.args[0].changes)).toStrictEqual(
            structuredClone({
                notes: "Updated note",
            })
        );
        expect(context.original.values["observationDate"]).toBe(
            "2026-09-05T16:23:47.123Z"
        );
        expect(
            queryElement(window.document, "#correctionReview", HTMLElement)
                .textContent
        ).toContain("6.350000000000001 cm");

        clickCorrection(window, "correctionEdit");
        editCorrection(window, "heightCm", String(3 * 2.54));
        editCorrection(window, "measurementUnit", "cm");
        submitCorrectionReview(window);

        expect(
            structuredClone(
                calls.findLast(
                    (call) => call.method === "previewWebObservationCorrection"
                )?.args[0].changes
            )
        ).toStrictEqual(
            structuredClone({
                heightCm: 7.62,
                measurementUnit: "cm",
                notes: "Updated note",
            })
        );

        behaviors.saveWebObservationCorrection = ({ args, success }) => {
            success(correctionReceipt(args[0]));
        };
        clickCorrection(window, "correctionConfirm");
        const saved = required(
            calls.find((call) => call.method === "saveWebObservationCorrection")
        );

        expect(structuredClone(saved.args[0].changes)).toStrictEqual({
            heightCm: 7.62,
            measurementUnit: "cm",
            notes: "Updated note",
        });
        expect(window.localStorage.getItem(correctionPendingKey)).toBeNull();
    });

    it.each([
        [
            "Repot",
            "medium",
            "fresh grit",
            "potSize",
        ],
        [
            "Check",
            "condition",
            "Watch",
            "soilMoisture",
        ],
        [
            "Water",
            "waterAmount",
            "125",
            "nutrientProduct",
        ],
        [
            "Flower",
            "flowerCount",
            "3",
            "flowerDetails",
        ],
        [
            "Photo",
            "photoUrl",
            "https://example.test/new-photo",
            "notes",
        ],
        [
            "Pest",
            "pestTreatment",
            "Rinsed",
            "pestIssue",
        ],
        [
            "Rotation",
            "rotationDegrees",
            "180",
            "notes",
        ],
        [
            "Clean",
            "notes",
            "Cleaned leaves",
            "observationDate",
        ],
        [
            "Prune",
            "notes",
            "Removed dry leaf",
            "observationDate",
        ],
        [
            "Other",
            "notes",
            "Moved shelf",
            "observationDate",
        ],
        [
            "Note",
            "notes",
            "Archived observation",
            "observationDate",
        ],
    ])(
        "exposes the server-defined %s fields and patches only the changed field",
        (event, key, value, unchanged) => {
            expect.hasAssertions();

            const { behaviors, calls, context, window } =
                createCorrectionLogger(event);
            openFirstCorrection(window);

            expect(
                window.document.querySelector(`#correctionField-${unchanged}`)
            ).not.toBeNull();
            expect(
                window.document.querySelectorAll("#correctionFields label")
            ).toHaveLength(context.fields.length);

            editCorrection(window, key, value);
            editCorrection(window, "reason", "Correct saved detail");
            submitCorrectionReview(window);
            const payload = required(
                calls.find(
                    (call) => call.method === "previewWebObservationCorrection"
                )
            ).args[0];
            const field = required(
                context.fields.find((candidate) => candidate.key === key)
            );

            expect(structuredClone(payload.changes)).toStrictEqual(
                structuredClone({
                    [key]: field.type === "number" ? Number(value) : value,
                })
            );
            expect(
                queryElement(
                    window.document,
                    "#correctionConfirm",
                    HTMLButtonElement
                ).hidden
            ).toBe(false);

            behaviors.saveWebObservationCorrection = ({ args, success }) => {
                success(correctionReceipt(args[0]));
            };
            clickCorrection(window, "correctionConfirm");
            const saved = required(
                calls.find(
                    (call) => call.method === "saveWebObservationCorrection"
                )
            );

            expect(structuredClone(saved.args[0].changes)).toStrictEqual(
                structuredClone(payload.changes)
            );
            expect(
                window.localStorage.getItem(correctionPendingKey)
            ).toBeNull();
        }
    );

    it("sends explicit blank optional clears and converts changed device dates into zoned ISO timestamps", () => {
        expect.hasAssertions();

        const { calls, window } = createCorrectionLogger("Repot");
        openFirstCorrection(window);
        editCorrection(window, "medium", "");
        editCorrection(window, "observationDate", "2026-09-04T11:22:33");
        editCorrection(
            window,
            "reason",
            "Correct date and remove medium guess"
        );
        submitCorrectionReview(window);
        const payload = required(
            calls.find(
                (call) => call.method === "previewWebObservationCorrection"
            )
        ).args[0];
        const changedDate = new Date("2026-09-04T11:22:33");
        const deviceFormatter = new Intl.DateTimeFormat();

        expect(structuredClone(payload.changes)).toStrictEqual(
            structuredClone({
                medium: "",
                observationDate: changedDate.toISOString(),
            })
        );
        expect(
            queryElement(
                window.document,
                'label[for="correctionField-observationDate"]',
                HTMLElement
            ).textContent
        ).toContain(deviceFormatter.resolvedOptions().timeZone);
    });

    it("preserves unchanged legacy blanks and historical options even when current field definitions require a value", () => {
        expect.hasAssertions();

        const { calls, context, window } = createCorrectionLogger();
        const quality = required(
            context.fields.find((field) => field.key === "measurementQuality")
        );
        quality.required = true;
        context.original.values["measurementQuality"] = "";
        context.original.values["measurementMethod"] =
            "Historical unknown method";
        openFirstCorrection(window);
        editCorrection(window, "notes", "Correct the note only");
        editCorrection(window, "reason", "Fix wording");
        submitCorrectionReview(window);
        const review = required(
            calls.find(
                (call) => call.method === "previewWebObservationCorrection"
            )
        );

        expect(structuredClone(review.args[0].changes)).toStrictEqual({
            notes: "Correct the note only",
        });
        expect(
            queryElement(window.document, "#correctionReview", HTMLElement)
                .textContent
        ).toContain("Historical unknown method");
    });

    it("requires changes and a reason, and preserves the editor on informative server validation errors", () => {
        expect.hasAssertions();

        const { behaviors, calls, window } = createCorrectionLogger("Photo");
        openFirstCorrection(window);
        submitCorrectionReview(window);

        expect(
            queryElement(window.document, "#correctionStatus", HTMLElement)
                .textContent
        ).toContain("reason");

        editCorrection(window, "reason", "Correct link");
        submitCorrectionReview(window);

        expect(
            queryElement(window.document, "#correctionStatus", HTMLElement)
                .textContent
        ).toContain("Change at least one");

        behaviors.previewWebObservationCorrection = ({ failure }) => {
            failure(
                new Error("INVALID_CORRECTION: Photo URL is not accepted.")
            );
        };
        editCorrection(
            window,
            "photoUrl",
            "https://example.test/unsupported-photo"
        );
        submitCorrectionReview(window);

        expect(
            queryElement(window.document, "#correctionStatus", HTMLElement)
                .textContent
        ).toContain("INVALID_CORRECTION");
        expect(
            queryElement(
                window.document,
                "#correctionField-photoUrl",
                HTMLInputElement
            ).value
        ).toBe("https://example.test/unsupported-photo");
        expect(
            calls.filter(
                (call) => call.method === "saveWebObservationCorrection"
            )
        ).toHaveLength(0);
    });

    it("retains its draft through refresh, close, Escape cancel and a fresh reload", () => {
        expect.hasAssertions();

        const { behaviors, context, window } = createCorrectionLogger();
        openFirstCorrection(window);
        editCorrection(window, "weight", "455");
        editCorrection(window, "reason", "Keep this draft");
        behaviors.getRecentWebObservations = ({ success }) => {
            success([
                {
                    ...recentExample,
                    observationId: context.original.observationId,
                },
            ]);
        };
        refreshWorkflow(window);

        expect(
            queryElement(
                window.document,
                "#correctionField-weight",
                HTMLInputElement
            ).value
        ).toBe("455");

        queryElement(
            window.document,
            "#correctionDialog",
            HTMLDialogElement
        ).dispatchEvent(new window.Event("cancel", { cancelable: true }));

        expect(
            queryElement(
                window.document,
                "#correctionDialog",
                HTMLDialogElement
            ).open
        ).toBe(false);
        expect(window.document.activeElement?.id).toBe("correctionResume");
        expect(window.localStorage.getItem(correctionDraftKey)).toContain(
            "Keep this draft"
        );

        const reloaded = createLoggerWindow({
            storage: {
                [correctionDraftKey]: required(
                    window.localStorage.getItem(correctionDraftKey)
                ),
            },
        });
        reloaded.behaviors.getWebCorrectionEntry = ({ success }) => {
            success(context);
        };
        clickCorrection(reloaded.window, "correctionResume");

        expect(
            queryElement(
                reloaded.window.document,
                "#correctionField-weight",
                HTMLInputElement
            ).value
        ).toBe("455");
        expect(
            queryElement(
                reloaded.window.document,
                "#correctionReason",
                HTMLTextAreaElement
            ).value
        ).toBe("Keep this draft");
    });

    it("restores focus to the opening button and ignores a preview callback after closing", () => {
        expect.hasAssertions();

        const { behaviors, context, window } = createCorrectionLogger();
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"previewWebObservationCorrection">[]} */
        const previews = [];
        behaviors.previewWebObservationCorrection = (handler) => {
            previews.push(handler);
        };
        const trigger = queryElement(
            window.document,
            ".correct-entry",
            HTMLButtonElement
        );
        prepareWeightCorrection(window);
        clickCorrection(window, "correctionClose");
        const callback = required(previews[0]);
        callback.success(correctionPreview(context, callback.args[0]));

        expect(window.document.activeElement).toBe(trigger);
        expect(
            queryElement(
                window.document,
                "#correctionDialog",
                HTMLDialogElement
            ).open
        ).toBe(false);
        expect(
            queryElement(
                window.document,
                "#correctionConfirm",
                HTMLButtonElement
            ).hidden
        ).toBe(true);
    });

    it("ignores obsolete load and preview callbacks when another saved entry opens", () => {
        expect.hasAssertions();

        const { behaviors, context, window } = createCorrectionLogger();
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getWebCorrectionEntry">[]} */
        const loads = [];
        behaviors.getWebCorrectionEntry = (handler) => {
            loads.push(handler);
        };
        openFirstCorrection(window);
        const second = required(
            queryElements(
                window.document,
                ".correct-entry",
                HTMLButtonElement
            )[1]
        );
        second.click();
        const secondContext = {
            ...correctionContext("Repot"),
            original: {
                ...correctionContext("Repot").original,
                observationId: "second-observation",
            },
        };
        required(loads[1]).success(secondContext);
        required(loads[0]).success(context);

        expect(
            queryElement(window.document, "#correctionIdentity", HTMLElement)
                .textContent
        ).toContain("second-observation");
        expect(
            window.document.querySelector("#correctionField-weight")
        ).toBeNull();

        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"previewWebObservationCorrection">[]} */
        const previews = [];
        behaviors.previewWebObservationCorrection = (handler) => {
            previews.push(handler);
        };
        editCorrection(window, "medium", "fresh medium");
        editCorrection(window, "reason", "correct medium");
        submitCorrectionReview(window);
        openFirstCorrection(window);
        required(loads[2]).success(context);
        const late = required(previews[0]);
        late.success(correctionPreview(secondContext, late.args[0]));

        expect(
            queryElement(window.document, "#correctionIdentity", HTMLElement)
                .textContent
        ).toContain("saved-observation-1");
        expect(
            queryElement(window.document, "#correctionReview", HTMLElement)
                .hidden
        ).toBe(true);
    });

    it("requires a fresh fetch and review after a stale preview, keeping edits until explicit reload", () => {
        expect.hasAssertions();

        const { behaviors, calls, window } = createCorrectionLogger();
        behaviors.previewWebObservationCorrection = ({ failure }) => {
            failure(
                new Error("STALE_PREVIEW: Another correction changed this row.")
            );
        };
        prepareWeightCorrection(window);

        expect(
            queryElement(window.document, "#correctionStatus", HTMLElement)
                .textContent
        ).toContain("Fetch the saved entry again");
        expect(
            queryElement(
                window.document,
                "#correctionField-weight",
                HTMLInputElement
            ).value
        ).toBe("432.5");

        submitCorrectionReview(window);

        expect(
            calls.filter(
                (call) => call.method === "previewWebObservationCorrection"
            )
        ).toHaveLength(1);

        clickCorrection(window, "correctionReload");

        expect(
            queryElement(
                window.document,
                "#correctionField-weight",
                HTMLInputElement
            ).value
        ).toBe("10");
        expect(
            calls.filter((call) => call.method === "getWebCorrectionEntry")
        ).toHaveLength(2);
    });
});

describe("saved History correction immutable requests and receipts", () => {
    afterEach(restoreLoggerMocks);

    it.each([
        "failure",
        "timeout",
        "empty",
    ])(
        "recovers a %s save callback through a matched locked status receipt",
        (mode) => {
            expect.hasAssertions();

            vi.useFakeTimers();
            const { behaviors, calls, window } = createCorrectionLogger();
            behaviors.saveWebObservationCorrection = ({ failure, success }) => {
                switch (mode) {
                    case "empty": {
                        success(undefined);
                        break;
                    }
                    case "failure": {
                        failure(new Error("Lost response"));
                        break;
                    }
                    default: {
                        break;
                    }
                }
            };
            behaviors.getWebCorrectionStatus = ({ args, success }) => {
                success(correctionReceipt(args[0]));
            };
            prepareWeightCorrection(window);
            clickCorrection(window, "correctionConfirm");
            vi.advanceTimersByTime(20_000);

            expect(
                window.localStorage.getItem(correctionPendingKey)
            ).toBeNull();
            expect(
                calls.filter(
                    (call) => call.method === "saveWebObservationCorrection"
                )
            ).toHaveLength(1);

            const save = required(
                calls.find(
                    (call) => call.method === "saveWebObservationCorrection"
                )
            );

            expect(
                structuredClone(
                    calls.find(
                        (call) => call.method === "getWebCorrectionStatus"
                    )?.args[0]
                )
            ).toStrictEqual(structuredClone(save.args[0]));
            expect(
                queryElement(
                    window.document,
                    "#correctionBannerStatus",
                    HTMLElement
                ).textContent
            ).toContain("confirmed");
        }
    );

    it("keeps one immutable request across missing status, status failure, double click, blocked new edits and exact retry", () => {
        expect.hasAssertions();

        const { behaviors, calls, window } = createCorrectionLogger();
        behaviors.saveWebObservationCorrection = ({ failure }) => {
            failure(new Error("Disconnected"));
        };
        behaviors.getWebCorrectionStatus = ({ args, success }) => {
            success({ ...correctionReceipt(args[0]), status: "missing" });
        };
        prepareWeightCorrection(window);
        clickCorrection(window, "correctionConfirm");
        clickCorrection(window, "correctionConfirm");
        const stored = required(
            window.localStorage.getItem(correctionPendingKey)
        );
        openFirstCorrection(window);

        expect(
            calls.filter((call) => call.method === "getWebCorrectionEntry")
        ).toHaveLength(1);
        expect(
            calls.filter(
                (call) => call.method === "saveWebObservationCorrection"
            )
        ).toHaveLength(1);
        expect(
            queryElement(
                window.document,
                "#correctionResume",
                HTMLButtonElement
            ).hidden
        ).toBe(true);
        expect(
            queryElement(window.document, "#weight", HTMLInputElement).disabled
        ).toBe(false);

        behaviors.getWebCorrectionStatus = ({ failure }) => {
            failure(new Error("Status unavailable"));
        };
        clickCorrection(window, "correctionCheck");

        expect(window.localStorage.getItem(correctionPendingKey)).toBe(stored);
        expect(
            queryElement(
                window.document,
                "#correctionBannerStatus",
                HTMLElement
            ).textContent
        ).toContain("outcome is still unknown");

        behaviors.saveWebObservationCorrection = ({ args, success }) => {
            success(correctionReceipt(args[0]));
        };
        clickCorrection(window, "correctionRetry");
        const saves = calls.filter(
            (call) => call.method === "saveWebObservationCorrection"
        );

        expect(saves).toHaveLength(2);
        expect(structuredClone(required(saves[1]).args[0])).toStrictEqual(
            structuredClone(required(saves[0]).args[0])
        );
        expect(window.localStorage.getItem(correctionPendingKey)).toBeNull();
    });

    it("restores a pending correction after reload, checks automatically, and retries its exact payload", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const first = createCorrectionLogger();
        prepareWeightCorrection(first.window);
        clickCorrection(first.window, "correctionConfirm");
        const stored = required(
            first.window.localStorage.getItem(correctionPendingKey)
        );
        const original = required(
            first.calls.find(
                (call) => call.method === "saveWebObservationCorrection"
            )
        ).args[0];
        const reloaded = createLoggerWindow({
            storage: { [correctionPendingKey]: stored },
        });

        expect(
            structuredClone(
                reloaded.calls.find(
                    (call) => call.method === "getWebCorrectionStatus"
                )?.args[0]
            )
        ).toStrictEqual(structuredClone(original));
        expect(
            queryElement(
                reloaded.window.document,
                "#correctionBanner",
                HTMLElement
            ).hidden
        ).toBe(false);
        expect(
            queryElement(
                reloaded.window.document,
                "#correctionRetry",
                HTMLButtonElement
            ).disabled
        ).toBe(true);

        vi.advanceTimersByTime(20_000);
        reloaded.behaviors.saveWebObservationCorrection = ({
            args,
            success,
        }) => {
            success(correctionReceipt(args[0]));
        };
        clickCorrection(reloaded.window, "correctionRetry");

        expect(
            structuredClone(
                reloaded.calls.find(
                    (call) => call.method === "saveWebObservationCorrection"
                )?.args[0]
            )
        ).toStrictEqual(structuredClone(original));
        expect(
            reloaded.window.localStorage.getItem(correctionPendingKey)
        ).toBeNull();
    });

    it("does not dispatch when localStorage cannot retain the immutable pending payload", () => {
        expect.hasAssertions();

        const { calls, window } = createCorrectionLogger();
        prepareWeightCorrection(window);
        const setItem = window.localStorage.setItem.bind(window.localStorage);
        vi.spyOn(window.localStorage, "setItem").mockImplementation(
            (key, value) => {
                if (key === correctionPendingKey)
                    throw new window.DOMException(
                        "Quota exceeded",
                        "QuotaExceededError"
                    );
                setItem(key, value);
            }
        );
        clickCorrection(window, "correctionConfirm");

        expect(
            calls.filter(
                (call) => call.method === "saveWebObservationCorrection"
            )
        ).toHaveLength(0);
        expect(
            queryElement(window.document, "#correctionReview", HTMLElement)
                .hidden
        ).toBe(false);
        expect(
            queryElement(window.document, "#correctionStatus", HTMLElement)
                .textContent
        ).toContain("Correction was not sent");
        expect(window.localStorage.getItem(correctionDraftKey)).toContain(
            "432.5"
        );
    });

    it.each([
        "requestId",
        "observationId",
        "originalObservationId",
        "replacementObservationId",
        "payloadDigest",
        "operationDigest",
    ])(
        "rejects a mismatched %s receipt and preserves pending recovery",
        (key) => {
            expect.hasAssertions();

            const { behaviors, calls, window } = createCorrectionLogger();
            behaviors.saveWebObservationCorrection = ({ args, success }) => {
                success({
                    ...correctionReceipt(args[0]),
                    [key]: "wrong-receipt",
                });
            };
            behaviors.getWebCorrectionStatus = ({ args, success }) => {
                success({
                    ...correctionReceipt(args[0]),
                    [key]: "wrong-receipt",
                });
            };
            prepareWeightCorrection(window);
            clickCorrection(window, "correctionConfirm");

            expect(
                window.localStorage.getItem(correctionPendingKey)
            ).not.toBeNull();
            expect(
                queryElement(
                    window.document,
                    "#correctionBannerStatus",
                    HTMLElement
                ).textContent
            ).toContain("did not match");
            expect(
                calls.filter((call) => call.method === "getWebAppBootstrap")
            ).toHaveLength(1);
        }
    );

    it("pins a missing-status operation digest and rejects a different valid digest and replacement identity", () => {
        expect.hasAssertions();

        const { behaviors, window } = createCorrectionLogger();
        behaviors.saveWebObservationCorrection = ({ failure }) => {
            failure(new Error("No response"));
        };
        behaviors.getWebCorrectionStatus = ({ args, success }) => {
            success({ ...correctionReceipt(args[0]), status: "missing" });
        };
        prepareWeightCorrection(window);
        clickCorrection(window, "correctionConfirm");
        const stored = required(
            window.localStorage.getItem(correctionPendingKey)
        );
        behaviors.getWebCorrectionStatus = ({ args, success }) => {
            const operationDigest = "c".repeat(64);
            success({
                ...correctionReceipt(args[0]),
                operationDigest,
                replacementObservationId: `correction:${args[0].requestId}:${operationDigest}`,
            });
        };
        clickCorrection(window, "correctionCheck");

        expect(window.localStorage.getItem(correctionPendingKey)).toBe(stored);
        expect(
            queryElement(
                window.document,
                "#correctionBannerStatus",
                HTMLElement
            ).textContent
        ).toContain("did not match");
    });

    it("keeps recoverable pending state when local receipt cleanup fails and accepts the same receipt after a later correction", () => {
        expect.hasAssertions();

        const { behaviors, calls, window } = createCorrectionLogger();
        const removeItem = window.localStorage.removeItem.bind(
            window.localStorage
        );
        const remove = vi
            .spyOn(window.localStorage, "removeItem")
            .mockImplementation((key) => {
                if (key === correctionPendingKey)
                    throw new Error("Storage temporarily unavailable");
                removeItem(key);
            });
        behaviors.saveWebObservationCorrection = ({ args, success }) => {
            success(correctionReceipt(args[0]));
        };
        prepareWeightCorrection(window);
        clickCorrection(window, "correctionConfirm");

        expect(
            parseStoredRecord(window.localStorage.getItem(correctionPendingKey))
        ).toMatchObject({
            payload: {
                changes: { weight: 432.5 },
                observationId: "saved-observation-1",
            },
            payloadDigest: correctionPayloadDigest,
        });
        expect(
            queryElement(
                window.document,
                "#correctionBannerStatus",
                HTMLElement
            ).textContent
        ).toContain("could not clear");

        remove.mockRestore();
        // A later correction can supersede the replacement. The terminal
        // receipt is still the same; no current row status or revision check.
        behaviors.getWebCorrectionStatus = ({ args, success }) => {
            success(correctionReceipt(args[0]));
        };
        clickCorrection(window, "correctionCheck");

        expect(window.localStorage.getItem(correctionPendingKey)).toBeNull();
        expect(
            calls.filter((call) => call.method === "getWebCorrectionEntry")
        ).toHaveLength(1);
    });

    it("accepts a late matching terminal receipt and ignores subsequent obsolete missing or failure callbacks", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const { behaviors, calls, window } = createCorrectionLogger();
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"saveWebObservationCorrection">[]} */
        const saves = [];
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getWebCorrectionStatus">[]} */
        const statuses = [];
        behaviors.saveWebObservationCorrection = (handler) => {
            saves.push(handler);
        };
        behaviors.getWebCorrectionStatus = (handler) => {
            statuses.push(handler);
        };
        prepareWeightCorrection(window);
        clickCorrection(window, "correctionConfirm");
        vi.advanceTimersByTime(20_000);
        const save = required(saves[0]);
        save.success(correctionReceipt(save.args[0]));
        const status = required(statuses[0]);
        status.success({
            ...correctionReceipt(status.args[0]),
            status: "missing",
        });
        save.failure(new Error("Late failure"));
        save.success(correctionReceipt(save.args[0]));

        expect(window.localStorage.getItem(correctionPendingKey)).toBeNull();
        expect(
            queryElement(
                window.document,
                "#correctionBannerStatus",
                HTMLElement
            ).textContent
        ).toContain("confirmed");
        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(2);
    });
});

describe("server-confirmed terminal correction recovery", () => {
    afterEach(restoreLoggerMocks);

    it("retains typed correction and ordinary drafts plus the queue, then requires a fresh review and request", async () => {
        expect.hasAssertions();

        const { behaviors, calls, window } = createCorrectionLogger();
        enterWorkflowValue(window, "weight", "499");
        queryElement(
            window.document,
            "#queueButton",
            HTMLButtonElement
        ).click();
        enterWorkflowValue(window, "weight", "501");
        const notes = queryElement(
            window.document,
            "#notes",
            HTMLTextAreaElement
        );
        notes.value = "ordinary unsaved note";
        const queueKey = "gardenLoggerObservationQueueV1";
        const queue = required(window.localStorage.getItem(queueKey));
        behaviors.saveWebObservationCorrection = ({ failure }) => {
            failure(new Error("STALE_PREVIEW: sibling changed"));
        };
        behaviors.getWebCorrectionStatus = ({ args, success }) => {
            success(correctionRejection(args[0]));
        };
        prepareWeightCorrection(window);
        const draft = window.localStorage.getItem(correctionDraftKey);
        clickCorrection(window, "correctionConfirm");
        await vi.waitFor(() => {
            expect(
                window.localStorage.getItem(correctionPendingKey)
            ).toBeNull();
        });

        expect(window.localStorage.getItem(correctionDraftKey)).toBe(draft);
        expect(window.localStorage.getItem(queueKey)).toBe(queue);
        expect(notes.value).toBe("ordinary unsaved note");
        expect(
            queryElement(window.document, "#weight", HTMLInputElement).value
        ).toBe("501");
        expect(
            queryElement(
                window.document,
                "#correctionResume",
                HTMLButtonElement
            ).hidden
        ).toBe(false);

        clickCorrection(window, "correctionResume");

        expect(
            queryElement(
                window.document,
                "#correctionField-weight",
                HTMLInputElement
            ).value
        ).toBe("432.5");
        expect(
            queryElement(
                window.document,
                "#correctionReason",
                HTMLTextAreaElement
            ).value
        ).toBe("Transposed digits on scale");
        expect(
            queryElement(
                window.document,
                "#correctionConfirm",
                HTMLButtonElement
            ).hidden
        ).toBe(true);

        clickCorrection(window, "correctionConfirm");

        expect(
            calls.filter(
                (call) => call.method === "saveWebObservationCorrection"
            )
        ).toHaveLength(1);

        submitCorrectionReview(window);
        behaviors.saveWebObservationCorrection = ({ args, success }) => {
            success(correctionReceipt(args[0]));
        };
        clickCorrection(window, "correctionConfirm");
        const saves = calls.filter(
            (call) => call.method === "saveWebObservationCorrection"
        );

        expect(saves).toHaveLength(2);
        expect(required(saves[1]).args[0].requestId).not.toBe(
            required(saves[0]).args[0].requestId
        );
    });

    it("restores the same terminal request after reload and recovers its retained typed draft", async () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const first = createCorrectionLogger();
        prepareWeightCorrection(first.window);
        clickCorrection(first.window, "correctionConfirm");
        const pending = required(
            first.window.localStorage.getItem(correctionPendingKey)
        );
        const draft = required(
            first.window.localStorage.getItem(correctionDraftKey)
        );
        const reloaded = createLoggerWindow({
            storage: {
                [correctionDraftKey]: draft,
                [correctionPendingKey]: pending,
            },
        });

        expect(
            reloaded.calls.some(
                (call) => call.method === "getWebCorrectionStatus"
            )
        ).toBe(true);

        vi.advanceTimersByTime(20_000);
        reloaded.behaviors.getWebCorrectionStatus = ({ args, success }) => {
            success(correctionRejection(args[0]));
        };
        clickCorrection(reloaded.window, "correctionCheck");
        await vi.waitFor(() => {
            expect(
                reloaded.window.localStorage.getItem(correctionPendingKey)
            ).toBeNull();
        });

        expect(reloaded.window.localStorage.getItem(correctionDraftKey)).toBe(
            draft
        );

        reloaded.behaviors.getWebCorrectionEntry = ({ success }) => {
            success(correctionContext());
        };
        clickCorrection(reloaded.window, "correctionResume");

        expect(
            queryElement(
                reloaded.window.document,
                "#correctionField-weight",
                HTMLInputElement
            ).value
        ).toBe("432.5");
        expect(
            reloaded.calls.filter(
                (call) => call.method === "saveWebObservationCorrection"
            )
        ).toHaveLength(0);
    });

    it.each([
        { fault: "throw", removeCalls: 1, storedReason: "Transposed digits" },
        { fault: "silent", removeCalls: 1, storedReason: "Transposed digits" },
        {
            fault: "different-key",
            removeCalls: 0,
            storedReason: "Another correction",
        },
    ])(
        "retains recovery when matching pending cleanup fails: $fault",
        async ({ fault, removeCalls, storedReason }) => {
            expect.hasAssertions();

            const { behaviors, window } = createCorrectionLogger();
            behaviors.saveWebObservationCorrection = ({ failure }) => {
                failure(new Error("stale commit"));
            };
            behaviors.getWebCorrectionStatus = ({ args, success }) => {
                success(correctionRejection(args[0]));
            };
            prepareWeightCorrection(window);
            const remove = window.localStorage.removeItem.bind(
                window.localStorage
            );
            const removal = vi
                .spyOn(window.localStorage, "removeItem")
                .mockImplementation((key) => {
                    if (key !== correctionPendingKey) {
                        remove(key);
                        return;
                    }
                    if (fault === "throw")
                        throw new Error("Storage unavailable");
                });
            clickCorrection(window, "correctionConfirm");
            const pending = required(
                window.localStorage.getItem(correctionPendingKey)
            );
            window.localStorage.setItem(
                correctionPendingKey,
                pending.replace("Transposed digits", () => storedReason)
            );
            const retained = window.localStorage.getItem(correctionPendingKey);
            await vi.waitFor(() => {
                expect(
                    queryElement(
                        window.document,
                        "#correctionBannerStatus",
                        HTMLElement
                    ).textContent
                ).toContain("could not be verified");
            });

            expect(window.localStorage.getItem(correctionPendingKey)).toBe(
                retained
            );
            expect(window.localStorage.getItem(correctionDraftKey)).toContain(
                "Transposed digits"
            );
            expect(
                queryElement(
                    window.document,
                    "#correctionResume",
                    HTMLButtonElement
                ).hidden
            ).toBe(true);

            expect(removal).toHaveBeenCalledTimes(removeCalls);

            removal.mockRestore();
            window.localStorage.setItem(correctionPendingKey, pending);
            clickCorrection(window, "correctionCheck");
            await vi.waitFor(() => {
                expect(
                    window.localStorage.getItem(correctionPendingKey)
                ).toBeNull();
            });
        }
    );

    it.each([
        "requestId",
        "observationId",
        "payloadDigest",
        "operationDigest",
        "code",
        "message",
        "status",
    ])("keeps a mismatched rejected %s protected", async (field) => {
        expect.hasAssertions();

        const { behaviors, window } = createCorrectionLogger();
        behaviors.saveWebObservationCorrection = ({ failure }) => {
            failure(new Error("STALE_PREVIEW"));
        };
        behaviors.getWebCorrectionStatus = ({ args, success }) => {
            success({
                ...correctionRejection(args[0]),
                [field]: field === "message" ? "" : "f".repeat(64),
            });
        };
        prepareWeightCorrection(window);
        clickCorrection(window, "correctionConfirm");
        const pending = window.localStorage.getItem(correctionPendingKey);
        await vi.waitFor(() => {
            expect(
                queryElement(
                    window.document,
                    "#correctionCheck",
                    HTMLButtonElement
                ).disabled
            ).toBe(false);
        });

        expect(window.localStorage.getItem(correctionPendingKey)).toBe(pending);
        expect(
            queryElement(
                window.document,
                "#correctionResume",
                HTMLButtonElement
            ).hidden
        ).toBe(true);
    });

    it("restores the exact pending key if removal succeeds but its verification read fails", async () => {
        expect.hasAssertions();

        const { behaviors, window } = createCorrectionLogger();
        behaviors.saveWebObservationCorrection = ({ failure }) => {
            failure(new Error("STALE_PREVIEW"));
        };
        behaviors.getWebCorrectionStatus = ({ args, success }) => {
            success(correctionRejection(args[0]));
        };
        prepareWeightCorrection(window);
        const remove = window.localStorage.removeItem.bind(window.localStorage);
        const removal = vi
            .spyOn(window.localStorage, "removeItem")
            .mockImplementation((key) => {
                remove(key);
                if (key === correctionPendingKey)
                    vi.spyOn(
                        window.localStorage,
                        "getItem"
                    ).mockImplementationOnce(() => {
                        throw new Error("Read-back unavailable");
                    });
            });
        clickCorrection(window, "correctionConfirm");
        const pending = window.localStorage.getItem(correctionPendingKey);
        await vi.waitFor(() => {
            expect(
                queryElement(
                    window.document,
                    "#correctionBannerStatus",
                    HTMLElement
                ).textContent
            ).toContain("could not be verified");
        });

        expect(window.localStorage.getItem(correctionPendingKey)).toBe(pending);
        expect(window.localStorage.getItem(correctionDraftKey)).toContain(
            "Transposed digits"
        );

        removal.mockRestore();
        clickCorrection(window, "correctionCheck");
        await vi.waitFor(() => {
            expect(
                window.localStorage.getItem(correctionPendingKey)
            ).toBeNull();
        });
    });
});

const canonicalPlantLabels = [
    "A1",
    "A2",
    "A3",
    "B1",
    "B2",
    "B3",
    "C1",
    "C2",
    "C3",
    "D1",
    "D2",
    "D3",
    "E1",
    "E2",
    "E3",
    "F1",
    "F2",
    "F3",
    "#1",
    "#2",
    "#3",
    "#4",
    "G2",
    "H1",
    "H2",
    "H3",
    "G1",
    "G3",
    "#5",
    "#6",
];

const p23ImageUrls = {
    currentImageUrl:
        "https://thumb.gyazo.com/thumb/960/387921a6f4930d7051201ed54fb9339d.jpg",
    nurseryLabelImageUrl:
        "https://nick2bad4u.github.io/Gardening/assets/nursery-labels/2026-08-29-p23-paper-spine-label.webp",
};

/** @returns {import("../logger-fixtures.d.ts").Bootstrap} */
function canonicalBootstrap() {
    return {
        ...bootstrap,
        plants: canonicalPlantLabels.map((label, index) => {
            const id = `P${String(index + 1).padStart(2, "0")}`;
            return {
                currentImageUrl:
                    id === "P23" ? p23ImageUrls.currentImageUrl : "",
                currentPotSize: "4 in",
                daysSinceWater: "",
                dryOrLowestWeight: "",
                dryOrLowestWeightBasis: "",
                dryOrLowestWeightDate: "",
                fieldGuideUrl: `https://example.test/guide#${id}`,
                historyUrl: `https://example.test/history?id=${id}`,
                id,
                label,
                lastWatered: "",
                latestWeight: "",
                name: `Plant ${id}`,
                nurseryLabelImageUrl:
                    id === "P23" ? p23ImageUrls.nurseryLabelImageUrl : "",
                potSetup: 1,
                scientificName: `Scientific ${id}`,
            };
        }),
    };
}

/** @param {Window} window @param {string} mode */
function confirmSummarySave(window, mode) {
    if (mode === "queue") {
        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).click();
        return;
    }
    if (mode === "bulk") {
        queryElement(
            window.document,
            "#bulkModeTab",
            HTMLButtonElement
        ).click();
        queryElement(
            window.document,
            "#bulkNutrientsUsed",
            HTMLSelectElement
        ).value = "No";
        const checkbox = queryElement(
            window.document,
            "#bulkPlantList input[type='checkbox']",
            HTMLInputElement
        );
        checkbox.checked = true;
        checkbox.dispatchEvent(new window.Event("change", { bubbles: true }));
    } else {
        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        weight.value = "450";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
    }
    queryElement(
        window.document,
        mode === "bulk" ? "#bulkWaterForm" : "#entryForm",
        HTMLFormElement
    ).dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true })
    );
}

/** @param {import("../logger-fixtures.d.ts").LoggerOptions} [options] */
function createLoggerWindow({
    batchSaveStatus = "missing",
    bootstrapBehavior,
    bootstrapData = bootstrap,
    configureWindow = () => {},
    matchMediaUnavailable = false,
    online = true,
    pendingSave,
    saveStatus = "missing",
    storage = {},
    storageUnavailable = false,
} = {}) {
    const window = new Window({
        url: "https://script.google.com/macros/s/test/exec",
    });
    loggerWindows.add(window);
    // Keep the VM clock aligned with test timers for workbook-day rollover.
    Object.defineProperty(window, "Date", { configurable: true, value: Date });
    Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        value: online,
    });
    window.setTimeout = trackedLoggerTimeout;
    window.clearTimeout = clearTimeout;
    window.document.write(html);
    for (const [key, value] of Object.entries(storage))
        window.localStorage.setItem(key, value);
    if (pendingSave) {
        window.localStorage.setItem(
            "gardenLoggerPendingSaveV1",
            JSON.stringify(pendingSave)
        );
    }
    if (storageUnavailable) {
        const unavailable = () => {
            throw new window.DOMException(
                "Storage is unavailable",
                "SecurityError"
            );
        };
        for (const target of [window.localStorage, window.sessionStorage]) {
            vi.spyOn(target, "getItem").mockImplementation(unavailable);
            vi.spyOn(target, "setItem").mockImplementation(unavailable);
            vi.spyOn(target, "removeItem").mockImplementation(unavailable);
        }
    }
    if (matchMediaUnavailable) {
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: () => {
                throw new window.DOMException(
                    "Media queries are unavailable",
                    "NotSupportedError"
                );
            },
        });
    }

    /** @type {import("../logger-fixtures.d.ts").ScriptCall[]} */
    const calls = [];
    /** @type {import("../logger-fixtures.d.ts").ScriptBehaviors} */
    const behaviors = {
        getRecentWebObservations: ({ success }) => {
            success([]);
        },
        getWebAppBootstrap:
            bootstrapBehavior ??
            (({ success }) => {
                success(bootstrapData);
            }),
        getWebBatchSaveStatus: ({ args, success }) => {
            success(
                args[0].map((request) => ({
                    requestId:
                        typeof request === "string"
                            ? request
                            : request.requestId,
                    state:
                        typeof batchSaveStatus === "function"
                            ? batchSaveStatus(request)
                            : batchSaveStatus,
                }))
            );
        },
        getWebSaveStatus: ({ success }) => {
            success({
                message: "Status checked",
                state: saveStatus,
            });
        },
    };
    const createChain = createScriptRunner(behaviors, calls);
    Object.defineProperty(window, "google", {
        value: {
            script: {
                get run() {
                    return createChain();
                },
            },
        },
    });

    configureWindow(window);
    window.eval(scriptSource);
    return { behaviors, calls, window };
}

/**
 * @param {import("../logger-fixtures.d.ts").ScriptBehaviors} behaviors
 * @param {import("../logger-fixtures.d.ts").ScriptCall[]} calls
 */
function createScriptRunner(behaviors, calls) {
    return function createChain() {
        /** @type {(response: unknown) => void} */
        let successHandler = () => {};
        /** @type {(error: unknown) => void} */
        let failureHandler = () => {};
        /**
         * @template {keyof import("../logger-fixtures.d.ts").ScriptArguments} M
         *
         * @param {M} method
         * @param {import("../logger-fixtures.d.ts").ScriptArguments[M]} args
         */
        function invoke(method, args) {
            // The browser calls each named endpoint through its real public
            // argument shape; keep method/arguments paired in the call receipt.
            const call =
                /** @type {import("../logger-fixtures.d.ts").ScriptCall} */ ({
                    args,
                    method,
                });
            calls.push(call);
            behaviors[method]?.({
                args,
                failure: failureHandler,
                success: successHandler,
            });
        }
        const chain = {
            /**
             * @param {number} limit @param
             *   {import("../logger-workflow-fixtures.d.ts").WebHistoryFilters}
             *   [filters]
             */
            getRecentWebObservations(limit, filters = {}) {
                invoke("getRecentWebObservations", [limit, filters]);
            },
            getWebAppBootstrap() {
                invoke("getWebAppBootstrap", []);
            },
            /** @param {import("../logger-fixtures.d.ts").ObservationPayload[]} requests */
            getWebBatchSaveStatus(requests) {
                invoke("getWebBatchSaveStatus", [requests]);
            },
            /** @param {import("../logger-fixtures.d.ts").ScriptArguments["getWebCorrectionEntry"][0]} request */
            getWebCorrectionEntry(request) {
                invoke("getWebCorrectionEntry", [request]);
            },
            /** @param {import("../logger-correction-fixtures.d.ts").CorrectionSavePayload} request */
            getWebCorrectionStatus(request) {
                invoke("getWebCorrectionStatus", [request]);
            },
            /** @param {import("../logger-fixtures.d.ts").ObservationPayload} request */
            getWebSaveStatus(request) {
                invoke("getWebSaveStatus", [request]);
            },
            /** @param {import("../logger-correction-fixtures.d.ts").CorrectionPreviewPayload} request */
            previewWebObservationCorrection(request) {
                invoke("previewWebObservationCorrection", [request]);
            },
            /** @param {import("../logger-fixtures.d.ts").ObservationPayload} payload */
            saveBulkCareObservation(payload) {
                invoke("saveBulkCareObservation", [payload]);
            },
            /** @param {import("../logger-fixtures.d.ts").ObservationPayload} payload */
            saveWebObservation(payload) {
                invoke("saveWebObservation", [payload]);
            },
            /** @param {import("../logger-fixtures.d.ts").ObservationPayload[]} payloads */
            saveWebObservationBatch(payloads) {
                invoke("saveWebObservationBatch", [payloads]);
            },
            /** @param {import("../logger-correction-fixtures.d.ts").CorrectionSavePayload} request */
            saveWebObservationCorrection(request) {
                invoke("saveWebObservationCorrection", [request]);
            },
            /** @param {(error: unknown) => void} handler */
            withFailureHandler(handler) {
                failureHandler = handler;
                return chain;
            },
            /** @param {(value: unknown) => void} handler */
            withSuccessHandler(handler) {
                successHandler = handler;
                return chain;
            },
        };
        return chain;
    };
}

/**
 * @param {{
 *     offline?: boolean;
 *     openFails?: boolean;
 *     saved?: Map<string, Response>;
 *     writeFails?: boolean;
 * }} [options]
 */
function portraitCacheFixture({
    offline = false,
    openFails = false,
    saved = new Map(),
    writeFails = false,
} = {}) {
    /** @type {PortraitObserver[]} */
    const observers = [];
    /** @type {typeof globalThis.fetch} */
    const fetchImage = (_input, _options) => {
        if (offline) return Promise.reject(new Error("Offline"));
        return Promise.resolve(
            new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="20"/></svg>',
                { headers: { "Content-Type": "image/svg+xml" } }
            )
        );
    };
    const fetch = vi.fn(fetchImage);
    const cache = {
        match: vi.fn((/** @type {string} */ key) =>
            Promise.resolve(saved.get(key)?.clone())
        ),
        put: vi.fn(
            (/** @type {string} */ key, /** @type {Response} */ response) => {
                if (writeFails)
                    return Promise.reject(new Error("Cache quota exceeded"));
                saved.set(key, response.clone());
                return Promise.resolve();
            }
        ),
    };
    class PortraitObserver extends IntersectionObserver {
        /** @type {Set<import("happy-dom").Element>} */
        targets = new Set();
        /** @param {ConstructorParameters<typeof IntersectionObserver>[0]} callback */
        constructor(callback) {
            super(callback);
            this.callback = callback;
            observers.push(this);
        }
        /** @override @param {import("happy-dom").Element} target */
        observe(target) {
            this.targets.add(target);
        }
        /** @param {import("happy-dom").Element[]} targets */
        show(...targets) {
            this.callback(
                targets.map(
                    (target) =>
                        new IntersectionObserverEntry({
                            isIntersecting: true,
                            target,
                        })
                ),
                this
            );
        }
        /** @override @param {import("happy-dom").Element} target */
        unobserve(target) {
            this.targets.delete(target);
        }
    }
    /** @param {Window} window */
    const configureWindow = (window) => {
        Object.defineProperties(window, {
            caches: {
                value: {
                    open: vi.fn((/** @type {string} */ _name) =>
                        openFails
                            ? Promise.reject(new Error("Storage blocked"))
                            : Promise.resolve(cache)
                    ),
                },
            },
            fetch: { value: fetch },
            IntersectionObserver: { value: PortraitObserver },
            Response: { value: Response },
        });
        let objectUrlCount = 0;
        vi.spyOn(window.URL, "createObjectURL").mockReturnValue(
            `blob:portrait-${objectUrlCount++}`
        );
    };
    return { cache, configureWindow, fetch, observers, saved };
}

/**
 * @param {{
 *     attemptedAt?: string;
 *     plantId?: string;
 *     requestId?: string;
 *     weight?: string;
 * }} [options]
 *
 * @returns {import("../logger-fixtures.d.ts").QueuedObservation}
 */
function queuedWeight({
    attemptedAt,
    plantId = "P01",
    requestId = "garden-queued-weight-12345",
    weight = "430",
} = {}) {
    return {
        addedAt: "2026-08-16T12:00:00.000Z",
        requestId,
        ...(attemptedAt !== undefined && { attemptedAt }),
        payload: {
            condition: "",
            events: ["Weigh"],
            flowerCount: "",
            flowerDetails: "",
            height: "",
            notes: "",
            nutrientAmount: "",
            nutrientProduct: "",
            nutrientsUsed: "",
            observedAt: "2026-08-16T12:00:00.000Z",
            pestIssue: "",
            pestTreatment: "",
            photoUrl: "",
            plantId,
            potSetup: "2",
            potSize: "",
            rotationDegrees: "",
            weight,
            weightState: "Routine",
            width: "",
        },
    };
}

async function restoreLoggerMocks() {
    for (const [timer, clearTimer] of loggerTimers) clearTimer(timer);
    loggerTimers.clear();
    await Promise.all(
        [...loggerWindows].map((window) => window.happyDOM.close())
    );
    loggerWindows.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
}

describe("garden logger bootstrap cache and connection recovery", () => {
    afterEach(restoreLoggerMocks);

    it("opens from a recent saved plant list while Google refreshes in the background", () => {
        expect.hasAssertions();

        /**
         * @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getWebAppBootstrap">
         *     | undefined}
         */
        let refreshHandlers;
        const { calls, window } = createLoggerWindow({
            bootstrapBehavior: (handlers) => {
                refreshHandlers = handlers;
            },
            storage: {
                gardenLoggerBootstrapV2: JSON.stringify({
                    bootstrap,
                    savedAt: Date.now(),
                }),
            },
        });

        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(1);
        expect(
            queryElement(window.document, "#loading", HTMLElement).hidden
        ).toBe(true);
        expect(
            queryElement(window.document, "#modeTabs", HTMLElement).hidden
        ).toBe(false);
        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toBe("Using saved plant list · refreshing Google…");
        expect(
            queryElement(window.document, "#observedAt", HTMLInputElement).value
        ).not.toContain("2026-08-15");

        required(refreshHandlers).success({ ...bootstrap, version: "fresh" });

        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toBe("Connected · logger fresh");

        const storedBootstrap = parseStoredRecord(
            window.localStorage.getItem("gardenLoggerBootstrapV2")
        );

        expect(jsonRecord(storedBootstrap["bootstrap"])["version"]).toBe(
            "fresh"
        );
    });

    it("keeps the cached logger usable when its background refresh fails", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapBehavior: ({ failure }) => {
                failure({ message: "Storage unavailable" });
            },
            storage: {
                gardenLoggerBootstrapV2: JSON.stringify({
                    bootstrap,
                    savedAt: Date.now(),
                }),
            },
        });

        expect(
            queryElement(window.document, "#loading", HTMLElement).hidden
        ).toBe(true);
        expect(
            queryElement(window.document, "#modeTabs", HTMLElement).hidden
        ).toBe(false);
        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toBe("Using saved plant list · Google refresh unavailable");
    });

    it("ignores an expired saved plant list and requests current data", () => {
        expect.hasAssertions();

        const { calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerBootstrapV2: JSON.stringify({
                    bootstrap,
                    savedAt: Date.now() - 6 * 60 * 60 * 1000 - 1,
                }),
            },
        });

        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(1);
        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toBe("Connected · logger test");

        const storedBootstrap = parseStoredRecord(
            window.localStorage.getItem("gardenLoggerBootstrapV2")
        );

        expect(jsonRecord(storedBootstrap["bootstrap"])["version"]).toBe(
            "test"
        );
    });

    it("automatically retries a dropped bootstrap callback and clears its watchdog after recovery", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        let attempt = 0;
        const { calls, window } = createLoggerWindow({
            bootstrapBehavior: ({ success }) => {
                attempt += 1;
                if (attempt === 2) success(bootstrap);
            },
        });

        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(1);

        vi.advanceTimersByTime(20_000);

        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(2);
        expect(
            queryElement(window.document, "#loading", HTMLElement).hidden
        ).toBe(true);
        expect(
            queryElement(window.document, "#modeTabs", HTMLElement).hidden
        ).toBe(false);
        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toBe("Connected · logger test");

        vi.advanceTimersByTime(20_000);

        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(2);
    });

    it("replaces an endless loading state with recovery controls and supports a manual retry", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        let shouldSucceed = false;
        const { calls, window } = createLoggerWindow({
            bootstrapBehavior: ({ success }) => {
                if (shouldSucceed) success(bootstrap);
            },
        });

        vi.advanceTimersByTime(40_000);

        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(2);
        expect(
            queryElement(window.document, "#loadingTitle", HTMLElement)
                .textContent
        ).toBe("Could not finish loading your plants.");
        expect(
            queryElement(window.document, "#loadingDetail", HTMLElement)
                .textContent
        ).toMatch(/did not answer within 20 seconds/v);
        expect(
            queryElement(window.document, "#loadingActions", HTMLElement).hidden
        ).toBe(false);
        expect(
            queryElement(window.document, "#loadingSpinner", HTMLElement).hidden
        ).toBe(true);
        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toBe("Connection failed");

        shouldSucceed = true;
        queryElement(
            window.document,
            "#retryBootstrapButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(3);
        expect(
            queryElement(window.document, "#loading", HTMLElement).hidden
        ).toBe(true);
        expect(
            queryElement(window.document, "#modeTabs", HTMLElement).hidden
        ).toBe(false);
    });

    it("ignores a late callback from an expired bootstrap attempt", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getWebAppBootstrap">[]} */
        const attempts = [];
        const { window } = createLoggerWindow({
            bootstrapBehavior: (handlers) => {
                attempts.push(handlers);
            },
        });

        vi.advanceTimersByTime(20_000);

        expect(attempts).toHaveLength(2);

        required(attempts[0]).success({ ...bootstrap, version: "stale" });

        expect(
            queryElement(window.document, "#modeTabs", HTMLElement).hidden
        ).toBe(true);
        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toBe("Retrying the spreadsheet connection…");

        required(attempts[1]).success(bootstrap);

        expect(
            queryElement(window.document, "#modeTabs", HTMLElement).hidden
        ).toBe(false);
        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toBe("Connected · logger test");

        required(attempts[1]).failure({ message: "Late failure" });

        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toBe("Connected · logger test");
    });

    it("shows a useful recovery state when Google reports a bootstrap failure", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapBehavior: ({ failure }) => {
                failure({});
            },
        });

        expect(
            queryElement(window.document, "#loadingTitle", HTMLElement)
                .textContent
        ).toBe("Could not finish loading garden data.");
        expect(
            queryElement(window.document, "#loadingDetail", HTMLElement)
                .textContent
        ).toMatch(/Google did not return an error message/v);
        expect(
            queryElement(window.document, "#loadingActions", HTMLElement).hidden
        ).toBe(false);
    });

    it("starts safely when browser storage and theme detection are unavailable", () => {
        expect.hasAssertions();

        const { calls, window } = createLoggerWindow({
            matchMediaUnavailable: true,
            storageUnavailable: true,
        });

        expect(window.document.documentElement.dataset["theme"]).toBe("light");
        expect(
            queryElement(window.document, "#loading", HTMLElement).hidden
        ).toBe(true);
        expect(
            queryElement(window.document, "#connectionStatus", HTMLElement)
                .textContent
        ).toBe("Connected · logger test");
        expect(calls.some((call) => call.method === "getWebAppBootstrap")).toBe(
            true
        );

        expect(() =>
            queryElement(
                window.document,
                "#themeToggle",
                HTMLButtonElement
            ).dispatchEvent(new window.Event("click", { bubbles: true }))
        ).not.toThrow();
        expect(window.document.documentElement.dataset["theme"]).toBe("dark");
    });
});

describe("garden logger single-save and watering-round recovery", () => {
    afterEach(restoreLoggerMocks);

    it("automatically clears a recovered draft that already reached History", () => {
        expect.hasAssertions();

        const pendingSave = {
            payload: {
                condition: "",
                events: ["Weigh"],
                flowerCount: "",
                flowerDetails: "",
                height: "",
                notes: "",
                nutrientAmount: "",
                nutrientProduct: "",
                nutrientsUsed: "",
                observedAt: "2026-08-15T14:00:00.000Z",
                pestIssue: "",
                pestTreatment: "",
                photoUrl: "",
                plantId: "P01",
                potSetup: "2",
                potSize: "",
                weight: "420",
                weightState: "Routine",
                width: "",
            },
            requestId: "garden-recovered-12345",
        };
        const { calls, window } = createLoggerWindow({
            pendingSave,
            saveStatus: "saved",
        });

        expect(
            window.localStorage.getItem("gardenLoggerPendingSaveV1")
        ).toBeNull();
        expect(
            queryElement(window.document, "#weight", HTMLInputElement).value
        ).toBe("");
        expect(
            queryElement(window.document, "#toast", HTMLElement).textContent
        ).toMatch(/already in History/v);
        expect(calls.some((call) => call.method === "getWebSaveStatus")).toBe(
            true
        );
    });

    it("keeps an unconfirmed recovered draft available for a safe retry", () => {
        expect.hasAssertions();

        const pendingSave = {
            payload: {
                condition: "",
                events: ["Weigh"],
                flowerCount: "",
                flowerDetails: "",
                height: "",
                notes: "",
                nutrientAmount: "",
                nutrientProduct: "",
                nutrientsUsed: "",
                observedAt: "2026-08-15T14:00:00.000Z",
                pestIssue: "",
                pestTreatment: "",
                photoUrl: "",
                plantId: "P01",
                potSetup: "2",
                potSize: "",
                weight: "421",
                weightState: "Routine",
                width: "",
            },
            requestId: "garden-missing-12345",
        };
        const { window } = createLoggerWindow({ pendingSave });

        expect(
            parseStoredRecord(
                window.localStorage.getItem("gardenLoggerPendingSaveV1")
            )
        ).toStrictEqual(pendingSave);
        expect(
            queryElement(window.document, "#weight", HTMLInputElement).value
        ).toBe("421");
        expect(
            queryElement(window.document, "#measurementUnit", HTMLSelectElement)
                .value
        ).toBe("cm");
        expect(
            queryElement(window.document, "#heightLabel", HTMLElement)
                .textContent
        ).toBe("Height (cm)");
        expect(
            queryElement(window.document, "#saveButton", HTMLButtonElement)
                .disabled
        ).toBe(false);
    });

    it("releases a hanging save after the watchdog and checks History", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveWebObservation = () => {};

        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        weight.value = "422";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        queryElement(
            window.document,
            "#entryForm",
            HTMLFormElement
        ).dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        expect(
            queryElement(window.document, "#saveButton", HTMLButtonElement)
                .disabled
        ).toBe(true);

        vi.advanceTimersByTime(20_000);

        expect(
            queryElement(window.document, "#saveButton", HTMLButtonElement)
                .disabled
        ).toBe(false);
        expect(
            parseStoredRecord(
                window.localStorage.getItem("gardenLoggerPendingSaveV1")
            )
        ).toMatchObject({ payload: { plantId: "P01", weight: "422" } });
        expect(calls.some((call) => call.method === "getWebSaveStatus")).toBe(
            true
        );
    });

    it("ignores a late callback from an older retry attempt", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const { behaviors, window } = createLoggerWindow();
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"saveWebObservation">[]} */
        const saves = [];
        behaviors.saveWebObservation = (handlers) => {
            saves.push(handlers);
        };

        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        weight.value = "423";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        const form = queryElement(
            window.document,
            "#entryForm",
            HTMLFormElement
        );
        form.dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );
        vi.advanceTimersByTime(20_000);
        form.dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        expect(saves).toHaveLength(2);
        expect(
            queryElement(window.document, "#saveButton", HTMLButtonElement)
                .disabled
        ).toBe(true);

        required(saves[0]).failure({ message: "Late failure" });

        expect(
            queryElement(window.document, "#saveButton", HTMLButtonElement)
                .disabled
        ).toBe(true);

        required(saves[1]).success({ message: "Saved" });

        expect(
            queryElement(window.document, "#saveButton", HTMLButtonElement)
                .disabled
        ).toBe(false);
        expect(
            window.localStorage.getItem("gardenLoggerPendingSaveV1")
        ).toBeNull();
    });

    it("lets a confirmed failed entry be corrected without Clear entry", () => {
        expect.hasAssertions();

        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveWebObservation = ({ failure }) => {
            failure({ message: "Server rejected the entry" });
        };

        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        const form = queryElement(
            window.document,
            "#entryForm",
            HTMLFormElement
        );
        weight.value = "424";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        form.dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        const firstSave = calls.find(
            (call) => call.method === "saveWebObservation"
        );
        const failedPending = parseStoredRecord(
            window.localStorage.getItem("gardenLoggerPendingSaveV1")
        );

        expect(failedPending["replaceable"]).toBe(true);

        weight.value = "425";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        form.dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        const saveCalls = calls.filter(
            (call) => call.method === "saveWebObservation"
        );

        expect(saveCalls).toHaveLength(2);
        expect(required(saveCalls[1]).args[0].requestId).not.toBe(
            required(firstSave).args[0].requestId
        );
        expect(required(saveCalls[1]).args[0].weight).toBe("425");
    });

    it("does not replace a timed-out request that may still be running", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveWebObservation = () => {};

        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        const form = queryElement(
            window.document,
            "#entryForm",
            HTMLFormElement
        );
        weight.value = "426";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        form.dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );
        vi.advanceTimersByTime(20_000);

        weight.value = "427";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        form.dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        expect(
            calls.filter((call) => call.method === "saveWebObservation")
        ).toHaveLength(1);
        expect(
            parseStoredRecord(
                window.localStorage.getItem("gardenLoggerPendingSaveV1")
            )["replaceable"]
        ).not.toBe(true);
    });

    it("also releases and reconciles a hanging watering-round save", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveBulkCareObservation = () => {};

        queryElement(
            window.document,
            "#bulkModeTab",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        queryElement(
            window.document,
            "#bulkNutrientsUsed",
            HTMLSelectElement
        ).value = "No";
        const checkbox = queryElement(
            window.document,
            "#bulkPlantList input[type='checkbox']",
            HTMLInputElement
        );
        checkbox.checked = true;
        checkbox.dispatchEvent(new window.Event("change", { bubbles: true }));
        queryElement(
            window.document,
            "#bulkWaterForm",
            HTMLFormElement
        ).dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        expect(
            queryElement(window.document, "#bulkSaveButton", HTMLButtonElement)
                .disabled
        ).toBe(true);

        vi.advanceTimersByTime(20_000);

        expect(
            queryElement(window.document, "#bulkSaveButton", HTMLButtonElement)
                .disabled
        ).toBe(false);
        expect(
            parseStoredRecord(
                window.localStorage.getItem("gardenLoggerBulkPendingV1")
            )
        ).toMatchObject({
            payload: {
                events: ["Water"],
                nutrientsUsed: "No",
                plantIds: ["P01"],
            },
        });
        expect(calls.some((call) => call.method === "getWebSaveStatus")).toBe(
            true
        );

        queryElement(window.document, "#bulkNotes", HTMLTextAreaElement).value =
            "Changed round";
        queryElement(
            window.document,
            "#bulkWaterForm",
            HTMLFormElement
        ).dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        expect(
            calls.filter((call) => call.method === "saveBulkCareObservation")
        ).toHaveLength(1);
    });

    it("lets a confirmed failed watering round be corrected", () => {
        expect.hasAssertions();

        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveBulkCareObservation = ({ failure }) => {
            failure({ message: "Server rejected the round" });
        };

        queryElement(
            window.document,
            "#bulkModeTab",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        queryElement(
            window.document,
            "#bulkNutrientsUsed",
            HTMLSelectElement
        ).value = "No";
        const checkbox = queryElement(
            window.document,
            "#bulkPlantList input[type='checkbox']",
            HTMLInputElement
        );
        checkbox.checked = true;
        checkbox.dispatchEvent(new window.Event("change", { bubbles: true }));
        const form = queryElement(
            window.document,
            "#bulkWaterForm",
            HTMLFormElement
        );
        form.dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        const failedPending = parseStoredRecord(
            window.localStorage.getItem("gardenLoggerBulkPendingV1")
        );

        expect(failedPending["replaceable"]).toBe(true);

        queryElement(window.document, "#bulkNotes", HTMLTextAreaElement).value =
            "Corrected round";
        form.dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        const saveCalls = calls.filter(
            (call) => call.method === "saveBulkCareObservation"
        );

        expect(saveCalls).toHaveLength(2);
        expect(required(saveCalls[1]).args[0].requestId).not.toBe(
            required(saveCalls[0]).args[0].requestId
        );
    });
});

describe("garden logger observation entry and preferences", () => {
    afterEach(restoreLoggerMocks);

    it("queues a weight without asking for a manual state or adding Water", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();

        expect(window.document.querySelector("#weightStates")).toBeNull();

        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        weight.value = "889";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        queryElement(
            window.document,
            "#queueButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        const queue = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );

        expect(queue).toHaveLength(1);
        expect(required(queue[0]).payload).toMatchObject({
            events: ["Weigh"],
            nutrientsUsed: "",
            weight: "889",
        });
        expect(required(queue[0]).payload).not.toHaveProperty("weightState");
    });

    it("remembers nutrient choices across single and bulk care in one session", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const water = queryElement(
            window.document,
            '#eventChips [data-event="Water"]',
            HTMLElement
        );
        water.dispatchEvent(new window.Event("click", { bubbles: true }));
        const nutrients = queryElement(
            window.document,
            "#nutrientsUsed",
            HTMLSelectElement
        );
        const product = queryElement(
            window.document,
            "#nutrientProduct",
            HTMLSelectElement
        );
        const amount = queryElement(
            window.document,
            "#nutrientAmount",
            HTMLInputElement
        );
        nutrients.value = "Yes";
        nutrients.dispatchEvent(new window.Event("change", { bubbles: true }));
        product.value = "MSU 13-3-15";
        product.dispatchEvent(new window.Event("input", { bubbles: true }));
        amount.value = "0.5 g/gal";
        amount.dispatchEvent(new window.Event("input", { bubbles: true }));

        queryElement(
            window.document,
            "#queueButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        queryElement(
            window.document,
            "#bulkModeTab",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            queryElement(
                window.document,
                "#bulkNutrientsUsed",
                HTMLSelectElement
            ).value
        ).toBe("Yes");
        expect(
            queryElement(
                window.document,
                "#bulkNutrientProduct",
                HTMLSelectElement
            ).value
        ).toBe("MSU 13-3-15");
        expect(
            queryElement(
                window.document,
                "#bulkNutrientAmount",
                HTMLInputElement
            ).value
        ).toBe("0.5 g/gal");
        expect(
            parseStoredJson(
                window.sessionStorage.getItem("gardenLoggerNutrientStateV1")
            )
        ).toStrictEqual({
            nutrientAmount: "0.5 g/gal",
            nutrientProduct: "MSU 13-3-15",
            nutrientsUsed: "Yes",
        });
    });

    it("queues a 90 degree rotation and submits bulk rotation generically", () => {
        expect.hasAssertions();

        const { behaviors, calls, window } = createLoggerWindow();
        queryElement(
            window.document,
            '#eventChips [data-event="Rotation"]',
            HTMLElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            queryElement(window.document, "#rotationDegrees", HTMLInputElement)
                .value
        ).toBe("90");

        queryElement(
            window.document,
            "#queueButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        const queue = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );

        expect(required(queue[0]).payload).toMatchObject({
            events: ["Rotation"],
            rotationDegrees: "90",
        });

        behaviors.saveBulkCareObservation = ({ success }) => {
            success({ message: "Rotation saved." });
        };
        queryElement(
            window.document,
            "#bulkModeTab",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        queryElement(
            window.document,
            '#bulkEventChips [data-event="Water"]',
            HTMLElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        queryElement(
            window.document,
            '#bulkEventChips [data-event="Rotation"]',
            HTMLElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        const checkbox = queryElement(
            window.document,
            "#bulkPlantList input[type='checkbox']",
            HTMLInputElement
        );
        checkbox.checked = true;
        checkbox.dispatchEvent(new window.Event("change", { bubbles: true }));
        queryElement(
            window.document,
            "#bulkWaterForm",
            HTMLFormElement
        ).dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        const call = calls.find(
            (candidate) => candidate.method === "saveBulkCareObservation"
        );

        expect(required(call).args[0]).toMatchObject({
            entrySource: "Mobile bulk care",
            events: ["Rotation"],
            rotationDegrees: "90",
        });
    });

    it("queues a reading locally without changing the selected plant", () => {
        expect.hasAssertions();

        const { calls, window } = createLoggerWindow();
        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        weight.value = "430";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));

        queryElement(
            window.document,
            "#queueButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        const queue = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );

        expect(queue).toHaveLength(1);
        expect(required(queue[0]).payload).toMatchObject({
            plantId: "P01",
            weight: "430",
        });
        expect(
            queryElement(window.document, "#plantSelect", HTMLSelectElement)
                .value
        ).toBe("P01");
        expect(
            queryElement(window.document, "#weight", HTMLInputElement).value
        ).toBe("");
        expect(calls.some((call) => call.method === "saveWebObservation")).toBe(
            false
        );

        queryElement(
            window.document,
            "#labelPickerMode",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        const queuedButton = queryElement(
            window.document,
            '#labelPicker [data-plant-id="P01"]',
            HTMLElement
        );

        expect(queuedButton.classList.contains("queued-weighed")).toBe(true);
        expect(queuedButton.getAttribute("aria-label")).toMatch(
            /weight safely queued/v
        );
        expect(
            queryElement(window.document, "#queueProgress", HTMLElement)
                .textContent
        ).toBe("1 of 2 plants have a weight safely queued.");
    });

    it("defaults measurements to inches, remembers the method, and shows dimensions in the queue", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const unit = queryElement(
            window.document,
            "#measurementUnit",
            HTMLSelectElement
        );
        const quality = queryElement(
            window.document,
            "#measurementQuality",
            HTMLSelectElement
        );
        const method = queryElement(
            window.document,
            "#measurementMethod",
            HTMLSelectElement
        );

        expect(unit.value).toBe("in");
        expect(quality.value).toBe("Measured");
        expect(method.value).toBe("Ruler");
        expect(
            queryElement(window.document, "#heightLabel", HTMLElement)
                .textContent
        ).toBe("Height (in)");

        method.value = "Estimated from photo";
        method.dispatchEvent(new window.Event("change", { bubbles: true }));

        expect(quality.value).toBe("Estimated");

        method.value = "Ruler";
        method.dispatchEvent(new window.Event("change", { bubbles: true }));

        expect(quality.value).toBe("Measured");

        const height = queryElement(
            window.document,
            "#height",
            HTMLInputElement
        );
        const width = queryElement(window.document, "#width", HTMLInputElement);
        height.value = "3.35";
        height.dispatchEvent(new window.Event("input", { bubbles: true }));
        width.value = "2.5";
        width.dispatchEvent(new window.Event("input", { bubbles: true }));
        queryElement(
            window.document,
            "#queueButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        const queue = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );

        expect(required(queue[0]).payload).toMatchObject({
            height: "3.35",
            measurementMethod: "Ruler",
            measurementQuality: "Measured",
            measurementUnit: "in",
            width: "2.5",
        });
        expect(
            queryElement(window.document, "#queueList", HTMLElement).textContent
        ).toMatch(/3\.35 × 2\.5 in/v);
        expect(unit.value).toBe("in");
        expect(method.value).toBe("Ruler");
        expect(quality.value).toBe("Measured");
        expect(
            parseStoredJson(
                window.localStorage.getItem("gardenLoggerRoundStateV1")
            )
        ).toMatchObject({
            measurementMethod: "Ruler",
            measurementQuality: "Measured",
            measurementUnit: "in",
        });
    });

    it("keeps weight controls closed until a weight is being recorded", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const weightSection = queryElement(
            window.document,
            "#weightSection",
            HTMLElement
        );

        expect(weightSection.classList.contains("visible")).toBe(false);

        const weighChip = queryElement(
            window.document,
            '[data-event="Weigh"]',
            HTMLElement
        );
        weighChip.dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(weightSection.classList.contains("visible")).toBe(true);

        weighChip.dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(weightSection.classList.contains("visible")).toBe(false);
    });

    it("queues the current weight when Enter is pressed in the weight box", () => {
        expect.hasAssertions();

        const { calls, window } = createLoggerWindow();
        const weighChip = queryElement(
            window.document,
            '[data-event="Weigh"]',
            HTMLElement
        );
        weighChip.dispatchEvent(new window.Event("click", { bubbles: true }));
        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        weight.value = "431.2";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));

        weight.dispatchEvent(
            new window.KeyboardEvent("keydown", {
                bubbles: true,
                cancelable: true,
                key: "Enter",
            })
        );

        const queue = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );

        expect(queue).toHaveLength(1);
        expect(required(queue[0]).payload).toMatchObject({
            plantId: "P01",
            weight: "431.2",
        });
        expect(weight.value).toBe("");
        expect(calls.some((call) => call.method === "saveWebObservation")).toBe(
            false
        );
    });

    it("can optionally advance after queueing and remembers that preference", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const advance = queryElement(
            window.document,
            "#advanceAfterQueue",
            HTMLInputElement
        );
        advance.checked = true;
        advance.dispatchEvent(new window.Event("change", { bubbles: true }));
        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        weight.value = "430";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));

        queryElement(
            window.document,
            "#queueButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            queryElement(window.document, "#plantSelect", HTMLSelectElement)
                .value
        ).toBe("P02");
        expect(
            parseStoredRecord(
                window.localStorage.getItem("gardenLoggerRoundStateV1")
            )["advanceAfterQueue"]
        ).toBe(true);
    });
});

describe("garden logger plant selection and label ordering", () => {
    afterEach(restoreLoggerMocks);

    it("restores the label-button picker and remembers a selected plant", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            storage: {
                gardenLoggerPlantPickerModeV1: "labels",
                gardenPlantId: "P02",
            },
        });

        expect(
            queryElement(window.document, "#labelPicker", HTMLElement).hidden
        ).toBe(false);
        expect(
            queryElement(
                window.document,
                '#labelPicker [data-plant-id="P02"]',
                HTMLElement
            ).getAttribute("aria-pressed")
        ).toBe("true");

        queryElement(
            window.document,
            '#labelPicker [data-plant-id="P01"]',
            HTMLElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            queryElement(window.document, "#plantSelect", HTMLSelectElement)
                .value
        ).toBe("P01");
        expect(window.localStorage.getItem("gardenPlantId")).toBe("P01");
    });

    it("keeps loaded label portraits and keyboard focus during repeated plant selections", async () => {
        expect.hasAssertions();

        const fixture = portraitCacheFixture();
        const { window } = createLoggerWindow({
            ...fixture,
            storage: { gardenLoggerPlantPickerModeV1: "labels" },
        });
        const picker = queryElement(
            window.document,
            "#labelPicker",
            HTMLElement
        );
        const buttons = queryElements(
            picker,
            ":scope > button",
            HTMLButtonElement
        );
        const portraits = buttons.map((button) =>
            queryElement(button, "img", HTMLImageElement)
        );
        required(fixture.observers[0]).show(...portraits);
        await vi.waitFor(() => {
            expect(
                portraits.every((image) => image.src.startsWith("blob:"))
            ).toBe(true);
        });
        const sources = portraits.map((image) => image.src);

        for (const index of [
            1,
            0,
            1,
            1,
        ]) {
            const button = buttons[index];
            required(button).focus();
            required(button).click();

            expect(window.document.activeElement).toBe(button);

            for (const [position, original] of buttons.entries()) {
                expect(picker.children[position]).toBe(original);
                expect(queryElement(original, "img", HTMLImageElement)).toBe(
                    portraits[position]
                );
                expect(required(portraits[position]).src).toBe(
                    sources[position]
                );
                expect(original.getAttribute("aria-pressed")).toBe(
                    String(position === index)
                );
            }
        }

        expect(fixture.fetch).toHaveBeenCalledTimes(2);
        expect(window.localStorage.getItem("gardenPlantId")).toBe("P02");
    });

    it("reconciles refreshed plant labels without replacing unchanged portraits", () => {
        expect.hasAssertions();

        /**
         * @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getWebAppBootstrap">
         *     | undefined}
         */
        let refreshHandlers;
        const fixture = portraitCacheFixture();
        const { window } = createLoggerWindow({
            ...fixture,
            bootstrapBehavior: (handlers) => {
                refreshHandlers = handlers;
            },
            storage: {
                gardenLoggerBootstrapV2: JSON.stringify({
                    bootstrap,
                    savedAt: Date.now(),
                }),
                gardenLoggerPlantPickerModeV1: "labels",
            },
        });
        const picker = queryElement(
            window.document,
            "#labelPicker",
            HTMLElement
        );
        const original = queryElement(
            picker,
            '[data-plant-id="P01"]',
            HTMLElement
        );
        const originalPortrait = queryElement(
            original,
            "img",
            HTMLImageElement
        );
        const removed = queryElement(
            picker,
            '[data-plant-id="P02"] img',
            HTMLImageElement
        );
        required(refreshHandlers).success({
            ...bootstrap,
            plants: [
                {
                    ...required(bootstrap.plants[0]),
                    label: "H3",
                    name: "Updated moon cactus",
                },
                { ...bootstrap.plants[1], id: "P03", label: "A2" },
            ],
        });

        expect(
            structuredClone(
                queryElements(picker, ":scope > button", HTMLButtonElement).map(
                    (button) => button.dataset["plantId"]
                )
            )
        ).toStrictEqual(["P03", "P01"]);
        expect(picker.querySelector(":scope > :nth-child(2)")).toBe(original);
        expect(queryElement(original, "img", HTMLImageElement)).toBe(
            originalPortrait
        );
        expect(queryElement(original, "span", HTMLElement).textContent).toBe(
            "H3"
        );
        expect(original.getAttribute("aria-label")).toContain(
            "Updated moon cactus"
        );
        expect(removed.isConnected).toBe(false);
        expect(required(fixture.observers[0]).targets.has(removed)).toBe(false);
        expect(
            [...required(fixture.observers[0]).targets].every(
                (image) => image.isConnected
            )
        ).toBe(true);
    });

    it("replaces a label portrait only when the plant's artwork mapping changes", () => {
        expect.hasAssertions();

        /**
         * @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getWebAppBootstrap">
         *     | undefined}
         */
        let refreshHandlers;
        const fixture = portraitCacheFixture();
        const { window } = createLoggerWindow({
            ...fixture,
            bootstrapBehavior: (handlers) => {
                refreshHandlers = handlers;
            },
            storage: {
                gardenLoggerBootstrapV2: JSON.stringify({
                    bootstrap,
                    savedAt: Date.now(),
                }),
                gardenLoggerPlantPickerModeV1: "labels",
            },
        });
        const picker = queryElement(
            window.document,
            "#labelPicker",
            HTMLElement
        );
        const replaced = queryElement(
            required(picker.firstElementChild),
            "img",
            HTMLImageElement
        );
        const retained = queryElement(
            queryElement(picker, ":scope > :nth-child(2)", HTMLButtonElement),
            "img",
            HTMLImageElement
        );
        required(refreshHandlers).success({
            ...bootstrap,
            plants: [
                {
                    ...required(bootstrap.plants[0]),
                    fieldGuideUrl:
                        "https://example.test/guide#mammillaria-plumosa",
                },
                bootstrap.plants[1],
            ],
        });

        expect(replaced.isConnected).toBe(false);
        expect(required(fixture.observers[0]).targets.has(replaced)).toBe(
            false
        );
        expect(
            queryElement(
                required(picker.firstElementChild),
                "img",
                HTMLImageElement
            ).dataset["portraitUrl"]
        ).toContain("mammillaria-plumosa.svg");
        expect(
            queryElement(
                queryElement(
                    picker,
                    ":scope > :nth-child(2)",
                    HTMLButtonElement
                ),
                "img",
                HTMLImageElement
            )
        ).toBe(retained);
    });

    it("sorts lettered labels before numbered planters while keeping requests in P order", () => {
        expect.hasAssertions();

        const bootstrapData = canonicalBootstrap();
        const canonicalIds = bootstrapData.plants.map(({ id }) => id);
        const { behaviors, calls, window } = createLoggerWindow({
            bootstrapData,
        });

        expect(
            structuredClone(
                [
                    ...queryElements(
                        window.document,
                        "#plantSelect option",
                        HTMLOptionElement
                    ),
                ].map(({ value }) => value)
            )
        ).toStrictEqual(canonicalIds);

        queryElement(
            window.document,
            "#labelPickerMode",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            structuredClone(
                [
                    ...queryElements(
                        window.document,
                        "#labelPicker button",
                        HTMLButtonElement
                    ),
                ].map(({ dataset }) => dataset["plantId"])
            )
        ).toStrictEqual([
            ...canonicalIds.slice(0, 18),
            "P27",
            "P23",
            "P28",
            "P24",
            "P25",
            "P26",
            "P19",
            "P20",
            "P21",
            "P22",
            "P29",
            "P30",
        ]);

        queryElement(
            window.document,
            "#bulkModeTab",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            structuredClone(
                [
                    ...queryElements(
                        window.document,
                        "#bulkPlantList input[type='checkbox']",
                        HTMLInputElement
                    ),
                ].map(({ value }) => value)
            )
        ).toStrictEqual(canonicalIds);

        queryElement(
            window.document,
            "#bulkLabelPickerMode",
            HTMLButtonElement
        ).click();

        expect(
            structuredClone(
                [
                    ...queryElements(
                        window.document,
                        "#bulkPlantList [data-bulk-plant-id]",
                        HTMLElement
                    ),
                ].map(({ dataset }) => dataset["bulkPlantId"])
            )
        ).toStrictEqual(
            [
                ...queryElements(
                    window.document,
                    "#labelPicker button",
                    HTMLButtonElement
                ),
            ].map(({ dataset }) => dataset["plantId"])
        );

        queryElement(
            window.document,
            "#bulkListPickerMode",
            HTMLButtonElement
        ).click();

        for (const plantId of [
            "P28",
            "P01",
            "P27",
        ]) {
            const checkbox = queryElement(
                window.document,
                `#bulkPlantList input[value="${window.CSS.escape(plantId)}"]`,
                HTMLInputElement
            );
            checkbox.checked = true;
            checkbox.dispatchEvent(
                new window.Event("change", { bubbles: true })
            );
        }
        queryElement(
            window.document,
            "#bulkNutrientsUsed",
            HTMLSelectElement
        ).value = "No";
        behaviors.saveBulkCareObservation = ({ success }) => {
            success({ message: "Bulk care saved." });
        };
        queryElement(
            window.document,
            "#bulkWaterForm",
            HTMLFormElement
        ).dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        const submittedPlantIds = structuredClone(
            required(
                calls.find((call) => call.method === "saveBulkCareObservation")
            ).args[0].plantIds
        );

        expect(submittedPlantIds).toStrictEqual([
            "P01",
            "P27",
            "P28",
        ]);
    });

    it("uses the same natural order for the public tracker and history pager", () => {
        expect.hasAssertions();

        const orderedLabels = canonicalPlantLabels
            .map((label, index) => ({
                "Current pot label": label,
                "Plant ID": `P${String(index + 1).padStart(2, "0")}`,
            }))
            .toSorted(comparePlantsByNaturalLabel)
            .map((plant) => plant["Current pot label"]);

        expect(structuredClone(orderedLabels)).toStrictEqual([
            ...canonicalPlantLabels.slice(0, 18),
            "G1",
            "G2",
            "G3",
            "H1",
            "H2",
            "H3",
            "#1",
            "#2",
            "#3",
            "#4",
            "#5",
            "#6",
        ]);
    });
});

describe("garden logger bulk selection and form layout", () => {
    afterEach(restoreLoggerMocks);

    it("keeps bulk selections, filters, and SVG portraits across list and label views", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const elementById = (/** @type {string} */ selector) =>
            queryElement(window.document, selector, HTMLElement);
        const click = (/** @type {string} */ selector) => {
            elementById(selector).click();
        };
        click("#bulkModeTab");

        expect(
            queryElement(
                window.document,
                "#bulkPlantList .bulk-plant img",
                HTMLImageElement
            ).getAttribute("src")
        ).toContain("gymnocalycium-mihanovichii-variegated.svg");

        const checkbox = queryElement(
            window.document,
            '#bulkPlantList input[value="P01"]',
            HTMLInputElement
        );
        checkbox.checked = true;
        checkbox.dispatchEvent(new window.Event("change", { bubbles: true }));
        click("#bulkLabelPickerMode");

        expect(
            queryElement(
                window.document,
                '#bulkPlantList [data-bulk-plant-id="P01"]',
                HTMLElement
            ).getAttribute("aria-pressed")
        ).toBe("true");
        expect(
            queryElement(
                window.document,
                '#bulkPlantList [data-bulk-plant-id="P02"] img',
                HTMLImageElement
            ).getAttribute("src")
        ).toContain("parodia-leninghausii.svg");

        click('#bulkPlantList [data-bulk-plant-id="P02"]');

        expect(
            queryElement(window.document, "#bulkCount", HTMLElement).textContent
        ).toBe("2 selected");

        queryElement(window.document, "#bulkSearch", HTMLInputElement).value =
            "Yellow";
        queryElement(
            window.document,
            "#bulkSearch",
            HTMLInputElement
        ).dispatchEvent(new window.Event("input", { bubbles: true }));
        click("#bulkListPickerMode");

        expect(
            queryElements(
                elementById("#bulkPlantList"),
                "input",
                HTMLInputElement
            )
        ).toHaveLength(1);
        expect(
            queryElement(
                window.document,
                '#bulkPlantList input[value="P02"]',
                HTMLInputElement
            ).checked
        ).toBe(true);

        click("#singleModeTab");
        click("#bulkModeTab");

        expect(
            queryElements(
                elementById("#bulkPlantList"),
                "input",
                HTMLInputElement
            )
        ).toHaveLength(1);
        expect(
            queryElement(window.document, "#bulkCount", HTMLElement).textContent
        ).toBe("2 selected");

        queryElement(window.document, "#bulkSearch", HTMLInputElement).value =
            "";
        queryElement(
            window.document,
            "#bulkSearch",
            HTMLInputElement
        ).dispatchEvent(new window.Event("input", { bubbles: true }));

        expect(
            queryElement(
                window.document,
                '#bulkPlantList input[value="P01"]',
                HTMLInputElement
            ).checked
        ).toBe(true);
        expect(
            queryElement(window.document, "#plantSelect", HTMLSelectElement)
                .value
        ).toBe("P01");

        click("#bulkLabelPickerMode");
        click('#bulkPlantList [data-bulk-plant-id="P01"]');

        expect(
            queryElement(
                window.document,
                '#bulkPlantList [data-bulk-plant-id="P01"]',
                HTMLElement
            ).getAttribute("aria-pressed")
        ).toBe("false");
        expect(
            queryElement(window.document, "#bulkCount", HTMLElement).textContent
        ).toBe("1 selected");
        expect(
            window.localStorage.getItem("gardenLoggerBulkPickerModeV1")
        ).toBe("labels");
        expect(
            queryElement(
                window.document,
                "#listPickerMode",
                HTMLButtonElement
            ).getAttribute("aria-pressed")
        ).toBe("true");
    });

    it("restores the bulk label preference and selects only visible matches without losing hidden selections", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            storage: { gardenLoggerBulkPickerModeV1: "labels" },
        });

        queryElement(
            window.document,
            "#bulkModeTab",
            HTMLButtonElement
        ).click();

        expect(
            queryElement(
                window.document,
                "#bulkLabelPickerMode",
                HTMLButtonElement
            ).getAttribute("aria-pressed")
        ).toBe("true");

        queryElement(
            window.document,
            '#bulkPlantList [data-bulk-plant-id="P01"]',
            HTMLElement
        ).click();
        queryElement(window.document, "#bulkSearch", HTMLInputElement).value =
            "Yellow";
        queryElement(
            window.document,
            "#bulkSearch",
            HTMLInputElement
        ).dispatchEvent(new window.Event("input", { bubbles: true }));
        queryElement(
            window.document,
            "#bulkSelectVisible",
            HTMLButtonElement
        ).click();

        expect(
            queryElement(window.document, "#bulkCount", HTMLElement).textContent
        ).toBe("2 selected");

        queryElement(window.document, "#bulkSearch", HTMLInputElement).value =
            "no matching plant";
        queryElement(
            window.document,
            "#bulkSearch",
            HTMLInputElement
        ).dispatchEvent(new window.Event("input", { bubbles: true }));

        expect(
            queryElement(window.document, "#bulkPlantList", HTMLElement)
                .textContent
        ).toContain("Your other selections are kept");

        queryElement(
            window.document,
            "#bulkSelectVisible",
            HTMLButtonElement
        ).click();

        expect(
            queryElement(window.document, "#bulkCount", HTMLElement).textContent
        ).toBe("2 selected");

        queryElement(window.document, "#bulkClear", HTMLButtonElement).click();

        expect(
            queryElement(window.document, "#bulkCount", HTMLElement).textContent
        ).toBe("0 selected");
    });

    it("places the device queue and History after both forms and keeps a nonempty queue visible in bulk mode", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: {
                ...bootstrap,
                recent: [
                    {
                        event: "Weigh",
                        name: "Moon cactus",
                        observedAt: "Sep 5, 2026",
                        weight: 430,
                    },
                ],
            },
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify([
                    queuedWeight(),
                ]),
            },
        });

        const ids = [
            ...queryElement(window.document, ".workbench", HTMLElement)
                .children,
        ].map(({ id }) => id);

        expect(structuredClone(ids.slice(-4))).toStrictEqual([
            "entryForm",
            "bulkWaterForm",
            "queueCard",
            "recentCard",
        ]);
        expect(
            window.document.querySelector(".sidebar #recentCard")
        ).toBeNull();
        expect(
            queryElement(window.document, "#queueCard", HTMLElement).hidden
        ).toBe(false);

        queryElement(
            window.document,
            "#bulkModeTab",
            HTMLButtonElement
        ).click();

        expect(
            queryElement(window.document, "#queueCard", HTMLElement).hidden
        ).toBe(false);
        expect(
            queryElement(window.document, "#queueList", HTMLElement).textContent
        ).toContain("430");
        expect(
            queryElement(window.document, "#recentCard", HTMLElement).hidden
        ).toBe(false);
    });
});

describe("garden logger plant photos and portrait rendering", () => {
    afterEach(restoreLoggerMocks);

    it("shows honest accessible plant photos and hides absent image slots", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: canonicalBootstrap(),
            storage: { gardenPlantId: "P23" },
        });
        const summary = queryElement(
            window.document,
            "#plantSummary",
            HTMLElement
        );
        const images = [
            ...queryElements(
                summary,
                ".plant-photo-card img",
                HTMLImageElement
            ),
        ];

        expect(structuredClone(images.map(({ src }) => src))).toStrictEqual([
            p23ImageUrls.currentImageUrl,
            p23ImageUrls.nurseryLabelImageUrl,
        ]);
        expect(structuredClone(images.map(({ alt }) => alt))).toStrictEqual([
            "Current collection photograph of Plant P23 (P23).",
            "Nursery label evidence for Plant P23 (P23).",
        ]);
        expect(
            structuredClone(
                [
                    ...queryElements(
                        summary,
                        ".plant-photo-card figcaption",
                        HTMLElement
                    ),
                ].map(({ textContent }) => textContent)
            )
        ).toStrictEqual([
            "Current collection photograph",
            "Nursery label evidence",
        ]);

        const select = queryElement(
            window.document,
            "#plantSelect",
            HTMLSelectElement
        );
        select.value = "P22";
        select.dispatchEvent(new window.Event("change", { bubbles: true }));

        expect(
            queryElements(summary, ".plant-photo-card", HTMLElement)
        ).toHaveLength(0);
    });

    it("persists the photo preference and does not create hidden image requests", () => {
        expect.hasAssertions();

        const sourceWrites = vi.spyOn(HTMLImageElement.prototype, "src", "set");
        const bootstrapData = canonicalBootstrap();
        const hidden = createLoggerWindow({
            bootstrapData,
            storage: {
                gardenLoggerPhotosVisibleV1: "hidden",
                gardenPlantId: "P23",
            },
        }).window;
        const toggle = queryElement(
            hidden.document,
            "#plantSummary #plantDisplayTools #photoVisibilityToggle",
            HTMLButtonElement
        );
        const summary = queryElement(
            hidden.document,
            "#plantSummary",
            HTMLElement
        );
        const tools = queryElement(summary, "#plantDisplayTools", HTMLElement);
        const portrait = queryElement(
            summary,
            ".summary-portrait",
            HTMLImageElement
        );

        expect(summary.lastElementChild).toBe(tools);

        for (const url of Object.values(p23ImageUrls)) {
            expect(sourceWrites.mock.calls.flat()).not.toContain(url);
        }

        expect(
            queryElements(
                hidden.document,
                "#plantSummary .plant-photo-card img",
                HTMLImageElement
            )
        ).toHaveLength(0);
        expect(toggle.textContent).toContain("Show photos");
        expect(toggle.getAttribute("aria-pressed")).toBe("false");

        toggle.focus();
        toggle.click();

        expect(
            queryElement(summary, "#photoVisibilityToggle", HTMLButtonElement)
        ).toBe(toggle);
        expect(hidden.document.activeElement).toBe(toggle);
        expect(
            queryElement(summary, ".summary-portrait", HTMLImageElement)
        ).toBe(portrait);
        expect(
            queryElements(
                hidden.document,
                "#plantSummary .plant-photo-card img",
                HTMLImageElement
            )
        ).toHaveLength(2);
        expect(sourceWrites.mock.calls.flat()).toStrictEqual(
            expect.arrayContaining(Object.values(p23ImageUrls))
        );
        expect(hidden.localStorage.getItem("gardenLoggerPhotosVisibleV1")).toBe(
            "shown"
        );

        sourceWrites.mockClear();
        toggle.click();

        expect(
            queryElement(summary, "#photoVisibilityToggle", HTMLButtonElement)
        ).toBe(toggle);
        expect(hidden.document.activeElement).toBe(toggle);
        expect(
            queryElement(summary, ".summary-portrait", HTMLImageElement)
        ).toBe(portrait);
        expect(summary.lastElementChild).toBe(tools);

        for (const url of Object.values(p23ImageUrls)) {
            expect(sourceWrites.mock.calls.flat()).not.toContain(url);
        }

        expect(
            queryElements(
                hidden.document,
                "#plantSummary .plant-photo-card img",
                HTMLImageElement
            )
        ).toHaveLength(0);
        expect(hidden.localStorage.getItem("gardenLoggerPhotosVisibleV1")).toBe(
            "hidden"
        );

        const restored = createLoggerWindow({
            bootstrapData,
            storage: {
                gardenLoggerPhotosVisibleV1: "hidden",
                gardenPlantId: "P23",
            },
        }).window;

        expect(
            queryElements(
                restored.document,
                "#plantSummary .plant-photo-card img",
                HTMLImageElement
            )
        ).toHaveLength(0);
        expect(
            queryElement(
                restored.document,
                "#photoVisibilityToggle",
                HTMLButtonElement
            ).textContent
        ).toContain("Show photos");
    });

    it("keeps the photo control usable after a search has no matches", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: canonicalBootstrap(),
            storage: { gardenPlantId: "P23" },
        });
        const summary = queryElement(
            window.document,
            "#plantSummary",
            HTMLElement
        );
        const tools = queryElement(summary, "#plantDisplayTools", HTMLElement);
        const toggle = queryElement(
            tools,
            "#photoVisibilityToggle",
            HTMLButtonElement
        );
        const search = queryElement(
            window.document,
            "#plantSearch",
            HTMLInputElement
        );
        search.value = "no such plant";
        search.dispatchEvent(new window.Event("input", { bubbles: true }));

        expect(summary.textContent).toContain("No plants match that search.");
        expect(tools.hidden).toBe(true);
        expect(toggle.isConnected).toBe(true);

        search.value = "P23";
        search.dispatchEvent(new window.Event("input", { bubbles: true }));

        expect(
            queryElement(summary, "#photoVisibilityToggle", HTMLButtonElement)
        ).toBe(toggle);
        expect(summary.lastElementChild).toBe(tools);
        expect(tools.hidden).toBe(false);
        expect(
            queryElements(summary, ".plant-photo-card img", HTMLImageElement)
        ).toHaveLength(2);

        toggle.focus();
        toggle.click();

        expect(window.document.activeElement).toBe(toggle);
        expect(
            queryElements(summary, ".plant-photo-card img", HTMLImageElement)
        ).toHaveLength(0);
        expect(
            queryElement(summary, ".summary-portrait", HTMLImageElement)
                .isConnected
        ).toBe(true);
    });

    it("reuses the header portrait for the same plant and preserves label portraits when selection changes", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            storage: { gardenLoggerPlantPickerModeV1: "labels" },
        });
        const summary = queryElement(
            window.document,
            "#plantSummary",
            HTMLElement
        );
        const portrait = queryElement(
            summary,
            ".plant-summary-heading .summary-portrait",
            HTMLImageElement
        );
        const picker = queryElement(
            window.document,
            "#labelPicker",
            HTMLElement
        );
        const labelPortraits = queryElements(picker, "img", HTMLImageElement);
        const expectedSrc = `https://nick2bad4u.github.io/Gardening/assets/plant-icons/gymnocalycium-mihanovichii-variegated.svg?v=${portraitRevision}`;

        expect(portrait.src).toBe(expectedSrc);

        queryElement(
            picker,
            '[data-plant-id="P01"]',
            HTMLButtonElement
        ).click();

        expect(
            queryElement(summary, ".summary-portrait", HTMLImageElement)
        ).toBe(portrait);
        expect(portrait.isConnected).toBe(true);

        queryElement(
            summary,
            "#photoVisibilityToggle",
            HTMLButtonElement
        ).click();

        expect(
            queryElement(summary, ".summary-portrait", HTMLImageElement)
        ).toBe(portrait);

        queryElement(
            picker,
            '[data-plant-id="P02"]',
            HTMLButtonElement
        ).click();

        expect(
            queryElement(summary, ".summary-portrait", HTMLImageElement).src
        ).toBe(
            `https://nick2bad4u.github.io/Gardening/assets/plant-icons/parodia-leninghausii.svg?v=${portraitRevision}`
        );

        const refreshedPortraits = queryElements(
            picker,
            "img",
            HTMLImageElement
        );

        expect(refreshedPortraits).toHaveLength(labelPortraits.length);

        for (const [index, image] of refreshedPortraits.entries()) {
            expect(image).toBe(labelPortraits[index]);
            expect(image.isConnected).toBe(true);
        }
    });

    it("uses the selected plant's lightweight SVG portrait in list and label pickers", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const expectedSrc = `https://nick2bad4u.github.io/Gardening/assets/plant-icons/gymnocalycium-mihanovichii-variegated.svg?v=${portraitRevision}`;

        expect(
            queryElement(
                window.document,
                "#plantChoiceSummary img",
                HTMLImageElement
            ).getAttribute("src")
        ).toBe(expectedSrc);
        expect(
            queryElement(
                window.document,
                '#plantChoiceList [data-plant-id="P01"] img',
                HTMLImageElement
            ).getAttribute("src")
        ).toBe(expectedSrc);

        queryElement(
            window.document,
            "#labelPickerMode",
            HTMLButtonElement
        ).click();
        const labelPortrait = queryElement(
            window.document,
            '#labelPicker [data-plant-id="P01"] img',
            HTMLImageElement
        );

        expect(labelPortrait.getAttribute("src")).toBe(expectedSrc);
        expect(labelPortrait.getAttribute("alt")).toBe("");
        expect(labelPortrait.getAttribute("aria-hidden")).toBe("true");
        expect(labelPortrait.getAttribute("loading")).toBe("lazy");
        expect(labelPortrait.getAttribute("decoding")).toBe("async");
        expect(labelPortrait.getAttribute("referrerpolicy")).toBe(
            "no-referrer"
        );
    });

    it("uses the built-in portrait for an unknown contents-only mapping", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: {
                ...bootstrap,
                plants: [
                    {
                        ...required(bootstrap.plants[0]),
                        fieldGuideUrl: "https://example.test/#contents",
                    },
                ],
            },
        });

        expect(
            window.document.querySelector("#plantChoiceSummary img")
        ).toBeNull();
        expect(
            queryElement(
                window.document,
                "#plantChoiceSummary use",
                Element
            ).getAttribute("href")
        ).toBe("#app-icon-plant");
        expect(
            queryElement(window.document, "#plantChoiceSummary", HTMLElement)
                .textContent
        ).toContain("Moon cactus");
    });

    it.each([
        ["P19", "shared-rehab-cactus-planter"],
        ["P20", "shared-succulent-planter"],
    ])("uses the accurate shared-planter portrait for %s", (id, slug) => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: {
                ...bootstrap,
                plants: [
                    {
                        ...required(bootstrap.plants[0]),
                        fieldGuideUrl: "https://example.test/#contents",
                        id,
                    },
                ],
            },
        });
        const portrait = queryElement(
            window.document,
            "#plantChoiceSummary img",
            HTMLImageElement
        );

        expect(portrait.getAttribute("src")).toContain(`${slug}.svg`);
        expect(portrait.getAttribute("src")).not.toContain("contents.svg");
    });

    it("offers an honest Google Photos handoff for photo links", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const link = queryElement(
            window.document,
            "#openGooglePhotos",
            HTMLAnchorElement
        );

        expect(link.href).toBe("https://photos.google.com/");
        expect(link.target).toBe("_blank");
        expect(link.rel).toContain("noopener");
    });
});

describe("garden logger portrait caching and offline reuse", () => {
    afterEach(restoreLoggerMocks);

    it("loads only visible portraits and shares one download between duplicate images", async () => {
        expect.hasAssertions();

        const fixture = portraitCacheFixture();
        const { window } = createLoggerWindow(fixture);
        const selected = queryElement(
            window.document,
            "#plantChoiceSummary img",
            HTMLImageElement
        );
        const duplicate = queryElement(
            window.document,
            '#plantChoiceList [data-plant-id="P01"] img',
            HTMLImageElement
        );
        const observer = fixture.observers[0];

        expect(fixture.fetch).not.toHaveBeenCalled();

        required(observer).show(selected, duplicate);
        await vi.waitFor(() => {
            expect(selected.src).toMatch(/^blob:/v);
        });

        expect(duplicate.src).toBe(selected.src);
        expect(fixture.fetch).toHaveBeenCalledTimes(1);
        expect(fixture.fetch).toHaveBeenCalledWith(
            expect.stringContaining(`?v=${portraitRevision}`),
            {
                cache: "force-cache",
                credentials: "omit",
                referrerPolicy: "no-referrer",
            }
        );
        expect(fixture.saved.size).toBe(1);
        expect(
            required(fixture.saved.values().toArray()[0]).headers.get(
                "X-Garden-Icon-Revision"
            )
        ).toBe(portraitRevision);

        queryElement(window.document, "#plantSearch", HTMLInputElement).value =
            "Yellow";
        queryElement(
            window.document,
            "#plantSearch",
            HTMLInputElement
        ).dispatchEvent(new window.Event("input"));

        expect(
            [...required(observer).targets].every(
                (target) => target.isConnected
            )
        ).toBe(true);
    });

    it("reuses a downloaded portrait after a reload without any network request, including offline", async () => {
        expect.hasAssertions();

        const first = portraitCacheFixture();
        const firstWindow = createLoggerWindow(first).window;
        const firstImage = queryElement(
            firstWindow.document,
            "#plantChoiceSummary img",
            HTMLImageElement
        );
        required(first.observers[0]).show(firstImage);
        await vi.waitFor(() => {
            expect(firstImage.src).toMatch(/^blob:/v);
        });

        const next = portraitCacheFixture({
            offline: true,
            saved: first.saved,
        });
        const nextWindow = createLoggerWindow(next).window;
        const nextImage = queryElement(
            nextWindow.document,
            "#plantChoiceSummary img",
            HTMLImageElement
        );
        required(next.observers[0]).show(nextImage);
        await vi.waitUntil(() => nextImage.src.startsWith("blob:"));

        expect(nextImage.src).toMatch(/^blob:/v);
        expect(next.fetch).not.toHaveBeenCalled();
    });

    it("replaces old artwork in the same cache entry when the generated revision changes", async () => {
        expect.hasAssertions();

        const key =
            "https://nick2bad4u.github.io/Gardening/assets/plant-icons/gymnocalycium-mihanovichii-variegated.svg";
        const saved = new Map([
            [
                key,
                new Response("<svg/>", {
                    headers: {
                        "Content-Type": "image/svg+xml",
                        "X-Garden-Icon-Revision": "old",
                    },
                }),
            ],
        ]);
        const fixture = portraitCacheFixture({ saved });
        const { window } = createLoggerWindow(fixture);
        const image = queryElement(
            window.document,
            "#plantChoiceSummary img",
            HTMLImageElement
        );
        required(fixture.observers[0]).show(image);
        await vi.waitFor(() => {
            expect(image.src).toMatch(/^blob:/v);
        });

        expect(fixture.fetch).toHaveBeenCalledTimes(1);
        expect(saved.size).toBe(1);
        expect(
            required(saved.get(key)).headers.get("X-Garden-Icon-Revision")
        ).toBe(portraitRevision);
    });

    it.each([
        {
            expectedSource: expect.stringMatching(/^blob:/v),
            failure: { writeFails: true },
            name: "write fails",
        },
        {
            expectedSource: expect.stringContaining(
                `.svg?v=${portraitRevision}`
            ),
            failure: { openFails: true },
            name: "open fails",
        },
        {
            expectedSource: expect.stringContaining(
                `.svg?v=${portraitRevision}`
            ),
            failure: { offline: true },
            name: "offline",
        },
    ])(
        "keeps unsent observations intact when the image cache or download fails: $name",
        async ({ expectedSource, failure }) => {
            expect.hasAssertions();

            const fixture = portraitCacheFixture(failure);
            const queue = JSON.stringify([queuedWeight()]);
            const { window } = createLoggerWindow({
                ...fixture,
                storage: { gardenLoggerObservationQueueV1: queue },
            });
            const storedQueue = window.localStorage.getItem(
                "gardenLoggerObservationQueueV1"
            );
            const image = queryElement(
                window.document,
                "#plantChoiceSummary img",
                HTMLImageElement
            );
            required(fixture.observers[0]).show(image);
            await vi.waitFor(() => {
                expect(image.getAttribute("src")).toMatch(/^(?:blob:|https:)/v);
            });

            expect(image.src).toStrictEqual(expectedSource);

            expect(
                window.localStorage.getItem("gardenLoggerObservationQueueV1")
            ).toBe(storedQueue);

            image.dispatchEvent(new window.Event("error"));

            expect(
                queryElement(
                    window.document,
                    "#plantChoiceSummary svg use",
                    Element
                ).getAttribute("href")
            ).toBe("#app-icon-plant");
        }
    );
});

describe("garden logger latest weight comparison", () => {
    afterEach(restoreLoggerMocks);

    it.each([
        [
            420,
            398,
            "+22 g vs last dry",
        ],
        [
            390,
            398,
            "-8 g vs last dry",
        ],
        [
            398,
            398,
            "0 g vs last dry",
        ],
        [
            420.26,
            398.1,
            "+22.2 g vs last dry",
        ],
        [
            397.84,
            398.1,
            "-0.3 g vs last dry",
        ],
        [
            397.98,
            398,
            "0 g vs last dry",
        ],
    ])(
        "compares %s g with a last dry reading of %s g",
        (latestWeight, dryOrLowestWeight, expected) => {
            expect.hasAssertions();

            const { window } = createLoggerWindow({
                bootstrapData: {
                    ...bootstrap,
                    plants: [
                        {
                            ...required(bootstrap.plants[0]),
                            dryOrLowestWeight,
                            latestWeight,
                        },
                    ],
                },
            });

            expect(
                queryElement(
                    window.document,
                    "#plantSummary .weight-comparison",
                    HTMLElement
                ).textContent
            ).toBe(expected);
        }
    );

    it.each(["latestWeight", "dryOrLowestWeight"])(
        "omits the comparison for invalid %s readings",
        (field) => {
            expect.hasAssertions();

            for (const value of [
                undefined,
                null,
                "",
                0,
                -1,
                NaN,
                Infinity,
                -Infinity,
                "420",
                "unknown",
                true,
            ]) {
                const plant = { ...required(bootstrap.plants[0]) };
                // Exercise malformed RPC data without claiming it satisfies the fixture type.
                Reflect.set(plant, field, value);
                const { window } = createLoggerWindow({
                    bootstrapData: { ...bootstrap, plants: [plant] },
                });
                const summary = queryElement(
                    window.document,
                    "#plantSummary",
                    HTMLElement
                );

                expect(
                    queryElements(summary, ".weight-comparison", HTMLElement),
                    `${field}: ${String(value)}`
                ).toHaveLength(0);
                expect(summary.textContent).not.toContain("vs last dry");
            }
        }
    );
});

describe("garden logger watering forecasts and recent History", () => {
    afterEach(restoreLoggerMocks);

    it("separates large metric values from supporting dates and groups the watering plan", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: {
                ...bootstrap,
                plants: [
                    {
                        ...required(bootstrap.plants[0]),
                        dryForecastBasis:
                            "Historical estimate · 2 learned cycles",
                        dryForecastWindow: "Sep 10–Sep 16",
                        recommendedWaterDate: "Sep 12",
                        wateringGuidance: "Confirm dry roots first.",
                    },
                ],
            },
        });
        const summary = queryElement(
            window.document,
            "#plantSummary",
            HTMLElement
        );

        expect(queryElements(summary, ".metric", HTMLElement)).toHaveLength(6);
        expect(
            required(queryElements(summary, ".metric-value", HTMLElement)[2])
                .textContent
        ).toBe("398 g");
        expect(
            required(queryElements(summary, ".metric-detail", HTMLElement)[2])
                .textContent
        ).toBe("Aug 10, 2026");
        expect(
            queryElement(summary, ".forecast-date", HTMLElement).textContent
        ).toBe("Sep 12");
        expect(
            queryElement(
                summary,
                ".forecast-guidance .help-paragraph",
                HTMLElement
            ).textContent
        ).toBe("Confirm dry roots first.");
        expect(
            queryElement(summary, ".forecast-reweigh", HTMLElement).textContent
        ).toContain("Sep 10–Sep 16");
        expect(
            queryElement(summary, ".forecast-basis", HTMLElement).textContent
        ).toContain("2 learned cycles");
        expect(
            queryElement(
                summary,
                ":scope .plant-summary-heading .plant-id",
                HTMLElement
            ).textContent
        ).toBe("P01");
    });

    it("shows the selected plant's last completed dry-cycle weight", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const summary = queryElement(
            window.document,
            "#plantSummary",
            HTMLElement
        );
        const dryMetric = () =>
            required(queryElements(summary, ".metric", HTMLElement)[2]);

        expect(
            queryElement(dryMetric(), ".metric-value", HTMLElement).textContent
        ).toBe("398 g");
        expect(
            queryElement(dryMetric(), ".metric-detail", HTMLElement).textContent
        ).toBe("Aug 10, 2026");

        const select = queryElement(
            window.document,
            "#plantSelect",
            HTMLSelectElement
        );
        select.value = "P02";
        select.dispatchEvent(new window.Event("change", { bubbles: true }));

        expect(
            queryElement(dryMetric(), ".metric-value", HTMLElement).textContent
        ).toBe("475 g");
        expect(
            queryElement(dryMetric(), ".metric-detail", HTMLElement).textContent
        ).toBe("Aug 2, 2026");
    });

    it("shows the learned reweigh window and forecast basis, including old-cache fallbacks", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: {
                ...bootstrap,
                plants: bootstrap.plants.map((plant, index) =>
                    index === 0
                        ? {
                              ...plant,
                              dryForecastBasis:
                                  "Historical estimate · 1 learned cycle(s)",
                              dryForecastWindow: "Sep 10–Sep 25",
                          }
                        : plant
                ),
            },
        });
        const summary = queryElement(
            window.document,
            "#plantSummary",
            HTMLElement
        );

        expect(summary.textContent).toContain("Reweigh: Sep 10–Sep 25");
        expect(summary.textContent).toContain(
            "Historical estimate · 1 learned cycle(s)"
        );

        const select = queryElement(
            window.document,
            "#plantSelect",
            HTMLSelectElement
        );
        select.value = "P02";
        select.dispatchEvent(new window.Event("change", { bubbles: true }));

        expect(summary.textContent).toContain(
            "Reweigh: Not enough evidence yet"
        );
        expect(summary.textContent).toContain("Needs watering-cycle data");
        expect(
            queryElements(
                summary,
                ".metric > .metric-icon svg, .metric > .help-disclosure > summary > svg",
                Element
            )
        ).toHaveLength(6);
    });

    it("restores and updates the recent-history length", () => {
        expect.hasAssertions();

        const { calls, window } = createLoggerWindow({
            storage: { gardenLoggerRecentLimitV1: "50" },
        });

        expect(
            queryElement(window.document, "#recentLimit", HTMLSelectElement)
                .value
        ).toBe("50");
        expect(
            calls.some(
                (call) =>
                    call.method === "getRecentWebObservations" &&
                    call.args[0] === 50
            )
        ).toBe(true);

        const select = queryElement(
            window.document,
            "#recentLimit",
            HTMLSelectElement
        );
        select.value = "25";
        select.dispatchEvent(new window.Event("change", { bubbles: true }));

        expect(window.localStorage.getItem("gardenLoggerRecentLimitV1")).toBe(
            "25"
        );
    });

    it("marks recent History rows with the spreadsheet event palette key", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: {
                ...bootstrap,
                recent: [
                    {
                        event: "Water",
                        name: "Moon cactus",
                        observedAt: "Sep 4, 2026",
                        plantId: "P01",
                        weight: "",
                        weightState: "",
                    },
                    {
                        event: "Pest",
                        name: "Yellow tower cactus",
                        observedAt: "Sep 3, 2026",
                        plantId: "P02",
                        weight: "",
                        weightState: "",
                    },
                ],
            },
        });
        const rows = [
            ...queryElements(
                window.document,
                "#recentList .recent-item",
                HTMLElement
            ),
        ];

        expect(
            structuredClone(rows.map(({ dataset }) => dataset["event"]))
        ).toStrictEqual(["Water", "Pest"]);
        expect(
            structuredClone(
                rows.map(
                    (row) =>
                        queryElement(row, ".event-badge", HTMLElement)
                            .textContent
                )
            )
        ).toStrictEqual(["Water", "Pest"]);
        expect(html).toContain("--event-bg: #d9eefc;");
        expect(html).toContain("--event-ink: #7a1d1d;");
        expect(html).toContain("--event-accent: #2f8fca;");
        expect(html).toContain("var(--event-accent) 10%");
        expect(html).not.toContain("var(--event-bg) 74%");
    });
});

describe("garden logger local History loading and portraits", () => {
    afterEach(restoreLoggerMocks);

    it("keeps entries and the form usable while loading, and ignores older successes and failures", () => {
        expect.hasAssertions();

        const { behaviors, window } = createLoggerWindow({
            bootstrapData: { ...bootstrap, recent: [recentExample] },
        });
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getRecentWebObservations">[]} */
        const pending = [];
        behaviors.getRecentWebObservations = (handlers) => {
            pending.push(handlers);
        };
        const list = queryElement(window.document, "#recentList", HTMLElement);
        const original = required(list.firstElementChild);
        const status = queryElement(
            window.document,
            "#recentStatus",
            HTMLElement
        );
        changeRecentLimit(window, "25");

        expect(status.textContent).toContain("Loading 25");
        expect(status.getAttribute("role")).toBe("status");
        expect(status.dataset["loading"]).toBe("true");
        expect(list.getAttribute("aria-busy")).toBe("true");
        expect(list.firstElementChild).toBe(original);
        expect(
            queryElement(window.document, "#weight", HTMLInputElement).disabled
        ).toBe(false);
        expect(
            queryElement(window.document, "#saveButton", HTMLButtonElement)
                .disabled
        ).toBe(false);

        changeRecentLimit(window, "50");
        required(pending[0]).success([{ ...recentExample, weight: 999 }]);

        expect(list.firstElementChild).toBe(original);
        expect(status.textContent).toContain("Loading 50");

        required(pending[1]).success([{ ...recentExample, weight: 410 }]);

        expect(list.textContent).toContain("410 g");
        expect(list.getAttribute("aria-busy")).toBe("false");
        expect(status.dataset["loading"]).toBe("false");

        required(pending[0]).failure(new Error("Old failure"));
        required(pending[0]).success([{ ...recentExample, weight: 999 }]);

        expect(status.textContent).toBe("Showing 1 recent entry.");
        expect(list.textContent).not.toContain("999");
    });

    it("announces failure, invalid response, timeout and offline locally without losing entries", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const { behaviors, calls, window } = createLoggerWindow({
            bootstrapData: { ...bootstrap, recent: [recentExample] },
        });
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getRecentWebObservations">[]} */
        const pending = [];
        behaviors.getRecentWebObservations = (handlers) => {
            pending.push(handlers);
        };
        const list = queryElement(window.document, "#recentList", HTMLElement);
        const original = required(list.firstElementChild);
        const status = queryElement(
            window.document,
            "#recentStatus",
            HTMLElement
        );
        changeRecentLimit(window, "25");
        required(pending[0]).failure(new Error("Unavailable"));

        expect(status.textContent).toContain("Could not refresh History");
        expect(status.dataset["loading"]).toBe("false");
        expect(list.firstElementChild).toBe(original);

        changeRecentLimit(window, "50");
        required(pending[1]).success(null);

        expect(status.textContent).toContain("response was unavailable");
        expect(list.firstElementChild).toBe(original);

        changeRecentLimit(window, "100");
        vi.advanceTimersByTime(20_000);

        expect(status.textContent).toContain("timed out");

        required(pending[2]).success([]);

        expect(list.firstElementChild).toBe(original);

        changeRecentLimit(window, "10");
        Object.defineProperty(window.navigator, "onLine", {
            configurable: true,
            value: false,
        });
        window.dispatchEvent(new window.Event("offline"));

        expect(status.textContent).toContain("Offline");
        expect(list.getAttribute("aria-busy")).toBe("false");

        required(pending[3]).success([]);

        expect(list.firstElementChild).toBe(original);

        const count = calls.length;
        changeRecentLimit(window, "25");

        expect(calls).toHaveLength(count);
        expect(status.textContent).toContain(
            "keeping previous History entries"
        );
    });

    it("keeps the History controls visible after an empty response", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        changeRecentLimit(window, "25");

        expect(
            queryElement(window.document, "#recentStatus", HTMLElement)
                .textContent
        ).toBe("No recent entries.");
        expect(
            queryElement(window.document, "#recentCard", HTMLElement).hidden
        ).toBe(false);
        expect(
            queryElement(window.document, "#recentLimit", HTMLSelectElement)
                .disabled
        ).toBe(false);
    });

    it("does not let a delayed bootstrap replace a more recent History selection", () => {
        expect.hasAssertions();

        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getWebAppBootstrap">[]} */
        const pendingBootstrap = [];
        const { behaviors, window } = createLoggerWindow({
            bootstrapBehavior: (handlers) => {
                pendingBootstrap.push(handlers);
            },
            storage: {
                gardenLoggerBootstrapV2: JSON.stringify({
                    bootstrap: { ...bootstrap, recent: [recentExample] },
                    savedAt: Date.now(),
                }),
            },
        });
        behaviors.getRecentWebObservations = ({ success }) => {
            success([{ ...recentExample, weight: 409 }]);
        };
        changeRecentLimit(window, "25");
        changeRecentLimit(window, "10");
        required(pendingBootstrap[0]).success({
            ...bootstrap,
            recent: [recentExample],
        });

        expect(
            queryElement(window.document, "#recentList", HTMLElement)
                .textContent
        ).toContain("409 g");
    });

    it("reuses one portrait download in History and both pickers, and falls back for unknown or failed artwork", async () => {
        expect.hasAssertions();

        const fixture = portraitCacheFixture();
        const { window } = createLoggerWindow({
            bootstrapData: {
                ...bootstrap,
                recent: [
                    recentExample,
                    { ...recentExample, name: "Unknown", plantId: "P99" },
                ],
            },
            configureWindow: fixture.configureWindow,
            storage: { gardenLoggerPlantPickerModeV1: "labels" },
        });
        const images = queryElements(
            window.document,
            '#recentList img, #labelPicker [data-plant-id="P01"] img, #plantChoiceSummary img',
            HTMLImageElement
        );

        expect(images).toHaveLength(3);

        required(fixture.observers[0]).show(...images);
        await vi.waitFor(() => {
            expect(images.every((image) => image.src.startsWith("blob:"))).toBe(
                true
            );
        });

        expect(fixture.fetch).toHaveBeenCalledTimes(1);

        const sources = new Set(images.map((image) => image.src));

        expect(sources.size).toBe(1);

        const rows = queryElements(
            window.document,
            ".recent-item",
            HTMLElement
        );

        expect(
            queryElement(required(rows[0]), ".recent-plant", HTMLElement)
                .firstElementChild
        ).toBe(images[2]);
        expect(
            queryElement(
                required(rows[1]),
                ".recent-portrait use",
                Element
            ).getAttribute("href")
        ).toBe("#app-icon-plant");

        queryElement(required(rows[0]), "img", HTMLImageElement).dispatchEvent(
            new window.Event("error")
        );

        expect(
            queryElement(
                required(rows[0]),
                ".recent-portrait use",
                Element
            ).getAttribute("href")
        ).toBe("#app-icon-plant");
    });
});

describe("garden logger selection and portrait stability", () => {
    afterEach(restoreLoggerMocks);

    it("puts the summary above both pickers and immediately names tapped labels without replacing portraits", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            storage: { gardenLoggerPlantPickerModeV1: "labels" },
        });
        const summary = queryElement(
            window.document,
            "#plantSummary",
            HTMLElement
        );
        const picker = queryElement(
            window.document,
            "#labelPicker",
            HTMLElement
        );
        const name = queryElement(
            window.document,
            "#plantPickerName",
            HTMLElement
        );
        const button = queryElement(
            picker,
            '[data-plant-id="P02"]',
            HTMLButtonElement
        );
        const portrait = queryElement(button, "img", HTMLImageElement);
        for (const id of [
            "listPicker",
            "labelPicker",
            "listPickerMode",
            "labelPickerMode",
        ]) {
            expect(
                summary.compareDocumentPosition(
                    queryElement(window.document, `#${id}`, HTMLElement)
                )
            ).toBe(4);
        }
        button.dispatchEvent(
            new window.PointerEvent("pointerover", {
                bubbles: true,
                pointerType: "mouse",
            })
        );

        expect(name.textContent).toBe("Yellow tower cactus · F3");
        expect(
            queryElement(window.document, "#plantSelect", HTMLSelectElement)
                .value
        ).toBe("P01");

        button.focus();

        expect(name.textContent).toContain("Yellow tower cactus");

        button.click();

        expect(name.textContent).toBe("Selected: Yellow tower cactus · F3");
        expect(queryElement(button, "img", HTMLImageElement)).toBe(portrait);
        expect(button.getAttribute("aria-label")).toContain(
            "Yellow tower cactus"
        );
        expect(window.document.activeElement).toBe(button);
    });

    it("names bulk label taps and focus without toggling twice or leaving stale selection text", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            storage: { gardenLoggerBulkPickerModeV1: "labels" },
        });
        queryElement(
            window.document,
            "#bulkModeTab",
            HTMLButtonElement
        ).click();
        const button = queryElement(
            window.document,
            '#bulkPlantList [data-bulk-plant-id="P02"]',
            HTMLButtonElement
        );
        const name = queryElement(
            window.document,
            "#bulkPickerName",
            HTMLElement
        );
        const portrait = queryElement(button, "img", HTMLImageElement);
        button.focus();

        expect(name.textContent).toBe("Not selected: Yellow tower cactus · F3");

        button.click();

        expect(name.textContent).toBe("Selected: Yellow tower cactus · F3");
        expect(button.getAttribute("aria-pressed")).toBe("true");
        expect(queryElement(button, "img", HTMLImageElement)).toBe(portrait);

        queryElement(window.document, "#bulkClear", HTMLButtonElement).click();

        expect(name.textContent).toBe("Not selected: Yellow tower cactus · F3");
    });

    it("keeps list portrait nodes connected across repeated selections", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const buttons = queryElements(
            window.document,
            "#plantChoiceList button",
            HTMLButtonElement
        );
        const portraits = buttons.map((button) =>
            queryElement(button, "img", HTMLImageElement)
        );
        for (const button of [
            required(buttons[1]),
            required(buttons[0]),
            required(buttons[1]),
        ]) {
            button.click();

            expect(
                queryElements(
                    window.document,
                    "#plantChoiceList button",
                    HTMLButtonElement
                )
            ).toStrictEqual(buttons);
            expect(
                buttons.map((item) =>
                    queryElement(item, "img", HTMLImageElement)
                )
            ).toStrictEqual(portraits);
        }
    });
});

describe("garden logger help disclosures", () => {
    afterEach(restoreLoggerMocks);

    it("opens only one help panel across clicks, focus and hover, clearing old pins", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const first = queryElement(
            window.document,
            ".forecast-heading .help-disclosure",
            HTMLDetailsElement
        );
        const second = queryElement(
            window.document,
            ".forecast-reweigh",
            HTMLDetailsElement
        );
        const firstTrigger = queryElement(first, "summary", HTMLElement);
        const secondTrigger = queryElement(second, "summary", HTMLElement);
        firstTrigger.click();
        secondTrigger.click();

        expect(
            queryElements(
                window.document,
                ".help-disclosure[open]",
                HTMLDetailsElement
            )
        ).toStrictEqual([second]);
        expect(first.dataset["pinned"]).toBe("false");

        firstTrigger.focus();

        expect(
            queryElements(
                window.document,
                ".help-disclosure[open]",
                HTMLDetailsElement
            )
        ).toStrictEqual([first]);
        expect(second.dataset["pinned"]).toBe("false");

        firstTrigger.click();
        second.dispatchEvent(
            new window.PointerEvent("pointerenter", { pointerType: "mouse" })
        );

        expect(
            queryElements(
                window.document,
                ".help-disclosure[open]",
                HTMLDetailsElement
            )
        ).toStrictEqual([second]);
        expect(first.dataset["pinned"]).toBe("false");

        firstTrigger.click();

        expect(
            queryElements(
                window.document,
                ".help-disclosure[open]",
                HTMLDetailsElement
            )
        ).toStrictEqual([first]);
        expect(first.dataset["pinned"]).toBe("true");
    });

    it.each(["pointerdown", "click"])(
        "dismisses pinned help on outside %s without consuming the other control's input",
        (eventType) => {
            expect.hasAssertions();

            const { window } = createLoggerWindow();
            const help = queryElement(
                window.document,
                ".forecast-heading .help-disclosure",
                HTMLDetailsElement
            );
            queryElement(help, "summary", HTMLElement).click();
            const control = queryElement(
                window.document,
                '#eventChips [data-event="Check"]',
                HTMLButtonElement
            );
            control.getBoundingClientRect = () => new DOMRect(10, 100, 180, 48);
            const event = new window.PointerEvent(eventType, {
                bubbles: true,
                cancelable: true,
                clientX: 90,
                clientY: 120,
                detail: 1,
                pointerType: "touch",
            });
            control.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(false);
            expect(help.open).toBe(false);
            expect(help.dataset["pinned"]).toBe("false");
            expect(control.disabled).toBe(false);
            expect(window.document.documentElement.className).not.toContain(
                "mobile-hit-recovery"
            );

            const pressed = control.getAttribute("aria-pressed");
            control.click();

            expect(control.getAttribute("aria-pressed")).not.toBe(pressed);
        }
    );

    it.each([
        {
            action: "close button",
            dismiss: (
                /** @type {Window} */ _window,
                /** @type {HTMLButtonElement} */ close
            ) => {
                close.click();
            },
        },
        {
            action: "Escape",
            dismiss: (
                /** @type {Window} */ window,
                /** @type {HTMLButtonElement} */ close
            ) => {
                close.dispatchEvent(
                    new window.KeyboardEvent("keydown", {
                        bubbles: true,
                        key: "Escape",
                    })
                );
            },
        },
    ])(
        "restores trigger focus after $action inside help without reopening",
        ({ dismiss }) => {
            expect.hasAssertions();

            const { window } = createLoggerWindow();
            const help = queryElement(
                window.document,
                ".forecast-heading .help-disclosure",
                HTMLDetailsElement
            );
            const trigger = queryElement(help, "summary", HTMLElement);
            const close = queryElement(help, ".help-close", HTMLButtonElement);
            trigger.click();
            close.focus();

            expect(window.document.activeElement).toBe(close);
            expect(help.open).toBe(true);

            dismiss(window, close);

            expect(help.open).toBe(false);
            expect(help.dataset["pinned"]).toBe("false");
            expect(window.document.activeElement).toBe(trigger);

            trigger.click();

            expect(help.open).toBe(true);
        }
    );

    it("closes pinned help when keyboard focus moves to another control", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const help = queryElement(
            window.document,
            ".forecast-heading .help-disclosure",
            HTMLDetailsElement
        );
        queryElement(help, "summary", HTMLElement).click();
        queryElement(help, ".help-close", HTMLButtonElement).focus();
        const outside = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        outside.focus();

        expect(window.document.activeElement).toBe(outside);
        expect(help.open).toBe(false);
        expect(help.dataset["pinned"]).toBe("false");
    });

    it.each(["page", "ancestor"])(
        "closes help on %s scroll but permits scrolling inside its text",
        (target) => {
            expect.hasAssertions();

            const { window } = createLoggerWindow();
            const help = queryElement(
                window.document,
                ".forecast-heading .help-disclosure",
                HTMLDetailsElement
            );
            queryElement(help, "summary", HTMLElement).click();
            const panel = queryElement(help, ".help-text", HTMLElement);
            for (const inside of [
                panel,
                queryElement(panel, ".help-paragraph", HTMLElement),
            ]) {
                const scroll = new window.Event("scroll", { cancelable: true });
                inside.dispatchEvent(scroll);

                expect(help.open).toBe(true);
                expect(scroll.defaultPrevented).toBe(false);
            }
            const outside =
                target === "page"
                    ? window.document
                    : queryElement(
                          window.document,
                          "#plantSummary",
                          HTMLElement
                      );
            const scroll = new window.Event("scroll", { cancelable: true });
            outside.dispatchEvent(scroll);

            expect(help.open).toBe(false);
            expect(help.dataset["pinned"]).toBe("false");
            expect(scroll.defaultPrevented).toBe(false);
        }
    );

    it.each(["resize", "orientationchange"])(
        "closes help when the window receives %s",
        (eventType) => {
            expect.hasAssertions();

            const { window } = createLoggerWindow();
            const help = queryElement(
                window.document,
                ".forecast-heading .help-disclosure",
                HTMLDetailsElement
            );
            queryElement(help, "summary", HTMLElement).click();
            window.dispatchEvent(new window.Event(eventType));

            expect(help.open).toBe(false);
            expect(help.dataset["pinned"]).toBe("false");
        }
    );

    it.each(["resize", "scroll"])(
        "closes help on supported visual viewport %s events",
        (eventType) => {
            expect.hasAssertions();

            const viewport = Object.assign(new EventTarget(), {
                height: 844,
                offsetLeft: 0,
                offsetTop: 0,
                width: 390,
            });
            const { window } = createLoggerWindow({
                configureWindow: (target) => {
                    // Happy DOM has no visual viewport; provide its event surface before startup.
                    Object.defineProperty(target, "visualViewport", {
                        value: viewport,
                    });
                },
            });
            const help = queryElement(
                window.document,
                ".forecast-heading .help-disclosure",
                HTMLDetailsElement
            );
            queryElement(help, "summary", HTMLElement).click();
            viewport.dispatchEvent(new window.Event(eventType));

            expect(help.open).toBe(false);
            expect(help.dataset["pinned"]).toBe("false");
        }
    );

    it("gives transient help a leave grace period and cancels dismissal on pointer re-entry", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const { window } = createLoggerWindow();
        const help = queryElement(
            window.document,
            ".forecast-heading .help-disclosure",
            HTMLDetailsElement
        );
        help.dispatchEvent(
            new window.PointerEvent("pointerenter", { pointerType: "mouse" })
        );
        help.dispatchEvent(
            new window.PointerEvent("pointerleave", { pointerType: "mouse" })
        );
        vi.advanceTimersByTime(100);

        expect(help.open).toBe(true);

        help.dispatchEvent(
            new window.PointerEvent("pointerenter", { pointerType: "mouse" })
        );
        vi.advanceTimersByTime(200);

        expect(help.open).toBe(true);

        help.dispatchEvent(
            new window.PointerEvent("pointerleave", { pointerType: "mouse" })
        );
        vi.advanceTimersByTime(200);

        expect(help.open).toBe(false);

        queryElement(help, "summary", HTMLElement).click();
        help.dispatchEvent(
            new window.PointerEvent("pointerleave", { pointerType: "mouse" })
        );
        vi.advanceTimersByTime(200);

        expect(help.open).toBe(true);
        expect(help.dataset["pinned"]).toBe("true");
    });

    it.each(["touch", "pen"])("ignores %s hover for help", (pointerType) => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const help = queryElement(
            window.document,
            ".forecast-heading .help-disclosure",
            HTMLDetailsElement
        );
        help.dispatchEvent(
            new window.PointerEvent("pointerenter", { pointerType })
        );

        expect(help.open).toBe(false);
    });

    it("opens care help by tap, hover or keyboard focus and closes with Escape without capturing touch scroll", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const help = queryElement(
            window.document,
            ".forecast-heading .help-disclosure",
            HTMLDetailsElement
        );
        const trigger = queryElement(help, "summary", HTMLElement);

        expect(trigger.textContent).toBe("Water date · if ready");
        expect(help.open).toBe(false);

        help.dispatchEvent(
            new window.PointerEvent("pointerenter", { pointerType: "touch" })
        );

        expect(help.open).toBe(false);

        const scroll = new window.Event("touchmove", {
            bubbles: true,
            cancelable: true,
        });
        trigger.dispatchEvent(scroll);

        expect(scroll.defaultPrevented).toBe(false);

        trigger.click();

        expect(help.open).toBe(true);
        expect(help.textContent).toContain("Confirm actual dryness");

        trigger.click();

        expect(help.open).toBe(false);

        help.dispatchEvent(
            new window.PointerEvent("pointerenter", { pointerType: "mouse" })
        );

        expect(help.open).toBe(true);

        window.document.dispatchEvent(
            new window.KeyboardEvent("keydown", {
                bubbles: true,
                key: "Escape",
            })
        );

        expect(help.open).toBe(false);

        trigger.focus();

        expect(help.open).toBe(true);

        trigger.dispatchEvent(
            new window.KeyboardEvent("keydown", {
                bubbles: true,
                key: "Escape",
            })
        );

        expect(help.open).toBe(false);
        expect(window.document.activeElement).toBe(trigger);

        trigger.blur();
        trigger.focus();

        expect(help.open).toBe(true);

        trigger.blur();

        expect(help.open).toBe(false);
    });
});

describe("garden logger activity metrics and guidance", () => {
    afterEach(restoreLoggerMocks);

    it.each([
        [
            "Current-cycle curve · 4 readings",
            "growth",
            "current watering cycle",
        ],
        [
            "Current curve + history · 2 cycles",
            "tracker",
            "blends current-cycle",
        ],
        [
            "Historical estimate · 3 cycles",
            "history",
            "relies mainly",
        ],
        [
            "Insufficient data",
            "info",
            "not enough reliable",
        ],
        [
            "Conflicting upward readings",
            "caution",
            "Readings conflict",
        ],
        [
            "Current cycle differs — reweigh",
            "caution",
            "Readings conflict",
        ],
        [
            "Recheck wet / dry anchors",
            "caution",
            "Readings conflict",
        ],
        [
            "Blended historical estimate",
            "tracker",
            "blends current-cycle",
        ],
        [
            "Partial / spot watering — reweigh",
            "care",
            "whole-pot wet anchor",
        ],
    ])("explains %s with its existing icon", (basis, icon, explanation) => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: {
                ...bootstrap,
                plants: [
                    {
                        ...required(bootstrap.plants[0]),
                        dryForecastBasis: basis,
                    },
                ],
            },
        });
        const help = queryElement(
            window.document,
            ".forecast-basis",
            HTMLDetailsElement
        );

        expect(queryElement(help, "summary", HTMLElement).textContent).toBe(
            basis
        );
        expect(queryElement(help, "use", Element).getAttribute("href")).toBe(
            `#app-icon-${icon}`
        );
        expect(
            queryElement(help, ".help-text", HTMLElement).textContent
        ).toContain(explanation);
    });

    it.each([
        "single",
        "bulk",
        "queue",
    ])(
        "refreshes plant totals and clears the previous cycle after a %s save",
        (mode) => {
            expect.hasAssertions();

            const activitySummary = {
                averageDryDownGramsPerDay: 50,
                averageWaterIntervalDays: 10,
                dryDownDays: 2,
                dryDownReadingCount: 3,
                recentDryDownDays: 1,
                recentDryDownGramsPerDay: 30,
                totalMeasurements: 1,
                totalWaterings: 2,
                totalWeights: 3,
                waterIntervalCount: 1,
            };
            const plant = { ...required(bootstrap.plants[0]), activitySummary };
            const { behaviors, calls, window } = createLoggerWindow({
                bootstrapData: { ...bootstrap, plants: [plant] },
                storage:
                    mode === "queue"
                        ? {
                              gardenLoggerObservationQueueV1: JSON.stringify([
                                  queuedWeight(),
                              ]),
                          }
                        : {},
            });
            /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getWebAppBootstrap">[]} */
            const pending = [];
            behaviors.getWebAppBootstrap = (handlers) => {
                pending.push(handlers);
            };
            behaviors.getRecentWebObservations = ({ success }) => {
                success([recentExample]);
            };
            behaviors.saveWebObservation = ({ success }) => {
                success({ message: "Saved" });
            };
            behaviors.saveBulkCareObservation = ({ success }) => {
                success({ message: "Saved" });
            };
            behaviors.saveWebObservationBatch = ({ args, success }) => {
                success({
                    failedCount: 0,
                    ok: true,
                    results: args[0].map(({ requestId }) => ({
                        ok: true,
                        requestId,
                    })),
                    savedCount: args[0].length,
                });
            };
            confirmSummarySave(window, mode);

            expect(pending).toHaveLength(1);
            expect(
                queryElement(window.document, "#saveButton", HTMLButtonElement)
                    .disabled
            ).toBe(false);

            required(pending[0]).success({
                ...bootstrap,
                plants: [
                    {
                        ...plant,
                        activitySummary: {
                            ...activitySummary,
                            averageDryDownGramsPerDay: "",
                            dryDownDays: "",
                            dryDownReadingCount: 1,
                            totalMeasurements: 2,
                            totalWaterings: 3,
                            totalWeights: 4,
                        },
                    },
                ],
            });

            expect(
                queryElements(
                    window.document,
                    ".activity-count .metric-value",
                    HTMLElement
                ).map((element) => element.textContent)
            ).toStrictEqual([
                "3",
                "2",
                "4",
            ]);
            expect(
                required(
                    queryElements(
                        window.document,
                        ".metrics .metric-value",
                        HTMLElement
                    )[5]
                ).textContent
            ).toBe("—");
            expect(
                queryElement(window.document, "#recentList", HTMLElement)
                    .textContent
            ).toContain("430 g");
            expect(
                calls.filter(
                    ({ method }) => method === "getRecentWebObservations"
                )
            ).toHaveLength(1);
        }
    );

    it("keeps the newest saved plant summary and an in-progress weight when refreshes arrive out of order", () => {
        expect.hasAssertions();

        const { behaviors, window } = createLoggerWindow();
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"getWebAppBootstrap">[]} */
        const pending = [];
        behaviors.getWebAppBootstrap = (handlers) => {
            pending.push(handlers);
        };
        behaviors.saveWebObservation = ({ success }) => {
            success({ message: "Saved" });
        };
        confirmSummarySave(window, "single");
        confirmSummarySave(window, "single");
        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        weight.value = "333";

        expect(pending).toHaveLength(2);

        required(pending[1]).success({
            ...bootstrap,
            plants: [
                {
                    ...required(bootstrap.plants[0]),
                    activitySummary: {
                        averageDryDownGramsPerDay: "",
                        averageWaterIntervalDays: 10,
                        dryDownDays: "",
                        dryDownReadingCount: 1,
                        recentDryDownDays: "",
                        recentDryDownGramsPerDay: "",
                        totalMeasurements: 2,
                        totalWaterings: 3,
                        totalWeights: 5,
                        waterIntervalCount: 2,
                    },
                },
            ],
        });
        required(pending[0]).success(bootstrap);

        expect(
            queryElements(
                window.document,
                ".activity-count .metric-value",
                HTMLElement
            ).map((element) => element.textContent)
        ).toStrictEqual([
            "3",
            "2",
            "5",
        ]);
        expect(weight.value).toBe("333");
        expect(
            queryElement(window.document, "#saveButton", HTMLButtonElement)
                .disabled
        ).toBe(false);
    });

    it("shows rounded interval and whole-cycle loss with aligned event totals and evidence explanations", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            bootstrapData: {
                ...bootstrap,
                plants: [
                    {
                        ...required(bootstrap.plants[0]),
                        activitySummary: {
                            averageDryDownGramsPerDay: 3.678,
                            averageWaterIntervalDays: 12.345,
                            dryDownDays: 5.678,
                            dryDownReadingCount: 4,
                            recentDryDownDays: 2.345,
                            recentDryDownGramsPerDay: 1.678,
                            totalMeasurements: 7,
                            totalWaterings: 5,
                            totalWeights: 19,
                            waterIntervalCount: 4,
                        },
                    },
                ],
            },
        });
        const metrics = queryElements(
            window.document,
            ".metrics .metric",
            HTMLElement
        );

        expect(metrics).toHaveLength(6);
        expect(
            queryElement(required(metrics[4]), ".metric-value", HTMLElement)
                .textContent
        ).toBe("12.3 days");
        expect(
            queryElement(required(metrics[5]), ".metric-value", HTMLElement)
                .textContent
        ).toBe("3.7 g/day");
        expect(required(metrics[4]).textContent).toContain("4 intervals");
        expect(required(metrics[5]).textContent).toContain("over 5.7 days");
        expect(required(metrics[5]).textContent).toContain(
            "whole-pot mass loss"
        );
        expect(required(metrics[5]).textContent).toContain("Drying can slow");
        expect(required(metrics[5]).textContent).toContain(
            "Last interval: 1.7 g/day over 2.3 days"
        );

        const counts = queryElements(
            window.document,
            ".activity-counts .activity-count",
            HTMLElement
        );

        expect(counts).toHaveLength(3);
        expect(
            counts.map(
                (count) =>
                    queryElement(count, ".metric-value", HTMLElement)
                        .textContent
            )
        ).toStrictEqual([
            "5",
            "7",
            "19",
        ]);
        expect(required(counts[1]).textContent).toContain(
            "both height and width counts once"
        );
        expect(required(counts[2]).textContent).toContain(
            "Estimates and removed records are excluded"
        );
    });

    it("keeps blank or invalid rates unknown, preserves real zero totals, and rounds tiny positive loss honestly", () => {
        expect.hasAssertions();

        /** @type {(number | "")[]} */
        const unavailable = [
            "",
            0,
            -1,
            NaN,
            Infinity,
        ];
        for (const rate of [...unavailable, 0.03]) {
            const { window } = createLoggerWindow({
                bootstrapData: {
                    ...bootstrap,
                    plants: [
                        {
                            ...required(bootstrap.plants[0]),
                            activitySummary: {
                                averageDryDownGramsPerDay: rate,
                                averageWaterIntervalDays: "",
                                dryDownDays: "",
                                dryDownReadingCount: 0,
                                recentDryDownDays: "",
                                recentDryDownGramsPerDay: "",
                                totalMeasurements: 0,
                                totalWaterings: 0,
                                totalWeights: 0,
                                waterIntervalCount: 0,
                            },
                        },
                    ],
                },
            });
            const values = queryElements(
                window.document,
                ".metrics .metric-value",
                HTMLElement
            );

            expect(required(values[4]).textContent).toBe("—");
            expect(required(values[5]).textContent).toBe(
                rate === 0.03 ? "<0.1 g/day" : "—"
            );
            expect(
                queryElements(
                    window.document,
                    ".activity-counts .metric-value",
                    HTMLElement
                ).map((value) => value.textContent)
            ).toStrictEqual([
                "0",
                "0",
                "0",
            ]);
        }
    });

    it("shows unknown metrics for an older cached bootstrap and does not turn insufficient data into zero", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            online: false,
            storage: {
                gardenLoggerBootstrapV2: JSON.stringify({
                    bootstrap,
                    savedAt: Date.now(),
                }),
            },
        });
        const values = queryElements(
            window.document,
            ".metrics .metric-value, .activity-counts .metric-value",
            HTMLElement
        );

        expect(values.slice(4).map((value) => value.textContent)).toStrictEqual(
            [
                "—",
                "—",
                "—",
                "—",
                "—",
            ]
        );
        expect(
            queryElement(window.document, "#plantSummary", HTMLElement)
                .textContent
        ).not.toMatch(/0 g\/day|NaN|undefined/v);
    });
});

describe("garden logger durable queue storage", () => {
    afterEach(restoreLoggerMocks);

    it("marks the queue complete after every plant has a queued weight", () => {
        expect.hasAssertions();

        const queued = [
            queuedWeight(),
            queuedWeight({
                plantId: "P02",
                requestId: "garden-queued-weight-67890",
                weight: "510",
            }),
        ];
        const { window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        queryElement(
            window.document,
            "#labelPickerMode",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            [
                ...queryElements(window.document, ".label-choice", HTMLElement),
            ].every((button) => button.classList.contains("queued-weighed"))
        ).toBe(true);
        expect(
            queryElement(window.document, "#queueCard", HTMLElement).classList
        ).toContain("queue-complete");
        expect(
            queryElement(window.document, "#queueProgress", HTMLElement)
                .textContent
        ).toBe("All 2 plants have a weight safely queued on this device.");
        expect(
            structuredClone(
                [
                    ...queryElements(
                        window.document,
                        "#plantSelect option",
                        HTMLOptionElement
                    ),
                ].map((option) => option.textContent)
            )
        ).toStrictEqual([
            expect.stringMatching(/^Queued · Moon cactus/v),
            expect.stringMatching(/^Queued · Yellow tower cactus/v),
        ]);
    });

    it("keeps the form intact when durable queue storage fails", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow();
        const originalSetItem = window.localStorage.setItem.bind(
            window.localStorage
        );
        const setItem = vi
            .spyOn(window.localStorage, "setItem")
            .mockImplementation((key, value) => {
                if (key === "gardenLoggerObservationQueueV1") {
                    throw new window.DOMException(
                        "Storage full",
                        "QuotaExceededError"
                    );
                }
                originalSetItem(key, value);
            });
        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        weight.value = "433";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));

        queryElement(
            window.document,
            "#queueButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(weight.value).toBe("433");
        expect(
            queryElement(window.document, "#plantSelect", HTMLSelectElement)
                .value
        ).toBe("P01");
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBeNull();
        expect(
            queryElement(window.document, "#toast", HTMLElement).textContent
        ).toMatch(/could not durably store/iv);

        setItem.mockRestore();
    });

    it("recovers a damaged primary queue from its verified backup", () => {
        expect.hasAssertions();

        const backup = [queuedWeight({ weight: "434" })];
        const { window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueBackupV1: JSON.stringify(backup),
                gardenLoggerObservationQueueV1: "{broken-json",
            },
        });

        expect(
            parseStoredQueue(
                window.localStorage.getItem("gardenLoggerObservationQueueV1")
            )
        ).toStrictEqual(backup);
        expect(
            window.localStorage.getItem(
                "gardenLoggerObservationQueueRecoveryV1"
            )
        ).toContain("broken-json");
        expect(
            queryElement(window.document, "#queueStorageWarning", HTMLElement)
                .textContent
        ).toMatch(/restored its verified backup/iv);

        queryElement(
            window.document,
            "#labelPickerMode",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            queryElement(
                window.document,
                '#labelPicker [data-plant-id="P01"]',
                HTMLElement
            ).classList.contains("queued-weighed")
        ).toBe(true);
    });

    it("restores the backup when the primary queue key is missing", () => {
        expect.hasAssertions();

        const backup = [queuedWeight({ weight: "435" })];
        const { window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueBackupV1: JSON.stringify(backup),
            },
        });

        expect(
            parseStoredQueue(
                window.localStorage.getItem("gardenLoggerObservationQueueV1")
            )
        ).toStrictEqual(backup);
        expect(
            queryElement(window.document, "#queueStorageWarning", HTMLElement)
                .textContent
        ).toMatch(/main phone queue was missing/iv);
    });

    it("retains the full queue if confirmed removal cannot be stored", () => {
        expect.hasAssertions();

        const queued = [queuedWeight()];
        const { behaviors, window } = createLoggerWindow({
            batchSaveStatus: "saved",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        const originalSetItem = window.localStorage.setItem.bind(
            window.localStorage
        );
        const setItem = vi
            .spyOn(window.localStorage, "setItem")
            .mockImplementation((key, value) => {
                if (
                    key === "gardenLoggerObservationQueueV1" &&
                    value === "[]"
                ) {
                    throw new window.DOMException(
                        "Storage full",
                        "QuotaExceededError"
                    );
                }
                originalSetItem(key, value);
            });
        behaviors.saveWebObservationBatch = ({ args, success }) => {
            success({
                failedCount: 0,
                ok: true,
                results: [
                    { ok: true, requestId: required(args[0][0]).requestId },
                ],
                savedCount: 1,
            });
        };

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        const primary = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        const backup = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueBackupV1")
        );

        expect(
            structuredClone(primary.map((entry) => entry.requestId))
        ).toStrictEqual([required(queued[0]).requestId]);
        expect(
            structuredClone(backup.map((entry) => entry.requestId))
        ).toStrictEqual([required(queued[0]).requestId]);
        expect(
            queryElement(window.document, "#toast", HTMLElement).textContent
        ).toMatch(/full pre-confirmation queue/iv);

        setItem.mockRestore();
    });

    it("does not send a batch unless attempted state is durably stored", () => {
        expect.hasAssertions();

        const queued = [queuedWeight()];
        const { calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        const originalSetItem = window.localStorage.setItem.bind(
            window.localStorage
        );
        const setItem = vi
            .spyOn(window.localStorage, "setItem")
            .mockImplementation((key, value) => {
                if (key === "gardenLoggerObservationQueueV1") {
                    throw new window.DOMException(
                        "Storage full",
                        "QuotaExceededError"
                    );
                }
                originalSetItem(key, value);
            });

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            calls.some((call) => call.method === "saveWebObservationBatch")
        ).toBe(false);
        expect(
            parseStoredQueue(
                window.localStorage.getItem("gardenLoggerObservationQueueV1")
            )
        ).toStrictEqual(queued);
        expect(
            queryElement(window.document, "#toast", HTMLElement).textContent
        ).toMatch(/retry safety could not be guaranteed/iv);

        setItem.mockRestore();
    });

    it("keeps a queued round on the phone while offline", () => {
        expect.hasAssertions();

        const queued = [queuedWeight()];
        const { calls, window } = createLoggerWindow({
            online: false,
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            parseStoredQueue(
                window.localStorage.getItem("gardenLoggerObservationQueueV1")
            )
        ).toHaveLength(1);
        expect(
            calls.some((call) => call.method === "saveWebObservationBatch")
        ).toBe(false);
        expect(
            queryElement(window.document, "#toast", HTMLElement).textContent
        ).toMatch(/offline/iv);
    });
});

describe("garden logger batch delivery and bounded retries", () => {
    afterEach(restoreLoggerMocks);

    it("accepts a complete successful batch without a History status call", () => {
        expect.hasAssertions();

        const queued = [queuedWeight({ requestId: "garden-queued-one-12345" })];
        const { behaviors, calls, window } = createLoggerWindow({
            batchSaveStatus: "saved",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        behaviors.saveWebObservationBatch = ({ args, success }) => {
            success({
                failedCount: 0,
                message: "1 queued observation saved.",
                ok: true,
                results: [
                    {
                        ok: true,
                        plantId: "P01",
                        requestId: required(args[0][0]).requestId,
                    },
                ],
                savedCount: 1,
            });
        };

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        const batchCalls = calls.filter(
            (call) => call.method === "saveWebObservationBatch"
        );

        expect(batchCalls).toHaveLength(1);
        expect(required(batchCalls[0]).args[0]).toHaveLength(1);
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
        expect(
            queryElement(window.document, "#queueCard", HTMLElement).hidden
        ).toBe(true);
    });

    it("sends all 30 queued observations in one durable server call", () => {
        expect.hasAssertions();

        const queued = Array.from({ length: 30 }, (_, index) =>
            queuedWeight({
                plantId: index % 2 ? "P02" : "P01",
                requestId: `garden-round-${String(index + 1).padStart(2, "0")}-12345`,
                weight: String(430 + index),
            })
        );
        const { behaviors, calls, window } = createLoggerWindow({
            batchSaveStatus: "saved",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        /** @type {import("../logger-fixtures.d.ts").ScriptHandlers<"saveWebObservationBatch">[]} */
        const pending = [];
        behaviors.saveWebObservationBatch = (handlers) => {
            pending.push(handlers);
        };

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(pending).toHaveLength(1);
        expect(required(pending[0]).args[0]).toHaveLength(30);
        expect(
            queryElement(window.document, "#queueSendButton", HTMLButtonElement)
                .textContent
        ).toBe("Sending all 30…");

        const attemptedPrimary = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        const attemptedBackup = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueBackupV1")
        );

        expect(attemptedPrimary).toHaveLength(30);
        expect(
            attemptedPrimary.every((entry) => (entry.attemptedAt ?? "") !== "")
        ).toBe(true);
        expect(structuredClone(attemptedBackup)).toStrictEqual(
            attemptedPrimary
        );

        const [current] = pending;
        required(current).success({
            failedCount: 0,
            ok: true,
            results: required(current).args[0].map((payload) => ({
                ok: true,
                requestId: payload.requestId,
            })),
            savedCount: 30,
        });

        const batchCalls = calls.filter(
            (call) => call.method === "saveWebObservationBatch"
        );

        expect(
            structuredClone(batchCalls.map((call) => call.args[0].length))
        ).toStrictEqual([30]);
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
        expect(
            queryElement(window.document, "#queueSendButton", HTMLButtonElement)
                .disabled
        ).toBe(true);
    });

    it("keeps Send disabled and accepts a successful callback after 112 seconds", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
            batchSaveStatus: "saved",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        /**
         * @type {import("../logger-fixtures.d.ts").ScriptHandlers<"saveWebObservationBatch">
         *     | undefined}
         */
        let pending;
        behaviors.saveWebObservationBatch = (handlers) => {
            pending = handlers;
        };

        const send = queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        );
        send.dispatchEvent(new window.Event("click", { bubbles: true }));
        vi.advanceTimersByTime(45_000);

        expect(send.disabled).toBe(true);
        expect(
            queryElement(window.document, "#plantSelect", HTMLSelectElement)
                .disabled
        ).toBe(true);
        expect(
            queryElement(window.document, "#toast", HTMLElement).textContent
        ).toMatch(/still processing/iv);
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);

        send.dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            calls.filter((call) => call.method === "saveWebObservationBatch")
        ).toHaveLength(1);
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);

        vi.advanceTimersByTime(67_000);
        required(pending).success({
            failedCount: 0,
            ok: true,
            results: [{ ok: true, requestId: required(queued[0]).requestId }],
            savedCount: 1,
        });

        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);
    });

    it("reconciles transient failures and retries after 2 and 5 seconds", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        let attempts = 0;
        behaviors.saveWebObservationBatch = ({ args, failure, success }) => {
            attempts += 1;
            if (attempts < 3) {
                failure({ message: "Transient Google error" });
                return;
            }
            success({
                failedCount: 0,
                ok: true,
                results: [
                    { ok: true, requestId: required(args[0][0]).requestId },
                ],
                savedCount: 1,
            });
        };
        behaviors.getWebBatchSaveStatus = ({ args, success }) => {
            success(
                args[0].map((request) => ({
                    expectedCount: request.expectedCount,
                    requestId: request.requestId,
                    savedCount: attempts >= 3 ? request.expectedCount : 0,
                    state: attempts >= 3 ? "saved" : "missing",
                }))
            );
        };

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(attempts).toBe(1);

        vi.advanceTimersByTime(1999);

        expect(attempts).toBe(1);

        vi.advanceTimersByTime(1);

        expect(attempts).toBe(2);

        vi.advanceTimersByTime(4999);

        expect(attempts).toBe(2);

        vi.advanceTimersByTime(1);

        expect(attempts).toBe(3);
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(2);
    });

    it("reconciles a nominal response that omits an expected request ID", () => {
        expect.hasAssertions();

        const queued = [
            queuedWeight({ requestId: "garden-omitted-one-12345" }),
            queuedWeight({
                plantId: "P02",
                requestId: "garden-omitted-two-12345",
            }),
        ];
        const { behaviors, calls, window } = createLoggerWindow({
            batchSaveStatus: "saved",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        behaviors.saveWebObservationBatch = ({ success }) => {
            success({
                failedCount: 0,
                ok: true,
                results: [
                    {
                        ok: true,
                        requestId: "garden-omitted-one-12345",
                    },
                ],
                savedCount: 2,
            });
        };

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(1);
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
    });

    it("retries every confirmed-missing ID together after a failed whole-queue call", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const queued = [
            queuedWeight({ requestId: "garden-grouped-saved-12345" }),
            queuedWeight({
                plantId: "P02",
                requestId: "garden-grouped-missing-one-12345",
            }),
            queuedWeight({ requestId: "garden-grouped-missing-two-12345" }),
        ];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        let attempts = 0;
        behaviors.saveWebObservationBatch = ({ args, failure, success }) => {
            attempts += 1;
            if (attempts === 1) {
                failure({ message: "Transient Google error" });
                return;
            }
            success({
                failedCount: 0,
                ok: true,
                results: args[0].map((payload) => ({
                    ok: true,
                    requestId: payload.requestId,
                })),
                savedCount: args[0].length,
            });
        };
        behaviors.getWebBatchSaveStatus = ({ args, success }) => {
            success(
                args[0].map((request) => ({
                    expectedCount: request.expectedCount,
                    requestId: request.requestId,
                    savedCount: request.requestId.includes("saved") ? 1 : 0,
                    state: request.requestId.includes("saved")
                        ? "saved"
                        : "missing",
                }))
            );
        };

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        vi.advanceTimersByTime(2000);

        const batchCalls = calls.filter(
            (call) => call.method === "saveWebObservationBatch"
        );

        expect(
            structuredClone(batchCalls.map((call) => call.args[0].length))
        ).toStrictEqual([3, 2]);
        expect(
            structuredClone(
                required(batchCalls[1]).args[0].map(
                    (payload) => payload.requestId
                )
            )
        ).toStrictEqual([
            "garden-grouped-missing-one-12345",
            "garden-grouped-missing-two-12345",
        ]);
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(1);
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
    });

    it("stops after three bounded retries and preserves unresolved entries", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        behaviors.saveWebObservationBatch = ({ failure }) => {
            failure({ message: "Transient Google error" });
        };

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        vi.advanceTimersByTime(2000);
        vi.advanceTimersByTime(5000);
        vi.advanceTimersByTime(10_000);

        expect(
            calls.filter((call) => call.method === "saveWebObservationBatch")
        ).toHaveLength(4);

        const remaining = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );

        expect(remaining).toHaveLength(1);
        expect(required(remaining[0]).error).toMatch(
            /three automatic retries/iv
        );
        expect(
            queryElement(window.document, "#queueSendButton", HTMLButtonElement)
                .disabled
        ).toBe(false);
        expect(
            queryElement(window.document, "#queueProgress", HTMLElement)
                .textContent
        ).toBe("0 confirmed · 1 still safely queued");
    });

    it("does not retry a deterministic per-entry validation failure", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        behaviors.saveWebObservationBatch = ({ args, success }) => {
            success({
                failedCount: 1,
                ok: false,
                results: [
                    {
                        message: "Fix this measurement.",
                        ok: false,
                        requestId: required(args[0][0]).requestId,
                        retryable: false,
                    },
                ],
                savedCount: 0,
            });
        };

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        // Advance beyond the complete queue execution/retry window. The UI's
        // clock continues to tick for freshness and workbook-day rollover.
        vi.advanceTimersByTime(600_000);

        expect(
            calls.filter((call) => call.method === "saveWebObservationBatch")
        ).toHaveLength(1);
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);

        const remaining = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );

        expect(remaining[0]).toMatchObject({
            attemptedAt: "",
            error: "Fix this measurement.",
        });
    });
});

describe("garden logger queue reconciliation and reload recovery", () => {
    afterEach(restoreLoggerMocks);

    it("reconciles once after six minutes thirty seconds and ignores a later callback", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        /**
         * @type {import("../logger-fixtures.d.ts").ScriptHandlers<"saveWebObservationBatch">
         *     | undefined}
         */
        let pending;
        behaviors.saveWebObservationBatch = (handlers) => {
            pending = handlers;
        };

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));
        vi.advanceTimersByTime(390_000);

        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(1);

        const remainingBeforeLateCallback = window.localStorage.getItem(
            "gardenLoggerObservationQueueV1"
        );

        expect(parseStoredQueue(remainingBeforeLateCallback)).toHaveLength(1);
        expect(
            queryElement(window.document, "#queueSendButton", HTMLButtonElement)
                .disabled
        ).toBe(false);

        required(pending).success({
            failedCount: 0,
            ok: true,
            results: [{ ok: true, requestId: required(queued[0]).requestId }],
            savedCount: 1,
        });

        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe(remainingBeforeLateCallback);
    });

    it("removes confirmed items but retains failed batch entries", () => {
        expect.hasAssertions();

        const queued = [
            queuedWeight({ requestId: "garden-queued-saved-12345" }),
            queuedWeight({
                plantId: "P02",
                requestId: "garden-queued-failed-12345",
                weight: "510",
            }),
        ];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        behaviors.saveWebObservationBatch = ({ success }) => {
            success({
                failedCount: 1,
                message: "1 saved; 1 needs attention.",
                ok: false,
                results: [
                    {
                        ok: true,
                        requestId: "garden-queued-saved-12345",
                    },
                    {
                        message: "Weight needs review.",
                        ok: false,
                        requestId: "garden-queued-failed-12345",
                        retryable: false,
                    },
                ],
                savedCount: 1,
            });
        };
        behaviors.getWebBatchSaveStatus = ({ args, success }) => {
            success(
                args[0].map((request) => ({
                    expectedCount: request.expectedCount,
                    requestId: request.requestId,
                    savedCount:
                        request.requestId === "garden-queued-saved-12345"
                            ? request.expectedCount
                            : 0,
                    state:
                        request.requestId === "garden-queued-saved-12345"
                            ? "saved"
                            : "missing",
                }))
            );
        };

        queryElement(
            window.document,
            "#queueSendButton",
            HTMLButtonElement
        ).dispatchEvent(new window.Event("click", { bubbles: true }));

        const remaining = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );

        expect(remaining).toHaveLength(1);
        expect(remaining[0]).toMatchObject({
            attemptedAt: "",
            error: "Weight needs review.",
            requestId: "garden-queued-failed-12345",
        });
        expect(
            queryElement(window.document, "#queueList", HTMLElement).textContent
        ).toMatch(/Weight needs review/v);
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);
    });

    it("reconciles an attempted queue after reload", () => {
        expect.hasAssertions();

        const queued = [
            {
                attemptedAt: "2026-08-16T12:01:00.000Z",
                payload: {
                    events: ["Weigh"],
                    observedAt: "2026-08-16T12:00:00.000Z",
                    plantId: "P01",
                    weight: "431",
                    weightState: "Routine",
                },
                requestId: "garden-queued-saved-12345",
            },
        ];
        const { window } = createLoggerWindow({
            batchSaveStatus: "saved",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });

        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
    });

    it("reload recovery clears saved entries, resets missing ones, and preserves incomplete ones", () => {
        expect.hasAssertions();

        const queued = [
            queuedWeight({
                attemptedAt: "2026-08-16T12:01:00.000Z",
                requestId: "garden-reload-saved-12345",
            }),
            queuedWeight({
                attemptedAt: "2026-08-16T12:01:00.000Z",
                requestId: "garden-reload-missing-12345",
            }),
            queuedWeight({
                attemptedAt: "2026-08-16T12:01:00.000Z",
                requestId: "garden-reload-incomplete-12345",
            }),
        ];
        const { window } = createLoggerWindow({
            batchSaveStatus: (
                /** @type {{ requestId: string | string[] }} */ request
            ) =>
                request.requestId.includes("saved")
                    ? "saved"
                    : request.requestId.includes("incomplete")
                      ? "incomplete"
                      : "missing",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });

        const remaining = parseStoredQueue(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );

        expect(remaining).toHaveLength(2);
        expect(remaining[0]).toMatchObject({
            attemptedAt: "",
            requestId: "garden-reload-missing-12345",
        });
        expect(remaining[1]).toMatchObject({
            attemptedAt: "2026-08-16T12:01:00.000Z",
            requestId: "garden-reload-incomplete-12345",
        });
        expect(required(remaining[1]).error).toMatch(/kept for review/iv);
    });
});

describe("garden logger mobile orientation and hit targets", () => {
    afterEach(restoreLoggerMocks);

    it("does not cancel an active save when the phone orientation changes", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveWebObservation = () => {};
        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        weight.value = "432";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        queryElement(
            window.document,
            "#entryForm",
            HTMLFormElement
        ).dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        window.dispatchEvent(new window.Event("orientationchange"));
        vi.advanceTimersByTime(350);

        expect(
            queryElement(window.document, "#saveButton", HTMLButtonElement)
                .disabled
        ).toBe(true);
        expect(calls.some((call) => call.method === "getWebSaveStatus")).toBe(
            false
        );

        vi.advanceTimersByTime(20_000);

        expect(
            queryElement(window.document, "#saveButton", HTMLButtonElement)
                .disabled
        ).toBe(false);
        expect(calls.some((call) => call.method === "getWebSaveStatus")).toBe(
            true
        );
    });

    it("blocks a stale mobile hit target from submitting outside the visible Save button", () => {
        expect.hasAssertions();

        const { calls, window } = createLoggerWindow();
        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        const saveButton = queryElement(
            window.document,
            "#saveButton",
            HTMLButtonElement
        );
        weight.value = "433";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        saveButton.getBoundingClientRect = () => new DOMRect(10, 700, 180, 52);

        saveButton.dispatchEvent(
            new window.MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                clientX: 40,
                clientY: 120,
                detail: 1,
            })
        );

        expect(calls.some((call) => call.method === "saveWebObservation")).toBe(
            false
        );
        expect(window.document.documentElement.className).toContain(
            "mobile-hit-recovery"
        );
        expect(
            queryElement(window.document, "#toast", HTMLElement).textContent
        ).toMatch(/misplaced tap/iv);
        expect(weight.value).toBe("433");
    });

    it("still accepts a physical tap inside the visible Save button", () => {
        expect.hasAssertions();

        const { calls, window } = createLoggerWindow();
        const weight = queryElement(
            window.document,
            "#weight",
            HTMLInputElement
        );
        const saveButton = queryElement(
            window.document,
            "#saveButton",
            HTMLButtonElement
        );
        weight.value = "434";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        saveButton.getBoundingClientRect = () => new DOMRect(10, 700, 180, 52);

        saveButton.dispatchEvent(
            new window.MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                clientX: 80,
                clientY: 726,
                detail: 1,
            })
        );

        expect(calls.some((call) => call.method === "saveWebObservation")).toBe(
            true
        );
        expect(window.document.documentElement.className).not.toContain(
            "mobile-hit-recovery"
        );
    });

    it("blocks a stale label-grid target after a phone layout change", () => {
        expect.hasAssertions();

        const { window } = createLoggerWindow({
            storage: { gardenLoggerPlantPickerModeV1: "labels" },
        });
        const staleTarget = queryElement(
            window.document,
            '#labelPicker [data-plant-id="P02"]',
            HTMLElement
        );
        staleTarget.getBoundingClientRect = () => new DOMRect(10, 112, 60, 48);

        staleTarget.dispatchEvent(
            new window.MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                clientX: 40,
                clientY: 260,
                detail: 1,
            })
        );

        expect(
            queryElement(window.document, "#plantSelect", HTMLSelectElement)
                .value
        ).toBe("P01");
        expect(window.document.documentElement.className).toContain(
            "mobile-hit-recovery"
        );
        expect(
            queryElement(window.document, "#toast", HTMLElement).textContent
        ).toMatch(/misplaced tap/iv);
        expect(
            queryElement(
                window.document,
                '#labelPicker [data-plant-id="P02"]',
                HTMLElement
            )
        ).not.toBe(staleTarget);
    });

    it("rebuilds label hit targets after orientation changes while retaining portraits", () => {
        expect.hasAssertions();

        vi.useFakeTimers();
        const { window } = createLoggerWindow({
            storage: { gardenLoggerPlantPickerModeV1: "labels" },
        });
        const original = queryElement(
            window.document,
            '#labelPicker [data-plant-id="P01"]',
            HTMLElement
        );
        const portrait = queryElement(original, "img", HTMLImageElement);

        window.dispatchEvent(new window.Event("orientationchange"));
        vi.advanceTimersByTime(250);

        expect(
            queryElement(
                window.document,
                '#labelPicker [data-plant-id="P01"]',
                HTMLElement
            )
        ).not.toBe(original);
        expect(
            queryElement(
                window.document,
                '#labelPicker [data-plant-id="P01"] img',
                HTMLImageElement
            )
        ).toBe(portrait);
        expect(window.document.documentElement.className).toContain(
            "mobile-hit-recovery"
        );
    });
});
