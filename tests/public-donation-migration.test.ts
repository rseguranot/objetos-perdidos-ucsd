import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildPilotExamples } from '../src/data/pilot-examples.ts'
import { disposeItem, projectPublicItems } from '../src/domain/catalog.ts'
import { buildPublicIndex } from '../src/domain/search-index.ts'

function field(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(field) } }
  assert.ok(value && typeof value === 'object')
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, child]) => [key, field(child)])) } }
}

async function run(args: string[], billing = false, nativeFraction = false, existingProjection = false) {
  const original = disposeItem(buildPilotExamples('2024-01-01')[0], { kind: 'donacion', recipient: 'Destino ficticio', reference: 'Acta ficticia' }, 'Responsable ficticio', '2024-04-01')
  const project = 'ucsd-objetos-perdidos-pruebas'
  const prefix = `projects/${project}/databases/(default)/documents`
  const internal: { name: string; updateTime: string; fields: Record<string, unknown> } = { name: `${prefix}/privateItems/${original.id}`, updateTime: '2024-04-01T15:00:00.000Z', fields: { ...Object.fromEntries(Object.entries(original).map(([key, value]) => [key, field(value)])), updatedAt: { timestampValue: '2024-04-01T15:00:00.000Z' } } }
  if (nativeFraction) {
    const disposition = internal.fields.disposition as { mapValue: { fields: Record<string, unknown> } }
    disposition.mapValue.fields.completedAt = { timestampValue: original.disposition!.completedAt.replace('.000Z', '.123456Z') }
  }
  const publicName = `${prefix}/publicItems/${original.id}`
  const projection = projectPublicItems([original])[0]
  const published = { name: publicName, updateTime: internal.updateTime, fields: Object.fromEntries(Object.entries({ ...projection, ...buildPublicIndex(projection) }).map(([key, value]) => [key, field(value)])) }
  const messages: string[] = [], requests: Array<{ url: string; body?: Record<string, unknown> }> = []
  const workdir = await mkdtemp(join(tmpdir(), 'ucsd-migration-test-'))
  const previous = { argv: process.argv, token: process.env.UCSD_IMPORT_ACCESS_TOKEN, fetch: globalThis.fetch, log: console.log, cwd: process.cwd() }
  try {
    process.chdir(workdir)
    process.argv = ['node', 'backfill-public-deliveries.mjs', `--project=${project}`, ...args]
    process.env.UCSD_IMPORT_ACCESS_TOKEN = 'fictitious-mocked-token'
    console.log = message => messages.push(String(message))
    globalThis.fetch = (async (input, init) => {
      const url = String(input), body = init?.body ? JSON.parse(String(init.body)) : undefined
      requests.push({ url, body })
      if (url.includes('/privateItems?pageSize=')) return Response.json({ documents: [internal] })
      if (url.endsWith(`/publicItems/${original.id}`)) return existingProjection ? Response.json(published) : new Response(null, { status: 404 })
      if (url.endsWith('/billingInfo')) return Response.json({ billingEnabled: billing })
      if (url.endsWith(':beginTransaction')) return Response.json({ transaction: 'fictitious-transaction' })
      if (url.endsWith(':batchGet')) return Response.json([{ found: internal }, { missing: publicName }])
      if (url.endsWith(':commit') || url.endsWith(':rollback')) return Response.json({})
      throw new Error(`Unexpected request: ${url}`)
    }) as typeof fetch
    await import(`../scripts/backfill-public-deliveries.mjs?test=${crypto.randomUUID()}`)
    const report = JSON.parse(messages[0])
    const backupMessage = messages.find(message => message.includes('respaldo: '))
    const backup = backupMessage ? JSON.parse(await readFile(join(workdir, backupMessage.split('respaldo: ')[1]), 'utf8')) : undefined
    return { report, requests, original, internal, backup }
  } finally {
    process.chdir(previous.cwd); process.argv = previous.argv; globalThis.fetch = previous.fetch; console.log = previous.log
    if (previous.token === undefined) delete process.env.UCSD_IMPORT_ACCESS_TOKEN
    else process.env.UCSD_IMPORT_ACCESS_TOKEN = previous.token
  }
}

test('migration leaves legacy donation dates untouched without the explicit normalization flag', async () => {
  const result = await run([])
  assert.equal(result.report.privateWrites, 0)
  assert.deepEqual(result.report.skippedLegacyDonationIds, [result.original.id])
  assert.equal(result.requests.some(request => request.body), false)
})

test('normalization preview plans only eligible synthetic donations and never writes', async () => {
  const result = await run(['--normalize-legacy-donations'])
  assert.equal(result.report.privateWrites, 1)
  assert.deepEqual(result.report.normalizedDonationIds, [result.original.id])
  assert.equal(result.report.publicDonationChanges, 1)
  assert.deepEqual(result.report.skippedLegacyDonationIds, [])
  assert.equal(result.requests.some(request => request.body), false)
})

test('legacy normalization atomically changes only the nested timestamp representation and public projection', async () => {
  const result = await run(['--normalize-legacy-donations', '--apply'])
  const commit = result.requests.find(request => request.url.endsWith(':commit'))!.body!
  assert.equal(commit.transaction, 'fictitious-transaction')
  const writes = commit.writes as Array<{ update: { name: string; fields: Record<string, unknown> }; updateMask?: { fieldPaths: string[] }; currentDocument: Record<string, unknown> }>
  assert.equal(writes.length, 2)
  assert.equal(writes[0].update.name, result.internal.name)
  assert.deepEqual(writes[0].updateMask, { fieldPaths: ['disposition.completedAt'] })
  assert.deepEqual(writes[0].update.fields, { disposition: { mapValue: { fields: { completedAt: { timestampValue: result.original.disposition!.completedAt } } } } })
  assert.deepEqual(writes[0].currentDocument, { updateTime: result.internal.updateTime })
  assert.equal(writes[1].update.fields.status && (writes[1].update.fields.status as { stringValue: string }).stringValue, 'donado')
  assert.ok(!Object.hasOwn(writes[1].update.fields, 'disposition'))
  assert.deepEqual(result.backup.changes[0].internal, result.internal, 'Backup preserves every original private field and its representation.')
  assert.deepEqual(result.requests.find(request => request.url.endsWith(':batchGet'))!.body!.documents, [result.internal.name, writes[1].update.name])
})

test('normalization refuses writes when billing is enabled', async () => {
  await assert.rejects(() => run(['--normalize-legacy-donations', '--apply'], true), /true !== false/)
})


test('native Firestore timestamps with six fractional digits normalize in memory and an existing projection is idempotent', async () => {
  const result = await run([], false, true, true)
  assert.equal(result.report.privateWrites, 0)
  assert.equal(result.report.publicDonationChanges, 0)
  assert.equal(result.report.publicDeliveryChanges, 0)
  assert.deepEqual(result.report.normalizedDonationIds, [])
  assert.deepEqual(result.report.skippedLegacyDonationIds, [])
  const disposition = result.internal.fields.disposition as { mapValue: { fields: { completedAt: { timestampValue: string } } } }
  assert.equal(disposition.mapValue.fields.completedAt.timestampValue, result.original.disposition!.completedAt.replace('.000Z', '.123456Z'))
  assert.equal(result.requests.some(request => request.body), false)
})
