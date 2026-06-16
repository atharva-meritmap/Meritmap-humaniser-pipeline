#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { readJson } from "./lib/io.mjs";
import { runFullTextAnalysis } from "./lib/pr2-pipeline.mjs";

function parseArgs(argv) {
  const args = {
    config: "data/papers/analysis.config.example.json",
    runId: "",
    maxDocuments: "",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--config" && argv[i + 1]) args.config = argv[++i];
    else if (arg === "--run-id" && argv[i + 1]) args.runId = argv[++i];
    else if (arg === "--max-documents" && argv[i + 1]) args.maxDocuments = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(
    [
      "Full-text processing and analysis pipeline (PR2)",
      "",
      "Usage:",
      "  node scripts/papers/analyze-fulltext.mjs [--config <file>] [--run-id <id>] [--max-documents <n>]",
      "",
      "Defaults:",
      "  --config data/papers/analysis.config.example.json",
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
    maxDocuments: args.maxDocuments ? Number(args.maxDocuments) : config.maxDocuments,
  };

  const manifest = await runFullTextAnalysis(mergedConfig, {
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
  console.error(`[papers:analyze] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
