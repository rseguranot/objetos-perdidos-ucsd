import Box from '@mui/material/Box'
import Autocomplete from '@mui/material/Autocomplete'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { catalogPeriodOptions, changeCatalogYear, type CatalogPeriod } from '../domain/catalog-period'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function MonthYearFilter({ value, onChange }: { value: CatalogPeriod; onChange: (value: CatalogPeriod) => void }) {
  const { years, months } = catalogPeriodOptions(value.year)
  return <Box role="group" aria-label="Filtrar por año y mes del hallazgo" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(0, 1.5fr)', sm: '140px 220px' }, gap: 2, mt: 2.5 }}>
    <Autocomplete disableClearable options={years} value={value.year} getOptionLabel={year => String(year)} onChange={(_, year) => onChange(changeCatalogYear(value, year))} openText="Elegir año" closeText="Cerrar años" noOptionsText="Sin coincidencias" renderInput={params => <TextField {...params} label="Año" />} />
    <TextField select label="Mes" value={value.month} onChange={event => { const month = Number(event.target.value); if (months.includes(month)) onChange({ ...value, month }) }}>{months.map(month => <MenuItem key={month} value={month}>{MONTHS[month - 1]}</MenuItem>)}</TextField>
  </Box>
}
