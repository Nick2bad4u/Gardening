declare module "remark-lint-write-good" {
    import type { Root } from "mdast";
    import type { Plugin } from "unified";

    type RuleSetting =
        | ["error" | "warn", WriteGoodOptions]
        | boolean
        | WriteGoodOptions;

    interface WriteGoodOptions {
        adverb?: boolean;
        cliches?: boolean;
        eprime?: boolean;
        illusion?: boolean;
        passive?: boolean;
        so?: boolean;
        thereIs?: boolean;
        tooWordy?: boolean;
        weasel?: boolean;
        whitelist?: string[];
    }

    const remarkLintWriteGood: Plugin<[RuleSetting?], Root>;
    export default remarkLintWriteGood;
}
