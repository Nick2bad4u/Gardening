const pinPreference = "gardening-profile-navigation-pinned";

/** Enhance ordinary plant links with discoverable scroll hiding and pinning. */
export function initializeProfileNavigation(
    documentRoot: Document = document
): (() => void) | undefined {
    const navigation = documentRoot.querySelector<HTMLElement>(
        "[data-profile-navigation]"
    );
    const view = documentRoot.defaultView;
    const panel = navigation?.querySelector<HTMLElement>(
        "[data-profile-panel]"
    );
    const reveal = navigation?.querySelector<HTMLButtonElement>(
        "[data-profile-reveal]"
    );
    const pin =
        navigation?.querySelector<HTMLButtonElement>("[data-profile-pin]");
    const jump = navigation?.querySelector<HTMLDetailsElement>(
        "[data-profile-jump]"
    );
    if (
        !navigation ||
        !view ||
        !panel ||
        !reveal ||
        !pin ||
        !jump ||
        navigation.dataset["initialized"] === "true"
    )
        return;
    navigation.dataset["initialized"] = "true";

    const controller = new AbortController();
    const { signal } = controller;
    const state = {
        hovered: false,
        pinned: false,
        scrollY: Math.max(0, view.scrollY),
    };
    try {
        state.pinned = view.localStorage.getItem(pinPreference) === "true";
    } catch {
        // Navigation remains usable when browser storage is unavailable.
    }

    const show = (): void => {
        navigation.classList.remove("is-scroll-hidden");
        panel.inert = false;
        reveal.hidden = true;
        reveal.setAttribute("aria-expanded", "true");
    };
    const updatePin = (): void => {
        pin.setAttribute("aria-pressed", String(state.pinned));
        const label = state.pinned
            ? "Unpin plant navigation"
            : "Pin plant navigation";
        pin.setAttribute("aria-label", label);
        pin.title = label;
    };
    const handleScroll = (): void => {
        const current = Math.max(0, view.scrollY);
        const isNearEnd =
            current + view.innerHeight >=
            documentRoot.documentElement.scrollHeight - 32;
        const shouldKeepVisible =
            state.pinned ||
            state.hovered ||
            jump.open ||
            navigation.contains(documentRoot.activeElement);
        if (
            shouldKeepVisible ||
            isNearEnd ||
            current < 80 ||
            current < state.scrollY - 8
        ) {
            show();
        } else if (current > state.scrollY + 8) {
            navigation.classList.add("is-scroll-hidden");
            panel.inert = true;
            reveal.hidden = false;
            reveal.setAttribute("aria-expanded", "false");
        } else {
            // Ignore tiny scroll movements to keep the dock steady.
        }
        if (Math.abs(current - state.scrollY) > 8) state.scrollY = current;
    };

    pin.hidden = false;
    updatePin();
    navigation.addEventListener(
        "pointerenter",
        () => {
            state.hovered = true;
            show();
        },
        { signal }
    );
    navigation.addEventListener(
        "pointerleave",
        () => {
            state.hovered = false;
        },
        { signal }
    );
    navigation.addEventListener(
        "focusin",
        (event) => {
            show();
            if (event.target === reveal)
                panel.querySelector<HTMLElement>("a, summary, button")?.focus();
        },
        { signal }
    );
    reveal.addEventListener(
        "click",
        () => {
            show();
            panel.querySelector<HTMLElement>("a, summary, button")?.focus();
        },
        { signal }
    );
    pin.addEventListener(
        "click",
        () => {
            state.pinned = !state.pinned;
            updatePin();
            show();
            try {
                view.localStorage.setItem(pinPreference, String(state.pinned));
            } catch {
                // The current document retains the preference without persistence.
            }
        },
        { signal }
    );
    jump.addEventListener(
        "toggle",
        () => {
            if (jump.open) show();
        },
        { signal }
    );
    jump.addEventListener(
        "keydown",
        (event) => {
            if (event.key !== "Escape" || !jump.open) {
                return;
            }

            jump.open = false;
            jump.querySelector("summary")?.focus();
        },
        { signal }
    );
    // Directional hiding needs deltas, while IntersectionObserver only reports intersections.
    // eslint-disable-next-line unicorn/prefer-observer-apis -- Scroll direction is the user-facing hide/reveal trigger.
    view.addEventListener("scroll", handleScroll, { passive: true, signal });
    return () => {
        controller.abort();
        delete navigation.dataset["initialized"];
        show();
        pin.hidden = true;
    };
}
