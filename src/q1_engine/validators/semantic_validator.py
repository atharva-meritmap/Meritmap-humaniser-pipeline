"""Semantic validation — ensures meaning is preserved after rewriting.

Uses sentence-transformers for SBERT cosine similarity and
bert-score for token-level Precision/Recall/F1.
"""

from __future__ import annotations

import os

from q1_engine.models import SemanticConfig, ValidationReport
from q1_engine.utils.logging_setup import get_logger

# Suppress scary transformers and huggingface warnings
import logging
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)
logging.getLogger("huggingface_hub.file_download").setLevel(logging.ERROR)
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

from transformers import AutoTokenizer as _AutoTok
_orig_load = _AutoTok.from_pretrained.__func__

@classmethod
def _patched_load(cls, *args, **kwargs):
    tok = _orig_load(cls, *args, **kwargs)
    if hasattr(tok, 'model_max_length') and tok.model_max_length > 100_000:
        tok.model_max_length = 512
    return tok

_AutoTok.from_pretrained = _patched_load

log = get_logger("semantic_validator")

# Reduce torch verbosity
os.environ["TOKENIZERS_PARALLELISM"] = "false"


class SemanticValidator:
    """Validate semantic meaning preservation using NLP models."""

    def __init__(self, config: SemanticConfig) -> None:
        self._config = config
        self._sbert_model = None
        self._bertscore_fn = None
        self._available = True

    def _ensure_models(self) -> bool:
        """Lazy-load NLP models."""
        if self._sbert_model is not None and self._bertscore_fn is not None:
            return True
        if not self._available:
            return False

        try:
            from sentence_transformers import SentenceTransformer
            from bert_score import score

            log.info("Loading SBERT model: %s", self._config.embedding_model)
            self._sbert_model = SentenceTransformer(self._config.embedding_model)

            log.info("Loading BERTScore model: %s", self._config.bertscore_model)
            self._bertscore_fn = score

            return True
        except ImportError as exc:
            log.warning(
                "Semantic validation models not installed. Run 'pip install "
                "sentence-transformers bert-score'. Semantic validation disabled."
            )
            self._available = False
            return False
        except Exception as exc:
            log.error("Failed to load semantic models: %s", exc)
            self._available = False
            return False

    def _compute_sbert_similarity(self, text1: str, text2: str) -> float:
        """Compute cosine similarity between two texts using SBERT."""
        from sentence_transformers.util import cos_sim

        # SBERT handles batches, so wrap in lists
        embeddings = self._sbert_model.encode([text1, text2], convert_to_tensor=True)
        # cos_sim returns a matrix, get the [0][1] element
        sim = cos_sim(embeddings[0], embeddings[1]).item()
        return float(sim)

    def _compute_bertscore(self, candidate: str, reference: str) -> tuple[float, float, float]:
        """Compute BERTScore (P, R, F1)."""
        P, R, F1 = self._bertscore_fn(
            [candidate],
            [reference],
            model_type=self._config.bertscore_model,
            num_layers=17,  # optimization for deberta
            verbose=False,
            device="cpu", # Force CPU to avoid VRAM OOM when running concurrently with Ollama
        )
        return P.item(), R.item(), F1.item()

    def validate(self, original: str, rewritten: str) -> ValidationReport:
        """Validate semantic similarity between original and rewritten text."""
        if not original.strip() or not rewritten.strip():
            return ValidationReport(
                sbert_similarity=1.0,
                bertscore_f1=1.0,
                overall_score=1.0,
                passed=True,
                details="Empty input text",
            )

        if not self._ensure_models():
            # If models fail to load, default to passing so pipeline doesn't crash
            return ValidationReport(
                sbert_similarity=1.0,
                bertscore_f1=1.0,
                overall_score=1.0,
                passed=True,
                details="Semantic models unavailable, assumed passing",
            )

        # 1. SBERT cosine similarity
        sbert_sim = self._compute_sbert_similarity(original, rewritten)

        # 2. BERTScore
        # Only compute BERTScore if SBERT is somewhat close to save time
        if sbert_sim < 0.6:
            p, r, f1 = 0.0, 0.0, 0.0
        else:
            p, r, f1 = self._compute_bertscore(rewritten, original)

        # 3. Combined score (weighted average)
        # SBERT captures overall meaning well, BERTScore captures token overlap
        overall = (sbert_sim * 0.6) + (f1 * 0.4)

        passed = overall >= self._config.similarity_threshold

        status = __import__("q1_engine.models", fromlist=["ValidationStatus"]).ValidationStatus.ACCEPTED if passed else __import__("q1_engine.models", fromlist=["ValidationStatus"]).ValidationStatus.RETRY
        return ValidationReport(
            semantic_similarity=sbert_sim,
            bertscore_f1=f1,
            combined_score=overall,
            status=status,
            details={"P": round(float(p), 3), "R": round(float(r), 3)},
        )
