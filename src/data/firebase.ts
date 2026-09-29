import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { browserSessionPersistence, connectAuthEmulator, getAuth, getIdToken, getRedirectResult, GoogleAuthProvider, reload, sendEmailVerification, setPersistence, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { cloudMode, firebaseConfigured, googleRedirectConfigured } from './mode'
import { institutionalEmail } from '../domain/roles'

const options: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
const app = cloudMode && firebaseConfigured ? initializeApp(options) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
if (app && auth && db && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
export async function completeGoogleRedirect(): Promise<void> { if (auth) await getRedirectResult(auth) }
export async function loginGoogle(mode: 'popup' | 'redirect' = 'popup'): Promise<void> {
  if (!auth) throw new Error('El proyecto Firebase todavía no está configurado. Revisa las instrucciones de conexión.')
  if (mode === 'redirect' && !googleRedirectConfigured) throw new Error('El acceso en esta pestaña requiere que la aplicación y Firebase Authentication compartan dominio. Utiliza el acceso en ventana de Google.')
  await setPersistence(auth, browserSessionPersistence)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ hd: 'ucsd.edu.do', prompt: 'select_account' })
  if (mode === 'redirect') await signInWithRedirect(auth, provider)
  else await signInWithPopup(auth, provider)
}
export async function loginEmail(email: string, password: string): Promise<void> {
  if (!auth) throw new Error('El proyecto Firebase todavía no está configurado. Revisa las instrucciones de conexión.')
  const cleanEmail = institutionalEmail(email)
  if (!password) throw new Error('Introduce tu contraseña.')
  await setPersistence(auth, browserSessionPersistence)
  await signInWithEmailAndPassword(auth, cleanEmail, password)
}
export async function sendVerificationEmail(): Promise<void> {
  const user = auth?.currentUser
  if (!auth || !user) throw new Error('Inicia sesión antes de solicitar la verificación.')
  institutionalEmail(user.email ?? '')
  if (user.emailVerified) return
  auth.languageCode = 'es'
  await sendEmailVerification(user)
}
export async function refreshIdentity(): Promise<void> {
  const user = auth?.currentUser
  if (!user) throw new Error('Inicia sesión para comprobar la verificación.')
  await reload(user)
  // Replacing the session during reload must not refresh an obsolete identity.
  if (auth?.currentUser !== user) return
  await getIdToken(user, true)
}
export async function logout(): Promise<void> { if (auth) await signOut(auth) }
export const logoutGoogle = logout
