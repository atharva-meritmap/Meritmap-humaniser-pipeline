"""Section extractor — identifies and classifies document sections.

Uses regex on the original LaTeX source to find \\section, \\subsection, etc.
and classifies each section by its academic role (Introduction, Methodology, …).
"""

from __future__ import annotations

import re
from typing import Match

from q1_engine.models import (
    ContentBlock,
    ContentType,
    ParsedDocument,
    Section,
    SectionType,
    TextSpan,
)
from q1_engine.parsers.content_classifier import ContentClassifier
from q1_engine.utils.logging_setup import get_logger

log = get_logger("section_extractor")

# ---------------------------------------------------------------------------
# Section heading regex
# ---------------------------------------------------------------------------

_SECTION_CMD = re.compile(
    r"\\(section|subsection|subsubsection)\*?\{([^}]*)\}",
)

_ABSTRACT_ENV = re.compile(
    r"\\begin\{abstract\}(.*?)\\end\{abstract\}",
    re.DOTALL,
)

# Mapping from title keywords → SectionType
_SECTION_KEYWORDS: dict[str, SectionType] = {
    "abstract": SectionType.ABSTRACT,
    "introduction": SectionType.INTRODUCTION,
    "related work": SectionType.RELATED_WORK,
    "literature review": SectionType.LITERATURE_REVIEW,
    "literature": SectionType.LITERATURE_REVIEW,
    "background": SectionType.RELATED_WORK,
    "prior work": SectionType.RELATED_WORK,
    "methodology": SectionType.METHODOLOGY,
    "method": SectionType.METHODOLOGY,
    "methods": SectionType.METHODOLOGY,
    "proposed method": SectionType.METHODOLOGY,
    "approach": SectionType.METHODOLOGY,
    "system design": SectionType.METHODOLOGY,
    "experimental setup": SectionType.EXPERIMENTS,
    "experiments": SectionType.EXPERIMENTS,
    "experiment": SectionType.EXPERIMENTS,
    "evaluation": SectionType.EXPERIMENTS,
    "results": SectionType.RESULTS,
    "result": SectionType.RESULTS,
    "findings": SectionType.RESULTS,
    "discussion": SectionType.DISCUSSION,
    "analysis": SectionType.DISCUSSION,
    "conclusion": SectionType.CONCLUSION,
    "conclusions": SectionType.CONCLUSION,
    "concluding remarks": SectionType.CONCLUSION,
    "summary": SectionType.CONCLUSION,
    "future work": SectionType.CONCLUSION,
    "acknowledgment": SectionType.ACKNOWLEDGMENTS,
    "acknowledgments": SectionType.ACKNOWLEDGMENTS,
    "acknowledgements": SectionType.ACKNOWLEDGMENTS,
    "appendix": SectionType.APPENDIX,
}

_LEVEL_MAP = {"section": 1, "subsection": 2, "subsubsection": 3}


def _classify_section(title: str) -> SectionType:
    """Classify a section by its title."""
    title_lower = title.strip().lower()
    # Remove numbering like "1. ", "I. ", "A. "
    title_lower = re.sub(r"^[\dIVXivx]+\.\s*", "", title_lower)

    for keyword, stype in _SECTION_KEYWORDS.items():
        if keyword in title_lower:
            return stype
    return SectionType.UNKNOWN


class SectionExtractor:
    """Extract and classify sections from a parsed LaTeX document."""

    def __init__(self) -> None:
        self._classifier = ContentClassifier()

    def extract(self, document: ParsedDocument) -> list[Section]:
        """Extract sections from the document body.

        Returns
        -------
        list[Section]
            Ordered list of sections with classified types and content blocks.
        """
        source = document.original_source
        body_start = document.body_span.start
        body_end = document.body_span.end
        body = source[body_start:body_end]

        sections: list[Section] = []

        # --- Handle abstract environment first ----------------------------
        abs_m = _ABSTRACT_ENV.search(body)
        if abs_m:
            abs_start = body_start + abs_m.start()
            abs_end = body_start + abs_m.end()
            content_start = body_start + abs_m.start(1)
            content_end = body_start + abs_m.end(1)

            abs_span = TextSpan(start=abs_start, end=abs_end)
            blocks = self._classifier.classify(
                source, TextSpan(start=content_start, end=content_end)
            )
            sections.append(Section(
                title="Abstract",
                section_type=SectionType.ABSTRACT,
                level=1,
                span=abs_span,
                blocks=blocks,
            ))

        # --- Find all \section / \subsection / \subsubsection commands ----
        headings: list[tuple[int, int, int, str]] = []  # (abs_start, abs_end, level, title)
        for m in _SECTION_CMD.finditer(body):
            level = _LEVEL_MAP.get(m.group(1), 1)
            title = m.group(2).strip()
            abs_start_pos = body_start + m.start()
            abs_end_pos = body_start + m.end()
            headings.append((abs_start_pos, abs_end_pos, level, title))

        # --- Build sections from heading boundaries -----------------------
        for i, (h_start, h_end, level, title) in enumerate(headings):
            # Section content runs from end of heading to start of next heading
            # (or end of body)
            if i + 1 < len(headings):
                content_end_pos = headings[i + 1][0]
            else:
                # Last section extends to bibliography or end of body
                if document.bibliography_span:
                    content_end_pos = document.bibliography_span.start
                else:
                    content_end_pos = body_end

            section_span = TextSpan(start=h_start, end=content_end_pos)
            content_span = TextSpan(start=h_end, end=content_end_pos)

            blocks = self._classifier.classify(source, content_span)
            section_type = _classify_section(title)

            sections.append(Section(
                title=title,
                section_type=section_type,
                level=level,
                span=section_span,
                blocks=blocks,
            ))

        if not sections:
            log.warning("No sections found — treating entire body as a single section")
            blocks = self._classifier.classify(
                source, TextSpan(start=body_start, end=body_end)
            )
            sections.append(Section(
                title="",
                section_type=SectionType.UNKNOWN,
                level=1,
                span=document.body_span,
                blocks=blocks,
            ))

        log.info("Extracted %d sections", len(sections))
        for s in sections:
            log.debug("  [%s] %s (%d blocks)", s.section_type.value, s.title, len(s.blocks))

        return sections
