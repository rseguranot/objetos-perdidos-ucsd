// Comprobaciones remotas de solo lectura, sin sesión ni credenciales administrativas.
import assert from 'node:assert/strict'
import { initializeApp, deleteApp } from 'firebase/app'
import { collection, doc, getCountFromServer, getDoc, getDocs, getFirestore, limit, orderBy, query, terminate } from 'firebase/firestore'

const projectId = process.env.VITE_FIREBASE_PROJECT_ID
assert.ok(projectId && process.env.VITE_FIREBASE_API_KEY, 'Carga la configuración pública con --env-file=.env.firebase.local.')
const app = initializeApp({ projectId, apiKey: process.env.VITE_FIREBASE_API_KEY, appId: process.env.VITE_FIREBASE_APP_ID })
const db = getFirestore(app)
const deadline = setTimeout(() => { console.error('La comprobación remota excedió 30 segundos.'); process.exit(1) }, 30_000)
try {
  const publicCatalog = await getDocs(query(collection(db, 'publicItems'), orderBy('foundDate', 'desc'), limit(25)))
  const total = (await getCountFromServer(collection(db, 'publicItems'))).data().count
  assert.ok(total >= publicCatalog.size)
  for (const entry of publicCatalog.docs) {
    const fields = entry.data()
    assert.deepEqual(Object.keys(fields).filter(key => key !== 'updatedAt').sort(), ['buildingId', 'category', 'code', 'description', 'foundDate', 'foundLocation', 'id', 'itemType', 'searchTerms', 'status', 'title'])
    assert.equal('custodyLocation' in fields || 'privateDetails' in fields || 'publicSearchTerms' in fields, false)
    assert.equal(fields.status, 'disponible')
  }
  console.log(`Consulta pública permitida: ${publicCatalog.size} en la primera página, ${total} en total.`)
  for (const [label, operation] of [
    ['registro interno anónimo', () => getDoc(doc(db, 'privateItems', 'verificacion-sin-sesion'))],
    ['permiso anónimo', () => getDoc(doc(db, 'access', 'verificacion@ucsd.edu.do'))],
  ]) {
    await assert.rejects(operation, error => error.code === 'permission-denied', `Se esperaba denegación: ${label}`)
    console.log(`Denegado: ${label}.`)
  }
  console.log(`Validación anónima aprobada en ${projectId}. No valida roles autenticados ni entregas.`)
} finally {
  clearTimeout(deadline)
  await terminate(db)
  await deleteApp(app)
}
