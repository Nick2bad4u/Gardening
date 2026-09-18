/**
 * Preserve a useful, clearly labelled illustration when an owned-photo preview
 * cannot load.
 */
export function initializeProfilePhotos(
    root: ParentNode = document
): () => void {
    const controller = new AbortController();
    for (const preview of root.querySelectorAll<HTMLElement>(
        ".profile-avatar-photo, :scope .profile-owned-avatar .photo-unavailable"
    )) {
        const showIllustration = () => {
            preview.hidden = true;
            const figure = preview.closest(".profile-owned-avatar");
            figure?.classList.add("profile-avatar-unavailable");
            const caption = figure?.querySelector("[data-avatar-caption]");
            if (caption)
                caption.textContent = "Illustration · Open owned photo ↗";
        };
        if (!(preview instanceof HTMLImageElement)) {
            showIllustration();
            continue;
        }
        preview.addEventListener("error", showIllustration, {
            once: true,
            signal: controller.signal,
        });
        if (preview.complete && preview.naturalWidth === 0) showIllustration();
    }
    return () => {
        controller.abort();
    };
}
