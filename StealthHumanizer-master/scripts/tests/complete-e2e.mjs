#!/usr/bin/env node
import path from "node:path";
import { spawn } from "node:child_process";
import { fileExists, readJson } from "../papers/lib/io.mjs";

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function run(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

function runNpm(script, args = []) {
  return run("npm", ["run", script, "--", ...args]);
}

async function maybeIngestAndVersion(runId) {
  try {
    await runNpm("papers:ingest", [
      "--config",
      "data/papers/config.example.json",
      "--output",
      "data/papers",
      "--run-id",
      runId,
    ]);
    await runNpm("papers:version", ["--root", "data/papers", "--label", "complete-e2e"]);
    return { usedSmokeFallback: false };
  } catch (error) {
    console.warn(`[complete:e2e] ingest failed, using smoke fallback: ${error instanceof Error ? error.message : String(error)}`);
    return { usedSmokeFallback: true };
  }
}

async function countDatasetRows(datasetPath) {
  if (!(await fileExists(datasetPath))) return 0;
  const fs = await import("node:fs/promises");
  const content = await fs.readFile(datasetPath, "utf8");
  return content.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

async function main() {
  const runId = `complete-e2e-${timestampId()}`;
  const ingest = await maybeIngestAndVersion(runId);

  const benchmarkConfig = ingest.usedSmokeFallback
    ? "data/papers/benchmark.smoke.config.json"
    : "data/papers/benchmark.config.example.json";
  const trainConfig = ingest.usedSmokeFallback
    ? "data/models/train.smoke.config.json"
    : "data/models/train.config.example.json";

  await runNpm("papers:benchmark", ["--config", benchmarkConfig, "--run-id", runId]);
  await runNpm("model:train", ["--config", trainConfig, "--run-id", runId]);
  await runNpm("model:eval", ["--manifest", "data/models/current/run.manifest.json"]);

  const benchmarkManifestPath = path.resolve(process.cwd(), "data/papers/benchmark/current/run.manifest.json");
  const modelManifestPath = path.resolve(process.cwd(), "data/models/current/run.manifest.json");
  const metricsReportPath = path.resolve(process.cwd(), "data/models/current/metrics.report.json");
  const datasetManifestPath = path.resolve(process.cwd(), "data/papers/datasets/current/provenance.manifest.json");
  const datasetPath = path.resolve(process.cwd(), "data/papers/datasets/current/papers.jsonl");

  const benchmark = await readJson(benchmarkManifestPath);
  const model = await readJson(modelManifestPath);
  const metricsReport = (await fileExists(metricsReportPath)) ? await readJson(metricsReportPath) : null;
  const datasetRows = await countDatasetRows(datasetPath);

  let downloadedPapers = 0;
  if (!ingest.usedSmokeFallback && (await fileExists(datasetManifestPath))) {
    const datasetManifest = await readJson(datasetManifestPath);
    downloadedPapers = datasetManifest?.stats?.passedQualityCount || datasetRows;
  }

  const report = {
    ok: true,
    runId,
    usedSmokeFallback: ingest.usedSmokeFallback,
    papersDownloaded: ingest.usedSmokeFallback ? 0 : downloadedPapers,
    datasetRowsAvailable: ingest.usedSmokeFallback ? benchmark?.stats?.inputRecordCount || datasetRows : datasetRows,
    benchmarkPairCount: benchmark?.stats?.benchmarkPairCount || 0,
    modelRunId: model?.runId || null,
    qualityGatePassed: Boolean(model?.qualityGate?.passed),
    trainingMetrics: metricsReport?.advanced || null,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(`[complete:e2e] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
