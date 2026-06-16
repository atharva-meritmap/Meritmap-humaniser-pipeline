"""Readability optimizer — splits long sentences and simplifies constructions."""

from __future__ import annotations

import re

from q1_engine.models import ReadabilityConfig
from q1_engine.utils.logging_setup import get_logger

log = get_logger("readability_optimizer")

# Split points for long sentences
_SPLIT_CONJUNCTIONS = re.compile(
    r",\s*(?:and|but|however|whereas|while|although|though|yet)\s+",
    re.IGNORECASE,
)
_SPLIT_SEMICOLON = re.compile(r";\s+")
_SPLIT_WHICH = re.compile(r",\s*which\s+")

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


class ReadabilityOptimizer:
    """Optimize text readability by splitting long sentences."""

    def __init__(self, config: ReadabilityConfig) -> None:
        self._max_words = config.max_sentence_length

    def _split_long_sentence(self, sentence: str) -> list[str]:
        """Split a single long sentence at natural breakpoints."""
        words = sentence.split()
        if len(words) <= self._max_words:
            return [sentence]

        # Try splitting at semicolons first
        parts = _SPLIT_SEMICOLON.split(sentence)
        if len(parts) > 1 and all(len(p.split()) >= 5 for p in parts):
            return [p.strip().rstrip(".") + "." for p in parts if p.strip()]

        # Try splitting at conjunctions
        parts = _SPLIT_CONJUNCTIONS.split(sentence)
        if len(parts) > 1 and all(len(p.split()) >= 5 for p in parts):
            result = []
            for i, p in enumerate(parts):
                p = p.strip()
                if not p:
                    continue
                if not p.endswith("."):
                    p += "."
                # Capitalize first word of new sentence
                if i > 0 and p:
                    p = p[0].upper() + p[1:]
                result.append(p)
            return result

        # Try splitting at ", which"
        parts = _SPLIT_WHICH.split(sentence)
        if len(parts) > 1 and all(len(p.split()) >= 5 for p in parts):
            result = []
            for i, p in enumerate(parts):
                p = p.strip()
                if not p:
                    continue
                if i > 0:
                    p = "This " + p[0].lower() + p[1:] if p else p
                if not p.endswith("."):
                    p += "."
                result.append(p)
            return result

        return [sentence]

    def optimize(self, text: str) -> str:
        """Optimize readability by splitting overly long sentences.

        Parameters
        ----------
        text
            Plain text (may contain LaTeX placeholders).

        Returns
        -------
        Optimized text with long sentences split.
        """
        sentences = _SENT_SPLIT.split(text)
        result_sentences: list[str] = []
        splits_made = 0

        for sent in sentences:
            words = sent.split()
            if len(words) > self._max_words:
                parts = self._split_long_sentence(sent)
                if len(parts) > 1:
                    splits_made += 1
                result_sentences.extend(parts)
            else:
                result_sentences.append(sent)

        if splits_made > 0:
            log.info("Split %d overly long sentences", splits_made)

        return " ".join(result_sentences)
