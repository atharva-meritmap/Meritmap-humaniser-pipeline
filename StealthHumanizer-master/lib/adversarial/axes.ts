// 🎯 NOOB EXPLAINER: What are "Attack Axes"?
// AI detectors look for specific "tells" in text — like how a poker player
// has tells. Each "axis" targets a different tell:
//
// Axis 1 (PERPLEXITY): Detectors check if word choices are predictable.
//   → We inject UNPREDICTABLE words that a human would use but AI wouldn't.
//
// Axis 2 (STRUCTURE): Detectors check if sentences follow the same pattern.
//   → We break up sentences in unexpected places, add asides, reorder clauses.
//
// Axis 3 (REGISTER): Detectors check if the text is consistently formal/casual.
//   → We mix formal and casual language (humans do this naturally, AI doesn't).
//
// Axis 4 (RHYTHM): Detectors check if sentence lengths are uniform.
//   → We force WILDLY different sentence lengths (some 3 words, some 40+).

export type Axis = 'perplexity' | 'structure' | 'register' | 'rhythm';

export const AXIS_PROMPTS: Record<Axis, string> = {
  perplexity: `PERPLEXITY ATTACK — Make word choices UNPREDICTABLE:
- Use unexpected synonyms: "matters" instead of "is important", "changes things" instead of "has an impact"
- Add domain-specific jargon that most AI wouldn't choose
- Use colloquial alternatives to formal words: "helps" not "facilitates", "uses" not "utilizes"
- Include ONE surprising word per paragraph that a language model would never pick
- Replace generic adjectives with specific, vivid ones`,

  structure: `STRUCTURE ATTACK — Break predictable sentence PATTERNS:
- Split long sentences at UNEXPECTED points (before conjunctions, after dependent clauses)
- Insert parenthetical asides that break the parse tree: "(which, honestly, surprised me)"
- Reorder clauses: put the subordinate clause FIRST, then the main clause
- Add mid-sentence interrupts: "—and this is the key part—" or "—well, mostly—"
- Start some sentences with gerunds: "Looking at the data," "Having considered both sides,"
- Break any sentence longer than 25 words into two`,

  register: `REGISTER ATTACK — MIX formality levels within paragraphs:
- In academic/formal text: insert ONE casual phrase per paragraph ("—which is kind of wild—", "the short version is")
- In casual text: insert ONE formal observation ("This aligns with the broader trend.")
- Use "—" to transition between register levels mid-sentence
- Switch from "one" to "you" to "we" within a paragraph
- After a formal claim, add a casual assessment: "Basically, it works."`,

  rhythm: `RHYTHM ATTACK — Create WILDLY varied sentence lengths:
- Pattern: LONG(32-50 words) → short(5-10) → very_short(2-6) → medium(14-22) → repeat
- Include at least ONE one-word sentence per paragraph for emphasis
- After any sentence longer than 25 words, the next MUST be under 8 words
- After any sentence shorter than 5 words, the next MUST be over 15 words
- Standard deviation of sentence lengths must be > 12 words
- Never have 3+ consecutive sentences within 5 words of each other`,
};

// 🔄 NOOB EXPLAINER: Why rotate axes?
// If we always attack the same way, the detector adjusts. By rotating
// through 4 different strategies, we keep the detector guessing.
// It's like a boxer switching between jabs, hooks, uppercuts, and body blows —
// the opponent can't predict what's coming next.
export function getAxisForPass(passNumber: number): Axis {
  const axes: Axis[] = ['perplexity', 'structure', 'register', 'rhythm'];
  return axes[passNumber % axes.length];
}

export function getAxisPrompt(axis: Axis): string {
  return AXIS_PROMPTS[axis];
}
