"""Bybit Spot WebSocket — klines + tickers.

Endpoint: wss://stream.bybit.com/v5/public/spot
Subscriptions: kline.{5|15}.{symbol}, tickers.{symbol}
Multiplex: unlimited per connection. 1 connection wystarczy.
Heartbeat: client ping co 20s (REQUIRED).

Stub Fazy 0. Implementacja Faza 3a.
"""

from __future__ import annotations


class BybitSpotWS:
    URL = "wss://stream.bybit.com/v5/public/spot"

    def __init__(self) -> None:
        raise NotImplementedError("BybitSpotWS — implementacja w Fazie 3a")
