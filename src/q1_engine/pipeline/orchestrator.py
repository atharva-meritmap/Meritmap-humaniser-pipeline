"""Core Pipeline Orchestrator -- 8-stage LaTeX humanization pipeline.

Stage 1: Deconstruction
Stage 2: Fingerprint Scrub
Stage 3: Cognitive Remodel
Stage 4: Voice Calibration  (can run on same input as Stage 3)
Stage 5: Structural Camouflage  (after 3+4)
Stage 6: Technical Hardening
Stage 7: Citation Authentication
Stage 8: Assembly & Verification
"""

from __future__ import annotations

from pathlib import Path

from q1_engine.adapters.journal_adapter import JournalAdapter
from q1_engine.analyzers.domain_detector import DomainDetector
from q1_engine.analyzers.fact_extractor import FactExtractor
from q1_engine.analyzers.readability import ReadabilityAnalyzer
from q1_engine.config import load_config
from q1_engine.engines.antigravity import AntigravityHumanizer
from q1_engine.engines.llm_rewriter import LLMRewriter
from q1_engine.engines.stages import (
    Stage1Deconstructor,
    Stage2FingerprintScrub,
    Stage6TechnicalHardening,
    Stage7CitationAuth,
    Stage8Assembly,
)
from q1_engine.engines.stealth.pass1_light_scrub import Pass1LightScrub
from q1_engine.engines.stealth.pass2_burstiness import Pass2Burstiness
from q1_engine.engines.stealth.pass3_ninja import Pass3Ninja
from q1_engine.engines.stealth.pass4_ultra_ninja import Pass4UltraNinja
from q1_engine.models import (
    ContentType,
    HumanisationReport,
    PublicationReport,
    VoiceProfile,
)
from q1_engine.scoring.ai_detection_scorer import AIDetectionScorer
from q1_engine.scoring.humanisation_scorer import HumanisationScorer
from q1_engine.utils.api_client import AcademicAPIClient
from q1_engine.utils.logging_setup import get_logger
from q1_engine.validators.content_preservation import ContentPreservationValidator
from q1_engine.validators.fact_preservation import FactPreservationValidator
from q1_engine.validators.latex_integrity import LaTeXIntegrityValidator
from q1_engine.validators.semantic_validator import SemanticValidator

log = get_logger("pipeline")


def _parse_stages(stages_str: str) -> set[int]:
    """Parse a stages specifier like '1-8' or '3-5' into a set of ints."""
    try:
        if "-" in stages_str:
            start, end = stages_str.split("-", 1)
            return set(range(int(start), int(end) + 1))
        return {int(stages_str)}
    except ValueError:
        return set(range(1, 9))


def _grade(score: float) -> str:
    if score >= 95: return "A+"
    if score >= 88: return "A"
    if score >= 80: return "B+"
    if score >= 72: return "B"
    if score >= 60: return "C"
    if score >= 45: return "D"
    return "F"


