import { SEED_ITEMS } from './seed.ts'
import { exampleCampusLocation } from '../domain/campus.ts'
import { projectPublicItems } from '../domain/catalog.ts'
import type { Category, ItemType, LostItem } from '../domain/types.ts'

const extra: Array<[string, Category, ItemType, string]> = [
  ['Calculadora científica', 'electronica', 'calculadora', 'Calculadora negra con tapa deslizante.'],
  ['Mouse inalámbrico', 'electronica', 'dispositivo', 'Mouse gris con receptor USB.'],
  ['Adaptador USB-C', 'electronica', 'dispositivo', 'Adaptador metálico con varios puertos.'],
  ['Llavero de bicicleta', 'llaves', 'llavero', 'Llave con llavero de goma azul.'],
  ['Llaves con cinta roja', 'llaves', 'juego_llaves', 'Dos llaves unidas a una cinta roja.'],
  ['Llave pequeña', 'llaves', 'llave', 'Llave metálica pequeña con cabeza redonda.'],
  ['Tarjeta de biblioteca', 'documentos', 'tarjeta', 'Tarjeta encontrada dentro de un protector. Datos reservados.'],
  ['Carpeta de documentos', 'documentos', 'carpeta', 'Carpeta amarilla con papeles. Identificación presencial.'],
  ['Libro de anatomía', 'material_academico', 'libro', 'Libro de tapa dura con cubierta azul.'],
  ['Cuaderno de contabilidad', 'material_academico', 'cuaderno', 'Cuaderno verde de hojas rayadas.'],
  ['Regla y escuadras', 'material_academico', 'utiles', 'Juego de dibujo en una funda transparente.'],
  ['Suéter azul', 'ropa', 'prenda', 'Suéter de manga larga de color azul.'],
  ['Gorra blanca', 'ropa', 'gorra', 'Gorra blanca con cierre ajustable.'],
  ['Camisa de laboratorio', 'ropa', 'camisa', 'Camisa blanca de botones.'],
  ['Paraguas plegable', 'bolsos_accesorios', 'paraguas', 'Paraguas verde con mango negro.'],
  ['Pulsera plateada', 'bolsos_accesorios', 'joya', 'Pulsera metálica de eslabones pequeños.'],
  ['Efectivo en sobre', 'dinero', 'efectivo', 'Sobre con efectivo. Monto y denominaciones reservados.'],
  ['Monedas en una bolsa', 'dinero', 'efectivo', 'Bolsa pequeña con monedas. Detalle reservado.'],
  ['Recipiente de almuerzo', 'otros', 'otro', 'Recipiente rectangular con tapa azul.'],
  ['Tapete de yoga', 'otros', 'otro', 'Tapete morado enrollado con una correa.'],
]

/** Manifest reproducible: no cuentas, fotos ni documentos personales reales. */
export function buildPilotExamples(date: string, uid = 'demo:decanato.demo@ucsd.edu.do', actor = 'Personal ficticio'): LostItem[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Fecha inválida.')
  const base = SEED_ITEMS.filter(item => item.status === 'disponible' && !item.delivery && !item.disposition)
  if (base.length !== 30) throw new Error('El conjunto base debe contener 30 objetos disponibles.')
  const added = extra.map(([title, category, itemType, description]) => ({ ...base[0], title, category, itemType, description }))
  return [...base, ...added].map((source, index) => {
    const found = new Date(`${date}T12:00:00Z`)
    found.setUTCDate(found.getUTCDate() - index % 28)
    const foundDate = found.toISOString().slice(0, 10)
    const id = `demo-pilot-${String(index + 1).padStart(3, '0')}`
    return {
      id, code: `UCSD-DEMO-${String(index + 1).padStart(4, '0')}`,
      title: source.title.replace(/ · revisión.*$/, ''), category: source.category,
      itemType: source.title === 'Cargador de laptop' ? 'cargador' : source.itemType,
      description: source.description, foundDate,
      foundLocation: exampleCampusLocation(index + 1), received: true, receivedDate: foundDate,
      custodyLocation: `Decanato - Archivo caja ${Math.ceil((index + 1) / 5)}`,
      privateDetails: source.category === 'dinero' ? 'Monto ficticio RD$125; denominaciones reservadas.' : `Marca reservada ficticia ${index + 1}.`,
      status: 'disponible', createdByUid: uid, updatedByUid: uid,
      history: [
        { id: `${id}-registro`, at: `${foundDate}T14:00:00.000Z`, actor, action: 'Registro ficticio creado' },
        { id: `${id}-recepcion`, at: `${foundDate}T15:00:00.000Z`, actor, action: 'Recepción ficticia confirmada y publicación' },
      ],
    }
  })
}

/** Never overwrite existing objects, including ones subsequently delivered. */
export function planPilotImport(items: LostItem[], privateIds: Set<string>, publicIds: Set<string>) {
  const conflicts = items.filter(item => !privateIds.has(item.id) && publicIds.has(item.id)).map(item => item.id)
  if (conflicts.length) throw new Error(`Proyecciones sin registro interno: ${conflicts.join(', ')}`)
  const pending = items.filter(item => !privateIds.has(item.id))
  return { pending, publicItems: projectPublicItems(pending), skipped: items.length - pending.length }
}
