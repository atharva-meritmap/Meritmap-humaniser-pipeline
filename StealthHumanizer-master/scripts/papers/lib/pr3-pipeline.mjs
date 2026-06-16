import path from "node:path";
import { sha256 } from "./hash.mjs";
import { ensureDir, readJsonl, writeJson, writeJsonl } from "./io.mjs";
import { extractHumanizationSignals } from "./pr3-signals.mjs";
import { synthesizeAiTransformedText } from "./pr3-transform.mjs";
import { validateBenchmarkRows } from "./pr3-validate.mjs";
import { normalizeText } from "./text-normalization.mjs";

function utcStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizeConfig(config = {}) {
  return {
    inputDatasetPath: config.inputDatasetPath || "data/papers/datasets/current/papers.jsonl",
    outputRoot: config.outputRoot || "data/papers/benchmark",
    maxPairs: config.maxPairs ?? 1000,
    minTextChars: config.minTextChars ?? 350,
    allowedLabels: Array.isArray(config.allowedLabels) && config.allowedLabels.length
      ? config.allowedLabels
      : ["human_academic", "ai_transformed"],
    maxClassImbalance: config.maxClassImbalance ?? 0.1,
    failOnValidationError: config.failOnValidationError !== false,
  };
}

function pickHumanText(record) {
  const joined = [record.title || "", record.abstractText || "", record.fullText || ""]
    .filter(Boolean)
    .join("\n\n");
  return normalizeText(joined);
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarize(rows, context) {
  const labels = new Map();
  const domains = new Map();
  const signalByLabel = new Map();

  for (const row of rows) {
    labels.set(row.label, (labels.get(row.label) || 0) + 1);
    domains.set(row.domain, (domains.get(row.domain) || 0) + 1);

    const metrics = {
      lexicalDensity: row.features.humanizationSignals.lexicalDensity,
      typeTokenRatio: row.features.humanizationSignals.typeTokenRatio,
      sentenceLeadDiversity: row.features.humanizationSignals.sentenceLeadDiversity,
      transitionRatio: row.features.humanizationSignals.transitionRatio,
      trigramRepetitionRatio: row.features.antiPatterns.trigramRepetitionRatio,
      templateLeadRatio: row.features.antiPatterns.templateLeadRatio,
    };
    if (!signalByLabel.has(row.label)) signalByLabel.set(row.label, []);
    signalByLabel.get(row.label).push(metrics);
  }

  const signalAverages = {};
  for (const [label, values] of signalByLabel.entries()) {
    signalAverages[label] = {
      lexicalDensity: mean(values.map((v) => v.lexicalDensity)),
      typeTokenRatio: mean(values.map((v) => v.typeTokenRatio)),
      sentenceLeadDiversity: mean(values.map((v) => v.sentenceLeadDiversity)),
      transitionRatio: mean(values.map((v) => v.transitionRatio)),
      trigramRepetitionRatio: mean(values.map((v) => v.trigramRepetitionRatio)),
      templateLeadRatio: mean(values.map((v) => v.templateLeadRatio)),
    };
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    rowCount: rows.length,
    pairCount: rows.length / 2,
    classCounts: Object.fromEntries(labels.entries()),
    topDomains: [...domains.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 50)
      .map(([domain, count]) => ({ domain, count })),
    signalAveragesByLabel: signalAverages,
    provenance: context,
  };

  return {
    ...summary,
    summaryHash: sha256(JSON.stringify(summary)),
  };
}

function buildRow(record, pairId, label, text, inputPath, runId, transformKind) {
  const normalizedText = normalizeText(text);
  return {
    benchmarkVersion: "pr3-human-ai-signals-v1",
    pairId,
    sampleId: `${pairId}:${label}`,
    label,
    sourceType: "open_access_q1",
    sourceRecordId: record.id || "",
    doi: record.doi || "",
    title: record.title || "",
    domain: record.journal || "unknown",
    publicationYear: record.publicationYear || null,
    text: normalizedText,
    textHash: sha256(normalizedText),
    features: extractHumanizationSignals(normalizedText),
    provenance: {
      runId,
      inputDatasetPath: path.relative(process.cwd(), inputPath),
      transformation: transformKind,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function runBenchmarkBuild(userConfig = {}, options = {}) {
  const config = normalizeConfig(userConfig);
  const runId = options.runId || `benchmark-${utcStamp()}`;
  const inputPath = path.resolve(process.cwd(), config.inputDatasetPath);
  const outputRoot = path.resolve(process.cwd(), config.outputRoot);
  const runRoot = path.join(outputRoot, "runs", runId);
  const currentRoot = path.join(outputRoot, "current");
  await ensureDir(runRoot);
  await ensureDir(currentRoot);

  const records = await readJsonl(inputPath);
  const rows = [];

  for (const record of records) {
    if (rows.length / 2 >= config.maxPairs) break;
    const humanText = pickHumanText(record);
    if (humanText.length < config.minTextChars) continue;

    const sourceKey = `${record.id || ""}|${record.doi || ""}|${record.title || ""}|${rows.length}`;
    const pairId = sha256(sourceKey).slice(0, 16);
    const aiText = synthesizeAiTransformedText(humanText);

    rows.push(
      buildRow(record, pairId, "human_academic", humanText, inputPath, runId, "source"),
      buildRow(record, pairId, "ai_transformed", aiText, inputPath, runId, "deterministic-rewrite-v1")
    );
  }

  const validationReport = validateBenchmarkRows(rows, {
    allowedLabels: config.allowedLabels,
    maxClassImbalance: config.maxClassImbalance,
  });
  const summary = summarize(rows, {
    runId,
    inputDatasetPath: path.relative(process.cwd(), inputPath),
    maxPairs: config.maxPairs,
    minTextChars: config.minTextChars,
    configHash: sha256(JSON.stringify(config)),
  });

  const manifest = {
    pipelineVersion: "pr3-human-ai-signal-layer-v1",
    runId,
    generatedAt: new Date().toISOString(),
    outputRoot: path.relative(process.cwd(), outputRoot),
    inputDatasetPath: path.relative(process.cwd(), inputPath),
    config,
    stats: {
      inputRecordCount: records.length,
      benchmarkRowCount: rows.length,
      benchmarkPairCount: rows.length / 2,
      validationPassed: validationReport.passed,
      classCounts: validationReport.stats.classCounts,
    },
    hashes: {
      benchmarkRowsHash: sha256(rows.map((row) => JSON.stringify(row)).join("\n")),
      summaryHash: summary.summaryHash,
      validationReportHash: sha256(JSON.stringify(validationReport)),
      configHash: sha256(JSON.stringify(config)),
    },
  };

  await writeJsonl(path.join(runRoot, "benchmark.rows.jsonl"), rows);
  await writeJson(path.join(runRoot, "benchmark.summary.json"), summary);
  await writeJson(path.join(runRoot, "validation.report.json"), validationReport);
  await writeJson(path.join(runRoot, "run.manifest.json"), manifest);

  await writeJsonl(path.join(currentRoot, "benchmark.rows.jsonl"), rows);
  await writeJson(path.join(currentRoot, "benchmark.summary.json"), summary);
  await writeJson(path.join(currentRoot, "validation.report.json"), validationReport);
  await writeJson(path.join(currentRoot, "run.manifest.json"), manifest);

  if (!validationReport.passed && config.failOnValidationError) {
    throw new Error("Benchmark validation failed. Check validation.report.json for details.");
  }

  return manifest;
}
