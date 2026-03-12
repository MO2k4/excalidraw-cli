# excalidraw-cli Design

**Date:** 2026-03-12
**Status:** Approved

## Overview

A Node.js/TypeScript CLI that exports `.excalidraw` files to PNG or SVG. Intended for personal local use, supporting glob patterns and batch processing.

## CLI Interface

```
excalidraw-cli <files...> [options]
```

**Arguments:**
- `files` — one or more `.excalidraw` file paths or glob patterns

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <dir>` | Output directory | Same directory as source file |
| `-f, --format <fmt>` | Export format: `png` or `svg` | `png` |
| `-s, --scale <n>` | Scale factor (PNG only) | `1` |
| `--background <val>` | Background: `white` or `transparent` | `white` |
| `--dark-mode` | Use dark theme | off |

**Examples:**
```bash
excalidraw-cli diagram.excalidraw
excalidraw-cli *.excalidraw --format svg
excalidraw-cli diagrams/*.excalidraw --output ./exports --scale 2 --background transparent
```

## Architecture

```
src/
├── index.ts       # CLI entry point — parses args, orchestrates the pipeline
├── resolver.ts    # Expands globs → absolute file paths, computes output paths
└── exporter.ts    # Core logic — reads .excalidraw JSON, exports SVG or PNG
```

### Data Flow

```
CLI args
  → resolver: glob patterns → [{ inputPath, outputPath }]
  → exporter: for each pair, read JSON → exportToSvg() → write SVG or convert to PNG
  → stdout: per-file progress + summary
```

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `commander` | CLI argument parsing |
| `@excalidraw/excalidraw` | `exportToSvg` — official Excalidraw export utility |
| `resvg-js` | SVG → PNG conversion (pure npm, no system dependencies) |
| `glob` | Glob pattern expansion |
| `tsup` | TypeScript bundling for distribution |

## Component Responsibilities

### `resolver.ts`
- Accepts raw glob patterns from CLI args
- Expands to absolute input file paths (filters to `.excalidraw` extension)
- For each input path, computes the output path:
  - If `--output` is set: `<output-dir>/<basename>.<format>`
  - Otherwise: `<source-dir>/<basename>.<format>`
- Creates output directories as needed

### `exporter.ts`
- Reads and parses the `.excalidraw` JSON file
- Calls `exportToSvg()` with options (darkMode, background)
- For SVG format: serializes the SVG element to string and writes to disk
- For PNG format: passes SVG string to `resvg-js` with scale options, writes PNG buffer

### `index.ts`
- Defines the CLI with `commander`
- Calls resolver to get file pairs
- Iterates file pairs, calls exporter for each
- Per-file: prints success or warning (parse errors do not abort the batch)
- Prints summary at end: `X exported, Y failed`

## Error Handling

- Invalid glob (no matches): print warning, exit with code 1
- File parse error (invalid JSON or not valid Excalidraw): print warning, continue to next file
- Write error: print warning, continue
- All files failed: exit code 1; partial success: exit code 0

## Distribution

- Compiled to a single JS bundle with `tsup`
- Published as an npm package with a `bin` entry
- Local use: `npx excalidraw-cli` or global install via `npm install -g excalidraw-cli`
