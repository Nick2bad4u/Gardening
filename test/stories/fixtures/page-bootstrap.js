{
    const parameters = new URLSearchParams(location.search);
    const scenario = parameters.get("scenario") ?? "ready";
    // Each frame has its own preferences, including calendar completion state.
    const preferences = new Map([
        ["gardening-site-theme", parameters.get("theme") ?? "light"],
    ]);
    Object.defineProperty(globalThis, "localStorage", {
        value: {
            clear: () => {
                preferences.clear();
            },
            /** @param {string} key */
            getItem: (key) => preferences.get(key) ?? null,
            /** @param {string} key */
            removeItem: (key) => preferences.delete(key),
            /** @param {string} key @param {string} value */
            setItem: (key, value) => preferences.set(key, value),
        },
    });

    // Synthetic observations belong only to this browser frame.
    const plants = [
        "Plant ID,Current pot label,Plant / planter,Scientific name / contents",
        "P01,1,Variegated moon cactus,Gymnocalycium mihanovichii",
        "P02,2,Feather cactus,Mammillaria plumosa",
        "P03,10,Serpent cactus,Nyctocereus serpentinus",
    ].join("\n");
    const history = [
        "Date,Plant ID,Event,Weight state,Weight (g),Height (cm),Width (cm),Plant condition,Notes,Pot setup,Record status,Request ID",
        "2026-09-01,P01,Weight,Dry,400,,,Healthy,First dry reading,1,Active,storybook-dry",
        "2026-09-02,P01,Water,,,,,Healthy,Plain water,1,Active,storybook-water",
        "2026-09-02,P01,Weight,Wet,600,,,Healthy,Drained wet reading,1,Active,storybook-wet",
        "2026-09-03,P01,Weight,Routine,550,8,6,Healthy,Routine check,1,Active,storybook-routine",
        "2026-09-04,P02,Check,,,,,Healthy,No weight recorded,1,Active,storybook-check",
    ].join("\n");
    const headers = history.split("\n", 1)[0];
    const nativeFetch = fetch.bind(globalThis);
    let failedRequests = 0;
    /** @type {typeof fetch} */
    const fixtureFetch = async (input, init) => {
        const url = new URL(
            input instanceof Request ? input.url : String(input),
            location.href
        );
        if (url.hostname === "docs.google.com") {
            if (scenario === "loading")
                return new Promise(() => {
                    // Keep the request pending for the loading-state story.
                });
            failedRequests += 1;
            if (
                scenario === "error" ||
                (scenario === "retry" && failedRequests <= 2)
            ) {
                return new Response("Fixture service unavailable", {
                    status: 503,
                });
            }
            const csv =
                url.searchParams.get("gid") === "0"
                    ? plants
                    : scenario === "empty"
                      ? headers
                      : history;
            return new Response(csv, {
                headers: { "Content-Type": "text/csv" },
            });
        }
        if (url.origin !== location.origin) {
            throw new Error("Storybook only permits local fixture requests.");
        }
        return nativeFetch(input, init);
    };
    Object.defineProperty(globalThis, "fetch", { value: fixtureFetch });
}
