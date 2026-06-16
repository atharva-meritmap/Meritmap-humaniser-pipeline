"""Stage 6: Technical Hardening — Q1/Q2 journal compliance enforcement."""

from __future__ import annotations

from q1_engine.engines.llm_rewriter import LLMRewriter
from q1_engine.models import (
    ContentType,
    Section,
    SectionType,
    StageResult,
)
from q1_engine.utils.logging_setup import get_logger

log = get_logger("stage6")

_REQUIRED_SECTIONS = {
    SectionType.ABSTRACT,
    SectionType.INTRODUCTION,
    SectionType.METHODOLOGY,
    SectionType.RESULTS,
    SectionType.DISCUSSION,
    SectionType.CONCLUSION,
}

_COMPLIANCE_PHRASES = {
    "data_availability": ["data availability", "data are available", "data is available", "available at"],
    "ethics": ["ethics", "irb", "institutional review", "ethical approval", "consent"],
    "conflict": ["conflict of interest", "competing interest", "no conflict"],
    "contributions": ["author contribution", "contributions:", "conceived", "designed the study"],
}


class Stage6TechnicalHardening:
    """Enforce Q1/Q2 structural and argumentation compliance."""

    def __init__(self, llm: LLMRewriter) -> None:
        self._llm = llm

    def _find_present_sections(self, sections: list[Section]) -> set[SectionType]:
        return {s.section_type for s in sections if s.section_type != SectionType.UNKNOWN}

    def _check_compliance_statements(self, sections: list[Section]) -> dict[str, bool]:
        """Scan full text for mandatory compliance statements."""
        full_text = " ".join(
            b.plain_text.lower()
            for s in sections
            for b in s.blocks
            if b.content_type == ContentType.TEXT
        )
        return {
            key: any(phrase in full_text for phrase in phrases)
            for key, phrases in _COMPLIANCE_PHRASES.items()
        }

    async def run(self, sections: list[Section]) -> StageResult:
        """Check and harden Q1/Q2 compliance."""
        log.info("Stage 6: Technical Hardening")

        present = self._find_present_sections(sections)
        missing = _REQUIRED_SECTIONS - present
        compliance = self._check_compliance_statements(sections)

        missing_compliance = [k for k, v in compliance.items() if not v]
        warnings: list[str] = []

        if missing:
            for sec_type in missing:
                warnings.append(f"Missing section: {sec_type.value}")
                log.warning("  Missing required section: %s", sec_type.value)

        if missing_compliance:
            for item in missing_compliance:
                warnings.append(f"Missing compliance statement: {item}")
            log.warning("  Missing compliance statements: %s", missing_compliance)

        log.info("  %d warnings (structural checks only, no LLM calls)", len(warnings))
        return StageResult(
            stage=6,
            stage_name="Technical Hardening",
            warnings=warnings,
            metrics={
                "missing_sections": float(len(missing)),
                "missing_compliance": float(len(missing_compliance)),
            },
        )
