"""Stealth Pass 4: Ultra Ninja — Translation Chain Humanization."""

from __future__ import annotations

from q1_engine.engines.llm_rewriter import LLMRewriter
from q1_engine.models import ContentType, Section, StageResult
from q1_engine.utils.logging_setup import get_logger
from q1_engine.config import PipelineConfig
from q1_engine.engines.stealth.translators import google_translate, niutrans_translate
from q1_engine.engines.antigravity import _pre_scrub

log = get_logger("pass4")


class Pass4UltraNinja:
    """Apply Translation Chain: EN -> ZH (LLM) -> JA (LLM) -> FI (Google) -> EN (Niutrans)."""

    def __init__(self, llm: LLMRewriter, config: PipelineConfig) -> None:
        self._llm = llm
        self._config = config

    async def _translation_chain(self, text: str) -> str:
        """Run the 4-step translation chain on a text block."""
        niutrans_key = self._config.apis.niutrans_api_key
        if not niutrans_key:
            log.info("Niutrans API key not set, falling back to Google Translate for FI -> EN.")

        # Step 1: EN -> ZH
        try:
            step1_zh = google_translate(text, source="en", target="zh-CN")
        except Exception as e:
            log.warning(f"Google translate failed (EN->ZH): {e}")
            return text

        # Step 2: ZH -> JA
        try:
            step2_ja = google_translate(step1_zh, source="zh-CN", target="ja")
        except Exception as e:
            log.warning(f"Google translate failed (ZH->JA): {e}")
            return text

        # Step 3: JA -> FI
        try:
            step3_fi = google_translate(step2_ja, source="ja", target="fi")
        except Exception as e:
            log.warning(f"Google translate failed: {e}")
            return text

        # Step 4: FI -> EN
        try:
            if niutrans_key:
                step4_en = niutrans_translate(step3_fi, source="fi", target="en", api_key=niutrans_key)
            else:
                step4_en = google_translate(step3_fi, source="fi", target="en")
            return step4_en
        except Exception as e:
            log.warning(f"Final translation step failed: {e}")
            return text

    async def run(self, sections: list[Section]) -> StageResult:
        """Apply Ultra Ninja to all text blocks (destructive, used for extreme cases)."""
        log.info("Pass 4: Ultra Ninja (Translation Chain)")
        blocks_processed = 0

        for section in sections:
            for block in section.blocks:
                if block.content_type != ContentType.TEXT:
                    continue
                text = block.rewritten_text or block.raw_latex
                if not text.strip() or len(text.split()) < 10:
                    continue
                
                # Deterministically wipe AI vocab/RLHF phrases first (0 tokens)
                scrubbed_text, _ = _pre_scrub(text)

                # Execute translation chain
                result = await self._translation_chain(scrubbed_text)
                if result and result != text:
                    block.rewritten_text = result
                    blocks_processed += 1

        log.info("  %d blocks ultra-ninja'd", blocks_processed)
        return StageResult(
            stage=6,
            stage_name="Pass 4: Ultra Ninja",
            metrics={"blocks_processed": float(blocks_processed)},
        )
