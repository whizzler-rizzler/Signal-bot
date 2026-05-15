"""Module 2 Orchestrator — backtest pipeline (walk-forward × strategies × universe).

Pipeline:
1. Load historical klines z DuckDB dla universe + period
2. Generate walk-forward windows (train 60d / test 14d / slide 14d)
3. Per window × strategy × universe → ProcessPool parallel backtest
4. Aggregate metrics (Sharpe, max DD, win rate, etc.)
5. Generate HTML report (plotly)
6. INSERT do backtest_runs table

Stub Fazy 0. Implementacja Faza 4.
"""

from __future__ import annotations


class Module2Orchestrator:
    def __init__(self) -> None:
        raise NotImplementedError("Module2Orchestrator — implementacja w Fazie 4")
