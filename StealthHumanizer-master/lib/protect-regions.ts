// Region protection: extract structural regions before processing and restore them
// after, so the humanization pipeline (LLM rewrite, postprocess synonym swaps,
// punctuation noise, sentence splitter, etc.) can't damage them.
//
// Replaced regions become tokens like `__PROTECT_42__` which:
//   - contain no period, so the sentence splitter ignores them
//   - are all-uppercase + underscores + digits, so swapSynonyms / aggressiveSynonymSwap
//     skip them (they short-circuit on all-caps and on tokens with no a-z chars)
//   - contain no whitespace, so they survive paragraph and chunk splits
//   - are visually distinctive enough that LLMs reliably pass them through verbatim
//     when instructed to preserve them
//
// Pattern order matters: greedy fenced code must come before inline code, images
// before links (they share `[`), URLs before mentions/hashtags (some hashtags or
// @-handles can appear inside URL paths, e.g. github.com/@user).

interface Pattern {
  name: string;
  regex: RegExp;
}

const PATTERNS: Pattern[] = [
  // Blockquote lines (line-based, multiline flag)
  { name: 'blockquote', regex: /^>.*$/gm },
  // Multi-line fenced code blocks. Must come before inline code so the inner
  // backticks of ```ts ... ``` don't match as inline.
  { name: 'fenced-code', regex: /```[\s\S]*?```/g },
  // Inline code: backtick-bounded, single-line, non-empty.
  { name: 'inline-code', regex: /`[^`\n]+`/g },
  // Markdown images: must come before links since both start with `[`.
  { name: 'image', regex: /!\[[^\]]*\]\([^)]+\)/g },
  // Markdown links.
  { name: 'link', regex: /\[[^\]]+\]\([^)]+\)/g },
  // Bare URLs. Stop before trailing sentence punctuation (.,!?;:) so the
  // period/comma at the end of a sentence stays as a boundary marker rather
  // than being swallowed into the URL token.
  { name: 'url', regex: /https?:\/\/[^\s<>)\]"']+?(?=[.,!?;:]?(?:[\s<>)\]"']|$))/g },
  // Email addresses.
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  // @-mentions (Twitter/Telegram/Slack-style handles). Negative lookbehind on
  // alphanumerics avoids matching emails or `something@here` mid-word — emails
  // are extracted in the prior pass anyway.
  { name: 'mention', regex: /(?<![a-zA-Z0-9_])@[a-zA-Z0-9_]+/g },
  // Hashtags. Same anti-overlap guard.
  { name: 'hashtag', regex: /(?<![a-zA-Z0-9_])#[a-zA-Z][a-zA-Z0-9_]*/g },
];

const PLACEHOLDER_RE = /__PROTECT_(\d+)__/g;

export interface ExtractResult {
  masked: string;
  regions: string[];
}

/** Extract all protected regions, replacing each with a unique placeholder token. */
export function extractRegions(text: string): ExtractResult {
  const regions: string[] = [];
  let masked = text;
  for (const { regex } of PATTERNS) {
    masked = masked.replace(regex, (match) => {
      const id = regions.length;
      regions.push(match);
      return `__PROTECT_${id}__`;
    });
  }
  return { masked, regions };
}

/** Restore protected regions in the order they were extracted. */
export function restoreRegions(text: string, regions: string[]): string {
  return text.replace(PLACEHOLDER_RE, (whole, idStr) => {
    const id = parseInt(idStr, 10);
    return regions[id] ?? whole;
  });
}

/** Whether the text contains any protect placeholders. Useful for prompt gating. */
export function containsPlaceholders(text: string): boolean {
  PLACEHOLDER_RE.lastIndex = 0;
  return PLACEHOLDER_RE.test(text);
}
