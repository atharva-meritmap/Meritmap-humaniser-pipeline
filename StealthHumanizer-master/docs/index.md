# StealthHumanizer Documentation

Welcome to the official documentation for StealthHumanizer.

## What's New in v2.1

StealthHumanizer v2.1 introduces the **style-aware humanization engine** —
built from analysis of academic writing patterns. The engine uses statistical
writing metrics (sentence length, burstiness, vocabulary diversity, transition
frequency) to calibrate rewrite prompts and detection thresholds dynamically.

See [STYLE_ENGINE.md](./STYLE_ENGINE.md) and
[HUMAN_AI_SIGNAL_LAYER.md](./HUMAN_AI_SIGNAL_LAYER.md) for technical details.

## Start Here

- [Getting Started](./getting-started.md)
- [Configuration](./configuration.md)
- [API Reference](./api-reference.md)
- [Examples](./examples.md)
- [FAQ](./faq.md)
- [Contributing](./contributing.md)

## What StealthHumanizer Provides

- Humanization workflows with adjustable rewrite controls and corpus-aware
  style matching.
- Multi-provider support for text generation backends (13 providers).
- Built-in detection and readability feedback with dynamic calibrated thresholds.
- Reproducible benchmark and model-evaluation script pipeline.

## Additional Technical Guides

- [Data Pipeline](./DATA_PIPELINE.md)
- [Full-text Analysis](./FULLTEXT_ANALYSIS.md)
- [Human-AI Signal Layer](./HUMAN_AI_SIGNAL_LAYER.md)
- [Model Training Framework](./MODEL_TRAINING_FRAMEWORK.md)
- [Humanization Optimization](./HUMANIZATION_OPTIMIZATION.md)
- [Production Governance](./PRODUCTION_GOVERNANCE.md)
- [Benchmark Methodology](./BENCHMARK_METHODOLOGY.md)
