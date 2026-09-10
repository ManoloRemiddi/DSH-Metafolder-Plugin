# Changelog

All notable changes to this plugin. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-09-10

First public release.

### Added

- Visual meta-folders over the DeepSeek Harness sidebar workspaces: nest real
  workspace folders under named, collapsible groups with session counts.
  Display-only — paths, permissions, sessions and workspace order are untouched.
- **Pointer-driven drag and drop**: drag a workspace folder onto a meta folder to
  file it, drop it on the list background to take it out, `Escape` cancels.
- **Per-meta-folder colour**, chosen when creating a folder and changeable from
  *Rename meta folder*: an eight-swatch palette, a theme-colour default, and a
  custom colour input. The colour applies to the folder glyph and its label, and
  to the drop-target outline.
- Row menu per workspace: file into a meta folder, remove from it, rename, move
  up/down, delete workspace.
- Session search merging the local list with the Host message index, with
  rename / fork / archive per session row.
- View options, matching the shipped browser: group by **Workspace** / **Flat**,
  order by **Manual** / **Updated** (manual order is inherited read-only from the
  shipped `dsh.workspace.view.v5` store).
- "Add workspace…" kept working in both the wide sidebar and the collapsed rail,
  through the composed directory-flow picker with a Host directory-picker
  fallback when that hole is not ours to fill.

### Fixed

- The seat now registers with `priority: -1`. A `single` slot keeps one
  registration per priority and renders the lowest, so registering at the
  default `0` was rejected and the plugin silently never appeared.
- Drag and drop was reimplemented without HTML5 drag events: in this host
  `dragstart` fired and the drag was then cancelled before any `dragover`, so no
  drop target could ever activate. The gesture now rides plain mouse events with
  `elementFromPoint` hit-testing.

[1.0.0]: https://github.com/ManoloRemiddi/DSH-Metafolder-Plugin/releases/tag/v1.0.0
