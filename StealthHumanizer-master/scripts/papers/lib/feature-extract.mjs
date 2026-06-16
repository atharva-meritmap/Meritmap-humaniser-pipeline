import { splitParagraphs, splitSentences } from "./segmentation.mjs";

const WORD_REGEX = /\p{L}+(?:['’\-]\p{L}+)?/gu;
const PUNCT_REGEX = /[.,;:!?()[\]{}"“”'‘’\-]/g;
const PASSIVE_REGEX = /\b(?:is|are|was|were|be|been|being)\s+\w+(?:ed|en)\b/gi;
const CONTRACTION_REGEX = /\b\p{L}+['’](?:t|s|re|ve|ll|d|m)\b/giu;

const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","but","by","for","from","has","have","he","her","his","i","in","is","it",
  "its","of","on","or","that","the","their","there","they","this","to","was","we","were","which","with","you","your",
]);
const HEDGES = new Set(["may","might","could","possibly","perhaps","suggests","appears","likely","arguably"]);
const TRANSITIONS = new Set(["however","therefore","moreover","furthermore","thus","consequently","additionally","meanwhile"]);
const FIRST_PERSON = new Set(["i","me","my","mine","we","us","our","ours"]);
const SECOND_PERSON = new Set(["you","your","yours"]);
const CLAUSE_MARKERS = new Set(["because","although","while","whereas","which","that","who","whom","whose","if","when"]);

function average(numbers) {
  if (!numbers.length) return 0;
  return numbers.reduce((acc, value) => acc + value, 0) / numbers.length;
}

function stdDev(numbers) {
  if (numbers.length < 2) return 0;
  const mean = average(numbers);
  const variance = numbers.reduce((acc, value) => acc + (value - mean) ** 2, 0) / numbers.length;
  return Math.sqrt(variance);
}

function ratio(part, total) {
  return total > 0 ? part / total : 0;
}

function tokenize(text) {
  const matches = text.match(WORD_REGEX) || [];
  return matches.map((token) => token.toLowerCase());
}

function topFrequencyMap(tokens, limit = 30) {
  const freq = new Map();
  for (const token of tokens) {
    if (STOPWORDS.has(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token, count]) => ({ token, count }));
}

export function extractDocumentFeatures(normalizedText) {
  const paragraphs = splitParagraphs(normalizedText);
  const sentences = splitSentences(normalizedText);
  const tokens = tokenize(normalizedText);
  const uniqueTokens = new Set(tokens);
  const tokenLengths = tokens.map((token) => token.length);
  const sentenceTokenCounts = sentences.map((sentence) => tokenize(sentence).length);
  const paragraphSentenceCounts = paragraphs.map((paragraph) => splitSentences(paragraph).length);
  const punctuationCount = (normalizedText.match(PUNCT_REGEX) || []).length;
  const passiveCount = (normalizedText.match(PASSIVE_REGEX) || []).length;
  const contractionCount = (normalizedText.match(CONTRACTION_REGEX) || []).length;

  let hedges = 0;
  let transitions = 0;
  let firstPerson = 0;
  let secondPerson = 0;
  let clauseMarkers = 0;
  let longTokens = 0;
  let hapax = 0;

  const frequencies = new Map();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
    if (HEDGES.has(token)) hedges += 1;
    if (TRANSITIONS.has(token)) transitions += 1;
    if (FIRST_PERSON.has(token)) firstPerson += 1;
    if (SECOND_PERSON.has(token)) secondPerson += 1;
    if (CLAUSE_MARKERS.has(token)) clauseMarkers += 1;
    if (token.length >= 7) longTokens += 1;
  }
  for (const count of frequencies.values()) {
    if (count === 1) hapax += 1;
  }

  const nonStopwordCount = tokens.filter((token) => !STOPWORDS.has(token)).length;
  const questionSentences = sentences.filter((sentence) => sentence.trim().endsWith("?")).length;
  const exclamationSentences = sentences.filter((sentence) => sentence.trim().endsWith("!")).length;

  return {
    segmentation: {
      paragraphCount: paragraphs.length,
      sentenceCount: sentences.length,
    },
    tokenStats: {
      tokenCount: tokens.length,
      uniqueTokenCount: uniqueTokens.size,
      typeTokenRatio: ratio(uniqueTokens.size, tokens.length),
      avgTokenLength: average(tokenLengths),
      longTokenRatio: ratio(longTokens, tokens.length),
    },
    lexicalFeatures: {
      lexicalDensity: ratio(nonStopwordCount, tokens.length),
      stopwordRatio: ratio(tokens.length - nonStopwordCount, tokens.length),
      hapaxRatio: ratio(hapax, uniqueTokens.size),
      topKeywords: topFrequencyMap(tokens, 30),
    },
    syntacticFeatures: {
      avgSentenceTokens: average(sentenceTokenCounts),
      sentenceLengthStdDev: stdDev(sentenceTokenCounts),
      avgParagraphSentences: average(paragraphSentenceCounts),
      punctuationDensity: ratio(punctuationCount, Math.max(normalizedText.length, 1)),
      clauseMarkerRatio: ratio(clauseMarkers, tokens.length),
      passiveVoiceApproxRatio: ratio(passiveCount, Math.max(sentences.length, 1)),
    },
    stylisticFeatures: {
      firstPersonRatio: ratio(firstPerson, tokens.length),
      secondPersonRatio: ratio(secondPerson, tokens.length),
      contractionRatio: ratio(contractionCount, Math.max(sentences.length, 1)),
      hedgingRatio: ratio(hedges, tokens.length),
      transitionRatio: ratio(transitions, tokens.length),
      questionSentenceRatio: ratio(questionSentences, Math.max(sentences.length, 1)),
      exclamationSentenceRatio: ratio(exclamationSentences, Math.max(sentences.length, 1)),
    },
  };
}
