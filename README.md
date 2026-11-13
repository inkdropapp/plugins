# Inkdrop plugins

The official plugins and themes for [Inkdrop](https://www.inkdrop.app/), in one pnpm workspace.

- `packages/<name>`: plugins and themes, published to the Inkdrop plugin registry. The folder is
  the registry name, so `packages/vim` is the [`vim`](https://my.inkdrop.app/plugins/vim) plugin.
- `libs/<name>`: npm libraries the plugins build on: `@inkdropapp/math`, `@inkdropapp/mermaid`
  and `@inkdropapp/theme-dev-helpers`.

Seven of these plugins ship with the desktop app: `default-dark`, `default-light`,
`export-as-html`, `export-as-markdown`, `export-print`, `import-html` and `import-markdown`.

To install a plugin, use Inkdrop's Preferences or `ipm install <name>`. To write your own, see the
[plugin development guide](https://developers.inkdrop.app/).

## Development

Requires Node 24 and pnpm (the version is pinned in `package.json`).

```sh
pre-commit install  # gitleaks scans staged changes before each commit
pnpm install        # also builds libs/*
pnpm build          # every project that has a build script
pnpm typecheck
pnpm test
pnpm lint
pnpm format
```

Work on one project with `pnpm --filter <name> run <script>`, e.g. `pnpm --filter vim run dev`.

To try a plugin in the app, link it into the dev packages folder with `ipm link --dev`
from its folder and start Inkdrop in development mode.

## License

Each project has its own license file; most are MIT.
