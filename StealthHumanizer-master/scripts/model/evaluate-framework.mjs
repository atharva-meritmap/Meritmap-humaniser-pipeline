#!/usr/bin/env node
/**
 * Evaluation framework with corpus-calibrated metrics.
 * Compares humanized output style statistics against corpus baselines.
 */

import path from "node:path";
import process from "node:process";
import { existsSync, readFileSync } from "node:fs";

function parseArgs(argv) {
  const args = {
    manifest: "data/models/current/run.manifest.json",
    corpusModel: "data/models/corpus-style-model.json",
    text: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--manifest" && argv[i + 1]) args.manifest = argv[++i];
    else if (arg === "--corpus-model" && argv[i + 1]) args.corpusModel = argv[++i];
    else if (arg === "--text" && argv[i + 1]) args.text = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function readJson(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!existsSync(resolved)) return null;
  return JSON.parse(readFileSync(resolved, "utf-8"));
}

// ==================== STYLE METRIC COMPARISON ====================

function getWords(text) {
  return text.toLowerCase().replace(/[^\w\s'-]/g, '').split(/\s+/).filter(w => w.length > 0);
}

function splitSentences(text) {
  return text.match(/[^.!?]*[.!?]+[\s]*/g)?.map(s => s.trim()).filter(s => s.length > 0) || [text.trim()];
}

function splitParagraphs(text) {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
}

function mean(arr) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function analyzeTextStyle(text) {
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text);
  const words = getWords(text);
  const lengths = sentences.map(s => getWords(s).length);

  return {
    sentenceLengthMean: +mean(lengths).toFixed(1),
    sentenceLengthStddev: +stddev(lengths).toFixed(1),
    burstiness: lengths.length > 1 ? +(stddev(lengths) / mean(lengths)).toFixed(3) : 0,
    vocabularyDiversity: words.length > 10 ? +(new Set(words.filter(w => w.length > 2)).size / words.length).toFixed(3) : 0,
    paragraphCount: paragraphs.length,
    avgWordsPerParagraph: paragraphs.length > 0 ? +(paragraphs.reduce((s, p) => s + getWords(p).length, 0) / paragraphs.length).toFixed(1) : 0,
    wordCount: words.length,
    sentenceCount: sentences.length,
  };
}

function compareWithCorpus(textStats, corpusModel) {
  if (!corpusModel) return null;

  const results = {};

  // Sentence length comparison
  const slDist = corpusModel.sentenceLengthDistribution;
  results.sentenceLength = {
    value: textStats.sentenceLengthMean,
    corpusMean: slDist.mean,
    corpusP25: slDist.p25,
    corpusP75: slDist.p75,
    inRange: textStats.sentenceLengthMean >= slDist.p25 && textStats.sentenceLengthMean <= slDist.p75,
    deviation: +Math.abs(textStats.sentenceLengthMean - slDist.mean).toFixed(1),
  };

  // Burstiness comparison
  results.burstiness = {
    value: textStats.burstiness,
    corpusMean: corpusModel.burstinessProfile.mean,
    corpusStddev: corpusModel.burstinessProfile.stddev,
    inRange: textStats.burstiness >= corpusModel.burstinessProfile.mean - corpusModel.burstinessProfile.stddev,
  };

  // Vocabulary diversity
  results.vocabularyDiversity = {
    value: textStats.vocabularyDiversity,
    corpusMean: corpusModel.vocabularyDiversityRange.mean,
    corpusMin: corpusModel.vocabularyDiversityRange.min,
    inRange: textStats.vocabularyDiversity >= corpusModel.vocabularyDiversityRange.min,
  };

  // Compute overall corpus match score (0-100)
  let matchScore = 50;
  if (results.sentenceLength.inRange) matchScore += 15;
  else matchScore -= Math.min(15, results.sentenceLength.deviation * 2);
  if (results.burstiness.inRange) matchScore += 15;
  if (results.vocabularyDiversity.inRange) matchScore += 15;
  // Bonus for being close to corpus mean
  matchScore -= Math.min(5, results.sentenceLength.deviation);

  results.overallMatchScore = Math.max(0, Math.min(100, matchScore));

  return results;
}

// ==================== MAIN ====================

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/model/evaluate-framework.mjs [--manifest <file>] [--corpus-model <file>] [--text <file>]");
    return;
  }

  // Load corpus model
  const corpusModel = readJson(args.corpusModel);
  if (!corpusModel) {
    console.log("[model:eval] No corpus model found. Run corpus-style-extractor first.");
  }

  // Mode 1: Evaluate with manifest
  if (args.text) {
    const textPath = path.resolve(process.cwd(), args.text);
    if (!existsSync(textPath)) {
      console.error(`Text file not found: ${textPath}`);
      process.exit(1);
    }
    const text = readFileSync(textPath, "utf-8");
    const stats = analyzeTextStyle(text);
    const comparison = compareWithCorpus(stats, corpusModel);

    console.log("=== Text Style Analysis ===");
    console.log(JSON.stringify(stats, null, 2));
    if (comparison) {
      console.log("\n=== Corpus Comparison ===");
      console.log(JSON.stringify(comparison, null, 2));
    }
    return;
  }

  // Mode 2: Manifest-based evaluation
  const manifestPath = path.resolve(process.cwd(), args.manifest);
  const manifest = readJson(manifestPath);
  if (!manifest) {
    console.error(`Manifest not found: ${manifestPath}`);
    process.exit(1);
  }

  const output = {
    runId: manifest.runId,
    frameworkVersion: manifest.frameworkVersion,
    qualityGate: manifest.qualityGate,
    corpusCalibration: corpusModel ? {
      paperCount: corpusModel.paperCount,
      sentenceLengthMean: corpusModel.sentenceLengthDistribution?.mean,
      burstinessMean: corpusModel.burstinessProfile?.mean,
    } : null,
  };
  console.log(JSON.stringify(output, null, 2));
  if (!manifest?.qualityGate?.passed) process.exit(2);
}

main().catch((error) => {
  console.error(`[model:eval] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
