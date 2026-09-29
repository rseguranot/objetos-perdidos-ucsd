import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPrivateIndex, buildPublicIndex, normalizeSearchWords } from '../src/domain/search-index.ts'
import { buildPilotExamples } from '../src/data/pilot-examples.ts'
import { projectPublicItems } from '../src/domain/catalog.ts'

test('palabras enteras normalizadas sin términos repetidos', () => {
  assert.deepEqual(normalizeSearchWords('Audífonos, AUDIFONOS y USB-C'), ['audifonos', 'y', 'usb', 'c'])
})

test('el índice público omite custodia, detalles privados y destinatarios', () => {
  const item = { ...buildPilotExamples('2026-09-29')[0], privateDetails: 'SECRETO123', custodyLocation: 'ARMARIO789', delivery: { recipient: 'PERSONA456', proof: 'prueba', deliveredAt: '2026-09-29T03:30:00.000Z' } }
  const published = projectPublicItems([{ ...item, delivery: undefined }])[0]
  const publicIndex = buildPublicIndex(published)
  const privateIndex = buildPrivateIndex(item)
  assert.ok(!publicIndex.searchTerms.some(term => ['secreto123', 'armario789', 'persona456'].includes(term)))
  assert.ok(privateIndex.searchTerms.includes('secreto123'))
  assert.ok(privateIndex.searchTerms.includes('armario789'))
  assert.ok(privateIndex.searchTerms.includes('persona456'))
  assert.equal(privateIndex.deliveryDate, '2026-09-28')
  assert.equal(publicIndex.buildingId, 'Biblioteca Octavio Cardenal Beras Rojas')
})

test('fechas de eventos ausentes son cadenas vacías', () => {
  const index = buildPrivateIndex(buildPilotExamples('2026-09-29')[0])
  assert.equal(index.deliveryDate, '')
  assert.equal(index.dispositionDate, '')
})
