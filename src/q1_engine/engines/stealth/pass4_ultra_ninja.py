"""Stealth Pass 4: Ultra Ninja — Translation Chain Humanization."""

from __future__ import annotations

from q1_engine.engines.llm_rewriter import LLMRewriter
from q1_engine.models import ContentType, Section, StageResult
from q1_engine.utils.logging_setup import get_logger
from q1_engine.config import PipelineConfig
from q1_engine.engines.stealth.translators import google_translate, niutrans_translate

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
            log.warning("Niutrans API key not set, skipping Pass 4 Ultra Ninja.")
            return text

        system_msg = "你是一个专业的文案改写专家,精通多语言本地化。"
        
        # Step 1: EN -> ZH
        prompt_zh = f"翻译为中文，去掉 AI 味道，拟人化改写，只输出结果：\n{text}"
        step1_zh = await self._llm._call_llm(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt_zh}
            ],
            temperature=1.3,
            original_text=text
        )
        if not step1_zh: return text

        # Step 2: ZH -> JA
        prompt_ja = f"翻译为日语，去掉 AI 味道，拟人化改写，只输出结果：\n{step1_zh}"
        step2_ja = await self._llm._call_llm(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": f"翻译为日语，去掉 AI 味道，拟人化改写，只输出结果：\n{text}"},
                {"role": "assistant", "content": step1_zh},
                {"role": "user", "content": prompt_ja}
            ],
            temperature=1.3,
            original_text=step1_zh
        )
        if not step2_ja: return text

        # Step 3: JA -> FI
        try:
            step3_fi = google_translate(step2_ja, source="ja", target="fi")
        except Exception as e:
            log.warning(f"Google translate failed: {e}")
            return text

        # Step 4: FI -> EN
        try:
            step4_en = niutrans_translate(step3_fi, source="fi", target="en", api_key=niutrans_key)
            return step4_en
        except Exception as e:
            log.warning(f"Niutrans translate failed: {e}")
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
                
                # Execute translation chain
                result = await self._translation_chain(text)
                if result and result != text:
                    block.rewritten_text = result
                    blocks_processed += 1

        log.info("  %d blocks ultra-ninja'd", blocks_processed)
        return StageResult(
            stage=6,
            stage_name="Pass 4: Ultra Ninja",
            metrics={"blocks_processed": float(blocks_processed)},
        )
