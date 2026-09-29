import { archiveItem, deliverItem, disposeItem } from '../domain/catalog.ts'
import type { LostItem } from '../domain/types.ts'

export const PILOT_STATES_MARKER = 'Ejemplos de estados v1 (simulación)'
export const PILOT_UI_CASES = [42, 43, 44]

/** Solo objetos del manifiesto ficticio. Nunca reinicia operaciones posteriores. */
export function planPilotStates(items: LostItem[], date: string, actor: string, prepareUI = false): LostItem[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Fecha inválida.')
  if (items.length !== 50 || new Set(items.map(item => item.id)).size !== 50) throw new Error('Se requieren los 50 ejemplos originales.')
  const old = new Date(`${date}T12:00:00Z`)
  old.setUTCDate(old.getUTCDate() - 100)
  const oldDate = old.toISOString().slice(0, 10)
  return items.map(item => {
    const match = /^demo-pilot-(\d{3})$/.exec(item.id)
    const n = Number(match?.[1])
    if (!match || n < 1 || n > 50 || item.code !== `UCSD-DEMO-${String(n).padStart(4, '0')}` || !item.description.includes('Objeto ficticio.')) throw new Error('Este plan solo admite los ejemplos ficticios conocidos.')
    if (item.history.some(entry => entry.action === PILOT_STATES_MARKER)) return item
    const affected = [6, 16, 21, 30].includes(n) || n >= 31 && n <= 49
    if (!affected) return item
    if (item.status !== 'disponible' || item.delivery || item.disposition) throw new Error(`El ejemplo ${item.code} ya fue gestionado. Revisar antes de modificarlo.`)
    let next: LostItem = { ...item, history: [...item.history, { id: `${item.id}-estados-v1`, at: `${date}T12:00:00.000Z`, actor, action: PILOT_STATES_MARKER }] }
    if ([6, 16, 21, 30, 43, 45, 46].includes(n)) {
      next = { ...next, foundDate: oldDate, receivedDate: oldDate, history: [...next.history, { id: `${item.id}-custodia-simulada`, at: `${date}T12:00:00.000Z`, actor, action: 'Fecha de custodia ficticia ajustada para demostrar el plazo de 90 días' }] }
    }
    if (n >= 31 && n <= 35) next = { ...next, status: 'borrador', received: false, receivedDate: '', custodyLocation: '', history: [...next.history, { id: `${item.id}-borrador-simulado`, at: `${date}T12:00:00.000Z`, actor, action: 'Borrador ficticio pendiente de recepción' }] }
    if (prepareUI && PILOT_UI_CASES.includes(n)) return next
    if (n >= 36 && n <= 42) next = deliverItem(next, { recipient: `Estudiante ficticio ${n}`, proof: 'SIMULACIÓN: descripción de características reservadas coincidente.', identityType: 'carnet_estudiante', photoEvidenceReference: `SIMULADA-${n}: sin fotografía real` }, actor)
    if ([44, 47, 48, 49].includes(n)) next = archiveItem(next, actor)
    if ([21, 43, 45, 46].includes(n)) next = disposeItem(next, { kind: n === 21 ? 'remision_documentos' : 'donacion', recipient: n === 21 ? 'Institución emisora ficticia' : 'Organización ficticia de demostración', reference: `ACTA-SIMULADA-${n}: ejemplo sin entrega física ni documento real` }, actor, date)
    return next
  })
}
