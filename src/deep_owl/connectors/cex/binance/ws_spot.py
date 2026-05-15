"""Binance Spot WebSocket connector — klines 5m + 15m + miniTicker.

Hexagonal layer: connectors. TYLKO I/O + parsing.

Endpoint: wss://stream.binance.com:9443/stream
Multiplex: 1024 streams/connection. ~2000 spot symbols × 2 klines = 4 connections.
Heartbeat: server ping co 3min, client pong w 10min.

Stub Fazy 0. Implementacja Faza 3a.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from deep_owl.connectors.base import WSFrame


class BinanceSpotWS:
    """Binance Spot WebSocket client.

    TODO Faza 3a:
    - websockets.connect z ping_interval=20
    - Multiplex stream subscription via URL params
    - Reconnect: exp backoff 1s -> 60s (tenacity)
    - Heartbeat: respond to server pings
    - Frame parsing (delegate do parsers.py)
    - Replay buffer: po reconnect >5s downtime -> REST backfill missed bars
    """

    URL = "wss://stream.binance.com:9443/stream"
    STREAMS_PER_CONNECTION = 1024  # Binance hard limit

    def __init__(self) -> None:
        raise NotImplementedError("BinanceSpotWS — implementacja w Fazie 3a")

    async def connect(self, symbols: list[str]) -> None:
        """Open WS + subscribe to <symbol>@kline_5m + <symbol>@kline_15m for all symbols."""
        raise NotImplementedError

    async def stream(self) -> AsyncIterator[WSFrame]:
        """Yield Kline frames (normalized)."""
        raise NotImplementedError
        yield  # pragma: no cover  # noqa: B901

    async def disconnect(self) -> None:
        """Graceful close."""
        raise NotImplementedError
