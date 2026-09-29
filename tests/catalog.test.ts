import { test } from 'node:test'
import assert from 'node:assert/strict'
import { archiveItem, createItem, deliverItem, filterPublicCatalog, filterPublicItems, normalizeClassification, projectPublicItems, publishItem, typesForCategory, updateItem } from '../src/domain/catalog.ts'
import { SEED_ITEMS as ALL_SEED_ITEMS } from '../src/data/seed.ts'
import { loadItems, parseItems, resetItems, saveItems } from '../src/data/storage.ts'
import type { ItemDraft } from '../src/domain/types.ts'

const filters = { query: '', category: '', location: '', from: '', to: '' }
// Fixtures anteriores: verifican que las ubicaciones históricas siguen siendo consultables.
const legacyLocations = ['Biblioteca', 'Estacionamiento', 'Cafetería', 'Aulas', 'Pasillos', 'Área deportiva', 'Biblioteca', 'Patio central', 'Pasillos', 'Aulas', 'Área deportiva', 'Aulas']
const SEED_ITEMS = ALL_SEED_ITEMS.slice(0, 12).map((item, index) => ({ ...item, foundLocation: legacyLocations[index] }))
const draft: ItemDraft = {
  title: 'Estuche de audífonos', category: 'electronica', itemType: 'estuche', description: 'Estuche negro',
  foundDate: '2026-09-28', foundLocation: 'Biblioteca', receivedDate: '', custodyLocation: '',
  privateDetails: 'Marca secreta', received: false,
}
const actor = 'Responsable ficticio'

test('el catálogo devuelve únicamente una proyección pública explícita', () => {
  const publicItems = filterPublicItems(SEED_ITEMS, filters)
  assert.equal(publicItems.length, 8)
  for (const item of publicItems) {
    assert.deepEqual(Object.keys(item).sort(), ['id', 'code', 'title', 'category', 'itemType', 'description', 'foundDate', 'foundLocation', 'status'].sort())
    assert.equal(item.status, 'disponible')
  }
  assert.equal(filterPublicItems(SEED_ITEMS, { ...filters, query: 'pegatina' }).length, 0)
})

test('búsqueda ignora acentos y combina palabras, categoría, zona y fechas inclusivas', () => {
  assert.equal(filterPublicItems(SEED_ITEMS, { ...filters, query: 'AUDIFONOS negro' })[0]?.code, 'UCSD-2026-0001')
  assert.equal(filterPublicItems(SEED_ITEMS, { ...filters, category: 'electronica', location: 'Biblioteca', from: '2026-09-22', to: '2026-09-28' }).length, 2)
  assert.equal(filterPublicItems(SEED_ITEMS, { ...filters, from: '2026-09-28', to: '2026-09-28' }).length, 1)
  assert.equal(filterPublicItems(SEED_ITEMS, { ...filters, query: 'inexistente' }).length, 0)
})

test('publicación requiere recepción, custodia y fecha', () => {
  const created = createItem([], draft, actor)
  assert.equal(created.status, 'borrador')
  assert.throws(() => publishItem(created, actor), /recibió/)
  assert.throws(() => publishItem({ ...created, received: true }, actor), /custodia/)
  assert.throws(() => publishItem({ ...created, received: true, custodyLocation: 'Caja A' }, actor), /fecha de recepción/)
  const published = publishItem({ ...created, received: true, custodyLocation: 'Caja A', receivedDate: '2026-09-28' }, actor)
  assert.equal(published.status, 'disponible')
  assert.equal(created.history.length, 1)
  assert.equal(published.history.length, 2)
  assert.throws(() => publishItem(published, actor), /borrador/)
})

test('un disponible sin recepción válida tampoco se filtra como público', () => {
  const item = { ...SEED_ITEMS[0]!, received: false }
  assert.equal(filterPublicItems([item], filters).length, 0)
  assert.equal(filterPublicItems([{ ...SEED_ITEMS[0]!, foundDate: 'dato-corrupto' }], filters).length, 0)
  assert.equal(filterPublicItems([{ ...SEED_ITEMS[0]!, receivedDate: '2026-09-27' }], filters).length, 0)
})

