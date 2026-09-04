import * as FileSystem from 'expo-file-system/legacy';

export type ParsedSection = {
  id: string;
  title: string;
  kind: 'chapter' | 'section' | 'body';
  text: string;
};

export type ParsedBook = {
  title: string;
  author: string;
  sections: ParsedSection[];
  wordCount: number;
  durationMinutes: number;
  language: 'en' | 'es' | 'unknown';
};

export function detectDocumentLanguage(text: string): ParsedBook['language'] {
  const normalized = text.toLocaleLowerCase();
  const spanishMarkers = normalized.match(/\b(el|la|los|las|un|una|unos|unas|de|del|que|para|por|con|como|este|esta|sus|son|más|también|capítulo)\b/g)?.length ?? 0;
  const englishMarkers = normalized.match(/\b(the|a|an|of|to|and|for|with|as|this|that|their|are|more|also|chapter)\b/g)?.length ?? 0;
  if (spanishMarkers >= 3 && spanishMarkers > englishMarkers * 1.2) return 'es';
  if (englishMarkers >= 3 && englishMarkers > spanishMarkers * 1.2) return 'en';
  return 'unknown';
}

export function isLikelyReadableText(text: string): boolean {
  const words = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? [];
  const symbols = text.match(/[^\p{L}\p{N}\s.,;:!?'"()¿¡—–-]/gu) ?? [];
  return text.length >= 20
    && words.length >= 8
    && symbols.length / Math.max(1, text.length) <= 0.12;
}

function installPdfJsCompatibility() {
  const runtimeGlobal = globalThis as typeof globalThis & {
    DOMException?: typeof DOMException;
  };
  if (runtimeGlobal.DOMException) return;
  class ReactNativeDOMException extends Error {
    name: string;
    code = 0;
    constructor(message = '', name = 'Error') {
      super(message);
      this.name = name;
    }
  }
  runtimeGlobal.DOMException = ReactNativeDOMException as unknown as typeof DOMException;
}

function installPromiseResolversCompatibility() {
  type PromiseResolvers<T> = {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
  };
  type PromiseConstructorWithResolvers = {
    withResolvers?: <T>() => PromiseResolvers<T>;
  };
  const promiseConstructor = Promise as unknown as PromiseConstructorWithResolvers;
  if (typeof promiseConstructor.withResolvers === 'function') return;
  promiseConstructor.withResolvers = <T>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((promiseResolve, promiseReject) => {
      resolve = promiseResolve;
      reject = promiseReject;
    });
    return { promise, resolve, reject };
  };
}

function installStructuredCloneCompatibility() {
  type CloneOptions = Record<string, unknown> | null | undefined;
  type CloneFunction = (value: unknown, options?: CloneOptions) => unknown;
  type RuntimeGlobal = {
    structuredClone?: CloneFunction & { __pdfjsNullSafe?: boolean };
  };
  const runtimeGlobal = globalThis as unknown as RuntimeGlobal;
  const currentClone = runtimeGlobal.structuredClone;
  if (!currentClone || currentClone.__pdfjsNullSafe) return;
  const safeClone = ((value: unknown, options?: CloneOptions) => (
    currentClone(value, options ?? undefined)
  )) as CloneFunction & { __pdfjsNullSafe?: boolean };
  safeClone.__pdfjsNullSafe = true;
  runtimeGlobal.structuredClone = safeClone;
}

async function loadPdfJs() {
  installPdfJsCompatibility();
  installPromiseResolversCompatibility();
  installStructuredCloneCompatibility();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const runtimeGlobal = globalThis as typeof globalThis & {
    pdfjsWorker?: unknown;
  };
  if (!runtimeGlobal.pdfjsWorker) {
    try {
      runtimeGlobal.pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    } catch {}
  }
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';
  }
  return pdfjs;
}

function decodeBase64(base64: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of base64.replace(/[^A-Za-z0-9+/=]/g, '')) {
    if (character === '=') break;
    const value = alphabet.indexOf(character);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(output);
}

