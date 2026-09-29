import { useState } from 'react'
import Button from '@mui/material/Button'
import EmailOutlined from '@mui/icons-material/EmailOutlined'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import TextField from '@mui/material/TextField'
import type { Session } from '../domain/roles'
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

    {!session.verified && session.email.toLowerCase().endsWith('@ucsd.edu.do') && <div className="access-verification-actions">
      <Button disabled={disabled} onClick={() => { void onVerify() }}>Enviar verificación de correo</Button>
      <Button disabled={disabled} onClick={() => { void onRefresh() }}>Ya verifiqué mi correo</Button>
    </div>}
    <Button fullWidth variant="outlined" disabled={disabled} onClick={() => { void onGoogle() }}>Cerrar sesión</Button>
  </>
  return <>
    {method === 'choice' ? <>
      <div className="access-methods">
        <Button fullWidth variant="outlined" className="google-access-button" startIcon={<img src="/brand/google-g.png" width="20" height="20" alt="" aria-hidden="true" />} disabled={disabled}
          {...(testProjectMode || googleHostedAccessUrl ? { href: testProjectMode ? 'https://ucsd-objetos-perdidos.firebaseapp.com/?acceso=google' : googleHostedAccessUrl } : { onClick: () => { void onGoogle(googleRedirectConfigured ? 'redirect' : 'popup') } })}>
          {busy ? 'Conectando…' : 'Continuar con Google'}
        </Button>
        <Button fullWidth variant="contained" startIcon={<EmailOutlined />} disabled={disabled} onClick={() => setMethod('email')}>Continuar con correo</Button>
      </div>
    </> : <>
      <Button className="access-back-button" startIcon={<ArrowBackRounded />} disabled={disabled} onClick={() => { setMethod('choice'); setPassword('') }}>Volver a las opciones</Button>
      <form className="email-access-form" onSubmit={event => {
        event.preventDefault()
        if (!disabled) void onEmail(email, password).then(success => { if (success) setPassword('') })
      }}>
        <TextField autoFocus fullWidth required type="email" label="Correo" autoComplete="username" value={email} disabled={disabled} onChange={event => setEmail(event.target.value)} />
        <TextField fullWidth required type="password" label="Contraseña" autoComplete="current-password" value={password} disabled={disabled} onChange={event => setPassword(event.target.value)} />
        <Button fullWidth type="submit" variant="contained" disabled={disabled}>{busy ? 'Conectando…' : 'Entrar con correo'}</Button>
      </form>
    </>}
    {!firebaseConfigured && <p>La configuración del proyecto Firebase está pendiente.</p>}
  </>
}
