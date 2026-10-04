import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import type { PreparedPhoto } from '../data/evidence-photos'

export interface EvidenceViewApi { view: (evidenceId: string) => Promise<{ photos: PreparedPhoto[] }> }

export default function EvidenceViewer({ evidenceId, title, api, onClose }: { evidenceId: string; title: string; api: EvidenceViewApi; onClose: () => void }) {
  const [photos, setPhotos] = useState<PreparedPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    void api.view(evidenceId).then(result => { if (active) { setPhotos(result.photos); setError('') } }).catch(() => { if (active) setError('No se pudieron cargar las fotos.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, evidenceId, attempt])
  return <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-labelledby="delivery-evidence-title">
    <DialogTitle id="delivery-evidence-title">{title}</DialogTitle>
    <DialogContent>
      {loading && <Stack direction="row" spacing={1} role="status" sx={{ alignItems: 'center' }}><CircularProgress size={20} /><span>Cargando fotos…</span></Stack>}
      {error && <Alert severity="error" action={<Button color="inherit" onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>Reintentar</Button>}>{error}</Alert>}
      <Stack spacing={2}>{photos.map((photo, index) => <Box component="img" key={index} src={`data:${photo.mimeType};base64,${photo.base64}`} alt={`Foto de entrega ${index + 1}`} sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 2 }} />)}</Stack>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
  </Dialog>
}
