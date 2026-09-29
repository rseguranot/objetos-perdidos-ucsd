import test from 'node:test'
import assert from 'node:assert/strict'
import { archiveItem, canDispose, disposeItem, filterInternalItems, needsRetentionReview, projectPublicItems, RETENTION_DAYS, retentionInfo } from '../src/domain/catalog.ts'
import { authorizeItemChange, validateAccessChange, type Session } from '../src/domain/roles.ts'
import { parseItems, loadItems, saveItems } from '../src/data/storage.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'
import type { LostItem } from '../src/domain/types.ts'

const actor = 'Responsable ficticio'
const decanato: Session = { uid: 'd', email: 'decanato@ucsd.edu.do', verified: true, role: 'decanato' }
const registry: Session = { uid: 'r', email: 'registro@ucsd.edu.do', verified: true, role: 'registro' }
const admin: Session = { uid: 'a', email: 'admin@ucsd.edu.do', verified: true, role: 'admin' }
const destination = { kind: 'donacion' as const, recipient: ' Fundación ficticia ', reference: ' Acta de ejemplo 001 ' }
const filters = { query: '', status: '', from: '', to: '' }
function item(overrides: Partial<LostItem> = {}): LostItem {
  return { ...structuredClone(SEED_ITEMS[0]), foundDate: '2024-01-01', receivedDate: '2024-01-10', history: [{ id: 'initial', at: '2024-01-10T15:00:00.000Z', actor, action: 'Registro inicial' }], ...overrides }
}

test('plazo de 90 días comienza en recepción y cambia al inicio del día 90', () => {
  assert.equal(RETENTION_DAYS, 90)
  const record = item()
  assert.deepEqual(retentionInfo(record, '2024-04-08'), { dueDate: '2024-04-09', elapsedDays: 89, remainingDays: 1, overdue: false })
  assert.deepEqual(retentionInfo(record, '2024-04-09'), { dueDate: '2024-04-09', elapsedDays: 90, remainingDays: 0, overdue: true })
  assert.equal(retentionInfo(record, '2024-04-10')?.remainingDays, 0)
  assert.equal(canDispose(record, '2024-04-08'), false)
  assert.equal(canDispose(record, '2024-04-09'), true)
  assert.equal(retentionInfo(item({ received: false }), '2024-04-09'), null)
  assert.equal(retentionInfo(item({ receivedDate: '2024-02-30' }), '2024-04-09'), null)
  assert.equal(retentionInfo(record, 'fecha inválida'), null)
})

test('aritmética de calendario contempla año bisiesto sin horas ni DST', () => {
  assert.equal(retentionInfo(item({ receivedDate: '2024-02-29' }), '2024-05-29')?.dueDate, '2024-05-29')
  assert.equal(retentionInfo(item({ receivedDate: '2025-01-01' }), '2025-04-01')?.elapsedDays, 90)
  assert.equal(retentionInfo(item({ receivedDate: '2024-01-01' }), '2024-03-31')?.elapsedDays, 90)
})

test('destino exige recepción, plazo, receptor, constancia y una categoría admitida', () => {
  assert.throws(() => disposeItem(item(), destination, actor, '2024-04-08'), /90 días/)
  assert.throws(() => disposeItem(item({ received: false }), destination, actor, '2024-04-09'), /recepción/)
  assert.throws(() => disposeItem(item({ receivedDate: '' }), destination, actor, '2024-04-09'), /recepción/)
  assert.throws(() => disposeItem(item({ category: 'dinero', itemType: 'efectivo' }), destination, actor, '2024-04-09'), /protocolo especial/)
  assert.equal(needsRetentionReview(item({ category: 'dinero', itemType: 'efectivo' }), '2024-04-09'), true)
  assert.equal(canDispose(item({ category: 'dinero', itemType: 'efectivo' }), '2024-04-09'), false)
  assert.throws(() => disposeItem(item(), { ...destination, recipient: ' ' }, actor, '2024-04-09'), /destinatario/)
  assert.throws(() => disposeItem(item(), { ...destination, reference: '' }, actor, '2024-04-09'), /constancia/)
  assert.throws(() => disposeItem(item(), { ...destination, recipient: 'a'.repeat(301) }, actor, '2024-04-09'), /300/)
  assert.throws(() => disposeItem(item(), { ...destination, reference: 'a'.repeat(2001) }, actor, '2024-04-09'), /2000/)
  assert.throws(() => disposeItem(item({ status: 'entregado' }), destination, actor, '2024-04-09'), /entregado/)
})

