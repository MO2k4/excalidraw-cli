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
