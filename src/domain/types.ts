export type Category =
  | 'electronica'
  | 'documentos'
  | 'llaves'
  | 'material_academico'
  | 'ropa'
  | 'bolsos_accesorios'
  | 'dinero'
  | 'otros'
export type ItemType =
  | 'celular' | 'laptop' | 'tableta' | 'audifonos' | 'estuche' | 'cargador' | 'cable' | 'calculadora' | 'dispositivo'
  | 'identificacion' | 'tarjeta' | 'documento' | 'sobre' | 'carpeta'
  | 'llave' | 'juego_llaves' | 'llavero'
  | 'cuaderno' | 'libro' | 'apuntes' | 'utiles'
  | 'mochila' | 'bulto' | 'bolso' | 'lentes' | 'botella' | 'paraguas' | 'reloj' | 'joya'
  | 'chaqueta' | 'gorra' | 'camisa' | 'calzado' | 'prenda'
  | 'efectivo' | 'monedero' | 'otro'
export type ItemStatus = 'borrador' | 'disponible' | 'entregado' | 'archivado'
export type IdentityType = 'documento_identidad' | 'carnet_estudiante'
export interface DeliveryInput {
  recipient: string
  proof: string
  identityType: IdentityType
  photoEvidenceReference: string
}

export interface HistoryEntry {
  id: string
  at: string
  actor: string
  action: string
}

export interface LostItem {
  id: string
  code: string
  title: string
  category: Category
  itemType: ItemType
  description: string
  foundDate: string
  foundLocation: string
  receivedDate: string
  custodyLocation: string
  privateDetails: string
  received: boolean
  status: ItemStatus
  history: HistoryEntry[]
  createdByUid?: string
  updatedByUid?: string
  // Optional evidence fields preserve historical deliveries; new deliveries require both.
  delivery?: { recipient: string; proof: string; deliveredAt: string; identityType?: IdentityType; photoEvidenceReference?: string }
  disposition?: { kind: 'donacion' | 'remision_documentos'; recipient: string; reference: string; completedAt: string }
}

export type ItemDraft = Omit<LostItem, 'id' | 'code' | 'status' | 'history' | 'delivery' | 'disposition' | 'createdByUid' | 'updatedByUid'>
export type PublicItem = Pick<LostItem, 'id' | 'code' | 'title' | 'category' | 'itemType' | 'description' | 'foundDate' | 'foundLocation'> & { status: 'disponible' }

export interface CatalogFilters {
  query: string
  category: string
  itemType?: string
  location: string
  from: string
  to: string
}

export interface InternalFilters {
  query: string
  status: string
  from: string
  to: string
  disposition?: '' | 'donacion' | 'remision_documentos' | 'pendiente90'
}
