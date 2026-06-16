"""AI writing pattern definitions.

Comprehensive dictionary of common AI-generated writing patterns,
categorized by severity and type.  Used by the Academic Style Engine
to detect and flag content for rewriting.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AIPattern:
    """A detectable AI writing pattern."""
    pattern: str          # The phrase or regex to detect
    category: str         # filler | hedging | superlative | transition | marketing | structure
    severity: str         # must_fix | should_fix | cosmetic
    suggestion: str = ""  # Brief guidance for the rewriter


# ---------------------------------------------------------------------------
# Filler phrases — add no meaning
# ---------------------------------------------------------------------------

FILLER_PHRASES: list[AIPattern] = [
    AIPattern("it is worth noting that", "filler", "must_fix", "Remove entirely; start with the actual point"),
    AIPattern("it is important to note that", "filler", "must_fix", "Remove entirely; state the point directly"),
    AIPattern("it should be noted that", "filler", "must_fix", "Remove entirely"),
    AIPattern("it is interesting to note that", "filler", "must_fix", "Remove entirely"),
    AIPattern("it is well known that", "filler", "should_fix", "Remove or cite a source"),
    AIPattern("it is widely recognized that", "filler", "should_fix", "Remove or cite a source"),
    AIPattern("it is generally accepted that", "filler", "should_fix", "Remove or cite a source"),
    AIPattern("needless to say", "filler", "must_fix", "If needless, remove the sentence"),
    AIPattern("as a matter of fact", "filler", "must_fix", "Remove entirely"),
    AIPattern("in today's world", "filler", "must_fix", "Remove or specify timeframe"),
    AIPattern("in this day and age", "filler", "must_fix", "Remove entirely"),
    AIPattern("at the end of the day", "filler", "must_fix", "Remove entirely"),
    AIPattern("in conclusion, it can be said that", "filler", "must_fix", "Simplify to direct conclusion"),
    AIPattern("plays a crucial role", "filler", "should_fix", "Specify what role exactly"),
    AIPattern("plays a vital role", "filler", "should_fix", "Specify what role exactly"),
    AIPattern("plays a significant role", "filler", "should_fix", "Specify what role exactly"),
    AIPattern("plays an important role", "filler", "should_fix", "Specify what role exactly"),
    AIPattern("in order to", "filler", "should_fix", "Replace with 'to'"),
    AIPattern("due to the fact that", "filler", "should_fix", "Replace with 'because'"),
    AIPattern("for the purpose of", "filler", "should_fix", "Replace with 'to' or 'for'"),
    AIPattern("with respect to", "filler", "cosmetic", "Consider 'regarding' or 'for'"),
    AIPattern("in the context of", "filler", "cosmetic", "Consider 'in' or 'for'"),
    AIPattern("in terms of", "filler", "cosmetic", "Consider 'regarding' or rephrase"),
    AIPattern("on the other hand", "filler", "cosmetic", "Use sparingly; consider 'however'"),
    AIPattern("as a result of this", "filler", "cosmetic", "Consider 'consequently' or 'therefore'"),
    # Added Turnitin patterns
    AIPattern("it's important to acknowledge", "filler", "must_fix", "Remove entirely"),
    AIPattern("this approach offers", "filler", "must_fix", "Too generic, state specifics"),
    AIPattern("stands as a testament", "filler", "must_fix", "Remove; overly dramatic"),
    AIPattern("we can observe that", "filler", "must_fix", "Remove; state observation directly"),
    AIPattern("this demonstrates the", "filler", "must_fix", "Simplify to 'This shows' or similar"),
    AIPattern("has garnered significant attention", "filler", "must_fix", "Cliché AI opening"),
    AIPattern("has gained significant attention", "filler", "must_fix", "Cliché AI opening"),
    AIPattern("has received considerable attention", "filler", "must_fix", "Cliché AI opening"),
    AIPattern("it is imperative to", "filler", "must_fix", "Remove entirely"),
    AIPattern("it bears mentioning", "filler", "must_fix", "Remove entirely"),
    AIPattern("it becomes evident that", "filler", "must_fix", "Remove entirely"),
    AIPattern("it is crucial to understand", "filler", "must_fix", "Remove entirely"),
    AIPattern("serves as a reminder", "filler", "must_fix", "Remove entirely"),
    AIPattern("the findings suggest that", "filler", "should_fix", "Simplify"),
    AIPattern("in recent years", "filler", "should_fix", "Cliché AI opening, specify years if needed"),
    AIPattern("over the past decade", "filler", "should_fix", "Cliché AI opening"),
    AIPattern("has emerged as", "filler", "should_fix", "Generic AI phrasing"),
    AIPattern("has become increasingly", "filler", "should_fix", "Generic AI phrasing"),
    AIPattern("it is essential to", "filler", "should_fix", "Remove"),
    AIPattern("can be attributed to", "filler", "should_fix", "Consider 'is due to'"),
    AIPattern("shed light on", "filler", "should_fix", "Cliché"),
    AIPattern("sheds light on", "filler", "should_fix", "Cliché"),
    AIPattern("provide valuable insights", "filler", "should_fix", "Cliché"),
    AIPattern("provides valuable insights", "filler", "should_fix", "Cliché"),
    AIPattern("offer a promising", "filler", "should_fix", "Cliché"),
    AIPattern("offers a promising", "filler", "should_fix", "Cliché"),
]

# ---------------------------------------------------------------------------
# Hedging overuse — excessive uncertainty
# ---------------------------------------------------------------------------

HEDGING_PHRASES: list[AIPattern] = [
    AIPattern("could potentially", "hedging", "should_fix", "Choose 'could' or 'potentially', not both"),
    AIPattern("may potentially", "hedging", "should_fix", "Choose 'may' or 'potentially', not both"),
    AIPattern("might possibly", "hedging", "should_fix", "Choose 'might' or 'possibly', not both"),
    AIPattern("it is possible that", "hedging", "should_fix", "Consider stating the condition directly"),
    AIPattern("there is a possibility that", "hedging", "should_fix", "Rephrase directly"),
    AIPattern("it is likely that", "hedging", "cosmetic", "Consider 'likely,' as an adverb"),
    AIPattern("to some extent", "hedging", "cosmetic", "Quantify if possible"),
    AIPattern("to a certain degree", "hedging", "cosmetic", "Quantify if possible"),
    AIPattern("it can be argued that", "hedging", "should_fix", "State the argument directly"),
    AIPattern("one could argue that", "hedging", "should_fix", "State the argument directly"),
    AIPattern("it remains to be seen", "hedging", "should_fix", "Cliché AI conclusion"),
    AIPattern("further research is needed", "hedging", "should_fix", "Cliché AI conclusion"),
    AIPattern("warrants further investigation", "hedging", "should_fix", "Cliché AI conclusion"),
]

# ---------------------------------------------------------------------------
# Superlative / exaggeration abuse
# ---------------------------------------------------------------------------

SUPERLATIVE_PHRASES: list[AIPattern] = [
    AIPattern("very significant", "superlative", "should_fix", "Use 'significant' or quantify"),
    AIPattern("extremely important", "superlative", "should_fix", "Specify importance or remove"),
    AIPattern("highly significant", "superlative", "cosmetic", "Just 'significant' or give p-value"),
    AIPattern("drastically improve", "superlative", "should_fix", "Quantify the improvement"),
    AIPattern("dramatically increase", "superlative", "should_fix", "Quantify the increase"),
    AIPattern("remarkably", "superlative", "cosmetic", "Quantify instead"),
    AIPattern("groundbreaking", "superlative", "must_fix", "Remove; let results speak"),
    AIPattern("revolutionary", "superlative", "must_fix", "Remove; let results speak"),
    AIPattern("cutting-edge", "superlative", "must_fix", "Replace with 'recent' or 'state-of-the-art'"),
    AIPattern("novel and innovative", "superlative", "should_fix", "Choose one; both is redundant"),
    AIPattern("state-of-the-art results", "superlative", "should_fix", "Specify what benchmark/comparison"),
    AIPattern("unprecedented", "superlative", "must_fix", "Substantiate or remove"),
    AIPattern("paradigm shift", "superlative", "must_fix", "Remove unless truly warranted"),
    AIPattern("excels at", "superlative", "must_fix", "Too promotional"),
    AIPattern("stands out", "superlative", "must_fix", "Too promotional"),
    AIPattern("outshines", "superlative", "must_fix", "Too promotional"),
]

# ---------------------------------------------------------------------------
# Generic AI transitions
# ---------------------------------------------------------------------------

GENERIC_TRANSITIONS: list[AIPattern] = [
    AIPattern("furthermore", "transition", "cosmetic", "Vary transitions; don't overuse"),
    AIPattern("moreover", "transition", "cosmetic", "Vary transitions; don't overuse"),
    AIPattern("additionally", "transition", "cosmetic", "Vary transitions; don't overuse"),
    AIPattern("in addition to this", "transition", "should_fix", "Simplify to 'additionally' or restructure"),
    AIPattern("delve into", "transition", "must_fix", "Replace with 'examine', 'investigate', 'analyze'"),
    AIPattern("delve deeper", "transition", "must_fix", "Replace with 'examine further'"),
    AIPattern("it is evident that", "transition", "should_fix", "Remove; just state the evidence"),
    AIPattern("this highlights the fact that", "transition", "should_fix", "Simplify: 'This shows...'"),
    AIPattern("this underscores the importance of", "transition", "should_fix", "Simplify or remove"),
]

# ---------------------------------------------------------------------------
# Marketing / promotional language
# ---------------------------------------------------------------------------

MARKETING_PHRASES: list[AIPattern] = [
    AIPattern("leverage", "marketing", "should_fix", "Replace with 'use', 'employ', 'apply'"),
    AIPattern("leveraging", "marketing", "should_fix", "Replace with 'using', 'employing'"),
    AIPattern("harness", "marketing", "should_fix", "Replace with 'use' or 'apply'"),
    AIPattern("harnessing", "marketing", "should_fix", "Replace with 'using' or 'applying'"),
    AIPattern("unlock the potential", "marketing", "must_fix", "Remove; describe specific capability"),
    AIPattern("unleash", "marketing", "must_fix", "Replace with academic language"),
    AIPattern("a myriad of", "marketing", "must_fix", "Replace with 'many' or 'numerous'"),
    AIPattern("in the realm of", "marketing", "must_fix", "Replace with 'in' or 'within'"),
    AIPattern("pave the way for", "marketing", "should_fix", "Replace with 'enable' or 'support'"),
    AIPattern("game-changer", "marketing", "must_fix", "Remove; quantify impact instead"),
    AIPattern("robust and scalable", "marketing", "should_fix", "Separate and justify each claim"),
    AIPattern("seamlessly", "marketing", "should_fix", "Remove or describe the integration"),
    AIPattern("holistic approach", "marketing", "should_fix", "Describe what's actually comprehensive"),
    AIPattern("synergy", "marketing", "should_fix", "Replace with specific interaction description"),
    AIPattern("ecosystem", "marketing", "cosmetic", "Acceptable in CS; check context"),
    AIPattern("best practices", "marketing", "cosmetic", "Acceptable if cited"),
    AIPattern("comprehensive analysis", "marketing", "should_fix", "Describe what makes it comprehensive"),
    AIPattern("comprehensive overview", "marketing", "should_fix", "Describe what's covered"),
    AIPattern("comprehensive study", "marketing", "should_fix", "Describe scope instead"),
    AIPattern("transformative", "marketing", "must_fix", "Too promotional"),
    AIPattern("game-changing", "marketing", "must_fix", "Too promotional"),
    AIPattern("cornerstone", "marketing", "must_fix", "Too promotional"),
    AIPattern("spearhead", "marketing", "must_fix", "Too promotional"),
    AIPattern("trailblazing", "marketing", "must_fix", "Too promotional"),
    AIPattern("pioneering approach", "marketing", "must_fix", "Too promotional"),
    AIPattern("innovative solution", "marketing", "must_fix", "Too promotional"),
    # Skill-spec additions
    AIPattern("realm", "marketing", "must_fix", "Replace with 'area', 'field', 'domain'"),
    AIPattern("landscape", "marketing", "should_fix", "Replace with 'context', 'state of research'"),
    AIPattern("tapestry", "marketing", "must_fix", "Delete or replace with specific description"),
    AIPattern("cascade", "marketing", "should_fix", "Replace with 'series', 'sequence'"),
    AIPattern("interplay", "marketing", "should_fix", "Replace with 'interaction', 'relationship'"),
    AIPattern("notably", "marketing", "should_fix", "Delete or use 'significantly', 'in particular'"),
    AIPattern("pivotal", "marketing", "must_fix", "Replace with 'central', 'key', 'critical'"),
    AIPattern("paramount", "marketing", "must_fix", "Replace with 'essential', 'most important'"),
    AIPattern("holistic", "marketing", "should_fix", "Replace with 'comprehensive', 'integrated'"),
    AIPattern("intricate", "marketing", "should_fix", "Replace with 'complex', 'detailed'"),
    AIPattern("fostering", "marketing", "should_fix", "Replace with 'promoting', 'supporting'"),
    AIPattern("catalyst", "marketing", "should_fix", "Replace with 'driver', 'trigger', 'stimulus'"),
    AIPattern("multifaceted", "marketing", "must_fix", "Replace with 'complex', 'having multiple aspects'"),
    AIPattern("underscore", "marketing", "should_fix", "Replace with 'emphasize', 'show', 'demonstrate'"),
]

# ---------------------------------------------------------------------------
# Structural / repetitive patterns
# ---------------------------------------------------------------------------

STRUCTURAL_PATTERNS: list[AIPattern] = [
    AIPattern("in this paper, we", "structure", "cosmetic", "Vary; don't start every section this way"),
    AIPattern("in this study, we", "structure", "cosmetic", "Vary; don't start every section this way"),
    AIPattern("in this work, we", "structure", "cosmetic", "Vary; don't start every section this way"),
    AIPattern("the rest of the paper is organized as follows", "structure", "cosmetic", "Keep once in intro; remove duplicates"),
    AIPattern("the remainder of this paper", "structure", "cosmetic", "Keep once in intro; remove duplicates"),
    AIPattern("this section presents", "structure", "cosmetic", "Often redundant; dive into content directly"),
    AIPattern("this section discusses", "structure", "cosmetic", "Often redundant; dive into content directly"),
    AIPattern("as mentioned earlier", "structure", "should_fix", "Remove or use a forward reference"),
    AIPattern("as discussed above", "structure", "should_fix", "Remove or use a specific reference"),
    AIPattern("as previously mentioned", "structure", "should_fix", "Remove or cross-reference"),
    AIPattern("building upon this", "structure", "should_fix", "AI transition cliché"),
    AIPattern("building on this", "structure", "should_fix", "AI transition cliché"),
    AIPattern("drawing upon", "structure", "should_fix", "AI transition cliché"),
    AIPattern("taken together", "structure", "should_fix", "AI transition cliché"),
    AIPattern("moving forward", "structure", "should_fix", "AI transition cliché"),
    AIPattern("not only", "structure", "should_fix", "AI 'not only...but also' pattern"),
    AIPattern("on the one hand", "structure", "should_fix", "Perfectly balanced AI contrast"),
    AIPattern("on the other hand", "structure", "should_fix", "Perfectly balanced AI contrast"),
]


# ---------------------------------------------------------------------------
# Structural detector utilities
# ---------------------------------------------------------------------------

import re as _re


def detect_parallel_constructions(paragraphs: list[str], threshold: int = 3) -> list[int]:
    """Return paragraph indices with suspicious parallel constructions.

    Flags paragraphs where >= threshold consecutive sentences share the
    same first word.
    """
    flagged = []
    for idx, para in enumerate(paragraphs):
        sentences = [s.strip() for s in _re.split(r'(?<=[.!?])\s+', para) if s.strip()]
        if len(sentences) < threshold:
            continue
        runs = 1
        for i in range(1, len(sentences)):
            first_prev = sentences[i-1].split()[0].lower() if sentences[i-1].split() else ""
            first_curr = sentences[i].split()[0].lower() if sentences[i].split() else ""
            if first_prev == first_curr:
                runs += 1
                if runs >= threshold:
                    flagged.append(idx)
                    break
            else:
                runs = 1
    return flagged


def check_uniform_paragraph_lengths(paragraphs: list[str], max_std_dev: float = 10.0) -> bool:
    """Return True if paragraphs are suspiciously uniform in length."""
    import math
    if len(paragraphs) < 3:
        return False
    lengths = [len(p.split()) for p in paragraphs if p.strip()]
    if not lengths:
        return False
    mean = sum(lengths) / len(lengths)
    std = math.sqrt(sum((l - mean) ** 2 for l in lengths) / len(lengths))
    return std < max_std_dev


def detect_triplet_patterns(text: str) -> int:
    """Count 'A, B, and C' triplet patterns."""
    pattern = _re.compile(r'\b\w+\s*,\s*\w+\s*,?\s*and\s+\w+\b', _re.IGNORECASE)
    return len(pattern.findall(text))


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------

ALL_PATTERNS: list[AIPattern] = (
    FILLER_PHRASES
    + HEDGING_PHRASES
    + SUPERLATIVE_PHRASES
    + GENERIC_TRANSITIONS
    + MARKETING_PHRASES
    + STRUCTURAL_PATTERNS
)

MUST_FIX_PATTERNS = [p for p in ALL_PATTERNS if p.severity == "must_fix"]
SHOULD_FIX_PATTERNS = [p for p in ALL_PATTERNS if p.severity == "should_fix"]
COSMETIC_PATTERNS = [p for p in ALL_PATTERNS if p.severity == "cosmetic"]


def detect_patterns(text: str, *, min_severity: str = "should_fix") -> list[tuple[AIPattern, int]]:
    """Detect AI writing patterns in text.

    Returns
    -------
    List of (pattern, count) tuples sorted by severity (must_fix first).
    """
    severity_order = {"must_fix": 0, "should_fix": 1, "cosmetic": 2}
    min_level = severity_order.get(min_severity, 1)

    results: list[tuple[AIPattern, int]] = []
    text_lower = text.lower()

    for pattern in ALL_PATTERNS:
        if severity_order.get(pattern.severity, 2) > min_level:
            continue
        count = text_lower.count(pattern.pattern.lower())
        if count > 0:
            results.append((pattern, count))

    results.sort(key=lambda x: (severity_order.get(x[0].severity, 2), -x[1]))
    return results

def check_uniform_paragraph_lengths(paragraphs: list[str]) -> bool:
    if len(paragraphs) < 3:
        return False
    lengths = [len(p.split()) for p in paragraphs if p.strip()]
    if not lengths:
        return False
    mean = sum(lengths) / len(lengths)
    import math
    std_dev = math.sqrt(sum((l - mean) ** 2 for l in lengths) / len(lengths))
    return std_dev < 15.0 and mean > 40.0

def detect_parallel_constructions(paragraphs: list[str]) -> list[int]:
    import re
    res = []
    for i, p in enumerate(paragraphs):
        sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", p) if s.strip()]
        if len(sents) >= 3:
            starts = [s.split()[0].lower() for s in sents if s.split()]
            for j in range(len(starts) - 2):
                if starts[j] == starts[j+1] == starts[j+2]:
                    res.append(i)
                    break
    return res
