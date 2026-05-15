"""Parent CEX recorder reader — read-only zstd archive access.

Path: D:/Crypto/Claude/data/{exchange}/{date}/{symbol}_{update_type}_{hour}.bin.zst
Coverage: BTC, ETH, HYPE only.
Use: orderbook L5 (Sygnał #7) + cross-validation tick precision.

Stub Fazy 0. Implementacja Faza 5 (gdy potrzebne dla bid/ask imbalance engine).
"""

from __future__ import annotations

from pathlib import Path


class ParentRecorderReader:
    SUPPORTED_SYMBOLS = ("BTC", "ETH", "HYPE")

    def __init__(self, base_path: Path) -> None:
        self.base_path = base_path
        raise NotImplementedError("ParentRecorderReader — implementacja w Fazie 5")
