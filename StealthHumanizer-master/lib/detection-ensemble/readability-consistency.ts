// 📖 NOOB EXPLAINER: What is "Readability Consistency"?
// Humans don't write at the same reading level throughout a document.
// A human might write a simple sentence, then a complex one, then
// a medium one. AI tends to write at the SAME level everywhere —
// every paragraph has similar readability.
//
// This detector checks: "Is the readability too consistent?"
// If it is, that's a strong AI signal.

import { calculateReadability } from '../readability';

export interface ReadabilityConsistencyResult {
  score: number;              // 0-100 (100 = natural variation, 0 = suspiciously consistent)
  paragraphScores: number[];  // Readability score per paragraph
  variance: number;           // How much readability varies between paragraphs
  verdict: 'natural' | 'suspicious' | 'very_suspicious';
}

export function checkReadabilityConsistency(text: string): ReadabilityConsistencyResult {
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.split(/\s+/).length >= 10); // Only paragraphs with 10+ words

  if (paragraphs.length < 2) {
    return { score: 75, paragraphScores: [], variance: 0, verdict: 'natural' };
  }

  // Calculate readability for each paragraph
  const scores = paragraphs.map(p => {
    try {
      return calculateReadability(p).fleschKincaidGrade;
    } catch {
      return 50; // Default if calculation fails
    }
  });

  // Calculate variance
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stddev = Math.sqrt(variance);

  // 🎯 NOOB EXPLAINER: Interpreting the variance
  // Human writing has stddev of readability scores around 5-15.
  // AI writing has stddev typically under 2-3 (too consistent).
  // So if stddev < 2, that's suspicious. If stddev > 5, that's natural.
  let score: number;
  let verdict: ReadabilityConsistencyResult['verdict'];

  if (stddev < 1.5) {
    score = 20;
    verdict = 'very_suspicious';
  } else if (stddev < 3) {
    score = 45;
    verdict = 'suspicious';
  } else if (stddev < 5) {
    score = 65;
    verdict = 'natural';
  } else {
    score = 90;
    verdict = 'natural';
  }

  return {
    score: Math.round(score),
    paragraphScores: scores.map(s => Math.round(s)),
    variance: Math.round(variance * 100) / 100,
    verdict,
  };
}
