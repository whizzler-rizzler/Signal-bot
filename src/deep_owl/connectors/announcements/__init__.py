"""Module 3 New Listings detection — RSS feeds + web scrapes per CEX.

Files:
- binance_rss.py — Binance Announcements RSS (forward-notice 24-48h)
- bybit_scrape.py — Bybit blog scrape
- okx_scrape.py — OKX announcements scrape
- coinbase_scrape.py — Coinbase blog scrape

Fallback baseline: CEX symbols snapshot diff (zawsze działa, ~1d delay).
"""
