import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { exportFile } from '../src/exporter.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(__dirname, 'fixtures', 'empty.excalidraw')

let tmpDir: string

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'excalidraw-exporter-test-'))
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true })
})

describe('exportFile - SVG', () => {
  it('creates an SVG file from a valid .excalidraw file', async () => {
    const outPath = path.join(tmpDir, 'output.svg')
    await exportFile(fixturePath, outPath, {
      format: 'svg',
      scale: 1,
      background: 'white',
      darkMode: false,
    })
    expect(fs.existsSync(outPath)).toBe(true)
    const content = fs.readFileSync(outPath, 'utf-8')
    expect(content).toContain('<svg')
  })

  it('creates output directory if it does not exist', async () => {
    const outPath = path.join(tmpDir, 'nested', 'dir', 'output.svg')
    await exportFile(fixturePath, outPath, {
      format: 'svg',
      scale: 1,
      background: 'white',
      darkMode: false,
    })
    expect(fs.existsSync(outPath)).toBe(true)
  })
})

describe('exportFile - PNG', () => {
  it('creates a PNG file from a valid .excalidraw file', async () => {
    const outPath = path.join(tmpDir, 'output.png')
    await exportFile(fixturePath, outPath, {
      format: 'png',
      scale: 1,
      background: 'white',
      darkMode: false,
    })
    expect(fs.existsSync(outPath)).toBe(true)
    // PNG magic bytes: 89 50 4E 47
    const buf = fs.readFileSync(outPath)
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50) // P
    expect(buf[2]).toBe(0x4e) // N
    expect(buf[3]).toBe(0x47) // G
  })
})

describe('exportFile - error handling', () => {
  it('throws on invalid JSON', async () => {
    const badFile = path.join(tmpDir, 'bad.excalidraw')
    fs.writeFileSync(badFile, 'not json')
    await expect(
      exportFile(badFile, path.join(tmpDir, 'bad.png'), {
        format: 'png',
        scale: 1,
        background: 'white',
        darkMode: false,
      }),
    ).rejects.toThrow()
  })

  it('throws when file type is not excalidraw', async () => {
    const badFile = path.join(tmpDir, 'wrong.excalidraw')
    fs.writeFileSync(badFile, JSON.stringify({ type: 'other', version: 2 }))
    await expect(
      exportFile(badFile, path.join(tmpDir, 'wrong.png'), {
        format: 'png',
        scale: 1,
        background: 'white',
        darkMode: false,
      }),
    ).rejects.toThrow('Not a valid Excalidraw file')
  })
})
