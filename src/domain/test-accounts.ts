export const TEST_PROJECT_ID = 'ucsd-objetos-perdidos-pruebas'
export type TestAccountRole = 'admin' | 'decanato' | 'registro'
export interface TestAccountEnvironment { [key: string]: unknown; VITE_DATA_MODE?: unknown; VITE_FIREBASE_PROJECT_ID?: unknown }
export const TEST_ACCOUNTS: ReadonlyArray<{ email: string; role: TestAccountRole }> = [
  { email: 'administrador@demo.ucsd.invalid', role: 'admin' },
  { email: 'decanato@demo.ucsd.invalid', role: 'decanato' },
  { email: 'registro@demo.ucsd.invalid', role: 'registro' },
]

// This exception belongs only to the isolated QA project, never to the UCSD pilot.
// import.meta.env is undefined under Node's test runner; no implicit QA fallback.
export function testAccountsEnabled(environment: TestAccountEnvironment | undefined = import.meta.env): boolean {
  return environment?.VITE_DATA_MODE === 'firebase' && environment.VITE_FIREBASE_PROJECT_ID === TEST_PROJECT_ID
}
export function testAccountRole(email: string, environment: TestAccountEnvironment | undefined = import.meta.env): TestAccountRole | null {
  if (!testAccountsEnabled(environment)) return null
  return TEST_ACCOUNTS.find(account => account.email === email)?.role ?? null
}
