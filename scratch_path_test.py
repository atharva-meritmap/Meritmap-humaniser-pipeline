import sys
import os
from pathlib import Path

# Simulate the exact python environment they are using
sys.path.insert(0, "src")

from q1_engine.config import _PACKAGE_ROOT, _PROJECT_ROOT, _CONFIG_DIR, PROMPTS_DIR

print(f"__file__: {__file__}")
print(f"_PACKAGE_ROOT: {_PACKAGE_ROOT}")
print(f"_PROJECT_ROOT: {_PROJECT_ROOT}")
print(f"_CONFIG_DIR: {_CONFIG_DIR}")
print(f"PROMPTS_DIR: {PROMPTS_DIR}")

path = PROMPTS_DIR / "stage3_cognitive_remodel.txt"
print(f"Exists: {path.exists()} - {path}")

# Check if .env is found
env_path = _PROJECT_ROOT / ".env"
print(f"ENV Exists: {env_path.exists()} - {env_path}")
