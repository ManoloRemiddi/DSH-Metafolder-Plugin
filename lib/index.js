// dsh-metafolder-plugin host half.
//
// Provides an optional Host-backed persistence surface for the browser plugin.
// The service is deliberately additive: older DSH compositions continue to use
// the localStorage compatibility cache when this service is unavailable.

export const name = 'dsh-metafolder-plugin'
export const inject = ['storageDomain']

const state = { v: 2, groups: [], assignment: {}, sessionAssignment: {}, metaCollapsed: {}, expanded: {}, groupBy: 'workspace', orderBy: 'manual' }

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function apply(ctx) {
  const remote = ctx.get('remote')
  if (remote !== undefined && typeof remote.register === 'function') {
    remote.register('metafolder', {
      load: async () => clone(state),
      save: async (doc) => {
        if (doc === null || typeof doc !== 'object' || !Array.isArray(doc.groups)) throw new Error('invalid metafolder document')
        Object.assign(state, clone(doc))
        return clone(state)
      },
    })
  }
}
