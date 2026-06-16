"""AI detection scoring engine.

Computes a "Human Score" based on the 12-metric detection system ported from StealthHumanizer.
"""

from __future__ import annotations

import math
import re
from collections import Counter

from q1_engine.models import AIDetectionResult, DimensionScore, DetectionPreCheck
from q1_engine.utils.logging_setup import get_logger

log = get_logger("ai_detection_scorer")

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")
_WORD_SPLIT = re.compile(r"\b\w+\b")

AI_PHRASES = [
    'it is important to note', 'it is worth mentioning', 'it is worth noting',
    'in conclusion', 'in summary', 'to summarize', 'to conclude',
    'furthermore', 'moreover', 'additionally', 'in addition',
    'it is crucial', 'it is essential', 'it is imperative',
    'plays a crucial role', 'plays an important role', 'plays a pivotal role',
    'has the potential to', 'it is evident that', 'it is clear that',
    'demonstrates the', 'illustrates the', 'showcases the',
    'underscores the', 'highlights the', 'emphasizes the',
    'on the other hand', 'in terms of', 'when it comes to',
    'as previously mentioned', 'as discussed earlier', 'as noted above',
    'it should be noted', 'it must be noted', 'needless to say',
    'last but not least', 'first and foremost', 'at the end of the day',
    'in today\'s world', 'in this day and age', 'in the modern era',
    'in the contemporary landscape', 'in the current landscape',
    'a myriad of', 'delve into', 'delves into',
    'tapestry of', 'navigating the landscape',
    'multifaceted', 'robust', 'seamless', 'streamline',
    'synergy', 'paradigm', 'paradigm shift', 'holistic',
    'innovative', 'cutting-edge', 'state-of-the-art', 'groundbreaking',
    'transformative', 'comprehensive', 'unprecedented',
    'utilize', 'facilitate', 'optimize', 'leverage',
    'implement', 'foster', 'cultivate', 'empower',
    'embark on a journey', 'sheds light on', 'brings to the forefront',
]

AI_SENTENCE_STARTERS = [
    'In this article', 'This paper', 'This study', 'This research',
    'The results', 'The findings', 'The analysis', 'The data',
    'It is widely', 'It is commonly', 'There is a',
    'One of the', 'Another important', 'A key aspect',
    'The importance of', 'The significance of', 'The role of',
    'Research has shown', 'Studies have shown', 'Evidence suggests',
]

HEDGING_PHRASES = [
    'it could be argued', 'one might consider', 'it is possible that',
    'it would seem', 'this suggests that', 'this may indicate',
    'it appears that', 'this could potentially', 'one could argue',
]

QUANTIFIERS = [
    'numerous', 'various', 'multiple', 'several', 'a variety of',
    'a multitude of', 'a range of', 'a number of', 'countless',
    'a vast array of', 'a wide range of', 'a significant number of',
]

TRANSITION_WORDS = [
    'however', 'therefore', 'moreover', 'furthermore', 'additionally',
    'consequently', 'nevertheless', 'meanwhile', 'subsequently', 'thus',
    'hence', 'accordingly', 'similarly', 'likewise', 'conversely',
    'otherwise', 'instead', 'rather', 'yet', 'still', 'moreover',
]

