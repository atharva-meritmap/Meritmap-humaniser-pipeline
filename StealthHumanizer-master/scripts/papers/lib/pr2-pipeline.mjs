import path from "node:path";
import { buildCorpusSummary } from "./corpus-analysis.mjs";
import { extractDocumentFeatures } from "./feature-extract.mjs";
import { extractNormalizedFullText } from "./fulltext-extract.mjs";
import { sha256 } from "./hash.mjs";
import { ensureDir, readJsonl, writeJson, writeJsonl } from "./io.mjs";

function utcStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizeConfig(config) {
  return {
    inputDatasetPath: config.inputDatasetPath || "data/papers/datasets/current/papers.jsonl",
    outputRoot: config.outputRoot || "data/papers/analysis",
    localRoot: config.localRoot || process.cwd(),
    fetchTimeoutMs: config.fetchTimeoutMs ?? 20_000,
    minExtractedChars: config.minExtractedChars ?? 500,
    allowNetworkFetch: config.allowNetworkFetch !== false,
    maxDocuments: config.maxDocuments ?? 0,
  };
}

export async function runFullTextAnalysis(userConfig = {}, options = {}) {
  const config = normalizeConfig(userConfig);
  const runId = options.runId || `analysis-${utcStamp()}`;
  const inputPath = path.resolve(process.cwd(), config.inputDatasetPath);
  const outputRoot = path.resolve(process.cwd(), config.outputRoot);
  const runRoot = path.join(outputRoot, "runs", runId);
  const currentRoot = path.join(outputRoot, "current");
  await ensureDir(runRoot);
  await ensureDir(currentRoot);

  const records = await readJsonl(inputPath);
  const selected = config.maxDocuments > 0 ? records.slice(0, config.maxDocuments) : records;
  const featureRows = [];

  for (const record of selected) {
    const extraction = await extractNormalizedFullText(record, config);
    const features = extractDocumentFeatures(extraction.normalizedText || "");
    featureRows.push({
      id: record.id || "",
      doi: record.doi || "",
      title: record.title || "",
      publicationYear: record.publicationYear || null,
      journal: record.journal || "",
      extraction: {
        status: extraction.status,
        sourceKind: extraction.sourceKind,
        sourceRef: extraction.sourceRef,
        textType: extraction.textType,
        charCount: extraction.charCount,
        errors: extraction.errors,
      },
      features,
      normalizedTextPreview: (extraction.normalizedText || "").slice(0, 800),
      normalizedTextHash: sha256(extraction.normalizedText || ""),
    });
  }

  const corpusSummary = buildCorpusSummary(featureRows, {
    runId,
    inputDatasetPath: path.relative(process.cwd(), inputPath),
    recordCount: selected.length,
    configHash: sha256(JSON.stringify(config)),
  });

  const runManifest = {
    pipelineVersion: "pr2-full-text-analysis-v1",
    runId,
    generatedAt: new Date().toISOString(),
    inputDatasetPath: path.relative(process.cwd(), inputPath),
    outputRoot: path.relative(process.cwd(), outputRoot),
    config,
    stats: {
      inputRecordCount: records.length,
      processedRecordCount: selected.length,
      extractionStatus: corpusSummary.extractionStatus,
    },
    hashes: {
      featureRowsHash: sha256(featureRows.map((row) => JSON.stringify(row)).join("\n")),
      corpusSummaryHash: corpusSummary.summaryHash,
      configHash: sha256(JSON.stringify(config)),
    },
  };

  await writeJsonl(path.join(runRoot, "documents.features.jsonl"), featureRows);
  await writeJson(path.join(runRoot, "corpus.summary.json"), corpusSummary);
  await writeJson(path.join(runRoot, "run.manifest.json"), runManifest);

  await writeJsonl(path.join(currentRoot, "documents.features.jsonl"), featureRows);
  await writeJson(path.join(currentRoot, "corpus.summary.json"), corpusSummary);
  await writeJson(path.join(currentRoot, "run.manifest.json"), runManifest);

  return runManifest;
}
