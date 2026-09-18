import { getRequiredElement } from "../../../docs/layouts/plant-tracker-data.js";

{
    const page = getRequiredElement("#layout-page", HTMLElement);
    const diameterInput = getRequiredElement(
        "#round-diameter",
        HTMLInputElement
    );
    const riserToggle = getRequiredElement("#show-risers", HTMLInputElement);
    const clearanceSelect = getRequiredElement(
        "#light-clearance",
        HTMLSelectElement
    );
    const printButton = getRequiredElement("#print-layout", HTMLButtonElement);
    const tabs = [
        ...document.querySelectorAll('[role="tab"][data-tab]'),
    ].filter((node) => node instanceof HTMLButtonElement);
    const panels = [...document.querySelectorAll('[role="tabpanel"]')].filter(
        (node) => node instanceof HTMLElement
    );
    const measurementIds = ["target-canopy", "sample-tip"];
    const measurements = measurementIds.map((id) =>
        getRequiredElement(`#${id}`, HTMLInputElement)
    );
    const result = getRequiredElement("#riser-result", HTMLElement);
    const detail = getRequiredElement("#riser-detail", HTMLElement);
    const availableLifts = [
        0,
        1.18,
        2.75,
        3.93,
        5.11,
    ];
    const plantMarkers = [
        ...document.querySelectorAll("[data-plant-marker]"),
    ].filter((node) => node instanceof SVGElement);
    const plantPanels = new Map(
        [...document.querySelectorAll("[data-plant-panel]")]
            .filter((node) => node instanceof HTMLElement)
            .map((panel) => [panel.dataset["plantPanel"], panel])
    );
    const plantFieldNames = [
        "name",
        "botanical",
        "record",
        "origin",
        "placement",
        "status",
    ];

    /**
     * @param {string | undefined} tabId @param {{updateHash?: boolean,
     *   moveFocus?: boolean}} [options]
     */
    function activateTab(
        tabId,
        { moveFocus = false, updateHash = false } = {}
    ) {
        const nextTab =
            tabs.find((tab) => tab.dataset["tab"] === tabId) ?? tabs[0];
        if (!nextTab) return;
        for (const panel of panels) {
            panel.hidden = panel.id !== nextTab.dataset["tab"];
        }
        for (const tab of tabs) {
            tab.setAttribute(
                "aria-selected",
                tab === nextTab ? "true" : "false"
            );
        }

        if (updateHash) {
            try {
                history.replaceState(
                    null,
                    "",
                    `#${nextTab.dataset["tab"] ?? "room"}`
                );
            } catch {
                // The selected tab still works when file URL history is restricted.
            }
        }
        if (moveFocus) nextTab.focus();
    }

    function updateDiameter() {
        const value = Number(diameterInput.value);
        const display = Number.isFinite(value) && value > 0 ? value : "—";
        document.querySelectorAll("[data-round-diameter]").forEach((node) => {
            node.textContent = String(display);
        });
    }

    function updateClearance() {
        document.querySelectorAll("[data-clearance]").forEach((node) => {
            node.textContent = clearanceSelect.value;
        });
    }

    function updateRiserRecommendation() {
        const values = measurements.map((input) => Number(input.value));
        const isComplete = measurements.every(
            (input, index) =>
                input.value !== "" && Number.isFinite(values[index])
        );

        if (!isComplete) {
            result.textContent = "Enter both canopy measurements.";
            detail.textContent =
                "The calculator will choose the available lift that places the selected tip closest to the target starter canopy.";
            return;
        }

        const [targetCanopy, sampleTip] = values;
        if (targetCanopy === undefined || sampleTip === undefined) return;
        let recommendation = 0;
        for (const lift of availableLifts) {
            if (
                Math.abs(sampleTip + lift - targetCanopy) <
                Math.abs(sampleTip + recommendation - targetCanopy)
            )
                recommendation = lift;
        }
        const finalTip = sampleTip + recommendation;
        const difference = finalTip - targetCanopy;

        result.textContent =
            recommendation === 0
                ? "Keep this pot directly on the wooden table."
                : `Use the +${recommendation.toFixed(2)}-inch riser.`;
        detail.textContent = `Estimated final tip: ${finalTip.toFixed(2)} inches above the wood; ${Math.abs(difference).toFixed(2)} inches ${difference < 0 ? "below" : difference > 0 ? "above" : "from"} the target.`;
    }

    /** @param {SVGElement} marker */
    function showPlantDetails(marker) {
        const target = marker.dataset["detailTarget"];
        const panel = plantPanels.get(target);
        if (!panel) return;

        for (const fieldName of plantFieldNames) {
            const field = panel.querySelector(
                `[data-plant-field="${CSS.escape(fieldName)}"]`
            );
            if (field) {
                field.textContent = marker.dataset[fieldName] ?? "Not recorded";
            }
        }

        const profileLink = panel.querySelector("[data-plant-profile]");
        if (profileLink instanceof HTMLAnchorElement) {
            const profile = marker.dataset["profile"] ?? "";
            profileLink.hidden = profile === "";
            if (profile !== "") {
                profileLink.href = profile;
                profileLink.textContent =
                    marker.dataset["linkLabel"] ?? "Open full plant profile →";
            }
        }

        for (const candidate of plantMarkers) {
            if (candidate.dataset["detailTarget"] === target) {
                candidate.classList.toggle("is-active", candidate === marker);
            }
        }
        panel.classList.add("is-populated");
        panel.dataset["activePlant"] = marker.dataset["record"] ?? "";
    }

    diameterInput.addEventListener("input", updateDiameter);
    riserToggle.addEventListener("change", () => {
        page.classList.toggle("show-risers", riserToggle.checked);
    });
    clearanceSelect.addEventListener("change", updateClearance);
    for (const input of measurements) {
        input.addEventListener("input", updateRiserRecommendation);
    }
    for (const marker of plantMarkers) {
        marker.addEventListener("pointerenter", () => {
            showPlantDetails(marker);
        });
        marker.addEventListener("focus", () => {
            showPlantDetails(marker);
        });
        marker.addEventListener("click", () => {
            marker.focus({ preventScroll: true });
            showPlantDetails(marker);
        });
    }
    for (const [index, tab] of tabs.entries()) {
        tab.addEventListener("click", () => {
            activateTab(tab.dataset["tab"], { updateHash: true });
        });
        tab.addEventListener("keydown", (event) => {
            let nextIndex;
            switch (event.key) {
                case "ArrowLeft": {
                    nextIndex = (index - 1 + tabs.length) % tabs.length;
                    break;
                }
                case "ArrowRight": {
                    nextIndex = (index + 1) % tabs.length;
                    break;
                }
                case "End": {
                    nextIndex = tabs.length - 1;
                    break;
                }
                case "Home": {
                    nextIndex = 0;
                    break;
                }
                default: {
                    return;
                }
            }

            event.preventDefault();
            activateTab(tabs[nextIndex]?.dataset["tab"], {
                moveFocus: true,
                updateHash: true,
            });
        });
    }
    addEventListener("hashchange", () => {
        activateTab(location.hash.slice(1));
    });
    printButton.addEventListener("click", () => {
        print();
    });

    activateTab(location.hash.slice(1));
    page.classList.toggle("show-risers", riserToggle.checked);

    updateDiameter();
    updateClearance();
    updateRiserRecommendation();
}
