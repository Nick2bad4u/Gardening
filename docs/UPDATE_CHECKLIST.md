# Template Update Checklist

Use this checklist when creating a new repository from this template or when refreshing the template itself.

## Required Per New Repository

- [ ] Run `npm run setup:template -- --name <package-name> --description "<description>" --repo Nick2bad4u/<repo-name>`.
- [ ] Replace the placeholder `src/tooling-baseline.ts` and `test/tooling-baseline.test.ts`.
- [ ] Update `README.md` badges, description, install/use examples, and repository links.
- [ ] Update `package.json` package name, description, keywords, exports, `files`, and publish settings.
- [ ] Keep `.node-version`, `.nvmrc`, `package.json#engines.node`, and `packageManager` aligned.
- [ ] Run `npm run sync:node-version-files:check` after editing Node versions.
- [ ] Decide whether the repository is public npm package, private package, app, config package, or docs-only repository.
- [ ] Remove npm publishing config and release workflow steps that do not apply to private or non-package repositories.

## Shared Config Refresh

- [ ] Run `NPM-Convert-SharedPackageConfigMigration.ps1 -Path . -SkipDependencyUpdate` after shared config packages are published.
- [ ] Run `npm run update-deps` after confirming the shared package versions are available on npm.
- [ ] Check `.gitleaks.toml` still extends `gitleaks-config-nick2bad4u` and keeps repository-specific allowlists.
- [ ] Check `.npmpackagejsonlintrc.json`, `.remarkrc.mjs`, `.secretlintrc.cjs`, `.yamllint`, `stylelint.config.mjs`, `tsdoc.json`, and `typedoc.json` still point at shared configs.
- [ ] Re-pin reusable workflow callers after updating `Nick2bad4u/workflow-templates`.

## GitHub Repository Settings

- [ ] Mark this repository as a template repository in GitHub settings.
- [ ] Enable Dependabot alerts and security updates.
- [ ] Enable secret scanning and push protection where available.
- [ ] Configure branch protection for `main`.
- [ ] Add required repository secrets only when the matching workflows are enabled: `NPM_TOKEN`, `CODECOV_TOKEN`, `SONAR_TOKEN`, or docs deployment tokens.
- [ ] Confirm Codecov upload steps are wanted before requiring `CODECOV_TOKEN`.

## Workflow And CI Review

- [ ] Confirm every workflow has the expected trigger, `run-name`, `concurrency`, permissions, and timeout policy.
- [ ] Confirm reusable workflow callers are pinned to an intentional full SHA.
- [ ] Run `npm run lint:actions`.
- [ ] Run `npm run release:verify`.
- [ ] Review CI behavior on Linux, Windows, and macOS before using the template broadly.

## Package Tooling Review

- [ ] Run `npm run lint:config` to validate config-only tooling.
- [ ] Run `npm run lint:jscpd` after adding real source files.
- [ ] Run `npm run lint:style` after adding CSS, SCSS, or docs styles.
- [ ] Run `npm run lint:package` before publishing.
- [ ] Run `npm run test:coverage` after replacing placeholder tests.
- [ ] Run `npm run changelog:preview` before cutting a release.

## Before First Release

- [ ] Confirm `private` is correct in `package.json`.
- [ ] Confirm `publishConfig.provenance` and registry settings are correct.
- [ ] Confirm package exports and declaration files match built output.
- [ ] Confirm `npm pack --dry-run` includes only the intended files.
- [ ] Create the first tag only after `npm run release:verify` passes locally.
