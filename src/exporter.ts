import fs from 'fs'
import path from 'path'
import './dom-shim.js'
import { Resvg } from '@resvg/resvg-js'

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
  options: ExportOptions,
): Promise<void> {
  const content = fs.readFileSync(inputPath, 'utf-8')
  const scene = parseScene(content)

  // Dynamically import excalidraw after dom-shim is set up
  const excalidrawPkg = await import('@excalidraw/excalidraw')
  type ExportToSvgFn = (params: {
    elements: unknown[]
    appState: Record<string, unknown>
    files: Record<string, unknown>
  }) => Promise<SVGElement>
  const exportToSvg = (excalidrawPkg.default || excalidrawPkg).exportToSvg as ExportToSvgFn

  const svgElement = await exportToSvg({
    elements: scene.elements,
    appState: {
      ...scene.appState,
      exportWithDarkMode: options.darkMode,
      exportBackground: options.background === 'white',
    },
    files: scene.files ?? {},
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
