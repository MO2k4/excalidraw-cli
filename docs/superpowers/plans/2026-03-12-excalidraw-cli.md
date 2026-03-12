# excalidraw-cli Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js/TypeScript CLI that exports `.excalidraw` files to PNG or SVG via glob patterns.

**Architecture:** Three focused modules — `resolver.ts` expands globs and computes output paths, `exporter.ts` reads scene JSON and converts to SVG (via `@excalidraw/excalidraw`) or PNG (via `resvg-js`), and `index.ts` wires them together with `commander`. A `dom-shim.ts` sets up `jsdom` globals so `@excalidraw/excalidraw` can run in Node.js.

**Tech Stack:** TypeScript, Node.js 18+, commander, @excalidraw/excalidraw, resvg-js, jsdom, glob, vitest, tsup

---

## Chunk 1: Project Scaffold

### Task 1: Initialize project files

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "excalidraw-cli",
  "version": "0.1.0",
  "description": "Export Excalidraw files to PNG or SVG from the command line",
  "type": "module",
  "bin": {
    "excalidraw-cli": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@excalidraw/excalidraw": "^0.17.0",
    "commander": "^12.0.0",
    "glob": "^11.0.0",
    "jsdom": "^25.0.0",
    "resvg-js": "^2.6.0"
  },
  "devDependencies": {
    "@types/jsdom": "^21.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
})
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
*.png
*.svg
!tests/fixtures/
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts vitest.config.ts .gitignore
git commit -m "chore: initialize project scaffold"
```

---

## Chunk 2: DOM Shim

### Task 2: DOM shim for Node.js compatibility

`@excalidraw/excalidraw` uses browser DOM APIs. This shim sets up `jsdom` globals so the library works in Node.js.

**Files:**
- Create: `src/dom-shim.ts`
- Create: `tests/dom-shim.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/dom-shim.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/dom-shim.test.ts
```

Expected: FAIL — `src/dom-shim.js` not found.

- [ ] **Step 3: Create `src/dom-shim.ts`**

```typescript
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
})

const { window } = dom

