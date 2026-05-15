"""Common data models used across adapters and modules.

Stub Fazy 0 (post-pivot v0.1.0). Rozbudowa Faza 2-3 (per-source response models).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


Exchange = Literal["binance", "bybit", "okx", "coinbase"]
MarketType = Literal["spot", "perpetual", "inverse"]
Tier = Literal[1, 2, 3]


class Token(BaseModel):
    """Master token entry — uniwersalny ID z CoinGecko + cross-ref CMC."""

    token_id: str = Field(..., description="CoinGecko ID: 'bitcoin', 'ethereum'")
    symbol: str = Field(..., description="Ticker: 'BTC', 'ETH'")
    name: str
    cmc_id: int | None = Field(default=None, description="CoinMarketCap ID (cross-ref)")
    market_cap_rank: int | None = None
    market_cap_usd: float | None = None
    volume_24h_usd: float | None = None
    age_days: int | None = None
    tier: Tier = 3


class TokenListing(BaseModel):
    """Per-CEX listing per token — mapping symbol."""

    token_id: str
    exchange: Exchange
    symbol: str = Field(..., description="CEX-specific: 'BTCUSDT', 'BTC-USD', 'BTC-USDT-SWAP'")
    market_type: MarketType
    quote_asset: str = Field(..., description="USDT, USD, USDC, BTC")
    is_active: bool = True
    listed_at: datetime | None = None


class Kline(BaseModel):
    """OHLCV candle — common across CEX adapters."""

    exchange: Exchange
    symbol: str
    ts: datetime = Field(..., description="Candle open time UTC")
    open: float
    high: float
    low: float
    close: float
    volume_base: float = Field(..., description="Volume in base asset (BTC, ETH)")
    volume_quote: float = Field(..., description="Volume in quote asset (USDT, USD)")
    trades_count: int | None = None
    taker_buy_volume_base: float | None = Field(
        default=None, description="Buy pressure proxy: taker buy volume"
    )


class FundingRate(BaseModel):
    """Funding rate snapshot (perpetual futures only)."""

    exchange: Exchange
    symbol: str
    ts: datetime
    funding_rate: float = Field(..., description="0.0001 = 0.01% per 8h cycle")
    mark_price: float | None = None


class OpenInterest(BaseModel):
    """Open Interest snapshot."""

    exchange: Exchange
    symbol: str
    ts: datetime
    open_interest_base: float = Field(..., description="In base token units (BTC, ETH)")
    open_interest_usd: float | None = Field(default=None, description="Computed if mark price available")


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
