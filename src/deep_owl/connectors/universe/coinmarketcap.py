"""CoinMarketCap API connector — cross-check rankings + fallback dla CoinGecko.

Endpoint: GET /v1/cryptocurrency/listings/latest?start=1&limit=5000
Rate limit: 333 req/d (free Basic tier)
Auth: API key REQUIRED (header X-CMC_PRO_API_KEY).

Stub Fazy 0. Implementacja Faza 2.
"""

from __future__ import annotations


class CoinMarketCapClient:
    BASE_URL = "https://pro-api.coinmarketcap.com"
    REQ_PER_DAY_FREE = 333

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ValueError("CoinMarketCap requires API key (free Basic tier też)")
        self.api_key = api_key
        raise NotImplementedError("CoinMarketCapClient — implementacja w Fazie 2")
