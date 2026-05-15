"""Volume profiling — rolling 7d avg, last 24h, ratio.

Hexagonal layer: processor. Pure function. Input: list[Kline] → VolumeProfile.

Stub Fazy 0. Implementacja Faza 5 (gdy potrzebne dla volume_profile_engine).
"""

from __future__ import annotations

from deep_owl.data_models.normalized import Kline
from deep_owl.data_models.processed import VolumeProfile


def compute_volume_profile(klines: list[Kline], window_bars: int = 2016) -> VolumeProfile:
    """
    Compute rolling 7d avg + last 24h avg + ratio.

    window_bars: 2016 = 7 days × 288 5min candles (default).
    Returns VolumeProfile z 1.0 ratio jeśli za mało danych.
    """
    raise NotImplementedError("compute_volume_profile — implementacja w Fazie 5")
