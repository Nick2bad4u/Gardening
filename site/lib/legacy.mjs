import { potUrl, profileUrl, siteUrl } from "./routes.mjs";

/**
 * @typedef {{
 *     anchors: Record<string, string>;
 *     labels: Record<string, string>;
 *     pots: Record<string, string>;
 *     profiles: Record<string, string>;
 * }} LegacyData
 */

/**
 * @param {{
 *     slug: string;
 *     trackerId?: string | undefined;
 *     drawerLabel: { primary: string };
 * }[]} profiles
 *
 * @returns {LegacyData}
 */
export function legacyData(profiles) {
    /** @type {LegacyData} */
    const data = {
        anchors: {
            closing: siteUrl("#site-footer"),
            contents: siteUrl("plants/"),
            cover: siteUrl(),
            equipment: siteUrl("setup/equipment/"),
            "equipment-air-and-climate": siteUrl(
                "setup/equipment/#air-and-climate"
            ),
            "equipment-display-and-support": siteUrl(
                "setup/equipment/#display-and-support"
            ),
            "equipment-lights-and-controls": siteUrl(
                "setup/equipment/#lights-and-controls"
            ),
            "equipment-measuring-and-watering": siteUrl(
                "setup/equipment/#measuring-and-watering"
            ),
            "equipment-photos-labels-and-records": siteUrl(
                "setup/equipment/#photos-labels-and-records"
            ),
            "equipment-pots-medium-and-top-dressing": siteUrl(
                "setup/equipment/#pots-medium-and-top-dressing"
            ),
            "equipment-sources-and-record-limits": siteUrl(
                "setup/equipment/#sources-and-record-limits"
            ),
            "equipment-stored-and-historical-choices": siteUrl(
                "setup/equipment/#stored-and-historical-choices"
            ),
            "equipment-title": siteUrl("setup/equipment/"),
            placement: siteUrl("setup/placement/"),
            "placement-title": siteUrl("setup/placement/"),
        },
        labels: {},
        pots: {},
        profiles: {},
    };
    for (const profile of profiles) {
        data.profiles[profile.slug] = profileUrl(profile.slug);
        if (profile.trackerId !== undefined && profile.trackerId !== "") {
            data.labels[profile.drawerLabel.primary.toUpperCase()] =
                profile.trackerId;
            data.pots[profile.trackerId] = potUrl(profile.trackerId);
        }
    }
    return data;
}

export const legacyLayouts = {
    "daily-report": "report/",
    "grow-spot-layout": "setup/placement/",
    "indoor-acclimation-calendar": "setup/archive/calendar/",
    "photo-album": "photos/",
    "plant-history": "pots/",
    "plant-tracker": "tracker/",
};

/**
 * @param {LegacyData} data @param {string} fallback @param {boolean}
 *   [isRedirectPage]
 */
export function legacyScript(data, fallback, isRedirectPage = false) {
    const encoded = JSON.stringify(data).replaceAll("<", String.raw`\u003c`);
    const encodedFallback = JSON.stringify(fallback).replaceAll(
        "<",
        String.raw`\u003c`
    );
    return `(${resolveLegacy.toString()})(${encoded},${encodedFallback},${String(isRedirectPage)});`;
}

/** @param {LegacyData} data @param {string} fallback */
export function redirectHtml(data, fallback) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="gardening-redirect" content="true"><meta name="robots" content="noindex"><title>This garden page has moved</title><link rel="canonical" href="https://nick2bad4u.github.io${fallback}"><script>${legacyScript(data, fallback, true)}</script></head><body><main><h1>This garden page has moved.</h1><p>Your bookmark will open its new page automatically.</p><p><a href="${fallback}">Continue to the new page</a> · <a href="${siteUrl("plants/")}">Browse plants</a></p></main></body></html>`;
}

/**
 * This self-contained function is serialized into redirect pages. All helpers
 * must remain inside the function so generated scripts need no module imports.
 *
 * @param {LegacyData} data @param {string} fallback @param {boolean}
 *   [isRedirectPage]
 */
export function resolveLegacy(data, fallback, isRedirectPage = false) {
    /** @param {keyof LegacyData} field @param {string} key */
    const findValue = (field, key) =>
        Object.entries(data[field]).find(([name]) => name === key)?.[1];
    /** @param {string} hash */
    const profileTarget = (hash) => {
        const normalized = hash.startsWith("plant-") ? hash.slice(6) : hash;
        const profiles = Object.entries(data.profiles).toSorted(
            ([first], [second]) => second.length - first.length
        );
        for (const [slug, href] of profiles) {
            if (normalized === slug) return href;
            if (normalized.startsWith(`${slug}-`))
                return `${href}#${normalized}`;
        }
        return undefined;
    };
    /** @param {URLSearchParams} parameters */
    const historyTarget = (parameters) => {
        if (
            !isRedirectPage ||
            !/(?:plant-history\.html|\/pots\/?)$/v.test(location.pathname)
        )
            return undefined;
        const requested = (parameters.get("id") ?? "").toUpperCase();
        const labelId = findValue("labels", requested) ?? requested;
        const target =
            findValue("pots", requested) ?? findValue("pots", labelId);
        if (target !== undefined) parameters.delete("id");
        return target;
    };
    /** @param {string} hash */
    const archiveTarget = (hash) => {
        if (
            !isRedirectPage ||
            !location.pathname.endsWith("grow-spot-layout.html")
        )
            return undefined;
        if (
            ![
                "height",
                "room",
                "tables",
                "wiring",
            ].includes(hash)
        )
            return undefined;
        return `${fallback.replace(/placement\/$/v, "archive/layout/")}#${hash}`;
    };
    let hash = location.hash.slice(1);
    try {
        hash = decodeURIComponent(hash);
    } catch {
        /* Preserve literal anchors with malformed escapes. */
    }
    const parameters = new URLSearchParams(location.search);
    const history = historyTarget(parameters);
    const matched =
        archiveTarget(hash) ??
        history ??
        profileTarget(hash) ??
        findValue("anchors", hash);
    if (!isRedirectPage && matched === undefined) return;
    const destination = new URL(matched ?? fallback, location.origin);
    if (
        hash !== "" &&
        destination.hash === "" &&
        (matched === undefined || matched === history)
    )
        destination.hash = hash;
    for (const [key, value] of parameters)
        destination.searchParams.set(key, value);
    if (destination.href !== location.href) {
        document.documentElement.dataset["gardeningRedirecting"] = "";
        location.replace(destination.href);
    }
}
