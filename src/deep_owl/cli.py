"""Deep Owl CLI entry point.

Stub for Faza 0 (post-pivot v0.1.2 — WS-first + Module 3 New Listings).
Implementacja subcommands w Fazach 1-6.

Usage:
    deep-owl --version
    deep-owl --help

    # Faza 1 (bootstrap)
    deep-owl setup                       # init DB schema, validate config

    # Faza 2 (Universe Builder + New Listings detection)
    deep-owl universe build              # rebuild universe z CMC + CoinGecko + CEX /exchangeInfo
    deep-owl universe list [--tier N]    # print universe sample

    # Faza 3a (WebSocket ingester)
    deep-owl ws start [--cex X]          # uruchom WS streams (default: all 4 CEX)
    deep-owl ws status                   # print WS connections health

    # Faza 3b (REST backfill + sanity)
    deep-owl backfill --token X --cex Y [--from YYYY-MM-DD]
    deep-owl sanity reconcile            # run 30min sanity job

    # Faza 4 (Backtesting)
    deep-owl backtest --strategy X --universe top_100 --days 365

    # Faza 5 (Module 1 + Module 3)
    deep-owl detect [--token X]          # run accumulation detector once (Module 1)
    deep-owl listings list [--filter-set X]   # show matched new listings (Module 3)
    deep-owl listings check --token X         # check single token vs all filter sets

    # Faza 5-6 (continuous + serve)
    deep-owl run                         # continuous mode (WS + scorer + listener)
    deep-owl serve                       # start dashboard + telegram bot + workers
"""

from __future__ import annotations

import sys

import click

from deep_owl import __version__


@click.group()
@click.version_option(__version__, prog_name="deep-owl")
def main() -> None:
    """Deep Owl — breakout signals bot (big caps CEX-first, WebSocket-first)."""


@main.command()
def setup() -> None:
    """Initialize DB schema and validate configuration (Faza 1)."""
    click.echo("[stub] setup — implementacja w Fazie 1")
    sys.exit(0)


# === Universe Builder (Faza 2) ===

@main.group()
def universe() -> None:
    """Universe Builder commands (Faza 2)."""


@universe.command("build")
@click.option("--force", is_flag=True, help="Force full rebuild zamiast delta")
def universe_build(force: bool) -> None:
    """Rebuild universe z CMC + CoinGecko + CEX /exchangeInfo (Faza 2)."""
    click.echo(f"[stub] universe build force={force} — Faza 2")
    sys.exit(0)


@universe.command("list")
@click.option("--tier", type=click.Choice(["1", "2", "3", "4"]), default=None)
@click.option("--limit", type=int, default=50)
def universe_list(tier: str | None, limit: int) -> None:
    """Print universe sample (Faza 2)."""
    click.echo(f"[stub] universe list tier={tier} limit={limit} — Faza 2")
    sys.exit(0)


# === WebSocket Ingester (Faza 3a) ===

@main.group()
def ws() -> None:
    """WebSocket ingester commands (Faza 3a)."""


@ws.command("start")
@click.option("--cex", type=click.Choice(["binance", "bybit", "okx", "coinbase", "all"]), default="all")
@click.option("--market", type=click.Choice(["spot", "linear", "all"]), default="all")
def ws_start(cex: str, market: str) -> None:
    """Start WebSocket streams (Faza 3a). Persistent connections."""
    click.echo(f"[stub] ws start cex={cex} market={market} — Faza 3a")
    sys.exit(0)


@ws.command("status")
def ws_status() -> None:
    """Print WS connections health (Faza 3a)."""
    click.echo("[stub] ws status — Faza 3a")
    sys.exit(0)


# === REST Backfill + Sanity (Faza 3b) ===

@main.command()
@click.option("--token", required=True, help="Token ID (CoinGecko, np. 'bitcoin')")
@click.option("--cex", type=click.Choice(["binance", "bybit", "okx", "coinbase"]), required=True)
@click.option("--from", "from_date", help="Start date YYYY-MM-DD")
@click.option("--interval", type=click.Choice(["5m", "15m", "1h"]), default="5m")
def backfill(token: str, cex: str, from_date: str | None, interval: str) -> None:
    """Pull historical klines z CEX REST (Faza 3b)."""
    click.echo(f"[stub] backfill token={token} cex={cex} from={from_date} interval={interval} — Faza 3b")
    sys.exit(0)


@main.group()
def sanity() -> None:
    """Sanity reconcile commands (Faza 3b)."""


@sanity.command("reconcile")
def sanity_reconcile() -> None:
    """Run 30min sanity job: WS vs REST cross-validate (Faza 3b)."""
    click.echo("[stub] sanity reconcile — Faza 3b")
    sys.exit(0)


# === Backtesting (Faza 4) ===

@main.command()
@click.option("--strategy", required=True,
              type=click.Choice(["breakout_consolidation", "volume_spike", "funding_squeeze", "rsi_divergence"]))
@click.option("--universe", "universe_name", default="top_100",
              type=click.Choice(["top_100", "top_500", "top_2000", "top_5000", "custom"]))
@click.option("--days", default=365, type=int)
def backtest(strategy: str, universe_name: str, days: int) -> None:
    """Run strategy backtest na big caps historical klines (Faza 4)."""
    click.echo(f"[stub] backtest strategy={strategy} universe={universe_name} days={days} — Faza 4")
    sys.exit(0)


# === Module 1: Accumulation Detector (Faza 5) ===

@main.command()
@click.option("--token", help="Token ID (omit for full universe)")
def detect(token: str | None) -> None:
    """Run accumulation detector once (Module 1, Faza 5)."""
    click.echo(f"[stub] detect token={token or 'universe'} — Faza 5 (Module 1)")
    sys.exit(0)


# === Module 3: New Listings Monitor (Faza 5) ===

@main.group()
def listings() -> None:
    """New Listings Monitor commands (Module 3, Faza 5)."""


@listings.command("list")
@click.option("--filter-set", "filter_set", help="Nazwa filter setu (z config.yaml)")
@click.option("--max-age-hours", type=int, default=168)
def listings_list(filter_set: str | None, max_age_hours: int) -> None:
    """Print matched new listings per filter set (Module 3)."""
    click.echo(f"[stub] listings list filter_set={filter_set} max_age={max_age_hours}h — Faza 5 (Module 3)")
    sys.exit(0)


@listings.command("check")
@click.argument("token")
def listings_check(token: str) -> None:
    """Check single token vs all active filter sets (Module 3)."""
    click.echo(f"[stub] listings check {token} — Faza 5 (Module 3)")
    sys.exit(0)


@listings.command("filters")
def listings_filters() -> None:
    """List active filter sets (Module 3)."""
    click.echo("[stub] listings filters — Faza 5 (Module 3)")
    sys.exit(0)


# === Continuous + serve (Faza 5-6) ===

@main.command()
def run() -> None:
    """Continuous mode: WS ingester + Module 1 scorer + Module 3 detector (Faza 5-6)."""
    click.echo("[stub] run continuous — Faza 5-6")
    sys.exit(0)


@main.command()
def serve() -> None:
    """Start dashboard + telegram bot + all workers (Faza 6)."""
    click.echo("[stub] serve — Faza 6")
    sys.exit(0)


if __name__ == "__main__":
    main()
