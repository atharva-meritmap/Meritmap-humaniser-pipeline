"""Journal adapter — applies journal-specific structural and style constraints.

Ensures the manuscript adheres to section ordering, word limits, and style
conventions required by the target journal (IEEE, ACM, Nature, etc.).
"""

from __future__ import annotations

import re
from typing import Any

from q1_engine.config import load_journal_profile
from q1_engine.models import (
    JournalCompliance,
    JournalMatch,
    JournalRecommendations,
    Section,
    SectionType,
)
from q1_engine.utils.logging_setup import get_logger

log = get_logger("journal_adapter")

# Section mapping standardizer
_SECTION_LABEL_MAP: dict[str, SectionType] = {
    "abstract": SectionType.ABSTRACT,
    "introduction": SectionType.INTRODUCTION,
    "related_work": SectionType.RELATED_WORK,
    "literature_review": SectionType.LITERATURE_REVIEW,
    "methodology": SectionType.METHODOLOGY,
    "experiments": SectionType.EXPERIMENTS,
    "results": SectionType.RESULTS,
    "discussion": SectionType.DISCUSSION,
    "conclusion": SectionType.CONCLUSION,
    "acknowledgments": SectionType.ACKNOWLEDGMENTS,
}


class JournalAdapter:
    """Apply target journal constraints to the manuscript."""

    def __init__(self, target_journal: str | None = None) -> None:
        self._target = target_journal
        self._profile: dict[str, Any] = {}
        if target_journal:
            try:
                self._profile = load_journal_profile(target_journal.lower())
                log.info("Loaded journal profile: %s", self._profile.get("name", target_journal))
            except Exception as exc:
                log.error("Failed to load journal profile '%s': %s", target_journal, exc)

    def check_compliance(self, sections: list[Section]) -> JournalCompliance:
        """Check manuscript compliance against target journal rules."""
        if not self._profile:
            return JournalCompliance(target_journal="None", overall_compliant=True)

        style = self._profile.get("style", {})
        journal_name = self._profile.get("name", self._target or "Unknown")
        compliance = JournalCompliance(target_journal=journal_name, overall_compliant=True)

        # 1. Abstract word limit
        abstract_limit = style.get("abstract_max_words")
        if abstract_limit:
            abstract = next((s for s in sections if s.section_type == SectionType.ABSTRACT), None)
            if abstract:
                word_count = len(abstract.all_text.split())
                if word_count > abstract_limit:
                    compliance.is_compliant = False
                    compliance.add_issue(
                        "abstract_length",
                        f"Abstract is {word_count} words (max {abstract_limit})",
                        is_blocking=True,
                    )
                else:
                    compliance.add_passed("abstract_length")

        # 2. Section ordering
        expected_order_raw = style.get("section_order", [])
        if expected_order_raw:
            expected_order = [
                _SECTION_LABEL_MAP.get(name.lower()) 
                for name in expected_order_raw 
                if name.lower() in _SECTION_LABEL_MAP
            ]
            
            # Filter manuscript sections to only those in the expected list
            present_sections = [s.section_type for s in sections if s.section_type in expected_order]
            # Remove duplicates preserving order
            present_dedup = list(dict.fromkeys(present_sections))
            
            # Check if actual order matches expected order for the present sections
            actual_idx = [expected_order.index(s) for s in present_dedup if s in expected_order]
            if actual_idx != sorted(actual_idx):
                compliance.is_compliant = False
                compliance.add_issue(
                    "section_order",
                    "Sections are not in the order required by the journal",
                    is_blocking=False,
                )
            else:
                compliance.add_passed("section_order")

        # 3. Keywords
        if style.get("requires_keywords", False):
            # Check if \keywords or \begin{keywords} exists in abstract/intro or preamble
            # This is a simplification; a true check would need access to the preamble
            # For now, we just flag it as a reminder
            compliance.add_issue(
                "keywords",
                "Ensure keywords are provided (required by journal)",
                is_blocking=False,
            )

        log.info(
            "Compliance check for %s: %s (%d issues)", 
            journal_name, 
            "PASS" if compliance.is_compliant else "FAIL",
            len([i for i in compliance.items if not i.passed])
        )
        return compliance

    def recommend_journals(self, domain: str, score: float) -> JournalRecommendations:
        """Recommend journals based on domain and reviewer score."""
        # This is a placeholder for a more sophisticated matching algorithm
        # In a real system, this would query a database of journal metrics
        recs = JournalRecommendations()
        
        if score >= 8.5:
            if domain == "computer_science":
                recs.add_match("IEEE TPAMI", 0.95, "Top-tier vision/ML journal. Score implies strong novelty.")
                recs.add_match("ACM Computing Surveys", 0.90, "If the paper has extensive literature review.")
            elif domain == "medicine":
                recs.add_match("The Lancet", 0.92, "High impact, requires strict methodology.")
            else:
                recs.add_match("Nature Communications", 0.85, "High impact, broad scope.")
        elif score >= 7.0:
            if domain == "computer_science":
                recs.add_match("IEEE Transactions on Multimedia", 0.88, "Solid Q1 journal.")
                recs.add_match("Expert Systems with Applications", 0.85, "Good fit for applied AI.")
            else:
                recs.add_match("Scientific Reports", 0.80, "Solid Q1/Q2 open access.")
        else:
            recs.add_match("IEEE Access", 0.75, "High acceptance rate open access.")
            recs.add_match("PLOS One", 0.75, "Focuses on methodology over perceived impact.")

        return recs
