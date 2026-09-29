import { CAMPUS_NAMES, matchesBuilding } from './campus.ts'
import type { Category, CatalogFilters, HistoryEntry, IdentityType, InternalFilters, ItemDraft, ItemStatus, ItemType, LostItem, PublicItem } from './types.ts'

export const CATEGORY_LABELS: Record<Category, string> = {
  electronica: 'Electrónica',
  documentos: 'Documentos',
  llaves: 'Llaves',
  material_academico: 'Material académico',
  ropa: 'Ropa',
  bolsos_accesorios: 'Bolsos y accesorios',
  dinero: 'Dinero',
  otros: 'Otros',
}

export const TYPE_LABELS: Record<ItemType, string> = {
  celular: 'Celular', laptop: 'Laptop', tableta: 'Tableta', audifonos: 'Audífonos',
  estuche: 'Estuche de audífonos', cargador: 'Cargador', cable: 'Cable', calculadora: 'Calculadora', dispositivo: 'Dispositivo electrónico',
  identificacion: 'Identificación', tarjeta: 'Tarjeta', documento: 'Documento', sobre: 'Sobre con documentos', carpeta: 'Carpeta',
  llave: 'Llave', juego_llaves: 'Juego de llaves', llavero: 'Llavero',
  cuaderno: 'Cuaderno', libro: 'Libro', apuntes: 'Apuntes', utiles: 'Útiles de estudio',
  mochila: 'Mochila', bulto: 'Bulto', bolso: 'Bolso', lentes: 'Lentes', botella: 'Botella', paraguas: 'Paraguas', reloj: 'Reloj', joya: 'Joya',
  chaqueta: 'Chaqueta', gorra: 'Gorra', camisa: 'Camisa', calzado: 'Calzado', prenda: 'Prenda de vestir',
  efectivo: 'Efectivo', monedero: 'Monedero', otro: 'Otro',
}

const CATEGORY_TYPES: Record<Category, readonly ItemType[]> = {
  electronica: ['celular', 'laptop', 'tableta', 'estuche', 'audifonos', 'cargador', 'cable', 'calculadora', 'dispositivo', 'otro'],
  documentos: ['identificacion', 'tarjeta', 'documento', 'sobre', 'carpeta', 'otro'],
  llaves: ['llavero', 'juego_llaves', 'llave', 'otro'],
  material_academico: ['cuaderno', 'libro', 'apuntes', 'carpeta', 'utiles', 'otro'],
  bolsos_accesorios: ['mochila', 'bulto', 'bolso', 'lentes', 'botella', 'paraguas', 'reloj', 'joya', 'monedero', 'otro'],
  ropa: ['chaqueta', 'gorra', 'camisa', 'calzado', 'prenda', 'otro'],
  dinero: ['efectivo', 'otro'],
  otros: ['otro'],
}

export function typesForCategory(category: Category): ItemType[] { return [...CATEGORY_TYPES[category]] }

export function isCompatibleType(category: Category, itemType: unknown): itemType is ItemType {
  return typeof itemType === 'string' && CATEGORY_TYPES[category].includes(itemType as ItemType)
}

// Solo se utilizan al leer registros de la primera versión. No alteran su código, historial ni datos internos.
const LEGACY_CATEGORIES: Record<string, Category> = { celulares: 'electronica', computadoras: 'electronica', mochilas: 'bolsos_accesorios', accesorios: 'bolsos_accesorios' }
const TYPE_HINTS: Partial<Record<ItemType, RegExp>> = {
  estuche: /estuche/, celular: /celular|telefono|smartphone|movil/, laptop: /laptop|portatil|computadora|ordenador/, tableta: /tableta|tablet|ipad/,
  audifonos: /audifono|auricular/, cargador: /cargador/, cable: /cable/, calculadora: /calculadora/, dispositivo: /dispositivo/,
  identificacion: /identificacion|cedula|carnet|pasaporte/, tarjeta: /tarjeta/, sobre: /sobre/, carpeta: /carpeta/, documento: /documento/,
  juego_llaves: /juego.*llave|llaves/, llave: /llave/, llavero: /llavero/,
  cuaderno: /cuaderno|libreta/, libro: /libro/, apuntes: /apuntes/, utiles: /lapiz|boligrafo|regla|utiles/,
  mochila: /mochila/, bulto: /bulto/, bolso: /bolso|cartera/, lentes: /lentes|gafas/, botella: /botella|termo/, paraguas: /paraguas|sombrilla/,
  reloj: /reloj/, joya: /anillo|cadena|joya|pulsera|arete/, monedero: /monedero|billetera/,
  chaqueta: /chaqueta|abrigo|sueter/, gorra: /gorra|sombrero/, camisa: /camisa|camiseta/, calzado: /zapato|tenis|calzado/, prenda: /prenda/,
  efectivo: /dinero|efectivo|billete|moneda/,
}

