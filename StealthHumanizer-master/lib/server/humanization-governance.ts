import fs from 'node:fs/promises';
import path from 'node:path';
import { tokenizeWords } from '@/lib/server/text-utils';

function tokenize(text: string): string[] {
  return tokenizeWords(text);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  const intersection = Array.from(a).reduce((count, item) => (b.has(item) ? count + 1 : count), 0);
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function ngramJaccard(a: string[], b: string[], n: number): number {
  const makeNgrams = (tokens: string[]): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i <= tokens.length - n; i++) {
      set.add(tokens.slice(i, i + n).join(' ').toLowerCase());
    }
    return set;
  };
  return jaccard(makeNgrams(a), makeNgrams(b));
}

function extractKeywords(text: string): Set<string> {
  const tokens = tokenize(text);
  return new Set(
    tokens.filter(t =>
      /^[A-Z]/.test(t) && t.length > 1 && // Proper nouns
      !['The', 'This', 'That', 'These', 'Those', 'It', 'An', 'A', 'In', 'On', 'By', 'To', 'For', 'With', 'As', 'Is', 'Are', 'Was', 'Were', 'Be', 'At', 'Or', 'Of'].includes(t)
    )
  );
}

export function evaluateMeaningRetention(original: string, rewritten: string) {
  const origTokens = tokenize(original);
  const rewTokens = tokenize(rewritten);

  // Unigram Jaccard
  const unigramOverlap = jaccard(new Set(origTokens), new Set(rewTokens));

  // Bigram and trigram overlap
  const bigramOverlap = ngramJaccard(origTokens, rewTokens, 2);
  const trigramOverlap = ngramJaccard(origTokens, rewTokens, 3);

  // Composite lexical score: weighted average of n-gram overlaps
  const lexicalOverlap = unigramOverlap * 0.4 + bigramOverlap * 0.3 + trigramOverlap * 0.3;

  const originalWords = origTokens.length;
  const rewrittenWords = rewTokens.length;
  const lengthRatio = originalWords > 0 ? rewrittenWords / originalWords : 1;

  // Sentence count ratio
  const origSentences = original.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const rewSentences = rewritten.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const sentenceRatio = origSentences > 0 ? rewSentences / origSentences : 1;

  // Keyword preservation: proper nouns and numbers from original must appear in rewrite
  const origKeywords = extractKeywords(original);
  const rewLower = rewritten.toLowerCase();
  const keywordsPreserved = origKeywords.size > 0
    ? Array.from(origKeywords).filter(kw => rewLower.includes(kw.toLowerCase())).length / origKeywords.size
    : 1;

  return { lexicalOverlap, lengthRatio, sentenceRatio, keywordsPreserved };
}

export function applyRewriteRegressionGuard(input: {
  originalText: string;
  candidateText: string;
  fallbackText: string;
  minLexicalOverlap?: number;
  minLengthRatio?: number;
  maxLengthRatio?: number;
}) {
  const {
    originalText,
    candidateText,
    fallbackText,
    minLexicalOverlap = 0.2,
    minLengthRatio = 0.45,
    maxLengthRatio = 1.9,
  } = input;
  const retention = evaluateMeaningRetention(originalText, candidateText);

  const failed =
    retention.lexicalOverlap < minLexicalOverlap ||
    retention.lengthRatio < minLengthRatio ||
    retention.lengthRatio > maxLengthRatio ||
    retention.sentenceRatio < 0.4 ||
    retention.sentenceRatio > 2.5;

  const reasons: string[] = [];
  if (retention.lexicalOverlap < minLexicalOverlap) reasons.push('low_lexical_overlap');
  if (retention.lengthRatio < minLengthRatio) reasons.push('too_short');
  if (retention.lengthRatio > maxLengthRatio) reasons.push('too_long');
  if (retention.sentenceRatio < 0.4) reasons.push('too_few_sentences');
  if (retention.sentenceRatio > 2.5) reasons.push('too_many_sentences');
  if (retention.keywordsPreserved < 0.3 && extractKeywords(originalText).size > 2) reasons.push('keywords_lost');

  return {
    usedFallback: failed,
    reason: failed ? reasons.join('+') : 'guard_passed',
    retention,
    text: failed ? fallbackText : candidateText,
  };
}

export function buildConfidenceReport(humanScore: number) {
  const normalized = Math.max(0, Math.min(100, Number(humanScore) || 0));
  const confidence = Math.round(Math.min(100, Math.abs(normalized - 50) * 2));
  return {
    humanLikenessScore: normalized,
    confidence,
    calibrationBand:
      confidence >= 75 ? 'high' : confidence >= 45 ? 'medium' : 'low',
  };
}

const BLOCKED_PATTERNS = [
  /bypass (ai|aigc|plagiarism) detector/i,
  /undetectable cheating/i,
  /fake (citation|references|sources)/i,
  /impersonat(e|ing) (a|an) (student|researcher|author)/i,
];

export function enforceSafetyPolicy(text: string) {
  const matches = BLOCKED_PATTERNS.filter((pattern) => pattern.test(text || ''));
  return {
    blocked: matches.length > 0,
    reasons: matches.map((pattern) => pattern.source),
    safeUseGuidance:
      'Use this tool for clarity and style improvement, not deception, impersonation, or fraudulent academic use.',
  };
}

export async function appendAuditLog(event: Record<string, unknown>) {
  try {
    const root = path.resolve(process.cwd(), 'data/governance/audit');
    await fs.mkdir(root, { recursive: true });
    const filePath = path.join(root, 'humanization-events.jsonl');
    await fs.appendFile(filePath, `${JSON.stringify(event)}\n`, 'utf8');
  } catch {
    // Do not fail request on audit log write errors.
  }
}
