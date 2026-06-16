# Architecture

StealthHumanizer is a full-stack web application built with Next.js that transforms AI-generated text into natural, human-sounding prose. It supports 15 AI model providers, features a multi-pass humanization pipeline, and includes a built-in AI detection engine.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Humanizer │ │ Detector │ │ Settings │ │ History  │           │
│  │Component │ │Component │ │Component │ │Component │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │             │             │             │                │
│  ┌────┴─────────────┴─────────────┴─────────────┴─────┐        │
│  │                    React State                       │        │
│  │            (Next.js App Router / RSC)                 │        │
│  └──────────────────────┬──────────────────────────────┘        │
└─────────────────────────┼───────────────────────────────────────┘
                          │  HTTP POST (JSON)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                            │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  POST /api/humanize  │  │ POST /api/alternative │            │
│  └──────────┬───────────┘  └──────────┬───────────┘            │
└─────────────┼──────────────────────────┼────────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Core Library (lib/)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  humanizer   │  │  detector    │  │  providers   │          │
│  │  Multi-pass  │  │  AI Detection│  │  15 Provider │          │
│  │  Pipeline    │  │  Engine      │  │  Abstraction │          │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘          │
│         │                                    │                   │
│  ┌──────┴──────┐  ┌──────────────┐  ┌───────┴──────┐          │
│  │   prompts   │  │  readability │  │    types     │          │
│  │  Style Eng. │  │  Metrics     │  │  TypeScript  │          │
│  └─────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐                                                │
│  │   storage    │  localStorage (client-side persistence)       │
│  └──────────────┘                                                │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External AI Providers                         │
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ Gemini │ │ OpenAI │ │ Claude │ │  Groq  │ │ Mistral│  ...   │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ Cohere │ │Together│ │OpenRoutr│ │Cerebras│ │DeepInfr│  ...   │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Descriptions

### `lib/providers.ts` — Provider Abstraction Layer

The heart of our multi-provider support. Implements a unified interface across 15 AI providers with vastly different APIs:

- **OpenAI-compatible adapters** — Groq, Together, OpenRouter, DeepInfra, Cerebras, Mistral all share the chat completions format
- **Native adapters** — Gemini (Google's generateContent API), Claude (Anthropic's Messages API), Cohere (chat API), HuggingFace (inference API)
- **Cloudflare Workers AI** — Edge inference with account-scoped URLs

Each provider normalizes to a single `generateWithProvider()` function that accepts `(provider, apiKey, systemPrompt, userPrompt, options)` and returns plain text.

### `lib/humanizer.ts` — Multi-Pass Humanization Engine

Orchestrates the full humanization pipeline:

1. **Chunking** — Long texts are split at sentence boundaries (max 2,500 words/chunk)
2. **Pass 1** — Full text rewrite using style-aware system prompts
3. **Detection** — Built-in detector scores each sentence
4. **Pass 2–3** (aggressive/ninja only) — Flagged sentences are re-humanized in batch
5. **Result assembly** — Sentence-level mapping with detection scores

### `lib/prompts.ts` — Style Engine & Prompt Engineering

Generates context-aware system prompts by composing:
- **Persona injection** — Different writing personas per rewrite level
- **Tone configuration** — 13 tone presets with personality traits, vocabulary, and writing patterns
- **Style guides** — 5 style presets (academic, casual, professional, creative, technical)
- **Level instructions** — 4 rewrite levels from light surgical edits to full ninja rewrites
- **Anti-pattern rules** — Explicit instructions to avoid AI-detectable patterns

### `lib/detector.ts` — AI Detection Engine

A heuristic-based detection system that analyzes text across 12 metrics:

| Metric | Weight | What It Measures |
|--------|--------|-----------------|
| Sentence Average | 25% | Combined per-sentence AI signals |
| Perplexity | 12% | Word/bigram predictability |
| Burstiness | 12% | Sentence length variation |
| Vocabulary Diversity | 8% | Unique word ratio |
| Sentence Length Variation | 8% | Range of sentence lengths |
| Transition Frequency | 8% | Overuse of transition words |
| Passive Voice Ratio | 5% | Passive construction frequency |
| AI Phrase Density | 7% | Known AI phrase matches |
| Sentence Start Diversity | 5% | Variety of sentence openers |
| Pronoun Usage | 5% | First/second person usage |
| Hedging Frequency | 3% | Hedging language density |
| Quantifier Overuse | 2% | Overuse of vague quantifiers |

### `lib/readability.ts` — Readability Metrics

