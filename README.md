# Deep Owl — Breakout Signals Bot (Big Caps CEX-First, Hexagonal Architecture)

Wykrywa **akumulację na big cap tokenach notowanych na CEX-ach** (~3000-4000 tokens, full coverage z 4 priorytetowych CEX), **backtestuje strategie breakout**, i **monitoruje świeże listingi CEX** z user-configurable filter sets.

**Status:** Faza 0 (planning + skeleton, 5 tagów) · **Wersja:** 0.1.3 · **Architektura:** Hexagonal (connectors / processors / engines / orchestrator) · **Output:** Telegram + Web dashboard + paper trading

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
| **Module 1 — Accumulation Detector** | Czy ten big cap akumuluje się przed breakoutem? | Score 0-100 + Telegram alert (tier 1-4 aware) |
| **Module 2 — Backtesting Engine** | Czy moja strategia zadziałała historycznie? | HTML report z metrics (win rate, Sharpe, max DD) |
| **Module 3 — New Listings Monitor** | Czy nowy CEX listing rokuje wg moich filtrów? | Lista matched per filter set + alert (opt) |

## Architektura — hexagonal

```
src/deep_owl/
├── connectors/     # I/O adapters (WS, REST, RSS, scrape) — TYLKO I/O
├── processors/     # Data transformers per data type — TYLKO transform
├── engines/        # Computational engines (1 per signal, niezależne)
├── orchestrator/   # Pipeline executors (combine engines, parallelism)
├── parallelism/    # Concurrency primitives (process pool, multiplexer)
├── data_models/    # Pydantic models per layer
├── core/           # Foundation (config, logger, types, db)
└── output/         # Telegram, dashboard, paper trader
```

**Reguła żelazna:** każdy engine osobny plik. Każdy connector osobny katalog. Każdy processor per data type. Engines NIE rozmawiają z API ani DB. Connectors NIE liczą biznesowych metryk. Orchestrator decyduje parallelism.

**WebSocket-first ingestion:** ~13-17 trwałych WS connections per CEX = wszystkie klines/funding/OI live push za $0, bez rate limitów. REST tylko backfill + sanity reconcile.

Pełne szczegóły → [ARCHITECTURE.md](ARCHITECTURE.md). Long-form deck → [docs/deep_owl_v1.md](docs/deep_owl_v1.md).

## Roadmap (fazy)

- **Faza 0** ✅: planning docs + skeleton (5 tagów: v0.0.0 → v0.1.3)
- **Faza 1:** repo bootstrap (venv + deps + DB + logger + CLI stub) → v0.2.0
- **Faza 2:** Universe Builder (CoinGecko + CMC + CEX exchange_info + filter pipeline) → v0.3.0
- **Faza 3a:** CEX WebSocket connectors (4× WS clients, multiplex, reconnect) → v0.4.0
- **Faza 3b:** CEX REST connectors (backfill + sanity) → v0.4.1
- **Faza 4:** Module 2 — Backtesting Engine (4 strategies + walk-forward + reports) → v0.5.0
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

Python 3.11+ · asyncio + multiprocessing · websockets v12+ · FastAPI · DuckDB (columnar) · pydantic v2 · pytest · ruff · mypy

Deep dive → [TECH_STACK.md](TECH_STACK.md).

## Dokumentacja (12 MD root + long-form deck)

| Plik | Zawartość |
|---|---|
| [README.md](README.md) | Ten plik — quick start |
| [CLAUDE.md](CLAUDE.md) | Project context dla Claude Code |
| [RESUME_INDEX.md](RESUME_INDEX.md) | **Router** — wskazuje który dokument do czego |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Hexagonal architecture (6 layers, 3 modules mapping) |
| [TECH_STACK.md](TECH_STACK.md) | Deep dive stack (Python, asyncio, DuckDB, parallelism, libs) |
| [DATABASE.md](DATABASE.md) | DB deep dive (schema, partitioning, queries, migrations) |
| [DATA_SOURCES.md](DATA_SOURCES.md) | API matrix (~25 connectorów per source/type) |
| [RESEARCH.md](RESEARCH.md) | Methodology, signal theory, walk-forward, literature |
| [PHASES.md](PHASES.md) | Plan faz z checkboxami, current focus |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Branche, commits, PR rules |
| [FILE_HYGIENE.md](FILE_HYGIENE.md) | Anti-sprawl rules + hexagonal architecture rules |
| [CHANGELOG.md](CHANGELOG.md) | Release notes per tag |
| [docs/deep_owl_v1.md](docs/deep_owl_v1.md) | Long-form architecture deck (14 sekcji) |

**Zacznij od [RESUME_INDEX.md](RESUME_INDEX.md)** — router do reszty dokumentacji.

## Licencja

Proprietary. Solo dev tool, nie do dystrybucji.
