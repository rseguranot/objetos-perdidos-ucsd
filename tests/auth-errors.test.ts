import test from 'node:test'
import assert from 'node:assert/strict'
import { authErrorMessage } from '../src/domain/auth-errors.ts'

test('los errores de credenciales no revelan si una cuenta existe', () => {
  const expected = authErrorMessage({ code: 'auth/invalid-credential' })
  assert.equal(authErrorMessage({ code: 'auth/user-not-found' }), expected)
  assert.equal(authErrorMessage({ code: 'auth/wrong-password' }), expected)
})

test('errores SDK desconocidos no exponen mensajes técnicos o datos internos', () => {
  assert.equal(authErrorMessage({ code: 'auth/internal-error', message: 'detalle reservado' }), 'No se pudo completar el acceso. Inténtalo de nuevo.')
  assert.equal(authErrorMessage(null), 'No se pudo completar el acceso. Inténtalo de nuevo.')
  assert.match(authErrorMessage({ code: 'auth/popup-blocked' }), /ventanas emergentes/)
})
