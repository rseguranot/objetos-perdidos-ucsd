import test from 'node:test'
import assert from 'node:assert/strict'
import { archiveItem, deliverItem, projectPublicItems } from '../src/domain/catalog.ts'
import { parseItems } from '../src/data/storage.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'
import { summarizeLocalMetrics } from '../src/data/metrics.ts'

test('Drive evidence survives parsing and archival without exposing private evidence in public projections', () => {
  const item = deliverItem(SEED_ITEMS[0], { recipient: 'Persona ficticia', proof: 'Marca reservada', identityType: 'carnet_estudiante', evidenceId: 'a'.repeat(64) }, 'admin.demo@ucsd.edu.do')
  assert.equal(parseItems([item])[0].delivery?.evidenceId, 'a'.repeat(64))
  assert.equal(item.delivery?.photoEvidenceReference, undefined)
  const archived = archiveItem(item, 'admin.demo@ucsd.edu.do')
  assert.deepEqual(archived.delivery, item.delivery)
  const projections = projectPublicItems([item, archived])
  assert.equal(projections.length, 2)
  assert.ok(projections.every(projection => projection.status === 'entregado' && !('delivery' in projection) && !('evidenceId' in projection) && !('privateDetails' in projection) && !('custodyLocation' in projection)))
  assert.ok(!JSON.stringify(projections).includes('Persona ficticia'))
  assert.ok(!JSON.stringify(projections).includes('a'.repeat(64)))
  const session = { uid: 'demo', email: 'admin.demo@ucsd.edu.do', verified: true, role: 'admin' as const }
  const year = new Date(item.delivery!.deliveredAt).getFullYear()
  assert.equal(summarizeLocalMetrics([item], session, year).annual.entregas, summarizeLocalMetrics([archived], session, year).annual.entregas)
})

test('Drive identifiers cannot be replaced with arbitrary URLs or mixed with old references', () => {
  assert.throws(() => deliverItem(SEED_ITEMS[0], { recipient: 'Persona', proof: 'Detalle', identityType: 'documento_identidad', evidenceId: 'https://example.com/foto' }, 'admin.demo@ucsd.edu.do'))
  const item = deliverItem(SEED_ITEMS[0], { recipient: 'Persona', proof: 'Detalle', identityType: 'documento_identidad', evidenceId: 'a'.repeat(64) }, 'admin.demo@ucsd.edu.do')
  assert.throws(() => parseItems([{ ...item, delivery: { ...item.delivery, photoEvidenceReference: 'Otra referencia' } }]))
})
