"""Pydantic data models per hexagonal layer.

- connectors.py — raw response models per CEX (BinanceWSKlineFrame, etc.)
- normalized.py — common models post-normalization (Kline, FundingRate, OpenInterest, Liquidation)
- processed.py — processor output (VolumeProfile, RollingStats, etc.)
- signals.py — engine output (Signal, EngineResult)
- filters.py — Module 3 user filter sets

Reguła: each layer ma własne models. NIE używamy normalized.Kline w connector raw frame parsing
(tam BinanceWSKlineFrame → potem mapping w parsers.py).
"""
