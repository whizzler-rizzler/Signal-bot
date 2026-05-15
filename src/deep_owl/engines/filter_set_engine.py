"""Filter Set Engine — apply user filter sets do new_listings (Module 3).

Per filter set: query new_listings + filter logic (market_cap, volume, age,
quote assets, perpetual req, meme keywords include/exclude, tier_max).

Output: list of (new_listing, filter_set) matches → new_listing_matches table.

Stub Fazy 0. Implementacja Faza 5.
"""

from __future__ import annotations

from deep_owl.data_models.filters import FilterSet


NAME = "filter_set"


def apply_filter_set(
    new_listing: object,
    filter_set: FilterSet,
) -> bool:
    """Return True jeśli new_listing matches filter_set."""
    raise NotImplementedError("filter_set_engine.apply — Faza 5")
