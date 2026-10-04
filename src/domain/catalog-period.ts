export interface CatalogPeriod { year: number; month: number }

export function catalogPeriodOptions(year: number, current = currentCatalogPeriod()) {
  return {
    years: Array.from({ length: Math.max(0, current.year - 2022 + 1) }, (_, index) => current.year - index),
    months: year >= 2022 && year <= current.year ? Array.from({ length: year === current.year ? current.month : 12 }, (_, index) => index + 1) : [],
  }
}

export function changeCatalogYear(value: CatalogPeriod, year: number, current = currentCatalogPeriod()): CatalogPeriod {
  const options = catalogPeriodOptions(year, current)
  if (!options.years.includes(year)) return value
  return { year, month: Math.min(value.month, options.months.length) }
}

export function currentCatalogPeriod(now = new Date()): CatalogPeriod {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: 'numeric' }).formatToParts(now)
  return { year: Number(parts.find(part => part.type === 'year')?.value), month: Number(parts.find(part => part.type === 'month')?.value) }
}

export function catalogMonthRange({ year, month }: CatalogPeriod): { from: string; to: string } {
  if (!Number.isInteger(year) || year < 1000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Selecciona un año y mes válidos.')
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { from: `${prefix}-01`, to: `${prefix}-${lastDay}` }
}
