"""Pydantic v2 data models for the Q1 Manuscript Refinement Engine.

These models define the type-safe data flow across every pipeline stage.
"""

from __future__ import annotations

import enum
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ContentType(str, enum.Enum):
    """Classification of a LaTeX content block."""
    TEXT = "text"
    EQUATION = "equation"
    INLINE_MATH = "inline_math"
    TABLE = "table"
    FIGURE = "figure"
    CITATION = "citation"
    REFERENCE = "reference"
    LABEL = "label"
    COMMAND = "command"
    ENVIRONMENT = "environment"
    COMMENT = "comment"
    PREAMBLE = "preamble"
    BIBLIOGRAPHY = "bibliography"


class SectionType(str, enum.Enum):
    """Standard academic section types."""
    ABSTRACT = "abstract"
    INTRODUCTION = "introduction"
    RELATED_WORK = "related_work"
    LITERATURE_REVIEW = "literature_review"
    METHODOLOGY = "methodology"
    EXPERIMENTS = "experiments"
    RESULTS = "results"
    DISCUSSION = "discussion"
    CONCLUSION = "conclusion"
    ACKNOWLEDGMENTS = "acknowledgments"
    APPENDIX = "appendix"
    UNKNOWN = "unknown"


class FactType(str, enum.Enum):
    """Types of extractable scientific facts."""
    NUMERIC = "numeric"
    PERCENTAGE = "percentage"
    STATISTICAL = "statistical"
    COMPARATIVE = "comparative"
    METHOD = "method"
    DATASET = "dataset"
    METRIC = "metric"
    MEASUREMENT = "measurement"


class ValidationStatus(str, enum.Enum):
    """Validation outcome."""
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    RETRY = "retry"


class DomainLabel(str, enum.Enum):
    """Academic domains for domain-aware rewriting."""
    COMPUTER_SCIENCE = "computer_science"
    MEDICINE = "medicine"
    ENGINEERING = "engineering"
    PSYCHOLOGY = "psychology"
    ECONOMICS = "economics"
    MATERIALS_SCIENCE = "materials_science"
    GENERAL = "general"


class CognitiveMode(str, enum.Enum):
    """Cognitive remodeling modes for Stage 3."""
    STRUGGLE = "struggle"
    ANCHOR = "anchor"
    HEDGE = "hedge"
    MEMORY = "memory"
    PERSPECTIVE = "perspective"
    MESSY = "messy"


class VoiceProfile(str, enum.Enum):
    """Authorial voice profiles for Stage 4."""
    PRECISE_ANALYST = "precise_analyst"
    NARRATIVE_WEAVER = "narrative_weaver"
    BALANCED_SCHOLAR = "balanced_scholar"
    TECHNICAL_MINIMALIST = "technical_minimalist"
    CONVERSATIONAL_EXPERT = "conversational_expert"


class PaperType(str, enum.Enum):
    """Academic paper types."""
    EMPIRICAL = "empirical"
    REVIEW = "review"
    THEORETICAL = "theoretical"
    SHORT_PAPER = "short_paper"


# ---------------------------------------------------------------------------
# Span & Content Blocks
# ---------------------------------------------------------------------------

class TextSpan(BaseModel):
    """Character-level span in the original LaTeX source."""
    start: int
    end: int

    @property
    def length(self) -> int:
        return self.end - self.start


class ContentBlock(BaseModel):
    """A single content block within a section.

    Protected blocks (EQUATION, TABLE, FIGURE, CITATION, etc.) are never
    rewritten.  Only TEXT blocks pass through the rewriting engines.
    """
    content_type: ContentType
    raw_latex: str
    plain_text: str = ""
    span: TextSpan
    rewritten_text: str | None = None

    @property
    def is_protected(self) -> bool:
        return self.content_type != ContentType.TEXT

    @property
    def final_text(self) -> str:
        """Return rewritten text if available, else original raw LaTeX."""
        if self.rewritten_text is not None and self.content_type == ContentType.TEXT:
            return self.rewritten_text
        return self.raw_latex


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------

