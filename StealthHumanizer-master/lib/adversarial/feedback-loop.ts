// 🔁 NOOB EXPLAINER: What is a "Feedback Loop"?
// Imagine you're playing darts blindfolded. You throw, someone says "too far left",
// you adjust, throw again. That's a feedback loop!
//
// Currently, the humanizer just rewrites text and HOPES it passes detection.
// With the feedback loop, we:
// 1. Run the detector on the rewritten text
// 2. See EXACTLY which sentences failed and WHY
// 3. Tell the LLM: "Sentence #3 scored 23% human because it has
//    low perplexity and uses the phrase 'furthermore'"
// 4. The LLM can now target those EXACT problems
//
// This is like giving the dart player vision — way more effective than
// throwing blind!

import { detectAI } from '../detector';
import { SentenceDetectionResult } from '../types';
import { Axis } from './axes';

export interface FeedbackResult {
  flaggedSentences: FlaggedSentence[];
  overallScore: number;
  passNumber: number;
  shouldEscalate: boolean;  // True if we should regenerate entire paragraph
}

export interface FlaggedSentence {
  text: string;
  score: number;
  classification: 'ai' | 'maybe' | 'human';
  issues: string[];  // Specific reasons it was flagged
  suggestedFix: string;  // Human-readable fix suggestion
}

// 🎯 NOOB EXPLAINER: Why tell the LLM the exact score?
// "Rewrite this to sound more human" = vague instruction = vague results
// "This sentence scored 23% human. It was flagged for: low perplexity,
//  uniform structure, AI phrase 'furthermore'. Rewrite to disrupt
//  contextual perplexity." = specific instruction = targeted fix
export function buildFeedbackPrompt(flagged: FlaggedSentence[], axis: Axis): string {
  const sentenceFeedback = flagged.map((s, i) =>
    `Sentence ${i + 1}: "${s.text}"
  Score: ${s.score}% human (needs to be 55%+)
  Problems: ${s.issues.join('; ')}
  Fix suggestion: ${s.suggestedFix}`
  ).join('\n\n');

  return `The following sentences were flagged by an AI detector after your last rewrite.
Each has a SPECIFIC score and SPECIFIC problems. Fix ONLY those problems.

${sentenceFeedback}

ATTACK STRATEGY: Focus on ${axis} improvements specifically.
For each sentence, address its SPECIFIC issues. Don't just rephrase — target the exact problems the detector found.`;
}

// 🚨 NOOB EXPLAINER: What is "Paragraph Escalation"?
// Sometimes, fixing sentence-by-sentence doesn't work because the ENTIRE
// paragraph has an AI "fingerprint" — not just individual sentences.
// When ≥50% of sentences in a paragraph are still flagged after
// sentence-level fixes, we "escalate" — throw away the paragraph
// and regenerate it from scratch using just the key points.
// It's like when you keep patching a leaky bucket and it keeps leaking —
// eventually you just get a new bucket.
export function shouldEscalateParagraph(
  sentences: SentenceDetectionResult[],
  threshold: number = 0.5
): boolean {
  const flagged = sentences.filter(s => s.classification === 'ai' || s.classification === 'maybe');
  return flagged.length / sentences.length >= threshold;
}

export function analyzeFeedback(text: string, passNumber: number): FeedbackResult {
  const detection = detectAI(text);
  const flagged = detection.sentences
    .filter(s => s.classification === 'ai' || s.classification === 'maybe')
    .map(s => ({
      text: s.text,
      score: s.score,
      classification: s.classification,
      issues: s.issues,
      suggestedFix: generateFixSuggestion(s),
    }));

  return {
    flaggedSentences: flagged,
    overallScore: detection.score,
    passNumber,
    shouldEscalate: shouldEscalateParagraph(detection.sentences),
  };
}

function generateFixSuggestion(sentence: SentenceDetectionResult): string {
  const suggestions: string[] = [];

  if (sentence.issues.some(i => i.includes('AI phrase'))) {
    suggestions.push('Replace the flagged AI phrase with a casual alternative');
  }
  if (sentence.issues.some(i => i.includes('sentence opener'))) {
    suggestions.push('Start with a different word — try "And," "But," "Look," or a question');
  }
  if (sentence.issues.some(i => i.includes('Long sentence'))) {
    suggestions.push('Split this into 2-3 shorter sentences');
  }
  if (sentence.issues.some(i => i.includes('Passive voice'))) {
    suggestions.push('Convert to active voice ("X did Y" not "Y was done by X")');
  }
  if (sentence.issues.some(i => i.includes('Hedging'))) {
    suggestions.push('Remove the hedging — just state the point directly');
  }
  if (sentence.issues.some(i => i.includes('Uniform structure'))) {
    suggestions.push('Break the pattern — add an aside, question, or short fragment');
  }

  if (suggestions.length === 0) {
    suggestions.push('Restructure completely — change sentence order, add personality');
  }

  return suggestions.join('; ');
}

// 📊 NOOB EXPLAINER: Dynamic sentence length targets
// Instead of telling the LLM "use varied sentence lengths" (too vague),
// we give it EXACT targets: "Sentence 1 should be 35 words,
// Sentence 2 should be 5 words, Sentence 3 should be 3 words..."
// This is much more effective because the LLM has a concrete goal.
export function generateLengthTargets(sentenceCount: number, personaStdDev: number): number[] {
  // Pattern: LONG → short → very_short → medium → repeat
  const pattern = [
    (mean: number) => mean + personaStdDev * 1.5,  // LONG
    (mean: number) => mean - personaStdDev * 0.5,   // short
    (mean: number) => mean - personaStdDev * 1.0,   // very_short
    (mean: number) => mean,                           // medium
    (mean: number) => mean + personaStdDev * 0.5,   // medium-long
  ];

  const meanLength = 18;
  const targets: number[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    const target = pattern[i % pattern.length](meanLength);
    targets.push(Math.max(2, Math.round(target)));
  }

  return targets;
}
