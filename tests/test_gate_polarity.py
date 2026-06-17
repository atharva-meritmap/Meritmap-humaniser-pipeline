"""Regression tests — Bug #2: Pass Gate Polarity Inversion.

Proves:
  1. human_contribution() inverts AI_RISK, passes through HUMAN_POSITIVE.
  2. needs_improvement() is correct for both polarities without the caller
     knowing which direction a metric faces.
  3. The scorer stamps every dimension with the right polarity.
  4. The composite is sum(human_contribution * weight), not sum(score * weight).
  5. Gate decisions are correct end-to-end for AI-heavy and human-clean text.
  6. A new AI_RISK metric added in future cannot silently invert.
"""
from __future__ import annotations

import pytest
from q1_engine.models import DimensionName, DimensionPolarity, DimensionScore
from q1_engine.scoring.ai_detection_scorer import AIDetectionScorer

scorer = AIDetectionScorer()

AI_RISK_DIMS = {
    DimensionName.TRANSITION_FREQUENCY,
    DimensionName.PASSIVE_VOICE,
    DimensionName.AI_PHRASE_DENSITY,
    DimensionName.HEDGING_FREQUENCY,
    DimensionName.QUANTIFIER_OVERUSE,
}

HUMAN_POSITIVE_DIMS = {
    DimensionName.SENTENCE_AVG,
    DimensionName.PERPLEXITY,
    DimensionName.BURSTINESS,
    DimensionName.VOCAB_DIVERSITY,
    DimensionName.SENTENCE_LENGTH_VAR,
    DimensionName.SENTENCE_START_DIVERSITY,
    DimensionName.PRONOUN_USAGE,
}

TEXT_AI = (
    "Furthermore, this system is robust and comprehensive. "
    "Moreover, it leverages state-of-the-art techniques to facilitate seamless integration. "
    "Additionally, the results demonstrate significant improvements. "
    "Consequently, it is important to note that this approach is transformative. "
    "Therefore, the methodology is holistic and multifaceted. "
    "Nevertheless, it is evident that further research is needed. "
    "Subsequently, one might consider the broader implications of these findings."
)

TEXT_HUMAN = (
    "We built a voice-driven form system. Short sentence. "
    "The recogniser runs locally via Vosk and hit 94% accuracy on Indian English — "
    "better than we expected given the dialect variation in our test set. "
    "Completion time dropped 65% across 200 participants. "
    "One edge case tripped us up: users who paused mid-field got timeout errors."
)

TEXT_MIXED = (
    "Furthermore, the approach achieves 94% accuracy on the test set. "
    "We ran 200 participants. Results varied. Short. "
    "Moreover, the system leverages transformer models for intent classification. "
    "The latency was 120ms on CPU-only deployment, which surprised us."
)


def _dims(text: str) -> dict[DimensionName, DimensionScore]:
    return {d.name: d for d in scorer.score(text).dimensions}


# ---------------------------------------------------------------------------
# 1. human_contribution() semantics
# ---------------------------------------------------------------------------

class TestHumanContribution:

    def test_human_positive_returns_score_unchanged(self):
        d = DimensionScore(name=DimensionName.BURSTINESS, score=75.0,
                           weight=0.15, polarity=DimensionPolarity.HUMAN_POSITIVE)
        assert d.human_contribution() == 75.0

    def test_ai_risk_returns_inverted_score(self):
        d = DimensionScore(name=DimensionName.TRANSITION_FREQUENCY, score=75.0,
                           weight=0.08, polarity=DimensionPolarity.AI_RISK)
        assert d.human_contribution() == 25.0

    def test_ai_risk_zero_raw_is_fully_human(self):
        d = DimensionScore(name=DimensionName.AI_PHRASE_DENSITY, score=0.0,
                           weight=0.12, polarity=DimensionPolarity.AI_RISK)
        assert d.human_contribution() == 100.0

    def test_ai_risk_100_raw_is_fully_ai(self):
        d = DimensionScore(name=DimensionName.AI_PHRASE_DENSITY, score=100.0,
                           weight=0.12, polarity=DimensionPolarity.AI_RISK)
        assert d.human_contribution() == 0.0


# ---------------------------------------------------------------------------
# 2. needs_improvement() gate semantics — the core regression
# ---------------------------------------------------------------------------

