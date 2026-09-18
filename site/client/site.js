/** Initialize the shared navigation, theme control, and report freshness labels. */
export function initializeSite() {
    trackPlantProfile();
    const themeButton = document.querySelector("#theme-toggle");
    const themeLabel = document.querySelector("#theme-label");
    const menuButton = document.querySelector("[data-menu-toggle]");
    const navigation = document.querySelector("#site-nav");

    const describeTheme = () => {
        const next =
            document.documentElement.dataset["theme"] === "dark"
                ? "light"
                : "dark";
        themeButton?.setAttribute("aria-label", `Switch to ${next} theme`);
        themeButton?.setAttribute("title", `Switch to ${next} theme`);
        if (themeLabel) themeLabel.textContent = `Switch to ${next} theme`;
    };
    themeButton?.addEventListener("click", () => {
        const theme =
            document.documentElement.dataset["theme"] === "dark"
                ? "light"
                : "dark";
        document.documentElement.dataset["theme"] = theme;
        try {
            localStorage.setItem("gardening-site-theme", theme);
        } catch {
            /* Theme still works when storage is unavailable. */
        }
        describeTheme();
    });
    describeTheme();

    /** @param {boolean} isExpanded */
    const setMenu = (isExpanded) => {
        menuButton?.setAttribute("aria-expanded", String(isExpanded));
        navigation?.classList.toggle("is-open", isExpanded);
    };
    menuButton?.addEventListener("click", () => {
        setMenu(menuButton.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", (event) => {
        if (
            event.key !== "Escape" ||
            menuButton?.getAttribute("aria-expanded") !== "true"
        ) {
            return;
        }

        setMenu(false);
        if (menuButton instanceof HTMLElement) menuButton.focus();
    });
    document.addEventListener("click", (event) => {
        if (
            event.target instanceof Node &&
            navigation?.contains(event.target) !== true &&
            menuButton?.contains(event.target) !== true
        )
            setMenu(false);
    });
    refreshReportDates();
    window.addEventListener("pageshow", refreshReportDates);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) refreshReportDates();
    });
}

function refreshReportDates() {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/New_York",
        year: "numeric",
    });
    const today = formatter.format(new Date());
    for (const element of document.querySelectorAll("[data-reviewed-date]")) {
        if (!(element instanceof HTMLElement)) continue;
        const date = element.dataset["reviewedDate"];
        const message = element.querySelector("[data-review-freshness]");
        if (date !== undefined && date !== "" && message) {
            const isCurrent = date === today;
            element.dataset["fresh"] = String(isCurrent);
            message.textContent = isCurrent
                ? "Reviewed today · America/New_York"
                : date.localeCompare(today) > 0
                  ? "Future-dated review · verify its date before acting"
                  : "Earlier review · open the report for its date and evidence";
        }
    }
}

function trackPlantProfile() {
    if (document.documentElement.dataset["gardeningRedirecting"] !== undefined)
        return;
    const profile = document.querySelector("[data-plant-profile]");
    if (
        !(profile instanceof HTMLElement) ||
        profile.dataset["profileTracked"] === "true"
    )
        return;
    const slug = profile.dataset["plantProfile"];
    /** @type {unknown} */
    const queue = Reflect.get(globalThis, "dataLayer");
    if (slug === undefined || slug === "" || !Array.isArray(queue)) return;
    queue.push({
        event: "view_plant_profile",
        page_location: location.href,
        page_path: `${location.pathname}${location.search}${location.hash}`,
        page_title: document.title,
        plant_name: profile.querySelector("h1")?.textContent.trim() ?? slug,
        plant_slug: slug,
    });
    profile.dataset["profileTracked"] = "true";
}

initializeSite();