class Section(BaseModel):
    """A document section with its content blocks."""
    title: str = ""
    section_type: SectionType = SectionType.UNKNOWN
    level: int = 1  # 1 = \section, 2 = \subsection, 3 = \subsubsection
    span: TextSpan
    blocks: list[ContentBlock] = Field(default_factory=list)
    subsections: list[Section] = Field(default_factory=list)

    @property
    def text_blocks(self) -> list[ContentBlock]:
        """Return only rewritable text blocks."""
        return [b for b in self.blocks if b.content_type == ContentType.TEXT]

    @property
    def all_text(self) -> str:
        """Concatenate all plain text from text blocks."""
        return " ".join(b.plain_text for b in self.text_blocks if b.plain_text)


# ---------------------------------------------------------------------------
# Parsed Document
# ---------------------------------------------------------------------------

class ParsedDocument(BaseModel):
    """Fully parsed LaTeX document with span annotations.

    The *original_source* is the immutable source-of-truth.
    All rewrites are applied as span replacements on this string.
    """
    original_source: str
    preamble_span: TextSpan
    body_span: TextSpan
    sections: list[Section] = Field(default_factory=list)
    bibliography_span: TextSpan | None = None
    citations: list[str] = Field(default_factory=list)
    labels: list[str] = Field(default_factory=list)
    references: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Fact Graph (Hallucination Detection)
# ---------------------------------------------------------------------------

class FactNode(BaseModel):
    """A single extractable scientific fact."""
    value: str
    context: str  # surrounding sentence
    fact_type: FactType
    span: TextSpan
    section: str = ""
    confidence: float = 1.0


class FactGraph(BaseModel):
    """Structured collection of all facts in a document or section."""
    facts: list[FactNode] = Field(default_factory=list)

    @property
    def numeric_facts(self) -> list[FactNode]:
        return [f for f in self.facts if f.fact_type in (
            FactType.NUMERIC, FactType.PERCENTAGE, FactType.MEASUREMENT
        )]

    @property
    def statistical_facts(self) -> list[FactNode]:
        return [f for f in self.facts if f.fact_type == FactType.STATISTICAL]

    @property
    def method_facts(self) -> list[FactNode]:
        return [f for f in self.facts if f.fact_type == FactType.METHOD]

    @property
    def dataset_facts(self) -> list[FactNode]:
        return [f for f in self.facts if f.fact_type == FactType.DATASET]


# ---------------------------------------------------------------------------
# Citation-Claim Mapping
# ---------------------------------------------------------------------------

class CitationClaim(BaseModel):
    """A claim in the manuscript linked to a citation."""
    claim_text: str
    citation_key: str
    section: str = ""
    similarity_score: float | None = None
    cited_abstract: str | None = None
    is_supported: bool | None = None  # None = not yet validated


# ---------------------------------------------------------------------------
# Domain Detection
# ---------------------------------------------------------------------------

class DomainProfile(BaseModel):
    """Detected academic domain with confidence."""
    domain: DomainLabel = DomainLabel.GENERAL
    confidence: float = 0.0
    top_keywords: list[str] = Field(default_factory=list)
    runner_up: DomainLabel | None = None
    runner_up_confidence: float = 0.0


# ---------------------------------------------------------------------------
# Rewriting & Validation
# ---------------------------------------------------------------------------

class RewriteResult(BaseModel):
    """Result of rewriting a single content block."""
    original_text: str
    rewritten_text: str
    sbert_similarity: float = 0.0
    bertscore_f1: float = 0.0
    combined_score: float = 0.0
    fact_retention_score: float = 0.0
    status: ValidationStatus = ValidationStatus.RETRY
    attempt: int = 1
    lost_facts: list[str] = Field(default_factory=list)


class ValidationReport(BaseModel):
    """Full validation report for a rewrite."""
    semantic_similarity: float = 0.0
    bertscore_precision: float = 0.0
    bertscore_recall: float = 0.0
    bertscore_f1: float = 0.0
    combined_score: float = 0.0
    fact_retention_score: float = 0.0
    citations_preserved: bool = True
    equations_preserved: bool = True
    references_preserved: bool = True
    numerical_values_preserved: bool = True
    status: ValidationStatus = ValidationStatus.RETRY
    details: dict[str, Any] = Field(default_factory=dict)

    @property
    def passed(self) -> bool:
        return self.status == ValidationStatus.ACCEPTED


