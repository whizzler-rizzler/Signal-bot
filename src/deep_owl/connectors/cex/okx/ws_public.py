"""OKX Public WebSocket — candles + tickers + funding-rate + open-interest.

Endpoint: wss://ws.okx.com:8443/ws/v5/public
Multiplex: 200 subs/connection. ~800 instruments → 4-8 connections.
Heartbeat: client ping co 25s (REQUIRED, server zamyka po 30s inactivity).

Stub Fazy 0. Implementacja Faza 3a.
"""

from __future__ import annotations


class OKXPublicWS:
    URL = "wss://ws.okx.com:8443/ws/v5/public"
    SUBS_PER_CONNECTION = 200

    def __init__(self) -> None:
        raise NotImplementedError("OKXPublicWS — implementacja w Fazie 3a")
