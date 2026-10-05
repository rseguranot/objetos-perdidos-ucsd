/** Removes demo qualifiers from object-facing text, without touching private audit data. */
export function cleanDemoObjectText(text: string): string {
  return text.replace(/\bObjeto ficticio\.\s*/gi, '').replace(/\bfictici[oa]s?\b/gi, '').replace(/[ \t]{2,}/g, ' ').replace(/ +([.,;:])/g, '$1').trim()
}
export function cleanDemoCustody(text: string): string {
  return text.replace(/^Custodia ficticia\s*[·-]\s*caja\s+(\d+)$/i, 'Decanato - Archivo caja $1')
}
