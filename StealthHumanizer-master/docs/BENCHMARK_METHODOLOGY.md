# Benchmark Methodology & Limitations (PR9)

## Method Overview

1. Start from PR1 open-access academic records with provenance.
2. Build PR3 paired samples:
   - `human_academic`: normalized source text
   - `ai_transformed`: deterministic transformation counterpart
3. Extract signal and anti-pattern features.
4. Validate labels, class balance, leakage, and feature integrity.
5. Train/evaluate PR4 models under deterministic splits and quality gates.

## Reproducibility Pack

- Configs:
  - `data/papers/benchmark.config.example.json`
  - `data/models/train.config.example.json`
- Smoke reproducibility:
  - `data/papers/benchmark.smoke.config.json`
  - `data/models/train.smoke.config.json`
  - `data/papers/fixtures/smoke-papers.jsonl`
- Run artifacts:
  - PR3 run manifests + validation reports
  - PR4 run manifests + checkpoints + metrics

## Known Limitations

- Synthetic counterpart generation is deterministic and template-driven; it is not a full proxy for all LLM families.
- Current training baseline is lightweight and designed for reproducibility and CI smoke gating, not SOTA ranking performance.
- Confidence reporting is heuristic-calibrated and should be interpreted as directional.
- Safety policy rules are pattern-based and require continuous tuning to reduce false positives/negatives.

## Responsible Use

- Do not use the system for deception, impersonation, or academic misconduct.
- Use generated text for editing support, readability improvements, and style adaptation with proper attribution and policy compliance.
