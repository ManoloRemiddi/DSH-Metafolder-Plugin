// dsh-metafolder-plugin host half.
//
// This package's whole surface is the browser half (the "./client" export,
// lib/client.js), which shadows the sidebar's `sidebar.workspaces` seat and
// renders a persisted meta-folder layer over the real workspace rows.
//
// This host half registers nothing. It exists so the bundle patch row
// (cordis.patch.yml) can mount the package in the web profile: the client
// module scan reads the `dsh.client` declaration from packages mounted in the
// host Loader, and that is what makes lib/client.js reach the browser.
//
// Keep this file: removing it breaks the mount.

export const name = 'dsh-metafolder-plugin'

/** No services: the plugin drives everything from the browser half. */
export const inject = []

/** Intentionally empty — see the file header. */
export function apply() {}
