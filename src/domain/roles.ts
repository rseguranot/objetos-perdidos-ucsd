import type { LostItem } from './types.ts'
import { canDispose, retentionInfo } from './catalog.ts'
import { recordsEqual } from './records.ts'

export type Role = 'developer' | 'admin' | 'registro' | 'decanato'
export const DEVELOPER_EMAIL = 'rsegura20250554@ucsd.edu.do'
export const ASSIGNABLE_ROLES: Exclude<Role, 'developer'>[] = ['admin', 'registro', 'decanato']
export interface AccessEntry { email: string; role: Role; active: boolean }
export interface Session { uid: string; email: string; verified: boolean; role: Role | null }
export const ROLE_LABELS: Record<Role, string> = { developer: 'Developer', admin: 'Administrador', registro: 'Registro de hallazgos', decanato: 'Decanato' }
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  developer: 'Rol superior reservado al responsable del desarrollo. Realiza todas las operaciones y gestiona los accesos. No se asigna ni modifica desde esta aplicación.',
  admin: 'Administra accesos y realiza todas las operaciones de objetos.',
  registro: 'Registra hallazgos y edita sus propios borradores. No confirma recepción ni publica.',
  decanato: 'Registra, confirma recepción y custodia, publica, entrega y archiva objetos.',
}
export function institutionalEmail(value: string): string {
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+=?^_`{|}~-]+@ucsd\.edu\.do$/.test(email)) throw new Error('Introduce un correo válido de @ucsd.edu.do.')
  return email
}
export function isRole(value: unknown): value is Role { return value === 'developer' || value === 'admin' || value === 'registro' || value === 'decanato' }
export function isDeveloper(session: Session): boolean { return session.verified && session.role === 'developer' && session.email.toLowerCase() === DEVELOPER_EMAIL }
export function isProtectedAccess(entry: Pick<AccessEntry, 'email' | 'role'>): boolean { return entry.email.trim().toLowerCase() === DEVELOPER_EMAIL || entry.role === 'developer' }
export function canReceive(session: Session): boolean { return isDeveloper(session) || (session.verified && (session.role === 'admin' || session.role === 'decanato')) }
export function canManageRoles(session: Session): boolean { return isDeveloper(session) || (session.verified && session.role === 'admin') }
export function canRegister(session: Session): boolean { return isDeveloper(session) || (session.verified && (session.role === 'admin' || session.role === 'decanato' || session.role === 'registro')) }
export function canEdit(session: Session, item: LostItem): boolean {
  return canRegister(session) && !item.disposition && !item.delivery && (item.status === 'borrador' || item.status === 'disponible') && (canReceive(session) || (item.status === 'borrador' && item.createdByUid === session.uid && !item.received && !item.receivedDate && !item.custodyLocation))
}
// Esta comprobación mejora la interfaz. Firestore vuelve a autorizar cada escritura.
export function authorizeItemChange(session: Session, previous: LostItem | undefined, next: LostItem): void {
  if (!canRegister(session)) throw new Error('No tienes permiso para registrar objetos.')
  if (!previous) {
    if (next.status !== 'borrador' || next.disposition || next.delivery) throw new Error('Los hallazgos nuevos deben comenzar como borrador, sin entrega ni destino final.')
  } else {
    if (next.id !== previous.id || next.code !== previous.code) throw new Error('No se puede cambiar la identidad del registro.')
    if (previous.delivery && !recordsEqual(previous.delivery, next.delivery)) throw new Error('No se puede modificar ni eliminar una entrega registrada.')
    if (next.delivery && !previous.delivery) {
      if (!canReceive(session) || previous.status !== 'disponible' || next.status !== 'entregado') throw new Error('Solo el decanato puede entregar un objeto disponible.')
      if (!['documento_identidad', 'carnet_estudiante'].includes(next.delivery.identityType ?? '') || !next.delivery.photoEvidenceReference?.trim() || next.delivery.photoEvidenceReference.length > 300) throw new Error('Confirma el documento presentado y registra la referencia externa de la fotografía de entrega.')
    }
    if (previous.disposition) throw new Error('El registro tiene un destino final y es inmutable.')
    if (!recordsEqual(previous.history, next.history.slice(0, previous.history.length))) throw new Error('No se puede modificar ni eliminar el historial anterior.')
    if (previous.status === 'entregado' && next.status === 'archivado') {
      if (next.history.length !== previous.history.length + 1) throw new Error('Archivar una entrega debe agregar exactamente un evento al historial.')
      if (!recordsEqual({ ...next, status: previous.status, history: previous.history, updatedByUid: previous.updatedByUid }, previous)) throw new Error('Archivar no permite modificar los datos de una entrega.')
    }
    if (!canReceive(session) && !canEdit(session, previous)) throw new Error('Solo puedes editar tus propios borradores.')
    if (next.disposition) {
      if (!canReceive(session) || next.status !== 'archivado' || next.delivery || !canDispose(previous)) throw new Error('Solo el decanato puede registrar el destino de un objeto recibido tras 90 días.')
      const expected = previous.category === 'documentos' ? 'remision_documentos' : 'donacion'
      if (next.disposition.kind !== expected || !next.disposition.recipient.trim() || !next.disposition.reference.trim() || next.disposition.recipient.length > 300 || next.disposition.reference.length > 2000) throw new Error('El destino final no cumple el protocolo de esta categoría.')
      const instant = new Date(next.disposition.completedAt)
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(next.disposition.completedAt) || Number.isNaN(instant.getTime()) || instant.toISOString() !== next.disposition.completedAt || !retentionInfo(previous, new Date(instant.getTime() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10))?.overdue) throw new Error('La fecha del destino debe ser válida y cumplir el plazo de 90 días.')
      if (next.history.length !== previous.history.length + 1) throw new Error('El destino final debe agregar un evento al historial.')
      if (!recordsEqual({ ...next, disposition: undefined, history: previous.history, status: previous.status }, previous)) throw new Error('Registrar el destino no permite cambiar los datos anteriores del objeto.')
    } else if (previous.status === 'archivado' || (previous.status === 'entregado' && next.status !== 'archivado')) throw new Error('El registro está cerrado.')
  }
  if (!canReceive(session) && (next.status !== 'borrador' || next.received || next.receivedDate || next.custodyLocation || next.delivery || next.disposition)) throw new Error('La recepción, publicación, entrega y destino final corresponden al decanato.')
}
export function validateAccessChange(session: Session, entry: AccessEntry): AccessEntry {
  if (!canManageRoles(session)) throw new Error('Solo un administrador o Developer puede gestionar permisos.')
  const email = institutionalEmail(entry.email)
  if (!isRole(entry.role) || typeof entry.active !== 'boolean') throw new Error('Selecciona un rol y un estado válidos.')
  if (isProtectedAccess({ email, role: entry.role })) throw new Error('El acceso Developer está reservado y no puede asignarse, modificarse ni desactivarse desde esta aplicación.')
  if (email === session.email.toLowerCase() && (!entry.active || entry.role !== 'admin')) throw new Error('No puedes desactivar ni retirar tu propio rol de administrador.')
  return { email, role: entry.role, active: entry.active }
}
