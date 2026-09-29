import test from 'node:test'
import assert from 'node:assert/strict'
import { appendUniversityExamples, SEED_ITEMS, UNIVERSITY_EXAMPLES } from '../src/data/seed.ts'
import { parseItems } from '../src/data/storage.ts'
import { projectPublicItems } from '../src/domain/catalog.ts'

test('ejemplos universitarios se agregan una vez sin reemplazar registros ni colisionar códigos', () => {
  const previous = [{ ...SEED_ITEMS[0], title: 'Registro previo editado', code: `UCSD-${new Date().getFullYear()}-0013` }]
  const snapshot = structuredClone(previous)
  const extended = appendUniversityExamples(previous)
  assert.deepEqual(previous, snapshot)
  assert.equal(extended[0], previous[0])
  assert.equal(extended.length, previous.length + 25)
  assert.equal(new Set(extended.map(item => item.code)).size, extended.length)
  assert.equal(appendUniversityExamples(extended), extended)
  assert.doesNotThrow(() => parseItems(extended))
})

test('semilla completa conserva originales y ejemplos de destinos finales solo internos', () => {
  assert.equal(SEED_ITEMS.length, 37)
  assert.equal(UNIVERSITY_EXAMPLES.filter(item => item.disposition?.kind === 'donacion').length, 2)
  assert.equal(UNIVERSITY_EXAMPLES.filter(item => item.disposition?.kind === 'remision_documentos').length, 1)
  assert.doesNotThrow(() => parseItems(SEED_ITEMS))
  const published = projectPublicItems(SEED_ITEMS)
  assert.equal(published.length, 30)
  assert.equal(published.some(item => 'disposition' in item), false)
  assert.equal(published.some(item => item.title.includes('donado') || item.title.includes('remitida')), false)
})
