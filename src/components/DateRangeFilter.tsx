import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { todayISO } from '../date'

export default function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const today = todayISO()
  return <div className="date-filters" role="group" aria-label="Filtrar por fecha del hallazgo">
    <TextField label="Hallazgo desde" type="date" value={from} onChange={event => onChange(event.target.value, to)} slotProps={{ inputLabel: { shrink: true } }} />
    <TextField label="Hallazgo hasta" type="date" value={to} onChange={event => onChange(from, event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
    <div className="date-presets"><Button size="small" onClick={() => onChange(today, today)}>Hoy</Button><Button size="small" onClick={() => onChange(`${today.slice(0, 7)}-01`, today)}>Este mes</Button><Button size="small" disabled={!from && !to} onClick={() => onChange('', '')}>Sin fechas</Button></div>
  </div>
}
