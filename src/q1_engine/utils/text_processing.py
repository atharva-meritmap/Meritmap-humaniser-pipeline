"""Text processing utilities for LaTeX ↔ plain text conversion.

Central module for stripping LaTeX markup to plain text (for NLP analysis)
and for managing placeholder-based round-tripping.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from pylatexenc.latex2text import LatexNodes2Text

from q1_engine.utils.logging_setup import get_logger

log = get_logger("text_processing")

# ---------------------------------------------------------------------------
# Placeholder system
# ---------------------------------------------------------------------------

_PLACEHOLDER_PREFIX = "⟦PROTECTED"
_PLACEHOLDER_SUFFIX = "⟧"
_PLACEHOLDER_PATTERN = re.compile(r"⟦PROTECTED_(\d+)⟧")


@dataclass
class PlaceholderMap:
    """Maps placeholder tokens back to original LaTeX fragments."""
    _map: dict[str, str] = field(default_factory=dict)
    _counter: int = 0

    def add(self, latex_fragment: str) -> str:
        """Register a fragment and return its placeholder token."""
        token = f"{_PLACEHOLDER_PREFIX}_{self._counter}{_PLACEHOLDER_SUFFIX}"
        self._map[token] = latex_fragment
        self._counter += 1
        return token

    def restore(self, text: str) -> str:
        """Replace all placeholders with their original fragments."""
        for token, original in self._map.items():
            text = text.replace(token, original)
        return text

    def __len__(self) -> int:
        return len(self._map)


# ---------------------------------------------------------------------------
# LaTeX → plain text
# ---------------------------------------------------------------------------

# Patterns for protected environments (order matters — longer patterns first)
_DISPLAY_MATH_PATTERNS = [
    re.compile(r"\\begin\{(equation\*?|align\*?|gather\*?|multline\*?|eqnarray\*?|displaymath)\}.*?\\end\{\1\}", re.DOTALL),
    re.compile(r"\\\[.*?\\\]", re.DOTALL),
    re.compile(r"\$\$.*?\$\$", re.DOTALL),
]

_INLINE_MATH_PATTERN = re.compile(r"(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)")

_TABLE_PATTERN = re.compile(
    r"\\begin\{(table\*?|tabular\*?|longtable)\}.*?\\end\{\1\}", re.DOTALL
)
_FIGURE_PATTERN = re.compile(
    r"\\begin\{(figure\*?)\}.*?\\end\{\1\}", re.DOTALL
)

_CITATION_PATTERN = re.compile(r"\\(?:cite|citep|citet|citeauthor|citeyear|autocite|parencite|textcite)\*?\{[^}]+\}")
_REF_PATTERN = re.compile(r"\\(?:ref|eqref|pageref|autoref|cref|Cref|nameref)\{[^}]+\}")
_LABEL_PATTERN = re.compile(r"\\label\{[^}]+\}")

# Commands to strip (but keep their text argument)
_FORMATTING_COMMANDS = re.compile(
    r"\\(?:textbf|textit|emph|underline|textsc|textrm|textsf|texttt|textup)\{([^}]*)\}"
)


def latex_to_plaintext(
    latex: str,
    *,
    protect_math: bool = True,
    protect_citations: bool = True,
    protect_refs: bool = True,
    protect_tables: bool = True,
    protect_figures: bool = True,
) -> tuple[str, PlaceholderMap]:
    """Convert LaTeX text to plain text for NLP processing.

    Protected elements (math, citations, refs, tables, figures) are replaced
    with unique placeholder tokens.  Use the returned ``PlaceholderMap`` to
    restore them afterward.

    Returns
    -------
    (plain_text, placeholder_map)
    """
    pmap = PlaceholderMap()
    text = latex

    # 1. Protect display math
    if protect_math:
        for pat in _DISPLAY_MATH_PATTERNS:
            text = pat.sub(lambda m: pmap.add(m.group(0)), text)
        # Inline math
        text = _INLINE_MATH_PATTERN.sub(lambda m: pmap.add(m.group(0)), text)

    # 2. Protect tables & figures
    if protect_tables:
        text = _TABLE_PATTERN.sub(lambda m: pmap.add(m.group(0)), text)
    if protect_figures:
        text = _FIGURE_PATTERN.sub(lambda m: pmap.add(m.group(0)), text)

    # 3. Protect citations and references
    if protect_citations:
        text = _CITATION_PATTERN.sub(lambda m: pmap.add(m.group(0)), text)
    if protect_refs:
        text = _REF_PATTERN.sub(lambda m: pmap.add(m.group(0)), text)
        text = _LABEL_PATTERN.sub(lambda m: pmap.add(m.group(0)), text)

    # 4. Strip formatting commands but keep text
    text = _FORMATTING_COMMANDS.sub(r"\1", text)

    # 5. Convert remaining LaTeX to unicode via pylatexenc
    try:
        converter = LatexNodes2Text()
        text = converter.latex_to_text(text)
    except Exception:
        log.debug("pylatexenc conversion failed, falling back to regex stripping")
        # Fallback: strip remaining backslash commands
        text = re.sub(r"\\[a-zA-Z]+\*?(?:\{[^}]*\})*", "", text)

    # 6. Clean up whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = text.strip()

    return text, pmap


def strip_latex_for_comparison(latex: str) -> str:
    """Aggressively strip all LaTeX to raw text for semantic comparison.

    Unlike ``latex_to_plaintext``, this does NOT use placeholders — it simply
    removes all LaTeX markup and returns raw text.
    """
    text = latex

    # Remove all math environments
    for pat in _DISPLAY_MATH_PATTERNS:
        text = pat.sub("[EQUATION]", text)
    text = _INLINE_MATH_PATTERN.sub("[MATH]", text)

    # Remove tables and figures
    text = _TABLE_PATTERN.sub("[TABLE]", text)
    text = _FIGURE_PATTERN.sub("[FIGURE]", text)

    # Remove citations but leave marker
    text = _CITATION_PATTERN.sub("[CITATION]", text)
    text = _REF_PATTERN.sub("[REF]", text)
    text = _LABEL_PATTERN.sub("", text)

    # Strip formatting
    text = _FORMATTING_COMMANDS.sub(r"\1", text)

    # Strip all remaining commands
    text = re.sub(r"\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*", "", text)
    text = re.sub(r"[{}]", "", text)

    # Clean whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def extract_all_citations(latex: str) -> list[str]:
    """Extract all citation keys from a LaTeX string."""
    keys: list[str] = []
    for match in _CITATION_PATTERN.finditer(latex):
        # Extract the keys from \cite{key1,key2,...}
        inner = re.search(r"\{([^}]+)\}", match.group(0))
        if inner:
            keys.extend(k.strip() for k in inner.group(1).split(","))
    return sorted(set(keys))


def extract_all_refs(latex: str) -> list[str]:
    """Extract all \\ref{...} keys from a LaTeX string."""
    refs: list[str] = []
    for match in _REF_PATTERN.finditer(latex):
        inner = re.search(r"\{([^}]+)\}", match.group(0))
        if inner:
            refs.append(inner.group(1).strip())
    return sorted(set(refs))


def extract_all_labels(latex: str) -> list[str]:
    """Extract all \\label{...} keys from a LaTeX string."""
    labels: list[str] = []
    for match in _LABEL_PATTERN.finditer(latex):
        inner = re.search(r"\{([^}]+)\}", match.group(0))
        if inner:
            labels.append(inner.group(1).strip())
    return sorted(set(labels))
