# Roadmap Gap Audit (PR1–PR9)

Audit date: 2026-04-09  
Base branch target: `master`  
Scope: PR1, PR2, PR3, PR5, PR6, PR7, PR8, PR9 roadmap closure targets

## Status Legend

- **Done**: implementation exists and is wired into repository workflows
- **Partial**: implementation exists but has closure gaps for production-grade readiness
- **Missing**: implementation not present

---

## PR1 — Research/Data Foundation

**Status:** Partial  
**Risk:** Medium

**File map (evidence):**
- `scripts/papers/ingest-open-access.mjs` — ingestion CLI entrypoint
- `scripts/papers/lib/openalex.mjs` — OpenAlex-only source integration and mapping
- `scripts/papers/lib/pipeline.mjs` — quality filtering, dedupe, manifest + dataset writes
- `scripts/papers/lib/filters.mjs` — OA/license/language/year/citation gates
- `scripts/papers/version-dataset.mjs` — immutable version snapshots + fingerprints
- `data/papers/config.example.json` — compliance gate defaults (OA + license allowlist)
- `docs/DATA_PIPELINE.md` — PR1 process and provenance docs

**Gap notes:**
- Source capture is open-access focused and provenance-aware, but source API result drift is not fully pinned to immutable upstream snapshots.
- Compliance is policy-driven, but strict “reproducible dataset versions” still depend on rerunnable external API state at ingest time.

---

## PR2 — Full-Text Processing & Analysis

**Status:** Partial  
**Risk:** Medium

**File map (evidence):**
- `scripts/papers/analyze-fulltext.mjs` — PR2 CLI entrypoint
- `scripts/papers/lib/pr2-pipeline.mjs` — analysis run orchestration + manifests
- `scripts/papers/lib/fulltext-extract.mjs` — PDF/DOCX/TXT/HTML extraction and normalization
- `scripts/papers/lib/feature-extract.mjs` — lexical/syntactic/stylistic features
- `scripts/papers/lib/corpus-analysis.mjs` — corpus summary generation
- `data/papers/schemas/pr2-document-features.schema.json` — row schema
- `data/papers/schemas/pr2-corpus-summary.schema.json` — summary schema
- `docs/FULLTEXT_ANALYSIS.md` — PR2 documentation

**Gap notes:**
- PR2 outputs are generated and schema files exist, but runtime schema validation enforcement is not wired as a fail gate.
- No dedicated CI quality gate currently verifies PR2 analysis outputs and schema conformity.

---

## PR3 — Human vs AI Signal Layer

**Status:** Done  
**Risk:** Low

**File map (evidence):**
- `scripts/papers/build-benchmark.mjs` — PR3 CLI entrypoint
- `scripts/papers/lib/pr3-pipeline.mjs` — paired benchmark construction + manifests
- `scripts/papers/lib/pr3-signals.mjs` — feature extraction for signal layer
- `scripts/papers/lib/pr3-transform.mjs` — deterministic counterpart generation
- `scripts/papers/lib/pr3-validate.mjs` — label/pair/leakage/numeric/class-balance checks
- `data/papers/schemas/pr3-benchmark-row.schema.json`
- `data/papers/schemas/pr3-benchmark-summary.schema.json`
- `data/papers/schemas/pr3-validation-report.schema.json`
- `docs/HUMAN_AI_SIGNAL_LAYER.md`

---

## PR5 — Humanization Optimization Engine

**Status:** Partial  
**Risk:** Medium

**File map (evidence):**
- `lib/server/humanization-governance.ts` — confidence report + rewrite regression guard
- `lib/server/model-runtime.ts` — runtime model-based human-likeness scoring
- `app/api/humanize/route.ts` — guard + confidence + runtime score integration
- `docs/HUMANIZATION_OPTIMIZATION.md` — PR5 behavior documentation

**Gap notes:**
- Optimization safeguards exist, but regression guard thresholds are not covered by dedicated automated tests and CI assertions.
- Current confidence calibration is heuristic and documented as directional rather than formally calibrated.

---

## PR6 — Production Integration

**Status:** Done  
**Risk:** Low

**File map (evidence):**
- `app/api/model-score/route.ts` — production scoring endpoint
- `app/api/humanize/route.ts` — production payload exposure (`confidenceReport`, runtime score, fallback data)
- `components/Humanizer.tsx` — UI exposure of confidence and fallback status
- `docs/PRODUCTION_GOVERNANCE.md` — PR6 integration documentation

---

## PR7 — Safety/Security/Governance

**Status:** Partial  
**Risk:** Medium

**File map (evidence):**
- `lib/server/humanization-governance.ts` — safety pattern gate + audit logging
- `app/api/humanize/route.ts` — policy enforcement and blocked-request response
- `docs/PRODUCTION_GOVERNANCE.md` — governance/audit disclosure
- `SECURITY.md` — repository security policy baseline

**Gap notes:**
- Core safety gate exists, but policy controls remain pattern/rule-based and need stronger governance hardening before broad production defaults.
- Audit log write is best-effort by design and not externally verified in CI.

---

## PR8 — CI/CD + Quality Bar

**Status:** Partial  
**Risk:** High

**File map (evidence):**
- `.github/workflows/ci.yml` — benchmark smoke, training smoke, eval gate, integration smoke, build job
- `scripts/tests/integration-smoke.mjs` — integration quality smoke check
- `scripts/model/evaluate-framework.mjs` — quality-gate fail behavior
- `package.json` — CI-invoked scripts

**Gap notes:**
- CI enforces key PR3/PR4 gates, but does not currently enforce linting or PR2 schema/data-integrity checks.
- Build reliability is environment-sensitive due remote Google Font fetch at build time (`app/layout.tsx` via `next/font`).

---

## PR9 — Documentation & Benchmark Publication

**Status:** Partial  
**Risk:** Medium

**File map (evidence):**
- `docs/BENCHMARK_METHODOLOGY.md` — methodology, reproducibility pack, limitations
- `docs/PRODUCTION_GOVERNANCE.md` — PR9 publication/governance positioning
- `docs/MODEL_TRAINING_FRAMEWORK.md` — deterministic training reproducibility
- `CONTRIBUTING.md` — benchmark/model contribution path

**Gap notes:**
- Documentation foundation is strong, but publication artifacts are still positioned as “planned expansion” in governance docs.
- Benchmark publication package is not yet fully formalized as a versioned, externally consumable benchmark card/release set.

---

## Current Remaining Gap Count (by roadmap item)

- PR1: 1 (partial closure)
- PR2: 1 (partial closure)
- PR3: 0
- PR5: 1 (partial closure)
- PR6: 0
- PR7: 1 (partial closure)
- PR8: 1 (partial closure)
- PR9: 1 (partial closure)

**Total remaining gaps:** 6