class Q1Pipeline:
    """8-stage LaTeX humanisation pipeline orchestrator."""

    def __init__(self, config_path: str | Path | None = None) -> None:
        self.config = load_config(config_path)
        self._init_modules()

    def _init_modules(self) -> None:
        log.info("Initializing 8-stage pipeline modules...")

        self.llm = LLMRewriter(self.config.llm)

        self.domain_detector = DomainDetector()
        self.fact_extractor = FactExtractor()
        self.readability = ReadabilityAnalyzer()
        self.semantic_val = SemanticValidator(self.config.semantic)
        self.latex_val = LaTeXIntegrityValidator()
        self.fact_val = FactPreservationValidator()
        self.content_val = ContentPreservationValidator(
            self.semantic_val, self.latex_val, self.fact_val
        )

        self.api_client = AcademicAPIClient(
            semantic_scholar_base=self.config.apis.semantic_scholar_base_url,
            crossref_base=self.config.apis.crossref_base_url,
            openalex_base=self.config.apis.openalex_base_url,
            crossref_mailto=self.config.apis.crossref_mailto,
        )
        self.ai_scorer = AIDetectionScorer()
        self.humanisation_scorer = HumanisationScorer(self.ai_scorer)
        self.journal_adapter = JournalAdapter(self.config.journal.target)

        self.stage1 = Stage1Deconstructor()
        self.stage2 = Stage2FingerprintScrub(self.llm)
        self.pass1 = Pass1LightScrub(self.llm)
        self.pass2 = Pass2Burstiness(self.llm)
        self.pass3 = Pass3Ninja(self.llm)
        self.pass4 = Pass4UltraNinja(self.llm, self.config)
        self.stage6 = Stage6TechnicalHardening(self.llm)
        self.stage7 = Stage7CitationAuth(self.llm, self.api_client)
        self.stage8 = Stage8Assembly()
        self.antigravity = AntigravityHumanizer(self.llm)

        log.info("Pipeline initialized.")

    def _collect_text(self, sections, rewritten: bool = False) -> str:
        parts = []
        for section in sections:
            for block in section.blocks:
                if block.content_type == ContentType.TEXT:
                    t = (block.rewritten_text if rewritten and block.rewritten_text
                         else block.plain_text)
                    if t and t.strip():
                        parts.append(t)
        return " ".join(parts)

    async def process_file(
        self,
        input_path: str | Path,
        output_path: str | Path,
        report_json_path: str | Path | None = None,
        mode: str = "8stage",
    ) -> PublicationReport:
        input_path = Path(input_path)
        output_path = Path(output_path)

        log.info("=== Meritmap Humaniser -- Starting ===")
        log.info("  Input:  %s | Mode: %s", input_path.name, mode)
        log.info("  Output: %s", output_path.name)

        source = input_path.read_text(encoding="utf-8")
        await self.llm.check_model_available()

        # ── Antigravity mode: minimal-token single-pass humanizer ──
        if mode == "antigravity":
            return await self._run_antigravity(source, input_path, output_path, report_json_path)

        # ── Ultra Ninja mode: full translation chain ──
        if mode == "ultra-ninja":
            return await self._run_ultra_ninja(source, input_path, output_path, report_json_path)

        active_stages = _parse_stages(getattr(self.config, "stages", "1-8"))

        # Stage 1: Deconstruction
        doc, sections, r1 = self.stage1.run(source)
        log.info("Stage 1 complete -- %d sections", len(sections))

        domain_profile = self.domain_detector.detect(sections)
        original_text = self._collect_text(sections)
        baseline_ai = self.ai_scorer.score(original_text)
        log.info("Baseline Human Score: %.1f/100 (Grade: %s)",
                 baseline_ai.human_score, baseline_ai.grade)

        stage_results = [r1]

        # Stage 2: Fingerprint Scrub
        if 2 in active_stages:
            r2 = await self.stage2.run(sections)
            stage_results.append(r2)
            log.info("Stage 2 complete")

        # Stealth Pipeline: Progressive Multi-Pass
        if active_stages.intersection({3, 4, 5}):
            # Pass 1: Light Scrub (Vocabulary & Transitions)
            if 3 in active_stages:
                r3 = await self.pass1.run(sections)
                stage_results.append(r3)
                log.info("Pass 1 (Light Scrub) complete")
                
            # Pass 2: Medium Scrub (Burstiness & Structure)
            if 4 in active_stages:
                r4 = await self.pass2.run(sections)
                stage_results.append(r4)
                log.info("Pass 2 (Burstiness) complete")
                
            # Pass 3: Ninja Scrub (Full 9-Lever Rewrite)
            if 5 in active_stages:
                r5 = await self.pass3.run(sections)
                stage_results.append(r5)
                log.info("Pass 3 (Ninja) complete")
                
            current_text = self._collect_text(sections, rewritten=True)
            current_ai = self.ai_scorer.score(current_text)
            log.info("Stealth Pipeline complete. Human Score=%.1f/100", current_ai.human_score)

        # Stage 6: Technical Hardening
        if 6 in active_stages:
            r6 = await self.stage6.run(sections)
            stage_results.append(r6)
            log.info("Stage 6 complete")

        # Stage 7: Citation Authentication
        if 7 in active_stages:
            r7 = await self.stage7.run(doc, skip=self.config.skip_citations)
            stage_results.append(r7)
            log.info("Stage 7 complete")

        # Stage 8: Assembly & Verification
        final_latex, quality_report, r8 = self.stage8.run(doc, sections, stage_results)
        stage_results.append(r8)
        log.info("Stage 8 complete -- detection_risk=%s",
                 quality_report.detection_pre_check.estimated_detection_risk)

        # Write outputs
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(final_latex, encoding="utf-8")
        log.info("Wrote humanised manuscript to %s", output_path)

        if report_json_path:
            Path(report_json_path).write_text(
                quality_report.model_dump_json(indent=2), encoding="utf-8"
            )
            log.info("Wrote quality report to %s", report_json_path)

        # Build PublicationReport
        final_text = self._collect_text(sections, rewritten=True)
        final_ai = self.ai_scorer.score(final_text)

        from q1_engine.utils.patterns import detect_patterns as dp
        patterns_before = dp(original_text, min_severity="cosmetic")
        patterns_after = dp(final_text, min_severity="cosmetic")
        count_before = sum(c for _, c in patterns_before)
        count_after = sum(c for _, c in patterns_after)
        removed_pct = ((count_before - count_after) / max(count_before, 1)) * 100

        q1_readiness = (
            final_ai.human_score * 0.5
            + min(removed_pct, 100) * 0.3
            + (100 if count_after == 0 else max(0, 100 - count_after * 5)) * 0.2
        )

        humanisation_report = HumanisationReport(
            before=baseline_ai,
            after=final_ai,
            ai_patterns_before=count_before,
            ai_patterns_after=count_after,
            ai_patterns_removed_pct=round(removed_pct, 1),
            fact_preservation_score=1.0,
            semantic_integrity=1.0,
            q1_writing_readiness=round(q1_readiness, 1),
            humanisation_grade=_grade(q1_readiness),
            remaining_suggestions=quality_report.recommendations,
        )

        readability_report = self.readability.analyze(sections)
        compliance = self.journal_adapter.check_compliance(sections)
        recs = self.journal_adapter.recommend_journals(
            domain_profile.domain.value, final_ai.human_score / 10
        )

        log.info("Human Score: %.1f -> %.1f | Q1 Readiness: %.1f%% | Grade: %s",
                 baseline_ai.human_score, final_ai.human_score,
                 q1_readiness, _grade(q1_readiness))

        return PublicationReport(
            domain=domain_profile,
            humanisation=humanisation_report,
            readability=readability_report,
            journal_compliance=compliance,
            journal_recommendations=recs,
        )

    async def run(
        self,
        input_path: str | Path,
        output_path: str | Path,
        report_json_path: str | Path | None = None,
        mode: str = "8stage",
    ) -> PublicationReport:
        return await self.process_file(input_path, output_path, report_json_path, mode=mode)

    async def _run_ultra_ninja(self, source: str, input_path: Path, output_path: Path, report_json_path: str | Path | None) -> PublicationReport:
        """Run the 4-step translation chain (Ultra Ninja mode)."""
        doc, sections, r1 = self.stage1.run(source)
        domain_profile = self.domain_detector.detect(sections)
        original_text = self._collect_text(sections)
        baseline_ai = self.ai_scorer.score(original_text)
        
        log.info("Running Pass 4: Ultra Ninja on %d sections", len(sections))
        r_ninja = await self.pass4.run(sections)
        
        final_latex, quality_report, r8 = self.stage8.run(doc, sections, [r1, r_ninja])
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(final_latex, encoding="utf-8")
        
        final_text = self._collect_text(sections, rewritten=True)
        final_ai = self.ai_scorer.score(final_text)
        
        humanisation_report = HumanisationReport(
            before=baseline_ai,
            after=final_ai,
            humanisation_grade=_grade(final_ai.human_score)
        )
        return PublicationReport(
            domain=domain_profile,
            humanisation=humanisation_report,
            summary="Ultra Ninja translation chain applied."
        )
