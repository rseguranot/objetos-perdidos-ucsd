import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

export interface FilterOption { value: string; label: string }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()

export default function SearchableFilter({ label, value, options, onChange, disabled, className }: { label: string; value: string; options: FilterOption[]; onChange: (value: string) => void; disabled?: boolean; className?: string }) {
  return <Autocomplete
    className={className}
    disabled={disabled}
    options={options}
    value={options.find(option => option.value === value) ?? null}
    onChange={(_, option) => onChange(option?.value ?? '')}
    getOptionLabel={option => option.label}
    isOptionEqualToValue={(option, selected) => option.value === selected.value}
    filterOptions={(available, { inputValue }) => available.filter(option => normalize(option.label).includes(normalize(inputValue)))}
    noOptionsText="Sin coincidencias"
    clearText="Limpiar selección"
    openText="Abrir opciones"
    closeText="Cerrar opciones"
    renderInput={params => <TextField {...params} label={label} />}
  />
}
