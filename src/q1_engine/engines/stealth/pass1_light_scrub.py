"""Stealth Pass 1: Light Scrub — surgical replacement of vocabulary and transitions."""

from __future__ import annotations

from q1_engine.engines.llm_rewriter import LLMRewriter
from q1_engine.models import ContentType, DimensionName, Section, StageResult
from q1_engine.scoring.ai_detection_scorer import AIDetectionScorer
from q1_engine.utils.logging_setup import get_logger

log = get_logger("pass1")


class Pass1LightScrub:
    """Apply surgical AI marker replacement (Signals A, C, F)."""

    def __init__(self, llm: LLMRewriter) -> None:
        self._llm = llm
        self._scorer = AIDetectionScorer()

    def _block_needs_scrub(self, text: str) -> bool:
        """Return True if this block needs Pass 1 (Signal A / C / F work).

        Delegates all polarity logic to DimensionScore.needs_improvement().
        The gate never needs to know whether a metric is AI_RISK or HUMAN_POSITIVE.
        """
        result = self._scorer.score(text)
        if result.human_score >= 80.0:
            return False
        dims = {d.name: d for d in result.dimensions}
        return (
            dims[DimensionName.PERPLEXITY].needs_improvement(threshold=60.0)
            or dims[DimensionName.TRANSITION_FREQUENCY].needs_improvement(threshold=60.0)
            or dims[DimensionName.AI_PHRASE_DENSITY].needs_improvement(threshold=60.0)
        )

    async def run(self, sections: list[Section]) -> StageResult:
        """Apply Pass 1 ONLY to blocks that fail Signals A, C, or F."""
        log.info("Pass 1: Light Scrub (Vocabulary & Transitions)")
        blocks_processed = 0
        blocks_skipped = 0

        # 1. Collect failing blocks
        failing_blocks = []
        for section in sections:
            for block in section.blocks:
                if block.content_type != ContentType.TEXT:
                    continue
                text = block.rewritten_text or block.raw_latex
                if not text.strip() or len(text.split()) < 20:
                    continue

                if self._block_needs_scrub(text):
                    failing_blocks.append((block, text))
                else:
                    blocks_skipped += 1

        log.info("  %d blocks need Light Scrub, %d skipped", len(failing_blocks), blocks_skipped)

        if not failing_blocks:
            return StageResult(stage=3, stage_name="Pass 1: Light Scrub", metrics={"blocks_processed": 0.0})

        # 2. Chunk failing blocks into batches of ~1500 words
        batches = []
        current_batch = []
        current_words = 0
        for item in failing_blocks:
            words = len(item[1].split())
            if current_words + words > 1500 and current_batch:
                batches.append(current_batch)
                current_batch = []
                current_words = 0
            current_batch.append(item)
            current_words += words

        if current_batch:
            batches.append(current_batch)

        # 3. Process batches
        for batch in batches:
            input_text = "\n===BLOCK===\n".join(text for _, text in batch)

            result = await self._llm.call_with_prompt(
                "stealth_light",
                {"input_text": input_text},
                temperature=0.4, # Lower temperature for surgical edits
            )

            if result:
                rewritten_blocks = [b.strip() for b in result.split("===BLOCK===")]
                for i, (block, _) in enumerate(batch):
                    if i < len(rewritten_blocks) and rewritten_blocks[i].strip():
                        block.rewritten_text = rewritten_blocks[i]
                        blocks_processed += 1

        log.info("  %d blocks scrubbed", blocks_processed)
        return StageResult(
            stage=3,
            stage_name="Pass 1: Light Scrub",
            metrics={"blocks_processed": float(blocks_processed), "blocks_skipped": float(blocks_skipped)},
        )
