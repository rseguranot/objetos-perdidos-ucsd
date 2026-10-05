// Preview and backup first. Change demo custody labels and private search index only.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { cleanDemoCustody } from '../src/domain/demo-copy.ts'
import { buildPrivateIndex } from '../src/domain/search-index.ts'
import { DEVELOPER_EMAIL } from '../src/domain/roles.ts'

const args = process.argv.slice(2)
assert.ok(args.every(arg => arg === '--apply' || /^--project=ucsd-objetos-perdidos(?:-pruebas)?$/.test(arg)))
const project = args.find(arg => arg.startsWith('--project='))?.slice(10)
assert.ok(project)
const apply = args.includes('--apply'), token = process.env.UCSD_IMPORT_ACCESS_TOKEN
assert.ok(token)
async function request(url, body) {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) })
  assert.ok(response.ok, `HTTP ${response.status}`)
  return response.json()
}
function decode(value) {
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return new Date(value.timestampValue).toISOString()
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode)
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, child]) => [key, decode(child)]))
  throw new Error('Campo inesperado.')
}
function encode(value) {
  if (typeof value === 'string') return { stringValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  throw new Error('Solo se actualizan campos de texto e índices.')
}
const root = `projects/${project}/databases/(default)/documents`, base = `https://firestore.googleapis.com/v1/${root}`
assert.equal((await request(`https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`)).billingEnabled, false)
const permissionEmail = project.endsWith('-pruebas') ? 'administrador@demo.ucsd.invalid' : DEVELOPER_EMAIL;
const access = await request(`${base}/access/${encodeURIComponent(permissionEmail)}`)
assert.equal(access.fields.role.stringValue, project.endsWith('-pruebas') ? 'admin' : 'developer')
assert.equal(access.fields.active.booleanValue, true)
const changes = [], records = []
let nextPage = ''
do {
  const page = await request(`${base}/privateItems?pageSize=500${nextPage ? `&pageToken=${encodeURIComponent(nextPage)}` : ''}`)
  records.push(...page.documents ?? [])
  assert.ok(records.length <= 1000, 'Entorno demasiado grande: revisar alcance.')
  nextPage = page.nextPageToken ?? ''
} while (nextPage)
for (const record of records) {
  const before = Object.fromEntries(Object.entries(record.fields).filter(([key]) => key !== 'updatedAt').map(([key, value]) => [key, decode(value)]))
  const custodyLocation = cleanDemoCustody(before.custodyLocation)
  if (custodyLocation === before.custodyLocation) continue
  const after = { ...before, custodyLocation }
  const indexes = buildPrivateIndex(after)
  changes.push({ record, fields: { custodyLocation, searchTerms: indexes.searchTerms } })
}
assert.ok(changes.length <= 200)
console.log(JSON.stringify({ project, mode: apply ? 'APLICAR' : 'SIMULACIÓN', privateChanges: changes.length, inspected: records.length }))
if (changes.length) {
  await mkdir('evidence', { recursive: true })
  await writeFile(`evidence/custody-backup-${project}-${Date.now()}.json`, JSON.stringify({ private: changes.map(change => change.record) }, null, 2))
}
if (apply && changes.length) {
  const writes = changes.map(({ record, fields }) => ({ update: { name: record.name, fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encode(value)])) }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { updateTime: record.updateTime } }))
  const result = await request(`${base}:commit`, { writes })
  assert.equal(result.writeResults?.length, writes.length)
  console.log('Custodia e índice privado actualizados; demás campos conservados.')
}
