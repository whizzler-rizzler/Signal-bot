"""Backtest Strategy: Funding Squeeze (negative funding + price consolidation).

Entry: avg funding 24h < -0.005% + price w bands ±3% przez 12h + OI rosnący.
Exit: stop 4%, target 12%.

Stub Fazy 0. Implementacja Faza 4.
"""

from __future__ import annotations

NAME = "funding_squeeze"


def warmup_bars() -> int:
    return 144  # 12h × 12 5min bars


def on_bar(ctx: object) -> object | None:
    raise NotImplementedError("backtest_funding_squeeze.on_bar — Faza 4")