Calculates standard readability scores: Flesch Reading Ease, Flesch-Kincaid Grade Level, Coleman-Liau Index, plus word/sentence/syllable counts and estimated reading time.

### `lib/storage.ts` — Client-Side Persistence

Manages localStorage for API keys, humanization history (max 50 entries), and theme preference. Includes text chunking, download utilities (TXT/DOCX), and word counting.

### `lib/types.ts` — TypeScript Type System

Comprehensive type definitions for providers, humanization options, detection results, readability scores, history entries, and UI state.

---

## Data Flow

### Humanization Flow

```
Input Text
    │
    ▼
┌─────────────┐
│  Text Input  │──► Validate (max 10,000 words)
│  Component   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ POST /api/   │──► Parse: text, level, style, tone, model, apiKey
│ humanize     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Prompt       │──► Compose system prompt from:
│ Generation   │    persona + tone + style + level instructions
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ Chunk Text   │────►│ Split at     │
│ (≤2500 words)│     │ sentence     │
└──────┬──────┘     │ boundaries   │
       │            └──────────────┘
       ▼
┌─────────────┐     ┌──────────────┐
│ Pass 1:      │────►│ AI Provider  │
│ Full Rewrite │     │ (via fetch)  │
└──────┬──────┘     └──────────────┘
       │
       ▼
┌─────────────┐
│ Run AI       │
│ Detector     │──► Score: 0–100 (human likelihood)
└──────┬──────┘
       │
       ├─── Score ≥ target? ──► Done
       │
       ▼ (aggressive / ninja only)
┌─────────────┐
│ Pass 2+:     │──► Re-humanize flagged sentences
│ Re-write     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Assemble     │──► Map sentences, attach scores,
│ Results      │    build response
└──────┬──────┘
       │
       ▼
  JSON Response → Client renders results
```

### Alternative Generation Flow

```
User clicks sentence
       │
       ▼
POST /api/alternative
  { original, current, level, style, tone, model, apiKey }
       │
       ▼
Generate 3 alternatives at temperature 1.0
       │
       ▼
JSON: { alternatives: string[] }
```

---

## Multi-Pass Humanization Pipeline

```
                    ┌──────────────┐
                    │  Input Text  │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │     Chunk if needed     │
              │   (max 2500 words each) │
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │       PASS 1            │
              │   Full text humanize    │
              │   Style + Tone + Level  │
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │   Run Detection Engine  │
              │   Score each sentence   │
              └────────────┬────────────┘
                           │
                    ┌──────┴──────┐
                    │ Score ≥ 80? │
                    └──────┬──────┘
                     Yes   │   No
                    ┌──────┴──────────┐
                    │                 │
              ┌─────┴─────┐   ┌──────┴──────┐
              │  Return   │   │  Extract    │
              │  Results  │   │  Flagged    │
              └───────────┘   │  Sentences  │
                              └──────┬──────┘
                                     │
                        ┌────────────┴────────────┐
                        │       PASS 2            │
                        │  Aggressive re-write    │
                        │  of flagged sentences   │
                        └────────────┬────────────┘
                                     │
                        ┌────────────┴────────────┐
                        │   Re-run Detection       │
                        └────────────┬────────────┘
                                     │
                              ┌──────┴──────┐
                              │ Score ≥ 80? │
                              └──────┬──────┘
                               Yes  │  No
                                    │  ┌────────────────┐
                                    └─►│  PASS 3 (Ninja)│
                                       │  Final polish   │
                                       └───────┬────────┘
                                               │
                                       ┌───────┴───────┐
                                       │  Return Final  │
                                       │  Results       │
                                       └───────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router) | Full-stack React framework |
| Language | TypeScript 6 | Type safety |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Icons | Lucide React | Icon library |
| AI Providers | 15 providers | Text generation via REST APIs |
| Storage | localStorage | Client-side persistence |
| Deployment | Vercel (recommended) | Zero-config Next.js hosting |

### Why This Stack?

- **Next.js** — Server-side API routes keep API keys off the client; App Router for modern React patterns
- **TypeScript** — Catches provider API mismatches at compile time; comprehensive type definitions
- **Tailwind CSS** — Rapid UI development; dark mode support built-in
- **No external AI SDKs** — Direct `fetch()` calls to provider APIs keep the bundle tiny and avoid dependency conflicts
- **localStorage** — Privacy-first; no server-side user data storage required

---

## Security Model

- API keys are stored in the browser's localStorage (encrypted provider keys sent over HTTPS)
- API routes act as a thin proxy — keys are forwarded to providers but never stored server-side
- No user accounts, no databases, no tracking — fully client-side architecture
- All provider communication happens over HTTPS/TLS
