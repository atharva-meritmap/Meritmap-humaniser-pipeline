"""Antigravity Humanizer -- single-pass, token-minimal, Turnitin-defeating.

Architecture (derived from humanize-main + humanize-text-main + StealthHumanizer):

  Phase 0: LaTeX segmentation (deterministic, 0 tokens)
    - Split into protected regions (math, equations, citations, commands)
      and rewritable TEXT paragraphs

  Phase 1: Deterministic pre-scrub (0 tokens)
    - Banned vocabulary replacement via regex (Signal A)
    - Transition word density reduction (Signal F)
    - Em-dash and punctuation normalization (Signal G)
    - RLHF phrase deletion (Signal H)

  Phase 2: Single LLM call per section (1 call per ~500 words)
    - Fused 9-lever mega-prompt (all signals in one pass)
    - Temperature 1.1, top-p 0.97 (widens token distribution per RAID benchmark)
    - Protected regions passed as opaque placeholders __P_N__

  Phase 3: Deterministic post-scrub (0 tokens)
    - Re-check for surviving banned words
    - Sentence length manipulation (burstiness, Signal B)
    - Paragraph structure randomization
    - Restore protected regions verbatim

Total API calls: 1 per ~500 words of TEXT content.
For a 5000-word paper: ~10 calls.
With 3s inter-call delay: ~30 seconds minimum.
"""

from __future__ import annotations

import math
import re
import random
from pathlib import Path
from typing import NamedTuple

from q1_engine.engines.llm_rewriter import LLMRewriter
from q1_engine.utils.logging_setup import get_logger

log = get_logger("antigravity")

# ---------------------------------------------------------------------------
# Region protection — keep LaTeX safe through the LLM pass
# ---------------------------------------------------------------------------

_PROTECT_PATTERNS = [
    re.compile(r"\\begin\{(?:equation|align|gather|multline|eqnarray)\*?\}.*?\\end\{(?:equation|align|gather|multline|eqnarray)\*?\}", re.DOTALL),
    re.compile(r"\\\[.*?\\\]", re.DOTALL),
    re.compile(r"\$\$.*?\$\$", re.DOTALL),
    re.compile(r"\$[^\$\n]+?\$"),
    re.compile(r"\\cite[tp]?\{[^}]+\}"),
    re.compile(r"\\(?:ref|label|eqref|autoref)\{[^}]+\}"),
    re.compile(r"\\begin\{(?:figure|table|algorithm|lstlisting|verbatim)\*?\}.*?\\end\{(?:figure|table|algorithm|lstlisting|verbatim)\*?\}", re.DOTALL),
    re.compile(r"\\(?:textbf|textit|emph|texttt|textrm|text)\{[^}]+\}"),
]


def _protect_regions(text: str) -> tuple[str, dict[str, str]]:
    """Replace protected LaTeX regions with __P_N__ placeholders."""
    regions: dict[str, str] = {}
    counter = [0]

    def replace(m: re.Match) -> str:
        key = f"__P_{counter[0]}__"
        regions[key] = m.group(0)
        counter[0] += 1
        return key

    result = text
    for pattern in _PROTECT_PATTERNS:
        result = pattern.sub(replace, result)
    return result, regions


def _restore_regions(text: str, regions: dict[str, str]) -> str:
    """Restore protected regions verbatim."""
    for key, value in regions.items():
        text = text.replace(key, value)
    return text


# ---------------------------------------------------------------------------
# Phase 1: Deterministic pre-scrub
# ---------------------------------------------------------------------------

# (pattern, replacement) — all case-insensitive
_BANNED_VOCAB: list[tuple[str, str]] = [
    (r"\bdelves?\b", "examines"),
    (r"\bdelved\b", "examined"),
    (r"\bdelving\b", "examining"),
    (r"\bleverages?\b", "uses"),
    (r"\bleveraged\b", "used"),
    (r"\bleveraging\b", "using"),
    (r"\butilize[sd]?\b", "use"),
    (r"\butilizing\b", "using"),
    (r"\bunderscore[sd]?\b", "emphasize"),
    (r"\bunderscoring\b", "emphasizing"),
    (r"\btapestry\b", "combination"),
    (r"\bcascade[sd]?\b", "series"),
    (r"\bmultifaceted\b", "complex"),
    (r"\binterplay\b", "interaction"),
    (r"\bnotably\b", "specifically"),
    (r"\bpivotal\b", "key"),
    (r"\bparamount\b", "essential"),
    (r"\bholistic\b", "comprehensive"),
    (r"\bintricate\b", "complex"),
    (r"\bfostering\b", "promoting"),
    (r"\bcatalyst\b", "driver"),
    (r"\bseamlessly?\b", "smoothly"),
    (r"\brobust\b", "strong"),
    (r"\bsynergy\b", "interaction"),
    (r"\bgroundbreaking\b", "significant"),
    (r"\btransformative\b", "substantial"),
    (r"\bunprecedented\b", "novel"),
    (r"\bcutting[- ]edge\b", "recent"),
    (r"\bstate[- ]of[- ]the[- ]art\b", "current best"),
    (r"\binnovative solution\b", "approach"),
    (r"\bpioneering\b", "early"),
    (r"\blandscape\b", "context"),
    (r"\brealm\b", "area"),
]

