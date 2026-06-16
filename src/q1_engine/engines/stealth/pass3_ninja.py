"""Stealth Pass 3: Ninja Scrub — Full 9-Lever Rewrite."""

from __future__ import annotations

from q1_engine.engines.llm_rewriter import LLMRewriter
from q1_engine.models import ContentType, Section, StageResult
from q1_engine.scoring.ai_detection_scorer import AIDetectionScorer
from q1_engine.utils.logging_setup import get_logger

log = get_logger("pass3")


class Pass3Ninja:
    """Apply Full 9-Lever Antigravity Humanize Prompt."""

    def __init__(self, llm: LLMRewriter) -> None:
        self._llm = llm
        self._scorer = AIDetectionScorer()

    def _block_needs_ninja(self, text: str) -> bool:
        """Check if block needs Pass 3 (Score still < 80 after Medium Pass)."""
        result = self._scorer.score(text)
        return result.human_score < 80.0

    async def run(self, sections: list[Section]) -> StageResult:
        """Apply Pass 3 ONLY to blocks that still fail after Pass 2."""
        log.info("Pass 3: Ninja Scrub (Full 9-Lever Rewrite)")
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

                if self._block_needs_ninja(text):
                    failing_blocks.append((block, text))
                else:
                    blocks_skipped += 1

        log.info("  %d blocks need Ninja Scrub, %d skipped", len(failing_blocks), blocks_skipped)

        if not failing_blocks:
            return StageResult(stage=5, stage_name="Pass 3: Ninja Scrub", metrics={"blocks_processed": 0.0})

        # 2. Chunk failing blocks into batches of ~1200 words (Ninja is more intensive)
        batches = []
        current_batch = []
        current_words = 0
        for item in failing_blocks:
            words = len(item[1].split())
            if current_words + words > 1200 and current_batch:
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
                "antigravity_humanize",
                {"input_text": input_text},
                temperature=0.75, # Higher temperature for creative rewriting
            )

            if result:
                rewritten_blocks = [b.strip() for b in result.split("===BLOCK===")]
                for i, (block, _) in enumerate(batch):
                    if i < len(rewritten_blocks) and rewritten_blocks[i].strip():
                        block.rewritten_text = rewritten_blocks[i]
                        blocks_processed += 1

        log.info("  %d blocks ninja-scrubbed", blocks_processed)
        return StageResult(
            stage=5,
            stage_name="Pass 3: Ninja Scrub",
            metrics={"blocks_processed": float(blocks_processed), "blocks_skipped": float(blocks_skipped)},
        )
