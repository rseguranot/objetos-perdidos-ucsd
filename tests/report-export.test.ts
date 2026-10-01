import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { PDFDocument } from 'pdf-lib'
import { reportCsv, reportPdf, reportRows, reportXlsx } from '../src/data/report-export.ts'

const report = { year: 2026, scope: 'Mis registros', months: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, hallazgos: index === 8 ? 50 : 0, entregas: index === 8 ? 7 : 0, donaciones: index === 8 ? 3 : 0, remisiones: index === 8 ? 1 : 0 })), annual: { hallazgos: 50, entregas: 7, donaciones: 3, remisiones: 1 } }
test('CSV conserva doce meses, alcance y totales del reporte completo', () => {
  const csv = reportCsv(report)
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"septiembre","50","7","3","1"'))
  assert.ok(csv.includes('"Total anual","50","7","3","1"'))
  assert.ok(csv.includes('"Mis registros"'))
  assert.equal(reportRows(report).length, 13)
  assert.throws(() => reportRows({ ...report, months: report.months.slice(0, 11) }))
})
test('XLSX se puede reabrir y mantiene acentos y cantidades numéricas', async () => {
  const bytes = await reportXlsx(report)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(bytes.buffer as ArrayBuffer)
  const sheet = workbook.getWorksheet('2026')!
  assert.equal(sheet.getCell('A3').value, 'Mis registros')
  assert.equal(sheet.getCell('A14').value, 'septiembre')
  assert.equal(sheet.getCell('B14').value, 50)
  assert.equal(sheet.getCell('C18').value, 7)
  assert.equal(sheet.rowCount, 18)
})
test('PDF es un documento real de una página A4 con título anual', async () => {
  const bytes = await reportPdf(report)
  const pdf = await PDFDocument.load(bytes)
  assert.equal(pdf.getPageCount(), 1)
  assert.equal(pdf.getTitle(), 'UCSD · Reporte anual 2026')
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - 595.28) < .01)
})
