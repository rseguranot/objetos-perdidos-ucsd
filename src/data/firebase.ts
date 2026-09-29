import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { browserSessionPersistence, connectAuthEmulator, getAuth, getRedirectResult, GoogleAuthProvider, setPersistence, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { cloudMode, firebaseConfigured, googleRedirectConfigured } from './mode'

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
export async function logoutGoogle(): Promise<void> { if (auth) await signOut(auth) }
