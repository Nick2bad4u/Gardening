import { createConfig } from "remark-config-nick2bad4u";
import remarkLintWriteGood from "remark-lint-write-good";

/** @type {import("remark-config-nick2bad4u").RemarkConfig} */
const remarkConfig = createConfig({
    // Keep structural Markdown checks without subjective prose suggestions.
    plugins: [[remarkLintWriteGood, false]],
    settings: {},
});

export default remarkConfig;
