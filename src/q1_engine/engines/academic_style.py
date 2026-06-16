"""Academic style engine — AI pattern detection and domain-aware rewriting.

Phase 1: Rule-based pattern detection (no LLM).
Phase 2: LLM-based rewriting of flagged paragraphs (delegates to LLMRewriter).
"""

from __future__ import annotations

import re
from typing import Any

from q1_engine.models import ContentBlock, ContentType, DomainProfile, Section
from q1_engine.utils.logging_setup import get_logger
from q1_engine.utils.patterns import detect_patterns

log = get_logger("academic_style")

# Sentence-starter repetition detection
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


def _detect_repetitive_starters(text: str, threshold: int = 3) -> list[str]:
    """Detect sequences of sentences starting the same way."""
    sentences = _SENT_SPLIT.split(text)
    issues: list[str] = []
    if len(sentences) < threshold:
        return issues

    for i in range(len(sentences) - threshold + 1):
        starters = []
        for s in sentences[i : i + threshold]:
            words = s.strip().split()
            if words:
                starters.append(words[0].lower())
        if len(set(starters)) == 1:
            issues.append(
                f"Repetitive starter '{starters[0]}' in {threshold} consecutive sentences"
            )
    return issues


def _detect_passive_voice_overuse(text: str, threshold: float = 0.6) -> list[str]:
    """Detect overuse of passive voice constructions."""
    sentences = _SENT_SPLIT.split(text)
    if not sentences:
        return []

    passive_patterns = [
        re.compile(r"\b(?:is|are|was|were|been|being)\s+\w+ed\b", re.IGNORECASE),
        re.compile(r"\b(?:is|are|was|were)\s+\w+en\b", re.IGNORECASE),
        re.compile(r"\bIt\s+(?:is|was)\s+(?:shown|demonstrated|observed|noted|found)\b"),
    ]

    passive_count = 0
    for sent in sentences:
        if any(p.search(sent) for p in passive_patterns):
            passive_count += 1

    ratio = passive_count / max(len(sentences), 1)
    issues: list[str] = []
    if ratio > threshold:
        issues.append(
            f"Passive voice overuse: {passive_count}/{len(sentences)} sentences "
            f"({ratio:.0%}) — consider using active voice for clarity"
        )
    return issues


class AcademicStyleEngine:
    """Detect AI writing patterns and rewrite for academic quality."""

    def __init__(self, llm_rewriter: Any = None) -> None:
        self._llm = llm_rewriter

    def detect_issues(self, text: str) -> list[dict[str, Any]]:
        """Detect AI writing patterns and style issues (Phase 1).

        Returns a list of issue dicts with keys: type, severity, description, count.
        """
        issues: list[dict[str, Any]] = []

        # AI pattern detection
        patterns = detect_patterns(text, min_severity="cosmetic")
        for pattern, count in patterns:
            issues.append({
                "type": "ai_pattern",
                "severity": pattern.severity,
                "description": f"'{pattern.pattern}' — {pattern.suggestion}",
                "count": count,
                "category": pattern.category,
            })

        # Repetitive sentence starters
        for issue in _detect_repetitive_starters(text):
            issues.append({
                "type": "repetitive_starter",
                "severity": "should_fix",
                "description": issue,
                "count": 1,
            })

        # Passive voice overuse
        for issue in _detect_passive_voice_overuse(text):
            issues.append({
                "type": "passive_voice",
                "severity": "cosmetic",
                "description": issue,
                "count": 1,
            })

        return issues

    async def rewrite_section(
        self,
        section: Section,
        domain: DomainProfile,
    ) -> Section:
        """Rewrite text blocks in a section that have detected issues.

        Only rewrites blocks with detected issues. Protected blocks
        are never touched.
        """
        if self._llm is None:
            log.warning("No LLM rewriter configured — skipping style rewriting")
            return section

        for block in section.text_blocks:
            if not block.plain_text.strip():
                continue

            issues = self.detect_issues(block.plain_text)
            if not issues:
                log.debug("No issues in block — skipping rewrite")
                continue

            must_fix = sum(1 for i in issues if i["severity"] == "must_fix")
            should_fix = sum(1 for i in issues if i["severity"] == "should_fix")
            log.debug(
                "Block has %d must-fix, %d should-fix issues — rewriting",
                must_fix, should_fix,
            )

            rewritten = await self._llm.rewrite(block.raw_latex, domain)
            block.rewritten_text = rewritten

        return section
