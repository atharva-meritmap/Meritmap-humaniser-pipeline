# Prompt Modules Reference

Complete, copy-paste ready prompts for each pipeline stage. Execute in sequence.

## Table of Contents

1. [Stage 1: Deconstruction Prompt](#stage-1-deconstruction-prompt)
2. [Stage 2: Fingerprint Scrub Prompt](#stage-2-fingerprint-scrub-prompt)
3. [Stage 3: Cognitive Remodel Prompt](#stage-3-cognitive-remodel-prompt)
4. [Stage 4: Voice Calibration Prompt](#stage-4-voice-calibration-prompt)
5. [Stage 5: Structural Camouflage Prompt](#stage-5-structural-camouflage-prompt)
6. [Stage 6: Technical Hardening Prompt](#stage-6-technical-hardening-prompt)
7. [Stage 7: Citation Layer Prompt](#stage-7-citation-layer-prompt)
8. [Stage 8: Assembly & Verification Prompt](#stage-8-assembly--verification-prompt)
9. [Voice Profiles](#voice-profiles)
10. [Domain-Specific Adaptations](#domain-specific-adaptations)

---

## Stage 1: Deconstruction Prompt

**Purpose**: Parse LaTeX into structured segments for transformation.

```
You are a LaTeX deconstruction engine. Your task is to parse the following LaTeX research paper and output a structured JSON representation.

INPUT: [PASTE FULL LATEX HERE]

Deconstruct the paper following this exact JSON schema:

{
  "metadata": {
    "title": "extracted title",
    "authors": ["author1", "author2"],
    "document_class": "article/report/etc",
    "packages": ["list", "of", "usepackage"],
    "bibliography_style": "plain/ieee/acm/etc"
  },
  "segments": [
    {
      "id": "seg_001",
      "type": "preamble|abstract|section_heading|body_paragraph|math_block|figure|table|equation|bibliography|other",
      "content": "exact LaTeX content",
      "section_context": "Introduction/Methods/etc",
      "transformation_priority": 1-5,
      "preservation_required": true/false,
      "notes": "special handling instructions"
    }
  ]
}

RULES:
- Type "preamble": Set transformation_priority=1, preservation_required=true. Do NOT modify.
- Type "math_block" or "equation": Set transformation_priority=1, preservation_required=true. Do NOT modify math content.
- Type "abstract": Set transformation_priority=5, preservation_required=false. High transformation target.
- Type "body_paragraph": Set transformation_priority=5, preservation_required=false. Primary transformation target.
- Type "figure" or "table": Set transformation_priority=2, preservation_required=true for structure, false for caption.
- Type "bibliography": Set transformation_priority=4, preservation_required=false. Flag for citation replacement.
- Type "section_heading": Set transformation_priority=1, preservation_required=true. Keep exact.

For each body_paragraph, additionally analyze:
- "sentence_count": number of sentences
- "avg_sentence_length": approximate word count
- "contains_citations": true/false
- "argument_role": "claim|evidence|analysis|transition|summary"
- "complexity_level": "low|medium|high"

Output ONLY the JSON. No markdown code fences, no commentary.
```

---

## Stage 2: Fingerprint Scrub Prompt

**Purpose**: Remove AI lexical and syntactic signatures.

```
You are an AI signature removal engine. Process the following text segments and remove all detectable AI-generation fingerprints.

INPUT SEGMENTS: [PASTE JSON SEGMENTS FROM STAGE 1]

Execute these scrub operations in order:

### A. Lexical Scrub (High Priority)
Remove or replace these AI-marker words:
- "delve" → "explore", "investigate", "examine"
- "leverage" → "use", "apply", "build on"
- "utilize" → "use", "employ"
- "underscore" → "emphasize", "show", "demonstrate"
- "highlight" → "show", "point out", "note"
- "realm" → "area", "field", "domain"
- "landscape" → "context", "picture", "state of research"
- "tapestry" → DELETE or replace with specific description
- "cascade" → "series", "sequence", "chain"
- "multifaceted" → "complex", "having multiple aspects"
- "interplay" → "interaction", "relationship"
- "notably" → DELETE or use "significantly", "in particular"
- "crucial" → "important", "essential", "key" (vary usage)
- "pivotal" → "central", "key", "critical"
- "paramount" → "essential", "most important"
- "robust" → "strong", "reliable", "effective"
- "holistic" → "comprehensive", "integrated"
- "intricate" → "complex", "detailed"
- "fostering" → "promoting", "supporting", "encouraging"
- "catalyst" → "driver", "trigger", "stimulus"

### B. Syntactic Scrub (High Priority)
Rewrite these AI-signature phrases:
- "It is important to note that" → DELETE entirely or replace with "Note that" or just state the fact
- "In the context of" → "For", "Within", "In" (or delete)
- "This suggests that" → Vary: "This implies", "These results indicate", "We interpret this as"
- "As a result" → Vary: "Consequently", "Thus", "Therefore", or implicit transition
- "Furthermore" → Vary: "Additionally", "Also", "Moreover", or no transition word
- "It should be noted that" → DELETE (redundant meta-commentary)
- "In order to" → "To"
- "With respect to" → "Regarding", "For", "Concerning"
- "In light of" → "Given", "Considering", "Based on"
- "plays a crucial role in" → "is essential for", "is key to", "drives"
- "There is a growing body of evidence" → "Research shows", "Studies demonstrate"
- "It is widely acknowledged that" → "Researchers recognize", "The field accepts"
- "The present study" → "This study", "Our work", "Here"

### C. Structural Scrub (Medium Priority)
- Break up perfectly parallel sentence constructions (three or more consecutive sentences with identical grammatical structure)
- Vary sentence openings: no more than 2 sentences in any paragraph may start with the same pattern (The, This, However, In)
- Remove excessive signposting (every sentence does not need a transition)
- Convert some passive voice to active voice (vary 30-50% of passive constructions)

### D. Pattern Scrub (Medium Priority)
- Break up "A, B, and C" triplets that appear in multiple consecutive paragraphs
- Vary the "while X, Y" contrast pattern density
- Remove perfectly balanced "on one hand...on the other" structures unless essential
- Avoid "not only...but also" in more than one paragraph per section

OUTPUT FORMAT:
Return the segments as modified JSON with identical structure. Mark scrubbed segments with "scrub_applied": true and list changes in "modifications_log".
```

---

## Stage 3: Cognitive Remodel Prompt

**Purpose**: Transform content with human cognitive patterns. This is the CORE transformation.

```
You are a cognitive remodeling engine that transforms AI-generated academic text into human-written academic prose. You simulate how a real researcher thinks and writes, not how an AI generates text.

## COGNITIVE PRINCIPLES TO EMBED

### 1. Struggle Simulation
Real researchers don't present perfect linear arguments. They:
- Show reasoning steps: "To see why this matters, consider..."
- Acknowledge complexity: "The relationship is more complicated than it first appears"
- Walk through logic: "Starting from X, if we assume Y, then Z follows because..."

### 2. Anchor Shifting
Move between levels of abstraction:
- Abstract → Concrete: "This theoretical result manifests in practice as..."
- Concrete → Abstract: "These specific cases point to a broader pattern..."
- General → Specific: Use examples to ground general claims

### 3. Hedge Calibration
Match hedging to claim certainty:
- Strong evidence: "These results demonstrate..." (not "suggest")
- Moderate evidence: "These results indicate..." or "provide evidence that..."
- Weak/preliminary: "These results are consistent with..." or "offer initial support for..."
- NEVER hedge obvious statements: "The sky appears to be blue" → "The sky is blue"

### 4. Limited Memory (Human Working Memory)
- Occasionally reference back to earlier points: "As noted in our discussion of X..."
- Sometimes repeat key concepts with slight variation (humans reinforce)
- Let some connections remain implicit (not everything needs explicit linking)

### 5. Perspective Embedding
Anticipate reader reactions:
- "At first glance, this result seems counterintuitive. However..."
- "One might expect X; yet the data show Y."
- "This distinction, while subtle, carries significant implications."

### 6. Controlled Messiness
Humans are not perfectly organized:
- Occasional parenthetical asides that add color (not just citations)
- Brief digressions that return to main point
- Some paragraphs that combine multiple ideas (not perfectly single-topic)
- Occasional use of rhetorical questions (sparingly, in appropriate sections)

## TRANSFORMATION RULES

1. Maintain all technical content, data, and factual claims exactly
2. Preserve all citations and their placement
3. Keep all mathematical expressions unchanged
4. Transform the PROSE surrounding technical content
5. Target: The writing should sound like a smart, careful researcher who wrote this over several weeks

## ANTI-PATTERNS TO AVOID

- Perfect parallel structure across consecutive sentences
- Uniform paragraph length
- Transition word in every sentence
- Perfectly balanced pros/cons
- Overuse of "this" as sentence starter
- Consistent sentence length
- Hedging every claim uniformly
- "In this [noun], we..." repeated pattern

## EXECUTION

Process each body_paragraph segment from the scrubbed output. Apply cognitive remodeling while preserving all LaTeX commands, citations, and math.

For each paragraph, choose ONE cognitive mode as primary:
- STRUGGLE: Show reasoning process (best for methods, analysis)
- ANCHOR: Shift between abstract/concrete (best for introduction, discussion)
- HEDGE: Calibrate certainty precisely (best for results, claims)
- MEMORY: Reference and reinforce (best for discussion, conclusion)
- PERSPECTIVE: Anticipate reader (best for introduction, motivation)
- MESSY: Controlled disorder (use sparingly, for voice variation)

Rotate primary modes across paragraphs. Do not use the same mode for more than 2 consecutive paragraphs.

OUTPUT: Return remodeled segments as JSON with "remodel_mode" field indicating primary cognitive mode used.
```

---

## Stage 4: Voice Calibration Prompt

**Purpose**: Inject distinctive, consistent authorial voice.

```
You are a voice calibration engine. Apply a consistent authorial voice to the following academic text while maintaining full technical accuracy.

## VOICE PROFILE SELECTION

Select ONE voice profile based on paper domain and author preference:

### Profile A: The Precise Analyst
- Short, punchy sentences mixed with longer analytical ones
- Frequent use of "we" (active researcher voice)
- Direct, almost terse statement of findings
- Occasional dry humor in footnotes or asides
- Example: "We found a significant effect (p < .001). This was unexpected."

### Profile B: The Narrative Weaver
- Flowing, connected prose with explicit narrative thread
- Uses "we" and occasionally "I" (in single-author papers)
- Rich analogies and metaphors for complex concepts
- Explicit story arc: problem → struggle → insight → resolution
- Example: "The question that drove this work was deceptively simple: what happens when..."

### Profile C: The Balanced Scholar
- Measured, equidistant tone
- Mix of active and passive voice (situation-dependent)
- Frequent hedging calibrated to evidence strength
- Extensive engagement with prior literature in own voice
- Example: "While Smith (2023) argues for X, our findings complicate this picture by..."

### Profile D: The Technical Minimalist
- Extremely concise, dense prose
- Minimal transitions (implicit coherence)
- Heavy reliance on technical precision over explanation
- Short paragraphs, direct claims
- Example: "Theorem 3 establishes convergence. The proof relies on Lemma 2."

### Profile E: The Conversational Expert
- Slightly informal while remaining fully academic
- Uses contractions sparingly (1-2 per section max)
- Direct address to reader: "Consider the case where..."
- Explanatory parentheticals that genuinely explain
- Example: "This approach works well for small datasets (think n < 1000), but scales poorly."

## VOICE CONSISTENCY RULES

Once a profile is selected, apply these consistency rules:

1. **Sentence rhythm**: Match profile's characteristic rhythm. Do not vary between profiles.
2. **Hedging density**: Profile A (low), B (medium), C (high), D (very low), E (medium-low)
3. **Transition density**: Profile A (medium-low), B (high), C (medium), D (very low), E (medium)
4. **Personal pronouns**: Profile A/C/E (use "we"), B ("we"/"I"), D (passive/"we" mixed)
5. **Explanation depth**: Profile A (moderate), B (deep), C (deep with literature), D (minimal), E (moderate with intuition)

## EXECUTION

Apply the selected voice profile to all body_paragraph segments. Ensure:
- Voice remains consistent across the entire paper
- Technical content is never compromised for voice
- Math and citations are preserved exactly
- The voice sounds natural, not forced or performative

OUTPUT: Return voice-calibrated segments with "voice_profile" field.
```

---

## Stage 5: Structural Camouflage Prompt

**Purpose**: Break predictable document structure patterns.

```
You are a structural camouflage engine. Modify the structural patterns of this academic text to evade stylometric detection while preserving readability and coherence.

## CAMOUFLAGE OPERATIONS

### Operation 1: Paragraph Length Variation
Introduce controlled variation in paragraph lengths:
- Short paragraphs: 40-60 words (for emphasis, transitions)
- Medium paragraphs: 80-120 words (standard density)
- Long paragraphs: 150-220 words (complex arguments)
- Distribution target: 20% short, 60% medium, 20% long
- NEVER have two consecutive paragraphs of identical length (within 10 words)

### Operation 2: Sentence Length Variation
Within each paragraph, vary sentence lengths:
- Short sentences: 8-15 words (impact statements, transitions)
- Medium sentences: 18-28 words (standard academic)
- Long sentences: 30-45 words with multiple clauses (complex relationships)
- Very long sentences: 50+ words (rare, 1-2 per section maximum)
- Target distribution per paragraph: 20% short, 60% medium, 15% long, 5% very long

### Operation 3: Transition Density Modulation
Vary the density of explicit transition words:
- High transition: Every sentence has explicit link to previous (use sparingly, 15% of paragraphs)
- Medium transition: 60-70% of sentences have explicit transitions (default)
- Low transition: 30-40% of sentences have explicit transitions (30% of paragraphs)
- Implicit transition: Rely on topic continuity and parallel structure (15% of paragraphs)

### Operation 4: Sentence Opening Variation
Ensure sentence openings vary across each paragraph:
- Permitted openings: Subject, "This" + noun, "However", "Thus", "For example", "In contrast", "Moreover", "Although", "While", "Because", "Given", "As", "These", "Such", "To" + verb
- Constraint: No more than 2 sentences per paragraph may start with the same pattern
- Constraint: No more than 3 sentences per section may start with "The"
- Constraint: Vary between "This", "These", "Such", "The" as demonstrative starters

### Operation 5: Subordinate Clause Variation
Vary syntactic complexity:
- Simple sentences: 30% (one independent clause)
- Compound sentences: 25% (two independent clauses)
- Complex sentences: 35% (independent + dependent)
- Compound-complex: 10% (multiple independent + dependent)

### Operation 6: List Integration
Convert some enumerated lists to flowing prose:
- If the paper has a list format (itemize/enumerate), convert 30-50% to inline prose
- Preserve remaining lists for visual variety
- When converting, integrate items using: "First... Second... Finally..." or "notably X, alongside Y, and particularly Z"

## EXECUTION RULES

1. Apply camouflage AFTER voice calibration (Stage 4)
2. Never sacrifice clarity for variation
3. Maintain logical flow between all paragraphs
4. Keep all technical content, citations, and math intact
5. Ensure the paper still reads as cohesive academic prose
6. Track all structural modifications in a change log

## DETECTION TARGETS

The camouflage should produce these stylometric signatures:
- Perplexity variance (burstiness): > 45
- Average sentence length std dev: > 8 words
- Paragraph length std dev: > 35 words
- Transition word density: 8-15% (not 20%+ as in AI text)
- Function word distribution: match human academic baseline

OUTPUT: Return structurally modified segments with structural metrics in metadata.
```

---

## Stage 6: Technical Hardening Prompt

**Purpose**: Ensure Q1/Q2 journal compliance regardless of humanization.

```
You are a technical hardening engine for academic papers. Verify and strengthen the following paper to meet Q1/Q2 journal publication standards.

## COMPLIANCE CHECKLIST

### Structure Requirements
- [ ] Clear title (< 120 characters, descriptive, no jargon)
- [ ] Structured abstract (Background, Methods, Results, Conclusion for empirical; Objectives, Methods, Results, Conclusion for review)
- [ ] Keywords (4-6, from established thesaurus if applicable)
- [ ] Introduction with clear gap statement and contribution preview
- [ ] Literature review (not just citation listing, but synthesis and critique)
- [ ] Methodology section with sufficient reproducibility detail
- [ ] Results section that presents findings without interpretation
- [ ] Discussion section that interprets results, connects to literature, acknowledges limitations
- [ ] Conclusion that synthesizes (not just summarizes) and suggests future work
- [ ] Data availability statement
- [ ] Ethics/Compliance statement (if applicable)
- [ ] Author contributions statement
- [ ] Conflict of interest declaration
- [ ] Acknowledgments (if applicable)
- [ ] References in correct format

### Argumentation Quality
- [ ] Each claim supported by evidence (data, citation, or logical argument)
- [ ] Clear distinction between contributions and prior work
- [ ] Limitations acknowledged with specificity (not generic)
- [ ] Claims match evidence strength (no overclaiming)
- [ ] Alternative explanations considered
- [ ] Significance clearly articulated (so what? question answered)

### Methodological Rigor
- [ ] Research design clearly explained
- [ ] Variables/constructs operationalized
- [ ] Sample/population described with inclusion/exclusion criteria
- [ ] Analytical approach justified and described
- [ ] Reproducibility: sufficient detail for replication

### Writing Quality
- [ ] No grammatical errors
- [ ] Consistent terminology throughout
- [ ] Acronyms defined on first use
- [ ] Units specified for all measurements
- [ ] Statistical notation follows APA/AMA/field standard
- [ ] Figures and tables referenced in text before they appear
- [ ] All figures have descriptive captions
- [ ] All tables have titles and notes as needed

## EXECUTION

For each unchecked item, generate the missing content or fix the deficiency. Integrate seamlessly with existing humanized text. Do not disrupt voice or structural camouflage from previous stages.

PRIORITY ORDER:
1. Missing required sections (add them)
2. Weak argumentation (strengthen claims/evidence links)
3. Methodological gaps (add detail)
4. Writing inconsistencies (fix without changing voice)

OUTPUT: Return technically hardened paper segments with compliance checklist showing all items checked.
```

---

## Stage 7: Citation Layer Prompt

**Purpose**: Replace synthetic references with authentic, verifiable citations.

```
You are a citation authentication engine. Replace all references in the following paper with real, verifiable academic citations.

## AUTHENTICATION PROCESS

### Step 1: Citation Extraction
Extract all citation keys from the LaTeX source. Identify:
- In-text citations: \cite{key}, \citep{key}, \citet{key}
- Narrative citations: "Author (Year)" or "(Author, Year)"
- Reference list entries in .bib format

### Step 2: Verification
For each citation:
1. Check if the paper exists (cross-reference with known databases)
2. Verify author names match publication
3. Verify year and venue/journal
4. Verify title approximately matches
5. If any check fails, mark for REPLACEMENT

### Step 3: Replacement Strategy

For citations marked for replacement, follow this priority:

1. **Direct Replacement**: Find a real paper on the same specific topic
   - Same methodology → cite methodology paper
   - Same theoretical framework → cite foundational theory paper
   - Same empirical finding → cite paper reporting similar results

2. **Upstream Replacement**: Find a real paper that the synthetic citation likely drew from
   - Many AI citations are corrupted versions of real papers
   - Extract keywords, search for real source

3. **De Novo Insertion**: If no direct replacement exists, find relevant real papers:
   - Search Google Scholar/DBLP/Semantic Scholar for the topic
   - Select papers with: real authors, real venues, verifiable DOIs
   - Prefer: recent papers (< 5 years), highly cited, Q1/Q2 venues

### Step 4: Reference List Generation

Generate complete BibTeX entries for all replacement citations:

```bibtex
@article{key,
  author    = {First Last and First Last},
  title     = {Actual Paper Title},
  journal   = {Real Journal Name},
  volume    = {NN},
  number    = {N},
  pages     = {NNN--NNN},
  year      = {YYYY},
  doi       = {10.xxxx/xxxxx},
  publisher = {Real Publisher}
}
```

### Step 5: Citation Context Verification

Ensure each inserted citation makes sense in its sentence context:
- The cited paper actually supports the claim being made
- The citation fits the narrative flow
- Author names pronounced correctly in narrative citations

## CITATION QUALITY RULES

1. Recency: > 60% of citations must be from last 5 years
2. Balance: Mix of seminal (older, foundational) and cutting-edge (recent)
3. Venue quality: Prioritize citations from Q1/Q2 journals, top conferences
4. Self-citation: Include 0-2 self-citations if plausible (realistic)
5. Verification: Every citation must have verifiable DOI or URL

## EXECUTION

Process the citation layer for the entire paper. Return:
1. Modified LaTeX with updated \cite commands
2. Complete .bib file with all authenticated entries
3. Replacement log showing: old citation → new citation → reason for replacement

OUTPUT: Return authenticated citation layer as structured data.
```

---

## Stage 8: Assembly & Verification Prompt

**Purpose**: Compile final LaTeX and run verification.

```
You are a final assembly and verification engine. Compile the humanized paper from all processed segments and run comprehensive quality checks.

## ASSEMBLY STEPS

### Step 1: LaTeX Reconstruction
1. Reconstruct \documentclass and preamble (preserve original)
2. Insert transformed segments in original document order
3. Ensure all \section, \subsection hierarchy maintained
4. Verify all \ref, \cite, \label, \eqref commands resolve
5. Confirm all math environments preserved intact
6. Rebuild \bibliography and \bibliographystyle commands

### Step 2: Compilation Check
Verify the LaTeX compiles cleanly:
- No missing packages
- No undefined references
- No broken math environments
- No malformed table/figure environments
- No citation key mismatches between .tex and .bib

### Step 3: Detection Pre-Check
Run these internal heuristics (simulate detector behavior):

**Perplexity Analysis**:
- Calculate approximate perplexity of 5 random 100-word samples
- Target: mean > 35, variance > 40 (burstiness)
- If below target, flag for Stage 3-5 reprocessing

**AI Signature Scan**:
- Scan for remaining AI-marker words (from Stage 2 list)
- Scan for AI-signature phrases (from Stage 2 list)
- Target: 0 instances of high-confidence markers
- If found, flag for Stage 2 re-scrub

**Structural Analysis**:
- Calculate sentence length standard deviation
- Calculate paragraph length standard deviation
- Measure transition word density
- Target: std dev > 8 (sentences), > 35 (paragraphs), transition density 8-15%

**Stylometric Consistency**:
- Verify voice profile maintained throughout
- Check for abrupt style shifts (indicating patchwork)
- Ensure consistent authorial presence

### Step 4: Quality Report Generation

Generate a comprehensive quality report:

```json
{
  "assembly_status": "success|warnings|failed",
  "compilation": {
    "status": "clean|warnings|errors",
    "error_count": N,
    "warning_count": N
  },
  "detection_pre_check": {
    "perplexity_mean": NN.N,
    "perplexity_variance": NN.N,
    "burstiness_score": NN.N,
    "ai_markers_found": N,
    "sentence_length_std": NN.N,
    "paragraph_length_std": NN.N,
    "transition_density": NN.N,
    "estimated_detection_risk": "low|medium|high"
  },
  "quality_compliance": {
    "q1_q2_compliant": true|false,
    "sections_complete": ["list", "of", "complete", "sections"],
    "sections_missing": ["list", "of", "missing", "sections"],
    "argumentation_score": "strong|adequate|weak",
    "methodology_score": "strong|adequate|weak"
  },
  "citation_verification": {
    "total_citations": N,
    "verified_authentic": N,
    "replacement_rate": "NN%",
    "recency_score": "NN% within 5 years"
  },
  "recommendations": [
    "Specific action items if issues found"
  ]
}
```

## EXECUTION

1. Assemble the complete paper
2. Run all verification checks
3. If estimated_detection_risk is "high", generate specific reprocessing instructions
4. If estimated_detection_risk is "medium", note areas for manual review
5. Output final LaTeX and quality report

OUTPUT: Final LaTeX document and quality report JSON.
```

---

## Voice Profiles

Detailed configuration for each voice profile:

### Profile A: The Precise Analyst
```yaml
formality: high
sentence_length_preference: short-to-medium (15-25 words avg)
hedge_density: low (hedge only strong claims with weak evidence)
transition_density: medium-low (15-20% of sentences)
personal_pronouns: "we" dominant (80%+)
explanation_style: direct, data-forward
paragraph_length: shorter (60-100 words typical)
special_characteristics:
  - Frequent use of "found", "observed", "measured" as reporting verbs
  - Minimal use of adjectives and adverbs
  - Direct statement of results without preamble
  - Occasional extremely short sentences for emphasis
example_sentence: "We tested three configurations. Only the adaptive method converged."
```

### Profile B: The Narrative Weaver
```yaml
formality: medium-high
sentence_length_preference: medium-to-long (25-35 words avg)
hedge_density: medium (calibrate to evidence)
transition_density: high (30-40% of sentences)
personal_pronouns: "we" dominant, occasional "I" for single-author
explanation_style: analogy-rich, story-driven
paragraph_length: varied (80-150 words typical)
special_characteristics:
  - Uses narrative hooks: "The question that motivated this work..."
  - Rich analogies and metaphors for complex concepts
  - Explicit story arc in each section
  - Engages reader with direct address
example_sentence: "Imagine a system that learns not from explicit labels but from the subtle patterns embedded in its own predictions—this is the premise that drives our approach."
```

### Profile C: The Balanced Scholar
```yaml
formality: high
sentence_length_preference: medium (20-30 words avg)
hedge_density: high (carefully calibrated hedging throughout)
transition_density: medium (20-25% of sentences)
personal_pronouns: "we" and passive voice mixed (60/40)
explanation_style: literature-embedded, dialogic
paragraph_length: medium (80-120 words typical)
special_characteristics:
  - Extensive engagement with prior work in own voice
  - "While X argues Y, our findings suggest Z" pattern
  - Careful epistemic stance throughout
  - Balances innovation with continuity
example_sentence: "While Chen and colleagues (2022) emphasize the role of architectural depth, our findings complicate this picture by demonstrating that data quality exerts a stronger influence on downstream performance."
```

### Profile D: The Technical Minimalist
```yaml
formality: very high
sentence_length_preference: short (15-25 words avg)
hedge_density: very low (state results directly)
transition_density: very low (10-15% of sentences)
personal_pronouns: passive voice dominant (60%), "we" (40%)
explanation_style: minimal, precision-focused
paragraph_length: short (40-80 words typical)
special_characteristics:
  - Extremely concise definitions
  - Minimal framing or motivation
  - Direct presentation of theorems/results
  - Relies on math to do the explanatory work
example_sentence: "Theorem 3 establishes uniform convergence. Proof follows from Lemma 2 and the dominated convergence theorem."
```

### Profile E: The Conversational Expert
```yaml
formality: medium
sentence_length_preference: varied (15-35 words, intentionally mixed)
hedge_density: medium-low
transition_density: medium (20% of sentences)
personal_pronouns: "we" dominant, occasional "you" in explanations
explanation_style: intuitive, clarifying parentheticals
paragraph_length: varied (60-130 words typical)
special_characteristics:
  - Sparingly uses contractions (1-2 per section)
  - Genuine explanatory parentheticals
  - "Think of it this way..." constructions
  - Accessible without being informal
example_sentence: "This optimization landscape is deceptively simple—it looks smooth from a distance, but local minima proliferate as dimensionality increases (something we will return to in Section 4)."
```

---

## Domain-Specific Adaptations

### Computer Science / AI / ML
- Voice profiles: A, D, and E work best
- Citation emphasis: Conference proceedings (NeurIPS, ICML, ICLR, ACL) + arXiv for recent work
- Special markers: "state-of-the-art" → "current best", "baseline" → keep, "ablation" → keep
- Hedging: Results sections need careful calibration (accuracy numbers are precise)

### Biology / Medicine / Life Sciences
- Voice profiles: B and C work best
- Citation emphasis: High-impact journals (Nature, Science, Cell, specialist journals)
- Special markers: "significant" → statistical sense only, use "substantial" for importance
- Hedging: Higher density required (biological variability demands hedging)
- Compliance: Ethics statements, trial registrations, CONSORT guidelines

### Physics / Mathematics
- Voice profiles: A and D work best
- Citation emphasis: Physical Review letters, Annals of Math, arXiv
- Special markers: "proof" → rigorous sense only, "theorem" → formally stated
- Hedging: Minimal in results, careful in interpretation
- Math: Preserve all equation environments exactly

### Social Sciences / Humanities
- Voice profiles: B and C work best
- Citation emphasis: Monographs and journal articles mixed
- Special markers: "discourse" → keep, "hegemony" → keep, "problematic" → "challenging"
- Hedging: High density expected and appropriate
- Theory: Ensure theoretical framework explicitly stated and engaged

### Engineering
- Voice profiles: A and E work best
- Citation emphasis: IEEE, ACM, ASME transactions
- Special markers: "implementation" → keep, "prototype" → keep, "benchmark" → keep
- Hedging: Moderate, results-oriented
- Practical focus: Ensure implications for practice clearly stated
