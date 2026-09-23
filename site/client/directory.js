export function initializeDirectory() {
    const search = document.querySelector("#plant-search");
    const group = document.querySelector("#plant-group");
    const status = document.querySelector("#plant-status");
    const resultCount = document.querySelector("#plant-result-count");
    const empty = document.querySelector("#plant-empty");
    const entries = [
        ...document.querySelectorAll("[data-directory-entry]"),
    ].filter((entry) => entry instanceof HTMLElement);

    if (
        search instanceof HTMLInputElement &&
        group instanceof HTMLSelectElement &&
        status instanceof HTMLSelectElement
    ) {
        const parameters = new URLSearchParams(location.search);
        search.value = parameters.get("q") ?? "";
        const selectedGroup = parameters.get("group");
        if ([...group.options].some((option) => option.value === selectedGroup))
            group.value = selectedGroup ?? "all";
        const selectedStatus = parameters.get("status");
        if (
            [...status.options].some(
                (option) => option.value === selectedStatus
            )
        )
            status.value = selectedStatus ?? "current";
        const filterPlants = () => {
            const terms = search.value
                .trim()
                .toLowerCase()
                .split(/\s+/v)
                .filter(Boolean);
            let visible = 0;
            for (const entry of entries) {
                const isHistorical = entry.dataset["historical"] === "true";
                const isOverview = entry.dataset["overview"] === "true";
                const isMatches = terms.every((term) =>
                    (entry.dataset["search"] ?? "").includes(term)
                );
                entry.hidden =
                    !isMatches ||
                    (group.value !== "all" &&
                        entry.dataset["group"] !== group.value) ||
                    (status.value === "current" &&
                        (isHistorical || isOverview)) ||
                    (status.value === "overviews" && !isOverview) ||
                    (status.value === "historical" && !isHistorical);
                if (!entry.hidden) visible += 1;
            }
            if (resultCount)
                resultCount.textContent = `${visible} ${status.value === "overviews" ? "planter overview" : "profile"}${visible === 1 ? "" : "s"} shown · one care history per container`;
            if (empty instanceof HTMLElement) empty.hidden = visible !== 0;
            const url = new URL(location.href);
            const filters = new Map([
                ["group", group.value === "all" ? "" : group.value],
                ["q", search.value.trim()],
                ["status", status.value === "current" ? "" : status.value],
            ]);
            for (const [key, value] of filters) {
                if (value === "") {
                    url.searchParams.delete(key);
                } else {
                    url.searchParams.set(key, value);
                }
            }
            history.replaceState(null, "", url);
        };
        search.addEventListener("input", filterPlants);
        group.addEventListener("change", filterPlants);
        status.addEventListener("change", filterPlants);
        filterPlants();
    }
}
initializeDirectory();
