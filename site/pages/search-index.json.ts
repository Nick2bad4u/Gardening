import type { APIRoute } from "astro";

import {
    getEquipmentDocs,
    getGuides,
    getOldPlans,
    getProfiles,
} from "../lib/content.mjs";
import { stripHtml } from "../lib/content/profile-source.mjs";
import { profileUrl, siteUrl } from "../lib/routes.mjs";

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
    const entries = [
        ...profiles.map((profile) => ({
            category: profile.historical
                ? "Historical plant"
                : profile.groupTitle,
            description: `${profile.drawerLabel.primary} · ${profile.trackerId ?? "Historical record"} · ${stripHtml(profile.scientificHtml)}`,
            href: profileUrl(profile.slug),
            text: profile.searchText,
            title: profile.title,
        })),
        ...[
            ...oldPlans.map((doc) => ({
                ...doc,
                category: "Old plan · Archived",
                href: siteUrl(`guides/old-plans/${doc.slug}/`),
            })),
            ...guides.map((doc) => ({
                ...doc,
                category: "Guide",
                href: siteUrl(`guides/${doc.slug}/`),
            })),
            ...equipment.map((doc) => ({
                ...doc,
                category: "Equipment",
                href: siteUrl(`setup/equipment/${doc.slug}/`),
            })),
        ].map((doc) => ({
            category: doc.category,
            description: doc.description,
            href: doc.href,
            text: stripHtml(doc.html).toLowerCase(),
            title: doc.title,
        })),
    ];
    return Response.json(entries, {
        headers: { "Content-Type": "application/json; charset=utf-8" },
    });
};
