import test from 'node:test'
import assert from 'node:assert/strict'
import { createIdentityRevisionGuard, verifiedInstitutionalEmail, type IdentityToken } from '../src/domain/identity.ts'

const verified: IdentityToken = { claims: { email: 'Personal@ucsd.edu.do', email_verified: true }, signInProvider: 'google.com' }

test('Google y contraseña exigen correo institucional verificado en el token actual', () => {
  for (const signInProvider of ['google.com', 'password']) {
    assert.equal(verifiedInstitutionalEmail({ ...verified, signInProvider }), 'personal@ucsd.edu.do')
    for (const email_verified of [false, undefined, 'true', 1]) assert.equal(verifiedInstitutionalEmail({ ...verified, signInProvider, claims: { ...verified.claims, email_verified } }), null)
  }
  for (const email of ['personal@gmail.com', 'personal@ucsd.edu.do.atacante.com', 'personal@sub.ucsd.edu.do', '', undefined, 1]) assert.equal(verifiedInstitutionalEmail({ ...verified, claims: { ...verified.claims, email } }), null)
})

test('el método del token controla el acceso aunque la cuenta tenga Google vinculado', () => {
  // A linked Google provider must not allow custom, anonymous or other sessions.
  for (const signInProvider of ['custom', 'anonymous', 'phone', 'facebook.com', null, undefined, ['google.com']]) assert.equal(verifiedInstitutionalEmail({ ...verified, signInProvider }), null)
  assert.equal(verifiedInstitutionalEmail({ ...verified, signInProvider: 'password' }), 'personal@ucsd.edu.do')
})

test('una sesión sustituida o cerrada no puede restaurarse por una consulta pendiente', async () => {
  const guard = createIdentityRevisionGuard()
  const oldSession = guard.begin()
  let completeLookup!: () => void
  const pending = new Promise<void>(resolve => { completeLookup = resolve })
  let installedOldRole = false
  const lookup = pending.then(() => { if (guard.current(oldSession)) installedOldRole = true })
  const newSession = guard.begin()
  assert.equal(guard.current(newSession), true)
  completeLookup()
  await lookup
  assert.equal(installedOldRole, false)
  guard.dispose()
  assert.equal(guard.current(newSession), false)
  assert.equal(guard.current(guard.begin()), false)
})
