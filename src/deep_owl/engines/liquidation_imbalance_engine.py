"""Liquidation Imbalance Engine — Sygnał #5 Module 1.

Hipoteza: masowe long liquidations = capitulation/bottom = potential reversal.
Threshold: long_liq_24h_usd / short_liq_24h_usd > 2.0.

Stub Fazy 0. Implementacja Faza 5.
"""

from __future__ import annotations

NAME = "liquidation_imbalance"
WEIGHT = 0.10
THRESHOLD_RATIO = 2.0


def compute(long_liq_24h_usd: float, short_liq_24h_usd: float) -> object | None:
    raise NotImplementedError("liquidation_imbalance_engine.compute — Faza 5")
