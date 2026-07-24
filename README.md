# Nick2bad4u Repository Template

[![NPM license.](https://flat.badgen.net/npm/license/nick2bad4u-repo-template?color=purple)](https://github.com/Nick2bad4u/nick2bad4u-repo-template/blob/main/LICENSE) [![NPM total downloads.](https://flat.badgen.net/npm/dt/nick2bad4u-repo-template?color=pink)](https://www.npmjs.com/package/nick2bad4u-repo-template) [![Latest GitHub release.](https://flat.badgen.net/github/release/Nick2bad4u/nick2bad4u-repo-template?color=cyan)](https://github.com/Nick2bad4u/nick2bad4u-repo-template/releases) [![GitHub stars.](https://flat.badgen.net/github/stars/Nick2bad4u/nick2bad4u-repo-template?color=yellow)](https://github.com/Nick2bad4u/nick2bad4u-repo-template/stargazers) [![GitHub forks.](https://flat.badgen.net/github/forks/Nick2bad4u/nick2bad4u-repo-template?color=orange)](https://github.com/Nick2bad4u/nick2bad4u-repo-template/forks) [![GitHub open issues.](https://flat.badgen.net/github/open-issues/Nick2bad4u/nick2bad4u-repo-template?color=red)](https://github.com/Nick2bad4u/nick2bad4u-repo-template/issues) [![Codecov.](https://flat.badgen.net/codecov/github/Nick2bad4u/nick2bad4u-repo-template?color=blue)](https://codecov.io/gh/Nick2bad4u/nick2bad4u-repo-template) [![Repo Checks.](https://flat.badgen.net/github/checks/nick2bad4u/nick2bad4u-repo-template?color=green)](https://github.com/Nick2bad4u/nick2bad4u-repo-template/actions)

Starter repository for the tooling patterns used across the most active repos under `C:\Repos` and `F:\Repos`.

The target shape is a modern public npm package or config/plugin repository:

- Node 24 with npm 11.
- ESM package layout.
- TypeScript build and strict typecheck.
- Vitest tests and coverage.
- Shared Nick2bad4u configs for ESLint, Prettier, npm-package-json-lint, Remark, Secretlint, Gitleaks, Yamllint, Stylelint, TSDoc, and TypeDoc.
- GitHub Actions for CI, CodeQL, dependency/security automation, Dependabot, labeling, stale issue handling, and npm provenance publishing.
- Agent instructions and commit-message guidance so new AI sessions do not have to rediscover the project rules.

## Use This Template

After creating a new repo from this template, run:

```bash
npm run setup:template -- --name my-package --description "Package description"
npm install
npm run lint:all
```

Useful options:

```bash
npm run setup:template -- --name eslint-plugin-example --description "ESLint plugin for example rules" --repo Nick2bad4u/eslint-plugin-example
npm run setup:template -- --name internal-tool --private true --no-publish
npm run setup:template -- --name docs-plugin --docs true --stylelint true
```

## What Gets Standardized

The template intentionally keeps app-specific workflows, Electron build jobs, Docusaurus deploys, Codecov, SonarCloud, VirusTotal, and IndexNow out of the default CI path. Those exist in your active repos, but they are not universal enough to belong in every new repo.

## Maintenance Checklist

Use [docs/UPDATE_CHECKLIST.md](docs/UPDATE_CHECKLIST.md) when creating a new repository from this template or refreshing the template after shared tooling updates.