Object.assign(globalThis, {
  window: window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  SVGElement: window.SVGElement,
  XMLSerializer: window.XMLSerializer,
  DOMParser: window.DOMParser,
  requestAnimationFrame: (fn: FrameRequestCallback) => setTimeout(fn, 16),
  cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/dom-shim.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/dom-shim.ts tests/dom-shim.test.ts
git commit -m "feat: add jsdom DOM shim for Node.js compatibility"
```

---

## Chunk 3: File Resolver

### Task 3: Glob expansion and output path resolution

**Files:**
- Create: `src/resolver.ts`
- Create: `tests/resolver.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/resolver.test.ts
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
    expect(pairs.every(p => p.inputPath.endsWith('.excalidraw'))).toBe(true)
  })

  it('computes output path in same directory by default', async () => {
    const pairs = await resolveFiles([path.join(tmpDir, 'a.excalidraw')], { format: 'png' })
    expect(pairs[0].outputPath).toBe(path.join(tmpDir, 'a.png'))
  })

  it('computes output path in specified output directory', async () => {
    const outDir = path.join(tmpDir, 'out')
    const pairs = await resolveFiles([path.join(tmpDir, 'a.excalidraw')], { format: 'svg', output: outDir })
    expect(pairs[0].outputPath).toBe(path.join(outDir, 'a.svg'))
  })

  it('filters out non-.excalidraw files from glob', async () => {
    const pairs = await resolveFiles([path.join(tmpDir, '*')], { format: 'png' })
    expect(pairs.every(p => p.inputPath.endsWith('.excalidraw'))).toBe(true)
  })

  it('returns empty array when no files match', async () => {
    const pairs = await resolveFiles([path.join(tmpDir, '*.nonexistent')], { format: 'png' })
    expect(pairs).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/resolver.test.ts
```

Expected: FAIL — `src/resolver.js` not found.

- [ ] **Step 3: Create `src/resolver.ts`**

```typescript
import { glob } from 'glob'
import path from 'path'

export interface FilePair {
  inputPath: string
  outputPath: string
}

export async function resolveFiles(
  patterns: string[],
  options: { output?: string; format: 'png' | 'svg' }
): Promise<FilePair[]> {
  const pairs: FilePair[] = []

  for (const pattern of patterns) {
    const matches = await glob(pattern, { absolute: true })
    const excalidrawFiles = matches.filter(f => f.endsWith('.excalidraw'))

    for (const inputPath of excalidrawFiles) {
      const basename = path.basename(inputPath, '.excalidraw')
      const outputDir = options.output
        ? path.resolve(options.output)
        : path.dirname(inputPath)
      const outputPath = path.join(outputDir, `${basename}.${options.format}`)
      pairs.push({ inputPath, outputPath })
    }
  }

  return pairs
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/resolver.test.ts
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/resolver.ts tests/resolver.test.ts
git commit -m "feat: add file resolver with glob expansion and output path computation"
```

---

## Chunk 4: Exporter

### Task 4: Create a fixture .excalidraw file

**Files:**
- Create: `tests/fixtures/empty.excalidraw`

- [ ] **Step 1: Create the fixture**

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "test",
  "elements": [],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

Save to `tests/fixtures/empty.excalidraw`.

- [ ] **Step 2: Commit**

```bash
git add tests/fixtures/empty.excalidraw
git commit -m "test: add empty excalidraw fixture"
```

---

### Task 5: Implement SVG and PNG export

**Files:**
- Create: `src/exporter.ts`
- Create: `tests/exporter.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/exporter.test.ts
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
        format: 'png', scale: 1, background: 'white', darkMode: false,
      })
    ).rejects.toThrow()
  })

  it('throws when file type is not excalidraw', async () => {
    const badFile = path.join(tmpDir, 'wrong.excalidraw')
    fs.writeFileSync(badFile, JSON.stringify({ type: 'other', version: 2 }))
    await expect(
      exportFile(badFile, path.join(tmpDir, 'wrong.png'), {
        format: 'png', scale: 1, background: 'white', darkMode: false,
      })
    ).rejects.toThrow('Not a valid Excalidraw file')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/exporter.test.ts
```

Expected: FAIL — `src/exporter.js` not found.

- [ ] **Step 3: Create `src/exporter.ts`**

```typescript
import fs from 'fs'
import path from 'path'
import { exportToSvg } from '@excalidraw/excalidraw'
import { Resvg } from 'resvg-js'

export interface ExportOptions {
  format: 'png' | 'svg'
  scale: number
  background: 'white' | 'transparent'
  darkMode: boolean
}

interface ExcalidrawScene {
  type: string
  version: number
  elements: unknown[]
  appState: Record<string, unknown>
  files?: Record<string, unknown>
}

export async function exportFile(
  inputPath: string,
  outputPath: string,
  options: ExportOptions
): Promise<void> {
  const content = fs.readFileSync(inputPath, 'utf-8')
  const scene = parseScene(content)

  const svgElement = await exportToSvg({
    elements: scene.elements as any,
    appState: {
      ...scene.appState,
      exportWithDarkMode: options.darkMode,
      exportBackground: options.background === 'white',
    } as any,
    files: (scene.files ?? {}) as any,
  })

  const svgString = new XMLSerializer().serializeToString(svgElement)

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })

  if (options.format === 'svg') {
    fs.writeFileSync(outputPath, svgString, 'utf-8')
  } else {
    const png = svgToPng(svgString, options.scale)
    fs.writeFileSync(outputPath, png)
  }
}

function parseScene(content: string): ExcalidrawScene {
  const data = JSON.parse(content) as ExcalidrawScene
  if (data.type !== 'excalidraw') {
    throw new Error('Not a valid Excalidraw file')
  }
  return data
}

