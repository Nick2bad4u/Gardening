# Workflow Instructions

- Keep top-level permissions read-only unless a workflow needs writes.
- Prefer reusable workflow callers to duplicating shared automation.
- Keep release and publish jobs separated from untrusted pull request validation.
- Use `.node-version` and `package-lock.json` for Node setup and cache keys.
- Run repository scripts rather than spelling out long validation commands in YAML.
