#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileExists, readJson } from "../papers/lib/io.mjs";

function runNpmScript(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", script, "--", ...args], {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`npm run ${script} failed with exit code ${code}`));
    });
  });
}

async function ensureSmokeArtifacts(benchmarkManifestPath, modelManifestPath) {
  const hasBenchmark = await fileExists(benchmarkManifestPath);
  if (!hasBenchmark) {
    await runNpmScript("papers:benchmark", [
      "--config",
      "data/papers/benchmark.smoke.config.json",
      "--run-id",
      "integration-smoke-auto",
    ]);
  }

  const hasModel = await fileExists(modelManifestPath);
  if (!hasModel) {
    await runNpmScript("model:train", [
      "--config",
      "data/models/train.smoke.config.json",
      "--run-id",
      "integration-smoke-auto",
    ]);
  }
}

async function main() {
  const benchmarkManifestPath = path.resolve(process.cwd(), "data/papers/benchmark/current/run.manifest.json");
  const modelManifestPath = path.resolve(process.cwd(), "data/models/current/run.manifest.json");

  await ensureSmokeArtifacts(benchmarkManifestPath, modelManifestPath);

  assert.equal(await fileExists(benchmarkManifestPath), true, "Missing benchmark current manifest.");
  assert.equal(await fileExists(modelManifestPath), true, "Missing model current manifest.");

  const benchmark = await readJson(benchmarkManifestPath);
  const model = await readJson(modelManifestPath);
  assert.ok((benchmark?.stats?.benchmarkPairCount || 0) > 0, "Benchmark pair count must be > 0.");
  assert.equal(typeof model?.qualityGate?.passed, "boolean", "Model quality gate result missing.");

  console.log(
    JSON.stringify(
      {
        ok: true,
        benchmarkRunId: benchmark.runId,
        modelRunId: model.runId,
        qualityGatePassed: model.qualityGate.passed,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[test:integration] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
