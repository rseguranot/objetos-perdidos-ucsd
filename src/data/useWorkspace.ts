import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cloudMode, firebaseConfigured } from './mode'
import { loadItems, resetItems, saveItems } from './storage'
import { loadAccess, saveAccess } from './access-storage'
import { createItem, projectPublicItems } from '../domain/catalog'
import { authorizeItemChange, canManageRoles, canRegister, validateAccessChange, validateAccessRemoval, type AccessEntry, type Session } from '../domain/roles'
import type { LostItem, PublicItem } from '../domain/types'
import { recordsEqual } from '../domain/records'
import { appendUniversityExamples } from './seed'
import { buildPilotExamples } from './pilot-examples'
import { todayISO } from '../date'

const pilotPreview = import.meta.env.DEV && !cloudMode && new URLSearchParams(window.location.search).get('preview') === 'pilot'

const anonymous: Session = { uid: '', email: '', verified: false, role: null }
function initialLocal() {
  if (cloudMode) return { items: [] as LostItem[], entries: [] as AccessEntry[], error: '' }
  if (pilotPreview) return { items: buildPilotExamples(todayISO()), entries: [{ email: 'decanato.demo@ucsd.edu.do', role: 'decanato', active: true }] as AccessEntry[], error: '' }
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
  const [publicCount, setPublicCount] = useState<number | undefined>(undefined)
  const [refreshToken, setRefreshToken] = useState(0)
  const capped = false
  const loading = false
  const privateLoading = false
  const demoAccess = entries.find(entry => entry.email === demoEmail && entry.active)
  const session: Session = useMemo(() => cloudMode ? cloudSession : demoEmail ? { uid: `demo:${demoEmail}`, email: demoEmail, verified: true, role: demoAccess?.role ?? null } : anonymous, [cloudSession, demoEmail, demoAccess])
  const localMetricsSource = useRef({ items, session })
  localMetricsSource.current = { items, session }
  const allowed = canRegister(session)
  const roleAdmin = canManageRoles(session)

  useEffect(() => {
    if (!cloudMode || !firebaseConfigured) return
    let canceled = false
    const releases: (() => void)[] = []
    void import('./cloud').then(cloud => {
      if (canceled) return
      releases.push(cloud.watchIdentity(setIdentity, cause => setIdentityError(cause.message)))
    }).catch(cause => { if (!canceled) setPublicError(cause instanceof Error ? cause.message : 'No se pudo conectar Firebase.') })
    return () => { canceled = true; releases.forEach(release => release()) }
  }, [])

  useEffect(() => {
    if (!cloudMode || !firebaseConfigured) return
    let canceled = false
    void import('./metrics').then(async metrics => {
      const { db } = await import('./firebase')
      if (!db) return
      const count = await metrics.loadPublicAvailableCount(db)
      if (!canceled) { setPublicCount(count); setPublicError('') }
    }).catch(cause => { if (!canceled) setPublicError(cause instanceof Error ? cause.message : 'No se pudo contar el catálogo.') })
    return () => { canceled = true }
  }, [refreshToken])

  useEffect(() => {
    if (!cloudMode) return
    let canceled = false
    const releases: (() => void)[] = []
    if (allowed) void import('./cloud').then(cloud => {
      if (canceled) return
      if (roleAdmin) releases.push(cloud.watchAccess(next => { setEntries(next); setAccessError('') }, cause => { setEntries([]); setAccessError(cause.message) }))
    }).catch(cause => { if (!canceled) setPrivateError(cause instanceof Error ? cause.message : 'No se pudo cargar la gestión.') })
    return () => { canceled = true; releases.forEach(release => release()) }
  }, [allowed, roleAdmin, cloudSession])

  function setIdentity(next: Session) { setItems([]); setEntries([]); setIdentityError(''); setPrivateError(''); setAccessError(''); setCloudSession(next) }
  async function commit(next: LostItem[]): Promise<void> {
    if (error) throw new Error('Resuelve el aviso de datos antes de guardar.')
    const visible = session.role === 'registro' ? items.filter(item => item.createdByUid === session.uid) : items
    if (next.length < visible.length) throw new Error('Los registros se archivan; no se eliminan.')
    const changes = next.filter(item => !recordsEqual(item, items.find(current => current.id === item.id)))
    if (changes.length !== 1 || next.length > visible.length + 1 || visible.some(item => !next.some(current => current.id === item.id))) throw new Error('Guarda un registro por operación.')
    const changed = changes[0]
    const previous = items.find(item => item.id === changed.id)
    authorizeItemChange(session, previous, changed)
    if (cloudMode) { const cloud = await import('./cloud'); await cloud.writeItem(session, previous, changed); setRefreshToken(value => value + 1) }
    else {
      // El correlativo usa todos los registros, aunque el perfil solo vea los suyos.
      const code = previous?.code ?? createItem(items, changed, session.email).code
      const tagged = { ...changed, code, createdByUid: previous?.createdByUid ?? session.uid, updatedByUid: session.uid }
      const result = previous ? items.map(item => item.id === tagged.id ? tagged : item) : [...items, tagged]
      if (!pilotPreview) saveItems(result)
      setItems(result)
      setRefreshToken(value => value + 1)
    }
  }
  async function updateAccess(entry: AccessEntry): Promise<void> {
    const clean = validateAccessChange(session, entry)
    if (cloudMode) { const cloud = await import('./cloud'); await cloud.writeAccess(session, clean) }
    else { const next = [...entries.filter(current => current.email !== clean.email), clean]; if (!pilotPreview) saveAccess(next); setEntries(next) }
  }
  async function removeAccess(entry: AccessEntry): Promise<void> {
    const email = validateAccessRemoval(session, entry)
    if (cloudMode) { const cloud = await import('./cloud'); await cloud.removeAccess(session, { ...entry, email }) }
    else { const next = entries.filter(current => current.email !== email); if (!pilotPreview) saveAccess(next); setEntries(next) }
  }
  function resetLocal() { if (cloudMode) throw new Error('El restablecimiento solo existe en la demo.'); setItems(pilotPreview ? buildPilotExamples(todayISO()) : resetItems()); setLocalError('') }
  const loadPublicPage = useCallback(async (filters: import('../domain/types').CatalogFilters, cursor: unknown | null) => { const pages = await import('./pages'); return pages.loadPublicPage(filters, cursor) }, [])
  const loadPrivatePage = useCallback(async (filters: import('../domain/types').InternalFilters, cursor: unknown | null) => { const pages = await import('./pages'); return pages.loadPrivatePage(cloudSession, filters, cursor) }, [cloudSession])
  const loadPrivateItem = useCallback(async (id: string) => { const pages = await import('./pages'); const item = await pages.loadPrivateItem(id); setItems(previous => [...previous.filter(current => current.id !== id), item]); return item }, [])
  const loadMetrics = useCallback(async (year: number) => { const metrics = await import('./metrics'); if (cloudMode) { const firebase = await import('./firebase'); if (!firebase.db) throw new Error('Firebase no está configurado.'); return metrics.loadStaffMetrics(firebase.db, cloudSession, year) } const source = localMetricsSource.current; return metrics.summarizeLocalMetrics(source.items, source.session, year) }, [cloudSession])
  return {
    items: cloudMode && !allowed ? [] : session.role === 'registro' ? items.filter(item => item.createdByUid === session.uid) : items,
    publicItems: cloudMode ? [] as PublicItem[] : projectPublicItems(items), entries: cloudMode && !roleAdmin ? [] : entries,
    session, error, loading, privateLoading, capped, commit, updateAccess, removeAccess, resetLocal, setDemoEmail,
    publicCount, refreshToken, loadPublicPage, loadPrivatePage, loadPrivateItem, loadMetrics, setCloudItems: setItems,
  }
}
