import { useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material'
import DownloadRounded from '@mui/icons-material/DownloadRounded'
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined'
import TableChartOutlined from '@mui/icons-material/TableChartOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import type { AnnualReport } from '../data/report-export'

export default function ReportDownload({ report, year, years, onYearChange }: { report: AnnualReport | null; year: number; years: number[]; onYearChange: (year: number) => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function exportFile(format: 'pdf' | 'xlsx' | 'csv') {
    if (!report || busy) return
    // Reserve the preview while the user click still grants popup permission.
    const preview = format === 'pdf' ? window.open('', '_blank') : null
    if (format === 'pdf' && !preview) { setError('Permite abrir pestañas para visualizar el PDF.'); return }
    if (preview) { preview.opener = null; preview.document.title = 'Preparando reporte'; preview.document.body.textContent = 'Preparando PDF…' }
    setBusy(true); setError('')
    try {
      const { reportPdf, reportXlsx, reportCsv } = await import('../data/report-export')
      const result = format === 'pdf' ? await reportPdf(report) : format === 'xlsx' ? await reportXlsx(report) : reportCsv(report)
      const mime = format === 'pdf' ? 'application/pdf' : format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv;charset=utf-8'
      const blob = new Blob([typeof result === 'string' ? result : new Uint8Array(result).buffer], { type: mime })
      const url = URL.createObjectURL(blob)
      if (preview) preview.location.replace(url)
      else {
        const link = document.createElement('a'); link.href = url; link.download = `ucsd-reporte-${report.year}.${format}`
        document.body.append(link); link.click(); link.remove()
      }
      // Keep the PDF available for the viewer's download action.
      window.setTimeout(() => URL.revokeObjectURL(url), 30 * 60_000)
      setOpen(false)
    } catch { preview?.close(); setError('No se pudo generar el reporte. Inténtalo de nuevo.') }
    finally { setBusy(false) }
  }
  return <>
    <Button variant="outlined" startIcon={<DownloadRounded />} onClick={() => { setError(''); setOpen(true) }}>Descargar reporte</Button>
    <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="xs" aria-labelledby="download-report-title">
      <DialogTitle id="download-report-title">Descargar reporte</DialogTitle>
      <DialogContent className="report-download-content">
        <TextField select fullWidth label="Año" value={year} disabled={busy} onChange={event => onYearChange(Number(event.target.value))}>{years.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        <div className="report-formats">
          <Button variant="outlined" startIcon={<PictureAsPdfOutlined />} disabled={!report || busy} onClick={() => { void exportFile('pdf') }}>Ver PDF <span>Abrir en otra pestaña</span></Button>
          <Button variant="outlined" startIcon={<TableChartOutlined />} disabled={!report || busy} onClick={() => { void exportFile('xlsx') }}>Excel <span>.xlsx</span></Button>
          <Button variant="outlined" startIcon={<DescriptionOutlined />} disabled={!report || busy} onClick={() => { void exportFile('csv') }}>CSV <span>.csv</span></Button>
        </div>
        {(!report || busy) && <p role="status">{busy ? 'Preparando archivo…' : 'Cargando reporte…'}</p>}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setOpen(false)}>Cerrar</Button></DialogActions>
    </Dialog>
  </>
}
