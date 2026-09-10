// dsh-metafolder-plugin browser half — GENERATED from ../client.js by tools/build-client.mjs.
// Do not edit: edit ../client.js and regenerate.
// Shadows the sidebar.workspaces seat with a visual meta-folder layer.

window.__ModuleLoader__.load({
	id: "dsh-metafolder-plugin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");

		// ---- begin client.js ----
		const plugin = (function () {
// workspace-groups (wsg): visual meta-folders over the DSH sidebar workspaces.
// Client-only dynamic Cordis plugin. Shadows the `sidebar.workspaces` seat and
// renders the browsing region itself, adding a persisted meta-folder layer over
// real workspace rows. Workspace paths, ordering durability and permissions
// are untouched: assignment to a meta group is display-only, while folder
// reordering uses the real Host workspace order (workspaces.insertBefore).
return {
  apply(ctx) {
    const slots = ctx.get('slots')
    const sessions = ctx.get('sessions')
    const workspaces = ctx.get('workspaces')
    if (slots === undefined || sessions === undefined || workspaces === undefined) {
      console.error('missing sessions/workspaces/slots service')
      return
    }
    const locale = ctx.get('locale')

    const HOLE = 'sidebar.workspaces.directoryFlow'
    const LS_META = 'dsh.wsmeta.v1'
    const LS_SHIPPED = 'dsh.workspace.view.v5'
    const LIMIT5 = 5
    const SEARCH_MS = 250

    // ---------- own labels (the `workspace` ns stays the shipped one) ----------
    const DICT = {
      en: {
        newGroup: 'New meta folder', create: 'Create', folderName: 'Meta folder name',
        addGroup: 'New meta folder', groupActions: 'Meta folder “{name}” actions',
        renameGroup: 'Rename meta folder', deleteGroup: 'Delete meta folder',
        moveUp: 'Move up', moveDown: 'Move down',
        ungroup: 'Remove from meta folder', ungroupedHint: 'No meta folder',
        deleteGroupDesc: 'The meta folder is removed. The workspace folders stay in place and return to the main list.',
        emptyGroup: 'empty',
        dndHint: 'Drag a workspace folder onto a meta folder to file it — drop it here to take it out.',
      },
      zh: {
        newGroup: '新建分组', create: '创建', folderName: '分组名称',
        addGroup: '新建分组文件夹', groupActions: '分组“{name}”的操作',
        renameGroup: '重命名分组', deleteGroup: '删除分组',
        moveUp: '上移', moveDown: '下移',
        ungroup: '移出分组', ungroupedHint: '未分组',
        deleteGroupDesc: '将移除该分组文件夹。工作区文件夹保持原位并回到主列表。',
        emptyGroup: '空',
        dndHint: '把工作区文件夹拖到分组文件夹即可归类；拖到此处可移出。',
      },
    }
    let lang = 'en'
    try {
      if (locale !== undefined && locale.getLocale !== undefined) {
        const id = String((locale.getLocale() || {}).id || 'en')
        if (id.toLowerCase().indexOf('zh') === 0) lang = 'zh'
      }
    } catch (e) { /* keep en */ }
    function tm(key, params) {
      const table = DICT[lang] !== undefined ? DICT[lang] : DICT.en
      let s = table[key] !== undefined ? table[key] : (DICT.en[key] !== undefined ? DICT.en[key] : key)
      if (params !== undefined) s = s.replace(/\{(\w+)\}/g, (m, p) => (params[p] !== undefined ? String(params[p]) : m))
      return s
    }

    // ---------- persistence (localStorage; same mechanism the shipped store uses) ----------
    function blankDoc() { return { v: 1, groups: [], assignment: {}, metaCollapsed: {}, expanded: {}, groupBy: 'workspace', orderBy: 'manual' } }
    function asObj(x) { return x !== null && typeof x === 'object' ? x : {} }
    function readDoc() {
      try {
        const raw = JSON.parse(localStorage.getItem(LS_META))
        if (raw !== null && typeof raw === 'object' && Array.isArray(raw.groups)) {
          return {
            v: 1,
            groups: raw.groups.filter((g) => g !== null && typeof g === 'object' && typeof g.id === 'string' && typeof g.name === 'string'),
            assignment: asObj(raw.assignment), metaCollapsed: asObj(raw.metaCollapsed), expanded: asObj(raw.expanded),
            groupBy: raw.groupBy === 'flat' ? 'flat' : 'workspace',
            orderBy: raw.orderBy === 'updated' ? 'updated' : 'manual',
          }
        }
      } catch (e) { /* fall through */ }
      return blankDoc()
    }
    function saveDoc(doc) { try { localStorage.setItem(LS_META, JSON.stringify(doc)) } catch (e) { /* quota */ } }
    // Read-only borrow of the shipped view store so existing manual session order carries over.
    let sv = {}
    try {
      sv = asObj(JSON.parse(localStorage.getItem(LS_SHIPPED)))
      if (sv.orderBy === undefined && asObj(sv.state).groupBy !== undefined) sv = asObj(sv.state)
    } catch (e) { /* defaults */ }
    // Read-only borrow of the shipped view store: the shipped manual session
    // order (and the flat account it keeps) is honoured by our "Manual" mode,
    // so the ordering users already arranged is not lost when we take the seat.
    const shippedAccounts = asObj(sv.sessionOrderByAccount)

    // ---------- styles ----------
    const css = [
      '.wsg-root{display:flex;flex-direction:column;flex:1;min-height:0;color:var(--dsw-alias-label-primary);}',
      '.wsg-head{display:flex;align-items:center;gap:4px;padding:6px 8px;flex:0 0 auto;}',
      '.wsg-head-rail{flex-direction:column;align-items:center;gap:2px;padding:8px 0;}',
      '.wsg-title{flex:1;font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.wsg-list{flex:1;min-height:0;overflow-y:auto;padding:0 6px 16px;}',
      '.wsg-list.wsg-list-drop{box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);border-radius:8px;}',
      '.wsg-hint{margin:0 8px 6px;font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary);}',
      '.wsg-row.wsg-dragging{opacity:.45;}',
      '.wsg-drop{outline:2px dashed var(--dsw-alias-brand-primary);outline-offset:-3px;border-radius:8px;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);}',
      '.wsg-row.wsg-over{background:var(--dsw-alias-bg-layer-2);}',
      '.wsg-row{display:flex;align-items:center;gap:6px;height:30px;padding:0 6px;border-radius:6px;cursor:pointer;user-select:none;position:relative;font-size:13px;}',
      '.wsg-row:hover{background:var(--dsw-alias-bg-layer-1);}',
      '.wsg-row.wsg-sel{background:var(--dsw-alias-bg-layer-2);}',
      '.wsg-row.wsg-active .wsg-glyph{color:var(--dsw-alias-brand-primary);}',
      '.wsg-glyph{width:16px;flex:0 0 16px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);}',
      '.wsg-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.wsg-time{flex:0 0 auto;font-size:11px;color:var(--dsw-alias-label-secondary);}',
      '.wsg-count{font-size:11px;color:var(--dsw-alias-label-secondary);}',
      '.wsg-dot{width:6px;height:6px;border-radius:50%;display:inline-block;}',
      '.wsg-dot-running{background:var(--dsw-alias-brand-primary);animation:wsg-pulse 1.6s ease-in-out infinite;}',
      '.wsg-dot-warn{background:var(--dsw-alias-state-warn-primary);}',
      '.wsg-dot-done{background:var(--dsw-alias-state-success-primary);}',
      '@keyframes wsg-pulse{50%{opacity:.3}}',
      '.wsg-acts{flex:0 0 auto;display:inline-flex;gap:2px;opacity:0;pointer-events:none;}',
      '.wsg-row:hover .wsg-acts,.wsg-row:focus-within .wsg-acts,.wsg-row.wsg-open .wsg-acts{opacity:1;pointer-events:auto;}',
      '.wsg-btn{border:0;background:transparent;color:var(--dsw-alias-label-secondary);min-width:22px;height:22px;padding:0 2px;border-radius:5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;}',
      '.wsg-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}',
      '.wsg-newgroup{color:var(--dsw-alias-brand-primary);}',
      '.wsg-newgroup:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);}',
      '.wsg-menu-wrap{position:relative;display:inline-flex;}',
      '.wsg-menu{position:absolute;right:0;top:24px;z-index:60;min-width:180px;max-height:320px;overflow-y:auto;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:4px;box-shadow:0 10px 28px rgba(0,0,0,.22);}',
      '.wsg-mitem{display:block;width:100%;text-align:left;border:0;background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;padding:6px 8px;border-radius:6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.wsg-mitem:hover{background:var(--dsw-alias-bg-layer-2);}',
      '.wsg-mdanger{color:var(--dsw-alias-state-error-primary);}',
      '.wsg-msep{height:1px;background:var(--dsw-alias-border-l1);margin:4px 6px;}',
      '.wsg-mhead{font-size:11px;color:var(--dsw-alias-label-secondary);padding:5px 8px 2px;}',
      '.wsg-more{margin:2px 0 6px;color:var(--dsw-alias-label-secondary);font-size:12px;padding:4px 8px;cursor:pointer;border:0;background:transparent;border-radius:6px;}',
      '.wsg-more:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);}',
      '.wsg-empty{padding:10px 8px;font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.wsg-searchbox{flex:1;display:flex;align-items:center;gap:4px;background:var(--dsw-alias-bg-layer-1);border-radius:6px;padding:0 6px;height:26px;min-width:0;}',
      '.wsg-searchbox input{flex:1;min-width:0;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;}',
      '.wsg-scrim{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:90;display:flex;align-items:center;justify-content:center;}',
      '.wsg-modal{width:min(380px,92vw);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:16px;box-shadow:0 16px 48px rgba(0,0,0,.3);}',
      '.wsg-mtitle{font-size:14px;font-weight:600;}',
      '.wsg-mdesc{margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary);}',
      '.wsg-input{width:100%;box-sizing:border-box;margin-top:12px;padding:6px 8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;outline:none;}',
      '.wsg-merr{margin-top:8px;font-size:12px;color:var(--dsw-alias-state-error-primary);}',
      '.wsg-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;}',
      '.wsg-obtn,.wsg-pbtn{border-radius:8px;padding:5px 12px;font-size:13px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);}',
      '.wsg-pbtn{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff;}',
      '.wsg-obtn:disabled,.wsg-pbtn:disabled{opacity:.5;cursor:default;}',
      '.wsg-pbtn.wsg-dangerbtn{background:var(--dsw-alias-state-error-primary);}',
      '.wsg-result{display:flex;flex-direction:column;gap:2px;min-height:44px;justify-content:center;padding:4px 8px;border:0;width:100%;text-align:left;background:transparent;border-radius:6px;cursor:pointer;color:inherit;}',
      '.wsg-result:hover{background:var(--dsw-alias-bg-layer-1);}',
      '.wsg-result.wsg-sel{background:var(--dsw-alias-bg-layer-2);}',
      '.wsg-rhead{display:flex;align-items:center;gap:6px;font-size:13px;min-width:0;}',
      '.wsg-rmeta{font-size:11px;color:var(--dsw-alias-label-secondary);display:flex;gap:8px;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}',
      '.wsg-err{margin:0 8px 6px;padding:6px 8px;border-radius:6px;font-size:12px;color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-1);}',
    ].join('\n')
    if (typeof styles !== 'undefined' && styles.insert !== undefined) {
      ctx.effect(() => styles.insert(css), 'wsg:css')
    } else if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="dsh-workspace-groups/styles.css"]') === null) {
      // Packaged client half: the dynamic runtime's `styles` service is absent,
      // so own the stylesheet tag instead (idempotent across mounts).
      const tag = document.createElement('style')
      tag.dataset.pluginCss = 'dsh-workspace-groups/styles.css'
      tag.textContent = css
      document.head.appendChild(tag)
    }

    // ---------- element/icon helpers ----------
    const h = React.createElement
    const useState = React.useState
    const useEffect = React.useEffect

    function svg(d, size) {
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, h('path', { d }))
    }
    const icoFolder = (s) => svg('M1.8 4.3c0-.7.5-1.3 1.2-1.3h2.4l1.6 1.8h6.1c.7 0 1.2.5 1.2 1.2v6.5c0 .7-.5 1.3-1.2 1.3H3c-.7 0-1.2-.6-1.2-1.3z', s)
    const icoGroup = (s) => svg('M1.8 6.5c0-.7.5-1.3 1.2-1.3h2.9l1.5 1.5h6.8c.7 0 1.2.5 1.2 1.2v4.6c0 .7-.5 1.3-1.2 1.3H3c-.7 0-1.2-.6-1.2-1.3zM1.8 3.8h4.4l1.1 1.4', s)
    // Distinct "new meta folder" glyph: folder outline with a plus inside.
    const icoFolderPlus = (s) => h('svg', { width: s, height: s, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
      h('path', { d: 'M1.8 4.3c0-.7.5-1.3 1.2-1.3h2.4l1.6 1.8h6.1c.7 0 1.2.5 1.2 1.2v6.5c0 .7-.5 1.3-1.2 1.3H3c-.7 0-1.2-.6-1.2-1.3z' }),
      h('path', { d: 'M8 7.5v3.4M6.3 9.2h3.4' }))
    const icoPlus = (s) => svg('M8 3.3v9.4M3.3 8h9.4', s)
    const icoSearch = (s) => svg('M10.8 10.8 13.9 13.9M11.9 7.2a4.7 4.7 0 1 1-9.4 0 4.7 4.7 0 0 1 9.4 0z', s)
    const icoClose = (s) => svg('M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8', s)
    // View options (group by / order by) trigger: two rails with knobs.
    const icoSliders = (s) => h('svg', { width: s, height: s, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'aria-hidden': 'true' },
      h('path', { d: 'M2.5 4.5h11M2.5 11.5h11' }),
      h('circle', { cx: 6, cy: 4.5, r: 1.7, fill: 'var(--dsw-alias-bg-overlay)' }),
      h('circle', { cx: 10.5, cy: 11.5, r: 1.7, fill: 'var(--dsw-alias-bg-overlay)' }))
    function icoChevron(open) {
      return h('svg', { width: 10, height: 10, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', style: { transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .12s' } }, h('path', { d: 'M6 3.5 10.5 8 6 12.5' }))
    }
    function icoDots(s) {
      return h('svg', { width: s, height: s, viewBox: '0 0 16 16', fill: 'currentColor', 'aria-hidden': 'true' },
        h('circle', { cx: 3.2, cy: 8, r: 1.25 }), h('circle', { cx: 8, cy: 8, r: 1.25 }), h('circle', { cx: 12.8, cy: 8, r: 1.25 }))
    }

    // ---------- pure helpers ----------
    function workspaceLabel(cwd) {
      if (cwd === undefined || cwd === '') return tm('ungroupedHint')
      const base = cwd.replace(/[/\\]+$/, '').split(/[/\\]/).pop()
      return base !== undefined && base !== '' ? base : cwd
    }
    function byRecency(a, b) {
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt
      return a.id < b.id ? -1 : 1
    }
    function relativeTime(updatedAt, now) {
      const MIN = 6e4; const HOUR = 36e5; const DAY = 864e5
      const diff = Math.max(0, now - updatedAt)
      if (diff < MIN) return { unit: 'now', n: 0 }
      if (diff < HOUR) return { unit: 'minutes', n: Math.floor(diff / MIN) }
      if (diff < DAY) return { unit: 'hours', n: Math.floor(diff / HOUR) }
      if (diff < 30 * DAY) return { unit: 'days', n: Math.floor(diff / DAY) }
      if (diff < 365 * DAY) return { unit: 'months', n: Math.floor(diff / (30 * DAY)) }
      return { unit: 'years', n: Math.floor(diff / (365 * DAY)) }
    }
    function timeLabel(updatedAt, now, t) {
      const r = relativeTime(updatedAt, now)
      return r.unit === 'now' ? t('time.now') : t('time.' + r.unit, { n: r.n })
    }
    function sanitize(q) {
      const s = String(q || '').replace(/\u0000/g, '')
      if (s.length <= 500) return s
      let cut = 500
      const code = s.charCodeAt(cut - 1)
      if (code >= 0xD800 && code <= 0xDBFF) cut -= 1
      return s.slice(0, cut)
    }
    function statusView(node, t) {
      if (node.pendingInteraction === 'approval') return { state: 'warn', label: t('status.waitingApproval') }
      if (node.pendingInteraction === 'plan-review') return { state: 'warn', label: t('status.planReview') }
      if (node.pendingInteraction === 'question') return { state: 'warn', label: t('status.waitingAnswer') }
      if (node.running === true) return { state: 'running', label: t('status.running') }
      if (node.subCount > 0) return { state: 'running', label: t(node.subCount === 1 ? 'status.subagentsRunning.one' : 'status.subagentsRunning.other', { n: node.subCount }) }
      if (node.completed === true) return { state: 'done', label: t('status.completed') }
      return undefined
    }

    // Start (reuse-or-create) the blank Session of one Workspace and open it.
    // Mirror of the shipped browser's connectWorkspace/openWorkspace, driven by
    // the pure Client services instead of the shipped uiWorkspace service.
    function openReal(sessionId) {
      sessions.open(sessionId)
      try {
        const layout = ctx.get('layout')
        if (layout !== undefined && typeof layout.selectPanel === 'function') layout.selectPanel(null)
      } catch (e) { /* the main panel stays where it is */ }
    }
    function startSessionIn(workspaceId) {
      try {
        const snap = workspaces.list.getSnapshot()
        const ws = snap.items.filter((it) => it.workspaceId === workspaceId)[0]
        const list = sessions.list.getSnapshot()
        const archived = new Set(Array.from(snap.archivedSessionIds || []))
        if (ws !== undefined) {
          for (const id of list.ids) {
            const s = list.byId[id]
            if (s !== undefined && s.blank === true && s.cwd === ws.path && ws.sessionIds.indexOf(id) !== -1 && !archived.has(id)) { openReal(id); return }
          }
        }
        Promise.resolve(sessions.create({ workspaceId })).then((id) => openReal(id), (r) => console.error('new session failed', r))
      } catch (e) { console.error('new session failed', e) }
    }

    // ---------- stable subcomponents (defined once per apply) ----------
    function Menu(props) {
      const [open, setOpen] = useState(false)
      const root = React.useRef(null)
      useEffect(() => {
        if (!open) return undefined
        const onDoc = (e) => { if (root.current !== null && !root.current.contains(e.target)) setOpen(false) }
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('mousedown', onDoc, true)
        document.addEventListener('keydown', onKey)
        return () => { document.removeEventListener('mousedown', onDoc, true); document.removeEventListener('keydown', onKey) }
      }, [open])
      useEffect(() => { props.onOpenChange(open) }, [open])
      return h('span', { className: 'wsg-menu-wrap', ref: root },
        h('button', { type: 'button', className: 'wsg-btn', 'aria-label': props.label, title: props.label, onClick: (e) => { e.stopPropagation(); setOpen((v) => !v) } }, props.icon !== undefined ? props.icon : icoDots(15)),
        open ? h('div', { className: 'wsg-menu', role: 'menu' }, props.items.map((it, i) => {
          if (it.sep === true) return h('div', { className: 'wsg-msep', key: 'sep' + i })
          if (it.header === true) return h('div', { className: 'wsg-mhead', key: 'h' + i }, it.label)
          return h('button', {
            type: 'button', role: 'menuitem', key: (it.id || 'i') + i,
            className: 'wsg-mitem' + (it.danger === true ? ' wsg-mdanger' : ''),
            onMouseDown: (e) => { e.stopPropagation(); e.preventDefault(); setOpen(false); it.run() },
          }, it.label)
        })) : null)
    }

    function Modal(props) {
      useEffect(() => {
        if (!props.open) return undefined
        const onKey = (e) => { if (e.key === 'Escape') props.onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [props.open])
      if (!props.open) return null
      let cancelLabel = 'Cancel'
      try { const v = props.t('cancel'); if (typeof v === 'string' && v !== 'cancel') cancelLabel = v } catch (e) { /* keep */ }
      return h('div', { className: 'wsg-scrim', onMouseDown: () => props.onClose() },
        h('div', { className: 'wsg-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': props.title, onMouseDown: (e) => e.stopPropagation() },
          h('div', { className: 'wsg-mtitle' }, props.title),
          props.desc !== undefined ? h('div', { className: 'wsg-mdesc' }, props.desc) : null,
          props.children,
          h('div', { className: 'wsg-foot' },
            h('button', { type: 'button', className: 'wsg-obtn', onClick: props.onClose }, cancelLabel),
            h('button', { type: 'button', className: 'wsg-pbtn' + (props.danger === true ? ' wsg-dangerbtn' : ''), disabled: props.disabled === true, onClick: props.onConfirm }, props.confirmLabel))))
    }

    function NameModal(props) {
      const [value, setValue] = useState(props.initial)
      const [busy, setBusy] = useState(false)
      const [err, setErr] = useState(null)
      function confirm() {
        const trimmed = value.trim()
        if (trimmed === '' || busy) return
        setBusy(true); setErr(null)
        Promise.resolve(props.onConfirm(trimmed)).then(() => { setBusy(false) }, (reason) => {
          setBusy(false)
          setErr(reason instanceof Error ? reason.message : String(reason))
        })
      }
      return h(Modal, {
        open: true, t: props.t, title: props.title, confirmLabel: props.confirmLabel !== undefined ? props.confirmLabel : tm('create'),
        disabled: busy || value.trim() === '', onClose: props.onClose, onConfirm: confirm,
      },
        h('input', {
          className: 'wsg-input', value, autoFocus: true, 'aria-label': props.fieldLabel !== undefined ? props.fieldLabel : tm('folderName'),
          onFocus: (e) => { try { e.target.select() } catch (e2) { /* noop */ } },
          disabled: busy,
          onChange: (e) => setValue(e.target.value),
          onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); confirm() } },
        }),
        err !== null ? h('div', { className: 'wsg-merr', role: 'alert' }, err) : null)
    }

    function SessionRow(props) {
      const node = props.node; const api = props.api; const t = api.t
      const selected = node.id === api.current
      const st = statusView(node, t)
      const [menuOpen, setMenuOpen] = useState(false)
      const title = node.blank === true ? t('session.new') : node.title
      return h('div', {
        className: 'wsg-row' + (selected ? ' wsg-sel' : '') + (menuOpen ? ' wsg-open' : ''),
        style: { paddingLeft: 0 }, role: 'treeitem', 'aria-selected': selected,
        onClick: () => api.openSession(node.id), title,
      },
        h('span', { className: 'wsg-glyph', 'aria-label': st !== undefined ? st.label : t('status.idle') },
          st !== undefined ? h('span', { className: 'wsg-dot wsg-dot-' + st.state }) : null),
        h('span', { className: 'wsg-name' }, title),
        node.blank !== true ? h('span', { className: 'wsg-time' }, timeLabel(node.updatedAt, api.now, t)) : null,
        node.blank !== true ? h('span', { className: 'wsg-acts' }, h(Menu, {
          label: t('actions.session.aria', { name: title }), onOpenChange: setMenuOpen,
          items: [
            { id: 'rename', label: t('rename'), run: () => api.renameSession(node.id, node.displayTitle) },
            { id: 'fork', label: t('menu.fork'), run: () => api.forkSession(node.id) },
            { id: 'archive', label: t('menu.archiveSession'), run: () => api.archiveSession(node.id) },
          ],
        })) : null)
    }

    function WorkspaceBlock(props) {
      const g = props.g; const depth = props.depth; const api = props.api; const t = api.t
      const doc = api.doc
      const expanded = doc.expanded[g.key] === true
      const active = expanded && g.key === api.currentGroupKey
      const [menuOpen, setMenuOpen] = useState(false)
      const all = api.showAll[g.key] === true
      const shown = expanded === true ? (all ? g.nodes : g.nodes.slice(0, LIMIT5)) : []
      const hiddenCount = expanded === true && !all ? Math.max(0, g.nodes.length - LIMIT5) : 0
      const gid = doc.assignment[g.workspaceId]
      const menuItems = [
        { id: 'rename', label: t('rename'), run: () => api.renameWorkspace(g.workspaceId, g.label) },
        { id: 'up', label: tm('moveUp'), run: () => api.moveWorkspace(g.workspaceId, -1) },
        { id: 'down', label: tm('moveDown'), run: () => api.moveWorkspace(g.workspaceId, +1) },
        { sep: true, id: 's1' },
      ]
      if (gid !== undefined) menuItems.push({ id: 'ungroup', label: tm('ungroup'), run: () => api.assignTo(g.workspaceId, undefined) })
      for (const mg of doc.groups) {
        if (mg.id === gid) continue
        menuItems.push({ id: 'g-' + mg.id, label: '→ ' + mg.name, run: () => api.assignTo(g.workspaceId, mg.id) })
      }
      if (g.workspaceId !== undefined) {
        if (doc.groups.length > 0) menuItems.push({ sep: true, id: 's2' })
        menuItems.push({ id: 'del', label: t('delete.workspace'), danger: true, run: () => api.deleteWorkspace(g.workspaceId, g.label) })
      }
      return h('div', { key: g.key },
        h('div', {
          className: 'wsg-row' + (active ? ' wsg-active' : '') + (menuOpen ? ' wsg-open' : '') + (api.dragWid === g.workspaceId ? ' wsg-dragging' : ''),
          style: { paddingLeft: depth }, role: 'treeitem', 'aria-expanded': expanded,
          draggable: g.workspaceId !== undefined,
          onDragStart: g.workspaceId !== undefined ? (e) => {
            try { e.dataTransfer.setData('text/plain', g.workspaceId); e.dataTransfer.effectAllowed = 'move' } catch (e2) { /* older engines */ }
            api.setDragWid(g.workspaceId)
          } : undefined,
          onDragEnd: () => api.setDragWid(undefined),
          onClick: () => api.toggleGroup(g.key), title: g.cwd !== undefined ? g.cwd : undefined,
        },
          h('span', { className: 'wsg-glyph' }, icoChevron(expanded)),
          h('span', { className: 'wsg-glyph' }, icoFolder(15)),
          h('span', { className: 'wsg-name' }, g.label),
          h('span', { className: 'wsg-acts' },
            g.workspaceId !== undefined ? h(Menu, { label: t('actions.workspace.aria', { name: g.label }), onOpenChange: setMenuOpen, items: menuItems }) : null,
            g.workspaceId !== undefined ? h('button', {
              type: 'button', className: 'wsg-btn', 'aria-label': t('actions.newSession.aria', { name: g.label }), title: t('actions.newSession.aria', { name: g.label }),
              onClick: (e) => { e.stopPropagation(); api.newSession(g.key, g.workspaceId) },
            }, icoPlus(15)) : null)),
        expanded === true ? h('div', { style: { paddingLeft: 0 } }, shown.map((n) => h(SessionRow, { key: n.id, node: n, api: api }))) : null,
        hiddenCount > 0 ? h('button', {
          type: 'button', className: 'wsg-more', style: { marginLeft: depth + 22 },
          onClick: () => api.setShowAll(g.key, true),
        }, t('sessions.expand', { n: hiddenCount })) : null,
        expanded === true && all && g.nodes.length > LIMIT5 ? h('button', {
          type: 'button', className: 'wsg-more', style: { marginLeft: depth + 22 },
          onClick: () => api.setShowAll(g.key, false),
        }, t('sessions.collapse')) : null)
    }

    function MetaBlock(props) {
      const mg = props.mg; const idx = props.idx; const api = props.api; const t = api.t
      const collapsed = api.doc.metaCollapsed[mg.id] === true
      const members = api.assigned[mg.id] || []
      const total = members.reduce((n, g) => n + g.nodes.length, 0)
      const contains = api.currentGroupKey !== undefined && members.some((g) => g.key === api.currentGroupKey)
      const [menuOpen, setMenuOpen] = useState(false)
      const [over, setOver] = useState(false)
      // Drop target: the whole meta folder accepts a dragged workspace folder.
      const dragActive = api.dragWid !== undefined
      function dropWid(e) {
        if (api.dragWid !== undefined) return api.dragWid
        try { return e.dataTransfer.getData('text/plain') } catch (e2) { return undefined }
      }
      return h('div', {
        key: mg.id, style: { marginTop: 6 },
        className: over ? 'wsg-drop' : undefined,
        onDragOver: (e) => {
          if (!dragActive) return
          e.preventDefault(); e.stopPropagation()
          try { e.dataTransfer.dropEffect = 'move' } catch (e2) { /* noop */ }
          if (!over) setOver(true)
        },
        onDragLeave: (e) => {
          if (e.relatedTarget !== null && e.relatedTarget !== undefined && e.currentTarget.contains(e.relatedTarget)) return
          setOver(false)
        },
        onDrop: (e) => {
          e.preventDefault(); e.stopPropagation()
          setOver(false)
          const wid = dropWid(e)
          if (wid !== undefined && wid !== null && wid !== '') api.assignTo(wid, mg.id)
          api.setDragWid(undefined)
        },
      },
        h('div', {
          className: 'wsg-row' + (!collapsed && contains ? ' wsg-active' : '') + (menuOpen ? ' wsg-open' : '') + (over ? ' wsg-over' : ''),
          style: { paddingLeft: 2 }, role: 'treeitem', 'aria-expanded': !collapsed,
          onClick: () => api.toggleMeta(mg.id), title: mg.name,
        },
          h('span', { className: 'wsg-glyph' }, icoChevron(!collapsed)),
          h('span', { className: 'wsg-glyph' }, icoGroup(16)),
          h('span', { className: 'wsg-name' }, mg.name),
          h('span', { className: 'wsg-count' }, total === 0 ? tm('emptyGroup') : t(total === 1 ? 'sessions.count.one' : 'sessions.count.other', { n: total })),
          h('span', { className: 'wsg-acts' }, h(Menu, {
            label: tm('groupActions', { name: mg.name }), onOpenChange: setMenuOpen,
            items: [
              { id: 'rename', label: tm('renameGroup'), run: () => api.renameGroup(mg.id, mg.name) },
              { id: 'up', label: tm('moveUp'), run: () => api.moveGroup(idx, -1) },
              { id: 'down', label: tm('moveDown'), run: () => api.moveGroup(idx, +1) },
              { sep: true, id: 'sep' },
              { id: 'del', label: tm('deleteGroup'), danger: true, run: () => api.deleteGroup(mg.id, mg.name) },
            ],
          }))),
        !collapsed ? h('div', null, members.map((g) => h(WorkspaceBlock, { key: g.key, g, depth: 12, api: api }))) : null)
    }

    function SearchRows(props) {
      const items = props.items; const api = props.api; const t = api.t
      return h('div', { role: 'tree', 'aria-label': t('search.results.aria') },
        items.map((r) => {
          const st = statusView(r, t)
          return h('button', {
            type: 'button', key: r.id, className: 'wsg-result' + (r.id === api.current ? ' wsg-sel' : ''),
            role: 'treeitem', onClick: () => api.openSession(r.id),
          },
            h('span', { className: 'wsg-rhead' },
              h('span', { className: 'wsg-glyph' }, st !== undefined ? h('span', { className: 'wsg-dot wsg-dot-' + st.state }) : null),
              h('span', { className: 'wsg-name' }, r.title)),
            h('span', { className: 'wsg-rmeta' },
              h('span', null, r.workspace),
              r.snippet !== undefined ? h('span', null, r.snippet) : null))
        }),
        items.length === 0 && props.pending ? h('div', { className: 'wsg-empty', role: 'status' }, t('search.pending')) : null,
        props.failed ? h('div', { className: 'wsg-empty', role: 'status' }, t('search.unavailable')) : null,
        items.length === 0 && !props.pending && !props.failed ? h('div', { className: 'wsg-empty' }, t('search.noMatches')) : null,
        props.more ? h('div', { className: 'wsg-empty', role: 'status' }, t('search.hasMore', { n: props.limit })) : null)
    }

    // ---------- the browser ----------
    function Browser(props) {
      const t = props.t
      const wide = props.wide === true
      const useDirectoryFlow = props.useDirectoryFlow
      const flowOccupied = useDirectoryFlow !== undefined ? useDirectoryFlow((v) => v) : true
      const list = props.useSessions((s) => s)
      const wsState = props.useWorkspaces((s) => s)
      const wss = wsState.items

      // Pending user interactions ride a framework standard hook: a snapshot
      // map keyed by Session id. Only the three presentable kinds are surfaced.
      const pendingMap = typeof props.useSessionPendingInteraction === 'function' ? props.useSessionPendingInteraction((s) => s) : undefined
      function pendingOf(sid) {
        if (pendingMap === undefined || pendingMap === null || typeof pendingMap.get !== 'function') return undefined
        const it = pendingMap.get(sid)
        const kind = it !== undefined && it !== null && typeof it === 'object' ? it.kind : undefined
        return kind === 'approval' || kind === 'plan-review' || kind === 'question' ? kind : undefined
      }

      const [doc, setDoc] = useState(readDoc)
      // View state, mirroring the shipped browser's two view options so the
      // meta-folder layer is additive: Workspace/Flat grouping and
      // Manual/Updated session order.
      const groupBy = doc.groupBy === 'flat' ? 'flat' : 'workspace'
      const orderBy = doc.orderBy === 'updated' ? 'updated' : 'manual'
      function setView(patch) { update((prev) => Object.assign({}, prev, patch)) }
      function update(mut) {
        setDoc((prev) => { const next = mut(prev); saveDoc(next); return next })
      }

      const [query, setQuery] = useState('')
      const [searchExpanded, setSearchExpanded] = useState(false)
      const [remote, setRemote] = useState({ q: '', status: 'idle', items: [], hasMore: false })
      const [flowOpen, setFlowOpen] = useState(false)
      const [flowBusy, setFlowBusy] = useState(false)
      const [flowErr, setFlowErr] = useState(null)
      const [nameModal, setNameModal] = useState(null)
      const [confirmModal, setConfirmModal] = useState(null)
      const [showAllMap, setShowAllMap] = useState({})
      // Workspace id currently being dragged, for meta-folder drop targets.
      const [dragWid, setDragWid] = useState(undefined)

      const nq = sanitize(query).trim()

      useEffect(() => {
        if (nq === '') { setRemote({ q: '', status: 'idle', items: [], hasMore: false }); return undefined }
        const controller = new AbortController()
        setRemote({ q: nq, status: 'loading', items: [], hasMore: false })
        const timer = window.setTimeout(() => {
          Promise.resolve(props.searchSessions(nq, controller.signal)).then((res) => {
            if (controller.signal.aborted) return
            setRemote({ q: nq, status: 'ready', items: res.items, hasMore: res.hasMore === true })
          }, () => { if (!controller.signal.aborted) setRemote({ q: nq, status: 'error', items: [], hasMore: false }) })
        }, SEARCH_MS)
        return () => { window.clearTimeout(timer); try { controller.abort() } catch (e) { /* noop */ } }
      }, [nq, props.searchSessions])

      // auto-expand the current session's group until the user decides otherwise
      const current = list.current
      let currentGroupKey = undefined
      if (current !== undefined) {
        currentGroupKey = ''
        for (const w of wss) { if (w.sessionIds.indexOf(current) !== -1) { currentGroupKey = w.workspaceId; break } }
      }
      useEffect(() => {
        if (currentGroupKey === undefined) return
        setDoc((prev) => {
          if (Object.prototype.hasOwnProperty.call(prev.expanded, currentGroupKey)) return prev
          const next = Object.assign({}, prev, { expanded: Object.assign({}, prev.expanded, { [currentGroupKey]: true }) })
          saveDoc(next)
          return next
        })
      }, [currentGroupKey])

      // ---- derivations ----
      const now = Date.now()
      const archived = new Set(Array.from(wsState.archivedSessionIds || []))
      function visible(s) { return s.origin !== 'subagent' && !archived.has(s.id) && (!s.blank || s.id === current) }
      function titleOf(s) { return s.blank ? 'New Session' : s.displayTitle }

      const subCache = {}
      const childrenBy = {}
      for (const id in list.byId) {
        const s = list.byId[id]
        if (s.origin === 'subagent' && s.parentId !== undefined) {
          if (childrenBy[s.parentId] === undefined) childrenBy[s.parentId] = []
          childrenBy[s.parentId].push(id)
        }
      }
      function subRunning(pid, guard) {
        if (subCache[pid] !== undefined) return subCache[pid]
        if (guard.has(pid)) return 0
        guard.add(pid)
        let n = 0
        const kids = childrenBy[pid] !== undefined ? childrenBy[pid] : []
        for (const cid of kids) {
          const c = list.byId[cid]
          if (c === undefined) continue
          if (c.running === true) n += 1
          n += subRunning(cid, guard)
        }
        subCache[pid] = n
        return n
      }

      function nodesOf(ids, accountKey) {
        const arr = []
        for (const id of ids) {
          const s = list.byId[id]
          if (s === undefined || !visible(s)) continue
          arr.push({
            id: s.id, title: titleOf(s), displayTitle: s.displayTitle !== undefined ? s.displayTitle : '',
            blank: s.blank === true, running: s.running === true, completed: s.completed === true,
            pendingInteraction: pendingOf(s.id), subCount: subRunning(s.id, new Set()), updatedAt: s.updatedAt,
          })
        }
        const stored = shippedAccounts[accountKey]
        if (orderBy === 'manual' && Array.isArray(stored)) {
          const byId2 = new Map(arr.map((n) => [n.id, n]))
          const used = new Set()
          const out = []
          for (const k of stored) { const n = byId2.get(k); if (n !== undefined && !used.has(k)) { out.push(n); used.add(k) } }
          return out.concat(arr.filter((n) => !used.has(n.id)).sort(byRecency))
        }
        arr.sort(byRecency)
        return arr
      }

      const wsGroups = []
      const accounted = new Set()
      for (const w of wss) {
        for (const sid of w.sessionIds) accounted.add(sid)
        wsGroups.push({
          key: w.workspaceId, workspaceId: w.workspaceId, cwd: w.path,
          label: w.title !== undefined && w.title !== '' ? w.title : workspaceLabel(w.path),
          nodes: nodesOf(w.sessionIds, w.workspaceId),
        })
      }
      const strayIds = (list.ids || []).filter((id) => list.byId[id] !== undefined && !accounted.has(id) && visible(list.byId[id]))
      const ungrouped = strayIds.length > 0 ? { key: '', workspaceId: undefined, cwd: undefined, label: t('group.ungrouped'), nodes: nodesOf(strayIds, '') } : null

      const groupIds = new Set(doc.groups.map((g) => g.id))
      const assigned = {}
      const plain = []
      for (const g of wsGroups) {
        const gid = doc.assignment[g.workspaceId]
        if (gid !== undefined && groupIds.has(gid)) { if (assigned[gid] === undefined) assigned[gid] = []; assigned[gid].push(g) } else plain.push(g)
      }

      // Flat view: one list of every visible session, using the shipped flat
      // account key so an already-arranged flat order carries over.
      const flatNodes = groupBy === 'flat' ? nodesOf((list.ids || []), '__flat_session_order__') : []

      // ---- api passed to stable child components ----
      const api = {
        t, now, current, currentGroupKey, doc, assigned, showAll: showAllMap,
        dragWid: dragWid, setDragWid: setDragWid,
        openSession: (sid) => { sessions.open(sid) },
        newSession: (key, wid) => { update((prev) => (prev.expanded[key] === true ? prev : Object.assign({}, prev, { expanded: Object.assign({}, prev.expanded, { [key]: true }) }))); startSessionIn(wid) },
        toggleGroup: (key) => update((prev) => Object.assign({}, prev, { expanded: Object.assign({}, prev.expanded, { [key]: prev.expanded[key] !== true }) })),
        toggleMeta: (gid2) => update((prev) => Object.assign({}, prev, { metaCollapsed: Object.assign({}, prev.metaCollapsed, { [gid2]: prev.metaCollapsed[gid2] !== true }) })),
        setShowAll: (key, v) => setShowAllMap((prev) => Object.assign({}, prev, { [key]: v })),
        renameSession: (sid, cur) => setNameModal({ kind: 'renameSession', id: sid, initial: cur, title: t('rename.session.title') }),
        forkSession: (sid) => { Promise.resolve(sessions.fork({ sessionId: sid, increaseTitle: true })).then((cid) => sessions.open(cid), () => {}) },
        archiveSession: (sid) => { Promise.resolve(workspaces.archiveSession(sid)).catch((r) => console.error('archive failed', r)) },
        renameWorkspace: (wid, cur) => setNameModal({ kind: 'renameWorkspace', id: wid, initial: cur, title: t('rename.workspace.title') }),
        deleteWorkspace: (wid, label) => setConfirmModal({
          title: t('delete.workspace'), desc: t('delete.desc', { name: label }), confirmLabel: t('delete.workspace'), danger: true,
          run: () => Promise.resolve(workspaces.delete(wid)),
        }),
        moveWorkspace: (wid, delta) => {
          const ids = wss.map((w) => w.workspaceId)
          const i = ids.indexOf(wid)
          if (i === -1) return
          const j = i + delta
          if (j < 0 || j >= ids.length) return
          const anchor = delta === -1 ? ids[i - 1] : (i + 2 < ids.length ? ids[i + 2] : undefined)
          Promise.resolve(workspaces.insertBefore(wid, anchor)).catch((r) => console.error('reorder failed', r))
        },
        assignTo: (wid, gid2) => update((prev) => {
          const assignment = Object.assign({}, prev.assignment)
          if (gid2 === undefined) delete assignment[wid]; else assignment[wid] = gid2
          return Object.assign({}, prev, { assignment })
        }),
        renameGroup: (gid2, cur) => setNameModal({ kind: 'renameGroup', id: gid2, initial: cur, title: tm('renameGroup') }),
        deleteGroup: (gid2, name) => setConfirmModal({ title: tm('deleteGroup'), desc: tm('deleteGroupDesc'), confirmLabel: tm('deleteGroup'), danger: true, run: () => { deleteGroup(gid2) } }),
        moveGroup: (idx, delta) => update((prev) => {
          const j = idx + delta
          if (j < 0 || j >= prev.groups.length) return prev
          const groups = prev.groups.slice()
          const tmp = groups[idx]; groups[idx] = groups[j]; groups[j] = tmp
          return Object.assign({}, prev, { groups })
        }),
      }
      function deleteGroup(gid2) {
        update((prev) => {
          const assignment = {}
          for (const k in prev.assignment) if (prev.assignment[k] !== gid2) assignment[k] = prev.assignment[k]
          return Object.assign({}, prev, { groups: prev.groups.filter((g) => g.id !== gid2), assignment })
        })
      }

      // ---- search merge (port of the shipped deriveSearchResults) ----
      const resultLimit = typeof props.searchResultLimit === 'number' ? props.searchResultLimit : 20
      function mergedResults() {
        const q = nq.toLowerCase()
        const wsBySession = new Map()
        for (const w of wss) for (const sid of w.sessionIds) if (!wsBySession.has(sid)) wsBySession.set(sid, w.title !== undefined && w.title !== '' ? w.title : workspaceLabel(w.path))
        const fresh = remote.q === nq && remote.status === 'ready'
        const remoteItems = fresh ? remote.items : []
        const snippetBy = new Map()
        for (const it of remoteItems) if (!snippetBy.has(it.sessionId)) snippetBy.set(it.sessionId, it.snippet)
        const labelOf = (s) => (wsBySession.has(s.id) ? wsBySession.get(s.id) : workspaceLabel(s.cwd))
        const local = []
        for (const id of list.ids) {
          const s = list.byId[id]
          if (s === undefined || s.blank === true || !visible(s)) continue
          if (titleOf(s).toLowerCase().indexOf(q) !== -1 || labelOf(s).toLowerCase().indexOf(q) !== -1) local.push(s)
        }
        local.sort(byRecency)
        const seen = new Set()
        const ordered = []
        const inc = (s) => { if (seen.has(s.id)) return; seen.add(s.id); ordered.push(s) }
        local.forEach(inc)
        for (const it of remoteItems) { const s = list.byId[it.sessionId]; if (s !== undefined && s.blank !== true && visible(s)) inc(s) }
        return ordered.slice(0, resultLimit).map((s) => ({
          id: s.id, title: titleOf(s), workspace: labelOf(s), running: s.running === true,
          completed: s.completed === true, pendingInteraction: pendingOf(s.id),
          subCount: subRunning(s.id, new Set()), snippet: snippetBy.get(s.id),
        }))
      }

      // ---- dialogs ----
      function dialog() {
        if (nameModal !== null) {
          if (nameModal.kind === 'renameWorkspace') {
            return h(NameModal, {
              key: 'rw' + nameModal.id, t, title: nameModal.title, initial: nameModal.initial, confirmLabel: t('rename'), fieldLabel: t('field.workspaceName'),
              onClose: () => setNameModal(null),
              onConfirm: (name) => Promise.resolve(workspaces.rename(nameModal.id, name)).then(() => setNameModal(null)),
            })
          }
          if (nameModal.kind === 'renameSession') {
            return h(NameModal, {
              key: 'rs' + nameModal.id, t, title: nameModal.title, initial: nameModal.initial, confirmLabel: t('rename'), fieldLabel: t('field.sessionName'),
              onClose: () => setNameModal(null),
              onConfirm: (name) => {
                const binding = sessions.binding(nameModal.id)
                if (binding === undefined || binding.session === undefined) return Promise.reject(new Error('unknown session'))
                return Promise.resolve(binding.session.rename(name)).then((result) => {
                  if (result !== undefined && result.ok === false) throw new Error((result.error && result.error.message) || 'rename failed')
                  setNameModal(null)
                })
              },
            })
          }
          if (nameModal.kind === 'renameGroup') {
            return h(NameModal, {
              key: 'rg' + nameModal.id, t, title: nameModal.title, initial: nameModal.initial, confirmLabel: t('rename'),
              onClose: () => setNameModal(null),
              onConfirm: (name) => {
                update((prev) => Object.assign({}, prev, { groups: prev.groups.map((g) => { if (g.id === nameModal.id) return { id: g.id, name }; return g }) }))
                setNameModal(null)
                return Promise.resolve()
              },
            })
          }
          return h(NameModal, {
            key: 'ng', t, title: tm('newGroup'), initial: '', confirmLabel: tm('create'),
            onClose: () => setNameModal(null),
            onConfirm: (name) => {
              const id = 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
              update((prev) => Object.assign({}, prev, { groups: prev.groups.concat([{ id, name }]) }))
              setNameModal(null)
              return Promise.resolve()
            },
          })
        }
        if (confirmModal !== null) {
          return h(Modal, {
            open: true, t, title: confirmModal.title, desc: confirmModal.desc, confirmLabel: confirmModal.confirmLabel, danger: confirmModal.danger === true,
            onClose: () => setConfirmModal(null),
            onConfirm: () => { Promise.resolve(confirmModal.run()).then(() => setConfirmModal(null), (r) => { setConfirmModal(null); setFlowErr(r instanceof Error ? r.message : String(r)) }) },
          })
        }
        return null
      }

      // ---- add-workspace flow ----
      const flowAvailable = flowOccupied === true && typeof props.renderSlot === 'function'
      function flowSlot() {
        if (!flowAvailable || !flowOpen) return null
        return props.renderSlot(HOLE, {
          open: true, busy: flowBusy,
          onPicked: (path) => {
            setFlowBusy(true); setFlowErr(null)
            Promise.resolve(workspaces.create({ path })).then((w) => {
              setFlowBusy(false); setFlowOpen(false)
              startSessionIn(w.workspaceId)
            }, (r) => { setFlowBusy(false); setFlowErr(r instanceof Error ? r.message : String(r)) })
          },
          onCancel: () => { setFlowOpen(false); setFlowBusy(false) },
          onError: (m) => { setFlowBusy(false); setFlowErr(String(m)) },
        })
      }
      function onAddWorkspace() {
        setFlowErr(null)
        if (flowAvailable) { setFlowOpen(true); return }
        // Fallback for a composition where the directory-flow hole is not ours
        // to fill (the shipped registration declares it as well): drive the Host
        // directory-picker Remote directly, exactly as the shipped
        // UiWorkspaceService.pickDirectory helper does.
        const picker = ctx.remote !== undefined ? ctx.remote.directoryPicker : undefined
        if (picker === undefined || typeof picker.pick !== 'function') { setFlowErr('No directory picker is available in this composition.'); return }
        Promise.resolve(picker.pick()).then((result) => {
          if (result === undefined || result.ok !== true) {
            const msg = result !== undefined && result.error !== undefined && result.error.message !== undefined ? String(result.error.message) : 'directory picker failed'
            if (msg.toLowerCase().indexOf('cancel') === -1) setFlowErr(msg)
            return undefined
          }
          if (result.value === null || result.value === undefined) return undefined
          return Promise.resolve(workspaces.create({ path: result.value })).then(
            (w) => { startSessionIn(w.workspaceId) },
            (r) => setFlowErr(r instanceof Error ? r.message : String(r)))
        }, (r) => setFlowErr(r instanceof Error ? r.message : String(r)))
      }

      // ---- rail (collapsed sidebar) ----
      if (!wide) {
        return h('div', { className: 'wsg-root' },
          h('div', { className: 'wsg-head wsg-head-rail' },
            h('button', { type: 'button', className: 'wsg-btn', 'aria-label': t('search.sessions.aria'), title: t('search.sessions.aria'), onClick: () => { if (props.expandSidebar !== undefined) props.expandSidebar() } }, icoSearch(16)),
            h('button', {
              type: 'button', className: 'wsg-btn wsg-newgroup', 'aria-label': tm('addGroup'), title: tm('addGroup'),
              onClick: () => { if (props.expandSidebar !== undefined) props.expandSidebar(); setNameModal({ kind: 'newGroup', initial: '', title: tm('newGroup') }) },
            }, icoFolderPlus(16)),
            h('button', { type: 'button', className: 'wsg-btn', 'aria-label': t('workspace.add'), title: t('workspace.add'), onClick: onAddWorkspace }, icoPlus(16))),
          dialog())
      }

      // ---- full view ----
      const sections = []
      doc.groups.forEach((mg, i) => sections.push(h(MetaBlock, { key: mg.id, mg, idx: i, api })))
      for (const g of plain) sections.push(h(WorkspaceBlock, { key: g.key, g, depth: 6, api }))
      if (ungrouped !== null) sections.push(h(WorkspaceBlock, { key: '', g: ungrouped, depth: 6, api }))
      const emptyAll = doc.groups.length === 0 && plain.length === 0 && ungrouped === null

      return h('div', { className: 'wsg-root' },
        h('div', { className: 'wsg-head' },
          nq !== '' || searchExpanded ? h('div', { className: 'wsg-searchbox' },
            h('span', { className: 'wsg-glyph' }, icoSearch(12)),
            h('input', {
              ref: undefined, type: 'text', placeholder: t('search.placeholder'), value: query, autoFocus: true,
              onChange: (e) => setQuery(sanitize(e.target.value)),
              onKeyDown: (e) => { if (e.key === 'Escape') { setQuery(''); setSearchExpanded(false) } },
            }),
            h('button', { type: 'button', className: 'wsg-btn', 'aria-label': t('search.clear'), onClick: () => { setQuery(''); setSearchExpanded(false) } }, icoClose(12)))
            : h('span', { className: 'wsg-title' }, t('section.workspaces')),
          nq === '' && !searchExpanded ? h('button', { type: 'button', className: 'wsg-btn', 'aria-label': t('search.sessions.aria'), title: t('search.sessions.aria'), onClick: () => setSearchExpanded(true) }, icoSearch(15)) : null,
          nq === '' && groupBy !== 'flat' ? h('button', { type: 'button', className: 'wsg-btn wsg-newgroup', 'aria-label': tm('addGroup'), title: tm('addGroup'), onClick: () => setNameModal({ kind: 'newGroup', initial: '', title: tm('newGroup') }) }, icoFolderPlus(16)) : null,
          nq === '' ? h(Menu, {
            label: t('viewOptions.label'), icon: icoSliders(16), onOpenChange: () => { },
            items: [
              { header: true, label: t('groupBy.label') },
              { id: 'g-workspace', label: (groupBy === 'workspace' ? '✓  ' : '') + t('groupBy.workspace'), run: () => setView({ groupBy: 'workspace' }) },
              { id: 'g-flat', label: (groupBy === 'flat' ? '✓  ' : '') + t('groupBy.flat'), run: () => setView({ groupBy: 'flat' }) },
              { sep: true, id: 'vo-sep' },
              { header: true, label: t('orderBy.label') },
              { id: 'o-manual', label: (orderBy === 'manual' ? '✓  ' : '') + t('orderBy.manual'), run: () => setView({ orderBy: 'manual' }) },
              { id: 'o-updated', label: (orderBy === 'updated' ? '✓  ' : '') + t('orderBy.updated'), run: () => setView({ orderBy: 'updated' }) },
            ],
          }) : null,
          nq === '' ? h('button', { type: 'button', className: 'wsg-btn', 'aria-label': t('workspace.add'), title: t('workspace.add'), onClick: onAddWorkspace }, icoPlus(16)) : null),
        flowErr !== null ? h('div', { className: 'wsg-err', role: 'alert' }, flowErr) : null,
        dragWid !== undefined ? h('div', { className: 'wsg-hint' }, tm('dndHint')) : null,
        h('div', {
          className: 'wsg-list' + (dragWid !== undefined ? ' wsg-list-drop' : ''),
          // Dropping on the list background (not on a meta folder) unfiles the
          // dragged workspace; a meta folder's own drop handler stops the event.
          onDragOver: (e) => {
            if (dragWid === undefined) return
            e.preventDefault()
            try { e.dataTransfer.dropEffect = 'move' } catch (e2) { /* noop */ }
          },
          onDrop: (e) => {
            e.preventDefault()
            let wid = dragWid
            if (wid === undefined) { try { wid = e.dataTransfer.getData('text/plain') } catch (e2) { wid = undefined } }
            if (wid !== undefined && wid !== null && wid !== '') api.assignTo(wid, undefined)
            setDragWid(undefined)
          },
        },
          nq !== '' ? h(SearchRows, { api, items: mergedResults(), pending: remote.q !== nq || remote.status === 'loading', failed: remote.q === nq && remote.status === 'error', more: remote.q === nq && remote.hasMore === true, limit: resultLimit })
            : groupBy === 'flat' ? (flatNodes.length === 0 ? h('div', { className: 'wsg-empty' }, t('empty.none'))
              : h('div', { role: 'tree', 'aria-label': t('section.sessions') }, flatNodes.map((n) => h(SessionRow, { key: n.id, node: n, api }))))
              : emptyAll ? h('div', { className: 'wsg-empty' }, t('empty.none'))
                : h('div', { role: 'tree', 'aria-label': t('section.sessions') }, sections)),
        flowSlot(),
        dialog())
    }

    // ---------- registration ----------
    const flowHooks = {}
    if (typeof slots.entries === 'function' && typeof slots.subscribe === 'function') {
      flowHooks.directoryFlow = {
        getSnapshot: () => { try { return slots.entries(HOLE).length > 0 } catch (e) { return true } },
        subscribe: (listener) => { try { return slots.subscribe(HOLE, listener) } catch (e) { return () => { } } },
      }
    }
    // Host facts observable (contract twin of the shipped browser's hostInfo).
    try {
      if (ctx.remote !== undefined && ctx.remote.$host !== undefined) {
        flowHooks.hostInfo = {
          getSnapshot: () => ctx.remote.$host,
          subscribe: (listener) => ctx.on('connection/reset', listener),
        }
      }
    } catch (e) { /* host facts unavailable: useHostInfo just stays absent */ }

    function injectedFace() {
      return {
        searchSessions: async (query, signal) => {
          const result = await sessions.search(query, signal)
          if (result.ok !== true) throw new Error((result.error && result.error.message) || 'search failed')
          return result.value
        },
        searchResultLimit: typeof sessions.searchResultLimit === 'number' ? sessions.searchResultLimit : 20,
        hooks: flowHooks,
      }
    }

    try {
      ctx.effect(() => slots.inject('sidebar.workspaces', () => {
        try {
          return slots.register({
            name: 'sidebar.workspaces',
            // A single slot accepts one registration per priority and the
            // lowest renders: -1 is what shadows the shipped browser at 0.
            priority: -1,
            children: { [HOLE]: { kind: 'single', scope: 'root' } },
            locale: 'workspace',
            inject: injectedFace,
          }, Browser)
        } catch (inner) {
          console.error('children hole declaration rejected; registering without the add-workspace flow:', inner)
          return slots.register({
            name: 'sidebar.workspaces',
            priority: -1,
            locale: 'workspace',
            inject: injectedFace,
          }, Browser)
        }
      }), 'wsg:seat')
    } catch (e) {
      console.error('seat registration failed:', e)
    }
  },
}

		})();
		// ---- end client.js ----

		exports.name = "dsh-metafolder-plugin";
		exports.inject = ['slots', 'sessions', 'workspaces', 'locale', 'remote', 'layout'];
		exports.apply = plugin.apply;
		return module.exports;
	},
});
