import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined'
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined'
import { MAX_PHOTOS, preparePhoto, type PreparedPhoto } from '../data/evidence-photos'

function selectWithKeyboard(event: KeyboardEvent<HTMLElement>) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    event.currentTarget.querySelector<HTMLInputElement>('input')?.click()
  }
}

export default function EvidencePhotoPicker({ value, onChange, onBusyChange, disabled = false }: { value: PreparedPhoto[]; onChange: (photos: PreparedPhoto[]) => void; onBusyChange?: (busy: boolean) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const generation = useRef(0)
  useEffect(() => () => { generation.current++ }, [])
  async function select(files: FileList | null, replaceIndex?: number) {
    if (!files?.length || disabled || busy) return
    const chosen = Array.from(files)
    if (chosen.length + (replaceIndex === undefined ? value.length : value.length - 1) > MAX_PHOTOS) { setError('Puedes añadir hasta tres fotos.'); return }
    const current = ++generation.current
    setBusy(true); onBusyChange?.(true); setError('')
    try {
      const prepared: PreparedPhoto[] = []
      for (const file of chosen) prepared.push(await preparePhoto(file))
      if (current !== generation.current) return
      if (replaceIndex === undefined) onChange([...value, ...prepared])
      else onChange(value.map((photo, index) => index === replaceIndex ? prepared[0] : photo))
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : 'No se pudo preparar la foto.') }
    finally { if (current === generation.current) { setBusy(false); onBusyChange?.(false) } }
  }
  return <Box component="section" aria-label="Fotos de entrega" sx={{ mt: 2 }}>
    <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>Fotos de entrega</Typography>
    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>Incluye a la persona junto al objeto. No fotografíes su documento de identidad.</Typography>
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <Button component="label" onKeyDown={selectWithKeyboard} variant="outlined" startIcon={<AddPhotoAlternateOutlined />} disabled={disabled || busy || value.length >= MAX_PHOTOS}>Seleccionar fotos
        <input hidden type="file" accept="image/jpeg,image/png" multiple onChange={event => { void select(event.target.files); event.target.value = '' }} />
      </Button>
      <Button component="label" onKeyDown={selectWithKeyboard} variant="outlined" startIcon={<PhotoCameraOutlined />} disabled={disabled || busy || value.length >= MAX_PHOTOS} sx={{ display: { xs: 'inline-flex', md: 'none' } }}>Tomar foto
        <input hidden type="file" accept="image/jpeg,image/png" capture="user" onChange={event => { void select(event.target.files); event.target.value = '' }} />
      </Button>
    </Stack>
    {busy && <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: 'center' }} role="status"><CircularProgress size={18} /><span>Preparando fotos…</span></Stack>}
    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
      {value.map((photo, index) => <Box key={index} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1 }}>
        <Box component="button" type="button" aria-label={`Ampliar foto ${index + 1}`} onClick={() => setPreviewIndex(index)} sx={{ width: '100%', p: 0, border: 0, bgcolor: 'transparent', cursor: 'zoom-in', borderRadius: 1, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}><Box component="img" src={`data:${photo.mimeType};base64,${photo.base64}`} alt={`Foto de entrega ${index + 1}`} sx={{ width: '100%', height: 140, objectFit: 'contain', borderRadius: 1 }} /></Box>
        <Button fullWidth size="small" onClick={() => setPreviewIndex(index)}>Ver foto</Button>
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Button component="label" onKeyDown={selectWithKeyboard} size="small" disabled={disabled || busy}>Reemplazar
            <input hidden type="file" accept="image/jpeg,image/png" onChange={event => { void select(event.target.files, index); event.target.value = '' }} />
          </Button>
          <Button size="small" disabled={disabled || busy} onClick={() => onChange(value.filter((_, position) => position !== index))} aria-label={`Quitar foto ${index + 1}`}>Quitar</Button>
        </Stack>
      </Box>)}
    </Box>
    <Dialog open={previewIndex !== null && Boolean(value[previewIndex])} onClose={() => setPreviewIndex(null)} maxWidth="md" fullWidth aria-labelledby="selected-photo-title">
      <DialogTitle id="selected-photo-title">Foto de entrega {previewIndex !== null ? previewIndex + 1 : ''}</DialogTitle>
      <DialogContent>{previewIndex !== null && value[previewIndex] && <Box component="img" src={`data:${value[previewIndex].mimeType};base64,${value[previewIndex].base64}`} alt={`Foto de entrega ${previewIndex + 1} ampliada`} sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} />}</DialogContent>
      <DialogActions><Button onClick={() => setPreviewIndex(null)}>Cerrar</Button></DialogActions>
    </Dialog>
  </Box>
}
