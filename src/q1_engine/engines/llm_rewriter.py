"""Ollama-based LLM rewriting engine.

Manages model connections, prompt template loading, domain-aware rewriting,
and retry logic with progressive prompt relaxation.
"""

from __future__ import annotations

import asyncio
from typing import Any

from q1_engine.config import load_domain_profile, load_prompt
from q1_engine.models import DomainProfile, LLMConfig
from q1_engine.utils.logging_setup import get_logger

log = get_logger("llm_rewriter")


class LLMRewriter:
    """Ollama/OpenRouter rewriting engine with domain-aware prompts."""

    def __init__(self, config: LLMConfig) -> None:
        self._config = config
        self._available: bool | None = None

    async def check_model_available(self) -> bool:
        """Check if the configured model is available in Ollama or OpenRouter."""
        import os
        deepseek_key = os.environ.get("DEEPSEEK_API_KEY")
        groq_key = os.environ.get("GROQ_API_KEY")
        openrouter_key = os.environ.get("OPENROUTER", os.environ.get("OPENROUTER_API_KEY"))
        provider = self._config.provider if hasattr(self._config, "provider") else "ollama"

        if deepseek_key and provider == "deepseek":
            self._available = True
            log.info("Using DeepSeek API (model: %s)", self._config.model)
            return True

        gemini_key = os.environ.get("GEMINI_API_KEY")
        if gemini_key and provider == "gemini":
            self._available = True
            log.info("Using Gemini API (model: %s)", self._config.model)
            return True

        if groq_key and provider == "groq":
            self._available = True
            log.info("Using Groq API (model: %s)", self._config.model)
            return True

        if openrouter_key and provider == "openrouter":
            self._available = True
            log.info("Using OpenRouter API (model: %s)", self._config.model)
            return True
            
        try:
            import ollama
            models = ollama.list()
            model_names = []
            if hasattr(models, "models"):
                model_names = [m.model for m in models.models]
            elif isinstance(models, dict) and "models" in models:
                model_names = [m.get("model", m.get("name", "")) for m in models["models"]]

            target = self._config.model
            self._available = any(
                target in name or name.startswith(target.split(":")[0])
                for name in model_names
            )

            if not self._available:
                log.warning(
                    "Model '%s' not found in Ollama. Available: %s",
                    target, model_names,
                )
                fallback = self._config.fallback_model
                self._available = any(
                    fallback in name or name.startswith(fallback.split(":")[0])
                    for name in model_names
                )
                if self._available:
                    log.info("Using fallback model: %s", fallback)
                    self._config.model = fallback
            else:
                log.info("Ollama model '%s' is available", target)

            return self._available
        except Exception as exc:
            log.error("Cannot connect to Ollama: %s", exc)
            self._available = False
            return False

    def _get_domain_instructions(self, domain: DomainProfile) -> str:
        """Load domain-specific rewriting instructions."""
        try:
            profile = load_domain_profile(domain.domain.value)
            return profile.get("rewrite_instructions", "Follow standard academic writing conventions.")
        except FileNotFoundError:
            return "Follow standard academic writing conventions."

    # Provider-aware delays (seconds between consecutive calls)
    _PROVIDER_DELAYS: dict[str, float] = {
        "gemini": 4.0,      # 15 RPM free tier
        "groq": 12.0,       # ~5 RPM free tier
        "deepseek": 2.0,    # Generous limits
        "openrouter": 8.0,  # Variable
        "ollama": 0.0,      # Local, no limits
    }
    # Backoff delays for 429 retries: 15s, 30s, 60s
    _BACKOFF: list[float] = [15.0, 30.0, 60.0]

    async def _call_llm(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        min_length_ratio: float = 0.3,
        original_text: str = "",
    ) -> str:
        """Core LLM call with rate-limit handling and 429 backoff retry."""
        if self._available is None:
            await self.check_model_available()
        if not self._available:
            return ""

        temp = temperature if temperature is not None else self._config.temperature

        import os
        import requests as req_lib

        deepseek_key = os.environ.get("DEEPSEEK_API_KEY")
        groq_key = os.environ.get("GROQ_API_KEY")
        openrouter_key = os.environ.get("OPENROUTER", os.environ.get("OPENROUTER_API_KEY"))
        gemini_key = os.environ.get("GEMINI_API_KEY")
        provider = self._config.provider if hasattr(self._config, "provider") else "ollama"

        # Polite delay between every call to stay within free-tier rate limits
        delay = self._PROVIDER_DELAYS.get(provider, 8.0)
        await asyncio.sleep(delay)

        for attempt_num, backoff in enumerate([0.0] + self._BACKOFF):
            if backoff:
                log.info("Rate limited — waiting %.0fs before retry %d...", backoff, attempt_num)
                await asyncio.sleep(backoff)

            try:
                if deepseek_key and provider == "deepseek":
                    headers = {
                        "Authorization": f"Bearer {deepseek_key}",
                        "Content-Type": "application/json",
                    }
                    data = {"model": self._config.model, "messages": messages, "temperature": temp}
                    resp = req_lib.post(
                        "https://api.deepseek.com/chat/completions",
                        headers=headers, json=data, timeout=120
                    )
                elif gemini_key and provider == "gemini":
                    headers = {
                        "Authorization": f"Bearer {gemini_key}",
                        "Content-Type": "application/json",
                    }
                    data = {"model": self._config.model, "messages": messages, "temperature": temp}
                    resp = req_lib.post(
                        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                        headers=headers, json=data, timeout=120
                    )
                elif groq_key and provider == "groq":
                    headers = {
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json",
                    }
                    data = {"model": self._config.model, "messages": messages, "temperature": temp}
                    resp = req_lib.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers=headers, json=data, timeout=120
                    )
                elif openrouter_key and provider == "openrouter":
                    headers = {
                        "Authorization": f"Bearer {openrouter_key}",
                        "HTTP-Referer": "https://meritmap.org",
                        "X-Title": "Meritmap Q1 Engine",
                    }
                    data = {"model": self._config.model, "messages": messages, "temperature": temp}
                    resp = req_lib.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers, json=data, timeout=120
                    )
                else:
                    import ollama
                    num_predict = max(len(original_text.split()) * 3, 1024) if original_text else 4096
                    response = ollama.chat(
                        model=self._config.model,
                        messages=messages,
                        options={"temperature": temp, "num_predict": num_predict},
                    )
                    result = response["message"]["content"].strip()
                    if original_text and len(result) < len(original_text) * min_length_ratio:
                        log.warning("LLM returned suspiciously short text")
                        return ""
                    return result

                # 429 — rate limited, retry with backoff
                if resp.status_code == 429:
                    if attempt_num < len(self._BACKOFF):
                        log.warning("429 rate limit hit — will retry")
                        continue
                    log.warning("429 rate limit — all retries exhausted. Falling back to Ollama (qwen2.5:14b)")
                    try:
                        provider = "ollama"
                        self._config.model = "qwen2.5:14b"
                        import ollama
                        num_predict = max(len(original_text.split()) * 3, 1024) if original_text else 4096
                        response = ollama.chat(
                            model=self._config.model,
                            messages=messages,
                            options={"temperature": temp, "num_predict": num_predict},
                        )
                        result = response["message"]["content"].strip()
                        return result
                    except Exception as fallback_exc:
                        log.error("Fallback to Ollama failed: %s", fallback_exc)
                        return ""

                resp.raise_for_status()
                result = resp.json()["choices"][0]["message"]["content"].strip()

                if original_text and len(result) < len(original_text) * min_length_ratio:
                    log.warning("LLM returned suspiciously short text")
                    return ""

                return result

            except req_lib.exceptions.HTTPError as exc:
                if exc.response is not None and exc.response.status_code == 429:
                    if attempt_num < len(self._BACKOFF):
                        continue
                    log.warning("429 rate limit — all retries exhausted. Falling back to Ollama (qwen2.5:14b)")
                    try:
                        provider = "ollama"
                        self._config.model = "qwen2.5:14b"
                        import ollama
                        num_predict = max(len(original_text.split()) * 3, 1024) if original_text else 4096
                        response = ollama.chat(
                            model=self._config.model,
                            messages=messages,
                            options={"temperature": temp, "num_predict": num_predict},
                        )
                        result = response["message"]["content"].strip()
                        return result
                    except Exception as fallback_exc:
                        log.error("Fallback to Ollama failed: %s", fallback_exc)
                        return ""
                log.warning("LLM call failed: %s", exc)
                return ""
            except Exception as exc:
                log.warning("LLM call failed: %s", exc)
                return ""

        return ""

    async def rewrite(
        self,
        text: str,
        domain: DomainProfile,
        attempt: int = 1,
        lost_facts: list[str] | None = None,
    ) -> str:
        """Rewrite a text block using the LLM."""
        domain_instructions = self._get_domain_instructions(domain)

        try:
            template = load_prompt("rewrite_base")
        except FileNotFoundError:
            template = (
                "Rewrite this academic text to improve clarity, flow, and academic tone. "
                "CRITICAL INSTRUCTIONS: "
                "1. PRESERVE the exact core meaning and intent of the original text. "
                "2. DO NOT hallucinate or add any new information. "
                "3. PRESERVE all numbers, percentages, citations, method names, and technical terms exactly.\n\n"
                "{domain_instructions}\n\n{input_text}"
            )

        prompt = template.replace("{domain_instructions}", domain_instructions).replace("{input_text}", text)

        if attempt > 1 and lost_facts:
            fact_list = "\n".join(f"  - {f}" for f in lost_facts)
            prompt += f"\n\nCRITICAL: Your previous rewrite lost these facts. You MUST include ALL of them:\n{fact_list}"

        if attempt > 2:
            prompt += (
                "\n\nWARNING: This is your final attempt. Make MINIMAL changes. "
                "Focus only on removing obvious AI phrases."
            )

        messages = [
            {"role": "system", "content": "You are an expert academic editor. Output ONLY the rewritten text."},
            {"role": "user", "content": prompt},
        ]
        result = await self._call_llm(
            messages,
            temperature=self._config.temperature + (attempt - 1) * 0.05,
            original_text=text,
        )
        return result if result else text

    async def generate(self, prompt_name: str, variables: dict[str, str]) -> str:
        """General-purpose LLM generation using a named prompt template."""
        try:
            template = load_prompt(prompt_name)
        except FileNotFoundError:
            log.error("Prompt template '%s' not found", prompt_name)
            return ""

        prompt = template
        for key, value in variables.items():
            prompt = prompt.replace(f"{{{key}}}", value)

        messages = [{"role": "user", "content": prompt}]
        return await self._call_llm(messages, temperature=0.4)

    async def call_with_prompt(
        self,
        prompt_name: str,
        variables: dict[str, str],
        temperature: float = 0.7,
        system_msg: str = "You are an expert academic editor. Output ONLY the rewritten text.",
    ) -> str:
        """Call LLM with a named prompt template and system message."""
        try:
            template = load_prompt(prompt_name)
        except FileNotFoundError:
            log.error("Prompt template '%s' not found", prompt_name)
            return ""

        prompt = template
        for key, value in variables.items():
            prompt = prompt.replace(f"{{{key}}}", value)

        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt},
        ]
        return await self._call_llm(messages, temperature=temperature)

    async def multi_pass_humanise(
        self,
        text: str,
        domain: DomainProfile,
        lost_facts: list[str] | None = None,
    ) -> str:
        """Legacy 3-pass humanisation (kept for backward compatibility)."""
        domain_instructions = self._get_domain_instructions(domain)
        current_text = text

        passes = [
            ("humanise_pass1", 0.6),
            ("humanise_pass2", 0.8),
            ("humanise_pass3", 0.5),
        ]

        for i, (prompt_name, temp) in enumerate(passes):
            try:
                template = load_prompt(prompt_name)
            except FileNotFoundError:
                log.warning("Prompt %s not found, skipping pass", prompt_name)
                continue

            prompt = (
                template
                .replace("{domain_instructions}", domain_instructions)
                .replace("{input_text}", current_text)
            )
            messages = [
                {"role": "system", "content": "You are an expert academic editor. Output ONLY the rewritten text."},
                {"role": "user", "content": prompt},
            ]
            result = await self._call_llm(messages, temperature=temp, original_text=text)
            if result:
                current_text = result
            else:
                log.warning("Pass %d returned empty/short text, keeping previous", i + 1)

        return current_text
