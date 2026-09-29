import { institutionalEmail } from './roles.ts'
import { testAccountRole, type TestAccountEnvironment } from './test-accounts.ts'

export interface IdentityToken {
  claims: Record<string, unknown>
  signInProvider: unknown
}

// Linked providers do not identify the method used to obtain the current token.
// This policy must match the Firestore predicate for verified staff identities.
export function verifiedInstitutionalEmail(token: IdentityToken, environment?: TestAccountEnvironment): string | null {
  if (typeof token.claims.email !== 'string') return null
  const email = token.claims.email.trim().toLowerCase()
  // QA emails are shared test identities, not verified institutional ownership.
  // Even a verified Google token cannot use this password-only exception.
  if (testAccountRole(email, environment)) return token.signInProvider === 'password' ? email : null
  if (token.claims.email_verified !== true || (token.signInProvider !== 'google.com' && token.signInProvider !== 'password') || typeof token.claims.email !== 'string') return null
  try { return institutionalEmail(token.claims.email, environment) } catch { return null }
}

// An earlier token lookup or role listener must never restore a replaced session.
export function createIdentityRevisionGuard() {
  let revision = 0
  let disposed = false
  return {
    begin: () => ++revision,
    current: (candidate: number) => !disposed && candidate === revision,
    dispose: () => { disposed = true; revision++ },
  }
}
