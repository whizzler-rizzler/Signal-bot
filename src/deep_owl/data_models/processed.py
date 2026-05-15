"""Processed data models — output processors → input engines.

Hexagonal layer: data_models. NIE zawiera raw connector frames ani signals.
Per data type processor produkuje swój model.

Stub Fazy 0. Models dodawane gdy implementujemy processors (Faza 4-5).
"""

from __future__ import annotations

from pydantic import BaseModel


class VolumeProfile(BaseModel):
    """Output: processors/numerical/volume_profiler.py.

    Input dla: engines/volume_profile_engine.py.
    """

    rolling_7d_avg: float
    last_24h_avg: float
    ratio: float = 1.0


class RollingStats(BaseModel):
    """Output: processors/timeseries/rolling_stats.py."""

    sma_20: float
    sma_50: float
    ema_12: float
    ema_26: float
    std_dev_20: float


class FundingProfile(BaseModel):
    """Output: processors/numerical aggregator dla funding history.

    Input dla: engines/funding_skew_engine.py.
    """

    funding_24h_avg: float
    funding_7d_avg: float
    cycles_negative_24h: int  # ile z 3 funding cycles było negative


class OIProfile(BaseModel):
    """Output: processors/numerical aggregator dla open interest.

    Input dla: engines/oi_buildup_engine.py.
    """

    oi_now_usd: float
    oi_7d_avg_usd: float
    growth_pct: float


class LiquidationProfile(BaseModel):
    """Output: processors/numerical/liquidation_aggregator.py.

    Input dla: engines/liquidation_imbalance_engine.py.
    """

    long_liq_24h_usd: float
    short_liq_24h_usd: float
    imbalance_ratio: float  # long/short


# Więcej processed models dodawane gdy implementujemy processors w Faza 4-5.
