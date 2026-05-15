"""Engine Protocol — base interface dla wszystkich computational engines.

Hexagonal layer: engines. Każdy engine MUSI implementować ten Protocol.

Reguła engine independence: każdy engine MUSI być uruchamialny SAM z mocked input.
Test każdego engine NIE może wymagać DB ani API connection.
"""

from __future__ import annotations

from typing import Any, Protocol

from deep_owl.data_models.signals import EngineResult


class Engine(Protocol):
    """Computational engine — pure function over processed data."""

    name: str
    weight: float

    def warmup_window_bars(self) -> int:
        """Ile bars data wymagane dla pełnego scoring (np. 2016 dla 7d×5min)."""

    def compute(self, processed_data: Any) -> EngineResult | None:
        """
        Pure function. Input: processed data (per-engine specific shape).
        Output: EngineResult lub None (jeśli data niedostępna lub signal nieaktywny).

        MUSI być deterministyczna: same input → same output. Brak side effects.
        """


def sigmoid(x: float, scale: float = 1.0) -> float:
    """Standard sigmoid normalization. Used przez większość engines."""
    import math
    try:
        return 1.0 / (1.0 + math.exp(-x / scale))
    except OverflowError:
        return 0.0 if x < 0 else 1.0
