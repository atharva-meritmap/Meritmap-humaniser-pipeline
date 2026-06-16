/**
 * Shared text utility functions for StealthHumanizer.
 * Consolidates sentence splitting, word counting, and sentence alignment
 * that were previously duplicated across 5+ files with inconsistent behavior.
 */

/**
 * Common abbreviations that should not trigger sentence breaks.
 */
const ABBREVIATIONS = new Set([
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'St', 'etc', 'vs', 'i.e', 'e.g',
  'Inc', 'Ltd', 'Co', 'Corp', 'Rev', 'Gen', 'Sen', 'Rep', 'Pres', 'Hon', 'al',
]);

/**
 * Split text into sentences with abbreviation and identifier handling.
 * This is the unified version used across the entire application.
 *
 * Features:
 * - Handles abbreviations (Mr., Dr., etc.) without breaking
 * - Protects identifiers (file.ext, domain.tld, version 3.x, IP addresses)
 * - Handles trailing quotes after sentence endings
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  const sentences: string[] = [];
  let current = '';
  let i = 0;

  while (i < text.length) {
    current += text[i];
    if (['.', '!', '?'].includes(text[i])) {
      const beforeMatch = text.slice(Math.max(0, i - 5), i + 1);
      // Period inside an identifier (file.ext, domain.tld, version 3.x, decimal 0.5,
      // IP 192.168.1.1) is not a sentence end. Detect by alnum-period-alnum with no
      // whitespace on either side.
      const isInsideIdentifier = text[i] === '.'
        && /[a-zA-Z0-9]/.test(text[i - 1] || '')
        && /[a-zA-Z0-9]/.test(text[i + 1] || '');
      if (!isInsideIdentifier && !Array.from(ABBREVIATIONS).some(abbr => beforeMatch.endsWith(abbr + '.'))) {
        if (text[i + 1] === '"' || text[i + 1] === "'") { current += text[i + 1]; i++; }
        const trimmed = current.trim();
        if (trimmed.length > 0) sentences.push(trimmed);
        current = '';
      }
    }
    i++;
  }
  const trimmed = current.trim();
  if (trimmed.length > 0) sentences.push(trimmed);
  return sentences;
}

/**
 * Count words in text.
 * Handles both space-delimited and CJK text.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Build sentence-level results by aligning original and humanized sentences.
 */
export interface SentenceAlignment {
  original: string;
  humanized: string;
  index: number;
}

export function buildSentenceResults(
  originalText: string,
  humanizedText: string
): SentenceAlignment[] {
  const origSentences = splitIntoSentences(originalText);
  const humanizedSentences = splitIntoSentences(humanizedText);
  const maxLen = Math.max(origSentences.length, humanizedSentences.length);

  const results: SentenceAlignment[] = [];
  for (let i = 0; i < maxLen; i++) {
    results.push({
      original: origSentences[i] || '',
      humanized: humanizedSentences[i] || '',
      index: i,
    });
  }
  return results;
}
