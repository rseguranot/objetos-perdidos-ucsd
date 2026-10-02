import type { EvidenceSummary, PreparedPhoto } from './evidence-photos'
import type { DeliveryInput, LostItem } from '../domain/types'

export const evidenceConfigured = typeof import.meta.env.VITE_EVIDENCE_SCRIPT_URL === 'string' && import.meta.env.VITE_EVIDENCE_SCRIPT_URL !== ''

/** Each instance belongs to one authenticated UI session and holds no persistent data. */
export function createEvidenceApi(sessionKey: string) {
  const expectedUid = sessionKey.split(':')[0]
  let iframe: HTMLIFrameElement | undefined
  let peer: Window | undefined
  let peerOrigin = ''
  let nonce = ''
  let ready: Promise<void> | undefined
  let disposed = false
  let release = () => {}
  const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }>()

  function connect(): Promise<void> {
    if (disposed) return Promise.reject(new Error('La sesión de fotografías se cerró.'))
    if (ready) return ready
    ready = new Promise((resolve, reject) => {
      const url = new URL(import.meta.env.VITE_EVIDENCE_SCRIPT_URL ?? '')
      if (url.origin !== 'https://script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname)) { reject(new Error('El servicio de fotografías no está configurado.')); return }
      nonce = crypto.randomUUID()
      url.searchParams.set('origin', window.location.origin)
      url.searchParams.set('nonce', nonce)
      iframe = document.createElement('iframe')
      iframe.title = 'Servicio privado de fotografías'
      iframe.hidden = true
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms')
      const timeout = setTimeout(() => {
        reject(new Error('No se pudo conectar con el servicio de fotografías.'))
        dispose()
        // A connection failure can be retried within the same authenticated session.
        disposed = false
        ready = undefined
      }, 30_000)
      function receive(event: MessageEvent) {
        if (!iframe || !event.source || typeof event.data !== 'object' || !event.data || event.data.nonce !== nonce) return
        let origin: URL
        try { origin = new URL(event.origin) } catch { return }
        if (origin.protocol !== 'https:' || !(origin.hostname === 'script.google.com' || /^n-[a-z0-9-]+-script[.]googleusercontent[.]com$/.test(origin.hostname))) return
        const source = event.source as Window
        let belongs: boolean
        try { belongs = source === iframe.contentWindow || source.parent === iframe.contentWindow || source.parent.parent === iframe.contentWindow } catch { return }
        if (!belongs) return
        if (event.data.kind === 'ready' && !peer) { peer = source; peerOrigin = event.origin; clearTimeout(timeout); resolve(); return }
        if (source !== peer || event.origin !== peerOrigin || event.data.kind !== 'response') return
        const request = pending.get(event.data.requestId)
        if (!request) return
        pending.delete(event.data.requestId); clearTimeout(request.timeout)
        if (event.data.ok === true) request.resolve(event.data.result)
        else request.reject(new Error(typeof event.data.error === 'string' ? event.data.error : 'No se pudo completar la operación con fotografías.'))
      }
      window.addEventListener('message', receive)
      release = () => { clearTimeout(timeout); window.removeEventListener('message', receive); reject(new Error('La sesión de fotografías se cerró.')) }
      iframe.src = url.href
      document.body.appendChild(iframe)
    })
    return ready
  }

  async function request<T>(action: string, payload: unknown): Promise<T> {
    const { auth } = await import('./firebase')
    const user = auth?.currentUser
    if (!user || user.uid !== expectedUid) throw new Error('Inicia sesión para consultar las fotografías.')
    await connect()
    const idToken = await user.getIdToken()
    if (disposed || auth?.currentUser?.uid !== user.uid || !peer) throw new Error('La sesión cambió. Vuelve a abrir la operación.')
    return new Promise<T>((resolve, reject) => {
      const requestId = crypto.randomUUID()
      const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error('No llegó la confirmación. Reintenta para comprobar el resultado.')) }, 120_000)
      pending.set(requestId, { resolve: value => {
        if (auth?.currentUser?.uid !== user.uid || disposed) { reject(new Error('La sesión cambió.')); return }
        resolve(value as T)
      }, reject, timeout })
      peer!.postMessage({ kind: 'request', nonce, requestId, action, payload, idToken }, peerOrigin)
    })
  }
  function dispose() {
    disposed = true; release(); iframe?.remove(); iframe = undefined; peer = undefined
    for (const entry of pending.values()) { clearTimeout(entry.timeout); entry.reject(new Error('La sesión de fotografías se cerró.')) }
    pending.clear()
  }
  return {
    activate: () => { disposed = false; ready = undefined },
    list: (cursor: string | null = null) => request<{ items: EvidenceSummary[]; cursor: string | null }>('list', { cursor }),
    view: (evidenceId: string) => request<{ photos: PreparedPhoto[] }>('view', { evidenceId }),
    deliver: (item: LostItem, delivery: DeliveryInput, photos: PreparedPhoto[], operationId: string) => request<{ itemId: string; evidenceId: string }>('deliver', { itemId: item.id, expectedHistoryId: item.history.at(-1)?.id, operationId, delivery, photos }),
    dispose,
  }
}
