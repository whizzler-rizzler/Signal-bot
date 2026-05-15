"""Binance Futures WebSocket — klines, markPrice (funding), OI, liquidations.

Endpoint: wss://fstream.binance.com/stream
Streams subskrybowane:
- <symbol>@kline_5m, <symbol>@kline_15m
- !markPrice@arr@1s — broadcast wszystkie funding rates co 1s
- <symbol>@openInterest
- !forceOrder@arr — broadcast wszystkie liquidations

Multiplex: 200 streams/connection. ~500 perpetuals × 2 klines + 2 broadcast = 2 connections.

Stub Fazy 0. Implementacja Faza 3a.
"""

from __future__ import annotations


class BinanceFuturesWS:
    URL = "wss://fstream.binance.com/stream"

    def __init__(self) -> None:
        raise NotImplementedError("BinanceFuturesWS — implementacja w Fazie 3a")
