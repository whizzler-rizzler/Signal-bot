"""Cross-Exchange Engine — Sygnał #4 Module 1.

Hipoteza: smart money koncentruje aktywność na jednym CEX dla lepszej liquidity.
Volume na jednym CEX >2x median across CEX-ów = signal koncentracji.

Threshold: max(vol_per_cex) / median(vol_per_cex) > 2.0.

Stub Fazy 0. Implementacja Faza 5.
"""

from __future__ import annotations

NAME = "cross_exchange_divergence"
WEIGHT = 0.15
THRESHOLD_RATIO = 2.0


def compute(volumes_per_cex_24h: dict[str, float]) -> object | None:
    raise NotImplementedError("cross_exchange_engine.compute — Faza 5")
