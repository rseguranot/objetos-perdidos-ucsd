import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import EmailOutlined from '@mui/icons-material/EmailOutlined'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import TextField from '@mui/material/TextField'
import type { Session } from '../domain/roles'
import { ROLE_LABELS } from '../domain/roles'
import { firebaseConfigured, googleHostedAccessUrl, googleRedirectConfigured, testProjectMode } from '../data/mode'

interface Props {
  session: Session
  busy: boolean
  onGoogle: (mode?: 'popup' | 'redirect') => Promise<void>
  onEmail: (email: string, password: string) => Promise<boolean>
  onVerify: () => Promise<void>
  onRefresh: () => Promise<void>
}

export default function StaffAccess({ session, busy, onGoogle, onEmail, onVerify, onRefresh }: Props) {
  const [method, setMethod] = useState<'choice' | 'email'>('choice')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const disabled = busy || !firebaseConfigured
  if (session.uid) return <>
    <p className="session-email">{session.email}</p>
    {testProjectMode && <Alert severity="warning" className="form-alert">Entorno de pruebas separado. Los permisos de esta cuenta solo afectan datos ficticios.</Alert>}
    <Alert severity={session.role ? 'success' : 'info'} className="form-alert">
      {session.role ? `Acceso activo: ${ROLE_LABELS[session.role]}.` : !session.verified ? 'Tu identidad aún no está verificada para gestionar objetos. Se requiere un correo institucional verificado.' : 'Has iniciado sesión. Un administrador debe asignarte un rol activo para gestionar objetos.'}
    </Alert>
    {!session.verified && session.email.toLowerCase().endsWith('@ucsd.edu.do') && <div className="access-verification-actions">
      <Button disabled={disabled} onClick={() => { void onVerify() }}>Enviar verificación de correo</Button>
      <Button disabled={disabled} onClick={() => { void onRefresh() }}>Ya verifiqué mi correo</Button>
    </div>}
    <Button fullWidth variant="outlined" disabled={disabled} onClick={() => { void onGoogle() }}>Cerrar sesión</Button>
  </>
  return <>
    {method === 'choice' ? <>
      <p className="access-intro">Elige cómo quieres iniciar sesión.</p>
      <div className="access-methods">
        <Button fullWidth variant="outlined" className="google-access-button" startIcon={<img src="/brand/google-g.png" width="20" height="20" alt="" aria-hidden="true" />} disabled={disabled}
          {...(testProjectMode || googleHostedAccessUrl ? { href: testProjectMode ? 'https://ucsd-objetos-perdidos.firebaseapp.com/?acceso=google' : googleHostedAccessUrl } : { onClick: () => { void onGoogle(googleRedirectConfigured ? 'redirect' : 'popup') } })}>
          {busy ? 'Conectando…' : 'Continuar con Google'}
        </Button>
        <Button fullWidth variant="contained" startIcon={<EmailOutlined />} disabled={disabled} onClick={() => setMethod('email')}>Continuar con correo</Button>
      </div>
      <p className="roles-note">{testProjectMode ? 'Google abre el piloto institucional. Para este entorno, usa tu cuenta de pruebas con correo.' : 'Acceso exclusivo para personal autorizado por la universidad.'}</p>
    </> : <>
      <Button className="access-back-button" startIcon={<ArrowBackRounded />} disabled={disabled} onClick={() => { setMethod('choice'); setPassword('') }}>Volver a las opciones</Button>
      <p className="access-intro">Ingresa con tu correo y contraseña.</p>
      <form className="email-access-form" onSubmit={event => {
        event.preventDefault()
        if (!disabled) void onEmail(email, password).then(success => { if (success) setPassword('') })
      }}>
        <TextField autoFocus fullWidth required type="email" label={testProjectMode ? 'Correo de pruebas' : 'Correo institucional'} autoComplete="username" value={email} disabled={disabled} onChange={event => setEmail(event.target.value)} />
        <TextField fullWidth required type="password" label="Contraseña de esta herramienta" autoComplete="current-password" value={password} disabled={disabled} onChange={event => setPassword(event.target.value)} />
        <Button fullWidth type="submit" variant="contained" disabled={disabled}>{busy ? 'Conectando…' : 'Entrar con correo'}</Button>
      </form>
      <p className="roles-note">Usa la contraseña creada para esta herramienta. Si necesitas una cuenta, solicítala al responsable.</p>
    </>}
    {!firebaseConfigured && <p>La configuración del proyecto Firebase está pendiente.</p>}
  </>
}
