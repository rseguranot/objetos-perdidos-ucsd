import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
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
    <Alert severity="info" className="form-alert">{testProjectMode ? 'Usa una de las cuentas de pruebas con contraseña. Google y tu acceso Developer están disponibles en el piloto institucional, que tiene una base separada.' : 'Usa Google o una cuenta de correo y contraseña creada para esta herramienta. Tener correo UCSD no asigna permisos automáticamente.'}</Alert>
    {testProjectMode ? <Button fullWidth variant="contained" href="https://ucsd-objetos-perdidos.firebaseapp.com/?acceso=google">Google en el piloto institucional</Button> : <Button fullWidth variant="contained" disabled={disabled} onClick={() => { void onGoogle(googleRedirectConfigured ? 'redirect' : 'popup') }}>{busy ? 'Conectando…' : 'Continuar con Google'}</Button>}
    {!testProjectMode && googleHostedAccessUrl && <><p className="roles-note">Si la ventana de Google no se abre, usa el acceso en esta pestaña.</p><Button fullWidth disabled={disabled} href={googleHostedAccessUrl}>Google en esta pestaña</Button></>}
    <Divider sx={{ my: 2.5 }}>o con correo</Divider>
    <form className="email-access-form" onSubmit={event => {
      event.preventDefault()
      if (!disabled) void onEmail(email, password).then(success => { if (success) setPassword('') })
    }}>
      <TextField fullWidth required type="email" label={testProjectMode ? 'Correo de pruebas' : 'Correo institucional'} autoComplete="username" value={email} disabled={disabled} onChange={event => setEmail(event.target.value)} />
      <TextField fullWidth required type="password" label="Contraseña de esta herramienta" autoComplete="current-password" value={password} disabled={disabled} onChange={event => setPassword(event.target.value)} />
      <Button fullWidth type="submit" variant="outlined" disabled={disabled}>{busy ? 'Conectando…' : 'Entrar con correo'}</Button>
    </form>
    <p className="roles-note">La contraseña de esta herramienta se gestiona por separado del acceso con Google. Solicita tu cuenta y rol al responsable.</p>
    {!firebaseConfigured && <p>La configuración del proyecto Firebase está pendiente.</p>}
  </>
}
