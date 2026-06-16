# Meritmap Detection Research — Humanisation Signal Library

**Research-grounded signal library for AI text humanisation and detection.**
Grounded in 50+ peer-reviewed sources through April 2026.

Compatible with any LLM agent: Claude Code, Codex CLI, ChatGPT, Gemini, Cursor, Aider, Continue, Copilot. The skill content is agent-agnostic.

---

## Contents

- [What's inside](#whats-inside)
- [Usage](#usage)
- [Background](#background)
- [The nine humanisation levers](#the-nine-humanisation-levers)
- [Detection methodology taxonomy](#detection-methodology-taxonomy)
- [Adversarial findings](#adversarial-findings-what-breaks-detectors)
- [Accuracy benchmarks](#accuracy-benchmarks-from-the-literature)
- [Known limitations](#known-limitations)
- [References](#references)

---

## What's inside

| Skill | What it does |
| --- | --- |
| **`humanize`** | Rewrites or generates text that reads as human-authored by applying nine humanisation levers from the detection literature. |
| **`ai-check`** | Forensic analysis of text for AI-generation signals. Scores 9 signal categories, cites every flag with evidence, returns a verdict + confidence + AI-edited fraction estimate. |

Both are static rule-based skills (single `SKILL.md` per skill, zero runtime dependencies).

---

## Usage

### Humanise

```
/humanize

[paste your text here]
```

### AI-Check

```
/ai-check

[paste your text here]
```

`ai-check` returns a structured report: verdict (Human / Likely Human / Uncertain / Likely AI / AI), confidence, score breakdown across 9 signal categories, evidence quotes for every flag, and an AI-edited fraction estimate.

### Voice matching

To match a specific writing style, provide a sample before the text to humanise:

```
/humanize

Here's a sample of my writing for voice matching:
[paste 2-3 paragraphs of your own writing]

Now humanize this text:
[paste AI text to humanize]
```

### Combine the two skills

```
Run ai-check on this paragraph, then humanize it to address every flag you raised.

[paste your text]
```

---

## Background

Telling AI text from human text used to be easy. Not anymore.

A 2024 University of Reading study slipped ChatGPT-written exams past human graders 94% of the time. Editors at top linguistics journals could not tell which abstracts were human-written. Automated detectors do better in clean conditions and worse the moment the text gets paraphrased. Humans guess at chance.

This library ships both sides of the gap. `humanize` rewrites AI text so it reads human. `ai-check` scores text in the other direction: nine signal categories, evidence-quoted flags, a verdict, a confidence level, and an AI-edited-fraction estimate.

---

## The detection literature: what researchers measure

### Signal 1: Perplexity

Perplexity measures how "surprised" a language model is by a sequence of words. Lower perplexity means more predictable. AI text scores low perplexity by construction — every word is what the model expected. Humans spike higher because they pick words for reasons a model doesn't track: memory, rhythm, specificity, context only the writer holds.

| Text type | Perplexity (approx.) |
| --- | --- |
| Human-written abstracts | 105–165 |
| AI-generated abstracts | 47–60 |

### Signal 2: Burstiness

Burstiness measures variation in sentence structure across a passage. Human writing alternates aggressively between short punchy sentences and long ones that build over multiple clauses. AI output is metronomic — sentences cluster around 15–20 words with low variance.

- Human burstiness score: 0.6–1.2
- GPT output: 0.2–0.4

### Signal 3: Stylometric features

| Feature | AI tendency | Human tendency |
| --- | --- | --- |
| Type-Token Ratio | Higher (more unique vocab per run) | Lower (natural word repetition) |
| Hedge density | Overused | Contextual |
| Em dash frequency | 3–5× above human baseline | Rare |
| Semicolon frequency | Significantly elevated | Near-zero in informal writing |

### Signal 4: Discourse and coherence

- Structural redundancy: AI restates the topic sentence at the end of paragraphs
- Transition word abuse: "Furthermore", "Moreover", "Additionally" at far higher rates
- Emotional specificity deficit: generic claims applicable to any reader
- Hedging pattern: AI hedges by default even when certainty is warranted

---

## Detection methodology taxonomy

### Statistical / zero-shot
No training data required. Uses a surrogate LLM to score the target text probabilistically. DetectGPT perturbs candidate text and compares log-probabilities. Sensitive to paraphrasing.

### Classifier-based
Fine-tuned transformer models trained on labeled human/AI corpora. RoBERTa on HC3 hits 99% accuracy in-distribution. Cross-domain generalization is the primary unsolved problem.

### Watermarking
Highest-accuracy approach. Requires access to the generating model — useless for detecting text from models you don't control.

### Stylometric / hybrid
Combines hand-engineered linguistic features with transformer embeddings. AAAI 2025 shared task winner used this approach.

---

## Adversarial findings: what breaks detectors

**Paraphrasing attacks** are the simplest and most effective evasion. Plain paraphrasing drops detection accuracy to 12–15% on many systems. To run the attack, prompt any LLM with "rephrase this in different words."

**Adversarial paraphrasing** (guided by a detector's gradient signal): average true-positive-rate drop of 87.88% across eight detectors. The attack also transfers across detectors.

**Speed of compromise:** current detection models can be compromised in about 10 seconds using adversarial perturbation methods.

**False positive risk:** dense academic writing, ESL writing, and highly technical prose often score as AI even when human-authored.

---

## The nine humanisation levers

### Lever 1: Perplexity injection
Replace predictable vocabulary with words a real person would choose in context. One or two genuinely surprising but accurate word choices per paragraph. Avoid: "delve", "leverage", "robust", "streamline", "comprehensive", "notably", "pivotal".

### Lever 2: Burstiness enforcement
- One sentence of ≤6 words per 150 words of output
- Never three consecutive sentences within 5 words of each other in length
- Standard deviation of sentence word count target: >8

### Lever 3: Hedge surgery
Delete: "it is important to note that", "it is worth mentioning", "generally speaking", "in many cases". Replace with direct assertion. Express real uncertainty human-style.

### Lever 4: Structural flattening
Convert AI prose patterns (bullet list + numbered sections + "In conclusion") into human prose patterns. Structure should emerge from content, not get imposed on it.

### Lever 5: Specificity insertion
Every abstract claim needs a grounding anchor: a number, a named example, a time reference. Generic: "Many companies have adopted this." Human: "Stripe, Datadog, and PlanetScale all pulled this off the same way."

### Lever 6: Voice and register
Add traceable perspective: first-person where natural, occasional second-person direct address, mild rhetorical questions, self-interruption or course-correction mid-thought, contractions in conversational registers.

### Lever 7: Discourse coherence
Remove AI transition words. "Furthermore" → cut it. "Moreover" → cut it. "This highlights the importance of" → say what the importance is.

### Lever 8: Punctuation normalisation
- Em dashes: maximum one per 300 words. The double em dash wrapping pattern is almost exclusively AI.
- Semicolons: treat every semicolon as a bug unless the register is explicitly formal/academic.
- Mid-sentence colons: every colon must be preceded by a grammatically complete sentence.

### Lever 9: Strip RLHF voice
The most consequential finding from 2025–2026 literature: current detectors mostly fire on RLHF and instruction-tuning artifacts. Strip: polite hedging, balanced tradeoffs offered unprompted, structured enumeration, "helpful assistant" register, acknowledgment-prefix openers, hedged closers.

---

## Accuracy benchmarks from the literature

| Method | Accuracy / AUROC | Condition |
| --- | --- | --- |
| RoBERTa + linguistic fusion | 99% accuracy | HC3 (in-distribution) |
| Watermarking (WLLM) | >0.99 AUROC | In-distribution, no attack |
| DetectGPT | ~0.80–0.90 AUROC | Mixed domains |
| Best detectors under paraphrasing attack | 12–15% accuracy | Adversarial paraphrasing |
| PIFE adversarially-robust detector | 82.6% TPR at 1% FPR | Semantic attacks |

---

## Known limitations

- Does not guarantee 0% AI scores on commercial detectors — no method does reliably
- The goalposts move: detection systems improve continuously
- Domain shift matters: the levers are calibrated for general professional and technical English
- Learned commercial classifiers (GPTZero, Grammarly, Pangram) detect RLHF fingerprints that static surface rewriting alone cannot reach

---

## Complementary techniques

| Technique | When to use |
| --- | --- |
| Detector-scored best-of-N selection | High stakes — the single highest-leverage hybrid step |
| Iterative paraphrase pass | High stakes — exploits the detection laundering region |
| Writer-profile distillation pre-step | When prior writing samples are available |
| Self-rewrite distance sanity check | Post-humanisation verification |

---

## References

Wu et al. (2025). A survey on LLM-generated text detection. *Computational Linguistics*.

Mitchell et al. (2023). DetectGPT: Zero-shot machine-generated text detection. *ICML 2023*.

Kirchenbauer et al. (2023). A watermark for large language models. *ICML 2023*.

Hans et al. (2024). Spotting LLMs with Binoculars. *ICML 2024*. arXiv:2401.12070.

Dugan et al. (2024). RAID: A shared benchmark for robust evaluation of machine-generated text detectors. *ACL 2024*. arXiv:2405.07940.

Cheng & Sadasivan (2025). Adversarial paraphrasing: A universal attack. *NeurIPS 2025*. arXiv:2506.07001.

Base models look human: detection ceilings for instruction-tuned LLM output. (2026). arXiv:2605.19516.

---

*Research coverage: AAAI 2025, ACL 2024–2025, NAACL 2024, EACL 2026, NeurIPS 2025, EMNLP 2025, arXiv preprints through April 2026.*
