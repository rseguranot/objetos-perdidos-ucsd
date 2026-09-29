import { getIdTokenResult, onIdTokenChanged } from 'firebase/auth'
import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { auth, completeGoogleRedirect, db } from './firebase'
import { normalizeClassification, projectPublicItems } from '../domain/catalog'
import { parseItems } from './storage'
import { authorizeItemChange, institutionalEmail, isRole, validateAccessChange, type AccessEntry, type Session } from '../domain/roles'
import type { LostItem, PublicItem } from '../domain/types'
import { committedRecordMatches, recordsEqual } from '../domain/records'
import { decodeFirestoreRecord, encodeFirestoreRecord } from './firestore-records'
import { createIdentityRevisionGuard, verifiedInstitutionalEmail } from '../domain/identity'

function database() { if (!db) throw new Error('Firebase no está configurado.'); return db }
export function watchIdentity(next: (session: Session) => void, fail: (error: Error) => void): () => void {
  if (!auth) throw new Error('Firebase Authentication no está configurado.')
  void completeGoogleRedirect().catch(fail)
  let releaseRole = () => {}
  const revisions = createIdentityRevisionGuard()
  const releaseAuth = onIdTokenChanged(auth, user => {
    const revision = revisions.begin()
    releaseRole()
    releaseRole = () => {}
    next({ uid: user?.uid ?? '', email: user?.email ?? '', verified: false, role: null })
    if (!user) return
    void getIdTokenResult(user).then(token => {
      if (!revisions.current(revision)) return
      const email = verifiedInstitutionalEmail(token)
      if (!email) return
      releaseRole = onSnapshot(doc(database(), 'access', email), snapshot => {
        if (!revisions.current(revision)) return
        const access = snapshot.data()
        next({ uid: user.uid, email, verified: true, role: access?.active === true && isRole(access.role) ? access.role : null })
      }, error => { if (revisions.current(revision)) { next({ uid: user.uid, email, verified: true, role: null }); fail(error) } })
    }).catch(error => { if (revisions.current(revision)) fail(error instanceof Error ? error : new Error('No se pudo verificar la identidad.')) })
  }, error => {
    revisions.begin(); releaseRole(); releaseRole = () => {}
    next({ uid: '', email: '', verified: false, role: null }); fail(error)
  })
  return () => { revisions.dispose(); releaseRole(); releaseAuth() }
}
export function watchPublic(next: (items: PublicItem[], capped: boolean) => void, fail: (error: Error) => void): () => void {
  return onSnapshot(query(collection(database(), 'publicItems'), orderBy('foundDate', 'desc'), limit(500)), snapshot => {
    try {
      const items = snapshot.docs.map(snapshotDoc => {
        const value = snapshotDoc.data()
        const classification = typeof value.category === 'string' && typeof value.title === 'string' ? normalizeClassification(value.category, value.title, value.itemType) : null
        if (!classification || snapshotDoc.id !== value.id || value.status !== 'disponible' || !['id','code','title','description','foundDate','foundLocation'].every(key => typeof value[key] === 'string') || !/^\d{4}-\d{2}-\d{2}$/.test(value.foundDate) || new Date(`${value.foundDate}T00:00:00Z`).toISOString().slice(0,10) !== value.foundDate) throw new Error('El catálogo remoto contiene un registro inválido.')
        return { id: value.id as string, code: value.code as string, title: value.title as string, ...classification, description: value.description as string, foundDate: value.foundDate as string, foundLocation: value.foundLocation as string, status: 'disponible' as const }
      })
      next(items, snapshot.size === 500)
    } catch (error) { fail(error instanceof Error ? error : new Error('No se pudo leer el catálogo remoto.')) }
  }, fail)
}
export function watchPrivate(session: Session, next: (items: LostItem[], capped: boolean) => void, fail: (error: Error) => void): () => void {
  const target = session.role === 'registro' ? query(collection(database(), 'privateItems'), where('createdByUid', '==', session.uid), limit(500)) : query(collection(database(), 'privateItems'), orderBy('foundDate', 'desc'), limit(500))
  return onSnapshot(target, snapshot => {
    try { next(parseItems(snapshot.docs.map(snapshotDoc => { const value = decodeFirestoreRecord(snapshotDoc.data()); if (value.id !== snapshotDoc.id) throw new Error('Registro remoto inválido.'); return value })), snapshot.size === 500) } catch (error) { fail(error instanceof Error ? error : new Error('No se pudieron leer los registros internos.')) }
  }, fail)
}
export function watchAccess(next: (entries: AccessEntry[]) => void, fail: (error: Error) => void): () => void {
  return onSnapshot(query(collection(database(), 'access'), limit(500)), snapshot => {
    try { next(snapshot.docs.map(snapshotDoc => { const value = snapshotDoc.data(); const email = institutionalEmail(snapshotDoc.id); if (value.email !== email || !isRole(value.role) || typeof value.active !== 'boolean') throw new Error('La lista de accesos contiene un registro inválido.'); return { email, role: value.role, active: value.active } })) } catch (error) { fail(error instanceof Error ? error : new Error('No se pudieron leer los accesos.')) }
  }, fail)
}
export async function writeAccess(session: Session, entry: AccessEntry): Promise<void> {
  const clean = validateAccessChange(session, entry)
  await setDoc(doc(database(), 'access', clean.email), { ...clean, updatedByUid: session.uid, updatedAt: serverTimestamp() })
}
export async function writeItem(session: Session, previous: LostItem | undefined, next: LostItem): Promise<void> {
  authorizeItemChange(session, previous, next)
  const reference = doc(database(), 'privateItems', next.id)
  // UUID completo evita que dos operadores generen el mismo código secuencial.
  const record = { ...next, code: previous?.code ?? `UCSD-${new Date().getFullYear()}-${next.id}`, createdByUid: previous?.createdByUid ?? session.uid, updatedByUid: session.uid }
  await runTransaction(database(), async transaction => {
    const current = await transaction.get(reference)
    if (current.exists()) {
      const raw = current.data()
      if (!raw) throw new Error('El registro ya no existe.')
      const loaded = parseItems([decodeFirestoreRecord(raw)])[0]
      // A retry after a lost commit response must acknowledge our exact operation.
      // This never writes again or ignores a different actor, payload or history event.
      if (committedRecordMatches(loaded, record, Boolean(record.disposition && !previous?.disposition))) return
      if (!previous) throw new Error('Ya existe un registro con este identificador.')
      if (!recordsEqual(loaded, previous)) throw new Error('Otra persona modificó este registro. Reabre el formulario con los datos actualizados.')
    } else if (previous) throw new Error('El registro ya no existe.')
    transaction.set(reference, { ...encodeFirestoreRecord(record, previous), updatedAt: serverTimestamp() })
    const publicReference = doc(database(), 'publicItems', record.id)
    const projection = projectPublicItems([record])[0]
    if (projection) transaction.set(publicReference, projection)
    else if (previous?.status === 'disponible') transaction.delete(publicReference)
  })
}
