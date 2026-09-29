import { test } from 'node:test'
import assert from 'node:assert/strict'
import { joinFoundLocation, locationForEditing, matchesBuilding, LEGACY_LOCATION } from '../src/domain/campus.ts'

test('editar mueve el aula histórica a la descripción sin perder el filtro de edificio', () => {
  const original = 'Edificio La Altagracia (EAL) · Aula 206'
  const next = locationForEditing(original, 'Cuaderno azul.')
  assert.equal(next.description, 'Cuaderno azul.\nLugar del hallazgo: Aula 206.')
  const location = joinFoundLocation(next.building, '')
  assert.equal(location, 'Edificio La Altagracia (EAL)')
  assert.ok(matchesBuilding(location, next.building))
  assert.deepEqual(locationForEditing(location, next.description), next)
  assert.equal(locationForEditing(original, 'Encontrado en aula 206.').description, 'Encontrado en aula 206.')
})
test('ubicaciones históricas desconocidas conservan su texto y descripción', () => {
  const next = locationForEditing('Pasillo antiguo', 'Estuche blanco.')
  assert.equal(next.building, LEGACY_LOCATION)
  assert.equal(next.description, 'Estuche blanco.')
})
