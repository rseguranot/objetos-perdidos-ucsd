import { CATEGORY_LABELS, isCompatibleType, normalizeClassification, retentionInfo, STATUS_LABELS } from '../domain/catalog.ts'
import type { LostItem } from '../domain/types.ts'
import { SEED_ITEMS } from './seed.ts'

const STORAGE_KEY = 'ucsd-lost-found-demo-v1'

function freshSeed(): LostItem[] {
  return structuredClone(SEED_ITEMS)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function validInstant(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value
}

function validItem(value: unknown): value is LostItem {
  if (!isRecord(value)) return false
  const fields = ['id', 'code', 'title', 'description', 'foundDate', 'foundLocation', 'receivedDate', 'custodyLocation', 'privateDetails']
  if (!fields.every(field => typeof value[field] === 'string')) return false
  if (typeof value.received !== 'boolean' || typeof value.category !== 'string' || !Object.hasOwn(CATEGORY_LABELS, value.category)) return false
  if (!isCompatibleType(value.category as LostItem['category'], value.itemType)) return false
  if (['createdByUid', 'updatedByUid'].some(field => value[field] !== undefined && typeof value[field] !== 'string')) return false
  if (typeof value.status !== 'string' || !Object.hasOwn(STATUS_LABELS, value.status)) return false
  if (!validDate(value.foundDate)) return false
  if (value.receivedDate !== '' && (!validDate(value.receivedDate) || value.receivedDate < value.foundDate)) return false
  if (value.status === 'disponible' && (!value.received || !validDate(value.receivedDate) || typeof value.custodyLocation !== 'string' || !value.custodyLocation.trim())) return false
  if (!Array.isArray(value.history) || !value.history.every(entry => isRecord(entry) && ['id', 'at', 'actor', 'action'].every(field => typeof entry[field] === 'string'))) return false
  const delivery = value.delivery
  if (delivery !== undefined && (!isRecord(delivery) || !['recipient', 'proof', 'deliveredAt'].every(field => typeof delivery[field] === 'string'))) return false
  if (isRecord(delivery) && (delivery.identityType !== undefined || delivery.photoEvidenceReference !== undefined || delivery.evidenceId !== undefined)) {
    if (!['documento_identidad', 'carnet_estudiante'].includes(String(delivery.identityType))) return false
    if (delivery.evidenceId !== undefined) {
      if (typeof delivery.evidenceId !== 'string' || !/^[a-zA-Z0-9_-]{20,80}$/.test(delivery.evidenceId) || delivery.photoEvidenceReference !== undefined) return false
    } else if (typeof delivery.photoEvidenceReference !== 'string' || !delivery.photoEvidenceReference.trim() || delivery.photoEvidenceReference.length > 300) return false
  }
  const disposition = value.disposition
  if (disposition !== undefined) {
    if (!isRecord(disposition) || !['kind', 'recipient', 'reference', 'completedAt'].every(field => typeof disposition[field] === 'string')) return false
    if (value.status !== 'archivado' || delivery !== undefined || !value.received || !validDate(value.receivedDate) || value.category === 'dinero') return false
    if (disposition.kind !== (value.category === 'documentos' ? 'remision_documentos' : 'donacion')) return false
    if (typeof disposition.recipient !== 'string' || !disposition.recipient.trim() || disposition.recipient.length > 300 || typeof disposition.reference !== 'string' || !disposition.reference.trim() || disposition.reference.length > 2000 || !validInstant(disposition.completedAt)) return false
    // El plazo de UCSD empieza al inicio del día local de Santo Domingo (UTC-4).
    const effectiveDate = new Date(Date.parse(disposition.completedAt) - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
    if (!retentionInfo(value as unknown as LostItem, effectiveDate)?.overdue) return false
  }
  return true
}

export function loadItems(): LostItem[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === null) return freshSeed()
  let parsed: unknown
  try { parsed = JSON.parse(saved) } catch { throw new Error('Los datos locales no se pueden leer. No se han eliminado; puedes restablecer la demo explícitamente.') }
  return parseItems(parsed)
}

export function parseItems(raw: unknown): LostItem[] {
  let parsed = raw
  // Migra en memoria. El contenido original permanece intacto si algún registro es inválido.
  if (Array.isArray(parsed)) parsed = parsed.map(value => {
    if (!isRecord(value) || typeof value.category !== 'string' || typeof value.title !== 'string') return value
    const classification = normalizeClassification(value.category, value.title, value.itemType)
    return classification ? { ...value, ...classification } : value
  })
  if (!Array.isArray(parsed) || !parsed.every(validItem) || new Set(parsed.map(item => item.id)).size !== parsed.length || new Set(parsed.map(item => item.code)).size !== parsed.length) {
    throw new Error('Los datos locales tienen un formato inválido. No se han eliminado; puedes restablecer la demo explícitamente.')
  }
  return parsed
}

export function saveItems(items: LostItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function resetItems(): LostItem[] {
  const items = freshSeed()
  saveItems(items)
  return items
}
