# DSH Metafolder Plugin

Visual **meta-folders** for the DeepSeek Harness sidebar.

Nest real workspace folders under named, collapsible groups — for example every
Resonant OS project under one "Resonant OS" meta folder. It changes **only how
the folders are visualised**:

- workspace paths, permissions, sessions and session order are untouched;
- grouping is display-only and persists in the browser (`localStorage` document
  `dsh.wsmeta.v1`), never in the Host workspace registry;
- ungrouping returns a folder to the main list unchanged;
- the AI's permissions stay attached to the real folder, because the real folder
  is what the plugin renders.

## Features

- **Meta-folders** over the real workspace rows, with per-folder session counts.
- **Drag and drop**: drag a workspace row onto a meta folder to file it; drop it
  on the list background to take it out again.
- **Row menu**: `→ <meta folder>` to file, `Remove from meta folder` to unfile,
  plus rename / move up / move down, and delete workspace.
- **View options** (the shipped menu, preserved): group by **Workspace** /
  **Flat**, order by **Manual** / **Updated**. Manual order honours the order
  already stored by the shipped browser (`dsh.workspace.view.v5`).
- **Add workspace** still works, from both the wide sidebar and the collapsed
  rail, via the composed directory-flow picker with a Host-picker fallback.
- Session search (local + Host index), rename / fork / archive per session,
  per-workspace new session.

Everything the shipped browser offered is still here — the meta-folder layer is
an addition to the toolbar, not a replacement.

## Install

One package, two halves:

| file | role |
| --- | --- |
| `lib/index.js` | host half — registers nothing; mounting it is what makes the client-module scan read `dsh.client` |
| `lib/client.js` | browser half — shadows the `sidebar.workspaces` seat and renders the meta-folder browser |
| `client.js` | **source of truth** (dynamic-Cordis form, also usable with the `cordis_define` runtime tool) |

`lib/client.js` is generated from `client.js`; regenerate after editing it:

```sh
node tools/build-client.mjs
```

### As a web-profile package

```sh
ln -s "/path/to/DSH-Metafolder-Plugin" \
      ~/.dsh/profiles/web/node_modules/dsh-metafolder-plugin
```

then add to `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: metafolder-plugin
      name: 'dsh-metafolder-plugin'
```

Restart `dsh web`. The module graph is composed at boot, so a page reload alone
will not pick up a code change (and `client-hmr` is commonly disabled to avoid
per-tab SSE connection exhaustion).

> **Registration note:** a `single` slot takes one registration per priority and
> the lowest renders, so the seat is registered with `priority: -1` to shadow
> the shipped browser at `0`. Registering at the default `0` is rejected with
> *"already has a registration at priority 0 … register at a different priority
> to shadow it"*.

### Revert

Remove the `insert` row and the symlink, then restart `dsh web`:

```sh
rm ~/.dsh/profiles/web/node_modules/dsh-metafolder-plugin
```

Your groups stay in `localStorage` under `dsh.wsmeta.v1` until you clear them,
so uninstalling never touches a workspace.

## Verified against

- `@deepseek-ai/dsh-client-ui-workspace` — `sidebar.workspaces` registration,
  the `sidebar.workspaces.directoryFlow` hole, `WorkspaceBrowserProps`.
- `@deepseek-ai/dsh-client-ui-sidebar` — owner share `{ wide, expandSidebar }`.
- `@deepseek-ai/dsh-api-workspace-controller` / `dsh-api-session-controller` —
  workspace and session service methods and snapshot shapes.

MIT © 2026 Manolo Remiddi
