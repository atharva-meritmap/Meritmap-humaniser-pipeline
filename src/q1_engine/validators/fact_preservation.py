"""Fact preservation validator — hallucination detection via graph matching."""

from __future__ import annotations

from q1_engine.analyzers.fact_extractor import FactExtractor
from q1_engine.models import FactGraph
from q1_engine.utils.logging_setup import get_logger

log = get_logger("fact_preservation")


class FactPreservationValidator:
    """Validate that all specific facts are preserved after rewriting."""

    def __init__(self) -> None:
        self._extractor = FactExtractor()

    def validate(self, original_graph: FactGraph, rewritten_text: str) -> dict[str, bool | float | list[str]]:
        """Verify facts from original graph exist in rewritten text.
        
        Returns
        -------
        dict
            Results including passed status, retention score, and missing facts.
        """
        if not original_graph.facts:
            return {"passed": True, "score": 1.0, "lost_facts": []}

        # Check if the exact string value of the fact appears in the rewritten text
        # This is a strict literal check. LLMs shouldn't change numbers/metrics.
        rewritten_lower = rewritten_text.lower()
        
        lost_facts = []
        import re
        for fact in original_graph.facts:
            val = fact.value.lower()
            if val not in rewritten_lower:
                # Fallback: looser check. For numbers, ensure the number and at least one keyword are present.
                numbers = re.findall(r'\d+\.?\d*', val)
                words = [w for w in re.findall(r'[a-z]+', val) if len(w) > 2]
                
                passed_loose = False
                if numbers:
                    # Require all numbers to be present
                    passed_loose = all(num in rewritten_lower for num in numbers)
                    # And at least one meaningful word if any exist
                    if passed_loose and words:
                        passed_loose = any(word in rewritten_lower for word in words)
                elif words:
                    # If no numbers, require at least 50% of meaningful words to match
                    matches = sum(1 for word in words if word in rewritten_lower)
                    passed_loose = matches >= max(1, len(words) * 0.5)
                    
                if not passed_loose:
                    # To prevent rich logger from hiding tags like [metric], we use parentheses instead.
                    lost_facts.append(f"({fact.fact_type.value}) {fact.value}")

        total = len(original_graph.facts)
        retained = total - len(lost_facts)
        score = retained / total if total > 0 else 1.0
        
        # We require 100% preservation for strict facts
        passed = len(lost_facts) == 0

        if not passed:
            log.warning("Fact preservation failed! Lost %d/%d facts: %s", 
                        len(lost_facts), total, lost_facts)

        return {
            "passed": passed,
            "score": score,
            "lost_facts": lost_facts,
        }
