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

const bootstrap = {
    version: "test",
    serverTime: "2026-08-15T14:00:00.000Z",
    events: [
        "Water",
        "Weigh",
        "Measure",
        "Check",
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
            fieldGuideUrl: "https://example.test/guide#p02",
            historyUrl: "https://example.test/history?id=P02",
        },
    ],
    recent: [],
};

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
    pendingSave,
    saveStatus = "missing",
    storage = {},
} = {}) {
    const window = new Window({
        url: "https://script.google.com/macros/s/test/exec",
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

    const calls = [];
    const behaviors = {
        getWebAppBootstrap: ({ success }) => success(bootstrap),
        getWebSaveStatus: ({ success }) =>
            success({
                state: saveStatus,
                message: "Status checked",
            }),
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
});

describe("Garden logger browser recovery", () => {
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
        behaviors.saveBulkWaterObservation = () => {};

        window.document
            .querySelector("#bulkModeTab")
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
            calls.filter((call) => call.method === "saveBulkWaterObservation")
        ).toHaveLength(1);
    });

    it("lets a confirmed failed watering round be corrected", () => {
        const { behaviors, calls, window } = createLoggerWindow();
        behaviors.saveBulkWaterObservation = ({ failure }) =>
            failure({ message: "Server rejected the round" });

        window.document
            .querySelector("#bulkModeTab")
            .dispatchEvent(new window.Event("click", { bubbles: true }));
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
            (call) => call.method === "saveBulkWaterObservation"
        );
        expect(saveCalls).toHaveLength(2);
        expect(saveCalls[1].args[0].requestId).not.toBe(
            saveCalls[0].args[0].requestId
        );
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

    it("offers an honest Google Photos handoff for photo links", () => {
        const { window } = createLoggerWindow();
        const link = window.document.querySelector("#openGooglePhotos");

        expect(link.href).toBe("https://photos.google.com/");
        expect(link.target).toBe("_blank");
        expect(link.rel).toContain("noopener");
    });
});
