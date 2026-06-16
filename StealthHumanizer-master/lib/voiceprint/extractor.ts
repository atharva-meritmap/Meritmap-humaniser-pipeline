// 🔬 NOOB EXPLAINER: What does the extractor do?
// It reads your writing samples and MEASURES everything about your style.
// Like a tailor taking measurements for a custom suit — except instead
// of measuring your shoulders and inseam, we're measuring your sentences
// and vocabulary.

import type { VoicePrintProfile } from './types';
import { MIN_SAMPLES, MAX_SAMPLES } from './types';

// 🏠 NOOB EXPLAINER: Shared sentence splitter
// We need to split text into sentences to measure things like
// sentence length and variety. This is trickier than it sounds —
// "Dr. Smith went home." has a period after "Dr" but it's NOT
// the end of a sentence!
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = '';
  let i = 0;
  const abbreviations = ['Mr.', 'Mrs.', 'Dr.', 'Prof.', 'Inc.', 'Ltd.', 'etc.', 'e.g.', 'i.e.', 'vs.', 'al.'];
  while (i < text.length) {
    current += text[i];
    if (['.', '!', '?'].includes(text[i])) {
      const beforeMatch = text.slice(Math.max(0, i - 5), i + 1);
      const isInsideIdentifier = text[i] === '.'
        && /[a-zA-Z0-9]/.test(text[i - 1] || '')
        && /[a-zA-Z0-9]/.test(text[i + 1] || '');
      if (!isInsideIdentifier && !abbreviations.some(abbr => beforeMatch.endsWith(abbr))) {
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

// 📊 NOOB EXPLAINER: Statistics helpers
// "mean" = average. "stdDev" = how spread out the numbers are.
// If your sentence lengths are [5, 5, 5, 5], stdDev = 0 (no variation).
// If your sentence lengths are [3, 20, 8, 35], stdDev is high (lots of variation).
function mean(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const avg = mean(nums);
  const variance = nums.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / nums.length;
  return Math.sqrt(variance);
}

// 🔑 NOOB EXPLAINER: Simple hash function
// We hash each writing sample so we can tell if a sample has changed
// since the profile was created. If the hash doesn't match, the
// profile is stale and should be re-extracted.
function sha256(text: string): string {
  // Simple hash for sample identification (not cryptographic)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// 🎤 Main extraction function
// Feed it 3-10 writing samples, get back a VoicePrintProfile
export function extractVoicePrint(
  name: string,
  samples: string[],
  description: string = ''
): VoicePrintProfile {
  // 🛡️ NOOB EXPLAINER: Input validation
  // We need at least 3 samples to get a reliable style profile.
  // Fewer than that and the measurements are too noisy.
  // More than 10 and we'd be mixing too many different contexts.
  if (samples.length < MIN_SAMPLES) {
    throw new Error(`Need at least ${MIN_SAMPLES} writing samples, got ${samples.length}`);
  }
  if (samples.length > MAX_SAMPLES) {
    throw new Error(`Maximum ${MAX_SAMPLES} writing samples allowed, got ${samples.length}`);
  }

  // Combine all samples for global analysis
  const allText = samples.join('\n\n');
  const allSentences = samples.flatMap(splitIntoSentences);
  const allWords = allText.split(/\s+/).filter(Boolean);
  const allParagraphs = allText.split(/\n\n+/).filter(Boolean);

  // === LINGUISTIC FEATURES ===
  // 📏 NOOB EXPLAINER: Measuring sentence rhythm
  // We count words per sentence, then compute the average and
  // standard deviation. High stdDev = you vary sentence length a lot.
  const sentenceLengths = allSentences.map(s => s.split(/\s+/).length);
  const avgSentenceLength = mean(sentenceLengths);
  const sentenceLengthStdDev = stdDev(sentenceLengths);

  // 📚 NOOB EXPLAINER: Vocabulary richness measurement
  // "Type-token ratio" = unique words / total words.
  // Higher = richer vocabulary. Lower = more repetitive.
  const cleanWords = allWords.map(w => w.toLowerCase().replace(/[^\w']/g, '')).filter(w => w.length > 2);
  const uniqueWords = new Set(cleanWords);
  const typeTokenRatio = cleanWords.length > 0 ? uniqueWords.size / cleanWords.length : 0;
  const avgWordLength = mean(cleanWords.map(w => w.length));

  // === PUNCTUATION PATTERNS ===
  // 🏷️ NOOB EXPLAINER: Why measure punctuation?
  // Punctuation is one of the most distinctive features of writing style.
  // Some people sprinkle em-dashes everywhere. Others never use semicolons.
  // These patterns are hard for AI to fake consistently.
  const wordCount = allWords.length;
  const contractions = (allText.match(/\w+'(?:t|s|re|ve|ll|d|m)\b/gi) || []).length;
  const emDashes = (allText.match(/—/g) || []).length;
  const semicolons = (allText.match(/;/g) || []).length;
  const parentheticals = (allText.match(/\([^)]{5,}\)/g) || []).length;
  const exclamations = (allText.match(/!/g) || []).length;

  // 📐 NOOB EXPLAINER: Rate normalization
  // We normalize rates to "per 100 words" or "per 1000 words" so that
  // profiles from different-length samples can be compared fairly.
  const contractionRate = (contractions / wordCount) * 100;
  const emDashRate = (emDashes / wordCount) * 1000;
  const semicolonRate = (semicolons / wordCount) * 1000;
  const parentheticalRate = (parentheticals / wordCount) * 1000;
  const exclamationRate = (exclamations / wordCount) * 1000;

  // === SYNTAX PATTERNS ===
  // 🔄 NOOB EXPLAINER: Passive voice detection
  // We look for patterns like "was developed", "are considered", etc.
  // This is a rough heuristic — perfect passive voice detection requires
  // a full parser, but this catches the most common patterns.
  const passivePatterns = [
    /\b(is|are|was|were|been|being)\s+\w+ed\b/gi,
    /\b(is|are|was|were|been|being)\s+\w+en\b/gi,
  ];
  let passiveCount = 0;
  allSentences.forEach(s => passivePatterns.forEach(p => {
    const m = s.match(p); if (m) passiveCount += m.length;
  }));
  const passiveVoiceRatio = allSentences.length > 0 ? passiveCount / allSentences.length : 0;

  // === VOICE MARKERS ===
  // 🗣️ NOOB EXPLAINER: First/second person and hedging
  // "I think" and "you know" are very human markers. AI rarely uses them.
  // Hedging phrases like "it could be argued" are the opposite — very AI.
  const firstPersonWords = allWords.filter(w => /^(I|me|my|we|us|our)$/i.test(w)).length;
  const secondPersonWords = allWords.filter(w => /^you(r)?$/i.test(w)).length;
  const hedgingPhrases = ['it could be argued', 'one might consider', 'it is possible that', 'it would seem', 'this suggests that', 'it appears that', 'one could argue'];
  let hedgingCount = 0;
  const lower = allText.toLowerCase();
  hedgingPhrases.forEach(h => { if (lower.includes(h)) hedgingCount++; });

  const firstPersonRate = (firstPersonWords / wordCount) * 1000;
  const secondPersonRate = (secondPersonWords / wordCount) * 1000;
  const hedgingRate = (hedgingCount / allSentences.length) * 1000;

  // === SENTENCE STARTERS ===
  // 🚀 NOOB EXPLAINER: How you start sentences matters
  // Do you always start with "The"? Do you use "And" or "But" at the
  // start? These are very personal habits that AI doesn't replicate.
  const sentenceStarters = allSentences.map(s => {
    const words = s.split(/\s+/);
    return words[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';
  }).filter(Boolean);
  const starterFreq: Record<string, number> = {};
  sentenceStarters.forEach(s => { starterFreq[s] = (starterFreq[s] || 0) + 1; });
  const topSentenceStarters = Object.entries(starterFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  const conjunctionStarters = sentenceStarters.filter(s => /^(and|but|so|because|also|plus|or|well|ok|hey)$/i.test(s));
  const conjunctionStartRate = sentenceStarters.length > 0 ? conjunctionStarters.length / sentenceStarters.length : 0;

  // === VOCABULARY ===
  // 📖 NOOB EXPLAINER: Transition word preferences
  // Everyone has their favorite transitions. Some people say "however"
  // a lot. Others prefer "but" or "though". This is style DNA.
  const transitionWords = ['however', 'therefore', 'moreover', 'furthermore', 'additionally', 'consequently', 'nevertheless', 'meanwhile', 'thus', 'hence', 'instead', 'rather', 'yet', 'still', 'also', 'but', 'so', 'plus', 'anyway', 'besides', 'likewise'];
  const preferredTransitions = transitionWords.filter(t => lower.includes(t));
  const avoidedPhrases: string[] = []; // Would need more samples to determine

  // === PARAGRAPH STRUCTURE ===
  // 📑 NOOB EXPLAINER: Paragraph length patterns
  // Some people write long paragraphs. Others prefer short ones.
  // This is yet another dimension of style that AI doesn't nail.
  const paragraphLengths = allParagraphs.map(p => splitIntoSentences(p).length);
  const paragraphLengthMean = mean(paragraphLengths);
  const paragraphLengthStdDev = stdDev(paragraphLengths);

  // 🏷️ NOOB EXPLAINER: Profile ID generation
  // We generate a unique ID using the current timestamp and a random
  // string. This ensures each profile has a distinct identity.
  const now = Date.now();
  return {
    id: `vp-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    description,
    createdAt: now,
    updatedAt: now,
    sampleCount: samples.length,
    sampleHashes: samples.map(sha256),
    avgSentenceLength,
    sentenceLengthStdDev,
    typeTokenRatio,
    avgWordLength,
    contractionRate,
    emDashRate,
    semicolonRate,
    parentheticalRate,
    exclamationRate,
    passiveVoiceRatio,
    avgClauseLength: avgSentenceLength * 0.6, // Approximate
    subordinationRate: 0.3, // Default estimate
    firstPersonRate,
    secondPersonRate,
    hedgingRate,
    topSentenceStarters,
    conjunctionStartRate,
    preferredTransitions,
    avoidedPhrases,
    paragraphLengthMean,
    paragraphLengthStdDev,
  };
}
