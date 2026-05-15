"""Volume Profile Engine — Sygnał #1 Module 1.

Hipoteza: volume rising on flat/down price = akumulacja Wyckoff Phase B.
Threshold: vol_24h / vol_7d_avg > 2.0 ORAZ |Δp_24h| < 5%.

Hexagonal layer: engines. Pure compute. NIE I/O.
Test independence: tworzymy VolumeProfile + price_change → assert score.

Stub Fazy 0. Implementacja Faza 5.
"""

from __future__ import annotations

from deep_owl.data_models.processed import VolumeProfile
from deep_owl.data_models.signals import EngineResult
from deep_owl.engines.base import sigmoid


NAME = "volume_rising"
WEIGHT = 0.20
THRESHOLD_RATIO = 2.0           # vol_24h / vol_7d_avg
THRESHOLD_PRICE_CHANGE = 5.0    # |Δp_24h_pct|


def warmup_window_bars() -> int:
    """7 days × 288 5min candles."""
    return 2016


def compute(profile: VolumeProfile, price_change_24h_pct: float) -> EngineResult | None:
    """
    Pure compute. Sygnał #1: Volume rising on flat/down price.

    Returns None gdy:
    - price_change > 5% (signal nieaktywny — chcemy PRZED ruchem)
    - profile.rolling_7d_avg <= 0 (no data)
    """
    raise NotImplementedError("volume_profile_engine.compute — implementacja w Fazie 5")
