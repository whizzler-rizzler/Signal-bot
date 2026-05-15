"""Common data models used across adapters and modules.

Stub Fazy 0 (post-pivot v0.1.2 — WS-first + Module 3). Rozbudowa Faza 2-5.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


Exchange = Literal["binance", "bybit", "okx", "coinbase"]
MarketType = Literal["spot", "perpetual", "inverse"]
Tier = Literal[1, 2, 3, 4]
Source = Literal["ws", "rest_backfill", "rest_sanity"]
LiquidationSide = Literal["long", "short"]
DetectionSource = Literal[
    "cex_diff", "binance_rss", "bybit_announce", "okx_announce", "coinbase_announce"
]
FilterSource = Literal["config_yaml", "dashboard_ui"]


# === Universe ===

class Token(BaseModel):
    """Master token entry — uniwersalny ID z CoinGecko + cross-ref CMC."""

    token_id: str = Field(..., description="CoinGecko ID: 'bitcoin', 'ethereum'")
    symbol: str = Field(..., description="Ticker: 'BTC', 'ETH'")
    name: str
    cmc_id: int | None = None
    market_cap_rank: int | None = None
    market_cap_usd: float | None = None
    volume_24h_usd: float | None = None
    age_days: int | None = None
    tier: Tier = 4


class TokenListing(BaseModel):
    """Per-CEX listing per token — mapping symbol."""

    token_id: str
    exchange: Exchange
    symbol: str = Field(..., description="CEX-specific: 'BTCUSDT', 'BTC-USD', 'BTC-USDT-SWAP'")
    market_type: MarketType
    quote_asset: str
    is_active: bool = True
    listed_at: datetime | None = None


class CEXSymbolSnapshot(BaseModel):
    """Daily snapshot symbolu per CEX (dla Module 3 diff detection)."""

    exchange: Exchange
    snapshot_date: str = Field(..., description="ISO date 'YYYY-MM-DD'")
    symbol: str
    market_type: MarketType
    quote_asset: str | None = None


# === Live market data (WS + REST) ===

class Kline(BaseModel):
    """OHLCV candle — common across CEX adapters i WS/REST sources."""

    exchange: Exchange
    symbol: str
    ts: datetime = Field(..., description="Candle open time UTC")
    open: float
    high: float
    low: float
    close: float
    volume_base: float
    volume_quote: float
    trades_count: int | None = None
    taker_buy_volume_base: float | None = None
    source: Source = "ws"


class FundingRate(BaseModel):
    """Funding rate snapshot (perpetual futures only)."""

    exchange: Exchange
    symbol: str
    ts: datetime
    funding_rate: float = Field(..., description="0.0001 = 0.01% per 8h cycle")
    mark_price: float | None = None
    source: Source = "ws"


class OpenInterest(BaseModel):
    """Open Interest snapshot."""

    exchange: Exchange
    symbol: str
    ts: datetime
    open_interest_base: float
    open_interest_usd: float | None = None
    source: Source = "ws"


class Liquidation(BaseModel):
    """Liquidation event (Module 1 signal #5)."""

    exchange: Exchange
    symbol: str
    ts: datetime
    side: LiquidationSide
    size_base: float
    size_usd: float | None = None
    price: float
    source: Source = "ws"


# === Module 1 output ===

class Signal(BaseModel):
    """Module 1 output — accumulation score."""

    token_id: str
    primary_exchange: Exchange
    primary_symbol: str
    timestamp: datetime
    score: float = Field(..., ge=0, le=100)
    tier: Tier
    breakdown: dict[str, float] = Field(
        default_factory=dict,
        description="Per-signal scores: {volume_rising: 0.8, funding_skew: 0.6, ...}",
    )


# === Module 3 New Listings ===

class NewListing(BaseModel):
    """Detected new CEX listing (Module 3)."""

    token_id: str | None = None                  # może być null jeśli nie w universe jeszcze
    symbol: str
    first_exchange: Exchange
    first_listed_at: datetime
    detection_source: DetectionSource
    market_cap_usd_at_listing: float | None = None
    volume_24h_usd_at_listing: float | None = None
    cex_listings_count: int = 1
    has_perpetual: bool = False


class FilterSet(BaseModel):
    """User-defined filter set (Module 3)."""

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


# === WS lifecycle ===

WSState = Literal["connecting", "connected", "disconnected", "error"]


class WSStatus(BaseModel):
    """WS connection health metrics."""

    exchange: Exchange
    connection_id: str = Field(..., description="np. 'binance_spot_1', 'binance_futures'")
    last_connected_at: datetime | None = None
    last_disconnected_at: datetime | None = None
    last_heartbeat_at: datetime | None = None
    last_message_at: datetime | None = None
    state: WSState = "disconnected"
    subscriptions_count: int = 0
    frames_received_total: int = 0
    reconnect_attempts: int = 0
    last_error: str | None = None
