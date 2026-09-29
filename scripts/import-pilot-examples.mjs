// Dry-run by default. Administrative OAuth credentials are never written to disk.
import assert from 'node:assert/strict'
import { buildPilotExamples, planPilotImport } from '../src/data/pilot-examples.ts'
import { parseItems } from '../src/data/storage.ts'
import { CATEGORY_LABELS } from '../src/domain/catalog.ts'
import { DEVELOPER_EMAIL } from '../src/domain/roles.ts'

const args = process.argv.slice(2)
assert.ok(args.every(arg => arg === '--apply'), 'Solo se admite --apply.')
const apply = args.includes('--apply')
const project = 'ucsd-objetos-perdidos'
assert.equal(process.env.VITE_FIREBASE_PROJECT_ID ?? project, project, 'El importador solo admite el piloto institucional.')
const date = process.env.UCSD_IMPORT_DATE ?? new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)
const uid = process.env.UCSD_IMPORT_OWNER_UID ?? 'demo:decanato.demo@ucsd.edu.do'
const items = parseItems(buildPilotExamples(date, uid, apply ? DEVELOPER_EMAIL : 'Personal ficticio'))
console.log(JSON.stringify({ project, mode: apply ? 'APLICAR' : 'SIMULACIÓN LOCAL', date, total: items.length, categories: Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ category: label, count: items.filter(item => item.category === key).length })) }, null, 2))
if (!apply) {
  console.log('Sin conexión, escrituras ni publicación. La existencia de registros remotos se revisa únicamente al aplicar.')
} else {
  assert.ok(process.env.UCSD_IMPORT_ACCESS_TOKEN && process.env.UCSD_IMPORT_OWNER_UID, 'Faltan token OAuth administrativo y UID del Developer. No uses una contraseña ni un token Firebase ID.')
  assert.ok(!uid.startsWith('demo:'), 'Se requiere el UID real del Developer.')
  const identityResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.UCSD_IMPORT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: [uid] }), signal: AbortSignal.timeout(30_000),
  })
  assert.ok(identityResponse.ok, `No se pudo validar el UID: HTTP ${identityResponse.status}.`)
  const identity = (await identityResponse.json()).users?.[0]
  assert.equal(identity?.email, DEVELOPER_EMAIL, 'El UID debe corresponder al Developer institucional.')
  assert.equal(identity?.emailVerified, true, 'El correo Developer debe estar verificado.')
  assert.ok(!identity?.disabled, 'La cuenta Developer debe estar habilitada.')
  const root = `projects/${project}/databases/(default)/documents`
  const url = `https://firestore.googleapis.com/v1/${root}`
  async function request(path, body) {
    const response = await fetch(`${url}${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${process.env.UCSD_IMPORT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30_000) })
    if (response.status === 404 && !body) return null
    if (!response.ok) throw new Error(`Firestore HTTP ${response.status}; operación detenida.`)
    return response.json()
  }
  const owner = await request(`/access/${encodeURIComponent(DEVELOPER_EMAIL)}`)
  assert.equal(owner?.fields?.role?.stringValue, 'developer', 'El permiso Developer debe existir previamente.')
  assert.equal(owner?.fields?.active?.booleanValue, true, 'Developer debe estar activo.')
  // Only inspect the 50 known IDs; never copy other environments or scan private records.
  const privateIds = new Set(), publicIds = new Set()
  for (const item of items) {
    for (const [collection, ids] of [['privateItems', privateIds], ['publicItems', publicIds]]) {
      const existing = await request(`/${collection}/${item.id}`)
      if (existing) {
        assert.equal(existing.fields?.code?.stringValue, item.code, `Conflicto de código en ${collection}/${item.id}. No se modificó ningún registro.`)
        ids.add(item.id)
      }
    }
  }
  const plan = planPilotImport(items, privateIds, publicIds)
  function value(data) {
    if (typeof data === 'string') return { stringValue: data }
    if (typeof data === 'boolean') return { booleanValue: data }
    if (Array.isArray(data)) return { arrayValue: { values: data.map(value) } }
    return { mapValue: { fields: Object.fromEntries(Object.entries(data).map(([key, entry]) => [key, value(entry)])) } }
  }
  const writes = []
  for (let index = 0; index < plan.pending.length; index++) {
    const privateItem = plan.pending[index], publicItem = plan.publicItems[index]
    for (const [collection, item] of [['privateItems', privateItem], ['publicItems', publicItem]]) {
      writes.push({ update: { name: `${root}/${collection}/${item.id}`, fields: value(item).mapValue.fields }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] })
    }
  }
  // One atomic commit, with create-only preconditions: concurrent changes abort all writes.
  if (writes.length) {
    const committed = await request(':commit', { writes })
    assert.equal(committed?.writeResults?.length, writes.length, 'Respuesta incompleta: revisar los IDs antes de repetir.')
  }
  console.log(`Creados: ${plan.pending.length}. Conservados sin cambios: ${plan.skipped}.`)
}
