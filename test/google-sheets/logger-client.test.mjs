import {
    DOMRect,
    Element,
    HTMLAnchorElement,
    HTMLButtonElement,
    HTMLDetailsElement,
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
            /** @param {number} limit */
            getRecentWebObservations(limit) {
                invoke("getRecentWebObservations", [limit]);
            },
            getWebAppBootstrap() {
                invoke("getWebAppBootstrap", []);
            },
            /** @param {import("../logger-fixtures.d.ts").ObservationPayload[]} requests */
            getWebBatchSaveStatus(requests) {
                invoke("getWebBatchSaveStatus", [requests]);
            },
            /** @param {import("../logger-fixtures.d.ts").ObservationPayload} request */
            getWebSaveStatus(request) {
                invoke("getWebSaveStatus", [request]);
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
            "#photoVisibilityToggle",
            HTMLButtonElement
        );

        expect(
            queryElements(
                hidden.document,
                "#plantSummary img",
                HTMLImageElement
            )
        ).toHaveLength(0);
        expect(toggle.textContent).toContain("Show photos");
        expect(toggle.getAttribute("aria-pressed")).toBe("false");

        toggle.click();

        expect(
            queryElements(
                hidden.document,
                "#plantSummary img",
                HTMLImageElement
            )
        ).toHaveLength(2);
        expect(hidden.localStorage.getItem("gardenLoggerPhotosVisibleV1")).toBe(
            "shown"
        );

        toggle.click();

        expect(
            queryElements(
                hidden.document,
                "#plantSummary img",
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
                "#plantSummary img",
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
            queryElement(summary, ".forecast-guidance", HTMLElement).textContent
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
            queryElements(summary, ".metric svg[aria-hidden='true']", Element)
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

describe("garden logger selection help and activity metrics", () => {
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
        vi.runAllTimers();

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
