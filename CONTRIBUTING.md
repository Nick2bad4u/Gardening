# Contributing

## Setup

```bash
npm ci
npm run setup:template -- --name my-package --description "Package description"
```

## Before Opening A Pull Request

```bash
npm run lint:all
npm run typecheck
npm run test
npm run package:check
```

Use the commit style documented in `.github/agent-commit-message-instructions.md`.
