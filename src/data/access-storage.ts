import { DEVELOPER_EMAIL, institutionalEmail, isRole, type AccessEntry } from '../domain/roles.ts'

const KEY = 'ucsd-lost-found-demo-access-v1'
export const DEMO_EMAIL = 'admin.demo@ucsd.edu.do'
const initial: AccessEntry[] = [
  { email: DEVELOPER_EMAIL, role: 'developer', active: true },
  { email: DEMO_EMAIL, role: 'admin', active: true },
  { email: 'registro.demo@ucsd.edu.do', role: 'registro', active: true },
  { email: 'decanato.demo@ucsd.edu.do', role: 'decanato', active: true },
]
export function loadAccess(): AccessEntry[] {
  const raw = localStorage.getItem(KEY)
  if (raw === null) return structuredClone(initial)
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed) || !parsed.every(entry => entry && typeof entry.email === 'string' && institutionalEmail(entry.email) === entry.email && isRole(entry.role) && typeof entry.active === 'boolean') || new Set(parsed.map(entry => entry.email)).size !== parsed.length) throw new Error('Los permisos locales tienen un formato inválido. No se han borrado.')
  const entries = parsed as AccessEntry[]
  if (entries.some(entry => entry.role === 'developer' && entry.email !== DEVELOPER_EMAIL)) throw new Error('El perfil Developer de demostración solo corresponde al correo reservado. Los permisos no se han borrado.')
  // Esta migración pertenece exclusivamente a la demo; Firebase no utiliza este almacenamiento.
  const owner = entries.find(entry => entry.email === DEVELOPER_EMAIL)
  const result: AccessEntry[] = owner
    ? entries.map(entry => entry === owner ? { ...entry, role: 'developer', active: true } : entry)
    : [{ email: DEVELOPER_EMAIL, role: 'developer', active: true }, ...entries]
  if (!owner || owner.role !== 'developer' || !owner.active) saveAccess(result)
  return result
}
export function saveAccess(entries: AccessEntry[]): void { localStorage.setItem(KEY, JSON.stringify(entries)) }
