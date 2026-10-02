export interface PreparedPhoto {
  mimeType: 'image/jpeg'
  base64: string
  size: number
  width: number
  height: number
}

export interface EvidenceSummary {
  id: string
  itemId: string
  code: string
  title: string
  deliveredAt: string
  photoCount: number
}

export const MAX_PHOTOS = 3
export const MAX_PHOTO_BYTES = 1_000_000
export const MAX_INPUT_BYTES = 10_000_000
export const MAX_PHOTO_SIDE = 1600

export function imageSignature(bytes: Uint8Array): 'image/jpeg' | 'image/png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  const png = [137, 80, 78, 71, 13, 10, 26, 10]
  return bytes.length >= png.length && png.every((byte, index) => bytes[index] === byte) ? 'image/png' : null
}

export function scaledDimensions(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('La imagen no tiene dimensiones válidas.')
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function validateInputPhoto(size: number, mimeType: string, signature: string | null): void {
  if (size <= 0 || size > MAX_INPUT_BYTES) throw new Error('Cada foto debe pesar como máximo 10 MB.')
  if (!signature || signature !== mimeType || !['image/jpeg', 'image/png'].includes(mimeType)) throw new Error('Selecciona una imagen JPEG o PNG válida.')
}

/** Canvas may retain an ICC profile. Remove metadata before SOS, preserving compressed pixels. */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  const invalid = () => new Error('No se pudo preparar una imagen JPEG válida.')
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) throw invalid()
  const segments: Uint8Array[] = [bytes.subarray(0, 2)]
  let offset = 2
  while (offset < bytes.length - 2) {
    const start = offset
    if (bytes[offset++] !== 0xff) throw invalid()
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === undefined || marker === 0 || marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 1) throw invalid()
    if (offset + 2 > bytes.length - 2) throw invalid()
    const length = bytes[offset] * 256 + bytes[offset + 1]
    if (length < 2 || offset + length > bytes.length - 2) throw invalid()
    if (marker === 0xda) {
      if (length < 6 || offset + length >= bytes.length - 2) throw invalid()
      // Entropy-coded data can contain escaped markers: never parse or modify its bytes.
      segments.push(bytes.subarray(start))
      const output = new Uint8Array(segments.reduce((total, segment) => total + segment.length, 0))
      let position = 0
      for (const segment of segments) { output.set(segment, position); position += segment.length }
      return output
    }
    offset += length
    if (![0xe1, 0xe2, 0xed, 0xfe].includes(marker)) segments.push(bytes.subarray(start, offset))
  }
  throw invalid()
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  validateInputPhoto(file.size, file.type, imageSignature(new Uint8Array(await file.slice(0, 8).arrayBuffer())))
  const url = URL.createObjectURL(file)
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('No se pudo leer la foto.'))
      image.src = url
    })
    let dimensions = scaledDimensions(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = dimensions.width; canvas.height = dimensions.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Este navegador no puede preparar la foto.')
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', Math.max(0.5, 0.85 - attempt * 0.08)))
      if (!blob) throw new Error('No se pudo preparar la foto.')
      if (blob.size <= MAX_PHOTO_BYTES) {
        const bytes = stripJpegMetadata(new Uint8Array(await blob.arrayBuffer()))
        let binary = ''
        for (const byte of bytes) binary += String.fromCharCode(byte)
        return { mimeType: 'image/jpeg', base64: btoa(binary), size: bytes.length, ...dimensions }
      }
      dimensions = { width: Math.max(1, Math.floor(dimensions.width * 0.8)), height: Math.max(1, Math.floor(dimensions.height * 0.8)) }
    }
    throw new Error('No se pudo reducir la foto a 1 MB. Selecciona otra imagen.')
  } finally { image.src = ''; URL.revokeObjectURL(url) }
}
