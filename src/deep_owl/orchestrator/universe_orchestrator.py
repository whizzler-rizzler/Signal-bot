"""Universe Orchestrator — Faza 2 daily rebuild.

Pipeline:
1. CoinGecko paginated pull (~10k tokens) + CMC cross-check
2. Pull /exchangeInfo z 4 CEX-ów (current symbols list)
3. Apply universe_filter_engine (łagodny filter)
4. Apply tier_classifier_engine (1-4 z market_cap_rank)
5. Per-token CEX listing resolution
6. Persist do tokens + token_listings + cex_symbols_snapshot

Stub Fazy 0. Implementacja Faza 2.
"""

from __future__ import annotations


class UniverseOrchestrator:
    def __init__(self) -> None:
        raise NotImplementedError("UniverseOrchestrator — implementacja w Fazie 2")
