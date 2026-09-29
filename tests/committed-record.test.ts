import assert from 'node:assert/strict'
import { test } from 'node:test'
import { committedRecordMatches } from '../src/domain/records.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'

const proposal = { ...SEED_ITEMS.find(item => item.disposition)!, updatedByUid: 'fictitious-operator' }
const stored = { ...proposal, disposition: { ...proposal.disposition!, completedAt: '2026-09-29T12:01:07.250Z' } }

test('a retry acknowledges the exact saved operation with its authoritative disposition date', () => {
  assert.equal(committedRecordMatches(stored, proposal, true), true)
  assert.equal(committedRecordMatches(proposal, proposal, false), true)
  assert.equal(committedRecordMatches(stored, proposal, false), false)
})

test('a different operator, payload, recipient or history event is never acknowledged as our commit', () => {
  for (const changed of [
    { ...stored, updatedByUid: 'another-operator' },
    { ...stored, code: 'another-code' },
    { ...stored, description: 'Changed by another operation' },
    { ...stored, disposition: { ...stored.disposition, recipient: 'Another recipient' } },
    { ...stored, disposition: { ...stored.disposition, reference: 'Another reference' } },
    { ...stored, history: stored.history.map((event, i) => i === stored.history.length - 1 ? { ...event, id: 'different-operation' } : event) },
  ]) assert.equal(committedRecordMatches(changed, proposal, true), false)
})
