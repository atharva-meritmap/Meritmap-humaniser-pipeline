# Meritmap Q1 Manuscript Refinement Engine

A production-grade pipeline that transforms AI-generated LaTeX manuscripts into Q1/Q2 journal-ready academic papers. Targets Turnitin, GPTZero, and Originality.ai detection evasion while preserving 100% of scientific content — facts, citations, equations, and LaTeX structure.

---

## What It Does

Takes a `.tex` file written (fully or partially) by an AI and outputs a humanised `.tex` file that:

- Passes AI detection tools at the statistical signal level, not just surface vocabulary
- Preserves every number, percentage, citation key, equation, p-value, method name, and dataset reference verbatim
- Meets Q1/Q2 structural requirements (section completeness, compliance statements, citation verification)
- Produces a detailed quality report with before/after scores, readability metrics, and journal recommendations

---

## Repository Layout

```
Meritmap humaniser pipeline/
│
├── src/q1_engine/           ← The engine (this project)
├── config/                  ← YAML profiles for journals, domains, voices, prompts
├── .env                     ← LLM provider + model config
├── pyproject.toml           ← Python package definition
│
├── StealthHumanizer-master/ ← Reference: open-source Next.js humaniser web app
├── humanize-text-main/      ← Reference: Python humanisation library
└── humanize-main/           ← Reference: Jekyll documentation site
```

The only code that belongs to this project is `src/q1_engine/` and `config/`. The three subdirectories are third-party reference implementations included for research.

---

## Installation

Requires Python 3.12+.

```bash
pip install -e ".[dev]"
```

Download the spaCy model:

```bash
python -m spacy download en_core_web_lg
```

