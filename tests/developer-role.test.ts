import test from 'node:test'
import assert from 'node:assert/strict'
import { DEVELOPER_EMAIL, ASSIGNABLE_ROLES, authorizeItemChange, canEdit, canManageRoles, canReceive, canRegister, isDeveloper, isProtectedAccess, validateAccessChange, type Session } from '../src/domain/roles.ts'
import { loadAccess, DEMO_EMAIL } from '../src/data/access-storage.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'
import { archiveItem } from '../src/domain/catalog.ts'

const developer: Session = { uid: 'owner', email: DEVELOPER_EMAIL, verified: true, role: 'developer' }
const admin: Session = { uid: 'admin', email: 'admin@ucsd.edu.do', verified: true, role: 'admin' }

test('Developer requiere su identidad verificada Y su rol explícito; otro correo nunca obtiene ese permiso', () => {
  assert.equal(isDeveloper(developer), true)
  assert.equal(isDeveloper({ ...developer, email: DEVELOPER_EMAIL.toUpperCase() }), true)
  for (const denied of [{ ...developer, verified: false }, { ...developer, role: null }, { ...developer, email: 'otro@ucsd.edu.do' }]) {
    assert.equal(isDeveloper(denied), false)
    assert.equal(canManageRoles(denied), false)
    assert.equal(canReceive(denied), false)
    assert.equal(canRegister(denied), false)
  }
})

test('Developer tiene las operaciones de administración y custodia sobre borradores ajenos', () => {
  const draft = { ...SEED_ITEMS[8], createdByUid: 'otra-persona' }
  assert.equal(canManageRoles(developer), true)
  assert.equal(canReceive(developer), true)
  assert.equal(canEdit(developer, draft), true)
  assert.doesNotThrow(() => authorizeItemChange(developer, undefined, draft))
  assert.deepEqual(validateAccessChange(developer, { email: 'NUEVO@ucsd.edu.do', role: 'admin', active: true }), { email: 'nuevo@ucsd.edu.do', role: 'admin', active: true })
  assert.doesNotThrow(() => validateAccessChange(admin, { email: 'nuevo@ucsd.edu.do', role: 'registro', active: true }))
})

test('ningún gestor puede asignar, degradar ni desactivar Developer ni editar el acceso reservado', () => {
  assert.equal((ASSIGNABLE_ROLES as readonly string[]).includes('developer'), false)
  for (const actor of [developer, admin]) {
    for (const role of ['developer', 'admin', 'registro', 'decanato'] as const) {
      for (const active of [true, false]) assert.throws(() => validateAccessChange(actor, { email: DEVELOPER_EMAIL.toUpperCase(), role, active }), /reservado/)
    }
    assert.throws(() => validateAccessChange(actor, { email: 'otro@ucsd.edu.do', role: 'developer', active: true }), /reservado/)
  }
  assert.equal(isProtectedAccess({ email: DEVELOPER_EMAIL, role: 'admin' }), true)
  assert.equal(isProtectedAccess({ email: 'otro@ucsd.edu.do', role: 'developer' }), true)
  assert.equal(isProtectedAccess({ email: admin.email, role: 'admin' }), false)
})

test('entregas nuevas exigen identidad y constancia externa; Developer tampoco puede omitirlas', () => {
  const previous = SEED_ITEMS[0]
  const delivery = { recipient: 'Receptor ficticio', proof: 'Describe un detalle reservado.', deliveredAt: new Date().toISOString() }
  const next = { ...previous, status: 'entregado' as const, delivery }
  assert.throws(() => authorizeItemChange(developer, previous, next), /documento presentado/)
  assert.throws(() => authorizeItemChange(developer, previous, { ...next, delivery: { ...delivery, identityType: 'carnet_estudiante' } }), /fotografía/)
  assert.doesNotThrow(() => authorizeItemChange(developer, previous, { ...next, delivery: { ...delivery, identityType: 'carnet_estudiante', photoEvidenceReference: 'Acta ficticia / foto 01' } }))
  assert.throws(() => authorizeItemChange(developer, previous, { ...next, delivery: { ...delivery, identityType: 'documento_identidad', photoEvidenceReference: 'x'.repeat(301) } }), /fotografía/)
})

test('una entrega histórica sin los campos nuevos se conserva al archivar y no admite reescritura', () => {
  const previous = SEED_ITEMS[10]
  assert.ok(previous.delivery)
  const next = archiveItem(previous, developer.email)
  assert.doesNotThrow(() => authorizeItemChange(developer, previous, next))
  assert.throws(() => authorizeItemChange(developer, previous, { ...next, delivery: { ...previous.delivery!, identityType: 'documento_identidad', photoEvidenceReference: 'Foto posterior' } }), /modificar ni eliminar/)
})

test('la demo añade Developer sin borrar accesos previos y conserva el administrador de ejemplo', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) } })
  try {
    assert.ok(loadAccess().some(entry => entry.email === DEVELOPER_EMAIL && entry.role === 'developer' && entry.active))
    const custom = [{ email: DEMO_EMAIL, role: 'admin', active: true }, { email: 'auxiliar@ucsd.edu.do', role: 'registro', active: false }]
    store.set('ucsd-lost-found-demo-access-v1', JSON.stringify(custom))
    const migrated = loadAccess()
    assert.deepEqual(migrated.filter(entry => entry.email !== DEVELOPER_EMAIL), custom)
    assert.equal(migrated.filter(entry => entry.role === 'developer').length, 1)
    assert.deepEqual(loadAccess(), migrated)
    store.set('ucsd-lost-found-demo-access-v1', JSON.stringify([{ email: 'otro@ucsd.edu.do', role: 'developer', active: true }]))
    assert.throws(() => loadAccess(), /correo reservado/)
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