function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r/g, '\n')
    .replace(/-\n(?=[a-z])/g, '')
    .replace(/www\.lectulandia\.com\s*-\s*P[aá]gina\s*\d+/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getTextItemString(item: unknown): string {
  return typeof item === 'object' && item !== null && 'str' in item && typeof item.str === 'string' ? item.str : '';
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { getDocument } = await loadPdfJs();
  const document = await getDocument({
    data: bytes,
    useWorkerFetch: false,
    disableFontFace: false,
    useSystemFonts: true,
    verbosity: 0,
  }).promise;
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let lastY: number | undefined;
      for (const item of content.items) {
        const value = getTextItemString(item).trim();
        if (!value) continue;
        const y = 'transform' in item ? (item.transform as number[])[5] : undefined;
        if (lastY !== undefined && y !== undefined && Math.abs(lastY - y) > 4) {
          lines.push('\n');
        } else if (lines.length > 0 && !lines[lines.length - 1].endsWith('\n')) {
          lines.push(' ');
        }
        lines.push(value);
        lastY = y;
      }
      const pageText = cleanExtractedText(lines.join(' '));
      if (pageText) pages.push(pageText);
    }
  } finally {
    await document.cleanup();
  }
  return pages.join('\n\n');
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.pdf$/i, '').replace(/\s+\d{10,}$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled book';
}

function isHeading(line: string): boolean {
  const value = line.trim();
  if (!value || value.length > 90) return false;
  return /^(chapter|cap[ií]tulo|part|parte|book|libro|prologue|pr[oó]logo|epilogue|ep[ií]logo|section|secci[oó]n)\b/i.test(value)
    || (value.length < 58 && value === value.toUpperCase() && /[A-Z]/.test(value));
}

function titleFromText(lines: string[], filename: string): string {
  const filenameWords = titleFromFilename(filename).toLocaleLowerCase().split(/\s+/).filter((word) => word.length > 2);
  const matchingLine = lines.slice(0, 80)
    .map((line) => line.trim())
    .filter((line) => line.length >= 3 && line.length <= 90)
    .map((line) => ({
      line,
      score: filenameWords.reduce((score, word) => score + (line.toLocaleLowerCase().includes(word) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];
  return matchingLine && matchingLine.score >= Math.max(2, filenameWords.length - 1)
    ? matchingLine.line.replace(/[.!?]+$/, '')
    : titleFromFilename(filename);
}

export function structureBook(text: string, filename: string): ParsedBook {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const title = titleFromText(lines, filename);
  const titleIndex = lines.findIndex((line) => line === title);
  const authorCandidate = titleIndex > 0 ? lines[titleIndex - 1] : '';
  const author = authorCandidate && authorCandidate.length < 80 && !isHeading(authorCandidate) ? authorCandidate : 'Imported PDF';
  const contentLines = titleIndex >= 0 ? [...lines.slice(0, titleIndex), ...lines.slice(titleIndex + 1)] : lines;
  const sections: ParsedSection[] = [];
  let currentTitle = 'Opening pages';
  let currentKind: ParsedSection['kind'] = 'body';
  let currentLines: string[] = [];
  const flush = () => {
    const sectionText = currentLines.join(' ').replace(/\s+/g, ' ').trim();
    if (sectionText) {
      sections.push({
        id: `${sections.length}-${currentTitle.toLowerCase().replace(/\W+/g, '-')}`,
        title: currentTitle,
        kind: currentKind,
        text: sectionText,
      });
    }
    currentLines = [];
  };
  for (const line of contentLines) {
    if (isHeading(line)) {
      flush();
      currentTitle = line;
      currentKind = /^(chapter|cap[ií]tulo|part|parte|book|libro|prologue|pr[oó]logo|epilogue|ep[ií]logo)\b/i.test(line) ? 'chapter' : 'section';
    } else {
      currentLines.push(line);
    }
  }
  flush();
  const safeSections = sections.length > 0 ? sections : [{ id: '0-opening-pages', title: 'Opening pages', kind: 'body' as const, text: text.replace(/\s+/g, ' ').trim() }];
  const wordCount = safeSections.reduce((total, section) => total + section.text.split(/\s+/).filter(Boolean).length, 0);
  return {
    title,
    author,
    sections: safeSections,
    wordCount,
    durationMinutes: Math.max(1, Math.round(wordCount / 150)),
    language: detectDocumentLanguage(text),
  };
}

export async function parsePdf(uri: string, filename: string): Promise<ParsedBook> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const text = await extractPdfText(decodeBase64(base64));
  if (!text || text.length < 20) {
    throw new Error('This PDF does not contain selectable text. Try a text-based PDF or run OCR before importing it.');
  }
  if (!isLikelyReadableText(text)) {
    throw new Error('This PDF text layer could not be decoded reliably. Try exporting it again as a text-based PDF or run OCR before importing it.');
  }
  return structureBook(text, filename);
}
