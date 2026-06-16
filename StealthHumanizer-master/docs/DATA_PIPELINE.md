# Data Pipeline (PR1 — Research/Data Foundation)

This repository now includes a reproducible ingestion and dataset-versioning workflow for open-access journal metadata.

For the next layer (full-text extraction + feature analysis), see `docs/FULLTEXT_ANALYSIS.md`.

## Scope of PR1

- Reproducible ingestion from open-access source APIs (OpenAlex)
- Metadata tracking and provenance manifest generation
- Compliance filters (license/open-access requirements)
- Deduplication and language/quality gates
- Dataset version snapshots with deterministic fingerprints

## Directory Layout

Generated outputs (ignored by git):

- `data/papers/raw/<run-id>/records.raw.jsonl`
- `data/papers/raw/<run-id>/records.rejected.jsonl`
- `data/papers/raw/<run-id>/duplicates.json`
- `data/papers/raw/<run-id>/manifest.json`
- `data/papers/datasets/current/papers.jsonl`
- `data/papers/datasets/current/provenance.manifest.json`
- `data/papers/datasets/versions/<version>/*`
- `data/papers/datasets/latest.json`

Tracked template:

- `data/papers/config.example.json`

## Commands

```bash
# Ingest and build current dataset from config
npm run papers:ingest -- --config data/papers/config.example.json --output data/papers

# Create immutable version snapshot from current dataset
npm run papers:version -- --root data/papers --label pr1
```

## Reproducibility

The ingestion pipeline records:

- Pipeline version
- Run ID and timestamp
- Query summary
- Quality/compliance gate configuration
- Config SHA-256 hash
- Dataset SHA-256 hash
- Rejection reason counts

Version snapshots record:

- Version ID
- Source run ID
- Source dataset hash
- Version fingerprint hash

## Quality & Compliance Gates

Default gates in `config.example.json`:

- Open-access required
- Journal article required
- DOI required
- License allowlist required
- English language allowlist
- Minimum abstract length
- Citation count threshold
- Publication year range

These thresholds are configurable in the config file.
