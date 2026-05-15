"""Bybit Spot REST — klines + instruments-info.

Rate limit: 50 req/sec. Stub Fazy 0. Implementacja Faza 3b.
"""

from __future__ import annotations


class BybitSpotREST:
    BASE_URL = "https://api.bybit.com"
    REQ_PER_SEC = 50

    def __init__(self) -> None:
        raise NotImplementedError("BybitSpotREST — implementacja w Fazie 3b")
