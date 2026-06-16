"""Humanisation scoring module.

Provides a unified before/after report on humanisation quality.
"""

from __future__ import annotations

from q1_engine.models import HumanisationReport
from q1_engine.scoring.ai_detection_scorer import AIDetectionScorer
from q1_engine.utils.logging_setup import get_logger
from q1_engine.utils.patterns import detect_patterns

log = get_logger("humanisation_scorer")

class HumanisationScorer:
    """Computes before/after metrics for humanisation."""

    def __init__(self, ai_scorer: AIDetectionScorer) -> None:
        self.ai_scorer = ai_scorer

    def score(self, original_text: str, humanised_text: str) -> HumanisationReport:
        """Generate a complete before/after report."""
        
        before = self.ai_scorer.score(original_text)
        after = self.ai_scorer.score(humanised_text)
        
        patterns_before = sum(c for _, c in detect_patterns(original_text, min_severity="cosmetic"))
        patterns_after = sum(c for _, c in detect_patterns(humanised_text, min_severity="cosmetic"))
        
        removed_pct = 0.0
        if patterns_before > 0:
            removed_pct = ((patterns_before - patterns_after) / patterns_before) * 100.0
            
        report = HumanisationReport(
            before=before,
            after=after,
            ai_patterns_before=patterns_before,
            ai_patterns_after=patterns_after,
            ai_patterns_removed_pct=removed_pct,
        )
        return report
