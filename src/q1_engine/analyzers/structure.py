"""Structure analyzer — validates document structure against academic conventions."""

from __future__ import annotations

from typing import Any

from q1_engine.models import Section, SectionType
from q1_engine.utils.logging_setup import get_logger

log = get_logger("structure")

_EXPECTED_ORDER = [
    SectionType.ABSTRACT,
    SectionType.INTRODUCTION,
    SectionType.RELATED_WORK,
    SectionType.LITERATURE_REVIEW,
    SectionType.METHODOLOGY,
    SectionType.EXPERIMENTS,
    SectionType.RESULTS,
    SectionType.DISCUSSION,
    SectionType.CONCLUSION,
    SectionType.ACKNOWLEDGMENTS,
    SectionType.APPENDIX,
]

_REQUIRED_SECTIONS = {SectionType.ABSTRACT, SectionType.INTRODUCTION, SectionType.CONCLUSION}


class StructureAnalyzer:
    """Analyze and validate document structure."""

    def analyze(self, sections: list[Section]) -> dict[str, Any]:
        """Analyze document structure.

        Returns a dict with: section_order_valid, missing_sections,
        order_issues, section_balance, paragraph_stats.
        """
        present_types = [s.section_type for s in sections if s.section_type != SectionType.UNKNOWN]
        present_set = set(present_types)

        # Check missing required sections
        missing = _REQUIRED_SECTIONS - present_set
        missing_names = [s.value for s in missing]

        # Check ordering
        order_issues: list[str] = []
        expected_filtered = [s for s in _EXPECTED_ORDER if s in present_set]
        actual_filtered = [s for s in present_types if s in set(expected_filtered)]

        # Remove duplicates while preserving order
        seen: set[SectionType] = set()
        actual_deduped: list[SectionType] = []
        for s in actual_filtered:
            if s not in seen:
                seen.add(s)
                actual_deduped.append(s)

        for i, (expected, actual) in enumerate(zip(expected_filtered, actual_deduped)):
            if expected != actual:
                order_issues.append(
                    f"Expected '{expected.value}' at position {i+1}, found '{actual.value}'"
                )

        # Section balance
        total_words = sum(len(s.all_text.split()) for s in sections)
        section_balance: dict[str, float] = {}
        balance_issues: list[str] = []
        for section in sections:
            label = section.title or section.section_type.value
            words = len(section.all_text.split())
            pct = (words / max(total_words, 1)) * 100
            section_balance[label] = round(pct, 1)
            if pct > 50:
                balance_issues.append(f"'{label}' is {pct:.0f}% of the paper — consider splitting")

        # Paragraph stats
        para_lengths: list[int] = []
        for section in sections:
            for block in section.text_blocks:
                paragraphs = block.plain_text.split("\n\n")
                for p in paragraphs:
                    words = len(p.split())
                    if words > 5:
                        para_lengths.append(words)

        avg_para = sum(para_lengths) / max(len(para_lengths), 1)
        long_paras = sum(1 for p in para_lengths if p > 200)
        short_paras = sum(1 for p in para_lengths if p < 30)

        result = {
            "section_count": len(sections),
            "total_words": total_words,
            "section_order_valid": len(order_issues) == 0,
            "missing_sections": missing_names,
            "order_issues": order_issues,
            "section_balance": section_balance,
            "balance_issues": balance_issues,
            "paragraph_count": len(para_lengths),
            "avg_paragraph_length": round(avg_para, 1),
            "long_paragraphs": long_paras,
            "short_paragraphs": short_paras,
        }

        log.info(
            "Structure: %d sections, %d words, missing: %s, order issues: %d",
            result["section_count"], total_words,
            missing_names or "none", len(order_issues),
        )
        return result
