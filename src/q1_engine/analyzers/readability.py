"""Readability analyzer — computes readability metrics via textstat."""

from __future__ import annotations

import textstat

from q1_engine.models import ReadabilityMetrics, ReadabilityReport, Section
from q1_engine.utils.logging_setup import get_logger

log = get_logger("readability")


class ReadabilityAnalyzer:
    """Compute readability metrics for manuscript sections."""

    def analyze_text(self, text: str) -> ReadabilityMetrics:
        """Compute readability metrics for a plain text string."""
        if not text or len(text.split()) < 10:
            return ReadabilityMetrics()

        words = text.split()
        sentences = textstat.sentence_count(text) or 1

        return ReadabilityMetrics(
            flesch_reading_ease=textstat.flesch_reading_ease(text),
            flesch_kincaid_grade=textstat.flesch_kincaid_grade(text),
            gunning_fog=textstat.gunning_fog(text),
            coleman_liau=textstat.coleman_liau_index(text),
            ari=textstat.automated_readability_index(text),
            dale_chall=textstat.dale_chall_readability_score(text),
            smog_index=textstat.smog_index(text),
            avg_sentence_length=round(len(words) / sentences, 1),
            avg_word_length=round(
                sum(len(w) for w in words) / max(len(words), 1), 1
            ),
        )

    def analyze(self, sections: list[Section]) -> ReadabilityReport:
        """Compute readability report across all sections.

        The ``before`` field is populated; ``after`` is left empty
        to be filled after rewriting.
        """
        all_text = " ".join(s.all_text for s in sections)
        overall = self.analyze_text(all_text)

        per_section: dict[str, ReadabilityMetrics] = {}
        for section in sections:
            label = section.title or section.section_type.value
            text = section.all_text
            if text and len(text.split()) >= 10:
                per_section[label] = self.analyze_text(text)

        log.info(
            "Readability — Flesch: %.1f, Gunning Fog: %.1f, avg sentence: %.1f words",
            overall.flesch_reading_ease,
            overall.gunning_fog,
            overall.avg_sentence_length,
        )

        return ReadabilityReport(before=overall, per_section=per_section)
