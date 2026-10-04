import { buildPilotExamples } from './pilot-examples.ts'
import { CATEGORY_LABELS } from '../domain/catalog.ts'
import { splitFoundLocation } from '../domain/campus.ts'
import type { Category, LostItem } from '../domain/types.ts'

/** Three fictitious available items per category, with stable IDs and no future dates. */
export function buildMonthlyExamples(date: string, uid: string, actor: string): LostItem[] {
  const examples = buildPilotExamples(date, uid, actor)
  const month = date.slice(0, 7), day = Number(date.slice(8))
  const selected = Object.keys(CATEGORY_LABELS).flatMap(category => {
    const items = examples.filter(item => item.category === category as Category).slice(0, 3)
    if (items.length !== 3) throw new Error(`Faltan ejemplos de ${category}.`)
    return items
  })
  return selected.map((item, index) => {
    const serial = String(index + 1).padStart(4, '0')
    const id = `demo-month-${month}-${serial}`
    const foundDate = `${month}-${String(index % day + 1).padStart(2, '0')}`
    const { building, detail } = splitFoundLocation(item.foundLocation)
    return { ...item, id, code: `UCSD-${month.replace('-', '')}-${serial}`,
      foundDate, receivedDate: foundDate, foundLocation: building,
      description: `${item.description}${detail ? ` Lugar del hallazgo: ${detail}.` : ''}`,
      history: [
        { id: `${id}-registro`, at: `${foundDate}T14:00:00.000Z`, actor, action: 'Registro ficticio creado' },
        { id: `${id}-recepcion`, at: `${foundDate}T15:00:00.000Z`, actor, action: 'Recepción ficticia confirmada y publicación' },
      ],
    }
  })
}
