import { mkdtemp, readFile, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, onTestFinished } from "vitest";

import { writeChangedFile } from "../.storybook/prepare-pages.mjs";

describe("storybook preview preparation", () => {
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
