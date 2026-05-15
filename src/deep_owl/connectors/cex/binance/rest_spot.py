"""Binance Spot REST — backfill historical klines + sanity reconcile vs WS.

Endpoints:
- GET /api/v3/klines (max 1500 bars/call, weight 1)
- GET /api/v3/exchangeInfo (weight 10)

Rate limit: 6000 weight/min global IP-based.

Stub Fazy 0. Implementacja Faza 3b.
"""

from __future__ import annotations


class BinanceSpotREST:
    BASE_URL = "https://api.binance.com"
    WEIGHT_PER_MIN = 6000

    def __init__(self) -> None:
        raise NotImplementedError("BinanceSpotREST — implementacja w Fazie 3b")
