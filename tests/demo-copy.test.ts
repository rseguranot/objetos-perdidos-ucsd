import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanDemoObjectText } from '../src/domain/demo-copy.ts'

test('limpia etiquetas de demostración y conserva la descripción útil', () => {
  assert.equal(cleanDemoObjectText('Estuche negro. Objeto ficticio. Lugar del hallazgo: entrada.'), 'Estuche negro. Lugar del hallazgo: entrada.')
  assert.equal(cleanDemoObjectText('Cuaderno ficticio azul'), 'Cuaderno azul')
  assert.equal(cleanDemoObjectText('Llaves FICTICIAS.'), 'Llaves.')
  const text = 'Botella verde.\nTiene tapa negra.'
  assert.equal(cleanDemoObjectText(text), text)
})
