{
    /**
     * @template {Element} T
     *
     * @param {string} selector
     * @param {new (...args: never[]) => T} elementType
     *
     * @returns {T}
     */
    function requiredElement(selector, elementType) {
        const element = document.querySelector(selector);
        if (!(element instanceof elementType)) {
            throw new TypeError(`Missing field-guide element: ${selector}`);
        }
        return element;
    }

    /**
     * @template {Element} T
     *
     * @param {ParentNode} root
     * @param {string} selector
     * @param {new (...args: never[]) => T} elementType
     *
     * @returns {T[]}
     */
    function matchingElements(root, selector, elementType) {
        return [...root.querySelectorAll(selector)].map((element) => {
            if (!(element instanceof elementType)) {
                throw new TypeError(
                    `Unexpected field-guide element: ${selector}`
                );
            }
            return element;
        });
    }

    const baseTitle = "The Fenton Collection";
    const pages = matchingElements(document, "[data-page]", HTMLElement);
    const profilePages = pages.filter((page) =>
        page.classList.contains("profile-page")
    );
    const profileTemplates = new Map(
        matchingElements(
            document,
            "template[data-profile-template]",
            HTMLTemplateElement
        ).map((template) => [template.dataset["profileTemplate"], template])
    );
    const pageIds = pages.map((page) => page.dataset["page"] ?? page.id);
    const pageLinks = matchingElements(
        document,
        "[data-page-link]",
        HTMLAnchorElement
    );
    const readerTitle = requiredElement("#reader-title", HTMLElement);
    const readerCount = requiredElement("#reader-count", HTMLElement);
    const readerProgress = requiredElement("#reader-progress", HTMLElement);
    const previousButton = requiredElement("#previous-page", HTMLButtonElement);
    const nextButton = requiredElement("#next-page", HTMLButtonElement);
    const previousLabel = requiredElement("#previous-label", HTMLElement);
    const nextLabel = requiredElement("#next-label", HTMLElement);
    const pageControls = requiredElement(
        "#page-controls-navigation",
        HTMLElement
    );
    const pageControlsToggle = requiredElement(
        "#page-controls-toggle",
        HTMLButtonElement
    );
    const contentsDialog = requiredElement(
        "#contents-dialog",
        HTMLDialogElement
    );
    const openContents = requiredElement("#open-contents", HTMLButtonElement);
    const closeContents = requiredElement("#close-contents", HTMLButtonElement);
    const search = requiredElement("#plant-search", HTMLInputElement);
    const searchStatus = requiredElement("#search-status", HTMLElement);
    const themeToggle = requiredElement("#theme-toggle", HTMLButtonElement);
    const printButton = requiredElement("#print-booklet", HTMLButtonElement);
    const surprisePlants = [
        ...document.querySelectorAll("[data-surprise-plant]"),
    ];
    const pageAnnouncer = requiredElement("#page-announcer", HTMLElement);
    const boundExternalImages = new WeakSet();
    let currentIndex = 0;
    /** @type {string | null} */
    let lastTrackedProfilePageId = null;
    let isPrintPrepared = false;
    let isPageControlsPinned = false;
    let lastScrollY = Math.max(0, window.scrollY);
    let isScrollTicking = false;

    /**
     * @param {HTMLElement | undefined} page
     */
    function pageName(page) {
        return page?.dataset["title"] ?? "Untitled page";
    }

    function updateScrollProgress() {
        const scrollableHeight = Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight
        );
        const progress = scrollableHeight
            ? Math.min(
                  100,
                  Math.max(
                      0,
                      (Math.max(0, window.scrollY) / scrollableHeight) * 100
                  )
              )
            : 100;
        readerProgress.style.width = `${progress}%`;
    }

    /**
     * @param {boolean} visible
     */
    function setPageControlsVisible(visible) {
        pageControls.classList.toggle(
            "is-scroll-hidden",
            !visible && !isPageControlsPinned
        );
    }

    function updatePageControlsPin() {
        pageControls.classList.toggle("is-pinned", isPageControlsPinned);
        pageControlsToggle.setAttribute(
            "aria-pressed",
            String(isPageControlsPinned)
        );
        pageControlsToggle.setAttribute(
            "aria-label",
            isPageControlsPinned
                ? "Unpin page navigation"
                : "Pin page navigation"
        );
        requiredElement(".page-controls-pin-label", HTMLElement).textContent =
            isPageControlsPinned ? "Pinned" : "Pin";
    }

    function handleScroll() {
        if (isScrollTicking) return;
        isScrollTicking = true;
        requestAnimationFrame(() => {
            const scrollY = Math.max(0, window.scrollY);
            const documentHeight = document.documentElement.scrollHeight;
            const isNearTop = scrollY < 24;
            const isNearEnd =
                scrollY + window.innerHeight >= documentHeight - 24;

            updateScrollProgress();
            if (!isPageControlsPinned) {
                if (isNearTop || isNearEnd || scrollY < lastScrollY - 8) {
                    setPageControlsVisible(true);
                } else if (scrollY > lastScrollY + 8) {
                    setPageControlsVisible(false);
                } else {
                    // Keep navigation steady while scrolling within the movement threshold.
                }
            }

            lastScrollY = scrollY;
            isScrollTicking = false;
        });
    }

    function currentHashState() {
        let rawHash;
        try {
            rawHash = decodeURIComponent(location.hash.slice(1));
        } catch {
            return { pageId: "cover", targetId: "cover" };
        }
        if (pageIds.includes(rawHash)) {
            return { pageId: rawHash, targetId: rawHash };
        }

        const target =
            rawHash === ""
                ? null
                : document.querySelector(`#${CSS.escape(rawHash)}`);
        const parentPage = target?.closest("[data-page]");
        let pageId =
            parentPage instanceof HTMLElement
                ? parentPage.dataset["page"]
                : undefined;

        if (pageId === undefined && rawHash !== "") {
            for (const [profileId, template] of profileTemplates) {
                if (template.content.querySelector(`#${CSS.escape(rawHash)}`)) {
                    pageId = profileId;
                    break;
                }
            }
        }

        return pageId !== undefined && pageIds.includes(pageId)
            ? { pageId, targetId: rawHash }
            : { pageId: "cover", targetId: "cover" };
    }

    function updateThemeButton() {
        const isDark = document.documentElement.dataset["theme"] === "dark";
        themeToggle.setAttribute("aria-pressed", String(isDark));
        themeToggle.setAttribute(
            "aria-label",
            isDark ? "Switch to light theme" : "Switch to dark theme"
        );
    }

    /** @param {HTMLElement} page */
    function updateNavigation(page) {
        const previous = pages[currentIndex - 1];
        const next = pages[currentIndex + 1];
        const profileIndex = profilePages.indexOf(page);

        previousButton.disabled = !previous;
        nextButton.disabled = !next;
        previousLabel.textContent = previous ? pageName(previous) : "Beginning";
        nextLabel.textContent = next ? pageName(next) : "End of guide";
        readerTitle.textContent = pageName(page);

        if (profileIndex === -1) {
            readerCount.textContent =
                page.dataset["page"] === "cover"
                    ? baseTitle
                    : `${profilePages.length} plant profiles`;
        } else {
            readerCount.textContent = `Plant ${profileIndex + 1} of ${profilePages.length}`;
        }

        updateScrollProgress();

        for (const link of pageLinks) {
            if (link.dataset["pageLink"] === page.dataset["page"]) {
                link.setAttribute("aria-current", "page");
            } else {
                link.toggleAttribute("aria-current", false);
            }
        }
    }

    /** @param {ParentNode | undefined} page */
    function prioritizePageImages(page) {
        const hero = page
            ?.querySelector(".profile-hero")
            ?.querySelector(":scope > img");
        if (hero instanceof HTMLImageElement) {
            hero.loading = "eager";
            hero.fetchPriority = "high";
        }

        const coverLead = page
            ?.querySelector(".cover-collage")
            ?.querySelector(":scope > img");
        if (coverLead instanceof HTMLImageElement) {
            coverLead.loading = "eager";
            coverLead.fetchPriority = "high";
        }
    }

    /** @param {HTMLImageElement} image */
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

    /** @param {ParentNode} root */
    function bindExternalImages(root) {
        for (const image of matchingElements(
            root,
            "img[data-external-image]",
            HTMLImageElement
        )) {
            if (boundExternalImages.has(image)) continue;
            boundExternalImages.add(image);
            image.addEventListener(
                "error",
                () => {
                    markExternalImageUnavailable(image);
                },
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

    /** @param {HTMLElement | undefined} page */
    function mountProfile(page, { prioritize = false } = {}) {
        if (page?.classList.contains("profile-page") !== true) return;
        if (page.dataset["profileMounted"] === "true") {
            if (prioritize) prioritizePageImages(page);
            return;
        }

        const template = profileTemplates.get(page.dataset["page"]);
        if (!template) return;
        const fragment = template.content.cloneNode(true);
        if (!(fragment instanceof DocumentFragment))
            throw new Error("Invalid profile template.");
        if (prioritize) prioritizePageImages(fragment);
        bindExternalImages(fragment);
        page.replaceChildren(fragment);
        page.dataset["profileMounted"] = "true";
    }

    /**
     * @param {HTMLElement | undefined} activePage
     */
    function unmountInactiveProfiles(activePage) {
        if (isPrintPrepared) return;
        for (const profile of profilePages) {
            if (profile === activePage) continue;
            profile.replaceChildren();
            delete profile.dataset["profileMounted"];
        }
    }

    /**
     * @param {HTMLElement | undefined} page
     */
    function trackPlantProfileView(page) {
        if (page?.classList.contains("profile-page") !== true) {
            lastTrackedProfilePageId = null;
            return;
        }

        const pageId = page.dataset["page"] ?? page.id;
        /** @type {unknown} */
        const analyticsQueue = Reflect.get(globalThis, "dataLayer");
        if (
            pageId === lastTrackedProfilePageId ||
            !Array.isArray(analyticsQueue)
        ) {
            return;
        }

        analyticsQueue.push({
            event: "view_plant_profile",
            page_location: location.href,
            page_path: `${location.pathname}${location.search}${location.hash}`,
            page_title: document.title,
            plant_name: pageName(page),
            plant_slug: pageId,
        });
        lastTrackedProfilePageId = pageId;
    }

    /** @param {string} pageId */
    function showPage(pageId, { scroll = true } = {}) {
        const nextIndex = pageIds.indexOf(pageId);
        currentIndex = Math.max(nextIndex, 0);

        const current = pages[currentIndex];
        if (!current) throw new Error("The field guide has no cover page.");
        mountProfile(current, { prioritize: true });
        prioritizePageImages(current);

        for (const [index, page] of pages.entries()) {
            page.hidden = index !== currentIndex;
        }

        unmountInactiveProfiles(current);
        updateNavigation(current);
        setPageControlsVisible(true);
        document.title =
            current.dataset["page"] === "cover"
                ? `${baseTitle} · Plant field guide`
                : `${pageName(current)} · ${baseTitle}`;
        trackPlantProfileView(current);

        if (scroll) {
            window.scrollTo({ behavior: "auto", top: 0 });
            lastScrollY = 0;
            updateScrollProgress();
            pageAnnouncer.textContent = `${pageName(current)}. ${readerCount.textContent}.`;
        }
    }

    function showCurrentHash({ scroll = true } = {}) {
        const { pageId, targetId } = currentHashState();
        const isNestedTarget = targetId !== pageId;
        showPage(pageId, { scroll: scroll && !isNestedTarget });

        if (isNestedTarget) {
            requestAnimationFrame(() => {
                document
                    .querySelector(`#${CSS.escape(targetId)}`)
                    ?.scrollIntoView({
                        behavior: "auto",
                        block: "start",
                    });
            });
        }
    }

    /**
     * @param {number} index
     */
    function goToIndex(index) {
        const page = pages[index];
        if (!page) return;
        location.hash = page.dataset["page"] ?? page.id;
    }

    function filterNavigation() {
        const query = search.value.trim().toLowerCase();
        let visibleCount = 0;

        for (const item of matchingElements(
            document,
            ".drawer-group li",
            HTMLLIElement
        )) {
            const link = item.querySelector("[data-page-link]");
            const slug =
                link instanceof HTMLElement
                    ? link.dataset["pageLink"]
                    : undefined;
            const profile = pages.find((page) => page.dataset["page"] === slug);
            const searchText = `${item.dataset["search"] ?? ""} ${profile?.dataset["search"] ?? ""}`;
            const isVisible = !query || searchText.includes(query);
            item.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        }

        for (const group of matchingElements(
            document,
            ".drawer-group",
            HTMLElement
        )) {
            group.hidden = !group.querySelector("li:not([hidden])");
        }

        searchStatus.textContent = query
            ? `${visibleCount} matching ${visibleCount === 1 ? "profile" : "profiles"}`
            : `Showing all ${profilePages.length} profiles`;
    }

    bindExternalImages(document);

    openContents.addEventListener("click", () => {
        if (!contentsDialog.open) contentsDialog.showModal();
        setTimeout(() => {
            search.focus();
        }, 0);
    });

    closeContents.addEventListener("click", () => {
        contentsDialog.close();
    });

    contentsDialog.addEventListener("click", (event) => {
        if (event.target === contentsDialog) contentsDialog.close();
    });

    for (const link of pageLinks) {
        link.addEventListener("click", () => {
            if (contentsDialog.open) contentsDialog.close();
        });
    }

    search.addEventListener("input", filterNavigation);
    previousButton.addEventListener("click", () => {
        goToIndex(currentIndex - 1);
    });
    nextButton.addEventListener("click", () => {
        goToIndex(currentIndex + 1);
    });
    pageControlsToggle.addEventListener("click", () => {
        isPageControlsPinned = !isPageControlsPinned;
        setPageControlsVisible(true);
        updatePageControlsPin();
    });
    pageControls.addEventListener("focusin", () => {
        setPageControlsVisible(true);
    });
    function prepareForPrint() {
        if (isPrintPrepared) return;
        isPrintPrepared = true;
        for (const profile of profilePages) mountProfile(profile);
    }

    function restoreAfterPrint() {
        isPrintPrepared = false;
        showCurrentHash({ scroll: false });
    }

    printButton.addEventListener("click", () => {
        prepareForPrint();
        print();
    });
    addEventListener("beforeprint", prepareForPrint);
    addEventListener("afterprint", restoreAfterPrint);

    /**
     * @param {{ preventDefault: () => void }} event
     */
    function openSurprisePlant(event) {
        event.preventDefault();
        const choices = profilePages.filter(
            (page) =>
                page.dataset["page"] !== pages[currentIndex]?.dataset["page"]
        );
        const randomValues = crypto.getRandomValues(new Uint32Array(1));
        const randomFraction = (randomValues[0] ?? 0) / 2 ** 32;
        const randomPage = choices[Math.floor(randomFraction * choices.length)];
        if (contentsDialog.open) contentsDialog.close();
        if (randomPage)
            location.hash = randomPage.dataset["page"] ?? randomPage.id;
    }

    for (const trigger of surprisePlants) {
        trigger.addEventListener("click", openSurprisePlant);
    }

    themeToggle.addEventListener("click", () => {
        const isDark = document.documentElement.dataset["theme"] === "dark";
        const nextTheme = isDark ? "light" : "dark";
        document.documentElement.dataset["theme"] = nextTheme;
        localStorage.setItem("gardening-site-theme", nextTheme);
        updateThemeButton();
    });

    addEventListener("hashchange", () => {
        showCurrentHash();
    });
    window.addEventListener("scroll", handleScroll, { passive: true });
    // eslint-disable-next-line unicorn/prefer-observer-apis -- Viewport height affects progress even when element sizes stay unchanged.
    window.addEventListener("resize", updateScrollProgress);

    addEventListener("keydown", (event) => {
        if (
            event.defaultPrevented ||
            contentsDialog.open ||
            /^(?:BUTTON|INPUT|SELECT|TEXTAREA)$/v.test(
                document.activeElement?.tagName ?? ""
            )
        ) {
            return;
        }

        switch (event.key) {
            case "/": {
                event.preventDefault();
                openContents.click();

                break;
            }
            case "ArrowLeft": {
                event.preventDefault();
                goToIndex(currentIndex - 1);

                break;
            }
            case "ArrowRight": {
                event.preventDefault();
                goToIndex(currentIndex + 1);

                break;
            }
            case "End": {
                event.preventDefault();
                goToIndex(pages.length - 1);

                break;
            }
            case "Home": {
                event.preventDefault();
                goToIndex(0);

                break;
            }
            // No default
        }
    });

    updateThemeButton();
    updatePageControlsPin();
    filterNavigation();
    showCurrentHash({ scroll: false });
    updateScrollProgress();
    document.body.dataset["readerReady"] = "true";
}
