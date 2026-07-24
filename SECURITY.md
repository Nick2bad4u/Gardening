# Security Policy

Report security issues privately through GitHub Security Advisories when the repository is on GitHub.

## Baseline Checks

- `npm run lint:gitleaks`
- `npm run lint:secretlint`
- GitHub secret scanning custom patterns from `.github/secret_scanning.yml`
- CodeQL through `.github/workflows/codeql.yml`
- Dependency review through the shared workflow caller
