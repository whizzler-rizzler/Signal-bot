"""Module 1 Orchestrator — combines 7 engines → Signal.

Cadence: scoring co 5 min na całym universe (parallel multiprocessing).

Pipeline:
1. Pull processed data per token (volume profile, funding, OI, liquidations, etc.)
2. Run 7 engines (parallel jeśli możliwe)
3. Weighted sum + normalize → score 0-100
4. Tier-aware threshold check (Tier 1: 70+, Tier 2: 65+, Tier 3: 60+, Tier 4: 55+)
5. INSERT signals jeśli pass threshold
6. Alert worker (osobny task) reads pending → Telegram + dashboard

Stub Fazy 0. Implementacja Faza 5.
"""

from __future__ import annotations


class Module1Orchestrator:
    def __init__(self) -> None:
        raise NotImplementedError("Module1Orchestrator — implementacja w Fazie 5")
