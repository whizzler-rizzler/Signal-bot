"""Bid/Ask Order Book Imbalance Engine — Sygnał #7 Module 1 (OPCJONALNE).

Hipoteza: bid_volume_L5 / ask_volume_L5 > 1.5 = buy-side accumulation pressure.
Source: parent recorder (BTC/ETH/HYPE only). Jeśli unavailable → waga redistribuowana.

Stub Fazy 0. Implementacja Faza 5 (opt).
"""

from __future__ import annotations

NAME = "bid_ask_imbalance"
WEIGHT = 0.10
THRESHOLD_RATIO = 1.5


def compute(bid_volume_l5: float, ask_volume_l5: float) -> object | None:
    raise NotImplementedError("bid_ask_imbalance_engine.compute — Faza 5 (opt)")
