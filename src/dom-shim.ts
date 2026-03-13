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

// @ts-expect-error – patching jsdom's HTMLCanvasElement
window.HTMLCanvasElement.prototype.getContext = () => stubCtx

const globals: Record<string, unknown> = {
  window: window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  SVGElement: window.SVGElement,
  Element: window.Element,
  Node: window.Node,
  NodeList: window.NodeList,
  Event: window.Event,
  CustomEvent: window.CustomEvent,
  MouseEvent: window.MouseEvent,
  KeyboardEvent: window.KeyboardEvent,
  TouchEvent: (window as Record<string, unknown>).TouchEvent,
  PointerEvent: (window as Record<string, unknown>).PointerEvent,
  XMLSerializer: window.XMLSerializer,
  DOMParser: window.DOMParser,
  Image: window.Image,
  Blob: window.Blob,
  URL: window.URL,
  URLSearchParams: window.URLSearchParams,
  FileReader: window.FileReader,
  requestAnimationFrame: (fn: FrameRequestCallback) => setTimeout(fn, 16),
  cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  Path2D: Path2DStub,
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
  MutationObserver: window.MutationObserver,
  location: window.location,
  screen: window.screen,
  performance: window.performance,
}

for (const [key, value] of Object.entries(globals)) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
  if (descriptor && !descriptor.writable && !descriptor.set) {
    // Read-only getter — redefine as a writable value property
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    })
  } else {
    ;(globalThis as Record<string, unknown>)[key] = value
  }
}
