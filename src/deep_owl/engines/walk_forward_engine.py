"""Walk-forward analysis — anti-overfitting backtest infrastructure.

Default: train 60d, test 14d, slide 14d. Out-of-sample ≥ 30%.

Stub Fazy 0. Implementacja Faza 4.
"""

from __future__ import annotations

DEFAULT_TRAIN_DAYS = 60
DEFAULT_TEST_DAYS = 14
DEFAULT_SLIDE_DAYS = 14


def generate_windows(start_date: str, end_date: str) -> list[tuple[str, str, str, str]]:
    """Returns list of (train_start, train_end, test_start, test_end) tuples."""
    raise NotImplementedError("walk_forward_engine.generate_windows — Faza 4")
