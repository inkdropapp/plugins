# Inkdrop plugins monorepo

One public pnpm workspace holding the official Inkdrop plugins and themes.

## Layout

- `packages/<name>`: a plugin or theme. The folder is its name in the Inkdrop plugin registry.
- `libs/<name>`: npm libraries (`@inkdropapp/math`, `@inkdropapp/mermaid`,
  `@inkdropapp/theme-dev-helpers`). The folder is the npm name without `@inkdropapp/`.
- `.github/workflows/`: CI and the npm publish workflow for `libs/`.

The desktop app (`inkdropapp/inkdrop`, private) bundles seven of these plugins through a git
submodule at `apps/desktop/plugins`.

## Commands

Run Node tooling through mise: `mise exec -- pnpm ...`.

- Install: `pnpm install` at the root only. It also builds `libs/*`, which plugins import as built output.
- One project: `pnpm --filter <name> run <script>`.
- Everything: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format` at the root.
- Changed projects and their dependents: `pnpm --filter "...[origin/main]" run <script>`.

Not every project has every script. Themes have only `prepublishOnly`, which generates `palette.json`.

## Dependencies

- `libs/*` are linked with `workspace:^`; shared versions live in `catalog:` in `pnpm-workspace.yaml`.
- **In `packages/*`, only `devDependencies` may use `catalog:` or `workspace:`.** `ipm publish`
  uploads `package.json` as it is, and installing a plugin installs its `dependencies` from npm,
  so runtime dependencies must be real version ranges. `libs/*` are packed by pnpm, which resolves
  both protocols.
- A project can import only what its own `package.json` declares.

## Formatting and linting

- `oxfmt` and `oxlint`, configured once in the root `.oxfmtrc.json` and `.oxlintrc.json`. A project
  has its own `.oxlintrc.json` only when it differs (React plugin, the `inkdrop` global), and that
  file extends the root one.
- Exceptions: `embed-youtube` and `export-as-markdown` still use ESLint and Prettier.
- Format only the files you touched: `pnpm exec oxfmt <files>`.
- Plugins look up app components with `inkdrop.components.getComponentClass(...)` during render, so
  other plugins can replace them. oxlint's `react(static-components)` flags that; suppress it in
  place with that reason.

## Publishing

Never bump a `version` unless asked.

- **Plugins and themes** go to the Inkdrop registry by hand, from the repo root:
  `ipm publish packages/<name>` (it runs the plugin's `prepublishOnly` first), then tag the
  commit `<name>@<version>` and push the tag.
- **Libraries** are published by `.github/workflows/publish.yml` when a tag
  `@inkdropapp/<name>@<version>` is pushed. It checks the tag against `package.json`, runs
  `prepublishOnly`, packs with pnpm and publishes through npm trusted publishing. Never run
  `npm publish` locally.
- Actions are referenced by version tag and locked in `.github/workflows/actions.lock`. After
  changing an action reference, run `gh actions-lock`.

## Git

- Tags are `<package-name>@<version>`. Commit messages are `<type>(<scope>): <Subject>`, with the
  project as the scope.
- A gitleaks pre-commit hook (`.pre-commit-config.yaml`) scans staged changes; run `pre-commit install` once
  after cloning. CI scans each push's new commits too. The imported history has no findings.
- Bare `#123` in imported commit messages was rewritten to `inkdropapp/<old-repo>#123`.
