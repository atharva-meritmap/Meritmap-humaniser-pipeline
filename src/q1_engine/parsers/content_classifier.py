"""Content classifier — splits a LaTeX span into typed content blocks.

Protected regions (math, tables, figures, citations) are identified via regex.
Everything in between is classified as rewritable TEXT.
"""

from __future__ import annotations

import re

from pylatexenc.latex2text import LatexNodes2Text

from q1_engine.models import ContentBlock, ContentType, TextSpan
from q1_engine.utils.logging_setup import get_logger

log = get_logger("content_classifier")

# ---------------------------------------------------------------------------
# Protected-region patterns (order matters for overlapping matches)
# ---------------------------------------------------------------------------

_PROTECTED_PATTERNS: list[tuple[ContentType, re.Pattern]] = [
    # Display math environments
    (ContentType.EQUATION, re.compile(
        r"\\begin\{(equation\*?|align\*?|gather\*?|multline\*?|eqnarray\*?|"
        r"displaymath|flalign\*?|split)\}"
        r".*?"
        r"\\end\{\1\}",
        re.DOTALL,
    )),
    (ContentType.EQUATION, re.compile(r"\\\[.*?\\\]", re.DOTALL)),
    (ContentType.EQUATION, re.compile(r"\$\$.*?\$\$", re.DOTALL)),
    # Inline math
    (ContentType.INLINE_MATH, re.compile(r"(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)")),
    # Tables
    (ContentType.TABLE, re.compile(
        r"\\begin\{(table\*?|tabular\*?|longtable|tabularx)\}.*?\\end\{\1\}",
        re.DOTALL,
    )),
    # Figures
    (ContentType.FIGURE, re.compile(
        r"\\begin\{(figure\*?)\}.*?\\end\{\1\}",
        re.DOTALL,
    )),
    # Other environments to protect
    (ContentType.ENVIRONMENT, re.compile(
        r"\\begin\{(algorithm\*?|algorithmic|lstlisting|verbatim|minted|"
        r"tikzpicture|pgfpicture)\}.*?\\end\{\1\}",
        re.DOTALL,
    )),
    # Comments
    (ContentType.COMMENT, re.compile(r"(?m)^[ \t]*%.*$")),
]

# Inline protected commands (citations, refs, labels)
_INLINE_PROTECTED: list[tuple[ContentType, re.Pattern]] = [
    (ContentType.CITATION, re.compile(
        r"\\(?:cite|citep|citet|citeauthor|citeyear|autocite|parencite|textcite|"
        r"nocite|fullcite|footcite)\*?"
        r"(?:\[[^\]]*\])?"
        r"\{[^}]+\}"
    )),
    (ContentType.REFERENCE, re.compile(
        r"\\(?:ref|eqref|pageref|autoref|cref|Cref|nameref)\{[^}]+\}"
    )),
    (ContentType.LABEL, re.compile(r"\\label\{[^}]+\}")),
]

# Formatting commands to strip for plain text (but keep in LaTeX)
_FORMATTING_CMD = re.compile(
    r"\\(?:textbf|textit|emph|underline|textsc|textrm|textsf|texttt)\{([^}]*)\}"
)


def _latex_to_plain(latex: str) -> str:
    """Best-effort LaTeX to plain text for NLP analysis."""
    text = latex
    # Strip formatting commands, keep text
    text = _FORMATTING_CMD.sub(r"\1", text)
    try:
        converter = LatexNodes2Text()
        text = converter.latex_to_text(text)
    except Exception:
        # Fallback: remove remaining commands
        text = re.sub(r"\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*", "", text)
        text = re.sub(r"[{}]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


class ContentClassifier:
    """Classify regions within a LaTeX span into typed content blocks."""

    def classify(self, source: str, span: TextSpan) -> list[ContentBlock]:
        """Split *source[span.start:span.end]* into content blocks.

        Protected regions become non-rewritable blocks. Gaps between
        protected regions become TEXT blocks (rewritable).
        """
        region = source[span.start : span.end]
        offset = span.start

        # --- Find all protected spans within this region ------------------
        protected: list[tuple[int, int, ContentType]] = []

        for ctype, pattern in _PROTECTED_PATTERNS:
            for m in pattern.finditer(region):
                protected.append((m.start(), m.end(), ctype))

        # Sort by start position and remove overlaps
        protected.sort(key=lambda x: (x[0], -(x[1] - x[0])))
        merged: list[tuple[int, int, ContentType]] = []
        for start, end, ctype in protected:
            if merged and start < merged[-1][1]:
                # Overlapping — keep the earlier/longer one
                continue
            merged.append((start, end, ctype))

        # --- Build content blocks -----------------------------------------
        blocks: list[ContentBlock] = []
        cursor = 0

        for p_start, p_end, ctype in merged:
            # Text gap before this protected region
            if cursor < p_start:
                gap_text = region[cursor:p_start]
                if gap_text.strip():
                    blocks.append(ContentBlock(
                        content_type=ContentType.TEXT,
                        raw_latex=gap_text,
                        plain_text=_latex_to_plain(gap_text),
                        span=TextSpan(start=offset + cursor, end=offset + p_start),
                    ))

            # Protected region
            raw = region[p_start:p_end]
            blocks.append(ContentBlock(
                content_type=ctype,
                raw_latex=raw,
                plain_text="",
                span=TextSpan(start=offset + p_start, end=offset + p_end),
            ))
            cursor = p_end

        # Trailing text after last protected region
        if cursor < len(region):
            tail = region[cursor:]
            if tail.strip():
                blocks.append(ContentBlock(
                    content_type=ContentType.TEXT,
                    raw_latex=tail,
                    plain_text=_latex_to_plain(tail),
                    span=TextSpan(start=offset + cursor, end=offset + len(region)),
                ))

        return blocks
