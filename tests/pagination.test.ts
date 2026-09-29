import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collectPage, type CursorPage } from '../src/data/pagination.ts'

type Record = { id: string; date: string; category: string; building: string; words: string[] }
const records: Record[] = Array.from({ length: 2501 }, (_, index) => ({
  id: String(index).padStart(5, '0'),
  date: `2026-09-${String(29 - Math.floor(index / 100)).padStart(2, '0')}`,
  category: index % 2 ? 'electronica' : 'documentos',
  building: index % 3 ? 'EAL' : 'EPC',
  words: index % 4 ? ['estuche', 'negro'] : ['estuche', 'azul'],
})).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

test('2,501 registros con fechas repetidas recorren todas las páginas sin duplicados', async () => {
  const fetchBatch = async (after: Record | null, size: number) => records.slice(after ? records.findIndex(item => item.id === after.id) + 1 : 0, after ? records.findIndex(item => item.id === after.id) + 1 + size : size)
  const seen: string[] = []
  let cursor: Record | null = null
  for (let page = 0; ; page++) {
    const result: CursorPage<string, Record> = await collectPage(fetchBatch, () => true, item => item.id, cursor)
    assert.ok(result.items.length <= 25)
    seen.push(...result.items)
    cursor = result.cursor
    if (!result.hasMore) break
    assert.ok(page < 101)
  }
  assert.equal(seen.length, 2501)
  assert.equal(new Set(seen).size, 2501)
  assert.deepEqual(seen, records.map(item => item.id))
})

test('filtros combinados y varias palabras siguen buscando hasta completar la página', async () => {
  const candidates = records.filter(item => item.category === 'electronica' && item.building === 'EAL' && item.date >= '2026-09-10')
  const expected = candidates.filter(item => ['estuche', 'negro'].every(word => item.words.includes(word))).map(item => item.id)
  const fetchBatch = async (after: Record | null, size: number) => {
    const offset = after ? candidates.findIndex(item => item.id === after.id) + 1 : 0
    return candidates.slice(offset, offset + size)
  }
  const seen: string[] = []
  let cursor: Record | null = null
  for (let page = 0; page < 100; page++) {
    const result: CursorPage<string, Record> = await collectPage(fetchBatch, item => ['estuche', 'negro'].every(word => item.words.includes(word)), item => item.id, cursor)
    seen.push(...result.items)
    cursor = result.cursor
    if (!result.hasMore) break
  }
  assert.deepEqual(seen, expected)
  assert.ok(seen.length > 25)
})
