"""Binance connectors — Spot + Futures, WS + REST.

Files:
- ws_spot.py — Spot WebSocket (klines 5m/15m, miniTicker)
- ws_futures.py — Futures WebSocket (klines, !markPrice@arr, openInterest, !forceOrder)
- rest_spot.py — Spot REST (backfill klines + sanity)
- rest_futures.py — Futures REST (klines, fundingRate, openInterest history)
- exchange_info.py — /exchangeInfo wrapper (symbols list dla universe)
- parsers.py — Frame parsing per stream type (raw → normalized)
"""
