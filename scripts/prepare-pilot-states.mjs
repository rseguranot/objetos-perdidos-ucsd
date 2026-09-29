// Dry-run sin conexión. --apply requiere OAuth administrativo; nunca imprime credenciales.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { buildPilotExamples } from '../src/data/pilot-examples.ts'
import { planPilotStates } from '../src/data/pilot-states.ts'
import { parseItems } from '../src/data/storage.ts'
import { projectPublicItems } from '../src/domain/catalog.ts'
import { DEVELOPER_EMAIL } from '../src/domain/roles.ts'

const args = process.argv.slice(2)
assert.ok(args.every(arg => ['--apply', '--verify'].includes(arg)) && args.length <= 1)
const project = 'ucsd-objetos-perdidos'
const date = process.env.UCSD_IMPORT_DATE ?? new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)
const root = `projects/${project}/databases/(default)/documents`
const token = process.env.UCSD_IMPORT_ACCESS_TOKEN
function decode(v) {
  if ('stringValue' in v) return v.stringValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode)
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, e]) => [k, decode(e)]))
  throw new Error('Tipo de dato inesperado.')
}
function encode(v) {
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, e]) => [k, encode(e)])) } }
}
async function request(url, body) {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Operación detenida: HTTP ${response.status}.`)
  return response.json()
}
function summary(items) {
  return { total: items.length, states: Object.fromEntries(['borrador', 'disponible', 'entregado', 'archivado'].map(status => [status, items.filter(i => i.status === status).length])), donations: items.filter(i => i.disposition?.kind === 'donacion').length, remissions: items.filter(i => i.disposition?.kind === 'remision_documentos').length }
}
if (!args.length) {
  console.log(JSON.stringify({ mode: 'SIMULACIÓN LOCAL', project, final: summary(planPilotStates(buildPilotExamples(date), date, 'Personal ficticio')), staged: summary(planPilotStates(buildPilotExamples(date), date, 'Personal ficticio', true)) }, null, 2))
} else {
  assert.ok(token && process.env.UCSD_IMPORT_OWNER_UID, 'Faltan OAuth y UID autorizado.')
  const identity = await request(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`, { localId: [process.env.UCSD_IMPORT_OWNER_UID] })
  assert.equal(identity.users?.[0]?.email, DEVELOPER_EMAIL)
  assert.equal(identity.users[0].emailVerified, true)
  assert.ok(!identity.users[0].disabled)
  const billing = await request(`https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`)
  assert.equal(billing.billingEnabled, false)
  const base = `https://firestore.googleapis.com/v1/${root}`
  const owner = await request(`${base}/access/${encodeURIComponent(DEVELOPER_EMAIL)}`)
  assert.equal(owner.fields.role.stringValue, 'developer')
  assert.equal(owner.fields.active.booleanValue, true)
  const documents = []
  for (let n = 1; n <= 50; n++) documents.push(await request(`${base}/privateItems/demo-pilot-${String(n).padStart(3, '0')}`))
  const before = parseItems(documents.map(document => Object.fromEntries(Object.entries(document.fields).filter(([key]) => key !== 'updatedAt').map(([k, e]) => [k, decode(e)]))))
  if (args[0] === '--verify') {
    console.log(JSON.stringify(summary(before), null, 2))
    for (const item of before) {
      const response = await fetch(`${base}/publicItems/${item.id}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) })
      if (item.status !== 'disponible') assert.equal(response.status, 404, `Objeto cerrado público: ${item.code}`)
      else {
        assert.equal(response.status, 200)
        const doc = await response.json()
        const projection = Object.fromEntries(Object.entries(doc.fields).filter(([key]) => key !== 'updatedAt').map(([k, e]) => [k, decode(e)]))
        assert.deepEqual(projection, projectPublicItems([item])[0])
      }
    }
    console.log('Proyecciones verificadas: solo los objetos disponibles son públicos.')
  } else {
    const next = parseItems(planPilotStates(before, date, DEVELOPER_EMAIL, true))
    const writes = []
    for (let i = 0; i < next.length; i++) {
      if (JSON.stringify(before[i]) === JSON.stringify(next[i])) continue
      const item = next[i], publicDoc = await request(`${base}/publicItems/${item.id}`)
      writes.push({ update: { name: documents[i].name, fields: encode(item).mapValue.fields }, currentDocument: { updateTime: documents[i].updateTime }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] })
      if (item.status === 'disponible') writes.push({ update: { name: publicDoc.name, fields: encode(projectPublicItems([item])[0]).mapValue.fields }, currentDocument: { updateTime: publicDoc.updateTime }, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] })
      else writes.push({ delete: publicDoc.name, currentDocument: { updateTime: publicDoc.updateTime } })
    }
    if (writes.length) {
      await mkdir('evidence', { recursive: true })
      await writeFile(`evidence/pilot-states-backup-${Date.now()}.json`, JSON.stringify({ at: new Date().toISOString(), project, documents }, null, 2), { flag: 'wx' })
      const result = await request(`${base}:commit`, { writes })
      assert.equal(result.writeResults?.length, writes.length)
    }
    console.log(JSON.stringify({ mode: 'PREPARACIÓN APLICADA', writes: writes.length, ...summary(next), browserCases: ['UCSD-DEMO-0042: entregar', 'UCSD-DEMO-0043: donar', 'UCSD-DEMO-0044: archivar'] }, null, 2))
  }
}
