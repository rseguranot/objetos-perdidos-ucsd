import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

function probe() {
  const pages: { content: string; mode?: string }[] = []
  const context: Record<string, unknown> = { HtmlService: {
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
    createHtmlOutput(content: string) {
      const page = { content, mode: undefined as string | undefined, setXFrameOptionsMode(mode: string) { this.mode = mode; return this } }
      pages.push(page)
      return page
    },
  } }
  runInNewContext(readFileSync(new URL('../apps-script/probe/Code.gs', import.meta.url), 'utf8'), context)
  return { pages, doGet: context.doGet as (e: { parameter: Record<string, string> }) => void, ping: context.ping as () => { ok: boolean } }
}

test('Probe rejects unknown origin and malformed nonce without exposing an executable bridge', () => {
  const { pages, doGet } = probe()
  doGet({ parameter: { origin: 'https://example.com', nonce: 'a'.repeat(30) } })
  doGet({ parameter: { origin: 'http://127.0.0.1:5181', nonce: '<script>' } })
  assert.ok(pages.every(page => page.mode === undefined && !page.content.includes('<script>')))
})

test('Probe uses an explicit reply origin and verifies origin, source and nonce', () => {
  const { pages, doGet, ping } = probe()
  doGet({ parameter: { origin: 'http://127.0.0.1:5181', nonce: 'a'.repeat(30) } })
  assert.equal(pages[0].mode, 'ALLOWALL')
  assert.ok(pages[0].content.includes('e.origin!==origin||e.source!==window.top'))
  assert.ok(pages[0].content.includes('e.data.nonce!==nonce'))
  assert.ok(pages[0].content.includes('google.script.run.withSuccessHandler'))
  assert.equal(ping().ok, true)
})