# ---------------------------------------------------------------------------
# Readability
# ---------------------------------------------------------------------------

class ReadabilityMetrics(BaseModel):
    """Readability scores from textstat."""
    flesch_reading_ease: float = 0.0
    flesch_kincaid_grade: float = 0.0
    gunning_fog: float = 0.0
    coleman_liau: float = 0.0
    ari: float = 0.0
    dale_chall: float = 0.0
    smog_index: float = 0.0
    avg_sentence_length: float = 0.0
    avg_word_length: float = 0.0

class ReadabilityReport(BaseModel):
    """Before/after readability comparison."""
    before: ReadabilityMetrics = Field(default_factory=ReadabilityMetrics)
    after: ReadabilityMetrics = Field(default_factory=ReadabilityMetrics)
    per_section: dict[str, ReadabilityMetrics] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Reviewer Simulation
# ---------------------------------------------------------------------------

class ReviewerScore(BaseModel):
    """Scores from a single dimension."""
    dimension: str
    score: float  # 1-10
    justification: str = ""


class SingleReviewerReport(BaseModel):
    """Report from one reviewer persona."""
    reviewer_name: str
    reviewer_role: str
    scores: list[ReviewerScore] = Field(default_factory=list)
    narrative: str = ""
    required_revisions: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)

    @property
    def average_score(self) -> float:
        if not self.scores:
            return 0.0
        return sum(s.score for s in self.scores) / len(self.scores)


class ReviewerReport(BaseModel):
    """Aggregated report from all reviewer personas."""
    reviewers: list[SingleReviewerReport] = Field(default_factory=list)
    meta_review: str = ""
    overall_score: float = 0.0
    estimated_acceptance_probability: float = 0.0


# ---------------------------------------------------------------------------
# Humanisation Scoring (AI Detection Bypass)
# ---------------------------------------------------------------------------

class DimensionScore(BaseModel):
    """Score for a single humanisation dimension."""
    name: str
    score: float  # 0-100
    weight: float = 0.0
    detail: str = ""


class AIDetectionResult(BaseModel):
    """Result of AI detection analysis on a text.

    A Human Score of 100 means indistinguishable from human writing.
    Lower scores indicate more AI-like characteristics.
    """
    human_score: float = 0.0  # 0-100 composite
    grade: str = "F"  # A+, A, B+, B, C, D, F
    estimated_ai_fraction: float = 100.0
    dimensions: list[DimensionScore] = Field(default_factory=list)

    @property
    def all_dimensions(self) -> list[DimensionScore]:
        return self.dimensions


class HumanisationReport(BaseModel):
    """Before/after humanisation quality report."""
    before: AIDetectionResult = Field(default_factory=AIDetectionResult)
    after: AIDetectionResult = Field(default_factory=AIDetectionResult)
    ai_patterns_before: int = 0
    ai_patterns_after: int = 0
    ai_patterns_removed_pct: float = 0.0
    fact_preservation_score: float = 1.0
    semantic_integrity: float = 1.0
    q1_writing_readiness: float = 0.0  # 0-100
    humanisation_grade: str = "F"  # A+, A, B+, B, C, D, F
    remaining_suggestions: list[str] = Field(default_factory=list)

    @property
    def human_score_improvement(self) -> float:
        return self.after.human_score - self.before.human_score


class VoiceConfig(BaseModel):
    """Voice profile configuration loaded from YAML."""
    formality: str = "high"
    sentence_length_preference: str = "medium"
    hedge_density: str = "medium"
    transition_density: str = "medium"
    personal_pronouns: str = "we"
    explanation_style: str = "direct"
    paragraph_length: str = "medium"
    special_characteristics: list[str] = Field(default_factory=list)
    example_sentence: str = ""


