import test from 'node:test'
import assert from 'node:assert/strict'
import { TEST_ACCOUNTS, TEST_PROJECT_ID, testAccountRole, testAccountsEnabled } from '../src/domain/test-accounts.ts'
import { verifiedInstitutionalEmail } from '../src/domain/identity.ts'
import { DEVELOPER_EMAIL, institutionalEmail, isDeveloper, validateAccessChange, type Session } from '../src/domain/roles.ts'

const qa = { VITE_DATA_MODE: 'firebase', VITE_FIREBASE_PROJECT_ID: TEST_PROJECT_ID }
const production = { VITE_DATA_MODE: 'firebase', VITE_FIREBASE_PROJECT_ID: 'ucsd-objetos-perdidos' }
const developer: Session = { uid: 'real-developer', email: DEVELOPER_EMAIL, verified: true, role: 'developer' }

test('las cuentas QA requieren simultáneamente modo Firebase y proyecto de pruebas exacto', () => {
  assert.equal(testAccountsEnabled(qa), true)
  for (const environment of [production, { ...qa, VITE_DATA_MODE: 'demo' }, { VITE_DATA_MODE: 'firebase' }, { ...qa, VITE_FIREBASE_PROJECT_ID: `${TEST_PROJECT_ID}-otro` }, {}]) {
    assert.equal(testAccountsEnabled(environment), false)
    for (const account of TEST_ACCOUNTS) {
      assert.equal(testAccountRole(account.email, environment), null)
      assert.throws(() => institutionalEmail(account.email, environment), /@ucsd/)
      assert.equal(verifiedInstitutionalEmail({ claims: { email: account.email, email_verified: true }, signInProvider: 'password' }, environment), null)
    }
  }
  assert.equal(testAccountsEnabled(), false, 'Node no activa QA cuando import.meta.env no existe')
})

test('solo los tres correos QA permitidos pueden usar contraseña sin verificación de correo', () => {
  assert.equal(TEST_ACCOUNTS.length, 3)
  for (const account of TEST_ACCOUNTS) {
    assert.equal(institutionalEmail(account.email, qa), account.email)
    assert.equal(testAccountRole(account.email, qa), account.role)
    for (const email_verified of [false, undefined]) assert.equal(verifiedInstitutionalEmail({ claims: { email: account.email, email_verified }, signInProvider: 'password' }, qa), account.email)
    for (const signInProvider of ['google.com', 'custom', 'anonymous', null]) assert.equal(verifiedInstitutionalEmail({ claims: { email: account.email, email_verified: true }, signInProvider }, qa), null)
  }
  for (const email of ['otro@demo.ucsd.invalid', 'developer@demo.ucsd.invalid', 'administrador@ucsd.edu.do', 'registro@demo.ucsd.invalid.atacante.com']) {
    assert.equal(testAccountRole(email, qa), null)
    assert.equal(verifiedInstitutionalEmail({ claims: { email, email_verified: false }, signInProvider: 'password' }, qa), null)
  }
})

test('Developer institucional y cuentas institucionales siguen exigiendo verificación y permiso explícito en QA', () => {
  for (const signInProvider of ['google.com', 'password']) {
    assert.equal(verifiedInstitutionalEmail({ claims: { email: DEVELOPER_EMAIL, email_verified: false }, signInProvider }, qa), null)
    assert.equal(verifiedInstitutionalEmail({ claims: { email: DEVELOPER_EMAIL, email_verified: true }, signInProvider }, qa), DEVELOPER_EMAIL)
  }
  assert.equal(isDeveloper(developer), true)
  assert.equal(isDeveloper({ ...developer, verified: false }), false)
  assert.equal(isDeveloper({ ...developer, role: null }), false)
  for (const account of TEST_ACCOUNTS) {
    assert.equal(isDeveloper({ ...developer, email: account.email }), false)
    assert.throws(() => validateAccessChange(developer, { ...account, role: 'developer', active: true }, qa), /reservado/)
  }
  assert.throws(() => validateAccessChange(developer, { email: DEVELOPER_EMAIL, role: 'admin', active: true }, qa), /reservado/)
})

test('el gestor mantiene el rol fijo de cada cuenta QA y la protección contra desactivar al propio administrador', () => {
  for (const account of TEST_ACCOUNTS) {
    assert.deepEqual(validateAccessChange(developer, { ...account, active: true }, qa), { ...account, active: true })
    assert.deepEqual(validateAccessChange(developer, { ...account, active: false }, qa), { ...account, active: false })
    for (const role of ['admin', 'decanato', 'registro'] as const) if (role !== account.role) assert.throws(() => validateAccessChange(developer, { email: account.email, role, active: true }, qa), /rol fijo/)
  }
  const admin: Session = { uid: 'qa-admin', email: TEST_ACCOUNTS[0].email, verified: true, role: 'admin' }
  assert.throws(() => validateAccessChange(admin, { email: admin.email, role: 'admin', active: false }, qa), /propio rol/)
})
