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
