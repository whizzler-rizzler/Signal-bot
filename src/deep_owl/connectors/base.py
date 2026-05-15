"""Connector Protocols — base interfaces dla WebSocket i REST.

Hexagonal layer: connectors. Wszystkie per-CEX implementations MUSZA
implementować jeden z tych Protocols.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Protocol

from deep_owl.data_models.normalized import (
    FundingRate,
    Kline,
    Liquidation,
    OpenInterest,
)


# Union type dla WS frame yields
WSFrame = Kline | FundingRate | OpenInterest | Liquidation


class WSConnector(Protocol):
    """WebSocket connector — async iterator yielding normalized frames.

    Lifecycle: connect → stream (long-running) → disconnect.
    Reconnect logic + heartbeat MUSI być w implementation.
    """

    async def connect(self, symbols: list[str]) -> None:
        """Open WS connection + subscribe to all symbols. Multiplex jeśli możliwe."""

    async def stream(self) -> AsyncIterator[WSFrame]:
        """Yield frames. Long-running (no return). Buffers internally on reconnect."""

    async def disconnect(self) -> None:
        """Graceful close + cancel reconnect tasks."""


class RESTConnector(Protocol):
    """REST connector — request/response per call.

    Used dla: backfill historyczny + sanity reconcile vs WS.
    Rate limit awareness MUSI być w implementation (tenacity + token bucket).
    """

    async def fetch_klines(
        self, symbol: str, interval: str, limit: int = 1000
    ) -> list[Kline]:
        """Pull historical klines. interval: '5m' | '15m' | '1h'."""

    async def fetch_funding_history(
        self, symbol: str, limit: int = 100
    ) -> list[FundingRate]:
        """Pull funding rate history (perpetuals only)."""

    async def fetch_open_interest(self, symbol: str) -> OpenInterest:
        """Pull current OI snapshot."""


class AnnouncementsConnector(Protocol):
    """Announcements connector — RSS/scrape dla Module 3 New Listings.

    Yields: detected new listing events (raw, pre-classification).
    """

    async def fetch_recent(self, since_hours: int = 24) -> list[dict]:
        """Pull recent announcements. Return raw items (text + metadata)."""
