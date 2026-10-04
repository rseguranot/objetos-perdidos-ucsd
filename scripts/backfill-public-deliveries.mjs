// Read-only preview by default; --apply explicitly updates public projections only.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { projectPublicItems } from '../src/domain/catalog.ts'
import { buildPublicIndex } from '../src/domain/search-index.ts'
import { parseItems } from '../src/data/storage.ts'

const args = process.argv.slice(2)
assert.ok(args.every(arg => arg === '--apply' || /^--project=ucsd-objetos-perdidos(?:-pruebas)?$/.test(arg)))
const project = args.find(arg => arg.startsWith('--project='))?.slice(10)
assert.ok(['ucsd-objetos-perdidos', 'ucsd-objetos-perdidos-pruebas'].includes(project), 'Indica el proyecto explícitamente.')
const apply = args.includes('--apply')
const token = process.env.UCSD_IMPORT_ACCESS_TOKEN
assert.ok(token, 'Falta OAuth administrativo local.')
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`
async function request(url, body) {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) })
  if (response.status === 404 && !body) return null
  assert.ok(response.ok, `HTTP ${response.status}`)
  return response.json()
}
function decode(value) {
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode)
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, child]) => [key, decode(child)]))
  throw new Error('Tipo de campo inesperado.')
}
const data = document => Object.fromEntries(Object.entries(document.fields ?? {}).filter(([key]) => key !== 'updatedAt').map(([key, value]) => [key, decode(value)]))
function encode(value) {
  if (typeof value === 'string') return { stringValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  throw new Error('La ficha pública admite únicamente campos de texto e índice.')
}
const records = []
let pageToken = ''
do {
  const page = await request(`${base}/privateItems?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`)
  records.push(...(page.documents ?? [])); pageToken = page.nextPageToken ?? ''
  assert.ok(records.length <= 10000, 'Revisar manualmente un entorno mayor.')
} while (pageToken)
const changes = []
for (const internal of records) {
  const raw = data(internal)
  const syntheticActor = Array.isArray(raw.history) && raw.history.some(entry => /@demo\.ucsd\.invalid|\(demo\)/i.test(entry.actor))
  const knownSeed = /^demo-(?:\d+|campus-[a-z-]+)$/.test(raw.id) && /^UCSD-2026-\d{4}$/.test(raw.code)
  assert.ok(knownSeed || syntheticActor || /fictici|simulad|prueba|demo/i.test(`${raw.title} ${raw.description} ${raw.privateDetails} ${raw.code}`), 'Se encontró un registro sin marca ficticia. No se modificó ninguno.')
  const record = parseItems([raw])[0]
  if (!record.delivery || !['entregado', 'archivado'].includes(record.status)) continue
  const projection = projectPublicItems([record])[0]
  assert.equal(projection?.status, 'entregado')
  const published = await request(`${base}/publicItems/${record.id}`)
  const fields = { ...projection, ...buildPublicIndex(projection) }
  const previous = published ? data(published) : null
  if (previous && JSON.stringify(Object.entries(previous).sort()) === JSON.stringify(Object.entries(fields).sort())) continue
  changes.push({ internal, published, fields })
}
console.log(JSON.stringify({ project, mode: apply ? 'APLICAR' : 'SIMULACIÓN', inspected: records.length, publicDeliveryChanges: changes.length, privateWrites: 0 }))
if (apply && changes.length) {
  const billing = await request(`https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`)
  assert.equal(billing.billingEnabled, false)
  await mkdir('evidence', { recursive: true })
  const backup = `evidence/public-deliveries-backup-${project}-${Date.now()}.json`
  await writeFile(backup, JSON.stringify({ project, at: new Date().toISOString(), changes }, null, 2), { flag: 'wx' })
  assert.ok(changes.length <= 200, 'Dividir y revisar la migración antes de superar 200 fichas.')
  const begun = await request(`${base}:beginTransaction`, { options: { readWrite: {} } })
  try {
    const read = await request(`${base}:batchGet`, { transaction: begun.transaction, documents: changes.flatMap(change => [change.internal.name, `${base.slice('https://firestore.googleapis.com/v1/'.length)}/publicItems/${change.fields.id}`]) })
    const current = new Map(read.map(row => [row.found?.name ?? row.missing, row.found ?? null]))
    for (const change of changes) {
      assert.equal(current.get(change.internal.name)?.updateTime, change.internal.updateTime, 'Objeto cambiado: repite simulación.')
      const name = `${base.slice('https://firestore.googleapis.com/v1/'.length)}/publicItems/${change.fields.id}`
      assert.equal(current.get(name)?.updateTime, change.published?.updateTime, 'Ficha cambiada: repite simulación.')
    }
    await request(`${base}:commit`, { transaction: begun.transaction, writes: changes.map(change => ({ update: { name: `${base.slice('https://firestore.googleapis.com/v1/'.length)}/publicItems/${change.fields.id}`, fields: Object.fromEntries(Object.entries(change.fields).map(([key, value]) => [key, encode(value)])) }, currentDocument: change.published ? { updateTime: change.published.updateTime } : { exists: false } })) })
    console.log(`Fichas actualizadas con precondiciones; respaldo: ${backup}`)
  } catch (error) {
    await request(`${base}:rollback`, { transaction: begun.transaction }).catch(() => {})
    throw error
  }
}
