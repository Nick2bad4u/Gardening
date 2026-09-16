# Repository automation instructions

## Deployment and validation boundaries

- `workflows/pages.yml` builds the static site and Storybook, then publishes
  `.pages-site/`. Pull requests validate only; deployment requires a successful
  non-PR run on `main`. Preserve that gate, the `github-pages` environment, and
  deploy-job-only Pages write permissions.
- Keep the existing type/lint, generated-booklet/report, Storybook coverage,
  and static `/storybook/` smoke checks before artifact upload. Preserve the
  selected-photo cache without publishing `.cache`, private originals, source
  snapshots, credentials, or test coverage as site content.
- Pages does not deploy Apps Script or write private workbook observations.
  The daily local task reviews live sources; GitHub builds its reviewed commit.
  Do not add a second care scheduler or Google account credentials to CI.
- `workflows/logger-coverage.yml` tests and typechecks Apps Script and sends its
  explicit LCOV file to Codecov using OIDC. `workflows/sonarqube-cloud.yml`
  analyzes that source; preserve its fork-PR secret boundary. Neither workflow
  updates the production logger.

## Configuration changes

- Match Node/npm setup to `package.json`, node-version files, and the lockfile.
  Preserve explicit npm 12 setup before installing project dependencies and
  the reviewed lifecycle-script policy. Do not fix peer failures with force.
- Keep third-party actions and reusable workflows pinned to full commit SHAs.
  Verify supported inputs at the pinned workflow when updating a caller;
  labels/version comments alone are not its contract. The locally expanded
  Gitleaks job documents a Node-runtime incompatibility with its shared workflow.
- Retain least-privilege job permissions, fork-safe secret use, bounded runtime,
  and existing dependency-review/secret checks. An unrelated deployment failure
  is not a reason to disable those checks or broaden auto-merge policy.
- Validate YAML changes with `npm run lint:yaml` and
  `npm run lint:actions`; `.github/actionlint.yaml` is the local actionlint
  configuration. Inspect relevant checks for the exact pushed SHA before
  claiming a CI or deployment repair succeeded.
- For an authorized commit, follow `agent-commit-message-instructions.md`.
  This directory's guidance does not itself authorize commits, pushes, or a
  workflow dispatch.
