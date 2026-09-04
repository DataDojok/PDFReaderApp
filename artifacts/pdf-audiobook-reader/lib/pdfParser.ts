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

export function structureBook(text: string, filename: string): ParsedBook {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const titleFromFilename = filename.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled book';
  
  return {
    title: titleFromFilename,
    author: 'Imported PDF',
    sections: [{ id: '0-opening-pages', title: 'Opening pages', kind: 'body' as const, text }],
    wordCount: text.split(/\s+/).filter(Boolean).length,
    durationMinutes: Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 150)),
    language: detectDocumentLanguage(text),
  };
}

// Web-only function - will throw on native platforms
export async function parsePdf(uri: string, filename: string): Promise<ParsedBook> {
  // This import should ONLY execute on web
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is not available on native platforms');
  }
  
  try {
    // @ts-ignore - Only imported on web
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // ... rest of implementation would go here
    throw new Error('PDF parsing not fully implemented');
  } catch (error) {
    throw new Error('PDF parsing is not available on native platforms');
  }
}
