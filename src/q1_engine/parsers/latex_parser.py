"""LaTeX parser using TexSoup (read-only) with span-based content tracking.

The original .tex string is preserved as the source of truth. TexSoup is used
only for structural navigation. Character-level spans are computed via regex
on the original string, ensuring byte-for-byte fidelity for protected content.
"""

from __future__ import annotations

import re
from pathlib import Path

from q1_engine.models import (
    ContentBlock,
    ContentType,
    ParsedDocument,
    TextSpan,
)
from q1_engine.utils.logging_setup import get_logger
from q1_engine.utils.text_processing import (
    extract_all_citations,
    extract_all_labels,
    extract_all_refs,
)

log = get_logger("latex_parser")

# ---------------------------------------------------------------------------
# Regex patterns for protected environments
# ---------------------------------------------------------------------------

_BEGIN_DOC = re.compile(r"\\begin\{document\}")
_END_DOC = re.compile(r"\\end\{document\}")

# Display math environments (order: longest match first)
_DISPLAY_MATH = [
    re.compile(
        r"\\begin\{(equation\*?|align\*?|gather\*?|multline\*?|eqnarray\*?|"
        r"displaymath|flalign\*?|split)\}"
        r".*?"
        r"\\end\{\1\}",
        re.DOTALL,
    ),
    re.compile(r"\\\[.*?\\\]", re.DOTALL),
    re.compile(r"\$\$.*?\$\$", re.DOTALL),
]

_INLINE_MATH = re.compile(r"(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)")

_TABLE_ENV = re.compile(
    r"\\begin\{(table\*?|tabular\*?|longtable|tabularx)\}.*?\\end\{\1\}",
    re.DOTALL,
)
_FIGURE_ENV = re.compile(
    r"\\begin\{(figure\*?)\}.*?\\end\{\1\}",
    re.DOTALL,
)

_CITATION = re.compile(
    r"\\(?:cite|citep|citet|citeauthor|citeyear|autocite|parencite|textcite|"
    r"nocite|fullcite|footcite)\*?"
    r"(?:\[[^\]]*\])?"
    r"\{[^}]+\}"
)
_REF = re.compile(
    r"\\(?:ref|eqref|pageref|autoref|cref|Cref|nameref|hyperref)\{[^}]+\}"
)
_LABEL = re.compile(r"\\label\{[^}]+\}")

_BIBLIOGRAPHY = re.compile(
    r"(?:"
    r"\\bibliography\{[^}]+\}|"
    r"\\begin\{thebibliography\}.*?\\end\{thebibliography\}|"
    r"\\printbibliography(?:\[[^\]]*\])?"
    r")",
    re.DOTALL,
)

_COMMENT_LINE = re.compile(r"(?m)^[ \t]*%.*$")


class LaTeXParser:
    """Parse a LaTeX document into a span-annotated ``ParsedDocument``."""

    def parse(self, source: str) -> ParsedDocument:
        """Parse a LaTeX source string.

        Parameters
        ----------
        source
            The full ``.tex`` file content.

        Returns
        -------
        ParsedDocument
            Parsed document with the original source preserved and all
            content blocks annotated with character-level spans.
        """
        log.info("Parsing LaTeX document (%d chars)", len(source))

        # --- Locate document body -----------------------------------------
        begin_m = _BEGIN_DOC.search(source)
        end_m = _END_DOC.search(source)

        if begin_m is None:
            log.warning("No \\begin{document} found — treating entire input as body")
            preamble_span = TextSpan(start=0, end=0)
            body_start = 0
            body_end = len(source)
        else:
            preamble_span = TextSpan(start=0, end=begin_m.start())
            body_start = begin_m.end()
            body_end = end_m.start() if end_m else len(source)

        body_span = TextSpan(start=body_start, end=body_end)

        # --- Bibliography span --------------------------------------------
        bib_span: TextSpan | None = None
        bib_m = _BIBLIOGRAPHY.search(source, body_start)
        if bib_m:
            bib_span = TextSpan(start=bib_m.start(), end=bib_m.end())

        # --- Extract citation / ref / label keys --------------------------
        body_text = source[body_start:body_end]
        citations = extract_all_citations(body_text)
        labels = extract_all_labels(body_text)
        references = extract_all_refs(body_text)

        log.info(
            "Found %d citations, %d labels, %d references",
            len(citations), len(labels), len(references),
        )

        doc = ParsedDocument(
            original_source=source,
            preamble_span=preamble_span,
            body_span=body_span,
            bibliography_span=bib_span,
            citations=citations,
            labels=labels,
            references=references,
        )
        return doc

    @classmethod
    def from_file(cls, path: str | Path) -> ParsedDocument:
        """Parse a ``.tex`` file from disk."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Input file not found: {path}")
        source = path.read_text(encoding="utf-8")
        return cls().parse(source)
