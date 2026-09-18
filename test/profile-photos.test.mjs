import { Window } from "happy-dom";
import { readFileSync } from "node:fs";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { describe, expect, it, onTestFinished } from "vitest";

import { rewriteUnavailableCollectionPreviews } from "../scripts/collection-previews.mjs";

const client = transpileModule(
    readFileSync(new URL("../site/client/profile.ts", import.meta.url), "utf8"),
    {
        compilerOptions: {
            module: ModuleKind.ESNext,
            target: ScriptTarget.ES2022,
        },
    }
).outputText.replace("export function", "function");

/** @param {{ complete: boolean; naturalWidth: number }} state */
function createAvatar(state) {
    const window = new Window({ url: "https://example.test/Gardening/" });
    onTestFinished(async () => window.happyDOM.close());
    const figure = window.document.createElement("figure");
    figure.className = "profile-owned-avatar";
    const link = window.document.createElement("a");
    link.href = "https://example.test/owned-photo";
    const image = window.document.createElement("img");
    image.className = "profile-avatar-photo";
    Object.defineProperties(image, {
        complete: { value: state.complete },
        naturalWidth: { value: state.naturalWidth },
    });
    const caption = window.document.createElement("figcaption");
    caption.dataset["avatarCaption"] = "";
    caption.textContent = "Owned plant · © Nick";
    link.append(image);
    figure.append(link, caption);
    window.document.body.append(figure);
    window.eval(`${client}\ninitializeProfilePhotos();`);
    return { caption, figure, image, link, window };
}

describe("owned avatar fallback", () => {
    it("handles the real publication placeholder while preserving the capture link and other photo credits", () => {
        expect.hasAssertions();

        const window = new Window({ url: "https://example.test/Gardening/" });
        onTestFinished(async () => window.happyDOM.close());
        const capture = "11111111111111111111111111111111";
        const html = rewriteUnavailableCollectionPreviews(
            `<figure class="profile-owned-avatar"><a class="profile-avatar-link" href="https://gyazo.com/${capture}"><img class="profile-avatar-fallback" src="/Gardening/assets/plant-icons/feather.svg" alt=""><img class="profile-avatar-photo" src="https://thumb.gyazo.com/thumb/640/${capture}.png" alt="Owned feather cactus"></a><figcaption data-avatar-caption>Owned plant · © Nick</figcaption></figure><figure class="collection-photo"><img src="https://thumb.gyazo.com/thumb/640/${capture}.png" alt="Owned feather cactus"><figcaption>Collection evidence · © Nick</figcaption></figure>`,
            new Set([capture])
        );
        const parser = new window.DOMParser();
        const document = parser.parseFromString(html, "text/html");
        window.document.body.append(...document.body.childNodes);
        const avatar = window.document.querySelector(".profile-owned-avatar");
        const placeholder = avatar?.querySelector(".photo-unavailable");

        expect(avatar?.querySelector(".profile-avatar-photo")).toBeNull();
        expect(placeholder?.hasAttribute("hidden")).toBe(false);

        window.eval(`${client}\ninitializeProfilePhotos();`);

        expect(placeholder?.hasAttribute("hidden")).toBe(true);
        expect(avatar?.classList.contains("profile-avatar-unavailable")).toBe(
            true
        );
        expect(
            avatar?.querySelector("[data-avatar-caption]")?.textContent
        ).toBe("Illustration · Open owned photo ↗");
        expect(avatar?.querySelector("a")?.href).toBe(
            `https://gyazo.com/${capture}`
        );
        expect(
            window.document
                .querySelector(".collection-photo .photo-unavailable")
                ?.hasAttribute("hidden")
        ).toBe(false);
        expect(
            window.document.querySelector(".collection-photo figcaption")
                ?.textContent
        ).toBe("Collection evidence · © Nick");
    });

    it("labels an already-failed preview honestly while retaining its owned-photo link", () => {
        expect.hasAssertions();

        const { caption, figure, image, link } = createAvatar({
            complete: true,
            naturalWidth: 0,
        });

        expect(image.hidden).toBe(true);
        expect(figure.classList.contains("profile-avatar-unavailable")).toBe(
            true
        );
        expect(caption.textContent).toBe("Illustration · Open owned photo ↗");
        expect(link.href).toBe("https://example.test/owned-photo");
    });

    it("handles a later image error without falsely retaining the photograph caption", () => {
        expect.hasAssertions();

        const { caption, image, window } = createAvatar({
            complete: false,
            naturalWidth: 0,
        });

        expect(image.hidden).toBe(false);

        image.dispatchEvent(new window.Event("error"));

        expect(image.hidden).toBe(true);
        expect(caption.textContent).toBe("Illustration · Open owned photo ↗");
    });

    it("preserves a successfully loaded owned photograph and its credit", () => {
        expect.hasAssertions();

        const { caption, figure, image } = createAvatar({
            complete: true,
            naturalWidth: 240,
        });

        expect(image.hidden).toBe(false);
        expect(figure.classList.contains("profile-avatar-unavailable")).toBe(
            false
        );
        expect(caption.textContent).toBe("Owned plant · © Nick");
    });
});
