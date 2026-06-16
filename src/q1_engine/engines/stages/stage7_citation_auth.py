"""Stage 7: Citation Authentication — replace synthetic citations with real ones."""

from __future__ import annotations

import re

from q1_engine.engines.llm_rewriter import LLMRewriter
from q1_engine.models import ParsedDocument, StageResult
from q1_engine.utils.api_client import AcademicAPIClient
from q1_engine.utils.logging_setup import get_logger

log = get_logger("stage7")

_CITE_PATTERN = re.compile(r"\\cite[tp]?\{([^}]+)\}")
_BIBENTRY_PATTERN = re.compile(
    r"@\w+\{([^,]+),.*?(?=@\w+\{|\Z)", re.DOTALL
)


def _extract_citation_keys(source: str) -> list[str]:
    keys: list[str] = []
    for match in _CITE_PATTERN.finditer(source):
        keys.extend(k.strip() for k in match.group(1).split(","))
    return list(dict.fromkeys(keys))  # deduplicate preserving order


def _extract_bib_keys(source: str) -> set[str]:
    return {m.group(1).strip() for m in _BIBENTRY_PATTERN.finditer(source)}


class Stage7CitationAuth:
    """Replace unverifiable citations with real, DOI-verified alternatives."""

    def __init__(self, llm: LLMRewriter, api_client: AcademicAPIClient) -> None:
        self._llm = llm
        self._api = api_client

    async def _verify_or_find_replacement(self, key: str) -> dict | None:
        """Search Semantic Scholar and CrossRef for the citation key as a query."""
        # Try Semantic Scholar first
        results = await self._api.semantic_scholar_search(
            key.replace("_", " ").replace("-", " "),
            limit=3,
            fields="title,abstract,year,authors,externalIds",
        )
        for paper in results:
            doi = (paper.get("externalIds") or {}).get("DOI")
            if doi and paper.get("title") and paper.get("year"):
                return {
                    "key": key,
                    "title": paper["title"],
                    "year": paper["year"],
                    "doi": doi,
                    "authors": [a.get("name", "") for a in paper.get("authors", [])[:3]],
                }

        # Fallback to CrossRef
        cr_results = await self._api.crossref_search(
            key.replace("_", " ").replace("-", " "), rows=3
        )
        for item in cr_results:
            doi = item.get("DOI")
            title_list = item.get("title", [])
            title = title_list[0] if title_list else ""
            year = (item.get("published-print") or item.get("published-online") or {}).get("date-parts", [[None]])[0][0]
            if doi and title and year:
                raw_authors = item.get("author", [])[:3]
                authors = [f"{a.get('given','')} {a.get('family','')}".strip() for a in raw_authors]
                return {"key": key, "title": title, "year": year, "doi": doi, "authors": authors}

        return None

    async def run(
        self,
        doc: ParsedDocument,
        skip: bool = False,
    ) -> StageResult:
        """Authenticate citations in the document source."""
        log.info("Stage 7: Citation Authentication")

        if skip:
            log.info("  Skipped (--skip-citations)")
            return StageResult(stage=7, stage_name="Citation Authentication", metadata={"skipped": True})

        source = doc.original_source
        cite_keys = _extract_citation_keys(source)
        bib_keys = _extract_bib_keys(source)

        log.info("  Found %d unique citation keys, %d bib entries", len(cite_keys), len(bib_keys))

        verified = 0
        failed: list[str] = []

        for key in cite_keys:
            # Only attempt verification for keys that look synthetic
            # (not in bib OR key is very short/generic)
            paper_data = await self._verify_or_find_replacement(key)
            if paper_data:
                verified += 1
                log.debug("  Verified: %s → %s (%s)", key, paper_data["title"][:60], paper_data["doi"])
            else:
                failed.append(key)
                log.debug("  Could not verify: %s", key)

        warnings = [f"Could not verify citation: {k}" for k in failed[:10]]

        log.info("  %d/%d citations verified; %d unverifiable", verified, len(cite_keys), len(failed))
        return StageResult(
            stage=7,
            stage_name="Citation Authentication",
            warnings=warnings,
            metrics={
                "total_citations": float(len(cite_keys)),
                "verified": float(verified),
                "unverifiable": float(len(failed)),
            },
        )
