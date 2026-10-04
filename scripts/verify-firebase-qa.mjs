// Real SDK checks against the isolated QA project. Creates and archives one fictitious object.
// Credentials are supplied in a local file outside Git; never printed or embedded here.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, deleteDoc, getCountFromServer, getDoc, getDocFromServer, getDocs, getFirestore, limit, query, serverTimestamp, setDoc, terminate, where, writeBatch } from 'firebase/firestore'
import { decodeFirestoreRecord, encodeFirestoreRecord } from '../src/data/firestore-records.ts'
import { archiveItem, createItem, deliverItem, disposeItem, projectPublicItems, publishItem, updateItem } from '../src/domain/catalog.ts'
import { buildPrivateIndex, buildPublicIndex } from '../src/domain/search-index.ts'

const projectId = 'ucsd-objetos-perdidos-pruebas'
assert.equal(process.env.VITE_FIREBASE_PROJECT_ID, projectId, 'This script must never run against the pilot.')
assert.ok(process.env.UCSD_QA_CREDENTIALS_FILE, 'Supply UCSD_QA_CREDENTIALS_FILE outside the repository.')
const credentials = JSON.parse(await readFile(process.env.UCSD_QA_CREDENTIALS_FILE, 'utf8'))
assert.equal(credentials.project, projectId)
const accounts = Object.fromEntries(credentials.accounts.map(account => [account.role, account]))
const options = { projectId, apiKey: process.env.VITE_FIREBASE_API_KEY, appId: process.env.VITE_FIREBASE_APP_ID }
const publicApp = initializeApp(options, 'qa-public')
const connections = new Map()
let auth = getAuth(publicApp), db = getFirestore(publicApp)
const deadline = setTimeout(() => { console.error('QA verification exceeded 120 seconds.'); process.exit(1) }, 120_000)
const denied = async (operation, label) => { await assert.rejects(operation, error => error.code === 'permission-denied', label); console.log(`Denegado: ${label}.`) }
const login = async role => {
  const account = accounts[role]
  // Separate staff clients match separate operators and avoid changing a live write stream's identity.
  if (!connections.has(role)) {
    const app = initializeApp(options, `qa-${role}`)
    connections.set(role, { app, auth: getAuth(app), db: getFirestore(app) })
  }
  const connection = connections.get(role)
  auth = connection.auth; db = connection.db
  const { user } = await signInWithEmailAndPassword(auth, account.email, account.password)
  assert.equal(user.uid, account.uid)
  const access = await getDoc(doc(db, 'access', account.email))
  assert.equal(access.data()?.role, role); assert.equal(access.data()?.active, true)
  console.log(`Acceso real aprobado: ${role}.`)
  return user
}
const persist = async (record, removePublic = false, encodeDates = true) => {
  const batch = writeBatch(db)
  const privateRecord = { ...record, ...buildPrivateIndex(record), updatedByUid: auth.currentUser.uid }
  batch.set(doc(db, 'privateItems', record.id), { ...(encodeDates ? encodeFirestoreRecord(privateRecord) : privateRecord), updatedAt: serverTimestamp() })
  const projection = projectPublicItems([record])[0]
  if (projection) batch.set(doc(db, 'publicItems', record.id), { ...projection, ...buildPublicIndex(projection) })
  else if (removePublic) batch.delete(doc(db, 'publicItems', record.id))
  await batch.commit()
}
try {
  const user = await login('registro')
  await getDocs(query(collection(db, 'privateItems'), where('createdByUid', '==', user.uid), limit(500)))
  await getCountFromServer(query(collection(db, 'privateItems'), where('createdByUid', '==', user.uid)))
  await denied(() => getCountFromServer(query(collection(db, 'privateItems'))), 'Registro no obtiene métricas de todos los objetos')
  console.log('Registro consulta sus objetos internos.')
  const draft = { title: 'Cuaderno · prueba de permisos', category: 'material_academico', itemType: 'cuaderno', description: 'Objeto ficticio de verificación remota.', foundDate: new Date().toISOString().slice(0, 10), foundLocation: 'Biblioteca', receivedDate: '', custodyLocation: '', privateDetails: 'Marca ficticia reservada.', received: false }
  let item = { ...createItem([], draft, accounts.registro.email), createdByUid: user.uid, updatedByUid: user.uid }
  item.code = `UCSD-QA-${item.id}`
  await persist(item)
  console.log(`Creacion remota aprobada. Objeto ficticio QA: ${item.id}.`)
  await getDocs(query(collection(db, 'privateItems'), where('createdByUid', '==', user.uid), limit(500)))
  await denied(() => getDocs(query(collection(db, 'privateItems'), limit(500))), 'Registro no consulta todos los objetos')
  await denied(() => getDocs(query(collection(db, 'access'), limit(500))), 'Registro no consulta roles')
  const receivedDraft = { ...draft, received: true, receivedDate: draft.foundDate, custodyLocation: 'Custodia ficticia QA' }
  const received = updateItem(item, receivedDraft, accounts.registro.email)
  await denied(() => persist(received), 'Registro no confirma recepción')
  await denied(() => persist(publishItem(received, accounts.registro.email)), 'Registro no publica')
  assert.equal((await getDoc(doc(db, 'publicItems', item.id))).exists(), false)
  await login('decanato')
  await denied(() => getDocs(query(collection(db, 'access'), limit(500))), 'Decanato no administra roles')
  assert.ok((await getCountFromServer(query(collection(db, 'privateItems')))).data().count >= 1)
  const storedDraft = (await getDocFromServer(doc(db, 'privateItems', item.id))).data()
  delete storedDraft.updatedAt
  assert.deepEqual(storedDraft, { ...item, ...buildPrivateIndex(item) }, 'The server draft must match the indexed record before receipt.')
  item = updateItem(item, receivedDraft, accounts.decanato.email)
  await persist(item)
  console.log('Recepcion remota aprobada.')
  const publicationCandidate = publishItem(item, accounts.decanato.email)
  await denied(() => persist({ ...publicationCandidate, privateDetails: 'Cambio reservado durante publicación QA' }), 'Publicar no modifica las características reservadas')
  // persist() rebuilds matching public/private indexes, so this is a coherent but forbidden public-field change.
  await denied(() => persist({ ...publicationCandidate, title: 'Título modificado al publicar QA' }), 'Publicar no modifica título ni índices públicos aunque la proyección coincida')
  item = publishItem(item, accounts.decanato.email)
  await persist(item)
  console.log('Publicacion remota aprobada.')
  await denied(() => deleteDoc(doc(db, 'publicItems', item.id)), 'Decanato no borra la publicacion sin actualizar el registro privado')
  const validDelivery = actor => deliverItem(item, { recipient: 'Estudiante ficticio', proof: 'Marca ficticia comprobada.', identityType: 'carnet_estudiante', photoEvidenceReference: 'QA-EVIDENCIA-EXTERNA-FICTICIA' }, actor)
  auth = connections.get('registro').auth; db = connections.get('registro').db
  await denied(() => persist(validDelivery(accounts.registro.email), true), 'Registro no entrega ni elimina la publicacion en un batch')
  await login('admin')
  const custodianAccess = doc(db, 'access', accounts.decanato.email)
  const accessMetadata = { email: accounts.decanato.email, role: 'decanato', updatedByUid: auth.currentUser.uid }
  try {
    await setDoc(custodianAccess, { ...accessMetadata, active: false, updatedAt: serverTimestamp() })
    auth = connections.get('decanato').auth; db = connections.get('decanato').db
    await denied(() => persist(validDelivery(accounts.decanato.email), true), 'Decanato inactivo no entrega ni elimina la publicacion en un batch')
  } finally {
    const adminDatabase = connections.get('admin').db
    await setDoc(doc(adminDatabase, 'access', accounts.decanato.email), { ...accessMetadata, active: true, updatedAt: serverTimestamp() })
  }
  auth = getAuth(publicApp); db = getFirestore(publicApp)
  await denied(() => deleteDoc(doc(db, 'publicItems', item.id)), 'Visitante no elimina publicaciones')
  assert.ok((await getCountFromServer(query(collection(db, 'publicItems')))).data().count >= 1)
  const publicRecord = await getDoc(doc(db, 'publicItems', item.id))
  assert.equal(publicRecord.data()?.title, draft.title)
  assert.deepEqual(publicRecord.data(), { ...projectPublicItems([item])[0], ...buildPublicIndex(projectPublicItems([item])[0]) })
  assert.equal('privateDetails' in publicRecord.data(), false)
  assert.equal('custodyLocation' in publicRecord.data(), false)
  assert.equal('recipient' in publicRecord.data(), false)
  assert.equal('evidenceId' in publicRecord.data(), false)
  await denied(() => getDoc(doc(db, 'privateItems', item.id)), 'Visitante no consulta custodia')
  await login('decanato')
  for (const extra of [{ recipient: 'Receptor privado QA' }, { evidenceId: 'evidencia-inventada-para-qa-0001' }, { custodyLocation: 'Custodia ficticia QA' }]) {
    await denied(() => setDoc(doc(db, 'publicItems', item.id), { ...publicRecord.data(), ...extra }), `La proyección pública rechaza ${Object.keys(extra)[0]}`)
  }
  await denied(() => setDoc(doc(db, 'publicItems', item.id), { ...publicRecord.data(), status: 'entregado' }), 'No se publica entregado mientras el objeto privado siga disponible')
  const malformedDelivery = { ...deliverItem(item, { recipient: 'Estudiante ficticio', proof: 'Marca ficticia comprobada.', identityType: 'carnet_estudiante', photoEvidenceReference: 'QA-EVIDENCIA-EXTERNA-FICTICIA' }, accounts.decanato.email) }
  delete malformedDelivery.delivery.identityType
  delete malformedDelivery.delivery.photoEvidenceReference
  await denied(() => persist(malformedDelivery, true), 'Entrega nueva exige identificación y evidencia externa')
  if (process.env.UCSD_EVIDENCE_ENABLED === 'true') {
    await denied(() => persist(validDelivery(accounts.decanato.email), true), 'El cliente no confirma entregas fuera del servicio de fotografías')
    const invented = deliverItem(item, { recipient: 'Estudiante ficticio', proof: 'Marca ficticia comprobada.', identityType: 'carnet_estudiante', evidenceId: 'evidencia-inventada-para-qa-0001' }, accounts.decanato.email)
    await denied(() => persist(invented, true), 'Una referencia inventada no permite confirmar la entrega')
    assert.equal((await getDoc(doc(db, 'publicItems', item.id))).exists(), true)
    console.log('Entrega directa denegada; el flujo con fotografías se comprueba por separado.')
  } else {
    item = validDelivery(accounts.decanato.email)
    await persist(item, true)
    console.log('Entrega externa histórica remota aprobada.')
    assert.equal((await getDocFromServer(doc(db, 'publicItems', item.id))).data()?.status, 'entregado')
  }
  item = archiveItem(item, accounts.decanato.email)
  await persist(item, process.env.UCSD_EVIDENCE_ENABLED === 'true')
  console.log('Archivo remoto aprobado.')
  assert.equal((await getDoc(doc(db, 'privateItems', item.id))).data()?.status, 'archivado')
  const archivedProjection = (await getDocFromServer(doc(db, 'publicItems', item.id))).data()
  if (item.delivery) {
    const projected = projectPublicItems([item])[0]
    assert.deepEqual(archivedProjection, { ...projected, ...buildPublicIndex(projected) })
    assert.equal(archivedProjection.status, 'entregado')
    await denied(() => deleteDoc(doc(db, 'publicItems', item.id)), 'El archivo conserva la ficha pública de una entrega')
  } else assert.equal(archivedProjection, undefined)
  await login('admin')
  assert.ok((await getDocs(query(collection(db, 'access'), limit(500)))).size >= 3)
  assert.ok((await getCountFromServer(query(collection(db, 'privateItems')))).data().count >= 1)
  const access = (email, role) => ({ email, role, active: true, updatedByUid: auth.currentUser.uid, updatedAt: serverTimestamp() })
  await denied(() => setDoc(doc(db, 'access', accounts.registro.email), access(accounts.registro.email, 'admin')), 'No cambia el rol fijo de una cuenta QA')
  await denied(() => setDoc(doc(db, 'access', 'rsegura20250554@ucsd.edu.do'), access('rsegura20250554@ucsd.edu.do', 'developer')), 'Administrador no concede Developer')
  await setDoc(doc(db, 'access', accounts.registro.email), access(accounts.registro.email, 'registro'))
  const registrationAccess = doc(db, 'access', accounts.registro.email)
  try {
    await setDoc(registrationAccess, { ...access(accounts.registro.email, 'registro'), active: false })
    await denied(() => getDocFromServer(doc(connections.get('registro').db, 'privateItems', item.id)), 'Un permiso desactivado impide leer objetos internos aun con una sesion abierta')
  } finally {
    await setDoc(registrationAccess, access(accounts.registro.email, 'registro'))
  }
  console.log('Revocacion real aprobada; cuenta Registro restaurada activa.')
  await login('decanato')
  const agedDate = new Date(Date.now() - 91 * 86_400_000).toISOString().slice(0, 10)
  for (const [category, itemType, kind] of [['bolsos_accesorios', 'mochila', 'donacion'], ['documentos', 'documento', 'remision_documentos']]) {
    let aged = { ...createItem([], { ...draft, title: `Destino ficticio QA: ${kind}`, category, itemType, foundDate: agedDate, receivedDate: agedDate, received: true, custodyLocation: 'Custodia ficticia QA' }, accounts.decanato.email), createdByUid: auth.currentUser.uid }
    aged.code = `UCSD-QA-${aged.id}`
    await persist(aged)
    aged = publishItem(aged, accounts.decanato.email)
    await persist(aged)
    const disposed = disposeItem(aged, { kind, recipient: 'Destino ficticio QA', reference: 'CONSTANCIA-FICTICIA-QA' }, accounts.decanato.email)
    await denied(() => persist(disposed, true, false), 'Destino final rechaza fecha de texto aportada por cliente')
    await persist(disposed, true)
    const stored = (await getDocFromServer(doc(db, 'privateItems', aged.id))).data()
    assert.equal(typeof stored.disposition.completedAt.toMillis(), 'number')
    assert.equal(decodeFirestoreRecord(stored).disposition.kind, kind)
    assert.equal((await getDocFromServer(doc(db, 'publicItems', aged.id))).exists(), false)
    await denied(() => persist(disposed, false), 'Un destino final completado no se puede reescribir')
    console.log(`Destino final remoto aprobado: ${kind}.`)
  }
  console.log(`Flujo remoto QA aprobado: registro → recepción → publicación → consulta anónima → ${process.env.UCSD_EVIDENCE_ENABLED === 'true' ? 'rechazo de entrega directa' : 'entrega externa'} → archivo. ID ${item.id}.`)
} finally {
  clearTimeout(deadline)
  for (const connection of connections.values()) {
    await signOut(connection.auth)
    await terminate(connection.db)
    await deleteApp(connection.app)
  }
  await terminate(getFirestore(publicApp))
  await deleteApp(publicApp)
}
