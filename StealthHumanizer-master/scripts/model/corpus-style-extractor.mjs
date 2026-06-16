#!/usr/bin/env node
/**
 * Corpus Style Extractor — Analyzes academic paper corpora to extract
 * human writing style statistics for calibrating the humanizer engine.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyzePaper, splitSentences, splitParagraphs, getWords, mean, percentile, frequencyMap } from './lib/corpus-analysis.mjs';

// ==================== CONFIG ====================

const CORPUS_PATH = resolve(process.argv.find((a, i) => a === '--corpus' && process.argv[i + 1])
  ? process.argv[process.argv.indexOf('--corpus') + 1]
  : 'data/papers/corpus/mock-corpus.jsonl');

const OUTPUT_PATH = resolve(process.argv.find((a, i) => a === '--output' && process.argv[i + 1])
  ? process.argv[process.argv.indexOf('--output') + 1]
  : 'data/models/corpus-style-model.json');

// ==================== MAIN ====================

async function main() {
  console.log(`Reading corpus from: ${CORPUS_PATH}`);

  if (!existsSync(CORPUS_PATH)) {
    console.error(`Corpus file not found: ${CORPUS_PATH}`);
    console.error('Run `node scripts/model/generate-mock-corpus.mjs` first.');
    process.exit(1);
  }

  const raw = readFileSync(CORPUS_PATH, 'utf-8').trim();
  const papers = raw.split('\n').map(line => {
    try { return JSON.parse(line); }
    catch { return null; }
  }).filter(Boolean);

  console.log(`Loaded ${papers.length} papers.`);

  // Analyze each paper
  const paperStats = papers.map(p => analyzePaper(p.text));

  // Collect sentence starters across all papers
  const globalStarters = {};
  let totalSentences = 0;
  for (const p of papers) {
    const sentences = splitSentences(p.text);
    totalSentences += sentences.length;
    for (const s of sentences) {
      const first = s.split(/\s+/)[0].toLowerCase().replace(/[^a-z'-]/g, '');
      if (first.length > 0) globalStarters[first] = (globalStarters[first] || 0) + 1;
    }
  }

  // Top 100 starters
  const topStarters = Object.entries(globalStarters)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .reduce((obj, [word, count]) => {
      obj[word] = +(count / totalSentences * 100).toFixed(2);
      return obj;
    }, {});

  // Collect human writing examples (natural-sounding sentences from papers)
  const allSentences = [];
  for (const p of papers) {
    const sentences = splitSentences(p.text);
    for (const s of sentences) {
      const wc = s.split(/\s+/).length;
      // Keep sentences that look naturally varied (not too uniform)
      if (wc >= 5 && wc <= 40) {
        allSentences.push(s);
      }
    }
  }
  // Pick 50 diverse examples
  const examples = [];
  const step = Math.floor(allSentences.length / 50);
  for (let i = 0; i < 50 && i * step < allSentences.length; i++) {
    examples.push(allSentences[i * step]);
  }

  // Collect sentence lengths across all papers for distribution
  const allSentenceLengths = [];
  for (const p of papers) {
    const sentences = splitSentences(p.text);
    for (const s of sentences) {
      allSentenceLengths.push(getWords(s).length);
    }
  }

  // Aggregate by domain
  const byDomain = {};
  for (let i = 0; i < papers.length; i++) {
    const domain = papers[i].domain || 'Unknown';
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(paperStats[i]);
  }

  const domainAggregates = {};
  for (const [domain, stats] of Object.entries(byDomain)) {
    const sLengths = stats.map(s => s.sentenceLengths.mean);
    const bursts = stats.map(s => s.burstiness);
    const vocabs = stats.map(s => s.vocabularyDiversity);
    const passives = stats.map(s => s.passiveVoiceRatio);

    domainAggregates[domain] = {
      paperCount: stats.length,
      sentenceLengthMean: +mean(sLengths).toFixed(1),
      burstinessMean: +mean(bursts).toFixed(3),
      vocabularyDiversityMean: +mean(vocabs).toFixed(3),
      passiveVoiceMean: +mean(passives).toFixed(1),
    };
  }

  // Global aggregate stats
  const globalSentenceLengths = paperStats.map(p => p.sentenceLengths.mean);
  const globalBurstiness = paperStats.map(p => p.burstiness);
  const globalVocab = paperStats.map(p => p.vocabularyDiversity);
  const globalContractions = paperStats.map(p => p.contractionFrequency);
  const globalPassive = paperStats.map(p => p.passiveVoiceRatio);
  const globalFirstPerson = paperStats.map(p => p.firstPersonPronouns);
  const globalHedging = paperStats.map(p => p.hedgingFrequency);
  const globalParaWords = paperStats.map(p => p.paragraphs.avgWordsPerParagraph);

  // Aggregate transitions
  const allTransitions = {};
  for (const p of paperStats) {
    for (const [word, freq] of Object.entries(p.transitionFrequency)) {
      allTransitions[word] = (allTransitions[word] || 0) + freq;
    }
  }
  for (const w of Object.keys(allTransitions)) {
    allTransitions[w] = +(allTransitions[w] / paperStats.length).toFixed(2);
  }

  // Aggregate AI phrases
  const allAIPhrases = {};
  for (const p of paperStats) {
    for (const [phrase, freq] of Object.entries(p.aiPhraseFrequency)) {
      allAIPhrases[phrase] = (allAIPhrases[phrase] || 0) + freq;
    }
  }
  for (const phrase of Object.keys(allAIPhrases)) {
    allAIPhrases[phrase] = +(allAIPhrases[phrase] / paperStats.length).toFixed(3);
  }

  // Punctuation aggregates
  const emDashes = paperStats.map(p => p.punctuation.emDashPer1000);
  const semicolons = paperStats.map(p => p.punctuation.semicolonPer1000);
  const exclamations = paperStats.map(p => p.punctuation.exclamationPer1000);

  const output = {
    generatedAt: new Date().toISOString(),
    paperCount: papers.length,
    global: {
      avgSentenceLength: +mean(globalSentenceLengths).toFixed(1),
      avgBurstiness: +mean(globalBurstiness).toFixed(3),
      avgVocabularyDiversity: +mean(globalVocab).toFixed(3),
      avgContractionFrequency: +mean(globalContractions).toFixed(2),
      avgPassiveVoiceRatio: +mean(globalPassive).toFixed(1),
      avgFirstPersonPronouns: +mean(globalFirstPerson).toFixed(2),
      avgHedgingFrequency: +mean(globalHedging).toFixed(2),
      avgWordsPerParagraph: +mean(globalParaWords).toFixed(1),
    },
    byDomain: domainAggregates,
    sentenceLengthDistribution: {
      mean: +mean(allSentenceLengths).toFixed(1),
      median: +percentile(allSentenceLengths, 50).toFixed(1),
      stddev: +Math.sqrt(globalSentenceLengths.reduce((s, v) => s + (v - mean(globalSentenceLengths)) ** 2, 0) / globalSentenceLengths.length).toFixed(1),
      min: Math.min(...allSentenceLengths),
      max: Math.max(...allSentenceLengths),
      p10: +percentile(allSentenceLengths, 10).toFixed(1),
      p25: +percentile(allSentenceLengths, 25).toFixed(1),
      p75: +percentile(allSentenceLengths, 75).toFixed(1),
      p90: +percentile(allSentenceLengths, 90).toFixed(1),
    },
    burstinessProfile: {
      mean: +mean(globalBurstiness).toFixed(3),
      stddev: +Math.sqrt(globalBurstiness.reduce((s, v) => s + (v - mean(globalBurstiness)) ** 2, 0) / globalBurstiness.length).toFixed(3),
    },
    vocabularyDiversityRange: {
      min: +Math.min(...globalVocab).toFixed(3),
      max: +Math.max(...globalVocab).toFixed(3),
      mean: +mean(globalVocab).toFixed(3),
    },
    transitionWordFrequency: allTransitions,
    aiPhraseFrequency: allAIPhrases,
    contractionFrequency: {
      mean: +mean(globalContractions).toFixed(2),
      stddev: +Math.sqrt(globalContractions.reduce((s, v) => s + (v - mean(globalContractions)) ** 2, 0) / globalContractions.length).toFixed(2),
    },
    passiveVoiceRatio: {
      mean: +mean(globalPassive).toFixed(1),
      stddev: +Math.sqrt(globalPassive.reduce((s, v) => s + (v - mean(globalPassive)) ** 2, 0) / globalPassive.length).toFixed(1),
    },
    sentenceStarters: topStarters,
    humanWritingExamples: examples,
    punctuation: {
      emDashPer1000: { mean: +mean(emDashes).toFixed(2), stddev: +Math.sqrt(emDashes.reduce((s, v) => s + (v - mean(emDashes)) ** 2, 0) / emDashes.length).toFixed(2) },
      semicolonPer1000: { mean: +mean(semicolons).toFixed(2), stddev: +Math.sqrt(semicolons.reduce((s, v) => s + (v - mean(semicolons)) ** 2, 0) / semicolons.length).toFixed(2) },
      exclamationPer1000: { mean: +mean(exclamations).toFixed(2), stddev: +Math.sqrt(exclamations.reduce((s, v) => s + (v - mean(exclamations)) ** 2, 0) / exclamations.length).toFixed(2) },
    },
  };

  // Write output
  const outputDir = resolve(OUTPUT_PATH, '..');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(outputDir, { recursive: true });

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nCorpus style model written to: ${OUTPUT_PATH}`);
  console.log(`Papers analyzed: ${output.paperCount}`);
  console.log(`Avg sentence length: ${output.sentenceLengthDistribution.mean}`);
  console.log(`Avg burstiness: ${output.burstinessProfile.mean}`);
  console.log(`Avg vocabulary diversity: ${output.vocabularyDiversityRange.mean}`);
  console.log(`Domains: ${Object.keys(output.byDomain).join(', ')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
