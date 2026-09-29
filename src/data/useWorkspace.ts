import { useEffect, useState } from 'react'
import { cloudMode, firebaseConfigured } from './mode'
import { loadItems, resetItems, saveItems } from './storage'
import { loadAccess, saveAccess } from './access-storage'
import { createItem, projectPublicItems } from '../domain/catalog'
import { authorizeItemChange, canManageRoles, canRegister, validateAccessChange, type AccessEntry, type Session } from '../domain/roles'
import type { LostItem, PublicItem } from '../domain/types'
import { recordsEqual } from '../domain/records'
import { appendUniversityExamples } from './seed'

const anonymous: Session = { uid: '', email: '', verified: false, role: null }
function initialLocal() {
  if (cloudMode) return { items: [] as LostItem[], entries: [] as AccessEntry[], error: '' }
  try {
    const entries = loadAccess()
    const loaded = loadItems()
    const items = appendUniversityExamples(loaded)
    if (items !== loaded) saveItems(items)
    return { items, entries, error: '' }
  } catch (error) { return { items: [] as LostItem[], entries: [] as AccessEntry[], error: error instanceof Error ? error.message : 'No se pudieron leer los datos locales.' } }
}
export function useWorkspace() {
  const [initial] = useState(initialLocal)
  const [items, setItems] = useState(initial.items)
  const [entries, setEntries] = useState(initial.entries)
  const [localError, setLocalError] = useState(initial.error)
  const [publicError, setPublicError] = useState('')
  const [identityError, setIdentityError] = useState('')
  const [privateError, setPrivateError] = useState('')
  const [accessError, setAccessError] = useState('')
  const error = localError || publicError || identityError || privateError || accessError
  const [cloudSession, setCloudSession] = useState<Session>(anonymous)
  const [demoEmail, setDemoEmail] = useState('')
  const [publicItems, setPublicItems] = useState<PublicItem[]>([])
  const [capped, setCapped] = useState(false)
  const [loading, setLoading] = useState(cloudMode && firebaseConfigured)
  const [privateLoading, setPrivateLoading] = useState(false)
  const demoAccess = entries.find(entry => entry.email === demoEmail && entry.active)
  const session: Session = cloudMode ? cloudSession : demoEmail ? { uid: `demo:${demoEmail}`, email: demoEmail, verified: true, role: demoAccess?.role ?? null } : anonymous
  const allowed = canRegister(session)
  const roleAdmin = canManageRoles(session)

  useEffect(() => {
    if (!cloudMode || !firebaseConfigured) return
    let canceled = false
    const releases: (() => void)[] = []
    void import('./cloud').then(cloud => {
      if (canceled) return
      releases.push(cloud.watchIdentity(setIdentity, cause => setIdentityError(cause.message)))
      releases.push(cloud.watchPublic((next, limitReached) => { setPublicItems(next); setPublicError(''); setCapped(limitReached); setLoading(false) }, cause => { setPublicItems([]); setLoading(false); setPublicError(cause.message) }))
    }).catch(cause => { if (!canceled) { setLoading(false); setPublicError(cause instanceof Error ? cause.message : 'No se pudo conectar Firebase.') } })
    return () => { canceled = true; releases.forEach(release => release()) }
  }, [])

  useEffect(() => {
    if (!cloudMode) return
    let canceled = false
    const releases: (() => void)[] = []
    if (allowed) void import('./cloud').then(cloud => {
      if (canceled) return
      releases.push(cloud.watchPrivate({ ...cloudSession }, (next, limitReached) => { setItems(next); setPrivateError(''); setCapped(limitReached); setPrivateLoading(false) }, cause => { setItems([]); setPrivateLoading(false); setPrivateError(cause.message) }))
      if (roleAdmin) releases.push(cloud.watchAccess(next => { setEntries(next); setAccessError('') }, cause => { setEntries([]); setAccessError(cause.message) }))
    }).catch(cause => { if (!canceled) { setPrivateLoading(false); setPrivateError(cause instanceof Error ? cause.message : 'No se pudo cargar la gestión.') } })
    return () => { canceled = true; releases.forEach(release => release()) }
  }, [allowed, roleAdmin, cloudSession])

  function setIdentity(next: Session) { setItems([]); setEntries([]); setIdentityError(''); setPrivateError(''); setAccessError(''); setPrivateLoading(canRegister(next)); setCloudSession(next) }
  async function commit(next: LostItem[]): Promise<void> {
    if (error) throw new Error('Resuelve el aviso de datos antes de guardar.')
    const visible = session.role === 'registro' ? items.filter(item => item.createdByUid === session.uid) : items
    if (next.length < visible.length) throw new Error('Los registros se archivan; no se eliminan.')
    const changes = next.filter(item => !recordsEqual(item, items.find(current => current.id === item.id)))
    if (changes.length !== 1 || next.length > visible.length + 1 || visible.some(item => !next.some(current => current.id === item.id))) throw new Error('Guarda un registro por operación.')
    const changed = changes[0]
    const previous = items.find(item => item.id === changed.id)
    authorizeItemChange(session, previous, changed)
    if (cloudMode) { const cloud = await import('./cloud'); await cloud.writeItem(session, previous, changed) }
    else {
      // El correlativo usa todos los registros, aunque el perfil solo vea los suyos.
      const code = previous?.code ?? createItem(items, changed, session.email).code
      const tagged = { ...changed, code, createdByUid: previous?.createdByUid ?? session.uid, updatedByUid: session.uid }
      const result = previous ? items.map(item => item.id === tagged.id ? tagged : item) : [...items, tagged]
      saveItems(result); setItems(result)
    }
  }
  async function updateAccess(entry: AccessEntry): Promise<void> {
    const clean = validateAccessChange(session, entry)
    if (cloudMode) { const cloud = await import('./cloud'); await cloud.writeAccess(session, clean) }
    else { const next = [...entries.filter(current => current.email !== clean.email), clean]; saveAccess(next); setEntries(next) }
  }
  function resetLocal() { if (cloudMode) throw new Error('El restablecimiento solo existe en la demo.'); setItems(resetItems()); setLocalError('') }
  return {
    items: cloudMode && !allowed ? [] : session.role === 'registro' ? items.filter(item => item.createdByUid === session.uid) : items,
    publicItems: cloudMode ? publicItems : projectPublicItems(items), entries: cloudMode && !roleAdmin ? [] : entries,
    session, error, loading, privateLoading, capped, commit, updateAccess, resetLocal, setDemoEmail,
  }
}
