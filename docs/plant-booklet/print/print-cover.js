(() => {
    "use strict";

    async function prepareCover() {
        await document.fonts.ready;
        const images = [...document.images];
        const failures = [];
        await Promise.all(
            images.map(async (image) => {
                if (!image.complete) {
                    await new Promise((resolve, reject) => {
                        image.addEventListener("load", resolve, { once: true });
                        image.addEventListener("error", reject, { once: true });
                    }).catch(() => failures.push(image.src));
                }
                if (!image.naturalWidth) failures.push(image.src);
                if (typeof image.decode === "function") {
                    await image.decode().catch(() => {});
                }
            })
        );
        const jacket = document.querySelector(".jacket");
        const overflow =
            jacket.scrollWidth > jacket.clientWidth + 2 ||
            jacket.scrollHeight > jacket.clientHeight + 2;
        const remoteImages = images
            .map((image) => image.currentSrc || image.src)
            .filter((source) => /^https?:/i.test(source));
        window.printCoverReport = {
            ready: failures.length === 0 && !overflow,
            imageCount: images.length,
            imageFailures: [...new Set(failures)],
            overflow,
            remoteImages,
            width: jacket.clientWidth,
            height: jacket.clientHeight,
        };
        document.documentElement.dataset.printReady = failures.length
            ? "error"
            : "true";
    }

    prepareCover().catch((error) => {
        window.printCoverReport = {
            ready: false,
            fatalError: error instanceof Error ? error.message : String(error),
        };
        document.documentElement.dataset.printReady = "error";
        console.error(error);
    });
})();
