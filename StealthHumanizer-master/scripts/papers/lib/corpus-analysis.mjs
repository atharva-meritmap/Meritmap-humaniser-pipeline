import { sha256 } from "./hash.mjs";

function aggregateNumeric(values) {
  if (!values.length) return { count: 0, min: 0, max: 0, mean: 0, stdDev: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { count: values.length, min, max, mean, stdDev: Math.sqrt(variance) };
}

function topMapEntries(map, limit = 30) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export function buildCorpusSummary(featureRows, manifestInput) {
  const tokenCounts = [];
  const sentenceCounts = [];
  const paragraphCounts = [];
  const ttrValues = [];
  const lexicalDensity = [];
  const sentenceStdDev = [];
  const passiveRatios = [];
  const contractionRatios = [];
  const transitionRatios = [];
  const questionRatios = [];
  const exclamationRatios = [];

  const statusCounts = new Map();
  const sourceKindCounts = new Map();
  const journals = new Map();
  const years = new Map();
  const keywordFreq = new Map();

  for (const row of featureRows) {
    const extraction = row.extraction || {};
    const features = row.features || {};
    const segmentation = features.segmentation || {};
    const tokenStats = features.tokenStats || {};
    const lexical = features.lexicalFeatures || {};
    const syntactic = features.syntacticFeatures || {};
    const stylistic = features.stylisticFeatures || {};

    const status = extraction.status || "unknown";
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    const sourceKind = extraction.sourceKind || "unknown";
    sourceKindCounts.set(sourceKind, (sourceKindCounts.get(sourceKind) || 0) + 1);
    if (row.journal) journals.set(row.journal, (journals.get(row.journal) || 0) + 1);
    if (row.publicationYear) years.set(row.publicationYear, (years.get(row.publicationYear) || 0) + 1);

    tokenCounts.push(tokenStats.tokenCount || 0);
    sentenceCounts.push(segmentation.sentenceCount || 0);
    paragraphCounts.push(segmentation.paragraphCount || 0);
    ttrValues.push(tokenStats.typeTokenRatio || 0);
    lexicalDensity.push(lexical.lexicalDensity || 0);
    sentenceStdDev.push(syntactic.sentenceLengthStdDev || 0);
    passiveRatios.push(syntactic.passiveVoiceApproxRatio || 0);
    contractionRatios.push(stylistic.contractionRatio || 0);
    transitionRatios.push(stylistic.transitionRatio || 0);
    questionRatios.push(stylistic.questionSentenceRatio || 0);
    exclamationRatios.push(stylistic.exclamationSentenceRatio || 0);

    for (const keyword of lexical.topKeywords || []) {
      keywordFreq.set(keyword.token, (keywordFreq.get(keyword.token) || 0) + (keyword.count || 0));
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    corpusSize: featureRows.length,
    extractionStatus: Object.fromEntries(statusCounts.entries()),
    extractionSourceKinds: Object.fromEntries(sourceKindCounts.entries()),
    distributions: {
      tokenCount: aggregateNumeric(tokenCounts),
      sentenceCount: aggregateNumeric(sentenceCounts),
      paragraphCount: aggregateNumeric(paragraphCounts),
      typeTokenRatio: aggregateNumeric(ttrValues),
      lexicalDensity: aggregateNumeric(lexicalDensity),
      sentenceLengthStdDev: aggregateNumeric(sentenceStdDev),
      passiveVoiceApproxRatio: aggregateNumeric(passiveRatios),
      contractionRatio: aggregateNumeric(contractionRatios),
      transitionRatio: aggregateNumeric(transitionRatios),
      questionSentenceRatio: aggregateNumeric(questionRatios),
      exclamationSentenceRatio: aggregateNumeric(exclamationRatios),
    },
    topKeywords: topMapEntries(keywordFreq, 100).map((item) => ({
      token: item.key,
      count: item.count,
    })),
    topJournals: topMapEntries(journals, 30).map((item) => ({
      journal: item.key,
      count: item.count,
    })),
    publicationYearHistogram: topMapEntries(years, 100).map((item) => ({
      publicationYear: Number(item.key),
      count: item.count,
    })),
    provenance: manifestInput,
  };

  return {
    ...summary,
    summaryHash: sha256(JSON.stringify(summary)),
  };
}
