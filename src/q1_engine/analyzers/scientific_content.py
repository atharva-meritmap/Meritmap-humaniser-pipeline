"""Scientific content analyzer — extracts numerical claims and statistics."""

from __future__ import annotations

import re
from typing import Any

from q1_engine.models import Section
from q1_engine.utils.logging_setup import get_logger

log = get_logger("scientific_content")

_PERCENTAGE = re.compile(r"(\d+\.?\d*)\s*%")
_P_VALUE = re.compile(r"p\s*[<>=≤≥]\s*\d+\.?\d*", re.IGNORECASE)
_CONFIDENCE_INTERVAL = re.compile(r"(\d+\.?\d*)\s*%?\s*(?:CI|confidence interval)", re.IGNORECASE)
_DECIMAL_NUMBER = re.compile(r"(?<!\w)(\d+\.\d+)(?!\w)")
_INTEGER = re.compile(r"(?<!\w)(\d{2,})(?!\w|\.\d)")
_EFFECT_SIZE = re.compile(r"(?:Cohen[''']?s?\s+)?d\s*=\s*\d+\.?\d*", re.IGNORECASE)
_CORRELATION = re.compile(r"r\s*=\s*[−-]?\d+\.?\d*", re.IGNORECASE)
_SAMPLE_SIZE = re.compile(r"[Nn]\s*=\s*\d+")


class ScientificContentAnalyzer:
    """Analyze scientific content for numerical claims and statistics."""

    def analyze(self, sections: list[Section]) -> dict[str, Any]:
        """Extract a scientific content fingerprint from the manuscript.

        Returns
        -------
        dict with keys: percentages, p_values, confidence_intervals,
        decimal_numbers, effect_sizes, correlations, sample_sizes,
        total_claims.
        """
        all_text = " ".join(s.all_text for s in sections)

        percentages = _PERCENTAGE.findall(all_text)
        p_values = _P_VALUE.findall(all_text)
        cis = _CONFIDENCE_INTERVAL.findall(all_text)
        decimals = _DECIMAL_NUMBER.findall(all_text)
        effect_sizes = _EFFECT_SIZE.findall(all_text)
        correlations = _CORRELATION.findall(all_text)
        sample_sizes = _SAMPLE_SIZE.findall(all_text)

        result = {
            "percentages": percentages,
            "p_values": p_values,
            "confidence_intervals": cis,
            "decimal_numbers": decimals,
            "effect_sizes": effect_sizes,
            "correlations": correlations,
            "sample_sizes": sample_sizes,
            "total_claims": (
                len(percentages) + len(p_values) + len(cis) +
                len(decimals) + len(effect_sizes) + len(correlations) +
                len(sample_sizes)
            ),
        }

        log.info("Extracted %d scientific claims", result["total_claims"])
        return result
