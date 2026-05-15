"""Metrics engine — Sharpe, Sortino, Calmar, max DD, win rate, exposure time.

Stub Fazy 0. Implementacja Faza 4.

Implementations:
- compute_sharpe(returns, periods_per_year=365) — annualized Sharpe
- compute_sortino(returns, target_return=0)
- compute_calmar(annualized_return, max_dd)
- compute_max_drawdown(equity_curve)
- compute_win_rate(trades)
- compute_exposure_time(in_position_bars, total_bars)
"""

from __future__ import annotations


def compute_sharpe(returns: list[float], periods_per_year: int = 365) -> float:
    raise NotImplementedError("metrics_engine.compute_sharpe — Faza 4")
