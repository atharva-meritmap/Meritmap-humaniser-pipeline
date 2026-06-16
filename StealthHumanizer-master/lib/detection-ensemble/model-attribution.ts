// 🤖 NOOB EXPLAINER: What is Model Attribution?
// Different AI models have different "fingerprints" — patterns in how
// they write. GPT-4 tends to use longer sentences and more hedging.
// Claude uses more parenthetical asides. Gemini is more formal.
// Llama writes more casually.
//
// This detector tries to guess WHICH AI model wrote the text.
// This is useful because different detectors target different models,
// so knowing the model helps us choose the right counter-strategy.

import type { ModelAttributionResult } from './types';

export interface ModelFingerprint {
  name: string;
  patterns: {
    avgSentenceLength: { min: number; max: number };
    hedgingRate: { min: number; max: number };     // per 1000 words
    passiveVoiceRate: { min: number; max: number };  // 0-1
    contractionRate: { min: number; max: number };   // per 100 words
    parentheticalRate: { min: number; max: number }; // per 1000 words
    aiPhraseDensity: { min: number; max: number };   // per 1000 words
  };
}

// 🎭 NOOB EXPLAINER: Model fingerprints
// These are approximate patterns based on observed outputs.
// They're not perfect but give a reasonable guess.
const MODEL_FINGERPRINTS: ModelFingerprint[] = [
  {
    name: 'GPT-4',
    patterns: {
      avgSentenceLength: { min: 20, max: 30 },
      hedgingRate: { min: 3, max: 8 },
      passiveVoiceRate: { min: 0.15, max: 0.35 },
      contractionRate: { min: 0.5, max: 2 },
      parentheticalRate: { min: 0, max: 2 },
      aiPhraseDensity: { min: 5, max: 15 },
    },
  },
  {
    name: 'Claude',
    patterns: {
      avgSentenceLength: { min: 15, max: 25 },
      hedgingRate: { min: 2, max: 6 },
      passiveVoiceRate: { min: 0.1, max: 0.25 },
      contractionRate: { min: 2, max: 5 },
      parentheticalRate: { min: 2, max: 6 },
      aiPhraseDensity: { min: 3, max: 10 },
    },
  },
  {
    name: 'Gemini',
    patterns: {
      avgSentenceLength: { min: 18, max: 28 },
      hedgingRate: { min: 2, max: 7 },
      passiveVoiceRate: { min: 0.2, max: 0.4 },
      contractionRate: { min: 0, max: 1.5 },
      parentheticalRate: { min: 0, max: 1 },
      aiPhraseDensity: { min: 8, max: 20 },
    },
  },
  {
    name: 'Llama',
    patterns: {
      avgSentenceLength: { min: 12, max: 22 },
      hedgingRate: { min: 1, max: 4 },
      passiveVoiceRate: { min: 0.05, max: 0.2 },
      contractionRate: { min: 3, max: 7 },
      parentheticalRate: { min: 0, max: 3 },
      aiPhraseDensity: { min: 2, max: 8 },
    },
  },
];

function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    current += text[i];
    if (['.', '!', '?'].includes(text[i])) {
      const trimmed = current.trim();
      if (trimmed.length > 0) sentences.push(trimmed);
      current = '';
    }
  }
  const trimmed = current.trim();
  if (trimmed.length > 0) sentences.push(trimmed);
  return sentences;
}

function extractFeatures(text: string) {
  const words = text.split(/\s+/);
  const sentences = splitIntoSentences(text);
  const wordCount = words.length;

  return {
    avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
    hedgingRate: wordCount > 0 ? ((text.match(/\b(it could be|might be|possibly|perhaps|it seems|arguably)\b/gi) || []).length / wordCount) * 1000 : 0,
    passiveVoiceRate: sentences.length > 0 ? (sentences.filter(s => /\b(is|are|was|were|been|being)\s+\w+ed\b/i.test(s)).length / sentences.length) : 0,
    contractionRate: wordCount > 0 ? ((text.match(/\w+'(?:t|s|re|ve|ll|d|m)\b/gi) || []).length / wordCount) * 100 : 0,
    parentheticalRate: wordCount > 0 ? ((text.match(/\([^)]{5,}\)/g) || []).length / wordCount) * 1000 : 0,
    aiPhraseDensity: wordCount > 0 ? ((text.match(/\b(furthermore|moreover|additionally|consequently|therefore|delve|tapestry|landscape|multifaceted|robust|seamless|synergy|paradigm|holistic|innovative|cutting-edge|groundbreaking|transformative|comprehensive|unprecedented)\b/gi) || []).length / wordCount) * 1000 : 0,
  };
}

function featureScore(value: number, range: { min: number; max: number }): number {
  const mid = (range.min + range.max) / 2;
  const halfWidth = (range.max - range.min) / 2;
  const distance = Math.abs(value - mid);
  // Score from 1 (perfect match) to 0 (far from range)
  return Math.max(0, 1 - distance / (halfWidth * 3));
}

export function attributeModel(text: string): ModelAttributionResult {
  const features = extractFeatures(text);

  const results = MODEL_FINGERPRINTS.map(fingerprint => {
    const scores = [
      featureScore(features.avgSentenceLength, fingerprint.patterns.avgSentenceLength),
      featureScore(features.hedgingRate, fingerprint.patterns.hedgingRate),
      featureScore(features.passiveVoiceRate, fingerprint.patterns.passiveVoiceRate),
      featureScore(features.contractionRate, fingerprint.patterns.contractionRate),
      featureScore(features.parentheticalRate, fingerprint.patterns.parentheticalRate),
      featureScore(features.aiPhraseDensity, fingerprint.patterns.aiPhraseDensity),
    ];
    const confidence = scores.reduce((a, b) => a + b, 0) / scores.length;
    const topPattern = scores.indexOf(Math.max(...scores));

    const patternNames = ['sentence length', 'hedging', 'passive voice', 'contractions', 'parentheticals', 'AI phrases'];
    return {
      name: fingerprint.name,
      confidence,
      fingerprint: patternNames[topPattern] || 'mixed',
    };
  });

  results.sort((a, b) => b.confidence - a.confidence);

  return {
    models: results,
    topModel: results[0]?.name || 'Unknown',
    topConfidence: results[0]?.confidence || 0,
  };
}
