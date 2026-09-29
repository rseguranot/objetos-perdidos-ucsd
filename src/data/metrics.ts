import { collection, getCountFromServer, query, where, type Firestore, type QueryConstraint } from 'firebase/firestore'
import { canRegister, type Session } from '../domain/roles.ts'
import type { ItemStatus, LostItem } from '../domain/types.ts'

export interface MetricCounts { hallazgos: number; entregas: number; donaciones: number; remisiones: number }
export interface MonthlyMetrics extends MetricCounts { month: number }
export interface StaffMetrics {
  year: number
  status: Record<ItemStatus, number>
  annual: MetricCounts
  months: MonthlyMetrics[]
  donationsTotal: number
  remissionsTotal: number
  reviewOverdue: number
}

type MetricField = 'foundDate' | 'deliveryDate' | 'dispositionDate'
type MetricKind = 'donacion' | 'remision_documentos'
type MetricFilter = { field: string; operation: '==' | '<' | '>=' | '<=' | 'in'; value: string | boolean | string[] }
export interface MetricQuery { filters: MetricFilter[] }

const STATUS_VALUES: ItemStatus[] = ['borrador', 'disponible', 'entregado', 'archivado']
const EMPTY: MetricCounts = { hallazgos: 0, entregas: 0, donaciones: 0, remisiones: 0 }

function localDay(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (name: string) => parts.find(value => value.type === name)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

function overdueCutoff(now: Date): string {
  const day = new Date(`${localDay(now)}T00:00:00.000Z`)
  day.setUTCDate(day.getUTCDate() - 90)
  return day.toISOString().slice(0, 10)
}

function scope(session: Session): MetricFilter[] {
  if (!canRegister(session)) throw new Error('No tienes permiso para consultar las métricas internas.')
  return session.role === 'registro' ? [{ field: 'createdByUid', operation: '==', value: session.uid }] : []
}

function period(field: MetricField, start: string, end: string, kind?: MetricKind): MetricFilter[] {
  return [
    ...(kind ? [{ field: 'disposition.kind', operation: '==' as const, value: kind }] : []),
    { field, operation: '>=' as const, value: start },
    { field, operation: '<' as const, value: end },
  ]
}

function nextMonth(year: number, month: number): string {
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
}

/** Query definitions are shared with tests; no metric depends on a visible page. */
export function staffMetricPlan(session: Session, year: number, now = new Date()): {
  status: Record<ItemStatus, MetricQuery>
  months: Array<{ month: number; hallazgos: MetricQuery; entregas: MetricQuery; donaciones: MetricQuery; remisiones: MetricQuery }>
  donationsTotal: MetricQuery
  remissionsTotal: MetricQuery
  reviewOverdue: MetricQuery
} {
  if (!Number.isInteger(year) || year < 2000 || year > 9998) throw new Error('Selecciona un año válido.')
  const owner = scope(session)
  const build = (filters: MetricFilter[]): MetricQuery => ({ filters: [...owner, ...filters] })
  const status = Object.fromEntries(STATUS_VALUES.map(value => [value, build([{ field: 'status', operation: '==', value }])])) as Record<ItemStatus, MetricQuery>
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = nextMonth(year, month)
    return {
      month,
      hallazgos: build(period('foundDate', start, end)),
      entregas: build(period('deliveryDate', start, end)),
      donaciones: build(period('dispositionDate', start, end, 'donacion')),
      remisiones: build(period('dispositionDate', start, end, 'remision_documentos')),
    }
  })
  return {
    status,
    months,
    donationsTotal: build([{ field: 'disposition.kind', operation: '==', value: 'donacion' }]),
    remissionsTotal: build([{ field: 'disposition.kind', operation: '==', value: 'remision_documentos' }]),
    reviewOverdue: build([
      { field: 'received', operation: '==', value: true },
      { field: 'status', operation: 'in', value: ['borrador', 'disponible', 'archivado'] },
      { field: 'deliveryDate', operation: '==', value: '' },
      { field: 'dispositionDate', operation: '==', value: '' },
      { field: 'receivedDate', operation: '<=', value: overdueCutoff(now) },
    ]),
  }
}

