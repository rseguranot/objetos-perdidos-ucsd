import { CATEGORY_LABELS, TYPE_LABELS } from './catalog.ts'
import { splitFoundLocation } from './campus.ts'
import type { LostItem, PublicItem } from './types.ts'

type PublicFields = Pick<PublicItem, 'code' | 'title' | 'description' | 'foundLocation' | 'category' | 'itemType'>
type PrivateFields = PublicFields & Pick<LostItem, 'custodyLocation' | 'privateDetails' | 'delivery' | 'disposition'>

export function normalizeSearchWords(input: string): string[] {
  return [...new Set(input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])]
}

export const searchWords = normalizeSearchWords

export function buildPublicIndex(item: PublicFields): { buildingId: string; searchTerms: string[] } {
  const buildingId = splitFoundLocation(item.foundLocation).building
  return {
    buildingId,
    searchTerms: normalizeSearchWords(`${item.code} ${item.title} ${item.description} ${item.foundLocation} ${CATEGORY_LABELS[item.category]} ${TYPE_LABELS[item.itemType]}`),
  }
}

function localEventDate(instant: string | undefined): string {
  if (!instant || Number.isNaN(Date.parse(instant))) return ''
  return new Date(Date.parse(instant) - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function buildPrivateIndex(item: PrivateFields): { buildingId: string; publicSearchTerms: string[]; searchTerms: string[]; deliveryDate: string; dispositionDate: string } {
  const published = buildPublicIndex(item)
  return {
    buildingId: published.buildingId,
    publicSearchTerms: published.searchTerms,
    searchTerms: [...new Set([...published.searchTerms, ...normalizeSearchWords(`${item.custodyLocation} ${item.privateDetails} ${item.delivery?.recipient ?? ''} ${item.disposition?.recipient ?? ''} ${item.disposition?.reference ?? ''}`)])],
    deliveryDate: localEventDate(item.delivery?.deliveredAt),
    dispositionDate: localEventDate(item.disposition?.completedAt),
  }
}
