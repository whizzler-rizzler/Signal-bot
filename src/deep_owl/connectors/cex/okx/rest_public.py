"""OKX Public REST — candles + funding-rate-history + open-interest.

Rate limit: 20 req/2s (~600/min). Stub Fazy 0. Implementacja Faza 3b.
"""
from __future__ import annotations


class OKXPublicREST:
    BASE_URL = "https://www.okx.com"
    REQ_PER_2S = 20

    def __init__(self) -> None:
        raise NotImplementedError("OKXPublicREST — implementacja w Fazie 3b")
