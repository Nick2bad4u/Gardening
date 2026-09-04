import fs from "node:fs";

import { Window } from "happy-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const html = fs.readFileSync(
    new URL("../../scripts/google-sheets/Index.html", import.meta.url),
    "utf8"
);
const scriptSource = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(
    -1
)[1];
const trackerDataSource = fs.readFileSync(
    new URL("../../docs/layouts/plant-tracker-data.js", import.meta.url),
    "utf8"
);
const { comparePlantsByNaturalLabel } = await import(
    `data:text/javascript;base64,${Buffer.from(trackerDataSource).toString("base64")}`
);

const bootstrap = {
    version: "test",
    serverTime: "2026-08-15T14:00:00.000Z",
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
        spreadsheet: "https://example.test/sheet",
        quickLog: "https://example.test/quick",
        fieldGuide: "https://example.test/guide",
        tracker: "https://example.test/tracker",
        layout: "https://example.test/layout",
        calendar: "https://example.test/calendar",
        photos: "https://example.test/photos",
    },
    plants: [
        {
            id: "P01",
            name: "Moon cactus",
            scientificName: "Gymnocalycium mihanovichii",
            label: "A1",
            potSetup: 2,
            currentPotSize: "4 in",
            lastWatered: "Jul 31, 2026",
            daysSinceWater: 15,
            latestWeight: 420,
            dryOrLowestWeight: 398,
            dryOrLowestWeightBasis: "Dry",
            dryOrLowestWeightDate: "Aug 10, 2026",
            fieldGuideUrl: "https://example.test/guide#p01",
            historyUrl: "https://example.test/history?id=P01",
        },
        {
            id: "P02",
            name: "Yellow tower cactus",
            scientificName: "Parodia leninghausii",
            label: "F3",
            potSetup: 2,
            currentPotSize: "4 in",
            lastWatered: "Aug 15, 2026",
            daysSinceWater: 1,
            latestWeight: 510,
            dryOrLowestWeight: 475,
            dryOrLowestWeightBasis: "Lowest",
            dryOrLowestWeightDate: "Aug 2, 2026",
            fieldGuideUrl: "https://example.test/guide#p02",
            historyUrl: "https://example.test/history?id=P02",
        },
    ],
    recent: [],
};

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

function canonicalBootstrap() {
    return {
        ...bootstrap,
        plants: canonicalPlantLabels.map((label, index) => {
            const id = `P${String(index + 1).padStart(2, "0")}`;
            return {
                id,
                name: `Plant ${id}`,
                scientificName: `Scientific ${id}`,
                label,
                potSetup: 1,
                currentPotSize: "4 in",
                lastWatered: "",
                daysSinceWater: "",
                latestWeight: "",
                dryOrLowestWeight: "",
                dryOrLowestWeightBasis: "",
                dryOrLowestWeightDate: "",
                fieldGuideUrl: `https://example.test/guide#${id}`,
                historyUrl: `https://example.test/history?id=${id}`,
                currentImageUrl:
                    id === "P23" ? p23ImageUrls.currentImageUrl : "",
                nurseryLabelImageUrl:
                    id === "P23" ? p23ImageUrls.nurseryLabelImageUrl : "",
            };
        }),
    };
}

function queuedWeight({
    requestId = "garden-queued-weight-12345",
    plantId = "P01",
    weight = "430",
    attemptedAt,
} = {}) {
    return {
        requestId,
        addedAt: "2026-08-16T12:00:00.000Z",
        ...(attemptedAt ? { attemptedAt } : {}),
        payload: {
            plantId,
            events: ["Weigh"],
            observedAt: "2026-08-16T12:00:00.000Z",
            weightState: "Routine",
            weight,
            height: "",
            width: "",
            condition: "",
            notes: "",
            potSetup: "2",
            nutrientsUsed: "",
            nutrientProduct: "",
            nutrientAmount: "",
            potSize: "",
            flowerCount: "",
            flowerDetails: "",
            photoUrl: "",
            pestIssue: "",
            pestTreatment: "",
            rotationDegrees: "",
        },
    };
}

function createScriptRunner(behaviors, calls) {
    return function createChain() {
        let successHandler = () => {};
        let failureHandler = () => {};
        const chain = new Proxy(
            {},
            {
                get(_target, property) {
                    if (property === "withSuccessHandler") {
                        return (handler) => {
                            successHandler = handler;
                            return chain;
                        };
                    }
                    if (property === "withFailureHandler") {
                        return (handler) => {
                            failureHandler = handler;
                            return chain;
                        };
                    }
                    return (...args) => {
                        calls.push({ method: property, args });
                        const behavior = behaviors[property];
                        if (behavior) {
                            behavior({
                                args,
                                success: successHandler,
                                failure: failureHandler,
                            });
                        }
                    };
                },
            }
        );
        return chain;
    };
}

