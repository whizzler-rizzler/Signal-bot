"""CoinGecko API connector — primary źródło market cap rankings (tier classification).

Endpoint: GET /coins/markets?vs_currency=usd&per_page=250&page=N
Rate limit: 30 req/min free / 500 req/min Pro ($129/mo)
Auth: API key opcjonalny (Pro tier).

Stub Fazy 0. Implementacja Faza 2.
"""

from __future__ import annotations


class CoinGeckoClient:
    BASE_URL = "https://api.coingecko.com/api/v3"
    REQ_PER_MIN_FREE = 30

    def __init__(self, api_key: str = "") -> None:
        self.api_key = api_key
        raise NotImplementedError("CoinGeckoClient — implementacja w Fazie 2")
