"""New Listings Detector Engine — daily diff CEX symbols → new listings.

Module 3. Compares cex_symbols_snapshot today vs yesterday per CEX,
output detected new symbols (insert do new_listings table).

Stub Fazy 0. Implementacja Faza 5.
"""

from __future__ import annotations

NAME = "new_listings_detector"


def detect_new_listings(
    today_snapshot: list[object],
    yesterday_snapshot: list[object],
) -> list[object]:
    raise NotImplementedError("new_listings_detector_engine.detect — Faza 5")