class StageResult(BaseModel):
    """Per-stage output with metadata."""
    stage: int
    stage_name: str
    success: bool = True
    text: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    metrics: dict[str, float] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class DetectionPreCheck(BaseModel):
    """Detection pre-check results from Stage 8."""
    perplexity_mean: float = 0.0
    perplexity_variance: float = 0.0
    burstiness_score: float = 0.0
    ai_markers_found: int = 0
    sentence_length_std: float = 0.0
    paragraph_length_std: float = 0.0
    transition_density: float = 0.0
    estimated_detection_risk: str = "medium"  # low | medium | high


class QualityReport(BaseModel):
    """Comprehensive quality report from Stage 8."""
    assembly_status: str = "success"
    detection_pre_check: DetectionPreCheck = Field(default_factory=DetectionPreCheck)
    q1_q2_compliant: bool = False
    sections_complete: list[str] = Field(default_factory=list)
    sections_missing: list[str] = Field(default_factory=list)
    argumentation_score: str = "adequate"
    methodology_score: str = "adequate"
    total_citations: int = 0
    verified_citations: int = 0
    recommendations: list[str] = Field(default_factory=list)


class HumanisationConfig(BaseModel):
    """Configuration for humanisation passes."""
    max_iterations: int = 4
    target_human_score: float = 85.0
    pass1_temperature: float = 0.6
    pass2_temperature: float = 0.8
    pass3_temperature: float = 0.5


# ---------------------------------------------------------------------------
# Journal Matching
# ---------------------------------------------------------------------------

class JournalMatch(BaseModel):
    """A recommended journal with fit metrics."""
    rank: int
    journal_name: str
    quartile: str = "Unknown"
    fit_score: float = 0.0
    citation_overlap: int = 0
    impact_factor: float | None = None
    acceptance_rate: str | None = None
    apc: str | None = None
    estimated_turnaround: str | None = None
    issn: str | None = None
    rationale: str = ""


class JournalRecommendations(BaseModel):
    """Top journal recommendations."""
    recommendations: list[JournalMatch] = Field(default_factory=list)
    analysis_notes: str = ""

    def add_match(self, journal_name: str, score: float, rationale: str = "") -> None:
        rank = len(self.recommendations) + 1
        self.recommendations.append(JournalMatch(
            rank=rank,
            journal_name=journal_name,
            fit_score=score,
            rationale=rationale
        ))


# ---------------------------------------------------------------------------
# Journal Compliance
# ---------------------------------------------------------------------------

class ComplianceItem(BaseModel):
    """A single compliance check result."""
    check: str
    passed: bool
    details: str = ""


class JournalCompliance(BaseModel):
    """Compliance report for a target journal."""
    target_journal: str
    items: list[ComplianceItem] = Field(default_factory=list)
    overall_compliant: bool = False

    @property
    def compliance_percentage(self) -> float:
        if not self.items:
            return 0.0
        return sum(1 for i in self.items if i.passed) / len(self.items) * 100

    @property
    def is_compliant(self) -> bool:
        return self.overall_compliant

    @is_compliant.setter
    def is_compliant(self, value: bool) -> None:
        self.overall_compliant = value

    def add_issue(self, check: str, details: str, is_blocking: bool = False) -> None:
        self.items.append(ComplianceItem(check=check, passed=False, details=details))

    def add_passed(self, check: str) -> None:
        self.items.append(ComplianceItem(check=check, passed=True))


# ---------------------------------------------------------------------------
# Publication Readiness
# ---------------------------------------------------------------------------

class SectionScore(BaseModel):
    """Quality score for a single section."""
    section_name: str
    score: float  # 0-100
    feedback: str = ""
    sub_scores: dict[str, float] = Field(default_factory=dict)


class PublicationReport(BaseModel):
    """Overall publication readiness report."""
    section_scores: list[SectionScore] = Field(default_factory=list)
    domain: DomainProfile | None = None
    baseline_review: Any = None
    readability: Any = None
    humanisation: HumanisationReport | None = None
    journal_compliance: JournalCompliance | None = None
    journal_recommendations: JournalRecommendations | None = None
    citation_consistency_score: float = 0.0
    writing_quality_score: float = 0.0
    journal_readiness_score: float = 0.0
    overall_score: float = 0.0
    summary: str = ""
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Pipeline Configuration
# ---------------------------------------------------------------------------

