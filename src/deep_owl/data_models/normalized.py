"""Normalized data models — common shape post-connector parsing.

Hexagonal layer: data_models. Output connectors → input processors.
Wszystkie connectors per CEX MUSZĄ produkować te modele (parsing logic per-CEX w parsers.py).
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from deep_owl.core.types import Exchange, LiquidationSide, MarketType, Source, Tier


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
