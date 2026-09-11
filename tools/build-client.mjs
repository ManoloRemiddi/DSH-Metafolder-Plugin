// Regenerate lib/client.js from client.js (the source of truth).
//
// client.js is the dynamic-Cordis form: its body is a function body that
// `return`s a Cordis plugin. The packaged browser half must instead call
// window.__ModuleLoader__.load({ id, factory }) and export name/inject/apply.
// Wrapping the returned plugin in an IIFE keeps both forms identical, so there
// is exactly one place to edit.
//
//   node tools/build-client.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(root, 'client.js')
const OUT = path.join(root, 'lib', 'client.js')
const ID = 'dsh-metafolder-plugin'

const body = fs.readFileSync(SRC, 'utf8')

const out = `// ${ID} browser half — GENERATED from ../client.js by tools/build-client.mjs.
// Do not edit: edit ../client.js and regenerate.
// Shadows the sidebar.workspaces seat with a visual meta-folder layer.

window.__ModuleLoader__.load({
	id: "${ID}",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");

		// ---- begin client.js ----
		const plugin = (function () {
${body}
		})();
		// ---- end client.js ----

		exports.name = "${ID}";
		exports.inject = ['slots', 'sessions', 'workspaces', 'locale', 'remote', 'remote.directoryPicker', 'remote.metafolder', 'layout'];
		exports.apply = plugin.apply;
		return module.exports;
	},
});
`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, out)
console.log(`wrote ${OUT} (${out.length} bytes)`)
