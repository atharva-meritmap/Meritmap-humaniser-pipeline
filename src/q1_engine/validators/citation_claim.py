"""Citation-claim validator — verifies cited claims using Semantic Scholar S2ORC."""

from __future__ import annotations

import re

from q1_engine.models import CitationClaim, Section
from q1_engine.utils.api_client import AcademicAPIClient
from q1_engine.utils.logging_setup import get_logger
from q1_engine.validators.semantic_validator import SemanticValidator

log = get_logger("citation_claim")

_CITE_CMD = re.compile(r"\\cite(?:p|t)?\{([^}]+)\}")
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


class CitationClaimValidator:
    """Validate that text claims align with the cited papers' abstracts."""

    def __init__(
        self, 
        api_client: AcademicAPIClient | None = None,
        semantic_validator: SemanticValidator | None = None
    ) -> None:
        self._api = api_client
        self._semantic = semantic_validator

    def _extract_claims(self, sections: list[Section]) -> list[tuple[str, str]]:
        """Extract (claim_text, citation_key) pairs."""
        claims = []
        for section in sections:
            text = section.all_text
            sentences = _SENT_SPLIT.split(text)
            for sent in sentences:
                for m in _CITE_CMD.finditer(sent):
                    # Handle multiple keys in one \cite{A,B}
                    keys = [k.strip() for k in m.group(1).split(",")]
                    for k in keys:
                        claims.append((sent.strip(), k))
        return claims

    def _parse_bib_for_title(self, bib_text: str, key: str) -> str | None:
        """Attempt to extract paper title from bibliography text."""
        if not bib_text:
            return None
        # Basic heuristic for BibTeX title fields
        # Note: robust bib parsing is complex, this is a best-effort approximation
        pattern = re.compile(rf"{key}.*?title\s*=\s*[{{'\"](.*?)[}}'\"]", re.DOTALL | re.IGNORECASE)
        m = pattern.search(bib_text)
        if m:
            # Clean up line breaks and multiple spaces
            return re.sub(r"\s+", " ", m.group(1)).strip()
        return None

    async def validate(self, sections: list[Section], bibliography: str | None = None) -> list[CitationClaim]:
        """Validate claims against external paper data.
        
        Returns
        -------
        list[CitationClaim]
            List of validated claims. Empty if APIs/models are unavailable.
        """
        if self._api is None or self._semantic is None:
            log.warning("Citation-claim validation skipped (API or Semantic validator missing)")
            return []

        raw_claims = self._extract_claims(sections)
        if not raw_claims:
            return []

        # Deduplicate to minimize API calls
        unique_keys = list(set(k for _, k in raw_claims))
        
        # Attempt to resolve keys to paper titles via bibliography
        key_to_title = {}
        if bibliography:
            for key in unique_keys:
                title = self._parse_bib_for_title(bibliography, key)
                if title:
                    key_to_title[key] = title

        # Fetch abstracts for titles
        key_to_abstract = {}
        for key, title in key_to_title.items():
            if not title:
                continue
            papers = await self._api.search_semantic_scholar(title, limit=1)
            if papers and papers[0].get("abstract"):
                key_to_abstract[key] = papers[0]["abstract"]
                
        # Validate claims
        results = []
        for claim_text, key in raw_claims:
            abstract = key_to_abstract.get(key)
            if not abstract:
                # Can't validate
                results.append(CitationClaim(
                    claim_text=claim_text,
                    citation_key=key,
                    paper_title=key_to_title.get(key, "Unknown Title"),
                    paper_abstract=None,
                    similarity_score=None,
                    is_supported=None
                ))
                continue

            # Compute SBERT similarity between claim and abstract
            # Note: This is an approximation. A claim might be supported even if overall 
            # similarity to the full abstract is low. A threshold of 0.2-0.3 is typical.
            sim = self._semantic._compute_sbert_similarity(claim_text, abstract)
            is_supported = sim >= 0.25

            results.append(CitationClaim(
                claim_text=claim_text,
                citation_key=key,
                paper_title=key_to_title.get(key, "Unknown Title"),
                paper_abstract=abstract,
                similarity_score=round(sim, 3),
                is_supported=is_supported
            ))

        log.info("Validated %d citation claims (%d with abstracts)", 
                 len(results), sum(1 for r in results if r.paper_abstract))
        return results
