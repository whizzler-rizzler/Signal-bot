"""Engine output models — Signal aggregation results.

Hexagonal layer: data_models. Output engines → input orchestrator → input output.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from deep_owl.core.types import Exchange, Tier


@dataclass(frozen=True)
class EngineResult:
    """Output pojedynczego engine — znormalizowany score 0..1 + raw value.

    Frozen dataclass — engine compute() zwraca EngineResult NIGDY nie mutuje istniejacego.
    """

    engine_name: str
    raw_value: float                  # Surowa wartość (np. funding rate -0.024%)
    normalized_score: float           # Sigmoid normalized 0..1
    threshold: float                  # Aktywny threshold użyty
    metadata: dict[str, Any] = field(default_factory=dict)  # Optional debug info


class Signal(BaseModel):
    """Aggregated Module 1 output — final score + breakdown.

    Tworzony przez orchestrator z N×EngineResult (weighted sum + normalize).
    Zapisywany do DuckDB `signals` table.
    """

    token_id: str
    primary_exchange: Exchange
    primary_symbol: str
    timestamp: datetime
    score: float = Field(..., ge=0, le=100)
    tier: Tier
    breakdown: dict[str, float] = Field(
        default_factory=dict,
        description="Per-signal scores: {volume_rising: 0.85, funding_skew: 0.62, ...}",
    )