function svgToPng(svgString: string, scale: number): Buffer {
  const resvg = new Resvg(svgString, {
    fitTo: scale !== 1 ? { mode: 'zoom', value: scale } : { mode: 'original' },
  })
  return Buffer.from(resvg.render().asPng())
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/exporter.test.ts
```

Expected: PASS — 5 tests passing.

> **Note:** If `exportToSvg` throws about missing DOM APIs, check that `vitest.config.ts` uses `environment: 'jsdom'`. If some APIs are still missing, add them to `src/dom-shim.ts`.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: All tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/exporter.ts tests/exporter.test.ts
git commit -m "feat: add SVG and PNG exporter using @excalidraw/excalidraw and resvg-js"
```

---

## Chunk 5: CLI Entry Point

### Task 6: Wire CLI with commander

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create `src/index.ts`**

```typescript
import './dom-shim.js'
import { Command } from 'commander'
import { resolveFiles } from './resolver.js'
import { exportFile } from './exporter.js'
import type { ExportOptions } from './exporter.js'

const program = new Command()

program
  .name('excalidraw-cli')
  .description('Export Excalidraw files to PNG or SVG')
  .argument('<files...>', 'Excalidraw files or glob patterns (e.g. *.excalidraw)')
  .option('-o, --output <dir>', 'Output directory (default: same as source file)')
  .option('-f, --format <format>', 'Export format: png or svg', 'png')
  .option('-s, --scale <n>', 'Scale factor for PNG output', parseFloat, 1)
  .option('--background <val>', 'Background: white or transparent', 'white')
  .option('--dark-mode', 'Use dark theme', false)
  .action(async (files: string[], opts) => {
    if (opts.format !== 'png' && opts.format !== 'svg') {
      console.error(`Error: --format must be "png" or "svg", got "${opts.format}"`)
      process.exit(1)
    }
    if (opts.background !== 'white' && opts.background !== 'transparent') {
      console.error(`Error: --background must be "white" or "transparent", got "${opts.background}"`)
      process.exit(1)
    }

    const options: ExportOptions = {
      format: opts.format as 'png' | 'svg',
      scale: opts.scale,
      background: opts.background as 'white' | 'transparent',
      darkMode: opts.darkMode,
    }

    const pairs = await resolveFiles(files, { output: opts.output, format: options.format })

    if (pairs.length === 0) {
      console.error('No .excalidraw files found matching the provided patterns.')
      process.exit(1)
    }

    let succeeded = 0
    let failed = 0

    for (const { inputPath, outputPath } of pairs) {
      try {
        await exportFile(inputPath, outputPath, options)
        console.log(`  ${inputPath} → ${outputPath}`)
        succeeded++
      } catch (err) {
        console.error(`  FAILED: ${inputPath}: ${err instanceof Error ? err.message : String(err)}`)
        failed++
      }
    }

    console.log(`\n${succeeded} exported, ${failed} failed.`)
    if (succeeded === 0) process.exit(1)
  })

program.parse()
```

- [ ] **Step 2: Smoke test with `tsx`**

First, create a test file:
```bash
cp tests/fixtures/empty.excalidraw /tmp/test.excalidraw
```

Then run:
```bash
npx tsx src/index.ts /tmp/test.excalidraw --output /tmp/out
```

Expected output:
```
  /tmp/test.excalidraw → /tmp/out/test.png

1 exported, 0 failed.
```

And `/tmp/out/test.png` should exist and be a valid PNG.

- [ ] **Step 3: Test `--format svg`**

```bash
npx tsx src/index.ts /tmp/test.excalidraw --format svg --output /tmp/out
```

Expected: `/tmp/out/test.svg` created and contains `<svg`.

- [ ] **Step 4: Test glob pattern**

```bash
cp tests/fixtures/empty.excalidraw /tmp/second.excalidraw
npx tsx src/index.ts '/tmp/*.excalidraw' --output /tmp/out
```

Expected: Both files exported, `2 exported, 0 failed.`

- [ ] **Step 5: Test error case (no matches)**

```bash
npx tsx src/index.ts '/tmp/nonexistent/*.excalidraw'
```

Expected: error message, exit code 1.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat: add CLI entry point with commander"
```

---

## Chunk 6: Build & Distribution

### Task 7: Build the distributable bundle

**Files:**
- No new files — runs `tsup`

- [ ] **Step 1: Build the bundle**

```bash
npm run build
```

Expected: `dist/index.js` created with `#!/usr/bin/env node` shebang at the top.

- [ ] **Step 2: Make the binary executable**

```bash
chmod +x dist/index.js
```

- [ ] **Step 3: Smoke test the built binary**

```bash
node dist/index.js /tmp/test.excalidraw --output /tmp/out-built
```

Expected: `/tmp/out-built/test.png` created, `1 exported, 0 failed.`

- [ ] **Step 4: Test `--help`**

```bash
node dist/index.js --help
```

Expected: Usage information printed, lists all options.

- [ ] **Step 5: Run full test suite one final time**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add dist/
git commit -m "build: add compiled bundle to dist/"
```

---

### Task 8: Add README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# excalidraw-cli

Export [Excalidraw](https://excalidraw.com) files to PNG or SVG from the command line.

## Installation

```bash
npm install -g excalidraw-cli
# or run without installing:
npx excalidraw-cli
```

## Usage

```bash
excalidraw-cli <files...> [options]
```

**Arguments:**
- `files` — one or more `.excalidraw` file paths or glob patterns

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <dir>` | Output directory | Same directory as source |
| `-f, --format <fmt>` | Export format: `png` or `svg` | `png` |
| `-s, --scale <n>` | Scale factor (PNG only) | `1` |
| `--background <val>` | Background: `white` or `transparent` | `white` |
| `--dark-mode` | Use dark theme | off |

## Examples

```bash
# Export a single file
excalidraw-cli diagram.excalidraw

# Export multiple files to a directory
excalidraw-cli diagrams/*.excalidraw --output ./exports

# Export as SVG with dark mode
excalidraw-cli *.excalidraw --format svg --dark-mode

# Export at 2x scale with transparent background
excalidraw-cli diagram.excalidraw --scale 2 --background transparent
```

## Requirements

- Node.js 18+
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with installation and usage instructions"
```