HUMAN_INDICATORS = [
    'basically', 'actually', 'literally', 'honestly', 'like',
    'you know', 'I mean', 'kind of', 'sort of', 'pretty much',
    'I think', 'I feel like', 'I guess', 'I\'d say', 'to be honest',
    'weirdly', 'interestingly', 'funnily enough', 'surprisingly',
    'anyway', 'so yeah', 'I dunno', 'tbh', 'imo',
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
        issues = []
        score = 35.0
        lower = sentence.lower()

        ai_phrase_count = sum(1 for p in AI_PHRASES if p in lower)
        if ai_phrase_count > 0:
            issues.append(f"AI phrases: {ai_phrase_count}")
            score -= ai_phrase_count * 22

        for starter in AI_SENTENCE_STARTERS:
            if lower.startswith(starter.lower()):
                score -= 12
                issues.append("AI-like sentence opener")

        words = self._get_words(sentence)
        word_count = len(words)
        if word_count > 35:
            issues.append("Very long sentence")
            score -= 18
        if word_count > 25:
            issues.append("Long sentence")
            score -= 8
        if 2 <= word_count <= 5:
            score += 5

        if re.search(r'\b(utilize|implement|facilitate|leverage|foster|cultivate|empower)\b', sentence, re.I):
            issues.append('Formal/AI vocabulary')
            score -= 15

        if re.search(r'\b(is|are|was|were|been|being)\s+\w+ed\b', sentence, re.I):
            issues.append('Passive voice')
            score -= 8

        for h in HEDGING_PHRASES:
            if h in lower:
                issues.append('Hedging language')
                score -= 10

        for q in QUANTIFIERS:
            if q in lower:
                score -= 6

        human_signals = sum(1 for h in HUMAN_INDICATORS if h in lower)
        score += human_signals * 0.5

        if re.search(r"\b(I|me|my|we|us|our)\b", sentence, re.I):
            score += 1
        if re.search(r"\byou\b", sentence, re.I):
            score += 0.5
        if sentence.endswith('?'): score += 1
        if sentence.endswith('!'): score += 1
        if '—' in sentence or ' - ' in sentence: score += 1
        if '(' in sentence and ')' in sentence: score += 1
        if re.search(r"^(and|but|so|because|also|plus|or|well|ok|hey)\b", sentence, re.I):
            score += 1

        if 10 <= word_count <= 25 and re.search(r"[.!?]$", sentence):
            if all(re.match(r"^[\w,.!?]+$", w) for w in sentence.split()):
                issues.append("Uniform structure")
                score -= 18

        return {
            "score": max(0, min(100, score)),
            "issues": issues
        }

    def _calc_perplexity(self, text: str, words: list[str]) -> DimensionScore:
        if len(words) < 5:
            return DimensionScore(name="Perplexity", score=50.0, weight=0.15, detail="Too short")
            
        freq = Counter(words)
        max_freq = max(freq.values())
        avg_freq = len(words) / len(freq)
        uniformity = max_freq / avg_freq
        
        bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words)-1)]
        bigram_freq = Counter(bigrams)
        bigram_diversity = len(bigram_freq) / len(bigrams) if bigrams else 0
        
        score = (bigram_diversity * 60) + ((100 - uniformity * 15) * 0.4)
        score = max(0, min(100, score))
        return DimensionScore(name="Perplexity", score=score, weight=0.15, detail=f"Div:{bigram_diversity:.2f} Unif:{uniformity:.2f}")

    def _calc_burstiness(self, sentences: list[str]) -> DimensionScore:
        if len(sentences) < 3:
            return DimensionScore(name="Burstiness", score=50.0, weight=0.15, detail="Too short")
            
        lengths = [len(self._get_words(s)) for s in sentences]
        avg = sum(lengths) / len(lengths)
        variance = sum((l - avg)**2 for l in lengths) / len(lengths)
        std_dev = math.sqrt(variance)
        burstiness = (std_dev / avg) * 100 if avg > 0 else 0
        score = max(0, min(100, burstiness * 2.5))
        return DimensionScore(name="Burstiness", score=score, weight=0.15, detail=f"StdDev:{std_dev:.1f} Avg:{avg:.1f}")

    def _calc_vocab_diversity(self, words: list[str]) -> DimensionScore:
        valid_words = [w for w in words if len(w) > 2]
        if len(valid_words) < 10:
            return DimensionScore(name="Vocabulary Diversity", score=50.0, weight=0.05, detail="Too short")
            
        div = (len(set(valid_words)) / len(valid_words)) * 100
        return DimensionScore(name="Vocabulary Diversity", score=div, weight=0.05, detail=f"Div:{div:.1f}%")

    def _calc_sentence_length_variation(self, sentences: list[str]) -> DimensionScore:
        if len(sentences) < 3:
            return DimensionScore(name="Sentence Length Variation", score=50.0, weight=0.08, detail="Too short")
            
        lengths = [len(self._get_words(s)) for s in sentences]
        maximum = max(lengths)
        minimum = min(lengths)
        avg = sum(lengths) / len(lengths)
        val = ((maximum - minimum) / avg) * 60 if avg > 0 else 0
        score = max(0, min(100, val))
        return DimensionScore(name="Sentence Length Variation", score=score, weight=0.08, detail=f"Max:{maximum} Min:{minimum}")

    def _calc_transition_frequency(self, words: list[str]) -> DimensionScore:
        if len(words) < 10:
            return DimensionScore(name="Transition Frequency", score=50.0, weight=0.08, detail="Too short")
            
        count = sum(1 for w in words if w in TRANSITION_WORDS)
        score = max(0, min(100, (count / len(words)) * 1000))
        return DimensionScore(name="Transition Frequency", score=score, weight=0.08, detail=f"Count:{count}")

    def _calc_passive_voice(self, sentences: list[str]) -> DimensionScore:
        if len(sentences) < 2:
            return DimensionScore(name="Passive Voice", score=50.0, weight=0.05, detail="Too short")
            
        count = 0
        for s in sentences:
            if re.search(r"\b(is|are|was|were|been|being)\s+\w+(ed|en)\b", s, re.I):
                count += 1
        score = max(0, min(100, (count / len(sentences)) * 100))
        return DimensionScore(name="Passive Voice", score=score, weight=0.05, detail=f"Count:{count}")

    def _calc_ai_phrase_density(self, text: str, sentences: list[str]) -> DimensionScore:
        lower = text.lower()
        count = sum(1 for p in AI_PHRASES if p in lower)
        score = max(0, min(100, (count / max(len(sentences), 1)) * 20))
        return DimensionScore(name="AI Phrase Density", score=score, weight=0.12, detail=f"Count:{count}")

    def _calc_sentence_start_diversity(self, sentences: list[str]) -> DimensionScore:
        if len(sentences) < 4:
            return DimensionScore(name="Sentence Start Diversity", score=50.0, weight=0.05, detail="Too short")
            
        starters = [self._get_words(s)[0] for s in sentences if self._get_words(s)]
        if not starters:
            return DimensionScore(name="Sentence Start Diversity", score=50.0, weight=0.05, detail="No starters")
            
        score = (len(set(starters)) / len(starters)) * 100
        return DimensionScore(name="Sentence Start Diversity", score=score, weight=0.05, detail=f"Div:{score:.1f}%")

    def _calc_pronoun_usage(self, words: list[str]) -> DimensionScore:
        pronouns = {'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your'}
        count = sum(1 for w in words if w in pronouns)
        score = max(0, min(100, (count / max(len(words), 1)) * 500))
        return DimensionScore(name="Pronoun Usage", score=score, weight=0.03, detail=f"Count:{count}")

    def _calc_hedging_frequency(self, text: str) -> DimensionScore:
        lower = text.lower()
        count = sum(1 for h in HEDGING_PHRASES if h in lower)
        score = max(0, min(100, count * 15))
        return DimensionScore(name="Hedging Frequency", score=score, weight=0.03, detail=f"Count:{count}")

    def _calc_quantifier_overuse(self, lower: str) -> DimensionScore:
        count = sum(1 for q in QUANTIFIERS if q in lower)
        score = max(0, min(100, count * 10))
        return DimensionScore(name="Quantifier Overuse", score=score, weight=0.02, detail=f"Count:{count}")

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
        
        d_sa = DimensionScore(name="Sentence Avg", score=sent_avg, weight=0.25, detail="")
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
        
        # Composite score
        composite = (
            d_sa.score * d_sa.weight +
            d_p.score * d_p.weight +
            d_b.score * d_b.weight +
            d_v.score * d_v.weight +
            d_sv.score * d_sv.weight +
            (100 - d_tf.score) * d_tf.weight +
            (100 - d_pv.score) * d_pv.weight +
            (100 - d_ai.score) * d_ai.weight +
            d_ss.score * d_ss.weight +
            d_pu.score * d_pu.weight +
            (100 - d_hf.score) * d_hf.weight +
            (100 - d_qo.score) * d_qo.weight
        )
        
        return AIDetectionResult(
            human_score=round(composite, 1),
            grade=self._calculate_grade(composite),
            estimated_ai_fraction=round(100.0 - composite, 1),
            dimensions=[d_sa, d_p, d_b, d_v, d_sv, d_tf, d_pv, d_ai, d_ss, d_pu, d_hf, d_qo]
        )
