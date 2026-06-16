"""Master content preservation validator.

Orchestrates semantic, LaTeX integrity, and fact preservation checks.
"""

from __future__ import annotations

from q1_engine.models import ContentBlock, FactGraph, ValidationReport
from q1_engine.validators.fact_preservation import FactPreservationValidator
from q1_engine.validators.latex_integrity import LaTeXIntegrityValidator
from q1_engine.validators.semantic_validator import SemanticValidator


class ContentPreservationValidator:
    """Master validator to ensure safe rewriting."""

    def __init__(
        self,
        semantic: SemanticValidator,
        latex: LaTeXIntegrityValidator,
        fact: FactPreservationValidator,
    ) -> None:
        self._semantic = semantic
        self._latex = latex
        self._fact = fact

    def validate(
        self, 
        original_block: ContentBlock, 
        rewritten_text: str, 
        fact_graph: FactGraph
    ) -> ValidationReport:
        """Run all checks on a rewritten block.
        
        Parameters
        ----------
        original_block
            The original parsed block.
        rewritten_text
            The proposed rewrite.
        fact_graph
            The facts extracted from the original block.
            
        Returns
        -------
        ValidationReport
            Unified report. `passed` is True only if ALL checks pass.
        """
        # 1. Semantic Check
        report = self._semantic.validate(original_block.raw_latex, rewritten_text)
        
        from q1_engine.models import ValidationStatus
        
        # 2. LaTeX Integrity Check
        latex_res = self._latex.validate(original_block.raw_latex, rewritten_text)
        if not latex_res["passed"]:
            report.status = ValidationStatus.REJECTED
            report.details["latex_fail"] = latex_res['details']
            
        # 3. Fact Preservation Check
        fact_res = self._fact.validate(fact_graph, rewritten_text)
        if not fact_res["passed"]:
            report.status = ValidationStatus.REJECTED
            lost = ", ".join(fact_res["lost_facts"])
            report.details["fact_fail"] = f"score {fact_res['score']:.2f}: {lost}"

        return report
