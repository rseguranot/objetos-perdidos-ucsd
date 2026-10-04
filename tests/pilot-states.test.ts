import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPilotExamples } from '../src/data/pilot-examples.ts'
import { planPilotStates } from '../src/data/pilot-states.ts'
import { parseItems } from '../src/data/storage.ts'
import { archiveItem, CATEGORY_LABELS, deliverItem, disposeItem, needsRetentionReview, projectPublicItems } from '../src/domain/catalog.ts'
import { authorizeItemChange, canEdit, type Session } from '../src/domain/roles.ts'
import type { LostItem } from '../src/domain/types.ts'

test('los 50 ejemplos cubren estados, destinos y todas las categorías públicas', () => {
  const source = buildPilotExamples('2026-09-29')
  const mixed = parseItems(planPilotStates(source, '2026-09-29', 'Personal ficticio'))
  assert.deepEqual(Object.fromEntries(['borrador', 'disponible', 'entregado', 'archivado'].map(status => [status, mixed.filter(item => item.status === status).length])), { borrador: 5, disponible: 30, entregado: 7, archivado: 8 })
  assert.equal(mixed.filter(item => item.disposition?.kind === 'donacion').length, 3)
  assert.equal(mixed.filter(item => item.disposition?.kind === 'remision_documentos').length, 1)
  assert.equal(mixed.filter(item => needsRetentionReview(item, '2026-09-29')).length, 3)
  const publicItems = projectPublicItems(mixed)
  assert.equal(publicItems.filter(item => item.status === 'disponible').length, 30)
  assert.equal(publicItems.filter(item => item.status === 'entregado').length, mixed.filter(item => item.delivery).length)
  assert.equal(publicItems.filter(item => item.status === 'donado').length, 3)
  assert.deepEqual([...new Set(publicItems.map(item => item.category))].sort(), Object.keys(CATEGORY_LABELS).sort())
  assert.ok(publicItems.every(item => !('delivery' in item) && !('disposition' in item) && !('history' in item)))
  mixed.forEach((item, i) => assert.deepEqual(item.history.slice(0, source[i].history.length), source[i].history))
  assert.deepEqual(planPilotStates(mixed, '2026-09-29', 'Otro actor'), mixed)
})

test('preparación conserva tres casos para comprobar acciones desde el navegador', () => {
  const staged = parseItems(planPilotStates(buildPilotExamples('2026-09-29'), '2026-09-29', 'Personal ficticio', true))
  for (const n of [42, 43, 44]) assert.equal(staged[n - 1].status, 'disponible')
  assert.equal(staged.filter(item => item.status === 'disponible').length, 33)
  assert.equal(staged.filter(item => needsRetentionReview(item, '2026-09-29')).length, 4)
})

test('rechaza registros ajenos o ya gestionados y no muta el origen', () => {
  const source = buildPilotExamples('2026-09-29')
  const copy = structuredClone(source)
  planPilotStates(source, '2026-09-29', 'Personal ficticio')
  assert.deepEqual(source, copy)
  source[35].status = 'entregado'
  assert.throws(() => planPilotStates(source, '2026-09-29', 'Personal ficticio'), /ya fue gestionado/)
  source[0].id = 'real-001'
  assert.throws(() => planPilotStates(source, '2026-09-29', 'Personal ficticio'), /ficticios conocidos/)
})

test('Administrador puede entregar, archivar y donar; Registro no puede hacerlo', () => {
  const date = new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)
  const prepared = planPilotStates(buildPilotExamples(date), date, 'Personal ficticio', true)
  const admin: Session = { uid: 'admin-ficticio', email: 'admin@ucsd.edu.do', verified: true, role: 'admin' }
  const registry: Session = { ...admin, role: 'registro' }
  const cases: Array<[number, LostItem]> = [
    [41, deliverItem(prepared[41], { recipient: 'Estudiante ficticio', proof: 'Características reservadas coincidentes', identityType: 'carnet_estudiante', photoEvidenceReference: 'SIMULADA: sin fotografía real' }, admin.email)],
    [42, disposeItem(prepared[42], { kind: 'donacion', recipient: 'Organización ficticia', reference: 'Acta simulada' }, admin.email)],
    [43, archiveItem(prepared[43], admin.email)],
  ]
  for (const [index, next] of cases) {
    assert.doesNotThrow(() => authorizeItemChange(admin, prepared[index], next))
    assert.throws(() => authorizeItemChange(registry, prepared[index], next))
    assert.equal(canEdit(admin, next), false)
  }
})