export function normalizeClassification(category: string, title: string, itemType?: unknown): { category: Category; itemType: ItemType } | null {
  const mapped = Object.hasOwn(CATEGORY_LABELS, category) ? category as Category : Object.hasOwn(LEGACY_CATEGORIES, category) ? LEGACY_CATEGORIES[category] : undefined
  if (!mapped) return null
  if (itemType !== undefined) return isCompatibleType(mapped, itemType) ? { category: mapped, itemType } : null
  const text = normalize(title)
  const inferred = typesForCategory(mapped).find(type => TYPE_HINTS[type]?.test(text))
  const fallback: ItemType = category === 'celulares' ? 'celular' : 'otro'
  return { category: mapped, itemType: inferred ?? fallback }
}

// Edificios y lugares publicados en la guía oficial del campus UCSD.
export const LOCATIONS = CAMPUS_NAMES
export const STATUS_LABELS: Record<ItemStatus, string> = {
  borrador: 'Borrador', disponible: 'Disponible', entregado: 'Entregado', archivado: 'Archivado',
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const RETENTION_DAYS = 90
const DAY_MS = 86_400_000

function todayLocalISO(): string {
  // La custodia sigue el calendario de Santo Domingo, aunque el cliente esté en otra zona.
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function retentionInfo(item: LostItem, onDate = todayLocalISO()): { dueDate: string; elapsedDays: number; remainingDays: number; overdue: boolean } | null {
  if (!item.received || !isDate(item.receivedDate) || !isDate(onDate)) return null
  const received = Date.parse(`${item.receivedDate}T00:00:00Z`)
  const elapsedDays = Math.floor((Date.parse(`${onDate}T00:00:00Z`) - received) / DAY_MS)
  return {
    dueDate: new Date(received + RETENTION_DAYS * DAY_MS).toISOString().slice(0, 10),
    elapsedDays, remainingDays: Math.max(0, RETENTION_DAYS - elapsedDays), overdue: elapsedDays >= RETENTION_DAYS,
  }
}

export function needsRetentionReview(item: LostItem, onDate = todayLocalISO()): boolean {
  return Boolean(retentionInfo(item, onDate)?.overdue && ['borrador', 'disponible', 'archivado'].includes(item.status) && !item.delivery && !item.disposition)
}

export function canDispose(item: LostItem, onDate = todayLocalISO()): boolean {
  return needsRetentionReview(item, onDate) && item.category !== 'dinero'
}

export function disposeItem(item: LostItem, disposition: Pick<NonNullable<LostItem['disposition']>, 'kind' | 'recipient' | 'reference'>, actor: string, onDate?: string): LostItem {
  if (item.delivery || item.status === 'entregado') throw new Error('Un objeto entregado no puede recibir otro destino.')
  if (item.disposition) throw new Error('El destino final ya fue registrado y no se puede modificar.')
  if (item.category === 'dinero') throw new Error('El dinero requiere un protocolo especial pendiente de aprobación.')
  if (!canDispose(item, onDate)) throw new Error('Confirma la recepción y espera 90 días desde esa fecha antes de registrar el destino.')
  const kind = item.category === 'documentos' ? 'remision_documentos' : 'donacion'
  if (disposition.kind !== kind) throw new Error(item.category === 'documentos' ? 'Los documentos requieren remisión; no se donan.' : 'Para esta categoría corresponde registrar una donación.')
  const recipient = disposition.recipient.trim()
  const reference = disposition.reference.trim()
  if (!recipient || !reference) throw new Error('Indica el destinatario y la referencia o constancia del destino.')
  if (recipient.length > 300 || reference.length > 2000) throw new Error('El destinatario admite hasta 300 caracteres y la referencia hasta 2000.')
  const completedAt = onDate === undefined ? new Date().toISOString() : `${onDate}T12:00:00.000Z`
  return withHistory({ ...item, status: 'archivado', disposition: { kind, recipient, reference, completedAt } }, kind === 'donacion' ? 'Donación registrada tras el plazo propuesto de 90 días' : 'Remisión de documentos registrada tras el plazo propuesto de 90 días', actor)
}

export function filterInternalItems(items: LostItem[], filters: InternalFilters, onDate?: string): LostItem[] {
  if ((filters.from && !isDate(filters.from)) || (filters.to && !isDate(filters.to)) || (filters.from && filters.to && filters.from > filters.to)) return []
  const words = normalize(filters.query).split(/\s+/).filter(Boolean)
  return items.filter(item => {
    if (!isDate(item.foundDate)) return false
    if (filters.status && item.status !== filters.status) return false
    if (filters.category && item.category !== filters.category) return false
    if (filters.itemType && item.itemType !== filters.itemType) return false
    if (filters.building && !matchesBuilding(item.foundLocation, filters.building)) return false
    if (filters.from && item.foundDate < filters.from) return false
    if (filters.to && item.foundDate > filters.to) return false
    if (filters.disposition === 'pendiente90' && !needsRetentionReview(item, onDate)) return false
    if (filters.disposition && filters.disposition !== 'pendiente90' && item.disposition?.kind !== filters.disposition) return false
    const text = normalize(`${item.code} ${item.title} ${item.description} ${item.foundLocation} ${item.custodyLocation} ${item.privateDetails} ${CATEGORY_LABELS[item.category]} ${TYPE_LABELS[item.itemType]} ${item.disposition?.recipient ?? ''} ${item.disposition?.reference ?? ''} ${item.delivery?.recipient ?? ''}`)
    return words.every(word => text.includes(word))
  }).sort((a, b) => b.foundDate.localeCompare(a.foundDate) || b.code.localeCompare(a.code))
}

function validateDraft(draft: ItemDraft): ItemDraft {
  if (!Object.hasOwn(CATEGORY_LABELS, draft.category)) throw new Error('Selecciona una categoría válida.')
  if (!isCompatibleType(draft.category, draft.itemType)) throw new Error('Selecciona un tipo de objeto válido para la categoría.')
  const clean: ItemDraft = {
    title: draft.title, category: draft.category, itemType: draft.itemType, description: draft.description,
    foundDate: draft.foundDate, foundLocation: draft.foundLocation,
    receivedDate: draft.receivedDate, custodyLocation: draft.custodyLocation,
    privateDetails: draft.privateDetails, received: draft.received,
  }
  const fields = ['title', 'description', 'foundLocation', 'custodyLocation', 'privateDetails', 'foundDate', 'receivedDate'] as const
  for (const field of fields) {
    if (typeof clean[field] !== 'string') throw new Error('El registro contiene un campo de texto inválido.')
    clean[field] = clean[field].trim()
  }
  const limits = { title: 160, description: 2000, foundLocation: 300, custodyLocation: 300, privateDetails: 4000 } as const
  const labels = { title: 'El nombre', description: 'La descripción', foundLocation: 'El lugar del hallazgo', custodyLocation: 'La ubicación de custodia', privateDetails: 'Las características reservadas' }
  for (const field of Object.keys(limits) as (keyof typeof limits)[]) {
    if (clean[field].length > limits[field]) throw new Error(`${labels[field]} admite hasta ${limits[field]} caracteres.`)
  }
  if (!clean.title || !clean.description || !clean.foundLocation) throw new Error('Completa el objeto, la descripción y el lugar del hallazgo.')
  if (!isDate(clean.foundDate)) throw new Error('Indica una fecha de hallazgo válida.')
  if (typeof clean.received !== 'boolean') throw new Error('Indica si se confirmó la recepción.')
  if (clean.receivedDate && !isDate(clean.receivedDate)) throw new Error('Indica una fecha de recepción válida.')
  if (clean.receivedDate && clean.receivedDate < clean.foundDate) throw new Error('La recepción no puede ser anterior al hallazgo.')
  if (clean.received) receptionConfirmed(clean)
  return clean
}

function receptionConfirmed(draft: ItemDraft): void {
  if (!draft.received) throw new Error('Confirma que el decanato recibió el objeto antes de publicarlo.')
  if (!draft.custodyLocation.trim()) throw new Error('Indica la ubicación de custodia al confirmar recepción.')
  if (!draft.receivedDate || !isDate(draft.receivedDate)) throw new Error('Indica la fecha de recepción al confirmar recepción.')
}

function history(action: string, actor: string): HistoryEntry {
  if (!actor.trim()) throw new Error('Identifica al responsable de la operación.')
  return { id: crypto.randomUUID(), at: new Date().toISOString(), actor: actor.trim(), action }
}

function withHistory(item: LostItem, action: string, actor: string): LostItem {
  return { ...item, history: [...item.history.map(entry => ({ ...entry })), history(action, actor)] }
}

export function projectPublicItems(items: LostItem[]): PublicItem[] {
  return items.filter(item => item.status === 'disponible' && !item.delivery && !item.disposition && item.received && item.custodyLocation.trim() && isDate(item.foundDate) && isDate(item.receivedDate) && item.receivedDate >= item.foundDate).map(item => ({
    id: item.id, code: item.code, title: item.title, category: item.category, itemType: item.itemType,
    description: item.description, foundDate: item.foundDate, foundLocation: item.foundLocation, status: 'disponible',
  }))
}

export function filterPublicCatalog(items: PublicItem[], filters: CatalogFilters): PublicItem[] {
  const words = normalize(filters.query).split(/\s+/).filter(Boolean)
  return items.filter(item => {
    if (item.status !== 'disponible' || !isDate(item.foundDate)) return false
    if (filters.category && item.category !== filters.category) return false
    if (filters.itemType && item.itemType !== filters.itemType) return false
    if (filters.location && !matchesBuilding(item.foundLocation, filters.location) && item.foundLocation !== filters.location) return false
    if (filters.from && item.foundDate < filters.from) return false
    if (filters.to && item.foundDate > filters.to) return false
    const text = normalize(`${item.code} ${item.title} ${item.description} ${CATEGORY_LABELS[item.category]} ${TYPE_LABELS[item.itemType]} ${item.foundLocation}`)
    return words.every(word => text.includes(word))
  }).sort((a, b) => b.foundDate.localeCompare(a.foundDate) || b.code.localeCompare(a.code)).map(item => ({
    id: item.id, code: item.code, title: item.title, category: item.category, itemType: item.itemType,
    description: item.description, foundDate: item.foundDate, foundLocation: item.foundLocation,
    status: 'disponible',
  }))
}

export function filterPublicItems(items: LostItem[], filters: CatalogFilters): PublicItem[] {
  return filterPublicCatalog(projectPublicItems(items), filters)
}

export function createItem(items: LostItem[], draft: ItemDraft, actor: string): LostItem {
  const clean = validateDraft(draft)
  const year = new Date().getFullYear()
  const prefix = `UCSD-${year}-`
  const largest = items.reduce((max, item) => {
    if (!item.code.startsWith(prefix)) return max
    const suffix = item.code.slice(prefix.length)
    return /^\d+$/.test(suffix) ? Math.max(max, Number(suffix)) : max
  }, 0)
  return { ...clean, id: crypto.randomUUID(), code: `${prefix}${String(largest + 1).padStart(4, '0')}`, status: 'borrador', history: [history('Registro creado', actor)] }
}

export function updateItem(item: LostItem, draft: ItemDraft, actor: string): LostItem {
  if (item.status !== 'borrador' && item.status !== 'disponible') throw new Error('Solo se pueden editar objetos en borrador o disponibles.')
  const clean = validateDraft(draft)
  if (item.status === 'disponible') receptionConfirmed(clean)
  return withHistory({ ...item, ...clean }, 'Registro actualizado', actor)
}

export function publishItem(item: LostItem, actor: string): LostItem {
  if (item.status !== 'borrador') throw new Error('Solo se puede publicar un objeto en borrador.')
  const clean = validateDraft(item)
  receptionConfirmed(clean)
  return withHistory({ ...item, ...clean, status: 'disponible' }, 'Recepción confirmada y objeto publicado', actor)
}

export function deliverItem(item: LostItem, delivery: { recipient: string; proof: string; identityType?: IdentityType; photoEvidenceReference?: string }, actor: string): LostItem {
  if (item.status !== 'disponible') throw new Error('Solo se puede entregar un objeto disponible.')
  if (!delivery.recipient.trim() || !delivery.proof.trim()) throw new Error('Indica el receptor y cómo se comprobó la propiedad.')
  if (delivery.recipient.trim().length > 300) throw new Error('El receptor admite hasta 300 caracteres.')
  if (delivery.proof.trim().length > 2000) throw new Error('La prueba de propiedad admite hasta 2000 caracteres.')
  if (!['documento_identidad', 'carnet_estudiante'].includes(delivery.identityType ?? '')) throw new Error('Indica el documento de identidad o carné de estudiante verificado.')
  const photoEvidenceReference = delivery.photoEvidenceReference?.trim() ?? ''
  if (!photoEvidenceReference || photoEvidenceReference.length > 300) throw new Error('Indica la referencia de la evidencia fotográfica externa (hasta 300 caracteres).')
  return withHistory({ ...item, status: 'entregado', delivery: {
    recipient: delivery.recipient.trim(), proof: delivery.proof.trim(), deliveredAt: new Date().toISOString(),
    identityType: delivery.identityType, photoEvidenceReference,
  } }, 'Objeto entregado; propiedad e identidad comprobadas y evidencia externa registrada', actor)
}

export function archiveItem(item: LostItem, actor: string): LostItem {
  if (item.status === 'archivado') throw new Error('Este objeto ya está archivado.')
  return withHistory({ ...item, status: 'archivado' }, 'Registro archivado', actor)
}
