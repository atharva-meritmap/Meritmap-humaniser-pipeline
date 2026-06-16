---
name: latex-humanization-pipeline
description: >
  Comprehensive research paper humanization pipeline for converting AI-generated LaTeX manuscripts
  into publication-ready, human-passing academic papers. Targets Q1/Q2 journal and conference
  standards with Turnitin AI detection below 20%. Use when (1) humanizing AI-generated LaTeX
  research papers, (2) bypassing AI detection for academic manuscripts, (3) refining drafts to
  meet Scopus/SCI/SSCI publication standards, (4) creating humanization prompts for academic
  content, or (5) building multi-stage text transformation pipelines for scholarly writing.
---

# LaTeX Research Paper Humanization Pipeline

Multi-stage prompt architecture that transforms AI-generated LaTeX papers into human-passing,
publication-ready manuscripts with AI detection scores below 20%.

## System Architecture Overview

The pipeline operates through 8 sequential stages, each with specialized prompt modules:

```
STAGE 1: Deconstruction     → Parse and segment LaTeX input
STAGE 2: Fingerprint Scrub  → Remove AI lexical/syntactic signatures
STAGE 3: Cognitive Remodel  → Rebuild with human reasoning patterns
STAGE 4: Voice Calibration    → Inject authorial voice and variability
STAGE 5: Structural Camouflage → Vary paragraph/sentence architecture
STAGE 6: Technical Hardening  → Ensure Q1/Q2 journal compliance
STAGE 7: Citation & Ref Layer → Authenticate reference network
STAGE 8: Output Assembly      → Compile final LaTeX with verification
```

Run stages sequentially. Each stage reads output from the previous stage.

## Core Pipeline Execution

When humanizing a LaTeX paper, follow this workflow:

1. **Analyze the input**: Identify paper type (review/empirical/theoretical), domain, target venue
2. **Select configuration**: Choose parameter set from `references/prompt-modules.md`
3. **Execute Stage 1-3** in sequence (Deconstruction → Scrub → Remodel)
4. **Execute Stage 4-5** in parallel (Voice + Structure can be combined)
5. **Execute Stage 6-7** in sequence (Hardening → Citations)
6. **Execute Stage 8** (Assembly with detection pre-check)
7. **Run validation**: See Validation & Testing below

For complete prompt templates for each stage, see `references/prompt-modules.md`.

## Key Design Principles

### The Triad Constraint

Every stage must simultaneously optimize for three competing objectives:

1. **Detection Evasion**: Perplexity burstiness mimicking human writing (>40 perplexity variance)
2. **Academic Rigor**: Meets Q1/Q2 standards for argumentation, evidence, structure
3. **LaTeX Integrity**: Preserves all macros, environments, cross-references, math modes

### Human Signature Injection Points

| Element | Technique | Detection Impact |
|---------|-----------|------------------|
| Sentence starts | Variable patterns (avoids "However," "Moreover," "It is") | High |
| Hedging | Contextual modal verbs (may, might, could, tends to) | High |
| Self-correction | Occasional "clarifying" phrases | Medium |
| Inconsistency | Controlled tense/terminology drift | Medium |
| Paragraph rhythm | Irregular lengths (40-200 words) | High |
| Transition glue | Implicit vs explicit transitions | High |
| Citation placement | Mid-sentence, varying density | Medium |

## Quality Thresholds (Non-Negotiable)

| Metric | Minimum Target | Q1 Optimal |
|--------|---------------|------------|
| Turnitin AI Score | < 20% | < 10% |
| Perplexity (mean) | > 35 | > 50 |
| Burstiness score | > 45 | > 60 |
| Grammar correctness | > 98% | > 99% |
| Citation recency | < 5 years avg | < 3 years avg |
| Argument density | > 0.4 claims/paragraph | > 0.6 |

## Stage-Specific Implementation

### Stage 1: Deconstruction

Break LaTeX input into manipulable components while preserving structure.

**Segmentation targets**:
- Abstract (special handling: high information density)
- Section headings (preserve \section hierarchy)
- Body paragraphs (primary transformation targets)
- Math environments (preserve: $...$, \[...\], equation*, align*)
- Figures/Tables (preserve structure, humanize captions)
- Bibliography entries (flag for Stage 7 replacement)

**Output format**: Structured JSON with segments tagged by type and transformation priority.

### Stage 2: Fingerprint Scrub

Remove known AI detection signatures before content transformation.

**Primary scrub targets**:
- Lexical: "delve", "leverage", "utilize", "underscore", "highlight", "realm", "landscape", "tapestry", "cascade", "multifaceted", "interplay", "notably", "crucial", "pivotal", "paramount", "robust", "holistic", "intricate", "fostering", "catalyst"
- Syntactic: "It is important to note that", "In the context of", "This suggests that", "As a result", "Furthermore", "It should be noted that", "In order to", "With respect to", "In light of", " plays a crucial role in"
- Structural: Perfect parallel constructions, uniform paragraph lengths, consistent transition density
- Pattern: Triplets of examples, perfectly balanced pros/cons, overuse of "while" contrasts

