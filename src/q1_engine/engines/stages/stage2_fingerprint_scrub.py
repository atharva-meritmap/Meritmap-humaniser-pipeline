"""Stage 2: Fingerprint Scrub — remove AI lexical/syntactic/structural signatures."""

from __future__ import annotations

import re

from q1_engine.engines.llm_rewriter import LLMRewriter
from q1_engine.models import ContentType, Section, StageResult
from q1_engine.utils.logging_setup import get_logger
from q1_engine.utils.patterns import (
    ALL_PATTERNS,
    check_uniform_paragraph_lengths,
    detect_parallel_constructions,
)

log = get_logger("stage2")

# Deterministic lexical replacements: (pattern, replacement)
_LEXICAL_SCRUB: list[tuple[str, str]] = [
    (r"\bdelve\b", "examine"),
    (r"\bdelves\b", "examines"),
    (r"\bdelved\b", "examined"),
    (r"\bdelving\b", "examining"),
    (r"\bleverage\b", "use"),
    (r"\bleverages\b", "uses"),
    (r"\bleveraged\b", "used"),
    (r"\bleveraging\b", "using"),
    (r"\butilize\b", "use"),
    (r"\butilizes\b", "uses"),
    (r"\butilized\b", "used"),
    (r"\butilizing\b", "using"),
    (r"\bunderscore\b", "emphasize"),
    (r"\bunderscores\b", "emphasizes"),
    (r"\bhighlight\b", "show"),
    (r"\bhighlights\b", "shows"),
    (r"\bin the realm of\b", "in"),
    (r"\blandscape\b", "context"),
    (r"\btapestry\b", "combination"),
    (r"\bcascade\b", "series"),
    (r"\bmultifaceted\b", "complex"),
    (r"\binterplay\b", "interaction"),
    (r"\bnotably\b", "specifically"),
    (r"\bpivotal\b", "key"),
    (r"\bparamount\b", "essential"),
    (r"\bholistic\b", "comprehensive"),
    (r"\bintricate\b", "complex"),
    (r"\bfostering\b", "promoting"),
    (r"\bcatalyst\b", "driver"),
]

# Deterministic syntactic replacements
_SYNTACTIC_SCRUB: list[tuple[str, str]] = [
    (r"[Ii]t is important to note that\s*", ""),
    (r"[Ii]t should be noted that\s*", ""),
    (r"[Ii]t is worth noting that\s*", ""),
    (r"[Ii]t bears mentioning that\s*", ""),
    (r"\bIn order to\b", "To"),
    (r"\bin order to\b", "to"),
    (r"\bWith respect to\b", "Regarding"),
    (r"\bwith respect to\b", "regarding"),
    (r"\bIn light of\b", "Given"),
    (r"\bin light of\b", "given"),
    (r"\bThe present study\b", "This study"),
    (r"\bthe present study\b", "this study"),
    (r"\bThere is a growing body of evidence\b", "Research shows"),
    (r"\bthere is a growing body of evidence\b", "research shows"),
    (r"\bIt is widely acknowledged that\b", "Researchers recognize that"),
    (r"\bit is widely acknowledged that\b", "researchers recognize that"),
]


def _regex_scrub(text: str) -> tuple[str, int]:
    """Apply all deterministic scrub rules. Returns (cleaned_text, change_count)."""
    changes = 0
    for pattern, replacement in _LEXICAL_SCRUB + _SYNTACTIC_SCRUB:
        new_text, n = re.subn(pattern, replacement, text, flags=re.IGNORECASE)
        if n:
            text = new_text
            changes += n
    return text, changes


class Stage2FingerprintScrub:
    """Remove AI detection fingerprints via regex scrub + optional LLM scrub."""

    def __init__(self, llm: LLMRewriter) -> None:
        self._llm = llm

    async def run(self, sections: list[Section]) -> StageResult:
        """Scrub all text blocks in-place."""
        log.info("Stage 2: Fingerprint Scrub")
        total_changes = 0
        blocks_needing_llm = 0

        for section in sections:
            paragraphs = [b.plain_text for b in section.text_blocks if b.plain_text]
            uniform = check_uniform_paragraph_lengths(paragraphs) if len(paragraphs) > 2 else False
            parallel_idxs = set(detect_parallel_constructions(paragraphs))
            text_idx = 0

            for block in section.blocks:
                if block.content_type != ContentType.TEXT or not block.raw_latex.strip():
                    continue

                text = block.raw_latex
                # Phase A + B: deterministic
                text, changes = _regex_scrub(text)
                total_changes += changes

                # Phase B: structural — only LLM-scrub blocks with actual parallel constructions
                needs_llm = text_idx in parallel_idxs
                text_idx += 1

                if needs_llm:
                    blocks_needing_llm += 1
                    result = await self._llm.call_with_prompt(
                        "stage2_scrub",
                        {"input_text": text},
                        temperature=0.5,
                    )
                    if result:
                        text = result

                block.rewritten_text = text

        log.info("  %d deterministic replacements; %d blocks sent for LLM scrub",
                 total_changes, blocks_needing_llm)
        return StageResult(
            stage=2,
            stage_name="Fingerprint Scrub",
            metrics={"deterministic_changes": float(total_changes), "llm_blocks": float(blocks_needing_llm)},
        )
