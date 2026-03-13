import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { resolveFiles } from '../src/resolver.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

let tmpDir: string

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'excalidraw-cli-test-'))
  fs.writeFileSync(path.join(tmpDir, 'a.excalidraw'), '{}')
  fs.writeFileSync(path.join(tmpDir, 'b.excalidraw'), '{}')
  fs.writeFileSync(path.join(tmpDir, 'c.txt'), 'not an excalidraw file')
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true })
})

describe('resolveFiles', () => {
  it('expands a glob pattern and returns .excalidraw files only', async () => {
    const pairs = await resolveFiles([path.join(tmpDir, '*.excalidraw')], { format: 'png' })
    expect(pairs).toHaveLength(2)
    expect(pairs.every((p) => p.inputPath.endsWith('.excalidraw'))).toBe(true)
  })

  it('computes output path in same directory by default', async () => {
    const pairs = await resolveFiles([path.join(tmpDir, 'a.excalidraw')], { format: 'png' })
    expect(pairs[0].outputPath).toBe(path.join(tmpDir, 'a.png'))
  })

  it('computes output path in specified output directory', async () => {
    const outDir = path.join(tmpDir, 'out')
    const pairs = await resolveFiles([path.join(tmpDir, 'a.excalidraw')], {
      format: 'svg',
      output: outDir,
    })
    expect(pairs[0].outputPath).toBe(path.join(outDir, 'a.svg'))
  })

  it('filters out non-.excalidraw files from glob', async () => {
    const pairs = await resolveFiles([path.join(tmpDir, '*')], { format: 'png' })
    expect(pairs.every((p) => p.inputPath.endsWith('.excalidraw'))).toBe(true)
  })

  it('returns empty array when no files match', async () => {
    const pairs = await resolveFiles([path.join(tmpDir, '*.nonexistent')], { format: 'png' })
    expect(pairs).toHaveLength(0)
  })
})
