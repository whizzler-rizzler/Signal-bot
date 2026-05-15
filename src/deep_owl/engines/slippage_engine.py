"""Slippage engine — linear model dla CEX big caps.

Formula: slippage_bps = base_bps + (size_usd / volume_5m_usd) * 10000 * impact_factor

Defaults dla CEX:
  base_bps = 2     (0.02%)
  impact_factor = 1.5

Stub Fazy 0. Implementacja Faza 4.
"""

from __future__ import annotations

DEFAULT_BASE_BPS = 2.0
DEFAULT_IMPACT_FACTOR = 1.5


def compute_slippage_bps(
    size_usd: float,
    volume_5m_usd: float,
    base_bps: float = DEFAULT_BASE_BPS,
    impact_factor: float = DEFAULT_IMPACT_FACTOR,
) -> float:
    raise NotImplementedError("slippage_engine.compute_slippage_bps — Faza 4")
