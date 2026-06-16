"""Redundancy remover — replaces verbose constructions with concise equivalents."""

from __future__ import annotations

import re

from q1_engine.utils.logging_setup import get_logger

log = get_logger("redundancy_remover")

# Verbose → concise replacements (case-insensitive)
_REPLACEMENTS: list[tuple[str, str]] = [
    ("in order to", "to"),
    ("due to the fact that", "because"),
    ("for the purpose of", "to"),
    ("a large number of", "many"),
    ("a significant number of", "many"),
    ("a considerable amount of", "much"),
    ("in the event that", "if"),
    ("at the present time", "currently"),
    ("at this point in time", "now"),
    ("prior to", "before"),
    ("subsequent to", "after"),
    ("in the vicinity of", "near"),
    ("has the ability to", "can"),
    ("is able to", "can"),
    ("in spite of the fact that", "although"),
    ("despite the fact that", "although"),
    ("regardless of the fact that", "although"),
    ("on the basis of", "based on"),
    ("with regard to", "regarding"),
    ("with respect to", "regarding"),
    ("in light of the fact that", "because"),
    ("owing to the fact that", "because"),
    ("as a consequence of", "because of"),
    ("as a result of", "because of"),
    ("for the reason that", "because"),
    ("by means of", "using"),
    ("by way of", "through"),
    ("in the course of", "during"),
    ("in the process of", "while"),
    ("in the amount of", "for"),
    ("in the near future", "soon"),
    ("a number of", "several"),
    ("the majority of", "most"),
    ("a minority of", "few"),
    ("on a daily basis", "daily"),
    ("on a regular basis", "regularly"),
    ("take into consideration", "consider"),
    ("take into account", "consider"),
    ("give consideration to", "consider"),
    ("make a decision", "decide"),
    ("come to a conclusion", "conclude"),
    ("conduct an investigation", "investigate"),
    ("perform an analysis", "analyze"),
    ("carry out an experiment", "experiment"),
    ("have an effect on", "affect"),
    ("have an impact on", "affect"),
    ("is indicative of", "indicates"),
    ("is reflective of", "reflects"),
    ("it is apparent that", "apparently"),
    ("it is clear that", "clearly"),
    ("it is evident that", "evidently"),
    ("it is obvious that", "obviously"),
]


class RedundancyRemover:
    """Remove verbose and redundant constructions from text."""

    def __init__(self) -> None:
        # Pre-compile patterns for efficiency
        self._patterns: list[tuple[re.Pattern, str]] = []
        for verbose, concise in _REPLACEMENTS:
            pattern = re.compile(re.escape(verbose), re.IGNORECASE)
            self._patterns.append((pattern, concise))

    def remove(self, text: str) -> str:
        """Replace verbose constructions with concise equivalents.

        Returns the cleaned text.
        """
        result = text
        total_replacements = 0

        for pattern, replacement in self._patterns:
            new_text, count = pattern.subn(replacement, result)
            if count > 0:
                total_replacements += count
                result = new_text

        if total_replacements > 0:
            log.info("Removed %d verbose constructions", total_replacements)

        return result
