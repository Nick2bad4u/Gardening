const config = {
    extends: "default",
    rules: {
        comments: { "min-spaces-from-content": 1 },
        // Prettier owns wrapping, including pinned refs and scalar paragraphs.
        "line-length": "disable",
        // GitHub Actions uses the YAML 1.2 key on; validate boolean values.
        truthy: { "check-keys": false },
    },
};

export default config;
