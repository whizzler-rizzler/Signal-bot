"""Coinbase WebSocket — ticker_batch + matches (custom kline aggregation client-side).

Endpoint: wss://ws-feed.exchange.coinbase.com
Channels: ticker_batch, matches.
WAŻNE: brak natywnego kline stream — agregujemy z matches w-memory per 5m/15m okno.

Stub Fazy 0. Implementacja Faza 3a.
"""

from __future__ import annotations


class CoinbasePublicWS:
    URL = "wss://ws-feed.exchange.coinbase.com"

    def __init__(self) -> None:
        raise NotImplementedError("CoinbasePublicWS — implementacja w Fazie 3a")
