# Human vs AI Writing Signal Layer (PR3)

PR3 builds a labeled benchmark set from PR1 records, adds humanization/anti-pattern features, and validates label/data quality before PR4 training.

For PR4 training/evaluation, see `docs/MODEL_TRAINING_FRAMEWORK.md`.

## Scope of PR3

- Paired benchmark generation: `human_academic` + `ai_transformed`
- Deterministic synthetic transformation for counterpart generation
- Feature pipeline for humanization signals + anti-pattern metrics
- Validation checks for:
  - label allowlist integrity
  - pair completeness and duplicate labels
  - cross-pair text leakage
  - feature numeric integrity
  - class balance thresholds

## Commands

```bash
# Build PR3 benchmark from current PR1 dataset
npm run papers:benchmark -- --config data/papers/benchmark.config.example.json
```

Optional flags:

- `--run-id <id>` to set deterministic run identifier
- `--max-pairs <n>` to smoke-test with a smaller subset

## Output Layout

Generated outputs (ignored by git):

- `data/papers/benchmark/runs/<run-id>/benchmark.rows.jsonl`
- `data/papers/benchmark/runs/<run-id>/benchmark.summary.json`
- `data/papers/benchmark/runs/<run-id>/validation.report.json`
- `data/papers/benchmark/runs/<run-id>/run.manifest.json`
- `data/papers/benchmark/current/*` (latest pointers)

Tracked schemas:

- `data/papers/schemas/pr3-benchmark-row.schema.json`
- `data/papers/schemas/pr3-benchmark-summary.schema.json`
- `data/papers/schemas/pr3-validation-report.schema.json`

## Reproducibility

Each run records:

- run ID + timestamp
- source dataset path
- deterministic config hash
- benchmark row hash
- summary hash
- validation report hash
