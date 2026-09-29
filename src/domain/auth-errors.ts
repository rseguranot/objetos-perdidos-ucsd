export function authErrorMessage(cause: unknown): string {
  const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password': return 'No se pudo iniciar sesión. Revisa el correo y la contraseña.'
    case 'auth/invalid-email': return 'Introduce un correo válido.'
    case 'auth/user-disabled': return 'Esta cuenta está deshabilitada. Consulta al responsable.'
    case 'auth/too-many-requests': return 'Hay demasiados intentos. Espera un momento antes de volver a intentar.'
    case 'auth/network-request-failed': return 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.'
    case 'auth/operation-not-allowed': return 'Este método de acceso todavía no está habilitado. Consulta al responsable.'
    case 'auth/unauthorized-domain': return 'Esta dirección todavía no está autorizada para iniciar sesión. Consulta al responsable.'
    case 'auth/popup-closed-by-user': return 'La ventana de Google se cerró. Vuelve a intentarlo desde un navegador que permita ventanas emergentes.'
    case 'auth/popup-blocked': return 'No se abrió la ventana de Google. Permite ventanas emergentes para esta página o utiliza la opción en esta pestaña.'
    default: return cause instanceof Error && !code ? cause.message : 'No se pudo completar el acceso. Inténtalo de nuevo.'
  }
}
