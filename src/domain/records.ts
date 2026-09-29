import type { LostItem } from './types.ts'

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).toSorted(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, stable(entry)]))
  return value
}
// Firestore puede devolver el mismo mapa con otro orden de claves.
export function recordsEqual(a: unknown, b: unknown): boolean { return JSON.stringify(stable(a)) === JSON.stringify(stable(b)) }

// A commit response can be lost after the server durably saved the operation.
// The complete proposed record, including its unique history event, must match.
// Only a newly created disposition has a date replaced by the server timestamp.
export function committedRecordMatches(current: LostItem, proposed: LostItem, serverDispositionDate: boolean): boolean {
  const expected = serverDispositionDate && proposed.disposition && current.disposition
    ? { ...proposed, disposition: { ...proposed.disposition, completedAt: current.disposition.completedAt } }
    : proposed
  return recordsEqual(current, expected)
}
