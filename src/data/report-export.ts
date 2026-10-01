import type { MetricCounts, MonthlyMetrics } from './metrics.ts'

export interface AnnualReport { year: number; months: MonthlyMetrics[]; annual: MetricCounts; scope: string }
export const REPORT_HEADERS = ['Mes', 'Hallazgos', 'Entregas', 'Donaciones', 'Remisiones']
export function reportRows(report: AnnualReport): (string | number)[][] {
  if (report.months.length !== 12 || report.months.some((month, index) => month.month !== index + 1)) throw new Error('El reporte no está completo.')
  return [...report.months.map(month => [new Intl.DateTimeFormat('es-DO', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(report.year, month.month - 1, 1))), month.hallazgos, month.entregas, month.donaciones, month.remisiones]), ['Total anual', report.annual.hallazgos, report.annual.entregas, report.annual.donaciones, report.annual.remisiones]]
}
export function reportCsv(report: AnnualReport): string {
  return '\uFEFF' + [['Año', report.year], ['Alcance', report.scope], REPORT_HEADERS, ...reportRows(report)].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
}
export async function reportXlsx(report: AnnualReport): Promise<Uint8Array> {
  const { default: ExcelJS } = await import('exceljs')
  const book = new ExcelJS.Workbook()
  book.creator = 'UCSD · Objetos perdidos'
  const sheet = book.addWorksheet(String(report.year))
  sheet.addRows([['UCSD · Objetos perdidos'], [`Reporte anual ${report.year}`], [report.scope], [], REPORT_HEADERS, ...reportRows(report)])
  sheet.columns = [{ width: 24 }, ...Array.from({ length: 4 }, () => ({ width: 18 }))]
  sheet.views = [{ state: 'frozen', ySplit: 5 }]
  for (const number of [1, 2, 5, 18]) sheet.getRow(number).font = { bold: true, color: { argb: 'FF184E3C' } }
  sheet.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF0E8' } }
  sheet.autoFilter = 'A5:E17'
  sheet.getColumn(1).alignment = { horizontal: 'left' }
  for (let column = 2; column <= 5; column++) sheet.getColumn(column).numFmt = '0'
  return new Uint8Array(await book.xlsx.writeBuffer())
}
export async function reportPdf(report: AnnualReport): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  pdf.setTitle(`UCSD · Reporte anual ${report.year}`)
  const page = pdf.addPage([595.28, 841.89])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const green = rgb(.09, .30, .23)
  page.drawRectangle({ x: 0, y: 735, width: 595.28, height: 107, color: green })
  page.drawText('UCSD · Objetos perdidos', { x: 40, y: 798, size: 12, font: regular, color: rgb(1, 1, 1) })
  page.drawText(`Reporte anual ${report.year}`, { x: 40, y: 765, size: 24, font: bold, color: rgb(1, 1, 1) })
  page.drawText(report.scope, { x: 40, y: 707, size: 11, font: regular, color: green })
  const xs = [40, 240, 327, 420, 514]
  const rows = [REPORT_HEADERS, ...reportRows(report)]
  rows.forEach((row, index) => {
    const y = 660 - index * 31
    if (index === 0 || index === rows.length - 1) page.drawRectangle({ x: 35, y: y - 9, width: 525, height: 30, color: rgb(.92, .95, .91) })
    row.forEach((value, column) => {
      const text = String(value)
      const font = index === 0 || index === rows.length - 1 ? bold : regular
      const size = index === 0 ? 9 : 11
      page.drawText(text, { x: column === 0 ? xs[column] : xs[column] - font.widthOfTextAtSize(text, size), y, size, font, color: green })
    })
  })
  page.drawText('Hallazgos: fecha de hallazgo. Entregas y destinos: fecha del evento.', { x: 40, y: 171, size: 9, font: regular, color: green })
  page.drawText(`Generado: ${new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' })}`, { x: 40, y: 150, size: 9, font: regular, color: green })
  return pdf.save()
}
