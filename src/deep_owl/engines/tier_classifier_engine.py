"""Tier Classifier Engine — assign tier 1-4 z CoinGecko market_cap_rank.

Tier 1: rank 1-100
Tier 2: rank 101-500
Tier 3: rank 501-2000
Tier 4: rank > 2000 lub null

Stub Fazy 0. Implementacja Faza 2.
"""

from __future__ import annotations

from deep_owl.core.types import Tier


def classify_tier(market_cap_rank: int | None) -> Tier:
    if market_cap_rank is None:
        return 4
    if market_cap_rank <= 100:
        return 1
    if market_cap_rank <= 500:
        return 2
    if market_cap_rank <= 2000:
        return 3
    return 4
