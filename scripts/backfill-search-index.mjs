// Simulación local por defecto. --inspect solo lee Firebase; --apply requiere OAuth administrativo.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { buildPilotExamples } from '../src/data/pilot-examples.ts'
import { buildPrivateIndex, buildPublicIndex } from '../src/domain/search-index.ts'
import { DEVELOPER_EMAIL } from '../src/domain/roles.ts'

const args = process.argv.slice(2)
const action = args.find(arg => ['--inspect', '--apply'].includes(arg))
assert.ok(args.every(arg => arg === '--inspect' || arg === '--apply' || /^--project=(ucsd-objetos-perdidos|ucsd-objetos-perdidos-pruebas)$/.test(arg)), 'Argumentos no admitidos.')
assert.ok(!args.includes('--inspect') || !args.includes('--apply'), 'Elige inspección o aplicación.')
const project = args.find(arg => arg.startsWith('--project='))?.slice('--project='.length)
if (action) assert.ok(project, 'Indica explícitamente --project=ucsd-objetos-perdidos[-pruebas].')
const qa = project === 'ucsd-objetos-perdidos-pruebas'
const date = process.env.UCSD_IMPORT_DATE ?? new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)
const examples = buildPilotExamples(date)
const knownIds = examples.map(item => item.id)
assert.equal(knownIds.length, 50)

