"""Fact extractor — builds a structured FactGraph for hallucination detection.

Extracts numerical values, measurements, statistical claims, method names,
dataset references, and performance metrics from manuscript text.
"""

from __future__ import annotations

import re

from q1_engine.models import FactGraph, FactNode, FactType, Section, TextSpan
from q1_engine.utils.logging_setup import get_logger

log = get_logger("fact_extractor")

# ---------------------------------------------------------------------------
# Extraction patterns
# ---------------------------------------------------------------------------

_PATTERNS: list[tuple[FactType, re.Pattern, str]] = [
    # Percentages: 92.1%, 0.5%
    (FactType.PERCENTAGE, re.compile(r"\d+\.?\d*\s*%"), "percentage"),
    # P-values: p < 0.05, p = 0.001, p ≤ 0.01
    (FactType.STATISTICAL, re.compile(r"p\s*[<>=≤≥]\s*\d+\.?\d*", re.IGNORECASE), "p-value"),
    # Confidence intervals: 95% CI [1.2, 3.4]
    (FactType.STATISTICAL, re.compile(
        r"\d+\.?\d*\s*%?\s*CI\s*[\[\(]\s*\d+\.?\d*\s*[,;]\s*\d+\.?\d*\s*[\]\)]",
        re.IGNORECASE,
    ), "confidence interval"),
    # Effect sizes: d = 0.8, Cohen's d = 0.5
    (FactType.STATISTICAL, re.compile(
        r"(?:Cohen[''']?s?\s+)?d\s*=\s*\d+\.?\d*", re.IGNORECASE
    ), "effect size"),
    # Correlations: r = 0.85, r = -0.3
    (FactType.STATISTICAL, re.compile(
        r"r\s*=\s*[−-]?\s*\d+\.?\d*", re.IGNORECASE
    ), "correlation"),
    # Sample sizes: N = 150, n = 50
    (FactType.NUMERIC, re.compile(r"[Nn]\s*=\s*\d+"), "sample size"),
    # Performance metrics: F1-score of 0.87, accuracy of 92.1%
    (FactType.METRIC, re.compile(
        r"(?:F1(?:-score)?|accuracy|precision|recall|AUC|BLEU|ROUGE|mAP|"
        r"IoU|RMSE|MAE|MSE|R²|perplexity)\s*(?:of|=|:)?\s*\d+\.?\d*%?",
        re.IGNORECASE,
    ), "performance metric"),
    # Measurements with units: 3.2ms, 150MB, 2.5GHz
    (FactType.MEASUREMENT, re.compile(
        r"\d+\.?\d*\s*(?:ms|μs|ns|s|min|hours?|days?|"
        r"MB|GB|TB|KB|"
        r"GHz|MHz|kHz|Hz|"
        r"mm|cm|m|km|μm|nm|"
        r"mg|g|kg|μg|"
        r"mL|L|μL|"
        r"°C|°F|K)\b",
    ), "measurement"),
    # Generic decimal numbers (catch-all, lower priority)
    (FactType.NUMERIC, re.compile(r"(?<!\w)\d+\.\d+(?!\w)"), "decimal number"),
]

# Method / model names (proper nouns near method-indicating context)
_METHOD_INDICATORS = re.compile(
    r"(?:use|using|employ|based on|propose|implement|apply|train|fine-tune)\s+"
    r"([A-Z][A-Za-z0-9-]+(?:\s+[A-Z][A-Za-z0-9-]+)*)",
    re.IGNORECASE,
)

# Dataset references
_DATASET_INDICATORS = re.compile(
    r"(?:dataset|benchmark|corpus|trained on|evaluated on|tested on)\s+"
    r"([A-Z][A-Za-z0-9-]+(?:\s+[A-Z][A-Za-z0-9-]+)*)",
    re.IGNORECASE,
)

# Simple sentence splitter
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


def _get_sentence_context(text: str, match_start: int, match_end: int) -> str:
    """Get the sentence containing the match."""
    # Find sentence boundaries around the match
    sent_start = text.rfind(".", 0, match_start)
    sent_start = sent_start + 1 if sent_start != -1 else 0
    sent_end = text.find(".", match_end)
    sent_end = sent_end + 1 if sent_end != -1 else len(text)
    return text[sent_start:sent_end].strip()


class FactExtractor:
    """Extract structured facts from manuscript sections."""

    def extract(self, sections: list[Section]) -> FactGraph:
        """Build a FactGraph from manuscript sections.

        Parameters
        ----------
        sections
            Parsed sections with plain text content.

        Returns
        -------
        FactGraph containing all extracted facts.
        """
        facts: list[FactNode] = []

        for section in sections:
            section_name = section.title or section.section_type.value
            text = section.all_text
            if not text:
                continue

            # Extract pattern-based facts
            for fact_type, pattern, _label in _PATTERNS:
                for m in pattern.finditer(text):
                    context = _get_sentence_context(text, m.start(), m.end())
                    facts.append(FactNode(
                        value=m.group(0).strip(),
                        context=context,
                        fact_type=fact_type,
                        span=TextSpan(start=m.start(), end=m.end()),
                        section=section_name,
                    ))

            # Extract method names
            for m in _METHOD_INDICATORS.finditer(text):
                method_name = m.group(1).strip()
                if len(method_name) > 2:  # Skip very short matches
                    context = _get_sentence_context(text, m.start(), m.end())
                    facts.append(FactNode(
                        value=method_name,
                        context=context,
                        fact_type=FactType.METHOD,
                        span=TextSpan(start=m.start(1), end=m.end(1)),
                        section=section_name,
                    ))

            # Extract dataset references
            for m in _DATASET_INDICATORS.finditer(text):
                dataset_name = m.group(1).strip()
                if len(dataset_name) > 2:
                    context = _get_sentence_context(text, m.start(), m.end())
                    facts.append(FactNode(
                        value=dataset_name,
                        context=context,
                        fact_type=FactType.DATASET,
                        span=TextSpan(start=m.start(1), end=m.end(1)),
                        section=section_name,
                    ))

        # Deduplicate by value
        seen: set[str] = set()
        unique_facts: list[FactNode] = []
        for fact in facts:
            key = f"{fact.value}|{fact.fact_type.value}"
            if key not in seen:
                seen.add(key)
                unique_facts.append(fact)

        graph = FactGraph(facts=unique_facts)
        log.info(
            "Extracted %d unique facts (%d numeric, %d statistical, %d methods, %d datasets)",
            len(graph.facts),
            len(graph.numeric_facts),
            len(graph.statistical_facts),
            len(graph.method_facts),
            len(graph.dataset_facts),
        )
        return graph

    def extract_from_text(self, text: str, section_name: str = "") -> FactGraph:
        """Extract facts from a plain text string (for post-rewrite comparison)."""
        from q1_engine.models import Section, SectionType
        dummy_section = Section(
            title=section_name,
            section_type=SectionType.UNKNOWN,
            level=1,
            span=TextSpan(start=0, end=len(text)),
            blocks=[],
        )
        # Manually set all_text via a text block
        from q1_engine.models import ContentBlock, ContentType
        dummy_section.blocks = [ContentBlock(
            content_type=ContentType.TEXT,
            raw_latex=text,
            plain_text=text,
            span=TextSpan(start=0, end=len(text)),
        )]
        return self.extract([dummy_section])
