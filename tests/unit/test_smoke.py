"""Smoke test — minimum viable test wstawiony w Fazie 0.

Cel: pytest collect i run zwraca 0 nawet bez kodu produkcyjnego.
Faza 1+ doda real unit tests per moduł.
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


def test_models_import() -> None:
    """Data models importuja sie bez bledu."""
    from deep_owl.data.models import TokenSnapshot

    assert TokenSnapshot.__name__ == "TokenSnapshot"
