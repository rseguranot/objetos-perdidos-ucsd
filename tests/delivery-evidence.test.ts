import test from 'node:test'
import assert from 'node:assert/strict'
import { archiveItem, deliverItem, projectPublicItems } from '../src/domain/catalog.ts'
import { parseItems } from '../src/data/storage.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'
import { authorizeItemChange } from '../src/domain/roles.ts'
import type { IdentityType } from '../src/domain/types.ts'

const actor = 'decanato.demo@ucsd.edu.do'
const input = { recipient: 'Receptor ficticio', proof: 'Detalle reservado descrito', identityType: 'carnet_estudiante' as const, photoEvidenceReference: '  UCSD-EVIDENCIA-FICTICIA-001  ' }
const custodian = { uid: 'decanato-test', email: actor, role: 'decanato' as const, verified: true }

test('nueva entrega exige identificación verificada y referencia fotográfica externa', () => {
  const original = SEED_ITEMS[0]!
  assert.throws(() => deliverItem(original, { ...input, identityType: undefined }, actor), /identidad/)
  assert.throws(() => deliverItem(original, { ...input, identityType: 'otro' as IdentityType }, actor), /identidad/)
  assert.throws(() => deliverItem(original, { ...input, photoEvidenceReference: '  ' }, actor), /fotográfica/)
  assert.throws(() => deliverItem(original, { ...input, photoEvidenceReference: 'x'.repeat(301) }, actor), /300/)
  for (const identityType of ['documento_identidad', 'carnet_estudiante'] as const) {
    const delivered = deliverItem(original, { ...input, identityType }, actor)
    assert.equal(delivered.delivery?.identityType, identityType)
    assert.equal(delivered.delivery?.photoEvidenceReference, 'UCSD-EVIDENCIA-FICTICIA-001')
    assert.equal(delivered.history.length, original.history.length + 1)
    const publicItem = projectPublicItems([delivered])[0]
    assert.equal(publicItem.status, 'entregado')
    assert.equal('delivery' in publicItem, false)
    assert.equal('photoEvidenceReference' in publicItem, false)
    assert.doesNotThrow(() => authorizeItemChange(custodian, original, delivered))
    assert.deepEqual(parseItems([delivered])[0]?.delivery, delivered.delivery)
    assert.deepEqual(archiveItem(delivered, actor).delivery, delivered.delivery)
  }
})

test('entregas históricas se conservan sin inventar una foto o identificación', () => {
  const original = SEED_ITEMS[10]!
  const migrated = parseItems([original])[0]!
  assert.deepEqual(migrated.delivery, original.delivery)
  assert.equal(migrated.delivery?.identityType, undefined)
  assert.equal(migrated.delivery?.photoEvidenceReference, undefined)
  const archived = archiveItem(migrated, actor)
  assert.doesNotThrow(() => authorizeItemChange(custodian, migrated, archived))
  assert.deepEqual(archived.delivery, original.delivery)
  const delivered = deliverItem(SEED_ITEMS[0]!, input, actor)
  assert.throws(() => parseItems([{ ...delivered, delivery: { ...delivered.delivery, identityType: undefined } }]), /formato inválido/)
})

test('autorización no permite omitir evidencia nueva ni modificar la de una entrega anterior', () => {
  const original = SEED_ITEMS[0]!
  const delivered = deliverItem(original, input, actor)
  assert.throws(() => authorizeItemChange(custodian, original, { ...delivered, delivery: { recipient: input.recipient, proof: input.proof, deliveredAt: delivered.delivery!.deliveredAt } }))
  const archived = archiveItem(delivered, actor)
  assert.throws(() => authorizeItemChange(custodian, delivered, { ...archived, delivery: { ...delivered.delivery!, photoEvidenceReference: 'otra referencia' } }))
})
