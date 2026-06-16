"""Configuration loader for the Q1 Manuscript Refinement Engine.

Reads from YAML config files with environment variable overrides.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

from q1_engine.models import PipelineConfig, VoiceProfile

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_PACKAGE_ROOT = Path(__file__).resolve().parent
_PROJECT_ROOT = _PACKAGE_ROOT.parent.parent
_CONFIG_DIR = _PROJECT_ROOT / "config"
_DEFAULT_CONFIG = _CONFIG_DIR / "default.yaml"

JOURNALS_DIR = _CONFIG_DIR / "journals"
DOMAINS_DIR = _CONFIG_DIR / "domains"
PROMPTS_DIR = _CONFIG_DIR / "prompts"
VOICES_DIR = _CONFIG_DIR / "voices"


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge *override* into *base*, returning a new dict."""
    merged = base.copy()
    for key, value in override.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def _apply_env_overrides(data: dict) -> dict:
    """Apply Q1_ prefixed env vars as overrides.

    Example: Q1_LLM__MODEL=qwen3:72b  →  data["llm"]["model"] = "qwen3:72b"
    Double underscores denote nesting.
    """
    prefix = "Q1_"
    for key, value in os.environ.items():
        if not key.startswith(prefix):
            continue
        parts = key[len(prefix):].lower().split("__")
        target = data
        for part in parts[:-1]:
            target = target.setdefault(part, {})
        # Try to cast to bool / int / float
        if value.lower() in ("true", "false"):
            value = value.lower() == "true"  # type: ignore[assignment]
        else:
            try:
                value = int(value)  # type: ignore[assignment]
            except ValueError:
                try:
                    value = float(value)  # type: ignore[assignment]
                except ValueError:
                    pass
        target[parts[-1]] = value
    return data


def load_raw_yaml(path: Path) -> dict[str, Any]:
    """Load a YAML file and return the raw dict."""
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def load_config(config_path: Path | None = None) -> PipelineConfig:
    """Load pipeline configuration.

    Priority (highest wins):
    1. Environment variables (Q1_LLM__MODEL etc.)
    2. User-supplied config file
    3. config/default.yaml
    4. Pydantic defaults
    """
    env_path = _PROJECT_ROOT / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()

    base = load_raw_yaml(_DEFAULT_CONFIG)

    if config_path is not None:
        user = load_raw_yaml(Path(config_path))
        base = _deep_merge(base, user)

    base = _apply_env_overrides(base)
    return PipelineConfig(**base)


# ---------------------------------------------------------------------------
# Journal / Domain / Prompt helpers
# ---------------------------------------------------------------------------

def load_journal_profile(name: str) -> dict[str, Any]:
    """Load a journal profile YAML (e.g. 'ieee')."""
    path = JOURNALS_DIR / f"{name.lower()}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Journal profile not found: {path}")
    return load_raw_yaml(path)


def load_domain_profile(name: str) -> dict[str, Any]:
    """Load a domain profile YAML (e.g. 'computer_science')."""
    path = DOMAINS_DIR / f"{name.lower()}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Domain profile not found: {path}")
    return load_raw_yaml(path)


def load_prompt(name: str) -> str:
    """Load a prompt template by name (without extension)."""
    path = PROMPTS_DIR / f"{name}.txt"
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    return path.read_text(encoding="utf-8")


def get_available_journals() -> list[str]:
    """Return list of available journal profile names."""
    if not JOURNALS_DIR.exists():
        return []
    return [p.stem for p in JOURNALS_DIR.glob("*.yaml")]


def get_available_domains() -> list[str]:
    """Return list of available domain profile names."""
    if not DOMAINS_DIR.exists():
        return []
    return [p.stem for p in DOMAINS_DIR.glob("*.yaml")]


def load_voice_profile(name: str) -> dict[str, Any]:
    """Load a voice profile YAML (e.g. 'balanced_scholar')."""
    path = VOICES_DIR / f"{name.lower()}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Voice profile not found: {path}")
    return load_raw_yaml(path)


def auto_select_voice(domain: str) -> VoiceProfile:
    """Auto-select voice profile based on domain."""
    mapping = {
        "computer_science": VoiceProfile.PRECISE_ANALYST,
        "engineering": VoiceProfile.CONVERSATIONAL_EXPERT,
        "medicine": VoiceProfile.BALANCED_SCHOLAR,
        "psychology": VoiceProfile.BALANCED_SCHOLAR,
        "economics": VoiceProfile.NARRATIVE_WEAVER,
        "materials_science": VoiceProfile.TECHNICAL_MINIMALIST,
        "general": VoiceProfile.BALANCED_SCHOLAR,
    }
    return mapping.get(domain.lower(), VoiceProfile.BALANCED_SCHOLAR)
