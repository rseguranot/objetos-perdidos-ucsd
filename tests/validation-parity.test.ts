import test from 'node:test'
import assert from 'node:assert/strict'
import { archiveItem, createItem, deliverItem } from '../src/domain/catalog.ts'
import { authorizeItemChange } from '../src/domain/roles.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'
import type { ItemDraft } from '../src/domain/types.ts'

const actor = 'decanato.demo@ucsd.edu.do'
const custodian = { uid: 'custodio', email: actor, verified: true, role: 'decanato' as const }
const draft: ItemDraft = { title: 'Objeto QA', category: 'otros', itemType: 'otro', description: 'Ejemplo ficticio', foundDate: '2026-09-29', foundLocation: 'Biblioteca', received: true, receivedDate: '2026-09-29', custodyLocation: 'Caja QA', privateDetails: 'Detalle ficticio' }

test('confirmar recepción exige custodia y fecha incluso al guardar un borrador', () => {
  assert.throws(() => createItem([], { ...draft, custodyLocation: '  ' }, actor), /custodia/)
  assert.throws(() => createItem([], { ...draft, receivedDate: '' }, actor), /recepción/)
  assert.equal(createItem([], draft, actor).status, 'borrador')
  assert.doesNotThrow(() => createItem([], { ...draft, received: false, receivedDate: '', custodyLocation: '' }, actor))
})

test('los límites del dominio rechazan datos que Firestore no puede guardar', () => {
  for (const [field, limit] of Object.entries({ title: 160, description: 2000, foundLocation: 300, custodyLocation: 300, privateDetails: 4000 })) {
    assert.throws(() => createItem([], { ...draft, [field]: 'x'.repeat(limit + 1) }, actor), /caracteres/)
  }
  const delivery = { recipient: 'Receptor QA', proof: 'Prueba ficticia', identityType: 'documento_identidad' as const, photoEvidenceReference: 'REF-QA' }
  assert.throws(() => deliverItem(SEED_ITEMS[0]!, { ...delivery, recipient: 'x'.repeat(301) }, actor), /300/)
  assert.throws(() => deliverItem(SEED_ITEMS[0]!, { ...delivery, proof: 'x'.repeat(2001) }, actor), /2000/)
  assert.doesNotThrow(() => deliverItem(SEED_ITEMS[0]!, { ...delivery, recipient: 'x'.repeat(300), proof: 'x'.repeat(2000) }, actor))
})

test('archivar una entrega conserva todos sus datos y agrega exactamente un evento', () => {
  const delivered = SEED_ITEMS[10]!
  const archived = archiveItem(delivered, actor)
  assert.doesNotThrow(() => authorizeItemChange(custodian, delivered, archived))
  for (const field of ['title', 'privateDetails', 'custodyLocation'] as const) {
    assert.throws(() => authorizeItemChange(custodian, delivered, { ...archived, [field]: 'Modificado' }), /entrega/)
  }
  assert.throws(() => authorizeItemChange(custodian, delivered, { ...archived, history: delivered.history }), /historial/)
})