test('entrega requiere receptor y prueba; entrega y archivo retiran la ficha pública', () => {
  const original = SEED_ITEMS[0]!
  assert.throws(() => deliverItem(original, { recipient: '', proof: 'detalle' }, actor), /receptor/)
  assert.throws(() => deliverItem(original, { recipient: 'Persona', proof: '' }, actor), /propiedad/)
  const delivered = deliverItem(original, { recipient: 'Persona ficticia', proof: 'Describió la marca', identityType: 'carnet_estudiante', photoEvidenceReference: 'ACTA-FICTICIA-001' }, actor)
  assert.equal(delivered.delivery?.recipient, 'Persona ficticia')
  assert.equal(filterPublicItems([delivered], filters).length, 0)
  assert.equal(original.status, 'disponible')
  assert.throws(() => deliverItem(delivered, { recipient: 'Persona', proof: 'Marca' }, actor), /disponible/)
  const archived = archiveItem(delivered, actor)
  assert.deepEqual(archived.delivery, delivered.delivery)
  assert.equal(filterPublicItems([archived], filters).length, 0)
  assert.throws(() => archiveItem(archived, actor), /ya está archivado/)
})

test('el código siguiente utiliza el mayor correlativo, incluso con huecos y registros archivados', () => {
  const year = new Date().getFullYear()
  const items = [{ ...SEED_ITEMS[0]!, code: `UCSD-${year}-0001` }, { ...SEED_ITEMS[11]!, code: `UCSD-${year}-0042` }]
  assert.equal(createItem(items, draft, actor).code, `UCSD-${year}-0043`)
})

test('edición preserva código y estado y bloquea cambios a registros cerrados', () => {
  const item = SEED_ITEMS[0]!
  const editable: ItemDraft = {
    title: item.title, category: item.category, itemType: item.itemType, description: item.description, foundDate: item.foundDate,
    foundLocation: item.foundLocation, receivedDate: item.receivedDate, custodyLocation: item.custodyLocation,
    privateDetails: item.privateDetails, received: item.received,
  }
  const updated = updateItem(item, { ...editable, title: 'Nombre corregido' }, actor)
  assert.equal(updated.code, item.code)
  assert.equal(updated.status, item.status)
  assert.equal(updated.history.length, item.history.length + 1)
  assert.throws(() => updateItem(item, { ...editable, received: false }, actor), /recibió/)
  assert.throws(() => updateItem(SEED_ITEMS[10]!, editable, actor), /editar/)
  assert.throws(() => updateItem(SEED_ITEMS[11]!, editable, actor), /editar/)
})

test('validación rechaza fechas inexistentes y recepción anterior al hallazgo', () => {
  assert.throws(() => createItem([], { ...draft, foundDate: '2026-02-30' }, actor), /hallazgo válida/)
  assert.throws(() => createItem([], { ...draft, receivedDate: '2026-09-27' }, actor), /anterior/)
})

test('categoría general y tipo controlado permiten buscar juntos o por separado', () => {
  const items = [
    { ...SEED_ITEMS[0]!, id: 'phone', code: 'PHONE', title: 'Samsung negro', itemType: 'celular' as const },
    { ...SEED_ITEMS[0]!, id: 'laptop', code: 'LAPTOP', title: 'Lenovo gris', itemType: 'laptop' as const },
  ]
  assert.equal(filterPublicItems(items, { ...filters, category: 'electronica' }).length, 2)
  assert.deepEqual(filterPublicItems(items, { ...filters, category: 'electronica', itemType: 'celular' }).map(item => item.id), ['phone'])
  assert.equal(filterPublicItems(items, { ...filters, query: 'electrónica celular' })[0]?.id, 'phone')
  assert.equal(filterPublicItems(items, { ...filters, category: 'ropa', itemType: 'celular' }).length, 0)
  assert.deepEqual(filterPublicCatalog(projectPublicItems(items), { ...filters, itemType: 'laptop' }).map(item => item.id), ['laptop'])
  assert.throws(() => createItem([], { ...draft, category: 'ropa', itemType: 'celular' }, actor), /tipo de objeto válido/)
  assert.throws(() => createItem([], { ...draft, itemType: 'etiqueta libre' as ItemDraft['itemType'] }, actor), /tipo de objeto válido/)
  for (const category of ['electronica', 'documentos', 'llaves', 'material_academico', 'bolsos_accesorios', 'ropa', 'dinero', 'otros'] as const) {
    assert.ok(typesForCategory(category).includes('otro'))
  }
})

