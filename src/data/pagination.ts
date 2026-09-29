export interface CursorPage<T, C> { items: T[]; cursor: C | null; hasMore: boolean }

/** Walk candidates until a complete page matches, then check whether another match exists. */
export async function collectPage<C, T>(
  fetchBatch: (after: C | null, size: number) => Promise<C[]>,
  matches: (candidate: C) => boolean,
  decode: (candidate: C) => T,
  after: C | null,
  pageSize = 25,
): Promise<CursorPage<T, C>> {
  const items: T[] = []
  let cursor = after
  while (items.length < pageSize) {
    const batch = await fetchBatch(cursor, pageSize)
    for (const candidate of batch) {
      cursor = candidate
      if (matches(candidate)) items.push(decode(candidate))
      if (items.length === pageSize) break
    }
    if (batch.length < pageSize) return { items, cursor, hasMore: false }
  }
  // A full batch may end exactly at the last matching record. Probe without
  // advancing the returned cursor, so the next page starts after its last item.
  let probe = cursor
  while (true) {
    const batch = await fetchBatch(probe, 1)
    if (!batch.length) return { items, cursor, hasMore: false }
    probe = batch[0]
    if (matches(probe)) return { items, cursor, hasMore: true }
  }
}
