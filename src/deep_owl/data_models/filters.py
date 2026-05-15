"""Module 3 user-defined filter sets — config + runtime overrides.

Hexagonal layer: data_models. Loaded z config.yaml + dashboard UI.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from deep_owl.core.types import FilterSource, MarketType, Tier


class FilterSet(BaseModel):
    """User-defined filter set (Module 3).

    Wszystkie atrybuty optional — user może definiować dowolny subset.
    """

    name: str = Field(..., description="np. 'conservative', 'aggressive_alts', 'meme_hunt'")
    enabled: bool = True
    source: FilterSource = "config_yaml"
    alert_on_match: bool = False

    # Filter attributes (all optional)
    min_market_cap_usd: float | None = None
    max_market_cap_usd: float | None = None
    min_volume_24h_usd: float | None = None
    max_volume_24h_usd: float | None = None
    min_cex_listings: int | None = None
    max_cex_listings: int | None = None
    min_age_hours: int | None = None
    max_age_hours: int | None = None
    required_quote_assets: list[str] = Field(default_factory=list)
    required_has_perpetual: bool | None = None
    required_market_type: list[MarketType] = Field(default_factory=list)
    exclude_stablecoins: bool = True
    exclude_wrapped: bool = True
    include_meme_keywords: list[str] = Field(default_factory=list)
    exclude_meme_keywords: list[str] = Field(default_factory=list)
    tier_max: Tier | None = None
    min_holders_count: int | None = None
    min_age_listed_on_cex_days: int | None = None
