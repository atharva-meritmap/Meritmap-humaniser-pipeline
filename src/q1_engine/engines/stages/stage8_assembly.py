"""Stage 8: Assembly & Verification — reconstruct LaTeX and generate quality report."""

from __future__ import annotations

from q1_engine.models import (
    DetectionPreCheck,
    ParsedDocument,
    QualityReport,
    Section,
    SectionType,
    StageResult,
)
from q1_engine.reconstruction.reconstructor import Reconstructor
from q1_engine.scoring.ai_detection_scorer import AIDetectionScorer
from q1_engine.utils.logging_setup import get_logger
from q1_engine.utils.patterns import detect_patterns

log = get_logger("stage8")

_REQUIRED_SECTIONS = {
    SectionType.ABSTRACT,
    SectionType.INTRODUCTION,
    SectionType.METHODOLOGY,
    SectionType.RESULTS,
    SectionType.DISCUSSION,
    SectionType.CONCLUSION,
}


class Stage8Assembly:
    """Assemble final LaTeX document and run pre-flight quality checks."""

    def __init__(self) -> None:
        self._reconstructor = Reconstructor()
        self._scorer = AIDetectionScorer()

    def run(
        self,
        doc: ParsedDocument,
        sections: list[Section],
        stage_results: list[StageResult],
    ) -> tuple[str, QualityReport, StageResult]:
        """Reconstruct and verify the document.

        Returns (final_latex, quality_report, stage_result).
        """
        log.info("Stage 8: Assembly & Verification")

        # Reconstruct
        final_latex = self._reconstructor.reconstruct(doc, sections)

        # Collect final text for analysis
        parts = []
        for section in sections:
            for block in section.blocks:
                from q1_engine.models import ContentType
                if block.content_type == ContentType.TEXT:
                    t = block.rewritten_text or block.raw_latex
                    if t.strip():
                        parts.append(t)
        final_text = "\n\n".join(parts)

        # Detection pre-check
        pre_check: DetectionPreCheck = self._scorer.detection_precheck(final_text)

        # Section completeness
        present = {s.section_type for s in sections if s.section_type != SectionType.UNKNOWN}
        sections_complete = [s.value for s in present if s in _REQUIRED_SECTIONS]
        sections_missing = [s.value for s in _REQUIRED_SECTIONS if s not in present]

        # AI marker scan
        markers = detect_patterns(final_text, min_severity="must_fix")
        marker_count = sum(c for _, c in markers)

        # Citation stats from stage 7
        stage7 = next((r for r in stage_results if r.stage == 7), None)
        total_cites = int(stage7.metrics.get("total_citations", 0)) if stage7 else 0
        verified_cites = int(stage7.metrics.get("verified", 0)) if stage7 else 0

        # Warnings
        warnings: list[str] = []
        if pre_check.estimated_detection_risk == "high":
            warnings.append("Detection risk HIGH - re-run Stages 3-5 with increased variation")
        if pre_check.estimated_detection_risk == "medium":
            warnings.append("Detection risk MEDIUM - review flagged markers")
        if marker_count > 0:
            remaining = [p.pattern for p, _ in markers[:5]]
            warnings.append(f"Remaining AI markers: {', '.join(remaining)}")
        warnings.extend(sections_missing[:3])

        # Build compliance metrics across stage results
        stage6 = next((r for r in stage_results if r.stage == 6), None)
        q1_compliant = (
            len(sections_missing) == 0
            and pre_check.estimated_detection_risk != "high"
            and (stage6.metrics.get("missing_compliance", 0) == 0 if stage6 else True)
        )

        report = QualityReport(
            assembly_status="success" if not sections_missing else "warnings",
            detection_pre_check=pre_check,
            q1_q2_compliant=q1_compliant,
            sections_complete=sections_complete,
            sections_missing=sections_missing,
            argumentation_score="strong" if len(sections_missing) == 0 else "adequate",
            methodology_score="strong" if SectionType.METHODOLOGY in present else "weak",
            total_citations=total_cites,
            verified_citations=verified_cites,
            recommendations=warnings,
        )

        log.info(
            "  Assembly complete — detection_risk=%s, q1_compliant=%s, missing=%s",
            pre_check.estimated_detection_risk,
            q1_compliant,
            sections_missing or "none",
        )

        return final_latex, report, StageResult(
            stage=8,
            stage_name="Assembly & Verification",
            warnings=warnings,
            metrics={
                "ai_markers_found": float(marker_count),
                "burstiness_score": pre_check.burstiness_score,
                "sentence_length_std": pre_check.sentence_length_std,
                "paragraph_length_std": pre_check.paragraph_length_std,
            },
        )
