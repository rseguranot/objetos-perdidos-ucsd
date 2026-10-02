import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import { buildPrivateIndex } from '../src/domain/search-index.ts'
import { buildPilotExamples } from '../src/data/pilot-examples.ts'
import type { LostItem } from '../src/domain/types.ts'

const source = readFileSync(new URL('../apps-script/service/Code.gs', import.meta.url), 'utf8')
function harness() {
  const context = vm.createContext({ Date, Number, JSON, Utilities: {
    base64DecodeWebSafe: (value: string) => [...Buffer.from(value, 'base64url')],
    base64Decode: (value: string) => [...Buffer.from(value, 'base64')],
    base64Encode: (value: number[]) => Buffer.from(value).toString('base64'),
    newBlob: (value: number[]) => ({ getDataAsString: () => Buffer.from(value).toString('utf8') }),
    computeDigest: (_algorithm: string, value: string) => [...createHash('sha256').update(value).digest()],
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    formatDate: (date: Date) => new Date(date.getTime() - 4 * 3600000).toISOString().slice(0, 10),
  } })
  vm.runInContext(source, context)
  const call = (name: string, ...args: unknown[]) => Reflect.apply(context[name] as (...args: unknown[]) => unknown, undefined, args)
  return { context, call }
}
const config = { project: 'pilot', apiKey: 'public', folder: 'folder', qaUsers: {} }
const identity = { uid: 'user', email: 'staff@ucsd.edu.do' }
const claims = { aud: 'pilot', iss: 'https://securetoken.google.com/pilot', sub: 'user', exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000), email: identity.email, email_verified: true, firebase: { sign_in_provider: 'google.com' } }
const token = (value = claims) => 'header.' + Buffer.from(JSON.stringify(value)).toString('base64url') + '.signature'
// Structural JPEG fixture exercises marker/dimension checks; not used as a real photo.
const image = (width = 2) => ({ mimeType: 'image/jpeg', base64: Buffer.from([255,216,255,192,0,11,8,0,2,width >> 8,width & 255,1,1,17,0,255,218,0,8,1,1,0,0,63,0,1,2,3,255,217]).toString('base64') })

