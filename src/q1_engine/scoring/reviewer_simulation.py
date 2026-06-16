"""Multi-agent reviewer simulation engine.

Simulates 4 specialized peer reviewers that evaluate a manuscript from
different perspectives, mirroring real academic peer review.
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

from q1_engine.config import load_prompt
from q1_engine.models import (
    DomainProfile,
    LLMConfig,
    ReviewerReport,
    ReviewerScore,
    Section,
    SingleReviewerReport,
)
from q1_engine.utils.logging_setup import get_logger
from q1_engine.utils.text_processing import strip_latex_for_comparison

log = get_logger("reviewer_simulation")

# ---------------------------------------------------------------------------
# Reviewer personas
# ---------------------------------------------------------------------------

_REVIEWER_PERSONAS = [
    {
        "name": "Reviewer 1",
        "role": "Methodology Expert",
        "prompt_file": "reviewer_methodology",
        "dimensions": [
            "Methodology Clarity",
            "Reproducibility",
            "Experimental Design",
            "Statistical Rigor",
        ],
        "weight": 0.30,
    },
    {
        "name": "Reviewer 2",
        "role": "Writing Quality Expert",
        "prompt_file": "reviewer_writing",
        "dimensions": [
            "Clarity",
            "Flow",
            "Grammar and Style",
            "Academic Tone",
        ],
        "weight": 0.25,
    },
    {
        "name": "Reviewer 3",
        "role": "Novelty and Contribution Expert",
        "prompt_file": "reviewer_novelty",
        "dimensions": [
            "Novelty Presentation",
            "Contribution Clarity",
            "Literature Positioning",
            "Motivation",
        ],
        "weight": 0.25,
    },
    {
        "name": "Reviewer 4",
        "role": "Statistics and Data Expert",
        "prompt_file": "reviewer_statistics",
        "dimensions": [
            "Statistical Reporting",
            "Data Presentation",
            "Result Interpretation",
            "Limitation Coverage",
        ],
        "weight": 0.20,
    },
]


# ---------------------------------------------------------------------------
# Score parser
# ---------------------------------------------------------------------------

def _parse_score_from_text(text: str, dimension: str) -> float:
    """Try to extract a numeric score for a dimension from reviewer text."""
    # Try patterns like "Clarity: 7/10", "Clarity (7/10)", "Clarity: 7"
    patterns = [
        rf"{re.escape(dimension)}[:\s]*(\d+(?:\.\d+)?)\s*/\s*10",
        rf"{re.escape(dimension)}[:\s]*\((\d+(?:\.\d+)?)\s*/\s*10\)",
        rf"{re.escape(dimension)}[:\s]*(\d+(?:\.\d+)?)",
        rf"\*\*{re.escape(dimension)}\*\*[:\s]*(\d+(?:\.\d+)?)",
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            score = float(match.group(1))
            return min(max(score, 1.0), 10.0)
    return 5.0  # Default if parsing fails


def _parse_list_items(text: str, header: str) -> list[str]:
    """Extract bullet/numbered items under a header."""
    # Find the header
    pattern = rf"{re.escape(header)}[:\s]*\n((?:\s*[-*\d.]+\s+.+\n?)+)"
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        return []
    block = match.group(1)
    items = re.findall(r"[-*\d.]+\s+(.+)", block)
    return [item.strip() for item in items if item.strip()]


def _parse_reviewer_response(
    text: str, dimensions: list[str]
) -> SingleReviewerReport:
    """Parse a raw LLM reviewer response into structured scores."""
    scores = []
    for dim in dimensions:
        score_val = _parse_score_from_text(text, dim)
        # Extract justification — text after score until next dimension or section
        scores.append(ReviewerScore(
            dimension=dim,
            score=score_val,
            justification="",  # Narrative is in the full text
        ))

    required = _parse_list_items(text, "Required Revisions")
    suggestions = _parse_list_items(text, "Suggestions")

    return SingleReviewerReport(
        reviewer_name="",  # Set by caller
        reviewer_role="",  # Set by caller
        scores=scores,
        narrative=text,
        required_revisions=required,
        suggestions=suggestions,
    )


# ---------------------------------------------------------------------------
# Reviewer Simulation Engine
# ---------------------------------------------------------------------------

class ReviewerSimulationEngine:
    """Multi-agent reviewer simulation with 4 specialized reviewers."""

    def __init__(self, llm_config: LLMConfig) -> None:
        self._llm_config = llm_config

    def _prepare_manuscript_text(self, sections: list[Section]) -> str:
        """Concatenate sections into reviewer-readable text."""
        parts: list[str] = []
        for section in sections:
            if section.title:
                prefix = "#" * section.level
                parts.append(f"{prefix} {section.title}")
            text = section.all_text
            if text:
                parts.append(text)
        return "\n\n".join(parts)

    async def _run_single_reviewer(
        self, persona: dict[str, Any], manuscript_text: str
    ) -> SingleReviewerReport:
        """Run a single reviewer persona."""
        try:
            prompt_template = load_prompt(persona["prompt_file"])
        except FileNotFoundError:
            log.warning("Prompt template %s not found, using fallback", persona["prompt_file"])
            prompt_template = "Review this manuscript:\n{manuscript_text}\n\nProvide scores (1-10) and feedback."

        prompt = prompt_template.replace("{manuscript_text}", manuscript_text)

        try:
            import os
            import requests
            api_key = os.environ.get("OPENROUTER", os.environ.get("OPENROUTER_API_KEY"))
            
            messages = [
                {"role": "system", "content": f"You are {persona['name']}: {persona['role']}"},
                {"role": "user", "content": prompt},
            ]
            
            if api_key:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://meritmap.org",
                    "X-Title": "Meritmap Q1 Engine",
                }
                data = {
                    "model": self._llm_config.model,
                    "messages": messages,
                    "temperature": 0.4,
                }
                resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data, timeout=120)
                resp.raise_for_status()
                review_text = resp.json()["choices"][0]["message"]["content"]
            else:
                import ollama
                response = ollama.chat(
                    model=self._llm_config.model,
                    messages=messages,
                    options={"temperature": 0.4, "num_predict": 2048},
                )
                review_text = response["message"]["content"]
        except Exception as exc:
            log.warning("Reviewer %s failed: %s", persona["name"], exc)
            # Return default scores on failure
            review_text = f"Review could not be generated: {exc}"

        report = _parse_reviewer_response(review_text, persona["dimensions"])
        report.reviewer_name = persona["name"]
        report.reviewer_role = persona["role"]
        return report

    async def simulate(
        self,
        sections: list[Section],
        domain: DomainProfile | None = None,
    ) -> ReviewerReport:
        """Run all 4 reviewer personas and aggregate results.

        Parameters
        ----------
        sections
            The manuscript sections to review.
        domain
            Optional domain profile for context.

        Returns
        -------
        ReviewerReport with individual reviews + meta-review.
        """
        manuscript_text = self._prepare_manuscript_text(sections)
        if not manuscript_text.strip():
            log.warning("Empty manuscript text — skipping reviewer simulation")
            return ReviewerReport()

        log.info("Running 4-reviewer simulation...")

        # Run reviewers sequentially to avoid overwhelming Ollama
        reviews: list[SingleReviewerReport] = []
        for persona in _REVIEWER_PERSONAS:
            log.info("  → %s: %s", persona["name"], persona["role"])
            review = await self._run_single_reviewer(persona, manuscript_text)
            reviews.append(review)

        # Aggregate scores
        weighted_sum = 0.0
        total_weight = 0.0
        for review, persona in zip(reviews, _REVIEWER_PERSONAS):
            weighted_sum += review.average_score * persona["weight"]
            total_weight += persona["weight"]

        overall = weighted_sum / total_weight if total_weight > 0 else 0.0

        # Estimate acceptance probability (rough heuristic)
        if overall >= 8.0:
            acceptance_prob = 0.75
        elif overall >= 7.0:
            acceptance_prob = 0.50
        elif overall >= 6.0:
            acceptance_prob = 0.30
        elif overall >= 5.0:
            acceptance_prob = 0.15
        else:
            acceptance_prob = 0.05

        # Generate meta-review summary
        meta_parts = [
            f"## Meta-Review Summary",
            f"",
            f"**Overall Score**: {overall:.1f}/10",
            f"**Estimated Acceptance Probability**: {acceptance_prob:.0%}",
            f"",
        ]
        for review in reviews:
            meta_parts.append(f"### {review.reviewer_name} ({review.reviewer_role}): {review.average_score:.1f}/10")
            if review.required_revisions:
                meta_parts.append("**Required Revisions:**")
                for rev in review.required_revisions:
                    meta_parts.append(f"- {rev}")
            meta_parts.append("")

        return ReviewerReport(
            reviewers=reviews,
            meta_review="\n".join(meta_parts),
            overall_score=overall,
            estimated_acceptance_probability=acceptance_prob,
        )

    def format_as_markdown(self, report: ReviewerReport) -> str:
        """Format the reviewer report as a markdown document."""
        lines = [
            "# Peer Review Simulation Report",
            "",
            f"**Overall Score**: {report.overall_score:.1f}/10",
            f"**Estimated Acceptance Probability**: {report.estimated_acceptance_probability:.0%}",
            "",
            "---",
            "",
        ]

        for review in report.reviewers:
            lines.append(f"## {review.reviewer_name}: {review.reviewer_role}")
            lines.append(f"**Average Score**: {review.average_score:.1f}/10")
            lines.append("")

            # Score table
            lines.append("| Dimension | Score |")
            lines.append("|-----------|-------|")
            for score in review.scores:
                lines.append(f"| {score.dimension} | {score.score:.1f}/10 |")
            lines.append("")

            if review.required_revisions:
                lines.append("### Required Revisions")
                for rev in review.required_revisions:
                    lines.append(f"- {rev}")
                lines.append("")

            if review.suggestions:
                lines.append("### Suggestions")
                for sug in review.suggestions:
                    lines.append(f"- {sug}")
                lines.append("")

            lines.append("### Full Review")
            lines.append(review.narrative)
            lines.append("")
            lines.append("---")
            lines.append("")

        if report.meta_review:
            lines.append(report.meta_review)

        return "\n".join(lines)
