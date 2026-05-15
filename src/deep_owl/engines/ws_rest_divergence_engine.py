"""WS/REST Divergence Engine — sanity check WS data vs REST.

Used przez Faza 3b sanity reconcile job (co 30min).
Compare last 5 bars WS vs REST, alert jeśli divergence > 0.1%.

Stub Fazy 0. Implementacja Faza 3b.
"""

from __future__ import annotations

NAME = "ws_rest_divergence"
THRESHOLD_DIVERGENCE_PCT = 0.001  # 0.1%


def check_divergence(ws_bars: list[object], rest_bars: list[object]) -> float:
    """Return max divergence pct across compared bars."""
    raise NotImplementedError("ws_rest_divergence_engine.check — Faza 3b")
