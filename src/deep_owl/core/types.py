"""Common type aliases used across hexagonal layers.

Hexagonal layer: core foundation. Importowane przez data_models, engines, processors.
"""

from __future__ import annotations

from typing import Literal


Exchange = Literal["binance", "bybit", "okx", "coinbase"]
MarketType = Literal["spot", "perpetual", "inverse"]
Tier = Literal[1, 2, 3, 4]
Source = Literal["ws", "rest_backfill", "rest_sanity"]
LiquidationSide = Literal["long", "short"]
DetectionSource = Literal[
    "cex_diff", "binance_rss", "bybit_announce", "okx_announce", "coinbase_announce"
]
FilterSource = Literal["config_yaml", "dashboard_ui"]
WSState = Literal["connecting", "connected", "disconnected", "error"]
TradeSide = Literal["buy", "sell"]
TradeStatus = Literal["open", "closed", "cancelled"]
SourceModule = Literal["module1", "module3", "manual"]
