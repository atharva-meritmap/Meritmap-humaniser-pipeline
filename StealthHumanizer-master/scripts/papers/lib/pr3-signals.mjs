import { extractDocumentFeatures } from "./feature-extract.mjs";
import { splitSentences } from "./segmentation.mjs";
import { normalizeText } from "./text-normalization.mjs";

const WORD_REGEX = /\p{L}+(?:['’\-]\p{L}+)?/gu;
const AI_TEMPLATE_LEADS = [
  "in conclusion",
  "it is important to note",
  "this study",
  "in this context",
  "overall",
];
const TRANSITION_LEADS = ["however", "therefore", "moreover", "furthermore", "additionally", "consequently"];

function tokenize(text) {
  const matches = text.match(WORD_REGEX) || [];
  return matches.map((token) => token.toLowerCase());
}

function ratio(part, total) {
  return total > 0 ? part / total : 0;
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function nGramRepetitionRatio(tokens, n = 3) {
  if (tokens.length < n) return 0;
  const freq = new Map();
  let total = 0;
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(" ");
    freq.set(gram, (freq.get(gram) || 0) + 1);
    total += 1;
  }
  let repeats = 0;
  for (const count of freq.values()) {
    if (count > 1) repeats += count - 1;
  }
  return ratio(repeats, total);
}

function sentenceLeadDiversity(sentences) {
  if (!sentences.length) return 0;
  const leads = new Set();
  for (const sentence of sentences) {
    const tokens = tokenize(sentence).slice(0, 2).join(" ");
    if (tokens) leads.add(tokens);
  }
  return ratio(leads.size, sentences.length);
}

function countSentenceStarts(sentences, starts) {
  const normalizedStarts = starts.map((value) => value.toLowerCase());
  let count = 0;
  for (const sentence of sentences) {
    const lower = sentence.trim().toLowerCase();
    if (normalizedStarts.some((start) => lower.startsWith(start))) count += 1;
  }
  return count;
}

export function extractHumanizationSignals(rawText) {
  const normalizedText = normalizeText(rawText || "");
  const features = extractDocumentFeatures(normalizedText);
  const sentences = splitSentences(normalizedText);
  const tokens = tokenize(normalizedText);
  const sentenceTokenCounts = sentences.map((sentence) => tokenize(sentence).length);
  const sentenceMean = avg(sentenceTokenCounts);
  const sentenceSd = stdDev(sentenceTokenCounts);

  const templateStartCount = countSentenceStarts(sentences, AI_TEMPLATE_LEADS);
  const transitionStartCount = countSentenceStarts(sentences, TRANSITION_LEADS);

  return {
    humanizationSignals: {
      lexicalDensity: features.lexicalFeatures.lexicalDensity,
      typeTokenRatio: features.tokenStats.typeTokenRatio,
      sentenceBurstiness: sentenceSd,
      sentenceLengthCoeffVar: ratio(sentenceSd, sentenceMean || 1),
      sentenceLeadDiversity: sentenceLeadDiversity(sentences),
      contractionRatio: features.stylisticFeatures.contractionRatio,
      firstPersonRatio: features.stylisticFeatures.firstPersonRatio,
      transitionRatio: features.stylisticFeatures.transitionRatio,
    },
    antiPatterns: {
      templateLeadRatio: ratio(templateStartCount, Math.max(sentences.length, 1)),
      transitionLeadRatio: ratio(transitionStartCount, Math.max(sentences.length, 1)),
      trigramRepetitionRatio: nGramRepetitionRatio(tokens, 3),
      hedgingRatio: features.stylisticFeatures.hedgingRatio,
      passiveVoiceApproxRatio: features.syntacticFeatures.passiveVoiceApproxRatio,
      punctuationDensity: features.syntacticFeatures.punctuationDensity,
    },
    diagnostics: {
      sentenceCount: features.segmentation.sentenceCount,
      tokenCount: features.tokenStats.tokenCount,
      normalizedTextChars: normalizedText.length,
    },
  };
}
