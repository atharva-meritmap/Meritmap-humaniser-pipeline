# Meritmap Translation-Chain Humaniser

A production-grade AI text humanisation toolkit. Part of the Meritmap Q1 Manuscript Refinement Engine — translation-chain research module.

---

## What It Does

Routes text through a multi-step chain that breaks AI statistical fingerprints via both LLM rewriting and cross-engine translation hops:

```
Input (EN) → Chinese (LLM) → Japanese (LLM) → Finnish (Google) → English (Niutrans)
```

**Why this chain works:**
- Steps 1–2 (LLM Rewrite): configurable LLM at temperature 1.3 rewrites while translating, breaking AI statistical fingerprints. Step 2 carries Step 1 as conversation history for coherent humanisation.
- Steps 3–4 (Multi-Engine Translation): two different NMT engines introduce compounding structural changes. No single-engine fingerprint survives.
- Distant Languages: Chinese → Japanese → Finnish maximises linguistic distance at each hop.

**Characteristics:**
- Best original style preservation
- Fast processing speed
- 100% key information retention (verified on 50 text pairs)

---

## Quick Start

```bash
pip install -r requirements.txt
cp config/config.example.toml config/config.toml
# Fill in your API keys in config.toml
python -m src.standard.pipeline --input "Your AI-generated text here"
```

**DeepSeek (default):**

```toml
[api_keys]
deepseek_api_key = "sk-..."
niutrans_api_key = "your-key"

[llm]
provider = "deepseek"
```

**OpenRouter:**

```toml
[api_keys]
openrouter_api_key = "sk-or-..."
niutrans_api_key = "your-key"

[llm]
provider = "openrouter"
model = "deepseek/deepseek-chat"
```

---

## Pipeline Steps

| Step | Engine | From → To | Purpose |
|------|--------|-----------|---------|
| 1 | LLM (temp 1.3) | Input → Chinese | LLM humanisation rewrite + language shift |
| 2 | LLM (temp 1.3) | Chinese → Japanese | Second LLM humanisation, carries Step 1 as history |
| 3 | Google Translate | Japanese → Finnish | First translation hop — distant language structural disruption |
| 4 | Niutrans | Finnish → English | Second translation hop — cross-engine reconstruction |

---

## Quality Metrics

Tested on 50 text pairs:

| Dimension | Score (out of 10) |
|-----------|-------------------|
| Information Completeness | 10.0 |
| Language Fluency | 9.0 |
| Style Adaptability | 8.8 |
| Readability | 9.2 |
| Creativity & Impact | 8.5 |
| **Overall** | **9.1** |

---

## Repo Structure

```
src/
├── standard/                # Production Standard Pipeline (recommended)
│   ├── pipeline.py          # 4-step chain, CLI entry
│   ├── llm_client.py        # OpenAI-compatible client (DeepSeek / OpenRouter)
│   ├── llm_rewriter.py      # LLM humanisation rewrite
│   └── translators.py       # Google + Niutrans engines
│
└── methodologies/           # Four-methodology reference implementations
    ├── humanizer.py         # dispatcher + FastAPI app
    ├── translation_chain.py # Method 1
    ├── llm_rewriter.py      # Method 2
    ├── detection_pipeline.py# Method 3
    ├── mixed_engine.py      # Method 4
    ├── postprocess.py
    └── detectors/

examples/
├── example_usage.py         # minimal entry
├── showcase/                # 5 real samples with intermediate-step outputs
└── legacy/                  # four-method comparison outputs
```

---

## License

MIT
