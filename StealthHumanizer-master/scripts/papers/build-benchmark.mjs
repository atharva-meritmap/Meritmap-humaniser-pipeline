#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { readJson } from "./lib/io.mjs";
import { runBenchmarkBuild } from "./lib/pr3-pipeline.mjs";

function parseArgs(argv) {
  const args = {
    config: "data/papers/benchmark.config.example.json",
    runId: "",
    maxPairs: "",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--config" && argv[i + 1]) args.config = argv[++i];
    else if (arg === "--run-id" && argv[i + 1]) args.runId = argv[++i];
    else if (arg === "--max-pairs" && argv[i + 1]) args.maxPairs = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(
    [
      "Human vs AI benchmark builder (PR3)",
      "",
      "Usage:",
      "  node scripts/papers/build-benchmark.mjs [--config <file>] [--run-id <id>] [--max-pairs <n>]",
      "",
      "Defaults:",
      "  --config data/papers/benchmark.config.example.json",
    ].join("\n")
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const configPath = path.resolve(process.cwd(), args.config);
  const config = await readJson(configPath);
  const mergedConfig = {
    ...config,
    maxPairs: args.maxPairs ? Number(args.maxPairs) : config.maxPairs,
  };

  const manifest = await runBenchmarkBuild(mergedConfig, {
    runId: args.runId,
  });

  console.log(
    JSON.stringify(
      {
        runId: manifest.runId,
        generatedAt: manifest.generatedAt,
        stats: manifest.stats,
        outputRoot: manifest.outputRoot,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[papers:benchmark] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
