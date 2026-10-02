import { useCallback, useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { EvidenceSummary, PreparedPhoto } from '../data/evidence-photos'

export interface EvidenceApi {
  list: (cursor?: string) => Promise<{ items: EvidenceSummary[]; cursor: string | null }>
  view: (evidenceId: string) => Promise<{ photos: PreparedPhoto[] }>
}

export default function EvidencePanel({ sessionKey, api }: { sessionKey: string; api: EvidenceApi }) {
  return <EvidenceSession key={sessionKey} api={api} />
}

function EvidenceSession({ api }: { api: EvidenceApi }) {
  const [items, setItems] = useState<EvidenceSummary[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [previous, setPrevious] = useState<Array<string | undefined>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<EvidenceSummary | null>(null)
  const [photos, setPhotos] = useState<PreparedPhoto[]>([])
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const listRequest = useRef(0)
  const viewRequest = useRef(0)
  const load = useCallback(async (pageCursor?: string) => {
    const request = ++listRequest.current
    setLoading(true); setError(''); setItems([]); setNextCursor(null)
    try {
      const result = await api.list(pageCursor)
      if (request === listRequest.current) { setItems(result.items); setNextCursor(result.cursor) }
    } catch { if (request === listRequest.current) setError('No se pudieron cargar las evidencias. Inténtalo de nuevo.') }
    finally { if (request === listRequest.current) setLoading(false) }
  }, [api])
  useEffect(() => {
    // Defer the request so an unmounted session cannot repopulate its private view.
    let active = true
    void Promise.resolve().then(() => { if (active) void load() })
    return () => { active = false; listRequest.current = -1; viewRequest.current = -1 }
  }, [load])
  async function open(evidence: EvidenceSummary) {
    const request = ++viewRequest.current
    setSelected(evidence); setPhotos([]); setPhotoError(''); setPhotoLoading(true)
    try {
      const result = await api.view(evidence.id)
      if (request === viewRequest.current) setPhotos(result.photos)
    } catch { if (request === viewRequest.current) setPhotoError('No se pudieron cargar las fotos. Inténtalo de nuevo.') }
    finally { if (request === viewRequest.current) setPhotoLoading(false) }
  }
  function close() { viewRequest.current++; setSelected(null); setPhotos([]); setPhotoError(''); setPhotoLoading(false) }
  function next() {
    if (!nextCursor) return
    setPrevious([...previous, cursor]); setCursor(nextCursor); void load(nextCursor)
  }
  function back() {
    const pageCursor = previous[previous.length - 1]
    setPrevious(previous.slice(0, -1)); setCursor(pageCursor); void load(pageCursor)
  }
  return <Box component="section" sx={{ py: 3 }}>
    <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Evidencias de entrega</Typography>
    {loading && <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} role="status"><CircularProgress size={20} /><span>Cargando evidencias…</span></Stack>}
    {error && <Alert severity="error" action={<Button color="inherit" onClick={() => { void load(cursor) }}>Reintentar</Button>}>{error}</Alert>}
    {!loading && !error && !items.length && <Typography sx={{ py: 4 }}>No hay evidencias registradas.</Typography>}
    {!!items.length && <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Table aria-label="Evidencias de entrega">
        <TableHead><TableRow><TableCell>Objeto / código</TableCell><TableCell>Entrega</TableCell><TableCell>Fotos</TableCell><TableCell align="right">Acción</TableCell></TableRow></TableHead>
        <TableBody>{items.map(item => <TableRow key={item.id}>
          <TableCell><Typography sx={{ fontWeight: 600 }}>{item.title}</Typography><Typography variant="caption" color="text.secondary">{item.code}</Typography></TableCell>
          <TableCell>{formatDate(item.deliveredAt)}</TableCell><TableCell>{item.photoCount}</TableCell>
          <TableCell align="right"><Button onClick={() => { void open(item) }} aria-label={`Ver fotos de ${item.code}`}>Ver fotos</Button></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>}
    <Stack direction="row" sx={{ mt: 2, justifyContent: 'space-between', alignItems: 'center' }}>
      <Button disabled={!previous.length || loading} onClick={back}>Anterior</Button>
      <Typography variant="body2">Página {previous.length + 1}</Typography>
      <Button disabled={!nextCursor || loading} onClick={next}>Siguiente</Button>
    </Stack>
    <Dialog open={!!selected} onClose={close} maxWidth="md" fullWidth aria-labelledby="evidence-view-title">
      <DialogTitle id="evidence-view-title">{selected?.code} · {selected?.title}</DialogTitle>
      <DialogContent>
        {photoLoading && <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} role="status"><CircularProgress size={20} /><span>Cargando fotos…</span></Stack>}
        {photoError && <Alert severity="error" action={<Button color="inherit" onClick={() => { if (selected) void open(selected) }}>Reintentar</Button>}>{photoError}</Alert>}
        <Stack spacing={2}>{photos.map((photo, index) => <Box component="img" key={index} src={`data:${photo.mimeType};base64,${photo.base64}`} alt={`Evidencia de entrega ${index + 1} de ${selected?.code}`} sx={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 2 }} />)}</Stack>
      </DialogContent>
      <DialogActions><Button onClick={close}>Cerrar</Button></DialogActions>
    </Dialog>
  </Box>
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
