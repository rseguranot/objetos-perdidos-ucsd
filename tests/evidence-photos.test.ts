import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { imageSignature, scaledDimensions, validateInputPhoto, stripJpegMetadata, MAX_INPUT_BYTES } from '../src/data/evidence-photos.ts'

test('recognizes JPEG and full PNG signatures and rejects disguised files', () => {
  assert.equal(imageSignature(new Uint8Array([255, 216, 255, 224])), 'image/jpeg')
  assert.equal(imageSignature(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png')
  assert.equal(imageSignature(new Uint8Array([137, 80, 78, 71])), null)
  assert.equal(imageSignature(new TextEncoder().encode('<svg>')), null)
  assert.throws(() => validateInputPhoto(100, 'image/png', 'image/jpeg'))
  assert.throws(() => validateInputPhoto(100, 'image/svg+xml', null))
})

test('scales large photos proportionally without enlarging small ones', () => {
  assert.deepEqual(scaledDimensions(4000, 3000), { width: 1600, height: 1200 })
  assert.deepEqual(scaledDimensions(3000, 4000), { width: 1200, height: 1600 })
  assert.deepEqual(scaledDimensions(200, 100), { width: 200, height: 100 })
  for (const [width, height] of [[0, 20], [NaN, 100], [100, Infinity], [-10, 100]]) assert.throws(() => scaledDimensions(width, height))
})

test('bounds input bytes before decoding and requires matching MIME', () => {
  assert.doesNotThrow(() => validateInputPhoto(MAX_INPUT_BYTES, 'image/jpeg', 'image/jpeg'))
  assert.throws(() => validateInputPhoto(MAX_INPUT_BYTES + 1, 'image/jpeg', 'image/jpeg'))
  assert.throws(() => validateInputPhoto(0, 'image/jpeg', 'image/jpeg'))
  assert.throws(() => validateInputPhoto(10, 'application/octet-stream', 'image/jpeg'))
})

const canvasJpeg = new Uint8Array(readFileSync(new URL('./fixtures/canvas-chrome.jpg', import.meta.url)))

test('removes actual Chrome canvas ICC profile while retaining dimensions and encoded pixels', async () => {
  const clean = stripJpegMetadata(canvasJpeg)
  assert.ok(clean.length < canvasJpeg.length)
  assert.equal(new TextDecoder().decode(canvasJpeg).includes('ICC_PROFILE'), true)
  assert.equal(new TextDecoder().decode(clean).includes('ICC_PROFILE'), false)
  const scan = (bytes: Uint8Array) => {
    let offset = 2
    while (bytes[offset + 1] !== 0xda) offset += 2 + bytes[offset + 2] * 256 + bytes[offset + 3]
    return bytes.slice(offset)
  }
  assert.deepEqual(scan(clean), scan(canvasJpeg))
  assert.deepEqual(stripJpegMetadata(clean), clean)
  const doc = await PDFDocument.create()
  const image = await doc.embedJpg(clean)
  assert.equal(image.width, 1)
  assert.equal(image.height, 1)
})

test('strips metadata segments using their lengths, preserving embedded marker bytes', () => {
  const clean = stripJpegMetadata(canvasJpeg)
  for (const marker of [0xe1, 0xe2, 0xed, 0xfe]) {
    const metadata = new Uint8Array([0xff, marker, 0, 8, 0xff, 0xda, 0xff, 0xd9, 0x41, 0x42])
    const injected = new Uint8Array(clean.length + metadata.length)
    injected.set(clean.slice(0, 2)); injected.set(metadata, 2); injected.set(clean.slice(2), 2 + metadata.length)
    assert.deepEqual(stripJpegMetadata(injected), clean)
  }
})

test('rejects truncated metadata lengths and malformed JPEG boundaries', () => {
  assert.throws(() => stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe2, 0xff, 0xff, 0xff, 0xd9])))
  assert.throws(() => stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe2, 0, 1, 0xff, 0xd9])))
  assert.throws(() => stripJpegMetadata(canvasJpeg.slice(0, -1)))
  assert.throws(() => stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])))
})
