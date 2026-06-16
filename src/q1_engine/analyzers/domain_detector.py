"""Domain detector — identifies the academic field of a manuscript.

Uses keyword frequency analysis against domain profiles to classify
the manuscript into Computer Science, Medicine, Engineering, etc.
"""

from __future__ import annotations

import re
from collections import Counter

from q1_engine.config import get_available_domains, load_domain_profile
from q1_engine.models import DomainLabel, DomainProfile, Section
from q1_engine.utils.logging_setup import get_logger

log = get_logger("domain_detector")

_DOMAIN_LABEL_MAP: dict[str, DomainLabel] = {
    "computer_science": DomainLabel.COMPUTER_SCIENCE,
    "medicine": DomainLabel.MEDICINE,
    "engineering": DomainLabel.ENGINEERING,
    "psychology": DomainLabel.PSYCHOLOGY,
    "economics": DomainLabel.ECONOMICS,
    "materials_science": DomainLabel.MATERIALS_SCIENCE,
}


class DomainDetector:
    """Detect the academic field of a manuscript via keyword matching."""

    def __init__(self) -> None:
        self._domain_keywords: dict[str, list[str]] = {}
        self._load_domains()

    def _load_domains(self) -> None:
        """Load keyword indicators from all domain config files."""
        for name in get_available_domains():
            try:
                profile = load_domain_profile(name)
                keywords = profile.get("keyword_indicators", [])
                self._domain_keywords[name] = [k.lower() for k in keywords]
            except Exception as exc:
                log.debug("Could not load domain %s: %s", name, exc)

    def detect(self, sections: list[Section]) -> DomainProfile:
        """Classify the manuscript's academic domain.

        Parameters
        ----------
        sections
            Extracted sections with plain text content.

        Returns
        -------
        DomainProfile with detected domain, confidence, and top keywords.
        """
        # Concatenate all plain text
        all_text = " ".join(s.all_text for s in sections).lower()

        if not all_text.strip():
            log.warning("No text content for domain detection")
            return DomainProfile(domain=DomainLabel.GENERAL, confidence=0.0)

        # Tokenize into words
        words = re.findall(r"[a-z][\w-]*", all_text)
        bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
        text_tokens = set(words) | set(bigrams)

        # Score each domain by keyword overlap
        scores: dict[str, tuple[int, list[str]]] = {}
        for domain_name, keywords in self._domain_keywords.items():
            matched = [kw for kw in keywords if kw in text_tokens or kw in all_text]
            scores[domain_name] = (len(matched), matched)

        if not scores:
            return DomainProfile(domain=DomainLabel.GENERAL, confidence=0.0)

        # Sort by match count
        ranked = sorted(scores.items(), key=lambda x: x[1][0], reverse=True)
        best_name, (best_count, best_keywords) = ranked[0]

        # Confidence = matched / total keywords for that domain
        total_keywords = len(self._domain_keywords.get(best_name, [1]))
        confidence = best_count / max(total_keywords, 1)

        # Runner-up
        runner_up_label = None
        runner_up_conf = 0.0
        if len(ranked) > 1:
            ru_name, (ru_count, _) = ranked[1]
            ru_total = len(self._domain_keywords.get(ru_name, [1]))
            runner_up_label = _DOMAIN_LABEL_MAP.get(ru_name, DomainLabel.GENERAL)
            runner_up_conf = ru_count / max(ru_total, 1)

        domain_label = _DOMAIN_LABEL_MAP.get(best_name, DomainLabel.GENERAL)

        log.info(
            "Detected domain: %s (confidence: %.2f, %d keyword matches)",
            domain_label.value, confidence, best_count,
        )

        return DomainProfile(
            domain=domain_label,
            confidence=round(confidence, 3),
            top_keywords=best_keywords[:10],
            runner_up=runner_up_label,
            runner_up_confidence=round(runner_up_conf, 3),
        )
