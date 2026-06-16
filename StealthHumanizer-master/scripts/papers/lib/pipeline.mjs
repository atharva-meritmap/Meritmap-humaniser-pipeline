import path from "node:path";
import { deduplicateRecords } from "./dedupe.mjs";
import { evaluateRecord } from "./filters.mjs";
import { sha256 } from "./hash.mjs";
import { fetchOpenAlexRecords } from "./openalex.mjs";
import { ensureDir, writeJson, writeJsonl } from "./io.mjs";

function utcTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function summarizeFailures(recordsWithFailures) {
  const counts = {};
  for (const item of recordsWithFailures) {
    for (const reason of item.failures) {
      counts[reason] = (counts[reason] || 0) + 1;
    }
  }
  return counts;
}

export async function runIngestion(config, options) {
  const runId = options.runId || `ingest-${utcTimestamp()}`;
  const root = options.outputRoot;
  const rawRoot = path.join(root, "raw", runId);
  const currentDatasetRoot = path.join(root, "datasets", "current");
  await ensureDir(rawRoot);
  await ensureDir(currentDatasetRoot);

  const queries = Array.isArray(config.openAlexQueries) ? [...config.openAlexQueries] : [];
  queries.sort((a, b) => (a.query || "").localeCompare(b.query || ""));

  const fetchedByQuery = [];
  const rawRecords = [];

  for (const queryConfig of queries) {
    const fetched = await fetchOpenAlexRecords(queryConfig, {
      timeoutMs: config.requestTimeoutMs,
    });
    fetchedByQuery.push({
      query: queryConfig.query,
      fetched: fetched.length,
      pages: queryConfig.pages || 1,
      perPage: queryConfig.perPage || 100,
    });
    rawRecords.push(...fetched);
  }

  const { unique, duplicateCount, duplicateCountByKey } = deduplicateRecords(rawRecords);
  const passed = [];
  const rejected = [];

  for (const record of unique) {
    const evaluation = evaluateRecord(record, config.qualityGates || {});
    if (evaluation.passed) {
      passed.push(record);
    } else {
      rejected.push({
        id: record.id,
        doi: record.doi,
        title: record.title,
        failures: evaluation.failures,
      });
    }
  }

  const sortedPassed = [...passed].sort((a, b) => {
    const keyA = `${a.publicationYear || 0}|${a.doi || ""}|${a.id}`;
    const keyB = `${b.publicationYear || 0}|${b.doi || ""}|${b.id}`;
    return keyA.localeCompare(keyB);
  });

  const datasetHash = sha256(sortedPassed.map((r) => JSON.stringify(r)).join("\n"));
  const configHash = sha256(JSON.stringify(config));
  const manifest = {
    pipelineVersion: "pr1-data-foundation-v1",
    runId,
    generatedAt: new Date().toISOString(),
    source: "openalex",
    querySummary: fetchedByQuery,
    stats: {
      rawCount: rawRecords.length,
      deduplicatedCount: unique.length,
      duplicateCount,
      passedQualityCount: sortedPassed.length,
      rejectedCount: rejected.length,
      rejectionReasons: summarizeFailures(rejected),
    },
    hashes: {
      configHash,
      datasetHash,
    },
    compliance: {
      qualityGates: config.qualityGates || {},
    },
  };

  await writeJsonl(path.join(rawRoot, "records.raw.jsonl"), rawRecords);
  await writeJson(path.join(rawRoot, "duplicates.json"), duplicateCountByKey);
  await writeJsonl(path.join(rawRoot, "records.rejected.jsonl"), rejected);
  await writeJson(path.join(rawRoot, "manifest.json"), manifest);

  await writeJsonl(path.join(currentDatasetRoot, "papers.jsonl"), sortedPassed);
  await writeJson(path.join(currentDatasetRoot, "provenance.manifest.json"), {
    ...manifest,
    rawRunPath: path.relative(root, rawRoot),
  });

  return manifest;
}