class LLMConfig(BaseModel):
    """LLM configuration."""
    provider: str = "ollama"
    model: str = "qwen2.5:14b"
    temperature: float = 0.3
    max_retries: int = 3
    fallback_model: str = "qwen2.5:3b"


class SemanticConfig(BaseModel):
    """Semantic validation configuration."""
    similarity_threshold: float = 0.95
    embedding_model: str = "all-MiniLM-L6-v2"
    bertscore_model: str = "microsoft/deberta-xlarge-mnli"


class NLPConfig(BaseModel):
    """NLP configuration."""
    spacy_model: str = "en_core_web_lg"
    stanza_processors: str = "tokenize,pos,lemma,depparse,constituency"


class GrammarConfig(BaseModel):
    """Grammar checking configuration."""
    language: str = "en-US"
    disabled_rules: list[str] = Field(default_factory=lambda: [
        "WHITESPACE_RULE", "COMMA_PARENTHESIS_WHITESPACE"
    ])


class ReadabilityConfig(BaseModel):
    """Readability target configuration."""
    target_flesch_score: float = 30.0
    max_sentence_length: int = 45


class DomainConfig(BaseModel):
    """Domain detection configuration."""
    auto_detect: bool = True
    default: str = "computer_science"


class JournalConfig(BaseModel):
    """Journal configuration."""
    target: str | None = None
    recommend: bool = True


class APIConfig(BaseModel):
    """External API configuration."""
    semantic_scholar_base_url: str = "https://api.semanticscholar.org/graph/v1"
    semantic_scholar_rate_limit: int = 100
    crossref_base_url: str = "https://api.crossref.org"
    crossref_mailto: str | None = None
    openalex_base_url: str = "https://api.openalex.org"
    niutrans_api_key: str | None = None


class PipelineConfig(BaseModel):
    """Master pipeline configuration."""
    llm: LLMConfig = Field(default_factory=LLMConfig)
    semantic: SemanticConfig = Field(default_factory=SemanticConfig)
    nlp: NLPConfig = Field(default_factory=NLPConfig)
    grammar: GrammarConfig = Field(default_factory=GrammarConfig)
    readability: ReadabilityConfig = Field(default_factory=ReadabilityConfig)
    domain: DomainConfig = Field(default_factory=DomainConfig)
    journal: JournalConfig = Field(default_factory=JournalConfig)
    apis: APIConfig = Field(default_factory=APIConfig)
    humanisation: HumanisationConfig = Field(default_factory=HumanisationConfig)
    verbose: bool = False
    skip_grammar: bool = False
    skip_citation_validation: bool = False
    skip_journal_matching: bool = False
    use_local_llama: bool = True
    voice_profile: VoiceProfile = VoiceProfile.BALANCED_SCHOLAR
    paper_type: PaperType = PaperType.EMPIRICAL
    target_score: float = 80.0
    skip_citations: bool = False
    stages: str = "1-8"  # e.g. "1-5" for partial runs


# ---------------------------------------------------------------------------
# Pipeline Result
# ---------------------------------------------------------------------------

class PipelineResult(BaseModel):
    """Final output of the full pipeline."""
    output_tex: str = ""
    publication_report: PublicationReport = Field(default_factory=PublicationReport)
    reviewer_report: ReviewerReport = Field(default_factory=ReviewerReport)
    readability_report: ReadabilityReport = Field(default_factory=ReadabilityReport)
    validation_reports: list[ValidationReport] = Field(default_factory=list)
    journal_recommendations: JournalRecommendations = Field(default_factory=JournalRecommendations)
    journal_compliance: JournalCompliance | None = None
    fact_graph: FactGraph = Field(default_factory=FactGraph)
    citation_claims: list[CitationClaim] = Field(default_factory=list)
    domain_profile: DomainProfile = Field(default_factory=DomainProfile)
    output_files: dict[str, Path] = Field(default_factory=dict)
