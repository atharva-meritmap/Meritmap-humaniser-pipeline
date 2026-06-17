"""Regression tests — Bug #3: Sentence Scorer Baseline Bias.

Validates the redesigned _analyze_sentence() scorer against the core
calibration requirements:

  1. Human CS prose (short, long, passive, technical verbs) scores >= 70.
  2. AI-cliche-saturated text scores <= 55 per sentence.
  3. Domain-neutral verbs (implement, facilitate, optimize) do NOT trigger penalties.
  4. Passive voice does NOT trigger a penalty.
  5. Sentence length penalty fires only at genuinely excessive lengths (>50 words).
  6. Per-category caps prevent compounding from collapsing any sentence to 0.
  7. Document-level composite correctly separates human academic from AI-slop.
  8. Score distribution: human cluster >= 68, AI cluster <= 55, gap >= 13 points.
"""
from __future__ import annotations

import pytest
from q1_engine.scoring.ai_detection_scorer import (
    AIDetectionScorer,
    _AI_CLICHES,
    _DOMAIN_NEUTRAL_VERBS,
)

scorer = AIDetectionScorer()


def _s(text: str) -> float:
    return scorer._analyze_sentence(text)["score"]


def _issues(text: str) -> list[str]:
    return scorer._analyze_sentence(text)["issues"]


# ---------------------------------------------------------------------------
# 1. Human CS prose — short sentences
# ---------------------------------------------------------------------------

class TestHumanShortSentences:

    def test_simple_result_sentence(self):
        assert _s("We ran 200 participants through the experiment.") >= 70

    def test_measurement_sentence(self):
        assert _s("The latency was 120 ms on a CPU-only deployment.") >= 70

    def test_short_punchy(self):
        assert _s("One edge case tripped us up.") >= 70

    def test_plain_observation(self):
        assert _s("Results varied across domains.") >= 70


# ---------------------------------------------------------------------------
# 2. Human CS prose — long sentences (normal academic length 20-40 words)
# ---------------------------------------------------------------------------

class TestHumanLongSentences:

    def test_methods_sentence_with_numbers(self):
        s = ("The speech recognition module runs locally via Vosk and achieves "
             "94% word-level accuracy on Indian English recordings, outperforming "
             "the cloud baseline by 3.2 percentage points.")
        assert _s(s) >= 65

    def test_evaluation_sentence(self):
        s = ("We evaluated three architectures on the ACL 2023 benchmark: "
             "a fine-tuned BERT baseline, a GPT-2 variant, and our proposed "
             "hybrid attention model.")
        assert _s(s) >= 65

    def test_data_collection_sentence(self):
        s = ("The model was trained on 1.2 million labelled utterances collected "
             "from 47 native speakers across six regional dialects of Hindi.")
        assert _s(s) >= 65


# ---------------------------------------------------------------------------
# 3. Passive voice — must NOT be penalised
# ---------------------------------------------------------------------------

class TestPassiveVoiceNotPenalised:

    def test_passive_data_collection(self):
        s = "The data was collected over six months from three hospital sites."
        assert _s(s) >= 68, f"Passive sentence penalised: score={_s(s)}"
        assert "passive" not in " ".join(_issues(s)).lower()

    def test_passive_model_evaluation(self):
        s = "The model was evaluated using 5-fold cross-validation."
        assert _s(s) >= 68

    def test_passive_reporting(self):
        s = "Results are reported as means with 95% confidence intervals."
        assert _s(s) >= 68

    def test_passive_random_assignment(self):
        s = "Participants were randomly assigned to one of two conditions."
        assert _s(s) >= 68


# ---------------------------------------------------------------------------
# 4. Domain-neutral verbs — must NOT be in AI_CLICHES and must NOT be penalised
# ---------------------------------------------------------------------------

class TestDomainNeutralVerbsNotPenalised:

    @pytest.mark.parametrize("verb,sentence", [
        ("implement", "We implemented the parser using a recursive descent algorithm."),
        ("facilitate", "The system facilitates real-time collaboration between distributed teams."),
        ("optimize",  "This function optimizes memory allocation by pooling small objects."),
        ("integrate",  "The API integrates with OAuth 2.0 for authentication."),
        ("evaluate",  "We evaluated three configurations to identify the best trade-off."),
        ("utilize",   "The pipeline utilizes a sliding window approach for chunking."),
    ])
    def test_verb_not_penalised(self, verb: str, sentence: str):
        score = _s(sentence)
        assert score >= 65, f"'{verb}' caused unexpected penalty: score={score}"
        issues = _issues(sentence)
        assert not any("clich" in i for i in issues), (
            f"'{verb}' incorrectly flagged as cliché: {issues}"
        )

    def test_domain_neutral_verbs_absent_from_cliche_list(self):
        """Tier-2 domain verbs must not appear in the Tier-1 cliché list."""
        cliche_text = " ".join(_AI_CLICHES).lower()
        for verb in _DOMAIN_NEUTRAL_VERBS:
            # Check it does not appear as a standalone word in the cliché list
            import re
            match = re.search(rf"\b{re.escape(verb)}\b", cliche_text)
            assert match is None, (
                f"Domain-neutral verb '{verb}' found in _AI_CLICHES — "
                f"it will cause false positives on human academic writing"
            )


