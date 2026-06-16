#!/usr/bin/env node
import { spawn } from "node:child_process";

function parseArgs(argv) {
  const args = {
    ingestConfig: "data/papers/config.q1-oa-10k.json",
    benchmarkConfig: "data/papers/benchmark.q1-oa-10k.json",
    trainConfig: "data/models/train.q1-oa-10k.json",
    manifestPath: "data/models/current/run.manifest.json",
    attempts: 3,
    fallbackFewCount: 4,
    skipInstall: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--ingest-config" && argv[i + 1]) args.ingestConfig = argv[++i];
    else if (arg === "--benchmark-config" && argv[i + 1]) args.benchmarkConfig = argv[++i];
    else if (arg === "--train-config" && argv[i + 1]) args.trainConfig = argv[++i];
    else if (arg === "--manifest" && argv[i + 1]) args.manifestPath = argv[++i];
    else if (arg === "--attempts" && argv[i + 1]) {
      const value = Number(argv[++i]);
      if (Number.isFinite(value) && value >= 1) args.attempts = Math.floor(value);
    } else if (arg === "--fallback-few-count" && argv[i + 1]) {
      const value = Number(argv[++i]);
      if (Number.isFinite(value) && value >= 1) args.fallbackFewCount = Math.floor(value);
    } else if (arg === "--skip-install") args.skipInstall = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
  }

  return args;
}

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${cmdArgs.join(" ")} failed with code ${code}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`Usage: node scripts/papers/complete-ready-pipeline.mjs [options]

Options:
  --ingest-config <path>      Ingestion config (default: data/papers/config.q1-oa-10k.json)
  --benchmark-config <path>   Benchmark config (default: data/papers/benchmark.q1-oa-10k.json)
  --train-config <path>       Training config (default: data/models/train.q1-oa-10k.json)
  --manifest <path>           Eval manifest (default: data/models/current/run.manifest.json)
  --attempts <n>              Ingestion retry count for batch script (default: 3)
  --fallback-few-count <n>    Number of fallback seed papers (default: 4)
  --skip-install              Skip npm ci
`);
    return;
  }

  if (!args.skipInstall) {
    console.log("[ready] Step 1/3: npm ci");
    await run("npm", ["ci"]);
  } else {
    console.log("[ready] Step 1/3: skipped npm ci (--skip-install)");
  }

  console.log("[ready] Step 2/3: ingestion + benchmark build + training");
  await run("node", [
    "scripts/papers/batch-download-and-train.mjs",
    args.ingestConfig,
    args.benchmarkConfig,
    args.trainConfig,
    "--attempts",
    String(args.attempts),
    "--fallback-few-count",
    String(args.fallbackFewCount),
  ]);

  console.log("[ready] Step 3/3: evaluate trained run");
  await run("node", ["scripts/model/evaluate-framework.mjs", "--manifest", args.manifestPath]);

  console.log("[ready] Completed successfully.");
  console.log("[ready] Tip: keep large datasets in object storage (S3/GCS/HF), commit only configs/manifests to Git.");
}

main().catch((error) => {
  console.error(`[ready] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
