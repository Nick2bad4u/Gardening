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
        "Plant ID,Current pot label,Plant / planter,Scientific name / contents,Est. time to dry",
        "P01,1,Variegated moon cactus,Gymnocalycium mihanovichii",
        "P02,2,Feather cactus,Mammillaria plumosa",
        "P03,10,Serpent cactus,Nyctocereus serpentinus",
        ...(scenario === "humidity"
            ? ["P38,#12,Terrarium,Plant identities pending,5 days"]
            : []),
    ].join("\n");
    const historyHeaders =
        "Date,Plant ID,Event,Weight state,Weight (g),Height (cm),Width (cm),Plant condition,Notes,Pot setup,Record status,Request ID,Relative humidity (%),PPFD (µmol/m²/s),Illuminance (lux),Observation quality,Measurement method,Observation ID,Corrects observation ID,Soil moisture";
    /** @type {Record<string, string | number>[]} */
    const lightObservations = [
        {
            Event: "Inspect",
            "Observation ID": "inspect-active",
            "Plant condition": "Healthy leaves",
        },
        {
            Event: "Inspect",
            "Observation ID": "inspect-removed",
            "Plant condition": "Superseded inspection",
            "Record status": "Removed",
        },
        {
            Event: "Light",
            "Measurement method": "Light app",
            Notes: "Zero PPFD",
            "Observation quality": "Estimated",
            "PPFD (µmol/m²/s)": 0,
        },
        {
            Event: "Light",
            "Illuminance (lux)": 0,
            "Measurement method": "Lux meter",
            Notes: "Zero lux",
            "Observation quality": "Measured",
        },
        {
            Event: "Light",
            "Illuminance (lux)": 10_000,
            "Measurement method": "Light app",
            Notes: "Both readings",
            "Observation quality": "Estimated",
            "PPFD (µmol/m²/s)": 200,
        },
        {
            Event: "Light",
            "Measurement method": "Light app",
            Notes: "Original reading",
            "Observation ID": "light-original",
            "Observation quality": "Estimated",
            "PPFD (µmol/m²/s)": 999,
            "Record status": "Removed",
        },
        {
            "Corrects observation ID": "light-original",
            Event: "Light",
            "Measurement method": "Light app",
            Notes: "Corrected reading",
            "Observation ID": "light-corrected",
            "Observation quality": "Estimated",
            "PPFD (µmol/m²/s)": 350,
        },
        { Event: "Light", Notes: "Missing reading" },
    ];
    const history = [
        historyHeaders,
        "2026-09-01,P01,Weight,Dry,400,,,Healthy,First dry reading,1,Active,storybook-dry",
        "2026-09-02,P01,Water,,,,,Healthy,Plain water,1,Active,storybook-water",
        "2026-09-02,P01,Weight,Wet,600,,,Healthy,Drained wet reading,1,Active,storybook-wet",
        "2026-09-03,P01,Weight,Routine,550,8,6,Healthy,Routine check,1,Active,storybook-routine",
        "2026-09-04,P02,Check,,,,,Healthy,No weight recorded,1,Active,storybook-check",
        ...(scenario === "humidity"
            ? [
                  "2026-09-01,P38,Humidity,,,,,,Zero reading,1,Active,storybook-humidity-zero,0",
                  "2026-09-02,P38,Humidity,,,,,,Saturated reading,1,Active,storybook-humidity-full,100",
                  "2026-09-03,P38,Humidity,,,,,,Latest reading,1,Active,storybook-humidity-latest,65.5",
              ]
            : []),
        ...(scenario === "light"
            ? lightObservations.map((event, index) => {
                  /** @type {Record<string, string | number>} */
                  const row = {
                      Date: `2026-09-${String(index + 5).padStart(2, "0")}`,
                      "Plant ID": "P02",
                      "Pot setup": 1,
                      "Record status": "Active",
                      ...event,
                  };
                  return historyHeaders
                      .split(",")
                      .map((header) => row[header] ?? "")
                      .join(",");
              })
            : []),
    ].join("\n");
    if (scenario === "light") {
        const nativeCreateObjectURL = URL.createObjectURL.bind(URL);
        /** @param {Blob} blob */
        const captureExport = async (blob) => {
            document.documentElement.dataset["exportedCsv"] = await blob.text();
        };
        URL.createObjectURL = (blob) => {
            if (blob instanceof Blob) {
                void captureExport(blob);
            }
            return nativeCreateObjectURL(blob);
        };
    }
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
