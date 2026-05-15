"""Processors layer — data transformers per data type.

Hexagonal layer: pure functions. Input: normalized models. Output: processed models.

Reguly zelaznej separacji:
- NIE rozmawia z API (zero I/O)
- NIE rozmawia z DB (zero queries)
- NIE liczy biznesowych signal scores (to engines)
- Pure functions, vectorized gdzie możliwe (numpy)

Struktura per data type:
- numerical/ — OHLCV, volume profile, orderbook, liquidations
- timeseries/ — rolling stats, pivot, resample, correlation, divergence
- text/ — RSS parsing, classification, sentiment
- events/ — new listings, delistings, funding cycles
"""
