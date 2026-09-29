import { collection, doc, documentId, getDoc, getDocs, limit, orderBy, query, startAfter, where, type QueryConstraint, type QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { decodeFirestoreRecord } from './firestore-records'
import { parseItems } from './storage'
import { searchWords } from '../domain/search-index'
import { normalizeClassification } from '../domain/catalog'
import type { CatalogFilters, InternalFilters, LostItem, PublicItem } from '../domain/types'
import type { Session } from '../domain/roles'
import { collectPage } from './pagination'

const PAGE_SIZE = 25
type Cursor = QueryDocumentSnapshot | null
export interface PageResult<T> { items: T[]; cursor: unknown | null; hasMore: boolean }

function database() { if (!db) throw new Error('Firebase no está configurado.'); return db }
function exactCode(value: string): boolean { return /^UCSD-[A-Z0-9-]+$/i.test(value.trim()) }
function matchingTerms(raw: Record<string, unknown>, terms: string[]): boolean {
  const indexed = raw.searchTerms
  return Array.isArray(indexed) && terms.every(term => indexed.includes(term))
}
function publicRecord(snapshot: QueryDocumentSnapshot): PublicItem {
  const value = snapshot.data()
  const classification = typeof value.category === 'string' && typeof value.title === 'string' ? normalizeClassification(value.category, value.title, value.itemType) : null
  if (!classification || snapshot.id !== value.id || value.status !== 'disponible' || !['id', 'code', 'title', 'description', 'foundDate', 'foundLocation'].every(key => typeof value[key] === 'string')) throw new Error('El catálogo remoto contiene un registro inválido.')
  return { id: value.id, code: value.code, title: value.title, ...classification, description: value.description, foundDate: value.foundDate, foundLocation: value.foundLocation, status: 'disponible' }
}
function privateRecord(snapshot: QueryDocumentSnapshot): LostItem {
  const value = decodeFirestoreRecord(snapshot.data())
  if (value.id !== snapshot.id) throw new Error('Registro remoto inválido.')
  return parseItems([value])[0]
}

export async function loadPrivateItem(id: string): Promise<LostItem> {
  const snapshot = await getDoc(doc(database(), 'privateItems', id))
  if (!snapshot.exists()) throw new Error('El registro ya no existe.')
  return privateRecord(snapshot)
}

async function page<T>(name: 'publicItems' | 'privateItems', constraints: QueryConstraint[], terms: string[], cursor: unknown | null, decode: (doc: QueryDocumentSnapshot) => T, sortField = 'foundDate'): Promise<PageResult<T>> {
  return collectPage<QueryDocumentSnapshot, T>(async (after, size) => {
    const q = query(collection(database(), name), ...constraints, orderBy(sortField, 'desc'), orderBy(documentId(), 'desc'), ...(after ? [startAfter(after)] : []), limit(size))
    return (await getDocs(q)).docs
  }, snapshot => !terms.length || matchingTerms(snapshot.data(), terms), decode, cursor as Cursor, PAGE_SIZE)
}

export function loadPublicPage(filters: CatalogFilters, cursor: unknown | null): Promise<PageResult<PublicItem>> {
  const constraints: QueryConstraint[] = []
  if (filters.category) constraints.push(where('category', '==', filters.category))
  if (filters.itemType) constraints.push(where('itemType', '==', filters.itemType))
  if (filters.location) constraints.push(where('buildingId', '==', filters.location))
  if (filters.from) constraints.push(where('foundDate', '>=', filters.from))
  if (filters.to) constraints.push(where('foundDate', '<=', filters.to))
  const words = searchWords(filters.query)
  if (exactCode(filters.query)) constraints.push(where('code', '==', filters.query.trim().toUpperCase()))
  else if (words.length) constraints.push(where('searchTerms', 'array-contains', words[0]))
  return page('publicItems', constraints, exactCode(filters.query) ? [] : words, cursor, publicRecord)
}

export function loadPrivatePage(session: Session, filters: InternalFilters, cursor: unknown | null): Promise<PageResult<LostItem>> {
  if (!session.role) throw new Error('Acceso no autorizado.')
  const constraints: QueryConstraint[] = []
  if (session.role === 'registro') constraints.push(where('createdByUid', '==', session.uid))
  if (filters.category) constraints.push(where('category', '==', filters.category))
  if (filters.itemType) constraints.push(where('itemType', '==', filters.itemType))
  if (filters.building) constraints.push(where('buildingId', '==', filters.building))
  if (filters.status) constraints.push(where('status', '==', filters.status))
  if (filters.from) constraints.push(where('foundDate', '>=', filters.from))
  if (filters.to) constraints.push(where('foundDate', '<=', filters.to))
  if (filters.disposition === 'donacion' || filters.disposition === 'remision_documentos') constraints.push(where('disposition.kind', '==', filters.disposition))
  if (filters.disposition === 'pendiente90') {
    const threshold = new Date(Date.now() - 4 * 60 * 60 * 1000)
    threshold.setUTCDate(threshold.getUTCDate() - 90)
    constraints.push(where('receivedDate', '<=', threshold.toISOString().slice(0, 10)), where('received', '==', true), where('deliveryDate', '==', ''), where('dispositionDate', '==', ''))
  }
  const words = searchWords(filters.query)
  if (exactCode(filters.query)) constraints.push(where('code', '==', filters.query.trim().toUpperCase()))
  else if (words.length) constraints.push(where('searchTerms', 'array-contains', words[0]))
  return page('privateItems', constraints, exactCode(filters.query) ? [] : words, cursor, privateRecord, filters.disposition === 'pendiente90' ? 'receivedDate' : 'foundDate')
}