test('documentos se remiten y el resto de categorías elegibles se dona', () => {
  const documents = item({ category: 'documentos', itemType: 'documento' })
  assert.throws(() => disposeItem(documents, destination, actor, '2024-04-09'), /remisión/)
  assert.throws(() => disposeItem(item(), { ...destination, kind: 'remision_documentos' }, actor, '2024-04-09'), /donación/)
  assert.equal(disposeItem(documents, { ...destination, kind: 'remision_documentos' }, actor, '2024-04-09').disposition?.kind, 'remision_documentos')
})

test('destino archiva y añade historial; archivo previo puede completarse una única vez', () => {
  const original = item()
  const archived = archiveItem(original, actor)
  const disposed = disposeItem(archived, destination, actor, '2024-04-09')
  assert.equal(disposed.status, 'archivado')
  assert.deepEqual(disposed.history.slice(0, archived.history.length), archived.history)
  assert.equal(disposed.history.length, archived.history.length + 1)
  assert.deepEqual(disposed.disposition, { kind: 'donacion', recipient: 'Fundación ficticia', reference: 'Acta de ejemplo 001', completedAt: '2024-04-09T12:00:00.000Z' })
  assert.equal(original.status, 'disponible')
  assert.equal(original.disposition, undefined)
  assert.equal(canDispose(disposed, '2024-04-10'), false)
  assert.throws(() => disposeItem(disposed, destination, actor, '2024-04-10'), /ya fue registrado/)
})

test('proyección pública no revela seguimiento ni constancias y excluye destinos', () => {
  const original = item()
  const projected = projectPublicItems([original])[0]
  assert.ok(projected)
  for (const key of ['disposition', 'delivery', 'receivedDate', 'privateDetails', 'history', 'custodyLocation']) assert.equal(Object.hasOwn(projected, key), false)
  assert.equal(projectPublicItems([disposeItem(original, destination, actor, '2024-04-09')]).length, 0)
  assert.equal(projectPublicItems([{ ...original, disposition: disposeItem(original, destination, actor, '2024-04-09').disposition }]).length, 0)
})

test('solo custodios registran destinos y no se puede alterar entrega, destino o historial previo', () => {
  const original = item({ createdByUid: registry.uid })
  const disposed = disposeItem(original, destination, actor, '2024-04-09')
  assert.doesNotThrow(() => authorizeItemChange(decanato, original, disposed))
  assert.doesNotThrow(() => authorizeItemChange(admin, original, disposed))
  assert.throws(() => authorizeItemChange(registry, original, disposed))
  const archived = archiveItem(original, actor)
  assert.doesNotThrow(() => authorizeItemChange(decanato, archived, disposeItem(archived, destination, actor, '2024-04-09')))
  assert.throws(() => authorizeItemChange(decanato, disposed, { ...disposed, disposition: undefined }))
  assert.throws(() => authorizeItemChange(decanato, disposed, { ...disposed, title: 'Cambiado' }))
  assert.throws(() => authorizeItemChange(decanato, original, { ...disposed, history: disposed.history.slice(1) }), /historial/)
  assert.throws(() => authorizeItemChange(decanato, original, { ...disposed, privateDetails: 'Alterados' }), /datos anteriores/)
  assert.throws(() => authorizeItemChange(decanato, original, { ...disposed, disposition: { ...disposed.disposition!, completedAt: '2024-04-08T12:00:00.000Z' } }), /fecha del destino/)
  assert.throws(() => authorizeItemChange(decanato, original, { ...disposed, history: original.history }), /evento al historial/)
  const delivered = item({ status: 'entregado', delivery: { recipient: 'Persona ficticia', proof: 'Marca', deliveredAt: '2024-02-01T12:00:00.000Z' } })
  assert.throws(() => authorizeItemChange(decanato, delivered, { ...archiveItem(delivered, actor), delivery: undefined }), /entrega registrada/)
  assert.throws(() => authorizeItemChange(decanato, undefined, disposed), /borrador/)
  assert.throws(() => validateAccessChange(admin, { email: admin.email, role: 'decanato', active: true }), /propio rol/)
})

