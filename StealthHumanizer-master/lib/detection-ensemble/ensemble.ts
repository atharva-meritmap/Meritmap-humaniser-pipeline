// 🎼 NOOB EXPLAINER: The Ensemble Orchestrator
// This file brings all the detectors together. It runs each one,
// collects their scores, and combines them into a single result.
// Think of it as a conductor leading an orchestra — each instrument
// (detector) plays its part, and the conductor combines them into music.

import { detectAI } from '../detector';
import { detectSlopWords } from './slop-detector';
import { checkReadabilityConsistency } from './readability-consistency';
import { attributeModel } from './model-attribution';
import type { EnsembleResult, DetectorResult, RadarDataPoint, RemediationItem } from './types';

export function runEnsembleDetection(text: string): EnsembleResult {
  // Run all detectors
  const builtInResult = detectAI(text);
  const slopResult = detectSlopWords(text);
  const readabilityResult = checkReadabilityConsistency(text);
  const attributionResult = attributeModel(text);

  // Build detector results
  const detectors: DetectorResult[] = [
    {
      id: 'built-in',
      name: 'Built-in Detector (12 metrics)',
      score: builtInResult.score,
      weight: 0.50,
      findings: builtInResult.analysis ? Object.entries(builtInResult.analysis)
        .filter(([, v]) => typeof v === 'number')
        .map(([k, v]) => `${k}: ${v}`) : [],
    },
    {
      id: 'slop',
      name: 'AI Slop Word Detector',
      score: slopResult.score,
      weight: 0.25,
      findings: slopResult.found.map(f => `"${f.word}" → try "${f.replacement}" (${f.severity} severity)`),
    },
    {
      id: 'readability-consistency',
      name: 'Readability Consistency',
      score: readabilityResult.score,
      weight: 0.15,
      findings: [
        `Variance: ${readabilityResult.variance}`,
        `Verdict: ${readabilityResult.verdict}`,
      ],
    },
    {
      id: 'model-attribution',
      name: 'Model Attribution',
      score: Math.round((1 - attributionResult.topConfidence) * 100),
      weight: 0.10,
      findings: attributionResult.models.slice(0, 3).map(m =>
        `${m.name}: ${(m.confidence * 100).toFixed(0)}% match`
      ),
    },
  ];

  // Weighted overall score
  const overallScore = Math.round(
    detectors.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  // Overall verdict
  let overallVerdict: 'human' | 'ai' | 'mixed';
  if (overallScore >= 55) overallVerdict = 'human';
  else if (overallScore >= 35) overallVerdict = 'mixed';
  else overallVerdict = 'ai';

  // 📊 NOOB EXPLAINER: Radar chart data
  // A radar chart (spider chart) shows multiple metrics at once.
  // Each "arm" of the chart is one metric. The further from center,
  // the better the score. A quick glance shows you which metrics
  // need improvement.
  const radarData: RadarDataPoint[] = builtInResult.analysis ? [
    { metric: 'Perplexity', value: builtInResult.analysis.perplexity, ideal: 70 },
    { metric: 'Burstiness', value: builtInResult.analysis.burstiness, ideal: 60 },
    { metric: 'Vocabulary', value: builtInResult.analysis.vocabularyDiversity, ideal: 65 },
    { metric: 'Sentence Variation', value: builtInResult.analysis.sentenceLengthVariation, ideal: 55 },
    { metric: 'AI Phrases', value: 100 - builtInResult.analysis.aiPhraseDensity, ideal: 85 },
    { metric: 'Slop Words', value: slopResult.score, ideal: 80 },
    { metric: 'Readability Var.', value: readabilityResult.score, ideal: 70 },
    { metric: 'Sentence Starts', value: builtInResult.analysis.sentenceStartDiversity, ideal: 65 },
  ] : [];

  // 🔧 NOOB EXPLAINER: Remediation suggestions
  // Based on what the detectors found, we suggest specific fixes.
  const remediation: RemediationItem[] = [];
  
  if (slopResult.slopCount > 0) {
    const highSeverity = slopResult.found.filter(f => f.severity === 'high');
    if (highSeverity.length > 0) {
      remediation.push({
        issue: `${highSeverity.length} high-severity AI slop words detected`,
        severity: 'high',
        fix: `Replace: ${highSeverity.map(f => `"${f.word}" → "${f.replacement}"`).join(', ')}`,
        affectedPhrases: highSeverity.map(f => f.word),
      });
    }
  }

  if (readabilityResult.verdict !== 'natural') {
    remediation.push({
      issue: 'Readability is suspiciously consistent (AI-like)',
      severity: readabilityResult.verdict === 'very_suspicious' ? 'high' : 'medium',
      fix: 'Vary the complexity of your sentences — mix simple and complex constructions',
    });
  }

  if (builtInResult.analysis?.aiPhraseDensity > 15) {
    remediation.push({
      issue: 'High AI phrase density',
      severity: 'high',
      fix: 'Remove transition-heavy phrasing (furthermore, moreover, additionally)',
    });
  }

  if (builtInResult.analysis?.burstiness < 40) {
    remediation.push({
      issue: 'Low burstiness (uniform sentence lengths)',
      severity: 'medium',
      fix: 'Mix short (3-8 word) and long (25+ word) sentences in each paragraph',
    });
  }

  return {
    overallScore,
    overallVerdict,
    detectors,
    radarData,
    modelAttribution: attributionResult,
    remediation,
  };
}
