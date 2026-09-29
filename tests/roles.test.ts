import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizeItemChange, canEdit, canManageRoles, institutionalEmail, validateAccessChange, type Session } from '../src/domain/roles.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'
import { recordsEqual } from '../src/domain/records.ts'

const admin: Session = { uid: 'a', email: 'admin@ucsd.edu.do', verified: true, role: 'admin' }
const registry: Session = { uid: 'r', email: 'registro@ucsd.edu.do', verified: true, role: 'registro' }
test('dominio institucional exacto y rol explícito; autenticarse no concede privilegios', () => {
  assert.equal(institutionalEmail(' PERSONA@UCSD.EDU.DO '), 'persona@ucsd.edu.do')
  for (const email of ['persona@gmail.com','persona@ucsd.edu.do.evil','persona+@evilucsd.edu.do','a@ucsd.edu.do@x','a/b@ucsd.edu.do']) assert.throws(() => institutionalEmail(email))
  assert.equal(canManageRoles({ ...admin, role: null }), false)
  assert.equal(canManageRoles({ ...admin, verified: false }), false)
})
test('registro solo edita sus borradores y no confirma recepción ni publica', () => {
  const draft = { ...SEED_ITEMS[8], received: false, receivedDate: '', custodyLocation: '', createdByUid: 'r' }
  assert.equal(canEdit(registry, draft), true)
  assert.equal(canEdit(registry, { ...draft, createdByUid: 'otro' }), false)
  assert.equal(canEdit(registry, { ...draft, received: true, receivedDate: '2026-09-28', custodyLocation: 'Armario A' }), false)
  assert.doesNotThrow(() => authorizeItemChange(registry, undefined, draft))
  assert.throws(() => authorizeItemChange(registry, draft, { ...draft, received: true }))
  assert.throws(() => authorizeItemChange(registry, draft, { ...draft, status: 'disponible' }))
  assert.throws(() => authorizeItemChange({ ...registry, role: null }, undefined, draft))
})
test('conflictos de registros comparan contenido y preservan el orden del historial', () => {
  assert.equal(recordsEqual({ id: '1', history: [{ actor: 'a', action: 'Registro' }] }, { history: [{ action: 'Registro', actor: 'a' }], id: '1' }), true)
  assert.equal(recordsEqual({ history: [1, 2] }, { history: [2, 1] }), false)
  assert.equal(recordsEqual({ received: false }, { received: true }), false)
})
test('administrador gestiona accesos sin retirar su propio permiso', () => {
  assert.deepEqual(validateAccessChange(admin, { email: 'PERSONA@ucsd.edu.do', role: 'decanato', active: true }), { email: 'persona@ucsd.edu.do', role: 'decanato', active: true })
  assert.throws(() => validateAccessChange(registry, { email: 'persona@ucsd.edu.do', role: 'admin', active: true }))
  assert.throws(() => validateAccessChange(admin, { email: admin.email, role: 'registro', active: true }))
  assert.throws(() => validateAccessChange(admin, { email: admin.email, role: 'admin', active: false }))
})
