import type { APIRoute } from "astro";

import {
    getEquipmentDocs,
    getGuides,
    getOldPlans,
    getProfiles,
} from "../lib/content.mjs";
import { getReports } from "../lib/reports.mjs";
import { potUrl, profileUrl, siteOrigin, siteUrl } from "../lib/routes.mjs";

export const GET: APIRoute = async () => {
    const [
        profiles,
        guides,
        equipment,
        reports,
        oldPlans,
    ] = await Promise.all([
        getProfiles(),
        getGuides(),
        getEquipmentDocs(),
        getReports(),
        getOldPlans(),
    ]);
    const routes = [
        ...[
            "",
            "plants/",
            "tracker/",
            "report/",
            "reports/",
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
        ...reports.map((report) => siteUrl(`reports/${report.date}/`)),
    ];
    const locations = routes
        .map((route) => `<url><loc>${siteOrigin}${route}</loc></url>`)
        .join("");
    return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations}</urlset>`,
        { headers: { "Content-Type": "application/xml; charset=utf-8" } }
    );
};
