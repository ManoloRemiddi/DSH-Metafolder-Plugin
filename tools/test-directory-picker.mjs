import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const modal = source.slice(source.indexOf('    function PathModal(props)'), source.indexOf('    function SessionRow(props)'))
function mount(picker) {
  const state = []; let cursor = 0
  const component = vm.runInNewContext(`(${modal.trim()})`, {
    ctx: { remote: { directoryPicker: picker } },
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], v => { state[i] = v }] },
    h: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(Boolean) }),
    Modal: 'Modal', tm: key => key,
  })
  let confirmed
  const render = () => { cursor = 0; return component({ onConfirm: path => { confirmed = path } }) }
  function find(node, predicate) { if (predicate(node)) return node; for (const child of node.children || []) { const match = find(child, predicate); if (match) return match } }
  return { render, find, state, confirmed: () => confirmed }
}
const level = path => ({ path, home: '/home/test', crumbs: [{path:'/',name:'/'},{path:'/home',name:'home'},{path,name:'test'}], entries: [{name:'Projects',path:'/home/test/Projects',hidden:false},{name:'.hidden',path:'/home/test/.hidden',hidden:true}], truncated:false })
const calls = []
const browse = mount({ list: async path => { calls.push(path); return {ok:true,value:level(path || '/home/test')} }, pick: () => { throw Error('native must not run') } })
const button = (app, text) => app.find(app.render(), n => n.type === 'button' && n.children.includes(text))
await button(browse,'browse').props.onClick()
assert.equal(browse.state[0],'/home/test')
assert.equal(button(browse,'.hidden'), undefined)
await button(browse,'Projects').props.onClick()
assert.equal(browse.state[0],'/home/test/Projects')
await button(browse,'parentFolder').props.onClick()
assert.equal(browse.state[0],'/home')
await button(browse,'home').props.onClick()
assert.equal(browse.state[0],'/home/test')
browse.find(browse.render(), n => n.type === 'input' && n.props.type === 'checkbox').props.onChange({target:{checked:true}})
assert.ok(button(browse,'.hidden'))
browse.render().props.onConfirm()
assert.equal(browse.confirmed(),'/home/test')
let picks = 0
for (const selected of ['/chosen', null]) {
 const native = mount({list: async () => ({ok:false,error:{code:'directory-picker/unavailable'}}),pick:async () => {picks++;return {ok:true,value:selected}}})
 await button(native,'browse').props.onClick()
 assert.equal(native.state[0],selected || '')
 assert.equal(native.state[1],false)
 assert.equal(native.state[2],null)
}
assert.equal(picks,2)
for (const reject of [false,true]) {
 const failed = mount({list:async () => {if(reject) throw Error('Disconnected'); return {ok:false,error:{code:'directory-picker/unreadable',message:'Permission denied'}}},pick:()=>{throw Error('must not fallback')}})
 await button(failed,'browse').props.onClick()
 assert.match(failed.state[2],reject ? /Disconnected/ : /Permission denied/)
 assert.equal(failed.state[1],false)
}
const manual = mount(undefined)
manual.find(manual.render(),n=>n.type==='input').props.onChange({target:{value:'/manual/path'}})
manual.render().props.onConfirm()
assert.equal(manual.confirmed(),'/manual/path')
console.log('PASS: browse navigation, hidden folders, selected path, native fallback, cancellation, read errors, disconnect, manual entry')
