"""Async HTTP client for Semantic Scholar, CrossRef, and OpenAlex APIs.

Uses httpx for async HTTP and tenacity for retry logic.
All methods return ``None`` on failure — they never block the pipeline.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from q1_engine.utils.logging_setup import get_logger

log = get_logger("api_client")

# ---------------------------------------------------------------------------
# Rate-limited async client
# ---------------------------------------------------------------------------

_DEFAULT_TIMEOUT = 30.0
_MAX_RETRIES = 3


class AcademicAPIClient:
    """Unified async client for academic APIs with rate limiting and retries."""

    def __init__(
        self,
        semantic_scholar_base: str = "https://api.semanticscholar.org/graph/v1",
        crossref_base: str = "https://api.crossref.org",
        openalex_base: str = "https://api.openalex.org",
        crossref_mailto: str | None = None,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> None:
        self._ss_base = semantic_scholar_base.rstrip("/")
        self._cr_base = crossref_base.rstrip("/")
        self._oa_base = openalex_base.rstrip("/")
        self._cr_mailto = crossref_mailto
        self._timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            headers = {"User-Agent": "Q1Engine/1.0 (Academic Manuscript Refinement)"}
            if self._cr_mailto:
                headers["mailto"] = self._cr_mailto
            self._client = httpx.AsyncClient(
                timeout=self._timeout,
                headers=headers,
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # -- Internal ----------------------------------------------------------

    @retry(
        stop=stop_after_attempt(_MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.ConnectError, httpx.ReadTimeout)),
        reraise=True,
    )
    async def _get(self, url: str, params: dict | None = None) -> dict[str, Any] | None:
        client = await self._get_client()
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()

    async def _safe_get(self, url: str, params: dict | None = None) -> dict[str, Any] | None:
        """GET with full error swallowing — never raises."""
        try:
            return await self._get(url, params)
        except Exception as exc:
            log.debug("API request failed: %s — %s", url, exc)
            return None

    # -- Semantic Scholar --------------------------------------------------

    async def semantic_scholar_paper(
        self, paper_id: str, fields: str = "title,abstract,year,citationCount"
    ) -> dict[str, Any] | None:
        """Fetch a paper by Semantic Scholar paper ID, DOI, or title."""
        await asyncio.sleep(1.5)
        url = f"{self._ss_base}/paper/{paper_id}"
        return await self._safe_get(url, {"fields": fields})

    async def semantic_scholar_search(
        self, query: str, limit: int = 5, fields: str = "title,abstract,year"
    ) -> list[dict[str, Any]]:
        """Search for papers on Semantic Scholar."""
        await asyncio.sleep(1.5)
        url = f"{self._ss_base}/paper/search"
        result = await self._safe_get(url, {"query": query, "limit": limit, "fields": fields})
        if result and "data" in result:
            return result["data"]
        return []

    # -- CrossRef ----------------------------------------------------------

    async def crossref_work(self, doi: str) -> dict[str, Any] | None:
        """Fetch a work by DOI from CrossRef."""
        url = f"{self._cr_base}/works/{doi}"
        result = await self._safe_get(url)
        if result and "message" in result:
            return result["message"]
        return None

    async def crossref_search(
        self, query: str, rows: int = 5
    ) -> list[dict[str, Any]]:
        """Search CrossRef for works."""
        url = f"{self._cr_base}/works"
        result = await self._safe_get(url, {"query": query, "rows": rows})
        if result and "message" in result and "items" in result["message"]:
            return result["message"]["items"]
        return []

    # -- OpenAlex ----------------------------------------------------------

    async def openalex_work(self, doi: str) -> dict[str, Any] | None:
        """Fetch a work by DOI from OpenAlex."""
        url = f"{self._oa_base}/works/doi:{doi}"
        return await self._safe_get(url)

    async def openalex_search_works(
        self, query: str, per_page: int = 10
    ) -> list[dict[str, Any]]:
        """Search OpenAlex for works matching a query."""
        url = f"{self._oa_base}/works"
        result = await self._safe_get(url, {
            "search": query,
            "per_page": per_page,
            "sort": "relevance_score:desc",
        })
        if result and "results" in result:
            return result["results"]
        return []

    async def openalex_search_venues(
        self, query: str, per_page: int = 20
    ) -> list[dict[str, Any]]:
        """Search OpenAlex for venues/journals matching a query."""
        url = f"{self._oa_base}/sources"
        result = await self._safe_get(url, {
            "search": query,
            "per_page": per_page,
        })
        if result and "results" in result:
            return result["results"]
        return []

    async def openalex_venue_by_issn(self, issn: str) -> dict[str, Any] | None:
        """Look up a venue by ISSN."""
        url = f"{self._oa_base}/sources/issn:{issn}"
        return await self._safe_get(url)
