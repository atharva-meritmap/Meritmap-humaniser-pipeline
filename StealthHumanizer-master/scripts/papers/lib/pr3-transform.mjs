import { splitSentences } from "./segmentation.mjs";

const TRANSITION_PREFIXES = [
  "Moreover",
  "Furthermore",
  "Therefore",
  "Additionally",
  "Consequently",
];

const CLOSING_PHRASES = [
  "which may indicate broader implications",
  "as suggested by prior studies",
  "which appears to be significant",
];

const CONTRACTION_REPLACEMENTS = [
  [/can't/gi, "cannot"],
  [/won't/gi, "will not"],
  [/n't/gi, " not"],
  [/'re/gi, " are"],
  [/'ve/gi, " have"],
  [/'ll/gi, " will"],
  [/'m/gi, " am"],
];

function expandContractions(text) {
  let result = text;
  for (const [pattern, replacement] of CONTRACTION_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function cleanSentenceEnding(text) {
  const cleaned = text.trim().replace(/[.?!]+$/g, "");
  return cleaned.length > 0 ? `${cleaned}.` : "";
}

function rewriteSentence(sentence, index) {
  if (!sentence.trim()) return "";
  const transition = TRANSITION_PREFIXES[index % TRANSITION_PREFIXES.length];
  const closure = CLOSING_PHRASES[index % CLOSING_PHRASES.length];

  let rewritten = expandContractions(sentence)
    .replace(/\bI\b/g, "the author")
    .replace(/\bwe\b/gi, "the authors")
    .replace(/\bour\b/gi, "their")
    .replace(/\bmy\b/gi, "the author's");

  rewritten = cleanSentenceEnding(rewritten);
  if (!rewritten) return "";
  return `${transition}, ${rewritten.slice(0, -1)}, ${closure}.`;
}

export function synthesizeAiTransformedText(humanText) {
  const sentences = splitSentences(humanText);
  if (!sentences.length) return humanText;
  return sentences.map((sentence, index) => rewriteSentence(sentence, index)).join(" ");
}
