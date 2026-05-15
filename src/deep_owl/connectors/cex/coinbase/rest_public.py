"""Coinbase Exchange REST — products + candles. Spot only.

Rate limit: 10 req/sec. Stub Fazy 0. Implementacja Faza 3b.
"""
from __future__ import annotations


class CoinbasePublicREST:
    BASE_URL = "https://api.exchange.coinbase.com"
    REQ_PER_SEC = 10

    def __init__(self) -> None:
        raise NotImplementedError("CoinbasePublicREST — implementacja w Fazie 3b")
