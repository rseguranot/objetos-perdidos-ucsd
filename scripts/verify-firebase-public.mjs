// Comprobaciones remotas de solo lectura, sin sesión ni credenciales administrativas.
import assert from 'node:assert/strict'
import { initializeApp, deleteApp } from 'firebase/app'
import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, terminate } from 'firebase/firestore'

const projectId = process.env.VITE_FIREBASE_PROJECT_ID
assert.ok(projectId && process.env.VITE_FIREBASE_API_KEY, 'Carga la configuración pública con --env-file=.env.firebase.local.')
const app = initializeApp({ projectId, apiKey: process.env.VITE_FIREBASE_API_KEY, appId: process.env.VITE_FIREBASE_APP_ID })
const db = getFirestore(app)
const deadline = setTimeout(() => { console.error('La comprobación remota excedió 30 segundos.'); process.exit(1) }, 30_000)
try {
  const publicCatalog = await getDocs(query(collection(db, 'publicItems'), orderBy('foundDate', 'desc'), limit(500)))
  console.log(`Consulta pública permitida: ${publicCatalog.size} registros.`)
  for (const [label, operation] of [
    ['registro interno anónimo', () => getDoc(doc(db, 'privateItems', 'verificacion-sin-sesion'))],
    ['permiso anónimo', () => getDoc(doc(db, 'access', 'verificacion@ucsd.edu.do'))],
    ['consulta pública sin límite', () => getDocs(collection(db, 'publicItems'))],
    ['consulta pública sobre el límite', () => getDocs(query(collection(db, 'publicItems'), limit(501)))],
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
