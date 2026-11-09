import type { APIRoute } from "astro";

import { getContainers } from "../lib/containers.mjs";
import {
    getEquipmentDocs,
    getGuides,
    getOldPlans,
    getProfiles,
} from "../lib/content.mjs";
import {
    containerUrl,
    potUrl,
    profileUrl,
    siteOrigin,
    siteUrl,
} from "../lib/routes.mjs";

export const GET: APIRoute = async () => {
    const [
        profiles,
        guides,
        equipment,
        oldPlans,
    ] = await Promise.all([
        getProfiles(),
        getGuides(),
        getEquipmentDocs(),
        getOldPlans(),
    ]);
    const containers = await getContainers();
    const routes = [
        ...containers.map((container) => containerUrl(container.id)),
        ...[
            "",
            "plants/",
            "containers/",
            "tracker/",
            "watering/",
            "photos/",
            "guides/",
            "guides/old-plans/",
            "setup/",
            "setup/placement/",
            "setup/equipment/",
            "setup/archive/",
            "setup/archive/layout/",
            "setup/archive/calendar/",
        ].map((route) => siteUrl(route)),
        ...profiles.map((profile) => profileUrl(profile.slug)),
        ...[
            ...new Set(
                profiles
                    .map((profile) => profile.trackerId)
                    .filter((id): id is string => Boolean(id))
            ),
        ].map((id) => potUrl(id)),
        ...guides.map((doc) => siteUrl(`guides/${doc.slug}/`)),
        ...oldPlans.map((doc) => siteUrl(`guides/old-plans/${doc.slug}/`)),
        ...equipment.map((doc) => siteUrl(`setup/equipment/${doc.slug}/`)),
    ];
    const locations = routes
        .map((route) => `<url><loc>${siteOrigin}${route}</loc></url>`)
        .join("");
    return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations}</urlset>`,
        { headers: { "Content-Type": "application/xml; charset=utf-8" } }
    );
};
