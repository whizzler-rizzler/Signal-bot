"""Connectors layer — I/O adapters per source.

Hexagonal layer: I/O. TYLKO komunikacja z external API/source + normalize.

Reguly zelaznej separacji:
- NIE liczy biznesowych metryk (avg, ratio, score)
- NIE pisze do DB (orchestrator decyduje)
- NIE wywoluje innych connectorow

Struktura:
- cex/{binance,bybit,okx,coinbase}/ — per CEX, per stream type
- universe/{coingecko,coinmarketcap}.py — universe sources
- announcements/{binance_rss,bybit_scrape,okx_scrape,coinbase_scrape}.py — Module 3
- parent/recorder_reader.py — read parent CEX recorder (BTC/ETH/HYPE only)
- social/parent_scanner_reader.py — opcjonalne sentiment
"""
