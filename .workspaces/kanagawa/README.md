# Kanagawa for Inkdrop

The three [Kanagawa](https://github.com/rebelot/kanagawa.nvim) flavours as Inkdrop themes,
each covering the app UI, the editor syntax highlighting and the Markdown preview. The
palette is inspired by the colors of the famous painting by Katsushika Hokusai.

Every flavour is published to ipm under its own name; this repository holds all three so the
shared work — the token mapping, the syntax rules and the UI chrome — is edited once.

| Package                                | Published as       | Appearance |
| -------------------------------------- | ------------------ | ---------- |
| [`packages/wave`](packages/wave)       | `kanagawa-wave`    | dark       |
| [`packages/dragon`](packages/dragon)   | `kanagawa-dragon`  | dark       |
| [`packages/lotus`](packages/lotus)     | `kanagawa-lotus`   | light      |

## Installing a flavour

```sh
ipm install kanagawa-wave
```

Then enable it in **Preferences → Themes**. See each package's README for details.

## Development

```sh
pnpm install                            # installs all three packages
pnpm --filter kanagawa-wave exec dev-server
```

`ipm link --dev` inside a package symlinks it into your Inkdrop data dir for local testing;
reload Inkdrop after edits, or use **Plugins → dev-tools → Start hot reloading themes**.

Each package keeps its stylesheets in `styles/` — `palette.css` (palette), `ui.css` (app
chrome), `syntax.css` (editor) and `preview.css` (Markdown preview). Unlike Catppuccin's
flavours, all four stylesheets differ between the three Kanagawa flavours.

`palette.json` is generated on publish — `ipm publish` runs `generate-palette` via each
package's `prepublishOnly` script. To regenerate every flavour at once:

```sh
pnpm generate-palette
```

## License

MIT
