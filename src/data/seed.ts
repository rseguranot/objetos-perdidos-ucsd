import type { Category, ItemStatus, LostItem } from '../domain/types.ts'
import { normalizeClassification } from '../domain/catalog.ts'
import { todayISO } from '../date.ts'

function seedItem(number: number, title: string, category: Category, description: string, foundDate: string, foundLocation: string, privateDetails: string, status: ItemStatus = 'disponible'): LostItem {
  const received = number !== 9
  const history = [{ id: `hist-${number}-1`, at: `${foundDate}T14:00:00.000Z`, actor: 'Personal del decanato (demo)', action: 'Registro creado' }]
  if (status !== 'borrador') history.push({ id: `hist-${number}-2`, at: `${foundDate}T15:00:00.000Z`, actor: 'Personal del decanato (demo)', action: 'Recepción confirmada y objeto publicado' })
  if (status === 'entregado') history.push({ id: `hist-${number}-3`, at: '2026-09-25T16:00:00.000Z', actor: 'Personal del decanato (demo)', action: 'Objeto entregado; propiedad comprobada' })
  if (status === 'archivado') history.push({ id: `hist-${number}-3`, at: '2026-09-26T16:00:00.000Z', actor: 'Personal del decanato (demo)', action: 'Registro archivado' })
  return {
    id: `demo-${number}`, code: `UCSD-2026-${String(number).padStart(4, '0')}`, title, category, itemType: normalizeClassification(category, title)!.itemType, description, foundDate, foundLocation,
    receivedDate: received ? foundDate : '', custodyLocation: received ? `Armario A · caja ${Math.ceil(number / 3)}` : '',
    privateDetails, received, status, history,
    ...(status === 'entregado' ? { delivery: { recipient: 'Estudiante de ejemplo', proof: 'Describió una característica reservada.', deliveredAt: '2026-09-25T16:00:00.000Z' } } : {}),
  }
}

// Todos los objetos, responsables, ubicaciones y comprobantes son ficticios.
const ORIGINAL_ITEMS: LostItem[] = [
  seedItem(1, 'Estuche de audífonos', 'electronica', 'Estuche negro compacto, sin audífonos en su interior.', '2026-09-28', 'Biblioteca', 'Pequeña pegatina azul en la base.'),
  seedItem(2, 'Juego de llaves', 'llaves', 'Tres llaves metálicas con un llavero de tela.', '2026-09-27', 'Estacionamiento', 'El llavero tiene un dibujo de una estrella.'),
  seedItem(3, 'Botella reutilizable', 'bolsos_accesorios', 'Botella térmica verde con tapa de rosca.', '2026-09-26', 'Cafetería', 'Tiene iniciales ficticias dibujadas bajo la tapa.'),
  seedItem(4, 'Cuaderno de apuntes', 'material_academico', 'Cuaderno de espiral con cubierta azul.', '2026-09-25', 'Aulas', 'La primera página tiene una flor dibujada.'),
  seedItem(5, 'Lentes con estuche', 'bolsos_accesorios', 'Lentes de montura oscura en estuche rígido.', '2026-09-24', 'Pasillos', 'Una pequeña marca en el brazo derecho.'),
  seedItem(6, 'Chaqueta gris', 'ropa', 'Chaqueta de manga larga con cierre frontal.', '2026-09-23', 'Área deportiva', 'La etiqueta interior tiene un hilo rojo.'),
  seedItem(7, 'Cable de carga', 'electronica', 'Cable blanco con conector USB-C.', '2026-09-22', 'Biblioteca', 'Una cinta amarilla junto a un conector.'),
  seedItem(8, 'Sobre con documentos', 'documentos', 'Sobre cerrado de papel manila. Consulta presencial para identificación.', '2026-09-21', 'Patio central', 'Documentos ficticios: no publicar nombres ni números.'),
  seedItem(9, 'Paraguas azul', 'bolsos_accesorios', 'Paraguas plegable con mango oscuro.', '2026-09-28', 'Pasillos', 'Tiene una banda verde en el mango.', 'borrador'),
  seedItem(10, 'Calculadora', 'electronica', 'Calculadora científica de color oscuro.', '2026-09-27', 'Aulas', 'La tapa tiene una marca en diagonal.', 'borrador'),
  seedItem(11, 'Gorra negra', 'ropa', 'Gorra ajustable de color negro.', '2026-09-20', 'Área deportiva', 'Bordado reservado en la parte trasera.', 'entregado'),
  seedItem(12, 'Carpeta de apuntes', 'documentos', 'Carpeta plástica transparente.', '2026-09-18', 'Aulas', 'Contiene apuntes ficticios sin datos personales.', 'archivado'),
]

