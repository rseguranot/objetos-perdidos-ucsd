import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPilotExamples, planPilotImport } from '../src/data/pilot-examples.ts'
import { CATEGORY_LABELS, filterInternalItems, filterPublicCatalog, isCompatibleType, projectPublicItems } from '../src/domain/catalog.ts'
import { parseItems } from '../src/data/storage.ts'

const items = buildPilotExamples('2026-09-29')
const filters = { query: '', status: '', from: '', to: '' }
test('50 ejemplos válidos y públicos cubren las ocho categorías sin datos reservados', () => {
  assert.equal(parseItems(items).length, 50)
  assert.equal(new Set(items.map(item => item.id)).size, 50)
  assert.equal(new Set(items.map(item => item.code)).size, 50)
  assert.equal(items.find(item => item.title === 'Cargador de laptop')?.itemType, 'cargador')
  const projected = projectPublicItems(items)
  assert.equal(projected.length, 50)
  for (const category of Object.keys(CATEGORY_LABELS)) assert.ok(projected.some(item => item.category === category))
  for (const item of items) {
    assert.ok(isCompatibleType(item.category, item.itemType))
    assert.ok(item.description.includes('Objeto ficticio.'))
    assert.equal(item.delivery, undefined)
    assert.equal(item.disposition, undefined)
  }
  for (const item of projected) assert.deepEqual(Object.keys(item).sort(), ['id', 'code', 'title', 'category', 'itemType', 'description', 'foundDate', 'foundLocation', 'status'].sort())
  assert.ok(!JSON.stringify(projected).includes('RD$125'))
})
test('categoría y tipo producen los mismos resultados públicos e internos, y se combinan con fechas', () => {
  for (const item of items) {
    const internal = filterInternalItems(items, { ...filters, category: item.category, itemType: item.itemType, from: item.foundDate, to: item.foundDate, query: item.code })
    assert.deepEqual(internal.map(entry => entry.id), [item.id])
    const publicItems = filterPublicCatalog(projectPublicItems(items), { ...filters, category: item.category, itemType: item.itemType, location: '', from: item.foundDate, to: item.foundDate, query: item.code })
    assert.deepEqual(publicItems.map(entry => entry.id), [item.id])
  }
  assert.equal(filterInternalItems(items, { ...filters, category: 'llaves', itemType: 'laptop' }).length, 0)
  assert.equal(filterInternalItems(items, filters).length, 50)
})
test('importación reproducible omite registros existentes y aborta proyecciones huérfanas', () => {
  assert.deepEqual(buildPilotExamples('2026-09-29'), items)
  const ids = new Set(items.map(item => item.id))
  assert.equal(planPilotImport(items, ids, ids).pending.length, 0)
  // Un registro entregado tiene ficha privada pero carece de ficha pública: no republicarlo.
  assert.equal(planPilotImport(items, ids, new Set()).pending.length, 0)
  assert.equal(planPilotImport(items, new Set([items[0].id]), new Set([items[0].id])).pending.length, 49)
  assert.throws(() => planPilotImport(items, new Set(), new Set([items[0].id])), /sin registro interno/)
})
