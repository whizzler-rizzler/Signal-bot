# Deep Owl — Breakout Signals Bot (Big Caps CEX-First)

Wykrywa **akumulację na big cap tokenach notowanych na CEX-ach** (top ~5000 z CoinMarketCap/CoinGecko po filtrowaniu) i **backtestuje strategie breakout** na historycznych klines z REST API CEX (Binance, Bybit, OKX, Coinbase).

**Status:** Faza 0 (planning + skeleton) · **Wersja:** 0.1.0 · **Output:** Telegram alerts + Web dashboard + paper trading

## Quick start

```powershell
cd D:\Crypto\Claude\Breakout_signals
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
copy .env.example .env
# Edytuj .env (CoinMarketCap API key, Telegram token — opcjonalnie do fazy 6)

# Sprawdz testy + lint
pytest tests/ -q
ruff check src/

# (Od fazy 1+) CLI entry
python -m deep_owl.cli --help
```

## Co robi

| Moduł | Pytanie biznesowe | Output |
|---|---|---|
| **Universe Builder** | Które ~5000 realnych tokenów monitorować? | Tabela `tokens` + `token_listings` (per-CEX symbol mapping) |
| **1. Accumulation Detector** | Czy ten established big cap akumuluje się przed breakoutem? | Score 0-100 + Telegram alert (tier-aware threshold) |
| **2. Backtesting Engine** | Czy moja strategia zadziałałaby na historycznych big caps? | HTML report z metrics (win rate, Sharpe, max DD) |

## Architektura w 3 zdaniach

CEX REST API (Binance/Bybit/OKX/Coinbase klines + funding + open interest) jako primary data source dla ~5000 big cap tokenów filtrowanych z CoinMarketCap/CoinGecko. DuckDB jako embedded storage (columnar, partitioned by month dla skali). Sygnały akumulacji liczone co 5 min: volume profile + funding rate skew + OI buildup + cross-exchange divergence + liquidation imbalance + opcjonalnie social sentiment z parent scanner.

Pełne szczegóły → [ARCHITECTURE.md](ARCHITECTURE.md). Long-form deck (12 sekcji) → [docs/deep_owl_v1.md](docs/deep_owl_v1.md).

## Roadmap (fazy)

- **Faza 0** (NOW): planning docs + skeleton repo ✅ + pivot v0.1.0 (big caps focus) ✅
- **Faza 1:** repo bootstrap + CI + logger + settings + DuckDB client
- **Faza 2:** Universe Builder (CoinMarketCap + CoinGecko + filter pipeline)
- **Faza 3:** CEX REST adapters (Binance, Bybit, OKX, Coinbase — klines/funding/OI)
- **Faza 4:** Backtesting Engine (4 strategie + walk-forward + reports)
- **Faza 5:** Module 1 — Big Cap Accumulation Detector + cross-validation historical
- **Faza 6:** Output — Telegram + Dashboard + Paper Trader

Szczegółowy progress → [PHASES.md](PHASES.md).

## Out of scope

❌ Fresh DEX projects monitor (Pumpfun, Raydium new pairs)
❌ Rugpull detection (RugCheck.xyz, GoPlus)
❌ DEX adapters (Dexscreener, Birdeye, Jupiter, Uniswap)
❌ Real wallet / private keys / on-chain transactions

**Jeśli kiedyś chcemy fresh DEX → osobny projekt, nie Deep Owl.**

## Tech stack

Python 3.11+ · asyncio · aiohttp · FastAPI · DuckDB (columnar) · pydantic v2 · pytest · ruff · mypy

## Dokumentacja

| Plik | Zawartość |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Project context dla Claude Code (zastępuje parent context) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Pełna architektura (universe, 2 moduły, data flow, DB schema, skala) |
| [PHASES.md](PHASES.md) | Plan faz z checkboxami, current focus |
| [DATA_SOURCES.md](DATA_SOURCES.md) | API matrix: CoinGecko, CMC, Binance, Bybit, OKX, Coinbase, Telegram |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Branch naming, commit format, PR rules |
| [FILE_HYGIENE.md](FILE_HYGIENE.md) | Meta-rules anti-sprawl (max 8 MD, max 5 ADR) |
| [CHANGELOG.md](CHANGELOG.md) | Release notes per fazę |

## Licencja

Proprietary. Solo dev tool, nie do dystrybucji.
