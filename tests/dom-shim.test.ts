import { describe, it, expect } from 'vitest'

describe('dom-shim', () => {
  it('sets up window global', async () => {
    await import('../src/dom-shim.js')
    expect(typeof globalThis.window).toBe('object')
  })

  it('sets up document global', async () => {
    await import('../src/dom-shim.js')
    expect(typeof globalThis.document).toBe('object')
  })

  it('sets up XMLSerializer global', async () => {
    await import('../src/dom-shim.js')
    expect(typeof globalThis.XMLSerializer).toBe('function')
  })
})
