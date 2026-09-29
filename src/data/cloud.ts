import { getIdTokenResult, onIdTokenChanged } from 'firebase/auth'
import { collection, deleteDoc, doc, limit, onSnapshot, query, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, completeGoogleRedirect, db } from './firebase'
import { projectPublicItems } from '../domain/catalog'
import { parseItems } from './storage'
import { authorizeItemChange, institutionalEmail, isRole, validateAccessChange, validateAccessRemoval, type AccessEntry, type Session } from '../domain/roles'
import type { LostItem } from '../domain/types'
import { committedRecordMatches, recordsEqual } from '../domain/records'
import { decodeFirestoreRecord, encodeFirestoreRecord } from './firestore-records'
import { buildPrivateIndex, buildPublicIndex } from '../domain/search-index'
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
export function watchAccess(next: (entries: AccessEntry[]) => void, fail: (error: Error) => void): () => void {
  return onSnapshot(query(collection(database(), 'access'), limit(500)), snapshot => {
    try { next(snapshot.docs.map(snapshotDoc => { const value = snapshotDoc.data(); const email = institutionalEmail(snapshotDoc.id); if (value.email !== email || !isRole(value.role) || typeof value.active !== 'boolean') throw new Error('La lista de accesos contiene un registro inválido.'); return { email, role: value.role, active: value.active } })) } catch (error) { fail(error instanceof Error ? error : new Error('No se pudieron leer los accesos.')) }
  }, fail)
}
export async function writeAccess(session: Session, entry: AccessEntry): Promise<void> {
  const clean = validateAccessChange(session, entry)
  await setDoc(doc(database(), 'access', clean.email), { ...clean, updatedByUid: session.uid, updatedAt: serverTimestamp() })
}
export async function removeAccess(session: Session, entry: AccessEntry): Promise<void> {
  const email = validateAccessRemoval(session, entry)
  await deleteDoc(doc(database(), 'access', email))
}
export async function writeItem(session: Session, previous: LostItem | undefined, next: LostItem): Promise<void> {
  authorizeItemChange(session, previous, next)
  const reference = doc(database(), 'privateItems', next.id)
  // UUID completo evita que dos operadores generen el mismo código secuencial.
  const baseRecord = { ...next, code: previous?.code ?? `UCSD-${new Date().getFullYear()}-${next.id}`, createdByUid: previous?.createdByUid ?? session.uid, updatedByUid: session.uid }
  const record = { ...baseRecord, ...buildPrivateIndex(baseRecord) }
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
    if (projection) transaction.set(publicReference, { ...projection, ...buildPublicIndex(projection) })
    else if (previous?.status === 'disponible') transaction.delete(publicReference)
  })
}
