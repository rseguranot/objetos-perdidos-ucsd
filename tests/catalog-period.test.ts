import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogMonthRange, catalogPeriodOptions, changeCatalogYear, currentCatalogPeriod } from '../src/domain/catalog-period.ts'

test('solo ofrece años desde 2022 y meses transcurridos del año actual', () => {
  const current = { year: 2026, month: 10 }
  assert.deepEqual(catalogPeriodOptions(2026, current).years, [2026, 2025, 2024, 2023, 2022])
  assert.deepEqual(catalogPeriodOptions(2026, current).months, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.equal(catalogPeriodOptions(2022, current).months.length, 12)
  assert.deepEqual(catalogPeriodOptions(2027, current).months, [])
  assert.deepEqual(catalogPeriodOptions(2021, current).months, [])
  assert.deepEqual(catalogPeriodOptions(2027, { year: 2027, month: 1 }).months, [1])
})

test('cambiar al año actual ajusta diciembre al mes actual y rechaza años fuera del rango', () => {
  const current = { year: 2026, month: 10 }
  const value = { year: 2025, month: 12 }
  assert.deepEqual(changeCatalogYear(value, 2026, current), { year: 2026, month: 10 })
  assert.deepEqual(changeCatalogYear(value, 2022, current), { year: 2022, month: 12 })
  assert.deepEqual(changeCatalogYear(value, 2027, current), value)
  assert.deepEqual(changeCatalogYear(value, 2021, current), value)
})

test('el mes predeterminado usa la fecha de Santo Domingo incluso al cambiar de mes en UTC', () => {
  assert.deepEqual(currentCatalogPeriod(new Date('2026-11-01T02:00:00Z')), { year: 2026, month: 10 })
  assert.deepEqual(currentCatalogPeriod(new Date('2027-01-01T04:00:00Z')), { year: 2027, month: 1 })
})

test('el rango incluye todo el mes, febrero bisiesto y diciembre sin pasar al siguiente año', () => {
  assert.deepEqual(catalogMonthRange({ year: 2026, month: 10 }), { from: '2026-10-01', to: '2026-10-31' })
  assert.deepEqual(catalogMonthRange({ year: 2024, month: 2 }), { from: '2024-02-01', to: '2024-02-29' })
  assert.deepEqual(catalogMonthRange({ year: 2026, month: 2 }), { from: '2026-02-01', to: '2026-02-28' })
  assert.deepEqual(catalogMonthRange({ year: 2026, month: 12 }), { from: '2026-12-01', to: '2026-12-31' })
})