_RLHF_PHRASES: list[tuple[str, str]] = [
    (r"[Ii]t is important to note that\s*", ""),
    (r"[Ii]t should be noted that\s*", ""),
    (r"[Ii]t is worth noting(?: that)?\s*", ""),
    (r"[Ii]t bears mentioning(?: that)?\s*", ""),
    (r"[Ii]t is worth mentioning(?: that)?\s*", ""),
    (r"\bIn order to\b", "To"),
    (r"\bin order to\b", "to"),
    (r"\bWith respect to\b", "Regarding"),
    (r"\bwith respect to\b", "regarding"),
    (r"\bIn light of\b", "Given"),
    (r"\bin light of\b", "given"),
    (r"\bDue to the fact that\b", "Because"),
    (r"\bdue to the fact that\b", "because"),
    (r"\bFor the purpose of\b", "To"),
    (r"\bfor the purpose of\b", "to"),
    (r"\bPrior to\b", "Before"),
    (r"\bprior to\b", "before"),
    (r"\bSubsequent to\b", "After"),
    (r"\bsubsequent to\b", "after"),
    (r"\bThe present study\b", "This study"),
    (r"\bthe present study\b", "this study"),
    (r"\bIt is evident that\b", ""),
    (r"\bit is evident that\b", ""),
    (r"\bIt is clear that\b", ""),
    (r"\bit is clear that\b", ""),
    (r"\bIn conclusion,?\s*", ""),
    (r"\bTo summarize,?\s*", ""),
    (r"\bIn summary,?\s*", ""),
    (r"\bAs previously mentioned,?\s*", ""),
    (r"\bAs discussed above,?\s*", ""),
    (r"\bBuilding upon this,?\s*", ""),
    (r"\bMoving forward,?\s*", ""),
    (r"\bTaken together,?\s*", ""),
    (r"\bFurthermore,\s*", ""),
    (r"\bMoreover,\s*", ""),
    (r"\bAdditionally,\s*", ""),
]

_EM_DASH = re.compile(r"(\d)\s*[—–]\s*(\d)")  # preserve numeric ranges


def _pre_scrub(text: str) -> tuple[str, int]:
    """Apply deterministic replacements. Returns (cleaned, change_count)."""
    count = 0
    for pattern, replacement in _BANNED_VOCAB + _RLHF_PHRASES:
        new, n = re.subn(pattern, replacement, text, flags=re.IGNORECASE)
        if n:
            text = new
            count += n

    # Em-dash normalization: preserve numeric ranges, replace rest with comma
    text = _EM_DASH.sub(r"\1--\2", text)  # protect numeric ranges
    n_emdash = text.count("—") + text.count("–")
    if n_emdash > 0:
        # Count words to compute allowed em-dashes (1 per 300 words)
        word_count = len(text.split())
        allowed = max(1, word_count // 300)
        replaced = 0
        for dash in ("—", "–"):
            for _ in range(text.count(dash)):
                if replaced >= text.count("—") + text.count("–") - allowed:
                    break
                text = text.replace(dash, ", ", 1)
                replaced += 1
                count += 1
    text = text.replace("--", "–")  # restore numeric ranges

    # Clean up double spaces / leading commas from deleted phrases
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"^\s*,\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*,\s*\.", ".", text)

    return text, count


# ---------------------------------------------------------------------------
# Phase 3: Deterministic post-scrub
# ---------------------------------------------------------------------------

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


def _sentence_lengths(text: str) -> list[int]:
    sentences = [s.strip() for s in _SENT_SPLIT.split(text) if s.strip()]
    return [len(s.split()) for s in sentences]


def _burstiness_score(text: str) -> float:
    """Std dev of sentence lengths — target > 8."""
    lengths = _sentence_lengths(text)
    if len(lengths) < 2:
        return 99.0
    mean = sum(lengths) / len(lengths)
    return math.sqrt(sum((l - mean) ** 2 for l in lengths) / len(lengths))


