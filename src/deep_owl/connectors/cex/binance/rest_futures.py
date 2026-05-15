"""Binance Futures REST — klines + funding rate history + OI history.

Endpoints:
- GET /fapi/v1/klines (weight 1)
- GET /fapi/v1/fundingRate (weight 1)
- GET /fapi/v1/openInterest (weight 1)
- GET /futures/data/openInterestHist (weight 1)

Rate limit: 2400 weight/min (separate od spot pool).

Stub Fazy 0. Implementacja Faza 3b.
"""

from __future__ import annotations


class BinanceFuturesREST:
    BASE_URL = "https://fapi.binance.com"
    WEIGHT_PER_MIN = 2400

    def __init__(self) -> None:
        raise NotImplementedError("BinanceFuturesREST — implementacja w Fazie 3b")