if (!action) {
  const summary = examples.map(item => ({ id: item.id, private: buildPrivateIndex(item), public: buildPublicIndex(item) }))
  console.log(JSON.stringify({ mode: 'SIMULACIÓN LOCAL', count: summary.length, sample: summary.slice(0, 2) }, null, 2))
  console.log('Sin conexión ni escrituras. Para revisar los registros actuales, usa --inspect y --project explícitos.')
} else {
  const token = process.env.UCSD_IMPORT_ACCESS_TOKEN
  assert.ok(token, 'Falta UCSD_IMPORT_ACCESS_TOKEN (OAuth administrativo).')
  const root = `projects/${project}/databases/(default)/documents`
  const base = `https://firestore.googleapis.com/v1/${root}`
  async function request(url, body) {
    const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30_000) })
    if (response.status === 404 && !body) return null
    if (!response.ok) throw new Error(`Consulta detenida: HTTP ${response.status}.`)
    return response.json()
  }
  function decode(value) {
    if ('stringValue' in value) return value.stringValue
    if ('booleanValue' in value) return value.booleanValue
    if ('timestampValue' in value) return value.timestampValue
    if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode)
    if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, child]) => [key, decode(child)]))
    throw new Error('Campo inesperado en el ejemplo; no se modificó.')
  }
  function getData(doc) { return Object.fromEntries(Object.entries(doc.fields ?? {}).map(([key, value]) => [key, decode(value)])) }
  function encode(value) {
    if (typeof value === 'string') return { stringValue: value }
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
    throw new Error('Valor de índice inesperado.')
  }
  if (action === '--apply') {
    assert.ok(process.env.UCSD_IMPORT_OWNER_UID, 'Falta UID del Developer.')
    const authorizedEmail = qa ? 'administrador@demo.ucsd.invalid' : DEVELOPER_EMAIL
    const [identity, billing, owner] = await Promise.all([
      request(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`, { localId: [process.env.UCSD_IMPORT_OWNER_UID] }),
      request(`https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`),
      request(`${base}/access/${encodeURIComponent(authorizedEmail)}`),
    ])
    assert.equal(identity.users?.[0]?.email, authorizedEmail)
    if (!qa) assert.equal(identity.users?.[0]?.emailVerified, true)
    assert.ok(!identity.users?.[0]?.disabled)
    assert.equal(billing.billingEnabled, false, 'El proyecto debe continuar sin facturación.')
    assert.equal(owner?.fields?.role?.stringValue, qa ? 'admin' : 'developer')
    assert.equal(owner?.fields?.active?.booleanValue, true)
  }

  // Pilot: exactly 50 known IDs. QA: page the isolated test collection and reject
  // records without a strong synthetic marker; never touch a real-looking object.
  async function listQaPrivate() {
    const collected = []
    let pageToken = ''
    do {
      const url = `${base}/privateItems?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`
      const page = await request(url)
      collected.push(...(page?.documents ?? []))
      pageToken = page?.nextPageToken ?? ''
      assert.ok(collected.length <= 10_000, 'Demasiados registros QA; revisar manualmente antes de migrar.')
    } while (pageToken)
    return collected
  }
  const qaPrivate = qa ? await listQaPrivate() : []
  const source = qa ? qaPrivate.map(internal => ({ id: internal.name.split('/').at(-1), internal })) : knownIds.map(id => ({ id }))
  const documents = []
  for (const { id, internal: listed } of source) {
    const [internal, published] = await Promise.all([listed ?? request(`${base}/privateItems/${encodeURIComponent(id)}`), request(`${base}/publicItems/${encodeURIComponent(id)}`)])
    assert.ok(internal, `Falta el ejemplo ${id}; no se modificó ningún documento.`)
    const record = getData(internal)
    assert.equal(record.id, id)
    if (qa) {
      const seed = /^demo-(?:\d+|campus-[a-z-]+)$/.test(id) && /^UCSD-2026-\d{4}$/.test(record.code)
      const testActor = Array.isArray(record.history) && record.history.some(entry => /@demo\.ucsd\.invalid|\(demo\)/i.test(entry.actor))
      const qaTest = /^UCSD-QA-[a-f0-9-]{36}$/.test(record.code) && testActor
      const testContent = /fictici|simulad|prueba|demo/i.test(`${record.title} ${record.description} ${record.privateDetails}`)
      assert.ok(seed || qaTest || testActor && testContent, `QA contiene un registro sin marca ficticia verificable: ${id}. No se modifica ninguno.`)
    } else {
      const suffix = id.slice(-3)
      assert.equal(record.code, `UCSD-DEMO-${String(Number(suffix)).padStart(4, '0')}`)
      assert.ok(record.description?.includes('Objeto ficticio.'), `El objeto ${id} no parece ser ficticio.`)
    }
    if (record.status === 'disponible') assert.ok(published, `Falta la proyección pública ${id}.`)
    else assert.ok(!published, `Existe proyección pública cerrada ${id}.`)
    if (published) {
      assert.equal(getData(published).id, id)
      assert.equal(getData(published).code, record.code)
    }
    documents.push({ internal, published, record })
  }
  const changes = []
  const backup = []
  for (const { internal, published, record } of documents) {
    backup.push({ private: internal, public: published })
    for (const [document, fields] of [[internal, buildPrivateIndex(record)], ...(published ? [[published, buildPublicIndex(getData(published))]] : [])]) {
      const stored = getData(document)
      const modified = Object.entries(fields).filter(([key, value]) => JSON.stringify(stored[key]) !== JSON.stringify(value))
      if (!modified.length) continue
      assert.ok(document.updateTime, 'Falta versión de documento; no se puede proteger contra cambios simultáneos.')
      changes.push({
        update: { name: document.name, fields: Object.fromEntries(modified.map(([key, value]) => [key, encode(value)])) },
        updateMask: { fieldPaths: modified.map(([key]) => key) },
        currentDocument: { updateTime: document.updateTime },
      })
    }
  }
  console.log(JSON.stringify({ mode: action, project, fictionalRecords: documents.length, changes: changes.length }, null, 2))
  if (action === '--apply' && changes.length) {
    // Persist complete original documents before a single atomic, version-checked commit.
    await mkdir('evidence', { recursive: true })
    const backupPath = `evidence/search-index-backup-${project}-${Date.now()}.json`
    await writeFile(backupPath, JSON.stringify({ project, backedUpAt: new Date().toISOString(), documents: backup }, null, 2), { flag: 'wx' })
    console.log(`Respaldo creado: ${backupPath}`)
    for (let offset = 0; offset < changes.length; offset += 200) {
      const chunk = changes.slice(offset, offset + 200)
      const committed = await request(`${base}:commit`, { writes: chunk })
      assert.equal(committed?.writeResults?.length, chunk.length, 'Respuesta incompleta; inspeccionar antes de reintentar.')
    }
    console.log(`Índices actualizados: ${changes.length}. Ningún estado ni historial fue modificado.`)
  }
}
