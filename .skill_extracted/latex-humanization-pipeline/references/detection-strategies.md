# Detection Evasion Strategies

Detailed techniques for evading AI detection systems while maintaining academic quality.

## Table of Contents

1. [How AI Detectors Work](#how-ai-detectors-work)
2. [Evasion Strategy Matrix](#evasion-strategy-matrix)
3. [Perplexity and Burstiness Engineering](#perplexity-and-burstiness-engineering)
4. [Adversarial Text Patterns](#adversarial-text-patterns)
5. [Detector-Specific Countermeasures](#detector-specific-countermeasures)
6. [Detection Testing Protocol](#detection-testing-protocol)
7. [Red Team Checklist](#red-team-checklist)

---

## How AI Detectors Work

Understanding detection mechanisms enables targeted evasion.

### Detection Methods Used by Major Systems

| Detector | Primary Method | Secondary Method | Key Weakness |
|----------|---------------|------------------|--------------|
| Turnitin AI | Perplexity + burstiness analysis | Log-likelihood scoring | Struggles with technical writing |
| GPTZero | Perplexity variance + sentence-level analysis | Burstiness threshold | Vulnerable to structural variation |
| Originality.ai | Hybrid model (perplexity + classifier) | Token probability analysis | Sensitive to voice consistency |
| Copyleaks | Transformer-based classifier | Ensemble detection | Can be confused by domain jargon |
| ZeroGPT | Entropy analysis + pattern matching | Sentence length variance | Weak against controlled randomization |

### What Detectors Actually Measure

1. **Perplexity**: How "surprised" a language model is by the text. Low perplexity = predictable = AI-like.
2. **Burstiness**: Variation in perplexity across sentences. Humans write with irregular predictability.
3. **Token probability**: Detectors check if high-probability tokens were chosen (AI preference) vs. lower-probability alternatives.
4. **N-gram patterns**: Repetitive sequences that appear in AI training data.
5. **Stylometric consistency**: Uniform writing patterns that differ from human variation.

## Evasion Strategy Matrix

Strategies mapped to detection methods:

| Strategy | Perplexity | Burstiness | Token Prob | N-gram | Stylometric |
|----------|-----------|------------|------------|--------|-------------|
| Vocabulary obfuscation | High | Medium | High | High | Low |
| Sentence length variation | Low | High | Low | Low | High |
| Transition word modulation | Medium | High | Medium | Medium | High |
| Synonym substitution | High | Medium | High | High | Low |
| Structural randomization | Low | High | Low | Low | High |
| Deliberate error insertion | High | High | High | Medium | High |
| Voice embedding | Medium | High | Medium | Medium | High |
| Paragraph rhythm variation | Low | High | Low | Low | High |

## Perplexity and Burstiness Engineering

### Perplexity Fundamentals

Perplexity measures how well a language model predicts the next word. AI-generated text tends to have lower perplexity because models choose high-probability tokens.

**Target metrics for evasion:**
- Mean perplexity: > 35 (human academic baseline: 40-80)
- Perplexity standard deviation: > 15 (burstiness)
- Sentence-level perplexity range: 10-100+ across a paper

### Engineering Higher Perplexity

Technique 1: **Surprising Word Choices**
- Replace high-probability continuations with moderate-probability alternatives
- Example: "The results demonstrate" → "The results suggest" (lower probability)
- Example: "It is important to note" → DELETE (forces model to find alternative phrasing)

Technique 2: **Syntactic Variation**
- Use less common sentence structures occasionally
- Example: Instead of "We found that X leads to Y", use "That X leads to Y became clear from our analysis"
- Front-load complex subordinate clauses: "What surprised us, given the extensive prior work on X, was Y"

Technique 3: **Controlled Complexity Spikes**
- Insert 1-2 sentences per section with unusually complex structure
- Long, multi-clause sentences with embedded qualifications
- Immediately follow with a very simple sentence (creates burstiness)

Technique 4: **Lexical Variation**
- Use technical jargon precisely (high perplexity for general-domain detectors)
- Vary word choice within sections (avoid repetition)
- Use domain-specific collocations that general models find "surprising"

### Engineering Burstiness

Burstiness is the KEY metric for most detectors. It measures how much perplexity varies across a text.

**Human writing signature**: Irregular predictability. Some sentences are highly predictable (simple statements), others are complex and surprising (new ideas, complex relationships).

**AI writing signature**: Uniformly moderate perplexity. Every sentence is "reasonably predictable" but none are surprising.

Technique 1: **Predictability Clusters**
- Group 2-3 highly predictable sentences together (simple statements of fact)
- Then insert a complex, unpredictable sentence
- Pattern: simple, simple, COMPLEX, simple, COMPLEX, COMPLEX, simple

Technique 2: **Intentional Repetition**
- Humans repeat key terms when emphasizing. Do this deliberately in some paragraphs.
- Then use varied vocabulary in other paragraphs.
- The alternation creates burstiness.

Technique 3: **Length Variation as Proxy**
- Sentence length variation creates natural perplexity variation
- Short sentences are predictable (low perplexity)
- Long complex sentences are less predictable (high perplexity)
- Target: mix of 10-word, 25-word, and 40+ word sentences

Technique 4: **Transition Density Variation**
- Some paragraphs with many transitions (high predictability)
- Some paragraphs with implicit coherence (lower predictability)
- The variation itself creates burstiness

## Adversarial Text Patterns

### Pattern 1: The Setup-Punch Structure
```
[Predictable setup sentence]
[Predictable elaboration]
[Unexpected conclusion or pivot]
```
Example:
"Previous work has established the effectiveness of transformer architectures for NLP tasks. Most studies focus on English. What remains unexplored is how these models fail in low-resource morphologically rich languages—a gap our work directly addresses."

### Pattern 2: The Nested Qualification
```
[Main claim] + [qualification] + [further qualification] + [return to main point]
```
Example:
"The proposed method improves accuracy, though the magnitude of improvement, which varies across datasets and tasks, depends critically on the quality of the initial feature representation, a dependency we analyze in Section 4."

### Pattern 3: The Abrupt Shift
```
[Technical detail]
[Technical detail]
[Direct, almost informal statement]
```
Example:
"The attention mechanism computes compatibility scores between query and key vectors. These scores are normalized via softmax. The result works surprisingly well, though nobody fully understands why."

### Pattern 4: Self-Correction
```
[Initial statement]
[Partial walkback or refinement]
[Revised, more precise statement]
```
Example:
"At first, we assumed the effect was linear. This turned out to be only approximately true. A closer look reveals a piecewise-linear relationship with a clear breakpoint at k=50."

### Pattern 5: The Explicit Reasoning Chain
```
[Premise] → [Inference step] → [Inference step] → [Conclusion]
```
Example:
"If we accept that language models memorize training patterns (Brown et al., 2020), and if memorization scales with model size (Zhang et al., 2021), then larger models should show greater vulnerability to membership inference attacks. Our experiments confirm this chain of reasoning."

## Detector-Specific Countermeasures

### Turnitin AI Detection

**How it works**: Turnitin uses a proprietary model that analyzes perplexity, burstiness, and token probability. It segments text and scores each segment.

**Countermeasures**:
1. Ensure burstiness > 45 (primary metric)
2. Avoid any paragraph with uniform sentence length
3. Vary paragraph length significantly (40-220 words)
4. Include some paragraphs with 3+ short sentences in sequence
5. Include some paragraphs with 2-3 very long, complex sentences
6. Minimize use of "This [noun] [verb]" pattern at sentence starts

**Known vulnerabilities**:
- Technical writing (math, code) naturally confuses the detector
- Citations break up patterns (high citation density helps)
- Non-English words or technical jargon increase perplexity

### GPTZero

**How it works**: GPTZero focuses heavily on perplexity variance. It flags text where every sentence has similar perplexity.

**Countermeasures**:
1. Maximize sentence-level perplexity variance
2. Use the setup-punch structure frequently
3. Include some highly predictable sentences (simple facts, definitions)
4. Include some complex, unpredictable sentences
5. The CONTRAST between adjacent sentences is key

**Known vulnerabilities**:
- Very sensitive to sentence length variation
- Struggles with domain-specific technical content
- Can be confused by bullet points mixed with prose

### Originality.ai

**How it works**: Uses an ensemble of perplexity analysis and a fine-tuned classifier. Most aggressive detector.

**Countermeasures**:
1. Combine all burstiness techniques
2. Use voice embedding (consistent authorial voice confuses classifiers)
3. Include deliberate minor imperfections (occasional awkward phrasing)
4. Ensure natural paragraph rhythm (not too perfect)
5. Use genuine citations (Originality checks citation patterns)

**Known vulnerabilities**:
- Very aggressive with false positives on technical writing
- Can be overly sensitive to formal academic register

## Detection Testing Protocol

Before submitting to any detector, run this protocol:

### Step 1: Self-Assessment
Score your text on these dimensions (1-10 scale):
- [ ] Sentence length variation: ___ (target: 7-10)
- [ ] Paragraph length variation: ___ (target: 7-10)
- [ ] Transition density naturalness: ___ (target: 5-7, NOT 9-10)
- [ ] Vocabulary diversity: ___ (target: 7-9)
- [ ] Voice consistency: ___ (target: 8-10)
- [ ] Imperfection level: ___ (target: 3-5, NOT 1-2)

### Step 2: Automated Pre-check
Run text through:
1. **Hugging Face Perplexity Calculator**: Check mean > 35
2. **Text-Statistics.com**: Check sentence length std dev > 8
3. **Manual N-gram check**: Scan for any 5-gram repeated > 2 times

### Step 3: Segmented Testing
If full paper fails, test individual sections:
- Abstract (highest detection risk: dense, formal)
- Introduction (high risk: literature review patterns)
- Methods (lowest risk: technical content)
- Results (low risk: data presentation)
- Discussion (medium risk: interpretation patterns)

Fix highest-risk sections first.

### Step 4: Iterative Refinement
If detection score > 20%:
1. Identify flagged segments
2. Apply structural camouflage (Stage 5) with increased variation
3. Re-test flagged segments only
4. Repeat until score < 20%

## Red Team Checklist

Before declaring evasion successful, verify against this adversarial checklist:

- [ ] No paragraph has uniform sentence length
- [ ] No two consecutive paragraphs are similar length (within 20%)
- [ ] Transition word density is between 8-15% (not 0% and not 25%+)
- [ ] At least 3 different sentence-opening patterns per paragraph
- [ ] At least 1 "surprising" sentence per 200 words
- [ ] No section is entirely in passive voice or entirely in active voice
- [ ] Contains at least 1-2 sentences with minor awkwardness (human-like imperfection)
- [ ] Contains at least 1 rhetorical question or direct reader address (if appropriate for domain)
- [ ] Paragraph lengths vary by at least 2:1 ratio (shortest vs longest)
- [ ] At least one paragraph has implicit transitions only (no explicit transition words)
- [ ] At least one paragraph has explicit transitions between every sentence
- [ ] Sentence length varies from < 10 words to > 40 words within each section
- [ ] No 4-gram is repeated more than twice in the entire paper
- [ ] Vocabulary: no content word appears more than 3 times per 500 words (except technical terms)
