"""Backtest Strategy: Breakout Consolidation (Bollinger Squeeze + volume).

Entry: Bollinger band width < 30 percentile + close > upper band + volume > SMA20×1.5.
Exit: stop 5%, target 15%, time_stop 48h.

Stub Fazy 0. Implementacja Faza 4.
"""

from __future__ import annotations

NAME = "breakout_consolidation"


def warmup_bars() -> int:
    return 50  # SMA20 + Bollinger 20


def on_bar(ctx: object) -> object | None:
    raise NotImplementedError("backtest_breakout_consolidation.on_bar — Faza 4")
