import { mkdtemp, readFile, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, onTestFinished } from "vitest";

import {
    injectFixture,
    writeChangedFile,
} from "../.storybook/prepare-pages.mjs";
import {
    sourceMapModule,
    viteFileSystemUrl,
} from "../.storybook/vite-config.mjs";

describe("storybook preview preparation", () => {
    it("instruments maintained TypeScript and preserves Astro profile initializer calls", () => {
        expect.hasAssertions();

        const filename = path.resolve(
            ".cache/storybook-pages/_astro/fixture.js"
        );
        const searchModule = viteFileSystemUrl(
            path.resolve("site/client/search.ts")
        );

        expect(
            sourceMapModule(filename, ["../../../site/client/search.ts"])
        ).toBe(`export * from ${JSON.stringify(searchModule)};`);

        for (const [
            entry,
            module,
            initializer,
        ] of /** @type {[string, string, string][]} */ ([
            [
                "site/components/PlantProfile.astro",
                "site/client/profile.ts",
                "initializeProfilePhotos",
            ],
            [
                "site/components/ProfileNavigation.astro",
                "site/client/profile-navigation.ts",
                "initializeProfileNavigation",
            ],
            [
                "site/client/profile.ts",
                "site/client/profile.ts",
                "initializeProfilePhotos",
            ],
            [
                "site/components/PlantProfile.astro?astro&type=script&index=0&lang.ts",
                "site/client/profile.ts",
                "initializeProfilePhotos",
            ],
        ])) {
            const moduleUrl = viteFileSystemUrl(path.resolve(module));

            expect(sourceMapModule(filename, [`../../../${entry}`])).toBe(
                `import { ${initializer} } from ${JSON.stringify(moduleUrl)};\n${initializer}();`
            );
        }
    });

    it("does not instrument source-map entries outside the maintained browser directories", () => {
        expect.hasAssertions();

        const filename = path.resolve(
            ".cache/storybook-pages/_astro/fixture.js"
        );
        for (const entry of [
            "../../../scripts/private.ts",
            "../../../../outside.js",
            "../../../site/client/../../scripts/private.js",
        ]) {
            expect(() => sourceMapModule(filename, [entry])).toThrow(
                "not a maintained browser module"
            );
        }

        expect(sourceMapModule(filename, [null])).toBeUndefined();
        expect(
            sourceMapModule(filename, ["../../../site/components/Other.astro"])
        ).toBeUndefined();
    });

    it.each([
        [
            "/workspace/Gardening/site/client/site.js",
            "/@fs/workspace/Gardening/site/client/site.js",
        ],
        [
            String.raw`C:\Repos\Gardening\site\client\site.js`,
            "/@fs/C:/Repos/Gardening/site/client/site.js",
        ],
        [
            "C:/Repos/Gardening/docs/layouts/plant-history.js",
            "/@fs/C:/Repos/Gardening/docs/layouts/plant-history.js",
        ],
    ])(
        "maps %s to Vite's canonical coverage module URL",
        (source, expected) => {
            expect.hasAssertions();

            expect(viteFileSystemUrl(source)).toBe(expected);
        }
    );

    it("installs isolated storage and network fixtures before page scripts", () => {
        expect.hasAssertions();

        const html = injectFixture(
            '<!doctype html><html><head data-site="garden"><script>readPreferences()</script></head><body><main>Garden</main></body></html>'
        );

        expect(html.indexOf("storybook-fixture.js")).toBeLessThan(
            html.indexOf("readPreferences()")
        );
        expect(html).toContain(
            'src="/Gardening/storybook/preview/storybook-fixture.js"'
        );
        expect(html).not.toContain("googletagmanager");
    });

    it("preserves unchanged files so starting another runner does not reload an active story", async () => {
        expect.hasAssertions();

        const temporaryRoot = path.resolve(tmpdir());
        const directory = await mkdtemp(
            path.join(temporaryRoot, "gardening-storybook-")
        );
        onTestFinished(async () => {
            if (
                !path
                    .resolve(directory)
                    .startsWith(
                        `${temporaryRoot}${path.sep}gardening-storybook-`
                    )
            ) {
                throw new Error(
                    "Storybook test cleanup left its temporary directory."
                );
            }
            await rm(directory, { force: true, recursive: true });
        });
        const destination = pathToFileURL(path.join(directory, "preview.html"));
        const original = "<main>Plant preview</main>";

        await writeChangedFile(destination, original);

        await expect(readFile(destination, "utf8")).resolves.toBe(original);

        // A fixed older timestamp makes an accidental rewrite observable without sleeps.
        const previousTime = 1_577_836_800;
        await utimes(destination, previousTime, previousTime);
        const before = await stat(destination);
        await writeChangedFile(destination, Buffer.from(original));

        expect((await stat(destination)).mtimeMs).toBe(before.mtimeMs);

        const updated = "<main>Updated plant preview</main>";
        await writeChangedFile(destination, updated);

        await expect(readFile(destination, "utf8")).resolves.toBe(updated);
        expect((await stat(destination)).mtimeMs).toBeGreaterThan(
            before.mtimeMs
        );

        await expect(
            writeChangedFile(pathToFileURL(directory), original)
        ).rejects.toMatchObject({ code: "EISDIR" });
    });
});
