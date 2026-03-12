import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
})

const { window } = dom

// Minimal Path2D stub required by canvas-roundrect-polyfill bundled in @excalidraw/excalidraw.
// The polyfill only accesses Path2D.prototype.roundRect, so a no-op class is sufficient.
class Path2DStub {
  roundRect() {}
}

// jsdom does not implement HTMLCanvasElement.getContext; stub it so that
// @excalidraw/excalidraw can probe for canvas filter support at module load time.
const stubCtx = new Proxy({} as CanvasRenderingContext2D, {
  get: (_target, prop) => {
    if (prop === 'filter') return 'none'
    return () => {}
  },
  has: () => true,
})

// @ts-ignore – patching jsdom's HTMLCanvasElement
window.HTMLCanvasElement.prototype.getContext = () => stubCtx

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
  Path2D: Path2DStub,
})