function firestoreQuery(database: Firestore, metric: MetricQuery) {
  const constraints: QueryConstraint[] = metric.filters.map(filter => where(filter.field, filter.operation, filter.value))
  return query(collection(database, 'privateItems'), ...constraints)
}

async function count(database: Firestore, metric: MetricQuery): Promise<number> {
  // Never add limit(): it would silently cap an aggregate at that page size.
  return (await getCountFromServer(firestoreQuery(database, metric))).data().count
}

export async function loadPublicAvailableCount(database: Firestore): Promise<number> {
  // Public rules permit this aggregate; the collection contains available projections only.
  return (await getCountFromServer(query(collection(database, 'publicItems')))).data().count
}

export async function loadStaffMetrics(database: Firestore, session: Session, year: number, now = new Date()): Promise<StaffMetrics> {
  const plan = staffMetricPlan(session, year, now)
  const statusCounts = await Promise.all(STATUS_VALUES.map(value => count(database, plan.status[value])))
  const monthlyCounts = await Promise.all(plan.months.map(async definition => {
    const [hallazgos, entregas, donaciones, remisiones] = await Promise.all([
      count(database, definition.hallazgos), count(database, definition.entregas),
      count(database, definition.donaciones), count(database, definition.remisiones),
    ])
    return { month: definition.month, hallazgos, entregas, donaciones, remisiones }
  }))
  const [donationsTotal, remissionsTotal, reviewOverdue] = await Promise.all([
    count(database, plan.donationsTotal), count(database, plan.remissionsTotal), count(database, plan.reviewOverdue),
  ])
  return {
    year,
    status: Object.fromEntries(STATUS_VALUES.map((value, index) => [value, statusCounts[index]])) as Record<ItemStatus, number>,
    annual: monthlyCounts.reduce<MetricCounts>((sum, month) => ({
      hallazgos: sum.hallazgos + month.hallazgos,
      entregas: sum.entregas + month.entregas,
      donaciones: sum.donaciones + month.donaciones,
      remisiones: sum.remisiones + month.remisiones,
    }), { ...EMPTY }),
    months: monthlyCounts,
    donationsTotal, remissionsTotal, reviewOverdue,
  }
}

/** Local demo equivalent of the Firestore aggregates, including archived events. */
export function summarizeLocalMetrics(items: LostItem[], session: Session, year: number, now = new Date()): StaffMetrics {
  staffMetricPlan(session, year, now)
  const visible = session.role === 'registro' ? items.filter(item => item.createdByUid === session.uid) : items
  const status: Record<ItemStatus, number> = { borrador: 0, disponible: 0, entregado: 0, archivado: 0 }
  const months: MonthlyMetrics[] = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, ...EMPTY }))
  let donationsTotal = 0
  let remissionsTotal = 0
  let reviewOverdue = 0
  const cutoff = overdueCutoff(now)
  const tally = (date: string, key: keyof MetricCounts) => {
    if (date.slice(0, 4) !== String(year)) return
    const month = Number(date.slice(5, 7))
    if (month >= 1 && month <= 12) months[month - 1][key] += 1
  }
  for (const item of visible) {
    status[item.status] += 1
    tally(item.foundDate, 'hallazgos')
    if (item.delivery) tally(localDay(new Date(item.delivery.deliveredAt)), 'entregas')
    if (item.disposition) {
      const key = item.disposition.kind === 'donacion' ? 'donaciones' : 'remisiones'
      tally(localDay(new Date(item.disposition.completedAt)), key)
      if (key === 'donaciones') donationsTotal += 1
      else remissionsTotal += 1
    }
    if (item.received && item.receivedDate <= cutoff && ['borrador', 'disponible', 'archivado'].includes(item.status) && !item.delivery && !item.disposition) reviewOverdue += 1
  }
  const annual = months.reduce<MetricCounts>((sum, month) => ({
    hallazgos: sum.hallazgos + month.hallazgos,
    entregas: sum.entregas + month.entregas,
    donaciones: sum.donaciones + month.donaciones,
    remisiones: sum.remisiones + month.remisiones,
  }), { ...EMPTY })
  return { year, status, annual, months, donationsTotal, remissionsTotal, reviewOverdue }
}
