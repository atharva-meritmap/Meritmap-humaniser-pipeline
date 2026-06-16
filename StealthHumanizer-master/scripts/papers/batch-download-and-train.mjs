#!/usr/bin/env node
import { spawn } from "node:child_process";

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const options = {
    ingestConfig: "data/papers/config.q1-oa-10k.json",
    benchmarkConfig: "data/papers/benchmark.q1-oa-10k.json",
    trainConfig: "data/models/train.q1-oa-10k.json",
    attempts: 3,
    fallbackFewCount: 4,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--attempts" && argv[i + 1]) {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed) && parsed >= 1) options.attempts = Math.floor(parsed);
    } else if (arg === "--fallback-few-count" && argv[i + 1]) {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed) && parsed >= 1) options.fallbackFewCount = Math.floor(parsed);
    } else {
      positional.push(arg);
    }
  }

  if (positional[0]) options.ingestConfig = positional[0];
  if (positional[1]) options.benchmarkConfig = positional[1];
  if (positional[2]) options.trainConfig = positional[2];
  return options;
}

async function runIngestWithRetry(ingestConfig, attempts) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    console.log(`[batch] Ingestion attempt ${attempt}/${attempts}`);
    try {
      await run("node", ["scripts/papers/ingest-open-access.mjs", "--config", ingestConfig, "--output", "data/papers"]);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[batch] Ingestion attempt ${attempt} failed: ${message}`);
      if (attempt < attempts) {
        const waitMs = attempt * 2000;
        console.log(`[batch] Waiting ${waitMs}ms before retry...`);
        await sleep(waitMs);
      }
    }
  }
  return false;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  let benchmarkConfigToUse = options.benchmarkConfig;
  let trainConfigToUse = options.trainConfig;

  console.log("[batch] Step 1/4: ingest open-access papers");
  const ingestOk = await runIngestWithRetry(options.ingestConfig, options.attempts);

  if (!ingestOk) {
    console.warn("[batch] All ingestion attempts failed. Seeding a few bundled open-source papers.");
    await run("node", ["scripts/papers/download-few-open-source.mjs", "--count", String(options.fallbackFewCount)]);
    benchmarkConfigToUse = "data/papers/benchmark.smoke.config.json";
    trainConfigToUse = "data/models/train.smoke.config.json";
  }

  console.log("[batch] Step 2/4: build benchmark pairs");
  await run("node", ["scripts/papers/build-benchmark.mjs", "--config", benchmarkConfigToUse]);

  console.log("[batch] Step 3/4: train model");
  await run("node", ["scripts/model/train-framework.mjs", "--config", trainConfigToUse]);

  console.log("[batch] Step 4/4: done");
  console.log("[batch] Completed ingestion + benchmark + training.");
}

main().catch((error) => {
  console.error(`[batch] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
