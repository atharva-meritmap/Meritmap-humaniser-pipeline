#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function run(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      stdio: "pipe",
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} ${args.join(" ")} failed (${code})\n${stderr}`));
    });
  });
}

async function main() {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "download-few-smoke-"));
  const outputRoot = path.join(tmpRoot, "papers");

  await run("node", [
    "scripts/papers/download-few-open-source.mjs",
    "--count",
    "2",
    "--output",
    outputRoot,
    "--fixture",
    "data/papers/fixtures/smoke-papers.jsonl",
  ]);

  const datasetPath = path.join(outputRoot, "datasets", "current", "papers.jsonl");
  const manifestPath = path.join(outputRoot, "datasets", "current", "provenance.manifest.json");

  const datasetRaw = await fs.readFile(datasetPath, "utf8");
  const rows = datasetRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length !== 2) {
    throw new Error(`Expected 2 rows, received ${rows.length}`);
  }

  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest?.stats?.selectedCount !== 2) {
    throw new Error(`Expected manifest selectedCount=2, received ${manifest?.stats?.selectedCount}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        datasetPath,
        rowCount: rows.length,
        manifestSelectedCount: manifest?.stats?.selectedCount || 0,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[test:download-few] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
