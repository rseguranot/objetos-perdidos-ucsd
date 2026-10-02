import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import SearchRounded from '@mui/icons-material/SearchRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined'
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined'
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import CategoryIcon from './CategoryIcon'
import { CATEGORY_LABELS, filterPublicCatalog, LOCATIONS, TYPE_LABELS, typesForCategory } from '../domain/catalog'
import type { CatalogFilters, Category, PublicItem } from '../domain/types'
import DateRangeFilter from './DateRangeFilter'
import { LEGACY_LOCATION } from '../domain/campus'

function formatDate(date: string) { return new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) }

export interface PageResult<T> { items: T[]; cursor: unknown | null; hasMore: boolean }
interface PublicCatalogProps {
  items: PublicItem[]
  loadPage?: (filters: CatalogFilters, cursor: unknown | null) => Promise<PageResult<PublicItem>>
  publicCount?: number
  refreshToken?: number
}

export default function PublicCatalog({ items, loadPage, publicCount, refreshToken = 0 }: PublicCatalogProps) {
  const [query, setQuery] = useState('')
  const [remoteQuery, setRemoteQuery] = useState('')
  const [category, setCategory] = useState('')
  const [itemType, setItemType] = useState('')
  const [location, setLocation] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<PublicItem | null>(null)
  const [copyMessage, setCopyMessage] = useState('')
  const [page, setPage] = useState(1)
  const [remotePages, setRemotePages] = useState<{ key: string; pages: PageResult<PublicItem>[] }>({ key: '', pages: [] })
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState('')
  const [retryNonce, setRetryNonce] = useState(0)
  const requestVersion = useRef(0)
  useEffect(() => { const timer = window.setTimeout(() => setRemoteQuery(query), 350); return () => window.clearTimeout(timer) }, [query])
  const filters = useMemo<CatalogFilters>(() => ({ query: loadPage ? remoteQuery : query, category, itemType, location, from, to }), [loadPage, remoteQuery, query, category, itemType, location, from, to])
  const filterKey = JSON.stringify(filters) + `:${refreshToken}:${retryNonce}`
  const results = useMemo(() => filterPublicCatalog(items, { query, category, itemType, location, from, to }), [items, query, category, itemType, location, from, to])
  const invalidDates = Boolean(from && to && from > to)
  useEffect(() => {
    if (!loadPage) return
    const version = ++requestVersion.current
    if (invalidDates) {
      queueMicrotask(() => { if (version === requestVersion.current) { setRemoteLoading(false); setRemoteError('') } })
      return
    }
    queueMicrotask(() => { if (version === requestVersion.current) { setRemoteLoading(true); setRemoteError('') } })
    void loadPage(filters, null).then(result => {
      if (version !== requestVersion.current) return
      setRemotePages({ key: filterKey, pages: [result] })
      setPage(1)
      setRemoteLoading(false)
    }).catch(cause => {
      if (version !== requestVersion.current) return
      setRemoteError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.')
      setRemoteLoading(false)
    })
    return () => { if (requestVersion.current === version) requestVersion.current = version + 1 }
  }, [loadPage, filterKey, filters, invalidDates])
  const currentPages = remotePages.key === filterKey ? remotePages.pages : []
  const currentPage = currentPages[page - 1]
  const visible = invalidDates ? [] : loadPage ? currentPage?.items ?? [] : results.slice(0, page * 6)
  const remoteHasMore = Boolean(currentPage?.hasMore || currentPages[page])
  const filtered = Boolean(query || category || itemType || location || from || to)
  const reset = () => { setQuery(''); setCategory(''); setItemType(''); setLocation(''); setFrom(''); setTo(''); setPage(1) }
  const changeCategory = (value: string) => { setCategory(value); setItemType(''); setPage(1) }
  const changeFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1) }
  async function nextRemotePage() {
    if (!loadPage || remoteLoading || !currentPage) return
    if (currentPages[page]) { setPage(page + 1); return }
    if (!currentPage.hasMore) return
    const version = requestVersion.current
    setRemoteLoading(true); setRemoteError('')
    try {
      const result = await loadPage(filters, currentPage.cursor)
      if (version !== requestVersion.current) return
      setRemotePages(previous => previous.key === filterKey ? { key: filterKey, pages: [...previous.pages, result] } : previous)
      setPage(page + 1)
    } catch (cause) {
      if (version === requestVersion.current) setRemoteError(cause instanceof Error ? cause.message : 'No se pudo cargar la siguiente página.')
    } finally { if (version === requestVersion.current) setRemoteLoading(false) }
  }
  async function copyCode() { if (!selected) return; try { await navigator.clipboard.writeText(selected.code); setCopyMessage('Código copiado.'); } catch { setCopyMessage('No se pudo copiar. Puedes seleccionar el código y copiarlo manualmente.'); } }
  return <section id="catalogo" className="catalog-section" aria-labelledby="catalog-title">
    <div className="section-heading"><div><span className="eyebrow">OBJETOS ENCONTRADOS</span><h2 id="catalog-title">Quizás está aquí.</h2><p>Consulta el registro del decanato y encuentra una posible coincidencia.</p></div><span className="record-count">{loadPage ? publicCount === undefined ? 'Catálogo en consulta' : publicCount : filterPublicCatalog(items, { query: '', category: '', location: '', from: '', to: '' }).length} {loadPage && publicCount === undefined ? '' : 'objetos disponibles'}</span></div>
    <div className="search-panel"><div className="search-row"><TextField label="Buscar un objeto" placeholder="Ej. estuche negro, llaves…" value={query} onChange={e => changeFilter(setQuery, e.target.value)} className="search-input" slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }} /><TextField select label="Edificio o lugar" value={location} onChange={e => changeFilter(setLocation, e.target.value)} className="location-filter"><MenuItem value="">Todos los edificios y lugares</MenuItem>{LOCATIONS.map(zone => <MenuItem key={zone} value={zone}>{zone}</MenuItem>)}<MenuItem value={LEGACY_LOCATION}>Ubicación sin edificio identificado</MenuItem></TextField></div>
      <DateRangeFilter from={from} to={to} onChange={(nextFrom, nextTo) => { setFrom(nextFrom); setTo(nextTo); setPage(1) }} />
      <div className="category-filters" aria-label="Categorías"><button className={`category-chip ${!category ? 'active' : ''}`} onClick={() => changeCategory('')} aria-pressed={!category}>Todos</button>{Object.entries(CATEGORY_LABELS).map(([key, label]) => <button key={key} className={`category-chip ${category === key ? 'active' : ''}`} onClick={() => changeCategory(key)} aria-pressed={category === key}><CategoryIcon category={key as Category} />{label}</button>)}</div>
      {category && <TextField select label="Tipo de objeto" value={itemType} onChange={e => changeFilter(setItemType, e.target.value)} className="type-filter" sx={{ mt: 2, width: { xs: '100%', sm: 280 } }}><MenuItem value="">Todos los tipos de {CATEGORY_LABELS[category as Category].toLocaleLowerCase('es')}</MenuItem>{typesForCategory(category as Category).map(type => <MenuItem key={type} value={type}>{TYPE_LABELS[type]}</MenuItem>)}</TextField>}
    </div>
    {invalidDates && <Alert severity="warning">La fecha inicial debe ser anterior o igual a la fecha final.</Alert>}
    <div className="results-bar" role="status" aria-live="polite"><span>{invalidDates ? 'Revisa el rango de fechas' : loadPage ? remoteLoading && !currentPage ? 'Buscando objetos…' : `${visible.length} ${visible.length === 1 ? 'objeto' : 'objetos'} en esta página${remoteHasMore ? ' · hay más resultados' : ''}` : `${results.length} ${results.length === 1 ? 'objeto registrado' : 'objetos registrados'}${filtered ? results.length === 1 ? ' coincidente' : ' coincidentes' : ''}`}</span>{filtered && <Button size="small" onClick={reset}>Limpiar filtros</Button>}</div>
    {remoteError && <Alert severity="error" role="alert">{remoteError} <Button onClick={() => { setPage(1); setRetryNonce(current => current + 1) }}>Reintentar</Button></Alert>}
    {remoteLoading && !currentPage && <p role="status">Cargando objetos…</p>}
    {visible.length ? <div className="object-grid">{visible.map(item => <article className="object-card" key={item.id}><div className="card-top"><span className={`object-icon ${item.category}`}><CategoryIcon category={item.category} /></span><Chip size="small" label="Disponible" className="available-chip" /></div><div className="classification-tags"><Chip size="small" variant="outlined" label={CATEGORY_LABELS[item.category]} /><Chip size="small" label={TYPE_LABELS[item.itemType]} /></div><h3>{item.title}</h3><p className="object-description">{item.description}</p><div className="card-meta"><span><LocationOnOutlined />{item.foundLocation}</span><span><CalendarTodayOutlined />{formatDate(item.foundDate)}</span></div><div className="card-bottom"><span className="object-code">{item.code}</span><Button size="small" endIcon={<ArrowForwardRounded />} onClick={() => { setSelected(item); setCopyMessage('') }} aria-label={`Ver detalles de ${item.title}, ${item.code}`}>Ver detalles</Button></div></article>)}</div> : !remoteLoading && !remoteError && <div className="empty-state"><SearchRounded /><h3>No encontramos coincidencias.</h3><p>Prueba otros filtros o consulta con el decanato. El objeto podría estar pendiente de registro.</p><Button variant="outlined" onClick={reset}>Ver todos los objetos</Button></div>}
    {loadPage ? currentPage && <div className="load-more" role="group" aria-label="Paginación del catálogo"><Button variant="outlined" disabled={page === 1 || remoteLoading} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page}</span><Button variant="outlined" disabled={!remoteHasMore || remoteLoading} onClick={() => { void nextRemotePage() }}>Siguiente</Button></div> : visible.length < results.length && !invalidDates && <div className="load-more"><Button variant="outlined" onClick={() => setPage(page + 1)}>Mostrar más objetos</Button></div>}
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm" aria-labelledby="object-detail-title"><DialogTitle id="object-detail-title" className="dialog-heading">Detalle del objeto<IconButton aria-label="Cerrar detalle" onClick={() => setSelected(null)}><CloseRounded /></IconButton></DialogTitle><DialogContent>{selected && <><div className="detail-intro"><span className={`object-icon ${selected.category}`}><CategoryIcon category={selected.category} /></span><div><div className="classification-tags"><Chip size="small" variant="outlined" label={CATEGORY_LABELS[selected.category]} /><Chip size="small" label={TYPE_LABELS[selected.itemType]} /></div><h2>{selected.title}</h2><Chip size="small" label="Disponible para reclamación" color="success" variant="outlined" /></div></div><p>{selected.description}</p><dl className="detail-fields"><div><dt>Código del objeto</dt><dd>{selected.code}</dd></div><div><dt>Fecha del hallazgo</dt><dd>{formatDate(selected.foundDate)}</dd></div><div><dt>Se encontró en</dt><dd>{selected.foundLocation}</dd></div><div><dt>Punto de retiro propuesto</dt><dd>Decanato de Estudiantes</dd></div></dl><div className="claim-box"><h3>¿Crees que es tuyo?</h3><ol><li>Anota el código y consulta con el decanato.</li><li>Describe una característica particular o presenta una prueba de propiedad.</li><li>Presenta tu documento de identidad o carné de estudiante al retirar el objeto.</li><li>El personal documentará la entrega con una fotografía de evidencia junto al objeto. La fotografía será privada y solo podrá consultarla el personal autorizado.</li></ol></div>{copyMessage && <p role="status">{copyMessage}</p>}</>}</DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Cerrar</Button><Button variant="contained" startIcon={<ContentCopyRounded />} onClick={copyCode}>Copiar código para consultar</Button></DialogActions></Dialog>
  </section>
}