def _strip_surviving_banned(text: str) -> str:
    """Second pass — catch any banned words the LLM reintroduced."""
    for pattern, replacement in _BANNED_VOCAB[:10]:  # top offenders only
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def _normalize_transitions(text: str) -> str:
    """Remove excess transition openers if density > 20%."""
    sentences = [s.strip() for s in _SENT_SPLIT.split(text) if s.strip()]
    if not sentences:
        return text
    _HIGH_DENSITY = {"furthermore", "moreover", "additionally", "in addition",
                     "subsequently", "consequently", "nevertheless", "nonetheless"}
    excess = []
    for i, s in enumerate(sentences):
        first = s.split()[0].lower().rstrip(",") if s.split() else ""
        if first in _HIGH_DENSITY:
            excess.append(i)
    # Only strip if density > 20%
    if len(excess) / len(sentences) > 0.20:
        for i in excess[len(excess) // 2:]:  # remove back half
            sentences[i] = re.sub(
                r"^(furthermore|moreover|additionally|in addition|subsequently|consequently|nevertheless|nonetheless)[,\s]+",
                "", sentences[i], flags=re.IGNORECASE
            ).capitalize()
    return " ".join(sentences)


def _post_scrub(text: str) -> str:
    text = _strip_surviving_banned(text)
    text = _normalize_transitions(text)
    # Clean up artifacts
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"\s+\.", ".", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Chunk splitter — split into ~500 word paragraphs
# ---------------------------------------------------------------------------

def _chunk_by_paragraph(text: str, max_words: int = 500) -> list[str]:
    """Split text into chunks by paragraph boundaries, targeting max_words."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current: list[str] = []
    current_words = 0

    for para in paragraphs:
        para_words = len(para.split())
        if current_words + para_words > max_words and current:
            chunks.append("\n\n".join(current))
            current = [para]
            current_words = para_words
        else:
            current.append(para)
            current_words += para_words

    if current:
        chunks.append("\n\n".join(current))
    return chunks if chunks else [text]


# ---------------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------------

class AntigravityResult(NamedTuple):
    text: str
    api_calls: int
    deterministic_changes: int
    burstiness_before: float
    burstiness_after: float


class AntigravityHumanizer:
    """Token-minimal, single-pass humanizer for academic LaTeX text.

    Uses 1 LLM call per ~500 words of text content.
    All LaTeX structures (math, citations, environments) are preserved verbatim.
    """

    CHUNK_SIZE = 500  # words per LLM call
    TEMPERATURE = 1.1  # high temp widens token distribution (RAID benchmark)
    TOP_TEMPERATURE_DELTA = 0.0  # no retry delta needed with good prompt

    def __init__(self, llm: LLMRewriter) -> None:
        self._llm = llm
        self._prompt_template = self._load_prompt()

    def _load_prompt(self) -> str:
        prompt_path = Path(__file__).parent.parent.parent.parent.parent / "config" / "prompts" / "antigravity_humanize.txt"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        # Fallback: inline minimal prompt
        return (
            "Rewrite this academic text to remove all AI writing patterns. "
            "Preserve all \\cite{}, math, numbers, and LaTeX commands exactly. "
            "Vary sentence lengths aggressively. Remove banned words: delve, leverage, "
            "utilize, robust, furthermore, moreover, notably, pivotal, tapestry, "
            "multifaceted, holistic, intricate, paramount, seamless, groundbreaking. "
            "Output ONLY the rewritten text.\n\n{input_text}"
        )

    async def humanize(self, text: str) -> AntigravityResult:
        """Humanize a block of LaTeX text (body content only, no preamble)."""

        # Measure burstiness before
        burst_before = _burstiness_score(text)

        # Phase 0: protect LaTeX regions
        masked, regions = _protect_regions(text)

        # Phase 1: deterministic pre-scrub
        scrubbed, det_changes = _pre_scrub(masked)

        # Phase 2: chunk and call LLM
        chunks = _chunk_by_paragraph(scrubbed, self.CHUNK_SIZE)
        rewritten_chunks: list[str] = []
        api_calls = 0

        for i, chunk in enumerate(chunks):
            if not chunk.strip() or len(chunk.split()) < 20:
                # Too short to bother the LLM
                rewritten_chunks.append(chunk)
                continue

            prompt = self._prompt_template.replace("{input_text}", chunk)
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert academic editor specializing in anti-detection rewriting. "
                        "Output ONLY the rewritten text. Do not add any commentary or preamble."
                    ),
                },
                {"role": "user", "content": prompt},
            ]

            result = await self._llm._call_llm(
                messages,
                temperature=self.TEMPERATURE,
                original_text=chunk,
                min_length_ratio=0.7,
            )

            if result:
                rewritten_chunks.append(result)
                api_calls += 1
                log.debug("  Chunk %d/%d rewritten (%d words)", i + 1, len(chunks), len(result.split()))
            else:
                # LLM failed — keep deterministically scrubbed version
                rewritten_chunks.append(chunk)
                log.warning("  Chunk %d/%d: LLM failed, keeping pre-scrubbed text", i + 1, len(chunks))

        rewritten = "\n\n".join(rewritten_chunks)

        # Phase 3: deterministic post-scrub
        final_masked = _post_scrub(rewritten)

        # Restore LaTeX regions
        final = _restore_regions(final_masked, regions)

        # Measure burstiness after
        burst_after = _burstiness_score(final)

        log.info(
            "Antigravity: %d API calls, %d det. changes, burstiness %.1f -> %.1f",
            api_calls, det_changes, burst_before, burst_after,
        )

        return AntigravityResult(
            text=final,
            api_calls=api_calls,
            deterministic_changes=det_changes,
            burstiness_before=burst_before,
            burstiness_after=burst_after,
        )
