"""Structured logging setup for the Q1 Engine.

Uses Python stdlib logging with Rich handler for beautiful console output.
"""

from __future__ import annotations

import logging
import sys

from rich.console import Console
from rich.logging import RichHandler

_CONFIGURED = False


def setup_logging(verbose: bool = False) -> None:
    """Configure root and package loggers.

    Parameters
    ----------
    verbose
        If *True*, set the q1_engine logger to DEBUG; otherwise INFO.
    """
    global _CONFIGURED
    if _CONFIGURED:
        return

    console = Console(stderr=True)
    handler = RichHandler(
        console=console,
        show_time=True,
        show_path=False,
        markup=True,
        rich_tracebacks=True,
        tracebacks_show_locals=verbose,
    )
    handler.setFormatter(logging.Formatter("%(message)s", datefmt="[%X]"))

    # Root logger — WARNING to suppress noisy third-party libs
    root = logging.getLogger()
    root.setLevel(logging.WARNING)
    root.addHandler(handler)

    # Package logger
    pkg = logging.getLogger("q1_engine")
    pkg.setLevel(logging.DEBUG if verbose else logging.INFO)
    pkg.propagate = True

    # Suppress excessively chatty libs even in verbose mode
    for noisy in ("httpx", "httpcore", "urllib3", "filelock", "transformers.tokenization"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    """Return a child logger under the q1_engine namespace."""
    return logging.getLogger(f"q1_engine.{name}")
