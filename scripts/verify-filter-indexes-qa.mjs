// Probe the filter combinations offered by the UI; never writes data.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, documentId, getDocs, getFirestore, limit, orderBy, query, terminate, where } from 'firebase/firestore'

const projectId = 'ucsd-objetos-perdidos-pruebas'
assert.equal(process.env.VITE_FIREBASE_PROJECT_ID, projectId)
const credentials = JSON.parse(await readFile(process.env.UCSD_QA_CREDENTIALS_FILE, 'utf8'))
assert.equal(credentials.project, projectId)
const admin = credentials.accounts.find(account => account.role === 'admin')
const registro = credentials.accounts.find(account => account.role === 'registro')
const app = initializeApp({ projectId, apiKey: process.env.VITE_FIREBASE_API_KEY, appId: process.env.VITE_FIREBASE_APP_ID }, 'index-matrix')
const auth = getAuth(app)
const db = getFirestore(app)
const failures = []
let queries = 0
async function probe(collectionName, label, constraints, sort = 'foundDate') {
  queries++
  try {
    await getDocs(query(collection(db, collectionName), ...constraints, orderBy(sort, 'desc'), orderBy(documentId(), 'desc'), limit(1)))
  } catch (error) {
    failures.push({ label, code: error.code ?? 'unknown', message: error.message })
  }
}
try {
  const publicFields = [where('category', '==', 'electronica'), where('itemType', '==', 'celular'), where('buildingId', '==', 'Cafeterías')]
  for (let mask = 0; mask < 8; mask++) for (const search of ['none', 'terms', 'code']) {
    const constraints = publicFields.filter((_, index) => mask & (1 << index))
    if (search === 'terms') constraints.push(where('searchTerms', 'array-contains', 'celular'))
    if (search === 'code') constraints.push(where('code', '==', 'UCSD-2026-0013'))
    constraints.push(where('foundDate', '>=', '2026-01-01'), where('foundDate', '<=', '2026-12-31'))
    await probe('publicItems', `public:${mask}:${search}`, constraints)
  }
  await signInWithEmailAndPassword(auth, admin.email, admin.password)
  const privateFields = [where('category', '==', 'electronica'), where('itemType', '==', 'celular'), where('buildingId', '==', 'Cafeterías'), where('status', '==', 'disponible')]
  for (let mask = 0; mask < 16; mask++) for (const search of ['none', 'terms', 'code']) {
    const constraints = privateFields.filter((_, index) => mask & (1 << index))
    if (search === 'terms') constraints.push(where('searchTerms', 'array-contains', 'celular'))
    if (search === 'code') constraints.push(where('code', '==', 'UCSD-2026-0013'))
    constraints.push(where('foundDate', '>=', '2026-01-01'), where('foundDate', '<=', '2026-12-31'))
    await probe('privateItems', `admin:${mask}:${search}`, constraints)
  }
  for (const destination of ['donacion', 'pendiente90']) for (let mask = 0; mask < 8; mask++) {
    const constraints = privateFields.slice(0, 3).filter((_, index) => mask & (1 << index))
    if (destination === 'donacion') {
      constraints.push(where('disposition.kind', '==', 'donacion'), where('foundDate', '>=', '2026-01-01'))
      await probe('privateItems', `destination:${destination}:${mask}`, constraints)
    } else {
      constraints.push(where('received', '==', true), where('deliveryDate', '==', ''), where('dispositionDate', '==', ''), where('receivedDate', '<=', '2026-09-29'))
      await probe('privateItems', `destination:${destination}:${mask}`, constraints, 'receivedDate')
    }
  }
  await signOut(auth)
  await signInWithEmailAndPassword(auth, registro.email, registro.password)
  for (let mask = 0; mask < 16; mask++) for (const search of ['none', 'terms', 'code']) {
    const constraints = [where('createdByUid', '==', registro.uid), ...privateFields.filter((_, index) => mask & (1 << index))]
    if (search === 'terms') constraints.push(where('searchTerms', 'array-contains', 'celular'))
    if (search === 'code') constraints.push(where('code', '==', 'UCSD-2026-0013'))
    constraints.push(where('foundDate', '>=', '2026-01-01'), where('foundDate', '<=', '2026-12-31'))
    await probe('privateItems', `registro:${mask}:${search}`, constraints)
  }
  console.log(JSON.stringify({ project: projectId, queries, failures: failures.length, missing: failures.slice(0, 40) }, null, 2))
  assert.equal(failures.length, 0, 'Faltan índices o permisos para filtros combinados.')
} finally {
  await signOut(auth).catch(() => {})
  await terminate(db)
  await deleteApp(app)
}
