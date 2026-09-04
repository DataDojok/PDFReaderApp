import * as FileSystem from 'expo-file-system/legacy';

export type ParsedBook = {
  title: string;
  author: string;
  sections: Array<{ id: string; title: string; kind: 'chapter' | 'section' | 'body'; text: string }>;
  wordCount: number;
  durationMinutes: number;
  language: 'en' | 'es' | 'unknown';
};

export async function parsePdf(): Promise<ParsedBook> {
  throw new Error('PDF parsing is not available on native platforms');
}
