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
        ...(scenario === "houseplants"
            ? [
                  "P39,#13,Nightly nerve plant,Fittonia albivenis,5 days",
                  "P40,#14,Spice is Nice peperomia,Peperomia obtusifolia,5 days",
              ]
            : []),
    ].join("\n");
    const historyHeaders =
        "Date,Plant ID,Event,Weight state,Weight (g),Height (cm),Width (cm),Plant condition,Notes,Pot setup,Record status,Request ID,Relative humidity (%),PPFD (µmol/m²/s),Illuminance (lux),Observation quality,Measurement method,Observation ID,Corrects observation ID,Soil moisture,Mist targets,Mist amount (mL),Mist details,Previous location,New location,Temperature (°C),Temperature target,Temperature entry unit,Environment aspect,Previous setting,New setting,Propagation method,Propagation details,Support action,Support details,Leaf temperature (°C),Leaf temperature entry unit,Paired air temperature (°C),Paired air temperature entry unit,Paired relative humidity (%),Leaf VPD (kPa),Leaf VPD source";
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
    /** @type {Record<string, string | number>[]} */
    const careObservations = [
        {
            Event: "Mist",
            "Mist amount (mL)": 4,
            "Mist details": "Fine spray",
            "Mist targets": "Leaves; Exposed roots",
        },
        {
            Event: "Move",
            "New location": "Upper shelf",
            "Observation ID": "move-original",
            "Previous location": "Lower shelf",
            "Record status": "Removed",
        },
        {
            "Corrects observation ID": "move-original",
            Event: "Move",
            "New location": "Window",
            "Observation ID": "move-corrected",
            "Previous location": "Lower shelf",
        },
        {
            Event: "Temperature",
            Notes: "Zero air",
            "Temperature (°C)": 0,
            "Temperature entry unit": "F",
            "Temperature target": "Air",
        },
        {
            Event: "Temperature",
            Notes: "Cold soil",
            "Temperature (°C)": -2.5,
            "Temperature entry unit": "C",
            "Temperature target": "Soil",
        },
        {
            "Environment aspect": "Grow light",
            Event: "Environment",
            "New setting": "10 hours",
            "Previous setting": "8 hours",
        },
        {
            Event: "Propagate",
            "Propagation details": "Two cuttings",
            "Propagation method": "Stem cutting",
        },
        {
            Event: "Support",
            "Support action": "Add stake",
            "Support details": "Loose tie",
        },
        {
            Event: "Leaf VPD",
            "Leaf temperature (°C)": 0,
            "Leaf temperature entry unit": "F",
            "Leaf VPD (kPa)": 0,
            "Leaf VPD source": "Device",
            Notes: "Zero device VPD",
            "Paired air temperature (°C)": 0,
            "Paired air temperature entry unit": "C",
            "Paired relative humidity (%)": 100,
        },
        {
            Event: "Leaf VPD",
            "Leaf temperature (°C)": 18,
            "Leaf temperature entry unit": "C",
            "Leaf VPD (kPa)": -0.3155,
            "Leaf VPD source": "Calculated",
            Notes: "Negative calculated VPD",
            "Paired air temperature (°C)": 22,
            "Paired air temperature entry unit": "C",
            "Paired relative humidity (%)": 90,
        },
        {
            Event: "Leaf VPD",
            "Leaf temperature (°C)": 20,
            "Leaf temperature entry unit": "C",
            "Leaf VPD source": "Not calculated",
            Notes: "Leaf only without pairing",
        },
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
        ...(scenario === "houseplants"
            ? ["P39", "P40"].flatMap((id) => [
                  `2026-09-01,${id},Weight,Dry,400,,,Healthy,Measured before water,1,Active,storybook-${id}-dry`,
                  `2026-09-02,${id},Water,,,,,Healthy,Water recorded,1,Active,storybook-${id}-water`,
                  `2026-09-02,${id},Weight,Wet,600,,,Healthy,Measured after draining,1,Active,storybook-${id}-wet`,
                  `2026-09-03,${id},Weight,Routine,550,,,Healthy,Routine check,1,Active,storybook-${id}-routine`,
              ])
            : []),
        ...(["care-events", "light"].includes(scenario)
            ? (scenario === "light" ? lightObservations : careObservations).map(
                  (event, index) => {
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
                  }
              )
            : []),
    ].join("\n");
    if (["care-events", "light"].includes(scenario)) {
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
    const failedSources = new Set();
    /** @type {typeof fetch} */
    const fixtureFetch = async (input, init) => {
        const url = new URL(
            input instanceof Request ? input.url : String(input),
            location.href
        );
        if (url.hostname === "docs.google.com") {
            if (
                scenario === "tracker-unavailable" &&
                url.searchParams.get("gid") === "0"
            ) {
                document.documentElement.dataset["trackerRequested"] = "true";
                return new Promise(() => {
                    // The canonical history stays available while the unrelated tracker stalls.
                });
            }
            if (scenario === "loading")
                return new Promise(() => {
                    // Keep the request pending for the loading-state story.
                });
            const sourceId = url.searchParams.get("gid");
            const hasPreviouslyFailed = failedSources.has(sourceId);
            failedSources.add(sourceId);
            if (
                scenario === "error" ||
                (scenario === "retry" && !hasPreviouslyFailed)
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
