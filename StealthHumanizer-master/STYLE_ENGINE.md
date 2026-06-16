# Style Engine — StealthHumanizer v2

## Overview

The Style Engine is the core of StealthHumanizer's humanization pipeline. It combines a multi-pass transformation system with configurable tone, style, and level parameters to produce natural, human-like text.

## Pipeline Architecture

```
Input Text
    │
    ▼
┌─────────────────────────┐
│  Text Analysis Engine    │  ← Detects AI patterns, readability, tone
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Pass 1: Full Rewrite    │  ← Applies style + tone + level prompt
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Detection Check        │  ← Runs 12-metric detector
│  Score ≥ Target?        │
│    ├─ Yes → Output       │
│    └─ No → Pass 2        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Pass 2: Re-humanize     │  ← Only rewrites flagged sentences
│  Flagged Sentences       │     with aggressive prompts
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Pass 3 (Ninja only)     │  ← Final polish pass on remaining
│  Remaining Flagged       │     problematic sentences
└────────────┬────────────┘
             │
             ▼
        Output Text
```

## Rewrite Levels

### Light
- **Goal:** Subtle, surgical changes (5-10% of text)
- **Techniques:** Add contractions, replace formal words, fix sentence lengths
- **Preserves:** Exact paragraph structure, same number of paragraphs
- **Passes:** 1

### Medium
- **Goal:** Noticeable humanization (~30% changes)
- **Techniques:** Restructure sentences, vary lengths dramatically, add personal touches, natural imperfections
- **Preserves:** Core meaning, moderate structural changes allowed
- **Passes:** 1-2

### Aggressive
- **Goal:** Complete rewrite from scratch (~70%+ changes)
- **Techniques:** New voice, colloquialisms, fragments, rhetorical questions, dramatic variation
- **Preserves:** All facts and key information only
- **Passes:** 2

### Ninja 🥷
- **Goal:** Maximum transformation for natural-sounding output
- **Techniques:** All aggressive techniques PLUS controlled imperfection, burstiness engineering, anti-pattern avoidance, human voice injection
- **Passes:** 3 (automatic loop until target score)

## Tone Presets

Each tone modifies:
1. **Personality traits** — How the writer "sounds"
2. **Vocabulary preferences** — Word choices and register
3. **Writing patterns** — Structural tendencies

| Tone | Personality | Best For |
|------|------------|----------|
| Academic Formal | Rigorous, evidence-based | Research papers, theses |
| Academic Casual | Thoughtful, accessible | Class discussions, blog posts |
| Journalistic | Direct, fact-driven | Articles, news pieces |
| Creative Writing | Imaginative, expressive | Fiction, creative nonfiction |
| Conversational | Friendly, relaxed | Blog posts, social media |
| Professional | Competent, clear | Business reports, emails |
| Technical | Precise, methodical | Documentation, guides |
| Persuasive | Confident, compelling | Op-eds, marketing |
| Storytelling | Narrative, engaging | Anecdotes, narratives |
| Humorous | Witty, irreverent | Entertainment, casual writing |
| Emotional | Empathetic, passionate | Personal essays, memoirs |
| Analytical | Logical, systematic | Analysis, comparison pieces |
| Custom | User-defined | Any context |

## Writing Style Techniques

### 1. Burstiness Engineering
AI text has uniform sentence lengths. We create extreme variation:
- Mix 3-word fragments with 35-word complex sentences
- Vary paragraph lengths (1-8 sentences)
- Never have two consecutive sentences of similar length

### 2. Perplexity Manipulation
- Use unexpected but natural word choices
- Include idiomatic expressions
- Reference specific, concrete details
- Use domain-specific language naturally

### 3. Anti-Pattern Avoidance
Never use these AI-signature phrases:
- "Furthermore", "Moreover", "Additionally", "In conclusion"
- "It is important to note", "It is worth mentioning"
- "In today's world", "In the modern era"
- "Delve into", "Tapestry of", "Navigating the landscape"
- "Comprehensive", "Multifaceted", "Robust", "Seamless"

### 4. Human Voice Injection
- First person references ("I think", "we can see")
- Parenthetical asides and tangents
- Rhetorical questions as paragraph openers
- Controlled imperfections (ambiguous pronoun, informal word in formal context)

### 5. Structural Rewrite
- Non-linear information presentation
- Merge and split paragraphs freely
- Natural transitional phrases ("OK so", "Anyway", "Here's where it gets interesting")
- End paragraphs with interesting points, not summaries
