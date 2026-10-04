// Read-only SDK checks against the isolated QA project. Credentials stay outside Git.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, documentId, getCountFromServer, getDocs, getFirestore, limit, orderBy, query, startAfter, where, terminate } from 'firebase/firestore'
import { loadStaffMetrics, summarizeLocalMetrics } from '../src/data/metrics.ts'
import { decodeFirestoreRecord } from '../src/data/firestore-records.ts'
import { parseItems } from '../src/data/storage.ts'

const projectId = 'ucsd-objetos-perdidos-pruebas'
assert.equal(process.env.VITE_FIREBASE_PROJECT_ID, projectId)
assert.ok(process.env.UCSD_QA_CREDENTIALS_FILE)
const credentials = JSON.parse(await readFile(process.env.UCSD_QA_CREDENTIALS_FILE, 'utf8'))
assert.equal(credentials.project, projectId)
const admin = credentials.accounts.find(account => account.role === 'admin')
assert.ok(admin)
const app = initializeApp({ projectId, apiKey: process.env.VITE_FIREBASE_API_KEY, appId: process.env.VITE_FIREBASE_APP_ID }, 'capacity-qa')
const db = getFirestore(app)
const auth = getAuth(app)
const publicCollection = collection(db, 'publicItems')
const privateCollection = collection(db, 'privateItems')
try {
  const publicTotal = (await getCountFromServer(query(publicCollection))).data().count
  const publicPage = await getDocs(query(publicCollection, orderBy('foundDate', 'desc'), orderBy(documentId(), 'desc'), limit(25)))
  assert.ok(publicPage.size <= 25)
  if (publicPage.size === 25) {
    const next = await getDocs(query(publicCollection, orderBy('foundDate', 'desc'), orderBy(documentId(), 'desc'), startAfter(publicPage.docs.at(-1)), limit(25)))
    const ids = new Set([...publicPage.docs, ...next.docs].map(doc => doc.id))
    assert.equal(ids.size, publicPage.size + next.size, 'Páginas duplicadas.')
  }
  for (const doc of publicPage.docs) {
    assert.ok(['disponible', 'entregado'].includes(doc.data().status))
    assert.deepEqual(Object.keys(doc.data()).sort(), ['id', 'code', 'title', 'category', 'itemType', 'description', 'foundDate', 'foundLocation', 'status', 'buildingId', 'searchTerms'].sort())
    for (const field of ['custodyLocation', 'privateDetails', 'publicSearchTerms', 'delivery', 'recipient', 'proof', 'evidenceId', 'photos', 'fileId', 'history', 'disposition']) assert.equal(field in doc.data(), false)
  }
  const sample = publicPage.docs[0]?.data()
  if (sample) {
    const combined = await getDocs(query(publicCollection, where('category', '==', sample.category), where('buildingId', '==', sample.buildingId), where('foundDate', '>=', sample.foundDate), where('foundDate', '<=', sample.foundDate), orderBy('foundDate', 'desc'), orderBy(documentId(), 'desc'), limit(25)))
    assert.ok(combined.docs.some(doc => doc.id === sample.id), 'El filtro combinado perdió un registro conocido.')
    const searched = await getDocs(query(publicCollection, where('searchTerms', 'array-contains', sample.searchTerms[0]), orderBy('foundDate', 'desc'), orderBy(documentId(), 'desc'), limit(25)))
    assert.ok(searched.size > 0, 'El índice de búsqueda no devolvió candidatos.')
  }
  const { user } = await signInWithEmailAndPassword(auth, admin.email, admin.password)
  assert.equal(user.uid, admin.uid)
  const privateTotal = (await getCountFromServer(query(privateCollection))).data().count
  const internal = await getDocs(query(privateCollection, where('status', '==', 'disponible'), orderBy('foundDate', 'desc'), orderBy(documentId(), 'desc'), limit(25)))
  for (const doc of internal.docs) assert.equal(doc.data().status, 'disponible')
  const delivered = (await getCountFromServer(query(privateCollection, where('deliveryDate', '>=', '2026-01-01'), where('deliveryDate', '<', '2027-01-01')))).data().count
  const donated = (await getCountFromServer(query(privateCollection, where('disposition.kind', '==', 'donacion'), where('dispositionDate', '>=', '2026-01-01'), where('dispositionDate', '<', '2027-01-01')))).data().count
  const session = { uid: user.uid, email: admin.email, verified: true, role: 'admin' }
  const started = performance.now()
  const measured = await loadStaffMetrics(db, session, 2026)
  const elapsedMs = Math.round(performance.now() - started)
  const full = parseItems((await getDocs(query(privateCollection, limit(500)))).docs.map(snapshot => decodeFirestoreRecord(snapshot.data())))
  assert.equal(full.length, privateTotal, 'Esta prueba de referencia requiere menos de 500 registros QA.')
  const expected = summarizeLocalMetrics(full, session, 2026)
  assert.deepEqual(measured, expected, 'Las métricas remotas difieren del conjunto de referencia completo.')
  const registro = credentials.accounts.find(account => account.role === 'registro')
  assert.ok(registro)
  await signOut(auth)
  const registroUser = (await signInWithEmailAndPassword(auth, registro.email, registro.password)).user
  assert.equal(registroUser.uid, registro.uid)
  const registroSession = { uid: registroUser.uid, email: registro.email, verified: true, role: 'registro' }
  const registroStarted = performance.now()
  const registroMetrics = await loadStaffMetrics(db, registroSession, 2026)
  const registroElapsedMs = Math.round(performance.now() - registroStarted)
  const ownedReference = summarizeLocalMetrics(full, registroSession, 2026)
  assert.deepEqual(registroMetrics, ownedReference, 'Registro debe contar únicamente sus objetos y coincidir con la referencia completa.')
  console.log(JSON.stringify({ project: projectId, publicTotal, privateTotal, firstPublicPage: publicPage.size, delivered2026: delivered, donated2026: donated, reportMs: elapsedMs, metricsMatch: true, registroReportMs: registroElapsedMs, registroOwnedRecords: full.filter(item => item.createdByUid === registro.uid).length, registroMetricsMatch: true }))
} finally {
  await signOut(auth).catch(() => {})
  await terminate(db)
  await deleteApp(app)
}
