import assert from 'node:assert/strict'
import { test } from 'node:test'
import { staffMetricPlan, summarizeLocalMetrics } from '../src/data/metrics.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'
import type { Session } from '../src/domain/roles.ts'
import type { LostItem } from '../src/domain/types.ts'

const admin: Session = { uid: 'admin', email: 'admin@ucsd.edu.do', verified: true, role: 'admin' }
const registro: Session = { uid: 'registro', email: 'registro@ucsd.edu.do', verified: true, role: 'registro' }

test('the remote plan never caps counts at a visible page and scopes registro', () => {
  const plan = staffMetricPlan(registro, 2026, new Date('2026-09-29T16:00:00.000Z'))
  for (const metric of [plan.status.archivado, plan.months[0].hallazgos, plan.months[8].entregas, plan.donationsTotal, plan.reviewOverdue]) {
    assert.deepEqual(metric.filters[0], { field: 'createdByUid', operation: '==', value: 'registro' })
    assert.equal(metric.filters.some(filter => filter.field === 'limit'), false)
  }
  assert.deepEqual(plan.months[11].hallazgos.filters.slice(-2), [
    { field: 'foundDate', operation: '>=', value: '2026-12-01' },
    { field: 'foundDate', operation: '<', value: '2027-01-01' },
  ])
  assert.deepEqual(plan.reviewOverdue.filters.at(-1), { field: 'receivedDate', operation: '<=', value: '2026-07-01' })
  assert.equal(staffMetricPlan(admin, 2026).status.disponible.filters.some(filter => filter.field === 'createdByUid'), false)
})

test('counts all records and their event months independently from archived status', () => {
  const base = SEED_ITEMS.find(item => item.status === 'disponible' && !item.delivery && !item.disposition)!
  const items: LostItem[] = Array.from({ length: 700 }, (_, index) => ({
    ...base,
    id: `metric-${index}`,
    code: `METRIC-${index}`,
    foundDate: index % 2 ? '2025-12-31' : '2026-01-01',
    createdByUid: index % 2 ? 'registro' : 'other',
    status: index % 2 ? 'archivado' : 'disponible',
    ...(index % 2 ? { delivery: { recipient: 'Persona ficticia', proof: 'Ficticia', deliveredAt: '2026-02-01T03:30:00.000Z' } } : {}),
  }))
  const result = summarizeLocalMetrics(items, admin, 2026)
  assert.equal(result.status.archivado, 350)
  assert.equal(result.status.disponible, 350)
  assert.equal(result.annual.hallazgos, 350)
  assert.equal(result.annual.entregas, 350)
  assert.equal(result.months[0].entregas, 350) // 03:30 UTC still 31 January in Santo Domingo.
  assert.equal(result.months[1].entregas, 0)
  assert.equal(summarizeLocalMetrics(items, registro, 2026).annual.entregas, 350)
  assert.equal(summarizeLocalMetrics(items, registro, 2026).annual.hallazgos, 0)
})

test('donations and remissions stay in the original completion month', () => {
  const sample = SEED_ITEMS.find(item => item.disposition)!
  const completedAt = '2026-09-01T03:30:00.000Z'
  const donation: LostItem = { ...sample, id: 'donation', disposition: { ...sample.disposition!, kind: 'donacion', completedAt } }
  const remission: LostItem = { ...sample, id: 'remission', disposition: { ...sample.disposition!, kind: 'remision_documentos', completedAt } }
  const result = summarizeLocalMetrics([donation, remission], admin, 2026)
  assert.equal(result.status.archivado, 2)
  assert.equal(result.months[7].donaciones, 1)
  assert.equal(result.months[7].remisiones, 1)
  assert.equal(result.months[8].donaciones, 0)
  assert.equal(result.donationsTotal, 1)
  assert.equal(result.remissionsTotal, 1)
})

test('events close to New Year belong to the Santo Domingo calendar year', () => {
  const sample = SEED_ITEMS.find(item => item.status === 'entregado')!
  const event: LostItem = { ...sample, delivery: { ...sample.delivery!, deliveredAt: '2026-01-01T03:30:00.000Z' } }
  assert.equal(summarizeLocalMetrics([event], admin, 2025).annual.entregas, 1)
  assert.equal(summarizeLocalMetrics([event], admin, 2026).annual.entregas, 0)
})

test('unauthorized identities cannot request staff metrics', () => {
  assert.throws(() => staffMetricPlan({ uid: '', email: '', verified: false, role: null }, 2026), /permiso/)
  assert.throws(() => staffMetricPlan(admin, 1999), /año válido/)
})
