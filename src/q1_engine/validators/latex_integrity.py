"""LaTeX integrity validator — ensures protected elements are not lost."""

from __future__ import annotations

import re

from q1_engine.utils.logging_setup import get_logger
from q1_engine.utils.text_processing import (
    extract_all_citations,
    extract_all_labels,
    extract_all_refs,
)

log = get_logger("latex_integrity")

_MATH_ENV_START = re.compile(r"\\begin\{(equation\*?|align\*?|gather\*?|multline\*?)\}")


class LaTeXIntegrityValidator:
    """Validate that LaTeX commands and math are preserved during rewriting."""

    def _extract_math(self, text: str) -> list[str]:
        """Extract all math environments and inline math as strings."""
        math_blocks = []
        
        # Display math
        for env in ["equation", "equation*", "align", "align*", "gather", "gather*"]:
            pattern = re.compile(rf"\\begin\{{{env}\}}.*?\\end\{{{env}\}}", re.DOTALL)
            math_blocks.extend([m.group(0) for m in pattern.finditer(text)])

        math_blocks.extend(re.findall(r"\\\[.*?\\\]", text, re.DOTALL))
        math_blocks.extend(re.findall(r"\$\$.*?\$\$", text, re.DOTALL))
        
        # Inline math
        math_blocks.extend(re.findall(r"(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)", text))
        
        return [m.strip() for m in math_blocks]

    def validate(self, original_latex: str, rewritten_latex: str) -> dict[str, bool | str]:
        """Verify LaTeX elements are preserved exactly.
        
        Returns
        -------
        dict
            Validation results including pass status and specific failure details.
        """
        # 1. Check citations
        orig_cites = set(extract_all_citations(original_latex))
        new_cites = set(extract_all_citations(rewritten_latex))
        cites_preserved = orig_cites == new_cites

        # 2. Check references
        orig_refs = set(extract_all_refs(original_latex))
        new_refs = set(extract_all_refs(rewritten_latex))
        refs_preserved = orig_refs == new_refs

        # 3. Check labels
        orig_labels = set(extract_all_labels(original_latex))
        new_labels = set(extract_all_labels(rewritten_latex))
        labels_preserved = orig_labels == new_labels

        # 4. Check math
        orig_math = set(self._extract_math(original_latex))
        new_math = set(self._extract_math(rewritten_latex))
        math_preserved = orig_math == new_math

        passed = all([cites_preserved, refs_preserved, labels_preserved, math_preserved])
        
        details = []
        if not cites_preserved:
            details.append(f"Citations changed: {orig_cites ^ new_cites}")
        if not refs_preserved:
            details.append(f"Refs changed: {orig_refs ^ new_refs}")
        if not labels_preserved:
            details.append(f"Labels changed: {orig_labels ^ new_labels}")
        if not math_preserved:
            details.append(f"Math changed: {orig_math ^ new_math}")

        return {
            "passed": passed,
            "citations_preserved": cites_preserved,
            "references_preserved": refs_preserved,
            "labels_preserved": labels_preserved,
            "equations_preserved": math_preserved,
            "details": "; ".join(details) if details else "All LaTeX elements preserved exactly.",
        }
