#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { readJsonl, writeJson, writeJsonl } from "./lib/io.mjs";

function parseArgs(argv) {
  const options = {
    fixturePath: "data/papers/fixtures/smoke-papers.jsonl",
    outputRoot: "data/papers",
    count: 4,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fixture" && argv[i + 1]) options.fixturePath = argv[++i];
    else if (arg === "--output" && argv[i + 1]) options.outputRoot = argv[++i];
    else if (arg === "--count" && argv[i + 1]) {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed) && parsed > 0) options.count = Math.floor(parsed);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixturePath = path.resolve(process.cwd(), options.fixturePath);
  const outputRoot = path.resolve(process.cwd(), options.outputRoot);

  const all = await readJsonl(fixturePath);
  const selected = all.slice(0, options.count);

  const currentDatasetRoot = path.join(outputRoot, "datasets", "current");
  await writeJsonl(path.join(currentDatasetRoot, "papers.jsonl"), selected);

  const manifest = {
    pipelineVersion: "offline-few-seed-v1",
    runId: `offline-few-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    generatedAt: new Date().toISOString(),
    source: "fixture",
    stats: {
      availableFixtureCount: all.length,
      selectedCount: selected.length,
    },
    note: "Seeded current dataset from bundled open-source fixture due unavailable network source.",
  };

  await writeJson(path.join(currentDatasetRoot, "provenance.manifest.json"), manifest);

  console.log(
    JSON.stringify(
      {
        outputDatasetPath: path.join("data/papers", "datasets", "current", "papers.jsonl"),
        selectedCount: selected.length,
        sourceFixture: options.fixturePath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[papers:download-few] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
