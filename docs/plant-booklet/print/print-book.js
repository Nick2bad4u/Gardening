(() => {
    "use strict";

    async function settleImage(image) {
        if (image.complete) {
            if (!image.naturalWidth) {
                throw new Error(`Image failed to load: ${image.currentSrc}`);
            }
            if (typeof image.decode === "function") {
                await image.decode().catch(() => {});
            }
            return;
        }

        await new Promise((resolve, reject) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener(
                "error",
                () => reject(new Error(`Image failed to load: ${image.src}`)),
                { once: true }
            );
        });
        if (typeof image.decode === "function") {
            await image.decode().catch(() => {});
        }
    }

    async function preparePrintBook() {
        await document.fonts.ready;
        const images = [...document.images];
        const failures = [];
        await Promise.all(
            images.map((image) =>
                settleImage(image).catch((error) => {
                    failures.push(error.message);
                })
            )
        );

        const fixedPages = [...document.querySelectorAll(".sheet")];
        const overflows = fixedPages
            .filter(
                (page) =>
                    page.scrollHeight > page.clientHeight + 2 ||
                    page.scrollWidth > page.clientWidth + 2
            )
            .map((page) => ({
                className: page.className,
                profile:
                    page.closest("[data-profile]")?.dataset.profile ?? null,
                scrollHeight: page.scrollHeight,
                clientHeight: page.clientHeight,
                scrollWidth: page.scrollWidth,
                clientWidth: page.clientWidth,
            }));
        const boundedRegions = [
            ...document.querySelectorAll(
                ".record-sheet__panel, .editorial-card, .print-photo figcaption, .context-sources"
            ),
        ];
        const boundedRegionOverflows = boundedRegions
            .filter(
                (region) =>
                    region.scrollHeight > region.clientHeight + 2 ||
                    region.scrollWidth > region.clientWidth + 2
            )
            .map((region) => ({
                className: region.className,
                profile:
                    region.closest("[data-profile]")?.dataset.profile ?? null,
                profilePage:
                    region.closest("[data-profile-page]")?.dataset
                        .profilePage ?? null,
                scrollHeight: region.scrollHeight,
                clientHeight: region.clientHeight,
                scrollWidth: region.scrollWidth,
                clientWidth: region.clientWidth,
            }));
        const remoteImages = images
            .map((image) => image.currentSrc || image.src)
            .filter((source) => /^https?:/i.test(source));

        window.printBookReport = {
            ready:
                failures.length === 0 &&
                overflows.length === 0 &&
                boundedRegionOverflows.length === 0,
            imageCount: images.length,
            imageFailures: failures,
            fixedPageCount: fixedPages.length,
            fixedPageOverflows: overflows,
            boundedRegionOverflows,
            pageTypes: Object.fromEntries(
                [
                    ...Map.groupBy(
                        fixedPages,
                        (page) => page.dataset.pageType ?? "unclassified"
                    ).entries(),
                ].map(([type, pages]) => [type, pages.length])
            ),
            profilePages: fixedPages
                .filter((page) => page.dataset.profilePage)
                .map((page) => page.dataset.profilePage),
            profileCount: document.querySelectorAll(".print-profile").length,
            remoteImages,
        };
        document.documentElement.dataset.printReady = failures.length
            ? "error"
            : "true";
    }

    preparePrintBook().catch((error) => {
        window.printBookReport = {
            ready: false,
            fatalError: error instanceof Error ? error.message : String(error),
        };
        document.documentElement.dataset.printReady = "error";
        console.error(error);
    });
})();