For local LLM support, install [Ollama](https://ollama.com) and pull a model:

```bash
ollama pull qwen2.5:14b
```

---

## Quick Start

```bash
# Run the full 8-stage pipeline
q1-engine input.tex -o output_humanised.tex --report-json report.json

# Antigravity mode (faster, fewer LLM calls)
q1-engine input.tex -o output.tex --mode antigravity

# Run only stages 1–5 (skip citation auth and assembly)
q1-engine input.tex --stages 1-5

# Skip citation verification (faster)
q1-engine input.tex --skip-citations

# Force a domain and voice profile
q1-engine input.tex --domain medicine --voice-profile balanced_scholar

# Verbose logging
q1-engine input.tex -v
```

---

## Configuration

Priority order (highest wins):

1. Environment variables (`Q1_LLM__MODEL=qwen3:72b`)
2. User config YAML (`-c my_config.yaml`)
3. `config/default.yaml`
4. Pydantic defaults

### `.env` File

```env
# LLM provider — pick one
GEMINI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here
OPENROUTER=your_key_here

# Model override
Q1_LLM__PROVIDER=gemini
Q1_LLM__MODEL=gemini-2.0-flash
```

Environment variable format: `Q1_` prefix, double underscores for nesting depth. For example `Q1_LLM__TEMPERATURE=0.5` maps to `config.llm.temperature`.

### `config/default.yaml`

```yaml
llm:
  provider: ollama
  model: qwen2.5:14b
  temperature: 0.75
  fallback_model: qwen2.5:14b

semantic:
  similarity_threshold: 0.85
  embedding_model: all-MiniLM-L6-v2

domain:
  auto_detect: true
  default: computer_science

journal:
  target: null       # e.g. "ieee", "nature", "elsevier"
  recommend: true
```

---

## LLM Providers

The engine supports 5 providers via a single unified client. Provider is selected by which API key is present in the environment.

| Provider | Env Var | Inter-call Delay | Notes |
|---|---|---|---|
| Ollama (local) | — | None | Default. Requires Ollama running locally. |
| Gemini | `GEMINI_API_KEY` | 4s | Free tier: 15 RPM |
| Groq | `GROQ_API_KEY` | 12s | Free tier: ~5 RPM |
| DeepSeek | `DEEPSEEK_API_KEY` | 2s | Generous limits |
| OpenRouter | `OPENROUTER` | 8s | Variable by model |

All providers share the same 429 backoff chain: 15s → 30s → 60s.

---

## Architecture

### Data Flow

```
Input .tex
    │
    ▼
LaTeXParser           Regex-based. Locates preamble, body, bibliography
    │                 by character spans. Extracts \cite, \label, \ref keys.
    │  ParsedDocument (original source preserved immutably)
    ▼
SectionExtractor      Finds \section / \subsection commands.
+ ContentClassifier   Classifies each as ABSTRACT / INTRO / METHODOLOGY /
    │                 RESULTS / DISCUSSION / CONCLUSION / etc.
    │                 Splits each section into ContentBlocks:
    │                   TEXT | EQUATION | TABLE | FIGURE | CITATION
    │  list[Section]
    ▼
DomainDetector        Keyword frequency match against 6 domain YAML profiles.
    │                 Outputs: DomainProfile (CS / Medicine / Engineering / etc.)
    │
    ▼
8-Stage Pipeline
    │
    ▼
Reconstructor         Splices rewritten TEXT blocks back into original source
    │                 using character-level spans. Back-to-front to avoid
    │                 offset invalidation. Preamble and LaTeX structures
    │                 are never touched.
    ▼
Output .tex + report.json
```

---

### The 8 Stages

```
Stage 1  DECONSTRUCTION          Deterministic
         Tags each TEXT block with argument role (claim / evidence /
         analysis / summary), complexity (low / medium / high),
         and processing priority.

Stage 2  FINGERPRINT SCRUB       Deterministic + conditional LLM
         Phase A: ~50 regex replacements for banned vocabulary.
           "delve" → "examine", "leverage" → "use", etc.
         Phase B: regex deletions of filler syntactic phrases.
           "It is important to note that" → removed
         Phase C: LLM scrub ONLY for blocks with detected parallel
           constructions (3+ consecutive sentences with same opener).

Stage 3  PASS 1 — LIGHT SCRUB    LLM (conditional per block)
         Targets: Signal A (Perplexity), C (Hedge), F (Transitions).
         Each block is scored first. Blocks already ≥80/100 are skipped.
         Failing blocks are batched (~1500 words/call) to save tokens.

Stage 4  PASS 2 — BURSTINESS     LLM (conditional per block)
         Targets: Signal B (Burstiness), D (Structural Tells),
                  G (Punctuation fingerprint).
         Only processes blocks still failing after Pass 1.

Stage 5  PASS 3 — NINJA SCRUB    LLM (conditional per block)
         Full 9-lever rewrite prompt. Only blocks still <80 after Pass 2.
         Higher temperature (0.75) for maximum creative variation.
         Smaller batches (~1200 words) due to prompt complexity.

Stage 6  TECHNICAL HARDENING     Deterministic (no LLM)
         Checks all required sections are present.
         Scans for mandatory compliance statements:
           data availability, ethics/IRB, conflict of interest,
           author contributions.
         Emits warnings only — does not modify text.

Stage 7  CITATION AUTHENTICATION External APIs (no LLM)
         For each \cite{key}: searches Semantic Scholar, then
         CrossRef as fallback. Verifies a real paper with a DOI
         exists. Flags unverifiable citation keys.

Stage 8  ASSEMBLY & VERIFICATION Deterministic
         Reconstructor splices all rewrites into original .tex.
         Runs AI detection pre-check on final text.
         Produces QualityReport with detection risk, missing sections,
         remaining AI markers, and recommendations.
```

---

### Antigravity Mode

A separate, token-minimal pipeline triggered with `--mode antigravity`. Designed for speed over maximum humanisation depth.

```
Phase 0  PROTECT REGIONS        Replace math / citations / figures
                                with __P_0__, __P_1__, ... placeholders.

Phase 1  DETERMINISTIC SCRUB    ~60 banned vocabulary replacements +
                                RLHF phrase deletions. 0 LLM calls.

Phase 2  LLM CHUNKING           1 LLM call per ~500 words of text.
                                Temperature 1.1 (widens token distribution
                                per RAID benchmark findings).

Phase 3  DETERMINISTIC POST     Re-check for LLM-reintroduced banned words.
                                Normalize transition density.
                                Clean up spacing artifacts.

Phase 4  RESTORE REGIONS        __P_N__ → original LaTeX verbatim.
```

For a 5000-word paper: ~10 LLM calls. At 3s inter-call delay: ~30 seconds minimum.

---

### AI Detection Scoring Engine

Fully deterministic. No ML models required. Computes a 0–100 Human Score from 7 weighted signals.

| Signal | Weight | What It Measures |
|---|---|---|
| A — Perplexity | 0.20 | Banned word density per 1000 words |
| B — Burstiness | 0.25 | Standard deviation of sentence lengths (human target: >8) |
| C — Hedge Surgery | 0.10 | Count of over-hedging phrases |
| D — Structural Tells | 0.15 | Unique sentence-opener ratio (human target: >70%) |
| F — Transition Density | 0.10 | % of sentences starting with a transition word (target: 8–15%) |
| G — Punctuation | 0.10 | Em-dash ≤1 per 300 words; semicolons penalized |
| H — RLHF Voice | 0.10 | "Here is how / There are several / In conclusion" markers |

Grade scale: A+ (≥95) · A (≥88) · B+ (≥80) · B (≥72) · C (≥60) · D (≥45) · F (<45)

The three stealth passes (Stages 3–5) use this scorer to decide whether to call the LLM at all. Blocks already scoring ≥80 are skipped entirely.

---

### Validation Layer

Three validators run on every rewritten block:

**SemanticValidator** — SBERT cosine similarity + BERTScore F1. Combined score must meet threshold (default: 0.85). Degrades gracefully if models are not installed.

**FactPreservationValidator** — Extracts all verifiable facts from the original text using regex patterns:
- Percentages, p-values, confidence intervals, effect sizes, correlations
- Sample sizes (N=, n=)
- Performance metrics (F1, accuracy, BLEU, ROUGE, AUC, etc.)
- Measurements with units (ms, MB, GHz, mm, °C, etc.)
- Method names and dataset references

Every extracted fact must be present in the rewritten text. 100% retention required.

**LaTeXIntegrityValidator** — Verifies `\begin`/`\end` balance, citation key count, and equation block preservation.

---

### Pattern Library

`utils/patterns.py` contains ~200 categorised AI writing patterns used for detection and replacement:

| Category | Examples |
|---|---|
| Filler phrases | "it is worth noting that", "plays a crucial role", "in recent years" |
| Hedging overuse | "could potentially", "it remains to be seen", "further research is needed" |
| Superlatives | "groundbreaking", "revolutionary", "unprecedented", "paradigm shift" |
| Generic transitions | "delve into", "furthermore", "moreover", "additionally" |
| Marketing language | "leverage", "robust", "seamlessly", "game-changer", "tapestry", "realm" |
| Structural tells | "as mentioned earlier", "building upon this", "on the one hand" |

Severity levels: `must_fix` → `should_fix` → `cosmetic`

---

### Configuration Files

```
config/
├── default.yaml              Base pipeline config
│
├── domains/
│   ├── computer_science.yaml  Domain keyword indicators + rewrite instructions
│   ├── medicine.yaml
│   ├── engineering.yaml
│   ├── psychology.yaml
│   ├── economics.yaml
│   └── materials_science.yaml
│
├── journals/
│   ├── ieee.yaml              Journal-specific compliance rules
│   ├── nature.yaml
│   ├── elsevier.yaml
│   ├── springer.yaml
│   └── acm.yaml
│
├── voices/
│   ├── precise_analyst.yaml   Sentence length, hedge density, formality settings
│   ├── balanced_scholar.yaml
│   ├── narrative_weaver.yaml
│   ├── technical_minimalist.yaml
│   └── conversational_expert.yaml
│
└── prompts/
    ├── antigravity_humanize.txt   Main single-pass mega-prompt
    ├── stealth_light.txt          Pass 1 prompt (Signals A, C, F)
    ├── stealth_medium.txt         Pass 2 prompt (Signals B, D, G)
    ├── stage2_scrub.txt           Parallel construction scrub
    ├── humanise_pass1-3.txt       Legacy multi-pass prompts
    └── stage3-7 prompt files
```

Voice auto-selection by domain:
- Computer Science → `precise_analyst`
- Engineering → `conversational_expert`
- Medicine / Psychology → `balanced_scholar`
- Economics → `narrative_weaver`
- Materials Science → `technical_minimalist`

---

### What Requires an LLM vs What Doesn't

| Component | LLM Required |
|---|---|
| LaTeX parsing and section extraction | No |
| Domain detection | No |
| Fact extraction | No |
| Stage 2 regex scrub (Phase A + B) | No |
| Stage 6 structural compliance checks | No |
| Stage 7 citation verification | No (external APIs) |
| Stage 8 assembly and detection scoring | No |
| AI detection scoring (all 7 signals) | No |
| Pattern library matching | No |
| Antigravity Phase 1 + Phase 3 | No |
| Stage 2 Phase C (parallel constructions) | Yes — conditional |
| Stealth Passes 1, 2, 3 (Stages 3–5) | Yes — skipped if block score ≥80 |
| Antigravity Phase 2 | Yes — 1 call per 500 words |

---

## Output

### Humanised `.tex`

The output file is a byte-for-byte copy of the input with only TEXT blocks modified. Preamble, equations, tables, figures, citations, and all LaTeX commands are identical to the original.

### Quality Report (`report.json`)

```json
{
  "domain": { "domain": "computer_science", "confidence": 0.82 },
  "humanisation": {
    "before": { "human_score": 34.2, "grade": "F" },
    "after":  { "human_score": 81.7, "grade": "B+" },
    "ai_patterns_before": 47,
    "ai_patterns_after": 3,
    "ai_patterns_removed_pct": 93.6,
    "q1_writing_readiness": 78.4,
    "humanisation_grade": "B+"
  },
  "readability": { "flesch_reading_ease": 38.1, "gunning_fog": 14.2 },
  "journal_compliance": { "target_journal": "ieee", "is_compliant": true },
  "journal_recommendations": [ ... ]
}
```

### CLI Output

```
=== 8-Stage Humanisation Complete ===
Domain: computer_science (0.82)

Humanisation Results:
   AI Patterns:   47 -> 3 (94% removed)
   Human Score:   34.2 -> 81.7/100  (Grade: B+)
   Burstiness:    88.4/100
   Vocabulary:    79.1/100
   Q1 Readiness:  78.4%  (B+)

Journal Compliance: PASS
Quality Report:     report.json
```

---

## CLI Reference

```
q1-engine input.tex [OPTIONS]

Options:
  -o, --output PATH          Output .tex file (default: input_humanised.tex)
  -c, --config PATH          Custom config YAML
  -v, --verbose              Debug logging
  --voice-profile PROFILE    precise_analyst | narrative_weaver |
                             balanced_scholar | technical_minimalist |
                             conversational_expert
  --paper-type TYPE          empirical | review | theoretical | short_paper
  --domain DOMAIN            computer_science | medicine | engineering |
                             psychology | economics | materials_science
  --target-score FLOAT       Target human score (default: 80.0)
  --skip-citations           Skip Stage 7 citation authentication
  --stages RANGE             Stages to run, e.g. "1-5" (default: 1-8)
  --report-json PATH         Write QualityReport JSON to this path
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `pydantic>=2.7` | Type-safe data models across all pipeline stages |
| `pyyaml>=6.0` | Config and profile loading |
| `TexSoup>=0.3.3` | LaTeX structure navigation |
| `spacy>=3.7` | NLP processing |
| `sentence-transformers>=3.0` | SBERT semantic similarity validation |
| `bert-score>=0.3.13` | BERTScore F1 validation |
| `textstat>=0.7` | Readability metrics (Flesch, Gunning Fog, etc.) |
| `ollama>=0.3` | Local LLM client |
| `transformers>=5.3` | HuggingFace model backbone |
| `httpx>=0.27` | Semantic Scholar + CrossRef API calls |
| `rich>=13.7` | Logging output |

---

## Project Structure

```
src/q1_engine/
│
├── main.py                    CLI entry point
├── config.py                  Config loader (YAML + env var overrides)
├── models.py                  All Pydantic v2 data models
│
├── parsers/
│   ├── latex_parser.py        .tex → ParsedDocument with span annotations
│   ├── section_extractor.py   Finds and classifies \section commands
│   └── content_classifier.py  Classifies blocks: TEXT / EQUATION / TABLE / etc.
│
├── analyzers/
│   ├── domain_detector.py     Keyword-based academic domain classification
│   ├── fact_extractor.py      Extracts facts into FactGraph for hallucination detection
│   ├── readability.py         Flesch, Gunning Fog, Coleman-Liau metrics
│   └── scientific_content.py  Scientific content analysis
│
├── engines/
│   ├── llm_rewriter.py        Unified LLM client (Ollama / Gemini / Groq / DeepSeek / OpenRouter)
│   ├── antigravity.py         Token-minimal single-pass humanizer
│   │
│   ├── stages/
│   │   ├── stage1_deconstructor.py      Block tagging
│   │   ├── stage2_fingerprint_scrub.py  Regex + conditional LLM scrub
│   │   ├── stage6_technical_hardening.py  Compliance checks
│   │   ├── stage7_citation_auth.py      Citation verification via APIs
│   │   └── stage8_assembly.py           Final reconstruction + QualityReport
│   │
│   └── stealth/
│       ├── pass1_light_scrub.py     Signal A/C/F — conditional LLM
│       ├── pass2_burstiness.py      Signal B/D/G — conditional LLM
│       └── pass3_ninja.py           Full 9-lever rewrite — conditional LLM
│
├── validators/
│   ├── semantic_validator.py        SBERT + BERTScore
│   ├── fact_preservation.py         100% fact retention check
│   ├── latex_integrity.py           \begin/\end balance, citation counts
│   └── content_preservation.py      Orchestrates all three validators
│
├── scoring/
│   ├── ai_detection_scorer.py       7-signal Human Score engine (deterministic)
│   ├── humanisation_scorer.py       Before/after HumanisationReport
│   └── reviewer_simulation.py       Simulated peer review scoring
│
├── reconstruction/
│   └── reconstructor.py             Span-safe back-to-front LaTeX reconstruction
│
├── pipeline/
│   └── orchestrator.py              Q1Pipeline — wires all 8 stages together
│
├── adapters/
│   └── journal_adapter.py           Journal compliance + recommendation engine
│
└── utils/
    ├── patterns.py                  ~200 AI writing patterns with severity levels
    ├── api_client.py                Semantic Scholar + CrossRef + OpenAlex client
    ├── text_processing.py           Citation / label / ref extraction utilities
    └── logging_setup.py             Rich-based logging configuration
```

---

## License

MIT
