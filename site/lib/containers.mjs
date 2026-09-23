import {
    isNonemptyString,
    isProfileData,
    isRecord,
    readJson,
    required,
} from "../../scripts/build-data.mjs";
import { getProfiles } from "./content.mjs";

/** @typedef {import("./content.mjs").SiteProfile} SiteProfile */
/**
 * @typedef {{
 *     name: string;
 *     overviewSlug: string | null;
 *     careNote: string;
 *     setupNote: string;
 *     portraitSlug?: string;
 * }} ContainerMetadata
 */
/** @typedef {Record<string, ContainerMetadata>} ContainerData */
/**
 * @typedef {{
 *     id: string;
 *     name: string;
 *     label: string;
 *     profiles: SiteProfile[];
 *     members: SiteProfile[];
 *     overview: SiteProfile | undefined;
 *     shared: boolean;
 *     portraitSlug: string;
 *     careNote: string;
 *     setupNote: string;
 *     currentPot: string;
 *     sheetUrl: string | undefined;
 * }} Container
 */

/**
 * Derive containers from the sole profile-to-P-ID mapping. Overviews describe a
 * container; they never count as an additional botanical member.
 *
 * @param {readonly SiteProfile[]} profiles
 * @param {import("../../scripts/build-data.mjs").ProfileData} mapping
 * @param {ContainerData} metadata
 *
 * @returns {Container[]}
 */
export function buildContainers(profiles, mapping, metadata) {
    const bySlug = new Map(profiles.map((profile) => [profile.slug, profile]));
    if (bySlug.size !== profiles.length)
        throw new Error("Duplicate profile slug in container source.");
    for (const id of Object.keys(metadata)) {
        if (!Object.hasOwn(mapping, id))
            throw new Error(`Unknown container metadata ID: ${id}`);
    }
    const seen = new Set();
    const containers = Object.entries(mapping).map(([id, entries]) => {
        if (!/^P\d{2}$/v.test(id) || entries.length === 0)
            throw new Error(`Invalid or empty container: ${id}`);
        const containerProfiles = entries.map(([slug]) => {
            const profile = required(
                bySlug.get(slug),
                `container profile ${slug}`
            );
            if (seen.has(slug))
                throw new Error(`Duplicate container membership: ${slug}`);
            if (profile.historical || profile.trackerId !== id)
                throw new Error(`Container membership mismatch: ${id}/${slug}`);
            seen.add(slug);
            return profile;
        });
        const details = metadata[id];
        const overview = findOverview(
            containerProfiles,
            details?.overviewSlug,
            id
        );
        const members = containerProfiles.filter(
            (profile) => profile !== overview
        );
        if (members.length === 0)
            throw new Error(`Container ${id} needs a botanical member.`);
        if (details === undefined && members.length > 1)
            throw new Error(
                `Shared container ${id} needs care and setup metadata.`
            );
        const primary = required(
            overview ?? members[0],
            `primary profile for ${id}`
        );
        const portraitSlug = details?.portraitSlug ?? primary.slug;
        assertPortrait(containerProfiles, portraitSlug, id);
        const label = primary.drawerLabel.primary;
        if (members.some((member) => member.drawerLabel.primary !== label))
            throw new Error(`Conflicting physical labels in ${id}.`);
        return {
            careNote:
                details?.careNote ??
                "Use the plant's care profile together with this container's current setup and observed dry-down. Elapsed days alone are not a watering instruction.",
            currentPot: primary.currentPotMarkdown,
            id,
            label,
            members,
            name: details?.name ?? primary.title,
            overview,
            portraitSlug,
            profiles: containerProfiles,
            setupNote:
                details?.setupNote ??
                "See the maintained plant profile and dated setup events in the container history. Unrecorded dimensions and medium details remain unknown.",
            shared: members.length > 1,
            sheetUrl: primary.sheetUrl,
        };
    });
    for (const profile of profiles) {
        if (!profile.historical && !seen.has(profile.slug))
            throw new Error(
                `Current profile has no container: ${profile.slug}`
            );
    }
    return containers.toSorted((left, right) =>
        left.id.localeCompare(right.id)
    );
}

/** @returns {Promise<Container[]>} */
export async function getContainers() {
    const [
        profiles,
        mapping,
        metadata,
    ] = await Promise.all([
        getProfiles(),
        readJson("docs/layouts/plant-profile-data.json", isProfileData),
        readJson("docs/layouts/container-data.json", isContainerData),
    ]);
    return buildContainers(profiles, mapping, metadata);
}

/** @param {unknown} value @returns {value is ContainerData} */
export function isContainerData(value) {
    return (
        isRecord(value) &&
        Object.entries(value).every(
            ([id, entry]) =>
                /^P\d{2}$/v.test(id) &&
                isRecord(entry) &&
                isNonemptyString(entry["name"]) &&
                (entry["overviewSlug"] === null ||
                    isNonemptyString(entry["overviewSlug"])) &&
                isNonemptyString(entry["careNote"]) &&
                isNonemptyString(entry["setupNote"]) &&
                (!Object.hasOwn(entry, "portraitSlug") ||
                    isNonemptyString(entry["portraitSlug"]))
        )
    );
}

/** @param {SiteProfile[]} profiles @param {string} slug @param {string} id */
function assertPortrait(profiles, slug, id) {
    const sharedPortraits = new Map([
        ["P19", "shared-rehab-cactus-planter"],
        ["P20", "shared-succulent-planter"],
    ]);
    if (
        sharedPortraits.get(id) !== slug &&
        profiles.every((profile) => profile.slug !== slug)
    ) {
        throw new Error(`Portrait is not in container ${id}: ${slug}`);
    }
}

/**
 * @param {SiteProfile[]} profiles @param {string | null | undefined} slug
 * @param {string} id
 */
function findOverview(profiles, slug, id) {
    if (slug === null || slug === undefined) return undefined;
    const overview = profiles.find((profile) => profile.slug === slug);
    if (overview === undefined)
        throw new Error(`Overview is not in container ${id}: ${slug}`);
    return overview;
}
