#!/usr/bin/env node

// src/dom-shim.ts
import { JSDOM } from "jsdom";
var dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost"
});
var { window } = dom;
var Path2DStub = class {
  roundRect() {
  }
};
var stubCtx = new Proxy({}, {
  get: (_target, prop) => {
    if (prop === "filter") return "none";
    return () => {
    };
  },
  has: () => true
});
window.HTMLCanvasElement.prototype.getContext = () => stubCtx;
var globals = {
  window,
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
  TouchEvent: window.TouchEvent,
  PointerEvent: window.PointerEvent,
  XMLSerializer: window.XMLSerializer,
  DOMParser: window.DOMParser,
  Image: window.Image,
  Blob: window.Blob,
  URL: window.URL,
  URLSearchParams: window.URLSearchParams,
  FileReader: window.FileReader,
  requestAnimationFrame: (fn) => setTimeout(fn, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  Path2D: Path2DStub,
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addListener: () => {
  }, removeListener: () => {
  } }),
  ResizeObserver: class {
    observe() {
    }
    unobserve() {
    }
    disconnect() {
    }
  },
  MutationObserver: window.MutationObserver,
  location: window.location,
  screen: window.screen,
  performance: window.performance
};
for (const [key, value] of Object.entries(globals)) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  if (descriptor && !descriptor.writable && !descriptor.set) {
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: true
    });
  } else {
    ;
    globalThis[key] = value;
  }
}

// src/index.ts
import { Command } from "commander";

// src/resolver.ts
import { glob } from "glob";
import path from "path";
async function resolveFiles(patterns, options) {
  const pairs = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { absolute: true });
    const excalidrawFiles = matches.filter((f) => f.endsWith(".excalidraw"));
    for (const inputPath of excalidrawFiles) {
      const basename = path.basename(inputPath, ".excalidraw");
      const outputDir = options.output ? path.resolve(options.output) : path.dirname(inputPath);
      const outputPath = path.join(outputDir, `${basename}.${options.format}`);
      pairs.push({ inputPath, outputPath });
    }
  }
  return pairs;
}

// src/exporter.ts
import fs from "fs";
import path2 from "path";
import { Resvg } from "@resvg/resvg-js";
async function exportFile(inputPath, outputPath, options) {
  const content = fs.readFileSync(inputPath, "utf-8");
  const scene = parseScene(content);
  const excalidrawPkg = await import("@excalidraw/excalidraw");
  const exportToSvg = (excalidrawPkg.default || excalidrawPkg).exportToSvg;
  const svgElement = await exportToSvg({
    elements: scene.elements,
    appState: {
      ...scene.appState,
      exportWithDarkMode: options.darkMode,
      exportBackground: options.background === "white"
    },
    files: scene.files ?? {}
  });
  const svgString = new XMLSerializer().serializeToString(svgElement);
  fs.mkdirSync(path2.dirname(outputPath), { recursive: true });
  if (options.format === "svg") {
    fs.writeFileSync(outputPath, svgString, "utf-8");
  } else {
    const png = svgToPng(svgString, options.scale);
    fs.writeFileSync(outputPath, png);
  }
}
function parseScene(content) {
  const data = JSON.parse(content);
  if (data.type !== "excalidraw") {
    throw new Error("Not a valid Excalidraw file");
  }
  return data;
}
function svgToPng(svgString, scale) {
  const resvg = new Resvg(svgString, {
    fitTo: scale !== 1 ? { mode: "zoom", value: scale } : { mode: "original" }
  });
  return Buffer.from(resvg.render().asPng());
}

// src/index.ts
var program = new Command();
program.name("excalidraw-cli").description("Export Excalidraw files to PNG or SVG").argument("<files...>", "Excalidraw files or glob patterns (e.g. *.excalidraw)").option("-o, --output <dir>", "Output directory (default: same as source file)").option("-f, --format <format>", "Export format: png or svg", "png").option("-s, --scale <n>", "Scale factor for PNG output", parseFloat, 1).option("--background <val>", "Background: white or transparent", "white").option("--dark-mode", "Use dark theme", false).action(async (files, opts) => {
  if (opts.format !== "png" && opts.format !== "svg") {
    console.error(`Error: --format must be "png" or "svg", got "${opts.format}"`);
    process.exit(1);
  }
  if (opts.background !== "white" && opts.background !== "transparent") {
    console.error(`Error: --background must be "white" or "transparent", got "${opts.background}"`);
    process.exit(1);
  }
  const options = {
    format: opts.format,
    scale: opts.scale,
    background: opts.background,
    darkMode: opts.darkMode
  };
  const pairs = await resolveFiles(files, { output: opts.output, format: options.format });
  if (pairs.length === 0) {
    console.error("No .excalidraw files found matching the provided patterns.");
    process.exit(1);
  }
  let succeeded = 0;
  let failed = 0;
  for (const { inputPath, outputPath } of pairs) {
    try {
      await exportFile(inputPath, outputPath, options);
      console.log(`  ${inputPath} \u2192 ${outputPath}`);
      succeeded++;
    } catch (err) {
      console.error(`  FAILED: ${inputPath}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }
  console.log(`
${succeeded} exported, ${failed} failed.`);
  process.exit(succeeded === 0 ? 1 : 0);
});
program.parse();
