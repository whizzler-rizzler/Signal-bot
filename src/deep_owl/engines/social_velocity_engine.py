"""Social Velocity Engine — Sygnał #6 Module 1 (OPCJONALNE).

Hipoteza: nagły wzrost social mentions precede retail FOMO.
Threshold: mentions_1h / mentions_24h_avg > 3.0.
Source: parent Social_media_scanner. Jeśli down → waga redystrybuowana.

Stub Fazy 0. Implementacja Faza 5 (opt).
"""

from __future__ import annotations

NAME = "social_velocity"
WEIGHT = 0.10
THRESHOLD_RATIO = 3.0


def compute(mentions_1h: int, mentions_24h_avg: float) -> object | None:
    raise NotImplementedError("social_velocity_engine.compute — Faza 5 (opt)")
