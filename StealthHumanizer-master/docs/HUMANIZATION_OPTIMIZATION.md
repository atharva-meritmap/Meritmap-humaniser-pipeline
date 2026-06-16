# Humanization Optimization Engine (PR5)

PR5 adds model-guided optimization and regression guards in the API rewrite loop.

## Implemented behaviors

- Confidence reporting (`confidenceReport`) on final human-likeness score
- Runtime model scoring (`runtimeModelScore`) using trained model when available
- Rewrite regression guard:
  - lexical overlap threshold
  - length-ratio bounds
  - fallback to safer rewrite when guard fails

## Goals

- Improve detector-facing human-likeness signals
- Preserve meaning and avoid over-deformation of source text
- Surface optimization diagnostics for transparent tuning
