import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { ASSIGNABLE_ROLES, ROLE_LABELS, isProtectedAccess, validateAccessChange, type AccessEntry, type Role, type Session } from '../domain/roles'
import { testAccountRole } from '../domain/test-accounts'
import { testProjectMode } from '../data/mode'

export default function RoleManager({ session, entries, onSave, onDelete }: { session: Session; entries: AccessEntry[]; demo: boolean; onSave: (entry: AccessEntry) => Promise<void>; onDelete: (entry: AccessEntry) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('registro')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyEmail, setBusyEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [removal, setRemoval] = useState<AccessEntry | null>(null)
  const fixedTestRole = testAccountRole(email.trim().toLowerCase())

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    try { const entry = validateAccessChange(session, { email, role: fixedTestRole ?? role, active }); setSaving(true); await onSave(entry); setMessage(`Permiso guardado para ${entry.email}.`); setEmail(''); setRole('registro'); setActive(true) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el permiso.') } finally { setSaving(false) }
  }
  async function toggle(entry: AccessEntry) {
    setError(''); setMessage(''); setBusyEmail(entry.email)
    try { await onSave({ ...entry, active: !entry.active }); setMessage(entry.active ? `Acceso desactivado para ${entry.email}.` : `Acceso reactivado para ${entry.email}.`) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el acceso.') }
    finally { setBusyEmail('') }
  }
  async function remove() {
    if (!removal) return
    const entry = removal; setError(''); setMessage(''); setBusyEmail(entry.email)
    try { await onDelete(entry); setMessage(`Acceso eliminado para ${entry.email}.`); setRemoval(null); if (email.toLowerCase() === entry.email) { setEmail(''); setRole('registro'); setActive(true) } }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el acceso.') }
    finally { setBusyEmail('') }
  }

  return <section className="roles-section" aria-label="Gestión de accesos">

    <form className="role-form" onSubmit={event => { void save(event) }}><h2>Agregar o actualizar acceso</h2><TextField required label={testProjectMode ? 'Correo de acceso' : 'Correo institucional'} type="email" placeholder="persona@ucsd.edu.do" value={email} disabled={saving} onChange={event => setEmail(event.target.value)} helperText={fixedTestRole ? 'Cuenta QA reservada: solo se puede actualizar su estado.' : undefined} /><TextField select label="Rol" value={fixedTestRole ?? role} disabled={saving || Boolean(fixedTestRole)} onChange={event => setRole(event.target.value as Role)} helperText={fixedTestRole ? 'Rol fijo de la cuenta de pruebas.' : undefined}>{ASSIGNABLE_ROLES.map(key => <MenuItem key={key} value={key}>{ROLE_LABELS[key]}</MenuItem>)}</TextField><FormControlLabel control={<Switch checked={active} disabled={saving} onChange={event => setActive(event.target.checked)} />} label="Acceso activo" /><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Guardando…' : 'Guardar permiso'}</Button></form>
    {error && !saving && <Alert severity="error" className="form-alert">{error}</Alert>}{message && !saving && <Alert severity="success" className="form-alert" role="status">{message}</Alert>}
    <h2>{testProjectMode ? 'Accesos autorizados de pruebas' : 'Personal autorizado'}</h2><TableContainer className="admin-table"><Table aria-label={testProjectMode ? 'Permisos de pruebas' : 'Permisos del personal'}><TableHead><TableRow><TableCell>Correo</TableCell><TableCell>Rol</TableCell><TableCell>Estado</TableCell><TableCell>Acciones</TableCell></TableRow></TableHead><TableBody>{entries.toSorted((a,b) => a.email.localeCompare(b.email)).map(entry => {
      const protectedEntry = isProtectedAccess(entry)
      const ownEntry = entry.email.toLowerCase() === session.email.toLowerCase()
      const busy = saving || busyEmail === entry.email
      return <TableRow key={entry.email}><TableCell>{entry.email}{ownEntry && <Chip size="small" label="Tu cuenta" className="own-account-chip" />}{testAccountRole(entry.email) && <Chip size="small" label="Cuenta QA · rol fijo" className="own-account-chip" variant="outlined" />}</TableCell><TableCell>{ROLE_LABELS[entry.role]}</TableCell><TableCell><Chip size="small" label={entry.active ? 'Activo' : 'Inactivo'} color={entry.active ? 'success' : 'default'} variant="outlined" /></TableCell><TableCell><div className="role-actions"><Button size="small" disabled={busy || protectedEntry} onClick={() => { setEmail(entry.email); setRole(entry.role); setActive(entry.active); setError(''); setMessage('') }}>{protectedEntry ? 'Acceso protegido' : testAccountRole(entry.email) ? 'Editar estado' : 'Editar'}</Button>{!protectedEntry && !ownEntry && <Button size="small" disabled={busy} onClick={() => { void toggle(entry) }}>{busy ? 'Guardando…' : entry.active ? 'Desactivar' : 'Reactivar'}</Button>}{!protectedEntry && !ownEntry && <Button size="small" color="error" disabled={busy} onClick={() => { setError(''); setRemoval(entry) }}>Eliminar</Button>}</div></TableCell></TableRow>
    })}{!entries.length && <TableRow><TableCell colSpan={4}>No hay accesos que mostrar.</TableCell></TableRow>}</TableBody></Table></TableContainer>
    <Dialog open={Boolean(removal)} onClose={() => busyEmail ? undefined : setRemoval(null)} fullWidth maxWidth="xs" aria-labelledby="remove-access-title"><DialogTitle id="remove-access-title">¿Eliminar este acceso?</DialogTitle><DialogContent><p>Se quitará el permiso de {removal?.email}. La persona podrá iniciar sesión con Google, pero no gestionar objetos. Su cuenta de Google no se elimina y el permiso puede volver a agregarse.</p></DialogContent><DialogActions><Button disabled={Boolean(busyEmail)} onClick={() => setRemoval(null)}>Cancelar</Button><Button color="error" variant="contained" disabled={Boolean(busyEmail)} onClick={() => { void remove() }}>{busyEmail ? 'Eliminando…' : 'Eliminar acceso'}</Button></DialogActions></Dialog>
  </section>
}
