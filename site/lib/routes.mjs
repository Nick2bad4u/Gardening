/** The same project base is used by development, fixtures, and GitHub Pages. */
export const siteBase = readSiteBase();

function readSiteBase() {
    try {
        // Vite replaces this exact property; native Node has no import.meta.env.
        return import.meta.env.BASE_URL;
    } catch {
        return "/Gardening/";
    }
}
export const siteOrigin = "https://nick2bad4u.github.io";
export const repositoryUrl = "https://github.com/Nick2bad4u/Gardening";
export const loggerUrl =
    "https://script.google.com/macros/s/AKfycbytpdMto4ZAqOf49igDNoGYr-J6fmSRDNJOKP4-dKDFRmM2YkTCKJp3kmhrD4gOJShF/exec";

/** @param {string} id */
export function potUrl(id) {
    return siteUrl(`pots/${encodeURIComponent(id)}/`);
}

/** @param {string} slug */
export function profileUrl(slug) {
    return siteUrl(`plants/${encodeURIComponent(slug)}/`);
}

/** @param {string} [relative] */
export function siteUrl(relative = "") {
    if (/^(?:https?:|mailto:|tel:)/v.test(relative)) return relative;
    if (relative.startsWith(siteBase)) return relative;
    return `${siteBase}${relative.replace(/^\/+/v, "")}`;
}

const documentRoutes = new Map([
    ["docs/care-notes.md", "guides/care-notes/"],
    ["docs/collection.md", "plants/"],
    ["docs/equipment/inventory.md", "setup/equipment/"],
    ["docs/equipment/README.md", "setup/equipment/"],
    ["docs/layouts/daily-report.html", "report/"],
    ["docs/layouts/grow-spot-layout.html", "setup/placement/"],
    [
        "docs/layouts/indoor-acclimation-calendar.html",
        "setup/archive/calendar/",
    ],
    ["docs/layouts/photo-album.html", "photos/"],
    ["docs/layouts/plant-history.html", "pots/"],
    ["docs/layouts/plant-tracker.html", "tracker/"],
    ["docs/layouts/table-placement-research.md", "setup/placement/"],
    ["docs/logger-actions.md", "guides/logger-actions/"],
    ["docs/plant-booklet/index.html", ""],
    ["docs/plants/labels.md", "guides/labels/"],
    ["docs/plants/README.md", "plants/"],
    ["docs/setup.md", "setup/"],
    ["docs/two-light-placement-review.md", "setup/placement/"],
    ["docs/watering-strategy.md", "guides/watering-strategy/"],
    ["docs/weighing-strategy.md", "guides/weighing-strategy/"],
    ["README.md", ""],
]);

/**
 * Resolve repository-relative documentation links without publishing private
 * files.
 *
 * @param {string} repositoryPath
 */
export function contentUrl(repositoryPath) {
    if (/^(?:https?:|mailto:|tel:|#)/v.test(repositoryPath))
        return repositoryPath;
    const normalized = repositoryPath
        .replaceAll("\\", "/")
        .replace(/^\.\//v, "");
    const suffixIndex = normalized.search(/[#?]/v);
    const target =
        suffixIndex < 0 ? normalized : normalized.slice(0, suffixIndex);
    const suffix = suffixIndex < 0 ? "" : normalized.slice(suffixIndex);
    const known = documentRoutes.get(target);
    if (known !== undefined) return `${siteUrl(known)}${suffix}`;
    if (target.startsWith("docs/old-plans/") && target.endsWith(".md")) {
        const archiveRoute = siteUrl(
            `guides/old-plans/${target.slice(15, -3)}/`
        );
        return `${archiveRoute}${suffix}`;
    }
    const plant =
        /^docs\/plants\/(?:cacti|houseplants|rehab|starter|succulents)\/(?<slug>[^\/]+)\.md$/v.exec(
            target
        );
    const plantSlug = plant?.groups?.["slug"];
    if (plantSlug !== undefined) return `${profileUrl(plantSlug)}${suffix}`;
    const equipment = /^docs\/equipment\/(?<slug>[^\/]+)\.md$/v.exec(target);
    const equipmentSlug = equipment?.groups?.["slug"];
    if (equipmentSlug !== undefined) {
        const equipmentRoute = siteUrl(`setup/equipment/${equipmentSlug}/`);
        return `${equipmentRoute}${suffix}`;
    }
    if (
        /^assets\/(?:layouts|nursery-labels|plant-icons|plants|ui-icons)\/.+\.(?:csv|jpe?g|png|svg|webp)$/iv.test(
            target
        )
    )
        return `${siteUrl(target)}${suffix}`;
    return `${repositoryUrl}/blob/main/${target
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/")}${suffix}`;
}

export const primaryNavigation = [
    { href: siteUrl("plants/"), label: "Plants", section: "plants" },
    { href: siteUrl("report/"), label: "Daily Report", section: "report" },
    { href: siteUrl("tracker/"), label: "Tracker", section: "tracker" },
    { href: siteUrl("photos/"), label: "Photos", section: "photos" },
    { href: siteUrl("guides/"), label: "Guides", section: "guides" },
    { href: siteUrl("setup/"), label: "Setup", section: "setup" },
];
