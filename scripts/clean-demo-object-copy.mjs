// Preview and backup first. Change object title/description and matching search indexes only.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { cleanDemoObjectText } from '../src/domain/demo-copy.ts'
import { buildPrivateIndex, buildPublicIndex } from '../src/domain/search-index.ts'
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
  const title = cleanDemoObjectText(before.title), description = cleanDemoObjectText(before.description)
  if (title === before.title && description === before.description) continue
  assert.ok(/demo|qa/i.test(before.id) || /fictici|simulad|prueba|demo/i.test(`${before.privateDetails} ${before.description} ${before.title}`), 'Registro sin marca de prueba: se detuvo antes de escribir.')
  assert.ok(title && description, 'La limpieza dejaría un campo vacío: revisar manualmente.')
  const after = { ...before, title, description }
  const indexes = buildPrivateIndex(after)
  changes.push({ record, after, fields: { title, description, searchTerms: indexes.searchTerms, publicSearchTerms: indexes.publicSearchTerms } })
}
assert.ok(changes.length <= 200)
const publicNames = changes.map(change => `${root}/publicItems/${change.after.id}`)
const published = publicNames.length ? await request(`${base}:batchGet`, { documents: publicNames }) : []
const publicDocuments = new Map(published.filter(entry => entry.found).map(entry => [entry.found.name, entry.found]))
console.log(JSON.stringify({ project, mode: apply ? 'APLICAR' : 'SIMULACIÓN', privateChanges: changes.length, publicChanges: publicDocuments.size, inspected: records.length }))
if (changes.length) {
  await mkdir('evidence', { recursive: true })
  await writeFile(`evidence/object-copy-backup-${project}-${Date.now()}.json`, JSON.stringify({ private: changes.map(change => change.record), public: [...publicDocuments.values()] }, null, 2))
}
if (apply && changes.length) {
  const writes = changes.flatMap(change => {
    const publicRecord = publicDocuments.get(`${root}/publicItems/${change.after.id}`)
    const updates = [{ record: change.record, fields: change.fields }]
    if (publicRecord) updates.push({ record: publicRecord, fields: { title: change.after.title, description: change.after.description, searchTerms: buildPublicIndex(change.after).searchTerms } })
    return updates.map(({ record, fields }) => ({ update: { name: record.name, fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encode(value)])) }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { updateTime: record.updateTime } }))
  })
  const result = await request(`${base}:commit`, { writes })
  assert.equal(result.writeResults?.length, writes.length)
  console.log('Textos e índices actualizados atómicamente; historial, estado y evidencias conservados.')
}
