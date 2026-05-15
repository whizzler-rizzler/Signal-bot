"""Binance /exchangeInfo wrapper — symbols metadata dla universe.

Used przez Faza 2 universe builder + Module 3 daily symbols snapshot.

Stub Fazy 0. Implementacja Faza 2.
"""

from __future__ import annotations


class BinanceExchangeInfo:
    SPOT_URL = "https://api.binance.com/api/v3/exchangeInfo"
    FUTURES_URL = "https://fapi.binance.com/fapi/v1/exchangeInfo"

    def __init__(self) -> None:
        raise NotImplementedError("BinanceExchangeInfo — implementacja w Fazie 2")
