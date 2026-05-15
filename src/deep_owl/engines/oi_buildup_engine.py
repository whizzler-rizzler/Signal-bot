"""OI Buildup Engine — Sygnał #3 Module 1.

Hipoteza: rosnący OI przy stabilnej cenie = nowy kapitał napływa. W kombinacji
z negative funding (Sygnał #2) = build-up shorts → squeeze potential.

Threshold: (oi_now - oi_7d_avg) / oi_7d_avg > 0.20 (+20%) AND price flat ±5%.

Stub Fazy 0. Implementacja Faza 5.
"""

from __future__ import annotations

NAME = "oi_buildup"
WEIGHT = 0.15
THRESHOLD_GROWTH_PCT = 20.0
THRESHOLD_PRICE_CHANGE = 5.0


def compute(oi_growth_pct: float, price_change_24h_pct: float) -> object | None:
    raise NotImplementedError("oi_buildup_engine.compute — Faza 5")
