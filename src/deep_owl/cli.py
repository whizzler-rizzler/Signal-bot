"""Deep Owl CLI entry point.

Stub for Faza 0 — implementacja subcommands w Fazach 1-6.

Usage:
    deep-owl --version
    deep-owl --help
    deep-owl setup           # Faza 1: init DB schema, validate config
    deep-owl ingest          # Faza 2: pull data from DEX adapters
    deep-owl backtest        # Faza 3: run strategy backtest
    deep-owl detect          # Faza 4: run accumulation detector once
    deep-owl run             # Faza 4-6: continuous mode (poll + detect + alert)
    deep-owl fresh           # Faza 5: list fresh projects
    deep-owl serve           # Faza 6: start dashboard + telegram bot worker
"""

from __future__ import annotations

import sys

import click

from deep_owl import __version__


@click.group()
@click.version_option(__version__, prog_name="deep-owl")
def main() -> None:
    """Deep Owl — breakout signals bot."""


@main.command()
def setup() -> None:
    """Initialize DB schema and validate configuration (Faza 1)."""
    click.echo("[stub] setup — implementacja w Fazie 1")
    sys.exit(0)


@main.command()
@click.option("--source", type=click.Choice(["dexscreener", "birdeye"]), required=True)
@click.option("--token", required=True, help="Token address (chain-prefixed)")
def ingest(source: str, token: str) -> None:
    """Pull data from DEX adapter (Faza 2)."""
    click.echo(f"[stub] ingest source={source} token={token} — Faza 2")
    sys.exit(0)


@main.command()
@click.option("--strategy", required=True)
@click.option("--symbol", required=True)
@click.option("--days", default=30, type=int)
def backtest(strategy: str, symbol: str, days: int) -> None:
    """Run strategy backtest on historical candles (Faza 3)."""
    click.echo(f"[stub] backtest strategy={strategy} symbol={symbol} days={days} — Faza 3")
    sys.exit(0)


@main.command()
@click.option("--token", help="Token address (omit for full universe)")
def detect(token: str | None) -> None:
    """Run accumulation detector once (Faza 4)."""
    click.echo(f"[stub] detect token={token or 'universe'} — Faza 4")
    sys.exit(0)


@main.command()
def run() -> None:
    """Continuous mode: poll + detect + alert (Faza 4-6)."""
    click.echo("[stub] run continuous — Faza 4-6")
    sys.exit(0)


@main.group()
def fresh() -> None:
    """Fresh projects monitor commands (Faza 5)."""


@fresh.command("list")
def fresh_list() -> None:
    """List fresh projects sorted by growth_score (Faza 5)."""
    click.echo("[stub] fresh list — Faza 5")
    sys.exit(0)


@fresh.command("check")
@click.argument("address")
def fresh_check(address: str) -> None:
    """Rugpull + growth check dla pojedynczego tokena (Faza 5)."""
    click.echo(f"[stub] fresh check {address} — Faza 5")
    sys.exit(0)


@main.command()
def serve() -> None:
    """Start dashboard + telegram bot + worker (Faza 6)."""
    click.echo("[stub] serve — Faza 6")
    sys.exit(0)


if __name__ == "__main__":
    main()
