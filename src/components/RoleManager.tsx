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
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined'
import { ASSIGNABLE_ROLES, DEVELOPER_EMAIL, ROLE_LABELS, ROLE_DESCRIPTIONS, isProtectedAccess, validateAccessChange, type AccessEntry, type Role, type Session } from '../domain/roles'
import { TEST_ACCOUNTS, testAccountRole } from '../domain/test-accounts'
import { testProjectMode } from '../data/mode'

export default function RoleManager({ session, entries, demo, onSave }: { session: Session; entries: AccessEntry[]; demo: boolean; onSave: (entry: AccessEntry) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('registro')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const fixedTestRole = testAccountRole(email.trim().toLowerCase())
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    try { const entry = validateAccessChange(session, { email, role: fixedTestRole ?? role, active }); setSaving(true); await onSave(entry); setMessage(`Permiso guardado para ${entry.email}.`); setEmail(''); setRole('registro'); setActive(true) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el permiso.') } finally { setSaving(false) }
  }
  return <section className="roles-section" aria-labelledby="roles-title"><div className="section-heading"><div><span className="eyebrow">ADMINISTRACIÓN DE ACCESOS</span><h1 id="roles-title">Cada persona, el permiso adecuado.</h1><p>{testProjectMode ? 'Gestiona accesos en la base de pruebas. Las cuentas QA conservan su rol fijo.' : 'Añade un correo institucional y asigna las operaciones que puede realizar.'}</p></div><ManageAccountsOutlined className="role-heading-icon" /></div>
    <Alert severity={demo || testProjectMode ? 'warning' : 'info'} className="form-alert">{demo ? 'Gestor de demostración: estos permisos se guardan solo en este navegador. No crean cuentas ni conceden acceso a Firebase.' : testProjectMode ? 'Entorno de pruebas separado: usa únicamente datos ficticios. Las cuentas QA acceden con contraseña y no acreditan propiedad de un correo institucional. Los permisos solo afectan esta base de pruebas.' : 'El personal accede con Google o correo y contraseña, con un correo UCSD verificado y autorización activa. Los permisos se aplican también en Firestore.'}</Alert>
    {testProjectMode && <Alert severity="info" className="form-alert">Estas tres cuentas están reservadas para probar cada rol; el gestor puede cambiar su estado, pero no su rol.<ul>{TEST_ACCOUNTS.map(account => <li key={account.email}>{account.email} · {ROLE_LABELS[account.role]}</li>)}</ul>Las demás cuentas deben usar correo institucional verificado y contar con autorización explícita.</Alert>}
    <Alert severity="info" className="form-alert">Developer está reservado a {DEVELOPER_EMAIL}. Su alta inicial se prepara fuera de este gestor; ningún perfil puede asignarlo ni editarlo desde la aplicación.</Alert><div className="role-guide">{Object.entries(ROLE_LABELS).map(([key,label]) => <article key={key}><strong>{label}</strong><p>{ROLE_DESCRIPTIONS[key as Role]}</p></article>)}</div>
    <form className="role-form" onSubmit={event => { void save(event) }}><h2>Agregar o actualizar acceso</h2><TextField required label={testProjectMode ? 'Correo de acceso' : 'Correo institucional'} type="email" placeholder="persona@ucsd.edu.do" value={email} disabled={saving} onChange={event => setEmail(event.target.value)} helperText={fixedTestRole ? 'Cuenta QA reservada: solo se puede actualizar su estado.' : 'Si el correo institucional ya existe, se actualizarán su rol y estado.'} /><TextField select label="Rol" value={fixedTestRole ?? role} disabled={saving || Boolean(fixedTestRole)} onChange={event => setRole(event.target.value as Role)} helperText={fixedTestRole ? 'Rol fijo de la cuenta de pruebas.' : undefined}>{ASSIGNABLE_ROLES.map(key => <MenuItem key={key} value={key}>{ROLE_LABELS[key]}</MenuItem>)}</TextField><FormControlLabel control={<Switch checked={active} disabled={saving} onChange={event => setActive(event.target.checked)} />} label="Acceso activo" /><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Guardando…' : 'Guardar permiso'}</Button>{error && <Alert severity="error">{error}</Alert>}{message && <Alert severity="success" role="status">{message}</Alert>}</form>
    <h2>{testProjectMode ? 'Accesos autorizados de pruebas' : 'Personal autorizado'}</h2><TableContainer className="admin-table"><Table aria-label={testProjectMode ? 'Permisos de pruebas' : 'Permisos del personal'}><TableHead><TableRow><TableCell>Correo</TableCell><TableCell>Rol</TableCell><TableCell>Estado</TableCell><TableCell>Acción</TableCell></TableRow></TableHead><TableBody>{entries.toSorted((a,b) => a.email.localeCompare(b.email)).map(entry => <TableRow key={entry.email}><TableCell>{entry.email}{entry.email === session.email && <Chip size="small" label="Tu cuenta" className="own-account-chip" />}{testAccountRole(entry.email) && <Chip size="small" label="Cuenta QA · rol fijo" className="own-account-chip" variant="outlined" />}</TableCell><TableCell>{ROLE_LABELS[entry.role]}</TableCell><TableCell><Chip size="small" label={entry.active ? 'Activo' : 'Inactivo'} color={entry.active ? 'success' : 'default'} variant="outlined" /></TableCell><TableCell><Button size="small" disabled={saving || isProtectedAccess(entry)} onClick={() => { setEmail(entry.email); setRole(entry.role); setActive(entry.active); setError(''); setMessage('') }}>{isProtectedAccess(entry) ? 'Acceso protegido' : testAccountRole(entry.email) ? 'Editar estado' : 'Editar permiso'}</Button></TableCell></TableRow>)}{!entries.length && <TableRow><TableCell colSpan={4}>No hay accesos que mostrar.</TableCell></TableRow>}</TableBody></Table></TableContainer><p className="roles-note">Desactiva un acceso para retirar sus permisos. Tu propia cuenta de administrador debe permanecer activa. El acceso Developer no admite cambios desde este gestor.</p>
  </section>
}