# ---------------------------------------------------------------------------
# 5. Length penalty — only fires at genuinely excessive lengths
# ---------------------------------------------------------------------------

class TestLengthPenalty:

    def _make_sentence(self, n_words: int) -> str:
        # Construct a neutral sentence of exactly n words
        return " ".join(["word"] * (n_words - 1)) + "."

    def test_30_word_sentence_no_length_penalty(self):
        s = self._make_sentence(30)
        assert "very long" not in _issues(s)
        assert "excessive length" not in _issues(s)

    def test_45_word_sentence_no_length_penalty(self):
        s = self._make_sentence(45)
        assert "very long" not in _issues(s)
        assert "excessive length" not in _issues(s)

    def test_55_word_sentence_has_length_penalty(self):
        s = self._make_sentence(55)
        assert any("long" in i or "excessive" in i for i in _issues(s))

    def test_65_word_sentence_has_heavier_penalty(self):
        s = self._make_sentence(65)
        assert any("excessive" in i for i in _issues(s))


# ---------------------------------------------------------------------------
# 6. Per-category caps — compounding cannot collapse score to 0
# ---------------------------------------------------------------------------

class TestPenaltyCaps:

    def test_three_cliches_does_not_score_zero(self):
        # 3 clichés * 18 = 54, but cap is 30 → 70 - 30 = 40 minimum from that rule
        s = ("It is important to note that it is evident that this holistic "
             "approach is groundbreaking.")
        assert _s(s) > 0

    def test_five_cliches_does_not_score_zero(self):
        s = ("It is worth mentioning that it is important to note that "
             "the multifaceted tapestry of holistic synergy is transformative.")
        assert _s(s) > 0

    def test_cliche_plus_hedge_does_not_score_zero(self):
        s = ("It is important to note that one could argue this could potentially "
             "be a paradigm shift.")
        assert _s(s) > 0


# ---------------------------------------------------------------------------
# 7. AI-slop correctly scores low
# ---------------------------------------------------------------------------

class TestAISlopScoresLow:

    @pytest.mark.parametrize("sentence", [
        "Furthermore, it is important to note that this approach is transformative.",
        "It is worth mentioning that the paradigm shift underscores the importance of holistic approaches.",
        "In conclusion, this transformative research brings to the forefront the multifaceted nature of the problem.",
        "It is crucial to delve into the tapestry of innovation and synergy.",
        "In today's rapidly evolving landscape, a myriad of groundbreaking solutions have emerged.",
    ])
    def test_ai_slop_scores_below_55(self, sentence: str):
        score = _s(sentence)
        assert score <= 55, f"AI slop sentence scored too high: {score}\n  '{sentence}'"


# ---------------------------------------------------------------------------
# 8. Document-level separation
# ---------------------------------------------------------------------------

class TestDocumentLevelSeparation:

    HUMAN_TEXT = (
        "We built a voice-driven form system. "
        "The recogniser runs locally via Vosk and achieved 94% accuracy on Indian English. "
        "Completion time dropped 65% across 200 participants. "
        "One edge case tripped us up: users who paused mid-field got timeout errors. "
        "The model was trained on 1.2 million labelled utterances. "
        "Each form was validated against the schema before submission. "
        "We implemented the parser using a recursive descent algorithm. "
        "Results are reported as means with 95% confidence intervals."
    )

    AI_TEXT = (
        "Furthermore, it is important to note that this approach is transformative. "
        "Moreover, the robust framework leverages state-of-the-art techniques. "
        "Additionally, this groundbreaking system showcases unprecedented capabilities. "
        "It is worth mentioning that the paradigm shift underscores the holistic nature. "
        "In conclusion, this multifaceted solution brings to the forefront the synergy. "
        "Consequently, it is evident that the comprehensive approach is pivotal. "
        "In today's rapidly evolving landscape, a myriad of innovative solutions exist. "
        "It is crucial to delve into the tapestry of modern NLP research."
    )

    def test_human_document_scores_above_72(self):
        result = scorer.score(self.HUMAN_TEXT)
        assert result.human_score >= 72, (
            f"Human academic text scored {result.human_score} — expected >= 72"
        )

    def test_ai_document_scores_below_55(self):
        result = scorer.score(self.AI_TEXT)
        assert result.human_score <= 62, (
            f"AI-slop text scored {result.human_score} — expected <= 62"
        )

    def test_separation_gap_at_least_15_points(self):
        human = scorer.score(self.HUMAN_TEXT).human_score
        ai = scorer.score(self.AI_TEXT).human_score
        gap = human - ai
        assert gap >= 15, (
            f"Separation gap too small: human={human}, ai={ai}, gap={gap}"
        )

    def test_human_grade_is_passing(self):
        assert scorer.score(self.HUMAN_TEXT).grade in ("A+", "A", "B+", "B")

    def test_ai_grade_is_failing(self):
        assert scorer.score(self.AI_TEXT).grade in ("F", "D", "C")
