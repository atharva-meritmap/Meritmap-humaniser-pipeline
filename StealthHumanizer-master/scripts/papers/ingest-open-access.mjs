#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { readJson } from "./lib/io.mjs";
import { runIngestion } from "./lib/pipeline.mjs";

function parseArgs(argv) {
  const args = {
    config: "data/papers/config.example.json",
    output: "data/papers",
    runId: "",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--config" && argv[i + 1]) args.config = argv[++i];
    else if (arg === "--output" && argv[i + 1]) args.output = argv[++i];
    else if (arg === "--run-id" && argv[i + 1]) args.runId = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(
    [
      "Open-access paper ingestion (PR1)",
      "",
      "Usage:",
      "  node scripts/papers/ingest-open-access.mjs [--config <file>] [--output <dir>] [--run-id <id>]",
      "",
      "Defaults:",
      "  --config data/papers/config.example.json",
      "  --output data/papers",
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
  const outputRoot = path.resolve(process.cwd(), args.output);
  const config = await readJson(configPath);

  const manifest = await runIngestion(config, {
    outputRoot,
    runId: args.runId,
  });

  console.log(
    JSON.stringify(
      {
        runId: manifest.runId,
        generatedAt: manifest.generatedAt,
        stats: manifest.stats,
        outputRoot,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[papers:ingest] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
