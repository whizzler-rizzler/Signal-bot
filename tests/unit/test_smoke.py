"""Smoke test — minimum viable test wstawiony w Fazie 0.

Cel: pytest collect i run zwraca 0 nawet bez kodu produkcyjnego.
Faza 1+ doda real unit tests per layer (engines, processors, connectors).
"""

from __future__ import annotations


def test_import_package() -> None:
    """Package importuje sie bez bledu."""
    import deep_owl

    assert deep_owl.__version__ == "0.1.0"


def test_cli_module_imports() -> None:
    """CLI module importuje sie bez bledu."""
    from deep_owl import cli

    assert hasattr(cli, "main")


def test_data_models_import() -> None:
    """Data models importuja sie bez bledu (hexagonal layer)."""
    from deep_owl.data_models.normalized import (
        FundingRate,
        Kline,
        Liquidation,
        OpenInterest,
        Token,
        TokenListing,
    )
    from deep_owl.data_models.signals import EngineResult, Signal
    from deep_owl.data_models.filters import FilterSet

    assert Token.__name__ == "Token"
    assert Kline.__name__ == "Kline"
    assert FundingRate.__name__ == "FundingRate"
    assert OpenInterest.__name__ == "OpenInterest"
    assert Liquidation.__name__ == "Liquidation"
    assert Signal.__name__ == "Signal"
    assert EngineResult.__name__ == "EngineResult"
    assert FilterSet.__name__ == "FilterSet"
    assert TokenListing.__name__ == "TokenListing"


def test_core_types_import() -> None:
    """Core types importuja sie bez bledu."""
    from deep_owl.core.types import Exchange, MarketType, Tier

    assert Exchange is not None
    assert MarketType is not None
    assert Tier is not None


def test_engine_base_import() -> None:
    """Engine base Protocol importuje sie bez bledu."""
    from deep_owl.engines.base import Engine, sigmoid

    assert Engine is not None
    assert sigmoid(0.0) == 0.5  # sigmoid identity check


def test_tier_classifier_engine() -> None:
    """Tier classifier — najprostszy działający engine (no NotImplementedError).

    Demonstrates engine independence: pure function, no I/O, no DB.
    """
    from deep_owl.engines.tier_classifier_engine import classify_tier

    assert classify_tier(50) == 1   # top 100
    assert classify_tier(250) == 2  # 101-500
    assert classify_tier(1500) == 3  # 501-2000
    assert classify_tier(3000) == 4  # >2000
    assert classify_tier(None) == 4
