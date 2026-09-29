import test from 'node:test'
import assert from 'node:assert/strict'
import { canDispose, retentionInfo } from '../src/domain/catalog.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'

test('el día 90 inicia a las 04:00 UTC, medianoche de Santo Domingo', context => {
  let instant = Date.parse('2026-09-28T03:59:59Z')
  context.mock.method(Date, 'now', () => instant)
  const item = { ...SEED_ITEMS[0], foundDate: '2026-06-30', receivedDate: '2026-06-30' }
  assert.equal(retentionInfo(item)?.dueDate, '2026-09-28')
  assert.equal(canDispose(item), false)
  instant = Date.parse('2026-09-28T04:00:00Z')
  assert.equal(canDispose(item), true)
})
