export const cloudMode = import.meta.env.VITE_DATA_MODE === 'firebase'
export const firebaseConfigured = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'].every(key => typeof import.meta.env[key] === 'string' && import.meta.env[key].trim().length > 0)
// Redirect requires the auth helper and application to share an origin.
export const googleRedirectConfigured = cloudMode && firebaseConfigured && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN === window.location.host
