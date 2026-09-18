/** @param {Date} now */
function easternDate(now) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/New_York",
        year: "numeric",
    });
    return formatter.format(now);
}

function initializeReport() {
    const reportRoot = requiredElement("[data-report-date]", HTMLElement);
    const cards = [...document.querySelectorAll("details.pot-card")].filter(
        (element) => element instanceof HTMLDetailsElement
    );
    const groups = [...document.querySelectorAll(".pot-group")].filter(
        (element) => element instanceof HTMLElement
    );
    const search = requiredElement("#pot-search", HTMLInputElement);
    const filterButtons = [
        ...document.querySelectorAll("[data-filter]"),
    ].filter((element) => element instanceof HTMLButtonElement);
    const filters = requiredElement("#report-filters", HTMLElement);
    const status = requiredElement("#filter-status", HTMLElement);
    const noMatches = requiredElement("#no-matches", HTMLElement);
    const copyButton = requiredElement("#copy-list", HTMLButtonElement);
    const copyStatus = requiredElement("#copy-status", HTMLElement);
    const freshness = requiredElement("#freshness-message", HTMLElement);
    let activeFilter = "all";
    function applyFilters() {
        const query = search.value.trim().toLocaleLowerCase();
        let count = 0;
        for (const card of cards) {
            card.hidden =
                (activeFilter !== "all" &&
                    card.dataset["action"] !== activeFilter) ||
                !(card.dataset["search"] ?? "")
                    .toLocaleLowerCase()
                    .includes(query);
            if (!card.hidden) count += 1;
        }
        for (const group of groups)
            group.hidden = cards
                .filter((card) => group.contains(card))
                .every((card) => card.hidden === true);
        for (const button of filterButtons)
            button.setAttribute(
                "aria-pressed",
                String(button.dataset["filter"] === activeFilter)
            );
        status.textContent = `${count} of ${cards.length} pots shown. The quick list above always shows the full report.`;
        noMatches.hidden = count > 0;
    }
    /** @param {MouseEvent} event */
    function selectFilter(event) {
        if (!(event.currentTarget instanceof HTMLButtonElement)) {
            return;
        }

        activeFilter = event.currentTarget.dataset["filter"] ?? "all";
        applyFilters();
    }
    for (const button of filterButtons)
        button.addEventListener("click", selectFilter);
    search.addEventListener("input", applyFilters);
    filters.hidden = false;
    applyFilters();

    function revealLinkedPot() {
        const card = cards.find((entry) => `#${entry.id}` === location.hash);
        if (card === undefined) return;
        activeFilter = "all";
        search.value = "";
        applyFilters();
        card.open = true;
        card.scrollIntoView({ block: "start" });
    }
    addEventListener("hashchange", revealLinkedPot);
    document.addEventListener("click", (event) => {
        const link =
            event.target instanceof Element
                ? event.target.closest("a.pot-chip")
                : null;
        if (link instanceof HTMLAnchorElement && link.hash === location.hash)
            revealLinkedPot();
    });
    revealLinkedPot();

    function updateFreshness() {
        const date = reportRoot.dataset["reportDate"] ?? undefined;
        const today = easternDate(new Date());
        const isArchive =
            document.querySelector("[data-dated-report]") !== null;
        freshness.hidden = date === today;
        freshness.textContent =
            date === undefined
                ? "This report has no recorded date."
                : date.localeCompare(today) < 0
                  ? isArchive
                      ? `Archived report from ${date}. These recommendations have not been refreshed for today; use the latest reviewed report for the current review.`
                      : `This is the ${date} report. A newer daily report has not been published here yet; these recommendations have not been refreshed for today.`
                  : `This report is dated ${date}, ahead of the current Eastern date. Check the date before using its recommendations.`;
    }
    updateFreshness();
    addEventListener("pageshow", updateFreshness);
    document.addEventListener("visibilitychange", updateFreshness);

    async function copyQuickList() {
        const lines = [...document.querySelectorAll(".quick-row")].map(
            (row) => {
                const label =
                    row.querySelector(":scope .quick-label strong")
                        ?.textContent ?? "";
                const icon =
                    row.querySelector(":scope .quick-label > span")
                        ?.textContent ?? "";
                const labels = [...row.querySelectorAll(".pot-chip")]
                    .map((chip) => chip.textContent)
                    .join(", ");
                const empty =
                    row.querySelector(".empty-category")?.textContent ??
                    "Not determined";
                return `${icon} ${label}: ${labels || empty}`;
            }
        );
        const conditions = [
            ...document.querySelectorAll(".quick-description"),
        ].map((item) => item.textContent.replaceAll(/\s+/gv, " ").trim());
        const assessment = [
            ...document.querySelectorAll(".ai-assessment p"),
        ].map((item) => item.textContent.replaceAll(/\s+/gv, " ").trim());
        const text = [
            `Garden report · ${reportRoot.dataset["reportDate"] ?? "date unavailable"}`,
            "Water only when your usual readiness check confirms it.",
            ...conditions,
            ...lines,
            "",
            "🤖 AI recommendation — separate assessment",
            ...assessment,
        ].join("\n");
        try {
            await navigator.clipboard.writeText(text);
            copyStatus.textContent = "Quick list copied.";
            copyButton.textContent = "Copied ✓";
        } catch {
            copyStatus.textContent =
                "Copy is unavailable in this browser. You can select and copy the list on the page.";
        }
    }
    copyButton.addEventListener("click", () => {
        void copyQuickList();
    });
    copyButton.hidden = !("clipboard" in navigator);

    /** @type {boolean[]} */
    let openBeforePrint = [];
    addEventListener("beforeprint", () => {
        openBeforePrint = cards.map((card) => card.open);
        for (const card of cards) {
            card.open = true;
            card.hidden = false;
        }
        for (const group of groups) group.hidden = false;
    });
    addEventListener("afterprint", () => {
        for (const [index, card] of cards.entries())
            card.open = openBeforePrint[index] ?? false;
        applyFilters();
    });
}

/**
 * @template {HTMLElement} T
 *
 * @param {string} selector
 * @param {new (...args: never[]) => T} constructor
 *
 * @returns {T}
 */
function requiredElement(selector, constructor) {
    const element = document.querySelector(selector);
    if (!(element instanceof constructor))
        throw new TypeError(`Missing report control: ${selector}`);
    return element;
}

if (typeof document !== "undefined") {
    if (document.querySelector("#report-filters")) initializeReport();
    if (document.querySelector(".report-archive")) {
        const details = [
            ...document.querySelectorAll(".report-archive details"),
        ].filter((element) => element instanceof HTMLDetailsElement);
        /** @type {boolean[]} */
        let beforePrint = [];
        addEventListener("beforeprint", () => {
            beforePrint = details.map((element) => element.open);
            for (const element of details) element.open = true;
        });
        addEventListener("afterprint", () => {
            for (const [index, element] of details.entries())
                element.open = beforePrint[index] ?? false;
        });
    }
}

export { easternDate };
