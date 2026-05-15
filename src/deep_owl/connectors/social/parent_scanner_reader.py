"""Parent Social_media_scanner reader.

Path: D:/Crypto/Claude/Social_media_scanner/
Read-only: parent DuckDB lub JSON output, mapping symbol → mention count + sentiment.

Stub Fazy 0. Implementacja Faza 5 (Sygnał #6 social_velocity).
"""

from __future__ import annotations

from pathlib import Path


class ParentScannerReader:
    def __init__(self, parent_path: Path) -> None:
        self.parent_path = parent_path
        raise NotImplementedError("ParentScannerReader — implementacja w Fazie 5 (opt)")
