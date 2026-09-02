---
name: Expo PDF.js workers
description: PDF.js 6 worker initialization behavior in Expo native and web runtimes
---

PDF.js 6 does not reliably infer a worker URL inside an Expo bundle. Register the bundled `pdf.worker.mjs` module on `globalThis.pdfjsWorker` before calling `getDocument`, and provide a fallback `GlobalWorkerOptions.workerSrc`.

**Why:** A browser-style PDF.js setup can throw `No "GlobalWorkerOptions.workerSrc" specified` during PDF import even though the app itself loads normally.

**How to apply:** When using PDF.js from an Expo parser, keep worker initialization in the lazy PDF.js loader and validate imports with a real text-based PDF.

Expo's production Metro bundle may reject PDF.js 6 static class blocks unless `@babel/plugin-transform-class-static-block` is explicitly enabled in the app Babel config.

**Why:** Development preview can load while a minified release bundle fails with an HTTP 500 transform error.

**How to apply:** Keep the transform as a direct mobile-app development dependency and include it in Babel before running the production bundle step.