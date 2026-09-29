// Campus directory: https://www.ucsd.edu.do/estudiantes/
// EFV spelling also follows UCSD's official inauguration article; aliases preserve both versions.
export const CAMPUS_LOCATIONS = [
  { name: 'Biblioteca Octavio Cardenal Beras Rojas', aliases: ['Biblioteca'] },
  { name: 'Edificio La Altagracia (EAL)', aliases: ['EAL'] },
  { name: 'Edificio Inmaculada (EIN)', aliases: ['EIN'] },
  { name: 'Edificio Pedro de Córdova (EPC)', aliases: ['EPC', 'Edificio Pedro de Córdoba (EPC)'] },
  { name: 'Edificio de Rectoría', aliases: [] },
  { name: 'Edificio de Postgrado', aliases: [] },
  { name: 'Edificio Administrativo', aliases: [] },
  { name: 'Centro de Investigación y Ciencias de la Familia', aliases: [] },
  { name: 'Centro de Rehabilitación', aliases: [] },
  { name: 'Edificio Santa Catalina (ESC)', aliases: ['ESC'] },
  { name: 'Edificio Francisco de Vitoria (EFV)', aliases: ['EFV', 'Edificio Francisco de Victoria (EFV)'] },
  { name: 'Edificio Nicolás de Jesús Cardenal López Rodríguez (ECL)', aliases: ['ECL'] },
  { name: 'Cafeterías', aliases: ['Cafetería'] },
  { name: 'Piscina Universitaria', aliases: [] },
  { name: 'Helados Bón', aliases: [] },
  { name: 'Escuela de Graduados de Odontología', aliases: [] },
  { name: 'Parroquia Universitaria Santa María de la Anunciación', aliases: [] },
] as const

export const OTHER_LOCATION = 'Otro lugar del campus'
export const LEGACY_LOCATION = '__legacy__'
export const CAMPUS_NAMES: string[] = [...CAMPUS_LOCATIONS.map(place => place.name), OTHER_LOCATION]

function normalize(value: string) { return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim() }

export function splitFoundLocation(value: string): { building: string; detail: string } {
  const separator = value.indexOf(' · ')
  const head = separator < 0 ? value.trim() : value.slice(0, separator).trim()
  const detail = separator < 0 ? '' : value.slice(separator + 3).trim()
  const place = CAMPUS_LOCATIONS.find(place => [place.name, ...place.aliases].some(name => normalize(name) === normalize(head)))
  if (place) return { building: place.name, detail }
  if (head === OTHER_LOCATION) return { building: OTHER_LOCATION, detail }
  // Unknown historic text is preserved, never assigned to an invented building.
  return { building: LEGACY_LOCATION, detail: value }
}

export function joinFoundLocation(building: string, detail: string): string {
  if (building === LEGACY_LOCATION) return detail.trim()
  if (!CAMPUS_NAMES.includes(building)) throw new Error('Selecciona el edificio o lugar del hallazgo.')
  return detail.trim() ? `${building} · ${detail.trim()}` : building
}

// Move historic room details into the editable description without rewriting stored records.
export function locationForEditing(foundLocation: string, description: string) {
  const { building, detail } = splitFoundLocation(foundLocation)
  return {
    building,
    description: building !== LEGACY_LOCATION && detail && !normalize(description).includes(normalize(detail))
      ? `${description}\nLugar del hallazgo: ${detail}.` : description,
  }
}

export function matchesBuilding(value: string, building: string): boolean {
  return !building || splitFoundLocation(value).building === building
}

// Fictitious teaching examples, not a mapping of real findings to campus rooms.
export function exampleCampusLocation(index: number): string {
  const building = CAMPUS_LOCATIONS[(index - 1) % CAMPUS_LOCATIONS.length].name
  const detail = building.includes('(EAL)') ? 'Aula 206' : building.includes('(EPC)') ? 'Laboratorio de informática'
    : building.startsWith('Biblioteca') ? 'Sala de lectura' : 'Entrada principal'
  return joinFoundLocation(building, detail)
}
