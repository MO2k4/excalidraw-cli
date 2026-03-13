import { glob } from 'glob'
import path from 'path'

export interface FilePair {
  inputPath: string
  outputPath: string
}

export async function resolveFiles(
  patterns: string[],
  options: { output?: string; format: 'png' | 'svg' },
): Promise<FilePair[]> {
  const pairs: FilePair[] = []

  for (const pattern of patterns) {
    const matches = await glob(pattern, { absolute: true })
    const excalidrawFiles = matches.filter((f) => f.endsWith('.excalidraw'))

    for (const inputPath of excalidrawFiles) {
      const basename = path.basename(inputPath, '.excalidraw')
      const outputDir = options.output ? path.resolve(options.output) : path.dirname(inputPath)
      const outputPath = path.join(outputDir, `${basename}.${options.format}`)
      pairs.push({ inputPath, outputPath })
    }
  }

  return pairs
}
