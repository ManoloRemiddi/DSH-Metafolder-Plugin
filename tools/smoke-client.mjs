// Load the generated browser half through a stubbed module loader and assert
// that its exports match package.json. This catches the two failure modes that
// matter before a restart: a syntax error in the generated file, and an id/name
// drift between the build script and the manifest.
//
//   node tools/smoke-client.mjs

import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const code = fs.readFileSync(path.join(root, 'lib', 'client.js'), 'utf8')

let captured = null
const sandbox = {
  window: { __ModuleLoader__: { load: (registration) => { captured = registration } } },
  console, Symbol, Object, JSON, Math, Date, Array, Map, Set, Promise, Error, RegExp, String, Number, Boolean,
}
vm.createContext(sandbox)
vm.runInContext(code, sandbox)
if (captured === null) throw new Error('lib/client.js never called window.__ModuleLoader__.load()')

const React = { createElement: () => null, useState: () => [undefined, () => {}], useEffect: () => {}, useRef: () => ({ current: null }) }
const exported = captured.factory((specifier) => {
  if (specifier === 'react') return React
  throw new Error('unexpected require: ' + specifier)
})

console.log('id:', captured.id, '| name:', exported.name, '| inject:', JSON.stringify(exported.inject), '| apply:', typeof exported.apply)
const problems = []
if (captured.id !== pkg.name) problems.push(`loader id "${captured.id}" != package name "${pkg.name}"`)
if (exported.name !== pkg.name) problems.push(`exports.name "${exported.name}" != package name "${pkg.name}"`)
if (typeof exported.apply !== 'function') problems.push('exports.apply is not a function')
if (!Array.isArray(exported.inject)) problems.push('exports.inject is not an array')
if (problems.length > 0) throw new Error('client half does not match package.json:\n  - ' + problems.join('\n  - '))
console.log('SMOKE_OK')
