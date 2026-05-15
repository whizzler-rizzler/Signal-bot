"""Module 3 Orchestrator — new listings + filter sets matching.

Cadence: 1h cron.

Pipeline:
1. Pull RSS/scrape connectors (binance_rss, bybit_scrape, ...)
2. Compare cex_symbols_snapshot today vs yesterday (fallback baseline)
3. Insert new_listings rows
4. Per active filter_set: apply filter_set_engine → matches
5. INSERT new_listing_matches
6. Alert worker reads pending matches → Telegram (jeśli alert_on_match=true)

Stub Fazy 0. Implementacja Faza 5.
"""

from __future__ import annotations


class Module3Orchestrator:
    def __init__(self) -> None:
        raise NotImplementedError("Module3Orchestrator — implementacja w Fazie 5")
