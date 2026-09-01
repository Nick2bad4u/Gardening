(() => {
    const baseTitle = "The Fenton Collection";
    const pages = [...document.querySelectorAll("[data-page]")];
    const profilePages = pages.filter((page) =>
        page.classList.contains("profile-page")
    );
    const profileTemplates = new Map(
        [...document.querySelectorAll("template[data-profile-template]")].map(
            (template) => [template.dataset.profileTemplate, template]
        )
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
    const surprisePlants = [
        ...document.querySelectorAll("[data-surprise-plant]"),
    ];
    const pageAnnouncer = document.querySelector("#page-announcer");
    const boundExternalImages = new WeakSet();
    let currentIndex = 0;
    let lastTrackedProfilePageId = null;
    let printPrepared = false;

    function pageName(page) {
        return page?.dataset.title || "Untitled page";
    }

    function currentHashState() {
        let rawHash = "";
        try {
            rawHash = decodeURIComponent(location.hash.slice(1));
        } catch {
            return { pageId: "cover", targetId: "cover" };
        }
        if (pageIds.includes(rawHash)) {
            return { pageId: rawHash, targetId: rawHash };
        }

        const target = document.getElementById(rawHash);
        const parentPage = target?.closest("[data-page]");
        let pageId = parentPage?.dataset.page;

        if (!pageId && rawHash) {
            for (const [profileId, template] of profileTemplates) {
                if (template.content.querySelector(`#${CSS.escape(rawHash)}`)) {
                    pageId = profileId;
                    break;
                }
            }
        }

        return pageIds.includes(pageId)
            ? { pageId, targetId: rawHash }
            : { pageId: "cover", targetId: "cover" };
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

    function prioritizePageImages(page) {
        const hero = page?.querySelector(".profile-hero > img");
        if (hero) {
            hero.loading = "eager";
            hero.fetchPriority = "high";
        }

        const coverLead = page?.querySelector(".cover-collage > img");
        if (coverLead) {
            coverLead.loading = "eager";
            coverLead.fetchPriority = "high";
        }
    }

    function markExternalImageUnavailable(image) {
        image.hidden = true;
        image.closest(".external-image-link")?.classList.add("is-unavailable");
        image
            .closest(".external-image-link")
            ?.querySelector(".external-image-fallback")
            ?.removeAttribute("hidden");
        image
            .closest(".plant-avatar-slot")
            ?.querySelector(".plant-avatar-fallback")
            ?.removeAttribute("hidden");
    }

    function bindExternalImages(root) {
        for (const image of root.querySelectorAll("img[data-external-image]")) {
            if (boundExternalImages.has(image)) continue;
            boundExternalImages.add(image);
            image.addEventListener(
                "error",
                () => markExternalImageUnavailable(image),
                { once: true }
            );
            if (
                image.isConnected &&
                image.complete &&
                image.naturalWidth === 0
            ) {
                markExternalImageUnavailable(image);
            }
        }
    }

    function mountProfile(page, { prioritize = false } = {}) {
        if (!page?.classList.contains("profile-page")) return;
        if (page.dataset.profileMounted === "true") {
            if (prioritize) prioritizePageImages(page);
            return;
        }

        const template = profileTemplates.get(page.dataset.page);
        if (!template) return;
        const fragment = template.content.cloneNode(true);
        if (prioritize) prioritizePageImages(fragment);
        bindExternalImages(fragment);
        page.replaceChildren(fragment);
        page.dataset.profileMounted = "true";
    }

    function unmountInactiveProfiles(activePage) {
        if (printPrepared) return;
        for (const profile of profilePages) {
            if (profile === activePage) continue;
            profile.replaceChildren();
            delete profile.dataset.profileMounted;
        }
    }

    function trackPlantProfileView(page) {
        if (!page?.classList.contains("profile-page")) {
            lastTrackedProfilePageId = null;
            return;
        }

        const pageId = page.dataset.page;
        if (
            pageId === lastTrackedProfilePageId ||
            !Array.isArray(window.dataLayer)
        ) {
            return;
        }

        window.dataLayer.push({
            event: "view_plant_profile",
            page_location: window.location.href,
            page_path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
            page_title: document.title,
            plant_name: pageName(page),
            plant_slug: pageId,
        });
        lastTrackedProfilePageId = pageId;
    }

    function showPage(pageId, { scroll = true } = {}) {
        const nextIndex = pageIds.indexOf(pageId);
        currentIndex = nextIndex >= 0 ? nextIndex : 0;

        const current = pages[currentIndex];
        mountProfile(current, { prioritize: true });
        prioritizePageImages(current);

        for (const [index, page] of pages.entries()) {
            page.hidden = index !== currentIndex;
        }

        unmountInactiveProfiles(current);
        updateNavigation(current);
        document.title =
            current.dataset.page === "cover"
                ? `${baseTitle} · Plant field guide`
                : `${pageName(current)} · ${baseTitle}`;
        trackPlantProfileView(current);

        if (scroll) {
            window.scrollTo({ top: 0, behavior: "auto" });
            pageAnnouncer.textContent = `${pageName(current)}. ${readerCount.textContent}.`;
        }
    }

    function showCurrentHash({ scroll = true } = {}) {
        const { pageId, targetId } = currentHashState();
        const nestedTarget = targetId !== pageId;
        showPage(pageId, { scroll: scroll && !nestedTarget });

        if (nestedTarget) {
            requestAnimationFrame(() => {
                document.getElementById(targetId)?.scrollIntoView({
                    behavior: "auto",
                    block: "start",
                });
            });
        }
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

    bindExternalImages(document);

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
    function prepareForPrint() {
        if (printPrepared) return;
        printPrepared = true;
        for (const profile of profilePages) mountProfile(profile);
    }

    function restoreAfterPrint() {
        printPrepared = false;
        showCurrentHash({ scroll: false });
    }

    printButton.addEventListener("click", () => {
        prepareForPrint();
        window.print();
    });
    window.addEventListener("beforeprint", prepareForPrint);
    window.addEventListener("afterprint", restoreAfterPrint);

    function openSurprisePlant(event) {
        event.preventDefault();
        const choices = profilePages.filter(
            (page) => page.dataset.page !== pages[currentIndex]?.dataset.page
        );
        const randomPage = choices[Math.floor(Math.random() * choices.length)];
        if (contentsDialog.open) contentsDialog.close();
        if (randomPage) location.hash = randomPage.dataset.page;
    }

    for (const trigger of surprisePlants) {
        trigger.addEventListener("click", openSurprisePlant);
    }

    themeToggle.addEventListener("click", () => {
        const dark = document.documentElement.dataset.theme === "dark";
        const nextTheme = dark ? "light" : "dark";
        document.documentElement.dataset.theme = nextTheme;
        localStorage.setItem("gardening-site-theme", nextTheme);
        updateThemeButton();
    });

    window.addEventListener("hashchange", () => showCurrentHash());

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
        } else if (event.key === "Home") {
            event.preventDefault();
            goToIndex(0);
        } else if (event.key === "End") {
            event.preventDefault();
            goToIndex(pages.length - 1);
        }
    });

    updateThemeButton();
    filterNavigation();
    showCurrentHash({ scroll: false });
    document.body.dataset.readerReady = "true";
})();
