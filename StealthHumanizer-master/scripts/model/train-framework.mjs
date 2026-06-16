#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { computeClassificationMetrics } from "./lib/metrics.mjs";
import {
  deterministicSplit,
  prepareExamples,
  scoreRows,
  trainAdvancedLogistic,
  trainBaseline,
} from "./lib/training.mjs";
import { sha256 } from "../papers/lib/hash.mjs";
import { appendJsonl, ensureDir, readJson, readJsonl, writeJson, writeJsonl } from "../papers/lib/io.mjs";

function utcStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function parseArgs(argv) {
  const args = {
    config: "data/models/train.config.example.json",
    runId: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--config" && argv[i + 1]) args.config = argv[++i];
    else if (arg === "--run-id" && argv[i + 1]) args.runId = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function normalizeConfig(config) {
  return {
    benchmarkRowsPath: config.benchmarkRowsPath || "data/papers/benchmark/current/benchmark.rows.jsonl",
    outputRoot: config.outputRoot || "data/models",
    seed: config.seed || "stealthhumanizer-pr4-v1",
    threshold: config.threshold ?? 0.5,
    learningRate: config.learningRate ?? 0.05,
    epochs: config.epochs ?? 60,
    l2: config.l2 ?? 0.0005,
    minMetrics: {
      accuracy: config?.minMetrics?.accuracy ?? 0.55,
      f1: config?.minMetrics?.f1 ?? 0.55,
      auroc: config?.minMetrics?.auroc ?? 0.6,
    },
    failOnQualityDrop: config.failOnQualityDrop !== false,
  };
}

function assertMetricThresholds(metrics, minMetrics) {
  const failures = [];
  if (metrics.accuracy < minMetrics.accuracy) failures.push(`accuracy<${minMetrics.accuracy}`);
  if (metrics.f1 < minMetrics.f1) failures.push(`f1<${minMetrics.f1}`);
  if (metrics.auroc < minMetrics.auroc) failures.push(`auroc<${minMetrics.auroc}`);
  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/model/train-framework.mjs [--config <file>] [--run-id <id>]");
    return;
  }

  const configPath = path.resolve(process.cwd(), args.config);
  const config = normalizeConfig(await readJson(configPath));
  const runId = args.runId || `train-${utcStamp()}`;

  const benchmarkPath = path.resolve(process.cwd(), config.benchmarkRowsPath);
  const outputRoot = path.resolve(process.cwd(), config.outputRoot);
  const runRoot = path.join(outputRoot, "runs", runId);
  const checkpointsRoot = path.join(runRoot, "checkpoints");
  const currentRoot = path.join(outputRoot, "current");
  const lineageRoot = path.join(outputRoot, "lineage");
  await ensureDir(runRoot);
  await ensureDir(checkpointsRoot);
  await ensureDir(currentRoot);
  await ensureDir(lineageRoot);

  const rows = await readJsonl(benchmarkPath);
  const examples = prepareExamples(rows);
  const split = deterministicSplit(examples, config.seed);
  if (!split.train.length || !split.validation.length || !split.test.length) {
    throw new Error("Insufficient data split for train/validation/test. Increase benchmark size.");
  }

  const baselineModel = trainBaseline();
  const advancedModel = await trainAdvancedLogistic(
    split.train,
    config,
    async (checkpoint) => {
      if (checkpoint.epoch % 10 === 0 || checkpoint.epoch === config.epochs) {
        await writeJson(path.join(checkpointsRoot, `epoch-${String(checkpoint.epoch).padStart(3, "0")}.json`), checkpoint);
      }
    }
  );

  const baselineScores = scoreRows(split.test, baselineModel, config.threshold);
  const advancedScores = scoreRows(split.test, advancedModel, config.threshold);
  const baselineMetrics = computeClassificationMetrics(baselineScores);
  const advancedMetrics = computeClassificationMetrics(advancedScores);

  const metrics = {
    generatedAt: new Date().toISOString(),
    splitSizes: {
      train: split.train.length,
      validation: split.validation.length,
      test: split.test.length,
    },
    baseline: baselineMetrics,
    advanced: advancedMetrics,
  };
  const thresholdFailures = assertMetricThresholds(advancedMetrics, config.minMetrics);

  const runManifest = {
    frameworkVersion: "pr4-training-framework-v1",
    runId,
    generatedAt: new Date().toISOString(),
    config,
    benchmarkRowsPath: path.relative(process.cwd(), benchmarkPath),
    outputRoot: path.relative(process.cwd(), outputRoot),
    hashes: {
      configHash: sha256(JSON.stringify(config)),
      benchmarkHash: sha256(rows.map((row) => JSON.stringify(row)).join("\n")),
      metricsHash: sha256(JSON.stringify(metrics)),
    },
    qualityGate: {
      minMetrics: config.minMetrics,
      failedChecks: thresholdFailures,
      passed: thresholdFailures.length === 0,
    },
  };

  await writeJson(path.join(runRoot, "baseline.model.json"), baselineModel);
  await writeJson(path.join(runRoot, "advanced.model.json"), advancedModel);
  await writeJson(path.join(runRoot, "metrics.report.json"), metrics);
  await writeJson(path.join(runRoot, "run.manifest.json"), runManifest);
  await writeJsonl(path.join(runRoot, "test.predictions.jsonl"), advancedScores);

  await writeJson(path.join(currentRoot, "baseline.model.json"), baselineModel);
  await writeJson(path.join(currentRoot, "advanced.model.json"), advancedModel);
  await writeJson(path.join(currentRoot, "metrics.report.json"), metrics);
  await writeJson(path.join(currentRoot, "run.manifest.json"), runManifest);

  await appendJsonl(path.join(lineageRoot, "experiments.jsonl"), [
    {
      runId,
      generatedAt: runManifest.generatedAt,
      benchmarkRowsPath: runManifest.benchmarkRowsPath,
      metrics: {
        accuracy: advancedMetrics.accuracy,
        f1: advancedMetrics.f1,
        auroc: advancedMetrics.auroc,
      },
      qualityGatePassed: runManifest.qualityGate.passed,
    },
  ]);

  console.log(
    JSON.stringify(
      {
        runId,
        outputRoot: runManifest.outputRoot,
        qualityGate: runManifest.qualityGate,
        advancedMetrics: {
          accuracy: advancedMetrics.accuracy,
          f1: advancedMetrics.f1,
          auroc: advancedMetrics.auroc,
          calibrationError: advancedMetrics.calibrationError,
        },
      },
      null,
      2
    )
  );

  if (config.failOnQualityDrop && thresholdFailures.length > 0) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(`[model:train] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
