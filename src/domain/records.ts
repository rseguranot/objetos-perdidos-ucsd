function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).toSorted(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, stable(entry)]))
  return value
}
// Firestore puede devolver el mismo mapa con otro orden de claves.
export function recordsEqual(a: unknown, b: unknown): boolean { return JSON.stringify(stable(a)) === JSON.stringify(stable(b)) }