test('filtros internos combinan texto sin acentos, hallazgo, estado y destino', () => {
  const pending = item({ id: 'pending', code: 'UCSD-2024-0002', title: 'Audífonos reservados' })
  const donated = disposeItem(item({ id: 'donated', code: 'UCSD-2024-0003' }), destination, actor, '2024-04-09')
  const document = disposeItem(item({ id: 'document', code: 'UCSD-2024-0004', category: 'documentos', itemType: 'documento', foundDate: '2024-01-02' }), { ...destination, kind: 'remision_documentos' }, actor, '2024-04-09')
  const records = [pending, donated, document]
  assert.deepEqual(filterInternalItems(records, filters, '2024-04-09').map(record => record.id), ['document', 'donated', 'pending'])
  assert.deepEqual(filterInternalItems(records, { ...filters, query: 'audifonos', disposition: 'pendiente90', status: 'disponible', from: '2024-01-01', to: '2024-01-01' }, '2024-04-09').map(record => record.id), ['pending'])
  assert.equal(filterInternalItems(records, { ...filters, disposition: 'donacion', status: 'disponible' }).length, 0)
  assert.equal(filterInternalItems(records, { ...filters, query: 'fundacion ficticia', disposition: 'remision_documentos' }).length, 1)
  assert.equal(filterInternalItems(records, { ...filters, from: '2024-01-03', to: '2024-01-01' }).length, 0)
  assert.equal(filterInternalItems(records, { ...filters, from: '2024-02-30' }).length, 0)
  assert.equal(filterInternalItems([item({ category: 'dinero', itemType: 'efectivo' })], { ...filters, disposition: 'pendiente90' }, '2024-04-09').length, 1)
})

test('persistencia admite registros anteriores intactos y rechaza destinos incoherentes sin borrarlos', () => {
  const original = item()
  assert.deepEqual(parseItems([original])[0], original)
  const disposed = disposeItem(original, destination, actor, '2024-04-09')
  assert.deepEqual(parseItems([disposed])[0], disposed)
  const malformed = [
    { ...disposed, status: 'disponible' },
    { ...disposed, received: false },
    { ...disposed, disposition: { ...disposed.disposition, completedAt: '2024-02-30T12:00:00.000Z' } },
    { ...disposed, disposition: { ...disposed.disposition, completedAt: '2024-04-09T03:59:59.999Z' } },
    { ...disposed, disposition: { ...disposed.disposition, kind: 'remision_documentos' } },
    { ...disposed, disposition: { ...disposed.disposition, recipient: '' } },
    { ...disposed, category: 'dinero', itemType: 'efectivo' },
    { ...disposed, delivery: { recipient: 'Persona', proof: 'Marca', deliveredAt: '2024-02-01T12:00:00.000Z' } },
  ]
  const savedDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  } })
  try {
    saveItems([disposed])
    assert.deepEqual(loadItems()[0], disposed)
    for (const invalid of malformed) {
      const raw = JSON.stringify([invalid])
      values.set('ucsd-lost-found-demo-v1', raw)
      assert.throws(() => loadItems(), /formato inválido/)
      assert.equal(values.get('ucsd-lost-found-demo-v1'), raw)
    }
    assert.doesNotThrow(() => parseItems([{ ...disposed, disposition: { ...disposed.disposition, completedAt: '2024-04-09T04:00:00.000Z' } }]))
  } finally {
    if (savedDescriptor) Object.defineProperty(globalThis, 'localStorage', savedDescriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
