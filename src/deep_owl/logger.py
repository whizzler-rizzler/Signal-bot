"""Structured logging setup (structlog + stdlib).

Stub Fazy 0. Pelna implementacja Faza 1.
"""

from __future__ import annotations

import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Setup root logger. JSON output for dashboard ingestion (faza 6+)."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)-8s %(name)s | %(message)s",
        stream=sys.stderr,
    )


def get_logger(name: str) -> logging.Logger:
    """Return module-level logger."""
    return logging.getLogger(name)