test('Apps Script verifies opaque token with Google and rejects other projects, expiry and false identity', () => {
  const { context, call } = harness()
  let lookups = 0
  context.request_ = () => { lookups++; return { users: [{ localId: identity.uid, email: identity.email, emailVerified: true }] } }
  assert.equal((call('identity_', config, token()) as typeof identity).uid, identity.uid)
  assert.equal(lookups, 1)
  assert.throws(() => call('identity_', config, token({ ...claims, aud: 'other' })), /UNAUTHORIZED/)
  assert.throws(() => call('identity_', config, token({ ...claims, exp: 1 })), /UNAUTHORIZED/)
  context.request_ = () => { throw new Error('UNAUTHORIZED') }
  assert.throws(() => call('identity_', config, token()), /UNAUTHORIZED/)
})
test('Apps Script QA exception pins UID, provider and expected role; normal unverified identity is denied', () => {
  const { context, call } = harness()
  context.request_ = () => ({ users: [{ localId: 'user', email: identity.email, emailVerified: false }] })
  assert.throws(() => call('identity_', config, token()), /UNAUTHORIZED/)
  const qa = { ...config, qaUsers: { [identity.email]: { uid: 'user', role: 'registro' } } }
  const passwordClaims = { ...claims, email_verified: false, firebase: { sign_in_provider: 'password' } }
  assert.equal((call('identity_', qa, token(passwordClaims)) as { expectedRole: string }).expectedRole, 'registro')
  assert.throws(() => call('identity_', qa, token()), /UNAUTHORIZED/)
  assert.throws(() => call('identity_', { ...qa, qaUsers: { [identity.email]: { uid: 'different', role: 'registro' } } }, token(passwordClaims)), /UNAUTHORIZED/)
})
test('Apps Script denies inactive or mismatched access and reserved developer impersonation', () => {
  const { context, call } = harness()
  context.get_ = () => ({ value: { email: identity.email, active: false, role: 'admin' } })
  assert.throws(() => call('access_', config, identity), /FORBIDDEN/)
  context.get_ = () => ({ value: { email: identity.email, active: true, role: 'developer' } })
  assert.throws(() => call('access_', config, identity), /FORBIDDEN/)
  context.get_ = () => ({ value: { email: identity.email, active: true, role: 'admin' } })
  assert.throws(() => call('access_', config, { ...identity, expectedRole: 'registro' }), /FORBIDDEN/)
})
test('Apps Script validates actual JPEG size, markers, metadata and dimensions independently of claimed fields', () => {
  const { call } = harness()
  const valid = call('jpeg_', { ...image(), size: 0, width: 5000 }) as { size: number; width: number }
  assert.equal(valid.width, 2)
  assert.equal(valid.size, 30)
  assert.throws(() => call('jpeg_', image(1601)), /INVALID_IMAGE/)
  assert.throws(() => call('jpeg_', { mimeType: 'image/jpeg', base64: Buffer.from('not an image').toString('base64') }), /INVALID_IMAGE/)
  assert.throws(() => call('jpeg_', { ...image(), mimeType: 'image/png' }), /INVALID_IMAGE/)
  assert.throws(() => call('jpeg_', { ...image(), base64: 'A'.repeat(1398105) }), /INVALID_IMAGE/)
  const metadata = Buffer.from(image().base64, 'base64'); metadata[3] = 225
  assert.throws(() => call('jpeg_', { ...image(), base64: metadata.toString('base64') }), /INVALID_IMAGE/)
})
test('Apps Script enforces one to three photos, expected history and recipient validation', () => {
  const { call } = harness()
  const payload = { itemId: 'item', operationId: 'operation', expectedHistoryId: 'history', delivery: { recipient: 'Person', proof: 'Description', identityType: 'carnet_estudiante' }, photos: [image()] }
  assert.doesNotThrow(() => call('input_', payload))
  for (const photos of [[], [image(), image(), image(), image()]]) assert.throws(() => call('input_', { ...payload, photos }), /INVALID_REQUEST/)
  assert.throws(() => call('input_', { ...payload, expectedHistoryId: '' }), /INVALID_REQUEST/)
  assert.throws(() => call('input_', { ...payload, delivery: { ...payload.delivery, recipient: 'x'.repeat(301) } }), /INVALID_REQUEST/)
})
test('Apps Script dispatcher rejects Registro upload, but permits private listing without item custody', () => {
  const { context, call } = harness()
  context.config_ = () => config; context.identity_ = () => identity
  context.access_ = () => ({ value: { role: 'registro' } })
  context.list_ = () => ({ items: [], cursor: null })
  const denied = call('dispatch', { action: 'deliver', idToken: token(), payload: {} }) as { ok: boolean; code: string }
  assert.equal(denied.ok, false); assert.equal(denied.code, 'FORBIDDEN')
  assert.equal((call('dispatch', { action: 'list', idToken: token() }) as { ok: boolean }).ok, true)
})
test('Apps Script idempotent completed retry returns no upload; different payload is conflict', () => {
  const { context, call } = harness()
  const payload = { itemId: 'item', operationId: 'operation', expectedHistoryId: 'history', delivery: { recipient: 'Person', proof: 'Description', identityType: 'carnet_estudiante' }, photos: [image()] }
  const fingerprint = call('hash_', JSON.stringify({ itemId: payload.itemId, delivery: payload.delivery, expectedHistoryId: payload.expectedHistoryId, photos: payload.photos.map(photo => photo.base64) }))
  context.get_ = () => ({ value: { uid: identity.uid, fingerprint, state: 'completed' } })
  assert.equal((call('deliver_', config, identity, token(), payload) as { itemId: string }).itemId, 'item')
  assert.throws(() => call('deliver_', config, identity, token(), { ...payload, itemId: 'other' }), /CONFLICT/)
})
test('Apps Script concurrent history change prevents any upload and public item deletion', () => {
  const { context, call } = harness()
  const payload = { itemId: 'item', operationId: 'operation', expectedHistoryId: 'old', delivery: { recipient: 'Person', proof: 'Description', identityType: 'carnet_estudiante' }, photos: [image()] }
  context.get_ = (_config: unknown, path: string) => path.startsWith('evidenceOperations/') ? null : { value: { status: 'disponible', received: true, history: [{ id: 'new' }] } }
  context.commit_ = () => assert.fail('must not write')
  assert.throws(() => call('deliver_', config, identity, token(), payload), /CONFLICT/)
})
test('Apps Script list uses a stable date/document cursor and exposes only summary fields', () => {
  const { context, call } = harness()
  let sent: { structuredQuery: { limit: number; orderBy: unknown[]; startAt?: { before: boolean } } } | undefined
  context.request_ = (_url: string, _method: string, body: typeof sent) => {
    sent = body
    return Array.from({ length: 26 }, (_, i) => ({ document: { fields: call('encodeMap_', { id: String(i), itemId: 'item', title: 'Object', code: 'CODE', deliveredAt: '2026-10-01T01:00:00.000Z', photos: [{ fileId: 'secret' }], privateDetails: 'never return' }) } }))
  }
  const result = call('list_', config, {}) as { items: object[]; cursor: string }
  assert.equal(result.items.length, 25); assert.equal(sent?.structuredQuery.limit, 26); assert.equal(sent?.structuredQuery.orderBy.length, 2)
  assert.ok(!JSON.stringify(result).includes('secret')); assert.ok(!JSON.stringify(result).includes('privateDetails'))
  call('list_', config, { cursor: result.cursor })
  assert.equal(sent?.structuredQuery.startAt?.before, false)
})

