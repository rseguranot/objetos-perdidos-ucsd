import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import SchoolOutlined from '@mui/icons-material/SchoolOutlined'
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded'
import ShieldOutlined from '@mui/icons-material/ShieldOutlined'
import RestartAltRounded from '@mui/icons-material/RestartAltRounded'
import PublicCatalog from './components/PublicCatalog'
import Hero from './components/Hero'
import Guide from './components/Guide'
import StaffAccess from './components/StaffAccess'
import { useWorkspace } from './data/useWorkspace'
import { cloudMode, firebaseConfigured, testProjectMode } from './data/mode'
import { canManageRoles, canRegister, institutionalEmail, ROLE_LABELS } from './domain/roles'
import { authErrorMessage } from './domain/auth-errors'
import type { DeliveryInput, LostItem } from './domain/types'
import type { PreparedPhoto } from './data/evidence-photos'
import { createEvidenceApi, evidenceConfigured } from './data/evidence-bridge'
import type { StaffMetrics } from './data/metrics'

const AdminPanel = lazy(() => import('./components/AdminPanel'))
const RoleManager = lazy(() => import('./components/RoleManager'))
const initialReportYear = new Date(Date.now() - 4 * 60 * 60 * 1000).getUTCFullYear()

export default function App() {
  const workspace = useWorkspace()
  const { items, publicItems, session, entries, error, loading, privateLoading } = workspace
  const [view, setView] = useState<'public' | 'admin' | 'roles'>('public')
  const [profilesOpen, setProfilesOpen] = useState(() => cloudMode && new URLSearchParams(window.location.search).get('acceso') === 'google')
  const [resetOpen, setResetOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [demoEmail, setDemoEmail] = useState('')
  const [reportYear, setReportYear] = useState(initialReportYear)
  const [staffMetrics, setStaffMetrics] = useState<{ key: string; value: StaffMetrics } | undefined>()
  const [metricsError, setMetricsError] = useState('')
  const { loadMetrics, refreshToken } = workspace
  const metricKey = `${session.uid}:${session.role}:${reportYear}:${refreshToken}`
  const evidenceSessionKey = `${session.uid}:${session.role}:${session.verified}`
  const evidenceEnabled = cloudMode && evidenceConfigured && canRegister(session)
  const evidenceApi = useMemo(() => evidenceEnabled ? createEvidenceApi(evidenceSessionKey) : undefined, [evidenceEnabled, evidenceSessionKey])
  useEffect(() => {
    evidenceApi?.activate()
    return () => evidenceApi?.dispose()
  }, [evidenceApi])
  async function deliveryWithPhotos(item: LostItem, delivery: DeliveryInput, photos: PreparedPhoto[], operationId: string) {
    if (!evidenceApi) throw new Error('El servicio de fotografías aún no está configurado.')
    await evidenceApi.deliver(item, delivery, photos, operationId)
    workspace.refreshAfterDelivery()
    setToast('Entrega registrada.')
  }
  useEffect(() => {
    if (view !== 'admin' || !canRegister(session) || staffMetrics?.key === metricKey) return
    let canceled = false
    void loadMetrics(reportYear).then(value => { if (!canceled) { setStaffMetrics({ key: metricKey, value }); setMetricsError('') } }).catch(cause => { if (!canceled) setMetricsError(cause instanceof Error ? cause.message : 'No se pudieron cargar las métricas.') })
    return () => { canceled = true }
  }, [view, session, loadMetrics, reportYear, metricKey, staffMetrics])
  function goPublic(section = 'catalogo') { setView('public'); window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }), 0) }
  async function commit(next: LostItem[], message: string) { await workspace.commit(next); setToast(message) }
  async function googleAccess(mode: 'popup' | 'redirect' = 'popup') {
    setAuthError(''); setAuthBusy(true)
    try { const firebase = await import('./data/firebase'); if (session.uid) await firebase.logout(); else await firebase.loginGoogle(mode); setProfilesOpen(false) } catch (cause) { setAuthError(authErrorMessage(cause)) } finally { setAuthBusy(false) }
  }
  async function emailAccess(email: string, password: string): Promise<boolean> {
    setAuthError(''); setAuthBusy(true)
    try { const firebase = await import('./data/firebase'); await firebase.loginEmail(email, password); setProfilesOpen(false); return true } catch (cause) { setAuthError(authErrorMessage(cause)); return false } finally { setAuthBusy(false) }
  }
  async function identityAction(action: 'verify' | 'refresh'): Promise<void> {
    setAuthError(''); setAuthBusy(true)
    try { const firebase = await import('./data/firebase'); if (action === 'verify') { await firebase.sendVerificationEmail(); setToast('Se solicitó el correo de verificación. Revisa tu bandeja.') } else { await firebase.refreshIdentity(); setToast('Se actualizó la verificación de tu cuenta.') } } catch (cause) { setAuthError(authErrorMessage(cause)) } finally { setAuthBusy(false) }
  }
  function simulate(email: string) { try { workspace.setDemoEmail(email ? institutionalEmail(email) : ''); setAuthError(''); setProfilesOpen(false); setView(email ? 'admin' : 'public'); setToast('Identidad simulada actualizada.'); window.scrollTo({ top: 0 }) } catch (cause) { setAuthError(cause instanceof Error ? cause.message : 'Correo inválido.') } }
  function reset() { try { workspace.resetLocal(); setResetOpen(false); setToast('Objetos ficticios restablecidos. Los permisos locales se conservan.') } catch (cause) { setAuthError(cause instanceof Error ? cause.message : 'No se pudo restablecer la demo.'); setResetOpen(false) } }
  return <>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="site-header"><div className="header-inner"><button className="brand" aria-label="UCSD Objetos perdidos, inicio" onClick={() => { setView('public'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><span className="brand-mark"><SchoolOutlined /></span><span><strong>UCSD<span className="brand-divider"> / </span><span className="brand-service">Objetos perdidos</span></strong><small>Universidad Católica Santo Domingo</small></span></button><nav aria-label="Navegación principal"><button className={view === 'public' ? 'nav-link active' : 'nav-link'} onClick={() => goPublic()}>Objetos encontrados</button><button className="nav-link" onClick={() => goPublic('guia')}>Cómo recuperarlos</button><button className={view === 'admin' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('admin'); window.scrollTo({ top: 0 }) }}>Gestión</button>{session.uid && canManageRoles(session) && <button className={view === 'roles' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('roles'); window.scrollTo({ top: 0 }) }}>Usuarios y accesos</button>}</nav><Button className="profile-button" variant="outlined" startIcon={<PersonOutlineRounded />} onClick={() => { setProfilesOpen(true); setAuthError('') }} aria-label="Acceso del personal">{session.role ? ROLE_LABELS[session.role] : session.uid ? 'Mi cuenta' : 'Acceso personal'}</Button></div></header>
    <main id="contenido" tabIndex={-1}>
      {cloudMode && !firebaseConfigured && <div className="container storage-error"><Alert severity="warning">El modo Firebase está seleccionado, pero falta la configuración del proyecto. La app no utilizará los datos de la demo como sustituto. Consulta docs/firebase-setup.md.</Alert></div>}
      {error && <div className="container storage-error"><Alert severity="error">{error} La operación no se confirmó. {cloudMode ? 'Comprueba conexión y permisos; vuelve a cargar para reintentar.' : 'Los datos guardados no se borraron.'}</Alert></div>}
      {metricsError && view === 'admin' && <div className="container storage-error"><Alert severity="error">{metricsError} Vuelve a cargar el reporte.</Alert></div>}

      {view === 'public' ? <><Hero count={cloudMode ? workspace.publicCount : publicItems.filter(item => item.status === 'disponible').length} demo={!cloudMode} onCatalog={() => goPublic()} /><div className="container">{loading ? <p role="status">Cargando catálogo…</p> : <PublicCatalog items={publicItems} loadPage={cloudMode ? workspace.loadPublicPage : undefined} publicCount={workspace.publicCount} refreshToken={refreshToken} />}<Guide onCatalog={() => goPublic()} /></div></> : <div className="container">{(view === 'roles' ? canManageRoles(session) : canRegister(session)) ? <Suspense fallback={<p role="status">Cargando gestión…</p>}>{privateLoading ? <p role="status">Comprobando acceso y cargando registros…</p> : view === 'roles' ? <RoleManager session={session} entries={entries} demo={!cloudMode} onSave={workspace.updateAccess} onDelete={workspace.removeAccess} /> : <AdminPanel key={`${session.uid}:${session.role}`} session={session} demo={!cloudMode} items={items} onCommit={commit} blocked={Boolean(error)} loadPage={cloudMode ? workspace.loadPrivatePage : undefined} loadItem={cloudMode ? workspace.loadPrivateItem : undefined} onItemsLoaded={cloudMode ? workspace.setCloudItems : undefined} refreshToken={refreshToken} metrics={staffMetrics?.key === metricKey ? staffMetrics.value : undefined} reportYear={reportYear} onReportYearChange={setReportYear} onDelivery={cloudMode ? deliveryWithPhotos : undefined} evidenceApi={evidenceApi} />}</Suspense> : <section className="access-denied"><ShieldOutlined /><span className="eyebrow">GESTIÓN RESERVADA</span><h1>{session.uid ? 'Tu cuenta no tiene permiso para esta sección.' : 'Accede para gestionar objetos.'}</h1><p>{session.uid ? 'El correo institucional no concede permisos automáticamente. Un administrador debe autorizar tu cuenta y asignarte un rol activo.' : 'La consulta es pública. El personal autorizado inicia sesión con Google o correo y contraseña para gestionar hallazgos.'}</p>{session.email && <p className="session-email">{session.email}</p>}<Button variant="contained" onClick={() => setProfilesOpen(true)}>{cloudMode ? 'Acceso del personal' : 'Explorar perfiles demo'}</Button><Button onClick={() => goPublic()}>Volver al catálogo</Button></section>}</div>}
    </main>
    <footer className="site-footer"><div className="container footer-inner"><div><strong>UCSD / Objetos perdidos</strong></div><div className="footer-demo"><Chip size="small" label="Propuesta · no oficial" variant="outlined" />{(testProjectMode || !cloudMode) && <p>{testProjectMode ? 'Pruebas con datos ficticios y permisos separados.' : 'Solo datos ficticios. Objetos y permisos guardados en este navegador.'}</p>}{!cloudMode && <Button size="small" startIcon={<RestartAltRounded />} onClick={() => setResetOpen(true)}>Restablecer objetos demo</Button>}</div></div></footer>
    <Dialog open={profilesOpen} onClose={() => !authBusy && setProfilesOpen(false)} fullWidth maxWidth="xs" aria-labelledby="profile-title"><DialogTitle id="profile-title">Acceso del personal</DialogTitle><DialogContent>{cloudMode ? profilesOpen && <StaffAccess session={session} busy={authBusy} onGoogle={googleAccess} onEmail={emailAccess} onVerify={() => identityAction('verify')} onRefresh={() => identityAction('refresh')} /> : <><div className="profile-options"><button className="profile-option" onClick={() => simulate('')}><strong>Visitante</strong><span>Consulta libre, sin acceso a gestión.</span></button>{entries.map(entry => <button key={entry.email} className={`profile-option ${session.email === entry.email ? 'selected' : ''}`} aria-pressed={session.email === entry.email} onClick={() => simulate(entry.email)}><strong>{ROLE_LABELS[entry.role]}{!entry.active ? ' · inactivo' : ''}</strong><span>{entry.email}</span></button>)}</div><TextField fullWidth label="Simular otro correo institucional" value={demoEmail} onChange={event => setDemoEmail(event.target.value)} margin="normal" /><Button onClick={() => simulate(demoEmail)}>Comprobar permiso simulado</Button><p className="roles-note">El modo Firebase utiliza Google o correo y contraseña, con permisos explícitos. La demo no autentica estas identidades.</p></>}{authError && <Alert severity="error" className="form-alert">{authError}</Alert>}</DialogContent><DialogActions><Button disabled={authBusy} onClick={() => setProfilesOpen(false)}>Cerrar</Button></DialogActions></Dialog>
    <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth aria-labelledby="reset-title"><DialogTitle id="reset-title">¿Restablecer los objetos ficticios?</DialogTitle><DialogContent><p>Se reemplazarán los objetos guardados en esta demo por los ejemplos iniciales. Los permisos y otros sitios no se modificarán.</p></DialogContent><DialogActions><Button onClick={() => setResetOpen(false)}>Cancelar</Button><Button variant="contained" onClick={reset}>Restablecer objetos</Button></DialogActions></Dialog>
    <Snackbar open={Boolean(toast)} autoHideDuration={5000} onClose={() => setToast('')} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
  </>
}
