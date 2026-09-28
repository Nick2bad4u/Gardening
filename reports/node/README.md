# Node diagnostic reports

Local Node.js diagnostic files belong in this directory. The files are ignored
by Git and are not published with the website. They can include process and
environment details, so keep them local.

The repository's VS Code Vitest settings send worker exception reports here.
For direct Node commands, use `--report-directory=./reports/node` from the
repository root, or explicitly load `node.config.json` with
`--experimental-config-file --permission`. See [development guidance](../../docs/development.md#node-diagnostic-reports).