function deliveryHarness() {
  const { context, call } = harness()
  const documents = new Map<string, { value: Record<string, unknown>; fields: unknown; updateTime: string }>()
  const original = { ...buildPilotExamples('2026-10-02')[0], id: 'item', privateDetails: 'secret' }
  const value = { ...original, ...buildPrivateIndex(original), status: 'disponible', received: true, history: [{ id: 'history', at: '2026-01-01T00:00:00.000Z', actor: identity.email, action: 'Publicado' }], title: original.title, code: original.code, updatedAt: 'old' }
  documents.set('privateItems/item', { value, fields: call('encodeMap_', value), updateTime: 'version1' })
  const files = new Map<string, { getId: () => string; getSize: () => number; getSharingAccess: () => string; getEditors: () => unknown[]; getViewers: () => unknown[] }>()
  const reads: string[] = [], commits: { writes: Record<string, unknown>[]; transaction: unknown }[] = []
  let created = 0, sequence = 1, revoke = false, failCommit = false
  context.get_ = (_config: unknown, path: string, transaction: unknown) => { if (transaction) reads.push(path); return documents.has(path) ? JSON.parse(JSON.stringify(documents.get(path))) : null }
  context.access_ = (_config: unknown, _identity: unknown, transaction: unknown) => { if (transaction) reads.push('access/' + identity.email); if (revoke) throw new Error('FORBIDDEN'); return { value: { role: 'admin' } } }
  context.identity_ = () => identity
  context.request_ = () => ({ transaction: 'transaction1' })
  context.commit_ = (_config: unknown, writes: Record<string, unknown>[], transaction: unknown) => {
    commits.push({ writes, transaction })
    if (transaction && failCommit) throw new Error('UNAVAILABLE')
    for (const write of writes) {
      if (write.update) {
        const update = write.update as { name: string; fields: unknown }, path = update.name.split('/documents/')[1]
        documents.set(path, { value: call('decodeMap_', update.fields) as Record<string, unknown>, fields: update.fields, updateTime: 'version' + ++sequence })
      }
    }
  }
  context.DriveApp = { Access: { PRIVATE: 'PRIVATE' }, getFolderById: () => ({
    getSharingAccess: () => 'PRIVATE', getEditors: () => [], getViewers: () => [],
    getFilesByName: (name: string) => { let used = false; return { hasNext: () => files.has(name) && !used, next: () => { used = true; return files.get(name) } } },
    createFile: () => {
      const file = { getId: () => 'file' + created, getSize: () => 30, getSharingAccess: () => 'PRIVATE', getEditors: () => [], getViewers: () => [] }; created++
      const operation = call('hash_', identity.uid + ':operation')
      files.set('UCSD-' + operation + '-0.jpg', file); return file
    },
  }) }
  const payload = { itemId: 'item', operationId: 'operation', expectedHistoryId: 'history', delivery: { recipient: 'Person', proof: 'Description', identityType: 'carnet_estudiante' }, photos: [image()] }
  return { call, context, payload, documents, reads, commits, created: () => created, revoke: () => { revoke = true }, failCommit: (value: boolean) => { failCommit = value } }
}
test('Apps Script commits handover, evidence and removal together after transactional access and version reads', () => {
  const h = deliveryHarness()
  const result = h.call('deliver_', config, identity, token(), h.payload) as { evidenceId: string }
  assert.equal(h.created(), 1)
  assert.ok(h.reads.includes('access/' + identity.email)); assert.ok(h.reads.includes('privateItems/item')); assert.ok(h.reads.includes('evidenceOperations/' + result.evidenceId))
  const last = h.commits.at(-1)!
  assert.equal(last.transaction, 'transaction1'); assert.equal(last.writes.length, 4)
  assert.ok(last.writes.some(write => write.delete === 'projects/pilot/databases/(default)/documents/publicItems/item'))
  assert.equal(h.documents.get('privateItems/item')!.value.status, 'entregado')
  assert.equal(h.documents.get('evidenceOperations/' + result.evidenceId)!.value.state, 'completed')
  assert.equal(h.documents.get('privateItems/item')!.value.privateDetails, 'secret')
  const writes = h.commits.length
  h.call('deliver_', config, identity, token(), h.payload)
  assert.equal(h.created(), 1); assert.equal(h.commits.length, writes)
})
test('Apps Script failed commit keeps pending private files, retry reuses them and revocation blocks handover', () => {
  const h = deliveryHarness(); h.failCommit(true)
  assert.throws(() => h.call('deliver_', config, identity, token(), h.payload), /UNAVAILABLE/)
  assert.equal(h.documents.get('privateItems/item')!.value.status, 'disponible'); assert.equal(h.created(), 1)
  h.failCommit(false); h.revoke()
  assert.throws(() => h.call('deliver_', config, identity, token(), h.payload), /FORBIDDEN/)
  assert.equal(h.created(), 1); assert.equal(h.documents.get('privateItems/item')!.value.status, 'disponible')
})
test('Apps Script delivery index equals client rebuild, so archiving does not mutate protected searchTerms', () => {
  const h = deliveryHarness()
  h.payload.delivery.recipient = 'María Pérez QA_Receptor_Único'
  h.call('deliver_', config, identity, token(), h.payload)
  const delivered = h.documents.get('privateItems/item')!.value
  const archived = { ...delivered, status: 'archivado' } as unknown as LostItem
  assert.deepEqual(Array.from(delivered.searchTerms as string[]), buildPrivateIndex(archived).searchTerms)
  assert.ok((delivered.searchTerms as string[]).includes('maria'))
  assert.ok((delivered.searchTerms as string[]).includes('unico'))
})
test('Apps Script rejects oversized delivery search index before writing or uploading files', () => {
  const h = deliveryHarness(), stored = h.documents.get('privateItems/item')!
  stored.value.searchTerms = Array.from({ length: 500 }, (_, i) => 'word' + i)
  stored.fields = h.call('encodeMap_', stored.value)
  assert.throws(() => h.call('deliver_', config, identity, token(), h.payload), /INVALID_REQUEST/)
  assert.equal(h.created(), 0); assert.equal(h.commits.length, 0)
})