test('migración legacy preserva identidades, datos reservados e historial sin sobrescribir el origen', () => {
  const cases = [
    ['celulares', 'Samsung negro', 'electronica', 'celular'],
    ['computadoras', 'Laptop Lenovo', 'electronica', 'laptop'],
    ['computadoras', 'Tableta Samsung', 'electronica', 'tableta'],
    ['mochilas', 'Mochila negra', 'bolsos_accesorios', 'mochila'],
    ['mochilas', 'Bulto rojo', 'bolsos_accesorios', 'bulto'],
    ['accesorios', 'Lentes con estuche', 'bolsos_accesorios', 'lentes'],
    ['electronica', 'Estuche de audífonos', 'electronica', 'estuche'],
    ['llaves', 'Juego de llaves', 'llaves', 'juego_llaves'],
    ['material_academico', 'Objeto sin identificar', 'material_academico', 'otro'],
  ]
  for (const [category, title, expectedCategory, expectedType] of cases) {
    const { itemType: discarded, ...legacyFields } = SEED_ITEMS[10]!
    void discarded
    const legacy = { ...legacyFields, category, title }
    const snapshot = structuredClone(legacy)
    const migrated = parseItems([legacy])[0]!
    assert.equal(migrated.category, expectedCategory)
    assert.equal(migrated.itemType, expectedType)
    assert.equal(migrated.id, legacy.id)
    assert.equal(migrated.code, legacy.code)
    assert.equal(migrated.privateDetails, legacy.privateDetails)
    assert.deepEqual(migrated.history, legacy.history)
    assert.deepEqual(migrated.delivery, legacy.delivery)
    assert.deepEqual(legacy, snapshot)
  }
  assert.equal(normalizeClassification('__proto__', 'Objeto'), null)
  assert.throws(() => parseItems([{ ...SEED_ITEMS[0]!, itemType: 'cuaderno' }]), /formato inválido/)
  assert.throws(() => parseItems([{ ...SEED_ITEMS[0]!, category: 'inexistente' }]), /formato inválido/)
})

test('almacenamiento conserva registros y restablece una copia independiente de la semilla', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  } })
  try {
    const initial = loadItems()
    initial[0]!.title = 'Título modificado'
    assert.notEqual(SEED_ITEMS[0]!.title, initial[0]!.title)
    saveItems(initial)
    assert.equal(loadItems()[0]!.title, 'Título modificado')
    assert.equal(resetItems()[0]!.title, SEED_ITEMS[0]!.title)
    const { itemType: previousType, ...oldRecord } = SEED_ITEMS[0]!
    void previousType
    const oldSaved = JSON.stringify([{ ...oldRecord, category: 'celulares', title: 'Celular ficticio', createdByUid: 'legacy-uid' }])
    values.set('ucsd-lost-found-demo-v1', oldSaved)
    assert.equal(loadItems()[0]!.category, 'electronica')
    assert.equal(loadItems()[0]!.itemType, 'celular')
    assert.equal(loadItems()[0]!.createdByUid, 'legacy-uid')
    assert.equal(values.get('ucsd-lost-found-demo-v1'), oldSaved)
    values.set('ucsd-lost-found-demo-v1', 'archivo dañado')
    assert.throws(() => loadItems(), /No se han eliminado/)
    assert.equal(values.get('ucsd-lost-found-demo-v1'), 'archivo dañado')
    values.set('ucsd-lost-found-demo-v1', JSON.stringify([{ id: 'incompleto' }]))
    assert.throws(() => loadItems(), /formato inválido/)
    values.set('ucsd-lost-found-demo-v1', JSON.stringify([SEED_ITEMS[0], SEED_ITEMS[0]]))
    assert.throws(() => loadItems(), /formato inválido/)
    const semanticallyInvalid = [
      { ...SEED_ITEMS[0]!, foundDate: 'dato-corrupto' },
      { ...SEED_ITEMS[0]!, foundDate: '2026-02-30' },
      { ...SEED_ITEMS[0]!, receivedDate: 'dato-corrupto' },
      { ...SEED_ITEMS[0]!, receivedDate: '2026-09-27' },
      { ...SEED_ITEMS[0]!, receivedDate: '' },
      { ...SEED_ITEMS[0]!, custodyLocation: ' ' },
      { ...SEED_ITEMS[0]!, received: false },
      { ...SEED_ITEMS[0]!, itemType: 'cuaderno' },
      { ...SEED_ITEMS[0]!, updatedByUid: 123 },
    ]
    for (const invalid of semanticallyInvalid) {
      const saved = JSON.stringify([invalid])
      values.set('ucsd-lost-found-demo-v1', saved)
      assert.throws(() => loadItems(), /formato inválido/)
      assert.equal(values.get('ucsd-lost-found-demo-v1'), saved)
    }
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
