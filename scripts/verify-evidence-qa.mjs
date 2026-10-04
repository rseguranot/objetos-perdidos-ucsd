// Explicitly isolated remote checks; uses the existing SDK and credentials outside Git.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, doc, getDocFromServer, getDocs, getFirestore, limit, query, serverTimestamp, setDoc, terminate, writeBatch } from 'firebase/firestore'
import { archiveItem, createItem, projectPublicItems, publishItem, updateItem } from '../src/domain/catalog.ts'
import { buildPrivateIndex, buildPublicIndex } from '../src/domain/search-index.ts'
import { decodeFirestoreRecord, encodeFirestoreRecord } from '../src/data/firestore-records.ts'

const env = Object.fromEntries((await readFile('.env.pruebas.local', 'utf8')).split(/\r?\n/).filter(line => /^VITE_\w+=/.test(line)).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')] }))
assert.equal(env.VITE_FIREBASE_PROJECT_ID, 'ucsd-objetos-perdidos-pruebas')
assert.ok(process.env.UCSD_QA_CREDENTIALS_FILE, 'Supply credentials outside Git.')
const credentials = JSON.parse(await readFile(process.env.UCSD_QA_CREDENTIALS_FILE, 'utf8'))
assert.equal(credentials.project, env.VITE_FIREBASE_PROJECT_ID)
const apps = []
const connect = async role => {
  const app = initializeApp({ projectId: env.VITE_FIREBASE_PROJECT_ID, apiKey: env.VITE_FIREBASE_API_KEY, appId: env.VITE_FIREBASE_APP_ID }, `evidence-${role}-${Date.now()}`)
  apps.push(app)
  const db = getFirestore(app), auth = getAuth(app)
  if (role !== 'public') { const account = credentials.accounts.find(a => a.role === role); await signInWithEmailAndPassword(auth, account.email, account.password) }
  return { db, auth }
}
const denied = async action => { await assert.rejects(action, error => error.code === 'permission-denied') }
const persist = async (db, auth, item, remove = false) => {
  const batch = writeBatch(db)
  batch.set(doc(db, 'privateItems', item.id), { ...encodeFirestoreRecord(item), ...buildPrivateIndex(item), updatedByUid: auth.currentUser.uid, updatedAt: serverTimestamp() })
  const publicItem = projectPublicItems([item])[0]
  if (publicItem) batch.set(doc(db, 'publicItems', item.id), { ...publicItem, ...buildPublicIndex(publicItem) })
  else if (remove) batch.delete(doc(db, 'publicItems', item.id))
  await batch.commit()
}
try {
  const admin = await connect('admin')
  if (process.argv[2] === 'prepare') {
    for (const count of [1, 3]) {
      const date = new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10)
      const draft = { title: `Cuaderno evidencia QA ${count} fotos`, category: 'material_academico', itemType: 'cuaderno', description: 'Objeto ficticio para verificar fotografías privadas.', foundDate: date, foundLocation: 'Edificio La Altagracia (EAL)', receivedDate: '', custodyLocation: '', privateDetails: 'Marca reservada ficticia QA.', received: false }
      let item = { ...createItem([], draft, admin.auth.currentUser.email), createdByUid: admin.auth.currentUser.uid, updatedByUid: admin.auth.currentUser.uid }
      item.code = `UCSD-QA-${item.id}`
      await persist(admin.db, admin.auth, item)
      item = updateItem(item, { ...draft, received: true, receivedDate: date, custodyLocation: 'Custodia ficticia QA' }, admin.auth.currentUser.email)
      await persist(admin.db, admin.auth, item)
      item = publishItem(item, admin.auth.currentUser.email)
      await persist(admin.db, admin.auth, item)
      console.log(JSON.stringify({ id: item.id, title: item.title, code: item.code }))
    }
  } else {
    const itemId = process.argv[3]
    assert.ok(itemId, 'Pass check and the delivered QA item ID.')
    const raw = (await getDocFromServer(doc(admin.db, 'privateItems', itemId))).data()
    assert.ok(raw?.title?.startsWith('Cuaderno evidencia QA '), 'Only dedicated fictitious records can be archived.')
    const item = decodeFirestoreRecord(raw)
    assert.ok(item.delivery?.evidenceId)
    const publicProjection = projectPublicItems([item])[0]
    assert.ok(publicProjection, 'A delivered or archived handover retains a public projection.')
    const expectedPublic = { ...publicProjection, ...buildPublicIndex(publicProjection) }
    assert.equal(publicProjection.status, 'entregado')
    assert.deepEqual((await getDocFromServer(doc(admin.db, 'publicItems', itemId))).data(), expectedPublic)
    for (const extra of [{ recipient: raw.delivery.recipient }, { evidenceId: raw.delivery.evidenceId }, { custodyLocation: raw.custodyLocation }]) {
      await denied(() => setDoc(doc(admin.db, 'publicItems', itemId), { ...expectedPublic, ...extra }))
    }
    await denied(() => setDoc(doc(admin.db, 'publicItems', itemId), { ...expectedPublic, status: 'disponible' }))
    const evidence = (await getDocFromServer(doc(admin.db, 'deliveryEvidence', item.delivery.evidenceId))).data()
    assert.equal(evidence.itemId, itemId)
    assert.equal(evidence.photos.length, item.title.includes('3 fotos') ? 3 : 1)
    assert.deepEqual(item.searchTerms, buildPrivateIndex(item).searchTerms)
    const register = await connect('registro'), visitor = await connect('public')
    await getDocs(query(collection(register.db, 'deliveryEvidence'), limit(25)))
    await denied(() => getDocFromServer(doc(register.db, 'privateItems', itemId)))
    await denied(() => getDocFromServer(doc(visitor.db, 'deliveryEvidence', evidence.id)))
    assert.deepEqual((await getDocFromServer(doc(visitor.db, 'publicItems', itemId))).data(), expectedPublic)
    await denied(() => setDoc(doc(admin.db, 'deliveryEvidence', 'inventada'), { itemId }))
    const archived = item.status === 'archivado' ? item : archiveItem(item, admin.auth.currentUser.email)
    if (item.status !== 'archivado') await persist(admin.db, admin.auth, archived)
    const after = (await getDocFromServer(doc(admin.db, 'privateItems', itemId))).data()
    assert.equal(after.status, 'archivado')
    assert.deepEqual(after.delivery, raw.delivery)
    assert.equal(after.deliveryDate, raw.deliveryDate)
    assert.deepEqual((await getDocFromServer(doc(visitor.db, 'publicItems', itemId))).data(), expectedPublic)
    assert.equal('delivery' in expectedPublic, false)
    assert.equal('evidenceId' in expectedPublic, false)
    assert.equal('custodyLocation' in expectedPublic, false)
    console.log('Entrega, fotos, privacidad, índice y archivo remoto: aprobados.')
  }
} finally { for (const app of apps) { await terminate(getFirestore(app)); await deleteApp(app) } }
