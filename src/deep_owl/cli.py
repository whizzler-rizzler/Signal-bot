"""Deep Owl CLI entry point.

Stub for Faza 0 (post-pivot v0.1.0) — implementacja subcommands w Fazach 1-6.

Usage:
    deep-owl --version
    deep-owl --help
    deep-owl setup                      # Faza 1: init DB schema, validate config
    deep-owl universe build             # Faza 2: rebuild universe (CMC + CoinGecko)
    deep-owl universe list [--tier N]   # Faza 2: print universe sample
    deep-owl ingest --token X --cex Y   # Faza 3: pull klines/funding/OI z CEX REST
    deep-owl backtest                   # Faza 4: run strategy backtest
    deep-owl detect --token X           # Faza 5: run accumulation detector once
    deep-owl run                        # Faza 5-6: continuous mode (poll + detect + alert)
    deep-owl serve                      # Faza 6: start dashboard + telegram bot worker
"""

from __future__ import annotations

import sys

import click

from deep_owl import __version__


@click.group()
@click.version_option(__version__, prog_name="deep-owl")
def main() -> None:
    """Deep Owl — breakout signals bot (big caps CEX-first)."""


@main.command()
def setup() -> None:
    """Initialize DB schema and validate configuration (Faza 1)."""
    click.echo("[stub] setup — implementacja w Fazie 1")
    sys.exit(0)


@main.group()
def universe() -> None:
    """Universe Builder commands (Faza 2)."""


@universe.command("build")
@click.option("--force", is_flag=True, help="Force full rebuild zamiast delta update")
def universe_build(force: bool) -> None:
    """Rebuild universe z CoinMarketCap + CoinGecko (Faza 2)."""
    click.echo(f"[stub] universe build force={force} — Faza 2")
    sys.exit(0)


@universe.command("list")
@click.option("--tier", type=click.Choice(["1", "2", "3"]), default=None)
@click.option("--limit", type=int, default=50)
def universe_list(tier: str | None, limit: int) -> None:
    """Print universe sample (Faza 2)."""
    click.echo(f"[stub] universe list tier={tier} limit={limit} — Faza 2")
    sys.exit(0)


@main.command()
@click.option("--token", required=True, help="Token ID (CoinGecko, np. 'bitcoin')")
@click.option("--cex", type=click.Choice(["binance", "bybit", "okx", "coinbase"]), required=True)
@click.option("--interval", type=click.Choice(["5m", "15m", "1h"]), default="5m")
@click.option("--from", "from_date", help="Start date YYYY-MM-DD (backfill)")
def ingest(token: str, cex: str, interval: str, from_date: str | None) -> None:
    """Pull klines + funding + OI z CEX REST API (Faza 3)."""
    click.echo(f"[stub] ingest token={token} cex={cex} interval={interval} from={from_date} — Faza 3")
    sys.exit(0)


@main.command()
@click.option("--strategy", required=True)
@click.option("--universe", "universe_name", default="top_100",
              type=click.Choice(["top_100", "top_500", "top_5000", "custom"]))
@click.option("--days", default=365, type=int)
def backtest(strategy: str, universe_name: str, days: int) -> None:
    """Run strategy backtest na big caps historical klines (Faza 4)."""
    click.echo(f"[stub] backtest strategy={strategy} universe={universe_name} days={days} — Faza 4")
    sys.exit(0)


@main.command()
@click.option("--token", help="Token ID (omit for full universe)")
def detect(token: str | None) -> None:
    """Run accumulation detector once (Faza 5)."""
    click.echo(f"[stub] detect token={token or 'universe'} — Faza 5")
    sys.exit(0)


@main.command()
def run() -> None:
    """Continuous mode: poll + detect + alert (Faza 5-6)."""
    click.echo("[stub] run continuous — Faza 5-6")
    sys.exit(0)


@main.command()
def serve() -> None:
    """Start dashboard + telegram bot + worker (Faza 6)."""
    click.echo("[stub] serve — Faza 6")
    sys.exit(0)


if __name__ == "__main__":
    main()
