import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMonthlyExamples } from '../src/data/monthly-examples.ts'
import { CATEGORY_LABELS, projectPublicItems } from '../src/domain/catalog.ts'
import { buildPublicIndex } from '../src/domain/search-index.ts'

test('ejemplos mensuales cubren ocho categorías sin fechas futuras ni IDs anteriores', () => {
  const items = buildMonthlyExamples('2026-10-04', 'owner-ficticio', 'Personal ficticio')
  assert.equal(items.length, 24)
  assert.equal(new Set(items.map(item => item.id)).size, 24)
  for (const category of Object.keys(CATEGORY_LABELS)) assert.equal(items.filter(item => item.category === category).length, 3)
  assert.ok(items.every(item => item.foundDate >= '2026-10-01' && item.foundDate <= '2026-10-04' && item.id.startsWith('demo-month-2026-10-')))
  assert.equal(projectPublicItems(items).length, 24)
  assert.ok(items.every(item => !item.delivery && !item.disposition && !buildPublicIndex(item).searchTerms.includes('ficticio')))
  assert.deepEqual(items, buildMonthlyExamples('2026-10-04', 'owner-ficticio', 'Personal ficticio'))
})