function createLoggerWindow({
    bootstrapData = bootstrap,
    bootstrapBehavior,
    online = true,
    pendingSave,
    saveStatus = "missing",
    batchSaveStatus = "missing",
    storage = {},
    storageUnavailable = false,
    matchMediaUnavailable = false,
} = {}) {
    const window = new Window({
        url: "https://script.google.com/macros/s/test/exec",
    });
    Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        value: online,
    });
    window.setTimeout = globalThis.setTimeout;
    window.clearTimeout = globalThis.clearTimeout;
    window.document.write(html);
    Object.entries(storage).forEach(([key, value]) =>
        window.localStorage.setItem(key, value)
    );
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
        [window.localStorage, window.sessionStorage].forEach((target) => {
            vi.spyOn(target, "getItem").mockImplementation(unavailable);
            vi.spyOn(target, "setItem").mockImplementation(unavailable);
            vi.spyOn(target, "removeItem").mockImplementation(unavailable);
        });
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

    const calls = [];
    const behaviors = {
        getWebAppBootstrap:
            bootstrapBehavior || (({ success }) => success(bootstrapData)),
        getWebSaveStatus: ({ success }) =>
            success({
                state: saveStatus,
                message: "Status checked",
            }),
        getWebBatchSaveStatus: ({ args, success }) =>
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
            ),
        getRecentWebObservations: ({ success }) => success([]),
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

    window.eval(scriptSource);
    return { behaviors, calls, window };
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("Garden logger browser recovery", () => {
    it("opens from a recent saved plant list while Google refreshes in the background", () => {
        let refreshHandlers;
        const { calls, window } = createLoggerWindow({
            bootstrapBehavior: (handlers) => {
                refreshHandlers = handlers;
            },
            storage: {
                gardenLoggerBootstrapV1: JSON.stringify({
                    savedAt: Date.now(),
                    bootstrap,
                }),
            },
        });

        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(1);
        expect(window.document.querySelector("#loading").hidden).toBe(true);
        expect(window.document.querySelector("#modeTabs").hidden).toBe(false);
        expect(
            window.document.querySelector("#connectionStatus").textContent
        ).toBe("Using saved plant list · refreshing Google…");
        expect(
            window.document.querySelector("#observedAt").value
        ).not.toContain("2026-08-15");

        refreshHandlers.success({ ...bootstrap, version: "fresh" });

        expect(
            window.document.querySelector("#connectionStatus").textContent
        ).toBe("Connected · logger fresh");
        expect(
            JSON.parse(window.localStorage.getItem("gardenLoggerBootstrapV1"))
                .bootstrap.version
        ).toBe("fresh");
    });

    it("keeps the cached logger usable when its background refresh fails", () => {
        const { window } = createLoggerWindow({
            bootstrapBehavior: ({ failure }) =>
                failure({ message: "Storage unavailable" }),
            storage: {
                gardenLoggerBootstrapV1: JSON.stringify({
                    savedAt: Date.now(),
                    bootstrap,
                }),
            },
        });

        expect(window.document.querySelector("#loading").hidden).toBe(true);
        expect(window.document.querySelector("#modeTabs").hidden).toBe(false);
        expect(
            window.document.querySelector("#connectionStatus").textContent
        ).toBe("Using saved plant list · Google refresh unavailable");
    });

    it("ignores an expired saved plant list and requests current data", () => {
        const { calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerBootstrapV1: JSON.stringify({
                    savedAt: Date.now() - 6 * 60 * 60 * 1000 - 1,
                    bootstrap,
                }),
            },
        });

        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(1);
        expect(
            window.document.querySelector("#connectionStatus").textContent
        ).toBe("Connected · logger test");
        expect(
            JSON.parse(window.localStorage.getItem("gardenLoggerBootstrapV1"))
                .bootstrap.version
        ).toBe("test");
    });

    it("automatically retries a dropped bootstrap callback and clears its watchdog after recovery", () => {
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
        expect(window.document.querySelector("#loading").hidden).toBe(true);
        expect(window.document.querySelector("#modeTabs").hidden).toBe(false);
        expect(
            window.document.querySelector("#connectionStatus").textContent
        ).toBe("Connected · logger test");

        vi.advanceTimersByTime(20_000);
        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(2);
    });

    it("replaces an endless loading state with recovery controls and supports a manual retry", () => {
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
        expect(window.document.querySelector("#loadingTitle").textContent).toBe(
            "Could not finish loading your plants."
        );
        expect(
            window.document.querySelector("#loadingDetail").textContent
        ).toMatch(/did not answer within 20 seconds/);
        expect(window.document.querySelector("#loadingActions").hidden).toBe(
            false
        );
        expect(window.document.querySelector("#loadingSpinner").hidden).toBe(
            true
        );
        expect(
            window.document.querySelector("#connectionStatus").textContent
        ).toBe("Connection failed");

        shouldSucceed = true;
        window.document
            .querySelector("#retryBootstrapButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            calls.filter((call) => call.method === "getWebAppBootstrap")
        ).toHaveLength(3);
        expect(window.document.querySelector("#loading").hidden).toBe(true);
        expect(window.document.querySelector("#modeTabs").hidden).toBe(false);
    });

    it("ignores a late callback from an expired bootstrap attempt", () => {
        vi.useFakeTimers();
        const attempts = [];
        const { window } = createLoggerWindow({
            bootstrapBehavior: (handlers) => attempts.push(handlers),
        });

        vi.advanceTimersByTime(20_000);
        expect(attempts).toHaveLength(2);

        attempts[0].success({ ...bootstrap, version: "stale" });
        expect(window.document.querySelector("#modeTabs").hidden).toBe(true);
        expect(
            window.document.querySelector("#connectionStatus").textContent
        ).toBe("Retrying the spreadsheet connection…");

        attempts[1].success(bootstrap);
        expect(window.document.querySelector("#modeTabs").hidden).toBe(false);
        expect(
            window.document.querySelector("#connectionStatus").textContent
        ).toBe("Connected · logger test");
        attempts[1].failure({ message: "Late failure" });
        expect(
            window.document.querySelector("#connectionStatus").textContent
        ).toBe("Connected · logger test");
    });

    it("shows a useful recovery state when Google reports a bootstrap failure", () => {
        const { window } = createLoggerWindow({
            bootstrapBehavior: ({ failure }) => failure({}),
        });

        expect(window.document.querySelector("#loadingTitle").textContent).toBe(
            "Could not finish loading garden data."
        );
        expect(
            window.document.querySelector("#loadingDetail").textContent
        ).toMatch(/Google did not return an error message/);
        expect(window.document.querySelector("#loadingActions").hidden).toBe(
            false
        );
    });

    it("automatically clears a recovered draft that already reached History", () => {
        const pendingSave = {
            requestId: "garden-recovered-12345",
            payload: {
                plantId: "P01",
                events: ["Weigh"],
                observedAt: "2026-08-15T14:00:00.000Z",
                weightState: "Routine",
                weight: "420",
                height: "",
                width: "",
                condition: "",
                notes: "",
                potSetup: "2",
                nutrientsUsed: "",
                nutrientProduct: "",
                nutrientAmount: "",
                potSize: "",
                flowerCount: "",
                flowerDetails: "",
                photoUrl: "",
                pestIssue: "",
                pestTreatment: "",
            },
        };
        const { calls, window } = createLoggerWindow({
            pendingSave,
            saveStatus: "saved",
        });

        expect(
            window.localStorage.getItem("gardenLoggerPendingSaveV1")
        ).toBeNull();
        expect(window.document.querySelector("#weight").value).toBe("");
        expect(window.document.querySelector("#toast").textContent).toMatch(
            /already in History/
        );
        expect(calls.some((call) => call.method === "getWebSaveStatus")).toBe(
            true
        );
    });

    it("keeps an unconfirmed recovered draft available for a safe retry", () => {
        const pendingSave = {
            requestId: "garden-missing-12345",
            payload: {
                plantId: "P01",
                events: ["Weigh"],
                observedAt: "2026-08-15T14:00:00.000Z",
                weightState: "Routine",
                weight: "421",
                height: "",
                width: "",
                condition: "",
                notes: "",
                potSetup: "2",
                nutrientsUsed: "",
                nutrientProduct: "",
                nutrientAmount: "",
                potSize: "",
                flowerCount: "",
                flowerDetails: "",
                photoUrl: "",
                pestIssue: "",
                pestTreatment: "",
            },
        };
        const { window } = createLoggerWindow({ pendingSave });

        expect(
            window.localStorage.getItem("gardenLoggerPendingSaveV1")
        ).not.toBeNull();
        expect(window.document.querySelector("#weight").value).toBe("421");
        expect(window.document.querySelector("#measurementUnit").value).toBe(
            "cm"
        );
        expect(window.document.querySelector("#heightLabel").textContent).toBe(
            "Height (cm)"
        );
        expect(window.document.querySelector("#saveButton").disabled).toBe(
            false
        );
    });

    it("releases a hanging save after the watchdog and checks History", () => {
        vi.useFakeTimers();
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveWebObservation = () => {};

        const weight = window.document.querySelector("#weight");
        weight.value = "422";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        window.document.querySelector("#entryForm").dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        expect(window.document.querySelector("#saveButton").disabled).toBe(
            true
        );
        vi.advanceTimersByTime(20_000);

        expect(window.document.querySelector("#saveButton").disabled).toBe(
            false
        );
        expect(
            window.localStorage.getItem("gardenLoggerPendingSaveV1")
        ).not.toBeNull();
        expect(calls.some((call) => call.method === "getWebSaveStatus")).toBe(
            true
        );
    });

    it("ignores a late callback from an older retry attempt", () => {
        vi.useFakeTimers();
        const { behaviors, window } = createLoggerWindow();
        const saves = [];
        behaviors.saveWebObservation = (handlers) => saves.push(handlers);

        const weight = window.document.querySelector("#weight");
        weight.value = "423";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        const form = window.document.querySelector("#entryForm");
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
        expect(window.document.querySelector("#saveButton").disabled).toBe(
            true
        );
        saves[0].failure({ message: "Late failure" });
        expect(window.document.querySelector("#saveButton").disabled).toBe(
            true
        );
        saves[1].success({ message: "Saved" });
        expect(window.document.querySelector("#saveButton").disabled).toBe(
            false
        );
        expect(
            window.localStorage.getItem("gardenLoggerPendingSaveV1")
        ).toBeNull();
    });

    it("lets a confirmed failed entry be corrected without Clear entry", () => {
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveWebObservation = ({ failure }) =>
            failure({ message: "Server rejected the entry" });

        const weight = window.document.querySelector("#weight");
        const form = window.document.querySelector("#entryForm");
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
        const failedPending = JSON.parse(
            window.localStorage.getItem("gardenLoggerPendingSaveV1")
        );
        expect(failedPending.replaceable).toBe(true);

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
        expect(saveCalls[1].args[0].requestId).not.toBe(
            firstSave.args[0].requestId
        );
        expect(saveCalls[1].args[0].weight).toBe("425");
    });

    it("does not replace a timed-out request that may still be running", () => {
        vi.useFakeTimers();
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveWebObservation = () => {};

        const weight = window.document.querySelector("#weight");
        const form = window.document.querySelector("#entryForm");
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
            JSON.parse(window.localStorage.getItem("gardenLoggerPendingSaveV1"))
                .replaceable
        ).not.toBe(true);
    });

    it("also releases and reconciles a hanging watering-round save", () => {
        vi.useFakeTimers();
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveBulkCareObservation = () => {};

        window.document
            .querySelector("#bulkModeTab")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        window.document.querySelector("#bulkNutrientsUsed").value = "No";
        const checkbox = window.document.querySelector(
            "#bulkPlantList input[type='checkbox']"
        );
        checkbox.checked = true;
        checkbox.dispatchEvent(new window.Event("change", { bubbles: true }));
        window.document.querySelector("#bulkWaterForm").dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        expect(window.document.querySelector("#bulkSaveButton").disabled).toBe(
            true
        );
        vi.advanceTimersByTime(20_000);

        expect(window.document.querySelector("#bulkSaveButton").disabled).toBe(
            false
        );
        expect(
            window.localStorage.getItem("gardenLoggerBulkPendingV1")
        ).not.toBeNull();
        expect(calls.some((call) => call.method === "getWebSaveStatus")).toBe(
            true
        );

        window.document.querySelector("#bulkNotes").value = "Changed round";
        window.document.querySelector("#bulkWaterForm").dispatchEvent(
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
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveBulkCareObservation = ({ failure }) =>
            failure({ message: "Server rejected the round" });

        window.document
            .querySelector("#bulkModeTab")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        window.document.querySelector("#bulkNutrientsUsed").value = "No";
        const checkbox = window.document.querySelector(
            "#bulkPlantList input[type='checkbox']"
        );
        checkbox.checked = true;
        checkbox.dispatchEvent(new window.Event("change", { bubbles: true }));
        const form = window.document.querySelector("#bulkWaterForm");
        form.dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        const failedPending = JSON.parse(
            window.localStorage.getItem("gardenLoggerBulkPendingV1")
        );
        expect(failedPending.replaceable).toBe(true);

        window.document.querySelector("#bulkNotes").value = "Corrected round";
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
        expect(saveCalls[1].args[0].requestId).not.toBe(
            saveCalls[0].args[0].requestId
        );
    });

    it("queues a weight without asking for a manual state or adding Water", () => {
        const { window } = createLoggerWindow();
        expect(window.document.querySelector("#weightStates")).toBeNull();
        const weight = window.document.querySelector("#weight");
        weight.value = "889";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        window.document
            .querySelector("#queueButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        const queue = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        expect(queue).toHaveLength(1);
        expect(queue[0].payload).toMatchObject({
            weight: "889",
            events: ["Weigh"],
            nutrientsUsed: "",
        });
        expect(queue[0].payload).not.toHaveProperty("weightState");
    });

    it("remembers nutrient choices across single and bulk care in one session", () => {
        const { window } = createLoggerWindow();
        const water = window.document.querySelector(
            '#eventChips [data-event="Water"]'
        );
        water.dispatchEvent(new window.Event("click", { bubbles: true }));
        const nutrients = window.document.querySelector("#nutrientsUsed");
        const product = window.document.querySelector("#nutrientProduct");
        const amount = window.document.querySelector("#nutrientAmount");
        nutrients.value = "Yes";
        nutrients.dispatchEvent(new window.Event("change", { bubbles: true }));
        product.value = "MSU 13-3-15";
        product.dispatchEvent(new window.Event("input", { bubbles: true }));
        amount.value = "0.5 g/gal";
        amount.dispatchEvent(new window.Event("input", { bubbles: true }));

        window.document
            .querySelector("#queueButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        window.document
            .querySelector("#bulkModeTab")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(window.document.querySelector("#bulkNutrientsUsed").value).toBe(
            "Yes"
        );
        expect(
            window.document.querySelector("#bulkNutrientProduct").value
        ).toBe("MSU 13-3-15");
        expect(window.document.querySelector("#bulkNutrientAmount").value).toBe(
            "0.5 g/gal"
        );
        expect(
            JSON.parse(
                window.sessionStorage.getItem("gardenLoggerNutrientStateV1")
            )
        ).toEqual({
            nutrientsUsed: "Yes",
            nutrientProduct: "MSU 13-3-15",
            nutrientAmount: "0.5 g/gal",
        });
    });

    it("queues a 90 degree rotation and submits bulk rotation generically", () => {
        const { behaviors, calls, window } = createLoggerWindow();
        window.document
            .querySelector('#eventChips [data-event="Rotation"]')
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        expect(window.document.querySelector("#rotationDegrees").value).toBe(
            "90"
        );
        window.document
            .querySelector("#queueButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        const queue = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        expect(queue[0].payload).toMatchObject({
            events: ["Rotation"],
            rotationDegrees: "90",
        });

        behaviors.saveBulkCareObservation = ({ success }) =>
            success({ message: "Rotation saved." });
        window.document
            .querySelector("#bulkModeTab")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        window.document
            .querySelector('#bulkEventChips [data-event="Water"]')
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        window.document
            .querySelector('#bulkEventChips [data-event="Rotation"]')
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        const checkbox = window.document.querySelector(
            "#bulkPlantList input[type='checkbox']"
        );
        checkbox.checked = true;
        checkbox.dispatchEvent(new window.Event("change", { bubbles: true }));
        window.document.querySelector("#bulkWaterForm").dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        const call = calls.find(
            (candidate) => candidate.method === "saveBulkCareObservation"
        );
        expect(call.args[0]).toMatchObject({
            events: ["Rotation"],
            rotationDegrees: "90",
            entrySource: "Mobile bulk care",
        });
    });

    it("restores the label-button picker and remembers a selected plant", () => {
        const { window } = createLoggerWindow({
            storage: {
                gardenLoggerPlantPickerModeV1: "labels",
                gardenPlantId: "P02",
            },
        });

        expect(window.document.querySelector("#labelPicker").hidden).toBe(
            false
        );
        expect(
            window.document
                .querySelector('#labelPicker [data-plant-id="P02"]')
                .getAttribute("aria-pressed")
        ).toBe("true");

        window.document
            .querySelector('#labelPicker [data-plant-id="P01"]')
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(window.document.querySelector("#plantSelect").value).toBe("P01");
        expect(window.localStorage.getItem("gardenPlantId")).toBe("P01");
    });

    it("sorts lettered labels before numbered planters while keeping requests in P order", () => {
        const bootstrapData = canonicalBootstrap();
        const canonicalIds = bootstrapData.plants.map(({ id }) => id);
        const { behaviors, calls, window } = createLoggerWindow({
            bootstrapData,
        });

        expect(
            [...window.document.querySelectorAll("#plantSelect option")].map(
                ({ value }) => value
            )
        ).toEqual(canonicalIds);

        window.document
            .querySelector("#labelPickerMode")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        expect(
            [...window.document.querySelectorAll("#labelPicker button")].map(
                ({ dataset }) => dataset.plantId
            )
        ).toEqual([
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

        window.document
            .querySelector("#bulkModeTab")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        expect(
            [
                ...window.document.querySelectorAll(
                    "#bulkPlantList input[type='checkbox']"
                ),
            ].map(({ value }) => value)
        ).toEqual(canonicalIds);

        [
            "P28",
            "P01",
            "P27",
        ].forEach((plantId) => {
            const checkbox = window.document.querySelector(
                `#bulkPlantList input[value="${plantId}"]`
            );
            checkbox.checked = true;
            checkbox.dispatchEvent(
                new window.Event("change", { bubbles: true })
            );
        });
        window.document.querySelector("#bulkNutrientsUsed").value = "No";
        behaviors.saveBulkCareObservation = ({ success }) =>
            success({ message: "Bulk care saved." });
        window.document.querySelector("#bulkWaterForm").dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        expect(
            calls.find(({ method }) => method === "saveBulkCareObservation")
                .args[0].plantIds
        ).toEqual([
            "P01",
            "P27",
            "P28",
        ]);
    });

    it("uses the same natural order for the public tracker and history pager", () => {
        const orderedLabels = canonicalPlantLabels
            .map((label, index) => ({
                "Current pot label": label,
                "Plant ID": `P${String(index + 1).padStart(2, "0")}`,
            }))
            .sort(comparePlantsByNaturalLabel)
            .map((plant) => plant["Current pot label"]);

        expect(orderedLabels).toEqual([
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

    it("shows honest accessible plant photos and hides absent image slots", () => {
        const { window } = createLoggerWindow({
            bootstrapData: canonicalBootstrap(),
            storage: { gardenPlantId: "P23" },
        });
        const summary = window.document.querySelector("#plantSummary");
        const images = [...summary.querySelectorAll(".plant-photo-card img")];

        expect(images.map(({ src }) => src)).toEqual([
            p23ImageUrls.currentImageUrl,
            p23ImageUrls.nurseryLabelImageUrl,
        ]);
        expect(images.map(({ alt }) => alt)).toEqual([
            "Current collection photograph of Plant P23 (P23).",
            "Nursery label evidence for Plant P23 (P23).",
        ]);
        expect(
            [...summary.querySelectorAll(".plant-photo-card figcaption")].map(
                ({ textContent }) => textContent
            )
        ).toEqual(["Current collection photograph", "Nursery label evidence"]);

        const select = window.document.querySelector("#plantSelect");
        select.value = "P22";
        select.dispatchEvent(new window.Event("change", { bubbles: true }));
        expect(summary.querySelectorAll(".plant-photo-card")).toHaveLength(0);
    });

    it("shows the selected plant's last dry weight or lowest-weight fallback", () => {
        const { window } = createLoggerWindow();
        const summary = window.document.querySelector("#plantSummary");
        const metricText = [...summary.querySelectorAll(".metric")].map(
            ({ textContent }) => textContent
        );

        expect(metricText).toContain(
            "Last dry / lowest398 g · dry · Aug 10, 2026"
        );

        const select = window.document.querySelector("#plantSelect");
        select.value = "P02";
        select.dispatchEvent(new window.Event("change", { bubbles: true }));
        expect(
            [...summary.querySelectorAll(".metric")].map(
                ({ textContent }) => textContent
            )
        ).toContain("Last dry / lowest475 g · lowest · Aug 2, 2026");
    });

    it("restores and updates the recent-history length", () => {
        const { calls, window } = createLoggerWindow({
            storage: { gardenLoggerRecentLimitV1: "50" },
        });

        expect(window.document.querySelector("#recentLimit").value).toBe("50");
        expect(
            calls.some(
                (call) =>
                    call.method === "getRecentWebObservations" &&
                    call.args[0] === 50
            )
        ).toBe(true);

        const select = window.document.querySelector("#recentLimit");
        select.value = "25";
        select.dispatchEvent(new window.Event("change", { bubbles: true }));
        expect(window.localStorage.getItem("gardenLoggerRecentLimitV1")).toBe(
            "25"
        );
    });

    it("starts safely when browser storage and theme detection are unavailable", () => {
        const { calls, window } = createLoggerWindow({
            storageUnavailable: true,
            matchMediaUnavailable: true,
        });

        expect(window.document.documentElement.dataset.theme).toBe("light");
        expect(window.document.querySelector("#loading").hidden).toBe(true);
        expect(
            window.document.querySelector("#connectionStatus").textContent
        ).toBe("Connected · logger test");
        expect(calls.some((call) => call.method === "getWebAppBootstrap")).toBe(
            true
        );

        expect(() =>
            window.document
                .querySelector("#themeToggle")
                .dispatchEvent(new window.Event("click", { bubbles: true }))
        ).not.toThrow();
        expect(window.document.documentElement.dataset.theme).toBe("dark");
    });

    it("offers an honest Google Photos handoff for photo links", () => {
        const { window } = createLoggerWindow();
        const link = window.document.querySelector("#openGooglePhotos");

        expect(link.href).toBe("https://photos.google.com/");
        expect(link.target).toBe("_blank");
        expect(link.rel).toContain("noopener");
    });

    it("queues a reading locally without changing the selected plant", () => {
        const { calls, window } = createLoggerWindow();
        const weight = window.document.querySelector("#weight");
        weight.value = "430";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));

        window.document
            .querySelector("#queueButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        const queue = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        expect(queue).toHaveLength(1);
        expect(queue[0].payload).toMatchObject({
            plantId: "P01",
            weight: "430",
        });
        expect(window.document.querySelector("#plantSelect").value).toBe("P01");
        expect(window.document.querySelector("#weight").value).toBe("");
        expect(calls.some((call) => call.method === "saveWebObservation")).toBe(
            false
        );
        window.document
            .querySelector("#labelPickerMode")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        const queuedButton = window.document.querySelector(
            '[data-plant-id="P01"]'
        );
        expect(queuedButton.classList.contains("queued-weighed")).toBe(true);
        expect(queuedButton.getAttribute("aria-label")).toMatch(
            /weight safely queued/
        );
        expect(
            window.document.querySelector("#queueProgress").textContent
        ).toBe("1 of 2 plants have a weight safely queued.");
    });

    it("defaults measurements to inches, remembers the method, and shows dimensions in the queue", () => {
        const { window } = createLoggerWindow();
        const unit = window.document.querySelector("#measurementUnit");
        const quality = window.document.querySelector("#measurementQuality");
        const method = window.document.querySelector("#measurementMethod");

        expect(unit.value).toBe("in");
        expect(quality.value).toBe("Measured");
        expect(method.value).toBe("Ruler");
        expect(window.document.querySelector("#heightLabel").textContent).toBe(
            "Height (in)"
        );

        method.value = "Estimated from photo";
        method.dispatchEvent(new window.Event("change", { bubbles: true }));
        expect(quality.value).toBe("Estimated");
        method.value = "Ruler";
        method.dispatchEvent(new window.Event("change", { bubbles: true }));
        expect(quality.value).toBe("Measured");

        const height = window.document.querySelector("#height");
        const width = window.document.querySelector("#width");
        height.value = "3.35";
        height.dispatchEvent(new window.Event("input", { bubbles: true }));
        width.value = "2.5";
        width.dispatchEvent(new window.Event("input", { bubbles: true }));
        window.document
            .querySelector("#queueButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        const queue = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        expect(queue[0].payload).toMatchObject({
            height: "3.35",
            width: "2.5",
            measurementUnit: "in",
            measurementQuality: "Measured",
            measurementMethod: "Ruler",
        });
        expect(window.document.querySelector("#queueList").textContent).toMatch(
            /3\.35 × 2\.5 in/
        );
        expect(unit.value).toBe("in");
        expect(method.value).toBe("Ruler");
        expect(quality.value).toBe("Measured");
        expect(
            JSON.parse(window.localStorage.getItem("gardenLoggerRoundStateV1"))
        ).toMatchObject({
            measurementUnit: "in",
            measurementQuality: "Measured",
            measurementMethod: "Ruler",
        });
    });

    it("keeps weight controls closed until a weight is being recorded", () => {
        const { window } = createLoggerWindow();
        const weightSection = window.document.querySelector("#weightSection");

        expect(weightSection.classList.contains("visible")).toBe(false);

        const weighChip = window.document.querySelector('[data-event="Weigh"]');
        weighChip.dispatchEvent(new window.Event("click", { bubbles: true }));
        expect(weightSection.classList.contains("visible")).toBe(true);

        weighChip.dispatchEvent(new window.Event("click", { bubbles: true }));
        expect(weightSection.classList.contains("visible")).toBe(false);
    });

    it("queues the current weight when Enter is pressed in the weight box", () => {
        const { calls, window } = createLoggerWindow();
        const weighChip = window.document.querySelector('[data-event="Weigh"]');
        weighChip.dispatchEvent(new window.Event("click", { bubbles: true }));
        const weight = window.document.querySelector("#weight");
        weight.value = "431.2";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));

        weight.dispatchEvent(
            new window.KeyboardEvent("keydown", {
                key: "Enter",
                bubbles: true,
                cancelable: true,
            })
        );

        const queue = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        expect(queue).toHaveLength(1);
        expect(queue[0].payload).toMatchObject({
            plantId: "P01",
            weight: "431.2",
        });
        expect(weight.value).toBe("");
        expect(calls.some((call) => call.method === "saveWebObservation")).toBe(
            false
        );
    });

    it("can optionally advance after queueing and remembers that preference", () => {
        const { window } = createLoggerWindow();
        const advance = window.document.querySelector("#advanceAfterQueue");
        advance.checked = true;
        advance.dispatchEvent(new window.Event("change", { bubbles: true }));
        const weight = window.document.querySelector("#weight");
        weight.value = "430";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));

        window.document
            .querySelector("#queueButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(window.document.querySelector("#plantSelect").value).toBe("P02");
        expect(
            JSON.parse(window.localStorage.getItem("gardenLoggerRoundStateV1"))
                .advanceAfterQueue
        ).toBe(true);
    });

    it("marks the queue complete after every plant has a queued weight", () => {
        const queued = [
            queuedWeight(),
            queuedWeight({
                requestId: "garden-queued-weight-67890",
                plantId: "P02",
                weight: "510",
            }),
        ];
        const { window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        window.document
            .querySelector("#labelPickerMode")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            [...window.document.querySelectorAll(".label-choice")].every(
                (button) => button.classList.contains("queued-weighed")
            )
        ).toBe(true);
        expect(window.document.querySelector("#queueCard").classList).toContain(
            "queue-complete"
        );
        expect(
            window.document.querySelector("#queueProgress").textContent
        ).toBe("All 2 plants have a weight safely queued on this device.");
        expect(
            [...window.document.querySelectorAll("#plantSelect option")].map(
                (option) => option.textContent
            )
        ).toEqual([
            expect.stringMatching(/^Queued · Moon cactus/),
            expect.stringMatching(/^Queued · Yellow tower cactus/),
        ]);
    });

    it("keeps the form intact when durable queue storage fails", () => {
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
                return originalSetItem(key, value);
            });
        const weight = window.document.querySelector("#weight");
        weight.value = "433";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));

        window.document
            .querySelector("#queueButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(weight.value).toBe("433");
        expect(window.document.querySelector("#plantSelect").value).toBe("P01");
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBeNull();
        expect(window.document.querySelector("#toast").textContent).toMatch(
            /could not durably store/i
        );
        setItem.mockRestore();
    });

    it("recovers a damaged primary queue from its verified backup", () => {
        const backup = [queuedWeight({ weight: "434" })];
        const { window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: "{broken-json",
                gardenLoggerObservationQueueBackupV1: JSON.stringify(backup),
            },
        });

        expect(
            JSON.parse(
                window.localStorage.getItem("gardenLoggerObservationQueueV1")
            )
        ).toEqual(backup);
        expect(
            window.localStorage.getItem(
                "gardenLoggerObservationQueueRecoveryV1"
            )
        ).toContain("broken-json");
        expect(
            window.document.querySelector("#queueStorageWarning").textContent
        ).toMatch(/restored its verified backup/i);
        window.document
            .querySelector("#labelPickerMode")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        expect(
            window.document
                .querySelector('[data-plant-id="P01"]')
                .classList.contains("queued-weighed")
        ).toBe(true);
    });

    it("restores the backup when the primary queue key is missing", () => {
        const backup = [queuedWeight({ weight: "435" })];
        const { window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueBackupV1: JSON.stringify(backup),
            },
        });

        expect(
            JSON.parse(
                window.localStorage.getItem("gardenLoggerObservationQueueV1")
            )
        ).toEqual(backup);
        expect(
            window.document.querySelector("#queueStorageWarning").textContent
        ).toMatch(/main phone queue was missing/i);
    });

    it("accepts a complete successful batch without a History status call", () => {
        const queued = [queuedWeight({ requestId: "garden-queued-one-12345" })];
        const { behaviors, calls, window } = createLoggerWindow({
            batchSaveStatus: "saved",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        behaviors.saveWebObservationBatch = ({ args, success }) =>
            success({
                ok: true,
                savedCount: 1,
                failedCount: 0,
                message: "1 queued observation saved.",
                results: [
                    {
                        ok: true,
                        requestId: args[0][0].requestId,
                        plantId: "P01",
                    },
                ],
            });

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        const batchCalls = calls.filter(
            (call) => call.method === "saveWebObservationBatch"
        );
        expect(batchCalls).toHaveLength(1);
        expect(batchCalls[0].args[0]).toHaveLength(1);
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
        expect(window.document.querySelector("#queueCard").hidden).toBe(true);
    });

    it("sends all 30 queued observations in one durable server call", () => {
        const queued = Array.from({ length: 30 }, (_, index) =>
            queuedWeight({
                requestId: `garden-round-${String(index + 1).padStart(2, "0")}-12345`,
                plantId: index % 2 ? "P02" : "P01",
                weight: String(430 + index),
            })
        );
        const { behaviors, calls, window } = createLoggerWindow({
            batchSaveStatus: "saved",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        const pending = [];
        behaviors.saveWebObservationBatch = (handlers) =>
            pending.push(handlers);

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(pending).toHaveLength(1);
        expect(pending[0].args[0]).toHaveLength(30);
        expect(
            window.document.querySelector("#queueSendButton").textContent
        ).toBe("Sending all 30…");
        const attemptedPrimary = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        const attemptedBackup = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueBackupV1")
        );
        expect(attemptedPrimary).toHaveLength(30);
        expect(attemptedPrimary.every((entry) => entry.attemptedAt)).toBe(true);
        expect(attemptedBackup).toEqual(attemptedPrimary);

        const current = pending.shift();
        current.success({
            ok: true,
            savedCount: 30,
            failedCount: 0,
            results: current.args[0].map((payload) => ({
                ok: true,
                requestId: payload.requestId,
            })),
        });

        const batchCalls = calls.filter(
            (call) => call.method === "saveWebObservationBatch"
        );
        expect(batchCalls.map((call) => call.args[0].length)).toEqual([30]);
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
        expect(window.document.querySelector("#queueSendButton").disabled).toBe(
            true
        );
    });

    it("keeps Send disabled and accepts a successful callback after 112 seconds", () => {
        vi.useFakeTimers();
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
            batchSaveStatus: "saved",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        let pending;
        behaviors.saveWebObservationBatch = (handlers) => {
            pending = handlers;
        };

        const send = window.document.querySelector("#queueSendButton");
        send.dispatchEvent(new window.Event("click", { bubbles: true }));
        vi.advanceTimersByTime(45000);

        expect(send.disabled).toBe(true);
        expect(window.document.querySelector("#plantSelect").disabled).toBe(
            true
        );
        expect(window.document.querySelector("#toast").textContent).toMatch(
            /still processing/i
        );
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

        vi.advanceTimersByTime(67000);
        pending.success({
            ok: true,
            savedCount: 1,
            failedCount: 0,
            results: [{ ok: true, requestId: queued[0].requestId }],
        });

        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);
    });

    it("reconciles transient failures and retries after 2 and 5 seconds", () => {
        vi.useFakeTimers();
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        let attempts = 0;
        behaviors.saveWebObservationBatch = ({ args, success, failure }) => {
            attempts += 1;
            if (attempts < 3) {
                failure({ message: "Transient Google error" });
                return;
            }
            success({
                ok: true,
                savedCount: 1,
                failedCount: 0,
                results: [{ ok: true, requestId: args[0][0].requestId }],
            });
        };
        behaviors.getWebBatchSaveStatus = ({ args, success }) =>
            success(
                args[0].map((request) => ({
                    requestId: request.requestId,
                    state: attempts >= 3 ? "saved" : "missing",
                    expectedCount: request.expectedCount,
                    savedCount: attempts >= 3 ? request.expectedCount : 0,
                }))
            );

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
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
        const queued = [
            queuedWeight({ requestId: "garden-omitted-one-12345" }),
            queuedWeight({
                requestId: "garden-omitted-two-12345",
                plantId: "P02",
            }),
        ];
        const { behaviors, calls, window } = createLoggerWindow({
            batchSaveStatus: "saved",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        behaviors.saveWebObservationBatch = ({ success }) =>
            success({
                ok: true,
                savedCount: 2,
                failedCount: 0,
                results: [
                    {
                        ok: true,
                        requestId: "garden-omitted-one-12345",
                    },
                ],
            });

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(1);
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe("[]");
    });

    it("retries every confirmed-missing ID together after a failed whole-queue call", () => {
        vi.useFakeTimers();
        const queued = [
            queuedWeight({ requestId: "garden-grouped-saved-12345" }),
            queuedWeight({
                requestId: "garden-grouped-missing-one-12345",
                plantId: "P02",
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
                ok: true,
                savedCount: args[0].length,
                failedCount: 0,
                results: args[0].map((payload) => ({
                    ok: true,
                    requestId: payload.requestId,
                })),
            });
        };
        behaviors.getWebBatchSaveStatus = ({ args, success }) =>
            success(
                args[0].map((request) => ({
                    requestId: request.requestId,
                    state: request.requestId.includes("saved")
                        ? "saved"
                        : "missing",
                    expectedCount: request.expectedCount,
                    savedCount: request.requestId.includes("saved") ? 1 : 0,
                }))
            );

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        vi.advanceTimersByTime(2000);

        const batchCalls = calls.filter(
            (call) => call.method === "saveWebObservationBatch"
        );
        expect(batchCalls.map((call) => call.args[0].length)).toEqual([3, 2]);
        expect(
            batchCalls[1].args[0].map((payload) => payload.requestId)
        ).toEqual([
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
        vi.useFakeTimers();
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        behaviors.saveWebObservationBatch = ({ failure }) =>
            failure({ message: "Transient Google error" });

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        vi.advanceTimersByTime(2000);
        vi.advanceTimersByTime(5000);
        vi.advanceTimersByTime(10000);

        expect(
            calls.filter((call) => call.method === "saveWebObservationBatch")
        ).toHaveLength(4);
        const remaining = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        expect(remaining).toHaveLength(1);
        expect(remaining[0].error).toMatch(/three automatic retries/i);
        expect(window.document.querySelector("#queueSendButton").disabled).toBe(
            false
        );
        expect(
            window.document.querySelector("#queueProgress").textContent
        ).toBe("0 confirmed · 1 still safely queued");
    });

    it("does not retry a deterministic per-entry validation failure", () => {
        vi.useFakeTimers();
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        behaviors.saveWebObservationBatch = ({ args, success }) =>
            success({
                ok: false,
                savedCount: 0,
                failedCount: 1,
                results: [
                    {
                        ok: false,
                        requestId: args[0][0].requestId,
                        retryable: false,
                        message: "Fix this measurement.",
                    },
                ],
            });

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        vi.runAllTimers();

        expect(
            calls.filter((call) => call.method === "saveWebObservationBatch")
        ).toHaveLength(1);
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);
        const remaining = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        expect(remaining[0]).toMatchObject({
            attemptedAt: "",
            error: "Fix this measurement.",
        });
    });

    it("retains the full queue if confirmed removal cannot be stored", () => {
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
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
                return originalSetItem(key, value);
            });
        behaviors.saveWebObservationBatch = ({ args, success }) =>
            success({
                ok: true,
                savedCount: 1,
                failedCount: 0,
                results: [{ ok: true, requestId: args[0][0].requestId }],
            });

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        const primary = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        const backup = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueBackupV1")
        );
        expect(primary.map((entry) => entry.requestId)).toEqual([
            queued[0].requestId,
        ]);
        expect(backup.map((entry) => entry.requestId)).toEqual([
            queued[0].requestId,
        ]);
        expect(window.document.querySelector("#toast").textContent).toMatch(
            /full pre-confirmation queue/i
        );
        setItem.mockRestore();
    });

    it("reconciles once after six minutes thirty seconds and ignores a later callback", () => {
        vi.useFakeTimers();
        const queued = [queuedWeight()];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        let pending;
        behaviors.saveWebObservationBatch = (handlers) => {
            pending = handlers;
        };

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
        vi.advanceTimersByTime(390000);

        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(1);
        const remainingBeforeLateCallback = window.localStorage.getItem(
            "gardenLoggerObservationQueueV1"
        );
        expect(JSON.parse(remainingBeforeLateCallback)).toHaveLength(1);
        expect(window.document.querySelector("#queueSendButton").disabled).toBe(
            false
        );

        pending.success({
            ok: true,
            savedCount: 1,
            failedCount: 0,
            results: [{ ok: true, requestId: queued[0].requestId }],
        });
        expect(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        ).toBe(remainingBeforeLateCallback);
    });

    it("does not send a batch unless attempted state is durably stored", () => {
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
                return originalSetItem(key, value);
            });

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            calls.some((call) => call.method === "saveWebObservationBatch")
        ).toBe(false);
        expect(
            JSON.parse(
                window.localStorage.getItem("gardenLoggerObservationQueueV1")
            )
        ).toEqual(queued);
        expect(window.document.querySelector("#toast").textContent).toMatch(
            /retry safety could not be guaranteed/i
        );
        setItem.mockRestore();
    });

    it("removes confirmed items but retains failed batch entries", () => {
        const queued = [
            queuedWeight({ requestId: "garden-queued-saved-12345" }),
            queuedWeight({
                requestId: "garden-queued-failed-12345",
                plantId: "P02",
                weight: "510",
            }),
        ];
        const { behaviors, calls, window } = createLoggerWindow({
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });
        behaviors.saveWebObservationBatch = ({ success }) =>
            success({
                ok: false,
                savedCount: 1,
                failedCount: 1,
                message: "1 saved; 1 needs attention.",
                results: [
                    {
                        ok: true,
                        requestId: "garden-queued-saved-12345",
                    },
                    {
                        ok: false,
                        requestId: "garden-queued-failed-12345",
                        retryable: false,
                        message: "Weight needs review.",
                    },
                ],
            });
        behaviors.getWebBatchSaveStatus = ({ args, success }) =>
            success(
                args[0].map((request) => ({
                    requestId: request.requestId,
                    state:
                        request.requestId === "garden-queued-saved-12345"
                            ? "saved"
                            : "missing",
                    expectedCount: request.expectedCount,
                    savedCount:
                        request.requestId === "garden-queued-saved-12345"
                            ? request.expectedCount
                            : 0,
                }))
            );

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        const remaining = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        expect(remaining).toHaveLength(1);
        expect(remaining[0]).toMatchObject({
            requestId: "garden-queued-failed-12345",
            attemptedAt: "",
            error: "Weight needs review.",
        });
        expect(window.document.querySelector("#queueList").textContent).toMatch(
            /Weight needs review/
        );
        expect(
            calls.filter((call) => call.method === "getWebBatchSaveStatus")
        ).toHaveLength(0);
    });

    it("reconciles an attempted queue after reload", () => {
        const queued = [
            {
                requestId: "garden-queued-saved-12345",
                attemptedAt: "2026-08-16T12:01:00.000Z",
                payload: {
                    plantId: "P01",
                    events: ["Weigh"],
                    observedAt: "2026-08-16T12:00:00.000Z",
                    weightState: "Routine",
                    weight: "431",
                },
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
        const queued = [
            queuedWeight({
                requestId: "garden-reload-saved-12345",
                attemptedAt: "2026-08-16T12:01:00.000Z",
            }),
            queuedWeight({
                requestId: "garden-reload-missing-12345",
                attemptedAt: "2026-08-16T12:01:00.000Z",
            }),
            queuedWeight({
                requestId: "garden-reload-incomplete-12345",
                attemptedAt: "2026-08-16T12:01:00.000Z",
            }),
        ];
        const { window } = createLoggerWindow({
            batchSaveStatus: (request) =>
                request.requestId.includes("saved")
                    ? "saved"
                    : request.requestId.includes("incomplete")
                      ? "incomplete"
                      : "missing",
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });

        const remaining = JSON.parse(
            window.localStorage.getItem("gardenLoggerObservationQueueV1")
        );
        expect(remaining).toHaveLength(2);
        expect(remaining[0]).toMatchObject({
            requestId: "garden-reload-missing-12345",
            attemptedAt: "",
        });
        expect(remaining[1]).toMatchObject({
            requestId: "garden-reload-incomplete-12345",
            attemptedAt: "2026-08-16T12:01:00.000Z",
        });
        expect(remaining[1].error).toMatch(/kept for review/i);
    });

    it("does not cancel an active save when the phone orientation changes", () => {
        vi.useFakeTimers();
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveWebObservation = () => {};
        const weight = window.document.querySelector("#weight");
        weight.value = "432";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        window.document.querySelector("#entryForm").dispatchEvent(
            new window.Event("submit", {
                bubbles: true,
                cancelable: true,
            })
        );

        window.dispatchEvent(new window.Event("orientationchange"));
        vi.advanceTimersByTime(350);

        expect(window.document.querySelector("#saveButton").disabled).toBe(
            true
        );
        expect(calls.some((call) => call.method === "getWebSaveStatus")).toBe(
            false
        );

        vi.advanceTimersByTime(20000);

        expect(window.document.querySelector("#saveButton").disabled).toBe(
            false
        );
        expect(calls.some((call) => call.method === "getWebSaveStatus")).toBe(
            true
        );
    });

    it("blocks a stale mobile hit target from submitting outside the visible Save button", () => {
        const { calls, window } = createLoggerWindow();
        const weight = window.document.querySelector("#weight");
        const saveButton = window.document.querySelector("#saveButton");
        weight.value = "433";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        saveButton.getBoundingClientRect = () => ({
            bottom: 752,
            height: 52,
            left: 10,
            right: 190,
            top: 700,
            width: 180,
            x: 10,
            y: 700,
        });

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
        expect(window.document.querySelector("#toast").textContent).toMatch(
            /misplaced tap/i
        );
        expect(weight.value).toBe("433");
    });

    it("still accepts a physical tap inside the visible Save button", () => {
        const { calls, window } = createLoggerWindow();
        const weight = window.document.querySelector("#weight");
        const saveButton = window.document.querySelector("#saveButton");
        weight.value = "434";
        weight.dispatchEvent(new window.Event("input", { bubbles: true }));
        saveButton.getBoundingClientRect = () => ({
            bottom: 752,
            height: 52,
            left: 10,
            right: 190,
            top: 700,
            width: 180,
            x: 10,
            y: 700,
        });

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
        const { window } = createLoggerWindow({
            storage: { gardenLoggerPlantPickerModeV1: "labels" },
        });
        const staleTarget = window.document.querySelector(
            '[data-plant-id="P02"]'
        );
        staleTarget.getBoundingClientRect = () => ({
            bottom: 160,
            height: 48,
            left: 10,
            right: 70,
            top: 112,
            width: 60,
            x: 10,
            y: 112,
        });

        staleTarget.dispatchEvent(
            new window.MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                clientX: 40,
                clientY: 260,
                detail: 1,
            })
        );

        expect(window.document.querySelector("#plantSelect").value).toBe("P01");
        expect(window.document.documentElement.className).toContain(
            "mobile-hit-recovery"
        );
        expect(window.document.querySelector("#toast").textContent).toMatch(
            /misplaced tap/i
        );
        expect(window.document.querySelector('[data-plant-id="P02"]')).not.toBe(
            staleTarget
        );
    });

    it("rebuilds label hit targets after orientation changes", () => {
        vi.useFakeTimers();
        const { window } = createLoggerWindow({
            storage: { gardenLoggerPlantPickerModeV1: "labels" },
        });
        const original = window.document.querySelector('[data-plant-id="P01"]');

        window.dispatchEvent(new window.Event("orientationchange"));
        vi.advanceTimersByTime(250);

        expect(window.document.querySelector('[data-plant-id="P01"]')).not.toBe(
            original
        );
        expect(window.document.documentElement.className).toContain(
            "mobile-hit-recovery"
        );
    });

    it("keeps a queued round on the phone while offline", () => {
        const queued = [queuedWeight()];
        const { calls, window } = createLoggerWindow({
            online: false,
            storage: {
                gardenLoggerObservationQueueV1: JSON.stringify(queued),
            },
        });

        window.document
            .querySelector("#queueSendButton")
            .dispatchEvent(new window.Event("click", { bubbles: true }));

        expect(
            JSON.parse(
                window.localStorage.getItem("gardenLoggerObservationQueueV1")
            )
        ).toHaveLength(1);
        expect(
            calls.some((call) => call.method === "saveWebObservationBatch")
        ).toBe(false);
        expect(window.document.querySelector("#toast").textContent).toMatch(
            /offline/i
        );
    });
});
