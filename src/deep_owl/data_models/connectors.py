"""Raw response models per CEX/source — pre-normalization.

Hexagonal layer: data_models. Used przez connector parsers (parsers.py per CEX).
Po parsowaniu mappujemy do normalized.py models.

Stub Fazy 0. Per-CEX modele dodawane w Faza 3a (gdy implementujemy connectors).
"""

from __future__ import annotations

# Per-CEX raw frame models dodawane w Faza 3a:
# - BinanceWSKlineFrame, BinanceWSMarkPriceFrame, BinanceWSLiquidationFrame
# - BybitWSKlineFrame, BybitWSTickerFrame
# - OKXWSCandleFrame, OKXWSTickerFrame
# - CoinbaseWSMatchFrame, CoinbaseWSTickerFrame
# - CoinGeckoMarketsResponse, CoinMarketCapListingsResponse
