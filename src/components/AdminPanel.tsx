import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import AddRounded from '@mui/icons-material/AddRounded'
import EditOutlined from '@mui/icons-material/EditOutlined'
import PublishOutlined from '@mui/icons-material/PublishOutlined'
import TaskAltRounded from '@mui/icons-material/TaskAltRounded'
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import InputAdornment from '@mui/material/InputAdornment'
import CategoryIcon from './CategoryIcon'
import DateRangeFilter from './DateRangeFilter'
import { archiveItem, canDispose, CATEGORY_LABELS, createItem, deliverItem, disposeItem, filterInternalItems, LOCATIONS, publishItem, retentionInfo, STATUS_LABELS, TYPE_LABELS, typesForCategory, updateItem } from '../domain/catalog'
import type { Category, DeliveryInput, IdentityType, ItemDraft, ItemType, LostItem } from '../domain/types'
import { canEdit, canReceive, ROLE_LABELS, type Session } from '../domain/roles'
import { todayISO } from '../date'

type Commit = (next: LostItem[], message: string) => Promise<void>
const statusColors = { borrador: 'default', disponible: 'success', entregado: 'info', archivado: 'default' } as const

function ItemForm({ item, items, session, demo, onCommit, onClose }: { item: LostItem | null; items: LostItem[]; session: Session; demo: boolean; onCommit: Commit; onClose: () => void }) {
  const [draft, setDraft] = useState<ItemDraft>(item ? { title: item.title, category: item.category, itemType: item.itemType, description: item.description, foundDate: item.foundDate, foundLocation: item.foundLocation, received: item.received, receivedDate: item.receivedDate, custodyLocation: item.custodyLocation, privateDetails: item.privateDetails } : { title: '', category: 'electronica', itemType: 'otro', description: '', foundDate: todayISO(), foundLocation: 'Biblioteca', received: false, receivedDate: '', custodyLocation: '', privateDetails: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const receiveAllowed = canReceive(session)
  function field<K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) { setDraft(previous => ({ ...previous, [key]: value })) }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try { setSaving(true); const saved = item ? updateItem(item, draft, session.email) : createItem(items, draft, session.email); await onCommit(item ? items.map(current => current.id === item.id ? saved : current) : [...items, saved], item ? 'Registro actualizado.' : 'Borrador creado.'); onClose() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el registro.') } finally { setSaving(false) }
  }
  return <Dialog open onClose={() => !saving && onClose()} fullWidth maxWidth="sm" aria-labelledby="item-form-title"><form onSubmit={event => { void save(event) }}><DialogTitle id="item-form-title">{item ? 'Editar registro' : 'Registrar un objeto'}</DialogTitle><DialogContent><Alert severity="info" className="form-alert">{demo ? 'Usa únicamente datos ficticios. ' : ''}Los nuevos objetos se guardan como borrador. {receiveAllowed ? 'Confirma recepción, fecha y custodia antes de publicar.' : 'El decanato confirmará su recepción y custodia.'}</Alert>{error && <Alert severity="error" className="form-alert">{error}</Alert>}<fieldset className="form-fieldset" disabled={saving}><div className="form-grid">
    <TextField required label="Nombre del objeto" value={draft.title} onChange={e => field('title', e.target.value)} className="form-full" slotProps={{ htmlInput: { maxLength: 100 } }} />
    <TextField select label="Categoría" value={draft.category} onChange={e => { const category = e.target.value as Category; setDraft(previous => ({ ...previous, category, itemType: typesForCategory(category).includes(previous.itemType) ? previous.itemType : 'otro' })) }}>{Object.entries(CATEGORY_LABELS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
    <TextField select label="Tipo de objeto" value={draft.itemType} onChange={e => field('itemType', e.target.value as ItemType)}>{typesForCategory(draft.category).map(type => <MenuItem key={type} value={type}>{TYPE_LABELS[type]}</MenuItem>)}</TextField>
    <TextField required label="Fecha del hallazgo" type="date" value={draft.foundDate} onChange={e => field('foundDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
    <TextField select label="Zona del hallazgo" value={draft.foundLocation} onChange={e => field('foundLocation', e.target.value)} className="form-full">{LOCATIONS.map(zone => <MenuItem key={zone} value={zone}>{zone}</MenuItem>)}</TextField>
    <TextField required multiline minRows={2} label="Descripción pública" helperText={draft.category === 'dinero' ? 'Describe el hallazgo sin publicar monto, moneda ni denominaciones. Guarda esos detalles en Características reservadas.' : 'Color, tipo y características generales. No incluyas datos personales ni todas las señales para acreditar propiedad.'} value={draft.description} onChange={e => field('description', e.target.value)} className="form-full" slotProps={{ htmlInput: { maxLength: 500 } }} />
    <div className="form-divider form-full">Recepción y custodia · información interna</div>
    <FormControlLabel className="form-full" control={<Checkbox disabled={!receiveAllowed} checked={draft.received} onChange={e => { const checked = e.target.checked; setDraft(previous => ({ ...previous, received: checked, receivedDate: checked && !previous.receivedDate ? todayISO() : previous.receivedDate })) }} />} label="Confirmo que el decanato recibió el objeto" />
    <TextField disabled={!receiveAllowed} label="Fecha de recepción" type="date" helperText={receiveAllowed ? 'Al confirmar recepción se propone hoy; corrige la fecha si corresponde.' : 'Solo el decanato puede confirmar recepción.'} value={draft.receivedDate} onChange={e => field('receivedDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
    <TextField disabled={!receiveAllowed} label="Ubicación de custodia" placeholder="Ej. Armario A, casilla 4" helperText={draft.received ? 'Obligatoria al confirmar recepción.' : 'Se completa cuando el decanato recibe el objeto.'} value={draft.custodyLocation} onChange={e => field('custodyLocation', e.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
    <TextField multiline minRows={2} label="Características reservadas" helperText={draft.category === 'dinero' ? 'Monto, moneda, denominaciones y forma en que se encontró. Usa datos ficticios; no aparecen en el catálogo.' : 'Detalles ficticios para comprobar propiedad; no aparecen en el catálogo.'} value={draft.privateDetails} onChange={e => field('privateDetails', e.target.value)} className="form-full" slotProps={{ htmlInput: { maxLength: 4000 } }} />
  </div></fieldset></DialogContent><DialogActions><Button disabled={saving} onClick={onClose}>Cancelar</Button><Button disabled={saving} variant="contained" type="submit">{saving ? 'Guardando…' : `Guardar ${item ? 'cambios' : 'borrador'}`}</Button></DialogActions></form></Dialog>
}

function DeliveryForm({ item, demo, onSave, onClose }: { item: LostItem; demo: boolean; onSave: (delivery: DeliveryInput) => Promise<void>; onClose: () => void }) {
  const [recipient, setRecipient] = useState('')
  const [proof, setProof] = useState('')
  const [identityType, setIdentityType] = useState<IdentityType | ''>('')
  const [photoEvidenceReference, setPhotoEvidenceReference] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!confirmed || !identityType) { setError('Confirma la verificación presencial de identidad y la custodia de la foto externa.'); return }
    try { setSaving(true); await onSave({ recipient, proof, identityType, photoEvidenceReference }) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar la entrega.') } finally { setSaving(false) }
  }
  return <Dialog open onClose={() => !saving && onClose()} fullWidth maxWidth="sm" aria-labelledby="delivery-title"><form onSubmit={event => { void save(event) }}><DialogTitle id="delivery-title">Registrar entrega</DialogTitle><DialogContent>
    <p><strong>{item.title}</strong> · {item.code}</p>
    <Alert severity="info" className="form-alert">Comprueba la propiedad y revisa presencialmente el documento de identidad o carné de estudiante. Toma la evidencia de entrega con el objeto y custódiala fuera de esta app. {demo ? 'Simula estos pasos con datos ficticios.' : 'Informa al receptor sobre el uso y la custodia de la fotografía según el protocolo aprobado por UCSD.'}</Alert>
    {error && <Alert severity="error">{error}</Alert>}
    <fieldset disabled={saving} className="form-fieldset"><div className="form-grid">
      <TextField required label={demo ? 'Receptor ficticio' : 'Receptor'} value={recipient} onChange={e => setRecipient(e.target.value)} className="form-full" slotProps={{ htmlInput: { maxLength: 300 } }} />
      <TextField required label="Cómo se comprobó la propiedad" multiline minRows={2} value={proof} onChange={e => setProof(e.target.value)} className="form-full" slotProps={{ htmlInput: { maxLength: 2000 } }} />
      <TextField required select label="Identificación verificada" value={identityType} onChange={e => setIdentityType(e.target.value as IdentityType)} helperText="Registra solo el tipo; no copies el número ni una imagen del documento." className="form-full"><MenuItem value="documento_identidad">Documento de identidad</MenuItem><MenuItem value="carnet_estudiante">Carné de estudiante</MenuItem></TextField>
      <TextField required label="Referencia de foto externa" placeholder={`${item.code}-entrega`} value={photoEvidenceReference} onChange={e => setPhotoEvidenceReference(e.target.value)} helperText="Código o nombre del archivo en la custodia externa acordada. La app no toma ni carga fotos. Evita enlaces públicos." slotProps={{ htmlInput: { maxLength: 300 } }} className="form-full" />
      <FormControlLabel className="form-full" control={<Checkbox checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />} label={demo ? 'Confirmo la simulación de identidad verificada y foto de entrega guardada externamente.' : 'Confirmo identidad verificada y foto de entrega guardada en la custodia externa autorizada.'} />
    </div></fieldset>
  </DialogContent><DialogActions><Button disabled={saving} onClick={onClose}>Cancelar</Button><Button disabled={saving || !confirmed} variant="contained" type="submit">{saving ? 'Guardando…' : 'Confirmar entrega'}</Button></DialogActions></form></Dialog>
}

function DispositionForm({ item, demo, onSave, onClose }: { item: LostItem; demo: boolean; onSave: (recipient: string, reference: string) => Promise<void>; onClose: () => void }) {
  const documents = item.category === 'documentos'
  const [recipient, setRecipient] = useState('')
  const [reference, setReference] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!confirmed) { setError('Confirma que el traslado ya se realizó y fue autorizado.'); return }
    try { setSaving(true); await onSave(recipient, reference) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar el destino.') } finally { setSaving(false) }
  }
  return <Dialog open onClose={() => !saving && onClose()} fullWidth maxWidth="sm" aria-labelledby="disposition-title"><form onSubmit={event => { void save(event) }}><DialogTitle id="disposition-title">{documents ? 'Registrar remisión a su emisor' : 'Registrar donación'}</DialogTitle><DialogContent>
    <p><strong>{item.title}</strong> · {item.code}</p>
    <Alert severity="info" className="form-alert">Propuesta de 90 días desde la recepción. UCSD debe aprobar el procedimiento. Este registro documenta un traslado ya realizado y retira el objeto del catálogo. {demo && 'Usa datos ficticios.'}</Alert>
    {error && <Alert severity="error">{error}</Alert>}
    <fieldset disabled={saving} className="form-fieldset"><div className="form-grid">
      <TextField required label={documents ? 'Institución emisora receptora' : 'Organización sin fines de lucro receptora'} value={recipient} onChange={event => setRecipient(event.target.value)} className="form-full" slotProps={{ htmlInput: { maxLength: 300 } }} />
      <TextField required label="Constancia o referencia del traslado" helperText="Registra el acta, su referencia y la comprobación de recepción. Esta información es interna." value={reference} onChange={event => setReference(event.target.value)} multiline minRows={3} className="form-full" slotProps={{ htmlInput: { maxLength: 2000 } }} />
      <FormControlLabel className="form-full" control={<Checkbox checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />} label={documents ? 'Confirmo que la remisión fue autorizada y el emisor recibió el documento.' : 'Confirmo que la donación fue autorizada y el objeto en buen estado fue recibido por la organización.'} />
    </div></fieldset>
  </DialogContent><DialogActions><Button disabled={saving} onClick={onClose}>Cancelar</Button><Button disabled={saving || !confirmed} variant="contained" type="submit">{saving ? 'Guardando…' : documents ? 'Confirmar remisión' : 'Confirmar donación'}</Button></DialogActions></form></Dialog>
}

export default function AdminPanel({ items, session, demo, onCommit, blocked }: { items: LostItem[]; session: Session; demo: boolean; onCommit: Commit; blocked: boolean }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [destination, setDestination] = useState<'' | 'donacion' | 'remision_documentos' | 'pendiente90'>('')
  const [editing, setEditing] = useState<LostItem | null | undefined>(undefined)
  const [delivering, setDelivering] = useState<LostItem | null>(null)
  const [disposing, setDisposing] = useState<LostItem | null>(null)
  const [archiving, setArchiving] = useState<LostItem | null>(null)
  const [inspecting, setInspecting] = useState<LostItem | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const receiveAllowed = canReceive(session)
  const invalidDates = Boolean(from && to && from > to)
  const filtered = filterInternalItems(items, { query, status, from, to, disposition: destination })
  const reviewCount = filterInternalItems(items, { query: '', status: '', from: '', to: '', disposition: 'pendiente90' }).length
  const donatedCount = items.filter(item => item.disposition?.kind === 'donacion').length
  const remittedCount = items.filter(item => item.disposition?.kind === 'remision_documentos').length
  function destinationFilter(value: typeof destination) { setDestination(destination === value ? '' : value); setStatus('') }
  function clearFilters() { setQuery(''); setStatus(''); setFrom(''); setTo(''); setDestination('') }
  async function transition(next: LostItem, message: string) { await onCommit(items.map(item => item.id === next.id ? next : item), message); setError('') }
  async function action(run: () => Promise<void>) { try { setBusy(true); await run() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar la operación.') } finally { setBusy(false) } }
  return <section className="admin-section" aria-labelledby="admin-title">
    <div className="section-heading"><div><span className="eyebrow">{ROLE_LABELS[session.role!]}</span><h1 id="admin-title">Cada objeto, un seguimiento.</h1><p>{receiveAllowed ? 'Registra la recepción, confirma la custodia y documenta la entrega.' : 'Registra hallazgos y prepara tus borradores para la recepción del decanato.'}</p></div><Button variant="contained" startIcon={<AddRounded />} disabled={blocked || busy} onClick={() => setEditing(null)}>Registrar objeto</Button></div>
    <Alert severity={demo ? 'warning' : 'info'} className="admin-warning">{demo ? 'Panel de demostración. Identidades y permisos simulados; no introduzcas información de personas reales.' : `Cuenta autorizada: ${session.email}. Las operaciones están sujetas a los permisos del backend.`}{!receiveAllowed && ' Solo se muestran tus propios registros. La recepción, publicación y entrega corresponden al decanato.'}</Alert>
    <p className="metrics-caption">Totales de los registros cargados. Los filtros se aplican a la tabla.</p>
    <div className="admin-stats">{Object.entries(STATUS_LABELS).map(([key, label]) => <button key={key} className={`admin-stat ${status === key ? 'selected' : ''}`} onClick={() => { setStatus(status === key ? '' : key); setDestination('') }} aria-pressed={status === key}><span>{label}</span><strong>{items.filter(item => item.status === key).length}</strong><span>{key === 'borrador' ? 'Por confirmar' : key === 'disponible' ? 'En el catálogo público' : key === 'entregado' ? 'Devueltos a su dueño' : 'Historial conservado'}</span></button>)}</div>
    {receiveAllowed && <div className="retention-section"><p><strong>Seguimiento de custodia · propuesta de 90 días</strong><span>Desde la recepción en el decanato. El plazo no cambia derechos ni registra destinos automáticamente.</span></p><div className="retention-stats">
      <button className={`admin-stat ${destination === 'pendiente90' ? 'selected' : ''}`} aria-pressed={destination === 'pendiente90'} onClick={() => destinationFilter('pendiente90')}><span>Plazo cumplido</span><strong>{reviewCount}</strong><span>Pendientes de revisión</span></button>
      <button className={`admin-stat ${destination === 'donacion' ? 'selected' : ''}`} aria-pressed={destination === 'donacion'} onClick={() => destinationFilter('donacion')}><span>Donados</span><strong>{donatedCount}</strong><span>Destino y constancia registrados</span></button>
      <button className={`admin-stat ${destination === 'remision_documentos' ? 'selected' : ''}`} aria-pressed={destination === 'remision_documentos'} onClick={() => destinationFilter('remision_documentos')}><span>Documentos remitidos</span><strong>{remittedCount}</strong><span>A la institución emisora</span></button>
    </div></div>}
    {error && <Alert severity="error" onClose={() => setError('')} className="form-alert">{error}</Alert>}
    <div className="admin-filters"><div className="admin-toolbar">
      <TextField label="Buscar en el registro" value={query} onChange={event => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }} />
      <TextField select label="Estado" value={status} onChange={event => setStatus(event.target.value)}><MenuItem value="">Todos los estados</MenuItem>{Object.entries(STATUS_LABELS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
      {receiveAllowed && <TextField select label="Seguimiento / destino" value={destination} onChange={event => setDestination(event.target.value as typeof destination)}><MenuItem value="">Todos</MenuItem><MenuItem value="pendiente90">90 días · pendiente de revisión</MenuItem><MenuItem value="donacion">Donación registrada</MenuItem><MenuItem value="remision_documentos">Remisión a su emisor</MenuItem></TextField>}
    </div><DateRangeFilter from={from} to={to} onChange={(nextFrom, nextTo) => { setFrom(nextFrom); setTo(nextTo) }} />
    {invalidDates && <Alert severity="warning" className="date-warning">La fecha inicial debe ser anterior o igual a la fecha final.</Alert>}
    <div className="admin-results" role="status" aria-live="polite"><span>{invalidDates ? 'Revisa el rango de fechas' : `${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}`}</span>{Boolean(query || status || from || to || destination) && <Button size="small" onClick={clearFilters}>Limpiar filtros</Button>}</div></div>
    <TableContainer className="admin-table"><Table aria-label="Registro interno de objetos perdidos" size="small"><TableHead><TableRow><TableCell>Objeto / código</TableCell><TableCell>Hallazgo</TableCell><TableCell>Estado</TableCell><TableCell>Plazo de custodia</TableCell><TableCell>Custodia / destino</TableCell><TableCell>Acciones</TableCell></TableRow></TableHead><TableBody>{filtered.map(item => {
      const retention = retentionInfo(item)
      return <TableRow key={item.id}>
        <TableCell><div className="table-object"><CategoryIcon category={item.category} /><div><strong>{item.title}</strong><span>{item.code}</span></div></div></TableCell>
        <TableCell>{item.foundLocation}<span className="table-subtitle">{item.foundDate.split('-').reverse().join('/')}</span></TableCell>
        <TableCell><Chip size="small" label={item.disposition ? item.disposition.kind === 'donacion' ? 'Donado' : 'Remitido al emisor' : STATUS_LABELS[item.status]} color={item.disposition ? 'success' : statusColors[item.status]} variant="outlined" /></TableCell>
        <TableCell>{item.disposition ? 'Destino final registrado' : item.delivery ? 'Devolución registrada' : !retention ? 'Desde recepción confirmada' : <><span className={retention.overdue ? 'retention-overdue' : ''}>{retention.overdue ? '90 días cumplidos · revisar' : `${retention.remainingDays} días restantes`}</span><span className="table-subtitle">Revisión: {retention.dueDate.split('-').reverse().join('/')}</span>{item.category === 'dinero' && retention.overdue && <span className="table-subtitle">Efectivo · procedimiento especial pendiente</span>}</>}</TableCell>
        <TableCell>{item.disposition ? item.disposition.recipient : item.delivery ? 'Entregado al receptor' : item.custodyLocation || 'Pendiente de confirmar'}</TableCell>
        <TableCell><div className="table-actions">
          {canEdit(session, item) && <Button size="small" disabled={blocked || busy} startIcon={<EditOutlined />} onClick={() => setEditing(item)}>Editar</Button>}
          {receiveAllowed && item.status === 'borrador' && <Button size="small" disabled={blocked || busy} startIcon={<PublishOutlined />} onClick={() => { void action(() => transition(publishItem(item, session.email), 'Objeto publicado en el catálogo.')) }}>Publicar</Button>}
          {receiveAllowed && item.status === 'disponible' && <Button size="small" disabled={blocked || busy} startIcon={<TaskAltRounded />} onClick={() => setDelivering(item)}>Entregar</Button>}
          {receiveAllowed && canDispose(item) && <Button size="small" disabled={blocked || busy} onClick={() => setDisposing(item)}>Registrar destino</Button>}
          <Button size="small" startIcon={<HistoryRounded />} onClick={() => setInspecting(item)}>Historial</Button>
          {receiveAllowed && item.status !== 'archivado' && <Button size="small" disabled={blocked || busy} startIcon={<ArchiveOutlined />} onClick={() => setArchiving(item)}>Archivar</Button>}
        </div></TableCell>
      </TableRow>
    })}{!filtered.length && <TableRow><TableCell colSpan={6}>No hay registros que coincidan con estos filtros.</TableCell></TableRow>}</TableBody></Table></TableContainer>
    {editing !== undefined && <ItemForm key={editing?.id ?? 'new'} item={editing} items={items} session={session} demo={demo} onCommit={onCommit} onClose={() => setEditing(undefined)} />}
    {delivering && <DeliveryForm item={delivering} demo={demo} onClose={() => setDelivering(null)} onSave={async delivery => { await transition(deliverItem(delivering, delivery, session.email), 'Entrega registrada. El objeto ya no aparece como disponible.'); setDelivering(null) }} />}
    {disposing && <DispositionForm item={disposing} demo={demo} onClose={() => setDisposing(null)} onSave={async (recipient, reference) => { await transition(disposeItem(disposing, { kind: disposing.category === 'documentos' ? 'remision_documentos' : 'donacion', recipient, reference }, session.email), 'Destino final registrado. El objeto se archivó y su historial se conserva.'); setDisposing(null) }} />}
    <Dialog open={Boolean(archiving)} onClose={() => !busy && setArchiving(null)} aria-labelledby="archive-title"><DialogTitle id="archive-title">¿Archivar este registro?</DialogTitle><DialogContent><p>{archiving?.title} · {archiving?.code}</p><p>Dejará de aparecer en el catálogo. Los datos y el historial se conservarán en el panel interno. Archivar no registra una donación.</p></DialogContent><DialogActions><Button disabled={busy} onClick={() => setArchiving(null)}>Cancelar</Button><Button variant="contained" disabled={busy || blocked} onClick={() => { void action(async () => { if (archiving) { await transition(archiveItem(archiving, session.email), 'Registro archivado.'); setArchiving(null) } }) }}>Confirmar archivo</Button></DialogActions></Dialog>
    <Dialog open={Boolean(inspecting)} onClose={() => setInspecting(null)} fullWidth maxWidth="sm" aria-labelledby="history-title"><DialogTitle id="history-title">Registro interno e historial</DialogTitle><DialogContent>{inspecting && <>
      <h3>{inspecting.title} · {inspecting.code}</h3><dl className="detail-fields"><div><dt>Recepción confirmada</dt><dd>{inspecting.received ? 'Sí' : 'No'}</dd></div><div><dt>Fecha de recepción</dt><dd>{inspecting.receivedDate || 'Pendiente'}</dd></div><div><dt>Ubicación de custodia registrada</dt><dd>{inspecting.custodyLocation || 'Pendiente'}</dd></div><div><dt>Características reservadas</dt><dd>{inspecting.privateDetails || 'Sin detalles adicionales'}</dd></div>
      {inspecting.delivery && <><div><dt>{demo ? 'Receptor ficticio' : 'Receptor'}</dt><dd>{inspecting.delivery.recipient}</dd></div><div><dt>Prueba de propiedad registrada</dt><dd>{inspecting.delivery.proof}</dd></div><div><dt>Identificación verificada</dt><dd>{inspecting.delivery.identityType === 'carnet_estudiante' ? 'Carné de estudiante' : inspecting.delivery.identityType === 'documento_identidad' ? 'Documento de identidad' : 'Registro anterior · sin constancia del tipo'}</dd></div><div><dt>Evidencia fotográfica externa</dt><dd>{inspecting.delivery.photoEvidenceReference ?? 'Registro anterior · sin referencia'}<span className="table-subtitle">La imagen no se almacena en esta herramienta.</span></dd></div></>}
      {inspecting.disposition && <><div><dt>Destino final</dt><dd>{inspecting.disposition.kind === 'donacion' ? 'Donación' : 'Remisión a institución emisora'}</dd></div><div><dt>Organización / institución receptora</dt><dd>{inspecting.disposition.recipient}</dd></div><div><dt>Constancia del traslado</dt><dd>{inspecting.disposition.reference}</dd></div><div><dt>Fecha del destino</dt><dd>{new Date(inspecting.disposition.completedAt).toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' })}</dd></div></>}
      </dl><ol className="history-list">{inspecting.history.toReversed().map(entry => <li key={entry.id}><strong>{entry.action}</strong><span>{entry.actor}</span><time dateTime={entry.at}>{new Date(entry.at).toLocaleString('es-DO')}</time></li>)}</ol>
    </>}</DialogContent><DialogActions><Button onClick={() => setInspecting(null)}>Cerrar</Button></DialogActions></Dialog>
  </section>
}
