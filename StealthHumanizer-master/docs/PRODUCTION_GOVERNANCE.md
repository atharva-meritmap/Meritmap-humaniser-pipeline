# Production Integration, Safety, and Governance (PR6 + PR7 + PR9)

This layer adds production-serving hooks, policy controls, CI quality gates, and publication-ready governance artifacts.

## PR6 — Production Integration

- New endpoint: `POST /api/model-score`
  - Returns runtime human-likeness score from trained model (or fallback model).
- Existing `POST /api/humanize` now includes:
  - `confidenceReport`
  - `runtimeModelScore`
  - `fallbackBehavior`
  - `provenanceDisclosure`
- UI now surfaces confidence and fallback-guard status.

## PR7 — Safety, Security, Governance

- Abuse-prevention policy gate blocks deceptive/impersonation-focused intents.
- Safe-use guidance returned on blocked requests.
- Audit logs written to:
  - `data/governance/audit/humanization-events.jsonl`
- Provenance disclosure fields returned in API output for transparency.

## PR8 — CI/CD Quality Bar

CI now includes:

- PR3 benchmark smoke build
- PR4 training smoke run
- model quality gate enforcement
- integration smoke checks
- build job with dependency on data/model quality jobs

## PR9 — Benchmark Publication & Reproducibility

Current benchmark publication artifacts:

- PR3 schema set + validation reports
- PR4 run manifests + lineage logs
- smoke configs and fixture corpus for reproducible CI checks

Planned publication expansion:

- domain-limited benchmark cards
- benchmark limitations and known bias statements
- contribution workflow for benchmark evolution