class TestNeedsImprovement:

    def test_human_positive_low_score_needs_work(self):
        d = DimensionScore(name=DimensionName.BURSTINESS, score=40.0,
                           weight=0.15, polarity=DimensionPolarity.HUMAN_POSITIVE)
        assert d.needs_improvement(threshold=60.0) is True

    def test_human_positive_high_score_skip(self):
        d = DimensionScore(name=DimensionName.BURSTINESS, score=80.0,
                           weight=0.15, polarity=DimensionPolarity.HUMAN_POSITIVE)
        assert d.needs_improvement(threshold=60.0) is False

    def test_ai_risk_high_raw_needs_work(self):
        # THE BUG: old code did score < 60 -> 80 < 60 = False -> wrongly skipped.
        # Correct: human_contribution = 100-80 = 20 < 60 -> needs work.
        d = DimensionScore(name=DimensionName.TRANSITION_FREQUENCY, score=80.0,
                           weight=0.08, polarity=DimensionPolarity.AI_RISK)
        assert d.needs_improvement(threshold=60.0) is True

    def test_ai_risk_low_raw_skip(self):
        # TRANSITION_FREQUENCY=10 -> human_contribution=90 -> fine
        d = DimensionScore(name=DimensionName.TRANSITION_FREQUENCY, score=10.0,
                           weight=0.08, polarity=DimensionPolarity.AI_RISK)
        assert d.needs_improvement(threshold=60.0) is False

    def test_ai_phrase_density_high_raw_needs_work(self):
        # Same inversion: old score < 60 on score=75 would return False -> skipped wrongly
        d = DimensionScore(name=DimensionName.AI_PHRASE_DENSITY, score=75.0,
                           weight=0.12, polarity=DimensionPolarity.AI_RISK)
        assert d.needs_improvement(threshold=60.0) is True


# ---------------------------------------------------------------------------
# 3. Scorer stamps correct polarity on all 12 dimensions
# ---------------------------------------------------------------------------

class TestScorerPolarity:

    def test_ai_risk_dims_stamped_correctly(self):
        dims = _dims(TEXT_AI)
        for name in AI_RISK_DIMS:
            assert dims[name].polarity == DimensionPolarity.AI_RISK, (
                f"{name} should be AI_RISK, got {dims[name].polarity}"
            )

    def test_human_positive_dims_stamped_correctly(self):
        dims = _dims(TEXT_HUMAN)
        for name in HUMAN_POSITIVE_DIMS:
            assert dims[name].polarity == DimensionPolarity.HUMAN_POSITIVE, (
                f"{name} should be HUMAN_POSITIVE, got {dims[name].polarity}"
            )

    def test_composite_equals_sum_of_human_contributions(self):
        """Composite must equal sum(human_contribution*weight) with no stray (100-score)."""
        result = scorer.score(TEXT_AI)
        expected = sum(d.human_contribution() * d.weight for d in result.dimensions)
        assert abs(result.human_score - round(expected, 1)) < 0.01, (
            f"Composite drift: reported={result.human_score}, "
            f"recalculated={round(expected, 1)}"
        )


# ---------------------------------------------------------------------------
# 4. End-to-end gate decisions
# ---------------------------------------------------------------------------

class TestGateDecisions:

    def test_ai_transitions_trigger_pass1_gate(self):
        """Text drowning in furthermore/moreover must flag TRANSITION_FREQUENCY as needing work."""
        tf = _dims(TEXT_AI)[DimensionName.TRANSITION_FREQUENCY]
        assert tf.score > 20.0, "Expected high raw TF score for AI text"
        assert tf.needs_improvement(threshold=60.0) is True

    def test_clean_text_skips_on_transitions(self):
        tf = _dims(TEXT_HUMAN)[DimensionName.TRANSITION_FREQUENCY]
        assert tf.needs_improvement(threshold=60.0) is False

    def test_ai_text_scores_below_human_text(self):
        assert scorer.score(TEXT_AI).human_score < scorer.score(TEXT_HUMAN).human_score

    def test_ai_text_grade_is_failing(self):
        assert scorer.score(TEXT_AI).grade in ("F", "D", "C")

    def test_human_text_grade_is_passing(self):
        assert scorer.score(TEXT_HUMAN).grade in ("A+", "A", "B+", "B")

    def test_mixed_score_between_ai_and_human(self):
        ai = scorer.score(TEXT_AI).human_score
        human = scorer.score(TEXT_HUMAN).human_score
        mixed = scorer.score(TEXT_MIXED).human_score
        assert ai <= mixed <= human, (
            f"Mixed({mixed}) not between AI({ai}) and human({human})"
        )


# ---------------------------------------------------------------------------
# 5. Future safety — new metrics cannot silently invert
# ---------------------------------------------------------------------------

class TestFutureSafety:

    def test_new_ai_risk_metric_gates_without_caller_inverting(self):
        """A new AI_RISK metric with high raw score triggers needs_improvement
        without the gate doing any (100-score) arithmetic itself."""
        m = DimensionScore(name=DimensionName.HEDGING_FREQUENCY,
                           score=90.0, weight=0.03,
                           polarity=DimensionPolarity.AI_RISK)
        assert m.needs_improvement(threshold=60.0) is True
        assert m.human_contribution() == 10.0

    def test_new_human_positive_metric_gates_correctly(self):
        m = DimensionScore(name=DimensionName.BURSTINESS,
                           score=90.0, weight=0.15,
                           polarity=DimensionPolarity.HUMAN_POSITIVE)
        assert m.needs_improvement(threshold=60.0) is False
        assert m.human_contribution() == 90.0
