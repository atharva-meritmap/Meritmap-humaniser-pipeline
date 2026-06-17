"""AI detection scoring engine.

Computes a "Human Score" based on the 12-metric detection system ported from StealthHumanizer.
"""

from __future__ import annotations

import math
import re
from collections import Counter

from q1_engine.models import (
    AIDetectionResult,
    DimensionName,
    DimensionPolarity,
    DimensionScore,
    DetectionPreCheck,
)
from q1_engine.utils.logging_setup import get_logger

log = get_logger("ai_detection_scorer")

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")
_WORD_SPLIT = re.compile(r"\b\w+\b")

# ---------------------------------------------------------------------------
# Phrase lists — two tiers based on empirical likelihood ratio
# ---------------------------------------------------------------------------

# Tier 1: AI-exclusive clichés.
# These phrases are near-absent in human academic writing and highly diagnostic
# of LLM output. Penalised heavily in the sentence scorer.
_AI_CLICHES: list[str] = [
    'it is important to note', 'it is worth mentioning', 'it is worth noting',
    'it is crucial to note', 'it is essential to note',
    'in conclusion', 'in summary', 'to summarize', 'to conclude',
    'it is crucial', 'it is essential', 'it is imperative',
    'plays a crucial role', 'plays an important role', 'plays a pivotal role',
    'has the potential to', 'it is evident that', 'it is clear that',
    'it showcases', 'underscores the importance', 'highlights the importance',
    'as previously mentioned', 'as discussed earlier', 'as noted above',
    'it should be noted', 'it must be noted', 'needless to say',
    'last but not least', 'first and foremost', 'at the end of the day',
    'in today\'s world', 'in this day and age', 'in the modern era',
    'in the contemporary landscape', 'in the current landscape',
    'a myriad of', 'delve into', 'delves into', 'delved into',
    'tapestry of', 'navigating the landscape',
    'multifaceted', 'seamless', 'synergy', 'paradigm shift', 'holistic',
    'groundbreaking', 'transformative', 'unprecedented',
    'leverage', 'foster', 'cultivate', 'empower',
    'embark on a journey', 'sheds light on', 'brings to the forefront',
    'in the realm of', 'it is worth noting that',
]

# Tier 2: Domain-neutral verbs.
# These appear with comparable frequency in both human academic writing and
# AI-generated text. They are NOT diagnostic at the sentence level and must
# NOT be penalised here. Stage 2 (fingerprint scrub) handles them at the
# document level using context-aware regex replacements.
_DOMAIN_NEUTRAL_VERBS: frozenset[str] = frozenset([
    'implement', 'implements', 'implemented', 'implementing',
    'facilitate', 'facilitates', 'facilitated', 'facilitating',
    'optimize', 'optimizes', 'optimized', 'optimizing',
    'integrate', 'integrates', 'integrated', 'integrating',
    'evaluate', 'evaluates', 'evaluated', 'evaluating',
    'utilize', 'utilizes', 'utilized', 'utilizing',
    'comprehensive', 'robust', 'innovative', 'cutting-edge',
    'state-of-the-art', 'streamline', 'demonstrate',
])

# Kept for the document-level AI_PHRASE_DENSITY dimension (not sentence scorer)
AI_PHRASES: list[str] = _AI_CLICHES

# AI sentence starters — only patterns that are truly AI-exclusive.
# Removed: 'This paper', 'This study', 'The results', 'The data',
# 'The analysis', 'The findings' — all are routine in human academic writing.
_AI_SENTENCE_STARTERS: list[str] = [
    'It is widely accepted', 'It is commonly believed',
    'It is widely known', 'It is commonly understood',
    'Needless to say', 'It goes without saying',
    'In today\'s rapidly', 'In the ever-evolving',
]

# Keep the old name for backward compatibility in other modules
AI_SENTENCE_STARTERS = _AI_SENTENCE_STARTERS

