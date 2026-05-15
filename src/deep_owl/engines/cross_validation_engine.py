"""Cross-Validation Engine — pre-deploy validation Module 1 (Faza 5 KRYTYCZNE).

Replay Module 1 scoring na historical 1-2 lata. Compute precision/recall/F1
per threshold per tier. Target: precision > 0.4 OOS.

Bez tego NIE wdrażamy Module 1 live.

Stub Fazy 0. Implementacja Faza 5.
"""

from __future__ import annotations

NAME = "cross_validation"

ACCEPT_PRECISION = 0.40  # minimum dla deploy live
ACCEPT_RECALL = 0.30
ACCEPT_F1 = 0.35
BREAKOUT_DEFINITION_PCT = 20.0  # price +20% w 24h od alert = realny breakout
BREAKOUT_WINDOW_HOURS = 24


def replay_and_score(
    historical_klines: list[object],
    historical_funding: list[object],
    historical_oi: list[object],
    threshold: float,
    tier: int,
) -> dict[str, float]:
    """Returns {precision, recall, f1, true_positives, false_positives, ...}."""
    raise NotImplementedError("cross_validation_engine.replay — Faza 5")
