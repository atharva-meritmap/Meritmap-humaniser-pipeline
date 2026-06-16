#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { sha256 } from "./lib/hash.mjs";
import { copyFile, ensureDir, fileExists, readJson, writeJson } from "./lib/io.mjs";

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function parseArgs(argv) {
  const args = {
    root: "data/papers",
    label: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--root" && argv[i + 1]) args.root = argv[++i];
    else if (arg === "--label" && argv[i + 1]) args.label = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(
    [
      "Dataset versioning (PR1)",
      "",
      "Usage:",
      "  node scripts/papers/version-dataset.mjs [--root <dir>] [--label <label>]",
      "",
      "Defaults:",
      "  --root data/papers",
    ].join("\n")
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const root = path.resolve(process.cwd(), args.root);
  const currentRoot = path.join(root, "datasets", "current");
  const papersPath = path.join(currentRoot, "papers.jsonl");
  const manifestPath = path.join(currentRoot, "provenance.manifest.json");

  if (!(await fileExists(papersPath)) || !(await fileExists(manifestPath))) {
    throw new Error("Current dataset files are missing. Run papers:ingest first.");
  }

  const currentManifest = await readJson(manifestPath);
  const version = args.label
    ? `${args.label}-${nowStamp()}`
    : `v${nowStamp()}`;

  const versionRoot = path.join(root, "datasets", "versions", version);
  await ensureDir(versionRoot);
  await copyFile(papersPath, path.join(versionRoot, "papers.jsonl"));
  await copyFile(manifestPath, path.join(versionRoot, "provenance.manifest.json"));

  const versionManifest = {
    version,
    createdAt: new Date().toISOString(),
    sourceRunId: currentManifest.runId,
    sourceDatasetHash: currentManifest?.hashes?.datasetHash || "",
    versionFingerprint: sha256(
      JSON.stringify({
        version,
        sourceRunId: currentManifest.runId,
        sourceDatasetHash: currentManifest?.hashes?.datasetHash || "",
      })
    ),
  };

  await writeJson(path.join(versionRoot, "version.manifest.json"), versionManifest);
  await writeJson(path.join(root, "datasets", "latest.json"), versionManifest);

  console.log(JSON.stringify(versionManifest, null, 2));
}

main().catch((error) => {
  console.error(`[papers:version] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
