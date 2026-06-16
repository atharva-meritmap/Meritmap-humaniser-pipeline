# Model Training Framework (PR4)

PR4 introduces deterministic model training, experiment tracking, checkpointing, and quality-gated evaluation for the PR3 benchmark.

## Commands

```bash
# Train baseline + advanced models
npm run model:train -- --config data/models/train.config.example.json

# Evaluate quality gate from current run manifest
npm run model:eval -- --manifest data/models/current/run.manifest.json
```

## Outputs

- `data/models/runs/<run-id>/baseline.model.json`
- `data/models/runs/<run-id>/advanced.model.json`
- `data/models/runs/<run-id>/metrics.report.json`
- `data/models/runs/<run-id>/checkpoints/epoch-*.json`
- `data/models/runs/<run-id>/run.manifest.json`
- `data/models/lineage/experiments.jsonl`
- `data/models/current/*` (latest pointers)

## Evaluation Suite

- Accuracy
- Precision / Recall / F1
- AUROC
- Calibration error (ECE)
- Brier score
- Domain robustness (per-domain accuracy)

## Reproducibility

- Deterministic data split by pair hash + seed
- Deterministic config hash recorded in each run manifest
- Quality thresholds encoded in config and enforced as fail gates
