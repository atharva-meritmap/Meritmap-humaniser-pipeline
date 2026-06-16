import fs from 'node:fs/promises';
import path from 'node:path';
import { splitSentencesLinear, tokenizeWords } from '@/lib/server/text-utils';

type RuntimeModel = {
  bias: number;
  values: number[];
  featureNames?: string[];
};

const DEFAULT_MODEL: RuntimeModel = {
  bias: -0.15,
  values: [0.35, 0.35, 0.18, 0.25, 0.14, -0.33, -0.52, -0.24, -0.58, -0.19, -0.22],
};

function ratio(part: number, total: number) {
  return total > 0 ? part / total : 0;
}

function extractRuntimeFeatures(text: string) {
  const tokens = tokenizeWords(text);
  const unique = new Set(tokens);
  const sentences = splitSentencesLinear(text);
  const sentenceStarts = new Set(
    sentences.map((sentence) => tokenizeWords(sentence).slice(0, 2).join(' ')).filter(Boolean)
  );
  const transitions = (text.match(/\b(however|therefore|moreover|furthermore|additionally|consequently)\b/gi) || []).length;
  const hedges = (text.match(/\b(may|might|could|possibly|perhaps|appears|likely)\b/gi) || []).length;
  const passive = (text.match(/\b(is|are|was|were|be|been|being)\s+\w+(ed|en)\b/gi) || []).length;
  const templateStarts = sentences.filter((sentence) =>
    /^(in conclusion|it is important to note|this study|overall|in this context)/i.test(sentence)
  ).length;
  const trigrams = new Map<string, number>();
  for (let i = 0; i <= tokens.length - 3; i++) {
    const key = tokens.slice(i, i + 3).join(' ');
    trigrams.set(key, (trigrams.get(key) || 0) + 1);
  }
  let repeatedTrigrams = 0;
  for (const count of trigrams.values()) if (count > 1) repeatedTrigrams += count - 1;

  const sentenceLengths = sentences.map((sentence) => tokenizeWords(sentence).length);
  const mean = sentenceLengths.reduce((sum, n) => sum + n, 0) / Math.max(sentenceLengths.length, 1);
  const variance =
    sentenceLengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / Math.max(sentenceLengths.length, 1);
  const burstiness = Math.sqrt(variance);
  const contractions = (text.match(/\b\w+['’](t|s|re|ve|ll|d|m)\b/gi) || []).length;

  return [
    ratio(tokens.filter((t) => t.length > 3).length, tokens.length),
    ratio(unique.size, tokens.length),
    burstiness,
    ratio(sentenceStarts.size, sentences.length),
    ratio(contractions, Math.max(sentences.length, 1)),
    ratio(transitions, tokens.length),
    ratio(templateStarts, Math.max(sentences.length, 1)),
    ratio(transitions, Math.max(sentences.length, 1)),
    ratio(repeatedTrigrams, Math.max(trigrams.size, 1)),
    ratio(hedges, tokens.length),
    ratio(passive, Math.max(sentences.length, 1)),
  ];
}

function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z));
}

async function loadRuntimeModel(): Promise<RuntimeModel> {
  const filePath = path.resolve(process.cwd(), 'data/models/current/advanced.model.json');
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed?.values) && typeof parsed?.bias === 'number') return parsed;
  } catch {}
  return DEFAULT_MODEL;
}

export async function scoreHumanLikeness(text: string) {
  const model = await loadRuntimeModel();
  const vector = extractRuntimeFeatures(text || '');
  let z = model.bias || 0;
  for (let i = 0; i < vector.length; i++) z += (model.values[i] || 0) * vector[i];
  const probability = sigmoid(z);
  return {
    modelSource: model === DEFAULT_MODEL ? 'fallback-default' : 'trained-current',
    probabilityHuman: probability,
    score: Math.round(probability * 100),
  };
}