HEDGING_PHRASES = [
    'it could be argued', 'one might consider', 'it is possible that',
    'it would seem', 'this may indicate',
    'it appears that', 'this could potentially', 'one could argue',
]

QUANTIFIERS = [
    'a myriad of', 'a multitude of', 'a vast array of',
    'a wide range of', 'countless', 'a significant number of',
]

TRANSITION_WORDS = [
    'however', 'therefore', 'moreover', 'furthermore', 'additionally',
    'consequently', 'nevertheless', 'meanwhile', 'subsequently', 'thus',
    'hence', 'accordingly', 'similarly', 'likewise', 'conversely',
    'otherwise', 'instead', 'rather', 'yet', 'still',
]

HUMAN_INDICATORS = [
    'basically', 'actually', 'honestly',
    'I mean', 'kind of', 'sort of', 'pretty much',
    'I think', 'I feel like', 'I guess', 'I\'d say', 'to be honest',
    'weirdly', 'interestingly', 'funnily enough', 'surprisingly',
    'anyway', 'tbh', 'imo',
]

class AIDetectionScorer:
    """Computes an AI detection score based on the 12-metric StealthHumanizer Engine."""

    def __init__(self) -> None:
        pass

    def _get_sentences(self, text: str) -> list[str]:
        return [s.strip() for s in _SENT_SPLIT.split(text) if s.strip()]

    def _get_words(self, text: str) -> list[str]:
        return [w.lower() for w in _WORD_SPLIT.findall(text)]

    def _analyze_sentence(self, sentence: str) -> dict:
        """Score a single sentence on the human-writing scale (0=AI, 100=human).

        Design principles:
        - Baseline 70: a plain academic sentence with no markers is above neutral.
          Research papers are mostly clean prose interrupted by occasional AI clichés.
        - Per-category caps: no single category can collapse a sentence to 0.
          Prevents compounding false positives from dominating the average.
        - Only Tier-1 clichés (AI-exclusive) penalised here. Domain-neutral verbs
          (implement, facilitate, optimize) are NOT penalised — they have near-equal
          frequency in human CS writing and LLM output, making them non-diagnostic
          at sentence level.
        - Passive voice NOT penalised: ~25-40% of sentences in published CS papers
          use passive constructions (methods sections in particular). Penalising it
          would systematically bias against the most common academic register.
        - Length penalty: only for genuinely excessive sentences (>50 words).
          Academic sentences average 22-28 words; penalising >25 would punish normal.
        """
        issues = []
        lower = sentence.lower()
        words = self._get_words(sentence)
        word_count = len(words)

        # --- Baseline: a neutral academic sentence starts at 70 ---
        score = 70.0

        # --- Tier-1 AI cliché penalty (cap: -30 max) ---
        cliche_hits = sum(1 for p in _AI_CLICHES if p in lower)
        if cliche_hits:
            penalty = min(cliche_hits * 18, 30)
            score -= penalty
            issues.append(f"AI clichés:{cliche_hits}")

        # --- AI-exclusive sentence starters (cap: -15 max) ---
        starter_hit = any(lower.startswith(s.lower()) for s in _AI_SENTENCE_STARTERS)
        if starter_hit:
            score -= 15
            issues.append("AI opener")

        # --- Excessive hedging (cap: -10 max) ---
        hedge_hits = sum(1 for h in HEDGING_PHRASES if h in lower)
        if hedge_hits:
            penalty = min(hedge_hits * 8, 10)
            score -= penalty
            issues.append(f"hedging:{hedge_hits}")

        # --- Vague quantifiers (cap: -8 max) ---
        quant_hits = sum(1 for q in QUANTIFIERS if q in lower)
        if quant_hits:
            penalty = min(quant_hits * 5, 8)
            score -= penalty
            issues.append(f"quantifiers:{quant_hits}")

        # --- Sentence length: only penalise genuinely excessive sentences ---
        # Academic CS papers average 22-28 words/sentence (Swales & Feak 2012).
        # A 50-word sentence is two standard deviations above that mean.
        if word_count > 60:
            score -= 10
            issues.append("excessive length")
        elif word_count > 50:
            score -= 5
            issues.append("very long")

        # --- Positive signals ---
        # First-person plural is a strong human-writing signal in CS papers
        if re.search(r"\b(we|us|our)\b", sentence, re.I):
            score += 4
        # Parenthetical asides indicate natural authorial voice
        if '(' in sentence and ')' in sentence:
            score += 3
        # Em-dashes and inline dashes signal prose rhythm
        if '—' in sentence or ' - ' in sentence:
            score += 2
        # Conjunctive sentence openers (informal but common in good writing)
        if re.search(r"^(and|but|so|because|also|or|yet)\b", sentence, re.I):
            score += 3
        # Short punchy sentences are distinctly human
        if 3 <= word_count <= 7:
            score += 5
        # Questions indicate engagement
        if sentence.endswith('?'):
            score += 3

        return {
            "score": max(0.0, min(100.0, score)),
            "issues": issues,
        }

    def _calc_perplexity(self, text: str, words: list[str]) -> DimensionScore:
        if len(words) < 5:
            return DimensionScore(name=DimensionName.PERPLEXITY, score=50.0, weight=0.15,
                                  polarity=DimensionPolarity.HUMAN_POSITIVE, detail="Too short")
        freq = Counter(words)
        max_freq = max(freq.values())
        avg_freq = len(words) / len(freq)
        uniformity = max_freq / avg_freq
        bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words)-1)]
        bigram_freq = Counter(bigrams)
        bigram_diversity = len(bigram_freq) / len(bigrams) if bigrams else 0
        score = (bigram_diversity * 60) + ((100 - uniformity * 15) * 0.4)
        score = max(0, min(100, score))
        return DimensionScore(name=DimensionName.PERPLEXITY, score=score, weight=0.15,
                              polarity=DimensionPolarity.HUMAN_POSITIVE,
                              detail=f"Div:{bigram_diversity:.2f} Unif:{uniformity:.2f}")

    def _calc_burstiness(self, sentences: list[str]) -> DimensionScore:
        if len(sentences) < 3:
            return DimensionScore(name=DimensionName.BURSTINESS, score=50.0, weight=0.15,
                                  polarity=DimensionPolarity.HUMAN_POSITIVE, detail="Too short")
        lengths = [len(self._get_words(s)) for s in sentences]
        avg = sum(lengths) / len(lengths)
        variance = sum((l - avg)**2 for l in lengths) / len(lengths)
        std_dev = math.sqrt(variance)
        burstiness = (std_dev / avg) * 100 if avg > 0 else 0
        score = max(0, min(100, burstiness * 2.5))
        return DimensionScore(name=DimensionName.BURSTINESS, score=score, weight=0.15,
                              polarity=DimensionPolarity.HUMAN_POSITIVE,
                              detail=f"StdDev:{std_dev:.1f} Avg:{avg:.1f}")

    def _calc_vocab_diversity(self, words: list[str]) -> DimensionScore:
        valid_words = [w for w in words if len(w) > 2]
        if len(valid_words) < 10:
            return DimensionScore(name=DimensionName.VOCAB_DIVERSITY, score=50.0, weight=0.05,
                                  polarity=DimensionPolarity.HUMAN_POSITIVE, detail="Too short")
        div = (len(set(valid_words)) / len(valid_words)) * 100
        return DimensionScore(name=DimensionName.VOCAB_DIVERSITY, score=div, weight=0.05,
                              polarity=DimensionPolarity.HUMAN_POSITIVE, detail=f"Div:{div:.1f}%")

    def _calc_sentence_length_variation(self, sentences: list[str]) -> DimensionScore:
        if len(sentences) < 3:
            return DimensionScore(name=DimensionName.SENTENCE_LENGTH_VAR, score=50.0, weight=0.08,
                                  polarity=DimensionPolarity.HUMAN_POSITIVE, detail="Too short")
        lengths = [len(self._get_words(s)) for s in sentences]
        maximum = max(lengths)
        minimum = min(lengths)
        avg = sum(lengths) / len(lengths)
        val = ((maximum - minimum) / avg) * 60 if avg > 0 else 0
        score = max(0, min(100, val))
        return DimensionScore(name=DimensionName.SENTENCE_LENGTH_VAR, score=score, weight=0.08,
                              polarity=DimensionPolarity.HUMAN_POSITIVE,
                              detail=f"Max:{maximum} Min:{minimum}")

    def _calc_transition_frequency(self, words: list[str]) -> DimensionScore:
        """Higher raw score = more AI-marker transitions. Polarity=AI_RISK."""
        if len(words) < 10:
            return DimensionScore(name=DimensionName.TRANSITION_FREQUENCY, score=50.0, weight=0.08,
                                  polarity=DimensionPolarity.AI_RISK, detail="Too short")
        count = sum(1 for w in words if w in TRANSITION_WORDS)
        score = max(0, min(100, (count / len(words)) * 1000))
        return DimensionScore(name=DimensionName.TRANSITION_FREQUENCY, score=score, weight=0.08,
                              polarity=DimensionPolarity.AI_RISK, detail=f"Count:{count}")

    def _calc_passive_voice(self, sentences: list[str]) -> DimensionScore:
        """Higher raw score = more passive constructions. Polarity=AI_RISK."""
        if len(sentences) < 2:
            return DimensionScore(name=DimensionName.PASSIVE_VOICE, score=50.0, weight=0.05,
                                  polarity=DimensionPolarity.AI_RISK, detail="Too short")
        count = sum(
            1 for s in sentences
            if re.search(r"\b(is|are|was|were|been|being)\s+\w+(ed|en)\b", s, re.I)
        )
        score = max(0, min(100, (count / len(sentences)) * 100))
        return DimensionScore(name=DimensionName.PASSIVE_VOICE, score=score, weight=0.05,
                              polarity=DimensionPolarity.AI_RISK, detail=f"Count:{count}")

    def _calc_ai_phrase_density(self, text: str, sentences: list[str]) -> DimensionScore:
        """Higher raw score = denser AI-marker phrases. Polarity=AI_RISK."""
        lower = text.lower()
        count = sum(1 for p in AI_PHRASES if p in lower)
        score = max(0, min(100, (count / max(len(sentences), 1)) * 20))
        return DimensionScore(name=DimensionName.AI_PHRASE_DENSITY, score=score, weight=0.12,
                              polarity=DimensionPolarity.AI_RISK, detail=f"Count:{count}")

    def _calc_sentence_start_diversity(self, sentences: list[str]) -> DimensionScore:
        if len(sentences) < 4:
            return DimensionScore(name=DimensionName.SENTENCE_START_DIVERSITY, score=50.0, weight=0.05,
                                  polarity=DimensionPolarity.HUMAN_POSITIVE, detail="Too short")
        starters = [self._get_words(s)[0] for s in sentences if self._get_words(s)]
        if not starters:
            return DimensionScore(name=DimensionName.SENTENCE_START_DIVERSITY, score=50.0, weight=0.05,
                                  polarity=DimensionPolarity.HUMAN_POSITIVE, detail="No starters")
        score = (len(set(starters)) / len(starters)) * 100
        return DimensionScore(name=DimensionName.SENTENCE_START_DIVERSITY, score=score, weight=0.05,
                              polarity=DimensionPolarity.HUMAN_POSITIVE, detail=f"Div:{score:.1f}%")

    def _calc_pronoun_usage(self, words: list[str]) -> DimensionScore:
        pronouns = {'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your'}
        count = sum(1 for w in words if w in pronouns)
        score = max(0, min(100, (count / max(len(words), 1)) * 500))
        return DimensionScore(name=DimensionName.PRONOUN_USAGE, score=score, weight=0.03,
                              polarity=DimensionPolarity.HUMAN_POSITIVE, detail=f"Count:{count}")

    def _calc_hedging_frequency(self, text: str) -> DimensionScore:
        """Higher raw score = more over-hedging. Polarity=AI_RISK."""
        lower = text.lower()
        count = sum(1 for h in HEDGING_PHRASES if h in lower)
        score = max(0, min(100, count * 15))
        return DimensionScore(name=DimensionName.HEDGING_FREQUENCY, score=score, weight=0.03,
                              polarity=DimensionPolarity.AI_RISK, detail=f"Count:{count}")

    def _calc_quantifier_overuse(self, lower: str) -> DimensionScore:
        """Higher raw score = more vague quantifiers. Polarity=AI_RISK."""
        count = sum(1 for q in QUANTIFIERS if q in lower)
        score = max(0, min(100, count * 10))
        return DimensionScore(name=DimensionName.QUANTIFIER_OVERUSE, score=score, weight=0.02,
                              polarity=DimensionPolarity.AI_RISK, detail=f"Count:{count}")

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
        
        perp = self._calc_perplexity(text, words)
        burst = self._calc_burstiness(sentences)
        
        lengths = [len(self._get_words(s)) for s in sentences]
        sent_std = math.sqrt(sum((l - (sum(lengths)/max(len(lengths),1)))**2 for l in lengths)/max(len(lengths),1)) if lengths else 0.0
        
        count = sum(1 for s in sentences if self._get_words(s) and self._get_words(s)[0] in TRANSITION_WORDS)
        trans_density = count / max(len(sentences), 1)

        ai_density = self._calc_ai_phrase_density(text, sentences)

        if ai_density.score > 30 or burst.score < 40:
            risk = "high"
        elif ai_density.score > 10 or burst.score < 60:
            risk = "medium"
        else:
            risk = "low"

        return DetectionPreCheck(
            perplexity_mean=perp.score,
            perplexity_variance=burst.score,
            burstiness_score=burst.score,
            ai_markers_found=int(ai_density.detail.split(":")[1]),
            sentence_length_std=round(sent_std, 1),
            paragraph_length_std=0.0,
            transition_density=round(trans_density, 3),
            estimated_detection_risk=risk,
        )

    def score(self, text: str) -> AIDetectionResult:
        """Compute the full 12-metric AI detection suite on a text string."""
        if not text.strip():
            return AIDetectionResult()
            
        sentences = self._get_sentences(text)
        words = self._get_words(text)
        lower = text.lower()
        
        sent_results = [self._analyze_sentence(s) for s in sentences]
        sent_avg = sum(r['score'] for r in sent_results) / len(sent_results) if sent_results else 50.0
        
        d_sa = DimensionScore(name=DimensionName.SENTENCE_AVG, score=sent_avg, weight=0.25,
                              polarity=DimensionPolarity.HUMAN_POSITIVE, detail="")
        d_p = self._calc_perplexity(text, words)
        d_b = self._calc_burstiness(sentences)
        d_v = self._calc_vocab_diversity(words)
        d_sv = self._calc_sentence_length_variation(sentences)
        d_tf = self._calc_transition_frequency(words)
        d_pv = self._calc_passive_voice(sentences)
        d_ai = self._calc_ai_phrase_density(text, sentences)
        d_ss = self._calc_sentence_start_diversity(sentences)
        d_pu = self._calc_pronoun_usage(words)
        d_hf = self._calc_hedging_frequency(text)
        d_qo = self._calc_quantifier_overuse(lower)

        dimensions = [d_sa, d_p, d_b, d_v, d_sv, d_tf, d_pv, d_ai, d_ss, d_pu, d_hf, d_qo]

        # Each dimension's human_contribution() handles polarity internally.
        # No (100 - score) expressions here — inversion lives on the object.
        composite = sum(d.human_contribution() * d.weight for d in dimensions)
        
        return AIDetectionResult(
            human_score=round(composite, 1),
            grade=self._calculate_grade(composite),
            estimated_ai_fraction=round(100.0 - composite, 1),
            dimensions=dimensions,
        )
