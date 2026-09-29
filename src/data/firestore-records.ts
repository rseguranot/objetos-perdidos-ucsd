import { serverTimestamp, Timestamp } from 'firebase/firestore'
import type { LostItem } from '../domain/types.ts'

// The domain and local demo use ISO dates. Firestore owns the final disposition time.
export function decodeFirestoreRecord(raw: Record<string, unknown>): Record<string, unknown> {
  const record = { ...raw }
  delete record.updatedAt
  const disposition = record.disposition
  if (disposition && typeof disposition === 'object' && 'completedAt' in disposition && disposition.completedAt instanceof Timestamp) {
    record.disposition = { ...disposition, completedAt: disposition.completedAt.toDate().toISOString() }
  }
  return record
}

export function encodeFirestoreRecord(record: LostItem, previous?: LostItem): Record<string, unknown> {
  return record.disposition && !previous?.disposition
    ? { ...record, disposition: { ...record.disposition, completedAt: serverTimestamp() } }
    : { ...record }
}
