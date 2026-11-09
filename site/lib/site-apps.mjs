import { siteUrl } from "./routes.mjs";

/**
 * @typedef {{
 *     name: string;
 *     shortName?: string;
 *     route: string;
 *     icon: string;
 *     themeColor: string;
 *     description: string;
 *     fragment: string;
 * }} SiteApp
 */

/** @type {SiteApp[]} */
export const siteApps = [
    {
        description:
            "The Fenton Collection: plants, observations, and practical care notes.",
        fragment: "",
        icon: "garden-home",
        name: "The Garden",
        route: "",
        themeColor: "#204d3e",
    },
    {
        description:
            "Browse the collection's individual plant profiles and care references.",
        fragment: "",
        icon: "garden-plants",
        name: "Plant Library",
        route: "plants/",
        themeColor: "#365c2f",
    },
    {
        description:
            "Browse the collection's containers, shared planters, and the plants growing together.",
        fragment: "",
        icon: "garden-containers",
        name: "Containers",
        route: "containers/",
        themeColor: "#315a57",
    },
    {
        description:
            "Find each tracked pot's weights, watering records, and observation history.",
        fragment: "",
        icon: "garden-pots",
        name: "Pot History",
        route: "pots/",
        themeColor: "#7f4338",
    },
    {
        description: "The collection's live weighing and watering tracker.",
        fragment: "",
        icon: "garden-tracker",
        name: "Plant Tracker",
        route: "tracker/",
        themeColor: "#154b70",
    },
    {
        description:
            "The collection's watering map with live recorded watering history and pot locations.",
        fragment: "",
        icon: "garden-watering",
        name: "Garden Watering Map",
        route: "watering/",
        shortName: "Watering Map",
        themeColor: "#145b50",
    },
    {
        description: "Dated collection photographs and plant observations.",
        fragment: "",
        icon: "garden-photos",
        name: "Garden Photos",
        route: "photos/",
        themeColor: "#573a77",
    },
    {
        description:
            "Practical collection guides for plant care, weighing, watering, and logging.",
        fragment: "",
        icon: "garden-guides",
        name: "Care Guides",
        route: "guides/",
        themeColor: "#334c80",
    },
    {
        description:
            "The garden's growing spaces, equipment, and current setup.",
        fragment: "",
        icon: "garden-setup",
        name: "Garden Setup",
        route: "setup/",
        themeColor: "#354b60",
    },
    {
        description:
            "Equipment, supplies, and exact-model research for the collection.",
        fragment: "",
        icon: "garden-equipment",
        name: "Equipment",
        route: "setup/equipment/",
        themeColor: "#24595e",
    },
    {
        description:
            "Current plant placement, light positions, and growing-space diagrams.",
        fragment: "",
        icon: "garden-placement",
        name: "Placement",
        route: "setup/placement/",
        themeColor: "#734957",
    },
    {
        description:
            "Search the garden's plant profiles, guides, equipment, and reference pages.",
        fragment: "",
        icon: "garden-search",
        name: "Garden Search",
        route: "search/",
        themeColor: "#66385f",
    },
];

/** @param {string} pathname */
export function siteAppForPath(pathname) {
    const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
    return siteApps
        .toSorted((left, right) => right.route.length - left.route.length)
        .find((app) =>
            app.route === ""
                ? normalized === siteUrl()
                : normalized.startsWith(siteUrl(app.route))
        );
}

/** @param {SiteApp} app */
export function siteManifest(app) {
    return {
        background_color: "#f5f3eb",
        description: app.description,
        display: "standalone",
        icons: [
            {
                purpose: "any",
                sizes: "192x192",
                src: siteUrl(`assets/report-apps/${app.icon}-192.png`),
                type: "image/png",
            },
            {
                purpose: "any maskable",
                sizes: "512x512",
                src: siteUrl(`assets/report-apps/${app.icon}-512.png`),
                type: "image/png",
            },
        ],
        id: siteUrl(app.route),
        lang: "en",
        name: app.name,
        scope: siteUrl(app.route),
        short_name: app.shortName ?? app.name,
        start_url: `${siteUrl(app.route)}${app.fragment}`,
        theme_color: app.themeColor,
    };
}