function daysAgo(days: number): string {
  const date = new Date(`${todayISO()}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

// Se agregan a la demo sin reemplazar registros anteriores ni enviar datos a Firebase.
const campusExamples: Array<[string, string, Category, string, string]> = [
  ['celular', 'Celular con funda azul', 'electronica', 'Teléfono de color oscuro con funda azul. Pantalla apagada.', 'Biblioteca'],
  ['laptop', 'Laptop plateada', 'electronica', 'Computadora portátil plateada dentro de una funda gris.', 'Aulas'],
  ['tableta', 'Tableta con cubierta verde', 'electronica', 'Tableta con cubierta plegable de color verde.', 'Biblioteca'],
  ['audifonos', 'Audífonos inalámbricos', 'electronica', 'Par de audífonos blancos en su estuche de carga.', 'Patio central'],
  ['cargador', 'Cargador de laptop', 'electronica', 'Adaptador de corriente negro con cable integrado.', 'Aulas'],
  ['usb', 'Memoria USB', 'electronica', 'Memoria USB metálica con argolla pequeña.', 'Biblioteca'],
  ['mochila', 'Mochila negra', 'bolsos_accesorios', 'Mochila de tela negra con dos compartimentos.', 'Cafetería'],
  ['bulto', 'Bulto deportivo azul', 'bolsos_accesorios', 'Bulto azul con correa para el hombro y cierre lateral.', 'Área deportiva'],
  ['libro', 'Libro de cálculo', 'material_academico', 'Libro de tapa blanda con portada de matemáticas.', 'Biblioteca'],
  ['cuaderno', 'Cuaderno cuadriculado', 'material_academico', 'Cuaderno de espiral con cubierta morada y hojas cuadriculadas.', 'Aulas'],
  ['utiles', 'Estuche de útiles', 'material_academico', 'Estuche de tela gris con útiles de estudio.', 'Aulas'],
  ['apuntes', 'Carpeta de apuntes de laboratorio', 'material_academico', 'Carpeta de anillas roja con apuntes. Identificación presencial.', 'Biblioteca'],
  ['carnet', 'Carné universitario', 'documentos', 'Identificación universitaria encontrada. Datos personales reservados.', 'Pasillos'],
  ['tarjeta', 'Tarjeta de transporte', 'documentos', 'Tarjeta de transporte dentro de un protector transparente.', 'Estacionamiento'],
  ['monedero', 'Monedero marrón', 'bolsos_accesorios', 'Monedero pequeño de color marrón con broche.', 'Cafetería'],
  ['dinero', 'Dinero en efectivo', 'dinero', 'Hallazgo de efectivo. Se verificará el detalle presencialmente.', 'Patio central'],
  ['reloj', 'Reloj con correa negra', 'bolsos_accesorios', 'Reloj de esfera redonda y correa negra.', 'Área deportiva'],
  ['prenda', 'Bata de laboratorio', 'ropa', 'Bata blanca de manga larga con bolsillos frontales.', 'Aulas'],
  ['bolso', 'Bolso de tela beige', 'bolsos_accesorios', 'Bolso de tela reutilizable de color beige.', 'Biblioteca'],
  ['casco', 'Casco de bicicleta', 'otros', 'Casco gris con correa ajustable.', 'Estacionamiento'],
  ['pendiente-mochila', 'Mochila roja · revisión de custodia', 'bolsos_accesorios', 'Mochila roja con bolsillo frontal.', 'Pasillos'],
  ['pendiente-documento', 'Documento de identificación · revisión', 'documentos', 'Documento personal. Datos reservados para verificación presencial.', 'Patio central'],
  ['donado-bulto', 'Bulto deportivo donado · ejemplo', 'bolsos_accesorios', 'Bulto de tela en buen estado.', 'Área deportiva'],
  ['donado-abrigo', 'Chaqueta donada · ejemplo', 'ropa', 'Chaqueta azul en buen estado.', 'Pasillos'],
  ['remitido-documento', 'Identificación remitida · ejemplo', 'documentos', 'Documento personal canalizado a su emisor.', 'Estacionamiento'],
]

export const UNIVERSITY_EXAMPLES: LostItem[] = campusExamples.map(([slug, title, category, description, zone], index) => {
  const old = index >= 20
  const foundDate = daysAgo(old ? 100 + index - 20 : index % 15)
  const item = seedItem(index + 13, title, category, description, foundDate, zone, category === 'dinero' ? 'Ejemplo ficticio: RD$125 en denominaciones reservadas.' : 'Característica de comprobación ficticia: marca interna de ejemplo.')
  item.id = `demo-campus-${slug}`
  if (slug === 'usb') item.itemType = 'dispositivo'
  if (slug === 'carnet') item.itemType = 'identificacion'
  if (slug === 'prenda') item.itemType = 'prenda'
  item.createdByUid = 'demo:decanato.demo@ucsd.edu.do'
  item.updatedByUid = 'demo:decanato.demo@ucsd.edu.do'
  if (index >= 22) {
    const kind = category === 'documentos' ? 'remision_documentos' : 'donacion'
    const completedAt = `${daysAgo(2)}T15:00:00.000Z`
    item.status = 'archivado'
    item.disposition = { kind, recipient: kind === 'donacion' ? 'Organización solidaria ficticia' : 'Institución emisora ficticia', reference: 'Acta ficticia DEMO-01. Ejemplo de procedimiento propuesto.', completedAt }
    item.history.push({ id: `${item.id}-destino`, at: completedAt, actor: 'Personal del decanato (demo)', action: kind === 'donacion' ? 'Donación registrada; acta ficticia de destino final' : 'Documento remitido a institución emisora; constancia ficticia' })
  }
  return item
})

export const SEED_ITEMS: LostItem[] = [...ORIGINAL_ITEMS, ...UNIVERSITY_EXAMPLES]

export function appendUniversityExamples(items: LostItem[]): LostItem[] {
  const existing = new Set(items.map(item => item.id))
  const missing = UNIVERSITY_EXAMPLES.filter(item => !existing.has(item.id))
  if (!missing.length) return items
  const year = new Date().getFullYear()
  const prefix = `UCSD-${year}-`
  let largest = items.reduce((maximum, item) => {
    const suffix = item.code.startsWith(prefix) ? item.code.slice(prefix.length) : ''
    return /^\d+$/.test(suffix) ? Math.max(maximum, Number(suffix)) : maximum
  }, 0)
  return [...items, ...structuredClone(missing).map(item => ({ ...item, code: `${prefix}${String(++largest).padStart(4, '0')}` }))]
}
