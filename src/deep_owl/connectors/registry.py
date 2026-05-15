"""Fallback strategy registry — per-source priority list.

Hexagonal layer: connectors. Resolveuje fallback gdy primary source down.
"""

from __future__ import annotations


DATA_SOURCE_PRIORITY: dict[str, list[str]] = {
    "live_klines": ["websocket", "rest_polling_fallback"],
    "universe_markets": ["coingecko", "coinmarketcap"],
    "klines_historical": ["binance_rest", "bybit_rest", "okx_rest", "coinbase_rest"],
    "funding": ["binance_ws", "bybit_ws", "okx_ws"],  # Coinbase brak public futures
    "open_interest": ["binance_ws", "bybit_ws", "okx_ws"],
    "liquidations": ["binance_ws", "bybit_ws"],  # OKX/Coinbase ograniczone
    "new_listing_announcements": [
        "binance_rss",       # primary — forward notice
        "bybit_scrape",
        "okx_scrape",
        "coinbase_scrape",
        "cex_diff_snapshot",  # fallback baseline (zawsze działa)
    ],
    "tick_precision_orderbook": ["parent_recorder", "skip"],  # tylko BTC/ETH/HYPE
    "social": ["parent_scanner", "skip"],  # opcjonalne
}
