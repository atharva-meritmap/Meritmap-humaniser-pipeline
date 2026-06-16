"""AI detection scoring engine.

Computes a "Human Score" based on the 9 specific humanization levers
derived from the StealthHumanizer and humanize-main architectures.
"""

from __future__ import annotations

import math
import re
from collections import Counter

from q1_engine.models import AIDetectionResult, DimensionScore, DetectionPreCheck
from q1_engine.utils.logging_setup import get_logger
from q1_engine.utils.patterns import detect_patterns

log = get_logger("ai_detection_scorer")

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")
_WORD_SPLIT = re.compile(r"\b\w+\b")
_TRANSITION_WORDS = frozenset([
    "furthermore", "moreover", "additionally", "however", "therefore", "thus",
    "consequently", "nevertheless", "nonetheless", "meanwhile", "subsequently",
    "accordingly", "hence", "conversely", "alternatively",
    "specifically", "notably", "importantly", "similarly", "likewise",
])

class AIDetectionScorer:
    """Computes an AI detection score based on the 9 Humanization Levers."""

    def __init__(self) -> None:
        pass

    def _get_sentences(self, text: str) -> list[str]:
        return [s.strip() for s in _SENT_SPLIT.split(text) if s.strip()]

    def _get_words(self, text: str) -> list[str]:
        return [w.lower() for w in _WORD_SPLIT.findall(text)]

    def _score_signal_a_perplexity(self, text: str, words: list[str]) -> DimensionScore:
        """SIGNAL A — PERPLEXITY (word predictability and banned words)."""
        if not words:
            return DimensionScore(name="Signal A: Perplexity", score=100.0, weight=0.20, detail="Empty text")
            
        patterns = detect_patterns(text, min_severity="should_fix")
        marker_count = sum(c for _, c in patterns)
        
        # We penalize heavily for AI marker words (delve, leverage, etc.)
        density = (marker_count / len(words)) * 1000  # markers per 1000 words
        
        if density == 0:
            score = 100.0
        elif density >= 10.0:
            score = 0.0
        else:
            score = 100.0 - (density * 10.0)
            
        return DimensionScore(
            name="Signal A: Perplexity", 
            score=round(score, 1), 
            weight=0.20, 
            detail=f"Markers: {marker_count} ({density:.1f}/1000w)"
        )

    def _score_signal_b_burstiness(self, sentences: list[str]) -> DimensionScore:
        """SIGNAL B — BURSTINESS (sentence length uniformity)."""
        if len(sentences) < 2:
            return DimensionScore(name="Signal B: Burstiness", score=100.0, weight=0.25, detail="Not enough data")
            
        lengths = [len(self._get_words(s)) for s in sentences]
        
        # Human test: At least one sentence <= 5 words AND one >= 30 words
        has_short = any(l <= 6 for l in lengths)
        has_long = any(l >= 28 for l in lengths)
        
        mean = sum(lengths) / len(lengths)
        variance = sum((L - mean) ** 2 for L in lengths) / len(lengths)
        std_dev = math.sqrt(variance)
        
        # Base score off standard deviation (humans > 8, AI ~ 3-5)
        if std_dev >= 8.0:
            score = 100.0
        elif std_dev <= 3.0:
            score = 0.0
        else:
            score = (std_dev - 3.0) / 5.0 * 100.0
            
        # Penalize if missing short/long extremes
        if not has_short: score -= 15.0
        if not has_long: score -= 10.0
        score = max(0.0, score)
            
        return DimensionScore(
            name="Signal B: Burstiness", 
            score=round(score, 1), 
            weight=0.25, 
            detail=f"StdDev: {std_dev:.1f}, Short:{has_short}, Long:{has_long}"
        )

    def _score_signal_c_hedge(self, text: str) -> DimensionScore:
        """SIGNAL C — HEDGE SURGERY (excessive/predictable hedging)."""
        if not text.strip():
            return DimensionScore(name="Signal C: Hedge Surgery", score=100.0, weight=0.10, detail="Empty text")
            
        hedges = ["it is important to note", "it is worth mentioning", "it can be argued", 
                  "in many cases", "generally speaking", "due to the fact", "prior to"]
                  
        count = sum(text.lower().count(h) for h in hedges)
        
        if count == 0:
            score = 100.0
        elif count >= 3:
            score = 0.0
        else:
            score = 100.0 - (count * 33.3)
            
        return DimensionScore(
            name="Signal C: Hedge Surgery", 
            score=round(score, 1), 
            weight=0.10, 
            detail=f"Hedges found: {count}"
        )

    def _score_signal_d_structure(self, sentences: list[str]) -> DimensionScore:
        """SIGNAL D — STRUCTURAL TELLS (repetitive grammar/openers)."""
        if len(sentences) < 3:
            return DimensionScore(name="Signal D: Structural Tells", score=100.0, weight=0.15, detail="Not enough data")
            
        starters = [self._get_words(s)[0] for s in sentences if self._get_words(s)]
        if not starters:
            return DimensionScore(name="Signal D: Structural Tells", score=100.0, weight=0.15, detail="Empty text")
            
        unique_ratio = len(set(starters)) / len(starters)
        
        if unique_ratio >= 0.7:
            score = 100.0
        elif unique_ratio <= 0.3:
            score = 0.0
        else:
            score = (unique_ratio - 0.3) / 0.4 * 100.0
            
        return DimensionScore(
            name="Signal D: Structural Tells", 
            score=round(score, 1), 
            weight=0.15, 
            detail=f"Unique Openers: {unique_ratio:.0%}"
        )

    def _score_signal_f_transitions(self, sentences: list[str]) -> DimensionScore:
        """SIGNAL F — TRANSITION FINGERPRINT (target 8-15%)."""
        if not sentences:
            return DimensionScore(name="Signal F: Transitions", score=100.0, weight=0.10, detail="Empty text")
            
        count = sum(
            1 for s in sentences
            if s.split() and s.split()[0].lower().rstrip(",") in _TRANSITION_WORDS
        )
        density = count / len(sentences)
        
        # Target is 0.08 - 0.15
        if 0.08 <= density <= 0.15:
            score = 100.0
        elif density < 0.08:
            score = max(0.0, 100.0 - ((0.08 - density) * 500))
        else:
            score = max(0.0, 100.0 - ((density - 0.15) * 300))
            
        return DimensionScore(
            name="Signal F: Transitions", 
            score=round(score, 1), 
            weight=0.10, 
            detail=f"Density: {density:.1%}"
        )

    def _score_signal_g_punctuation(self, text: str, word_count: int) -> DimensionScore:
        """SIGNAL G — PUNCTUATION FINGERPRINT (em-dash max 1/300w, semicolons)."""
        if word_count == 0:
            return DimensionScore(name="Signal G: Punctuation", score=100.0, weight=0.10, detail="Empty text")
            
        em_dash_count = text.count("—") + text.count("--")
        semicolon_count = text.count(";")
        
        max_em_dashes = max(1, word_count // 300)
        
        penalty = 0.0
        if em_dash_count > max_em_dashes:
            penalty += (em_dash_count - max_em_dashes) * 20.0
            
        # Semicolons are generally penalized unless sparse
        if semicolon_count > max(1, word_count // 200):
            penalty += (semicolon_count - 1) * 15.0
            
        score = max(0.0, 100.0 - penalty)
        
        return DimensionScore(
            name="Signal G: Punctuation", 
            score=round(score, 1), 
            weight=0.10, 
            detail=f"Dashes: {em_dash_count}, Semicolons: {semicolon_count}"
        )

    def _score_signal_h_rlhf(self, text: str) -> DimensionScore:
        """SIGNAL H — RLHF VOICE (helpful assistant register)."""
        if not text:
            return DimensionScore(name="Signal H: RLHF Voice", score=100.0, weight=0.10, detail="Empty text")
            
        rlhf_markers = [
            "here is how", "there are several", "it is clear that", "this highlights",
            "this underscores", "in conclusion", "to summarize", "important caveats"
        ]
        count = sum(text.lower().count(m) for m in rlhf_markers)
        
        if count == 0:
            score = 100.0
        elif count >= 3:
            score = 0.0
        else:
            score = 100.0 - (count * 33.3)
            
        return DimensionScore(
            name="Signal H: RLHF Voice", 
            score=round(score, 1), 
            weight=0.10, 
            detail=f"Markers: {count}"
        )

    def _calculate_grade(self, score: float) -> str:
        if score >= 95: return "A+"
        if score >= 88: return "A"
        if score >= 80: return "B+"
        if score >= 72: return "B"
        if score >= 60: return "C"
        if score >= 45: return "D"
        return "F"

    def detection_precheck(self, text: str) -> DetectionPreCheck:
        """Run rapid detection pre-check to decide which Pass to trigger."""
        sentences = self._get_sentences(text)
        words = self._get_words(text)
        
        # Compute basic signals
        perp = self._score_signal_a_perplexity(text, words)
        burst = self._score_signal_b_burstiness(sentences)
        
        lengths = [len(self._get_words(s)) for s in sentences]
        sent_std = math.sqrt(sum((l - (sum(lengths)/max(len(lengths),1)))**2 for l in lengths)/max(len(lengths),1)) if lengths else 0.0
        
        # Check transition density
        count = sum(1 for s in sentences if s.split() and s.split()[0].lower().rstrip(",") in _TRANSITION_WORDS)
        trans_density = count / max(len(sentences), 1)

        markers = sum(c for _, c in detect_patterns(text, min_severity="must_fix"))

        if markers > 5 or burst.score < 40:
            risk = "high"
        elif markers > 0 or burst.score < 60:
            risk = "medium"
        else:
            risk = "low"

        return DetectionPreCheck(
            perplexity_mean=perp.score,
            perplexity_variance=burst.score,
            burstiness_score=burst.score,
            ai_markers_found=markers,
            sentence_length_std=round(sent_std, 1),
            paragraph_length_std=0.0,
            transition_density=round(trans_density, 3),
            estimated_detection_risk=risk,
        )

    def score(self, text: str) -> AIDetectionResult:
        """Compute the full 9-Lever AI detection suite on a text string."""
        if not text.strip():
            return AIDetectionResult()
            
        sentences = self._get_sentences(text)
        words = self._get_words(text)
        
        s_a = self._score_signal_a_perplexity(text, words)
        s_b = self._score_signal_b_burstiness(sentences)
        s_c = self._score_signal_c_hedge(text)
        s_d = self._score_signal_d_structure(sentences)
        s_f = self._score_signal_f_transitions(sentences)
        s_g = self._score_signal_g_punctuation(text, len(words))
        s_h = self._score_signal_h_rlhf(text)
        
        # Composite score
        composite = (
            s_a.score * s_a.weight +
            s_b.score * s_b.weight +
            s_c.score * s_c.weight +
            s_d.score * s_d.weight +
            s_f.score * s_f.weight +
            s_g.score * s_g.weight +
            s_h.score * s_h.weight
        )
        
        return AIDetectionResult(
            human_score=round(composite, 1),
            grade=self._calculate_grade(composite),
            estimated_ai_fraction=round(100.0 - composite, 1),
            dimensions=[s_a, s_b, s_c, s_d, s_f, s_g, s_h]
        )
