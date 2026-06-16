#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { readJson, readJsonl, fileExists } from "../papers/lib/io.mjs";
import { sha256 } from "../papers/lib/hash.mjs";

function typeMatches(value, schemaType) {
  if (schemaType === "null") return value === null;
  if (schemaType === "integer") return Number.isInteger(value);
  if (schemaType === "number") return typeof value === "number" && Number.isFinite(value);
  if (schemaType === "string") return typeof value === "string";
  if (schemaType === "boolean") return typeof value === "boolean";
  if (schemaType === "array") return Array.isArray(value);
  if (schemaType === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return false;
}

function validateAgainstSchema(value, schema, location) {
  const allowedTypes = Array.isArray(schema?.type) ? schema.type : schema?.type ? [schema.type] : [];
  if (allowedTypes.length > 0) {
    assert.ok(
      allowedTypes.some((schemaType) => typeMatches(value, schemaType)),
      `${location}: expected type ${allowedTypes.join("|")}`
    );
  }

  if (Array.isArray(schema?.enum)) {
    assert.ok(schema.enum.includes(value), `${location}: value not in enum`);
  }

  if (typeof schema?.minimum === "number") {
    assert.ok(typeof value === "number" && value >= schema.minimum, `${location}: below minimum`);
  }

  if (typeof schema?.minLength === "number") {
    assert.ok(typeof value === "string" && value.length >= schema.minLength, `${location}: below minLength`);
  }

  if (Array.isArray(schema?.required)) {
    for (const key of schema.required) {
      assert.ok(value && Object.prototype.hasOwnProperty.call(value, key), `${location}: missing required key '${key}'`);
    }
  }

  if (schema?.properties && value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        validateAgainstSchema(value[key], propertySchema, `${location}.${key}`);
      }
    }
  }

  if (schema?.items && Array.isArray(value)) {
    value.forEach((entry, index) => validateAgainstSchema(entry, schema.items, `${location}[${index}]`));
  }
}

async function main() {
  const currentRoot = path.resolve(process.cwd(), "data/papers/analysis/current");
  const docsPath = path.join(currentRoot, "documents.features.jsonl");
  const summaryPath = path.join(currentRoot, "corpus.summary.json");
  const manifestPath = path.join(currentRoot, "run.manifest.json");
  const rowSchemaPath = path.resolve(process.cwd(), "data/papers/schemas/pr2-document-features.schema.json");
  const summarySchemaPath = path.resolve(process.cwd(), "data/papers/schemas/pr2-corpus-summary.schema.json");

  assert.equal(await fileExists(docsPath), true, "Missing PR2 documents.features.jsonl");
  assert.equal(await fileExists(summaryPath), true, "Missing PR2 corpus.summary.json");
  assert.equal(await fileExists(manifestPath), true, "Missing PR2 run.manifest.json");

  const rows = await readJsonl(docsPath);
  const summary = await readJson(summaryPath);
  const manifest = await readJson(manifestPath);
  const rowSchema = await readJson(rowSchemaPath);
  const summarySchema = await readJson(summarySchemaPath);

  assert.ok(rows.length > 0, "PR2 features rows must be non-empty");
  rows.forEach((row, index) => validateAgainstSchema(row, rowSchema, `documents.features[${index}]`));
  validateAgainstSchema(summary, summarySchema, "corpus.summary");

  const featureRowsHash = sha256(rows.map((row) => JSON.stringify(row)).join("\n"));
  assert.equal(summary.corpusSize, rows.length, "PR2 corpusSize must equal features row count");
  assert.equal(manifest.stats?.processedRecordCount, rows.length, "PR2 processedRecordCount must equal features row count");
  assert.equal(
    manifest.hashes?.corpusSummaryHash,
    summary.summaryHash,
    "PR2 manifest corpusSummaryHash must match corpus.summary summaryHash"
  );
  assert.equal(manifest.hashes?.featureRowsHash, featureRowsHash, "PR2 manifest featureRowsHash mismatch");

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId: manifest.runId,
        rowCount: rows.length,
        corpusSummaryHash: summary.summaryHash,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`[test:pr2-integrity] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
