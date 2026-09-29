import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Timestamp } from 'firebase/firestore'
import { decodeFirestoreRecord, encodeFirestoreRecord } from '../src/data/firestore-records.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'
import { parseItems } from '../src/data/storage.ts'

const disposed = SEED_ITEMS.find(item => item.disposition)!

test('native disposition dates decode to a valid domain record without changing the source', () => {
  const completedAt = Timestamp.fromDate(new Date(disposed.disposition!.completedAt))
  const raw = { ...disposed, disposition: { ...disposed.disposition!, completedAt }, updatedAt: completedAt }
  const decoded = decodeFirestoreRecord(raw)
  assert.deepEqual(parseItems([decoded])[0], disposed)
  assert.equal('updatedAt' in decoded, false)
  assert.equal(raw.disposition.completedAt, completedAt)
})

test('legacy ISO disposition dates remain readable', () => {
  assert.deepEqual(parseItems([decodeFirestoreRecord({ ...disposed })])[0], disposed)
})

test('new dispositions use server time while an existing disposition stays immutable', () => {
  const encoded = encodeFirestoreRecord(disposed)
  assert.notEqual((encoded.disposition as Record<string, unknown>).completedAt, disposed.disposition!.completedAt)
  assert.deepEqual(encodeFirestoreRecord(disposed, disposed), disposed)
  assert.equal(typeof disposed.disposition!.completedAt, 'string')
})
