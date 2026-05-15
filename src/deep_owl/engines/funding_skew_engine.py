"""Funding Skew Engine — Sygnał #2 Module 1.

Hipoteza: negative funding rate przez 24h+ = za dużo shortów = squeeze setup.
Threshold: avg(funding_8h) < -0.01% przez 24h.

Stub Fazy 0. Implementacja Faza 5.
"""

from __future__ import annotations

NAME = "funding_skew"
WEIGHT = 0.20
THRESHOLD_FUNDING_PCT = -0.01  # negative = shorts crowded


def warmup_window_bars() -> int:
    return 9  # 3 funding cycles × 3 (do safe averaging)


def compute(funding_24h_avg_pct: float) -> object | None:
    raise NotImplementedError("funding_skew_engine.compute — Faza 5")
