"""Stage 1: Deconstruction — parse LaTeX into tagged segments."""

from __future__ import annotations

from q1_engine.models import (
    ContentType,
    ParsedDocument,
    Section,
    SectionType,
    StageResult,
)
from q1_engine.parsers.content_classifier import ContentClassifier
from q1_engine.parsers.latex_parser import LaTeXParser
from q1_engine.parsers.section_extractor import SectionExtractor
from q1_engine.utils.logging_setup import get_logger

log = get_logger("stage1")

# Cognitive/argument role mapping by section type
_SECTION_ARGUMENT_ROLES: dict[SectionType, str] = {
    SectionType.ABSTRACT: "summary",
    SectionType.INTRODUCTION: "claim",
    SectionType.RELATED_WORK: "evidence",
    SectionType.LITERATURE_REVIEW: "evidence",
    SectionType.METHODOLOGY: "evidence",
    SectionType.EXPERIMENTS: "evidence",
    SectionType.RESULTS: "analysis",
    SectionType.DISCUSSION: "analysis",
    SectionType.CONCLUSION: "summary",
}

_SECTION_PRIORITY: dict[SectionType, int] = {
    SectionType.ABSTRACT: 5,
    SectionType.INTRODUCTION: 5,
    SectionType.METHODOLOGY: 4,
    SectionType.RESULTS: 5,
    SectionType.DISCUSSION: 5,
    SectionType.CONCLUSION: 4,
    SectionType.RELATED_WORK: 3,
    SectionType.LITERATURE_REVIEW: 3,
}


class Stage1Deconstructor:
    """Wraps LaTeXParser + SectionExtractor and emits tagged DeconstructedDocument."""

    def __init__(self) -> None:
        self.latex_parser = LaTeXParser()
        self.section_extractor = SectionExtractor()

    def run(self, source: str) -> tuple[ParsedDocument, list[Section], StageResult]:
        """Parse LaTeX source and tag all segments.

        Returns (doc, sections, stage_result).
        """
        log.info("Stage 1: Deconstruction")
        doc = self.latex_parser.parse(source)
        sections = self.section_extractor.extract(doc)

        total_blocks = 0
        text_blocks = 0
        for section in sections:
            for block in section.blocks:
                total_blocks += 1
                if block.content_type == ContentType.TEXT:
                    text_blocks += 1
                    # Tag with argument role and complexity
                    role = _SECTION_ARGUMENT_ROLES.get(section.section_type, "analysis")
                    priority = _SECTION_PRIORITY.get(section.section_type, 3)
                    word_count = len(block.plain_text.split())
                    complexity = "high" if word_count > 80 else ("medium" if word_count > 30 else "low")
                    # Store metadata in block (using rewritten_text as temp store — will be cleared)
                    # We attach metadata via the section metadata dict instead
                    block_key = f"{section.section_type.value}_{block.span.start}"
                    doc.metadata[f"block_role_{block_key}"] = role
                    doc.metadata[f"block_priority_{block_key}"] = priority
                    doc.metadata[f"block_complexity_{block_key}"] = complexity

        log.info("  %d sections, %d text blocks / %d total blocks", len(sections), text_blocks, total_blocks)

        return doc, sections, StageResult(
            stage=1,
            stage_name="Deconstruction",
            metrics={"sections": float(len(sections)), "text_blocks": float(text_blocks)},
        )
