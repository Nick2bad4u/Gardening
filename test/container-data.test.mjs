import { describe, expect, it } from "vitest";

import { isProfileData, readJson, required } from "../scripts/build-data.mjs";
import {
    buildContainers,
    getContainers,
    isContainerData,
} from "../site/lib/containers.mjs";
import { getProfiles } from "../site/lib/content.mjs";

describe("container membership", () => {
    it("keeps 34 care units, four shared pots, and qualified Lithops members without counting overviews twice", async () => {
        expect.hasAssertions();

        const containers = await getContainers();

        expect(containers).toHaveLength(34);
        expect(
            containers
                .filter((container) => container.shared)
                .map((container) => container.id)
        ).toStrictEqual([
            "P19",
            "P20",
            "P30",
            "P35",
        ]);
        expect(
            containers.reduce(
                (total, container) => total + container.members.length,
                0
            )
        ).toBe(42);
        expect(
            containers
                .filter((container) => container.overview !== undefined)
                .map((container) => container.overview?.slug)
        ).toStrictEqual([
            "tiny-mixed-succulent-planter",
            "lithops-shared-planter",
        ]);

        const lithops = required(
            containers.find((container) => container.id === "P35"),
            "Lithops container fixture"
        );

        expect(lithops?.members.map((member) => member.slug)).toStrictEqual([
            "lithops-lesliei",
            "lithops-salicola",
        ]);
        expect(lithops?.label).toBe("#9");
        expect(lithops?.currentPot).toContain("Blush Mauve");

        for (const member of lithops.members) {
            expect(member.identificationMarkdown).toMatch(/probable/iv);
            expect(member.sheetUrl).toBe(lithops?.sheetUrl);
            expect(member.acquiredFromMarkdown).toMatch(/home depot.*howell/iv);
            expect(member.acquiredOnMarkdown).toContain("2026-09-21");
        }
    });

    it("rejects duplicate, mismatched, missing, and historical membership", async () => {
        expect.hasAssertions();

        const profiles = await getProfiles();
        const mapping = await readJson(
            "docs/layouts/plant-profile-data.json",
            isProfileData
        );
        const metadata = await readJson(
            "docs/layouts/container-data.json",
            isContainerData
        );
        const duplicate = structuredClone(mapping);
        duplicate["P35"]?.push(["lithops-lesliei", "Duplicate"]);

        expect(() => buildContainers(profiles, duplicate, metadata)).toThrow(
            /Duplicate container membership/v
        );

        const wrongPot = profiles.map((profile) =>
            profile.slug === "lithops-lesliei"
                ? { ...profile, trackerId: "P36" }
                : profile
        );

        expect(() => buildContainers(wrongPot, mapping, metadata)).toThrow(
            /membership mismatch/v
        );

        const missing = { ...mapping };
        delete missing["P01"];

        expect(() => buildContainers(profiles, missing, metadata)).toThrow(
            /no container/v
        );

        const historical = profiles.map((profile) =>
            profile.slug === "lithops-lesliei"
                ? { ...profile, historical: true }
                : profile
        );

        expect(() => buildContainers(historical, mapping, metadata)).toThrow(
            /membership mismatch/v
        );
    });

    it("rejects invalid metadata, unknown IDs, and an overview or portrait belonging to another pot", async () => {
        expect.hasAssertions();

        const profiles = await getProfiles();
        const mapping = await readJson(
            "docs/layouts/plant-profile-data.json",
            isProfileData
        );
        const metadata = await readJson(
            "docs/layouts/container-data.json",
            isContainerData
        );
        const lithops = required(metadata["P35"], "Lithops fixture metadata");

        expect(
            isContainerData({ P35: { ...lithops, overviewSlug: false } })
        ).toBe(false);
        expect(() =>
            buildContainers(profiles, mapping, { ...metadata, P99: lithops })
        ).toThrow(/Unknown container/v);
        expect(() =>
            buildContainers(profiles, mapping, {
                ...metadata,
                P35: { ...lithops, overviewSlug: "pleiospilos-nelii" },
            })
        ).toThrow(/Overview is not in container/v);
        expect(() =>
            buildContainers(profiles, mapping, {
                ...metadata,
                P35: { ...lithops, portraitSlug: "pleiospilos-nelii" },
            })
        ).toThrow(/Portrait is not in container/v);
    });
});
