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
    process.exit(succeeded === 0 ? 1 : 0)
  })

program.parse()
