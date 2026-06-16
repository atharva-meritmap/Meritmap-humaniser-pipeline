# Meritmap Web Humaniser

**Multi-provider AI text humaniser with style-aware rewriting and statistical fingerprint disruption.**

Part of the Meritmap Q1 Manuscript Refinement Engine — web interface module.

---

## What It Does

Transforms AI-generated text into natural, human-sounding prose using a multi-pass rewriting pipeline that disrupts all statistical signals AI detectors rely on:

- Low perplexity — predictable, boring word choices
- Low burstiness — uniform sentence lengths
- AI-typical phrases — "furthermore", "it is important to note", "delve into"
- Rigid structure — same paragraph pattern throughout

---

## Features

| Feature | Description |
|---------|-------------|
| Multi-provider | Gemini, OpenAI, Claude, Groq, Mistral, DeepSeek, OpenRouter, Cohere, and more |
| 4 Rewrite Levels | Light, Medium, Aggressive, Ninja |
| 6 Writing Styles | Academic, Professional, Casual, Creative, Technical, General |
| AI Detection Scoring | 12-metric analysis with per-sentence scores |
| Batch Processing | Humanise multiple texts at once |
| File Upload | PDF/DOCX support |
| Grammar Check | Built-in grammar checking |
| 100% Private | API keys stored in browser only — no server-side data storage |

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and add your API key in Settings.

---

## CLI

```bash
# Detect AI signals (no API key needed)
npm run cli -- detect --text "Furthermore, it is important to note that..."

# Humanise from stdin
export GEMINI_API_KEY="your-key"
echo "Draft text..." | npm run cli -- humanize --model gemini --level medium

# Read and write files
npm run cli -- humanize --input draft.txt --output humanized.txt --style academic
```

Build the CLI binary:

```bash
npm run cli:build
npm link
meritmap-humanise providers
```

---

## How It Works

### Multi-Pass Pipeline

```
Input Text → Pass 1: Full Rewrite → Detection Scoring → Pass 2–3: Re-write flagged sentences → Output
```

**Pass 1 — Full rewrite:** Style-aware system prompts enforce burstiness, perplexity injection, and structural disruption.

**Detection:** Built-in 12-metric detector scores each sentence.

**Pass 2–3 (aggressive/ninja only):** Sentences still failing are re-humanised in targeted batches.

### Detection Metrics

| Metric | Weight | What It Measures |
|--------|--------|-----------------|
| Sentence Average | 25% | Combined per-sentence AI signals |
| Perplexity | 12% | Word/bigram predictability |
| Burstiness | 12% | Sentence length variation |
| Vocabulary Diversity | 8% | Unique word ratio |
| Transition Frequency | 8% | Overuse of transition words |
| AI Phrase Density | 7% | Known AI phrase matches |
| Passive Voice Ratio | 5% | Passive construction frequency |
| Sentence Start Diversity | 5% | Variety of sentence openers |
| Pronoun Usage | 5% | First/second person usage |
| Hedging Frequency | 3% | Hedging language density |
| Quantifier Overuse | 2% | Vague quantifier density |

---

## Architecture

```
app/
├── api/                    # Next.js API routes (humanize, detect, grammar, upload)
├── layout.tsx
└── page.tsx

components/
├── Humanizer.tsx           # Main humaniser UI
├── BatchHumanizer.tsx      # Batch processing UI
├── Detector.tsx            # Standalone detector UI
└── Settings.tsx            # API key management

lib/
├── humanizer.ts            # Multi-pass humanisation engine
├── detector.ts             # 12-metric AI detection engine
├── prompts.ts              # Style-aware prompt system
├── providers.ts            # Multi-provider integrations
├── readability.ts          # Flesch, Kincaid, Coleman-Liau metrics
└── server/
    ├── humanization-governance.ts
    ├── model-runtime.ts
    └── text-utils.ts
```

---

## Tech Stack

- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS 4
- Deployment: Vercel

---

## License

MIT
