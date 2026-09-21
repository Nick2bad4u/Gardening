import type { APIRoute, GetStaticPaths } from "astro";

import { getProfiles } from "../lib/content.mjs";
import { legacyData, redirectHtml, renumberedPots } from "../lib/legacy.mjs";
import { archivedAmazonPlan } from "../lib/old-plans.mjs";
import { siteUrl } from "../lib/routes.mjs";

export const getStaticPaths: GetStaticPaths = () => [
    ...archivedAmazonPlan.profiles.map(([slug]) => ({
        params: { retired: `plants/${slug}/index.html` },
        props: {
            destination: `guides/old-plans/${archivedAmazonPlan.folder}/${slug}/`,
        },
    })),
    ...Object.entries(renumberedPots).map(([id, current]) => ({
        params: { retired: `pots/${id}/index.html` },
        props: {
            destination: `pots/${current}/`,
        },
    })),
];
export const GET: APIRoute = async ({ props }) => {
    const profiles = await getProfiles();
    const destination = siteUrl(String(props["destination"]));
    const html = redirectHtml(legacyData(profiles), destination);
    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
};
