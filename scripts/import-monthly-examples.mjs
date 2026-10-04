// Read-only remote preview unless --apply is explicit. Creates new IDs only.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { buildMonthlyExamples } from '../src/data/monthly-examples.ts'
import { projectPublicItems, CATEGORY_LABELS } from '../src/domain/catalog.ts'
import { buildPrivateIndex, buildPublicIndex } from '../src/domain/search-index.ts'
import { parseItems } from '../src/data/storage.ts'
import { DEVELOPER_EMAIL } from '../src/domain/roles.ts'

const args = process.argv.slice(2)
assert.ok(args.every(arg => arg === '--apply' || /^--project=ucsd-objetos-perdidos(?:-pruebas)?$/.test(arg) || /^--date=\d{4}-\d{2}-\d{2}$/.test(arg)))
const project = args.find(arg => arg.startsWith('--project='))?.slice(10)
const date = args.find(arg => arg.startsWith('--date='))?.slice(7)
assert.ok(project && date, 'Indica proyecto y fecha explícitos.')
const apply = args.includes('--apply'), token = process.env.UCSD_IMPORT_ACCESS_TOKEN
assert.ok(token, 'Falta OAuth administrativo local.')
async function request(url, body) {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) })
  assert.ok(response.ok, `HTTP ${response.status}`)
  return response.json()
}
const billing = await request(`https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`)
assert.equal(billing.billingEnabled, false)
const identity = await request(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`, { email: [DEVELOPER_EMAIL] })
const owner = identity.users?.[0]
assert.equal(owner?.email, DEVELOPER_EMAIL)
assert.equal(owner.emailVerified, true)
assert.ok(!owner.disabled)
const root = `projects/${project}/databases/(default)/documents`, base = `https://firestore.googleapis.com/v1/${root}`
const access = await request(`${base}/access/${encodeURIComponent(DEVELOPER_EMAIL)}`)
assert.equal(access.fields.role.stringValue, 'developer')
assert.equal(access.fields.active.booleanValue, true)
const items = parseItems(buildMonthlyExamples(date, owner.localId, DEVELOPER_EMAIL))
const names = items.flatMap(item => ['privateItems', 'publicItems'].map(collection => `${root}/${collection}/${item.id}`))
const existing = await request(`${base}:batchGet`, { documents: names })
const documents = new Map(existing.filter(entry => entry.found).map(entry => [entry.found.name, entry.found]))
const pending = items.filter(item => {
  const internal = documents.get(`${root}/privateItems/${item.id}`), published = documents.get(`${root}/publicItems/${item.id}`)
  assert.ok(internal || !published, 'Ficha pública sin registro privado: revisar manualmente.')
  if (internal) assert.equal(internal.fields.code.stringValue, item.code, 'Identificador en conflicto.')
  return !internal
})
const report = { project, date, mode: apply ? 'APLICAR' : 'SIMULACIÓN', create: pending.length, preserved: items.length - pending.length, categories: Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ category: label, count: pending.filter(item => item.category === key).length })) }
console.log(JSON.stringify(report, null, 2))
function encode(value) {
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child)])) } }
}
if (apply && pending.length) {
  await mkdir('evidence', { recursive: true })
  await writeFile(`evidence/monthly-import-${project}-${Date.now()}.json`, JSON.stringify({ report, pending, inspected: [...documents.keys()] }, null, 2))
  const writes = pending.flatMap(item => {
    const published = projectPublicItems([item])[0]
    assert.ok(published)
    return [['privateItems', { ...item, ...buildPrivateIndex(item) }], ['publicItems', { ...published, ...buildPublicIndex(published) }]].map(([collection, record]) => ({ update: { name: `${root}/${collection}/${item.id}`, fields: encode(record).mapValue.fields }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] }))
  })
  const result = await request(`${base}:commit`, { writes })
  assert.equal(result.writeResults?.length, writes.length)
  console.log(`Creados ${pending.length} objetos sin modificar registros existentes.`)
}
