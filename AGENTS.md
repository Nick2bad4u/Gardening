# Repository Instructions

This repository is a reusable starter for Nick2bad4u npm/TypeScript projects.
Treat the root files as the GitHub template payload.

## Priorities

- Preserve the shared tooling defaults unless a target repository has a clear reason to opt out.
- Prefer repository scripts over ad hoc commands in GitHub Actions.
- Keep generated output, dependency folders, build artifacts, and local reports out of commits.
- Do not weaken security scanners or release gates to make CI pass.
- Keep workflow permissions least-privilege and keep third-party actions pinned by SHA where already pinned.

## Common Commands

```bash
npm run setup:template -- --name my-package --description "Package description"
npm run lint:all
npm run typecheck
npm run test
npm run release:verify
```

## Tooling Baseline

- Node is controlled by `.node-version`, `.nvmrc`, and `package.json#engines`.
- npm is controlled by `packageManager`.
- ESLint extends `eslint-config-nick2bad4u`.
- Prettier extends `prettier-config-nick2bad4u`.
- Package JSON, Secretlint, Remark, Yamllint, TSDoc, Gitleaks, TypeScript, Vitest, and TypeDoc configs are included.
- GitHub Actions use local scripts for validation and caller workflows for shared security/dependency automation.
