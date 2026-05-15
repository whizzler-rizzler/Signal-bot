"""Backtest Strategy: RSI Divergence (oversold + bullish divergence).

Entry: RSI(14) < 30 + bullish divergence (price LL + RSI HL w 20 bars).
Exit: stop 6%, target 18%.

Stub Fazy 0. Implementacja Faza 4.
"""

from __future__ import annotations

NAME = "rsi_divergence"


def warmup_bars() -> int:
    return 20 + 14  # divergence window + RSI period


def on_bar(ctx: object) -> object | None:
    raise NotImplementedError("backtest_rsi_divergence.on_bar — Faza 4")
