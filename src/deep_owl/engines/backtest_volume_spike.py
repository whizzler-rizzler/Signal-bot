"""Backtest Strategy: Volume Spike + price confirmation.

Entry: vol > 3x SMA20 + close > 5d high. Confirmed by next bar.
Exit: trailing stop 7%.

Stub Fazy 0. Implementacja Faza 4.
"""

from __future__ import annotations

NAME = "volume_spike"


def warmup_bars() -> int:
    return 1440  # 5 days × 288 5min


def on_bar(ctx: object) -> object | None:
    raise NotImplementedError("backtest_volume_spike.on_bar — Faza 4")
