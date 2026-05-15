# Deep Owl — Breakout Signals Bot (Big Caps CEX-First)

Wykrywa **akumulację na big cap tokenach notowanych na CEX-ach** (~3000-4000 tokens — wszystko z 4 priorytetowych CEX bez aggressive filter), **backtestuje strategie breakout** na historical klines, i **monitoruje świeże listingi CEX** z user-configurable filter sets.

**Status:** Faza 0 (planning + skeleton, 4 tagi) · **Wersja:** 0.1.2 · **Output:** Telegram + Web dashboard + paper trading

## Quick start

```powershell
cd D:\Crypto\Claude\Breakout_signals
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
copy .env.example .env
# Edytuj .env (CoinMarketCap key + Telegram token opcjonalne do fazy 6)

# Sprawdz testy + lint
pytest tests/ -q
ruff check src/

# (Od fazy 1+) CLI entry
python -m deep_owl.cli --help
```

## Co robi

| Moduł | Pytanie biznesowe | Output |
|---|---|---|
| **Universe Builder** | Które ~3-4k tokenów monitorować? | `tokens` + `token_listings` + `cex_symbols_snapshot` |
| **Module 1 — Accumulation Detector** | Czy ten big cap akumuluje się przed breakoutem? | Score 0-100 + Telegram alert (tier-aware) |
| **Module 2 — Backtesting Engine** | Czy moja strategia zadziałała historycznie? | HTML report z metrics (win rate, Sharpe, max DD) |
| **Module 3 — New Listings Monitor** | Czy nowy CEX listing rokuje wg moich filtrów? | Lista matched per filter set + alert (opt) |

## Architektura w 3 zdaniach

**WebSocket-first** ingestion: 4 trwałe WS connections per CEX (Binance/Bybit/OKX/Coinbase) = wszystkie klines/funding/OI live push za $0, bez rate limitów. **Full coverage:** ~3000-4000 tokenów z 4 priorytetowych CEX, tier-classified (1-4) wg market cap rank. REST tylko do backfill + sanity reconcile co 30 min.

Pełne szczegóły → [ARCHITECTURE.md](ARCHITECTURE.md). Long-form deck (14 sekcji) → [docs/deep_owl_v1.md](docs/deep_owl_v1.md).

## Roadmap (fazy)

- **Faza 0** ✅: planning docs + skeleton repo (4 tagi: v0.0.0 → v0.1.2)
- **Faza 1:** repo bootstrap (venv + deps + DB client + logger + CLI stub) → v0.2.0
- **Faza 2:** Universe Builder + New Listings detection (CEX symbols snapshot + diff) → v0.3.0
- **Faza 3a:** CEX WebSocket adapters (4× WS clients, multiplex, reconnect, buffer) → v0.4.0
- **Faza 3b:** CEX REST adapters (backfill + 30min sanity reconcile) → v0.4.1
- **Faza 4:** Backtesting Engine (4 strategies + walk-forward + reports) → v0.5.0
- **Faza 5:** Module 1 + Module 3 (Accumulation Detector + New Listings Monitor) → v0.6.0
- **Faza 6:** Output (Telegram + Dashboard 7 zakładek + Paper Trader + Filter Sets UI) → v0.7.0 / v1.0.0

Szczegółowy progress → [PHASES.md](PHASES.md).

## Out of scope

- ❌ Fresh DEX projects monitor (Pumpfun, Raydium new pairs, Birdeye)
- ❌ Rugpull detection (RugCheck.xyz, GoPlus Security)
- ❌ DEX adapters (Dexscreener, Birdeye, Jupiter, Uniswap)
- ❌ Real wallet / private keys / on-chain transactions

**Jeśli kiedyś chcemy fresh DEX → osobny projekt, nie Deep Owl.**

## Tech stack

Python 3.11+ · asyncio · aiohttp · **websockets v12+** · FastAPI · DuckDB (columnar) · pydantic v2 · pytest · ruff · mypy

## Dokumentacja

| Plik | Zawartość |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Project context dla Claude Code (zastępuje parent context) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Pełna architektura (universe, 3 moduły, WS-first, data flow, DB schema, skala) |
| [PHASES.md](PHASES.md) | Plan faz z checkboxami, current focus |
| [DATA_SOURCES.md](DATA_SOURCES.md) | API matrix: WS + REST + announcements + cost summary |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Branch naming, commit format, PR rules |
| [FILE_HYGIENE.md](FILE_HYGIENE.md) | Meta-rules anti-sprawl (max 8 MD root, max 5 ADR) |
| [CHANGELOG.md](CHANGELOG.md) | Release notes per fazę |
| [docs/deep_owl_v1.md](docs/deep_owl_v1.md) | Long-form architecture deck (14 sekcji) |

## Licencja

Proprietary. Solo dev tool, nie do dystrybucji.
