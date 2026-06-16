"""Grammar correction engine using language-tool-python.

Strips LaTeX commands via placeholders before checking, then restores them.
Handles missing Java gracefully.
"""

from __future__ import annotations

from typing import Any

from q1_engine.models import GrammarConfig
from q1_engine.utils.logging_setup import get_logger
from q1_engine.utils.text_processing import latex_to_plaintext

log = get_logger("grammar")


class GrammarEngine:
    """Rule-based grammar correction via LanguageTool."""

    def __init__(self, config: GrammarConfig) -> None:
        self._config = config
        self._tool = None
        self._available = True

    def _ensure_tool(self) -> bool:
        """Lazy-initialize LanguageTool. Returns False if unavailable."""
        if self._tool is not None:
            return True
        if not self._available:
            return False

        try:
            import subprocess, re
            result = subprocess.run(['java', '-version'], capture_output=True, text=True)
            version_match = re.search(r'version "(\d+)', result.stderr or result.stdout)
            if version_match and int(version_match.group(1)) < 17:
                log.warning("Java < 17 detected. LanguageTool disabled.")
                self._available = False
                return False

            import language_tool_python
            self._tool = language_tool_python.LanguageTool(
                self._config.language,
                config={"cacheSize": 1000, "pipelineCaching": True},
            )
            # Disable configured rules
            if self._config.disabled_rules:
                self._tool.disabled_rules = set(self._config.disabled_rules)
            log.info("LanguageTool initialized (lang=%s)", self._config.language)
            return True
        except Exception as exc:
            log.warning(
                "LanguageTool unavailable (Java may not be installed): %s. "
                "Grammar checking will be skipped.", exc,
            )
            self._available = False
            return False

    def correct(self, text: str) -> tuple[str, list[dict[str, Any]]]:
        """Apply grammar corrections to LaTeX text.

        Parameters
        ----------
        text
            LaTeX text to correct.

        Returns
        -------
        (corrected_text, corrections)
            The corrected text with LaTeX commands preserved,
            and a list of correction details.
        """
        if not self._ensure_tool():
            return text, []

        # Strip LaTeX to plain text with placeholders
        plain, pmap = latex_to_plaintext(text)

        # Run grammar check on plain text
        matches = self._tool.check(plain)

        corrections: list[dict[str, Any]] = []
        corrected = plain

        # Apply corrections in reverse order to preserve offsets
        for match in reversed(matches):
            if not match.replacements:
                continue
            replacement = match.replacements[0]
            start = match.offset
            end = match.offset + match.errorLength
            original_fragment = corrected[start:end]

            corrected = corrected[:start] + replacement + corrected[end:]
            corrections.append({
                "rule": match.ruleId,
                "message": match.message,
                "original": original_fragment,
                "replacement": replacement,
                "category": match.category,
            })

        # Restore LaTeX commands from placeholders
        corrected = pmap.restore(corrected)

        log.info("Applied %d grammar corrections", len(corrections))
        return corrected, corrections

    def close(self) -> None:
        """Shut down the LanguageTool server."""
        if self._tool is not None:
            try:
                self._tool.close()
            except Exception:
                pass
            self._tool = None
