"""Engines layer — computational engines, pure logic.

Hexagonal layer: pure compute. Input: processed data, output: EngineResult/Signal.

Reguly zelaznej separacji:
- TYLKO compute (pure functions)
- Każdy engine = OSOBNY plik
- Niezależny — można uruchomić sam z mocked input
- NIE rozmawia z API
- NIE rozmawia z DB
- NIE wywołuje innych engines bezpośrednio (orchestrator je composuje)

Engines (~21 total):

Module 1 — Big Cap Accumulation Detector (7 sygnałów):
- volume_profile_engine.py (Sygnał #1)
- funding_skew_engine.py (Sygnał #2)
- oi_buildup_engine.py (Sygnał #3)
- cross_exchange_engine.py (Sygnał #4)
- liquidation_imbalance_engine.py (Sygnał #5)
- social_velocity_engine.py (Sygnał #6, opt)
- bid_ask_imbalance_engine.py (Sygnał #7, opt)

Module 2 — Backtesting (4 strategies + 4 infrastructure):
- backtest_breakout_consolidation.py
- backtest_volume_spike.py
- backtest_funding_squeeze.py
- backtest_rsi_divergence.py
- walk_forward_engine.py
- metrics_engine.py
- slippage_engine.py
- fees_engine.py

Module 3 — New Listings (2):
- new_listings_detector_engine.py
- filter_set_engine.py

Cross-cutting:
- universe_filter_engine.py (Faza 2)
- tier_classifier_engine.py (Faza 2)
- ws_rest_divergence_engine.py (Faza 3b sanity)
- cross_validation_engine.py (Faza 5 pre-deploy validation)
"""
