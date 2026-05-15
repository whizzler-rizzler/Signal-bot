"""Fees engine — per-CEX fee table.

Defaults (taker):
- Binance spot: 0.10% / futures 0.040%
- Bybit spot: 0.10% / futures 0.060%
- OKX spot: 0.10% / futures 0.050%
- Coinbase spot: 0.40% (no public futures)

Stub Fazy 0. Implementacja Faza 4.
"""

from __future__ import annotations

from deep_owl.core.types import Exchange, MarketType


CEX_FEES: dict[tuple[Exchange, MarketType], float] = {
    ("binance", "spot"): 0.0010,
    ("binance", "perpetual"): 0.0004,
    ("bybit", "spot"): 0.0010,
    ("bybit", "perpetual"): 0.0006,
    ("okx", "spot"): 0.0010,
    ("okx", "perpetual"): 0.0005,
    ("coinbase", "spot"): 0.0040,
}


def get_fee(exchange: Exchange, market_type: MarketType) -> float:
    """Return taker fee fraction (np. 0.0010 = 0.10%)."""
    raise NotImplementedError("fees_engine.get_fee — Faza 4")
