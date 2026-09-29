import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPUS_LOCATIONS, LEGACY_LOCATION, joinFoundLocation, matchesBuilding, splitFoundLocation } from '../src/domain/campus.ts'
import { filterInternalItems, filterPublicCatalog, projectPublicItems } from '../src/domain/catalog.ts'
import { SEED_ITEMS } from '../src/data/seed.ts'

const eal = 'Edificio La Altagracia (EAL)'
test('campus directory separates EFV/ECL and round-trips a classroom without guessing historic buildings', () => {
  assert.equal(CAMPUS_LOCATIONS.length, 17)
  assert.deepEqual(splitFoundLocation(joinFoundLocation(eal, '  Aula 206  ')), { building: eal, detail: 'Aula 206' })
  assert.deepEqual(splitFoundLocation('Aulas'), { building: LEGACY_LOCATION, detail: 'Aulas' })
  assert.equal(joinFoundLocation(LEGACY_LOCATION, 'Aulas'), 'Aulas')
  assert.throws(() => joinFoundLocation('Inventado', '206'))
})

test('a building filter includes all its classrooms and never matches a similar prefix', () => {
  assert.equal(matchesBuilding(`${eal} · Aula 206`, eal), true)
  assert.equal(matchesBuilding(`${eal} · Pasillo`, eal), true)
  assert.equal(matchesBuilding('EALX · Aula 206', eal), false)
  assert.equal(matchesBuilding('EAL · Aula 206', eal), true)
  assert.equal(matchesBuilding('Aulas', LEGACY_LOCATION), true)
})

test('official spelling variants resolve to the same campus building', () => {
  assert.equal(splitFoundLocation('Edificio Pedro de Córdoba (EPC)').building, 'Edificio Pedro de Córdova (EPC)')
  assert.equal(splitFoundLocation('Edificio Francisco de Victoria (EFV)').building, 'Edificio Francisco de Vitoria (EFV)')
})

test('public and internal filters combine building, classroom text and inclusive dates', () => {
  const item = { ...SEED_ITEMS[0], foundLocation: joinFoundLocation(eal, 'Aula 206') }
  assert.equal(filterPublicCatalog(projectPublicItems([item]), { query: 'EAL 206', category: '', location: eal, from: item.foundDate, to: item.foundDate }).length, 1)
  assert.equal(filterInternalItems([item], { query: '206', status: '', building: eal, from: '', to: '' }).length, 1)
  assert.equal(filterInternalItems([item], { query: '', status: '', building: 'Edificio Inmaculada (EIN)', from: '', to: '' }).length, 0)
  assert.deepEqual(Object.keys(projectPublicItems([item])[0]).sort(), ['id', 'code', 'title', 'category', 'itemType', 'description', 'foundDate', 'foundLocation', 'status'].sort())
})
