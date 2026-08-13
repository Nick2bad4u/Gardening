(() => {
    const baseTitle = "The Fenton Collection";
    const pages = [...document.querySelectorAll("[data-page]")];
    const profilePages = pages.filter((page) =>
        page.classList.contains("profile-page")
    );
    const pageIds = pages.map((page) => page.dataset.page);
    const pageLinks = [...document.querySelectorAll("[data-page-link]")];
    const readerTitle = document.querySelector("#reader-title");
    const readerCount = document.querySelector("#reader-count");
    const readerProgress = document.querySelector("#reader-progress");
    const previousButton = document.querySelector("#previous-page");
    const nextButton = document.querySelector("#next-page");
    const previousLabel = document.querySelector("#previous-label");
    const nextLabel = document.querySelector("#next-label");
    const contentsDialog = document.querySelector("#contents-dialog");
    const openContents = document.querySelector("#open-contents");
    const closeContents = document.querySelector("#close-contents");
    const search = document.querySelector("#plant-search");
    const searchStatus = document.querySelector("#search-status");
    const themeToggle = document.querySelector("#theme-toggle");
    const printButton = document.querySelector("#print-booklet");
    const surprisePlant = document.querySelector("#surprise-plant");
    let currentIndex = 0;

    function pageName(page) {
        return page?.dataset.title || "Untitled page";
    }

    function currentHashId() {
        const rawHash = decodeURIComponent(location.hash.slice(1));
        return pageIds.includes(rawHash) ? rawHash : "cover";
    }

    function updateThemeButton() {
        const dark = document.documentElement.dataset.theme === "dark";
        themeToggle.setAttribute("aria-pressed", String(dark));
        themeToggle.setAttribute(
            "aria-label",
            dark ? "Switch to light theme" : "Switch to dark theme"
        );
    }

    function updateNavigation(page) {
        const previous = pages[currentIndex - 1];
        const next = pages[currentIndex + 1];
        const profileIndex = profilePages.indexOf(page);

        previousButton.disabled = !previous;
        nextButton.disabled = !next;
        previousLabel.textContent = previous ? pageName(previous) : "Beginning";
        nextLabel.textContent = next ? pageName(next) : "End of guide";
        readerTitle.textContent = pageName(page);

        if (profileIndex >= 0) {
            readerCount.textContent = `Plant ${profileIndex + 1} of ${profilePages.length}`;
            readerProgress.style.width = `${((profileIndex + 1) / profilePages.length) * 100}%`;
        } else {
            readerCount.textContent =
                page.dataset.page === "cover"
                    ? baseTitle
                    : `${profilePages.length} plant profiles`;
            readerProgress.style.width = "0";
        }

        for (const link of pageLinks) {
            if (link.dataset.pageLink === page.dataset.page) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        }
    }

    function prioritizeProfileImages(page) {
        const hero = page?.querySelector(".profile-hero > img");
        if (hero) {
            hero.loading = "eager";
            hero.fetchPriority = "high";
        }

        const nextProfile = pages
            .slice(currentIndex + 1)
            .find((candidate) => candidate.classList.contains("profile-page"));
        const nextHero = nextProfile?.querySelector(".profile-hero > img");
        if (nextHero) nextHero.loading = "eager";
    }

    function showPage(pageId, { scroll = true } = {}) {
        const nextIndex = pageIds.indexOf(pageId);
        currentIndex = nextIndex >= 0 ? nextIndex : 0;

        for (const [index, page] of pages.entries()) {
            page.hidden = index !== currentIndex;
        }

        const current = pages[currentIndex];
        prioritizeProfileImages(current);
        updateNavigation(current);
        document.title =
            current.dataset.page === "cover"
                ? `${baseTitle} · Plant field guide`
                : `${pageName(current)} · ${baseTitle}`;

        if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
    }

    function goToIndex(index) {
        const page = pages[index];
        if (!page) return;
        location.hash = page.dataset.page;
    }

    function filterNavigation() {
        const query = search.value.trim().toLowerCase();
        let visibleCount = 0;

        for (const item of document.querySelectorAll(".drawer-group li")) {
            const slug =
                item.querySelector("[data-page-link]")?.dataset.pageLink;
            const profile = slug
                ? document.querySelector(`[data-page="${CSS.escape(slug)}"]`)
                : null;
            const searchText = `${item.dataset.search ?? ""} ${profile?.dataset.search ?? ""}`;
            const visible = !query || searchText.includes(query);
            item.hidden = !visible;
            if (visible) visibleCount += 1;
        }

        for (const group of document.querySelectorAll(".drawer-group")) {
            group.hidden = !group.querySelector("li:not([hidden])");
        }

        searchStatus.textContent = query
            ? `${visibleCount} matching ${visibleCount === 1 ? "profile" : "profiles"}`
            : `Showing all ${profilePages.length} profiles`;
    }

    openContents.addEventListener("click", () => {
        if (!contentsDialog.open) contentsDialog.showModal();
        window.setTimeout(() => search.focus(), 0);
    });

    closeContents.addEventListener("click", () => contentsDialog.close());

    contentsDialog.addEventListener("click", (event) => {
        if (event.target === contentsDialog) contentsDialog.close();
    });

    for (const link of pageLinks) {
        link.addEventListener("click", () => {
            if (contentsDialog.open) contentsDialog.close();
        });
    }

    search.addEventListener("input", filterNavigation);
    previousButton.addEventListener("click", () => goToIndex(currentIndex - 1));
    nextButton.addEventListener("click", () => goToIndex(currentIndex + 1));
    printButton.addEventListener("click", () => window.print());

    surprisePlant.addEventListener("click", (event) => {
        event.preventDefault();
        const choices = profilePages.filter(
            (page) => page.dataset.page !== pages[currentIndex]?.dataset.page
        );
        const randomPage = choices[Math.floor(Math.random() * choices.length)];
        if (contentsDialog.open) contentsDialog.close();
        if (randomPage) location.hash = randomPage.dataset.page;
    });

    themeToggle.addEventListener("click", () => {
        const dark = document.documentElement.dataset.theme === "dark";
        const nextTheme = dark ? "light" : "dark";
        document.documentElement.dataset.theme = nextTheme;
        localStorage.setItem("gardening-site-theme", nextTheme);
        updateThemeButton();
    });

    window.addEventListener("hashchange", () => showPage(currentHashId()));

    window.addEventListener("keydown", (event) => {
        if (
            event.defaultPrevented ||
            contentsDialog.open ||
            /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(
                document.activeElement?.tagName
            )
        ) {
            return;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            goToIndex(currentIndex - 1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            goToIndex(currentIndex + 1);
        } else if (event.key === "/") {
            event.preventDefault();
            openContents.click();
        }
    });

    updateThemeButton();
    filterNavigation();
    showPage(currentHashId(), { scroll: false });
})();