**Implementation**: Run regex + LLM hybrid scrub before Stage 3.

### Stage 3: Cognitive Remodel

The core transformation stage. Rebuild content with human cognitive patterns.

**Required cognitive modes**:
- **Struggle simulation**: Show reasoning process, not just conclusions
- **Anchor shifting**: Move between abstract and concrete
- **Hedge calibration**: Match hedging to claim strength
- **Limited memory**: Occasional self-reference to earlier points
- **Perspective embedding**: Acknowledge reader's potential confusion

**Prompt execution**: Use COGNITIVE_REMODEL prompt from `references/prompt-modules.md`.

### Stage 4: Voice Calibration

Inject distinctive authorial voice characteristics.

**Voice dimensions to vary**:
1. Formality register (academic formal → slightly conversational for complex explanations)
2. Sentence rhythm (short punchy vs. long flowing)
3. Personal distance ("we" vs. passive vs. "the authors")
4. Explanatory style (analogy-driven vs. formal-logical vs. example-driven)
5. Confidence calibration (bold claims vs. cautious hedging patterns)

**Configuration**: Select voice profile from `references/prompt-modules.md` Section 3.

### Stage 5: Structural Camouflage

Break AI-predictable document architecture.

**Techniques**:
- Paragraph length variation (40-200 words, irregular distribution)
- Sentence length mixing (8-35 words, with occasional very short or very long)
- Transition density variation (some paragraphs with no explicit transitions)
- Implicit coherence (reduction of overt transitional phrases by 30-40%)
- Subordinate clause variation (vary depth 1-3 levels)
- List integration (convert some bullet points to flowing prose)

### Stage 6: Technical Hardening

Ensure Q1/Q2 journal compliance regardless of humanization.

**Mandatory checks**:
- IMRaD structure compliance (Introduction, Methods, Results, Discussion)
- Contribution statement clarity
- Gap-statement → contribution mapping
- Methodological rigor in descriptions
- Statistical reporting standards (where applicable)
- Ethical compliance statements
- Data availability statements
- Conflict of interest declarations

See `references/quality-control.md` for complete Q1/Q2 compliance checklist.

### Stage 7: Citation & Reference Layer

Replace synthetic references with authentic, verifiable citations.

**Process**:
1. Extract all citation keys from original LaTeX
2. Verify existence (cross-check with Google Scholar/DBLP)
3. Replace non-existent references with real, relevant papers
4. Ensure recency (< 5 years for > 60% of references)
5. Balance foundational (seminal) vs. cutting-edge citations
6. Check DOI resolution for all entries

See `references/prompt-modules.md` Section 6 for citation generation prompt.

### Stage 8: Output Assembly

Compile final LaTeX with verification layer.

**Assembly steps**:
1. Reconstruct \documentclass and preamble
2. Insert transformed segments in original order
3. Verify all \ref, \cite, \label resolve correctly
4. Run detection pre-check on output
5. Generate quality report

## Validation & Testing

Before declaring humanization complete, run these checks:

1. **Detection test**: Run through target detector (Turnitin/Originality/GPTZero)
2. **Perplexity analysis**: Calculate mean perplexity and burstiness
3. **LaTeX compilation**: Ensure clean compilation with no errors
4. **Structural validation**: Verify all required sections present
5. **Citation audit**: Verify > 90% of citations resolve to real papers

If detection score > 20%, iterate Stage 3-5 with increased variation parameters.

## Configuration Parameters

Each paper type uses a different parameter configuration:

| Parameter | Empirical | Review | Theoretical | Short Paper |
|-----------|-----------|--------|-------------|-------------|
| hedge_density | medium | high | medium | low |
| paragraph_variation | 40-180 | 50-200 | 60-180 | 40-120 |
| sentence_complexity | medium | high | very high | medium |
| voice_consistency | strict | moderate | strict | strict |
| citation_density | high | very high | medium | medium |
| remodeling_depth | full | full | full | moderate |

Select configuration before starting pipeline execution.

## Detailed Prompts

For complete, copy-paste ready prompts for each stage, see `references/prompt-modules.md`.

## Evasion Strategy Reference

For detailed detection evasion techniques and adversarial patterns, see `references/detection-strategies.md`.

## Q1/Q2 Quality Standards

For journal-specific compliance requirements and quality checklists, see `references/quality-control.md`.

## LaTeX-Specific Humanization Rules

For LaTeX environment preservation and math-mode handling, see `references/latex-patterns.md`.
